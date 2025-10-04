import Patient from '../models/patient.model.js';
import { generateUPID } from '../utils/upid.generator.js';
import mongoose from 'mongoose';

/**
 * Creates a new patient record.
 */
export const createPatient = async (patientData, staffId) => {
  // --- CHANGE: Using 'UPID' ---
  const UPID = await generateUPID();
  
  const patient = new Patient({
    ...patientData,
    UPID, // --- CHANGE: Using 'UPID' ---
    registeredBy: staffId,
  });
  
  await patient.save();
  return patient;
};

/**
 * Retrieves a paginated list of all patients, with search functionality.
 */
export const getAllPatients = async ({ page = 1, limit = 10, search = '' }) => {
  const query = {};
  if (search) {
    // --- CHANGE: Using the more efficient $text index you defined in the model ---
    query.$text = { $search: search };
  }
  
  const patients = await Patient.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 })
    .populate('registeredBy', 'firstName lastName');
    
  const count = await Patient.countDocuments(query);
  
  return {
    patients,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  };
};

/**
 * Retrieves a single patient by their MongoDB ID or UPID.
 */
export const getPatientByIdOrUPID = async (id) => {
  const isMongoId = mongoose.Types.ObjectId.isValid(id);
  // --- CHANGE: Query using 'UPID' ---
  const query = isMongoId ? { _id: id } : { UPID: id.toUpperCase() };
  
  const patient = await Patient.findOne(query).populate('registeredBy', 'firstName lastName');
  return patient;
};

/**
 * Updates a patient's information.
 */
export const updatePatient = async (id, updateData) => {
  const patient = await getPatientByIdOrUPID(id);
  if (!patient) {
    return null;
  }
  
  Object.assign(patient, updateData);
  await patient.save();
  return patient;
};