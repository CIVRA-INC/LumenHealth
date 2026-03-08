import { z } from "zod";

export const createClinicalNoteSchema = z
  .object({
    encounterId: z.string().trim().min(1).optional(),
    type: z.enum(["SOAP", "FREE_TEXT", "AI_SUMMARY", "CORRECTION"]),
    content: z.string().trim().min(1, "content is required"),
    correctionOfNoteId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "CORRECTION" && !value.correctionOfNoteId) {
      ctx.addIssue({
        code: "custom",
        path: ["correctionOfNoteId"],
        message: "correctionOfNoteId is required for CORRECTION notes",
      });
    }
  });

export const encounterNotesParamsSchema = z.object({
  encounterId: z.string().trim().min(1),
});

export const noteIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Note id must be a valid ObjectId"),
});

export type CreateClinicalNoteDto = z.infer<typeof createClinicalNoteSchema>;
export type EncounterNotesParamsDto = z.infer<typeof encounterNotesParamsSchema>;
export type NoteIdParamsDto = z.infer<typeof noteIdParamsSchema>;
