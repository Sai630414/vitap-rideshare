import User from '../models/User';
import Setting from '../models/Setting';
import Driver from '../models/Driver';
import logger from './logger';

export const seedDatabase = async (): Promise<void> => {
  try {
    // Normalize legacy mixed-case driver approval statuses
    const statusMigrations = [
      { from: 'Pending', to: 'pending' },
      { from: 'Approved', to: 'approved' },
      { from: 'Rejected', to: 'rejected' },
    ];
    for (const { from, to } of statusMigrations) {
      const result = await Driver.updateMany(
        { approvalStatus: from },
        { $set: { approvalStatus: to } }
      );
      if (result.modifiedCount > 0) {
        logger.info(`Migrated ${result.modifiedCount} driver(s) approvalStatus ${from} → ${to}`);
      }
    }

    // 1) Seed Administrator
    const adminEmail = process.env.ADMIN_SEED_EMAIL || 'saikondareddypala@gmail.com';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD;
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      if (!adminPassword) {
        logger.warn(
          'ADMIN_SEED_PASSWORD not set — skipping admin seed. Set ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD to bootstrap an admin.'
        );
      } else {
        logger.info(`Seeding default administrator account: ${adminEmail}`);
        await User.create({
          name: process.env.ADMIN_SEED_NAME || 'Administrator',
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          isVerified: true,
          verifiedStudent: true,
          verifiedDriver: true,
          status: 'active',
        });
        logger.info('Administrator account successfully seeded.');
      }
    } else if (adminExists.role !== 'admin') {
      adminExists.role = 'admin';
      await adminExists.save();
      logger.info('Updated existing seeded user to admin role.');
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
      const exists = await Setting.findOne({ key: item.key });
      if (!exists) {
        await Setting.create(item);
        logger.info(`Seeded default setting: ${item.key}`);
      }
    }
  } catch (error) {
    logger.error(`Error seeding database: ${(error as Error).message}`);
  }
};

export default seedDatabase;
