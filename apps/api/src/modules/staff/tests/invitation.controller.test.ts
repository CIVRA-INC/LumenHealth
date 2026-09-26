import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { InvitationModule } from '../invitation.module.js';
import { invitationStore } from "../repositories/invitation.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";
import type { UserRole } from "@lumen/types";

function tokenWithRole(clinicId: string, role: UserRole): string {
  return accessTokenSigner.sign({ sub: `user-${role}`, clinicId, role });
}

const VALID_INVITE = {
  email: "newdoc@clinic.com",
  role: "clinician",
};

describe("InvitationController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [InvitationModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    invitationStore._reset();
  });

  describe("POST /api/v1/staff/invitations — send", () => {
    it("returns 201 with invitation on valid input", async () => {
      const { a } = buildTwoClinicFixture();
      const res = await request.default(app.getHttpServer())
        .post('/api/v1/staff/invitations')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_INVITE);
      
      expect(res.status).toBe(201);
      const inv = res.body.invitation;
      expect(inv.status).toBe("pending");
      expect(inv.email).toBe(VALID_INVITE.email);
    });

    it("returns 400 when email is invalid", async () => {
      const { a } = buildTwoClinicFixture();
      const res = await request.default(app.getHttpServer())
        .post('/api/v1/staff/invitations')
        .set('Authorization', `Bearer ${a.token}`)
        .send({ ...VALID_INVITE, email: "not-email" });
      expect(res.status).toBe(400);
      expect(res.body.field).toBe("email");
    });
  });

  describe("POST /api/v1/staff/invitations/accept — accept", () => {
    it("returns 201 and creates an identity when token is valid", async () => {
      const { a } = buildTwoClinicFixture();
      const sentRes = await request.default(app.getHttpServer())
        .post('/api/v1/staff/invitations')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_INVITE);
      const token = sentRes.body.invitation.token;

      const res = await request.default(app.getHttpServer())
        .post('/api/v1/staff/invitations/accept')
        .send({
          token,
          password: "SecurePass1!",
          name: "Dr. Okafor",
        });
      
      expect(res.status).toBe(201);
      expect(typeof res.body.userId).toBe("string");
    });
  });
});
