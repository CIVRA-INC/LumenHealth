import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LumenHealth",
  description:
    "Open source hackathon starter for healthcare workflows, auth submissions, and Stellar payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
