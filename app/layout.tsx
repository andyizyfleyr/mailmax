import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailMax — Email Platform",
  description: "Multi-provider email platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
