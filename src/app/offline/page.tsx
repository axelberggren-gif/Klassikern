'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 mb-6">
        <WifiOff size={36} className="text-slate-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-50 mb-2">Ingen anslutning</h1>
      <p className="text-slate-400 mb-8 max-w-xs">
        Det verkar som att du ar offline. Kontrollera din internetanslutning och forsok igen.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-transform active:scale-95"
      >
        <RefreshCw size={18} />
        Forsok igen
      </button>
    </div>
  );
}
