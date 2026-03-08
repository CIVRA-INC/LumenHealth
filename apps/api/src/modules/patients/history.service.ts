import mongoose from "mongoose";
import { PatientModel } from "./models/patient.model";

type Pagination = {
  page: number;
  limit: number;
  skip: number;
};

export const toPagination = (page: number, limit: number): Pagination => ({
  page,
  limit,
  skip: (page - 1) * limit,
});

const iso = (date: Date) => date.toISOString();

const makeMockEncounter = (
  id: string,
  openedAt: Date,
  closedAt: Date,
  summary: string,
) => ({
  id,
  status: "CLOSED",
  openedAt: iso(openedAt),
  closedAt: iso(closedAt),
  providerId: "mock-provider-1",
  vitals: [
    {
      id: `${id}-v1`,
      timestamp: iso(new Date(openedAt.getTime() + 20 * 60_000)),
      bpSystolic: 122,
      bpDiastolic: 80,
      heartRate: 88,
      temperature: 37,
      respirationRate: 16,
      spO2: 98,
      weight: 72,
    },
  ],
  notes: [
    {
      id: `${id}-n1`,
      type: "SOAP",
      authorId: "mock-provider-1",
      timestamp: iso(new Date(openedAt.getTime() + 35 * 60_000)),
      content: summary,
    },
  ],
  diagnoses: [
    {
      id: `${id}-d1`,
      code: "B50.9",
      description: "Malaria, unspecified",
      status: "CONFIRMED",
    },
  ],
});

export const buildMockHistoryEncounters = () => {
  const now = Date.now();

  return [
    makeMockEncounter(
      "mock-enc-3003",
      new Date(now - 7 * 24 * 60 * 60_000),
      new Date(now - 7 * 24 * 60 * 60_000 + 70 * 60_000),
      "Patient improved after antimalarial dose.",
    ),
    makeMockEncounter(
      "mock-enc-3002",
      new Date(now - 21 * 24 * 60 * 60_000),
      new Date(now - 21 * 24 * 60 * 60_000 + 65 * 60_000),
      "Follow-up visit with reduced fever.",
    ),
    makeMockEncounter(
      "mock-enc-3001",
      new Date(now - 38 * 24 * 60 * 60_000),
      new Date(now - 38 * 24 * 60 * 60_000 + 95 * 60_000),
      "Initial presentation with high fever and chills.",
    ),
  ];
};

export const getPatientHistory = async (input: {
  patientId: string;
  clinicId: string;
  page: number;
  limit: number;
}) => {
  const patient = await PatientModel.findOne({ _id: input.patientId, clinicId: input.clinicId }).lean();
  if (!patient) {
    return null;
  }

  const pagination = toPagination(input.page, input.limit);
  const encountersCollection = mongoose.connection.collection("encounters");

  const total = await encountersCollection.countDocuments({
    patientId: input.patientId,
    clinicId: input.clinicId,
  });

  const encounters = await encountersCollection
    .aggregate([
      {
        $match: {
          patientId: input.patientId,
          clinicId: input.clinicId,
        },
      },
      {
        $sort: {
          openedAt: -1,
        },
      },
      {
        $skip: pagination.skip,
      },
      {
        $limit: pagination.limit,
      },
      {
        $lookup: {
          from: "vitals",
          localField: "_id",
          foreignField: "encounterId",
          as: "vitals",
        },
      },
      {
        $lookup: {
          from: "clinicalnotes",
          localField: "_id",
          foreignField: "encounterId",
          as: "notes",
        },
      },
      {
        $lookup: {
          from: "diagnoses",
          localField: "_id",
          foreignField: "encounterId",
          as: "diagnoses",
        },
      },
      {
        $project: {
          id: { $toString: "$_id" },
          status: 1,
          openedAt: 1,
          closedAt: 1,
          providerId: 1,
          vitals: {
            $map: {
              input: "$vitals",
              as: "v",
              in: {
                id: { $toString: "$$v._id" },
                timestamp: "$$v.timestamp",
                bpSystolic: "$$v.bpSystolic",
                bpDiastolic: "$$v.bpDiastolic",
                heartRate: "$$v.heartRate",
                temperature: "$$v.temperature",
                respirationRate: "$$v.respirationRate",
                spO2: "$$v.spO2",
                weight: "$$v.weight",
              },
            },
          },
          notes: {
            $map: {
              input: "$notes",
              as: "n",
              in: {
                id: { $toString: "$$n._id" },
                type: "$$n.type",
                authorId: "$$n.authorId",
                timestamp: "$$n.timestamp",
                content: "$$n.content",
              },
            },
          },
          diagnoses: {
            $map: {
              input: "$diagnoses",
              as: "d",
              in: {
                id: { $toString: "$$d._id" },
                code: "$$d.code",
                description: "$$d.description",
                status: "$$d.status",
              },
            },
          },
        },
      },
    ])
    .toArray();

  const mappedEncounters = encounters.map((encounter) => ({
    ...encounter,
    openedAt: encounter.openedAt ? new Date(encounter.openedAt).toISOString() : null,
    closedAt: encounter.closedAt ? new Date(encounter.closedAt).toISOString() : null,
    vitals: (encounter.vitals ?? []).map((v: Record<string, unknown>) => ({
      ...v,
      timestamp: v.timestamp ? new Date(v.timestamp as string | Date).toISOString() : null,
    })),
    notes: (encounter.notes ?? []).map((n: Record<string, unknown>) => ({
      ...n,
      timestamp: n.timestamp ? new Date(n.timestamp as string | Date).toISOString() : null,
    })),
  }));

  const fallback = buildMockHistoryEncounters();
  const hasReal = mappedEncounters.length > 0;

  const fallbackPageSlice = fallback.slice(pagination.skip, pagination.skip + pagination.limit);

  return {
    patient: {
      id: String(patient._id),
      systemId: patient.systemId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      sex: patient.sex,
      dateOfBirth: patient.dateOfBirth.toISOString(),
    },
    encounters: hasReal ? mappedEncounters : fallbackPageSlice,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: hasReal ? total : fallback.length,
      totalPages: Math.max(1, Math.ceil((hasReal ? total : fallback.length) / pagination.limit)),
      source: hasReal ? "db" : "mock",
    },
  };
};
