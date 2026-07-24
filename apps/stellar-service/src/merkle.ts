import { createHash } from "node:crypto";
import type { MerkleProofStep } from "@lumen/types";

export type MerkleTree = {
  root: string;
  leaves: string[];
  /** Bottom-up layers of the tree; layers[0] is the leaves, the last layer is [root]. */
  layers: string[][];
};

function hashPair(left: string, right: string): string {
  return createHash("sha256").update(left).update(right).digest("hex");
}

/**
 * Builds a bottom-up Merkle tree over `leaves` (expected to already be
 * SHA-256 hex digests, e.g. `AuditEntry.sha256Hash`). An odd node at any
 * level is paired with itself (standard "duplicate last node" rule) so
 * every level has an even width.
 */
export function buildMerkleTree(leaves: string[]): MerkleTree {
  if (leaves.length === 0) {
    throw new Error("cannot build a Merkle tree from zero leaves");
  }

  let layer = [...leaves];
  const layers: string[][] = [layer];

  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!;
      const right = i + 1 < layer.length ? layer[i + 1]! : left;
      next.push(hashPair(left, right));
    }
    layers.push(next);
    layer = next;
  }

  return { root: layer[0]!, leaves, layers };
}

/** Builds the inclusion proof for the leaf at `leafIndex` in `tree`. */
export function getMerkleProof(tree: MerkleTree, leafIndex: number): MerkleProofStep[] {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error(`leafIndex ${leafIndex} out of range for ${tree.leaves.length} leaves`);
  }

  const proof: MerkleProofStep[] = [];
  let index = leafIndex;

  for (let level = 0; level < tree.layers.length - 1; level++) {
    const currentLayer = tree.layers[level]!;
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;
    const sibling = siblingIndex < currentLayer.length ? currentLayer[siblingIndex]! : currentLayer[index]!;

    proof.push({ hash: sibling, position: isRightNode ? "left" : "right" });
    index = Math.floor(index / 2);
  }

  return proof;
}

/** Recomputes the root from `leaf` and `proof`, and checks it matches `root`. */
export function verifyMerkleProof(leaf: string, proof: MerkleProofStep[], root: string): boolean {
  let computed = leaf;
  for (const step of proof) {
    computed = step.position === "left" ? hashPair(step.hash, computed) : hashPair(computed, step.hash);
  }
  return computed === root;
}
