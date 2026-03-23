'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Mountain, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Lösenorden matchar inte.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError('Kunde inte uppdatera lösenordet. Försök igen.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch {
      setError('Något gick fel. Försök igen.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 flex flex-col">
      <div className="flex-1 flex flex-col px-6">
        {/* Logo */}
        <div className="text-center text-white pt-16 pb-6 animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <Mountain className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-50">Klassikern</h1>
          <p className="text-xs text-slate-400 mt-0.5">Expeditionen</p>
        </div>

        {success ? (
          <div className="animate-slide-up text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-slate-50 text-xl font-bold mb-2">
              Lösenord uppdaterat!
            </h2>
            <p className="text-slate-400 text-sm">
              Du skickas vidare om en stund...
            </p>
          </div>
        ) : (
          <div className="animate-slide-up">
            <h2 className="text-slate-200 text-lg font-semibold text-center mb-2">
              Välj nytt lösenord
            </h2>
            <p className="text-slate-400 text-sm text-center mb-8">
              Ange ditt nya lösenord nedan.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="relative mb-4">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nytt lösenord"
                  autoFocus
                  required
                  minLength={6}
                  className="w-full bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl pl-12 pr-5 py-4 text-slate-50 text-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-slate-800 transition-all"
                />
              </div>

              <div className="relative mb-6">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Bekräfta lösenord"
                  required
                  minLength={6}
                  className="w-full bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl pl-12 pr-5 py-4 text-slate-50 text-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-slate-800 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 rounded-xl px-4 py-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <p className="text-sm text-slate-200">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!password || !confirmPassword || loading}
                className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
              >
                {loading ? 'Sparar...' : 'Spara nytt lösenord'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
