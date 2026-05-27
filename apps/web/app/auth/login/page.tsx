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
      <div className="authCard">
        <p className="eyebrow">Milestone 1</p>
        <h1>Authentication starts here.</h1>
        <p>
          The UI is intentionally light right now. This page marks the hand-off point for the
          public authentication milestone.
        </p>
        <form className="authForm">
          <label>
            Email
            <input type="email" placeholder="owner@clinic.test" />
          </label>
          <label>
            Password
            <input type="password" placeholder="********" />
          </label>
          <button type="button">Connect this flow in Milestone 1</button>
        </form>
        <div>
          <h2>Coming next</h2>
          <ul>
            {roadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
