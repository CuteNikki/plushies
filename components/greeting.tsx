'use client';

function timeOfDay(hour: number) {
  if (hour < 5) return 'Hello';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * e.g. 'Good morning, Nikki'. Worked out in the browser, so it follows the
 * viewer's own clock rather than the server's.
 */
export function Greeting({ name }: { name: string }) {
  return (
    <span suppressHydrationWarning>
      {timeOfDay(new Date().getHours())}, {name}
    </span>
  );
}
