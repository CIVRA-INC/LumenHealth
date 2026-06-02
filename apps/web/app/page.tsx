import Link from "next/link";
import { AuthSessionSummary } from "./auth/session-summary";

const tracks = [
  "Authentication-first MVP",
  "Express + Next.js + mobile + Stellar monorepo",
  "Open source contributor-ready roadmap",
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">LumenHealth Reset</p>
        <h1>Fresh starter repo for an open source healthcare hackathon.</h1>
        <p className="lede">
          This repository has been reset to a clean baseline so contributors can build the MVP in
          public, starting with authentication and moving milestone by milestone.
        </p>
        <div className="actions">
          <Link href="/auth/login" className="primary">
            View auth starter
          </Link>
          <a href="https://stellar.org" className="secondary">
            Stellar track
          </a>
        </div>
      </section>

      <section className="panel">
        <h2>Current tracks</h2>
        <ul>
          {tracks.map((track) => (
            <li key={track}>{track}</li>
          ))}
        </ul>
      </section>

      <AuthSessionSummary />
    </main>
  );
}
