'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { CardData, Rarity, CardType } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Heart, Star, Swords } from 'lucide-react';
import { useI18n } from '@/i18n';

interface CardProps {
  card: CardData;
  className?: string;
  onClick?: () => void;
  onOverchargeClick?: () => void;
  disableHover?: boolean;
}

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

const AetherIcon = ({ amount }: { amount: string }) => (
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

const typeGradientClass: Record<CardType, string> = {
  Unit: 'from-red-900/80',
  Spell: 'from-blue-900/80',
  Trap: 'from-purple-900/80',
  Aether: 'from-teal-900/80',
  Relic: 'from-orange-800/80',
};


export default function Card({ card, className, onClick, disableHover = false }: CardProps) {
  const { localizeCard, cardType, element } = useI18n();
  const localizedCard = localizeCard(card);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardFaceRef = useRef<HTMLDivElement>(null);
  const mainImgContainerRef = useRef<HTMLDivElement>(null);
  const overlayImgRef = useRef<HTMLDivElement>(null);
  const defaultImgRef = useRef<HTMLDivElement>(null);


  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableHover || !containerRef.current || !cardFaceRef.current) return;

    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    const mouseX = x / width;
    const mouseY = y / height;
    
    // For shine effect (using CSS variables on the container)
    containerRef.current.style.setProperty('--mx', `${mouseX * 100}%`);
    containerRef.current.style.setProperty('--my', `${mouseY * 100}%`);

    // For tilt effect (directly manipulating the card face's transform)
    const rotateX = (mouseY - 0.5) * -25;
    const rotateY = (mouseX - 0.5) * 25;
    cardFaceRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    // GOD card parallax effect
    if (card.rarity === 'GOD') {
        if (mainImgContainerRef.current) {
            mainImgContainerRef.current.style.transform = `translateX(${(mouseX - 0.5) * -10}px) translateY(${(mouseY - 0.5) * -10}px)`;
        }
        if (overlayImgRef.current) {
            overlayImgRef.current.style.transform = `translateX(${(mouseX - 0.5) * -25}px) translateY(${(mouseY - 0.5) * -25}px)`;
        }
        if (defaultImgRef.current) {
            defaultImgRef.current.style.transform = `translateX(${(mouseX - 0.5) * -50}px) translateY(${(mouseY - 0.5) * -50}px)`;
        }
    }
  };

  const handleMouseLeave = () => {
    if (disableHover || !containerRef.current || !cardFaceRef.current) return;
    
    // Reset shine
    containerRef.current.style.setProperty('--mx', `50%`);
    containerRef.current.style.setProperty('--my', `50%`);
    
    // Reset tilt
    cardFaceRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';

     // Reset parallax
    if (card.rarity === 'GOD') {
        if (mainImgContainerRef.current) {
            mainImgContainerRef.current.style.transform = 'translateX(0px) translateY(0px)';
        }
        if (overlayImgRef.current) {
            overlayImgRef.current.style.transform = 'translateX(0px) translateY(0px)';
        }
        if (defaultImgRef.current) {
            defaultImgRef.current.style.transform = 'translateX(0px) translateY(0px)';
        }
    }
  };

  const isGodCard = card.rarity === 'GOD';
  const isEpicOrLegendary = card.rarity === 'Epic' || card.rarity === 'Legendary';


  const costBadgeColorClass = {
    Unit: 'bg-red-600',
    Spell: 'bg-blue-600',
    Trap: 'bg-purple-600',
    Aether: 'bg-teal-500',
    Relic: 'bg-orange-700',
  }[card.type] || 'bg-gray-500';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            <div
            ref={containerRef}
            className={cn(
              "w-[200px] h-[290px] perspective-1000",
              !disableHover && "card-wrap",
              className
            )}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            >
            <div
                ref={cardFaceRef}
                className={cn(
                    'w-full h-full bg-card rounded-xl relative transition-transform duration-100 ease-out overflow-hidden',
                    'card-frame', 
                    'rarity-' + card.rarity
                )}
                 data-ai-hint={card.img_hint}
            >
                <div ref={mainImgContainerRef} className={cn('relative w-full h-full rounded-xl overflow-hidden z-0 transition-transform duration-100 ease-out')}>
                  <Image src={card.img} alt={localizedCard.name} fill className={cn("object-cover", isGodCard && "scale-110")} sizes="220px" />
                </div>
                
                {!disableHover && (
                  <>
                    <div className="shine-overlay" />
                    <div className="glare-overlay" />
                  </>
                )}

                {isGodCard && !disableHover && <div className="god-holo-overlay z-10" />}
                {isEpicOrLegendary && !disableHover && <div className="epic-legendary-holo-overlay z-10" />}

                
                {card.overlay_img && (
                    <div ref={overlayImgRef} className={cn("absolute inset-0 z-20 pointer-events-none transition-transform duration-100 ease-out animate-gentle-pulse", isGodCard && 'blur-sm')}>
                        <Image src={card.overlay_img} alt={`${localizedCard.name} overlay`} fill className={cn("object-cover", isGodCard && "scale-110")} />
                    </div>
                )}
                
                {card.default_img && (
                    <div ref={defaultImgRef} className="absolute inset-0 z-30 pointer-events-none transition-transform duration-100 ease-out">
                        <Image src={card.default_img} alt={`${localizedCard.name} default`} fill className="object-cover" />
                    </div>
                )}
                
                 {/* Gradient for text background */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent to-60% z-40"></div>

                
                <div className={cn(
                "cost-badge absolute top-2.5 left-2.5 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-bold text-lg text-white z-50 shadow-lg",
                costBadgeColorClass
                )}>
                {card.cost}
                </div>

                {card.type === 'Unit' && (
                <div className="absolute top-2.5 right-2.5 bg-black/60 p-1.5 rounded-md border border-white/20 text-white text-xs space-y-1 z-50">
                    <div className="flex items-center justify-end gap-1">
                        <Swords size={12} className="text-red-400" />
                        <span className="font-bold text-sm text-right">{card.atk}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                        <Heart size={12} className="text-green-400" />
                        <span className="font-bold text-sm text-right">{card.hp}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                        <Star size={12} className="text-yellow-400" />
                        <span className="font-bold text-sm text-right">{card.fokus}</span>
                    </div>
                </div>
                )}
                
                 <div className="absolute inset-x-0 bottom-0 pb-2 z-50 flex flex-col justify-end h-[140px]">
                    <div className="relative">
                       <div className={cn(
                        "absolute inset-y-0 left-0 w-full h-full bg-gradient-to-r to-transparent to-80% z-40",
                        typeGradientClass[card.type] || 'from-black/90'
                       )}></div>
                       <div className="relative flex items-center h-10 z-50">
                           <div className="px-3 leading-tight">
                                <h3 
                                  className={cn(
                                    "text-sm uppercase tracking-wider", 
                                    card.rarity === 'GOD' ? "text-holo-gold font-black" :
                                    card.rarity === 'Legendary' ? "text-holo-gold font-black" : 
                                    card.rarity === 'Epic' ? "text-holo-silver font-bold" : "text-white font-bold"
                                  )}
                                  data-text={localizedCard.name}
                                >
                                  {localizedCard.name}
                                </h3>
                                <p className="text-[10px] font-semibold text-gray-300 mt-0.5">
                                    {cardType(card.type)}
                                    {card.type !== 'Aether' && ` | ${element(card.element)}`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="px-3 z-40 mt-1 h-16">
                       <div className="text-[11px] text-gray-200 overflow-hidden h-full line-clamp-4 whitespace-pre-wrap">
                          {card.keywords?.overcharge && <div className="font-bold text-white">[OVERCHARGE]</div>}
                          {parseDescription(localizedCard.text)}
                        </div>
                    </div>
                    <div className="px-3 z-40 mt-1">
                      <div className="card-stats flex justify-between items-center text-[10px] font-mono">
                          <RaritySymbol rarity={card.rarity} />
                          <span className="text-white">{card.set.substring(0, 3)} {card.numberInSet}/{card.totalInSet}</span>
                      </div>
                    </div>
                </div>
            </div>
            </div>
        </TooltipTrigger>
        <TooltipContent>
            <p className="max-w-xs">{localizedCard.text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
