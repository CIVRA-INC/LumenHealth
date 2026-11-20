import { Injectable } from '@nestjs/common';
import type { Clinic, ClinicStatus } from '@lumen/types';

const copy = <T>(value: T): T => structuredClone(value);

@Injectable()
export class ClinicRepository {
  private store = new Map<string, Clinic>();
  private slugIndex = new Map<string, string>();

  save(clinic: Clinic): Clinic {
    this.store.set(clinic.clinicId, copy(clinic));
    this.slugIndex.set(clinic.slug, clinic.clinicId);
    return copy(clinic);
  }

  findById(clinicId: string): Clinic | undefined {
    const found = this.store.get(clinicId);
    return found ? copy(found) : undefined;
  }

  findBySlug(slug: string): Clinic | undefined {
    const id = this.slugIndex.get(slug);
    const found = id ? this.store.get(id) : undefined;
    return found ? copy(found) : undefined;
  }

  list(filter?: { status?: ClinicStatus }): Clinic[] {
    const all = Array.from(this.store.values()).map(copy);
    if (!filter?.status) return all;
    return all.filter((c) => c.status === filter.status);
  }

  _reset(): void {
    this.store.clear();
    this.slugIndex.clear();
  }
}

export const clinicStore = new ClinicRepository();
