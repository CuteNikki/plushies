import { cn } from '@/lib/utils';

/** Blurred until hovered or focused, e.g. for emails on screen shares. */
export function PrivateText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      tabIndex={0}
      className={cn(
        'blur-[5px] transition-[filter] duration-200 outline-none select-none hover:blur-none hover:select-auto focus-visible:blur-none',
        className
      )}
    >
      {children}
    </span>
  );
}
