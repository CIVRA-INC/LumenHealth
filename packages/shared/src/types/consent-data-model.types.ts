export interface DataSharingPermission {
  thirdPartyId: string;
  isAllowed: boolean;
  grantedUntil?: string;
}

export interface PrivacySettingRule {
  ruleId: string;
  patientId: string;
  allowThirdPartySharing: boolean;
  permissions: DataSharingPermission[];
  policyVersion: string;
}

export interface ConsentPolicyVersion {
  version: string;
  effectiveDate: string;
  summaryText: string;
}
