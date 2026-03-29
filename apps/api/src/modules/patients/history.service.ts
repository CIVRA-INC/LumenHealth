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

  return {
    patient: {
      id: String(patient._id),
      systemId: patient.systemId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      sex: patient.sex,
      dateOfBirth: patient.dateOfBirth.toISOString(),
    },
    encounters: mappedEncounters,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      source: "db",
    },
  };
};
