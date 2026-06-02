import type { ReactNode } from "react";

type AuthFieldProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function AuthField({ label, children, hint }: AuthFieldProps) {
  return (
    <label className="authField">
      <span className="authFieldLabel">{label}</span>
      {children}
      {hint ? <span className="authFieldHint">{hint}</span> : null}
    </label>
  );
}
