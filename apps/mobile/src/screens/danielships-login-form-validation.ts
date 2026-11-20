export interface DanielshipsLoginFormValues {
  email: string;
  password: string;
}

export interface DanielshipsFieldErrors {
  email?: string;
  password?: string;
  form?: string;
}

export function validateDanielshipsLoginForm(values: DanielshipsLoginFormValues): DanielshipsFieldErrors {
  const errors: DanielshipsFieldErrors = {};
  const email = values.email.trim();
  if (!email) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (!values.password) errors.password = "Password is required";
  return errors;
}

export type DanielshipsAuthErrorCode = "AUTH_MISSING_CREDENTIALS" | "AUTH_INVALID_CREDENTIALS" | "AUTH_ACCOUNT_LOCKED" | "AUTH_TOKEN_EXPIRED" | "AUTH_FORBIDDEN" | string;

export function mapDanielshipsAuthError(code?: DanielshipsAuthErrorCode, message?: string): DanielshipsFieldErrors {
  switch (code) {
    case "AUTH_INVALID_CREDENTIALS":
      return { form: "Incorrect email or password." };
    case "AUTH_ACCOUNT_LOCKED":
      return { form: message || "Your account is temporarily locked." };
    case "AUTH_MISSING_CREDENTIALS":
      return { form: "Email and password are required." };
    default:
      return { form: message || "Unable to sign in. Please try again." };
  }
}
