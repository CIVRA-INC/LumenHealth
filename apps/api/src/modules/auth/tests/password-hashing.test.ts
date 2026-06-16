import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("password hashing", () => {
  it("produces a bcrypt hash from a plaintext password", async () => {
    const hash = await bcrypt.hash("Passw0rd!", 12);
    expect(hash).toMatch(/^\$2[ab]\$12\$/);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await bcrypt.hash("Passw0rd!", 12);
    await expect(bcrypt.compare("Passw0rd!", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password against a hash", async () => {
    const hash = await bcrypt.hash("Passw0rd!", 12);
    await expect(bcrypt.compare("WrongPass!", hash)).resolves.toBe(false);
  });

  it("produces a different hash for the same input due to salt randomness", async () => {
    const [h1, h2] = await Promise.all([
      bcrypt.hash("Passw0rd!", 12),
      bcrypt.hash("Passw0rd!", 12),
    ]);
    expect(h1).not.toBe(h2);
  });

  it("hash output is never equal to the plaintext input", async () => {
    const hash = await bcrypt.hash("Passw0rd!", 12);
    expect(hash).not.toBe("Passw0rd!");
  });
});
