import { AuthCard } from "../_components/auth-card";
import { AuthField } from "../_components/auth-field";
import { AuthRoadmap } from "../_components/auth-roadmap";

const roadmap = [
  "registration flow",
  "forgot-password flow",
  "session persistence",
  "role-aware redirects",
  "audit trail integration",
];

export default function LoginPage() {
  return (
    <main className="authPage">
      <AuthCard
        eyebrow="Milestone 1"
        title="Authentication starts here."
        description="These primitives now break the auth shell into reusable pieces for future login, recovery, and stateful auth screens."
        footer={
          <p>
            The same card, field, and roadmap primitives can power the next auth states without
            restyling the whole screen.
          </p>
        }
      >
        <form className="authForm">
          <AuthField label="Email" hint="Use the clinic owner account for this starter.">
            <input type="email" placeholder="owner@clinic.test" autoComplete="email" />
          </AuthField>
          <AuthField label="Password" hint="At least 8 characters in the next milestone.">
            <input type="password" placeholder="********" autoComplete="current-password" />
          </AuthField>
          <button type="button">Connect this flow in Milestone 1</button>
        </form>
        <AuthRoadmap title="Coming next" items={roadmap} />
      </AuthCard>
    </main>
  );
}
