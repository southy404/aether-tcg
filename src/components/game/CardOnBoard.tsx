'use client';

import React, { useRef, useState, useEffect } from 'react';
import { GameCard, GamePhase, PlayerId } from '@/lib/types';
import Image from 'next/image';
import { cn, hasFocusCapability } from '@/lib/utils';
import { Swords, Heart, Star, Shield, Paperclip, Sparkles, Disc, Leaf } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useGameState } from './GameBoard';
import { produce } from 'immer';
import { useI18n } from '@/i18n';

interface CardOnBoardProps {
  card: GameCard;
  owner: PlayerId;
  isAttacker?: boolean;
  isBlocker?: boolean;
  isSelected?: boolean;
  isFaceDown: boolean;
  cardBackImg: string;
  onCardClick: (card: GameCard, position: number) => void;
  onRelicClick: (relic: GameCard) => void;
  phase: GamePhase;
  activePlayer: PlayerId;
  onEffectEnd?: (instanceId: string) => void;
}

export default function CardOnBoard({ card, owner, isAttacker, isBlocker, isSelected, isFaceDown, cardBackImg, onCardClick, onRelicClick, phase, activePlayer, onEffectEnd }: CardOnBoardProps) {
  const { localizeCard, t } = useI18n();
  const localizedCard = localizeCard(card);
  const costBadgeColorClass = {
    Unit: 'bg-red-600',
    Spell: 'bg-blue-600',
    Trap: 'bg-purple-600',
    Aether: 'bg-teal-500',
    Relic: 'bg-orange-700',
  }[card.type] || 'bg-gray-500';

  const { setGameState } = useGameState();
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.position === undefined) return;
    onCardClick(card, card.position);
  }

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.target === e.currentTarget && card.effect && onEffectEnd) {
      onEffectEnd(card.instanceId);
    }
  };

  if (isFaceDown) {
    const isClickable = owner === 'player';
    return (
        <div 
            className={cn("w-[100px] h-[145px] relative", isClickable && "cursor-pointer")} 
            onClick={isClickable ? handleCardClick : undefined}
        >
            <div className="w-full h-full border-2 border-purple-500 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
               <Image src={cardBackImg} alt="Card Back" fill className="object-cover rounded-md"/>
            </div>
        </div>
    )
  }

  const handleOverchargeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.position === undefined) return;
    
    setGameState(produce(draft => {
        if (!draft) return;
        const unit = draft.players.player.unitZone[card.position!];
        if (unit && (unit.currentHp || 0) <= 1) {
            // This is just a visual feedback, the main logic will be in GameBoard.
            // Using a simple toast here for immediate feedback.
             draft.players.player.currentMessage = t('notEnoughHpOvercharge');
            return;
        }

        draft.overchargeState = {
            card: card,
            position: card.position,
            aether: draft.players.player.aether.current,
        };
    }));
  }

  const canOvercharge = card.keywords?.overcharge && 
                        card.owner === 'player' && 
                        phase === 'main' && 
                        activePlayer === 'player' &&
                        !card.isExhausted;
  
  const getEffectClass = () => {
    switch (card.effect) {
      case 'damage': return 'animate-shake border-red-500';
      case 'heal': return 'border-green-400';
      case 'summon': return 'animate-spawn';
      case 'destroy': return 'animate-destroy';
      case 'artifact': return 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)]';
      default: return '';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
           <div
            data-card-id={card.id}
            className={cn(
              "w-[100px] h-[145px] relative transition-all duration-300 ease-in-out cursor-pointer",
              card.isExhausted && card.type === 'Unit' && !card.isFrozen && !card.isEntangled && 'opacity-70 rotate-12',
              (card.isFrozen || card.isEntangled) && 'opacity-80'
              )}
            onClick={handleCardClick}
          >
            {/* FX Overlays */}
            {card.effect === 'damage' && <div className="absolute inset-0 bg-red-500/30 z-20 pointer-events-none animate-pulse" />}
            {card.effect === 'heal' && <div className="absolute inset-0 bg-green-500/20 z-20 pointer-events-none" />}
            {card.effect === 'summon' && <div className="absolute inset-0 bg-white z-50 animate-[fadeOut_0.5s_ease-out_forwards]" style={{ animationName: "fadeOut" }} />}
            {card.effect === 'artifact' && <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden"><div className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-sheen" /></div>}
            {card.effect === 'activate' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center pointer-events-none"><div className="w-10 h-10 rounded-full border-2 border-cyan-400 bg-cyan-400/30 animate-ripple shadow-[0_0_20px_cyan]" /></div>}

            {card.isEntangled && (
                <div className="absolute inset-0 bg-green-900/30 rounded-md flex items-center justify-center z-10 pointer-events-none animate-pulse">
                    <Leaf className="h-8 w-8 text-white drop-shadow-lg" />
                </div>
            )}
            {card.isFrozen && (
                <div className="absolute inset-0 bg-cyan-500/30 rounded-md flex items-center justify-center z-10 pointer-events-none animate-pulse">
                    <Disc className="h-8 w-8 text-white drop-shadow-lg" />
                </div>
            )}
            {card.attachedRelic && (
              <div 
                  className="absolute -top-1 -right-4 w-8 h-8 bg-background/80 border border-primary rounded-full flex items-center justify-center z-20 cursor-pointer hover:scale-110 transition-transform"
                  onClick={(e) => {
                      e.stopPropagation();
                      onRelicClick(card.attachedRelic!);
                  }}
              >
                  <Paperclip className="h-4 w-4 text-primary" />
              </div>
            )}
            {canOvercharge && (
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <div 
                              className="absolute -top-2 -right-3 w-8 h-8 bg-orange-600/80 border border-orange-400 rounded-full flex items-center justify-center z-20 cursor-pointer hover:scale-110 transition-transform hover:bg-orange-500"
                              onClick={handleOverchargeClick}
                          >
                              <Sparkles className="h-4 w-4 text-white" />
                          </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                          <p>{t('activateOvercharge')}</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            )}
            <div
              className={cn(
                  'card-face w-full h-full bg-card rounded-md relative overflow-hidden border transition-transform duration-100 ease-out rarity-' + card.rarity,
                  isSelected ? 'border-blue-400 shadow-lg shadow-blue-400/50 scale-105' : 'border-border',
                  getEffectClass()
              )}
              onAnimationEnd={handleAnimationEnd}
            >
              <Image src={card.img} alt={localizedCard.name} fill className="object-cover" />
              <div className="holo-overlay absolute inset-0"></div>

              {isAttacker && (
                  <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center z-10 pointer-events-none">
                      <Swords className="h-8 w-8 text-white drop-shadow-lg" />
                  </div>
              )}
              {isBlocker && (
                  <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center z-10 pointer-events-none">
                      <Shield className="h-8 w-8 text-white drop-shadow-lg" />
                  </div>
              )}
              
              <div className={cn(
                "cost-badge absolute top-1 left-1 w-5 h-5 rounded-full border border-white flex items-center justify-center font-bold text-xs text-white z-10",
                costBadgeColorClass
              )}>
                {card.cost}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-1.5 flex flex-col justify-end z-10 bg-gradient-to-t from-black/90 to-transparent">
                  <h3 className="text-[10px] font-bold uppercase text-primary tracking-wide truncate">{localizedCard.name}</h3>

                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-200">
                      <div className="flex gap-0.5">
                          {card.type === 'Unit' && card.currentHp !== undefined && card.currentAtk !== undefined && (
                              <>
                              <div className={cn(
                                  "flex items-center gap-0.5 text-white px-0.5 rounded-sm font-bold bg-red-600/80",
                                  // Highlight when buffed beyond base attack (overcharge / +1 buffs).
                                  card.atk !== undefined && card.currentAtk > card.atk && 'text-orange-300'
                              )}>
                                  <Swords size={8} /> {card.currentAtk}
                              </div>
                              <div className={cn(
                                  "flex items-center gap-0.5 text-white px-0.5 rounded-sm font-bold bg-green-600/80",
                                  card.currentHp < card.hp! ? 'text-red-400' : ''
                              )}>
                                  <Heart size={8} /> {card.currentHp}
                              </div>
                              {hasFocusCapability(card) && (
                                  <div className="flex items-center gap-0.5 text-white px-0.5 rounded-sm font-bold bg-yellow-400/80">
                                      <Star size={8} /> {card.currentFokus}
                                  </div>
                              )}
                              </>
                          )}
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side={owner === 'player' ? 'top' : 'bottom'}>
          <p className="max-w-xs">{localizedCard.text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
