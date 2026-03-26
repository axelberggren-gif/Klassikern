import type { ChallengeTemplate } from '@/types/database';

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    title: '10 pass på en vecka',
    description: 'Logga minst 10 träningspass under veckan — alla sporttyper räknas!',
    challengeType: 'total_sessions',
    targetValue: 10,
  },
  {
    title: 'Maratonveckan',
    description: 'Samla ihop 42 km totalt denna vecka (alla sporter).',
    challengeType: 'total_distance',
    targetValue: 42,
  },
  {
    title: '500 minuter',
    description: 'Träna sammanlagt 500 minuter under veckan.',
    challengeType: 'total_duration',
    targetValue: 500,
  },
  {
    title: 'EP-jakt: 200 EP',
    description: 'Tjäna 200 EP under veckan — hög intensitet ger mest!',
    challengeType: 'total_ep',
    targetValue: 200,
  },
  {
    title: 'Simveckan',
    description: 'Simma minst 3 pass under veckan.',
    challengeType: 'sport_sessions',
    targetValue: 3,
    sportFilter: 'swimming',
  },
  {
    title: 'Löparutmaningen',
    description: 'Spring minst 4 pass under veckan.',
    challengeType: 'sport_sessions',
    targetValue: 4,
    sportFilter: 'running',
  },
  {
    title: 'Cykelbonanza',
    description: 'Cykla minst 3 pass under veckan.',
    challengeType: 'sport_sessions',
    targetValue: 3,
    sportFilter: 'cycling',
  },
  {
    title: '100 km veckan',
    description: 'Samla 100 km totalt under veckan.',
    challengeType: 'total_distance',
    targetValue: 100,
  },
];
