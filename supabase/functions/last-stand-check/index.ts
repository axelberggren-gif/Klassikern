// Last Stand Check Edge Function
// Schedule: cron '0 20 * * 0' (every Sunday at 20:00 UTC)
//
// Checks all active boss encounters. If any boss has ≤10% HP remaining,
// posts a "Last Stand" activity feed event to motivate the group.
// During Last Stand, all attacks deal double damage.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LAST_STAND_THRESHOLD = 0.10;

Deno.serve(async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all active encounters with their boss definitions
    const { data: encounters, error } = await supabase
      .from('boss_encounters')
      .select('*, boss_definitions(*)')
      .eq('status', 'active');

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!encounters || encounters.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active encounters' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    let lastStandCount = 0;

    for (const encounter of encounters) {
      const hpPercentage = encounter.current_hp / encounter.max_hp;
      const boss = encounter.boss_definitions as {
        name: string;
        emoji: string;
      };

      if (hpPercentage <= LAST_STAND_THRESHOLD && hpPercentage > 0) {
        // Post Last Stand notification to group's activity feed
        await supabase.from('activity_feed').insert({
          group_id: encounter.group_id,
          user_id: encounter.group_id, // system event
          event_type: 'boss_attacked',
          event_data: {
            boss_name: boss.name,
            boss_emoji: boss.emoji,
            is_last_stand: true,
            remaining_hp: encounter.current_hp,
            max_hp: encounter.max_hp,
            hp_percentage: Math.round(hpPercentage * 100),
            message: `Last Stand aktiverad! ${boss.emoji} ${boss.name} har bara ${encounter.current_hp} HP kvar — dubbel skada till midnatt söndag!`,
          },
        });

        lastStandCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Last Stand check complete`,
        total_active: encounters.length,
        last_stand_count: lastStandCount,
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
