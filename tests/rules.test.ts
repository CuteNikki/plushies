import { describe, expect, test } from 'bun:test';

import {
  formatAge,
  formatWhen,
  isNotInFuture,
  nextBirthday,
  parseBirthday,
  sortByNextBirthday,
} from '@/lib/birthday';
import { COMMENT_MAX, commentError, hasLink } from '@/lib/comment-rules';
import { safeNext } from '@/lib/redirect';

describe('where to go after signing in', () => {
  test('pages on this site', () => {
    expect(safeNext('/plushies/mochi')).toBe('/plushies/mochi');
    expect(safeNext('/dashboard?view=recent')).toBe('/dashboard?view=recent');
  });

  test('never another site', () => {
    for (const value of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'evil.example',
      'javascript:alert(1)',
      '',
      undefined,
      ['/dashboard'],
    ]) {
      expect(safeNext(value)).toBe('/dashboard');
    }
    expect(safeNext('//evil.example', '/')).toBe('/');
  });
});

describe('comment text', () => {
  test('something, but not too much', () => {
    expect(commentError('  ')).toBe('Write something first');
    expect(commentError('x'.repeat(COMMENT_MAX))).toBeNull();
    expect(commentError('x'.repeat(COMMENT_MAX + 1))).toBe(
      `Keep it under ${COMMENT_MAX} characters`
    );
  });

  test('no links', () => {
    for (const text of [
      'see https://example.com',
      'www.example.org',
      'join discord.gg/abc',
      'buy at plushies.shop',
    ]) {
      expect(hasLink(text)).toBe(true);
      expect(commentError(text)).toBe('Links aren’t allowed in comments');
    }
  });

  test('dots that aren’t links are fine', () => {
    for (const text of [
      'So soft, e.g. like a cloud.',
      'Version 3.5',
      'Hi...',
    ]) {
      expect(hasLink(text)).toBe(false);
    }
  });
});

describe('birthdays', () => {
  test('as precise as is known, but real dates', () => {
    expect(parseBirthday('2021')).toEqual({ year: 2021 });
    expect(parseBirthday('2021-04')).toEqual({ year: 2021, month: 4 });
    expect(parseBirthday('2024-02-29')).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
    for (const value of ['2023-02-29', '2021-13', '2021-04-31', '21', 'soon']) {
      expect(parseBirthday(value)).toBeNull();
    }
  });

  test('not in the future', () => {
    const now = new Date(2026, 8, 25);
    expect(isNotInFuture({ year: 2026, month: 9, day: 25 }, now)).toBe(true);
    expect(isNotInFuture({ year: 2026, month: 9, day: 26 }, now)).toBe(false);
    expect(isNotInFuture({ year: 2026 }, now)).toBe(true);
    expect(isNotInFuture({ year: 2027 }, now)).toBe(false);
  });

  test('ages', () => {
    const now = new Date(2026, 8, 25);
    expect(formatAge('2026-09-01', now)).toBe('Brand new');
    expect(formatAge('2026-03-25', now)).toBe('6 months');
    expect(formatAge('2023-09-26', now)).toBe('2 years');
    expect(formatAge('2023-09-25', now)).toBe('3 years');
    expect(formatAge('2025', now)).toBe('About 1 year');
    expect(formatAge('2026', now)).toBe('Under a year');
  });

  test('the next one, and how it reads', () => {
    const now = new Date(2026, 8, 25, 15);
    const next = (value: string) => {
      const birthday = nextBirthday(value, now);
      return birthday && `turns ${birthday.turns} ${formatWhen(birthday)}`;
    };
    expect(next('2020-09-25')).toBe('turns 6 today');
    expect(next('2021-09-26')).toBe('turns 5 tomorrow');
    expect(next('2023-09-24')).toBe('turns 4 in 364 days');
    expect(next('2020-09')).toBe('turns 6 this month');
    expect(next('2019-10')).toBe('turns 7 in October');
    expect(next('2021')).toBeNull();
    // Falls on 1 March in years without 29 February.
    expect(next('2020-02-29')).toBe('turns 7 in 157 days');
  });

  test('whose comes next first, year-only ones last', () => {
    const now = new Date(2026, 8, 25);
    const order = sortByNextBirthday(
      [
        { name: 'Old', birthday: '2018' },
        { name: 'Bunny', birthday: '2022-01-03' },
        { name: 'Bean', birthday: '2020-09' },
        { name: 'Mochi', birthday: '2020-09-25' },
        { name: 'Aaron', birthday: '2017' },
      ],
      now
    ).map((plushie) => plushie.name);
    expect(order).toEqual(['Mochi', 'Bean', 'Bunny', 'Aaron', 'Old']);
  });
});
