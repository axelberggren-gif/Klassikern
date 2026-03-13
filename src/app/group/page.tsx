'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Flame,
  Star,
  Zap,
  Settings,
  Copy,
  Check,
  UserPlus,
  Crown,
  Shield,
  Users,
  RefreshCw,
  LogOut,
  Plus,
  Loader2,
  Swords,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import { useAuth } from '@/lib/auth';
import {
  getGroupMembers,
  getActivityFeed,
  getUserGroupId,
  getGroupDetails,
  joinGroupByCode,
  leaveGroup,
  regenerateInviteCode,
  createGroup,
  getActiveBossEncounter,
  getEncounterAttacks,
  getGroupBossHistory,
} from '@/lib/store';
import type {
  Profile,
  ActivityFeedItemWithUser,
  GroupDetails,
  BossEncounterWithBoss,
  BossAttackWithUser,
} from '@/types/database';

type LeaderboardType = 'damage' | 'ep' | 'streak';
type TabType = 'leaderboard' | 'feed' | 'settings';

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

function getMedalEmoji(index: number): string {
  if (index === 0) return '\u{1F947}';
  if (index === 1) return '\u{1F948}';
  if (index === 2) return '\u{1F949}';
  return `${index + 1}.`;
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
          <Crown size={10} />
          Agare
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
          <Shield size={10} />
          Admin
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          Medlem
        </span>
      );
  }
}

