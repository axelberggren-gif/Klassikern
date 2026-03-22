'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useOnlineStatus } from '@/lib/pwa';
import { getPendingSessionCount } from '@/lib/pwa';
import { syncPendingSessions } from '@/lib/sync';

/**
 * Invisible component that syncs pending offline sessions when the app comes online.
 * Mounts once inside AppShell.
 */
export default function SyncManager() {
  const isOnline = useOnlineStatus();
  const syncingRef = useRef(false);

  const doSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const count = await getPendingSessionCount();
      if (count === 0) return;
      const synced = await syncPendingSessions();
      if (synced > 0) {
        console.log(`[SyncManager] Synced ${synced} offline session(s)`);
      }
    } catch (err) {
      console.error('[SyncManager] Sync error:', err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      doSync();
    }
  }, [isOnline, doSync]);

  // Also sync on mount (page load while online)
  useEffect(() => {
    if (navigator.onLine) {
      doSync();
    }
  }, [doSync]);

  return null;
}
