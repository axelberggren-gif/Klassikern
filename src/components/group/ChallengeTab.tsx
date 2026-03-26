'use client';

import { useState } from 'react';
import {
  Target, Crown, Clock, Plus, Check,
  Trophy, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import {
  createChallenge,
  resolveChallenge,
  getChallengeUnit,
} from '@/lib/store';
import { CHALLENGE_TEMPLATES } from '@/lib/challenge-templates';
import { getCurrentWeekNumber } from '@/lib/date-utils';
import type {
  WeeklyChallenge,
  ChallengeParticipantProgress,
  Profile,
} from '@/types/database';

interface ChallengeTabProps {
  groupId: string;
  challenge: WeeklyChallenge | null;
  progress: ChallengeParticipantProgress[];
  history: WeeklyChallenge[];
  members: Profile[];
  currentUserId: string;
  isAdmin: boolean;
  onChallengeCreated: () => void;
}

export default function ChallengeTab({
  groupId,
  challenge,
  progress,
  history,
  members,
  currentUserId,
  isAdmin,
  onChallengeCreated,
}: ChallengeTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Custom challenge form state
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customType, setCustomType] = useState('total_sessions');
  const [customTarget, setCustomTarget] = useState('10');

  const handleCreateFromTemplate = async (template: typeof CHALLENGE_TEMPLATES[number]) => {
    setCreating(true);
    const weekNumber = getCurrentWeekNumber();
    await createChallenge({
      groupId,
      weekNumber,
      title: template.title,
      description: template.description,
      challengeType: template.challengeType,
      targetValue: template.targetValue,
    });
    setShowCreate(false);
    setCreating(false);
    onChallengeCreated();
  };

  const handleCreateCustom = async () => {
    if (!customTitle.trim() || !customTarget) return;
    setCreating(true);
    const weekNumber = getCurrentWeekNumber();
    await createChallenge({
      groupId,
      weekNumber,
      title: customTitle.trim(),
      description: customDesc.trim() || customTitle.trim(),
      challengeType: customType,
      targetValue: Number(customTarget),
    });
    setShowCreate(false);
    setCreating(false);
    setCustomTitle('');
    setCustomDesc('');
    setCustomTarget('10');
    onChallengeCreated();
  };

  const handleResolve = async () => {
    if (!challenge) return;
    setResolving(true);
    const winner = progress[0]?.value > 0 ? progress[0] : null;
    await resolveChallenge(
      challenge.id,
      groupId,
      winner?.userId ?? null,
      winner?.displayName ?? null
    );
    setResolving(false);
    onChallengeCreated();
  };

  const unit = challenge ? getChallengeUnit(challenge.challenge_type) : '';

  // Check if challenge has expired
  const isExpired = challenge && new Date(challenge.ends_at) < new Date();

  return (
    <div className="flex flex-col gap-4">
      {/* Active challenge */}
      {challenge && !isExpired && (
        <ActiveChallengeView
          challenge={challenge}
          progress={progress}
          currentUserId={currentUserId}
          unit={unit}
        />
      )}

      {/* Expired but not resolved */}
      {challenge && isExpired && (
        <div className="rounded-2xl bg-slate-900 border border-amber-500/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400">Utmaning avslutad!</h3>
          </div>
          <p className="text-base font-bold text-slate-50 mb-2">{challenge.title}</p>

          {progress[0]?.value > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Crown size={14} className="text-amber-400" />
              <span className="text-sm text-slate-200">
                Vinnare: <span className="font-bold text-amber-400">{progress[0].displayName}</span>
                {' — '}{progress[0].value} {unit}
              </span>
            </div>
          )}

          {/* Final standings */}
          <div className="flex flex-col gap-2 mb-4">
            {progress.map((p, i) => (
              <div key={p.userId} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  {i + 1}. {p.displayName}
                  {p.userId === currentUserId && ' (du)'}
                </span>
                <span className="text-slate-400 font-semibold">{p.value} {unit}</span>
              </div>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resolving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {resolving ? 'Avslutar...' : 'Bekräfta resultat & avsluta'}
            </button>
          )}
        </div>
      )}

      {/* No active challenge */}
      {!challenge && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 text-center">
          <Target size={28} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">Ingen aktiv utmaning</p>
          {isAdmin && (
            <p className="text-xs text-slate-500">Skapa en utmaning nedan!</p>
          )}
        </div>
      )}

      {/* Create challenge (admin only) */}
      {isAdmin && !challenge && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 text-sm font-semibold text-emerald-400"
          >
            <Plus size={16} />
            Skapa veckoutmaning
          </button>

          {showCreate && (
            <div className="mt-4 flex flex-col gap-4">
              {/* Templates */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Färdiga mallar
                </p>
                <div className="flex flex-col gap-2">
                  {CHALLENGE_TEMPLATES.map((t) => (
                    <button
                      key={t.title}
                      onClick={() => handleCreateFromTemplate(t)}
                      disabled={creating}
                      className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-left transition-all active:scale-[0.98] hover:border-emerald-500/40 disabled:opacity-50"
                    >
                      <p className="text-sm font-medium text-slate-200">{t.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Egen utmaning
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Titel"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Beskrivning (valfritt)"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="total_sessions">Antal pass</option>
                      <option value="total_duration">Minuter</option>
                      <option value="total_distance">Kilometer</option>
                      <option value="total_ep">EP</option>
                      <option value="sport_sessions">Sportspecifikt</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Mål"
                      value={customTarget}
                      onChange={(e) => setCustomTarget(e.target.value)}
                      className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={handleCreateCustom}
                    disabled={creating || !customTitle.trim()}
                    className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {creating ? 'Skapar...' : 'Skapa utmaning'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-700"
          >
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-200">
                Tidigare utmaningar ({history.length})
              </span>
            </div>
            {showHistory ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </button>

          {showHistory && (
            <div className="divide-y divide-slate-800">
              {history.map((h) => (
                <div key={h.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-slate-200">{h.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Vecka {h.week_number} &middot; Mål: {h.target_value} {getChallengeUnit(h.challenge_type)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActiveChallengeView({
  challenge,
  progress,
  currentUserId,
  unit,
}: {
  challenge: WeeklyChallenge;
  progress: ChallengeParticipantProgress[];
  currentUserId: string;
  unit: string;
}) {
  const endsAt = new Date(challenge.ends_at);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.round((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const daysLeft = Math.floor(hoursLeft / 24);
  const timeLabel = daysLeft > 0
    ? `${daysLeft}d ${hoursLeft % 24}h kvar`
    : `${hoursLeft}h kvar`;

  return (
    <div className="rounded-2xl bg-slate-900 border border-emerald-500/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">Aktiv utmaning</h3>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock size={11} />
          {timeLabel}
        </div>
      </div>

      <p className="text-lg font-bold text-slate-50 mb-1">{challenge.title}</p>
      <p className="text-xs text-slate-400 mb-4">{challenge.description}</p>

      <div className="mb-3">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Mål: {challenge.target_value} {unit}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {progress.map((p, i) => {
          const pct = Math.min(100, (p.value / challenge.target_value) * 100);
          const isCurrentUser = p.userId === currentUserId;
          const isLeader = i === 0 && p.value > 0;
          const completed = p.value >= challenge.target_value;

          return (
            <div key={p.userId}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {isLeader && <Crown size={12} className="text-amber-400" />}
                  <span
                    className={`text-xs font-medium ${
                      isCurrentUser ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    {p.displayName}
                    {isCurrentUser && ' (du)'}
                  </span>
                </div>
                <span className={`text-xs font-semibold ${completed ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {p.value} / {challenge.target_value} {unit}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    completed
                      ? 'bg-emerald-500'
                      : isCurrentUser
                        ? 'bg-emerald-500/70'
                        : 'bg-slate-500'
                  }`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
