'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Zap,
  Flame,
  Trophy,
  Snowflake,
  Bike,
  Waves,
  PersonStanding,
  Pencil,
  Check,
  Bell,
  Palette,
  LogOut,
  Lock,
  ChevronRight,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import BadgeUnlockModal, { getBadgeIcon } from '@/components/BadgeUnlockModal';
import NotificationSettings from '@/components/NotificationSettings';
import StravaConnect from '@/components/StravaConnect';
import { useAuth } from '@/lib/auth';
import { getPermissionState, notify } from '@/lib/notifications';
import { checkAndAwardBadges } from '@/lib/badge-checker';
import { updateCurrentUser, getUserBadges, getAllBadges, getUserTrophies, getAllBossDefinitions } from '@/lib/store';
import type { Badge, UserBadgeWithBadge, BossDefinition, BossTrophyWithBoss } from '@/types/database';

function InlineEdit({
  value,
  onSave,
  label,
  suffix,
  type = 'text',
}: {
  value: string | number;
  onSave: (val: string) => Promise<void>;
  label: string;
  suffix?: string;
  type?: 'text' | 'number';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  async function commit() {
    const trimmed = draft.trim();
    if (trimmed === '' || trimmed === String(value)) {
      setEditing(false);
      setDraft(String(value));
      return;
    }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      setDraft(String(value));
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400 min-w-[100px]">{label}</span>
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-slate-50 outline-none focus:ring-2 focus:ring-emerald-500/20"
          min={type === 'number' ? 1 : undefined}
        />
        {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
        <button
          onClick={commit}
          disabled={saving}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white"
        >
          <Check size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400 min-w-[100px]">{label}</span>
      <button
        onClick={() => setEditing(true)}
        className="flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 active:bg-slate-700 text-left"
      >
        <span>
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
        <Pencil size={13} className="text-slate-500 ml-auto flex-shrink-0" />
      </button>
      {saved && (
        <span className="text-xs text-emerald-400 font-medium animate-slide-up">
          Sparat!
        </span>
      )}
    </div>
  );
}

function PlaceholderRow({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
        <Icon size={18} className="text-slate-400" />
      </div>
      <span className="flex-1 text-sm text-slate-400">{label}</span>
      <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
        Kommer snart
      </span>
    </div>
  );
}

function StravaStatusBanner() {
  const searchParams = useSearchParams();
  const stravaStatus = searchParams.get('strava');
  if (stravaStatus === 'connected') {
    return (
      <div className="mx-4 mt-3 rounded-xl px-4 py-3 text-sm font-medium text-white" style={{ backgroundColor: '#FC4C02' }}>
        ✓ Strava kopplad! Klicka &quot;Synka nu&quot; for att importera dina aktiviteter.
      </div>
    );
  }
  if (stravaStatus === 'error') {
    return (
      <div className="mx-4 mt-3 rounded-xl bg-rose-500/20 border border-rose-500/30 px-4 py-3 text-sm font-medium text-rose-400">
        ✗ Strava-koppling misslyckades. Kontrollera att STRAVA_CLIENT_ID och STRAVA_CLIENT_SECRET ar konfigurerade, och att redirect URI matchar i Strava-appen.
      </div>
    );
  }
  if (stravaStatus === 'denied') {
    return (
      <div className="mx-4 mt-3 rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-3 text-sm font-medium text-amber-400">
        Strava-atkomst nekades.
      </div>
    );
  }
  return null;
}

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, signOut } = useAuth();
  const [allBadgeDefs, setAllBadgeDefs] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadgeWithBadge[]>([]);
  const [allBossDefs, setAllBossDefs] = useState<BossDefinition[]>([]);
  const [trophies, setTrophies] = useState<BossTrophyWithBoss[]>([]);
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const stravaCheckedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAllBadges(),
      getUserBadges(user.id),
      getAllBossDefinitions(),
      getUserTrophies(user.id),
    ]).then(([badges, userBadges, bossDefs, userTrophies]) => {
      setAllBadgeDefs(badges);
      setEarnedBadges(userBadges);
      setAllBossDefs(bossDefs);
      setTrophies(userTrophies);
    });
  }, [user]);

  // Award Strava badge immediately after OAuth callback
  useEffect(() => {
    if (!user || stravaCheckedRef.current) return;
    if (searchParams.get('strava') !== 'connected') return;
    stravaCheckedRef.current = true;

    checkAndAwardBadges(user.id).then(async (newBadgeNames) => {
      if (newBadgeNames.length === 0) return;
      // Fetch full badge objects for the modal
      const allBadges = await getAllBadges();
      const newBadgeObjects = allBadges.filter((b) => newBadgeNames.includes(b.name));
      setPendingBadges(newBadgeObjects);
      // Refresh earned badges list
      getUserBadges(user.id).then(setEarnedBadges);
    });
  }, [user, searchParams]);

  function handleBadgesEarned(badgeNames: string[]) {
    const newBadgeObjects = allBadgeDefs.filter((b) => badgeNames.includes(b.name));
    setPendingBadges((prev) => [...prev, ...newBadgeObjects]);
    getUserBadges(user!.id).then(setEarnedBadges);
  }

  if (loading || !profile) return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Laddar...</p>
        </div>
      </div>
    );

  const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge_id));

  const memberSince = new Date(profile.created_at).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
  });

  const initial = profile.display_name.charAt(0).toUpperCase();

  async function saveField(field: string, value: string) {
    if (!user) return;
    const parsed =
      field === 'display_name' ? value : Math.max(1, parseInt(value) || 1);
    await updateCurrentUser(user.id, { [field]: parsed });

    // Notify on goal changes
    if (field !== 'display_name' && profile) {
      const goalLabels: Record<string, string> = {
        goal_vr_hours: 'Vatternrundan',
        goal_vansbro_minutes: 'Vansbrosimningen',
        goal_lidingo_hours: 'Lidingoloppet',
      };
      const label = goalLabels[field];
      if (label) {
        notify(
          'goal_updated',
          profile.notification_preferences,
          'Mal uppdaterat',
          `${label}: ${parsed}${field.includes('hours') ? ' timmar' : ' minuter'}`,
          'goal-updated',
          { url: '/profile' }
        );
      }
    }
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="bg-slate-900 px-5 pt-12 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-50">Profil</h1>
        </div>
      </div>

      {/* Strava OAuth status banner */}
      <StravaStatusBanner />

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Profile header */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-3xl font-bold text-white shadow-md">
            {initial}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-50">
              {profile.display_name}
            </h2>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              Medlem sedan {memberSince}
            </p>
          </div>
        </div>

        {/* Stats overview */}
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            Statistik
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <Zap size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-50">
                  {profile.total_ep}
                </p>
                <p className="text-xs text-slate-400">Total EP</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                <Flame size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-50">
                  {profile.current_streak}
                </p>
                <p className="text-xs text-slate-400">Nuvarande streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15">
                <Trophy size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-50">
                  {profile.longest_streak}
                </p>
                <p className="text-xs text-slate-400">Langsta streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                <Snowflake size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-50">
                  {profile.streak_freezes_remaining}
                </p>
                <p className="text-xs text-slate-400">Streak freezes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Badges card */}
        {allBadgeDefs.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Badges</h3>
              <span className="text-xs font-medium text-slate-400">
                {earnedBadges.length}/{allBadgeDefs.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {allBadgeDefs.map((badge) => {
                const earned = earnedBadgeIds.has(badge.id);
                const userBadge = earnedBadges.find(
                  (ub) => ub.badge_id === badge.id
                );
                const Icon = earned ? getBadgeIcon(badge.icon_key) : Lock;

                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all ${
                      earned
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-slate-800 border border-slate-700 opacity-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        earned
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-500'
                          : 'bg-slate-700'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={earned ? 'text-white' : 'text-slate-400'}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-semibold leading-tight ${
                        earned ? 'text-slate-200' : 'text-slate-400'
                      }`}
                    >
                      {badge.name}
                    </span>
                    {earned && userBadge && (
                      <span className="text-[9px] text-slate-400">
                        {new Date(userBadge.earned_at).toLocaleDateString(
                          'sv-SE',
                          { day: 'numeric', month: 'short' }
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Boss trophies card */}
        {allBossDefs.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">⚔️</span>
                <h3 className="text-sm font-semibold text-slate-200">Boss-trofeer</h3>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {trophies.length}/{allBossDefs.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {allBossDefs.map((boss) => {
                const trophy = trophies.find((t) => t.boss_id === boss.id);
                const earned = !!trophy;

                return (
                  <div
                    key={boss.id}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all ${
                      earned
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-slate-800 border border-slate-700 opacity-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                        earned
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-500'
                          : 'bg-slate-700'
                      }`}
                    >
                      {earned ? boss.emoji : '🔒'}
                    </div>
                    <span
                      className={`text-[11px] font-semibold leading-tight ${
                        earned ? 'text-slate-200' : 'text-slate-400'
                      }`}
                    >
                      {boss.name}
                    </span>
                    {earned && trophy && (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-slate-400">
                          {trophy.damage_dealt} skada
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Vecka {trophy.week_number}
                        </span>
                        {trophy.is_killing_blow && (
                          <span className="text-[9px] font-bold text-emerald-400">
                            ⚔️ Dodsstot
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goals card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            Mal
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Bike size={14} />
              <span className="text-xs font-medium">Vatternrundan</span>
            </div>
            <InlineEdit
              value={profile.goal_vr_hours}
              onSave={(v) => saveField('goal_vr_hours', v)}
              label="Maltid"
              suffix="timmar"
              type="number"
            />

            <div className="border-t border-slate-700 pt-3 flex items-center gap-2 text-slate-400 mb-1">
              <Waves size={14} />
              <span className="text-xs font-medium">Vansbrosimningen</span>
            </div>
            <InlineEdit
              value={profile.goal_vansbro_minutes}
              onSave={(v) => saveField('goal_vansbro_minutes', v)}
              label="Maltid"
              suffix="minuter"
              type="number"
            />

            <div className="border-t border-slate-700 pt-3 flex items-center gap-2 text-slate-400 mb-1">
              <PersonStanding size={14} />
              <span className="text-xs font-medium">Lidingoloppet</span>
            </div>
            <InlineEdit
              value={profile.goal_lidingo_hours}
              onSave={(v) => saveField('goal_lidingo_hours', v)}
              label="Maltid"
              suffix="timmar"
              type="number"
            />
          </div>
        </div>

        {/* Edit profile card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            Profil
          </h3>
          <InlineEdit
            value={profile.display_name}
            onSave={(v) => saveField('display_name', v)}
            label="Visningsnamn"
          />
        </div>

        {/* Strava connection */}
        {user && (
          <StravaConnect userId={user.id} onBadgesEarned={handleBadgesEarned} />
        )}

        {/* Settings card / Notification settings */}
        {showNotifSettings ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
            <NotificationSettings onBack={() => setShowNotifSettings(false)} />
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">
              Installningar
            </h3>
            <div className="divide-y divide-slate-700">
              <button
                onClick={() => setShowNotifSettings(true)}
                className="flex w-full items-center gap-3 py-3 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                  <Bell size={18} className={getPermissionState() === 'granted' ? 'text-emerald-400' : 'text-slate-400'} />
                </div>
                <span className="flex-1 text-sm text-slate-200">Notifikationer</span>
                {getPermissionState() === 'granted' && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    Aktiva
                  </span>
                )}
                <ChevronRight size={16} className="text-slate-500" />
              </button>
              <PlaceholderRow icon={Palette} label="Tema" />
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3.5 text-sm font-semibold text-rose-400 transition-colors active:bg-rose-500/20"
        >
          <LogOut size={18} />
          Logga ut
        </button>

        <div className="h-4" />
      </div>

      {/* Badge unlock modals — shown one at a time */}
      {pendingBadges.length > 0 && (
        <BadgeUnlockModal
          badge={pendingBadges[0]}
          onDismiss={() => setPendingBadges((prev) => prev.slice(1))}
        />
      )}
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  );
}
