import type { Metadata } from 'next';
import { Fredoka, Geist_Mono, Nunito } from 'next/font/google';

import { cn } from '@/lib/utils';

import { MotionProvider } from '@/components/motion';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

import './globals.css';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-sans' });

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-heading' });

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Plushies',
    template: '%s · Plushies',
  },
  description: 'Meet all of my plushies!',
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
        fontMono.variable,
        'font-sans',
        nunito.variable,
        fredoka.variable
      )}
    >
      <body className='flex min-h-svh flex-col'>
        <ThemeProvider>
          <MotionProvider>
            <SiteHeader />
            <main className='mx-auto w-full max-w-6xl flex-1 px-4 py-8'>
              {children}
            </main>
            <SiteFooter />
            <Toaster />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
