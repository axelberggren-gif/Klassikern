'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StreakBadge from '@/components/dashboard/StreakBadge';
import TodayCard from '@/components/dashboard/TodayCard';
import WeekSummary from '@/components/dashboard/WeekSummary';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import BossCard from '@/components/boss/BossCard';
import BossTimeline from '@/components/boss/BossTimeline';
import DamageLeaderboard from '@/components/leaderboard/DamageLeaderboard';
import { useAuth } from '@/lib/auth';
import {
  getGroupMembers,
  getUserSessions,
  getActivityFeed,
  getUserGroupId,
  getActiveBossEncounter,
  getEncounterAttacks,
  getGroupBossHistory,
  getUnusedWeeklyEP,
  attackBossWeekly,
} from '@/lib/store';
import type { WeeklyEPInfo } from '@/lib/store';
import { getCurrentWeekNumber, getPlanForWeek } from '@/lib/training-plan';
import type {
  Profile,
  PlannedSession,
  Session,
  ActivityFeedItemWithUser,
  BossEncounterWithBoss,
  BossAttackWithUser,
} from '@/types/database';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [todayPlan, setTodayPlan] = useState<PlannedSession[]>([]);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [weekPlan, setWeekPlan] = useState<PlannedSession[]>([]);
  const [weekSessions, setWeekSessions] = useState<Session[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItemWithUser[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [bossEncounter, setBossEncounter] = useState<BossEncounterWithBoss | null>(null);
  const [bossAttacks, setBossAttacks] = useState<BossAttackWithUser[]>([]);
  const [bossHistory, setBossHistory] = useState<BossEncounterWithBoss[]>([]);
  const [weeklyEP, setWeeklyEP] = useState<WeeklyEPInfo | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) return;

    const loadData = async () => {
      const wk = getCurrentWeekNumber();
      const today = new Date().toISOString().split('T')[0];
      setWeekNumber(wk);

      // Today's plan
      const plan = getPlanForWeek(wk);
      const todayDay = new Date().getDay();
      const ourDay = todayDay === 0 ? 7 : todayDay;
      setTodayPlan(plan.filter((p) => p.day_of_week === ourDay));
      setWeekPlan(plan);

      // Async data loading
      const [sessions, groupMembers, groupId] = await Promise.all([
        getUserSessions(user.id),
        getGroupMembers(user.id),
        getUserGroupId(user.id),
      ]);

      setTotalSessions(sessions.length);
      setTodaySessions(sessions.filter((s) => s.date === today));

      // Week sessions
      const weekStart = new Date(2026, 1, 23);
      weekStart.setDate(weekStart.getDate() + (wk - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      setWeekSessions(
        sessions.filter((s) => {
          const d = new Date(s.date);
          return d >= weekStart && d < weekEnd;
        })
      );

      setMembers(groupMembers);
      setGroupId(groupId);

      if (groupId) {
        const [feedData, encounter, history] = await Promise.all([
          getActivityFeed(groupId),
          getActiveBossEncounter(groupId),
          getGroupBossHistory(groupId),
        ]);
        setFeed(feedData);
        setBossEncounter(encounter);
        setBossHistory(history);

        if (encounter) {
          const [attacks, epInfo] = await Promise.all([
            getEncounterAttacks(encounter.id),
            getUnusedWeeklyEP(user.id, encounter.id),
          ]);
          setBossAttacks(attacks);
          setWeeklyEP(epInfo);
        }
      }
    };

    loadData();
  }, [user, profile]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Laddar...</p>
        </div>
      </div>
    );
  }

  // Build damage leaderboard entries from attacks
  const damageEntries = buildDamageEntries(bossAttacks, members);

  const handleBossAttack = async () => {
    if (!user || !groupId) return null;
    const result = await attackBossWeekly({ userId: user.id, groupId });
    if (result) {
      // Refresh boss data after attack
      const encounter = await getActiveBossEncounter(groupId);
      setBossEncounter(encounter);
      if (encounter) {
        const [attacks, epInfo] = await Promise.all([
          getEncounterAttacks(encounter.id),
          getUnusedWeeklyEP(user.id, encounter.id),
        ]);
        setBossAttacks(attacks);
        setWeeklyEP(epInfo);
      }
    }
    return result;
  };

  const accumulatedHours = weeklyEP ? Math.round((weeklyEP.totalMinutes / 60) * 10) / 10 : 0;

  return (
    <AppShell>
      {/* Compact Dark Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-50">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-slate-400">Hej, {profile.display_name}!</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {accumulatedHours > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                ⚡ {accumulatedHours}h
              </span>
            )}
            <StreakBadge streak={profile.current_streak} />
            <span className="text-xs font-semibold text-slate-400">
              Kapitel {weekNumber}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {/* Boss Card — HERO */}
        <BossCard encounter={bossEncounter} attacks={bossAttacks} weeklyEP={weeklyEP} onAttack={handleBossAttack} />

        {/* Compact Damage Leaderboard */}
        <DamageLeaderboard entries={damageEntries} currentUserId={user!.id} />

        {/* Boss Timeline */}
        <BossTimeline
          history={bossHistory}
          currentEncounter={bossEncounter}
          currentWeek={weekNumber}
        />

        {/* Today's session card */}
        <TodayCard todayPlan={todayPlan} todaySessions={todaySessions} />

        {/* Week summary */}
        <WeekSummary weekPlan={weekPlan} weekSessions={weekSessions} weekNumber={weekNumber} />

        {/* Activity feed */}
        <ActivityFeed items={feed} />

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{profile.total_ep}</p>
            <p className="text-[10px] font-medium text-slate-400">EP totalt</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{totalSessions}</p>
            <p className="text-[10px] font-medium text-slate-400">Pass</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{profile.longest_streak}</p>
            <p className="text-[10px] font-medium text-slate-400">Langsta streak</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function buildDamageEntries(
  attacks: BossAttackWithUser[],
  members: Profile[]
) {
  const damageMap = new Map<string, number>();
  for (const attack of attacks) {
    damageMap.set(attack.user_id, (damageMap.get(attack.user_id) || 0) + attack.damage);
  }

  const nameMap = new Map<string, string>();
  for (const m of members) {
    nameMap.set(m.id, m.display_name);
  }
  // Also get names from attack user objects
  for (const attack of attacks) {
    if (attack.user && !nameMap.has(attack.user_id)) {
      nameMap.set(attack.user_id, attack.user.display_name);
    }
  }

  return Array.from(damageMap.entries()).map(([userId, totalDamage]) => ({
    userId,
    displayName: nameMap.get(userId) || 'Okänd',
    totalDamage,
  }));
}
