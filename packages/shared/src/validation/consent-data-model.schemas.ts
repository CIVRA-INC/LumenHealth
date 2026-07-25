import { z } from 'zod';

export const dataSharingPermissionSchema = z.object({
  thirdPartyId: z.string().min(1, 'Third party ID is required.'),
  isAllowed: z.boolean(),
  grantedUntil: z.string().optional(),
});

export const privacySettingRuleSchema = z.object({
  ruleId: z.string().min(1, 'Rule ID is required.'),
  patientId: z.string().min(1, 'Patient ID is required.'),
  allowThirdPartySharing: z.boolean().default(false),
  permissions: z.array(dataSharingPermissionSchema).default([]),
  policyVersion: z.string().default('v1.0.0'),
});

export type PrivacySettingRuleInput = z.infer<typeof privacySettingRuleSchema>;
export type DataSharingPermissionInput = z.infer<typeof dataSharingPermissionSchema>;
