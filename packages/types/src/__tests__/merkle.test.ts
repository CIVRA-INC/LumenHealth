import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildMerkleTree, getMerkleProof, verifyMerkleProof } from "../merkle.js";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const leavesOf = (n: number) => Array.from({ length: n }, (_, i) => sha(`leaf-${i}`));
const pair = (a: string, b: string) => createHash("sha256").update(a).update(b).digest("hex");

describe("buildMerkleTree", () => {
  it("throws for zero leaves", () => {
    expect(() => buildMerkleTree([])).toThrow(/zero leaves/);
  });

  it("makes a single leaf its own root with an empty proof", () => {
    const [leaf] = leavesOf(1);
    const tree = buildMerkleTree([leaf!]);
    expect(tree.root).toBe(leaf);
    expect(getMerkleProof(tree, 0)).toEqual([]);
    expect(verifyMerkleProof(leaf!, [], tree.root)).toBe(true);
  });

  it("hashes two leaves as one pair", () => {
    const [a, b] = leavesOf(2);
    expect(buildMerkleTree([a!, b!]).root).toBe(pair(a!, b!));
  });

  it("pairs an odd last node with itself", () => {
    const [a, b, c] = leavesOf(3);
    const tree = buildMerkleTree([a!, b!, c!]);
    expect(tree.layers[1]).toEqual([pair(a!, b!), pair(c!, c!)]);
    expect(tree.root).toBe(pair(pair(a!, b!), pair(c!, c!)));
  });

  it("pins a known-answer root for a fixed three-leaf input", () => {
    // Computed from the documented rule (SHA-256 over left||right, odd node
    // duplicated). A change to pair ordering or odd-node handling changes it.
    const leaves = ["a", "b", "c"].map(sha);
    const expected = pair(pair(leaves[0]!, leaves[1]!), pair(leaves[2]!, leaves[2]!));
    expect(buildMerkleTree(leaves).root).toBe(expected);
  });
});

describe("proofs", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])("every leaf verifies in a tree of %i leaves", (n) => {
    const tree = buildMerkleTree(leavesOf(n));
    for (let i = 0; i < n; i++) {
      const proof = getMerkleProof(tree, i);
      expect(verifyMerkleProof(tree.leaves[i]!, proof, tree.root)).toBe(true);
    }
  });

  it("uses the left/right position convention", () => {
    const tree = buildMerkleTree(leavesOf(4));
    expect(getMerkleProof(tree, 0)[0]!.position).toBe("right");
    expect(getMerkleProof(tree, 1)[0]!.position).toBe("left");
  });

  it("rejects a tampered leaf, tampered sibling and wrong root", () => {
    const tree = buildMerkleTree(leavesOf(5));
    const proof = getMerkleProof(tree, 2);
    expect(verifyMerkleProof(sha("forged"), proof, tree.root)).toBe(false);

    const tampered = proof.map((step, i) => (i === 0 ? { ...step, hash: sha("x") } : step));
    expect(verifyMerkleProof(tree.leaves[2]!, tampered, tree.root)).toBe(false);

    expect(verifyMerkleProof(tree.leaves[2]!, proof, sha("other-root"))).toBe(false);
  });

  it("rejects out-of-range leaf indexes", () => {
    const tree = buildMerkleTree(leavesOf(3));
    expect(() => getMerkleProof(tree, -1)).toThrow(/out of range/);
    expect(() => getMerkleProof(tree, 3)).toThrow(/out of range/);
  });
});
