import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'CertShield | COI Tracking For Construction Teams',
  description:
    'Track subcontractor certificates of insurance, catch expirations early, and keep construction projects compliant with CertShield.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
