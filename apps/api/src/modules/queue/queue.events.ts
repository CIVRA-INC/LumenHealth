import { Response } from "express";

const subscribers = new Set<Response>();

export const subscribeQueueUpdates = (res: Response) => {
  subscribers.add(res);

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`event: heartbeat\\ndata: ${JSON.stringify({ ok: true })}\\n\\n`);
    }
  }, 15_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    subscribers.delete(res);
  };

  res.on("close", cleanup);
  res.on("finish", cleanup);
};

export const emitQueueUpdate = (payload: unknown) => {
  const data = `event: queue.update\\ndata: ${JSON.stringify(payload)}\\n\\n`;

  subscribers.forEach((res) => {
    if (res.writableEnded) {
      subscribers.delete(res);
      return;
    }

    res.write(data);
  });
};
