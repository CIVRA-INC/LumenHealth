import type { ConsentCheckResult, PrivacyConsentPolicyInput } from '@qyou/shared';

export function isPatientConsentActive(policy: PrivacyConsentPolicyInput): boolean {
  if (!policy.isGranted) return false;
  if (policy.expiresAt && new Date(policy.expiresAt) < new Date()) return false;
  return true;
}
