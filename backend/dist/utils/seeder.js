"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = void 0;
const User_1 = __importDefault(require("../models/User"));
const Setting_1 = __importDefault(require("../models/Setting"));
const Driver_1 = __importDefault(require("../models/Driver"));
const logger_1 = __importDefault(require("./logger"));
const seedDatabase = async () => {
    try {
        // Normalize legacy mixed-case driver approval statuses
        const statusMigrations = [
            { from: 'Pending', to: 'pending' },
            { from: 'Approved', to: 'approved' },
            { from: 'Rejected', to: 'rejected' },
        ];
        for (const { from, to } of statusMigrations) {
            const result = await Driver_1.default.updateMany({ approvalStatus: from }, { $set: { approvalStatus: to } });
            if (result.modifiedCount > 0) {
                logger_1.default.info(`Migrated ${result.modifiedCount} driver(s) approvalStatus ${from} → ${to}`);
            }
        }
        // 1) Seed Administrator
        const adminEmail = process.env.ADMIN_SEED_EMAIL || 'saikondareddypala@gmail.com';
        const adminPassword = process.env.ADMIN_SEED_PASSWORD;
        const adminExists = await User_1.default.findOne({ email: adminEmail });
        if (!adminExists) {
            if (!adminPassword) {
                logger_1.default.warn('ADMIN_SEED_PASSWORD not set — skipping admin seed. Set ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD to bootstrap an admin.');
            }
            else {
                logger_1.default.info(`Seeding default administrator account: ${adminEmail}`);
                await User_1.default.create({
                    name: process.env.ADMIN_SEED_NAME || 'Administrator',
                    email: adminEmail,
                    password: adminPassword,
                    role: 'admin',
                    isVerified: true,
                    verifiedStudent: true,
                    verifiedDriver: true,
                    status: 'active',
                });
                logger_1.default.info('Administrator account successfully seeded.');
            }
        }
        else if (adminExists.role !== 'admin') {
            adminExists.role = 'admin';
            await adminExists.save();
            logger_1.default.info('Updated existing seeded user to admin role.');
        }
        // 2) Seed Settings
        const defaultSettings = [
            { key: 'maintenanceMode', value: false, description: 'Disable public access for system maintenance' },
            { key: 'driverVerificationRequired', value: true, description: 'Require admin approval for driver registration' },
            { key: 'emergencyContact', value: '0863-2370000', description: 'Campus security helpline for SOS broadcasts' },
            { key: 'supportEmail', value: 'support@vitapstudent.ac.in', description: 'Support email address for queries' },
            { key: 'driverSubscriptionFeeInr', value: 50, description: 'Driver subscription fee in INR' },
        ];
        for (const item of defaultSettings) {
            const exists = await Setting_1.default.findOne({ key: item.key });
            if (!exists) {
                await Setting_1.default.create(item);
                logger_1.default.info(`Seeded default setting: ${item.key}`);
            }
        }
    }
    catch (error) {
        logger_1.default.error(`Error seeding database: ${error.message}`);
    }
};
exports.seedDatabase = seedDatabase;
exports.default = exports.seedDatabase;
