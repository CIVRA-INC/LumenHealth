export { ClinicSwitcher } from "./components/ClinicSwitcher";
export { ClinicSwitcherScreen } from "./screens/ClinicSwitcherScreen";
export {
  getClinics,
  getActiveClinicId,
  getActiveClinic,
  setClinics,
  switchClinic,
  subscribe as subscribeToClinics,
} from "./store/clinic-switcher";
export type { ClinicOption } from "./store/clinic-switcher";
export { getSession, setSession, clearSession, subscribe as subscribeToSession } from "./store/session";
