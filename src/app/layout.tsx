import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthWrapper } from '@/components/AuthWrapper';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL('https://wispr.mn'),
  title: 'Wispr - Сэтгэлийн үгээ шивнээч',
  description: 'Нэргүйгээр сэтгэлийн үгээ хуваалцаж, бусдаас ирсэн wispr-үүдийг уншаарай. Хамгийн аюулгүй, нээлттэй орон зай.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Wispr',
  },
  openGraph: {
    title: 'Wispr - Сэтгэлийн үгээ шивнээч',
    description: 'Нэргүйгээр сэтгэлийн үгээ хуваалцаж, бусдаас ирсэн wispr-үүдийг уншаарай.',
    url: 'https://wispr.mn',
    siteName: 'Wispr',
    locale: 'mn_MN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wispr - Сэтгэлийн үгээ шивнээч',
    description: 'Нэргүйгээр сэтгэлийн үгээ хуваалцаж, бусдаас ирсэн wispr-үүдийг уншаарай.',
  },
};

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/logo-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo-icon.svg" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased'
        )}
      >
        <FirebaseClientProvider>
          <AuthWrapper>{children}</AuthWrapper>
          <Toaster />
        </FirebaseClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
