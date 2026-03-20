import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lern-Bot v2 - KI Tutor für Technische Mechanik',
  description: 'Persönlicher KI-Tutor für Technische Mechanik mit intelligenten Erklärungen',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
