import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ClinicModule } from '../clinic.module.js';
import { clinicStore } from "../repositories/clinic.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";
import { auditStore } from "../../audit/repositories/audit.repository.js";
import type { UserRole } from "@lumen/types";

function tokenWithRole(clinicId: string, role: UserRole): string {
  return accessTokenSigner.sign({ sub: `user-${role}`, clinicId, role });
}

const VALID_BODY = {
  name: "Sunrise Clinic",
  address: "12 Main St, Lagos",
  phone: "+2348012345678",
  email: "admin@sunrise.clinic",
};

describe("ClinicController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ClinicModule],
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
    clinicStore._reset();
    auditStore._reset();
  });

  describe("POST /api/v1/clinics — create", () => {
    it("returns 201 with a clinic object on valid input", async () => {
      const { a } = buildTwoClinicFixture();
      const res = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      
      expect(res.status).toBe(201);
      const clinic = res.body.clinic;
      expect(typeof clinic.clinicId).toBe("string");
      expect(clinic.slug).toBe("sunrise-clinic");
      expect(clinic.status).toBe("active");
    });

    it("returns 400 when name is missing", async () => {
      const { a } = buildTwoClinicFixture();
      const res = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send({ ...VALID_BODY, name: "" });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("CLINIC_INVALID_INPUT");
    });

    it("returns 400 when email is invalid", async () => {
      const { a } = buildTwoClinicFixture();
      const res = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send({ ...VALID_BODY, email: "not-an-email" });
      
      expect(res.status).toBe(400);
      expect(res.body.field).toBe("email");
    });

    it("returns 400 when address is missing", async () => {
      const { a } = buildTwoClinicFixture();
      const res = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send({ ...VALID_BODY, address: "" });
      
      expect(res.status).toBe(400);
      expect(res.body.field).toBe("address");
    });

    it("returns 401 with no token", async () => {
      const res = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .send(VALID_BODY);
      
      expect(res.status).toBe(401);
    });

    it("auto-increments slug when a clinic with the same name already exists", async () => {
      const { a } = buildTwoClinicFixture();
      await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      
      const res = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      
      expect(res.body.clinic.slug).toBe("sunrise-clinic-2");
    });
  });

  describe("GET /api/v1/clinics/:clinicId — read", () => {
    it("returns 200 with the clinic for the owner's own clinicId", async () => {
      const { a } = buildTwoClinicFixture();
      const createRes = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      const clinicId = createRes.body.clinic.clinicId;

      const res = await request.default(app.getHttpServer())
        .get(`/api/v1/clinics/${clinicId}`)
        .set('Authorization', `Bearer ${a.token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.clinic.clinicId).toBe(clinicId);
    });

    it("returns 403 when a different clinic's token is used", async () => {
      const { a, b } = buildTwoClinicFixture();
      const createRes = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      const clinicId = createRes.body.clinic.clinicId;

      const res = await request.default(app.getHttpServer())
        .get(`/api/v1/clinics/${clinicId}`)
        .set('Authorization', `Bearer ${b.token}`);
      
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/v1/clinics/:clinicId — update", () => {
    it("returns 200 with updated fields", async () => {
      const { a } = buildTwoClinicFixture();
      const createRes = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      const clinicId = createRes.body.clinic.clinicId;

      const res = await request.default(app.getHttpServer())
        .patch(`/api/v1/clinics/${clinicId}`)
        .set('Authorization', `Bearer ${a.token}`)
        .send({ name: "Dusk Clinic" });
      
      expect(res.status).toBe(200);
      expect(res.body.clinic.name).toBe("Dusk Clinic");
    });

    it("returns 400 on invalid email in patch body", async () => {
      const { a } = buildTwoClinicFixture();
      const createRes = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      const clinicId = createRes.body.clinic.clinicId;

      const res = await request.default(app.getHttpServer())
        .patch(`/api/v1/clinics/${clinicId}`)
        .set('Authorization', `Bearer ${a.token}`)
        .send({ email: "bad" });
      
      expect(res.status).toBe(400);
    });

    it("returns 403 when a clinician tries to update the clinic", async () => {
      const { a } = buildTwoClinicFixture();
      const createRes = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      const clinicId = createRes.body.clinic.clinicId;

      const clinicianToken = tokenWithRole(a.clinicId, "clinician");
      const res = await request.default(app.getHttpServer())
        .patch(`/api/v1/clinics/${clinicId}`)
        .set('Authorization', `Bearer ${clinicianToken}`)
        .send({ name: "Hacked" });
      
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("AUTH_FORBIDDEN");
    });
  });

  describe("DELETE /api/v1/clinics/:clinicId — archive", () => {
    it("returns 200 and the clinic status becomes archived", async () => {
      const { a } = buildTwoClinicFixture();
      const createRes = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      const clinicId = createRes.body.clinic.clinicId;

      const res = await request.default(app.getHttpServer())
        .delete(`/api/v1/clinics/${clinicId}`)
        .set('Authorization', `Bearer ${a.token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const stored = clinicStore.findById(clinicId);
      expect(stored?.status).toBe("archived");
    });

    it("records a clinic.archived audit entry with before/after status", async () => {
      const { a } = buildTwoClinicFixture();
      const createRes = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      const clinicId = createRes.body.clinic.clinicId;

      await request.default(app.getHttpServer())
        .delete(`/api/v1/clinics/${clinicId}`)
        .set('Authorization', `Bearer ${a.token}`);

      const events = auditStore.query({ clinicId: a.clinicId, action: "clinic.archived" });
      expect(events.total).toBe(1);
      const event = events.entries[0]!;
      expect(event.targetId).toBe(clinicId);
      expect(event.before).toEqual({ status: "active" });
      expect(event.after).toEqual({ status: "archived" });
    });

    it("returns 403 when an admin tries to archive the clinic — only owner may", async () => {
      const { a } = buildTwoClinicFixture();
      const createRes = await request.default(app.getHttpServer())
        .post('/api/v1/clinics')
        .set('Authorization', `Bearer ${a.token}`)
        .send(VALID_BODY);
      const clinicId = createRes.body.clinic.clinicId;

      const adminToken = tokenWithRole(a.clinicId, "admin");
      const res = await request.default(app.getHttpServer())
        .delete(`/api/v1/clinics/${clinicId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("AUTH_FORBIDDEN");
    });
  });
});
