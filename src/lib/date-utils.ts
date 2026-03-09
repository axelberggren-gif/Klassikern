// Centralized date/week utilities for the training program.
// The program starts on Monday Feb 23, 2026.

export const PROGRAM_START_DATE = new Date(2026, 1, 23); // Feb 23, 2026 (Monday)

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Get the date string (YYYY-MM-DD) for a given week number and day of week.
 * Week 1 starts Feb 23, day 1 = Monday.
 */
export function getDateForWeekDay(weekNumber: number, dayOfWeek: number): string {
  const date = new Date(PROGRAM_START_DATE);
  date.setDate(date.getDate() + (weekNumber - 1) * 7 + (dayOfWeek - 1));
  return date.toISOString().split('T')[0];
}

/**
 * Calculate which week number we're in (1-indexed).
 */
export function getCurrentWeekNumber(): number {
  const now = new Date();
  const diffMs = now.getTime() - PROGRAM_START_DATE.getTime();
  const diffWeeks = Math.floor(diffMs / MS_PER_WEEK);
  return Math.max(1, diffWeeks + 1);
}

/**
 * Get the start (Monday) and end (Sunday) dates for a given week number.
 */
export function getWeekRange(weekNumber: number): { start: Date; end: Date } {
  const start = new Date(PROGRAM_START_DATE);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
