import { describe, it, expect } from 'vitest';
import { getDateForWeekDay, getWeekRange, PROGRAM_START_DATE } from '@/lib/date-utils';

describe('getDateForWeekDay', () => {
  it('returns program start date for week 1 day 1', () => {
    expect(getDateForWeekDay(1, 1)).toBe('2026-02-23');
  });

  it('returns correct date for week 1 sunday', () => {
    expect(getDateForWeekDay(1, 7)).toBe('2026-03-01');
  });

  it('returns correct date for week 2 monday', () => {
    expect(getDateForWeekDay(2, 1)).toBe('2026-03-02');
  });
});

describe('getWeekRange', () => {
  it('returns correct range for week 1', () => {
    const { start, end } = getWeekRange(1);
    expect(start.toISOString().split('T')[0]).toBe('2026-02-23');
    // end is Monday of next week (exclusive)
    expect(end.toISOString().split('T')[0]).toBe('2026-03-02');
  });

  it('returns 7-day span', () => {
    const { start, end } = getWeekRange(3);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });
});

describe('PROGRAM_START_DATE', () => {
  it('is a Monday', () => {
    // 0=Sun, 1=Mon
    expect(PROGRAM_START_DATE.getDay()).toBe(1);
  });
});
