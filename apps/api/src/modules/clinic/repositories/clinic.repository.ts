import type { Clinic, ClinicStatus } from '@lumen/types';

const store = new Map<string, Clinic>();
const slugIndex = new Map<string, string>();
export const clinicStore = {
  save(clinic: Clinic): Clinic {
    store.set(clinic.clinicId, clinic);
    slugIndex.set(clinic.slug, clinic.clinicId);
    return clinic;
  },

  findById(clinicId: string): Clinic | undefined {
    return store.get(clinicId);
  },

  findBySlug(slug: string): Clinic | undefined {
    const id = slugIndex.get(slug);
    return id ? store.get(id) : undefined;
  },

  list(filter?: { status?: ClinicStatus }): Clinic[] {
    const all = Array.from(store.values());
    if (!filter?.status) return all;
    return all.filter((c) => c.status === filter.status);
  },

  _reset(): void {
    store.clear();
    slugIndex.clear();
  },
};
