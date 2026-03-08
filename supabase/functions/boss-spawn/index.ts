// Boss Spawn Edge Function
// Schedule: cron '0 0 * * 1' (every Monday at 00:00 UTC)
//
// 1. Resolves all active encounters as 'failed'
// 2. Creates new encounters for each group with ≥2 members
// 3. Propagates debuff from failed encounters

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Klassikern start date for week number calculation
const KLASSIKERN_START = new Date('2026-02-23');

function getWeekNumber(): number {
  const now = new Date();
  const diffMs = now.getTime() - KLASSIKERN_START.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function scaleBossHP(baseHp: number, groupSize: number): number {
  return Math.round(baseHp * (groupSize / 4));
}

Deno.serve(async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const weekNumber = getWeekNumber();

    // 1. Resolve all active encounters → failed
    const { data: activeEncounters } = await supabase
      .from('boss_encounters')
      .select('id, group_id, current_hp, max_hp, week_number')
      .eq('status', 'active');

    const failedGroupDebuffs = new Map<string, number>();

    if (activeEncounters && activeEncounters.length > 0) {
      for (const enc of activeEncounters) {
        await supabase
          .from('boss_encounters')
          .update({ status: 'failed', ended_at: new Date().toISOString() })
          .eq('id', enc.id);

        // Debuff: remaining HP% reduces next week's damage (0.5–1.0 range)
        const hpRatio = enc.current_hp / enc.max_hp;
        const debuff = Math.max(0.5, 1 - hpRatio * 0.5);
        failedGroupDebuffs.set(enc.group_id, debuff);

        // Post failed event to activity feed
        await supabase.from('activity_feed').insert({
          group_id: enc.group_id,
          user_id: enc.group_id, // system event
          event_type: 'boss_failed',
          event_data: {
            remaining_hp: enc.current_hp,
            max_hp: enc.max_hp,
            week_number: enc.week_number,
          },
        });
      }
    }

    // 2. Get all groups with ≥2 members
    const { data: allMembers } = await supabase
      .from('group_members')
      .select('group_id');

    if (!allMembers || allMembers.length === 0) {
      return new Response(JSON.stringify({ message: 'No groups found' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groupCounts = new Map<string, number>();
    for (const m of allMembers) {
      groupCounts.set(m.group_id, (groupCounts.get(m.group_id) || 0) + 1);
    }
    const eligibleGroups = Array.from(groupCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([group_id, member_count]) => ({ group_id, member_count }));

    if (eligibleGroups.length === 0) {
      return new Response(JSON.stringify({ message: 'No eligible groups' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Get total boss count and select boss for this week
    const { count: bossCount } = await supabase
      .from('boss_definitions')
      .select('*', { count: 'exact', head: true });

    const totalBosses = bossCount || 30;
    const bossSortOrder = ((weekNumber - 1) % totalBosses) + 1;

    const { data: boss } = await supabase
      .from('boss_definitions')
      .select('*')
      .eq('sort_order', bossSortOrder)
      .single();

    if (!boss) {
      return new Response(JSON.stringify({ error: 'Boss not found for sort_order ' + bossSortOrder }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Create encounters for each group
    const created: string[] = [];
    for (const group of eligibleGroups) {
      const scaledHp = scaleBossHP(boss.base_hp, group.member_count);
      const debuff = failedGroupDebuffs.get(group.group_id) || 1.0;

      const { data: encounter, error } = await supabase
        .from('boss_encounters')
        .insert({
          group_id: group.group_id,
          boss_id: boss.id,
          week_number: weekNumber,
          max_hp: scaledHp,
          current_hp: scaledHp,
          debuff_modifier: debuff,
        })
        .select()
        .single();

      if (!error && encounter) {
        created.push(encounter.id);

        // Post "new boss appeared" event
        await supabase.from('activity_feed').insert({
          group_id: group.group_id,
          user_id: group.group_id, // system event
          event_type: 'boss_attacked',
          event_data: {
            boss_name: boss.name,
            boss_emoji: boss.emoji,
            max_hp: scaledHp,
            is_spawn: true,
            week_number: weekNumber,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Spawned ${created.length} encounters for week ${weekNumber}`,
        boss: boss.name,
        encounters: created.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
