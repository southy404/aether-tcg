

'use client';

import React, { useState, useRef, useMemo } from 'react';
import Card from '@/components/Card';
import type { CardData } from '@/lib/types';
import { playSound } from '@/lib/audio';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';

interface RevealingCardProps {
    card: CardData;
    onCardClick: (card: CardData) => void;
    onRevealed: () => void;
    flashRef: React.RefObject<HTMLDivElement | null>;
    isBlocked: boolean;
    onAnimationStart: () => void;
    onAnimationEnd: () => void;
    initialInventory: number[];
}

const CardBack = () => (
  <div className="w-full h-full bg-radial-gradient border-2 border-primary rounded-xl flex justify-center items-center p-2 relative overflow-hidden">
    <Image src="/card-back-logo.jpg?v=2" alt="AETHER Card Back" layout="fill" className="object-cover rounded-md"/>
  </div>
);

export default function RevealingCard({ card, onCardClick, onRevealed, flashRef, isBlocked, onAnimationStart, onAnimationEnd, initialInventory }: RevealingCardProps) {
    const { t } = useI18n();
    const [animationState, setAnimationState] = useState<'idle' | 'shaking' | 'revealing' | 'revealed'>('idle');
    const containerRef = useRef<HTMLDivElement>(null);
    const auraRef = useRef<HTMLDivElement>(null);

    const isHighRarity = card.rarity === 'Epic' || card.rarity === 'Legendary' || card.rarity === 'GOD';
    
    const ownedCount = useMemo(() => {
        return initialInventory.filter(id => id === card.id).length;
    }, [initialInventory, card.id]);
    const isNew = ownedCount === 0;

    const triggerFlash = () => {
        const f = flashRef.current;
        if (!f) return;
        f.style.transition = "opacity 0s";
        f.style.opacity = '0.7';
        setTimeout(() => {
          f.style.opacity = '0';
          f.style.transition = 'opacity 0.4s';
        }, 40);
    }
    
    const spawnSparks = () => {
        if (!containerRef.current) return;
        const rarityColor = card.rarity === 'Legendary' || card.rarity === 'GOD' ? '#ffaa00' : '#a020f0';

        for (let i = 0; i < 20; i++) {
          const s = document.createElement("div");
          s.style.position = 'absolute';
          s.style.background = rarityColor;
          s.style.width = '2px';
          s.style.height = '15px';
          s.style.opacity = '0';
          s.style.zIndex = '12';
          s.style.pointerEvents = 'none';

          containerRef.current.appendChild(s);
          const angle = Math.random() * Math.PI * 2;
          const dist = 120 + Math.random() * 50;
          s.style.left = "50%";
          s.style.top = "50%";
          s.animate(
            [
              { transform: `translate(-50%,-50%) rotate(${angle}rad) translateY(0)`, opacity: 1 },
              { transform: `translate(-50%,-50%) rotate(${angle}rad) translateY(-${dist}px) scaleX(0)`, opacity: 0 },
            ],
            { duration: 400, easing: "ease-out" }
          ).onfinish = () => s.remove();
        }
    }

    const handleReveal = () => {
        if (animationState !== 'idle' || isBlocked) return;
        
        playSound(isHighRarity ? 'epic' : 'selection');

        if (isHighRarity) {
            onAnimationStart();
            setAnimationState('shaking');
            setTimeout(() => {
                setAnimationState('revealing');
                // Celebration effects
                setTimeout(() => {
                    triggerFlash();
                    spawnSparks();
                    if(auraRef.current) {
                      auraRef.current.style.opacity = '0.6';
                      auraRef.current.classList.add('pulse-active');
                    }
                }, 200);
            }, 500); // Shake duration
        } else {
            // No shake for common/rare, just reveal
            setAnimationState('revealing');
        }
    };

    const handleAnimationEnd = (e: React.AnimationEvent) => {
        if (e.animationName === 'card-reveal-anim') {
            setAnimationState('revealed');
            onRevealed();
            if (isHighRarity) {
                onAnimationEnd();
            }
        }
    };
    
    const getAuraColor = () => {
        if (card.rarity === 'Legendary' || card.rarity === 'GOD') return '#ffaa00';
        if (card.rarity === 'Epic') return '#a020f0';
        return '#555';
    }
    
    const handleClick = () => {
        if (isBlocked && animationState === 'idle') return;

        if (animationState === 'idle') {
            handleReveal();
        } else if (animationState === 'revealed') {
            onCardClick(card);
        }
    }

    return (
        <div 
            ref={containerRef} 
            className={cn(
                "perspective-1000 relative w-[200px] h-[290px]",
                animationState === 'idle' && !isBlocked && "cursor-pointer",
                animationState === 'revealed' && "cursor-pointer",
                isBlocked && "cursor-not-allowed"
            )}
            onClick={handleClick}
        >
            <div 
                ref={auraRef} 
                className="absolute inset-[-5px] rounded-[20px] blur-[15px] z-5 opacity-0"
                style={{ background: getAuraColor() }}
            ></div>
            
             {animationState === 'revealed' && (
                <div className="absolute top-2 right-2 z-20">
                    {isNew ? (
                    <Badge variant="default" className="bg-yellow-500 text-black shadow-lg">{t('newCardBadge')}</Badge>
                    ) : (
                    <Badge variant="secondary" className="shadow-lg">x{ownedCount + 1}</Badge>
                    )}
                </div>
            )}

            <div 
                className={cn(
                    "w-full h-full relative preserve-3d z-10",
                    animationState === 'shaking' && 'card-shake',
                    animationState === 'revealing' && 'card-reveal-animate'
                )}
                onAnimationEnd={handleAnimationEnd}
                style={animationState === 'revealed' ? { transform: 'scale(1.05) rotateY(180deg)' } : {}}
            >
                <div className="absolute inset-0 backface-hidden rounded-xl">
                    <CardBack />
                </div>
                <div className="absolute inset-0 backface-hidden rounded-xl rotate-y-180">
                    <Card card={card} />
                </div>
            </div>
        </div>
    );
}
