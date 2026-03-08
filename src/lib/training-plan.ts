import type { PlannedSession, SportType } from '@/types/database';
import { getDateForWeekDay } from './date-utils';

// Training plan transcribed from the user's screenshot
// Start date: Feb 28, 2026 (Saturday of Week 1)
// The plan covers ~30 weeks until Lidingöloppet (Sep 26)

interface PlanEntry {
  day: number; // 1=Mon, 7=Sun
  sport: SportType;
  title: string;
  duration: number; // minutes
  intensity: string;
  description?: string;
}

interface WeekPlan {
  week: number;
  sessions: PlanEntry[];
}

// Base training plan — weeks 1–12 (pre-Vätternrundan focus)
// This is structured from the user's image showing a progressive plan
const trainingWeeks: WeekPlan[] = [
  {
    week: 1,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Grundpass', duration: 45, intensity: 'Zon 2', description: 'Lugnt tempo, hitta känslan på cykeln' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik', description: 'Teknikfokus med instruktör' },
      { day: 4, sport: 'hiit', title: 'HIIT', duration: 30, intensity: 'Hög', description: 'Helkroppspass, 30 sek on/30 sek off' },
      { day: 5, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 6, sport: 'running', title: 'Löpning – Lugn', duration: 30, intensity: 'Zon 2', description: 'Lugn jogging, gärna utomhus' },
      { day: 7, sport: 'cycling', title: 'Spinning – Uthållighet', duration: 60, intensity: 'Zon 2-3', description: 'Längre pass, bygg uthållighet' },
    ],
  },
  {
    week: 2,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Intervall', duration: 45, intensity: 'Zon 3-4', description: '5x3 min intervaller' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik', description: 'Teknikfokus med instruktör' },
      { day: 4, sport: 'running', title: 'Löpning – Intervall', duration: 35, intensity: 'Zon 3', description: '8x1 min fart / 1 min vila' },
      { day: 5, sport: 'hiit', title: 'HIIT', duration: 30, intensity: 'Hög' },
      { day: 6, sport: 'cycling', title: 'Spinning – Grundpass', duration: 50, intensity: 'Zon 2' },
      { day: 7, sport: 'running', title: 'Löpning – Lång', duration: 40, intensity: 'Zon 2', description: 'Längre lugn löpning' },
    ],
  },
  {
    week: 3,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Kraft', duration: 50, intensity: 'Zon 3', description: 'Tungt motstånd, låg kadens' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik' },
      { day: 4, sport: 'hiit', title: 'HIIT + Core', duration: 40, intensity: 'Hög', description: 'HIIT 25 min + core 15 min' },
      { day: 5, sport: 'running', title: 'Löpning – Tempo', duration: 35, intensity: 'Zon 3', description: '15 min uppvärmning, 15 min tempo, 5 min nedvarvning' },
      { day: 6, sport: 'cycling', title: 'Spinning – Uthållighet', duration: 60, intensity: 'Zon 2-3' },
      { day: 7, sport: 'rest', title: 'Vila / Lätt stretching', duration: 0, intensity: 'Vila' },
    ],
  },
  {
    week: 4,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Intervall', duration: 50, intensity: 'Zon 3-4', description: '6x3 min intervaller' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik' },
      { day: 4, sport: 'running', title: 'Löpning – Lugn', duration: 40, intensity: 'Zon 2' },
      { day: 5, sport: 'hiit', title: 'HIIT', duration: 35, intensity: 'Hög' },
      { day: 6, sport: 'cycling', title: 'Spinning – Lång', duration: 75, intensity: 'Zon 2', description: 'Bygg duration, håll lugnt tempo' },
      { day: 7, sport: 'running', title: 'Löpning – Lång', duration: 45, intensity: 'Zon 2' },
    ],
  },
  {
    week: 5,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila (Återhämtningsvecka)', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Lugn', duration: 40, intensity: 'Zon 1-2', description: 'Lättare vecka för återhämtning' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik' },
      { day: 4, sport: 'running', title: 'Löpning – Lugn', duration: 30, intensity: 'Zon 1-2' },
      { day: 5, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 6, sport: 'cycling', title: 'Spinning – Lugn', duration: 45, intensity: 'Zon 2' },
      { day: 7, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
    ],
  },
  {
    week: 6,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Intervall', duration: 55, intensity: 'Zon 3-4', description: '7x3 min med 2 min vila' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik' },
      { day: 4, sport: 'hiit', title: 'HIIT + Styrka', duration: 45, intensity: 'Hög' },
      { day: 5, sport: 'running', title: 'Löpning – Backar', duration: 40, intensity: 'Zon 3-4', description: '6x backintervaller' },
      { day: 6, sport: 'cycling', title: 'Spinning – Lång', duration: 80, intensity: 'Zon 2-3' },
      { day: 7, sport: 'running', title: 'Löpning – Lugn', duration: 35, intensity: 'Zon 2' },
    ],
  },
  {
    week: 7,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Kraft', duration: 55, intensity: 'Zon 3', description: 'Tungt motstånd, backsimulering' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik' },
      { day: 4, sport: 'running', title: 'Löpning – Intervall', duration: 40, intensity: 'Zon 3-4', description: '10x1 min fart / 1 min vila' },
      { day: 5, sport: 'hiit', title: 'HIIT', duration: 35, intensity: 'Hög' },
      { day: 6, sport: 'cycling', title: 'Spinning – Uthållighet', duration: 90, intensity: 'Zon 2', description: '90 minuter! Ny rekordlängd' },
      { day: 7, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
    ],
  },
  {
    week: 8,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Intervall', duration: 55, intensity: 'Zon 4', description: '5x4 min hård intervall' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik' },
      { day: 4, sport: 'hiit', title: 'HIIT + Core', duration: 40, intensity: 'Hög' },
      { day: 5, sport: 'running', title: 'Löpning – Tempo', duration: 45, intensity: 'Zon 3', description: '20 min tempo i mitten' },
      { day: 6, sport: 'cycling', title: 'Spinning – Lång', duration: 90, intensity: 'Zon 2-3' },
      { day: 7, sport: 'running', title: 'Löpning – Lång', duration: 50, intensity: 'Zon 2' },
    ],
  },
  {
    week: 9,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Kraft', duration: 55, intensity: 'Zon 3-4' },
      { day: 3, sport: 'swimming', title: 'Crawlkurs', duration: 45, intensity: 'Teknik' },
      { day: 4, sport: 'running', title: 'Löpning – Fartlek', duration: 40, intensity: 'Zon 2-4', description: 'Blanda tempo efter känsla' },
      { day: 5, sport: 'hiit', title: 'HIIT', duration: 35, intensity: 'Hög' },
      { day: 6, sport: 'cycling', title: 'Spinning – Uthållighet', duration: 100, intensity: 'Zon 2', description: 'Bygg mot Vättern-durationen!' },
      { day: 7, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
    ],
  },
  {
    week: 10,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila (Återhämtningsvecka)', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Lugn', duration: 45, intensity: 'Zon 1-2' },
      { day: 3, sport: 'swimming', title: 'Simning – Fritt', duration: 30, intensity: 'Lugn', description: 'Crawlkursen slut, träna själv nu' },
      { day: 4, sport: 'running', title: 'Löpning – Lugn', duration: 30, intensity: 'Zon 1-2' },
      { day: 5, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 6, sport: 'cycling', title: 'Spinning – Lugn', duration: 50, intensity: 'Zon 2' },
      { day: 7, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
    ],
  },
  {
    week: 11,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Intervall', duration: 60, intensity: 'Zon 4', description: '6x4 min hård intervall' },
      { day: 3, sport: 'swimming', title: 'Simning', duration: 40, intensity: 'Zon 2', description: 'Distanssim, fokus på teknik' },
      { day: 4, sport: 'running', title: 'Löpning – Intervall', duration: 45, intensity: 'Zon 3-4' },
      { day: 5, sport: 'hiit', title: 'HIIT + Styrka', duration: 45, intensity: 'Hög' },
      { day: 6, sport: 'cycling', title: 'Spinning/Cykling – Lång', duration: 120, intensity: 'Zon 2', description: '2 timmar! Tänk Vättern-känsla' },
      { day: 7, sport: 'running', title: 'Löpning – Lång', duration: 55, intensity: 'Zon 2' },
    ],
  },
  {
    week: 12,
    sessions: [
      { day: 1, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
      { day: 2, sport: 'cycling', title: 'Spinning – Kraft + Intervall', duration: 60, intensity: 'Zon 3-4' },
      { day: 3, sport: 'swimming', title: 'Simning – Distans', duration: 45, intensity: 'Zon 2', description: 'Simma 1500m+' },
      { day: 4, sport: 'hiit', title: 'HIIT', duration: 35, intensity: 'Hög' },
      { day: 5, sport: 'running', title: 'Löpning – Tempo', duration: 50, intensity: 'Zon 3' },
      { day: 6, sport: 'cycling', title: 'Cykling – Lång ute', duration: 150, intensity: 'Zon 2', description: 'Långpass utomhus om vädret tillåter!' },
      { day: 7, sport: 'rest', title: 'Vila', duration: 0, intensity: 'Vila' },
    ],
  },
];

// Generate PlannedSession objects from the plan
let sortCounter = 0;
export const TRAINING_PLAN: PlannedSession[] = trainingWeeks.flatMap((week) =>
  week.sessions.map((session) => {
    sortCounter++;
    return {
      id: `plan-w${week.week}-d${session.day}`,
      group_id: 'default-group',
      week_number: week.week,
      day_of_week: session.day,
      date: getDateForWeekDay(week.week, session.day),
      sport_type: session.sport,
      title: session.title,
      description: session.description || null,
      suggested_duration_minutes: session.duration || null,
      suggested_intensity: session.intensity,
      sort_order: sortCounter,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  })
);

// Get plan for a specific week
export function getPlanForWeek(weekNumber: number): PlannedSession[] {
  return TRAINING_PLAN.filter((s) => s.week_number === weekNumber);
}

// Get today's planned sessions
export function getTodaysPlan(): PlannedSession[] {
  const today = new Date().toISOString().split('T')[0];
  return TRAINING_PLAN.filter((s) => s.date === today);
}

// Re-export from date-utils for backward compatibility
export { getCurrentWeekNumber } from './date-utils';

// Total number of weeks in the plan
export function getTotalWeeks(): number {
  return Math.max(...trainingWeeks.map((w) => w.week));
}
