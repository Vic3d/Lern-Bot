import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TM Tutor — Technische Mechanik",
  description: "Dein persönlicher KI-Tutor für Technische Mechanik",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
