/**
 * Boss Voice Engine — Web Speech API narration for boss taunts.
 *
 * Uses SpeechSynthesis to deliver dramatic Swedish voice lines with
 * per-boss voice profiles (pitch, rate, volume). Mute state is stored
 * in localStorage so it persists across sessions.
 */

import { getRandomTaunt, getDefeatLine, getSpawnLine, getVoiceProfile } from './boss-taunts';
import type { BossVoiceProfile } from './boss-taunts';

const MUTE_KEY = 'boss-voice-muted';

// ── Mute toggle ──────────────────────────────────────────────────────

export function isBossVoiceMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setBossVoiceMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  if (muted) {
    localStorage.setItem(MUTE_KEY, '1');
  } else {
    localStorage.removeItem(MUTE_KEY);
  }
}

// ── Voice selection ──────────────────────────────────────────────────

/** Try to find a Swedish voice, falling back to any available voice */
function getSwedishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  // Prefer Swedish voices
  const swedish = voices.find(
    (v) => v.lang.startsWith('sv') && !v.localService
  ) ?? voices.find((v) => v.lang.startsWith('sv'));
  if (swedish) return swedish;
  // Fallback: any voice (browser default)
  return null;
}

// ── Speak ────────────────────────────────────────────────────────────

function speak(
  text: string,
  profile: BossVoiceProfile,
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined') return null;
  if (!('speechSynthesis' in window)) return null;
  if (isBossVoiceMuted()) return null;

  // Cancel any ongoing boss speech first
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;
  utterance.volume = profile.volume;

  const voice = getSwedishVoice();
  if (voice) utterance.voice = voice;
  // Fallback lang hint even if no Swedish voice found
  utterance.lang = 'sv-SE';

  speechSynthesis.speak(utterance);
  return utterance;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Speak the boss spawn line when a new boss appears.
 * Returns the utterance or null if muted/unavailable.
 */
export function speakBossSpawn(bossLevel: number): SpeechSynthesisUtterance | null {
  const text = getSpawnLine(bossLevel);
  if (!text) return null;
  // Slightly slower and more dramatic for spawn announcements
  const profile = getVoiceProfile(bossLevel);
  return speak(text, { ...profile, rate: profile.rate * 0.85 });
}

/**
 * Speak a random attack taunt for a boss.
 * Returns the utterance (for chaining/cancellation) or null if muted/unavailable.
 */
export function speakBossTaunt(bossLevel: number): SpeechSynthesisUtterance | null {
  const text = getRandomTaunt(bossLevel);
  if (!text) return null;
  return speak(text, getVoiceProfile(bossLevel));
}

/**
 * Speak the boss defeat line.
 * Returns the utterance or null if muted/unavailable.
 */
export function speakBossDefeat(bossLevel: number): SpeechSynthesisUtterance | null {
  const text = getDefeatLine(bossLevel);
  if (!text) return null;
  return speak(text, getVoiceProfile(bossLevel));
}

/**
 * Speak arbitrary text in the boss's voice (for lore, descriptions, taunts).
 * Returns the utterance or null if muted/unavailable.
 */
export function speakBossText(text: string, bossLevel: number): SpeechSynthesisUtterance | null {
  if (!text) return null;
  const profile = getVoiceProfile(bossLevel);
  // Use a slightly slower rate for narration/lore to improve clarity
  return speak(text, { ...profile, rate: profile.rate * 0.9 });
}

/**
 * Cancel any ongoing boss speech immediately.
 */
export function cancelBossSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

/**
 * Ensure voices are loaded (some browsers load them async).
 * Call once on app init or before first speak.
 */
export function preloadVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve();
      return;
    }
    speechSynthesis.addEventListener('voiceschanged', () => resolve(), { once: true });
    // Timeout fallback — some browsers never fire voiceschanged
    setTimeout(resolve, 2000);
  });
}
