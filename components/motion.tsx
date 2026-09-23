'use client';

import {
  motion,
  MotionConfig,
  stagger,
  useInView,
  type HTMLMotionProps,
  type Variants,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';

// No 'down': things falling from above while others rise looks like a collision.
type Direction = 'up' | 'left' | 'right' | 'none';

/** How far elements travel while fading in, in pixels. */
const DISTANCE = 20;

/** How long each element takes to fade in, in seconds. */
const DURATION = 0.45;

/**
 * Tempo of the whole site: every delay, scrollDelay and stagger interval set
 * on the pages is multiplied by this. Lower is faster; 1 uses them as written.
 */
const PACE = 0.7;

/**
 * Elements that come into view this soon after mounting count as part of the
 * page's intro and use their full `delay`. Later ones were scrolled to, and
 * use the shorter `scrollDelay` so scrolling doesn't feel sluggish.
 */
const INTRO_MS = 500;

const offsets: Record<Direction, { x?: number; y?: number }> = {
  up: { y: DISTANCE },
  left: { x: DISTANCE },
  right: { x: -DISTANCE },
  none: {},
};

/**
 * Leave `delay` out for RevealGroup children: motion spreads a child's own
 * transition over the stagger delay its group passes down, so even `delay: 0`
 * here would cancel the stagger.
 */
function fadeIn(direction: Direction, delay?: number): Variants {
  return {
    hidden: { opacity: 0, ...offsets[direction] },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: DURATION,
        ease: 'easeOut',
        ...(delay !== undefined && { delay }),
      },
    },
  };
}

/**
 * Tracks when an element first scrolls into view, and picks the delay to use:
 * `delay` during the page intro, `scrollDelay` afterwards. `null` until then.
 */
function useReveal(delay: number, scrollDelay: number) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const mountedAt = useRef(0);
  const [revealDelay, setRevealDelay] = useState<number | null>(null);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const intro = performance.now() - mountedAt.current < INTRO_MS;
    setRevealDelay((intro ? delay : scrollDelay) * PACE);
  }, [inView, delay, scrollDelay]);

  return { ref, revealDelay };
}

const elements = {
  div: motion.div,
  section: motion.section,
  header: motion.header,
  article: motion.article,
  ul: motion.ul,
  dl: motion.dl,
  li: motion.li,
  p: motion.p,
};

type Element = keyof typeof elements;

type BaseProps = Omit<HTMLMotionProps<'div'>, 'variants' | 'ref'> & {
  as?: Element;
  /** Seconds to wait when the element is on screen as the page loads. */
  delay?: number;
  /** Seconds to wait when the element is scrolled into view later. */
  scrollDelay?: number;
};

/** Fades its content in the first time it scrolls into view. */
export function Reveal({
  direction = 'up',
  delay = 0,
  scrollDelay = 0,
  as = 'div',
  ...props
}: BaseProps & {
  /** Which way the element moves as it fades in. "up" moves upwards. */
  direction?: Direction;
}) {
  const Component = elements[as] as typeof motion.div;
  const { ref, revealDelay } = useReveal(delay, scrollDelay);
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      initial='hidden'
      animate={revealDelay === null ? 'hidden' : 'visible'}
      variants={fadeIn(direction, revealDelay ?? 0)}
      {...props}
    />
  );
}

/**
 * Reveals its RevealItem children one after another when it scrolls into
 * view. Best for groups that fit on screen; long lists should use Reveal per
 * item, so items further down wait until they are scrolled to.
 */
export function RevealGroup({
  as = 'div',
  interval = 0.1,
  delay = 0,
  scrollDelay = 0,
  ...props
}: BaseProps & {
  /** Seconds between each child. */
  interval?: number;
}) {
  const Component = elements[as] as typeof motion.div;
  const { ref, revealDelay } = useReveal(delay, scrollDelay);
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      initial='hidden'
      animate={revealDelay === null ? 'hidden' : 'visible'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: stagger(interval * PACE, {
              startDelay: revealDelay ?? 0,
            }),
          },
        },
      }}
      {...props}
    />
  );
}

/** A child of RevealGroup. Animates when the group does. */
export function RevealItem({
  direction = 'up',
  as = 'div',
  ...props
}: Omit<HTMLMotionProps<'div'>, 'variants'> & {
  direction?: Direction;
  as?: Element;
}) {
  const Component = elements[as] as typeof motion.div;
  return <Component variants={fadeIn(direction)} {...props} />;
}

/** Skips movement for people who ask their system to reduce motion. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion='user'>{children}</MotionConfig>;
}
