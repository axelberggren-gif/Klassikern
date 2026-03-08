import { createClient } from '@/lib/supabase';
import type { Profile, GroupDetails, GroupMemberWithProfile } from '@/types/database';

// ---------------------------------------------------------------------------
// Group members
// ---------------------------------------------------------------------------

export async function getGroupMembers(userId: string): Promise<Profile[]> {
  const supabase = createClient();

  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (membershipError || !membership) {
    return [];
  }

  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id, role, profiles(*)')
    .eq('group_id', membership.group_id);

  if (membersError || !members) {
    return [];
  }

  return members
    .map((m) => m.profiles as unknown as Profile)
    .filter(Boolean);
}

export async function getUserGroupId(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.group_id;
}

export async function getGroupDetails(groupId: string): Promise<GroupDetails | null> {
  const supabase = createClient();

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, invite_code, created_by')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    console.error('Error fetching group details:', groupError);
    return null;
  }

  const { data: membersData, error: membersError } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, profiles(*)')
    .eq('group_id', groupId);

  if (membersError || !membersData) {
    console.error('Error fetching group members:', membersError);
    return null;
  }

  const members: GroupMemberWithProfile[] = membersData.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    profile: m.profiles as unknown as Profile,
  }));

  return {
    id: group.id,
    name: group.name,
    invite_code: group.invite_code,
    created_by: group.created_by,
    members,
  };
}

// ---------------------------------------------------------------------------
// Group invitation system
// ---------------------------------------------------------------------------

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function joinGroupByCode(
  userId: string,
  inviteCode: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();

  if (groupError || !group) {
    return { success: false, error: 'Ogiltig inbjudningskod. Kontrollera koden och försök igen.' };
  }

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Du är redan medlem i denna grupp.' };
  }

  const { data: currentMembership } = await supabase
    .from('group_members')
    .select('id, group_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (currentMembership) {
    await supabase
      .from('group_members')
      .delete()
      .eq('id', currentMembership.id);
  }

  const { error: insertError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
    });

  if (insertError) {
    console.error('Error joining group:', insertError);
    return { success: false, error: 'Kunde inte gå med i gruppen. Försök igen.' };
  }

  return { success: true };
}

export async function leaveGroup(
  userId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('id, role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (membershipError || !membership) {
    return { success: false, error: 'Du är inte medlem i denna grupp.' };
  }

  if (membership.role === 'owner') {
    return { success: false, error: 'Ägaren kan inte lämna gruppen. Överför ägarskapet först.' };
  }

  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('id', membership.id);

  if (deleteError) {
    console.error('Error leaving group:', deleteError);
    return { success: false, error: 'Kunde inte lämna gruppen. Försök igen.' };
  }

  return { success: true };
}

export async function regenerateInviteCode(groupId: string): Promise<string | null> {
  const supabase = createClient();
  const newCode = generateInviteCode();

  const { error } = await supabase
    .from('groups')
    .update({ invite_code: newCode })
    .eq('id', groupId);

  if (error) {
    console.error('Error regenerating invite code:', error);
    return null;
  }

  return newCode;
}

export async function createGroup(
  userId: string,
  groupName: string
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  const supabase = createClient();
  const inviteCode = generateInviteCode();

  const { data: currentMembership } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (currentMembership) {
    return { success: false, error: 'Du är redan medlem i en grupp. Lämna din nuvarande grupp först.' };
  }

  const { data: newGroup, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: groupName,
      invite_code: inviteCode,
      created_by: userId,
    })
    .select('id')
    .single();

  if (groupError || !newGroup) {
    console.error('Error creating group:', groupError);
    return { success: false, error: 'Kunde inte skapa gruppen. Försök igen.' };
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: newGroup.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) {
    console.error('Error adding owner to group:', memberError);
    return { success: false, error: 'Gruppen skapades men kunde inte lägga till dig som ägare.' };
  }

  return { success: true, groupId: newGroup.id };
}
