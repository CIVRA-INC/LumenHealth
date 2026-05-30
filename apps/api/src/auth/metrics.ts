type CounterKey =
  | "auth_login_success_total"
  | "auth_login_failure_total"
  | "auth_account_lockout_total"
  | "auth_refresh_success_total"
  | "auth_refresh_failure_total";

const counters: Record<CounterKey, number> = {
  auth_login_success_total: 0,
  auth_login_failure_total: 0,
  auth_account_lockout_total: 0,
  auth_refresh_success_total: 0,
  auth_refresh_failure_total: 0,
};

export function incrementMetric(key: CounterKey): void {
  counters[key] += 1;
}

export function getAuthMetricsSnapshot(): Record<CounterKey, number> {
  return { ...counters };
}