function Leaderboard({
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

          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 px-5 py-3 ${
                isCurrentUser ? 'bg-emerald-500/10' : ''
              }`}
            >
              <span className="w-8 text-center text-sm font-bold text-slate-200">
                {getMedalEmoji(index)}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                {user.display_name.charAt(0)}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
                  }`}
                >
                  {user.display_name}
                  {isCurrentUser && ' (du)'}
                </p>
              </div>
              <span
                className={`text-sm font-bold ${
                  isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
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

function NoGroupView({
  userId,
  onGroupJoined,
}: {
  userId: string;
  onGroupJoined: () => void;
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);

    const result = await joinGroupByCode(userId, inviteCode);
    if (result.success) {
      onGroupJoined();
    } else {
      setError(result.error || 'Okant fel.');
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    setError(null);

    const result = await createGroup(userId, groupName.trim());
    if (result.success) {
      onGroupJoined();
    } else {
      setError(result.error || 'Okant fel.');
    }
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="bg-slate-900 px-5 pt-12 pb-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-slate-50">Grupp</h1>
        <p className="text-sm text-slate-400 mt-1">
          Du ar inte med i nagon grupp annu
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-6">
        {/* Mode switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-800">
          <button
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mode === 'join'
                ? 'bg-slate-700 text-slate-50 shadow-sm'
                : 'text-slate-400'
            }`}
          >
            <UserPlus size={14} className="inline mr-1.5 -mt-0.5" />
            Ga med
          </button>
          <button
            onClick={() => {
              setMode('create');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mode === 'create'
                ? 'bg-slate-700 text-slate-50 shadow-sm'
                : 'text-slate-400'
            }`}
          >
            <Plus size={14} className="inline mr-1.5 -mt-0.5" />
            Skapa ny
          </button>
        </div>

        {mode === 'join' ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                <UserPlus size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-50">
                  Ga med i en grupp
                </h3>
                <p className="text-xs text-slate-400">
                  Ange inbjudningskoden fran din van
                </p>
              </div>
            </div>

            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="T.ex. ABCD1234"
              maxLength={10}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-lg tracking-widest uppercase font-mono text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-500"
            />

            {error && (
              <p className="mt-3 text-xs text-rose-500 text-center">{error}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={!inviteCode.trim() || loading}
              className="mt-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? 'Gar med...' : 'Ga med'}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                <Plus size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-50">
                  Skapa en ny grupp
                </h3>
                <p className="text-xs text-slate-400">
                  Bjud sedan in dina vanner med en kod
                </p>
              </div>
            </div>

            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Gruppnamn"
              maxLength={40}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-500"
            />

            {error && (
              <p className="mt-3 text-xs text-rose-500 text-center">{error}</p>
            )}

            <button
              onClick={handleCreate}
              disabled={!groupName.trim() || loading}
              className="mt-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {loading ? 'Skapar...' : 'Skapa grupp'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function GroupSettingsTab({
  groupDetails,
  currentUserId,
  onLeaveGroup,
  onRegenerateCode,
}: {
  groupDetails: GroupDetails;
  currentUserId: string;
  onLeaveGroup: () => void;
  onRegenerateCode: (newCode: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const isOwner = groupDetails.created_by === currentUserId;
  const currentMember = groupDetails.members.find(
    (m) => m.user_id === currentUserId
  );
  const isOwnerRole = currentMember?.role === 'owner';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(groupDetails.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = groupDetails.invite_code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const newCode = await regenerateInviteCode(groupDetails.id);
    if (newCode) {
      onRegenerateCode(newCode);
    }
    setRegenerating(false);
    setShowRegenerateConfirm(false);
  };

  const handleLeave = async () => {
    setLeaving(true);
    setLeaveError(null);
    const result = await leaveGroup(currentUserId, groupDetails.id);
    if (result.success) {
      onLeaveGroup();
    } else {
      setLeaveError(result.error || 'Okant fel.');
    }
    setLeaving(false);
  };

  const roleOrder: Record<string, number> = {
    owner: 0,
    admin: 1,
    member: 2,
  };
  const sortedMembers = [...groupDetails.members].sort(
    (a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3)
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Invite code card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Inbjudningskod
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Dela denna kod med vanner sa att de kan ga med i gruppen
        </p>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-center">
            <span className="text-xl font-bold tracking-[0.3em] text-slate-50 font-mono">
              {groupDetails.invite_code}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
              copied
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-emerald-500 text-white'
            }`}
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>

        {copied && (
          <p className="mt-2 text-xs text-emerald-400 text-center font-medium">
            Kopierad!
          </p>
        )}

        {(isOwner || isOwnerRole) && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            {!showRegenerateConfirm ? (
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                <RefreshCw size={12} />
                Generera ny kod
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-amber-400">
                  Den gamla koden slutar fungera. Ar du saker?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {regenerating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {regenerating ? 'Genererar...' : 'Ja, generera ny'}
                  </button>
                  <button
                    onClick={() => setShowRegenerateConfirm(false)}
                    className="flex-1 rounded-lg bg-slate-700 py-2 text-xs font-medium text-slate-300 transition-all active:scale-[0.98]"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member list */}
      <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Medlemmar ({groupDetails.members.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-800">
          {sortedMembers.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const joinDate = new Date(member.joined_at);
            const joinDateStr = joinDate.toLocaleDateString('sv-SE', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={member.user_id}
                className={`flex items-center gap-3 px-5 py-3 ${
                  isCurrentUser ? 'bg-emerald-500/10' : ''
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                    isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  {member.profile?.avatar_url ||
                    member.profile?.display_name?.charAt(0) ||
                    '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium truncate ${
                        isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {member.profile?.display_name || 'Okand'}
                      {isCurrentUser && ' (du)'}
                    </p>
                    {getRoleBadge(member.role)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Gick med {joinDateStr}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave group */}
      {!isOwnerRole && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 transition-colors"
            >
              <LogOut size={16} />
              Lamna gruppen
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-rose-400">
                Ar du saker pa att du vill lamna gruppen?
              </p>
              {leaveError && (
                <p className="text-xs text-rose-500">{leaveError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {leaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <LogOut size={14} />
                  )}
                  {leaving ? 'Lamnar...' : 'Ja, lamna'}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 rounded-xl bg-slate-700 py-2.5 text-sm font-medium text-slate-300 transition-all active:scale-[0.98]"
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GroupPage() {
  const { user, profile, loading } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItemWithUser[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [dataLoading, setDataLoading] = useState(true);
  const [damageMap, setDamageMap] = useState<Map<string, number>>(new Map());

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    const userGroupId = await getUserGroupId(user.id);
    setGroupId(userGroupId);

    if (userGroupId) {
      const [groupMembers, feedData, details, encounter] = await Promise.all([
        getGroupMembers(user.id),
        getActivityFeed(userGroupId),
        getGroupDetails(userGroupId),
        getActiveBossEncounter(userGroupId),
      ]);

      setMembers(groupMembers);
      setFeed(feedData);
      setGroupDetails(details);

      // Build damage map from current boss attacks
      if (encounter) {
        const attacks = await getEncounterAttacks(encounter.id);
        const dMap = new Map<string, number>();
        for (const atk of attacks) {
          dMap.set(atk.user_id, (dMap.get(atk.user_id) || 0) + atk.damage);
        }
        setDamageMap(dMap);
      }
    } else {
      setMembers([]);
      setFeed([]);
      setGroupDetails(null);
    }

    setDataLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !profile) return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Laddar...</p>
        </div>
      </div>
    );

  if (!dataLoading && !groupId) {
    return <NoGroupView userId={user!.id} onGroupJoined={loadData} />;
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="bg-slate-900 px-5 pt-12 pb-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-slate-50">
          {groupDetails?.name || 'Grupp'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Klassiker 2026 &middot; {members.length} medlemmar
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 px-4 py-3 bg-slate-900 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            activeTab === 'leaderboard'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <Trophy size={14} className="inline mr-1 -mt-0.5" />
          Topplista
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            activeTab === 'feed'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          Aktivitet
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <Settings size={14} className="inline mr-1 -mt-0.5" />
          Installningar
        </button>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {activeTab === 'leaderboard' && (
          <>
            {LEADERBOARD_CONFIGS.map((config) => (
              <Leaderboard
                key={config.key}
                users={members}
                config={config}
                currentUserId={user!.id}
                damageMap={damageMap}
              />
            ))}

            {/* Group stats */}
            <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">
                Gruppstats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {members.reduce((sum, u) => sum + u.total_ep, 0)}
                  </p>
                  <p className="text-xs text-slate-400">Totala EP</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {members.length > 0
                      ? Math.max(...members.map((u) => u.current_streak))
                      : 0}
                  </p>
                  <p className="text-xs text-slate-400">
                    Langsta aktiva streak
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'feed' && (
          <ActivityFeed items={feed} maxItems={20} />
        )}

        {activeTab === 'settings' && groupDetails && (
          <GroupSettingsTab
            groupDetails={groupDetails}
            currentUserId={user!.id}
            onLeaveGroup={loadData}
            onRegenerateCode={(newCode) => {
              setGroupDetails((prev) =>
                prev ? { ...prev, invite_code: newCode } : prev
              );
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
