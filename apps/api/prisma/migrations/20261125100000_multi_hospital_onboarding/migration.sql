-- Multi-hospital onboarding: platform operators, organisation lifecycle and invitations.
-- Forward-only and additive. No existing row is modified or removed:
--   * users.platformRole, organizations.status/suspendedAt are new columns (NULL / 'ACTIVE' defaults)
--   * sessions.membershipId/branchId become nullable (platform-operator sessions carry no organisation scope)
--   * invitations and invitation_branches are new tables
-- Row-level security on every existing table is untouched.


-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvitationDelivery" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "platformRole" "PlatformRole";

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "membershipId" DROP NOT NULL,
ALTER COLUMN "branchId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "invitedByUserId" UUID NOT NULL,
    "deliveryStatus" "InvitationDelivery" NOT NULL DEFAULT 'PENDING',
    "deliveryError" TEXT,
    "lastSentAt" TIMESTAMPTZ(3),
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMPTZ(3),
    "acceptedByUserId" UUID,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_branches" (
    "invitationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    CONSTRAINT "invitation_branches_pkey" PRIMARY KEY ("invitationId","branchId")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_tokenHash_key" ON "invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "invitations_organizationId_status_createdAt_idx" ON "invitations"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_id_organizationId_key" ON "invitations"("id", "organizationId");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_branches" ADD CONSTRAINT "invitation_branches_invitationId_organizationId_fkey" FOREIGN KEY ("invitationId", "organizationId") REFERENCES "invitations"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_branches" ADD CONSTRAINT "invitation_branches_branchId_organizationId_fkey" FOREIGN KEY ("branchId", "organizationId") REFERENCES "branches"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Hand-written invariants Prisma cannot express ─────────────────────────────

-- A session is either organisation-scoped (membership AND branch) or platform-scoped (neither).
ALTER TABLE sessions ADD CONSTRAINT sessions_scope_consistent
  CHECK (("membershipId" IS NULL) = ("branchId" IS NULL));

-- Platform-scoped sessions are only valid for a user who holds a platform role (enforced in the
-- application; the CHECK above guarantees the shape). Only platform users may have a platform role.

-- An email can have at most one outstanding invitation per organisation.
CREATE UNIQUE INDEX invitations_one_pending_per_email
  ON invitations ("organizationId", email) WHERE status = 'PENDING';

-- Invitation state must be internally consistent.
ALTER TABLE invitations ADD CONSTRAINT invitations_state_consistent CHECK (
  (status = 'ACCEPTED') = ("acceptedAt" IS NOT NULL AND "acceptedByUserId" IS NOT NULL)
  AND (status = 'REVOKED') = ("revokedAt" IS NOT NULL)
);
ALTER TABLE invitations ADD CONSTRAINT invitations_email_lowercase CHECK (email = lower(email));

-- Least privilege: the API role may read, create and update invitations; it can never delete them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lumen_app') THEN
    GRANT SELECT, INSERT, UPDATE ON invitations, invitation_branches TO lumen_app;
  END IF;
END
$$;
