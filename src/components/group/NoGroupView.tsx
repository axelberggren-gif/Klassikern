'use client';

import { useState } from 'react';
import { UserPlus, Plus, Loader2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { joinGroupByCode, createGroup } from '@/lib/store';

interface NoGroupViewProps {
  userId: string;
  onGroupJoined: () => void;
}

export default function NoGroupView({ userId, onGroupJoined }: NoGroupViewProps) {
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
            onClick={() => { setMode('join'); setError(null); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mode === 'join' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <UserPlus size={14} className="inline mr-1.5 -mt-0.5" />
            Gå med
          </button>
          <button
            onClick={() => { setMode('create'); setError(null); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mode === 'create' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
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
                <h3 className="text-sm font-semibold text-gray-900">Gå med i en grupp</h3>
                <p className="text-xs text-gray-500">Ange inbjudningskoden från din vän</p>
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

            {error && <p className="mt-3 text-xs text-red-500 text-center">{error}</p>}

            <button
              onClick={handleJoin}
              disabled={!inviteCode.trim() || loading}
              className="mt-4 w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
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
                <h3 className="text-sm font-semibold text-gray-900">Skapa en ny grupp</h3>
                <p className="text-xs text-gray-500">Bjud sedan in dina vänner med en kod</p>
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

            {error && <p className="mt-3 text-xs text-red-500 text-center">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={!groupName.trim() || loading}
              className="mt-4 w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {loading ? 'Skapar...' : 'Skapa grupp'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
