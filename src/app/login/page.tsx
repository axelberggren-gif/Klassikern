'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Mountain, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError('Fel e-postadress eller lösenord.');
        setLoading(false);
        return;
      }

      router.push('/');
    } catch {
      setError('Något gick fel. Försök igen.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 via-orange-600 to-amber-600 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6">
        {/* Logo */}
        <div className="text-center text-white mb-10 animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Mountain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Klassikern</h1>
          <p className="text-sm opacity-80 mt-1">Expeditionen</p>
        </div>

        <form onSubmit={handleSubmit} className="animate-slide-up">
          <div className="mb-4">
            <label htmlFor="email" className="block text-white text-sm font-medium mb-2 opacity-90">
              E-postadress
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="namn@exempel.se"
                autoFocus
                required
                className="w-full bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl pl-12 pr-5 py-4 text-white text-lg placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all"
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-white text-sm font-medium mb-2 opacity-90">
              Lösenord
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl pl-12 pr-5 py-4 text-white text-lg placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-300/30 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
              <p className="text-sm text-white/90">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !password || loading}
            className="w-full bg-white text-orange-600 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>
      </div>
    </div>
  );
}
