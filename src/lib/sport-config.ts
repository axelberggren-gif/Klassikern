import type { SportType } from '@/types/database';

export interface SportConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const SPORT_CONFIG: Record<SportType, SportConfig> = {
  cycling: {
    label: 'Cykling',
    icon: '🚴',
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  running: {
    label: 'Löpning',
    icon: '🏃',
    color: '#22C55E',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  swimming: {
    label: 'Simning',
    icon: '🏊',
    color: '#06B6D4',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
  },
  hiit: {
    label: 'HIIT / Styrka',
    icon: '💪',
    color: '#F97316',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  rest: {
    label: 'Vila',
    icon: '🌙',
    color: '#9CA3AF',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
  },
  other: {
    label: 'Övrigt',
    icon: '⭐',
    color: '#8B5CF6',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
};

export const EFFORT_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: 'Lätt', emoji: '😌' },
  2: { label: 'Lagom', emoji: '🙂' },
  3: { label: 'Medelsvår', emoji: '😤' },
  4: { label: 'Tuff', emoji: '🥵' },
  5: { label: 'Maximal', emoji: '🔥' },
};

export const ACTIVE_SPORT_TYPES: SportType[] = ['cycling', 'running', 'swimming', 'hiit', 'other'];
