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
  Volume2,
  VolumeX,
  Mountain,
  Calendar,
  Upload,
  Loader2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getBadgeIcon } from '@/components/BadgeUnlockModal';
import StravaConnect from '@/components/StravaConnect';
import { useAuth } from '@/lib/auth';
import { isBossVoiceMuted, setBossVoiceMuted } from '@/lib/boss-voice';
import {
  updateCurrentUser,
  getUserBadges,
  getAllBadges,
  getUserBossTrophies,
  getAllBossDefinitions,
  uploadRaceIcon,
} from '@/lib/store';
import type { Badge, UserBadgeWithBadge, BossDefinition, BossTrophy } from '@/types/database';

const RING_COLORS: { value: string; label: string }[] = [
  { value: '#f97316', label: 'Orange' },
  { value: '#ef4444', label: 'Röd' },
  { value: '#eab308', label: 'Gul' },
  { value: '#10b981', label: 'Grön' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blå' },
  { value: '#8b5cf6', label: 'Lila' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f59e0b', label: 'Amber' },
];

function RaceIconCard({
  userId,
  avatarUrl,
  iconColor,
  onChange,
}: {
  userId: string;
  avatarUrl: string | null;
  iconColor: string;
  onChange: (next: { avatar_url?: string | null; icon_color?: string }) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.type !== 'image/png') {
      setError('Endast PNG-filer stöds.');
      e.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Bilden är för stor (max 1 MB).');
      e.target.value = '';
      return;
    }
    setUploading(true);
    const url = await uploadRaceIcon(userId, file);
    setUploading(false);
    e.target.value = '';
    if (!url) {
      setError('Uppladdningen misslyckades.');
      return;
    }
    await onChange({ avatar_url: url });
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Bike size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Tävlingsikon</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Visas på cykelkartan på startsidan. Ladda upp en PNG och välj färg på ringen.
      </p>

      <div className="flex items-center gap-4 mb-4">
        <div
          className="h-20 w-20 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ boxShadow: `0 0 0 4px ${iconColor}` }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-slate-200 bg-slate-700 h-full w-full flex items-center justify-center">
              ?
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? 'Laddar upp...' : avatarUrl ? 'Byt ikon' : 'Ladda upp PNG'}
          </button>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <p className="text-[11px] text-slate-500">PNG, max 1 MB. Kvadratisk bild fungerar bäst.</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-300 mb-2">Ringfärg</p>
        <div className="flex flex-wrap gap-2">
          {RING_COLORS.map((c) => {
            const selected = c.value.toLowerCase() === iconColor.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                aria-label={c.label}
                onClick={() => onChange({ icon_color: c.value })}
                className={`h-8 w-8 rounded-full transition-transform active:scale-90 ${
                  selected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: c.value }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

function InlineDateEdit({
  value,
  onSave,
  label,
}: {
  value: string | null;
  onSave: (val: string | null) => Promise<void>;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  async function commit() {
    const trimmed = draft.trim();
    if (trimmed === (value || '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(trimmed || null);
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
  }

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Ej satt';

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400 min-w-[100px]">{label}</span>
        <input
          ref={inputRef}
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-slate-50 outline-none focus:ring-2 focus:ring-emerald-500/20 [color-scheme:dark]"
        />
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
        <Calendar size={13} className="text-slate-500" />
        <span className={value ? '' : 'text-slate-500'}>{displayValue}</span>
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

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [allBadgeDefs, setAllBadgeDefs] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadgeWithBadge[]>([]);
  const [allBossDefs, setAllBossDefs] = useState<BossDefinition[]>([]);
  const [trophies, setTrophies] = useState<(BossTrophy & { boss: BossDefinition })[]>([]);
  const [voiceMuted, setVoiceMuted] = useState(false);

  useEffect(() => {
    setVoiceMuted(isBossVoiceMuted());
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAllBadges(),
      getUserBadges(user.id),
      getAllBossDefinitions(),
      getUserBossTrophies(user.id),
    ]).then(([badges, userBadges, bossDefs, userTrophies]) => {
      setAllBadgeDefs(badges);
      setEarnedBadges(userBadges);
      setAllBossDefs(bossDefs);
      setTrophies(userTrophies);
    });
  }, [user]);

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
  }

  async function saveDateField(field: string, value: string | null) {
    if (!user) return;
    await updateCurrentUser(user.id, { [field]: value });
  }

  async function saveRaceIcon(updates: { avatar_url?: string | null; icon_color?: string }) {
    if (!user) return;
    await updateCurrentUser(user.id, updates);
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
                        {trophy.bonus_ep > 0 && (
                          <span className="text-[9px] text-slate-400">
                            +{trophy.bonus_ep} EP
                          </span>
                        )}
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

        {/* Race dates card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            Tävlingsdatum
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Bike size={14} />
              <span className="text-xs font-medium">Vätternrundan</span>
            </div>
            <InlineDateEdit
              value={profile.race_date_vr}
              onSave={(v) => saveDateField('race_date_vr', v)}
              label="Datum"
            />

            <div className="border-t border-slate-700 pt-3 flex items-center gap-2 text-slate-400 mb-1">
              <Waves size={14} />
              <span className="text-xs font-medium">Vansbrosimningen</span>
            </div>
            <InlineDateEdit
              value={profile.race_date_vansbro}
              onSave={(v) => saveDateField('race_date_vansbro', v)}
              label="Datum"
            />

            <div className="border-t border-slate-700 pt-3 flex items-center gap-2 text-slate-400 mb-1">
              <PersonStanding size={14} />
              <span className="text-xs font-medium">Lidingöloppet</span>
            </div>
            <InlineDateEdit
              value={profile.race_date_lidingo}
              onSave={(v) => saveDateField('race_date_lidingo', v)}
              label="Datum"
            />

            <div className="border-t border-slate-700 pt-3 flex items-center gap-2 text-slate-400 mb-1">
              <Mountain size={14} />
              <span className="text-xs font-medium">Vasaloppet</span>
            </div>
            <InlineDateEdit
              value={profile.race_date_vasaloppet}
              onSave={(v) => saveDateField('race_date_vasaloppet', v)}
              label="Datum"
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

        {/* Race icon card */}
        {user && (
          <RaceIconCard
            userId={user.id}
            avatarUrl={profile.avatar_url}
            iconColor={profile.icon_color || '#f97316'}
            onChange={saveRaceIcon}
          />
        )}

        {/* Strava connection */}
        {user && <StravaConnect userId={user.id} />}

        {/* Settings card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            Installningar
          </h3>
          <div className="divide-y divide-slate-700">
            {/* Boss voice mute toggle */}
            <div className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                {voiceMuted ? (
                  <VolumeX size={18} className="text-slate-400" />
                ) : (
                  <Volume2 size={18} className="text-emerald-400" />
                )}
              </div>
              <span className="flex-1 text-sm text-slate-200">Bossroster</span>
              <button
                onClick={() => {
                  const next = !voiceMuted;
                  setVoiceMuted(next);
                  setBossVoiceMuted(next);
                }}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  voiceMuted ? 'bg-slate-700' : 'bg-emerald-500'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    voiceMuted ? '' : 'translate-x-5'
                  }`}
                />
              </button>
            </div>
            <PlaceholderRow icon={Bell} label="Notifikationer" />
            <PlaceholderRow icon={Palette} label="Tema" />
          </div>
        </div>

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
    </AppShell>
  );
}
