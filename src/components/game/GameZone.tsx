
'use client';

import { useDrop, DropTargetMonitor } from 'react-dnd';
import { GameCard, CardType, CombatState, PlayerId, GamePhase, MultiTargetState } from '@/lib/types';
import CardOnBoard from './CardOnBoard';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';
import { ItemTypes } from './CardInHand';

interface GameZoneProps {
  type: 'Unit' | 'Aether' | 'Trap' | 'Relic';
  cards: (GameCard | null)[];
  onDropCard: (card: GameCard, target: { type: 'zone', zone: CardType | 'Trap' | 'Relic', position: number } | { type: 'unit', playerId: PlayerId, position: number }) => void;
  owner: PlayerId;
  onCardClick: (card: GameCard, position: number) => void;
  combatState: CombatState;
  phase: GamePhase;
  activePlayer: PlayerId;
  cardBackImg: string;
  tutorialState?: any;
  className?: string;
  onEffectEnd?: (instanceId: string) => void;
  onMultiTargetSelect?: (target: any) => void;
  multiTargetState?: MultiTargetState | null;
}

const canDropInTutorial = (
  item: GameCard, 
  slot: { card: GameCard | null, type: GameZoneProps['type'], owner: PlayerId }, 
  tutorialState: any
): boolean => {
  if (!tutorialState?.step?.highlightSelector) return false;

  const isCorrectCard = tutorialState.step.highlightSelector === `#card-in-hand-${item.id}`;
  if (!isCorrectCard) return false;

  const dropZoneSelector = tutorialState.step.dropZoneSelector;
  if (!dropZoneSelector) return false;
  
  if (dropZoneSelector.startsWith('.') && dropZoneSelector.includes(slot.type.toLowerCase())) {
      return slot.card == null;
  }

  const targetCardIdMatch = dropZoneSelector.match(/\[data-card-id="(\d+)"\]/);
  const targetCardId = targetCardIdMatch ? parseInt(targetCardIdMatch[1], 10) : null;
  
  if (targetCardId && slot.card && slot.card.id === targetCardId) {
      return item.type === 'Relic';
  }
  
  return false;
}

