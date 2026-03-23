'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, RefreshCw, Unlink, ExternalLink, AlertTriangle } from 'lucide-react';
import { getStravaConnection, disconnectStrava, getNotificationPreferences } from '@/lib/store';
import { checkAndAwardBadges } from '@/lib/badge-checker';
import { notify } from '@/lib/notifications';
import type { StravaConnection } from '@/types/database';

interface StravaConnectProps {
  userId: string;
  onBadgesEarned?: (badgeNames: string[]) => void;
}

export default function StravaConnect({ userId, onBadgesEarned }: StravaConnectProps) {
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const loadConnection = useCallback(async () => {
    setLoading(true);
    const conn = await getStravaConnection(userId);
    setConnection(conn);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/strava/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setSyncResult(data.message || `${data.imported} importerade`);
        // Check for newly earned badges after syncing activities
        const newBadges = await checkAndAwardBadges(userId);
        if (newBadges.length > 0) {
          onBadgesEarned?.(newBadges);
        }
        // Refresh connection to pick up any scope changes
        if (data.scope_limited) {
          loadConnection();
        }
        // Strava sync notification
        const prefs = await getNotificationPreferences(userId);
        if (data.imported > 0) {
          notify(
            'strava_sync_complete',
            prefs,
            'Strava synkad!',
            `${data.imported} aktivitet${data.imported !== 1 ? 'er' : ''} importerade — ${data.total_ep_earned} EP`,
            'strava-sync',
            { url: '/profile', userId }
          );
        }
      } else {
        setSyncResult(data.error || 'Synkning misslyckades');
        // Strava sync failure notification
        const prefs = await getNotificationPreferences(userId);
        notify(
          'strava_sync_failed',
          prefs,
          'Strava-synk misslyckades',
          data.error || 'Forsok igen senare',
          'strava-sync-fail',
          { url: '/profile', userId }
        );
      }
    } catch {
      setSyncResult('Synkning misslyckades');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const success = await disconnectStrava(userId);
    if (success) {
      setConnection(null);
    }
    setDisconnecting(false);
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-800" />
          <div className="h-4 w-32 rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  const scopeLimited = connection
    ? !connection.scope?.includes('activity:read_all')
    : false;

  if (connection) {
    const athleteLabel = connection.athlete_name || `Atlet ${connection.strava_athlete_id}`;

    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StravaLogo />
            <h3 className="text-sm font-semibold text-slate-200">
              Strava kopplad
            </h3>
            {scopeLimited ? (
              <AlertTriangle size={16} className="text-amber-400" />
            ) : (
              <CheckCircle size={16} className="text-emerald-400" />
            )}
          </div>
        </div>

        {scopeLimited && (
          <div className="rounded-xl bg-amber-900/30 border border-amber-700/50 px-3 py-2 mb-3">
            <p className="text-xs text-amber-300">
              Privata pass synkas inte. Koppla om Strava och bocka i
              &quot;View data about your private activities&quot; för att importera alla pass.
            </p>
            <a
              href="/api/strava/authorize"
              className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-amber-200 hover:text-amber-100"
            >
              <RefreshCw size={12} />
              Koppla om
            </a>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-4">
          {athleteLabel}
        </p>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: syncing ? '#1a2236' : '#FC4C02',
            color: syncing ? '#8b95a8' : '#ffffff',
          }}
        >
          <RefreshCw
            size={16}
            className={syncing ? 'animate-spin' : ''}
          />
          {syncing ? 'Synkar...' : 'Synka nu'}
        </button>

        {syncResult && (
          <p className="text-xs text-center text-slate-400 mt-2">
            {syncResult}
          </p>
        )}

        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="flex w-full items-center justify-center gap-1.5 mt-3 py-2 text-xs text-slate-400 hover:text-rose-400 transition-colors"
        >
          <Unlink size={12} />
          {disconnecting ? 'Kopplar fran...' : 'Koppla fran'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-2">
        <StravaLogo />
        <h3 className="text-sm font-semibold text-slate-200">
          Koppla Strava
        </h3>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Importera dina traningspass automatiskt fran Strava
      </p>

      <a
        href="/api/strava/authorize"
        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#FC4C02' }}
      >
        <ExternalLink size={16} />
        Koppla Strava
      </a>
    </div>
  );
}

function StravaLogo() {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg"
      style={{ backgroundColor: '#FC4C02' }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l3.65 7.215 3.648-7.215H14.61L10.463 0 6.322 8.229h2.95"
          fill="white"
        />
      </svg>
    </div>
  );
}
