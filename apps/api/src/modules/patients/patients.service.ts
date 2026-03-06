import { CreatePatientDto } from "./patients.validation";
import { PatientModel, PatientDocument } from "./models/patient.model";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
};

const buildSystemId = (counter: number) => `LMN-${counter}`;

const parseSystemIdNumber = (systemId?: string): number => {
  if (!systemId) {
    return 999;
  }

  const match = systemId.match(/^LMN-(\d+)$/);
  if (!match) {
    return 999;
  }

  return Number(match[1]);
};

const toContractPatient = (doc: {
  _id: unknown;
  systemId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: "M" | "F" | "O";
  contactNumber: string;
  address: string;
  isActive: boolean;
}) => ({
  id: String(doc._id),
  systemId: doc.systemId,
  firstName: doc.firstName,
  lastName: doc.lastName,
  dateOfBirth: doc.dateOfBirth.toISOString(),
  sex: doc.sex,
  contactNumber: doc.contactNumber,
  address: doc.address,
  isActive: doc.isActive,
});

export const createPatient = async (input: {
  payload: CreatePatientDto;
  clinicId: string;
}) => {
  const searchName = normalize(`${input.payload.firstName}${input.payload.lastName}`);

  // Concurrency-safe strategy: rely on unique index + retry on duplicate systemId.
  // This preserves LMN-numeric IDs without race-condition collisions.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const latestPatient = await PatientModel.findOne({}, { systemId: 1 })
      .sort({ createdAt: -1 })
      .lean();

    const latestCounter = parseSystemIdNumber(latestPatient?.systemId);
    const systemId = buildSystemId(latestCounter + 1);

    try {
      const createdPatient = await PatientModel.create({
        ...input.payload,
        dateOfBirth: new Date(input.payload.dateOfBirth),
        systemId,
        clinicId: input.clinicId,
        searchName,
        isActive: true,
      });

      return toContractPatient(
        createdPatient.toObject() as unknown as Parameters<typeof toContractPatient>[0],
      );
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code === 11000) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to generate a unique patient systemId after retries.");
};

export const getPatientById = async (id: string, clinicId: string) => {
  const patient = await PatientModel.findOne({ _id: id, clinicId }).lean();
  if (!patient) {
    return null;
  }

  return toContractPatient(patient as Parameters<typeof toContractPatient>[0]);
};

export const searchPatients = async (query: string, clinicId: string) => {
  const normalizedQuery = normalize(query);
  const looseRegex = new RegExp(query.trim().replace(/\s+/g, ".*"), "i");

  const patients = await PatientModel.find({
    clinicId,
    isActive: true,
    $or: [
      { $text: { $search: query } },
      { firstName: { $regex: looseRegex } },
      { lastName: { $regex: looseRegex } },
      { searchName: { $regex: normalizedQuery } },
      { systemId: { $regex: looseRegex } },
    ],
  })
    .limit(30)
    .lean();

  const ranked = (patients as unknown as PatientDocument[]).map((patient) => {
    const name = normalize(`${patient.firstName}${patient.lastName}`);
    const distance = levenshteinDistance(normalizedQuery, name.slice(0, normalizedQuery.length));
    return {
      patient,
      distance,
    };
  });

  ranked.sort((a, b) => a.distance - b.distance);

  return ranked
    .slice(0, 10)
    .map((entry) => toContractPatient(entry.patient as unknown as Parameters<typeof toContractPatient>[0]));
};
