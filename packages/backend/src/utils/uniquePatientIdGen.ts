import Patient from '../models/patient.model.js';

/**
 * Generates a unique, human-readable patient ID.
 * Format: LMN-YYYY-NNNNN
 * @returns {Promise<string>} The new unique patient ID.
 */
export const generateUPID = async () => {
  const year = new Date().getFullYear();
  
  // --- CHANGE: Query using the 'UPID' field ---
  const lastPatient = await Patient.findOne({ UPID: new RegExp(`^LMN-${year}-`) })
    .sort({ UPID: -1 });

  let nextSequence = 1;
  if (lastPatient) {
    // --- CHANGE: Parse the UPID field ---
    const lastSequence = parseInt(lastPatient.UPID.split('-')[2], 10);
    nextSequence = lastSequence + 1;
  }
  
  const sequenceString = String(nextSequence).padStart(5, '0');
  
  return `LMN-${year}-${sequenceString}`;
};