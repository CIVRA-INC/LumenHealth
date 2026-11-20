import { z } from "zod";
import { AssignableRoleSchema } from "./staff.js";

export const SendInvitationRequestSchema = z.object({
  email: z.string().email("a valid email is required"),
  role: AssignableRoleSchema,
});

export const AcceptInvitationRequestSchema = z.object({
  token: z.string().min(1, "token is required"),
  password: z.string().min(8, "password must be at least 8 characters"),
  name: z.string().min(2, "name must be at least 2 characters"),
});

export type SendInvitationRequest = z.infer<typeof SendInvitationRequestSchema>;
export type AcceptInvitationRequest = z.infer<typeof AcceptInvitationRequestSchema>;
