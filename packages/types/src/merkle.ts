import { createHash } from "node:crypto";
import type { MerkleProofStep } from "./audit.js";

export type MerkleTree = {
  root: string;
  leaves: string[];
  /** Bottom-up layers of the tree; layers[0] is the leaves, the last layer is [root]. */
  layers: string[][];
};

/**
 * Domain-separation prefix for *internal* node hashes. Because an internal
 * node is hashed as SHA-256(0x01 ‖ left ‖ right) while a leaf is a plain
 * SHA-256 digest of audit content (no prefix), an internal node hash can never
 * be reinterpreted as a leaf. This closes the CVE-2012-2459 class of
 * second-preimage weakness that the old un-prefixed construction had (see
 * issue #1019). Combined with promotion (below), it removes the ambiguity the
 * attack relied on.
 */
const INTERNAL_NODE_PREFIX = Buffer.from([0x01]);

function hashNode(left: string, right: string): string {
  return createHash("sha256").update(INTERNAL_NODE_PREFIX).update(left).update(right).digest("hex");
}

/**
 * Builds a bottom-up Merkle tree over `leaves` (expected to already be
 * SHA-256 hex digests, e.g. `AuditEntry.sha256Hash`). Internal nodes are
 * domain-separated (see {@link hashNode}), and an odd trailing node is
 * *promoted* unchanged to the next level rather than duplicated against
 * itself — the old "duplicate last node" rule is exactly the CVE-2012-2459
 * weakness (an attacker could append a copy of the last leaf to forge an
 * equivalent-looking root). Promotion makes an N-leaf tree and its
 * duplicate-padded (N+1) variant produce different roots (issue #1019).
 *
 * Leaves are left un-prefixed so a single-leaf tree's root is the leaf itself
 * (root == leaves[0]) and an empty proof verifies — the anchoring layer and
 * its callers rely on that for single-entry immediate anchors.
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
      if (i + 1 < layer.length) {
        next.push(hashNode(layer[i]!, layer[i + 1]!));
      } else {
        // Odd node out: promote it unchanged instead of duplicating it.
        next.push(layer[i]!);
      }
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

    if (siblingIndex < currentLayer.length) {
      proof.push({ hash: currentLayer[siblingIndex]!, position: isRightNode ? "left" : "right" });
    }
    // else: this node was promoted (no sibling at this level) — contributes no
    // proof step, matching buildMerkleTree's promotion of odd trailing nodes.

    index = Math.floor(index / 2);
  }

  return proof;
}

/** Recomputes the root from `leaf` and `proof`, and checks it matches `root`. */
export function verifyMerkleProof(leaf: string, proof: MerkleProofStep[], root: string): boolean {
  let computed = leaf;
  for (const step of proof) {
    computed = step.position === "left" ? hashNode(step.hash, computed) : hashNode(computed, step.hash);
  }
  return computed === root;
}
