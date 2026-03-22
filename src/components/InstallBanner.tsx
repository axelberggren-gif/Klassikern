'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/lib/pwa';

const DISMISS_KEY = 'klassikern-install-dismissed';
const DISMISS_DAYS = 7;

export default function InstallBanner() {
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true); // Start hidden, show after check

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }
    setDismissed(false);
  }, []);

  if (isInstalled || !canInstall || dismissed) return null;

  async function handleInstall() {
    await install();
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-900/80 to-emerald-800/80 border border-emerald-700/50 p-4 shadow-lg animate-in slide-in-from-top-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
        <Download size={20} className="text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-50">Installera Klassikern</p>
        <p className="text-xs text-slate-300">Lagg till pa hemskarmen for snabb atkomst</p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95"
      >
        Installera
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-slate-400 hover:text-slate-200"
      >
        <X size={18} />
      </button>
    </div>
  );
}
