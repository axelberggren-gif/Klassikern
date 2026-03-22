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

export { getUserSessions, logSession, uploadSessionPhoto } from './sessions';
export type { LogSessionResult } from './sessions';

export {
  getActivityFeed,
  toggleReaction,
  getFeedReactions,
  getFeedComments,
  addFeedComment,
  deleteFeedComment,
  getActiveChallenges,
  createCallOut,
  getChallengeHistory,
} from './feed';

export { getUserStats, getWeekCompletionStats } from './stats';

export { getAllBadges, getUserBadges } from './badges';

export { getStravaConnection, disconnectStrava } from './strava';

export {
  getActiveBossEncounter,
  getBossAttacks,
  getUniqueAttackerCount,
  attackBoss,
  attackBossWeekly,
  getUnusedWeeklyEP,
  handleBossFailed,
  getUserBossTrophies,
  getUserTrophies,
  getAllBossDefinitions,
  getBossHistory,
  getGroupBossHistory,
  getEncounterAttacks,
} from './boss';
export type { WeeklyEPInfo, AttackBossWeeklyResult } from './boss';

export {
  getWeeklyEPByUser,
  getWeeklyWinners,
  getSportLeaderboard,
  getPowerRankings,
  getHeadToHeadData,
} from './leaderboard';
export type {
  WeeklyUserEP,
  WeeklyWinnerResult,
  SportLeaderboardEntry,
  HeadToHeadUser,
  HeadToHeadData,
} from './leaderboard';
