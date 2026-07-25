import {
  privacyConsentPolicySchema,
  type ConsentCheckResult,
  type PrivacyConsentPolicyInput,
} from '@qyou/shared';

export class ConsentEvaluatorService {
  public evaluateConsent(policy: PrivacyConsentPolicyInput): ConsentCheckResult {
    const validated = privacyConsentPolicySchema.parse(policy);
    const now = new Date();

    if (!validated.isGranted) {
      return { isPermitted: false, reason: 'Consent revoked or not granted.', evaluatedAt: now.toISOString() };
    }

    if (validated.expiresAt && new Date(validated.expiresAt) < now) {
      return { isPermitted: false, reason: 'Consent expired.', evaluatedAt: now.toISOString() };
    }

    return { isPermitted: true, evaluatedAt: now.toISOString() };
  }
}
