
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import type { GameState, PlayerState, GameCard, CardType, GamePhase, PlayerId, CardData, InspectedCard, CombatAttack, DamageIndicatorInfo, Emote, EquippedCosmetics, GameLog, GameLogEntry, Rarity, OverchargeState, PendingAction, MultiTargetState, MultiTarget } from '@/lib/types';
import type { Deck } from '@/lib/decks';
import { MASTER_DB } from '@/lib/cards';
import { produce } from 'immer';
import { Button, buttonVariants } from '../ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import PlayerAvatar from './PlayerAvatar';
import CardInHand from './CardInHand';
import GameZone from './GameZone';
import { ArrowRight, Shield, Hand as HandIcon, Eye, BookText, VolumeX, MessageSquare, Send, Info, ShieldAlert, Swords, MessageCircle, User, Bot, ChevronLeft, ChevronRight, Layers, Skull, Minus, Plus, Sparkles, Heart, Star, Flame, Waves, Leaf, Zap, Disc, Flag, Check, X, Maximize, Minimize, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, hasFocusCapability } from '@/lib/utils';
import { useDrop, useDragLayer, DropTargetMonitor } from 'react-dnd';
import { ItemTypes } from './CardInHand';
import CardDetailModal from './CardDetailModal';
import { StarterDecks } from '@/lib/decks';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import DamageIndicator from './DamageIndicator';
import { useAppContext, type AccountXpAwardResult } from '@/context/AppContext';
import Link from 'next/link';
import EmotePicker from './EmotePicker';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { cosmeticItems } from '@/lib/cosmetics';
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogContent } from '../ui/dialog';
import { Slider } from '../ui/slider';
import CombatAnimationModal from './CombatAnimationModal';
import { applyDamageToPlayer, applyDamageToUnit, applyFokusAbility, applyOnPlayEffect, applySpellEffect, applyTrapEffect, moveUnitToGraveyard, addLogAndToast, showDamageIndicator, getCost, getUnitCost, applyPermanentAttackDebuff, applyHealToPlayer, completeCardPlay, gainAether } from '@/lib/effects';
import { useI18n } from '@/i18n';
import EquippedPlaymatBackground from './EquippedPlaymatBackground';


interface GameBoardProps {
    playerDeck: Deck;
    startingPlayer: PlayerId;
    onReset: () => void;
    isTutorial?: boolean;
    onTutorialAction?: (action: string, card?: GameCard | any) => boolean;
    tutorialState?: any;
    isControlled?: boolean;
    initialGameState?: GameState | null;
    onDragStateChange?: (isDragging: boolean) => void;
    viewerRole?: PlayerId; 
}

// Create a context
export const GameStateContext = createContext<{
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  gameState: GameState | null;
} | null>(null);

// Create a hook to use the context
export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};

const RaritySymbol = ({ rarity }: { rarity: CardData['rarity'] }) => {
  const symbolMap: Record<CardData['rarity'], string> = {
    Common: 'C',
    Uncommon: 'UC',
    Rare: 'R',
    Epic: 'E',
    Legendary: 'L',
    GOD: 'G',
  };

  const colorMap: Record<CardData['rarity'], string> = {
    Common: 'text-white/70',
    Uncommon: 'text-green-400',
    Rare: 'text-blue-300',
    Epic: 'text-purple-400',
    Legendary: 'text-yellow-400',
    GOD: 'text-red-400',
  };

  return (
    <div className={cn("font-bold", colorMap[rarity])}>
      {symbolMap[rarity]}
    </div>
  );
};

const AetherIcon = ({ amount }: { amount:string }) => (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/50 bg-teal-500 font-bold text-[10px] text-white shadow-sm mx-0.5 align-middle">
        {amount}
    </span>
);

const parseDescription = (text: string) => {
    if (!text) return text;
    const parts = text.split(/(\[AETHER:\d+\])/g);
    return parts.map((part, index) => {
        const aetherMatch = part.match(/\[AETHER:(\d+)\]/);
        if (aetherMatch) {
            return <AetherIcon key={index} amount={aetherMatch[1]} />;
        }
        return part;
    });
};

const typeGradientClass: Record<CardType, string> = {
  Unit: 'from-red-900/80',
  Spell: 'from-blue-900/80',
  Trap: 'from-purple-900/80',
  Aether: 'from-teal-900/80',
  Relic: 'from-orange-800/80',
};

