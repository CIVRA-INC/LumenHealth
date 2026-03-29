import { QueueEncounterModel } from "./models/queue-encounter.model";

type QueueLifecycleInput = {
  clinicId: string;
  encounterId: string;
  queueStatus?: "WAITING" | "TRIAGE" | "CONSULTATION";
  encounterStatus?: "OPEN" | "IN_PROGRESS" | "CLOSED";
  closedAt?: Date | null;
};

export const syncQueueEncounterState = async ({
  clinicId,
  encounterId,
  queueStatus,
  encounterStatus,
  closedAt,
}: QueueLifecycleInput) => {
  const nextQueueStatus =
    queueStatus ?? (encounterStatus === "IN_PROGRESS" ? "CONSULTATION" : undefined);

  const nextEncounterStatus = encounterStatus ?? undefined;

  if (!nextQueueStatus && !nextEncounterStatus && !closedAt) {
    return null;
  }

  return QueueEncounterModel.findOneAndUpdate(
    { clinicId, encounterId, encounterStatus: { $ne: "CLOSED" } },
    {
      $set: {
        ...(nextQueueStatus ? { queueStatus: nextQueueStatus } : {}),
        ...(nextEncounterStatus ? { encounterStatus: nextEncounterStatus } : {}),
        ...(closedAt ? { closedAt } : {}),
      },
    },
    { new: true },
  ).lean();
};
