import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "./auth/session-provider";
import { SkipLink } from "./_components/skip-link";

export const metadata: Metadata = {
  title: "LumenHealth",
  description:
    "Open source hackathon starter for healthcare workflows, auth submissions, and Stellar payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
