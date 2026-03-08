import { Response } from "express";

const subscribersByClinic = new Map<string, Set<Response>>();

export const subscribeQueueUpdates = (clinicId: string, res: Response) => {
  const clinicSubscribers = subscribersByClinic.get(clinicId) ?? new Set<Response>();
  clinicSubscribers.add(res);
  subscribersByClinic.set(clinicId, clinicSubscribers);

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    }
  }, 15_000);

  const cleanup = () => {
    clearInterval(heartbeat);

    const current = subscribersByClinic.get(clinicId);
    if (!current) return;

    current.delete(res);
    if (current.size === 0) {
      subscribersByClinic.delete(clinicId);
    }
  };

  res.on("close", cleanup);
  res.on("finish", cleanup);
};

export const emitQueueUpdate = (clinicId: string, payload: unknown) => {
  const clinicSubscribers = subscribersByClinic.get(clinicId);
  if (!clinicSubscribers || clinicSubscribers.size === 0) {
    return;
  }

  const data = `event: queue.update\ndata: ${JSON.stringify(payload)}\n\n`;

  clinicSubscribers.forEach((res) => {
    if (res.writableEnded) {
      clinicSubscribers.delete(res);
      return;
    }

    res.write(data);
  });

  if (clinicSubscribers.size === 0) {
    subscribersByClinic.delete(clinicId);
  }
};
