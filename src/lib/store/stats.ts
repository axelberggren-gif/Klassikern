import { getUserSessions } from './sessions';
import { PROGRAM_START_DATE, MS_PER_DAY } from '../date-utils';

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getUserStats(userId: string) {
  const sessions = await getUserSessions(userId);

  const cyclingSessions = sessions.filter((s) => s.sport_type === 'cycling');
  const runningSessions = sessions.filter((s) => s.sport_type === 'running');
  const swimmingSessions = sessions.filter((s) => s.sport_type === 'swimming');

  return {
    totalSessions: sessions.length,
    totalEP: sessions.reduce((sum, s) => sum + s.ep_earned, 0),
    totalDurationMinutes: sessions.reduce((sum, s) => sum + s.duration_minutes, 0),
    cycling: {
      sessions: cyclingSessions.length,
      totalMinutes: cyclingSessions.reduce((sum, s) => sum + s.duration_minutes, 0),
      totalKm: cyclingSessions.reduce((sum, s) => sum + (s.distance_km || 0), 0),
    },
    running: {
      sessions: runningSessions.length,
      totalMinutes: runningSessions.reduce((sum, s) => sum + s.duration_minutes, 0),
      totalKm: runningSessions.reduce((sum, s) => sum + (s.distance_km || 0), 0),
    },
    swimming: {
      sessions: swimmingSessions.length,
      totalMinutes: swimmingSessions.reduce((sum, s) => sum + s.duration_minutes, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Week completion stats
// ---------------------------------------------------------------------------

export async function getWeekCompletionStats(weekNumber: number, userId: string) {
  const { TRAINING_PLAN } = await import('../training-plan');

  const weekPlan = TRAINING_PLAN.filter(
    (p) => p.week_number === weekNumber && p.sport_type !== 'rest'
  );

  const sessions = await getUserSessions(userId);
  const weekSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.date);
    const diffDays = Math.floor(
      (sessionDate.getTime() - PROGRAM_START_DATE.getTime()) / MS_PER_DAY
    );
    const sessionWeek = Math.floor(diffDays / 7) + 1;
    return sessionWeek === weekNumber;
  });

  return {
    planned: weekPlan.length,
    completed: weekSessions.length,
    percentage:
      weekPlan.length > 0
        ? Math.round((weekSessions.length / weekPlan.length) * 100)
        : 0,
  };
}
