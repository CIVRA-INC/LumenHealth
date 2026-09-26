#!/bin/bash
set -e

# Scaffold main.ts
cat << 'MAIN' > src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { serverConfig } from '@lumen/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Add 5mb limit to specific route before global json parser if needed, 
  // or handle globally/with a middleware. For now, keep it simple.
  app.enableCors();
  
  await app.listen(serverConfig.apiPort);
  console.log(`LumenHealth Nest API running on http://localhost:${serverConfig.apiPort}`);
}
bootstrap();
MAIN

# Scaffold app.module.ts
cat << 'APP_MOD' > src/app.module.ts
import { Module } from '@nestjs/common';
import { ClinicModule } from './modules/clinic/clinic.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
    ClinicModule,
  ],
})
export class AppModule {}
APP_MOD

# Auth Module (Stub)
cat << 'AUTH_MOD' > src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard.js';

@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
AUTH_MOD

# Auth Guard (Stub for AuthModule so ClinicModule can compile)
mkdir -p src/modules/auth/guards
cat << 'AUTH_GUARD' > src/modules/auth/guards/auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
// Temporary mock for AuthGuard

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    // Assume req.auth is set by earlier middleware or we mock it
    // Wait, Express authContext middleware sets req.auth.
    return !!req.auth;
  }
}
AUTH_GUARD

# Auth Testing Module (Issue 1192)
mkdir -p src/modules/auth/testing
cat << 'AUTH_TEST' > src/modules/auth/testing/auth-testing.module.ts
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: 'AUTH_TESTING_RESET',
      useValue: () => {
        // Will reset auth state once injected services are created.
      }
    }
  ],
  exports: ['AUTH_TESTING_RESET'],
})
export class AuthTestingModule {
  static reset(): void {
    // Placeholder for global reset hook until services are fully ported
    const { _resetAuthStateForTests } = require('../controllers/auth.controller.js');
    _resetAuthStateForTests();
  }
}
AUTH_TEST

# Clinic Module (Issue 1193)
cat << 'CLINIC_MOD' > src/modules/clinic/clinic.module.ts
import { Module } from '@nestjs/common';
import { ClinicController } from './controllers/clinic.controller.js';
import { ClinicService } from './services/clinic.service.js';
import { ClinicRepository } from './repositories/clinic.repository.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ClinicController],
  providers: [ClinicService, ClinicRepository],
  exports: [ClinicService],
})
export class ClinicModule {}
CLINIC_MOD

# Clinic Repository (Issue 1194)
cat << 'CLINIC_REPO' > src/modules/clinic/repositories/clinic.repository.ts
import { Injectable } from '@nestjs/common';
import type { Clinic, ClinicStatus } from '@lumen/types';

@Injectable()
export class ClinicRepository {
  private store = new Map<string, Clinic>();
  private slugIndex = new Map<string, string>();

  save(clinic: Clinic): Clinic {
    this.store.set(clinic.clinicId, clinic);
    this.slugIndex.set(clinic.slug, clinic.clinicId);
    return clinic;
  }

  findById(clinicId: string): Clinic | undefined {
    return this.store.get(clinicId);
  }

  findBySlug(slug: string): Clinic | undefined {
    const id = this.slugIndex.get(slug);
    return id ? this.store.get(id) : undefined;
  }

  list(filter?: { status?: ClinicStatus }): Clinic[] {
    const all = Array.from(this.store.values());
    if (!filter?.status) return all;
    return all.filter((c) => c.status === filter.status);
  }

  _reset(): void {
    this.store.clear();
    this.slugIndex.clear();
  }
}
CLINIC_REPO

# Overwrite ClinicService (Issue 1195 deps)
cat << 'CLINIC_SERV' > src/modules/clinic/services/clinic.service.ts
import { Injectable } from '@nestjs/common';
import type { Clinic, CreateClinicRequest, UpdateClinicRequest, UserRole } from '@lumen/types';
import { ClinicRepository } from '../repositories/clinic.repository.js';
import { generateSlug } from '../validators/clinic.validator.js';
import { recordAudit } from '../../audit/services/audit.service.js';

@Injectable()
export class ClinicService {
  constructor(private readonly clinicRepository: ClinicRepository) {}

  private uniqueSlug(base: string): string {
    let slug = base;
    let counter = 2;
    while (this.clinicRepository.findBySlug(slug)) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    return slug;
  }

  createClinic(req: CreateClinicRequest, ownerId: string, clinicId: string): Clinic {
    const now = new Date().toISOString();
    const baseSlug = generateSlug(req.name);
    const slug = this.uniqueSlug(baseSlug);

    const clinic: Clinic = {
      clinicId,
      name: req.name.trim(),
      slug,
      address: req.address.trim(),
      phone: req.phone.trim(),
      email: req.email.trim(),
      status: 'active',
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    return this.clinicRepository.save(clinic);
  }

  getClinic(clinicId: string, callerClinicId: string): Clinic | null {
    const clinic = this.clinicRepository.findById(clinicId);
    if (!clinic || clinic.clinicId !== callerClinicId) return null;
    return clinic;
  }

  updateClinic(clinicId: string, callerClinicId: string, patch: UpdateClinicRequest): Clinic | null {
    const clinic = this.getClinic(clinicId, callerClinicId);
    if (!clinic) return null;

    const updated: Clinic = {
      ...clinic,
      ...(patch.name ? { name: patch.name.trim() } : {}),
      ...(patch.address ? { address: patch.address.trim() } : {}),
      ...(patch.phone ? { phone: patch.phone.trim() } : {}),
      ...(patch.email ? { email: patch.email.trim() } : {}),
      updatedAt: new Date().toISOString(),
    };

    return this.clinicRepository.save(updated);
  }

  archiveClinic(clinicId: string, callerClinicId: string, callerActorId: string, callerRole: UserRole): Clinic | null {
    const clinic = this.getClinic(clinicId, callerClinicId);
    if (!clinic) return null;

    const archived: Clinic = {
      ...clinic,
      status: 'archived',
      updatedAt: new Date().toISOString(),
    };

    const saved = this.clinicRepository.save(archived);

    recordAudit({
      clinicId: callerClinicId,
      action: 'clinic.archived',
      actorId: callerActorId,
      actorRole: callerRole,
      targetId: clinicId,
      targetType: 'clinic',
      before: { status: clinic.status },
      after: { status: saved.status },
    });

    return saved;
  }
}
CLINIC_SERV

