import { createClient } from '@/lib/supabase';
import { calculateBossDamage } from '../boss-engine';
import type {
  Profile,
  SportType,
  BossDefinition,
  BossEncounterWithBoss,
  BossAttack,
  BossAttackWithUser,
  BossTrophy,
  BossTrophyWithBoss,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Boss Battle System
// ---------------------------------------------------------------------------

export async function getActiveBossEncounter(
  groupId: string
): Promise<BossEncounterWithBoss | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_encounters')
    .select('*, boss_definitions(*)')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching active boss encounter:', error);
    return null;
  }

  const { boss_definitions: boss, ...encounterFields } = data as Record<string, unknown>;
  return {
    ...encounterFields,
    boss: boss as BossDefinition,
  } as BossEncounterWithBoss;
}

export async function getBossAttacks(encounterId: string): Promise<BossAttack[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_attacks')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching boss attacks:', error);
    return [];
  }
  return data ?? [];
}

export async function getUniqueAttackerCount(encounterId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_attacks')
    .select('user_id')
    .eq('encounter_id', encounterId);

  if (error || !data) {
    console.error('Error counting unique attackers:', error);
    return 0;
  }

  const uniqueUserIds = new Set(data.map((row) => row.user_id));
  return uniqueUserIds.size;
}

export async function attackBoss(params: {
  userId: string;
  groupId: string;
  sessionId: string;
  sportType: SportType;
  epEarned: number;
}): Promise<{
  damage: number;
  isCritical: boolean;
  bossEmoji: string;
  bossName: string;
  isKillingBlow: boolean;
  remainingHP: number;
  maxHP: number;
} | null> {
  const supabase = createClient();

  const encounter = await getActiveBossEncounter(params.groupId);
  if (!encounter) return null;

  const uniqueAttackers = await getUniqueAttackerCount(encounter.id);

  const damageResult = calculateBossDamage({
    epEarned: params.epEarned,
    sportType: params.sportType,
    boss: encounter.boss,
    encounter,
    todayAttackerCount: uniqueAttackers,
  });

  const { error: attackError } = await supabase
    .from('boss_attacks')
    .insert({
      encounter_id: encounter.id,
      user_id: params.userId,
      session_id: params.sessionId,
      damage: damageResult.damage,
      is_critical: damageResult.isCritical,
      sport_type: params.sportType,
    });

  if (attackError) {
    console.error('Error inserting boss attack:', attackError);
    return null;
  }

  const newHP = Math.max(0, encounter.current_hp - damageResult.damage);

  const { error: updateError } = await supabase
    .from('boss_encounters')
    .update({ current_hp: newHP })
    .eq('id', encounter.id);

  if (updateError) {
    console.error('Error updating boss HP:', updateError);
  }

  const feedEventType = damageResult.isCritical ? 'boss_critical_hit' : 'boss_attacked';
  await supabase.from('activity_feed').insert({
    group_id: params.groupId,
    user_id: params.userId,
    event_type: feedEventType,
    event_data: {
      boss_name: encounter.boss.name,
      boss_emoji: encounter.boss.emoji,
      damage: damageResult.damage,
      is_critical: damageResult.isCritical,
      sport_type: params.sportType,
      remaining_hp: newHP,
      max_hp: encounter.max_hp,
    },
  });

  const isKillingBlow = newHP === 0;
  if (isKillingBlow) {
    await handleBossDefeated({
      encounterId: encounter.id,
      groupId: params.groupId,
      killingBlowUserId: params.userId,
      bossId: encounter.boss.id,
      bossLevel: encounter.boss.level,
    });
  }

  return {
    damage: damageResult.damage,
    isCritical: damageResult.isCritical,
    bossEmoji: encounter.boss.emoji,
    bossName: encounter.boss.name,
    isKillingBlow,
    remainingHP: newHP,
    maxHP: encounter.max_hp,
  };
}

