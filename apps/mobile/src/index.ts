export { ClinicSwitcher } from "./components/ClinicSwitcher";
export { ClinicSwitcherScreen } from "./screens/ClinicSwitcherScreen";
export { PatientIdentityForm } from "./components/PatientIdentityForm";
export { PatientIdentityScreen } from "./screens/PatientIdentityScreen";
export {
  getClinics,
  getActiveClinicId,
  getActiveClinic,
  setClinics,
  switchClinic,
} from "./store/clinic-switcher";
export type { ClinicOption } from "./store/clinic-switcher";
export { getSession, setSession, clearSession } from "./store/session";
