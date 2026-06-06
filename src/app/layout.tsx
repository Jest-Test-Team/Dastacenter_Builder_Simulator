import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { WebVitalsReporter } from '@/components/perf/WebVitalsReporter';
import { SkipLink } from '@/components/a11y/SkipLink';
import { getServerLocale } from '@/lib/i18n/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'Datacenter Builder Simulator',
  description:
    'Build a data center in a Lego/Minecraft style, get rated against Uptime, TIA-942, ASHRAE, NFPA, ISO 27001, EU EED, and earn a verifiable certificate.',
  keywords: ['data center', 'simulator', 'uptime', 'tia-942', 'ashrae', 'nfpa', 'iso 27001', 'learning', 'credly'],
  authors: [{ name: 'Datacenter Builder Simulator' }],
  openGraph: {
    title: 'Datacenter Builder Simulator',
    description: 'Build, rate, and certify a data center in your browser.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Datacenter Builder Simulator',
    description: 'Build, rate, and certify a data center in your browser.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b1020',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <SkipLink />
        <Providers>
          {children}
          <WebVitalsReporter />
        </Providers>
      </body>
    </html>
  );
}
