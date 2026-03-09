'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, RefreshCw, Unlink, ExternalLink, Zap } from 'lucide-react';
import { getStravaConnection, disconnectStrava } from '@/lib/store';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { StravaConnection } from '@/types/database';
import type { SportType } from '@/types/database';

interface StravaConnectProps {
  userId: string;
}

interface SyncResult {
  imported: number;
  total_ep_earned: number;
  by_sport: Record<string, number>;
  message: string;
  error?: string;
}

/** 15-minute auto-sync cooldown in milliseconds */
const AUTO_SYNC_COOLDOWN_MS = 15 * 60 * 1000;

/**
 * Format a relative time string in Swedish, e.g. "3 min sedan", "2 timmar sedan".
 */
function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just nu';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'timme' : 'timmar'} sedan`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'dag' : 'dagar'} sedan`;
}

export default function StravaConnect({ userId }: StravaConnectProps) {
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const autoSyncTriggered = useRef(false);

  const loadConnection = useCallback(async () => {
    setLoading(true);
    const conn = await getStravaConnection(userId);
    setConnection(conn);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const response = await fetch('/api/strava/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setSyncResult(data as SyncResult);
        // Reload connection to get updated last_synced_at
        const conn = await getStravaConnection(userId);
        setConnection(conn);
      } else {
        setSyncError(data.error || 'Synkning misslyckades');
      }
    } catch {
      setSyncError('Synkning misslyckades');
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  // Auto-sync on mount with 15-minute cooldown
  useEffect(() => {
    if (!connection || autoSyncTriggered.current || syncing) return;

    const lastSynced = connection.last_synced_at;
    const shouldSync =
      !lastSynced ||
      Date.now() - new Date(lastSynced).getTime() > AUTO_SYNC_COOLDOWN_MS;

    if (shouldSync) {
      autoSyncTriggered.current = true;
      handleSync();
    }
  }, [connection, syncing, handleSync]);

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
    const displayName =
      connection.athlete_name || `Atlet-ID: ${connection.strava_athlete_id}`;

    return (
      <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <StravaLogo />
            <h3 className="text-sm font-semibold text-gray-700">
              Strava kopplad
            </h3>
            <CheckCircle size={16} className="text-green-500" />
          </div>
        </div>

        {/* Athlete name + last synced */}
        <div className="mb-4">
          <p className="text-xs text-gray-500">{displayName}</p>
          {connection.last_synced_at && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              Senast synkad: {formatRelativeTime(connection.last_synced_at)}
            </p>
          )}
        </div>

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

        {/* Rich sync result */}
        {syncResult && (
          <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
            {syncResult.imported === 0 ? (
              <p className="text-xs text-center text-gray-500">
                {syncResult.message}
              </p>
            ) : (
              <>
                {/* Summary line */}
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Zap size={14} className="text-orange-500" />
                  <p className="text-xs font-semibold text-gray-700">
                    {syncResult.imported} pass importerade — {syncResult.total_ep_earned} EP
                  </p>
                </div>

                {/* Per-sport breakdown */}
                {Object.keys(syncResult.by_sport).length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {Object.entries(syncResult.by_sport).map(
                      ([sport, count]) => {
                        const config =
                          SPORT_CONFIG[sport as SportType] ??
                          SPORT_CONFIG.other;
                        return (
                          <span
                            key={sport}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.bgColor} ${config.textColor}`}
                          >
                            {config.icon} {count} {config.label}
                          </span>
                        );
                      }
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Sync error */}
        {syncError && (
          <p className="text-xs text-center text-red-500 mt-2">{syncError}</p>
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
