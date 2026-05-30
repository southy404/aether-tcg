
export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "GOD";
export type CardType = "Unit" | "Spell" | "Trap" | "Aether" | "Relic";
export type Element = "Feuer" | "Wasser" | "Erde" | "Luft" | "Aether" | "Physisch";

export interface CardData {
  id: number;
  type: CardType;
  name: string;
  cost: number;
  rarity: Rarity;
  element: Element;
  img: string;
  img_hint: string;
  overlay_img?: string;
  default_img?: string;
  text: string;
  atk?: number;
  hp?: number;
  fokus?: number;
  set: string;
  numberInSet: number;
  totalInSet: number;
  videoUrl?: string;
  previewVideoUrl?: string;
  keywords?: {
    overcharge?: boolean;
  };
}

export interface SavedDeck {
  id: string;
  name: string;
  cardIds: number[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  coverImg: string;
  videoSrc: string | null;
  hint: string;
  opponentName: string;
  opponentImage: string;
  prerequisite?: string;
  dialogue?: {
    intro: string;
    win: string;
    lose: string;
  };
  deck: { id: number; count: number }[];
}

// --- Game State Types ---
export type PlayerId = 'player' | 'opponent';

export type Emote = {
  name: string;
  url: string;
};

export interface GameCard extends CardData {
  instanceId: string; // Unique ID for this specific card instance in the game
  owner: PlayerId;
  currentHp?: number;
  currentAtk?: number;
  currentFokus: number;
  canAttack?: boolean; // Can the unit attack this turn?
  isExhausted?: boolean;
  hasBlockedThisTurn?: boolean;
  usedFokusThisTurn?: boolean;
  attachedRelic?: GameCard;
  overcharge?: {
    used: boolean;
    damage: number;
  };
  isFrozen?: boolean;
  isEntangled?: boolean;
  isInvulnerable?: boolean;
  tempAttackBonus?: number;
  permanentAtkModifier?: number;
  tempCostModifier?: number;
  effect?: 'damage' | 'heal' | 'summon' | 'destroy' | 'activate' | 'artifact' | null;
}

export interface InspectedCard extends Partial<GameCard> {
    id: number; // id is always required
    instanceId: string; // instanceId is always required
    position?: number;
    owner?: PlayerId;
    fromHand?: boolean; // Flag to indicate if the card is being inspected from the hand
}

export type PendingChoice = {
  card: GameCard;
  abilityId: string;
  options: {
    id: string;
    text: string;
    description: string;
  }[];
} | null;

export type PlayerState = {
  id: PlayerId;
  name: string;
  hp: number;
  aether: {
    current: number;
    max: number;
  };
  deck: GameCard[];
  hand: GameCard[];
  unitZone: (GameCard | null)[];
  aetherZone: (GameCard | null)[];
  trapZone: (GameCard | null)[];
  graveyard: GameCard[];
  playedAetherThisTurn: boolean;
  playedSpellThisTurn: boolean;
  declaredAttacksThisTurn: boolean;
  usedFluxAdeptThisTurn?: boolean;
  usedFracturedAether?: boolean;
  usedWavecallerThisTurn?: boolean;
  nextSpellCostReduction: number;
  nextDamageEffectBonus: number;
  nextUnitHasHaste: boolean;
  usedAetherReactorThisGame?: boolean;
  usedAetherSpiritThisGame?: boolean;
  currentEmote: Emote | null;
  currentMessage: string | null;
  reviveQueue: { card: GameCard, turns: number }[];
};

export type GamePhase = 'start' | 'draw' | 'main' | 'combat' | 'declare-blockers' | 'end' | 'trap-activation' | 'initial-draw';

export type GameLogEntry = 
  | { type: 'text', content: string }
  | { type: 'card', cardId: number, content: string }
  | { type: 'player', playerId: PlayerId };

export type GameLog = {
  id: number;
  message: GameLogEntry[];
  type: 'info' | 'error' | 'attack' | 'chat' | 'effect';
  player?: PlayerId;
}

export type CombatAttack = {
  attacker: {
    playerId: PlayerId;
    card: GameCard;
    position: number;
    instanceId: string;
  };
  blocker?: {
    playerId: PlayerId;
    card: GameCard;
    position: number;
  } | null;
  target?: {
    type: 'player';
    playerId: PlayerId;
  } | {
    type: 'unit';
    playerId: PlayerId;
    position: number;
  };
};


export type CombatState = {
  attacks: CombatAttack[];
  isTargeting: {
    sourceCard: InspectedCard;
    abilityId: string; // e.g. 'FOKUS_ABILITY'
  } | null;
  selectedBlocker: {
    playerId: PlayerId;
    card: GameCard;
    position: number;
  } | null;
};

export type DamageIndicatorInfo = {
  id: number;
  targetId: string; // instanceId of card or PlayerId
  amount: number; // Positive for heal, negative for damage
};

export type OverchargeState = {
    card: GameCard;
    position: number;
    aether: number;
};

export type TriggerSource = 
  | { unit: GameCard }
  | { damage: number, playerId: PlayerId }
  | { spell: GameCard, target?: any }
  | { position: number, playerId: PlayerId };


export type PendingAction = 
  | { type: 'COMPLETE_CARD_PLAY', cardInstanceId: string, ownerId: PlayerId, target: any, tutorialSignal?: string }
  | { type: 'COMPLETE_UNIT_PLAY', card: GameCard, position: number }
  | { type: 'COMPLETE_SPELL_CAST_NO_COUNTER', spell: GameCard, target: any }
  | { type: 'ADVANCE_PHASE', newPhase: GamePhase, logMessage?: GameLogEntry[] }
  | { type: 'RESOLVE_TRAP', trapCard: GameCard, triggerSource: TriggerSource }
  | { type: 'RESOLVE_UNIT_PLAY', unit: GameCard, position: number };

export type MultiTarget = {
  type: 'unit' | 'player';
  playerId: PlayerId;
  position?: number;
  instanceId: string;
};

export type MultiTargetState = {
  sourceCard: GameCard;
  abilityId: 'AETHER_SHIFT' | 'CHAIN_LIGHTNING';
  maxTargets: number;
  minTargets: number;
  selectedTargets: MultiTarget[];
};

export type GameState = {
  players: {
    player: PlayerState;
    opponent: PlayerState;
  };
  turn: number;
  activePlayer: PlayerId;
  phase: GamePhase;
  log: GameLog[];
  winner: PlayerId | null;
  combatState: CombatState;
  pendingResponse: {
    card: GameCard;
    triggerSource: TriggerSource;
    type: 'TRAP' | 'COUNTER_SPELL';
  } | null;
  damageIndicators: DamageIndicatorInfo[];
  fullscreenCardAnimation: GameCard | null;
  combatAnimationState: { attacks: CombatAttack[] } | null;
  showConfirmSkipBlock: boolean;
  overchargeState: OverchargeState | null;
  pendingAction: PendingAction | null;
  pendingChoice: PendingChoice;
  multiTargetState: MultiTargetState | null;
  isPvp?: boolean;
};

export type CosmeticType = 'avatar' | 'cardBack' | 'coin' | 'frame' | 'effect' | 'playmat';

export interface EquippedCosmetics {
  avatar: string;
  cardBack: string;
  coin: string;
  frame: string;
  effect: string;
  playmat: string;
}
