'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X, Share2, Flame, Swords, Trophy, Zap } from 'lucide-react';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { Session, Profile, BossAttack, BossEncounterWithBoss, UserBadgeWithBadge, SportType } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyRecapData {
  weekNumber: number;
  profile: Profile;
  weekSessions: Session[];
  allSessions: Session[];
  plannedCount: number;
  bossEncounter: BossEncounterWithBoss | null;
  bossAttacks: BossAttack[];
  weekBadges: UserBadgeWithBadge[];
  members: Profile[];
}

// ---------------------------------------------------------------------------
// Derived stats helpers
// ---------------------------------------------------------------------------

function deriveStats(data: WeeklyRecapData) {
  const { weekSessions, plannedCount, profile, bossAttacks, bossEncounter } = data;

  const totalEP = weekSessions.reduce((sum, s) => sum + s.ep_earned, 0);
  const totalMinutes = weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalDistance = weekSessions.reduce((sum, s) => sum + (s.distance_km || 0), 0);
  const completionPct = plannedCount > 0 ? Math.round((weekSessions.length / plannedCount) * 100) : 0;

  // Sport breakdown
  const sportMap = new Map<SportType, { sessions: number; minutes: number; ep: number }>();
  for (const s of weekSessions) {
    if (s.sport_type === 'rest') continue;
    const prev = sportMap.get(s.sport_type) || { sessions: 0, minutes: 0, ep: 0 };
    sportMap.set(s.sport_type, {
      sessions: prev.sessions + 1,
      minutes: prev.minutes + s.duration_minutes,
      ep: prev.ep + s.ep_earned,
    });
  }
  const sportBreakdown = Array.from(sportMap.entries())
    .map(([type, stats]) => ({ type, ...stats }))
    .sort((a, b) => b.minutes - a.minutes);

  // Best session (highest EP)
  const bestSession = weekSessions.length > 0
    ? weekSessions.reduce((best, s) => (s.ep_earned > best.ep_earned ? s : best))
    : null;

  // Boss damage this week by current user
  const myBossAttacks = bossAttacks.filter(a => a.user_id === profile.id);
  const myBossDamage = myBossAttacks.reduce((sum, a) => sum + a.damage, 0);
  const myCriticals = myBossAttacks.filter(a => a.is_critical).length;
  const totalBossDamage = bossAttacks.reduce((sum, a) => sum + a.damage, 0);

  // Average effort
  const avgEffort = weekSessions.length > 0
    ? weekSessions.reduce((sum, s) => sum + s.effort_rating, 0) / weekSessions.length
    : 0;

  return {
    totalEP,
    totalMinutes,
    totalDistance,
    completionPct,
    sportBreakdown,
    bestSession,
    myBossDamage,
    myCriticals,
    totalBossDamage,
    avgEffort,
    bossDefeated: bossEncounter?.status === 'defeated',
  };
}

// ---------------------------------------------------------------------------
// Individual Slide Components
// ---------------------------------------------------------------------------

function IntroSlide({ weekNumber, profile }: { weekNumber: number; profile: Profile }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
      <div className="animate-recap-float">
        <div className="text-7xl mb-2">&#9876;&#65039;</div>
      </div>
      <div className="animate-recap-slide-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
        <p className="text-sm font-medium text-emerald-400 uppercase tracking-widest mb-2">
          Veckans Recap
        </p>
        <p className="text-5xl font-black text-slate-50">
          Kapitel {weekNumber}
        </p>
      </div>
      <div className="animate-recap-slide-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
        <p className="text-lg text-slate-400">
          {profile.display_name}, s&aring; gick din vecka...
        </p>
      </div>
    </div>
  );
}

