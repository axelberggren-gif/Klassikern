'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trophy, Flame, Zap, Swords } from 'lucide-react';
import AppShell from '@/components/AppShell';
import StreakBadge from '@/components/dashboard/StreakBadge';
import TodayCard from '@/components/dashboard/TodayCard';
import WeekSummary from '@/components/dashboard/WeekSummary';
import BossCard from '@/components/boss/BossCard';
import BossTimeline from '@/components/boss/BossTimeline';
import BossDefeatCinematic from '@/components/boss/BossDefeatCinematic';
import DamageLeaderboard from '@/components/leaderboard/DamageLeaderboard';
import EnhancedFeed from '@/components/group/EnhancedFeed';
import type { EnhancedFeedItem } from '@/components/group/EnhancedFeed';
import PowerRankings from '@/components/group/PowerRankings';
import WeeklyHistory from '@/components/group/WeeklyHistory';
import SportLeaderboard from '@/components/group/SportLeaderboard';
import HeadToHead from '@/components/group/HeadToHead';
import CallOutChallenge from '@/components/group/CallOutChallenge';
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
  toggleReaction,
  addFeedComment,
  deleteFeedComment,
  getActiveChallenges,
  createCallOut,
  getChallengeHistory,
  getWeeklyWinners,
  getSportLeaderboard,
  getPowerRankings,
} from '@/lib/store';
import type { WeeklyEPInfo, AttackBossWeeklyResult } from '@/lib/store';
import type { WeeklyWinnerResult, SportLeaderboardEntry } from '@/lib/store/leaderboard';
import { getCurrentWeekNumber, getPlanForWeek } from '@/lib/training-plan';
import type {
  Profile,
  PlannedSession,
  Session,
  BossEncounterWithBoss,
  BossAttackWithUser,
  SportType,
  ChallengeMetric,
  CallOutChallengeWithUsers,
  PowerRanking,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type DashboardTab = 'feed' | 'leaderboard';
type LeaderboardSubTab = 'overview' | 'power' | 'weekly' | 'sport' | 'h2h';

type LeaderboardType = 'damage' | 'ep' | 'streak';

interface LeaderboardConfig {
  key: LeaderboardType;
  label: string;
  icon: React.ReactNode;
  getValue: (user: Profile, damageMap?: Map<string, number>) => number;
  formatValue: (value: number) => string;
}

const LEADERBOARD_CONFIGS: LeaderboardConfig[] = [
  {
    key: 'damage',
    label: 'Bossskada denna vecka',
    icon: <Swords size={16} className="text-rose-500" />,
    getValue: (user, damageMap) => damageMap?.get(user.id) || 0,
    formatValue: (v) => `${v} DMG`,
  },
  {
    key: 'ep',
    label: 'Total EP',
    icon: <Zap size={16} className="text-amber-400" />,
    getValue: (user) => user.total_ep,
    formatValue: (v) => `${v} EP`,
  },
  {
    key: 'streak',
    label: 'Aktuell streak',
    icon: <Flame size={16} className="text-orange-500" />,
    getValue: (user) => user.current_streak,
    formatValue: (v) => `${v} dagar`,
  },
];

const LEADERBOARD_SUB_TABS: { key: LeaderboardSubTab; label: string }[] = [
  { key: 'overview', label: 'Översikt' },
  { key: 'power', label: 'Power' },
  { key: 'weekly', label: 'Vecka' },
  { key: 'sport', label: 'Sport' },
  { key: 'h2h', label: 'H2H' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMedalEmoji(index: number): string {
  if (index === 0) return '\u{1F947}';
  if (index === 1) return '\u{1F948}';
  if (index === 2) return '\u{1F949}';
  return `${index + 1}.`;
}

// ---------------------------------------------------------------------------
// Mini Leaderboard (overview rows)
// ---------------------------------------------------------------------------

function MiniLeaderboard({
  users,
  config,
  currentUserId,
  damageMap,
}: {
  users: Profile[];
  config: LeaderboardConfig;
  currentUserId: string;
  damageMap?: Map<string, number>;
}) {
  const sorted = [...users].sort(
    (a, b) => config.getValue(b, damageMap) - config.getValue(a, damageMap)
  );

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
        {config.icon}
        <h3 className="text-sm font-semibold text-slate-200">{config.label}</h3>
      </div>
      <div className="divide-y divide-slate-800">
        {sorted.map((user, index) => {
          const value = config.getValue(user, damageMap);
          const isCurrentUser = user.id === currentUserId;
          const isFirst = index === 0 && value > 0;

          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 px-5 py-3 transition-all ${
                isCurrentUser ? 'bg-emerald-500/10' : ''
              } ${isFirst ? 'ring-1 ring-inset ring-amber-500/20' : ''}`}
            >
              <span className="w-8 text-center text-sm font-bold text-slate-200">
                {getMedalEmoji(index)}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  isCurrentUser
                    ? 'bg-emerald-500'
                    : isFirst
                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-600'
                }`}
              >
                {user.display_name.charAt(0)}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    isCurrentUser
                      ? 'text-emerald-400'
                      : isFirst
                        ? 'text-amber-400'
                        : 'text-slate-200'
                  }`}
                >
                  {user.display_name}
                  {isCurrentUser && ' (du)'}
                </p>
              </div>
              <span
                className={`text-sm font-bold ${
                  isCurrentUser
                    ? 'text-emerald-400'
                    : isFirst
                      ? 'text-amber-400'
                      : 'text-slate-200'
                }`}
              >
                {config.formatValue(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();

  // Existing dashboard state
  const [members, setMembers] = useState<Profile[]>([]);
  const [todayPlan, setTodayPlan] = useState<PlannedSession[]>([]);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [weekPlan, setWeekPlan] = useState<PlannedSession[]>([]);
  const [weekSessions, setWeekSessions] = useState<Session[]>([]);
  const [feed, setFeed] = useState<EnhancedFeedItem[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [bossEncounter, setBossEncounter] = useState<BossEncounterWithBoss | null>(null);
  const [bossAttacks, setBossAttacks] = useState<BossAttackWithUser[]>([]);
  const [bossHistory, setBossHistory] = useState<BossEncounterWithBoss[]>([]);
  const [weeklyEP, setWeeklyEP] = useState<WeeklyEPInfo | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [defeatResult, setDefeatResult] = useState<AttackBossWeeklyResult | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<DashboardTab>('feed');
  const [leaderboardSubTab, setLeaderboardSubTab] = useState<LeaderboardSubTab>('overview');

  // Leaderboard data
  const [damageMap, setDamageMap] = useState<Map<string, number>>(new Map());
  const [weeklySessionMap, setWeeklySessionMap] = useState<Map<string, number>>(new Map());
  const [weeklyEPMap, setWeeklyEPMap] = useState<Map<string, number>>(new Map());
  const [powerRankings, setPowerRankings] = useState<PowerRanking[]>([]);
  const [weeklyWinners, setWeeklyWinners] = useState<WeeklyWinnerResult[]>([]);
  const [sportData, setSportData] = useState<Map<SportType, SportLeaderboardEntry[]>>(new Map());
  const [challenges, setChallenges] = useState<CallOutChallengeWithUsers[]>([]);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

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
      const [sessions, groupMembers, userGroupId] = await Promise.all([
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
      setGroupId(userGroupId);

      if (userGroupId) {
        const [feedData, encounter, history] = await Promise.all([
          getActivityFeed(userGroupId),
          getActiveBossEncounter(userGroupId),
          getGroupBossHistory(userGroupId),
        ]);
        setFeed(feedData as EnhancedFeedItem[]);
        setBossEncounter(encounter);
        setBossHistory(history);

        let dMap = new Map<string, number>();
        if (encounter) {
          const [attacks, epInfo] = await Promise.all([
            getEncounterAttacks(encounter.id),
            getUnusedWeeklyEP(user.id, encounter.id),
          ]);
          setBossAttacks(attacks);
          setWeeklyEP(epInfo);

          for (const atk of attacks) {
            dMap.set(atk.user_id, (dMap.get(atk.user_id) || 0) + atk.damage);
          }
        }
        setDamageMap(dMap);

        // Load leaderboard data in background
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        const wsStart = monday.toISOString().split('T')[0];
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const wsEnd = sunday.toISOString().split('T')[0];

        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const memberIds = groupMembers.map((m) => m.id);
        const { data: wSessions } = await supabase
          .from('sessions')
          .select('user_id, ep_earned')
          .in('user_id', memberIds)
          .gte('date', wsStart)
          .lte('date', wsEnd);

        const wSessionMap = new Map<string, number>();
        const wEPMap = new Map<string, number>();
        for (const s of wSessions || []) {
          wSessionMap.set(s.user_id, (wSessionMap.get(s.user_id) || 0) + 1);
          wEPMap.set(s.user_id, (wEPMap.get(s.user_id) || 0) + s.ep_earned);
        }
        setWeeklySessionMap(wSessionMap);
        setWeeklyEPMap(wEPMap);

        const rankings = getPowerRankings(groupMembers, dMap, wSessionMap);
        setPowerRankings(rankings);

        // Secondary data in background
        Promise.all([
          getWeeklyWinners(userGroupId, 12),
          getSportLeaderboard(userGroupId, 'cycling'),
          getSportLeaderboard(userGroupId, 'running'),
          getSportLeaderboard(userGroupId, 'swimming'),
          getSportLeaderboard(userGroupId, 'hiit'),
          getActiveChallenges(userGroupId),
          getChallengeHistory(userGroupId),
        ]).then(([winners, cycling, running, swimming, hiit, activeCh, historyCh]) => {
          setWeeklyWinners(winners);
          const sMap = new Map<SportType, SportLeaderboardEntry[]>();
          sMap.set('cycling', cycling);
          sMap.set('running', running);
          sMap.set('swimming', swimming);
          sMap.set('hiit', hiit);
          setSportData(sMap);
          setChallenges([...activeCh, ...historyCh]);
        });
      }
    };

    loadData();
  }, [user, profile]);

  // -------------------------------------------------------------------------
  // Feed handlers
  // -------------------------------------------------------------------------

  const handleToggleReaction = useCallback(
    async (feedItemId: string, emoji: string) => {
      if (!user) return;
      const added = await toggleReaction(feedItemId, user.id, emoji);
      setFeed((prev) =>
        prev.map((item) => {
          if (item.id !== feedItemId) return item;
          const reactions = [...(item.reactions || [])];
          if (added) {
            reactions.push({
              id: crypto.randomUUID(),
              feed_item_id: feedItemId,
              user_id: user.id,
              emoji,
              created_at: new Date().toISOString(),
            });
          } else {
            const idx = reactions.findIndex(
              (r) => r.user_id === user.id && r.emoji === emoji
            );
            if (idx >= 0) reactions.splice(idx, 1);
          }
          return { ...item, reactions };
        })
      );
    },
    [user]
  );

  const handleAddComment = useCallback(
    async (feedItemId: string, text: string) => {
      if (!user) return;
      const comment = await addFeedComment(feedItemId, user.id, text);
      if (comment) {
        setFeed((prev) =>
          prev.map((item) => {
            if (item.id !== feedItemId) return item;
            return { ...item, comments: [...(item.comments || []), comment] };
          })
        );
      }
    },
    [user]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const success = await deleteFeedComment(commentId);
      if (success) {
        setFeed((prev) =>
          prev.map((item) => ({
            ...item,
            comments: item.comments?.filter((c) => c.id !== commentId),
          }))
        );
      }
    },
    []
  );

  const handleCreateChallenge = useCallback(
    async (challengedId: string, metric: string, sportType: string | null) => {
      if (!user || !groupId) return;
      const result = await createCallOut({
        groupId,
        challengerId: user.id,
        challengedId,
        sportType: sportType as SportType | null,
        metric: metric as ChallengeMetric,
      });
      if (result) {
        setChallenges((prev) => [result, ...prev]);
        // Refresh feed
        const feedData = await getActivityFeed(groupId);
        setFeed(feedData as EnhancedFeedItem[]);
      }
    },
    [user, groupId]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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
    const result = await attackBossWeekly({
      userId: user.id,
      groupId,
      userStreak: profile.current_streak,
    });
    if (result) {
      if (result.isKillingBlow && result.defeatText) {
        setDefeatResult(result);
      }
      const encounter = await getActiveBossEncounter(groupId);
      setBossEncounter(encounter);
      if (encounter) {
        const [attacks, epInfo] = await Promise.all([
          getEncounterAttacks(encounter.id),
          getUnusedWeeklyEP(user.id, encounter.id),
        ]);
        setBossAttacks(attacks);
        setWeeklyEP(epInfo);
      } else {
        const history = await getGroupBossHistory(groupId);
        setBossHistory(history);
        setWeeklyEP(null);
      }
    }
    return result;
  };

  const accumulatedHours = weeklyEP ? Math.round((weeklyEP.totalMinutes / 60) * 10) / 10 : 0;

  return (
    <>
      {defeatResult && defeatResult.defeatText && (
        <BossDefeatCinematic
          bossEmoji={defeatResult.bossEmoji}
          bossName={defeatResult.bossName}
          defeatText={defeatResult.defeatText}
          critSecret={defeatResult.critSecret}
          bonusDamage={defeatResult.damage}
          killerName={profile.display_name}
          onDone={() => setDefeatResult(null)}
        />
      )}
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
                {accumulatedHours}h
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
        {/* Boss Card */}
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

        {/* Tab switcher: Aktivitet / Topplista */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-800">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'feed' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'
            }`}
          >
            Aktivitet
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'leaderboard' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'
            }`}
          >
            <Trophy size={14} className="inline mr-1 -mt-0.5" />
            Topplista
          </button>
        </div>

        {/* Leaderboard sub-tabs */}
        {activeTab === 'leaderboard' && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mt-2">
            {LEADERBOARD_SUB_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setLeaderboardSubTab(tab.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  leaderboardSubTab === tab.key
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ====================== AKTIVITET TAB ====================== */}
        {activeTab === 'feed' && (
          <>
            {/* Call-out challenges */}
            <CallOutChallenge
              challenges={challenges as unknown as Parameters<typeof CallOutChallenge>[0]['challenges']}
              members={members}
              currentUserId={user!.id}
              onCreateChallenge={handleCreateChallenge}
            />

            {/* Enhanced feed with reactions & comments */}
            <EnhancedFeed
              items={feed}
              currentUserId={user!.id}
              maxItems={20}
              onToggleReaction={handleToggleReaction}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          </>
        )}

        {/* ====================== TOPPLISTA TAB ====================== */}
        {activeTab === 'leaderboard' && (
          <>
            {/* Overview: classic leaderboards + group stats */}
            {leaderboardSubTab === 'overview' && (
              <>
                {LEADERBOARD_CONFIGS.map((config) => (
                  <MiniLeaderboard
                    key={config.key}
                    users={members}
                    config={config}
                    currentUserId={user!.id}
                    damageMap={damageMap}
                  />
                ))}
                <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Gruppstats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">
                        {members.reduce((sum, u) => sum + u.total_ep, 0)}
                      </p>
                      <p className="text-xs text-slate-400">Totala EP</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">
                        {members.length > 0 ? Math.max(...members.map((u) => u.current_streak)) : 0}
                      </p>
                      <p className="text-xs text-slate-400">Längsta aktiva streak</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Power Rankings */}
            {leaderboardSubTab === 'power' && (
              <PowerRankings rankings={powerRankings} currentUserId={user!.id} />
            )}

            {/* Weekly History */}
            {leaderboardSubTab === 'weekly' && (
              <WeeklyHistory winners={weeklyWinners} currentUserId={user!.id} />
            )}

            {/* Sport Leaderboard */}
            {leaderboardSubTab === 'sport' && (
              <SportLeaderboard data={sportData} currentUserId={user!.id} />
            )}

            {/* Head-to-Head */}
            {leaderboardSubTab === 'h2h' && members.length >= 2 && (
              <HeadToHead
                members={members}
                currentUserId={user!.id}
                damageMap={damageMap}
                weeklySessionMap={weeklySessionMap}
                weeklyEPMap={weeklyEPMap}
              />
            )}
          </>
        )}

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
    </>
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
