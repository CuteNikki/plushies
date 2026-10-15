import Link from 'next/link';
import { use } from 'react';

import type { LucideIcon } from 'lucide-react';

import { KindContext } from '@/components/item-menu';
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// The items of an ItemMenu. Unlike item-menu.tsx, not a client boundary:
// they take functions, and only client components build menus, so Next.js
// shouldn't ask for their props to be serializable.

export function ItemMenuItem({
  icon: Icon,
  href,
  onSelect,
  variant,
  disabled,
  children,
}: {
  icon: LucideIcon;
  /** Makes it a link, so it can also be opened in a new tab. */
  href?: string;
  onSelect?: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const Item =
    use(KindContext) === 'context' ? ContextMenuItem : DropdownMenuItem;
  if (href) {
    return (
      <Item asChild variant={variant} disabled={disabled}>
        <Link href={href}>
          <Icon />
          {children}
        </Link>
      </Item>
    );
  }
  return (
    <Item variant={variant} disabled={disabled} onSelect={onSelect}>
      <Icon />
      {children}
    </Item>
  );
}

export function ItemMenuSeparator() {
  return use(KindContext) === 'context' ? (
    <ContextMenuSeparator />
  ) : (
    <DropdownMenuSeparator />
  );
}
