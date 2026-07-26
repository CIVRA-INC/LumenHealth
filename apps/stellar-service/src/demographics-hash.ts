import { canonicalize, sha256Hash } from "@lumen/types";

export function hashDemographics(demographics: Record<string, unknown>): string {
  return sha256Hash(canonicalize(demographics));
}
