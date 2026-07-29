import User from '../models/User';
import Setting from '../models/Setting';
import logger from './logger';

export const seedDatabase = async (): Promise<void> => {
  try {
    // 1) Seed Administrator
    const adminEmail = 'saikondareddypala@gmail.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      logger.info(`Seeding default administrator account: ${adminEmail}`);
      // Password hook pre-save in User.ts will hash this password using bcrypt
      await User.create({
        name: 'Sai Konda Reddy Pala',
        email: adminEmail,
        password: 'Sai@reddy9866',
        role: 'admin',
        isVerified: true,
        verifiedStudent: true,
        verifiedDriver: true,
        status: 'active',
      });
      logger.info('Administrator account successfully seeded.');
    } else {
      // Ensure existing seeded user is admin
      if (adminExists.role !== 'admin') {
        adminExists.role = 'admin';
        await adminExists.save();
        logger.info('Updated existing seeded user to admin role.');
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
