import type { PrivacySettingRule } from '@qyou/shared';

export class InMemoryConsentRepository {
  private readonly rules: Map<string, PrivacySettingRule> = new Map();

  public async savePrivacySettingRule(rule: PrivacySettingRule): Promise<PrivacySettingRule> {
    this.rules.set(rule.patientId, rule);
    return rule;
  }

  public async getPrivacySettingRule(patientId: string): Promise<PrivacySettingRule | null> {
    return this.rules.get(patientId) ?? null;
  }
}
