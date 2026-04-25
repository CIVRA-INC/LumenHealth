# File and Media Storage Strategy

> Version: 1.0.0 — CHORD-019
> Owner: Backend Platform
> Review trigger: new asset type, storage provider change, retention policy change, or PHI classification update

---

## Purpose

This document defines the storage adapter boundary, allowed file formats, size limits, image transformation rules, and retention policy for all file and media assets in LumenHealth. It covers profile images and any session or encounter attachments introduced in future sprints.

---

## Storage Adapter Boundary

All file I/O must go through a single storage adapter interface. No workspace may call a cloud storage SDK directly — all calls route through `apps/api/src/lib/storage/`.

```ts
// apps/api/src/lib/storage/storage.adapter.ts
export interface StorageAdapter {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>; // returns public or signed URL
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
}
```

The active adapter is selected by the `STORAGE_PROVIDER` environment variable. Supported values:

| Value | Adapter | Use Case |
|---|---|---|
| `local` | Local filesystem under `apps/api/uploads/` | Development and CI only |
| `s3` | AWS S3 (or S3-compatible) | Production |

The adapter is injected at the composition root (`createApp`). Tests use the `local` adapter or a mock.

---

## Object Key Convention

All stored objects follow a structured key:

```
<clinicId>/<assetType>/<entityId>/<filename>
```

| Segment | Description | Example |
|---|---|---|
| `clinicId` | Tenant scope | `clinic_abc123` |
| `assetType` | Category of asset | `profile`, `attachment` |
| `entityId` | ID of the owning record | `user_xyz789` |
| `filename` | Sanitised original name or generated name | `avatar.webp`, `doc_001.pdf` |

Example key: `clinic_abc123/profile/user_xyz789/avatar.webp`

Keys must be generated server-side. Client-supplied filenames must be sanitised (strip path separators, control characters, and non-ASCII characters) before use.

---

## Allowed File Types

### Profile Images

| Format | MIME Type | Max Size |
|---|---|---|
| JPEG | `image/jpeg` | 5 MB |
| PNG | `image/png` | 5 MB |
| WebP | `image/webp` | 5 MB |

All other formats are rejected with HTTP 415.

### Document Attachments (future)

| Format | MIME Type | Max Size |
|---|---|---|
| PDF | `application/pdf` | 20 MB |

---

## Image Transformations

Profile images are resized and converted to WebP on upload before storage. This keeps storage costs low and ensures consistent delivery dimensions.

| Variant | Dimensions | Format | Quality |
|---|---|---|---|
| `avatar` | 256 × 256 px (crop to square) | WebP | 85% |
| `thumbnail` | 64 × 64 px (crop to square) | WebP | 80% |

Transformation is performed in `apps/api` using the `sharp` library (already a transitive dependency via Next.js). The original file is discarded after transformation — only the processed variants are stored.

```ts
// Transformation example
import sharp from 'sharp';

const avatar = await sharp(inputBuffer)
  .resize(256, 256, { fit: 'cover' })
  .webp({ quality: 85 })
  .toBuffer();
```

---

## Upload Flow

1. Client sends `multipart/form-data` POST to `/api/v1/users/:id/avatar`.
2. Controller validates MIME type and file size before passing to the service.
3. Service calls the transformation pipeline, then the storage adapter.
4. Storage adapter returns the object key (not a URL).
5. Service persists the key to the `users` collection (`avatarKey` field).
6. Controller returns the signed URL for immediate display.

The URL is never stored in MongoDB — it is generated on demand from the key.

---

## URL Access

### Public Assets

Profile images are not public by default. All URLs are signed with a short TTL.

| Asset Type | URL TTL | Notes |
|---|---|---|
| Profile avatar | 1 hour | Regenerated on each profile fetch |
| Document attachment | 15 minutes | Regenerated on each document fetch |

### Signed URL Generation

```ts
const url = await storageAdapter.getSignedUrl(user.avatarKey, 3600);
```

The signed URL is included in the API response but never persisted.

---

## Retention Policy

| Asset Type | Retention | Deletion Trigger |
|---|---|---|
| Profile avatar | Lifetime of user account | User deletion or avatar replacement |
| Document attachment | Lifetime of encounter | Encounter hard-delete (not currently permitted) |
| Orphaned objects (no DB reference) | 30 days | Scheduled cleanup job |

When a user replaces their avatar, the previous object is deleted from storage immediately.

---

## PHI Classification

Profile images are considered **potentially sensitive** but not directly PHI under most jurisdictions. However:

- Object keys must never include patient names, dates of birth, or contact details.
- Signed URLs must not be logged.
- Access to signed URL generation must be gated by `requireAuth` middleware.
- Audit log entries for upload and delete operations must include `correlationId` and `userId` but must not include the signed URL.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `STORAGE_PROVIDER` | Adapter selector | `s3` |
| `S3_BUCKET` | S3 bucket name | `lumenhealth-assets-prod` |
| `S3_REGION` | AWS region | `us-east-1` |
| `S3_ACCESS_KEY_ID` | AWS access key | — |
| `S3_SECRET_ACCESS_KEY` | AWS secret key | — |
| `LOCAL_UPLOAD_DIR` | Local adapter path (dev only) | `./uploads` |

---

## Review Checklist

When adding a new asset type:

- [ ] Asset type added to the allowed formats table
- [ ] Object key convention followed
- [ ] Transformation pipeline defined (if image)
- [ ] Retention policy documented
- [ ] PHI classification confirmed
- [ ] Signed URL TTL set appropriately
- [ ] Audit log entries do not include signed URLs
- [ ] `npm run check:boundaries` passes (no direct SDK calls outside the adapter)
