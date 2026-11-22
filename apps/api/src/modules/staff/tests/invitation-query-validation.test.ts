import { describe, expect, it } from "vitest";
import { validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ListInvitationsQueryDto } from "../dto/invitation.dto.js";

describe("ListInvitationsQueryDto (#1466)", () => {
  it("accepts omitted and valid statuses", () => {
    expect(validateSync(plainToInstance(ListInvitationsQueryDto, {}))).toHaveLength(0);
    expect(validateSync(plainToInstance(ListInvitationsQueryDto, { status: "pending" }))).toHaveLength(0);
  });

  it("rejects invalid status", () => {
    const errors = validateSync(plainToInstance(ListInvitationsQueryDto, { status: "bogus" }));
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("status");
  });
});
