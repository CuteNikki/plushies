import { Children, cloneElement, isValidElement, type ReactNode } from 'react';

const trimmed = '[text-box:trim-both_cap_alphabetic]';

/**
 * Wraps runs of plain text in a span trimmed to cap height. Flex boxes center
 * the whole line box, which includes room for descenders (g, p, y), so text
 * without them otherwise sits slightly too high. Icons are left as they are.
 */
export function trimText(children: ReactNode): ReactNode {
  const result: ReactNode[] = [];
  let run: (string | number)[] = [];

  function flush() {
    if (run.length === 0) return;
    result.push(
      <span key={`text-${result.length}`} className={trimmed}>
        {run.join('')}
      </span>
    );
    run = [];
  }

  for (const child of Children.toArray(children)) {
    if (typeof child === 'string' || typeof child === 'number') {
      run.push(child);
    } else {
      flush();
      result.push(child);
    }
  }
  flush();

  return result;
}

/** Like trimText, for `asChild` components: trims the single child's text. */
export function trimSlotText(child: ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(child)) return child;
  return cloneElement(child, undefined, trimText(child.props.children));
}
