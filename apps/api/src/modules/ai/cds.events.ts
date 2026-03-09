import { EventEmitter } from "events";

export type VitalsCreatedEvent = {
  clinicId: string;
  encounterId: string;
  vitalsId: string;
};

type CdsEvents = {
  VitalsCreated: [VitalsCreatedEvent];
};

class TypedCdsEmitter extends EventEmitter {
  emit<K extends keyof CdsEvents>(event: K, ...args: CdsEvents[K]): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof CdsEvents>(event: K, listener: (...args: CdsEvents[K]) => void): this {
    return super.on(event, listener);
  }
}

export const cdsEvents = new TypedCdsEmitter();

export const emitVitalsCreated = (payload: VitalsCreatedEvent) => {
  cdsEvents.emit("VitalsCreated", payload);
};

