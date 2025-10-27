import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Openapi Company Exporter",
  description:
    "Genera un file Excel con le aziende filtrate per codice ATECO e provincia utilizzando le API di Openapi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <main className="min-h-screen bg-slate-50 text-slate-900">
          <div className="mx-auto w-full max-w-5xl px-6 py-12">{children}</div>
        </main>
      </body>
    </html>
  );
}
