/**
 * Feature Flag Registry for incremental rollout control.
 *
 * Usage:
 *   import { getFlag, FLAGS } from './feature-flags-rollout';
 *   if (getFlag('ENABLE_TIPPING')) { ... }
 */

export type FeatureFlagKey =
  | 'ENABLE_TIPPING'
  | 'ENABLE_AI_MODERATION'
  | 'ENABLE_STELLAR_PAYMENTS'
  | 'ENABLE_DARK_MODE'
  | 'ENABLE_REFERRAL_PROGRAM';

/**
 * Central feature flag registry.
 * Set a flag to `true` to enable the feature for all users,
 * or `false` to disable it. Fine-grained rollout logic can
 * be layered on top via environment variables or a remote
 * configuration service.
 */
export const FLAGS: Record<FeatureFlagKey, boolean> = {
  ENABLE_TIPPING: false,
  ENABLE_AI_MODERATION: false,
  ENABLE_STELLAR_PAYMENTS: false,
  ENABLE_DARK_MODE: true,
  ENABLE_REFERRAL_PROGRAM: false,
};

/**
 * Retrieve the current value of a feature flag.
 *
 * @param key - The feature flag key to look up.
 * @returns `true` if the feature is enabled, `false` otherwise.
 */
export function getFlag(key: FeatureFlagKey): boolean {
  return FLAGS[key] ?? false;
}
