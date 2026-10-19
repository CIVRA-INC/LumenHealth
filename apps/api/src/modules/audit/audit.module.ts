import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller.js';
import { InternalAuditController } from './controllers/internal-audit.controller.js';
import { AuditService } from './services/audit.service.js';
import { AuditRepository, auditStore } from './repositories/audit.repository.js';
import { AuditArchiveRepository } from './repositories/audit-archive.repository.js';
import { RetentionService } from './services/retention.service.js';
import { IntegritySamplerService } from './services/integrity-sampler.service.js';
import { StellarVerifierClient } from './services/stellar-verifier.client.js';
import { InternalServiceTokenGuard } from './guards/internal-service-token.guard.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [AuditController, InternalAuditController],
  providers: [
    AuditService,
    StellarVerifierClient,
    // Listed explicitly so the guard's ConfigService dependency is resolved by
    // the injector rather than by ad-hoc enhancer instantiation.
    InternalServiceTokenGuard,
    AuditArchiveRepository,
    RetentionService,
    IntegritySamplerService,
    {
      provide: AuditRepository,
      useValue: auditStore,
    }
  ],
  exports: [AuditService],
})
export class AuditModule {}
