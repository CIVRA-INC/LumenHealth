import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/database';
import Staff from '../models/staff.model';
import Patient from '../models/patient.model';
import Encounter from '../models/encounter.model';

dotenv.config({ path: './.env' });

const seed = async () => {
  try {
    await connectDB();

    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('Please provide ADMIN_EMAIL and ADMIN_PASSWORD in your .env file');
      process.exit(1);
    }

    // --- SuperAdmin ---
    let admin = await Staff.findOne({ role: 'SuperAdmin' });
    if (!admin) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      admin = new Staff({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'SuperAdmin',
        isActive: true,
      });
      await admin.save();
      console.log('✅ SuperAdmin account created successfully!');
    } else {
      console.log('SuperAdmin account already exists. Skipping seed.');
    }

    // --- Doctor ---
    const doctorEmail = 'doctor2@example.com';
    const doctorPassword = 'password123';
    let doctor = await Staff.findOne({ email: doctorEmail });
    if (!doctor) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(doctorPassword, salt);
      doctor = new Staff({
        email: doctorEmail,
        password: doctorPassword,
        firstName: 'Aisha',
        lastName: 'Ali',
        role: 'Doctor',
        isActive: true,
      });
      await doctor.save();
      console.log('✅ Doctor account created successfully!');
    } else {
      console.log('Doctor account already exists. Skipping seed.');
    }

    // --- Patient ---
    const patientUPID = 'LMN-2025-00001';
    let patient = await Patient.findOne({ UPID: patientUPID });
    if (!patient) {
      patient = new Patient({
        UPID: patientUPID,
        email: 'patient1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-06-15'),
        gender: 'Male',
        contactPhone: '+1234567890',
        address: '456 Health Street',
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+0987654321',
        },
        registeredBy: doctor._id,
      });
      await patient.save();
      console.log('✅ Patient created successfully!');
    } else {
      console.log('Patient already exists. Skipping seed.');
    }

    // --- Encounter ---
    let encounter = await Encounter.findOne({ patient: patient._id, provider: doctor._id });
    if (!encounter) {
      encounter = new Encounter({
        patient: patient._id,
        provider: doctor._id,
        vitals: {
          bloodPressure: '120/80',
          heartRate: 72,
          temperature: 36.6,
          respiratoryRate: 16,
        },
        soap: {
          subjective: 'Patient feeling well',
          objective: 'Vitals stable',
          assessment: 'Healthy',
          plan: 'Routine follow-up',
        },
      });
      await encounter.save();
      console.log('✅ Encounter created successfully with ID:', encounter._id);
    } else {
      console.log('Encounter already exists. Skipping seed.');
    }

    // --- Pharmacist ---
    const pharmacistEmail = 'pharmacist@example.com';
    const pharmacistPassword = 'password123';
    let pharmacist = await Staff.findOne({ email: pharmacistEmail });
    if (!pharmacist) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(pharmacistPassword, salt);
      pharmacist = new Staff({
        email: pharmacistEmail,
        password: pharmacistPassword,
        firstName: 'Pharma',
        lastName: 'Person',
        role: 'Pharmacist',
        isActive: true,
      });
      await pharmacist.save();
      console.log('✅ Pharmacist account created successfully!');
    } else {
      console.log('Pharmacist account already exists. Skipping seed.');
    }


  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

seed();
