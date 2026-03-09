// Re-export all store modules for backward compatibility.
// Import from '@/lib/store' continues to work.

export { getLoginProfiles, updateCurrentUser } from './profiles';
export type { LoginProfile } from './profiles';

export {
  getGroupMembers,
  getUserGroupId,
  getGroupDetails,
  joinGroupByCode,
  leaveGroup,
  regenerateInviteCode,
  createGroup,
} from './groups';

export { getUserSessions, logSession } from './sessions';
export type { LogSessionResult } from './sessions';

export { getActivityFeed } from './feed';

export { getUserStats, getWeekCompletionStats } from './stats';

export { getAllBadges, getUserBadges } from './badges';

export { getStravaConnection, disconnectStrava } from './strava';

export {
  getActiveBossEncounter,
  getBossAttacks,
  getUniqueAttackerCount,
  attackBoss,
  handleBossFailed,
  getUserBossTrophies,
  getAllBossDefinitions,
  getBossHistory,
} from './boss';
