export { ClinicSwitcher } from "./components/ClinicSwitcher";
export { ClinicSwitcherScreen } from "./screens/ClinicSwitcherScreen";
export {
  getClinics,
  getActiveClinicId,
  getActiveClinic,
  setClinics,
  switchClinic,
} from "./store/clinic-switcher";
export type { ClinicOption } from "./store/clinic-switcher";
export { getSession, setSession, clearSession } from "./store/session";
