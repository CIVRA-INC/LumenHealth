import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { configureAxios } from "@/config/axiosConfig";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/config/tanstackConfig";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner"
import { Inter } from 'next/font/google';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LumenHealth',
  description: 'AI-assisted EMR for underserved communities.',
};

configureAxios();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryClientProvider client={queryClient}>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
          </Providers>
         </QueryClientProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}