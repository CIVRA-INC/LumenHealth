import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ eyebrow, title, description, children, footer }: AuthCardProps) {
  return (
    <section className="authCard">
      <div className="authCardContent">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="authLead">{description}</p>
      </div>
      {children}
      {footer ? <div className="authCardFooter">{footer}</div> : null}
    </section>
  );
}
