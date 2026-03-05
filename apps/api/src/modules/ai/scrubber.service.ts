import type { ClinicalNote, Diagnosis, Patient, Vitals } from "@lumen/types";

type AssembleContextInput = {
  patient: Patient;
  vitals: Vitals[];
  notes: ClinicalNote[];
  diagnoses: Diagnosis[];
  now?: Date;
};

type AgeResult = {
  years: number;
  months: number;
};

const clampNonNegative = (value: number) => (value < 0 ? 0 : value);

export const calculateAgeFromDateOfBirth = (dateOfBirthIso: string, now = new Date()): AgeResult => {
  const dob = new Date(dateOfBirthIso);
  if (Number.isNaN(dob.getTime())) {
    throw new Error("Invalid patient dateOfBirth");
  }

  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  let months = now.getUTCMonth() - dob.getUTCMonth();

  if (now.getUTCDate() < dob.getUTCDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  years = clampNonNegative(years);
  months = clampNonNegative(months);

  return { years, months };
};

const sanitizeContent = (value: string) => value.replace(/\s+/g, " ").trim();

const formatVitals = (rows: Vitals[]) => {
  if (rows.length === 0) {
    return "- No vitals available";
  }

  return rows
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(
      (row) =>
        `- ${new Date(row.timestamp).toISOString()}: BP ${row.bpSystolic}/${row.bpDiastolic}, HR ${row.heartRate}, Temp ${row.temperature}C, RR ${row.respirationRate}, SpO2 ${row.spO2}%, Weight ${row.weight}kg`,
    )
    .join("\n");
};

const formatNotes = (rows: ClinicalNote[]) => {
  if (rows.length === 0) {
    return "- No notes available";
  }

  return rows
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((row) => `- ${new Date(row.timestamp).toISOString()} [${row.type}]: ${sanitizeContent(row.content)}`)
    .join("\n");
};

const formatDiagnoses = (rows: Diagnosis[]) => {
  if (rows.length === 0) {
    return "- No diagnoses available";
  }

  return rows.map((row) => `- ${row.code}: ${row.description} (${row.status})`).join("\n");
};

export const assembleContext = ({
  patient,
  vitals,
  notes,
  diagnoses,
  now,
}: AssembleContextInput): string => {
  const age = calculateAgeFromDateOfBirth(patient.dateOfBirth, now);

  // PHI scrub rules: omit firstName, lastName, contactNumber, address, exact DOB.
  const header = [
    "# Clinical Context (PHI-Scrubbed)",
    `Patient: ${age.years}y ${age.months}m, Sex ${patient.sex}`,
    `System ID: ${patient.systemId}`,
    `Active: ${patient.isActive ? "yes" : "no"}`,
  ].join("\n");

  const body = [
    "## Vitals",
    formatVitals(vitals),
    "## Clinical Notes",
    formatNotes(notes),
    "## Diagnoses",
    formatDiagnoses(diagnoses),
  ].join("\n");

  return `${header}\n\n${body}`;
};
