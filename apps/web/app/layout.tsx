import type { Metadata, Viewport } from 'next';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import './globals.css';
import { PrefsProvider } from '@/lib/prefs';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: { default: 'Saudi Shield · Be ready before the alert', template: '%s · Saudi Shield' },
  description:
    'Independent, free preparedness companion for everyone in Saudi Arabia: hazard guides, a family emergency plan, a fake-alert checker and fictional drills, in Arabic and English. Not an official service.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#0e5e43', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <PrefsProvider>
          <Shell>{children}</Shell>
        </PrefsProvider>
      </body>
    </html>
  );
}