export const DetailedCard = ({ card, onVideoEnd, onOvercharge }: { card: InspectedCard, onVideoEnd?: () => void, onOvercharge?: (card: InspectedCard) => void }) => {
    const { localizeCard, cardType, element } = useI18n();
    const localizedCard = localizeCard(card as GameCard);
    const costBadgeColorClass = {
        Unit: 'bg-red-600',
        Spell: 'bg-blue-600',
        Trap: 'bg-purple-600',
        Aether: 'bg-teal-500',
        Relic: 'bg-orange-700',
    }[card.type!] || 'bg-gray-500';

    const isAnimation = card.instanceId.startsWith('attack-anim') || card.instanceId.startsWith('play-anim') || card.instanceId.startsWith('trap-anim');
    const showVideo = card.previewVideoUrl && isAnimation;
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const displayAtk = card.currentAtk !== undefined ? card.currentAtk : card.atk;
    const displayHp = card.currentHp !== undefined ? card.currentHp : card.hp;
    const displayFokus = card.currentFokus !== undefined ? card.currentFokus : card.fokus;


    useEffect(() => {
        if (showVideo && videoRef.current) {
            videoRef.current.play().catch(error => {
                console.error("Video play failed:", error);
            });
        }
    }, [showVideo]);

    return (
        <div
            className={cn(
                'w-[300px] h-[435px] bg-card rounded-2xl relative overflow-hidden',
                'card-frame', 
                'rarity-' + card.rarity
            )}
            data-ai-hint={card.img_hint}
        >
             <div className='relative w-full h-full rounded-xl overflow-hidden z-0'>
                <Image src={card.img!} alt={localizedCard.name!} fill className="object-cover" sizes="(max-width: 768px) 300px, 400px"/>
            </div>

            {card.overlay_img && (
                <div className={cn("absolute inset-0 z-20 pointer-events-none animate-gentle-pulse", isAnimation ? "" : "blur-sm")}>
                    <Image src={card.overlay_img} alt={`${localizedCard.name} overlay`} fill className="object-cover" />
                </div>
            )}

            {card.default_img && (
                 <div className="absolute inset-0 z-30 pointer-events-none">
                    <Image src={card.default_img} alt={`${localizedCard.name} default`} fill className="object-cover" />
                </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent to-60% z-20"></div>

            <div className={cn(
                "cost-badge absolute top-4 left-4 w-12 h-12 rounded-full border-2 border-white flex items-center justify-center font-bold text-2xl text-white z-40 shadow-lg",
                costBadgeColorClass
            )}>
                {card.cost}
            </div>

            {card.type === 'Unit' && (
                <div className="absolute top-4 right-4 bg-black/60 p-2 rounded-md border border-white/20 text-white text-base space-y-1.5 z-40">
                    <div className="flex items-center justify-end gap-1.5">
                        <Swords size={16} className="text-red-400" />
                        <span className={cn(
                            "font-bold text-lg text-right",
                            // Highlight when the live attack is above the base (overcharge / buffs).
                            card.atk !== undefined && displayAtk !== undefined && displayAtk > card.atk && 'text-orange-300'
                        )}>{displayAtk}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                        <Heart size={16} className="text-green-400" />
                        <span className={cn("font-bold text-lg text-right", (displayHp !== undefined && card.hp !== undefined && displayHp < card.hp) && 'text-red-400')}>{displayHp}</span>
                    </div>
                    {hasFocusCapability(card) && (
                        <div className="flex items-center justify-end gap-1.5">
                            <Star size={16} className="text-yellow-400" />
                            <span className="font-bold text-lg text-right">{displayFokus}</span>
                        </div>
                    )}
                </div>
            )}
            
            <div className="absolute inset-x-0 bottom-0 pb-3 z-40 flex flex-col justify-end h-[180px]">
                <div className="relative">
                     <div className={cn(
                        "absolute inset-y-0 left-0 w-full h-full bg-gradient-to-r to-transparent to-80%",
                        typeGradientClass[card.type!] || 'from-black/90'
                       )}></div>
                    <div className="relative flex items-center h-12 z-10">
                        <div className="px-4 leading-tight">
                            <h3 
                                className={cn(
                                    "text-xl uppercase tracking-wider", 
                                    card.rarity === 'GOD' ? "text-holo-gold font-black" :
                                    card.rarity === 'Legendary' ? "text-holo-gold font-black" : 
                                    card.rarity === 'Epic' ? "text-holo-silver font-bold" : "text-white font-bold"
                                )}
                                data-text={localizedCard.name}
                            >
                                {localizedCard.name}
                            </h3>
                            <p className="text-sm font-semibold text-gray-300 mt-0.5">
                                {cardType(card.type!)}
                                {card.type !== 'Aether' && ` | ${element(card.element!)}`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="px-4 z-40 mt-2 h-24">
                    <div className="text-base text-gray-200 overflow-hidden h-full whitespace-pre-wrap">
                        {card.keywords?.overcharge && onOvercharge && (
                             <Button onClick={() => onOvercharge(card)} className="bg-orange-600 hover:bg-orange-700 h-auto p-1 text-xs mb-1">
                                [OVERCHARGE]
                            </Button>
                        )}
                         {card.keywords?.overcharge && !onOvercharge && (
                            <span className="font-bold text-orange-400">[OVERCHARGE] </span>
                         )}
                        {parseDescription(localizedCard.text!)}
                    </div>
                </div>
                <div className="px-4 z-40 mt-2">
                    <div className="card-stats flex justify-between items-center text-xs font-mono">
                        <RaritySymbol rarity={card.rarity!} />
                        <span className="text-white">{card.set?.substring(0, 3)} {card.numberInSet}/{card.totalInSet}</span>
                    </div>
                </div>
            </div>
            
            {showVideo && (
                <video 
                    ref={videoRef}
                    src={card.previewVideoUrl} 
                    muted 
                    playsInline
                    onEnded={onVideoEnd}
                    className="absolute inset-0 w-full h-full object-cover z-20 rounded-xl"
                />
            )}

        </div>
    );
};

const CardCostIcon = ({ cardData }: { cardData: CardData | undefined }) => {
    if (!cardData) return null;

    const costBadgeColorClass = {
        Unit: 'bg-red-600',
        Spell: 'bg-blue-600',
        Trap: 'bg-purple-600',
        Aether: 'bg-teal-500',
        Relic: 'bg-orange-700',
    }[cardData.type] || 'bg-gray-500';

    return (
        <span className={cn(
            "inline-flex w-4 h-4 rounded-full border border-white/50 items-center justify-center font-bold text-[10px] text-white shadow-sm mr-1.5 align-middle",
            costBadgeColorClass
        )}>
            {cardData.cost}
        </span>
    );
};

const OverchargeModal = ({
  state,
  onConfirm,
  onCancel,
  playerState
}: {
  state: OverchargeState;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
  playerState: PlayerState;
}) => {
  const { card, aether } = state;
  const { localizeCard, t } = useI18n();
  const localizedCard = localizeCard(card);
  let maxOvercharge = Math.min(aether, (card.currentHp || 1) - 1);
  const aetherCaveCount = playerState.aetherZone.filter(c => c?.id === 83).length;
  if (card.keywords?.overcharge && aetherCaveCount > 0) {
      maxOvercharge = Math.min(aether + aetherCaveCount, (card.currentHp || 1) - 1);
  }
  
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (maxOvercharge <= 0) {
        onCancel();
    }
  }, [maxOvercharge, onCancel]);

  if (maxOvercharge <= 0) {
      return null;
  }

  const finalAtk = (card.currentAtk || 0) + amount;
  const finalHp = (card.currentHp || 0) - amount;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Overcharge: {localizedCard.name}</DialogTitle>
          <DialogDescription>
            {t('overchargeDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-sm text-muted-foreground">{t('current')}</p>
              <p className="text-xl font-bold">{card.currentAtk} ATK / {card.currentHp} HP</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('available')}</p>
              <p className="text-xl font-bold">{aether} Aether</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overcharge-slider">{t('overchargeValue', { amount })}</Label>
            <div className="flex items-center gap-4">
              <Minus className="cursor-pointer" onClick={() => setAmount(Math.max(0, amount - 1))} />
              <Slider
                id="overcharge-slider"
                min={0}
                max={maxOvercharge}
                step={1}
                value={[amount]}
                onValueChange={(val) => setAmount(val[0])}
              />
              <Plus className="cursor-pointer" onClick={() => setAmount(Math.min(maxOvercharge, amount + 1))} />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted text-center space-y-2">
            <h4 className="font-semibold">{t('preview')}</h4>
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <p className="text-lg font-bold text-green-400">{finalAtk}</p>
                    <p className="text-xs text-muted-foreground">{t('attack')}</p>
                </div>
                 <div>
                    <p className="text-lg font-bold text-red-500">-{amount}</p>
                    <p className="text-xs text-muted-foreground">{t('damage')}</p>
                </div>
                 <div>
                    <p className={cn("text-lg font-bold", finalHp <= 0 ? 'text-red-500' : 'text-green-400')}>{finalHp}</p>
                    <p className="text-xs text-muted-foreground">{t('remainingHp')}</p>
                </div>
            </div>
            {finalHp <= 0 && (
                <div className="flex items-center justify-center gap-2 text-red-500 pt-2">
                    <Skull className="h-4 w-4"/>
                    <span className="text-sm font-semibold">{t('unitDestroyed')}</span>
                </div>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel}>{t('cancel')}</Button>
          <Button onClick={() => onConfirm(amount)} disabled={amount === 0} className="overcharge-confirm-button">
            {t('confirm')} ({Math.max(0, amount - aetherCaveCount)} Aether)
          </Button>
        </AlertDialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export const createInitialState = (playerDeck: Deck, startingPlayer: PlayerId, isTutorial = false, username: string = 'Spieler'): GameState => {
  const shuffleDeck = (deck: GameCard[]): GameCard[] => {
    return deck
      .map((card) => ({ card, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ card }) => card);
  };
  
  const createDeckFromList = (cardList: {id: number, count: number}[], owner: PlayerId): GameCard[] => {
      let deck: GameCard[] = [];
      cardList.forEach(item => {
          const cardData = MASTER_DB.find(c => c.id === item.id);
          if (cardData) {
              for (let i = 0; i < item.count; i++) {
                  deck.push({
                      ...cardData,
                      instanceId: `${cardData.id}-${owner}-${Math.random()}-${i}`,
                      owner: owner,
                      currentHp: cardData.hp,
                      currentAtk: cardData.atk,
                      currentFokus: cardData.fokus || 0,
                      canAttack: false,
                      isExhausted: false,
                      hasBlockedThisTurn: false,
                      usedFokusThisTurn: false,
                      overcharge: cardData.keywords?.overcharge ? { used: false, damage: 0 } : undefined,
                      isFrozen: false,
                      isEntangled: false,
                      isInvulnerable: false,
                      tempAttackBonus: 0,
                      permanentAtkModifier: 0,
                      tempCostModifier: 0,
                  });
              }
          }
      });
      return deck;
  }

  let initialPlayerDeck = createDeckFromList(playerDeck.cards, 'player');
  const opponentDeckData = StarterDecks.find(d => d.id === 2) || StarterDecks[1];
  let initialOpponentDeck = createDeckFromList(opponentDeckData.cards, 'opponent');
  
  if (isTutorial) {
    let playerDeckCopy = [...initialPlayerDeck];

    // Pluck specific tutorial cards out of the deck so we can re-stack them in a known order.
    const pluckById = (deck: GameCard[], ids: number[], owner: PlayerId, idTag: string): GameCard[] =>
      ids.map(id => {
        const cardIndex = deck.findIndex(c => c.id === id);
        if (cardIndex > -1) {
          return deck.splice(cardIndex, 1)[0];
        }
        return { ...MASTER_DB.find(c => c.id === id)!, instanceId: `${idTag}-${id}-${Math.random()}`, owner } as GameCard;
      });

    // Cards the player should hold at the start of the duel. We DON'T pre-populate the hand —
    // instead we seed them at the deck top so the regular 'initial-draw' phase animates each
    // one in (one card per game-loop tick), just like a real match.
    const initialHandIds = [80, 14, 9, 7, 16];
    const initialHandCards = pluckById(playerDeckCopy, initialHandIds, 'player', 'tut-hand');

    // Cards the player should draw on turns 1-3 (one per turn).
    const drawCards = [4, 3, 10];
    const drawDeckPart = pluckById(playerDeckCopy, drawCards, 'player', 'tut-draw').reverse();

    // Deck layout (bottom → top, i.e. pop order is right-to-left):
    //   [...shuffled rest, ...turn-draws-reversed, ...initial-hand-reversed]
    // So pop() yields card 80 first, then 14, 9, 7, 16 (initial hand), then 4 (turn 1 draw)
    // then 3 (turn 2), then 10 (turn 3), then random.
    initialPlayerDeck = [
      ...shuffleDeck(playerDeckCopy),
      ...drawDeckPart,
      ...[...initialHandCards].reverse(),
    ];

    // AI initial hand: Aether Source (80), Icewalker (18), second Aether Source (80) for the
    // turn-2 step, plus 2 random cards from the rest of the deck.
    let opponentDeckCopy = [...initialOpponentDeck];
    const aiInitialHand: GameCard[] = pluckById(opponentDeckCopy, [80, 18, 80], 'opponent', 'tut-ai');
    aiInitialHand.push(...opponentDeckCopy.splice(0, 2));

    // AI turn-3 draw: Icebound Defender (25).
    const aiDraws = pluckById(opponentDeckCopy, [25], 'opponent', 'tut-ai-draw').reverse();
    initialOpponentDeck = [
      ...shuffleDeck(opponentDeckCopy),
      ...aiDraws,
      ...[...aiInitialHand].reverse(),
    ];

    const baseState = createInitialState(playerDeck, startingPlayer, false, username);
    baseState.players.player.deck = initialPlayerDeck;
    baseState.players.opponent.deck = initialOpponentDeck;
    baseState.players.player.hand = [];
    baseState.players.opponent.hand = [];
    // 'initial-draw' triggers the per-card draw animation in the game loop. Once 5 cards have
    // been dealt to each side, the loop flips to phase='start' on its own.
    baseState.phase = 'initial-draw';

    return baseState;
  }
  
  initialPlayerDeck = shuffleDeck(initialPlayerDeck);
  initialOpponentDeck = shuffleDeck(initialOpponentDeck);

  return {
    players: {
      player: {
        id: 'player',
        name: username,
        hp: 20,
        aether: { current: 0, max: 0 },
        deck: initialPlayerDeck,
        hand: [],
        unitZone: Array(5).fill(null),
        aetherZone: Array(5).fill(null),
        trapZone: Array(2).fill(null),
        graveyard: [],
        playedAetherThisTurn: false,
        playedSpellThisTurn: false,
        declaredAttacksThisTurn: false,
        usedFluxAdeptThisTurn: false,
        usedFracturedAether: false,
        usedWavecallerThisTurn: false,
        nextSpellCostReduction: 0,
        nextDamageEffectBonus: 0,
        nextUnitHasHaste: false,
        usedAetherReactorThisGame: false,
        usedAetherSpiritThisGame: false,
        currentEmote: null,
        currentMessage: null,
        reviveQueue: [],
      },
      opponent: {
        id: 'opponent',
        name: 'AI Binder',
        hp: 20,
        aether: { current: 0, max: 0 },
        deck: initialOpponentDeck,
        hand: [],
        unitZone: Array(5).fill(null),
        aetherZone: Array(5).fill(null),
        trapZone: Array(2).fill(null),
        graveyard: [],
        playedAetherThisTurn: false,
        playedSpellThisTurn: false,
        declaredAttacksThisTurn: false,
        usedFracturedAether: false,
        usedWavecallerThisTurn: false,
        usedAetherReactorThisGame: false,
        usedAetherSpiritThisGame: false,
        nextSpellCostReduction: 0,
        nextDamageEffectBonus: 0,
        nextUnitHasHaste: false,
        currentEmote: null,
        currentMessage: null,
        reviveQueue: [],
      },
    },
    turn: 1,
    activePlayer: startingPlayer,
    phase: 'initial-draw',
    log: [],
    winner: null,
    combatState: { attacks: [], isTargeting: null, selectedBlocker: null },
    pendingResponse: null,
    damageIndicators: [],
    fullscreenCardAnimation: null,
    combatAnimationState: null,
    showConfirmSkipBlock: false,
    overchargeState: null,
    pendingAction: null,
    pendingChoice: null,
    multiTargetState: null,
  };
}

const Hand = ({ playerState, owner, isVisible, onCardClick, cardBackImg, tutorialState, isInitialDraw, isOpponentPerspective }: { playerState: PlayerState, owner: PlayerId, isVisible: boolean, onCardClick: (card: GameCard) => void, cardBackImg: string, tutorialState?: any, isInitialDraw: boolean, isOpponentPerspective: boolean }) => {
    const isPlayer = owner === (isOpponentPerspective ? 'opponent' : 'player');
    const isTutorialHandStep = tutorialState?.isHandAction;
    const { isDragging } = useDragLayer(monitor => ({ isDragging: monitor.isDragging() }));
    const { gameState } = useContext(GameStateContext) as { gameState: GameState };

    return (
        <div className={cn(
            "absolute inset-x-0 bottom-0 w-full h-48 flex justify-center items-end transition-transform duration-300 pointer-events-none",
            !isVisible && "translate-y-full",
            isPlayer ? (isTutorialHandStep ? "z-[160]" : "z-10") : 'z-20',
            !isPlayer && 'top-0 bottom-auto',
            !isPlayer && !isVisible && "-translate-y-full"
            )}>
             <div className={cn(
                "relative h-full w-full pointer-events-none",
                 isPlayer && !isDragging && 'pointer-events-auto'
             )}>
              <div className={cn(
                "flex justify-center items-end h-48 gap-[-40px] p-2 transition-all duration-500 group/hand absolute bottom-0 w-full",
                !isPlayer && 'top-[-60px] bottom-auto items-start'
                )}>
                {playerState.hand.map((card, index) => {
                    const displayCost = gameState ? getCost(gameState, card, owner) : card.cost;
                    return isPlayer ? (
                        <CardInHand
                            key={card.instanceId}
                            card={card}
                            handCount={playerState.hand.length}
                            index={index}
                            onClick={onCardClick}
                            isHighlighted={tutorialState?.step?.highlightSelector === `#card-in-hand-${card.id}`}
                            isInitialDraw={isInitialDraw}
                            displayCost={displayCost}
                        />
                    ) : (
                         <div key={card.instanceId} className="w-[120px] h-[170px] relative transition-all duration-300" style={{
                            transform: `translateX(${(index - Math.floor(playerState.hand.length / 2)) * 30}px) rotateZ(${(index - Math.floor(playerState.hand.length / 2)) * -3}deg)`,
                            zIndex: index,
                            opacity: isVisible ? 1 : 0,
                        }}>
                             <div className="w-full h-full bg-radial-gradient border-2 border-primary rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                               <Image src={cardBackImg} alt="AETHER Card Back" fill className="object-cover rounded-md rotate-180"/>
                            </div>
                        </div>
                    )
                })}
              </div>
            </div>
        </div>
    );
};

const Graveyard = ({ graveyard, owner, cardBackImg }: { graveyard: GameCard[], owner: PlayerId, cardBackImg: string }) => {
    const { t } = useI18n();
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <div className={cn("relative w-[100px] h-[145px] cursor-pointer group")}>
                        {graveyard.length > 0 ? (
                             <div className="w-full h-full border-2 border-white/20 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                                <Image src={cardBackImg} alt="Card Back" fill className="object-cover rounded-md" />
                            </div>
                        ) : (
                            <div className="w-full h-full border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center">
                                <span className="text-xs text-white/20">{t('graveyard')}</span>
                            </div>
                        )}
                       {graveyard.length > 0 && <Badge className="absolute -top-2 -right-2">{graveyard.length}</Badge>}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{t('graveyardCount', { count: graveyard.length })}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

const triggerEmote = (draft: GameState, playerId: PlayerId, emote: Emote) => {
    draft.players[playerId].currentEmote = emote;
}

export default function GameBoard({ playerDeck, startingPlayer, onReset, isTutorial, onTutorialAction, tutorialState, isControlled, initialGameState, onDragStateChange, viewerRole = 'player' }: GameBoardProps) {
  const { t, localizeCard, gameText } = useI18n();
  const [internalGameState, setInternalGameState] = useState<GameState | null>(null);
  const [localInspectedCard, setLocalInspectedCard] = useState<InspectedCard | null>(null);
  
  let gameState = isControlled ? initialGameState : internalGameState;
  let setGameState: any = isControlled ? () => {} : setInternalGameState;
  
  if(isControlled && onTutorialAction){
      setGameState = (updater: any) => {
        if (!gameState) return;
        // Correct functional update wrapper for Immer
        const newState = typeof updater === 'function' ? updater(gameState) : updater;
        onTutorialAction('UPDATE_STATE', newState);
      }
  }

  const { isAnimationMode, setIsAnimationMode, username, masterVolume, musicVolume, hasInteracted, equippedCosmetics, setGems, awardAccountXp } = useAppContext();
  const [showSurrenderDialog, setShowSurrenderDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [xpAwardResult, setXpAwardResult] = useState<AccountXpAwardResult | null>(null);
  const battleMusicRef = useRef<HTMLAudioElement | null>(null);
  const rewardGiven = useRef(false);

  const selfId = viewerRole;
  const otherId = viewerRole === 'player' ? 'opponent' : 'player';
  const isOpponentPerspective = viewerRole === 'opponent';

  useEffect(() => {
    if (typeof window !== 'undefined' && !battleMusicRef.current) {
        battleMusicRef.current = new Audio('/battle-theme.mp3');
        battleMusicRef.current.loop = true;
    }

    const audio = battleMusicRef.current;
    if (!audio) return;

    const shouldPlay = hasInteracted && !gameState?.winner;

    audio.volume = masterVolume * musicVolume * 0.5;

    if (shouldPlay && audio.paused) {
        audio.play().catch(error => {
            if (error.name !== 'AbortError') {
                console.error("Battle music play failed:", error);
            }
        });
    } else if (!shouldPlay && !audio.paused) {
        audio.pause();
    }

    return () => {
        audio?.pause();
    };
  }, [masterVolume, musicVolume, hasInteracted, gameState?.winner]);

  const formatLevelReward = useCallback((reward: AccountXpAwardResult['rewardsGranted'][number]) => {
    return [
      reward.merits > 0 ? t('meritsReward', { amount: reward.merits }) : null,
      reward.gold > 0 ? t('goldReward', { amount: reward.gold }) : null,
      reward.awakeningPacks > 0 ? t('awakeningPackReward', { amount: reward.awakeningPacks }) : null,
    ].filter(Boolean).join(' + ');
  }, [t]);

  useEffect(() => {
    if (gameState?.winner && !rewardGiven.current) {
      const didWin = gameState.winner === selfId;
      if (didWin) {
        playSound('win');
      }

      if (!isTutorial && gameState) {
          const isPvp = !!gameState.isPvp;
          const reason = isPvp
            ? (didWin ? 'pvpWin' : 'pvpLoss')
            : (didWin ? 'aiMatchWin' : 'aiMatchLoss');

          void awardAccountXp(reason, {
            turnsPlayed: gameState.turn,
            conceded: !didWin && gameState.turn < 4,
          }).then(setXpAwardResult);

          if (didWin && !isControlled) {
              setGems(prev => prev + 100);
              // gameState here is the frozen Immer state from the previous tick — we must mutate via produce.
              setGameState(produce(draft => {
                  if (!draft) return;
                  addLogAndToast(draft, [gameText("Du hast 100 Merits für deinen Sieg erhalten!")], 'info', selfId);
              }));
          }
      }
      rewardGiven.current = true;
    }
    if (!gameState?.winner) {
        rewardGiven.current = false;
        setXpAwardResult(null);
    }
  }, [gameState?.winner, isTutorial, isControlled, setGems, gameState, selfId, awardAccountXp]);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isControlled) {
        setInternalGameState(createInitialState(playerDeck, startingPlayer, isTutorial, username));
    }
  }, [isControlled, playerDeck, startingPlayer, isTutorial, username]);
  
  const [isHandVisible, setIsHandVisible] = useState(true);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(true);
  const justToggledHand = useRef(false);
  
  const [logFilters, setLogFilters] = useState<Record<GameLog['type'] | 'player' | 'opponent', boolean>>({
    info: true,
    attack: true,
    error: true,
    chat: true,
    effect: true,
    player: true,
    opponent: true
  });
  
  const { toast } = useToast();
  const { isMuted, toggleMute, getCardById } = useAppContext();
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  const { isDragging } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  const handleMuteToggle = () => {
    toggleMute();
    if (isMuted) {
      playSound('selection');
    }
  };

  const handleEffectEnd = useCallback((instanceId: string) => {
    setGameState(produce((draft: GameState | null) => {
      if (!draft) return;

      let cardInfo: {
          card: GameCard,
          playerId: PlayerId,
          zone: 'unitZone' | 'aetherZone' | 'trapZone',
          position: number
      } | null = null;

      for (const pId of ['player', 'opponent'] as PlayerId[]) {
          const player = draft.players[pId as PlayerId];
          for (const zoneKey of ['unitZone', 'aetherZone', 'trapZone'] as const) {
              const zone = player[zoneKey];
              const cardIndex = zone.findIndex(c => c?.instanceId === instanceId);
              if (cardIndex !== -1) {
                  cardInfo = {
                      card: zone[cardIndex]!,
                      playerId: pId as PlayerId,
                      zone: zoneKey,
                      position: cardIndex,
                  };
                  break;
              }
          }
          if (cardInfo) break;
      }

      if (cardInfo) {
          const { card, playerId, zone, position } = cardInfo;
          const endedEffect = card.effect;
          
          const cardInZone = draft.players[playerId][zone][position];
          if (cardInZone) {
              cardInZone.effect = null;
          }
          
          if (endedEffect === 'destroy' && zone === 'unitZone') {
              moveUnitToGraveyard(draft, playerId, position);
          }
      }
    }));
  }, [setGameState]);

  useEffect(() => {
    if (onDragStateChange) {
        onDragStateChange(isDragging);
    }
    if (isDragging && isHandVisible) {
        setIsHandVisible(false);
    } else if (!isDragging && !isHandVisible && !justToggledHand.current) {
        setIsHandVisible(true);
    }
  }, [isDragging, onDragStateChange, isHandVisible]);

  const advanceToNextPlayer = useCallback((draft: GameState) => {
      const playerToEndId = draft.activePlayer;
      const playerToEnd = draft.players[playerToEndId];

      playerToEnd.unitZone.forEach((unit, pos) => {
          if (unit) {
            if (unit.tempAttackBonus) {
                unit.currentAtk = (unit.currentAtk || 0) - unit.tempAttackBonus;
                unit.tempAttackBonus = 0;
            }
            if (unit.isInvulnerable) {
                unit.isInvulnerable = false;
            }
             if (unit?.overcharge && unit.overcharge.damage > 0) {
              addLogAndToast(draft, [`Overcharge fügt `, {type: 'card', cardId: unit.id, content: unit.name}, ` ${unit.overcharge.damage} Schaden zu.`], 'effect', draft.activePlayer);
              applyDamageToUnit(draft, unit.overcharge.damage, playerToEndId, pos);
              unit.overcharge.damage = 0;
              if (unit.atk !== undefined) {
                  unit.currentAtk = unit.atk + (unit.permanentAtkModifier || 0);
              }
            }
             if (unit?.overcharge) {
                  unit.overcharge.used = false;
              }
            if (unit) {
              unit.isEntangled = false;
            }
            if (unit.tempCostModifier) {
                unit.tempCostModifier = 0;
            }
          }
      });
      
      draft.activePlayer = draft.activePlayer === 'player' ? 'opponent' : 'player';
      if (draft.activePlayer === startingPlayer) {
        draft.turn++;
      }
      draft.phase = 'start';
  }, [startingPlayer]);
  
    const continueAfterResponse = useCallback((draft: GameState) => {
    // Determine whether the response happened in a combat context.
    // Non-combat traps (on play / on death / on spell cast) must not advance the turn here —
    // the game loop will pick the active player's action back up on the next tick.
    const isCombatContext = draft.phase === 'combat'
        || draft.phase === 'declare-blockers'
        || draft.combatState.attacks.length > 0;

    if (!isCombatContext) {
      return;
    }

    if (draft.combatState.attacks.length > 0) {
      const canPlayerBlock = draft.players[selfId].unitZone.some(u => u && !u.isExhausted);
      if (canPlayerBlock && draft.activePlayer === otherId) {
        draft.phase = 'declare-blockers';
      } else {
        addLogAndToast(draft, [`Du kannst nicht mehr blocken.`], 'info', selfId);
        draft.combatAnimationState = { attacks: draft.combatState.attacks };
        draft.pendingAction = { type: 'ADVANCE_PHASE', newPhase: 'end' };
      }
    } else {
      addLogAndToast(draft, [`Alle Angriffe wurden gestoppt.`], 'info');
      advanceToNextPlayer(draft);
    }
  }, [advanceToNextPlayer, selfId, otherId]);

  const resolveCombat = useCallback((draft: GameState) => {
    const attackingPlayerId = draft.activePlayer;

    draft.combatState.attacks.forEach(attack => {
        const attackerCard = draft.players[attack.attacker.playerId].unitZone[attack.attacker.position];
        if (!attackerCard) return;

        if (attackerCard.element === 'Feuer') {
            playSound('fire');
        } else if (attackerCard.element === 'Luft') {
            playSound('wind');
        }

        if (attackerCard.id === 56) {
            const opponentId = attackingPlayerId === 'player' ? 'opponent' : 'player';
            addLogAndToast(draft, [{type: 'card', cardId: 56, content: 'Obryn'}, ' fügt allen gegnerischen Einheiten 1 Schaden zu.'], 'effect', attackingPlayerId);
            draft.players[opponentId].unitZone.forEach((_, pos) => applyDamageToUnit(draft, 1, opponentId, pos, attackerCard.owner));
        }
        if (attackerCard.id === 71) {
             const opponentId = attackingPlayerId === 'player' ? 'opponent' : 'player';
             addLogAndToast(draft, [{type: 'card', cardId: 71, content: 'AERION'}, ' fügt dem gegnerischen Spieler 3 Schaden zu.'], 'effect', attackingPlayerId);
             applyDamageToPlayer(draft, 3, opponentId, isTutorial, onTutorialAction, attackerCard.owner);
        }
        if (attackerCard.id === 51) {
            attackerCard.currentFokus = (attackerCard.currentFokus || 0) + 1;
            addLogAndToast(draft, [{type: 'card', cardId: attackerCard.id, content: attackerCard.name}, ` erhält 1 Fokus durch den Angriff.`], 'effect', attackingPlayerId);
        }
        if (attackerCard.id === 4) {
             draft.players[attack.attacker.playerId].unitZone.forEach(unit => {
                if (unit && unit.element === 'Feuer' && unit.instanceId !== attackerCard.instanceId) {
                    unit.currentAtk = (unit.currentAtk || 0) + 1;
                }
             });
             addLogAndToast(draft, [{type: 'card', cardId: attackerCard.id, content: attackerCard.name}, ` gibt anderen Feuer-Einheiten +1 ATK.`], 'effect', attackingPlayerId);
        }
        
        attackerCard.isExhausted = true;

        if (attack.blocker) {
            const blockerCard = draft.players[attack.blocker.playerId].unitZone[attack.blocker.position];
            if (blockerCard && attackerCard.currentAtk !== undefined && blockerCard.currentAtk !== undefined) {
                
                addLogAndToast(draft, [{type: 'card', cardId: attackerCard.id, content: attackerCard.name}, ` wird von `, {type: 'card', cardId: blockerCard.id, content: blockerCard.name}, ` geblockt!`], 'attack', attackingPlayerId);

                let attackerDamage = attackerCard.currentAtk;
                let blockerDamage = blockerCard.currentAtk;
                
                if (attackerCard.id === 68) {
                    blockerDamage *= 2;
                }
                if (blockerCard.id === 68) {
                    attackerDamage *= 2;
                }

                applyDamageToUnit(draft, attackerDamage, attack.blocker.playerId, attack.blocker.position, attackerCard.owner, isTutorial, onTutorialAction, attack.attacker);
                applyDamageToUnit(draft, blockerDamage, attack.attacker.playerId, attack.attacker.position, attackerCard.owner, isTutorial, onTutorialAction);
                
                addLogAndToast(draft, [{type: 'card', cardId: attackerCard.id, content: attackerCard.name}, ` erleidet ${blockerDamage} Schaden.`], 'info', attack.attacker.playerId);
                addLogAndToast(draft, [{type: 'card', cardId: blockerCard.id, content: blockerCard.name}, ` erleidet ${attackerDamage} Schaden.`], 'info', attack.blocker.playerId);
            }
        } 
        else if (attack.target?.type === 'player') {
            let damageDealt = attackerCard.currentAtk || 0;
            if (attackerCard.id === 2) {
                damageDealt += 1;
            }
            if (attackerCard.id === 6) {
                damageDealt += 2;
                addLogAndToast(draft, [{type: 'card', cardId: 6, content: 'Tristan'}, ' fügt +2 Bonusschaden zu.'], 'effect', attackingPlayerId);
            }
            if (attackerCard.id === 68) {
                damageDealt *= 2;
            }

            const finalDamage = applyDamageToPlayer(draft, damageDealt, attack.target.playerId, isTutorial, onTutorialAction, attackerCard.owner);
            addLogAndToast(draft, [{type: 'card', cardId: attackerCard.id, content: attackerCard.name}, ` greift ${draft.players[attack.target.playerId].name} direkt an für ${finalDamage} Schaden!`], 'attack', attackingPlayerId);
            
            if (attackerCard.id === 69) {
                const opponentId = attack.target.playerId;
                if (attackerCard.owner === 'player') {
                    draft.combatState.isTargeting = {
                        sourceCard: attackerCard,
                        abilityId: 'CHAINBLADE_ADEPT_DAMAGE'
                    };
                    addLogAndToast(draft, [{type: 'card', cardId: 69, content: 'Chainblade Adept'}, `'s Effekt wurde ausgelöst. Wähle ein Ziel für 1 Schaden.`], 'info', 'player');
                } else {
                    const validUnitTargets = draft.players[opponentId].unitZone
                        .map((u, i) => ({ unit: u, pos: i }))
                        .filter(t => t.unit !== null);
                    if (validUnitTargets.length > 0 && Math.random() < 0.5) {
                        const randomTarget = validUnitTargets[Math.floor(Math.random() * validUnitTargets.length)];
                        addLogAndToast(draft, [{type: 'card', cardId: 69, content: 'Chainblade Adept'},` fügt `, {type:'card', cardId: randomTarget.unit!.id, content: randomTarget.unit!.name}, ` 1 Schaden zu.` ], 'effect', attackerCard.owner);
                        applyDamageToUnit(draft, 1, opponentId, randomTarget.pos, attackerCard.owner);
                    } else {
                         addLogAndToast(draft, [{type: 'card', cardId: 69, content: 'Chainblade Adept'},` fügt dem gegnerischen Spieler 1 Schaden zu.` ], 'effect', attackerCard.owner);
                        applyDamageToPlayer(draft, 1, opponentId, undefined, undefined, attackerCard.owner);
                    }
                }
            }
        }
    });
    
    ['player', 'opponent'].forEach(pId => {
        const playerId = pId as PlayerId;
        draft.players[playerId].unitZone.forEach((unit) => {
            if (unit && unit.currentHp !== undefined && unit.currentHp <= 0) {
                unit.effect = 'destroy';
            }
        });
    });

    const activePlayerUnits = draft.players[draft.activePlayer].unitZone;
    activePlayerUnits.forEach(unit => {
        if(unit && unit.atk !== undefined && unit.overcharge?.damage === 0) {
            unit.currentAtk = unit.atk + (unit.permanentAtkModifier || 0);
        }
    });


    ['player', 'opponent'].forEach(pId => {
        const playerId = pId as PlayerId;
        if (draft.players[playerId].hp <= 0) {
            draft.players[playerId].hp = 0;
            const winnerId = playerId === 'player' ? 'opponent' : 'player';
            draft.winner = winnerId;
            addLogAndToast(draft, [{type: 'player', playerId: winnerId}, ` hat das Spiel gewonnen!`]);
        }
    });

    draft.combatState = { attacks: [], isTargeting: null, selectedBlocker: null };
  }, [isTutorial, onTutorialAction]);
  
    const handleDropCard = useCallback((item: GameCard, target: any) => {
        const card = item;
        if (isTutorial && onTutorialAction) {
            let actionType = '';
            if (card.type === 'Aether' && target.zone === 'Aether') actionType = 'playAether';
            if (card.type === 'Trap' && target.zone === 'Trap') actionType = 'playTrap';
            if (card.type === 'Unit' && target.zone === 'Unit') actionType = 'playUnit';
            if (card.type === 'Relic' && target.type === 'unit') actionType = 'playRelic';
            if (card.type === 'Spell') actionType = 'playSpell';
            
            if (!onTutorialAction(actionType, card)) {
                return;
            }
        }

        setGameState(
          produce((draft) => {
            if (!draft || draft.winner || draft.fullscreenCardAnimation || draft.combatAnimationState) return;

            const cardFromHand = draft.players[card.owner].hand.find(c => c.instanceId === card.instanceId);
            if (!cardFromHand) return;
            
            const player = draft.players[cardFromHand.owner];
            const cardCost = getCost(draft, cardFromHand, cardFromHand.owner);

            if (draft.activePlayer !== cardFromHand.owner || draft.phase !== 'main') {
                if (cardFromHand.owner === selfId) {
                  addLogAndToast(draft, [`Du kannst nur in deiner Hauptphase Karten ausspielen.`], 'error', selfId);
                  playSound('negative');
                }
                return;
            }

            if (player.aether.current < cardCost) {
                if (cardFromHand.owner === selfId) {
                  addLogAndToast(draft, [`Nicht genug Aether: benötigt ${cardCost}, hast ${player.aether.current}.`], 'error', selfId);
                  playSound('negative');
                }
                return;
            }
            if (cardFromHand.type === 'Aether' && player.playedAetherThisTurn) {
                if (cardFromHand.owner === selfId) {
                  addLogAndToast(draft, ["Du kannst nur eine Aether-Karte pro Zug spielen."], "error", selfId);
                  playSound('negative');
                }
                return;
            }
            
            const shouldAnimate = isAnimationMode && cardFromHand.previewVideoUrl && cardFromHand.type !== 'Trap';
            
            if (shouldAnimate) {
                draft.pendingAction = { 
                  type: 'COMPLETE_CARD_PLAY', 
                  cardInstanceId: cardFromHand.instanceId,
                  ownerId: cardFromHand.owner,
                  target,
                };
                draft.fullscreenCardAnimation = { ...cardFromHand, instanceId: `play-anim-${cardFromHand.id}` };
            } else {
                 if (completeCardPlay(draft, cardFromHand.instanceId, cardFromHand.owner, target) && isTutorial && onTutorialAction) {
                    onTutorialAction('SUCCESS');
                 }
            }
          })
        );
    }, [isAnimationMode, setGameState, isTutorial, onTutorialAction, selfId]);

 const runTutorialAILogic = useCallback((draft: GameState) => {
    if (!isTutorial || !tutorialState) return;

    const { step } = tutorialState;
    const ai = draft.players.opponent;
    const canPlaySomething = (card: GameCard) => getCost(draft, card, 'opponent') <= ai.aether.current;
    let actionTaken = false;

    const playCard = (card: GameCard, target: any) => {
        if (isAnimationMode && card.previewVideoUrl) {
            draft.pendingAction = { type: 'COMPLETE_CARD_PLAY', cardInstanceId: card.instanceId, ownerId: 'opponent', target };
            draft.fullscreenCardAnimation = { ...card, instanceId: `play-anim-${card.id}` };
        } else {
            completeCardPlay(draft, card.instanceId, 'opponent', target);
        }
        actionTaken = true;
    };

    if (draft.phase !== 'main') return;

    if (step.id === 'await-opponent-aether-1' && !ai.playedAetherThisTurn) {
        const aetherCard = ai.hand.find(c => c.id === 80);
        if (aetherCard && canPlaySomething(aetherCard)) {
            playCard(aetherCard, { type: 'zone', zone: 'Aether', position: ai.aetherZone.findIndex(s => s === null) });
            return;
        }
    }

    if (step.id === 'await-opponent-unit-1' && !ai.unitZone.some(u => u?.id === 18)) {
        const unitCard = ai.hand.find(c => c.id === 18);
        if (unitCard && canPlaySomething(unitCard)) {
            playCard(unitCard, { type: 'zone', zone: 'Unit', position: ai.unitZone.findIndex(s => s === null) });
            return;
        }
    }

    if (step.id === 'await-opponent-aether-2' && !ai.playedAetherThisTurn) {
        const aetherCard = ai.hand.find(c => c.type === 'Aether');
        if (aetherCard && canPlaySomething(aetherCard)) {
            playCard(aetherCard, { type: 'zone', zone: 'Aether', position: ai.aetherZone.findIndex(s => s === null) });
            return;
        }
    }

    if (step.id === 'await-opponent-defender-3' && !ai.unitZone.some(u => u?.id === 25)) {
        const unitCard = ai.hand.find(c => c.id === 25);
        if (unitCard && canPlaySomething(unitCard)) {
            playCard(unitCard, { type: 'zone', zone: 'Unit', position: ai.unitZone.findIndex(s => s === null) });
            return;
        }
    }

    // The previous version unconditionally set phase=combat for every step that didn't have a
    // matching action. That caused the AI to end its main phase the instant it ticked through
    // intermediate narration steps (opponent-turn-1-start, opponent-draws-1, opponent-plays-aether-1, …)
    // — so by the time the tutorial reached await-opponent-unit-1 the AI was already past combat
    // and the tutorial stalled forever.
    //
    // We now only end the main phase at explicit terminal steps. Between these the AI sits in
    // main phase and waits for the spirit's narration / autoAdvance ticker to land on the next
    // await-* step.
    const endsMainPhase =
        step.id === 'opponent-turn-end-1' ||
        step.id === 'await-opponent-attack-2' ||
        step.id === 'opponent-turn-end-3';

    if (endsMainPhase && !actionTaken && !draft.pendingAction && !draft.fullscreenCardAnimation) {
        draft.phase = 'combat';
    }
 }, [isTutorial, tutorialState, isAnimationMode]);

 const runAILogic = useCallback((draft: GameState) => {
    if (draft.winner || draft.activePlayer !== 'opponent' || draft.phase !== 'main' || draft.pendingAction || draft.fullscreenCardAnimation) return;

    if (isTutorial) {
        runTutorialAILogic(draft);
        return;
    }
    
    const ai = draft.players.opponent;
    const canPlaySomething = (card: GameCard) => getCost(draft, card, 'opponent') <= ai.aether.current;

    const playableAetherCard = !ai.playedAetherThisTurn ? ai.hand.find(c => c.type === 'Aether') : undefined;
    if (playableAetherCard && canPlaySomething(playableAetherCard)) {
        const aetherSlotIndex = ai.aetherZone.findIndex(s => s === null);
        if (aetherSlotIndex !== -1) {
             const target = { type: 'zone', zone: 'Aether', position: aetherSlotIndex };
            if (isAnimationMode && playableAetherCard.previewVideoUrl) {
                draft.pendingAction = { 
                    type: 'COMPLETE_CARD_PLAY', 
                    cardInstanceId: playableAetherCard.instanceId,
                    ownerId: 'opponent', 
                    target
                };
                draft.fullscreenCardAnimation = { ...playableAetherCard, instanceId: `play-anim-${playableAetherCard.id}` };
            } else {
                completeCardPlay(draft, playableAetherCard.instanceId, 'opponent', target);
            }
            return;
        }
    }

    const playableUnits = ai.hand
        .filter(c => c.type === 'Unit' && canPlaySomething(c))
        .sort((a, b) => b.cost - a.cost);

    if (playableUnits.length > 0) {
        const unitSlotIndex = ai.unitZone.findIndex(s => s === null);
        if (unitSlotIndex !== -1) {
             const target = { type: 'zone', zone: 'Unit', position: unitSlotIndex };
             const cardToPlay = playableUnits[0];
             if (isAnimationMode && cardToPlay.previewVideoUrl) {
                 draft.pendingAction = { 
                    type: 'COMPLETE_CARD_PLAY', 
                    cardInstanceId: cardToPlay.instanceId,
                    ownerId: 'opponent', 
                    target
                };
                draft.fullscreenCardAnimation = { ...cardToPlay, instanceId: `play-anim-${cardToPlay.id}` };
            } else {
                completeCardPlay(draft, cardToPlay.instanceId, 'opponent', target);
            }
            return;
        }
    }

    if (!draft.pendingAction && !draft.fullscreenCardAnimation) {
        draft.phase = 'combat';
    }
}, [isAnimationMode, isTutorial, runTutorialAILogic]);
  
  const endAITurnLogic = useCallback((draft: GameState) => {
    if (draft.winner || draft.activePlayer !== 'opponent' || draft.phase !== 'combat' || draft.pendingAction || draft.fullscreenCardAnimation || draft.combatAnimationState || draft.players.opponent.declaredAttacksThisTurn) return;
    
    draft.players.opponent.declaredAttacksThisTurn = true;
        
    const hasMireya = draft.players.player.unitZone.some(u => u?.id === 23);
    const unitsToAttack = draft.players.opponent.unitZone.filter((unit) => {
        if (!unit || unit.isExhausted || unit.isFrozen || unit.isEntangled || !unit.currentAtk || unit.currentAtk <= 0) return false;
        if (hasMireya && unit.cost <= 3) {
            addLogAndToast(draft, [{type: 'card', cardId: 23, content: 'Mireya'},`'s Aura verhindert den Angriff von `, {type: 'card', cardId: unit.id, content: unit.name},`.`], 'effect', 'player');
            return false;
        }
        return true;
    });
    
    if (isTutorial) {
        if (draft.turn === 1) {
            unitsToAttack.length = 0;
        } else if (draft.turn === 2) {
            const iceWalker = draft.players.opponent.unitZone.find(u => u?.id === 18);
            if (iceWalker) {
                unitsToAttack.splice(0, unitsToAttack.length, iceWalker);
            };
        } else if (draft.turn === 3) {
            unitsToAttack.length = 0;
        }
    }
    
    unitsToAttack.forEach((unit) => {
        if(!unit) return;
        const index = draft.players.opponent.unitZone.findIndex(u => u?.instanceId === unit.instanceId);
        if (index > -1) {
            const attack: CombatAttack = {
                attacker: { playerId: 'opponent', card: unit, position: index, instanceId: unit.instanceId },
                target: { type: 'player', playerId: 'player' }
            };
            addLogAndToast(draft, [{type: 'player', playerId: 'opponent'},`'s `, {type: 'card', cardId: unit.id, content: unit.name}, ` deklariert einen Angriff.`], 'attack', 'opponent');
            draft.combatState.attacks.push(attack);
        }
    });
    
    if (draft.combatState.attacks.length > 0 && Math.random() < 0.4) {
      triggerEmote(draft, 'opponent', { name: 'laugh', url: '/emotes/laugh.png' });
    }

    if (draft.combatState.attacks.length > 0) {
        const playerTraps = draft.players.player.trapZone.filter((t): t is GameCard => t !== null);
        if (playerTraps.length > 0) {
            const trap = playerTraps.find(t => [14, 30, 47, 62, 78].includes(t.id));
            if (trap) {
                if (trap.owner === 'player') {
                    draft.pendingResponse = {
                        card: trap,
                        triggerSource: { playerId: 'opponent', position: draft.combatState.attacks[0].attacker.position },
                        type: 'TRAP'
                    };
                } else {
                    if (Math.random() < 0.8) {
                        applyTrapEffect(draft, trap, { playerId: 'opponent', position: draft.combatState.attacks[0].attacker.position });
                    }
                }
                return;
            }
        }
          
        const canPlayerBlock = draft.players.player.unitZone.some(u => u && !u.isExhausted);
        if (canPlayerBlock) {
            draft.phase = 'declare-blockers';
        } else {
            addLogAndToast(draft, [`Du kannst nicht blocken.`], 'info', 'player');
            draft.combatAnimationState = { attacks: draft.combatState.attacks };
            draft.pendingAction = { type: 'ADVANCE_PHASE', newPhase: 'end' };
        }
     } else {
       addLogAndToast(draft, [{type: 'player', playerId: 'opponent'}, ` greift nicht an.`], 'info', 'opponent');
       if (isTutorial && onTutorialAction) {
          onTutorialAction('AI_TURN_END');
       }
       advanceToNextPlayer(draft);
    }
}, [advanceToNextPlayer, isTutorial, onTutorialAction]);

  // AI defending logic. When the HUMAN (selfId) declares attacks, nextPhase flips the phase to
  // 'declare-blockers' so the AI defender can respond — but nothing previously made the AI choose
  // blockers or resolve combat, so the match froze forever at "AI can declare blockers".
  // This picks blockers heuristically, then resolves combat and passes the turn.
  const runAIBlockLogic = useCallback((draft: GameState) => {
    if (draft.winner || draft.isPvp) return;
    if (draft.phase !== 'declare-blockers' || draft.activePlayer !== selfId) return;

    const defenderId = otherId; // the AI is defending against the human's attacks
    const defender = draft.players[defenderId];

    const unblockedAttacks = () => draft.combatState.attacks.filter(a => !a.blocker);
    const incomingTotal = unblockedAttacks().reduce((sum, a) => sum + (a.attacker.card.currentAtk || 0), 0);
    const facingLethal = incomingTotal >= defender.hp;

    // Spend blockers on the biggest threats first.
    const threats = unblockedAttacks().sort(
      (a, b) => (b.attacker.card.currentAtk || 0) - (a.attacker.card.currentAtk || 0)
    );

    const usedBlockers = new Set<string>();

    for (const attack of threats) {
      const attackerCard = attack.attacker.card;
      if ((attackerCard.currentAtk || 0) <= 0) continue;

      const candidates = defender.unitZone
        .map((unit, pos) => ({ unit, pos }))
        .filter((c): c is { unit: GameCard; pos: number } =>
          !!c.unit &&
          (c.unit.currentHp || 0) > 0 &&
          !c.unit.isFrozen &&
          !c.unit.isEntangled &&
          // Icebound Defender (25) can block any number of attackers; everyone else blocks once.
          (c.unit.id === 25 || (!c.unit.isExhausted && !usedBlockers.has(c.unit.instanceId))) &&
          // Stormrunner (67) cannot be blocked by units with cost 3 or less.
          !(attackerCard.id === 67 && getUnitCost(c.unit) <= 3)
        );

      if (candidates.length === 0) continue;

      const survivors = candidates.filter(c => (c.unit.currentHp || 0) > (attackerCard.currentAtk || 0));
      const killers = candidates.filter(c => (c.unit.currentAtk || 0) >= (attackerCard.currentHp || 0));

      let pick: { unit: GameCard; pos: number } | null = null;

      const survivorKiller = survivors.find(c => (c.unit.currentAtk || 0) >= (attackerCard.currentHp || 0));
      if (survivorKiller) {
        pick = survivorKiller; // best case: survives the hit AND kills the attacker
      } else if (survivors.length > 0) {
        // Just survives: use the lowest-HP survivor to preserve bigger walls.
        pick = [...survivors].sort((a, b) => (a.unit.currentHp || 0) - (b.unit.currentHp || 0))[0];
      } else if (killers.length > 0 && (attackerCard.currentAtk || 0) >= 3) {
        // Trade: a chump that dies but takes down a sizeable attacker.
        pick = [...killers].sort((a, b) => (a.unit.currentHp || 0) - (b.unit.currentHp || 0))[0];
      } else if (facingLethal) {
        // Desperation chump block to avoid dying this turn.
        pick = [...candidates].sort((a, b) => (a.unit.currentHp || 0) - (b.unit.currentHp || 0))[0];
      }

      if (!pick) continue;

      attack.blocker = { playerId: defenderId, card: pick.unit, position: pick.pos };
      pick.unit.hasBlockedThisTurn = true;
      if (pick.unit.id !== 25) {
        pick.unit.isExhausted = true;
        usedBlockers.add(pick.unit.instanceId);
      }
      addLogAndToast(
        draft,
        [{ type: 'card', cardId: pick.unit.id, content: pick.unit.name }, ` blockiert nun `, { type: 'card', cardId: attackerCard.id, content: attackerCard.name }, `.`],
        'info',
        defenderId
      );
    }

    // Now resolve combat and hand the turn back.
    if (isAnimationMode && draft.combatState.attacks.length > 0) {
      draft.pendingAction = { type: 'ADVANCE_PHASE', newPhase: 'end' };
      draft.combatAnimationState = { attacks: draft.combatState.attacks };
    } else {
      resolveCombat(draft);
      if (draft.winner) return;
      advanceToNextPlayer(draft);
    }
  }, [selfId, otherId, isAnimationMode, resolveCombat, advanceToNextPlayer]);

 useEffect(() => {
    if (!gameState || gameState.winner || gameState.pendingAction || gameState.fullscreenCardAnimation || gameState.pendingResponse || gameState.combatAnimationState || gameState.multiTargetState) {
        return;
    }
    
    let timeoutId: NodeJS.Timeout;

    const gameLoop = () => {
        if (gameState.isPvp && gameState.activePlayer !== selfId) return;

        setGameState(produce(draft => {
            if (!draft || draft.pendingResponse) return;
            
            const activePlayerState = draft.players[draft.activePlayer];

            if (draft.phase === 'initial-draw') {
                const playerDrawComplete = draft.players.player.hand.length >= 5;
                const opponentDrawComplete = draft.players.opponent.hand.length >= 5;

                if (!playerDrawComplete) {
                    const playerCard = draft.players.player.deck.pop();
                    if (playerCard) {
                      draft.players.player.hand.push(playerCard);
                      playSound('cards');
                    }
                }
                if (!opponentDrawComplete) {
                    const opponentCard = draft.players.opponent.deck.pop();
                    if (opponentCard) draft.players.opponent.hand.push(opponentCard);
                }

                if (playerDrawComplete && opponentDrawComplete) {
                    draft.phase = 'start';
                }
            } else if (draft.phase === 'start') {
                if (draft.turn === 1 && draft.activePlayer === startingPlayer) {
                    playSound('start');
                }

                activePlayerState.aether.max = Math.min(10, activePlayerState.aether.max + 1);
                activePlayerState.aether.current = activePlayerState.aether.max;

                const playerToRevive = draft.players[draft.activePlayer];
                playerToRevive.reviveQueue = playerToRevive.reviveQueue.filter(item => {
                    item.turns -= 1;
                    if (item.turns <= 0) {
                        const freeSlot = playerToRevive.unitZone.findIndex(u => u === null);
                        if (freeSlot !== -1) {
                            const revivedCard = { ...item.card, currentHp: 3, isExhausted: false };
                            playerToRevive.unitZone[freeSlot] = revivedCard;
                            addLogAndToast(draft, [{type: 'card', cardId: item.card.id, content: item.card.name}, ` wurde wiederbelebt!`], 'effect', draft.activePlayer);
                            return false;
                        }
                    }
                    return true;
                });

                activePlayerState.unitZone.forEach(unit => {
                    if (unit && unit.id === 24 && activePlayerState.id === unit.owner) {
                        const opponentId = draft.activePlayer === 'player' ? 'opponent' : 'player';
                        const validTargets = draft.players[opponentId].unitZone
                            .map((u, i) => ({ unit: u, pos: i }))
                            .filter(t => t.unit !== null);

                        if (validTargets.length > 0) {
                            if (draft.activePlayer === 'opponent' && !draft.isPvp) {
                                const target = validTargets.reduce((prev, current) => ((prev.unit?.currentAtk || 0) > (current.unit?.currentAtk || 0) ? prev : current));
                                if (target.unit) {
                                    applyPermanentAttackDebuff(draft, 1, opponentId, target.pos);
                                    addLogAndToast(draft, [{type: 'card', cardId: 24, content: 'Water Elementar'}, ` reduziert den Angriff von `, {type: 'card', cardId: target.unit.id, content: target.unit.name}, `.`] , 'effect', draft.activePlayer);
                                }
                            } else if (draft.activePlayer === selfId) {
                                if (!draft.combatState.isTargeting) {
                                    addLogAndToast(draft, [`Wähle ein Ziel für `, {type: 'card', cardId: unit.id, content: unit.name},`'s Fähigkeit.`], 'info', draft.activePlayer);
                                    draft.combatState.isTargeting = {
                                        sourceCard: unit,
                                        abilityId: 'WATER_ELEMENTAR_DEBUFF'
                                    };
                                }
                            }
                        }
                    }
                   if (unit && unit.id === 88 && activePlayerState.id === unit.owner) {
                       activePlayerState.aether.current += 1;
                       activePlayerState.aether.max += 1;
                       addLogAndToast(draft, [{type:'card', cardId: unit.id, content: unit.name},` erhöht deinen Aether-Vorrat.`], 'effect', unit.owner);
                   }
                });


                activePlayerState.unitZone.forEach(unit => {
                    if (unit) {
                        if (unit.isFrozen) {
                            unit.isExhausted = true;
                            unit.isFrozen = false;
                            addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, ` ist eingefroren und überspringt diesen Zug.`], 'effect', draft.activePlayer);
                        } else {
                            unit.isExhausted = false;
                        }
                        unit.hasBlockedThisTurn = false;
                        unit.usedFokusThisTurn = false;
                        if (unit.overcharge) {
                            unit.overcharge.used = false;
                        }
                        if (unit.isInvulnerable) {
                            unit.isInvulnerable = false;
                        }
                        if (unit.tempAttackBonus) {
                            unit.currentAtk = (unit.currentAtk || 0) - unit.tempAttackBonus;
                            unit.tempAttackBonus = 0;
                        }
                    }
                });
                
                if (activePlayerState.id === startingPlayer) {
                    const treants = activePlayerState.unitZone.filter(u => u?.id === 57);
                    if (treants.length > 0) {
                        const healAmount = 2 * treants.length;
                        applyHealToPlayer(draft, healAmount, startingPlayer);
                        addLogAndToast(draft, [`Ancient Treant(s) heilen dich um ${healAmount}.`], 'effect', startingPlayer);
                    }
                }

                activePlayerState.playedAetherThisTurn = false;
                activePlayerState.declaredAttacksThisTurn = false;
                activePlayerState.usedFluxAdeptThisTurn = false;
                activePlayerState.usedFracturedAether = false;
                activePlayerState.usedWavecallerThisTurn = false;
                
                addLogAndToast(draft, [{type: 'player', playerId: draft.activePlayer}, " Zug " + draft.turn + "."], 'info', draft.activePlayer);
                draft.phase = 'draw';
            } else if (draft.phase === 'draw') {
                if (activePlayerState.deck.length > 0) {
                    const newCard = activePlayerState.deck.pop();
                    if (newCard) {
                        activePlayerState.hand.push(newCard);
                        playSound('cards');
                    }
                } else {
                    addLogAndToast(draft, [{type: 'player', playerId: draft.activePlayer}, ` hat keine Karten mehr und verliert!`], 'error', draft.activePlayer);
                    draft.winner = draft.activePlayer === 'player' ? 'opponent' : 'player';
                }
                draft.phase = 'main';
            } else if (draft.activePlayer === 'opponent' && draft.phase === 'main' && !draft.isPvp) {
                runAILogic(draft);
            } else if (draft.activePlayer === 'opponent' && draft.phase === 'combat' && !draft.isPvp) {
                endAITurnLogic(draft);
            } else if (draft.activePlayer === selfId && draft.phase === 'declare-blockers' && !draft.isPvp) {
                // Human attacked, AI must now choose blockers and resolve combat.
                runAIBlockLogic(draft);
            }
        }));
    };
    
    // The initial-draw phase ticks faster so the opening hand fans in quickly — same pacing
    // for tutorial and regular games.
    const loopTimeout = gameState.phase === 'initial-draw' ? 300 : 1000;
    timeoutId = setTimeout(gameLoop, loopTimeout);
    
    return () => {
        if(timeoutId) clearTimeout(timeoutId);
    };
  }, [gameState, setGameState, startingPlayer, runAILogic, endAITurnLogic, runAIBlockLogic, continueAfterResponse, selfId]);
  
  const onCombatAnimationEnd = useCallback(() => {
    setGameState(produce(draft => {
        if (!draft || draft.fullscreenCardAnimation) return;
        
        if (draft.combatAnimationState) {
            resolveCombat(draft);
        }
        
        draft.combatAnimationState = null;
        if(draft.winner) return;

        if (draft.pendingAction?.type === 'ADVANCE_PHASE' && draft.pendingAction.newPhase === 'end') {
          advanceToNextPlayer(draft);
        }
        draft.pendingAction = null;
    }));
  }, [setGameState, advanceToNextPlayer, resolveCombat]);

  const onVideoEnd = useCallback(() => {
    setGameState(produce(draft => {
      if (!draft || !draft.pendingAction || draft.fullscreenCardAnimation === null) {
          if(draft && draft.fullscreenCardAnimation) draft.fullscreenCardAnimation = null;
          return;
      };

      const { pendingAction } = draft;

      // The fullscreen card video is finished — always clear it.
      draft.fullscreenCardAnimation = null;

      if (pendingAction.type === 'COMPLETE_CARD_PLAY') {
          if (completeCardPlay(draft, pendingAction.cardInstanceId, pendingAction.ownerId, pendingAction.target)) {
              if (isTutorial && onTutorialAction) {
                  onTutorialAction('SUCCESS');
              }
          }
          draft.pendingAction = null;
      } else if (pendingAction.type === 'RESOLVE_TRAP') {
          applyTrapEffect(draft, pendingAction.trapCard, pendingAction.triggerSource);
          // Clear the consumed RESOLVE_TRAP action BEFORE continueAfterResponse runs.
          // continueAfterResponse may queue a fresh ADVANCE_PHASE action (+ combatAnimationState)
          // to resolve the remaining attacks — if we cleared pendingAction *after* this call
          // (as the old code did) we would wipe that follow-up and the turn would never advance,
          // freezing the match after a combat trap resolves.
          draft.pendingAction = null;
          continueAfterResponse(draft);
          if (isTutorial && onTutorialAction) {
              onTutorialAction('SUCCESS');
          }
      } else if(pendingAction.type === 'ADVANCE_PHASE') {
         if (pendingAction.logMessage) {
            addLogAndToast(draft, pendingAction.logMessage);
        }
         if (pendingAction.newPhase === 'end') {
            resolveCombat(draft);
            if (draft.winner) return;
            advanceToNextPlayer(draft);
        } else {
            draft.phase = pendingAction.newPhase;
        }
         if (isTutorial && onTutorialAction) {
            onTutorialAction('SUCCESS');
        }
        draft.pendingAction = null;
      } else {
        draft.pendingAction = null;
      }
    }));
  }, [setGameState, resolveCombat, advanceToNextPlayer, isTutorial, onTutorialAction, continueAfterResponse]);

  const handleConfirmBlocks = () => {
    playSound('selection');
    setGameState(produce(draft => {
        if (!draft) return;
        if (draft.fullscreenCardAnimation || draft.combatAnimationState) return;

        const hasUnassignedBlocker = draft.combatState.selectedBlocker && !draft.combatState.attacks.some(a => {
            const isThisBlockerAssigned = a.blocker?.card.instanceId === draft.combatState.selectedBlocker?.card.instanceId;
            if (draft.combatState.selectedBlocker.card.id === 25) {
                return draft.combatState.attacks.some(atk => atk.blocker?.card.id === 25);
            }
            return isThisBlockerAssigned;
        });
        
        if (hasUnassignedBlocker) {
            draft.showConfirmSkipBlock = true;
        } else {
            if (isAnimationMode && draft.combatState.attacks.length > 0) {
                draft.pendingAction = { type: 'ADVANCE_PHASE', newPhase: 'end' };
                draft.combatAnimationState = { attacks: draft.combatState.attacks };
            } else {
                resolveCombat(draft);
                if (draft.winner) return;
                advanceToNextPlayer(draft);
            }
        }
    }));
};
  
  const skipBlocking = () => {
    setGameState(produce(draft => {
        if (draft) {
            if (draft.fullscreenCardAnimation || draft.combatAnimationState) return;
            draft.showConfirmSkipBlock = false;
            draft.combatState.selectedBlocker = null;

            if (isAnimationMode && draft.combatState.attacks.length > 0) {
                draft.pendingAction = { type: 'ADVANCE_PHASE', newPhase: 'end', logMessage: [{type: 'text', content: 'Du hast dich entschieden, nicht zu blocken.'}] };
                draft.combatAnimationState = { attacks: draft.combatState.attacks };
            } else {
                resolveCombat(draft);
                if(draft.winner) return;
                advanceToNextPlayer(draft);
                addLogAndToast(draft, ['Du hast dich entschieden, nicht zu blocken.'], 'info', selfId);
            }
        }
    }));
  };
  
  const handleResponse = useCallback((activate: boolean) => {
    if (isTutorial && tutorialState?.step.id === 'activate-trap' && !activate) {
        playSound('negative');
        return;
    }
    
    setGameState(produce(draft => {
        if (!draft || !draft.pendingResponse || !draft.pendingResponse.card) return;
        
        const currentResponse = draft.pendingResponse;
        draft.pendingResponse = null; 
        
        const { card, triggerSource, type } = currentResponse;

        if (activate) {
            if (isTutorial && onTutorialAction && !onTutorialAction('activate-trap')) {
                return;
            }

            if (type === 'COUNTER_SPELL') {
                applySpellEffect(draft, card, triggerSource);
            } else {
                const isTargetingTrap = [30, 63].includes(card.id);

                if (isAnimationMode && card.previewVideoUrl && !isTargetingTrap) {
                    draft.pendingAction = { type: 'RESOLVE_TRAP', trapCard: card, triggerSource };
                    draft.fullscreenCardAnimation = { ...card, instanceId: `trap-anim-${card.id}` };
                } else {
                    applyTrapEffect(draft, card, triggerSource);
                    if (!draft.combatState.isTargeting) {
                        continueAfterResponse(draft);
                    }
                }
            }
            
            if (isTutorial && onTutorialAction) onTutorialAction('SUCCESS');
        } else {
            addLogAndToast(draft, [{type: 'player', playerId: selfId}, ` hat sich entschieden, `, {type: 'card', cardId: currentResponse.card.id, content: currentResponse.card.name}, ` nicht zu aktivieren.`], 'info', selfId);
            continueAfterResponse(draft);
        }
    }));
  }, [setGameState, continueAfterResponse, isAnimationMode, isTutorial, onTutorialAction, tutorialState, selfId]);

  
  const handleViewPendingResponse = () => {
    if (gameState?.pendingResponse) {
        handleInspectHandCard(gameState.pendingResponse.card);
    }
  }

  const handleEmoteSelect = useCallback((emote: Emote) => {
    setGameState(produce(draft => {
      if(draft) {
        triggerEmote(draft, selfId, emote);
      }
    }));
  }, [setGameState, selfId]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if(chatInputValue.trim() === '') return;

    setGameState(produce(draft => {
        if(draft) {
            addLogAndToast(draft, [{type: 'player', playerId: selfId}, `: ${chatInputValue}`], 'chat', selfId);
            draft.players[selfId].currentMessage = chatInputValue;
        }
    }));
    setChatInputValue('');
  }, [chatInputValue, setGameState, selfId]);
  
  const handleInspectHandCard = useCallback((card: GameCard) => {
    setLocalInspectedCard({ ...card, fromHand: true });
  }, []);

    const handleInspectLogCard = useCallback((cardId: number) => {
        const cardData = getCardById(cardId);
        if (cardData) {
            setLocalInspectedCard({ ...cardData, instanceId: `log-${cardId}` });
        }
    }, [getCardById]);

  const handleIndicatorAnimationEnd = (id: number) => {
    setGameState(produce(draft => {
      if (draft) {
        draft.damageIndicators = draft.damageIndicators.filter(indicator => indicator.id !== id);
      }
    }));
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      justToggledHand.current = true;
      setIsLogPanelOpen(prev => !prev);
      setIsHandVisible(prev => !prev);
      setTimeout(() => { justToggledHand.current = false; }, 200);
  };

  const handleOverchargeConfirm = (amount: number) => {
    if (isTutorial && onTutorialAction) {
        if (!onTutorialAction('confirm-overcharge')) return;
    }

    setGameState(produce(draft => {
      if (!draft || !draft.overchargeState) return;
      const { card, position } = draft.overchargeState;
      const player = draft.players[selfId];
      const unit = player.unitZone[position];

      if (unit && unit.overcharge) {
        const aetherCaveCount = player.aetherZone.filter(c => c?.id === 83).length;
        const actualCost = Math.max(0, amount - aetherCaveCount);

        player.aether.current -= actualCost;
        unit.currentAtk = (unit.currentAtk || 0) + amount;
        unit.overcharge.damage = amount;
        unit.overcharge.used = true;

        addLogAndToast(draft, [
          { type: 'card', cardId: unit.id, content: unit.name },
          ` wurde für ${amount} Aether überladen (Kosten: ${actualCost}). Neuer Angriff: ${unit.currentAtk}.`
        ], 'effect', selfId);
        
        const hasFlamingCrown = player.unitZone.some(u => u?.attachedRelic?.id === 16);
        if (hasFlamingCrown) {
            addLogAndToast(draft, [`Flaming Crown gibt allen deinen Einheiten +1 Angriff.`], 'effect', selfId);
            player.unitZone.forEach(u => {
                if (u) {
                    u.currentAtk = (u.currentAtk || 0) + 1;
                }
            });
        }
      }
      draft.overchargeState = null;
      
      if (isTutorial && onTutorialAction) {
          onTutorialAction('SUCCESS');
      }
    }));
  };
  
    const handlePlayerClick = useCallback((playerId: PlayerId) => {
        setGameState(produce(draft => {
        if (!draft || !draft.combatState.isTargeting) return;

        const { sourceCard, abilityId } = draft.combatState.isTargeting;

        if (sourceCard.owner !== selfId) return;

        if (abilityId === 'CHAINBLADE_ADEPT_DAMAGE' || abilityId === 'ON_DEATH_DAMAGE') {
            if (playerId !== sourceCard.owner) {
            const damage = abilityId === 'CHAINBLADE_ADEPT_DAMAGE' ? 1 : 1;
            applyDamageToPlayer(draft, damage, playerId, isTutorial, onTutorialAction, sourceCard.owner);
            addLogAndToast(draft, [{ type: 'card', cardId: sourceCard.id, content: sourceCard.name }, ` fügt `, {type: 'player', playerId}, ` ${damage} Schaden zu.`], 'effect', sourceCard.owner);
            draft.combatState.isTargeting = null;
            }
        }
        }));
    }, [setGameState, isTutorial, onTutorialAction, selfId]);

    const cancelTargeting = useCallback(() => {
        setGameState(produce(draft => {
          if (!draft || !draft.combatState.isTargeting) return;
          addLogAndToast(draft, ["Zielauswahl abgebrochen."], 'info', selfId);
          draft.combatState.isTargeting = null;
        }));
      }, [setGameState, selfId]);

  const handleCardClick = useCallback((card: GameCard, position: number) => {
    if (isTutorial && onTutorialAction) {
        let action = `clickCard-${card.id}`;
        if (gameState?.phase === 'combat' && gameState?.activePlayer === 'player') {
             if (tutorialState?.step.id === 'declare-attack' && card.id === 4) {
                 action = 'attack-declaration';
            } else {
                 action = `wrong-attack-declaration-${card.id}`;
            }
        }
        if (tutorialState?.step.id === 'use-overcharge' && card.id === 4) {
            action = 'clickCard-4';
        }
        
        if (!onTutorialAction(action, card)) {
             return;
        }
    }
    setGameState(produce(draft => {
        if (!draft || draft.winner || draft.fullscreenCardAnimation || draft.combatAnimationState || draft.multiTargetState) return;

        const { combatState, activePlayer, phase } = draft;
        const owner = card.owner;

        if (combatState.isTargeting) {
            const { sourceCard, abilityId } = combatState.isTargeting;
            
            // Only the owner of the effect can select targets
            if (sourceCard.owner !== selfId) return;

            if (abilityId === 'CHAINBLADE_ADEPT_DAMAGE' || abilityId === 'ON_DEATH_DAMAGE') {
                if (owner !== sourceCard.owner) {
                    const damage = abilityId === 'CHAINBLADE_ADEPT_DAMAGE' ? 1 : 1;
                    applyDamageToUnit(draft, damage, owner, position, sourceCard.owner);
                    addLogAndToast(draft, [{ type: 'card', cardId: sourceCard.id, content: sourceCard.name }, ` fügt `, { type: 'card', cardId: card.id, content: card.name }, ` ${damage} Schaden zu.`], 'effect', sourceCard.owner);
                    draft.combatState.isTargeting = null;
                } else {
                    addLogAndToast(draft, [`Wähle eine gegnerische Einheit.`] , 'error', sourceCard.owner);
                }
            } else if (abilityId === 'TRAP_SUDDEN_UNDERTOW') {
                const isAttacking = draft.combatState.attacks.some(a => a.attacker.playerId === owner && a.attacker.position === position);
                if (owner !== sourceCard.owner && isAttacking) {
                    const targetUnit = draft.players[owner].unitZone[position];
                    if (targetUnit) {
                        targetUnit.isExhausted = true;
                        const attackIndex = draft.combatState.attacks.findIndex(a => a.attacker.playerId === owner && a.attacker.position === position);
                        if (attackIndex > -1) {
                            draft.combatState.attacks.splice(attackIndex, 1);
                        }
                        addLogAndToast(draft, [{type: 'card', cardId: combatState.isTargeting.sourceCard.id, content: combatState.isTargeting.sourceCard.name}, ` stoppt den Angriff von `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, `.`] , 'effect', combatState.isTargeting.sourceCard.owner);
                        playSound('selection');
                        
                        const trapPlayer = draft.players[combatState.isTargeting.sourceCard.owner!];
                        const trapIndex = trapPlayer.trapZone.findIndex(c => c?.instanceId === combatState.isTargeting.sourceCard.instanceId);
                        if (trapIndex !== -1) {
                            const [playedCard] = trapPlayer.trapZone.splice(trapIndex, 1, null);
                            if(playedCard) trapPlayer.graveyard.push(playedCard);
                        }
                        
                        draft.combatState.isTargeting = null;
                        
                        continueAfterResponse(draft);
                    }
                } else {
                    addLogAndToast(draft, ["Ungültiges Ziel. Wähle eine angreifende Einheit."], 'error', selfId);
                }
            } else if (abilityId === 'TRAP_DAMAGE') {
                if (owner !== sourceCard.owner) {
                    const targetUnit = draft.players[owner].unitZone[position];
                    if (targetUnit) {
                        const damage = 3;
                        applyDamageToUnit(draft, damage, owner, position, sourceCard.owner);
                        addLogAndToast(draft, [{type: 'card', cardId: sourceCard.id, content: sourceCard.name}, ` fügt `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` ${damage} Schaden zu.`] , 'effect', sourceCard.owner);
                        playSound('selection');
                        draft.combatState.isTargeting = null;
                        continueAfterResponse(draft);
                    }
                } else {
                    addLogAndToast(draft, [`Wähle eine gegnerische Einheit.`], 'error', selfId);
                }
            } else if (abilityId === 'WATER_ELEMENTAR_DEBUFF') {
                 if (card.owner !== activePlayer) {
                    const sourceUnit = combatState.isTargeting.sourceCard as GameCard;
                     if(draft.activePlayer === otherId && !draft.isPvp) {
                        const target = draft.players[selfId].unitZone[position];
                        if (target) {
                             applyPermanentAttackDebuff(draft, 1, selfId, position);
                            addLogAndToast(draft, [{type: 'card', cardId: 24, content: 'Water Elementar'}, ` reduziert den Angriff von `, {type: 'card', cardId: card.id, content: card.name}, `.`] , 'effect', activePlayer);
                            draft.combatState.isTargeting = null;
                        }
                     } else {
                        applyPermanentAttackDebuff(draft, 1, card.owner, position);
                        addLogAndToast(draft, [{type: 'card', cardId: 24, content: 'Water Elementar'}, ` reduziert den Angriff von `, {type: 'card', cardId: card.id, content: card.name}, `.`] , 'effect', activePlayer);
                        draft.combatState.isTargeting = null;
                     }

                } else {
                    addLogAndToast(draft, [`Du musst eine gegnerische Einheit auswählen.`], 'error', activePlayer);
                }
            } else if (abilityId === 'ON_PLAY_FREEZE') {
                if (card.owner !== activePlayer) {
                    const targetUnit = draft.players[card.owner].unitZone[position];
                    if (targetUnit) {
                        targetUnit.isFrozen = true;
                        addLogAndToast(draft, [{type: 'card', cardId: combatState.isTargeting.sourceCard.id, content: combatState.isTargeting.sourceCard.name}, ` friert `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` ein.` ], 'effect', combatState.isTargeting.sourceCard.owner);
                        draft.combatState.isTargeting = null;
                    }
                } else {
                    addLogAndToast(draft, [`Du musst eine gegnerische Einheit auswählen.`], 'error', combatState.isTargeting.sourceCard.owner);
                }
            } else if (abilityId === 'ON_PLAY_DAMAGE_TARGET') {
                if (owner !== combatState.isTargeting.sourceCard.owner && draft.players[owner].unitZone[position]) {
                    const damage = 2;
                    applyDamageToUnit(draft, damage, owner, position, combatState.isTargeting.sourceCard.owner);
                    addLogAndToast(draft, [{type: 'card', cardId: combatState.isTargeting.sourceCard.id, content: combatState.isTargeting.sourceCard.name}, ` fügt `, {type: 'card', cardId: card.id, content: card.name}, ` ${damage} Schaden zu.`], 'effect', combatState.isTargeting.sourceCard.owner);
                    draft.combatState.isTargeting = null;
                } else {
                    addLogAndToast(draft, [`Du musst eine gegnerische Einheit auswählen.`], 'error', combatState.isTargeting.sourceCard.owner);
                }
            } else if (abilityId === 'ON_PLAY_BANISH') {
                if (owner !== combatState.isTargeting.sourceCard.owner && draft.players[owner].unitZone[position]) {
                    const targetUnit = draft.players[owner].unitZone[position];
                    if (targetUnit && getUnitCost(targetUnit) <= 3) {
                        addLogAndToast(draft, [{ type: 'card', cardId: combatState.isTargeting.sourceCard.id, content: combatState.isTargeting.sourceCard.name }, ` verbannt `, { type: 'card', cardId: targetUnit.id, content: targetUnit.name }, `.`] , 'effect', combatState.isTargeting.sourceCard.owner);
                        moveUnitToGraveyard(draft, owner, position);
                        draft.combatState.isTargeting = null;
                    } else {
                         addLogAndToast(draft, [`Ungültiges Ziel. Wähle eine Einheit mit Kosten 3 oder weniger.`], 'error', combatState.isTargeting.sourceCard.owner);
                    }
                } else {
                    addLogAndToast(draft, [`Wähle eine gegnerische Einheit.`], 'error', combatState.isTargeting.sourceCard.owner);
                }
            } else if (abilityId === 'AUREX_DEBUFF') {
                const sourceCard = combatState.isTargeting.sourceCard as GameCard;
                const sourceUnit = draft.players[sourceCard.owner].unitZone[sourceCard.position!];
                if (sourceUnit && card.owner !== sourceCard.owner) {
                    applyPermanentAttackDebuff(draft, 2, card.owner, position);
                    addLogAndToast(draft, [{ type: 'card', cardId: sourceCard.id, content: sourceCard.name }, ` reduziert den Angriff von `, { type: 'card', cardId: card.id, content: card.name }, ` um 2.`] , 'effect', sourceCard.owner);
                    sourceUnit.usedFokusThisTurn = true;
                    draft.combatState.isTargeting = null;
                } else {
                    addLogAndToast(draft, [`Du musst eine gegnerische Einheit auswählen.`], 'error', sourceCard.owner);
                }
            } else if (sourceCard.type === 'Spell') {
                 if ([10, 28, 26, 59, 60, 72, 75].includes(sourceCard.id)) {
                     if (draft.players[owner].unitZone[position]) {
                        handleDropCard(sourceCard as GameCard, { type: 'unit', playerId: owner, position });
                        combatState.isTargeting = null;
                     } else {
                        addLogAndToast(draft, [`Ungültiges Ziel für `, {type: 'card', cardId: sourceCard.id, content: sourceCard.name}, `.`] , 'error', selfId);
                     }
                 } else {
                    combatState.isTargeting = null;
                 }
            } else if (abilityId === 'FOKUS_ABILITY') {
                 if (owner !== sourceCard.owner && draft.players[owner].unitZone[position]) { 
                    applyFokusAbility(draft, sourceCard, {playerId: owner, position});
                    combatState.isTargeting = null; 
                 } else {
                    addLogAndToast(draft, ["Ungültiges Ziel."], 'error', selfId);
                    combatState.isTargeting = null;
                 }
            }
            return;
        }

        // Defenders logic: Select blocker
        if (phase === 'declare-blockers' && owner === selfId) {
            const unit = draft.players[selfId].unitZone[position];
            if (unit && !unit.isExhausted && !unit.isFrozen && !unit.isEntangled) {
                if (combatState.selectedBlocker?.card.instanceId === unit.instanceId) {
                    combatState.selectedBlocker = null;
                } else {
                    combatState.selectedBlocker = { playerId: selfId, card: unit, position };
                }
                playSound('selection');
            } else if (unit) {
                addLogAndToast(draft, [`Diese Einheit kann nicht blocken.`], 'error', selfId);
            }
            return;
        }
        
        // Defenders logic: Assign selected blocker to attacker
        if (phase === 'declare-blockers' && combatState.selectedBlocker && owner === otherId) {
            const attack = draft.combatState.attacks.find(a => a.attacker.position === position);
            if (attack && !attack.blocker) {
                
                const attackerCard = attack.attacker.card;
                if(attackerCard.id === 67 && getUnitCost(combatState.selectedBlocker.card) <= 3) {
                    addLogAndToast(draft, [`Stormrunner kann nicht von Einheiten mit Kosten 3 oder weniger geblockt werden.`], 'error', selfId);
                    return;
                }

                const currentBlocker = combatState.selectedBlocker;
                if (!currentBlocker) return;
                
                const blockerCard = draft.players[selfId].unitZone[currentBlocker.position];
                if (!blockerCard) return;

                attack.blocker = currentBlocker;
                addLogAndToast(draft, [{type: 'card', cardId: currentBlocker.card.id, content: currentBlocker.card.name}, ` blockiert nun `, {type: 'card', cardId: attack.attacker.card.id, content: attack.attacker.card.name}, `.`]);
                playSound('selection');
                
                blockerCard.hasBlockedThisTurn = true;
                if (blockerCard.id !== 25 && blockerCard.id !== 22) {
                    blockerCard.isExhausted = true;
                    draft.combatState.selectedBlocker = null;
                } else if (blockerCard.id === 22) {
                     const blocksByZoa = draft.combatState.attacks.filter(a => a.blocker?.card.id === 22).length;
                     if(blocksByZoa >= 2) {
                        blockerCard.isExhausted = true;
                        draft.combatState.selectedBlocker = null;
                        addLogAndToast(draft, [{type: 'card', cardId: 22, content: "Zoa"}, ` hat bereits 2 Einheiten geblockt und ist nun erschöpft.`] , 'info', selfId);
                     } else {
                        addLogAndToast(draft, [{type: 'card', cardId: 22, content: "Zoa"}, ` kann eine weitere Einheit blocken.`] , 'info', selfId);
                     }
                } else {
                    addLogAndToast(draft, [`Icebound Defender kann weitere Angreifer blocken.`] , 'info', selfId);
                }
            }
            return;
        }

        // Attacker logic: Declare attack
        if (activePlayer === selfId && phase === 'combat' && owner === selfId) {
             const unit = draft.players[selfId].unitZone[position];
             if (unit && !unit.isExhausted && !unit.isFrozen && !unit.isEntangled && !unit.hasBlockedThisTurn) {
                const hasMireya = draft.players[otherId].unitZone.some(u => u?.id === 23);
                if (hasMireya && unit.cost <= 3) {
                  addLogAndToast(draft, [{type: 'card', cardId: 23, content: 'Mireya'},`'s Aura verhindert den Angriff von `, {type: 'card', cardId: unit.id, content: unit.name},`.`], 'error', selfId);
                  return;
                }

                const existingAttackIndex = combatState.attacks.findIndex(a => a.attacker.position === position);

                if (existingAttackIndex !== -1) {
                    combatState.attacks.splice(existingAttackIndex, 1);
                    addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, ` greift nicht mehr an.`], 'info', selfId);
                    playSound('negative');
                } else {
                    const attack: CombatAttack = {
                        attacker: { playerId: selfId, card: unit, position, instanceId: unit.instanceId },
                        target: { type: 'player', playerId: otherId }
                    };
                    combatState.attacks.push(attack);
                    addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, ` greift nun den Gegner an.`], 'info', selfId);
                    playSound('positive');
                }
             } else if (unit) {
                if (unit.isFrozen) {
                    addLogAndToast(draft, [`Diese Einheit ist eingefroren.`] , 'error', selfId);
                } else if (unit.isEntangled) {
                    addLogAndToast(draft, [`Diese Einheit ist gefesselt.`] , 'error', selfId);
                } else if (unit.hasBlockedThisTurn) {
                    addLogAndToast(draft, [`Diese Einheit hat geblockt und ist erschöpft.`] , 'error', selfId);
                } else {
                    addLogAndToast(draft, [`Diese Einheit kann nicht angreifen.`], 'error', selfId);
                }
             }
             return;
        }
        
        if (card.type === 'Trap' && owner !== selfId) {
            addLogAndToast(draft, ["Du kannst verdeckte Karten nicht inspizieren."], "info", selfId);
            return;
        }
        if (card.type === 'Trap' && owner === selfId && card.position !== undefined) {
             playSound('positive');
            setLocalInspectedCard({ ...card, position, owner });
            return;
        }
        if (card.type === 'Aether' && owner === selfId && card.position !== undefined) {
            playSound('positive');
            setLocalInspectedCard({ ...card, position, owner });
            return;
        }
        
        if (!combatState.isTargeting) {
            if (card.type === 'Aether' && card.id === 89 && owner === selfId && !draft.players[selfId].usedFracturedAether) {
                 if (draft.activePlayer !== selfId || draft.phase !== 'main') {
                    addLogAndToast(draft, [`Du kannst dies nur in deiner Hauptphase aktivieren.`], 'error', selfId);
                } else {
                    const player = draft.players[selfId];
                    player.aether.current = Math.min(player.aether.max, player.aether.current + 3);
                    draft.players[selfId].usedFracturedAether = true;
                    addLogAndToast(draft, [`Aether Spirit gewährt 3 Aether. Du kannst diesen Zug weder angreifen noch Zauber wirken.`], 'effect', selfId);
                    playSound('positive');
                    return;
                }
            }
             if (card.type === 'Aether' && card.id === 87 && owner === selfId && !draft.players[selfId].usedAetherReactorThisGame) {
                 if (draft.activePlayer !== selfId || draft.phase !== 'main') {
                    addLogAndToast(draft, [`Du kannst dies nur in deiner Hauptphase aktivieren.`], 'error', selfId);
                } else {
                    const player = draft.players[selfId];
                    player.aether.current = Math.min(player.aether.max, player.aether.current + 3);
                    draft.players[selfId].usedAetherReactorThisGame = true;
                    addLogAndToast(draft, [`Aether Reactor gewährt 3 Aether.`], 'effect', selfId);
                    playSound('positive');
                    return;
                }
            }
            
            playSound('positive');
            setLocalInspectedCard({ ...card, position, owner });
        }
    }));
  }, [handleDropCard, setGameState, isTutorial, onTutorialAction, gameState, continueAfterResponse, selfId, otherId]);
  
  const handleActivateAbility = useCallback((card: InspectedCard, abilityId: string) => {
    setGameState(produce(draft => {
        if (!draft || !card.owner || card.position === undefined || draft.fullscreenCardAnimation || draft.combatAnimationState) return;
        
        const unit = draft.players[card.owner].unitZone[card.position];
        if (!unit) return;

        if (unit.usedFokusThisTurn) {
             addLogAndToast(draft, ['Diese Einheit hat ihre Fähigkeit diesen Zug bereits genutzt.'], 'error', selfId);
             return;
        }
        
        let needsTarget = false;
        
        switch(card.id) {
            case 5: needsTarget = true; break;
            case 17: needsTarget = false; break;
            case 35: needsTarget = false; break;
            case 41: needsTarget = false; break;
        }

        if (needsTarget) {
            draft.combatState.isTargeting = { sourceCard: card, abilityId: 'FOKUS_ABILITY' };
            setLocalInspectedCard(null);
            addLogAndToast(draft, [`Wähle ein Ziel für `, {type: 'card', cardId: unit.id, content: unit.name}, `'s Fähigkeit.`], 'info', selfId);
            playSound('positive');
        } else {
            applyFokusAbility(draft, card, { playerId: card.owner });
            setLocalInspectedCard(null);
        }
    }));
  }, [setGameState, selfId]);
  
 const handlePlayFromHand = useCallback((card: InspectedCard) => {
    if (!card.owner || !card.fromHand) return;

    if (isTutorial && onTutorialAction) {
        const cardInHand = gameState?.players[card.owner!]?.hand.find(c => c.instanceId === card.instanceId);
        if (!cardInHand) return;
        
        let actionType = '';
        if (cardInHand.type === 'Unit') actionType = 'playUnit';
        else if (cardInHand.type === 'Aether') actionType = 'playAether';
        else if (cardInHand.type === 'Trap') actionType = 'playTrap';
        else actionType = `playSpell`;
        
        if (!onTutorialAction(actionType, cardInHand)) return;
    }

    setGameState(produce(draft => {
        if (!draft || draft.fullscreenCardAnimation || draft.combatAnimationState) return;
        
        const cardInHand = draft.players[card.owner!].hand.find(c => c.instanceId === card.instanceId);
        if (!cardInHand) return;

        let target: any;
        
        if (cardInHand.type === 'Unit') {
            const freeSlot = draft.players[card.owner!].unitZone.findIndex(u => u === null || u.id === 999);
            if (freeSlot === -1) {
                addLogAndToast(draft, ['Kein Platz für eine neue Einheit.'], 'error', card.owner);
                return;
            }
            target = { type: 'zone', zone: 'Unit', position: freeSlot };
        } else if (cardInHand.type === 'Aether') {
             const freeSlot = draft.players[card.owner!].aetherZone.findIndex(a => a === null);
            if (freeSlot === -1) {
                addLogAndToast(draft, ['Kein Platz für eine neue Aether-Karte.'], 'error', card.owner);
                return;
            }
            target = { type: 'zone', zone: 'Aether', position: freeSlot };
        } else if (cardInHand.type === 'Trap') {
             const freeSlot = draft.players[card.owner!].trapZone.findIndex(a => a === null);
            if (freeSlot === -1) {
                addLogAndToast(draft, ['Kein Platz für eine neue Fallenkarte.'], 'error', card.owner);
                return;
            }
            target = { type: 'zone', zone: 'Trap', position: freeSlot };
        } else if (cardInHand.type === 'Spell') {
            if ([10, 72].includes(cardInHand.id)) {
                target = { type: 'player', playerId: otherId };
            } else {
                target = {};
            }
        }
        else { 
            target = {};
        }

        setLocalInspectedCard(null);
        
        const cardToPlay = draft.players[card.owner!].hand.find(c => c.instanceId === card.instanceId);
        if (!cardToPlay) return;

        const cardCost = getCost(draft, cardToPlay, cardToPlay.owner);
        const player = draft.players[cardToPlay.owner];

        if (draft.activePlayer !== cardToPlay.owner || draft.phase !== 'main') {
            addLogAndToast(draft, [`Du kannst nur in deiner Hauptphase Karten ausspielen.`], 'error', selfId);
            return;
        }
        if (player.aether.current < cardCost) {
            addLogAndToast(draft, [`Nicht genug Aether: benötigt ${cardCost}, hast ${player.aether.current}.`], 'error', selfId);
            return;
        }
        if (cardToPlay.type === 'Aether' && player.playedAetherThisTurn) {
            addLogAndToast(draft, ["Du kannst nur eine Aether-Karte pro Zug spielen."], "error", selfId);
            return;
        }

        const shouldAnimate = isAnimationMode && cardToPlay.previewVideoUrl && cardToPlay.type !== 'Trap';

        if (shouldAnimate) {
            draft.pendingAction = { 
                type: 'COMPLETE_CARD_PLAY', 
                cardInstanceId: cardToPlay.instanceId,
                ownerId: cardToPlay.owner,
                target,
            };
            draft.fullscreenCardAnimation = { ...cardToPlay, instanceId: `play-anim-${cardToPlay.id}` };
        } else {
            if (completeCardPlay(draft, cardToPlay.instanceId, cardToPlay.owner, target) && isTutorial && onTutorialAction) {
                onTutorialAction('SUCCESS');
            }
        }
    }));
  }, [setGameState, isAnimationMode, isTutorial, onTutorialAction, gameState, selfId, otherId]);


  const nextPhase = useCallback(() => {
    if (isTutorial && onTutorialAction) {
        if (!onTutorialAction(`next-phase-${gameState?.phase}`)) return;
    }
    setGameState(produce(draft => {
      if(!draft || draft.winner || draft.fullscreenCardAnimation || draft.combatAnimationState) return;
      const player = draft.players[selfId];

      if(draft.activePlayer !== selfId) return;
      
      setLocalInspectedCard(null);
      draft.combatState.isTargeting = null;
      
      if(draft.phase === 'main') {
          if (player.usedFracturedAether) {
             addLogAndToast(draft, [`Du kannst diesen Zug nicht angreifen.`], 'error', selfId);
             return;
          }
          draft.phase = 'combat';
          addLogAndToast(draft, [`Kampfphase beginnt.`], 'info', selfId);
          playSound('selection');
          if (isTutorial && onTutorialAction) onTutorialAction('SUCCESS');
      } else if (draft.phase === 'combat') {
        if (draft.combatState.attacks.length === 0) {
            addLogAndToast(draft, [`Keine Angriffe deklariert. Zug wird beendet.`], 'info', selfId);
            playSound('negative');
            advanceToNextPlayer(draft);
            if (isTutorial && onTutorialAction) onTutorialAction('SUCCESS');
            return;
        }

        const opponentTraps = draft.players[otherId].trapZone.filter((t): t is GameCard => t !== null);
        if (opponentTraps.length > 0 && !gameState?.isPvp) {
            const trap = opponentTraps[0];
            if (Math.random() < 0.8) {
                applyTrapEffect(draft, trap, { position: draft.combatState.attacks[0].attacker.position, playerId: selfId });
            }
        }
        
        if(draft.combatState.attacks.length === 0) {
            advanceToNextPlayer(draft);
            return;
        }
        
        // CHECK FOR BLOCKERS (Defender's turn to act)
        const canOpponentBlock = draft.players[otherId].unitZone.some(u => u && !u.isExhausted && !u.isFrozen && !u.isEntangled);
        if (canOpponentBlock) {
            draft.phase = 'declare-blockers';
            addLogAndToast(draft, [`${draft.players[otherId].name} kann Blocker deklarieren.`], 'info');
            if (isTutorial && onTutorialAction) onTutorialAction('SUCCESS');
            return;
        }

        if (isAnimationMode && draft.combatState.attacks.length > 0) {
            draft.pendingAction = { type: 'ADVANCE_PHASE', newPhase: 'end' };
            draft.combatAnimationState = { attacks: draft.combatState.attacks };
        } else {
            resolveCombat(draft);
            if(draft.winner) return;
            advanceToNextPlayer(draft);
            if (isTutorial && onTutorialAction) onTutorialAction('SUCCESS');
        }
      }
    }));
  }, [isAnimationMode, setGameState, resolveCombat, advanceToNextPlayer, isTutorial, onTutorialAction, gameState, selfId, otherId]);
  
  const surrenderConfirm = () => {
    setGameState(produce(draft => {
        if (!draft || draft.winner) return;
        draft.winner = otherId;
        addLogAndToast(draft, [{type: 'player', playerId: selfId}, ` hat aufgegeben.`], 'info', selfId);
    }));
    setShowSurrenderDialog(false);
  };
  
  const filteredLog = useMemo(() => {
    if (!gameState) return [];
    return gameState.log.filter(l => {
        if (!l) return false;
        const typeMatch = logFilters[l.type];
        const playerMatch = l.player ? logFilters[l.player] : true;
        return typeMatch && playerMatch;
    });
  }, [gameState?.log, logFilters]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [filteredLog]);
    
  const canConfirmCombat = useMemo(() => {
      if (!gameState) return false;
      const { activePlayer, phase, winner, combatState } = gameState;
      if (activePlayer !== selfId || phase !== 'combat' || winner) return false;
      return combatState.attacks.length > 0 && !combatState.isTargeting;
  }, [gameState, selfId]);

  const showEndTurnButton = useMemo(() => {
      if (!gameState) return false;
      const { activePlayer, winner, phase } = gameState;
      // Hide the end-turn button while in the blocker-declaration phase. If the player is
      // defending, the "Confirm blockers" button takes over; if the player is attacking, the
      // AI is busy choosing blockers (there's nothing for the player to press).
      if (phase === 'declare-blockers') return false;
      return activePlayer === selfId && !winner;
  }, [gameState, selfId]);
  
  const getEndTurnButtonText = (): string => {
    if (!gameState) return t('endTurn');
    const { phase, combatState } = gameState;
    if (phase === 'main') {
        return t('toCombatPhase');
    }
    if (phase === 'combat') {
        return combatState.attacks.length > 0 ? t('confirmAttacks') : t('endTurn');
    }
    return t('endTurn');
  };


  const showConfirmBlocksButton = useMemo(() => {
      if (!gameState) return false;
      const { activePlayer, phase } = gameState;
      return activePlayer === otherId && phase === 'declare-blockers';
  }, [gameState, otherId]);

  const playerCardBack = useMemo(() => {
    if (!equippedCosmetics) return '/logo.png';
      return cosmeticItems.cardBacks.find(cb => cb.id === equippedCosmetics.cardBack)?.img || '/logo.png';
  }, [equippedCosmetics?.cardBack]);

  const opponentCardBack = '/card-back-logo.jpg?v=2';
  
  const [
    ,
    dropOpponent,
  ] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item: GameCard) => {
        handleDropCard(item, {
            type: 'player',
            playerId: otherId,
        });
    },
    canDrop: (item: GameCard) => {
      if (isTutorial && onTutorialAction) {
          return !!onTutorialAction(`playSpell`, item);
      }
      return item.type === 'Spell' && gameState?.activePlayer === selfId;
    },
    collect: (monitor: DropTargetMonitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [handleDropCard, isTutorial, onTutorialAction, otherId, selfId, gameState?.activePlayer]);

  const handleMultiTargetConfirm = () => {
    setGameState(produce(draft => {
        if (!draft || !draft.multiTargetState) return;

        const { sourceCard, selectedTargets, abilityId } = draft.multiTargetState;

        if (abilityId === 'AETHER_SHIFT') {
            const [target1, target2] = selectedTargets;
            const unit1 = draft.players[target1.playerId].unitZone[target1.position!];
            const unit2 = draft.players[target2.playerId].unitZone[target2.position!];
            if (unit1 && unit2) {
                const cost1 = getUnitCost(unit1);
                const cost2 = getUnitCost(unit2);
                unit1.tempCostModifier = (unit1.tempCostModifier || 0) + (cost2 - cost1);
                unit2.tempCostModifier = (unit2.tempCostModifier || 0) + (cost1 - cost2);
                addLogAndToast(draft, [`Die Kosten von `, {type: 'card', cardId: unit1.id, content: unit1.name}, ` und `, {type: 'card', cardId: unit2.id, content: unit2.name}, ` wurden getauscht.`] , 'effect', sourceCard.owner);
            }
        } else if (abilityId === 'CHAIN_LIGHTNING') {
            selectedTargets.forEach(target => {
                if (target.type === 'player') {
                    applyDamageToPlayer(draft, 2, target.playerId, isTutorial, onTutorialAction, sourceCard.owner);
                } else if (target.type === 'unit' && target.position !== undefined) {
                    applyDamageToUnit(draft, 2, target.playerId, target.position, isTutorial, onTutorialAction, sourceCard.owner);
                }
            });
            addLogAndToast(draft, [{type: 'card', cardId: sourceCard.id, content: sourceCard.name}, ` trifft ${selectedTargets.length} Ziel(e).`], 'effect', sourceCard.owner);
        }

        draft.multiTargetState = null;
    }));
  };

  const handleMultiTargetCancel = () => {
    setGameState(produce(draft => {
        if (!draft || !draft.multiTargetState) return;
        
        const { sourceCard } = draft.multiTargetState;
        const owner = draft.players[sourceCard.owner];
        owner.aether.current += getCost(draft, sourceCard, sourceCard.owner);
        owner.hand.push(sourceCard);

        addLogAndToast(draft, [`Der Zauber `, {type: 'card', cardId: sourceCard.id, content: sourceCard.name}, ` wurde abgebrochen.`], 'info', sourceCard.owner);

        draft.multiTargetState = null;
    }));
  };

  const handleMultiTargetSelect = (target: MultiTarget) => {
    setGameState(produce(draft => {
        if (!draft || !draft.multiTargetState) return;

        const { selectedTargets, maxTargets, abilityId } = draft.multiTargetState;
        const existingIndex = selectedTargets.findIndex(t => t.instanceId === target.instanceId);

        if (existingIndex > -1) {
            selectedTargets.splice(existingIndex, 1);
        } else if (selectedTargets.length < maxTargets) {
            if (abilityId === 'AETHER_SHIFT' && target.type !== 'unit') {
                addLogAndToast(draft, [`Du kannst nur Einheiten für Aether Shift auswählen.`], 'error', selfId);
                return;
            }
            selectedTargets.push(target);
        }
    }));
  }
  
  const handleChoice = useCallback((choiceId: string) => {
    setGameState(produce((draft) => {
        if (!draft || !draft.pendingChoice) return;
        const { card } = draft.pendingChoice;
        const unit = draft.players[card.owner].unitZone[card.position!];
        if (!unit) return;
        if (card.id === 35) {
            const cost = 1;
            if (unit.currentFokus >= cost) {
            unit.currentFokus -= cost;
            unit.usedFokusThisTurn = true;
            if (choiceId === 'gain_aether') {
                gainAether(draft, unit.owner, 1, true);
                addLogAndToast(draft, [{ type: 'card', cardId: unit.id, content: unit.name }, ' gewährt 1 Aether.'], 'effect', unit.owner);
            } else if (choiceId === 'reduce_cost') {
                draft.players[unit.owner].nextSpellCostReduction += 1;
                addLogAndToast(draft, [{ type: 'card', cardId: unit.id, content: unit.name }, ' reduziert die Kosten des nächsten Zaubers.'], 'effect', unit.owner);
            }
            }
        } else if (card.id === 41) {
            if (choiceId === 'debuff_atk') {
            if (unit.currentFokus >= 1) {
                draft.combatState.isTargeting = {
                sourceCard: unit,
                abilityId: 'AUREX_DEBUFF',
                };
                addLogAndToast(draft, ['Wähle eine gegnerische Einheit zum Schwächen.'], 'info', card.owner);
            }
            } else if (choiceId === 'summon_shadow') {
            if (unit.currentFokus >= 1) {
                unit.currentFokus -= 1;
                unit.usedFokusThisTurn = true;
                const shadowTokenData = MASTER_DB.find(c => c.id === 998);
                const emptySlot = draft.players[card.owner].unitZone.findIndex(s => s === null);
                if (shadowTokenData && emptySlot !== -1) {
                    const token: GameCard = {
                        ...shadowTokenData,
                        instanceId: `token-shadow-${Math.random()}`,
                        owner: card.owner,
                        currentHp: 1, currentAtk: 1, isExhausted: true, currentFokus: 0, usedFokusThisTurn: false, position: emptySlot,
                    };
                    draft.players[card.owner].unitZone[emptySlot] = token;
                    addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, ' beschwört einen 1/1 Schatten.'], 'effect', card.owner);
                } else {
                    addLogAndToast(draft, ['Kein Platz für einen Schatten.'], 'info', card.owner);
                }
            }
            } else if (choiceId === 'ultimate') {
                if (unit.currentFokus >= 4) {
                    unit.currentFokus -= 4;
                    unit.usedFokusThisTurn = true;
                    let destroyedCount = 0;
                    for (const pId of ['player', 'opponent'] as PlayerId[]) {
                        draft.players[pId].unitZone.forEach((u, i) => {
                            if (u && getUnitCost(u) <= 3) {
                                moveUnitToGraveyard(draft, pId, i);
                                destroyedCount++;
                            }
                        });
                    }
                    applyHealToPlayer(draft, destroyedCount, card.owner);
                    addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, `'s Ultimate zerstört ${destroyedCount} Einheiten und heilt um ${destroyedCount}.`], 'effect', card.owner);
                }
            }
        }
        draft.pendingChoice = null;
    }));
  }, [setGameState, otherId, selfId]);

  if (!gameState) {
    return <div className="flex items-center justify-center h-full text-white">Loading Game...</div>;
  }
  
  const { players, phase, activePlayer, turn, winner, combatState, pendingResponse, damageIndicators, fullscreenCardAnimation, combatAnimationState, showConfirmSkipBlock, overchargeState, pendingAction, pendingChoice, multiTargetState } = gameState;
    
  const GameLogIcon = ({ type }: { type: GameLog['type'] }) => {
      switch (type) {
          case 'info': return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
          case 'error': return <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />;
          case 'attack': return <Swords className="h-4 w-4 text-yellow-500 shrink-0" />;
          case 'chat': return <MessageCircle className="h-4 w-4 text-green-400 shrink-0" />;
          case 'effect': return <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />;
          default: return null;
      }
  };

  const getRarityColorClass = (rarity: Rarity) => {
      switch (rarity) {
          case 'Uncommon': return 'text-green-400 hover:text-green-300';
          case 'Rare': return 'text-blue-400 hover:text-blue-300';
          case 'Epic': return 'text-purple-400 hover:text-purple-300';
          case 'Legendary': return 'text-yellow-400 hover:text-yellow-300';
          case 'GOD': return 'text-red-500 hover:text-red-400';
          default: return 'text-white hover:text-gray-300';
      }
  }

  const toggleLogFilter = (filter: keyof typeof logFilters) => {
      setLogFilters(prev => ({...prev, [filter]: !prev[filter]}));
  }

  const isOtherAvatarTargetable = combatState.isTargeting?.abilityId === 'CHAINBLADE_ADEPT_DAMAGE' || combatState.isTargeting?.abilityId === 'ON_DEATH_DAMAGE';

  return (
    <GameStateContext.Provider value={{ gameState, setGameState }}>
       <div className="w-screen h-screen text-white flex flex-col relative overflow-hidden pointer-events-auto bg-black" onContextMenu={handleContextMenu}>
        <EquippedPlaymatBackground playmatId={equippedCosmetics.playmat} />
        
        {damageIndicators.map(indicator => (
            <DamageIndicator key={indicator.id} {...indicator} onAnimationEnd={() => handleIndicatorAnimationEnd(indicator.id)} />
        ))}
          
        {fullscreenCardAnimation && (
            <div className="absolute inset-0 bg-black/90 z-[300] flex items-center justify-center pointer-events-none">
                <DetailedCard card={fullscreenCardAnimation} onVideoEnd={onVideoEnd} />
            </div>
        )}

        {combatAnimationState && (
            <CombatAnimationModal attacks={combatAnimationState.attacks} onAnimationEnd={onCombatAnimationEnd} />
        )}

        <AlertDialog open={showConfirmSkipBlock} onOpenChange={(open) => setGameState(produce(draft => { if (draft) draft.showConfirmSkipBlock = open; }))}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('skipBlockingTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('skipBlockingDescription')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={skipBlocking}>{t('confirm')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        {overchargeState && (
            <OverchargeModal state={overchargeState} onConfirm={handleOverchargeConfirm} onCancel={() => setGameState(produce(draft => { if(draft) draft.overchargeState = null }))} playerState={players[selfId]} />
        )}
        
        {pendingChoice && (
            <Dialog open={!!pendingChoice}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('abilityOf', { card: localizeCard(pendingChoice.card).name })}</DialogTitle>
                        <DialogDescription>{t('chooseEffect')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                    {pendingChoice.options.map(option => (
                        <Button
                            key={option.id}
                            variant="outline"
                            className="text-left justify-start h-auto"
                            onClick={() => handleChoice(option.id)}
                        >
                            <div className="flex flex-col">
                                <span>{gameText(option.text)}</span>
                                <span className="text-xs text-muted-foreground">{gameText(option.description)}</span>
                            </div>
                        </Button>
                    ))}
                    </div>
                </DialogContent>
            </Dialog>
        )}
        
        {multiTargetState && (
            <Dialog open={true}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('chooseTargetsFor', { card: localizeCard(multiTargetState.sourceCard).name })}</DialogTitle>
                         <DialogDescription>{t('chooseUpToTargets', { max: multiTargetState.maxTargets, selected: multiTargetState.selectedTargets.length })}</DialogDescription>
                    </DialogHeader>
                     <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={handleMultiTargetCancel}>{t('cancel')}</Button>
                        <Button disabled={multiTargetState.selectedTargets.length < multiTargetState.minTargets} onClick={handleMultiTargetConfirm}>{t('confirm')}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        )}
        
        {winner && (
          <div className="absolute inset-0 bg-black/80 z-[300] flex flex-col items-center justify-center text-center pointer-events-auto">
            <h2 className="text-6xl font-bold title-gradient uppercase">{winner === selfId ? t('victory') : t('defeat')}</h2>
            <p className="text-xl mt-4">{t('gameWon', { player: players[winner].name })}</p>
            {!isTutorial && !isControlled && winner === selfId && (
                <p className="text-primary font-bold mt-2 animate-bounce">{t('rewardMerits')}</p>
            )}
            {xpAwardResult && xpAwardResult.xpGained > 0 && (
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                    <p className="font-bold text-cyan-300">{t('xpGained', { amount: xpAwardResult.xpGained })}</p>
                    {xpAwardResult.leveledUp && (
                        <p className="font-semibold text-primary">{t('levelUp', { oldLevel: xpAwardResult.oldLevel, newLevel: xpAwardResult.newLevel })}</p>
                    )}
                    {xpAwardResult.rewardsGranted.map((reward) => (
                        <p key={reward.level}>{t('rewardUnlocked')}: {formatLevelReward(reward)}</p>
                    ))}
                </div>
            )}
            <div className="flex gap-4 mt-8">
              <Button onClick={onReset} variant="outline">{t('newGame')}</Button>
               <Link href="/game" className={cn(buttonVariants({variant: 'tcg'}))}>
                {t('mainMenu')}
              </Link>
            </div>
          </div>
        )}

        {pendingResponse && pendingResponse.card && pendingResponse.card.owner === selfId && (
            <AlertDialog open={!!pendingResponse}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{pendingResponse.type === 'TRAP' ? t('trapActivation') : t('counterSpell')}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                           <div>
                                {t('activatePromptPrefix')}<span className={cn("font-bold cursor-pointer", getRarityColorClass(pendingResponse.card.rarity))} onClick={() => setLocalInspectedCard(pendingResponse.card)}>{localizeCard(pendingResponse.card).name}</span>{t('activatePromptSuffix')}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="secondary" onClick={() => handleResponse(false)}>{t('no')}</Button>
                        <Button id="activate-trap-button" onClick={() => handleResponse(true)}>{t('yesActivate')}</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

        <div className="absolute top-4 right-4 z-[100] flex items-center gap-2 pointer-events-auto">
            <Button variant="ghost" size="icon" onClick={handleMuteToggle} className="text-muted-foreground hover:text-primary">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleFullscreenToggle} className="text-muted-foreground hover:text-primary">
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
            <div className="flex items-center space-x-2 bg-background/50 p-2 rounded-lg">
                <Label htmlFor="animation-mode">{t('videoAnimations')}</Label>
                <Switch
                    id="animation-mode"
                    checked={isAnimationMode}
                    onCheckedChange={setIsAnimationMode}
                />
            </div>
        </div>

        <div className="absolute top-24 left-4 right-4 flex justify-between items-start pointer-events-none z-30">
            <div className="flex items-start gap-4 pointer-events-auto">
                <PlayerAvatar player={players[otherId]} onAvatarClick={() => handlePlayerClick(otherId)} isTargetForSpell={isOtherAvatarTargetable} dropRef={dropOpponent} isMultiTarget={multiTargetState?.selectedTargets.some(t => t.instanceId === otherId)} />
                <Graveyard graveyard={players[otherId].graveyard} owner={otherId} cardBackImg={opponentCardBack} />
            </div>
        </div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className="flex flex-col items-center gap-4 pointer-events-auto">
                <GameZone type="Aether" cards={players[otherId].aetherZone} onDropCard={handleDropCard} owner={otherId} onCardClick={handleCardClick} combatState={combatState} phase={phase} activePlayer={activePlayer} cardBackImg={opponentCardBack} />
                <div className="flex items-center gap-2">
                    <GameZone type="Trap" cards={players[otherId].trapZone} onDropCard={handleDropCard} owner={otherId} onCardClick={handleCardClick} combatState={combatState} phase={phase} activePlayer={activePlayer} cardBackImg={opponentCardBack} className="w-[230px]" />
                    <GameZone type="Unit" cards={players[otherId].unitZone} onDropCard={handleDropCard} owner={otherId} onCardClick={handleCardClick} combatState={combatState} phase={phase} activePlayer={activePlayer} cardBackImg={opponentCardBack} onEffectEnd={handleEffectEnd} onMultiTargetSelect={handleMultiTargetSelect} multiTargetState={multiTargetState}/>
                </div>
            </div>
            
            <div className="my-2 flex flex-col items-center justify-center gap-2 pointer-events-auto">
                <div className="bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg px-6 py-2 flex items-center gap-4 shadow-lg text-sm">
                    <span className={cn('text-lg font-bold transition-colors', activePlayer === selfId ? 'text-primary' : 'text-muted-foreground/50')}>
                        {activePlayer === selfId ? t('yourTurn') : players[otherId].name}
                    </span>
                    <div className="flex flex-col items-center border-x border-border/20 px-4">
                        <span className="text-xs uppercase text-muted-foreground">{t('round')}</span>
                        <span className="text-2xl font-bold">{turn}</span>
                    </div>
                    <span className={cn('text-lg font-bold transition-colors', activePlayer === otherId ? 'text-primary' : 'text-muted-foreground/50')}>
                        {activePlayer === otherId ? t('yourTurn') : players[otherId].name}
                    </span>
                </div>

                {showConfirmBlocksButton && (
                    <Button onClick={handleConfirmBlocks} variant="tcg" className="end-turn-button w-auto min-w-[250px]">
                        {t('confirmBlockers')}
                    </Button>
                )}
                
                {showEndTurnButton && (
                    <Button onClick={nextPhase} variant="tcg" className="end-turn-button w-auto min-w-[250px]">
                        {getEndTurnButtonText()}
                    </Button>
                )}
            </div>

            <div className="flex flex-col items-center gap-4 pointer-events-auto">
                <div className="flex items-center gap-2">
                    <GameZone type="Unit" cards={players[selfId].unitZone} onDropCard={handleDropCard} owner={selfId} onCardClick={handleCardClick} combatState={combatState} phase={phase} activePlayer={activePlayer} cardBackImg={playerCardBack} onEffectEnd={handleEffectEnd} onMultiTargetSelect={handleMultiTargetSelect} multiTargetState={multiTargetState}/>
                    <GameZone type="Trap" cards={players[selfId].trapZone} onDropCard={handleDropCard} owner={selfId} onCardClick={handleCardClick} combatState={combatState} phase={phase} activePlayer={activePlayer} cardBackImg={playerCardBack} className="w-[230px]" />
                </div>
                <GameZone type="Aether" cards={players[selfId].aetherZone} onDropCard={handleDropCard} owner={selfId} onCardClick={handleCardClick} combatState={combatState} phase={phase} activePlayer={activePlayer} cardBackImg={playerCardBack} />
            </div>
        </div>

         <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none z-[100]">
             <div className={cn("flex flex-col items-start gap-2 pointer-events-auto transition-all duration-300", !isLogPanelOpen && "-translate-x-[calc(100%+2rem)]")}>
                 <TooltipProvider>
                    <Card className="bg-black/50 backdrop-blur-sm border-primary/30 w-[450px]">
                        <CardHeader className="p-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsLogPanelOpen(false)}><ChevronLeft/></Button>
                                    <BookText className="h-5 w-5 text-primary"/>
                                    <h3 className="font-semibold">{t('gameLog')}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-6 w-6", logFilters.info && 'text-primary')} onClick={() => toggleLogFilter('info')}><Info/></Button></TooltipTrigger><TooltipContent><p>Info</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-6 w-6", logFilters.attack && 'text-primary')} onClick={() => toggleLogFilter('attack')}><Swords/></Button></TooltipTrigger><TooltipContent><p>{t('attacks')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-6 w-6", logFilters.effect && 'text-primary')} onClick={() => toggleLogFilter('effect')}><Sparkles/></Button></TooltipTrigger><TooltipContent><p>{t('effectsLabel')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-6 w-6", logFilters.chat && 'text-primary')} onClick={() => toggleLogFilter('chat')}><MessageCircle/></Button></TooltipTrigger><TooltipContent><p>Chat</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-6 w-6", logFilters.player && 'text-primary')} onClick={() => toggleLogFilter('player')}><User/></Button></TooltipTrigger><TooltipContent><p>{t('playerActions')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-6 w-6", logFilters.opponent && 'text-primary')} onClick={() => toggleLogFilter('opponent')}><Bot/></Button></TooltipTrigger><TooltipContent><p>{t('opponentActions')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent ref={logContainerRef} className="p-2 h-48 overflow-y-auto text-sm space-y-1.5">
                        {filteredLog.map(log => (
                                <div key={log.id} className="flex items-start gap-2">
                                    <GameLogIcon type={log.type} />
                                    <div>
                                        {log.message.map((part, index) => {
                                            if (part.type === 'text') return <span key={index}>{gameText(part.content)}</span>;
                                            if (part.type === 'card') {
                                                const logCard = getCardById(part.cardId);
                                                return (
                                                    <span key={index} className={cn("font-bold cursor-pointer", getRarityColorClass(logCard?.rarity || 'Common'))} onClick={() => handleInspectLogCard(part.cardId)}>
                                                        {logCard ? localizeCard(logCard).name : part.content}
                                                    </span>
                                                );
                                            }
                                            if (part.type === 'player') {
                                                const pName = part.playerId === selfId ? t('you') : players[part.playerId].name;
                                                return <span key={index} className="font-bold text-primary">{pName}</span>;
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                        ))}
                        </CardContent>
                    </Card>
                </TooltipProvider>
                <div className="flex gap-2">
                    <EmotePicker onEmoteSelect={handleEmoteSelect} />
                    <Button variant="outline" size="icon" onClick={() => setShowSurrenderDialog(true)}><Flag className="h-5 w-5" /></Button>
                    <form onSubmit={handleSendMessage} className="flex gap-1">
                        <Input value={chatInputValue} onChange={e => setChatInputValue(e.target.value)} placeholder="Chat..." className="h-9 w-40"/>
                        <Button type="submit" size="icon" variant="outline" className="h-9 w-9"><Send className="h-4 w-4"/></Button>
                    </form>
                </div>
            </div>
            <div className="flex items-end gap-4 pointer-events-auto">
                <Graveyard graveyard={players[selfId].graveyard} owner={selfId} cardBackImg={playerCardBack} />
                <PlayerAvatar player={players[selfId]} onAvatarClick={() => handlePlayerClick(selfId)} isTargetForSpell={false} equippedCosmetics={equippedCosmetics} isMultiTarget={multiTargetState?.selectedTargets.some(t => t.instanceId === selfId)} />
            </div>
        </div>
        
        <Hand playerState={players[otherId]} owner={otherId} isVisible={isHandVisible} onCardClick={() => {}} cardBackImg={opponentCardBack} tutorialState={tutorialState} isInitialDraw={phase === 'initial-draw'} isOpponentPerspective={isOpponentPerspective} />
        <Hand playerState={players[selfId]} owner={selfId} isVisible={isHandVisible} onCardClick={handleInspectHandCard} cardBackImg={playerCardBack} tutorialState={tutorialState} isInitialDraw={phase === 'initial-draw'} isOpponentPerspective={isOpponentPerspective} />
        
        {localInspectedCard && <CardDetailModal card={localInspectedCard} gameState={gameState} onClose={() => setLocalInspectedCard(null)} onActivate={handleActivateAbility} onPlayFromHand={handlePlayFromHand} onOvercharge={(card) => setGameState(produce(draft => { if(!draft) return; draft.overchargeState = { card, position: card.position!, aether: draft.players[selfId].aether.current }; setLocalInspectedCard(null); }))} />}
        
        <div className={cn("absolute inset-0 z-40 pointer-events-none transition-opacity duration-300", combatState.isTargeting && "bg-black/40")}>
            {combatState.isTargeting && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-20 bg-background/80 border border-primary px-4 py-2 rounded-lg text-center pointer-events-auto">
                    <p>{t('chooseTargetFor', { card: localizeCard(combatState.isTargeting.sourceCard).name })}</p>
                    <Button variant="destructive" className="mt-2" onClick={cancelTargeting}>{t('cancel')}</Button>
                </div>
            )}
        </div>
        
        
        <AlertDialog open={showSurrenderDialog} onOpenChange={setShowSurrenderDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('surrenderTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                       {t('surrenderDescription')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={surrenderConfirm}>{t('surrender')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </GameStateContext.Provider>
  );
}
