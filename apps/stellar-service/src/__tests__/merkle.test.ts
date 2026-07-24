import { describe, expect, it } from "vitest";
import { sha256Hash } from "@lumen/types";
import { buildMerkleTree, getMerkleProof, verifyMerkleProof } from "../merkle.js";

function leaves(n: number): string[] {
  return Array.from({ length: n }, (_, i) => sha256Hash({ auditId: `a-${i}` }));
}

describe("buildMerkleTree", () => {
  it("throws on zero leaves", () => {
    expect(() => buildMerkleTree([])).toThrow();
  });

  it("root equals the single leaf when there is only one entry", () => {
    const [leaf] = leaves(1);
    const tree = buildMerkleTree([leaf!]);
    expect(tree.root).toBe(leaf);
  });

  it("is deterministic for the same leaf set", () => {
    const l = leaves(5);
    expect(buildMerkleTree(l).root).toBe(buildMerkleTree([...l]).root);
  });

  it("produces a different root if any leaf changes", () => {
    const l = leaves(4);
    const tampered = [...l];
    tampered[2] = sha256Hash({ auditId: "tampered" });
    expect(buildMerkleTree(l).root).not.toBe(buildMerkleTree(tampered).root);
  });

  it("produces a different root if leaf order changes", () => {
    const l = leaves(4);
    const reordered = [l[1]!, l[0]!, l[2]!, l[3]!];
    expect(buildMerkleTree(l).root).not.toBe(buildMerkleTree(reordered).root);
  });

  it("handles odd leaf counts via duplicate-last-node", () => {
    const l = leaves(3);
    const tree = buildMerkleTree(l);
    expect(tree.root).toHaveLength(64);
  });
});

describe("getMerkleProof / verifyMerkleProof", () => {
  it("verifies every leaf's proof against the root for an even-sized tree", () => {
    const l = leaves(8);
    const tree = buildMerkleTree(l);
    l.forEach((leaf, i) => {
      const proof = getMerkleProof(tree, i);
      expect(verifyMerkleProof(leaf, proof, tree.root)).toBe(true);
    });
  });

  it("verifies every leaf's proof against the root for odd-sized trees", () => {
    for (const size of [1, 2, 3, 5, 7, 9]) {
      const l = leaves(size);
      const tree = buildMerkleTree(l);
      l.forEach((leaf, i) => {
        const proof = getMerkleProof(tree, i);
        expect(verifyMerkleProof(leaf, proof, tree.root)).toBe(true);
      });
    }
  });

  it("fails verification if the leaf is wrong", () => {
    const l = leaves(6);
    const tree = buildMerkleTree(l);
    const proof = getMerkleProof(tree, 2);
    expect(verifyMerkleProof(sha256Hash({ auditId: "not-in-tree" }), proof, tree.root)).toBe(false);
  });

  it("fails verification if the proof is tampered with", () => {
    const l = leaves(6);
    const tree = buildMerkleTree(l);
    const proof = getMerkleProof(tree, 2);
    const tamperedProof = proof.map((step, i) =>
      i === 0 ? { ...step, hash: sha256Hash({ tampered: true }) } : step,
    );
    expect(verifyMerkleProof(l[2]!, tamperedProof, tree.root)).toBe(false);
  });

  it("fails verification against the wrong root", () => {
    const l = leaves(4);
    const tree = buildMerkleTree(l);
    const otherTree = buildMerkleTree([
      sha256Hash({ auditId: "other-0" }),
      sha256Hash({ auditId: "other-1" }),
      sha256Hash({ auditId: "other-2" }),
      sha256Hash({ auditId: "other-3" }),
    ]);
    const proof = getMerkleProof(tree, 0);
    expect(verifyMerkleProof(l[0]!, proof, otherTree.root)).toBe(false);
  });

  it("throws for an out-of-range leaf index", () => {
    const tree = buildMerkleTree(leaves(4));
    expect(() => getMerkleProof(tree, 4)).toThrow();
    expect(() => getMerkleProof(tree, -1)).toThrow();
  });
});
