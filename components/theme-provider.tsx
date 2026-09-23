'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
      // The theme script only needs to run in the server's HTML, before the
      // page paints. When React re-creates it in the browser (e.g. when a
      // page shows its not-found UI), a data type stops React warning about
      // a script that would never run anyway; next-themes already applies
      // the theme there itself.
      scriptProps={
        typeof window === 'undefined' ? undefined : { type: 'application/json' }
      }
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
