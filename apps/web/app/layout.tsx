import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "./auth/session-provider";

export const metadata: Metadata = {
  title: "LumenHealth",
  description: "Open source hackathon starter for healthcare workflows and Stellar payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
