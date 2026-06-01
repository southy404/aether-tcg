'use client';

import React, { useEffect, useState } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import { GameCard } from '@/lib/types';
import Image from 'next/image';
import { cn, hasFocusCapability } from '@/lib/utils';
import { Swords, Heart, Star } from 'lucide-react';
import { useI18n } from '@/i18n';

interface CardInHandProps {
  card: GameCard;
  handCount: number;
  index: number;
  onClick: (card: GameCard) => void;
  isHighlighted?: boolean;
  isInitialDraw: boolean;
  displayCost: number;
}

export const ItemTypes = {
  CARD: 'card',
};

const AetherIcon = ({ amount }: { amount:string }) => (
    <span className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-white/50 bg-teal-500 font-bold text-[8px] text-white shadow-sm mx-0.5 align-middle">
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

export default function CardInHand({ card, handCount, index, onClick, isHighlighted, isInitialDraw, displayCost }: CardInHandProps) {
  const { localizeCard, cardType, element } = useI18n();
  const localizedCard = localizeCard(card);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CARD,
    item: { ...card },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isInitialDraw) {
      const timer = setTimeout(() => {
        setIsRendered(true);
      }, index * 100 + 50); 
      return () => clearTimeout(timer);
    } else {
      // For cards drawn mid-game, render them immediately.
      setIsRendered(true);
    }
  }, [isInitialDraw, index]);

  const costBadgeColorClass = {
    Unit: 'bg-red-600',
    Spell: 'bg-blue-600',
    Trap: 'bg-purple-600',
    Aether: 'bg-teal-500',
    Relic: 'bg-orange-700',
  }[card.type] || 'bg-gray-500';

  const cardOffset = (index - Math.floor(handCount / 2)) * 40;
  const rotation = (index - Math.floor(handCount / 2)) * 3;

  return (
    <div
      ref={drag}
      id={`card-in-hand-${card.id}`}
      onClick={() => onClick(card)}
      className={cn(
        "w-[140px] h-[200px] relative transition-all duration-300 ease-out pointer-events-auto",
        "hover:-translate-y-8 hover:z-50 hover:scale-110",
        "group-hover/hand:opacity-50 hover:!opacity-100",
        isHighlighted && "tutorial-highlight rounded-md",
        isDragging && "opacity-0",
        !isRendered && "translate-y-full opacity-0"
      )}
      style={{
        transform: `translateX(${cardOffset}px) rotateZ(${rotation}deg)`,
        zIndex: isHighlighted ? 160 : index,
      }}
    >
      <div
        className={cn(
          'card-face w-full h-full bg-card rounded-md relative overflow-hidden border-2 border-border transition-transform duration-100 ease-out rarity-' +
            card.rarity,
        )}
      >
        <Image src={card.img} alt={localizedCard.name} fill className="object-cover" />
        <div className="holo-overlay absolute inset-0"></div>

        <div
          className={cn(
            'cost-badge absolute top-1 left-1 w-6 h-6 rounded-full border border-white flex items-center justify-center font-bold text-sm text-white z-10',
            costBadgeColorClass,
            displayCost > card.cost && 'text-red-400',
            displayCost < card.cost && 'text-green-400'
          )}
        >
          {displayCost}
        </div>

        <div className="card-content absolute bottom-0 left-0 w-full h-3/5 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-1.5 box-border flex flex-col justify-end">
          <h3 className="text-xs font-bold uppercase text-primary tracking-wide mb-0.5">
            {localizedCard.name}
          </h3>
          <p className="text-[9px] font-semibold text-gray-300 mb-1">
            {cardType(card.type)}
            {card.type !== 'Aether' && ` | ${element(card.element)}`}
          </p>
          <div className="text-[8px] text-gray-300 min-h-[20px] line-clamp-2">
            {parseDescription(localizedCard.text)}
          </div>
          <div className="card-stats flex justify-between items-center mt-0.5">
            <div className="flex gap-1">
              {card.type === 'Unit' && (
                <>
                  <div className="stat stat-atk-bg flex items-center gap-0.5 text-white px-1 rounded-sm text-[10px] font-bold bg-red-600/80">
                    <Swords size={10} /> {card.atk}
                  </div>
                  <div className="stat stat-hp-bg flex items-center gap-0.5 text-white px-1 rounded-sm text-[10px] font-bold bg-green-600/80">
                    <Heart size={10} /> {card.hp}
                  </div>
                  {hasFocusCapability(card) && (
                    <div className="stat stat-fokus-bg flex items-center gap-0.5 text-white px-1 rounded-sm text-[10px] font-bold bg-blue-600/80">
                      <Star size={10} /> {card.fokus || 0}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="text-[8px] font-mono text-gray-400 self-end">
              {card.set.substring(0, 3)} {card.numberInSet}/{card.totalInSet}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
