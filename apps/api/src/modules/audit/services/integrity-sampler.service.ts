import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AuditRepository } from "../repositories/audit.repository.js";
import { AuditService } from "./audit.service.js";

/**
 * Continuous integrity monitoring (#1333): every cycle re-verifies a random
 * slice of the anchored corpus (hash recompute, Merkle proof, on-chain root
 * via the standard verification path), raises an alert on any `tampered`
 * result, and tracks verified-rate and coverage over time.
 *
 * Alerts go to the structured logger by default; `onAlert` is a pluggable
 * hook so ops can wire a paging sink. (Alerts are deliberately not recorded
 * as audit entries: `AuditAction` is a closed union and no retention or
 * integrity action exists yet — see the PR notes.)
 */

export const DEFAULT_INTEGRITY_SAMPLE_SIZE = 25;
const DEFAULT_INTEGRITY_INTERVAL_MS = 60 * 60 * 1000; // 1 h

export type IntegrityAlert = {
  kind: "tampered_entry";
  auditId: string;
  clinicId: string;
  reason?: string;
  raisedAt: string;
};

export type IntegrityCycleReport = {
  ranAt: string;
  /** Anchored entries eligible for sampling. */
  poolSize: number;
  sampled: number;
  verified: number;
  tampered: number;
  /** Anything the verifier reported as neither verified nor tampered. */
  other: number;
  alertsRaised: number;
  /** share of the anchored corpus re-verified this cycle */
  coverage: number;
  /** verified / sampled (1 when nothing was sampled) */
  verifiedRate: number;
};

export type IntegrityMetricsSnapshot = {
  cycles: number;
  entriesSampled: number;
  verifiedTotal: number;
  tamperedTotal: number;
  /** verifiedTotal / entriesSampled over the process lifetime */
  lifetimeVerifiedRate: number;
  coverageLastCycle: number;
  tamperedLastCycle: number;
};

@Injectable()
export class IntegritySamplerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegritySamplerService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  /** Entries re-verified per cycle (env `AUDIT_INTEGRITY_SAMPLE_SIZE`). */
  sampleSize = Number(process.env.AUDIT_INTEGRITY_SAMPLE_SIZE ?? DEFAULT_INTEGRITY_SAMPLE_SIZE);
  /** Injected randomness — tests swap in a seeded PRNG. */
  randomize: () => number = Math.random;

  private readonly alerts: IntegrityAlert[] = [];
  private lastCycle: IntegrityCycleReport | null = null;
  private metrics = {
    cycles: 0,
    entriesSampled: 0,
    verifiedTotal: 0,
    tamperedTotal: 0,
    coverageLastCycle: 1,
    tamperedLastCycle: 0,
  };

  /** Pluggable alert sink; default logs structured error lines. */
  onAlert: (alert: IntegrityAlert) => void = (alert) => {
    this.logger.error(
      `audit integrity alert: ${alert.kind} for ${alert.auditId}`,
      JSON.stringify(alert)
    );
  };

  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly auditService: AuditService
  ) {}

  onModuleInit(): void {
    const raw = process.env.AUDIT_INTEGRITY_INTERVAL_MS;
    const intervalMs = raw === undefined ? DEFAULT_INTEGRITY_INTERVAL_MS : Number(raw);
    if (Number.isFinite(intervalMs) && intervalMs > 0) {
      this.timer = setInterval(() => {
        void this.runIntegrityCycle().catch(() => undefined);
      }, intervalMs);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runIntegrityCycle(now: Date = new Date()): Promise<IntegrityCycleReport> {
    const pool = this.auditRepository.findAll().filter((entry) => Boolean(entry.stellarTxHash));
    const size = Math.min(this.sampleSize, pool.length);

    // Fisher-Yates over a copy with the injectable RNG, then take `size`.
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.randomize() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const sample = shuffled.slice(0, size);

    let verified = 0;
    let tampered = 0;
    let other = 0;
    let alertsRaised = 0;

    for (const entry of sample) {
      const result = await this.auditService.verifyAuditEntry(entry.clinicId, entry.auditId);
      if (result?.status === "verified") {
        verified += 1;
      } else if (result?.status === "tampered") {
        tampered += 1;
        const alert: IntegrityAlert = {
          kind: "tampered_entry",
          auditId: entry.auditId,
          clinicId: entry.clinicId,
          reason: result.reason,
          raisedAt: now.toISOString(),
        };
        this.alerts.push(alert);
        this.onAlert(alert);
        alertsRaised += 1;
      } else {
        other += 1;
      }
    }

    this.metrics.cycles += 1;
    this.metrics.entriesSampled += size;
    this.metrics.verifiedTotal += verified;
    this.metrics.tamperedTotal += tampered;
    this.metrics.coverageLastCycle = pool.length > 0 ? size / pool.length : 1;
    this.metrics.tamperedLastCycle = tampered;

    const report: IntegrityCycleReport = {
      ranAt: now.toISOString(),
      poolSize: pool.length,
      sampled: size,
      verified,
      tampered,
      other,
      alertsRaised,
      coverage: this.metrics.coverageLastCycle,
      verifiedRate: size > 0 ? verified / size : 1,
    };
    this.lastCycle = report;
    return report;
  }

  getLastCycleReport(): IntegrityCycleReport | null {
    return this.lastCycle;
  }

  getAlerts(): readonly IntegrityAlert[] {
    return this.alerts;
  }

  getMetricsSnapshot(): IntegrityMetricsSnapshot {
    return {
      cycles: this.metrics.cycles,
      entriesSampled: this.metrics.entriesSampled,
      verifiedTotal: this.metrics.verifiedTotal,
      tamperedTotal: this.metrics.tamperedTotal,
      lifetimeVerifiedRate:
        this.metrics.entriesSampled > 0
          ? this.metrics.verifiedTotal / this.metrics.entriesSampled
          : 1,
      coverageLastCycle: this.metrics.coverageLastCycle,
      tamperedLastCycle: this.metrics.tamperedLastCycle,
    };
  }
}
