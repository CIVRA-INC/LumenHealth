export class PatientIdentityUIFlowController {
  async getUIFlowConfig() {
    return {
      enabledTabs: ['summary', 'demographics', 'verification'],
      defaultTab: 'summary',
    };
  }
}
