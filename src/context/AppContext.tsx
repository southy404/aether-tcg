
'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect, useRef } from 'react';
import { MASTER_DB } from '@/lib/cards';
import type { CardData, CosmeticType, EquippedCosmetics, SavedDeck } from '@/lib/types';
import { cosmeticItems } from '@/lib/cosmetics';
import { playSound } from '@/lib/audio';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import {
  calculateXpReward,
  getAccountTitle,
  getLevelInfo,
  getLevelReward,
  normalizeXp,
  type LevelReward,
  type XpRewardMetadata,
  type XpRewardReason,
} from '@/lib/progression';

const generateInitialInventory = () => {
  return [] as number[];
};

const defaultEquipped: EquippedCosmetics = {
  avatar: 'avatar_0',
  cardBack: 'sleeve_0',
  coin: 'coin_1',
  frame: 'frame_1',
  effect: 'effect_1',
  playmat: 'playmat_1',
};

interface AppContextType {
  username: string;
  setUsername: (name: string) => void;
  gems: number;
  setGems: React.Dispatch<React.SetStateAction<number>>;
  gold: number;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  /** Deduct gold and persist to Firestore. Returns true on success, false if balance insufficient. */
  spendGold: (amount: number) => boolean;
  /** Deduct merits and persist to Firestore. Returns true on success, false if balance insufficient. */
  spendMerits: (amount: number) => boolean;
  inventory: number[];
  addCardsToInventory: (cardIds: number[]) => void;
  getCardById: (id: number) => CardData | undefined;
  
  // Audio state
  masterVolume: number;
  setMasterVolume: React.Dispatch<React.SetStateAction<number>>;
  musicVolume: number;
  setMusicVolume: React.Dispatch<React.SetStateAction<number>>;
  sfxVolume: number;
  setSfxVolume: React.Dispatch<React.SetStateAction<number>>;
  isMuted: boolean;
  toggleMute: () => void;
  hasInteracted: boolean;
  setUserInteracted: () => void;
  isAnimationMode: boolean;
  setIsAnimationMode: React.Dispatch<React.SetStateAction<boolean>>;

  // Cosmetics state
  ownedCosmetics: string[];
  addOwnedCosmetic: (cosmeticId: string) => void;
  equippedCosmetics: EquippedCosmetics;
  setEquippedCosmetic: (type: keyof EquippedCosmetics, cosmeticId: string) => void;

  // Deck state
  savedDecks: SavedDeck[];
  saveDeck: (name: string, cardIds: number[]) => void;
  updateDeck: (id: string, name: string, cardIds: number[]) => void;
  deleteDeck: (id: string) => void;

  // Profile state
  xp: number;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  level: number;
  accountTitle: ReturnType<typeof getAccountTitle>;
  xpProgress: number;
  xpPerLevel: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  totalXpForNextLevel: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  claimedLevelRewards: number[];
  awakeningPacks: number;
  completedTutorial: boolean;
  awardAccountXp: (reason: XpRewardReason, metadata?: XpRewardMetadata) => Promise<AccountXpAwardResult>;

  // Mission State
  completedMissions: string[];
  completeMission: (missionId: string) => void;
  
  // Auth
  isOnline: boolean;
}