const ZoneSlot = ({ card, onDropCard, type, position, owner, onCardClick, combatState, phase, activePlayer, cardBackImg, tutorialState, onEffectEnd, onMultiTargetSelect, multiTargetState }: { 
    card: GameCard | null; 
    onDropCard: GameZoneProps['onDropCard']; 
    type: GameZoneProps['type']; 
    position: number; 
    owner: GameZoneProps['owner']; 
    onCardClick: GameZoneProps['onCardClick']; 
    combatState: CombatState; 
    phase: GamePhase;
    activePlayer: PlayerId;
    cardBackImg: string;
    tutorialState?: any;
    onEffectEnd?: (instanceId: string) => void;
    onMultiTargetSelect?: (target: any) => void;
    multiTargetState?: MultiTargetState | null;
}) => {
  const [{ isOver, canDrop, draggedItem }, drop] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item: GameCard) => {
        if(item.type === 'Spell' && card) {
             onDropCard(item, { type: 'unit', playerId: owner, position });
        } else if (item.type === 'Relic' && card) {
            onDropCard(item, { type: 'unit', playerId: owner, position });
        } else {
            onDropCard(item, { type: 'zone', zone: type, position });
        }
    },
    canDrop: (item: GameCard) => {
      if (tutorialState?.step?.highlightSelector) {
        return canDropInTutorial(item, { card, type, owner }, tutorialState);
      }

      if (phase !== 'main' || activePlayer !== item.owner) {
        return false;
      }
      
      if (card && type === 'Unit') {
        if (item.type === 'Spell') return true;
        if (item.type === 'Relic' && owner === item.owner) return true;
        return false;
      }

      if (card == null && owner === item.owner) {
         switch (type) {
            case 'Trap':
              return item.type === 'Trap';
            case 'Unit':
              return item.type === 'Unit';
            case 'Aether':
              return item.type === 'Aether';
            case 'Relic':
              return false;
            default:
              return false;
        }
      }

      return false;
    },
    collect: (monitor: DropTargetMonitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
      draggedItem: monitor.getItem() as GameCard | null,
    }),
  }), [type, position, owner, card, onDropCard, phase, activePlayer, combatState, tutorialState]);

  const isTutorialDropHighlight = draggedItem && tutorialState && canDropInTutorial(draggedItem, { card, type, owner }, tutorialState);

  const isActiveDrop = isOver && canDrop;
  
  const attacks = combatState?.attacks || [];
  
  const attackInfo = attacks.find(a => a.attacker.playerId === owner && a.attacker.position === position);
  const isAttacker = !!attackInfo && type === 'Unit';

  const blockInfo = attacks.find(a => a.blocker?.playerId === owner && a.blocker?.position === position);
  const isBlocker = !!blockInfo && type === 'Unit';

  const isSelectedAsAttacker = phase === 'combat' && activePlayer === owner && isAttacker;
  const isSelectedBlocker = combatState?.selectedBlocker?.playerId === owner && combatState?.selectedBlocker?.position === position;

  const isTargetableForBlock = phase === 'declare-blockers' && owner !== activePlayer && combatState?.selectedBlocker && isAttacker && !attackInfo?.blocker;
  
  const isTargetForSpell = isActiveDrop && draggedItem?.type === 'Spell';
  
  const isTargetForAbility = !!combatState?.isTargeting && card !== null && (
    (combatState.isTargeting.abilityId.includes('DAMAGE') && owner !== combatState.isTargeting.sourceCard.owner) ||
    (combatState.isTargeting.abilityId.includes('FREEZE') && owner !== combatState.isTargeting.sourceCard.owner) ||
    (combatState.isTargeting.abilityId.includes('BANISH') && owner !== combatState.isTargeting.sourceCard.owner) ||
    (combatState.isTargeting.abilityId.includes('DEBUFF') && owner !== combatState.isTargeting.sourceCard.owner)
  );
  
  const isSelectedForMultiTarget = multiTargetState?.selectedTargets.some(t => t.instanceId === `unit-${card?.instanceId}`);

  const handleSlotClick = () => {
    if (multiTargetState && card && onMultiTargetSelect) {
        onMultiTargetSelect({ type: 'unit', playerId: owner, position, instanceId: `unit-${card.instanceId}` });
        return;
    }

    if (card) {
      onCardClick(card, position);
    }
  };

  const isFaceDown = type === 'Trap' && card !== null;

  const handleRelicClick = (relic: GameCard) => {
    onCardClick(relic, -1);
  };


  return (
    <div
      ref={drop}
      className={cn(
        'w-[110px] h-[155px] transition-all relative group flex items-center justify-center',
        'game-board-frame',
        isActiveDrop && 'active-drop',
        isTutorialDropHighlight && !isActiveDrop && 'tutorial-highlight',
        canDrop && !isActiveDrop && owner === activePlayer && 'can-drop',
        isTargetableForBlock && 'cursor-crosshair hover:border-red-500 border-red-500/50',
        isTargetForSpell && 'bg-blue-500/20 border-blue-400',
        isTargetForAbility && 'bg-yellow-500/20 border-yellow-400 cursor-crosshair',
        card && 'border-solid border-transparent',
        card && type === 'Trap' && '!border-purple-800',
        (card || (isTargetableForBlock && combatState?.selectedBlocker)) && 'cursor-pointer',
        isSelectedForMultiTarget && 'border-yellow-400 bg-yellow-500/20 shadow-lg shadow-yellow-400/50'
      )}
      onClick={handleSlotClick}
      id={card?.instanceId}
    >
      {card ? (
        <CardOnBoard 
          owner={owner} 
          card={card} 
          isAttacker={isAttacker} 
          isBlocker={isBlocker} 
          isSelected={isSelectedBlocker || isSelectedAsAttacker} 
          isFaceDown={isFaceDown} 
          cardBackImg={cardBackImg} 
          onCardClick={onCardClick} 
          onRelicClick={handleRelicClick} 
          phase={phase} 
          activePlayer={activePlayer} 
          onEffectEnd={onEffectEnd} 
        />
      ) : (
        <span className="text-white/20 text-sm">{type}</span>
      )}
      
       {isTargetableForBlock && card && (
         <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center pointer-events-none">
            <Shield className="h-10 w-10 text-white" />
        </div>
      )}
    </div>
  );
};

export default function GameZone({ type, cards, onDropCard, owner, onCardClick, combatState, phase, activePlayer, cardBackImg, tutorialState, className, onEffectEnd, onMultiTargetSelect, multiTargetState }: GameZoneProps) {
  const numSlots = type === 'Unit' ? 5 : (type === 'Aether' ? 5 : 2);

  return (
    <div className={cn("flex gap-2 p-2 bg-black/20 rounded-xl border border-white/10", className)}>
      {Array.from({ length: numSlots }).map((_, index) => (
        <ZoneSlot 
          key={index} 
          card={cards[index] ?? null} 
          onDropCard={onDropCard as any} 
          type={type} 
          position={index} 
          owner={owner} 
          onCardClick={onCardClick}
          combatState={combatState}
          phase={phase}
          activePlayer={activePlayer}
          cardBackImg={cardBackImg}
          tutorialState={tutorialState}
          onEffectEnd={onEffectEnd}
          onMultiTargetSelect={onMultiTargetSelect}
          multiTargetState={multiTargetState}
        />
      ))}
    </div>
  );
}
