'use client';

import {
  motion,
  MotionConfig,
  stagger,
  useInView,
  type HTMLMotionProps,
  type Variants,
} from 'motion/react';
import {
  Children,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// No 'down': things falling from above while others rise looks like a collision.
type Direction = 'up' | 'left' | 'right' | 'none';

/** How far elements travel while fading in, in pixels. */
const DISTANCE = 20;

/** How long each element takes to fade in, in seconds. */
const DURATION = 0.45;

/** Seconds between elements that come into view together. */
const STEP = 0.1;

/**
 * Tempo of the whole site: STEP and every RevealGroup interval are multiplied
 * by this. Lower is faster; 1 uses them as written.
 */
const PACE = 0.7;

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
 * Hands out reveal times. Each element that comes into view claims the next
 * free slot, so elements appearing together play one after another in page
 * order, while one that scrolls in on its own plays right away. Nothing on
 * the pages needs a hand-set delay.
 */
function createQueue(startDelay = 0) {
  let nextFree: number | null = null;
  return {
    /** Reserves `seconds` of the sequence; returns how long to wait. */
    claim(seconds: number) {
      const now = performance.now();
      nextFree ??= now + startDelay * PACE * 1000;
      const at = Math.max(now, nextFree);
      nextFree = at + seconds * PACE * 1000;
      return (at - now) / 1000;
    },
  };
}

type Queue = ReturnType<typeof createQueue>;

const QueueContext = createContext<Queue | null>(null);

/**
 * Starts a separate sequence for its content, running alongside the page's.
 * Use it for side-by-side columns that should animate at the same time.
 */
export function RevealQueue({
  delay,
  children,
}: {
  /** Seconds before the first element of this sequence. */
  delay?: number;
  children: React.ReactNode;
}) {
  const [queue] = useState(() => createQueue(delay));
  return <QueueContext value={queue}>{children}</QueueContext>;
}

/** Whether the nearest Reveal around this one has taken its turn yet. */
const ParentClaimedContext = createContext(true);

/**
 * Waits until the element first scrolls into view, then claims `seconds` of
 * the nearest queue. Returns the delay to use, or `null` until then.
 */
function useReveal(seconds: number) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const queue = useContext(QueueContext);
  const parentClaimed = useContext(ParentClaimedContext);
  const [delay, setDelay] = useState<number | null>(null);

  useEffect(() => {
    // React runs child effects before parent ones, so without waiting, rows
    // inside a card would queue ahead of the card and play while it's hidden.
    if (inView && parentClaimed && delay === null) {
      setDelay(queue ? queue.claim(seconds) : 0);
    }
  }, [inView, parentClaimed, delay, queue, seconds]);

  return { ref, delay };
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
};

/** Fades its content in the first time it scrolls into view. */
export function Reveal({
  direction = 'up',
  as = 'div',
  children,
  ...props
}: Omit<BaseProps, 'children'> & {
  /** Which way the element moves as it fades in. "up" moves upwards. */
  direction?: Direction;
  children?: React.ReactNode;
}) {
  const Component = elements[as] as typeof motion.div;
  const { ref, delay } = useReveal(STEP);
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      initial='hidden'
      animate={delay === null ? 'hidden' : 'visible'}
      variants={fadeIn(direction, delay ?? 0)}
      {...props}
    >
      <ParentClaimedContext value={delay !== null}>
        {children}
      </ParentClaimedContext>
    </Component>
  );
}

/**
 * Reveals its RevealItem children one after another. It takes a slot in the
 * queue long enough for all of them, so whatever comes next waits its turn.
 * Best for groups that fit on screen; long lists should use Reveal per item,
 * so items further down wait until they are scrolled to.
 */
export function RevealGroup({
  as = 'div',
  interval = STEP,
  ...props
}: BaseProps & {
  /** Seconds between each child. */
  interval?: number;
}) {
  const Component = elements[as] as typeof motion.div;
  const count = Children.count(props.children);
  const { ref, delay } = useReveal(interval * Math.max(count, 1));
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      initial='hidden'
      animate={delay === null ? 'hidden' : 'visible'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: stagger(interval * PACE, { startDelay: delay ?? 0 }),
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

/**
 * Site-wide setup: one queue for every page, and no movement for people who
 * ask their system to reduce motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion='user'>
      <RevealQueue>{children}</RevealQueue>
    </MotionConfig>
  );
}