function StatsSlide({ stats, sessionCount }: {
  stats: ReturnType<typeof deriveStats>;
  sessionCount: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-8">
      <div className="animate-recap-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <p className="text-sm font-medium text-emerald-400 uppercase tracking-widest mb-6">
          Veckans siffror
        </p>
      </div>

      {/* Big EP number */}
      <div className="animate-recap-counter" style={{ animationDelay: '0.3s', opacity: 0 }}>
        <p className="text-7xl font-black text-emerald-400 animate-recap-glow">
          {stats.totalEP}
        </p>
        <p className="text-sm text-slate-400 mt-1">EP intj&auml;nade</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        <div className="animate-recap-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <p className="text-3xl font-bold text-slate-50">{sessionCount}</p>
          <p className="text-xs text-slate-400">Pass</p>
        </div>
        <div className="animate-recap-slide-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
          <p className="text-3xl font-bold text-slate-50">{Math.round(stats.totalMinutes)}</p>
          <p className="text-xs text-slate-400">Minuter</p>
        </div>
        <div className="animate-recap-slide-up" style={{ animationDelay: '0.7s', opacity: 0 }}>
          <p className="text-3xl font-bold text-slate-50">{stats.completionPct}%</p>
          <p className="text-xs text-slate-400">Genomf&ouml;rt</p>
        </div>
      </div>

      {stats.totalDistance > 0 && (
        <div className="animate-recap-slide-up" style={{ animationDelay: '0.8s', opacity: 0 }}>
          <p className="text-lg text-slate-300">
            {stats.totalDistance.toFixed(1)} km totalt
          </p>
        </div>
      )}
    </div>
  );
}

