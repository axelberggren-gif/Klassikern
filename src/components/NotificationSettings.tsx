'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  isNotificationSupported,
  getPermissionState,
  requestNotificationPermission,
  NOTIFICATION_CATEGORIES,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/lib/notifications';
import { getNotificationPreferences, updateNotificationPreference } from '@/lib/store';
import type { NotificationType, NotificationPreferences } from '@/types/database';

export default function NotificationSettings({
  onBack,
}: {
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPermissionState(getPermissionState());
  }, []);

  useEffect(() => {
    if (!user) return;
    getNotificationPreferences(user.id).then((p) => {
      setPrefs(p);
      setLoading(false);
    });
  }, [user]);

  const handleToggle = useCallback(
    async (type: NotificationType) => {
      if (!user) return;
      const newValue = !prefs[type];
      setPrefs((prev) => ({ ...prev, [type]: newValue }));
      await updateNotificationPreference(user.id, type, newValue);
    },
    [user, prefs]
  );

  const handleToggleAll = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      const updated = { ...prefs };
      for (const key of Object.keys(updated) as NotificationType[]) {
        updated[key] = enabled;
      }
      setPrefs(updated);
      // Update each preference (could also use updateAll, but this keeps it simple)
      const { updateAllNotificationPreferences } = await import('@/lib/store');
      await updateAllNotificationPreferences(user.id, updated);
    },
    [user, prefs]
  );

  async function handleEnablePermission() {
    const result = await requestNotificationPermission();
    setPermissionState(result);
  }

  const allEnabled = Object.values(prefs).every(Boolean);
  const allDisabled = Object.values(prefs).every((v) => !v);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 active:text-slate-200">
          <ChevronLeft size={22} />
        </button>
        <h3 className="text-base font-semibold text-slate-50">Notifikationer</h3>
      </div>

      {/* Permission banner */}
      {permissionState === 'unsupported' && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <p className="text-xs text-amber-400">
            Din enhet stodjer inte notifikationer.
          </p>
        </div>
      )}
      {permissionState === 'denied' && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
          <p className="text-xs text-rose-400">
            Notifikationer ar blockerade. Aktivera dem i din webblasares installningar for denna sida.
          </p>
        </div>
      )}
      {permissionState === 'default' && (
        <button
          onClick={handleEnablePermission}
          className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 transition-colors active:bg-emerald-500/20"
        >
          <Bell size={18} className="text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">
            Klicka for att aktivera notifikationer
          </span>
        </button>
      )}

      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          {allDisabled ? (
            <BellOff size={18} className="text-slate-400" />
          ) : (
            <Bell size={18} className="text-emerald-400" />
          )}
          <span className="text-sm font-medium text-slate-200">
            {allEnabled ? 'Alla aktiva' : allDisabled ? 'Alla avstangda' : 'Anpassat'}
          </span>
        </div>
        <button
          onClick={() => handleToggleAll(!allEnabled)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            allEnabled ? 'bg-emerald-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              allEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Category toggles */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {NOTIFICATION_CATEGORIES.map((category) => (
            <div
              key={category.key}
              className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-slate-800/50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {category.label}
                </span>
              </div>
              <div className="divide-y divide-slate-800">
                {category.items.map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <button
                      onClick={() => handleToggle(item.type)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        prefs[item.type] ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          prefs[item.type] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
