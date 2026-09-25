'use client';

import Link from 'next/link';
import { createContext, use } from 'react';

import { MoreHorizontalIcon, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { rowTint } from '@/components/row-link';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Menu = {
  items: React.ReactNode;
  /** What the menu is for, e.g. 'Actions for Mochi'. */
  label: string;
  disabled?: boolean;
  /** When either way of opening it opens or closes, e.g. to load its items. */
  onOpenChange?: (open: boolean) => void;
};

const MenuContext = createContext<Menu | null>(null);

/** Which menu the items are in, so they use its parts. */
const KindContext = createContext<'dropdown' | 'context'>('dropdown');

/**
 * Something's actions, in a menu. With `children`, they're a row that also
 * opens the menu on right-click, with an ItemMenuButton somewhere in it;
 * without, it's just the button. Build `items` from ItemMenuItem and
 * ItemMenuSeparator, and keep any dialogs they open outside of it: the menu
 * unmounts as it closes. Inside another one, e.g. a name in a comment's row,
 * right-clicking opens only the innermost.
 */
export function ItemMenu({
  items,
  label,
  disabled,
  onOpenChange,
  tint = true,
  as: Element = 'div',
  className,
  children,
}: Menu & {
  /** Off for rows that show their hover and open menu their own way. */
  tint?: boolean;
  /** span for something inline, e.g. a name in a sentence. */
  as?: 'div' | 'span';
  className?: string;
  children?: React.ReactNode;
}) {
  const menu = { items, label, disabled, onOpenChange };
  if (!children) {
    return (
      <MenuContext value={menu}>
        <ItemMenuButton />
      </MenuContext>
    );
  }
  return (
    <MenuContext value={menu}>
      {/* Not modal, so the dialogs it opens get the focus as it closes. */}
      <ContextMenu modal={false} onOpenChange={onOpenChange}>
        <ContextMenuTrigger
          asChild
          disabled={disabled}
          // Handled here, so a menu around this one doesn't open as well:
          // right-click, and a long press on touch screens.
          onContextMenu={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            if (event.pointerType !== 'mouse') event.stopPropagation();
          }}
        >
          <Element
            className={cn(
              // Also tinted while its menu is open, to show which row it's for.
              tint && [rowTint, 'data-[state=open]:bg-muted/50'],
              className
            )}
          >
            {children}
          </Element>
        </ContextMenuTrigger>
        {/* Focus stays where the item put it, e.g. in a reply box, rather
            than going back to the row. */}
        <ContextMenuContent
          className='w-auto min-w-44'
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <KindContext value='context'>{items}</KindContext>
        </ContextMenuContent>
      </ContextMenu>
    </MenuContext>
  );
}

/**
 * Opens the ItemMenu around it. Nothing without one, e.g. when the menu is
 * only for some viewers.
 */
export function ItemMenuButton({
  size = 'icon',
  className,
}: {
  /** To match the buttons beside it. */
  size?: 'icon' | 'icon-sm';
  className?: string;
}) {
  const menu = use(MenuContext);
  if (!menu) return null;

  return (
    <DropdownMenu modal={false} onOpenChange={menu.onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size={size}
          disabled={menu.disabled}
          aria-label={menu.label}
          className={cn('relative shrink-0', className)}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-auto min-w-44'>
        <KindContext value='dropdown'>{menu.items}</KindContext>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
