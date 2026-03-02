'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getBadgeIcon } from '@/components/BadgeUnlockModal';
import StravaConnect from '@/components/StravaConnect';
import { useAuth } from '@/lib/auth';
import { updateCurrentUser, getUserBadges, getAllBadges } from '@/lib/store';
import type { Badge, UserBadgeWithBadge } from '@/types/database';

// ---------------------------------------------------------------------------
// Inline editable field component
// ---------------------------------------------------------------------------

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

  // Keep draft in sync when value changes externally
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
        <span className="text-sm text-gray-500 min-w-[100px]">{label}</span>
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-orange-200"
          min={type === 'number' ? 1 : undefined}
        />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
        <button
          onClick={commit}
          disabled={saving}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white"
        >
          <Check size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 min-w-[100px]">{label}</span>
      <button
        onClick={() => setEditing(true)}
        className="flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 active:bg-gray-100 text-left"
      >
        <span>
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
        <Pencil size={13} className="text-gray-300 ml-auto flex-shrink-0" />
      </button>
      {saved && (
        <span className="text-xs text-green-500 font-medium animate-slide-up">
          Sparat!
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder settings row
// ---------------------------------------------------------------------------

function PlaceholderRow({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
        <Icon size={18} className="text-gray-400" />
      </div>
      <span className="flex-1 text-sm text-gray-400">{label}</span>
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">
        Kommer snart
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [allBadgeDefs, setAllBadgeDefs] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadgeWithBadge[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([getAllBadges(), getUserBadges(user.id)]).then(
      ([badges, userBadges]) => {
        setAllBadgeDefs(badges);
        setEarnedBadges(userBadges);
      }
    );
  }, [user]);

  if (loading || !profile) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Laddar...</p>
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
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Profil</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Profile header */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 text-3xl font-bold text-white shadow-md">
            {initial}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">
              {profile.display_name}
            </h2>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <p className="text-xs text-gray-300 mt-1">
              Medlem sedan {memberSince}
            </p>
          </div>
        </div>

        {/* Stats overview */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Statistik
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <Zap size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">
                  {profile.total_ep}
                </p>
                <p className="text-xs text-gray-500">Total EP</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <Flame size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">
                  {profile.current_streak}
                </p>
                <p className="text-xs text-gray-500">Nuvarande streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Trophy size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">
                  {profile.longest_streak}
                </p>
                <p className="text-xs text-gray-500">Langsta streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Snowflake size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">
                  {profile.streak_freezes_remaining}
                </p>
                <p className="text-xs text-gray-500">Streak freezes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Badges card */}
        {allBadgeDefs.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Badges</h3>
              <span className="text-xs font-medium text-gray-400">
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
                        ? 'bg-gradient-to-b from-orange-50 to-amber-50 border border-orange-100'
                        : 'bg-gray-50 border border-gray-100 opacity-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        earned
                          ? 'bg-gradient-to-br from-orange-400 to-amber-500'
                          : 'bg-gray-200'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={earned ? 'text-white' : 'text-gray-400'}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-semibold leading-tight ${
                        earned ? 'text-gray-800' : 'text-gray-400'
                      }`}
                    >
                      {badge.name}
                    </span>
                    {earned && userBadge && (
                      <span className="text-[9px] text-gray-400">
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

        {/* Goals card */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Mal
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
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

            <div className="border-t border-gray-100 pt-3 flex items-center gap-2 text-gray-400 mb-1">
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

            <div className="border-t border-gray-100 pt-3 flex items-center gap-2 text-gray-400 mb-1">
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
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Profil
          </h3>
          <InlineEdit
            value={profile.display_name}
            onSave={(v) => saveField('display_name', v)}
            label="Visningsnamn"
          />
        </div>

        {/* Strava connection */}
        {user && <StravaConnect userId={user.id} />}

        {/* Settings card */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Installningar
          </h3>
          <div className="divide-y divide-gray-100">
            <PlaceholderRow icon={Bell} label="Notifikationer" />
            <PlaceholderRow icon={Palette} label="Tema" />
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-semibold text-red-600 transition-colors active:bg-red-100"
        >
          <LogOut size={18} />
          Logga ut
        </button>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </AppShell>
  );
}
