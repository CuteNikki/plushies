import type { Metadata, Viewport } from 'next';
import { Fredoka, Nunito } from 'next/font/google';

import { brand, site } from '@/lib/site';
import { cn } from '@/lib/utils';

import { MotionProvider } from '@/components/motion';
import { ScrollToTop } from '@/components/scroll-to-top';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-sans' });

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-heading' });

export const metadata: Metadata = {
  metadataBase: site.url,
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: ['plushies', 'plushie collection', 'stuffed animals', 'soft toys'],
  category: 'entertainment',
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: site.title,
    description: site.description,
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: brand.light.background },
    { media: '(prefers-color-scheme: dark)', color: brand.dark.background },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn(
        'antialiased',
        'font-sans',
        nunito.variable,
        fredoka.variable
      )}
    >
      <body className='flex min-h-svh flex-col'>
        <ThemeProvider>
          <MotionProvider>
            <ScrollToTop />
            <SiteHeader />
            {/* Pages can fill the space between header and footer by marking
                their root with data-fill, e.g. to center their content. */}
            <main className='mx-auto w-full max-w-6xl flex-1 px-4 py-8 has-[>[data-fill]]:flex has-[>[data-fill]]:flex-col'>
              {children}
            </main>
            <SiteFooter />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
