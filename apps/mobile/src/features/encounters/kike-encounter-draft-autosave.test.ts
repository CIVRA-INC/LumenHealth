import { describe, expect, it } from "vitest";
import {
  autosaveEncounterDraft,
  clearEncounterDraftAfterSubmit,
  createEmptyEncounterDraft,
  loadEncounterDraft,
  mergeEncounterDraft,
  toEncounterSubmitPayload,
  validateEncounterDraft,
  type KikeDraftStore,
} from "./kike-encounter-draft-autosave";

function memoryStore(): KikeDraftStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    async load(key) { return map.get(key) ?? null; },
    async save(key, value) { map.set(key, value); },
    async remove(key) { map.delete(key); },
  };
}

describe("kike encounter draft autosave", () => {
  it("persists draft and reloads it after app restart simulation", async () => {
    const store = memoryStore();
    let draft = createEmptyEncounterDraft("p1", "c1", 1000);
    draft = mergeEncounterDraft(draft, { chiefComplaint: "Headache", notes: "N", plan: "P" }, 2000);
    await autosaveEncounterDraft(store, draft);
    const loaded = await loadEncounterDraft(store, "p1", "c1");
    expect(loaded?.sections.chiefComplaint).toBe("Headache");
    expect(loaded?.updatedAtMs).toBe(2000);
  });

  it("clears draft after submit and builds idempotent payload", async () => {
    const store = memoryStore();
    const draft = mergeEncounterDraft(createEmptyEncounterDraft("p1", "c1", 5), { chiefComplaint: "C", notes: "N", plan: "P" });
    await autosaveEncounterDraft(store, draft);
    expect(validateEncounterDraft(draft).ok).toBe(true);
    const payload = toEncounterSubmitPayload(draft);
    expect(payload.idempotencyKey).toBe(draft.idempotencyKey);
    await clearEncounterDraftAfterSubmit(store, "p1", "c1");
    expect(await loadEncounterDraft(store, "p1", "c1")).toBeNull();
  });
});
