import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/database';
import Staff from '../models/staff.model';

dotenv.config({ path: './.env' });

const seedAdmin = async () => {
  await connectDB();

  try {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error(
        'Please provide ADMIN_EMAIL and ADMIN_PASSWORD in your .env file'
      );
      process.exit(1);
    }

    const adminExists = await Staff.findOne({ role: 'SuperAdmin' });

    if (adminExists) {
      console.log('SuperAdmin account already exists. Skipping seed.');
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    const adminUser = new Staff({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SuperAdmin',
      isActive: true,
    });

    await adminUser.save();
    console.log('✅ SuperAdmin account created successfully!');
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

seedAdmin();
