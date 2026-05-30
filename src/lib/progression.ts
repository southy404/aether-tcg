export const XP_REWARDS = {
  tutorialCompleted: 100,
  aiMatchWin: 90,
  aiMatchLoss: 30,
  campaignMissionWin: 140,
  campaignFirstClearBonus: 100,
  pvpWin: 160,
  pvpLoss: 70,
  pvpDraw: 100,
  packOpened: 10,
  deckCreated: 25,
  dailyReward: 50,
  achievementMin: 50,
  achievementMax: 250,
} as const;

export type XpRewardReason =
  | 'tutorialCompleted'
  | 'aiMatchWin'
  | 'aiMatchLoss'
  | 'campaignMissionWin'
  | 'pvpWin'
  | 'pvpLoss'
  | 'pvpDraw'
  | 'packOpened'
  | 'deckCreated'
  | 'dailyReward'
  | 'achievementUnlock';

export type AccountTitleKey =
  | 'noviceBinder'
  | 'duelist'
  | 'aetherAdept'
  | 'masterBinder'
  | 'grandBinder'
  | 'aetherAscendant';

export type LevelReward = {
  level: number;
  merits: number;
  gold: number;
  awakeningPacks: number;
};

export type XpRewardMetadata = {
  missionId?: string;
  turnsPlayed?: number;
  conceded?: boolean;
  alreadyCompleted?: boolean;
  firstClear?: boolean;
  meaningfulDeck?: boolean;
  deckCreationXpAlreadyAwarded?: boolean;
  alreadyClaimedToday?: boolean;
  achievementXp?: number;
};

const MAX_LEVEL_SCAN = 500;
const MIN_ACTIVITY_TURNS = 4;

export function normalizeXp(totalXp: unknown) {
  if (typeof totalXp !== 'number' || !Number.isFinite(totalXp)) return 0;
  return Math.max(0, Math.floor(totalXp));
}

export function xpRequiredForLevel(level: number) {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.floor(400 + safeLevel * safeLevel * 90);
}

export function getLevelInfo(totalXp: unknown) {
  const xp = normalizeXp(totalXp);
  let level = 1;
  let remainingXp = xp;

  while (level < MAX_LEVEL_SCAN) {
    const required = xpRequiredForLevel(level);
    if (remainingXp < required) break;
    remainingXp -= required;
    level += 1;
  }

  const xpForNextLevel = xpRequiredForLevel(level);
  const xpProgress = xpForNextLevel > 0 ? Math.min(100, (remainingXp / xpForNextLevel) * 100) : 100;

  return {
    totalXp: xp,
    level,
    xpInCurrentLevel: remainingXp,
    xpPerLevel: xpForNextLevel,
    xpProgress,
    xpForNextLevel,
    totalXpForNextLevel: xp + (xpForNextLevel - remainingXp),
  };
}

export function getAccountTitle(level: number): AccountTitleKey {
  if (level >= 50) return 'aetherAscendant';
  if (level >= 35) return 'grandBinder';
  if (level >= 20) return 'masterBinder';
  if (level >= 10) return 'aetherAdept';
  if (level >= 5) return 'duelist';
  return 'noviceBinder';
}

export function getLevelReward(level: number): LevelReward | null {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= 1) return null;

  return {
    level: safeLevel,
    merits: 25,
    gold: safeLevel % 5 === 0 ? 150 : 0,
    awakeningPacks: safeLevel % 10 === 0 ? 1 : 0,
  };
}

export function getNextLevelReward(level: number) {
  return getLevelReward(Math.max(1, Math.floor(level)) + 1);
}

function hasMinimumActivity(metadata?: XpRewardMetadata) {
  return (metadata?.turnsPlayed ?? 0) >= MIN_ACTIVITY_TURNS;
}

export function calculateXpReward(reason: XpRewardReason, metadata: XpRewardMetadata = {}) {
  switch (reason) {
    case 'tutorialCompleted':
      return metadata.alreadyCompleted ? 0 : XP_REWARDS.tutorialCompleted;
    case 'aiMatchWin':
      return XP_REWARDS.aiMatchWin;
    case 'aiMatchLoss':
      return metadata.conceded || !hasMinimumActivity(metadata) ? 0 : XP_REWARDS.aiMatchLoss;
    case 'campaignMissionWin':
      return XP_REWARDS.campaignMissionWin + (metadata.firstClear ? XP_REWARDS.campaignFirstClearBonus : 0);
    case 'pvpWin':
      return XP_REWARDS.pvpWin;
    case 'pvpLoss':
      return metadata.conceded || !hasMinimumActivity(metadata) ? 0 : XP_REWARDS.pvpLoss;
    case 'pvpDraw':
      return metadata.conceded || !hasMinimumActivity(metadata) ? 0 : XP_REWARDS.pvpDraw;
    case 'packOpened':
      return XP_REWARDS.packOpened;
    case 'deckCreated':
      return metadata.meaningfulDeck && !metadata.deckCreationXpAlreadyAwarded ? XP_REWARDS.deckCreated : 0;
    case 'dailyReward':
      return metadata.alreadyClaimedToday ? 0 : XP_REWARDS.dailyReward;
    case 'achievementUnlock':
      return Math.min(
        XP_REWARDS.achievementMax,
        Math.max(XP_REWARDS.achievementMin, Math.floor(metadata.achievementXp ?? XP_REWARDS.achievementMin))
      );
    default:
      return 0;
  }
}
