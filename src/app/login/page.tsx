'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Mountain, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

type ViewState = 'form' | 'sending' | 'success' | 'error';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [viewState, setViewState] = useState<ViewState>('form');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setViewState('sending');
    setErrorMessage('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setViewState('error');
        return;
      }

      setViewState('success');
    } catch {
      setErrorMessage('Något gick fel. Försök igen.');
      setViewState('error');
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

        {/* Form state */}
        {viewState === 'form' && (
          <form onSubmit={handleSubmit} className="animate-slide-up">
            <div className="mb-6">
              <label htmlFor="email" className="block text-white text-sm font-medium mb-2 opacity-90">
                Din e-postadress
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

            <button
              type="submit"
              disabled={!email.trim()}
              className="w-full bg-white text-orange-600 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
            >
              Skicka magisk länk
              <Mail className="w-5 h-5" />
            </button>

            <p className="text-center text-white/60 text-xs mt-4 leading-relaxed">
              Vi skickar en inloggningslänk till din e-post.
              <br />
              Inget lösenord behövs!
            </p>
          </form>
        )}

        {/* Sending state */}
        {viewState === 'sending' && (
          <div className="text-center text-white animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-2">Skickar...</h2>
            <p className="text-sm opacity-70">
              Vi skickar en magisk länk till {email}
            </p>
          </div>
        )}

        {/* Success state */}
        {viewState === 'success' && (
          <div className="text-center text-white animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-green-500/30 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <CheckCircle className="w-8 h-8 text-green-300" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Kolla din mail!</h2>
            <p className="text-sm opacity-80 leading-relaxed max-w-xs mx-auto mb-2">
              Vi har skickat en inloggningslänk till:
            </p>
            <p className="font-semibold text-lg mb-6">{email}</p>
            <p className="text-xs opacity-60 leading-relaxed max-w-xs mx-auto">
              Klicka på länken i mailet för att logga in. Kolla skräpposten om du inte hittar mailet.
            </p>
            <button
              onClick={() => {
                setViewState('form');
                setEmail('');
              }}
              className="mt-8 flex items-center gap-2 text-white/70 text-sm mx-auto hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tillbaka
            </button>
          </div>
        )}

        {/* Error state */}
        {viewState === 'error' && (
          <div className="text-center text-white animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-red-500/30 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <AlertCircle className="w-8 h-8 text-red-300" />
            </div>
            <h2 className="text-xl font-bold mb-3">Något gick fel</h2>
            <p className="text-sm opacity-80 mb-6 max-w-xs mx-auto">
              {errorMessage || 'Kunde inte skicka inloggningslänken. Försök igen.'}
            </p>
            <button
              onClick={() => setViewState('form')}
              className="bg-white text-orange-600 font-bold px-8 py-3 rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Försök igen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
