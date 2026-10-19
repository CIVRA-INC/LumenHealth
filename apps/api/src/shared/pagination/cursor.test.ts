import { describe, expect, it } from "vitest";
import { paginateByCursor } from "./cursor.js";

describe("cursor pagination", () => {
  const items = ["e", "d", "c", "b", "a"];

  it("pages without total and stays stable when newer items arrive", () => {
    const first = paginateByCursor(items, (x) => x, undefined, 2);
    expect(first.items).toEqual(["e", "d"]);
    const withNew = ["f", ...items];
    const second = paginateByCursor(withNew, (x) => x, first.nextCursor, 2);
    expect(second.items).toEqual(["c", "b"]);
    expect(paginateByCursor(withNew, (x) => x, second.nextCursor, 2)).toEqual({ items: ["a"], nextCursor: undefined });
  });
});
