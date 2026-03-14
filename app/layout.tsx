import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart PDF Reader",
  description: "Audio learning platform for PDFs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        {children}
      </body>
    </html>
  );
}
