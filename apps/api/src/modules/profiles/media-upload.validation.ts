import { Request, Response, NextFunction } from "express";
import path from "path";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export interface MediaUploadMeta {
  fieldName: "avatar" | "banner";
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

export interface MediaValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMediaUpload(meta: MediaUploadMeta): MediaValidationResult {
  const errors: string[] = [];

  if (!ALLOWED_MIME.has(meta.mimeType)) {
    errors.push(`unsupported_mime:${meta.mimeType} — allowed: jpeg, png, webp`);
  }

  if (meta.sizeBytes > MAX_BYTES) {
    errors.push(`file_too_large:${meta.sizeBytes} — max ${MAX_BYTES} bytes`);
  }

  const ext = path.extname(meta.originalName).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    errors.push(`suspicious_extension:${ext}`);
  }

  return { valid: errors.length === 0, errors };
}

/** Express middleware — expects multer to have populated req.file */
export function mediaUploadGuard(req: Request, res: Response, next: NextFunction): void {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) { res.status(400).json({ error: "no_file" }); return; }

  const fieldName = file.fieldname as "avatar" | "banner";
  if (!["avatar", "banner"].includes(fieldName)) {
    res.status(400).json({ error: "invalid_field" }); return;
  }

  const result = validateMediaUpload({
    fieldName,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    originalName: file.originalname,
  });

  if (!result.valid) {
    res.status(422).json({ error: "media_validation_failed", details: result.errors }); return;
  }

  next();
}
