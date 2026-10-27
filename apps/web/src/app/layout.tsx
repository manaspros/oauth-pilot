import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAuth Pilot",
  description: "How hard is it to get your OAuth app approved? A critical-path guide for every provider.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
              oauth-pilot
            </Link>
            <span className="text-xs text-muted">approval guides with receipts</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-24">{children}</main>
      </body>
    </html>
  );
}
