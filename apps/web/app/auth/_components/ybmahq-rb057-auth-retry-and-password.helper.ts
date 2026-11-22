import type { AuthErrorCode, LoginRequest, RegisterRequest } from "@lumen/types";

export type AuthMode = "login" | "register";

export type AuthValues = {
  email: string;
  password: string;
  clinicName: string;
};

export type AuthSubmission = {
  mode: AuthMode;
  payload: LoginRequest | RegisterRequest;
};

export function buildAuthSubmission(mode: AuthMode, values: AuthValues): AuthSubmission {
  const payload =
    mode === "login"
      ? {
          email: values.email.trim(),
          password: values.password,
        }
      : {
          email: values.email.trim(),
          password: values.password,
          clinicName: values.clinicName.trim(),
        };

  return { mode, payload };
}

export function isCredentialError(code: AuthErrorCode): boolean {
  return code === "AUTH_INVALID_CREDENTIALS" || code === "AUTH_EMAIL_TAKEN";
}

export function shouldReplayLastSubmission(errorCode: AuthErrorCode | null): boolean {
  if (!errorCode) {
    return false;
  }
  return !isCredentialError(errorCode);
}

export function getRetrySubmission(
  lastSubmission: AuthSubmission | null,
  currentMode: AuthMode,
  currentValues: AuthValues,
  errorCode: AuthErrorCode | null,
): AuthSubmission | null {
  if (!shouldReplayLastSubmission(errorCode)) {
    return buildAuthSubmission(currentMode, currentValues);
  }
  return lastSubmission;
}

export function clearSensitiveAuthValues(values: AuthValues): AuthValues {
  return { ...values, password: "" };
}

export function nextValuesAfterAuthSuccess(values: AuthValues): AuthValues {
  return clearSensitiveAuthValues(values);
}
