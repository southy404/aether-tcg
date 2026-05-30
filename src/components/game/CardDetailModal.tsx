

'use client';

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '../ui/button';
import type { InspectedCard, GameState, GameCard } from '@/lib/types';
import { TooltipProvider } from '../ui/tooltip';
import { DetailedCard } from './GameBoard';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';


interface CardDetailModalProps {
  card: InspectedCard | null;
  gameState?: GameState;
  onClose: () => void;
  onActivate?: (card: InspectedCard, abilityId: string) => void;
  onPlayFromHand?: (card: InspectedCard) => void;
  onOvercharge?: (card: InspectedCard) => void;
}


export default function CardDetailModal({ card, gameState, onClose, onActivate, onPlayFromHand, onOvercharge }: CardDetailModalProps) {
  const { localizeCard, t } = useI18n();
  if (!card) {
    return null;
  }
  const localizedCard = localizeCard(card as GameCard);

  const isPlayerCard = card.owner === 'player';
  const isPlayerTurnAndMainPhase = gameState?.activePlayer === 'player' && gameState?.phase === 'main';

  // Check for Fokus ability
  const hasFokusAbility = card.id === 5 || card.id === 17 || card.id === 35;
  const canActivateFokus = gameState && onActivate && isPlayerCard && isPlayerTurnAndMainPhase && hasFokusAbility && !card.fromHand && card.currentFokus! > 0 && !card.usedFokusThisTurn && !card.isExhausted;
  
  // Check for Overcharge ability
  const hasOverchargeAbility = !!card.keywords?.overcharge;
  const canActivateOvercharge = gameState && onOvercharge && isPlayerCard && isPlayerTurnAndMainPhase && hasOverchargeAbility && card.type === 'Unit' && !card.isExhausted && !card.fromHand;

  // Check if card can be played from hand
  let canPlayFromHand = false;
  let playButtonText = t('playCard');
  if (gameState && onPlayFromHand && card.owner === 'player' && card.fromHand) {
      if (isPlayerTurnAndMainPhase && gameState.players.player.aether.current >= card.cost!) {
        if (card.type === 'Aether') {
            canPlayFromHand = !gameState.players.player.playedAetherThisTurn;
        } else if (card.type === 'Unit') {
            canPlayFromHand = gameState.players.player.unitZone.some(u => u === null);
        } else if (card.type === 'Spell') {
            const targetlessSpells = [12, 13, 29, 43, 44, 45, 46, 58, 60, 61, 73, 74, 75, 76];
            if (targetlessSpells.includes(card.id)) {
                canPlayFromHand = true;
                playButtonText = t('activate');
            }
        }
      }
  }

  const isAnimation = card.instanceId.startsWith('attack-anim') || card.instanceId.startsWith('play-anim') || card.instanceId.startsWith('trap-anim');

  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && onClose()}>
       <DialogContent className="bg-transparent border-none shadow-none max-w-fit w-full flex flex-col items-center">
            <TooltipProvider>
                <DialogTitle className="sr-only">{localizedCard.name}</DialogTitle>
                <DetailedCard 
                  card={card} 
                  onVideoEnd={isAnimation ? onClose : undefined} 
                  onOvercharge={!card.fromHand ? onOvercharge : undefined}
                />
                <div className="mt-4 flex gap-4">
                    {canActivateFokus && onActivate && (
                        <Button onClick={() => onActivate(card, 'FOKUS_ABILITY')} variant="tcg">
                            {t('focusAbility')}
                        </Button>
                    )}
                    {canPlayFromHand && onPlayFromHand && (
                         <Button onClick={() => onPlayFromHand(card)} variant="tcg">
                           {playButtonText}
                        </Button>
                    )}
                    {canActivateOvercharge && onOvercharge && (
                        <Button onClick={() => onOvercharge(card)} variant="tcg">
                            Overcharge
                        </Button>
                    )}
                    {!isAnimation && (
                        <Button onClick={onClose} variant="tcg">
                            {t('close')}
                        </Button>
                    )}
                </div>
            </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
