'use client';

import { useState } from 'react';
import {
  Copy, Check, UserPlus, Crown, Shield,
  Users, RefreshCw, LogOut, Loader2,
} from 'lucide-react';
import { leaveGroup, regenerateInviteCode } from '@/lib/store';
import type { GroupDetails } from '@/types/database';

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
          <Crown size={10} /> Ägare
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
          <Shield size={10} /> Admin
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

interface GroupSettingsTabProps {
  groupDetails: GroupDetails;
  currentUserId: string;
  onLeaveGroup: () => void;
  onRegenerateCode: (newCode: string) => void;
}

export default function GroupSettingsTab({
  groupDetails,
  currentUserId,
  onLeaveGroup,
  onRegenerateCode,
}: GroupSettingsTabProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const isOwner = groupDetails.created_by === currentUserId;
  const currentMember = groupDetails.members.find((m) => m.user_id === currentUserId);
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
    if (newCode) onRegenerateCode(newCode);
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

  const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2 };
  const sortedMembers = [...groupDetails.members].sort(
    (a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3)
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Invite code card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Inbjudningskod</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Dela denna kod med vänner så att de kan gå med i gruppen
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
              copied ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500 text-white'
            }`}
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>

        {copied && (
          <p className="mt-2 text-xs text-emerald-400 text-center font-medium">Kopierad!</p>
        )}

        {(isOwner || isOwnerRole) && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            {!showRegenerateConfirm ? (
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                <RefreshCw size={12} /> Generera ny kod
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-amber-400">
                  Den gamla koden slutar fungera. Är du säker?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
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
              day: 'numeric', month: 'short', year: 'numeric',
            });

            return (
              <div
                key={member.user_id}
                className={`flex items-center gap-3 px-5 py-3 ${isCurrentUser ? 'bg-emerald-500/10' : ''}`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                    isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  {member.profile?.avatar_url || member.profile?.display_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {member.profile?.display_name || 'Okänd'}
                      {isCurrentUser && ' (du)'}
                    </p>
                    {getRoleBadge(member.role)}
                  </div>
                  <p className="text-[11px] text-slate-400">Gick med {joinDateStr}</p>
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
              <LogOut size={16} /> Lämna gruppen
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-rose-400">Är du säker på att du vill lämna gruppen?</p>
              {leaveError && <p className="text-xs text-rose-500">{leaveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  {leaving ? 'Lämnar...' : 'Ja, lämna'}
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
