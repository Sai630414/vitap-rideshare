"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = void 0;
const User_1 = __importDefault(require("../models/User"));
const Setting_1 = __importDefault(require("../models/Setting"));
const logger_1 = __importDefault(require("./logger"));
const seedDatabase = async () => {
    try {
        // 1) Seed Administrator
        const adminEmail = 'saikondareddypala@gmail.com';
        const adminExists = await User_1.default.findOne({ email: adminEmail });
        if (!adminExists) {
            logger_1.default.info(`Seeding default administrator account: ${adminEmail}`);
            // Password hook pre-save in User.ts will hash this password using bcrypt
            await User_1.default.create({
                name: 'Sai Konda Reddy Pala',
                email: adminEmail,
                password: 'Sai@reddy9866',
                role: 'admin',
                isVerified: true,
                verifiedStudent: true,
                verifiedDriver: true,
                status: 'active',
            });
            logger_1.default.info('Administrator account successfully seeded.');
        }
        else {
            // Ensure existing seeded user is admin
            if (adminExists.role !== 'admin') {
                adminExists.role = 'admin';
                await adminExists.save();
                logger_1.default.info('Updated existing seeded user to admin role.');
            }
        }
        // 2) Seed Settings
        const defaultSettings = [
            { key: 'maintenanceMode', value: false, description: 'Disable public access for system maintenance' },
            { key: 'driverVerificationRequired', value: true, description: 'Require admin approval for driver registration' },
            { key: 'emergencyContact', value: '0863-2370000', description: 'Campus security helpline for SOS broadcasts' },
            { key: 'supportEmail', value: 'support@vitapstudent.ac.in', description: 'Support email address for queries' },
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
