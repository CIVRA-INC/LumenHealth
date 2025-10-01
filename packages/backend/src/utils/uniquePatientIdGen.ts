import Patient from '../models/patient.model';

export const generateUniquePatientId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `LMN-${currentYear}`;

  const latestPatient = await Patient.findOne({
    UPID: { 
      $gte: `${prefix}-00000`, 
      $lt: `${prefix}-99999` 
    },
  })
    .sort({ UPID: -1 })
    .select('UPID')
    .lean();

  let nextNumber = 1;

  if (latestPatient) {
    const lastNumber = parseInt(latestPatient.UPID.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = nextNumber.toString().padStart(5, '0');

  return `${prefix}-${paddedNumber}`;
};
