import { Injectable } from '@nestjs/common';
import type { Clinic, ClinicStatus } from '@lumen/types';

@Injectable()
export class ClinicRepository {
  private store = new Map<string, Clinic>();
  private slugIndex = new Map<string, string>();

  save(clinic: Clinic): Clinic {
    this.store.set(clinic.clinicId, clinic);
    this.slugIndex.set(clinic.slug, clinic.clinicId);
    return clinic;
  }

  findById(clinicId: string): Clinic | undefined {
    return this.store.get(clinicId);
  }

  findBySlug(slug: string): Clinic | undefined {
    const id = this.slugIndex.get(slug);
    return id ? this.store.get(id) : undefined;
  }

  list(filter?: { status?: ClinicStatus }): Clinic[] {
    const all = Array.from(this.store.values());
    if (!filter?.status) return all;
    return all.filter((c) => c.status === filter.status);
  }

  _reset(): void {
    this.store.clear();
    this.slugIndex.clear();
  }
}

export const clinicStore = new ClinicRepository();