async function handleBossDefeated(params: {
  encounterId: string;
  groupId: string;
  killingBlowUserId: string;
  bossId: number;
  bossLevel: number;
}) {
  const supabase = createClient();

  const { error: encounterError } = await supabase
    .from('boss_encounters')
    .update({
      status: 'defeated',
      defeated_at: new Date().toISOString(),
      defeated_by: params.killingBlowUserId,
    })
    .eq('id', params.encounterId);

  if (encounterError) {
    console.error('Error updating defeated encounter:', encounterError);
  }

  const { data: attackRows, error: attacksError } = await supabase
    .from('boss_attacks')
    .select('user_id')
    .eq('encounter_id', params.encounterId);

  if (attacksError || !attackRows) {
    console.error('Error fetching attackers for trophies:', attacksError);
    return;
  }

  const uniqueAttackerIds = [...new Set(attackRows.map((r) => r.user_id))];
  const baseBonusEP = params.bossLevel * 10;

  for (const attackerId of uniqueAttackerIds) {
    const isKiller = attackerId === params.killingBlowUserId;
    const bonusEP = isKiller ? baseBonusEP * 2 : baseBonusEP;

    await supabase.from('boss_trophies').insert({
      user_id: attackerId,
      encounter_id: params.encounterId,
      boss_id: params.bossId,
      bonus_ep: bonusEP,
      is_killing_blow: isKiller,
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('total_ep')
      .eq('id', attackerId)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ total_ep: profile.total_ep + bonusEP })
        .eq('id', attackerId);
    }
  }

  await supabase.from('activity_feed').insert({
    group_id: params.groupId,
    user_id: params.killingBlowUserId,
    event_type: 'boss_defeated',
    event_data: {
      boss_id: params.bossId,
      boss_level: params.bossLevel,
      bonus_ep: baseBonusEP,
      killing_blow_user_id: params.killingBlowUserId,
      total_attackers: uniqueAttackerIds.length,
    },
  });
}

export async function handleBossFailed(
  encounterId: string,
  groupId: string
): Promise<void> {
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from('boss_encounters')
    .update({ status: 'failed' })
    .eq('id', encounterId);

  if (updateError) {
    console.error('Error marking boss as failed:', updateError);
  }

  const { data: encounter } = await supabase
    .from('boss_encounters')
    .select('boss_id, boss_definitions(*)')
    .eq('id', encounterId)
    .single();

  const bossData = (encounter as unknown as Record<string, unknown>)?.boss_definitions as Record<string, unknown> | null;

  await supabase.from('activity_feed').insert({
    group_id: groupId,
    user_id: '00000000-0000-0000-0000-000000000000',
    event_type: 'boss_failed',
    event_data: {
      boss_id: encounter?.boss_id ?? null,
      boss_name: bossData?.name ?? 'Unknown',
      boss_emoji: bossData?.emoji ?? '',
      encounter_id: encounterId,
    },
  });
}

export async function getUserBossTrophies(
  userId: string
): Promise<(BossTrophy & { boss: BossDefinition })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_trophies')
    .select('*, boss_definitions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching user boss trophies:', error);
    return [];
  }

  return data.map((item) => {
    const { boss_definitions: boss, ...trophyFields } = item as Record<string, unknown>;
    return {
      ...trophyFields,
      boss: boss as BossDefinition,
    } as BossTrophy & { boss: BossDefinition };
  });
}

export async function getAllBossDefinitions(): Promise<BossDefinition[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_definitions')
    .select('*')
    .order('level', { ascending: true });

  if (error || !data) {
    console.error('Error fetching boss definitions:', error);
    return [];
  }
  return data;
}

export async function getEncounterAttacks(
  encounterId: string
): Promise<BossAttackWithUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_attacks')
    .select('*, profiles(*)')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((item) => {
    const { profiles, ...attack } = item as Record<string, unknown>;
    return { ...attack, user: profiles } as unknown as BossAttackWithUser;
  });
}

export async function getUserTrophies(
  userId: string
): Promise<BossTrophyWithBoss[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_trophies')
    .select('*, boss_definitions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((item) => {
    const { boss_definitions, ...trophy } = item as Record<string, unknown>;
    return { ...trophy, boss: boss_definitions } as unknown as BossTrophyWithBoss;
  });
}

export async function getGroupBossHistory(
  groupId: string
): Promise<BossEncounterWithBoss[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_encounters')
    .select('*, boss_definitions(*)')
    .eq('group_id', groupId)
    .neq('status', 'active')
    .order('week_start', { ascending: false });
  if (error || !data) return [];
  return data.map((item) => {
    const { boss_definitions, ...encounter } = item as Record<string, unknown>;
    return { ...encounter, boss: boss_definitions } as unknown as BossEncounterWithBoss;
  });
}

export async function getBossHistory(
  groupId: string
): Promise<BossEncounterWithBoss[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_encounters')
    .select('*, boss_definitions(*)')
    .eq('group_id', groupId)
    .in('status', ['defeated', 'failed'])
    .order('week_start', { ascending: false });

  if (error || !data) {
    console.error('Error fetching boss history:', error);
    return [];
  }

  return data.map((item) => {
    const { boss_definitions: boss, ...encounterFields } = item as Record<string, unknown>;
    return {
      ...encounterFields,
      boss: boss as BossDefinition,
    } as BossEncounterWithBoss;
  });
}
