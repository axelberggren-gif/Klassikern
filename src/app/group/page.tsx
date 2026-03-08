'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Flame, Star, Zap, Settings, Swords } from 'lucide-react';
import AppShell from '@/components/AppShell';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import Leaderboard from '@/components/group/Leaderboard';
import type { LeaderboardConfig } from '@/components/group/Leaderboard';
import NoGroupView from '@/components/group/NoGroupView';
import GroupSettingsTab from '@/components/group/GroupSettingsTab';
import BossBattleTab from '@/components/group/BossBattleTab';
import { useAuth } from '@/lib/auth';
import {
  getGroupMembers,
  getActivityFeed,
  getUserGroupId,
  getGroupDetails,
  getActiveBossEncounter,
  getBossAttacks,
  getBossHistory,
} from '@/lib/store';
import type {
  Profile,
  ActivityFeedItemWithUser,
  GroupDetails,
  BossEncounterWithBoss,
  BossAttack,
} from '@/types/database';

type TabType = 'leaderboard' | 'boss' | 'feed' | 'settings';

const LEADERBOARD_CONFIGS: LeaderboardConfig[] = [
  {
    key: 'ep',
    label: 'EP denna vecka',
    icon: <Zap size={16} className="text-amber-500" />,
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
  {
    key: 'sessions',
    label: 'Totala pass',
    icon: <Star size={16} className="text-blue-500" />,
    getValue: (user) => user.total_ep > 0 ? Math.ceil(user.total_ep / 15) : 0,
    formatValue: (v) => `${v} pass`,
  },
];

export default function GroupPage() {
  const { user, profile, loading } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItemWithUser[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [dataLoading, setDataLoading] = useState(true);
  const [bossEncounter, setBossEncounter] = useState<BossEncounterWithBoss | null>(null);
  const [bossAttacks, setBossAttacks] = useState<BossAttack[]>([]);
  const [bossHistory, setBossHistory] = useState<BossEncounterWithBoss[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    const userGroupId = await getUserGroupId(user.id);
    setGroupId(userGroupId);

    if (userGroupId) {
      const [groupMembers, feedData, details, activeBoss, history] = await Promise.all([
        getGroupMembers(user.id),
        getActivityFeed(userGroupId),
        getGroupDetails(userGroupId),
        getActiveBossEncounter(userGroupId),
        getBossHistory(userGroupId),
      ]);

      setMembers(groupMembers);
      setFeed(feedData);
      setGroupDetails(details);
      setBossEncounter(activeBoss);
      setBossHistory(history);

      if (activeBoss) {
        const attacks = await getBossAttacks(activeBoss.id);
        setBossAttacks(attacks);
      } else {
        setBossAttacks([]);
      }
    } else {
      setMembers([]);
      setFeed([]);
      setGroupDetails(null);
      setBossEncounter(null);
      setBossAttacks([]);
      setBossHistory([]);
    }

    setDataLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !profile) return null;

  if (!dataLoading && !groupId) {
    return <NoGroupView userId={user!.id} onGroupJoined={loadData} />;
  }

  const tabs: { key: TabType; label: string; icon?: React.ReactNode }[] = [
    { key: 'leaderboard', label: 'Topplista', icon: <Trophy size={14} className="inline mr-1 -mt-0.5" /> },
    { key: 'boss', label: 'Boss', icon: <Swords size={14} className="inline mr-1 -mt-0.5" /> },
    { key: 'feed', label: 'Aktivitet' },
    { key: 'settings', label: 'Inställningar', icon: <Settings size={14} className="inline mr-1 -mt-0.5" /> },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">{groupDetails?.name || 'Grupp'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Klassiker 2026 &middot; {members.length} medlemmar
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 px-4 py-3 bg-white border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {activeTab === 'leaderboard' && (
          <>
            {LEADERBOARD_CONFIGS.map((config) => (
              <Leaderboard key={config.key} users={members} config={config} currentUserId={user!.id} />
            ))}

            <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 p-5">
              <h3 className="text-sm font-semibold text-orange-700 mb-3">Gruppstats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {members.reduce((sum, u) => sum + u.total_ep, 0)}
                  </p>
                  <p className="text-xs text-orange-500">Totala EP</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {members.length > 0 ? Math.max(...members.map((u) => u.current_streak)) : 0}
                  </p>
                  <p className="text-xs text-orange-500">Längsta aktiva streak</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'boss' && (
          <BossBattleTab encounter={bossEncounter} attacks={bossAttacks} history={bossHistory} members={members} />
        )}

        {activeTab === 'feed' && <ActivityFeed items={feed} maxItems={20} />}

        {activeTab === 'settings' && groupDetails && (
          <GroupSettingsTab
            groupDetails={groupDetails}
            currentUserId={user!.id}
            onLeaveGroup={loadData}
            onRegenerateCode={(newCode) => {
              setGroupDetails((prev) => prev ? { ...prev, invite_code: newCode } : prev);
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