export type AccountXpAwardResult = {
  reason: XpRewardReason;
  xpGained: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  rewardsGranted: LevelReward[];
  reasonLabel: string;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  
  // Profile Data States
  const [username, setUsernameState] = useState('Spieler');
  // New-player starting Merits. Kept in sync with the Firestore initial profile below
  // and the fallback when a stored profile is missing a `gems` field.
  const [gems, setGems] = useState(2000);
  const [gold, setGold] = useState(0);
  const [inventory, setInventory] = useState<number[]>([]);
  const [ownedCosmetics, setOwnedCosmetics] = useState<string[]>(['avatar_0', 'sleeve_0', 'coin_1', 'frame_1', 'effect_1', 'playmat_1']);
  const [equippedCosmetics, setEquippedCosmetics] = useState<EquippedCosmetics>(defaultEquipped);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [claimedLevelRewards, setClaimedLevelRewards] = useState<number[]>([]);
  const [awakeningPacks, setAwakeningPacks] = useState(0);
  const [completedTutorial, setCompletedTutorial] = useState(false);
  const [deckCreationXpAwarded, setDeckCreationXpAwarded] = useState(false);

  // Local-only Audio & Setting States
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [sfxVolume, setSfxVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isAnimationMode, setIsAnimationMode] = useState(true);
  const volumeBeforeMute = useRef(masterVolume);

  // Sync with Firestore if logged in
  useEffect(() => {
    if (!user || !firestore) {
        setInventory(generateInitialInventory());
        return;
    };

    const userRef = doc(firestore, 'users', user.uid);
    
    // Listen for real-time updates to the profile
    const unsubscribe = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setUsernameState(data.username || 'Spieler');
            setGems(data.gems ?? 2000);
            setGold(data.gold ?? 0);
            setInventory(data.inventory || []);
            setOwnedCosmetics(data.ownedCosmetics || []);
            setEquippedCosmetics(data.equippedCosmetics || defaultEquipped);
            setSavedDecks(data.savedDecks || []);
            setCompletedMissions(data.completedMissions || []);
            setXp(data.xp ?? 0);
            setWins(data.wins ?? 0);
            setLosses(data.losses ?? 0);
            setGamesPlayed(data.gamesPlayed ?? 0);
            setClaimedLevelRewards(data.claimedLevelRewards || []);
            setAwakeningPacks(data.awakeningPacks ?? 0);
            setCompletedTutorial(data.completedTutorial ?? false);
            setDeckCreationXpAwarded(data.deckCreationXpAwarded ?? false);
        } else {
            const initialLevel = getLevelInfo(0).level;
            // Initialize new user profile
            const initialData = {
                id: user.uid,
                username: user.displayName || 'Spieler',
                gems: 2000,
                gold: 0,
                inventory: [],
                ownedCosmetics: ['avatar_0', 'sleeve_0', 'coin_1', 'frame_1', 'effect_1', 'playmat_1'],
                equippedCosmetics: defaultEquipped,
                savedDecks: [],
                completedMissions: [],
                completedCampaignMissions: [],
                xp: 0,
                level: initialLevel,
                accountTitle: getAccountTitle(initialLevel),
                wins: 0,
                losses: 0,
                gamesPlayed: 0,
                claimedLevelRewards: [],
                completedTutorial: false,
                deckCreationXpAwarded: false,
                awakeningPacks: 0,
                dailyRewardLastClaimedAt: null,
                updatedAt: serverTimestamp(),
            };
            setDoc(userRef, initialData);
        }
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // Helper to persist changes to Firestore
  const syncToCloud = useCallback((updates: any) => {
    if (user && firestore) {
        const userRef = doc(firestore, 'users', user.uid);
        updateDoc(userRef, updates).catch(e => {
            console.error("Error syncing to cloud:", e);
        });
    }
  }, [user, firestore]);

  const setUsername = (name: string) => {
    setUsernameState(name);
    if (user) syncToCloud({ username: name });
  };

  const addCardsToInventory = (cardIds: number[]) => {
    const next = [...inventory, ...cardIds].sort((a, b) => a - b);
    setInventory(next);
    if (user) syncToCloud({ inventory: next });
  };

  // Currency helpers. setGold/setGems alone only update local React state, which is then
  // overwritten by the next Firestore snapshot on resync — so a "spent" amount silently
  // re-appears after navigation. These helpers mirror the addCardsToInventory pattern:
  // update local state AND persist to Firestore in one call.
  const spendGold = (amount: number): boolean => {
    if (amount <= 0) return true;
    if (gold < amount) return false;
    const next = gold - amount;
    setGold(next);
    if (user) syncToCloud({ gold: next });
    return true;
  };

  const spendMerits = (amount: number): boolean => {
    if (amount <= 0) return true;
    if (gems < amount) return false;
    const next = gems - amount;
    setGems(next);
    if (user) syncToCloud({ gems: next });
    return true;
  };

  const addOwnedCosmetic = (cosmeticId: string) => {
    const next = [...new Set([...ownedCosmetics, cosmeticId])];
    setOwnedCosmetics(next);
    if (user) syncToCloud({ ownedCosmetics: next });
  };

  const setEquippedCosmetic = (type: keyof EquippedCosmetics, cosmeticId: string) => {
    const next = { ...equippedCosmetics, [type]: cosmeticId };
    setEquippedCosmetics(next);
    if (user) syncToCloud({ equippedCosmetics: next });
  };

  const awardAccountXp = useCallback(async (reason: XpRewardReason, metadata: XpRewardMetadata = {}): Promise<AccountXpAwardResult> => {
    let latest: any = {};
    if (user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      const snap = await getDoc(userRef).catch(() => null);
      latest = snap?.exists() ? snap.data() : {};
    }

    const currentXp = normalizeXp(latest.xp ?? xp);
    const oldInfo = getLevelInfo(currentXp);
    const previousClaimed = new Set<number>(latest.claimedLevelRewards ?? claimedLevelRewards);
    const wasTutorialCompleted = latest.completedTutorial ?? completedTutorial;
    const wasDeckXpAwarded = latest.deckCreationXpAwarded ?? deckCreationXpAwarded;
    const completedCampaignMissions: string[] = latest.completedCampaignMissions ?? latest.completedMissions ?? completedMissions;
    const firstClear = metadata.missionId ? !completedCampaignMissions.includes(metadata.missionId) : metadata.firstClear;

    const xpGained = calculateXpReward(reason, {
      ...metadata,
      firstClear,
      alreadyCompleted: reason === 'tutorialCompleted' ? wasTutorialCompleted : metadata.alreadyCompleted,
      deckCreationXpAlreadyAwarded: reason === 'deckCreated' ? wasDeckXpAwarded : metadata.deckCreationXpAlreadyAwarded,
    });

    const newXp = currentXp + xpGained;
    const newInfo = getLevelInfo(newXp);
    const rewardsGranted: LevelReward[] = [];

    for (let levelToGrant = oldInfo.level + 1; levelToGrant <= newInfo.level; levelToGrant += 1) {
      if (previousClaimed.has(levelToGrant)) continue;
      const reward = getLevelReward(levelToGrant);
      if (reward) {
        rewardsGranted.push(reward);
        previousClaimed.add(levelToGrant);
      }
    }

    const rewardMerits = rewardsGranted.reduce((sum, reward) => sum + reward.merits, 0);
    const rewardGold = rewardsGranted.reduce((sum, reward) => sum + reward.gold, 0);
    const rewardPacks = rewardsGranted.reduce((sum, reward) => sum + reward.awakeningPacks, 0);
    const matchWin = reason === 'aiMatchWin' || reason === 'campaignMissionWin' || reason === 'pvpWin';
    const matchLoss = reason === 'aiMatchLoss' || reason === 'pvpLoss';
    const matchFinished = matchWin || matchLoss || reason === 'pvpDraw';

    const nextWins = (latest.wins ?? wins) + (matchWin ? 1 : 0);
    const nextLosses = (latest.losses ?? losses) + (matchLoss ? 1 : 0);
    const nextGamesPlayed = (latest.gamesPlayed ?? gamesPlayed) + (matchFinished ? 1 : 0);
    const nextGems = (latest.gems ?? gems) + rewardMerits;
    const nextGold = (latest.gold ?? gold) + rewardGold;
    const nextAwakeningPacks = (latest.awakeningPacks ?? awakeningPacks) + rewardPacks;
    const nextClaimedRewards = Array.from(previousClaimed).sort((a, b) => a - b);
    const nextAccountTitle = getAccountTitle(newInfo.level);

    setXp(newXp);
    setWins(nextWins);
    setLosses(nextLosses);
    setGamesPlayed(nextGamesPlayed);
    setGems(nextGems);
    setGold(nextGold);
    setAwakeningPacks(nextAwakeningPacks);
    setClaimedLevelRewards(nextClaimedRewards);

    const updates: Record<string, any> = {
      xp: newXp,
      level: newInfo.level,
      accountTitle: nextAccountTitle,
      wins: nextWins,
      losses: nextLosses,
      gamesPlayed: nextGamesPlayed,
      gems: nextGems,
      gold: nextGold,
      awakeningPacks: nextAwakeningPacks,
      claimedLevelRewards: nextClaimedRewards,
      updatedAt: serverTimestamp(),
    };

    if (reason === 'tutorialCompleted' && !wasTutorialCompleted) {
      updates.completedTutorial = true;
      setCompletedTutorial(true);
    }

    if (reason === 'deckCreated' && xpGained > 0) {
      updates.deckCreationXpAwarded = true;
      setDeckCreationXpAwarded(true);
    }

    if (reason === 'campaignMissionWin' && metadata.missionId && firstClear) {
      const nextMissions = [...new Set([...completedCampaignMissions, metadata.missionId])];
      updates.completedMissions = nextMissions;
      updates.completedCampaignMissions = nextMissions;
      setCompletedMissions(nextMissions);
    }

    if (user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, updates, { merge: true }).catch(e => {
        console.error("Error awarding account XP:", e);
      });
    }

    if (xpGained > 0 && newInfo.level > oldInfo.level) {
      playSound('lvl-up');
    }

    return {
      reason,
      xpGained,
      oldLevel: oldInfo.level,
      newLevel: newInfo.level,
      leveledUp: newInfo.level > oldInfo.level,
      rewardsGranted,
      reasonLabel: reason,
    };
  }, [
    user,
    firestore,
    xp,
    wins,
    losses,
    gamesPlayed,
    gems,
    gold,
    awakeningPacks,
    claimedLevelRewards,
    completedTutorial,
    deckCreationXpAwarded,
    completedMissions,
  ]);

  const saveDeck = (name: string, cardIds: number[]) => {
    const newDeck: SavedDeck = { id: Date.now().toString(), name, cardIds };
    const next = [...savedDecks, newDeck];
    setSavedDecks(next);
    if (user) syncToCloud({ savedDecks: next });
    void awardAccountXp('deckCreated', {
      meaningfulDeck: cardIds.length >= 40,
      deckCreationXpAlreadyAwarded: deckCreationXpAwarded,
    });
  };

  const updateDeck = (id: string, name: string, cardIds: number[]) => {
    const next = savedDecks.map(deck => deck.id === id ? { ...deck, name, cardIds } : deck);
    setSavedDecks(next);
    if (user) syncToCloud({ savedDecks: next });
  };

  const deleteDeck = (id: string) => {
    const next = savedDecks.filter(deck => deck.id !== id);
    setSavedDecks(next);
    if (user) syncToCloud({ savedDecks: next });
  };

  const completeMission = (missionId: string) => {
    if (completedMissions.includes(missionId)) return;
    const next = [...completedMissions, missionId];
    setCompletedMissions(next);
    if (user) syncToCloud({ completedMissions: next, completedCampaignMissions: next });
  };

  const levelInfo = getLevelInfo(xp);
  const { level, xpInCurrentLevel, xpPerLevel, xpProgress, xpForNextLevel, totalXpForNextLevel } = levelInfo;
  const accountTitle = getAccountTitle(level);

  const setUserInteracted = () => { if (!hasInteracted) setHasInteracted(true); };
  const getCardById = useCallback((id: number) => MASTER_DB.find(c => c.id === id), []);
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
        if (!prev) { volumeBeforeMute.current = masterVolume; setMasterVolume(0); }
        else setMasterVolume(volumeBeforeMute.current || 0.5);
        return !prev;
    });
  }, [masterVolume]);

  const value: AppContextType = {
    username, setUsername, gems, setGems, gold, setGold, spendGold, spendMerits, inventory, addCardsToInventory, getCardById,
    masterVolume, setMasterVolume, musicVolume, setMusicVolume, sfxVolume, setSfxVolume, isMuted, toggleMute,
    hasInteracted, setUserInteracted, isAnimationMode, setIsAnimationMode, ownedCosmetics, addOwnedCosmetic,
    equippedCosmetics, setEquippedCosmetic, savedDecks, saveDeck, updateDeck, deleteDeck,
    xp, setXp, level, accountTitle, xpProgress, xpInCurrentLevel, xpPerLevel, xpForNextLevel, totalXpForNextLevel,
    wins, losses, gamesPlayed, claimedLevelRewards, awakeningPacks, completedTutorial, awardAccountXp,
    completedMissions, completeMission,
    isOnline: !!user
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
