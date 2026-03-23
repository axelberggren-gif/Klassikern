'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { isNotificationSupported, getPermissionState, requestNotificationPermission } from '@/lib/notifications';

const DISMISSED_KEY = 'klassikern-notif-prompt-dismissed';

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;
    if (getPermissionState() !== 'default') return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Show prompt after a short delay so it doesn't flash on page load
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  async function handleEnable() {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      setVisible(false);
    } else {
      // Permission denied or dismissed — hide prompt
      sessionStorage.setItem(DISMISSED_KEY, '1');
      setVisible(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg animate-slide-up rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <Bell size={20} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-50">
              Aktivera notifikationer?
            </h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Fa besked nar lagkamrater tranar, bossar besegras, badges lases upp och mer.
              Du kan stanga av enskilda notiser i profilen.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleEnable}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors active:bg-emerald-600"
              >
                Aktivera
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-400 transition-colors active:bg-slate-700"
              >
                Inte nu
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-slate-500 active:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
