'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { getLoginProfiles, type LoginProfile } from '@/lib/store';
import { Mountain, Lock, AlertCircle, ChevronLeft, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [profiles, setProfiles] = useState<LoginProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<LoginProfile | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLoginProfiles().then((data) => {
      setProfiles(data);
      setLoadingProfiles(false);
    });
  }, []);

  const handleSelectUser = (profile: LoginProfile) => {
    setSelectedUser(profile);
    setPassword('');
    setError('');
  };

  const handleBack = () => {
    setSelectedUser(null);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.email || !password) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error, data } = await supabase.auth.signInWithPassword({
        email: selectedUser.email,
        password,
      });

      if (error) {
        setError('Fel lösenord. Försök igen.');
        setLoading(false);
        return;
      }

      console.log('[login] signIn success, session:', !!data.session);
      console.log('[login] cookies before navigation:', document.cookie.substring(0, 200));

      // Hard navigation ensures the middleware sees the fresh auth cookies
      window.location.href = '/';
    } catch {
      setError('Något gick fel. Försök igen.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 via-orange-600 to-amber-600 flex flex-col">
      <div className="flex-1 flex flex-col px-6">
        {/* Logo */}
        <div className="text-center text-white pt-16 pb-6 animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <Mountain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Klassikern</h1>
          <p className="text-xs opacity-80 mt-0.5">Expeditionen</p>
        </div>

        {!selectedUser ? (
          /* ── User Picker ── */
          <div className="animate-slide-up">
            <h2 className="text-white text-lg font-semibold text-center mb-4">
              Välj ditt konto
            </h2>

            {loadingProfiles ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-white/70 text-center text-sm py-8">
                Inga konton hittades.
              </p>
            ) : (
              <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pb-6">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectUser(p)}
                    className="flex items-center gap-4 bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl px-5 py-4 active:scale-95 transition-all hover:bg-white/20 text-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl shrink-0">
                      {p.avatar_url || p.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-lg font-semibold">
                      {p.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Password Entry ── */
          <div className="animate-slide-up">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-white/80 text-sm mb-6 active:opacity-60 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
              Byt konto
            </button>

            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 text-4xl">
                {selectedUser.avatar_url ||
                  selectedUser.display_name.charAt(0).toUpperCase()}
              </div>
              <p className="text-white text-xl font-bold">
                {selectedUser.display_name}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="relative mb-6">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Lösenord"
                  autoFocus
                  required
                  className="w-full bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl pl-12 pr-5 py-4 text-white text-lg placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-300/30 rounded-xl px-4 py-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
                  <p className="text-sm text-white/90">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!password || loading}
                className="w-full bg-white text-orange-600 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
              >
                {loading ? 'Loggar in...' : 'Logga in'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
