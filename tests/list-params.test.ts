import { describe, expect, test } from 'bun:test';

import {
  CARD_PAGE_SIZES,
  matchesSearch,
  pageItems,
  pageSize,
} from '@/lib/list-params';

describe('the page numbers a pager shows', () => {
  test('all of them when there are few', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test('the ends, and a few around the page, with gaps between', () => {
    expect(pageItems(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  test('about as many near either end', () => {
    expect(pageItems(1, 20)).toEqual([1, 2, 3, 4, null, 20]);
    expect(pageItems(20, 20)).toEqual([1, null, 17, 18, 19, 20]);
  });

  test('a page instead of a gap of one', () => {
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, null, 20]);
  });
});

describe('how many on a page', () => {
  test('one of the choices, or the default', () => {
    expect(pageSize('50')).toBe(50);
    expect(pageSize('7')).toBe(25);
    expect(pageSize(undefined)).toBe(25);
    expect(pageSize('25', CARD_PAGE_SIZES)).toBe(25);
    expect(pageSize('100', CARD_PAGE_SIZES)).toBe(10);
  });
});

describe('searching a list after loading it', () => {
  test('ignores case and skips what is missing', () => {
    expect(matchesSearch('ann', [null, 'Hi from ANNE'])).toBe(true);
    expect(matchesSearch('ben', [undefined, 'Ann'])).toBe(false);
    expect(matchesSearch(null, [])).toBe(true);
  });
});
