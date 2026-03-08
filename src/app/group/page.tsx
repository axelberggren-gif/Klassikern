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
  Clock,
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
  getBossAttacks,
  getBossHistory,
} from '@/lib/store';
import { isLastStandWindow } from '@/lib/boss-engine';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type {
  Profile,
  ActivityFeedItemWithUser,
  GroupDetails,
  BossEncounterWithBoss,
  BossAttack,
} from '@/types/database';

type LeaderboardType = 'ep' | 'streak' | 'sessions';
type TabType = 'leaderboard' | 'boss' | 'feed' | 'settings';

interface LeaderboardConfig {
  key: LeaderboardType;
  label: string;
  icon: React.ReactNode;
  getValue: (user: Profile) => number;
  formatValue: (value: number) => string;
}

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
    getValue: (user) => {
      // Estimate sessions from total EP (approximate)
      return user.total_ep > 0 ? Math.ceil(user.total_ep / 15) : 0;
    },
    formatValue: (v) => `${v} pass`,
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
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <Crown size={10} />
          Ägare
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
          <Shield size={10} />
          Admin
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
          Medlem
        </span>
      );
  }
}

function Leaderboard({
  users,
  config,
  currentUserId,
}: {
  users: Profile[];
  config: LeaderboardConfig;
  currentUserId: string;
}) {
  const sorted = [...users].sort(
    (a, b) => config.getValue(b) - config.getValue(a)
  );

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        {config.icon}
        <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {sorted.map((user, index) => {
          const value = config.getValue(user);
          const isCurrentUser = user.id === currentUserId;

          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 px-5 py-3 ${
                isCurrentUser ? 'bg-orange-50/50' : ''
              }`}
            >
              <span className="w-8 text-center text-sm font-bold">
                {getMedalEmoji(index)}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  isCurrentUser ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                {user.display_name.charAt(0)}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    isCurrentUser ? 'text-orange-700' : 'text-gray-800'
                  }`}
                >
                  {user.display_name}
                  {isCurrentUser && ' (du)'}
                </p>
              </div>
              <span
                className={`text-sm font-bold ${
                  isCurrentUser ? 'text-orange-600' : 'text-gray-600'
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
// No Group UI — shown when user has no group
// ---------------------------------------------------------------------------

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
      setError(result.error || 'Okänt fel.');
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
      setError(result.error || 'Okänt fel.');
    }
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Grupp</h1>
        <p className="text-sm text-gray-500 mt-1">
          Du är inte med i någon grupp ännu
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-6">
        {/* Mode switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
          <button
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mode === 'join'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <UserPlus size={14} className="inline mr-1.5 -mt-0.5" />
            Gå med
          </button>
          <button
            onClick={() => {
              setMode('create');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mode === 'create'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Plus size={14} className="inline mr-1.5 -mt-0.5" />
            Skapa ny
          </button>
        </div>

        {mode === 'join' ? (
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <UserPlus size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Gå med i en grupp
                </h3>
                <p className="text-xs text-gray-500">
                  Ange inbjudningskoden från din vän
                </p>
              </div>
            </div>

            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="T.ex. ABCD1234"
              maxLength={10}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-lg tracking-widest uppercase font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
            />

            {error && (
              <p className="mt-3 text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={!inviteCode.trim() || loading}
              className="mt-4 w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? 'Går med...' : 'Gå med'}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Plus size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Skapa en ny grupp
                </h3>
                <p className="text-xs text-gray-500">
                  Bjud sedan in dina vänner med en kod
                </p>
              </div>
            </div>

            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Gruppnamn"
              maxLength={40}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
            />

            {error && (
              <p className="mt-3 text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={handleCreate}
              disabled={!groupName.trim() || loading}
              className="mt-4 w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
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

// ---------------------------------------------------------------------------
// Settings Tab
// ---------------------------------------------------------------------------

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
      // Fallback for older browsers
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
      setLeaveError(result.error || 'Okänt fel.');
    }
    setLeaving(false);
  };

  // Sort members: owner first, then admin, then member
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
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={16} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            Inbjudningskod
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Dela denna kod med vänner så att de kan gå med i gruppen
        </p>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-center">
            <span className="text-xl font-bold tracking-[0.3em] text-gray-900 font-mono">
              {groupDetails.invite_code}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
              copied
                ? 'bg-green-100 text-green-600'
                : 'bg-orange-500 text-white'
            }`}
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>

        {copied && (
          <p className="mt-2 text-xs text-green-600 text-center font-medium">
            Kopierad!
          </p>
        )}

        {/* Regenerate code (owner only) */}
        {(isOwner || isOwnerRole) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {!showRegenerateConfirm ? (
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw size={12} />
                Generera ny kod
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-amber-600">
                  Den gamla koden slutar fungera. Är du säker?
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
                    className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-600 transition-all active:scale-[0.98]"
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
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Users size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            Medlemmar ({groupDetails.members.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
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
                  isCurrentUser ? 'bg-orange-50/50' : ''
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                    isCurrentUser ? 'bg-orange-500' : 'bg-gray-300'
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
                        isCurrentUser ? 'text-orange-700' : 'text-gray-800'
                      }`}
                    >
                      {member.profile?.display_name || 'Okänd'}
                      {isCurrentUser && ' (du)'}
                    </p>
                    {getRoleBadge(member.role)}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Gick med {joinDateStr}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave group (non-owners only) */}
      {!isOwnerRole && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={16} />
              Lämna gruppen
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-red-600">
                Är du säker på att du vill lämna gruppen?
              </p>
              {leaveError && (
                <p className="text-xs text-red-500">{leaveError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {leaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <LogOut size={14} />
                  )}
                  {leaving ? 'Lämnar...' : 'Ja, lämna'}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-600 transition-all active:scale-[0.98]"
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

// ---------------------------------------------------------------------------
// Boss Battle Tab
// ---------------------------------------------------------------------------

function BossBattleTab({
  encounter,
  attacks,
  history,
  members,
}: {
  encounter: BossEncounterWithBoss | null;
  attacks: BossAttack[];
  history: BossEncounterWithBoss[];
  members: Profile[];
}) {
  const [showHistory, setShowHistory] = useState(false);

  if (!encounter) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-5xl mb-3">{'\u{1F634}'}{'\u{1F409}'}</p>
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          Ingen aktiv boss just nu
        </h3>
        <p className="text-sm text-gray-400">
          En ny boss dyker upp i b&ouml;rjan av n&auml;sta vecka!
        </p>
      </div>
    );
  }

  const hpPercent = encounter.max_hp > 0
    ? Math.round((encounter.current_hp / encounter.max_hp) * 100)
    : 0;

  const lastStand = isLastStandWindow(new Date(encounter.week_end));

  // --- Attack Leaderboard: group by user, sum damage ---
  const damageByUser: Record<string, { damage: number; attacks: number; crits: number }> = {};
  for (const atk of attacks) {
    if (!damageByUser[atk.user_id]) {
      damageByUser[atk.user_id] = { damage: 0, attacks: 0, crits: 0 };
    }
    damageByUser[atk.user_id].damage += atk.damage;
    damageByUser[atk.user_id].attacks += 1;
    if (atk.is_critical) damageByUser[atk.user_id].crits += 1;
  }

  const attackLeaderboard = Object.entries(damageByUser)
    .map(([userId, stats]) => {
      const member = members.find((m) => m.id === userId);
      return { userId, displayName: member?.display_name || 'Ok\u00e4nd', ...stats };
    })
    .sort((a, b) => b.damage - a.damage);

  // --- Attack Timeline: most recent first, max 10 ---
  const recentAttacks = [...attacks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      {/* Active Boss Card */}
      {(() => {
        const bossLevel = encounter.boss.level;
        const tierName = bossLevel <= 5 ? 'Skogsväsen'
          : bossLevel <= 10 ? 'Bergstroll'
          : bossLevel <= 15 ? 'Havsväsen'
          : bossLevel <= 20 ? 'Jotnar'
          : bossLevel <= 25 ? 'Drömväsen'
          : 'Ragnarök';

        const now = new Date();
        const weekEnd = new Date(encounter.week_end);
        const msLeft = Math.max(0, weekEnd.getTime() - now.getTime());
        const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        const cardBorder = hpPercent < 20
          ? 'border-2 border-red-500'
          : 'border border-slate-700';

        const cardBg = hpPercent > 50
          ? 'bg-gradient-to-br from-slate-900 to-slate-800'
          : hpPercent > 20
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950'
          : 'bg-gradient-to-br from-slate-900 via-red-950 to-slate-800';

        return (
          <>
            <style>{`
              @keyframes boss-pulse-border {
                0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.15); }
                50% { box-shadow: 0 0 16px rgba(239, 68, 68, 0.7), 0 0 40px rgba(239, 68, 68, 0.3); }
              }
              @keyframes boss-hp-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
              }
              @keyframes boss-glow {
                0%, 100% { filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.5)); }
                50% { filter: drop-shadow(0 0 24px rgba(239, 68, 68, 0.8)); }
              }
            `}</style>
            <div
              className={`rounded-2xl ${cardBg} ${cardBorder} shadow-lg p-5 relative overflow-hidden`}
              style={hpPercent < 20 ? { animation: 'boss-pulse-border 2s ease-in-out infinite' } : undefined}
            >
              {/* Decorative top-right accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full pointer-events-none" />

              {/* Tier & Level Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-red-500/20 border border-red-500/30 px-2.5 py-1 text-[11px] font-bold text-red-300 tracking-wide uppercase">
                    Lvl {bossLevel}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-700/60 border border-slate-600/50 px-2.5 py-1 text-[11px] font-semibold text-slate-300 tracking-wide">
                    {tierName}
                  </span>
                </div>
                {lastStand && (
                  <span className="inline-flex items-center rounded-full bg-red-500/25 border border-red-500/40 px-2.5 py-1 text-[10px] font-bold text-red-300 animate-pulse whitespace-nowrap">
                    {'\u{1F525}'} Last Stand!
                  </span>
                )}
              </div>

              {/* Boss Emoji + Name + Lore */}
              <div className="flex items-start gap-4 mb-4">
                {/* Emoji with glow */}
                <div className="relative flex-shrink-0">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%)', transform: 'scale(1.5)' }}
                  />
                  <span
                    className="relative text-7xl leading-none block"
                    style={{ animation: 'boss-glow 3s ease-in-out infinite' }}
                  >
                    {encounter.boss.emoji}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-xl font-bold text-white truncate">
                    {encounter.boss.name}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 italic leading-relaxed">
                    {encounter.boss.lore}
                  </p>
                </div>
              </div>

              {/* HP Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">HP</span>
                  <span className="font-mono text-slate-400">
                    {encounter.current_hp} / {encounter.max_hp}
                  </span>
                </div>
                <div className="h-5 rounded-full bg-slate-700/80 overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500"
                    style={{
                      width: `${hpPercent}%`,
                      ...(hpPercent < 20 ? { animation: 'boss-hp-pulse 1.5s ease-in-out infinite' } : {}),
                    }}
                  />
                  <span
                    className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                  >
                    {hpPercent}%
                  </span>
                </div>
              </div>

              {/* Tid kvar */}
              <div className="flex items-center gap-1.5 mb-4 rounded-lg bg-slate-700/50 border border-slate-600/40 px-3 py-2 w-fit">
                <Clock size={14} className="text-slate-400" />
                <span className="text-[12px] font-medium text-slate-300">
                  Tid kvar: {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`}
                </span>
              </div>

              {/* Weakness / Resistance */}
              {(encounter.boss.weakness || encounter.boss.resistance) && (
                <div className="flex flex-wrap gap-3">
                  {encounter.boss.weakness && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-500/15 border border-green-500/30 px-3.5 py-2">
                      <span className="text-base">{SPORT_CONFIG[encounter.boss.weakness]?.icon}</span>
                      <span className="text-[12px] font-semibold text-green-400">
                        Svaghet: {SPORT_CONFIG[encounter.boss.weakness]?.label}
                      </span>
                    </div>
                  )}
                  {encounter.boss.resistance && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3.5 py-2">
                      <span className="text-base">{SPORT_CONFIG[encounter.boss.resistance]?.icon}</span>
                      <span className="text-[12px] font-semibold text-red-400">
                        Resistans: {SPORT_CONFIG[encounter.boss.resistance]?.label}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* Attack Leaderboard */}
      {attackLeaderboard.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Swords size={16} className="text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-700">Skada denna vecka</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {attackLeaderboard.map((entry, index) => (
              <div key={entry.userId} className="flex items-center gap-3 px-5 py-3">
                <span className="w-8 text-center text-sm font-bold">
                  {getMedalEmoji(index)}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-bold text-white">
                  {entry.displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {entry.displayName}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {entry.attacks} attacker{entry.crits > 0 && (
                      <span className="text-amber-600 font-semibold"> &middot; {entry.crits} krit</span>
                    )}
                  </p>
                </div>
                <span className="text-sm font-bold text-orange-600">
                  {entry.damage} dmg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attack Timeline */}
      {recentAttacks.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Raid-logg</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentAttacks.map((atk) => {
              const member = members.find((m) => m.id === atk.user_id);
              const sportIcon = SPORT_CONFIG[atk.sport_type]?.icon || '\u{2B50}';
              const timeStr = new Date(atk.created_at).toLocaleString('sv-SE', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div key={atk.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-lg">{sportIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{member?.display_name || 'Ok\u00e4nd'}</span>
                      {' '}&mdash; {atk.damage} dmg
                      {atk.is_critical && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          KRIT!
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-400">{timeStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Boss History */}
      {history.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>Boss-historik ({history.length})</span>
            <span className="text-gray-400">{showHistory ? '\u25B2' : '\u25BC'}</span>
          </button>
          {showHistory && (
            <div className="divide-y divide-gray-50 border-t border-gray-100">
              {history.map((enc) => {
                const weekStart = new Date(enc.week_start).toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'short',
                });
                const weekEnd = new Date(enc.week_end).toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <div key={enc.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-2xl">{enc.boss.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {enc.boss.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {weekStart} &ndash; {weekEnd}
                      </p>
                    </div>
                    {enc.status === 'defeated' ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                        Besegrad
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                        Misslyckad
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Group Page
// ---------------------------------------------------------------------------

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

  // User has no group — show join/create UI
  if (!dataLoading && !groupId) {
    return <NoGroupView userId={user!.id} onGroupJoined={loadData} />;
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">
          {groupDetails?.name || 'Grupp'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Klassiker 2026 &middot; {members.length} medlemmar
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            activeTab === 'leaderboard'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Trophy size={14} className="inline mr-1 -mt-0.5" />
          Topplista
        </button>
        <button
          onClick={() => setActiveTab('boss')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            activeTab === 'boss'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Swords size={14} className="inline mr-1 -mt-0.5" />
          Boss
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            activeTab === 'feed'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          Aktivitet
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Settings size={14} className="inline mr-1 -mt-0.5" />
          Inställningar
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
              />
            ))}

            {/* Group stats */}
            <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 p-5">
              <h3 className="text-sm font-semibold text-orange-700 mb-3">
                Gruppstats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {members.reduce((sum, u) => sum + u.total_ep, 0)}
                  </p>
                  <p className="text-xs text-orange-500">Totala EP</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {members.length > 0
                      ? Math.max(...members.map((u) => u.current_streak))
                      : 0}
                  </p>
                  <p className="text-xs text-orange-500">
                    Längsta aktiva streak
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'boss' && (
          <BossBattleTab
            encounter={bossEncounter}
            attacks={bossAttacks}
            history={bossHistory}
            members={members}
          />
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
