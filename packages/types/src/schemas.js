"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosisSchema = exports.ClinicalNoteSchema = exports.VitalsSchema = exports.EncounterSchema = exports.PatientSchema = void 0;
const zod_1 = require("zod");
exports.PatientSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    systemId: zod_1.z.string().min(1),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    dateOfBirth: zod_1.z.string().datetime(),
    sex: zod_1.z.enum(["M", "F", "O"]),
    contactNumber: zod_1.z.string().min(1),
    address: zod_1.z.string().min(1),
    isActive: zod_1.z.boolean(),
});
exports.EncounterSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    patientId: zod_1.z.string().min(1),
    providerId: zod_1.z.string().min(1),
    clinicId: zod_1.z.string().min(1),
    status: zod_1.z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]),
    openedAt: zod_1.z.string().datetime(),
    closedAt: zod_1.z.string().datetime().nullable(),
});
exports.VitalsSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    encounterId: zod_1.z.string().min(1),
    authorId: zod_1.z.string().min(1),
    timestamp: zod_1.z.string().datetime(),
    bpSystolic: zod_1.z.number(),
    bpDiastolic: zod_1.z.number(),
    heartRate: zod_1.z.number(),
    temperature: zod_1.z.number(),
    respirationRate: zod_1.z.number(),
    spO2: zod_1.z.number(),
    weight: zod_1.z.number(),
});
exports.ClinicalNoteSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    encounterId: zod_1.z.string().min(1),
    authorId: zod_1.z.string().min(1),
    type: zod_1.z.enum(["SOAP", "FREE_TEXT", "AI_SUMMARY", "CORRECTION"]),
    content: zod_1.z.string().min(1),
    timestamp: zod_1.z.string().datetime(),
});
exports.DiagnosisSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    encounterId: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    status: zod_1.z.enum(["SUSPECTED", "CONFIRMED", "RESOLVED"]),
});
