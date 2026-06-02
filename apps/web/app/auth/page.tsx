import Link from "next/link";

export default function AuthLandingPage() {
  return (
    <main className="authPage">
      <section className="authLanding">
        <div className="authLandingCopy">
          <p className="eyebrow">Authentication hub</p>
          <h1>One entry point for login, registration, and recovery-ready auth states.</h1>
          <p className="authLead">
            This slice now includes the shared form shell that powers login and registration
            submissions with loading, error, and retry handling.
          </p>
        </div>
        <div className="authLandingActions">
          <Link href="/auth/login" className="primary">
            Sign in
          </Link>
          <Link href="/auth/register" className="secondary">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