function SportSlide({ stats }: { stats: ReturnType<typeof deriveStats> }) {
  const maxMinutes = stats.sportBreakdown.length > 0
    ? Math.max(...stats.sportBreakdown.map(s => s.minutes))
    : 1;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-6">
      <div className="animate-recap-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <p className="text-sm font-medium text-emerald-400 uppercase tracking-widest text-center mb-4">
          Sportf&ouml;rdelning
        </p>
      </div>

      {stats.sportBreakdown.length === 0 ? (
        <div className="animate-recap-slide-up text-center" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <p className="text-6xl mb-4">&#128564;</p>
          <p className="text-lg text-slate-400">Inga pass den h&auml;r veckan</p>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-5">
          {stats.sportBreakdown.map((sport, i) => {
            const config = SPORT_CONFIG[sport.type];
            const pct = Math.round((sport.minutes / maxMinutes) * 100);
            return (
              <div
                key={sport.type}
                className="animate-recap-slide-up"
                style={{ animationDelay: `${0.2 + i * 0.15}s`, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className="text-sm font-semibold text-slate-200">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{sport.sessions} pass</span>
                    <span>{sport.minutes} min</span>
                    <span className="font-semibold text-emerald-400">+{sport.ep} EP</span>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: config.color,
                      animation: `recap-bar-grow 0.8s ease-out ${0.4 + i * 0.15}s both`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BestSessionSlide({ session, avgEffort }: {
  session: Session | null;
  avgEffort: number;
}) {
  if (!session) return null;

  const config = SPORT_CONFIG[session.sport_type];
  const effortStars = Math.round(avgEffort);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
      <div className="animate-recap-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <p className="text-sm font-medium text-emerald-400 uppercase tracking-widest mb-2">
          B&auml;sta passet
        </p>
      </div>

      <div className="animate-recap-counter" style={{ animationDelay: '0.3s', opacity: 0 }}>
        <div className="text-7xl mb-2">{config.icon}</div>
      </div>

      <div className="animate-recap-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
        <p className="text-4xl font-black text-slate-50">+{session.ep_earned} EP</p>
        <p className="text-sm text-slate-400 mt-1">
          {session.duration_minutes} min {config.label.toLowerCase()}
          {session.distance_km ? ` \u2022 ${session.distance_km} km` : ''}
        </p>
      </div>

      <div className="animate-recap-slide-up" style={{ animationDelay: '0.7s', opacity: 0 }}>
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700 px-6 py-4">
          <p className="text-xs text-slate-400 mb-2">Genomsnittlig anstr&auml;ngning</p>
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map(n => (
              <Flame
                key={n}
                size={20}
                className={n <= effortStars ? 'text-amber-400' : 'text-slate-600'}
                fill={n <= effortStars ? 'currentColor' : 'none'}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BossSlide({ data, stats }: {
  data: WeeklyRecapData;
  stats: ReturnType<typeof deriveStats>;
}) {
  const encounter = data.bossEncounter;
  if (!encounter) return null;

  const hpPct = Math.max(0, Math.round((encounter.current_hp / encounter.max_hp) * 100));

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
      <div className="animate-recap-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <p className="text-sm font-medium text-rose-400 uppercase tracking-widest mb-2">
          <Swords size={14} className="inline mr-1" />
          Boss Battle
        </p>
      </div>

      <div className="animate-recap-counter" style={{ animationDelay: '0.3s', opacity: 0 }}>
        <div className={`text-7xl ${stats.bossDefeated ? 'grayscale opacity-60' : ''}`}>
          {encounter.boss.emoji}
        </div>
        <p className="text-sm font-semibold text-slate-400 mt-2">{encounter.boss.name}</p>
      </div>

      {stats.bossDefeated ? (
        <div className="animate-recap-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-5 py-2">
            <Trophy size={16} className="text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">Besegrad!</span>
          </div>
        </div>
      ) : (
        <div className="animate-recap-slide-up w-full max-w-[200px]" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>HP</span>
            <span>{hpPct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${hpPct}%`,
                backgroundColor: hpPct > 50 ? '#22C55E' : hpPct > 20 ? '#EAB308' : '#EF4444',
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="animate-recap-slide-up rounded-xl bg-slate-800/50 border border-slate-700 p-4" style={{ animationDelay: '0.6s', opacity: 0 }}>
          <p className="text-3xl font-black text-rose-400">{stats.myBossDamage}</p>
          <p className="text-xs text-slate-400">Din skada</p>
        </div>
        <div className="animate-recap-slide-up rounded-xl bg-slate-800/50 border border-slate-700 p-4" style={{ animationDelay: '0.7s', opacity: 0 }}>
          <p className="text-3xl font-black text-violet-400">{stats.myCriticals}</p>
          <p className="text-xs text-slate-400">Kritiska</p>
        </div>
      </div>
    </div>
  );
}

function StreakSlide({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
      <div className="animate-recap-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <p className="text-sm font-medium text-amber-400 uppercase tracking-widest mb-2">
          Streak
        </p>
      </div>

      <div className="animate-recap-counter" style={{ animationDelay: '0.3s', opacity: 0 }}>
        <div className="text-7xl animate-recap-float">&#128293;</div>
      </div>

      <div className="animate-recap-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
        <p className="text-6xl font-black text-slate-50">{profile.current_streak}</p>
        <p className="text-sm text-slate-400 mt-1">dagar i rad</p>
      </div>

      {profile.current_streak >= profile.longest_streak && profile.current_streak > 0 && (
        <div className="animate-recap-slide-up" style={{ animationDelay: '0.7s', opacity: 0 }}>
          <div className="flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-2">
            <Zap size={14} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-400">Nytt rekord!</span>
          </div>
        </div>
      )}

      <div className="animate-recap-slide-up" style={{ animationDelay: '0.8s', opacity: 0 }}>
        <p className="text-xs text-slate-500">
          L&auml;ngsta streak: {profile.longest_streak} dagar
        </p>
      </div>
    </div>
  );
}

function BadgesSlide({ badges }: { badges: UserBadgeWithBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
      <div className="animate-recap-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <p className="text-sm font-medium text-violet-400 uppercase tracking-widest mb-2">
          Nya prestationer
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {badges.map((ub, i) => (
          <div
            key={ub.id}
            className="animate-recap-slide-up flex items-center gap-4 rounded-2xl bg-slate-800/50 border border-violet-500/20 p-4"
            style={{ animationDelay: `${0.3 + i * 0.2}s`, opacity: 0 }}
          >
            <div className="text-3xl">{ub.badge.icon_key}</div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-50">{ub.badge.name}</p>
              <p className="text-xs text-slate-400">{ub.badge.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutroSlide({ profile, stats, weekNumber }: {
  profile: Profile;
  stats: ReturnType<typeof deriveStats>;
  weekNumber: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
      <div className="animate-recap-float">
        <div className="text-6xl">&#127942;</div>
      </div>

      <div className="animate-recap-slide-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
        <p className="text-2xl font-black text-slate-50 leading-tight">
          Bra k&auml;mpat,<br />{profile.display_name}!
        </p>
      </div>

      <div className="animate-recap-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-5 w-full max-w-xs">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{stats.totalEP}</p>
              <p className="text-[10px] text-slate-400">EP</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{stats.completionPct}%</p>
              <p className="text-[10px] text-slate-400">Genomf&ouml;rt</p>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-recap-slide-up" style={{ animationDelay: '0.7s', opacity: 0 }}>
        <p className="text-sm text-slate-400">
          Kapitel {weekNumber} avklarat &mdash; framåt mot n&auml;sta!
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main WeeklyRecap Component
// ---------------------------------------------------------------------------

export default function WeeklyRecap({ data }: { data: WeeklyRecapData }) {
  const router = useRouter();
  const stats = deriveStats(data);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build dynamic slide list
  const slides: { key: string; render: () => React.ReactNode }[] = [];

  slides.push({ key: 'intro', render: () => <IntroSlide weekNumber={data.weekNumber} profile={data.profile} /> });
  slides.push({ key: 'stats', render: () => <StatsSlide stats={stats} sessionCount={data.weekSessions.length} /> });

  if (stats.sportBreakdown.length > 0) {
    slides.push({ key: 'sports', render: () => <SportSlide stats={stats} /> });
  }

  if (stats.bestSession) {
    slides.push({ key: 'best', render: () => <BestSessionSlide session={stats.bestSession} avgEffort={stats.avgEffort} /> });
  }

  if (data.bossEncounter) {
    slides.push({ key: 'boss', render: () => <BossSlide data={data} stats={stats} /> });
  }

  if (data.weekBadges.length > 0) {
    slides.push({ key: 'badges', render: () => <BadgesSlide badges={data.weekBadges} /> });
  }

  slides.push({ key: 'streak', render: () => <StreakSlide profile={data.profile} /> });
  slides.push({ key: 'outro', render: () => <OutroSlide profile={data.profile} stats={stats} weekNumber={data.weekNumber} /> });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SLIDE_DURATION = 5000; // 5s per slide
  const TICK_INTERVAL = 50;

  const goToSlide = useCallback((index: number) => {
    if (index >= slides.length) {
      router.push('/');
      return;
    }
    if (index < 0) index = 0;
    setCurrentSlide(index);
    setSlideProgress(0);
  }, [slides.length, router]);

  const next = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prev = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  // Auto-advance timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlideProgress(p => {
        const next = p + (TICK_INTERVAL / SLIDE_DURATION) * 100;
        if (next >= 100) return 100;
        return next;
      });
    }, TICK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSlide]);

  // Advance when progress hits 100
  useEffect(() => {
    if (slideProgress >= 100) {
      next();
    }
  }, [slideProgress, next]);

  // Touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) next();
      else prev();
    }
  };

  // Tap left/right areas
  const handleTap = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) prev();
    else next();
  };

  // Share via Web Share API
  const handleShare = async () => {
    const text = `Kapitel ${data.weekNumber} recap: ${stats.totalEP} EP, ${data.weekSessions.length} pass, ${stats.completionPct}% genomfort! ⚔️`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 px-3 pt-3 pb-2 z-10">
        {slides.map((slide, i) => (
          <div key={slide.key} className="flex-1 h-[3px] rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-75"
              style={{
                width: i < currentSlide ? '100%' : i === currentSlide ? `${slideProgress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Top controls */}
      <div className="flex items-center justify-between px-4 py-2 z-10">
        <button onClick={() => router.push('/')} className="p-2 text-slate-400 hover:text-slate-200">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          {currentSlide === slides.length - 1 && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5"
            >
              <Share2 size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Dela</span>
            </button>
          )}
        </div>
      </div>

      {/* Slide content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div key={currentSlide} className="h-full animate-recap-fade-in">
          {slides[currentSlide].render()}
        </div>
      </div>

      {/* Bottom nav hints */}
      <div className="flex items-center justify-between px-6 pb-6 pt-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className={`p-2 rounded-full ${currentSlide === 0 ? 'text-slate-700' : 'text-slate-400'}`}
          disabled={currentSlide === 0}
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-xs text-slate-500">
          {currentSlide + 1} / {slides.length}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="p-2 rounded-full text-slate-400"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
