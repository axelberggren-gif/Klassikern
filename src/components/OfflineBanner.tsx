'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/lib/pwa';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-amber-900/60 border border-amber-700/50 px-4 py-3">
      <WifiOff size={18} className="shrink-0 text-amber-400" />
      <p className="text-sm text-amber-200">
        Du ar offline. Andringarna sparas lokalt och synkas nar du ar tillbaka online.
      </p>
    </div>
  );
}
