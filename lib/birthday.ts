/**
 * Birthdays can be as precise as is known: 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'.
 * Used on the server and in the browser.
 */
export type Birthday = { year: number; month?: number; day?: number };

const pattern = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

/** Reads a stored birthday, or returns null if it isn't a real date. */
export function parseBirthday(value: string): Birthday | null {
  const match = pattern.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = m ? Number(m) : undefined;
  const day = d ? Number(d) : undefined;

  if (month !== undefined && (month < 1 || month > 12)) return null;
  if (day !== undefined && (day < 1 || day > daysInMonth(year, month!))) {
    return null;
  }
  return { year, month, day };
}

/** Turns year, month and day back into the stored form. */
export function toBirthdayString({ year, month, day }: Birthday) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [year, month && pad(month), month && day && pad(day)]
    .filter(Boolean)
    .join('-');
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** Whether the birthday is today or earlier, at the precision given. */
export function isNotInFuture(birthday: Birthday, now = new Date()) {
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const given = [birthday.year, birthday.month ?? 1, birthday.day ?? 1];
  for (let i = 0; i < 3; i++) {
    if (given[i] !== today[i]) return given[i] < today[i];
  }
  return true;
}

/** e.g. '2021', 'April 2021' or 'April 2, 2021'. */
export function formatBirthday(value: string) {
  const birthday = parseBirthday(value);
  if (!birthday) return value;
  const { year, month, day } = birthday;
  if (!month) return String(year);
  return new Date(year, month - 1, day ?? 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    ...(day && { day: 'numeric' }),
  });
}

/**
 * e.g. 'Brand new', '5 months' or '3 years'. With only the year known, the
 * age can be off by one, so it says 'About 3 years'.
 */
export function formatAge(value: string, now = new Date()) {
  const birthday = parseBirthday(value);
  if (!birthday) return '';
  const { year, month, day } = birthday;

  if (!month) {
    const years = now.getFullYear() - year;
    if (years < 1) return 'Under a year';
    return `About ${years} year${years === 1 ? '' : 's'}`;
  }

  let months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  if (day && now.getDate() < day) months--;

  if (months < 1) return 'Brand new';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}

export type UpcomingBirthday = {
  /** Days until the birthday, 0 for today. Null when only the month is known. */
  days: number | null;
  /** The age they turn. */
  turns: number;
};

/**
 * The next birthday if it's within `withinDays`, or this month for birthdays
 * without a day. Null for year-only birthdays, which have no date to count to.
 */
export function upcomingBirthday(
  value: string,
  withinDays: number,
  now = new Date()
): UpcomingBirthday | null {
  const birthday = parseBirthday(value);
  if (!birthday?.month) return null;
  const { year, month, day } = birthday;

  if (!day) {
    const turns = now.getFullYear() - year;
    if (month !== now.getMonth() + 1 || turns < 1) return null;
    return { days: null, turns };
  }

  // Feb 29 falls on Mar 1 in other years, which Date does by itself.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  const turns = next.getFullYear() - year;
  if (days > withinDays || turns < 1) return null;
  return { days, turns };
}
