// CHORD-060: contract tests for profile APIs and slug behavior

import { reserveSlug, isSlugAvailable } from "./slug.service";
import { attachWallet, markWalletVerified, getWalletMetadata } from "./wallet-metadata.service";
import { setModerationState, isProfileVisible } from "./moderation.service";
import { resolveDisplayName, updatePrivacySettings } from "./fan-privacy.service";

// Minimal test harness (no external runner dependency)
type TestFn = () => Promise<void>;
const tests: { name: string; fn: TestFn }[] = [];
const it = (name: string, fn: TestFn) => tests.push({ name, fn });

// --- slug contracts ---
it("reserveSlug rejects invalid format", async () => {
  const r = await reserveSlug("a1", "BAD SLUG!");
  if (r.ok) throw new Error("expected ok=false");
});

it("reserveSlug accepts valid slug", async () => {
  const r = await reserveSlug("artist-1", "cool-artist");
  if (!r.ok) throw new Error(`expected ok=true, got ${r.reason}`);
});

it("isSlugAvailable returns false after reservation", async () => {
  await reserveSlug("artist-2", "taken-slug");
  const available = await isSlugAvailable("taken-slug");
  if (available) throw new Error("slug should not be available");
});

// --- wallet metadata contracts ---
it("attachWallet rejects non-Stellar address", async () => {
  const r = await attachWallet("artist-1", "not-a-wallet");
  if (r.ok) throw new Error("expected ok=false");
});

it("markWalletVerified returns false for unknown artist", async () => {
  const ok = await markWalletVerified("ghost-artist");
  if (ok) throw new Error("expected false");
});

it("getWalletMetadata returns null for unknown artist", async () => {
  const meta = await getWalletMetadata("nobody");
  if (meta !== null) throw new Error("expected null");
});

// --- moderation visibility contracts ---
it("hidden profile is not publicly visible", async () => {
  await setModerationState("profile-x", "hidden", "admin-1", "spam");
  const visible = await isProfileVisible("profile-x");
  if (visible) throw new Error("hidden profile should not be visible");
});

it("clear profile is publicly visible", async () => {
  await setModerationState("profile-y", "clear", "admin-1");
  const visible = await isProfileVisible("profile-y");
  if (!visible) throw new Error("clear profile should be visible");
});

// --- fan privacy contracts ---
it("anonymous visibility hides real name", async () => {
  await updatePrivacySettings("fan-1", "anonymous");
  const name = await resolveDisplayName("fan-1", "Alice");
  if (name !== "Anonymous") throw new Error(`expected Anonymous, got ${name}`);
});

it("real_name visibility returns real name", async () => {
  await updatePrivacySettings("fan-2", "real_name");
  const name = await resolveDisplayName("fan-2", "Bob");
  if (name !== "Bob") throw new Error(`expected Bob, got ${name}`);
});

export { tests };
