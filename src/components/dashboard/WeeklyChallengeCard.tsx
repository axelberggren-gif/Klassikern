'use client';

import { Target, Crown, Clock } from 'lucide-react';
import { getChallengeUnit } from '@/lib/store';
import type { WeeklyChallenge, ChallengeParticipantProgress } from '@/types/database';

interface WeeklyChallengeCardProps {
  challenge: WeeklyChallenge;
  progress: ChallengeParticipantProgress[];
  currentUserId: string;
}

export default function WeeklyChallengeCard({
  challenge,
  progress,
  currentUserId,
}: WeeklyChallengeCardProps) {
  const unit = getChallengeUnit(challenge.challenge_type);
  const maxValue = Math.max(challenge.target_value, ...progress.map((p) => p.value));
  const leader = progress[0];
  const endsAt = new Date(challenge.ends_at);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.round((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const daysLeft = Math.floor(hoursLeft / 24);

  const timeLabel = daysLeft > 0
    ? `${daysLeft}d ${hoursLeft % 24}h kvar`
    : `${hoursLeft}h kvar`;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">Veckoutmaning</h3>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock size={11} />
          {timeLabel}
        </div>
      </div>

      {/* Title & description */}
      <p className="text-base font-bold text-slate-50 mb-1">{challenge.title}</p>
      <p className="text-xs text-slate-400 mb-4">{challenge.description}</p>

      {/* Target */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Mål: {challenge.target_value} {unit}
        </span>
      </div>

      {/* Progress bars */}
      <div className="flex flex-col gap-2.5">
        {progress.map((p, i) => {
          const pct = maxValue > 0 ? Math.min(100, (p.value / challenge.target_value) * 100) : 0;
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
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    completed
                      ? 'bg-emerald-500'
                      : isCurrentUser
                        ? 'bg-emerald-500/70'
                        : 'bg-slate-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
