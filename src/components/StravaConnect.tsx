'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, RefreshCw, Unlink, ExternalLink } from 'lucide-react';
import { getStravaConnection, disconnectStrava } from '@/lib/store';
import type { StravaConnection } from '@/types/database';

interface StravaConnectProps {
  userId: string;
}

export default function StravaConnect({ userId }: StravaConnectProps) {
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
      } else {
        setSyncResult(data.error || 'Synkning misslyckades');
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
      <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-100" />
          <div className="h-4 w-32 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Connected state
  // -----------------------------------------------------------------------
  if (connection) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StravaLogo />
            <h3 className="text-sm font-semibold text-gray-700">
              Strava kopplad
            </h3>
            <CheckCircle size={16} className="text-green-500" />
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Atlet-ID: {connection.strava_athlete_id}
        </p>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: syncing ? '#e5e7eb' : '#FC4C02',
            color: syncing ? '#9ca3af' : '#ffffff',
          }}
        >
          <RefreshCw
            size={16}
            className={syncing ? 'animate-spin' : ''}
          />
          {syncing ? 'Synkar...' : 'Synka nu'}
        </button>

        {/* Sync result */}
        {syncResult && (
          <p className="text-xs text-center text-gray-500 mt-2">
            {syncResult}
          </p>
        )}

        {/* Disconnect link */}
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="flex w-full items-center justify-center gap-1.5 mt-3 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <Unlink size={12} />
          {disconnecting ? 'Kopplar fran...' : 'Koppla fran'}
        </button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Not connected state
  // -----------------------------------------------------------------------
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <StravaLogo />
        <h3 className="text-sm font-semibold text-gray-700">
          Koppla Strava
        </h3>
      </div>

      <p className="text-xs text-gray-400 mb-4">
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

// ---------------------------------------------------------------------------
// Strava logo (simple SVG inline)
// ---------------------------------------------------------------------------

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
