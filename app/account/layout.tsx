import { Toaster } from '@/components/ui/sonner';

// Toasts are only used on these pages and sign-in, so only they load them.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
