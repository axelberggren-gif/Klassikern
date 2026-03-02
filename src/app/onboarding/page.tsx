'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Mountain, ChevronRight, Users, Sparkles, MapPin, Trophy, Loader2 } from 'lucide-react';

const AVATARS = [
  { emoji: '🏃', label: 'Löpare' },
  { emoji: '🚴', label: 'Cyklist' },
  { emoji: '🏊', label: 'Simmare' },
  { emoji: '💪', label: 'Allrounder' },
  { emoji: '🔥', label: 'Fighter' },
  { emoji: '⭐', label: 'Stjärna' },
  { emoji: '🐻', label: 'Björn' },
  { emoji: '🦌', label: 'Älg' },
  { emoji: '🐺', label: 'Varg' },
  { emoji: '🦅', label: 'Örn' },
  { emoji: '🎿', label: 'Skidåkare' },
  { emoji: '🏔️', label: 'Bergsklättrare' },
];

type Step = 'welcome' | 'name' | 'group' | 'avatar' | 'intro';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [introStep, setIntroStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Check if user is authenticated via Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthUserId(user.id);
      }
    });
  }, []);

  const handleComplete = async () => {
    setSaving(true);

    // Save to Supabase database
    if (authUserId) {
      try {
        const supabase = createClient();

        // Upsert the user's profile (handles both new and existing rows)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authUserId,
            display_name: displayName.trim(),
            avatar_url: selectedAvatar,
          });

        if (profileError) {
          console.error('Error saving profile:', profileError);
          setSaving(false);
          return;
        }

        const trimmedCode = inviteCode.trim();

        if (trimmedCode) {
          // Invite code provided — try to find the group and join it
          const { data: group } = await supabase
            .from('groups')
            .select('id')
            .eq('invite_code', trimmedCode)
            .single();

          if (group) {
            // Join the existing group as a member
            await supabase.from('group_members').insert({
              group_id: group.id,
              user_id: authUserId,
              role: 'member',
            });
          } else {
            // Invite code not found — create a new group for the user
            await createNewGroup(supabase, authUserId, displayName.trim());
          }
        } else {
          // No invite code — create a new group for the user
          await createNewGroup(supabase, authUserId, displayName.trim());
        }
      } catch (error) {
        console.error('Error saving onboarding data to Supabase:', error);
      }
    }

    setSaving(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 via-orange-600 to-amber-600 flex flex-col">
      {/* Progress dots */}
      {step !== 'welcome' && (
        <div className="flex justify-center gap-2 pt-14 px-6">
          {(['name', 'group', 'avatar', 'intro'] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-white'
                  : ['name', 'group', 'avatar', 'intro'].indexOf(s) <
                    ['name', 'group', 'avatar', 'intro'].indexOf(step)
                  ? 'w-4 bg-white/60'
                  : 'w-4 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center px-6">
        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="text-center text-white animate-slide-up">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <Mountain className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Klassikern</h1>
            <p className="text-lg opacity-90 mb-2">Expeditionen</p>
            <p className="text-sm opacity-70 max-w-xs mx-auto leading-relaxed">
              Träna för En Svensk Klassiker tillsammans med dina vänner. Samla EP, följ expeditionen och nå målet.
            </p>
            <button
              onClick={() => setStep('name')}
              className="mt-10 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-transform flex items-center gap-2 mx-auto"
            >
              Kom igång
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step: Name */}
        {step === 'name' && (
          <div className="text-white animate-slide-up">
            <h2 className="text-2xl font-bold text-center mb-2">Vad heter du?</h2>
            <p className="text-sm opacity-70 text-center mb-8">
              Ditt namn syns för dina gruppmedlemmar
            </p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ditt namn..."
              maxLength={30}
              autoFocus
              className="w-full bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl px-5 py-4 text-white text-lg placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all"
            />
            <button
              onClick={() => setStep('group')}
              disabled={!displayName.trim()}
              className="mt-8 w-full bg-white text-orange-600 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
            >
              Fortsätt
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step: Group */}
        {step === 'group' && (
          <div className="text-white animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Gå med i en grupp</h2>
            <p className="text-sm opacity-70 text-center mb-8">
              Ange en inbjudningskod från din vän, eller starta en egen grupp senare
            </p>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Inbjudningskod (t.ex. ABCD1234)"
              maxLength={10}
              className="w-full bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl px-5 py-4 text-white text-lg placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all text-center tracking-widest uppercase"
            />
            <button
              onClick={() => setStep('avatar')}
              className="mt-8 w-full bg-white text-orange-600 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {inviteCode.trim() ? 'Gå med' : 'Hoppa över'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step: Avatar */}
        {step === 'avatar' && (
          <div className="text-white animate-slide-up">
            <h2 className="text-2xl font-bold text-center mb-2">Välj din avatar</h2>
            <p className="text-sm opacity-70 text-center mb-6">
              Välj en ikon som representerar dig
            </p>

            {selectedAvatar && (
              <div className="text-center mb-6">
                <span className="text-6xl">{selectedAvatar}</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 mb-8">
              {AVATARS.map((a) => (
                <button
                  key={a.emoji}
                  onClick={() => setSelectedAvatar(a.emoji)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all active:scale-95 ${
                    selectedAvatar === a.emoji
                      ? 'bg-white/30 ring-2 ring-white scale-105'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-[10px] opacity-70">{a.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setIntroStep(0);
                setStep('intro');
              }}
              disabled={!selectedAvatar}
              className="w-full bg-white text-orange-600 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
            >
              Fortsätt
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step: Intro (Expedition & EP system) */}
        {step === 'intro' && (
          <div className="text-white animate-slide-up">
            {introStep === 0 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-yellow-300" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Expedition Points (EP)</h2>
                <p className="text-sm opacity-80 leading-relaxed max-w-xs mx-auto mb-4">
                  Varje träningspass ger dig EP baserat på typ, längd och ansträngning. Ju fler dagar i rad du tränar, desto högre streak-bonus!
                </p>
                <div className="flex justify-center gap-4 mt-6">
                  <div className="bg-white/15 rounded-xl px-4 py-3 text-center">
                    <p className="text-xl font-bold">🚴 10</p>
                    <p className="text-[10px] opacity-70">Cykling/30min</p>
                  </div>
                  <div className="bg-white/15 rounded-xl px-4 py-3 text-center">
                    <p className="text-xl font-bold">🏊 12</p>
                    <p className="text-[10px] opacity-70">Simning/30min</p>
                  </div>
                  <div className="bg-white/15 rounded-xl px-4 py-3 text-center">
                    <p className="text-xl font-bold">🔥 1.3x</p>
                    <p className="text-[10px] opacity-70">7+ dagar streak</p>
                  </div>
                </div>
              </div>
            )}

            {introStep === 1 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Expeditionen</h2>
                <p className="text-sm opacity-80 leading-relaxed max-w-xs mx-auto mb-4">
                  Er grupp följer en resa genom Sverige — från Mora till Lidingö. Varje EP tar er närmare nästa waypoint!
                </p>
                <div className="flex flex-col gap-2 mt-6 max-w-xs mx-auto text-left">
                  <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                    <span className="text-lg">📍</span>
                    <div>
                      <p className="text-sm font-semibold">Mora &rarr; Lidingö</p>
                      <p className="text-[10px] opacity-70">15 waypoints, 7 000 EP</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                    <span className="text-lg">🏆</span>
                    <div>
                      <p className="text-sm font-semibold">4 lopp, 1 äventyr</p>
                      <p className="text-[10px] opacity-70">Vasaloppet, Vätternrundan, Vansbro, Lidingö</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {introStep === 2 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-yellow-300" />
                </div>
                <h2 className="text-2xl font-bold mb-3">
                  Redo, {displayName.split(' ')[0]}?
                </h2>
                <p className="text-sm opacity-80 leading-relaxed max-w-xs mx-auto">
                  Din expedition börjar nu. Logga ditt första pass, samla EP och utforska Sverige med din grupp!
                </p>
                <div className="mt-6 text-6xl">{selectedAvatar}</div>
              </div>
            )}

            <div className="mt-10">
              {introStep < 2 ? (
                <button
                  onClick={() => setIntroStep(introStep + 1)}
                  className="w-full bg-white text-orange-600 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Nästa
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full bg-white text-orange-600 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all animate-pulse-glow flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    <>
                      Starta Expeditionen!
                      <Sparkles className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}

              {introStep > 0 && introStep < 2 && (
                <button
                  onClick={() => setIntroStep(introStep - 1)}
                  className="w-full mt-3 text-white/60 text-sm py-2"
                >
                  Tillbaka
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper: creates a new group for the user and adds them as owner.
 */
async function createNewGroup(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  displayName: string
) {
  // Generate a random invite code (8 characters, uppercase alphanumeric)
  const inviteCode = generateInviteCode();

  const { data: newGroup, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: `${displayName}s grupp`,
      invite_code: inviteCode,
      created_by: userId,
    })
    .select('id')
    .single();

  if (groupError || !newGroup) {
    console.error('Error creating group:', groupError);
    return;
  }

  // Add the user as the group owner
  await supabase.from('group_members').insert({
    group_id: newGroup.id,
    user_id: userId,
    role: 'owner',
  });
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
