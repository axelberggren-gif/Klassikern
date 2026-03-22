'use client';

import { useState } from 'react';
import { Swords, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { SPORT_CONFIG, ACTIVE_SPORT_TYPES } from '@/lib/sport-config';
import type { SportType } from '@/types/database';

interface ChallengeData {
  id: string;
  group_id: string;
  challenger_id: string;
  challenged_id: string;
  sport_type: string | null;
  metric: string;
  challenger_value: number;
  challenged_value: number;
  status: string;
  week_start: string;
  week_end: string;
  winner_id: string | null;
  created_at: string;
  challenger: { id: string; display_name: string };
  challenged: { id: string; display_name: string };
}

interface CallOutChallengeProps {
  challenges: ChallengeData[];
  members: { id: string; display_name: string }[];
  currentUserId: string;
  onCreateChallenge: (challengedId: string, metric: string, sportType: string | null) => void;
}

const METRIC_LABELS: Record<string, string> = {
  ep: 'EP',
  time: 'Minuter',
  sessions: 'Pass',
};

function getMetricLabel(metric: string): string {
  return METRIC_LABELS[metric] || metric;
}

function getSportLabel(sportType: string | null): string | null {
  if (!sportType) return null;
  const config = SPORT_CONFIG[sportType as SportType];
  return config ? `Bara ${config.label.toLowerCase()}` : null;
}

function getSportIcon(sportType: string | null): string | null {
  if (!sportType) return null;
  const config = SPORT_CONFIG[sportType as SportType];
  return config?.icon ?? null;
}

function ScoreBar({
  leftValue,
  rightValue,
}: {
  leftValue: number;
  rightValue: number;
}) {
  const total = leftValue + rightValue;
  const leftPct = total > 0 ? (leftValue / total) * 100 : 50;

  return (
    <div className="mt-3 h-2 w-full rounded-full bg-slate-700 overflow-hidden flex">
      <div
        className="h-full bg-blue-500 transition-all duration-500"
        style={{ width: `${leftPct}%` }}
      />
      <div
        className="h-full bg-rose-500 transition-all duration-500"
        style={{ width: `${100 - leftPct}%` }}
      />
    </div>
  );
}

function ActiveChallengeCard({ challenge }: { challenge: ChallengeData }) {
  const sportLabel = getSportLabel(challenge.sport_type);
  const sportIcon = getSportIcon(challenge.sport_type);

  return (
    <div className="relative rounded-2xl border border-slate-600 overflow-hidden animate-pulse">
      {/* Gradient background: blue left, rose right */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-rose-950/60 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Denna vecka
          </span>
          <div className="flex items-center gap-1.5">
            {sportLabel && (
              <span className="text-[11px] font-medium text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded-full">
                {sportIcon} {sportLabel}
              </span>
            )}
            <span className="text-[11px] font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
              {getMetricLabel(challenge.metric)}
            </span>
          </div>
        </div>

        {/* VS layout */}
        <div className="flex items-center justify-between mt-3">
          {/* Challenger */}
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-blue-300 truncate">
              {challenge.challenger.display_name}
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {challenge.challenger_value}
            </p>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center px-3">
            <Swords className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 mt-0.5">VS</span>
          </div>

          {/* Challenged */}
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-rose-300 truncate">
              {challenge.challenged.display_name}
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {challenge.challenged_value}
            </p>
          </div>
        </div>

        {/* Score bar */}
        <ScoreBar
          leftValue={challenge.challenger_value}
          rightValue={challenge.challenged_value}
        />
      </div>
    </div>
  );
}

function CompletedChallengeRow({ challenge }: { challenge: ChallengeData }) {
  const isChallenger = challenge.winner_id === challenge.challenger_id;
  const winner = isChallenger ? challenge.challenger : challenge.challenged;
  const loser = isChallenger ? challenge.challenged : challenge.challenger;
  const winnerScore = isChallenger
    ? challenge.challenger_value
    : challenge.challenged_value;
  const loserScore = isChallenger
    ? challenge.challenged_value
    : challenge.challenger_value;

  // Handle draws (no winner)
  if (!challenge.winner_id) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-800/50">
        <span className="text-sm text-slate-300">
          {challenge.challenger.display_name} vs {challenge.challenged.display_name}
        </span>
        <span className="text-xs text-slate-400">
          Oavgjort {challenge.challenger_value}–{challenge.challenged_value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-800/50">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm">🏆</span>
        <span className="text-sm font-medium text-amber-300 truncate">
          {winner.display_name}
        </span>
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
        {winnerScore}–{loserScore} mot {loser.display_name}
      </span>
    </div>
  );
}

function CreateChallengeForm({
  members,
  currentUserId,
  onSubmit,
  onCancel,
}: {
  members: { id: string; display_name: string }[];
  currentUserId: string;
  onSubmit: (challengedId: string, metric: string, sportType: string | null) => void;
  onCancel: () => void;
}) {
  const [challengedId, setChallengedId] = useState('');
  const [metric, setMetric] = useState('ep');
  const [sportType, setSportType] = useState<string | null>(null);

  const opponents = members.filter((m) => m.id !== currentUserId);

  const handleSubmit = () => {
    if (!challengedId) return;
    onSubmit(challengedId, metric, sportType);
  };

  return (
    <div className="rounded-2xl border border-slate-600 bg-slate-800/80 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Ny utmaning</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Opponent select */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1 block">
          Motståndare
        </label>
        <select
          value={challengedId}
          onChange={(e) => setChallengedId(e.target.value)}
          className="w-full rounded-xl bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          <option value="">Välj motståndare...</option>
          {opponents.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Metric select */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1 block">
          Tävla om
        </label>
        <div className="flex gap-2">
          {Object.entries(METRIC_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`flex-1 text-sm font-medium py-2 rounded-xl border transition-colors ${
                metric === key
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sport filter */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1 block">
          Sport (valfritt)
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSportType(null)}
            className={`text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors ${
              sportType === null
                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >
            Alla
          </button>
          {ACTIVE_SPORT_TYPES.map((st) => {
            const config = SPORT_CONFIG[st];
            return (
              <button
                key={st}
                onClick={() => setSportType(st)}
                className={`text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors ${
                  sportType === st
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}
              >
                {config.icon} {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!challengedId}
        className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Swords className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
        Utmana!
      </button>
    </div>
  );
}

export default function CallOutChallenge({
  challenges,
  members,
  currentUserId,
  onCreateChallenge,
}: CallOutChallengeProps) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const activeChallenges = challenges.filter((c) => c.status === 'active');
  const completedChallenges = challenges.filter((c) => c.status === 'completed');

  const handleCreate = (challengedId: string, metric: string, sportType: string | null) => {
    onCreateChallenge(challengedId, metric, sportType);
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      {/* Header + create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Utmaningar</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors bg-amber-400/10 px-3 py-1.5 rounded-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Ny
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <CreateChallengeForm
          members={members}
          currentUserId={currentUserId}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Active challenges */}
      {activeChallenges.length > 0 ? (
        <div className="space-y-3">
          {activeChallenges.map((c) => (
            <ActiveChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 p-6 text-center">
            <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Inga aktiva utmaningar</p>
            <p className="text-xs text-slate-500 mt-1">
              Utmana en gruppmedlem till en 1v1-duell!
            </p>
          </div>
        )
      )}

      {/* Completed challenges */}
      {completedChallenges.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
          >
            {showHistory ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Avslutade ({completedChallenges.length})
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {completedChallenges.map((c) => (
                <CompletedChallengeRow key={c.id} challenge={c} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
