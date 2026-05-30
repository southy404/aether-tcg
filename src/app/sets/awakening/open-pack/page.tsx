
'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MASTER_DB } from '@/lib/cards';
import type { CardData, Element, Rarity, InspectedCard } from '@/lib/types';
import { useAppContext } from '@/context/AppContext';
import { getRandomItem } from '@/lib/utils';
import CardDetailModal from '@/components/game/CardDetailModal';
import { playSound } from '@/lib/audio';
import RevealingCard from '@/components/game/RevealingCard';
import PackRip from '@/components/game/PackRip';
import { useI18n } from '@/i18n';

const PACK_SIZE = 5;

function generatePack(element: Element | null): CardData[] {
    const pack: CardData[] = [];

    const getCardByRarityAndElement = (rarity: Rarity, biasedElement: Element | null, excludeIds: number[] = []): CardData => {
        let potentialCards = MASTER_DB.filter(c => c.rarity === rarity && !excludeIds.includes(c.id));
        if (potentialCards.length === 0) { // Fallback if no cards of that rarity exist
           potentialCards = MASTER_DB.filter(c => !excludeIds.includes(c.id));
        }

        if (biasedElement) {
            const biasedCards = potentialCards.filter(c => c.element === biasedElement);
            // 60% chance to get a card from the biased element, if available
            if (biasedCards.length > 0 && Math.random() < 0.6) {
                return getRandomItem(biasedCards);
            }
        }
        return getRandomItem(potentialCards);
    };
    
    const getAetherCard = (): CardData => {
        const aetherCards = MASTER_DB.filter(c => c.type === 'Aether');
        const rand = Math.random() * 100;
        let rarityToGet: Rarity;

        if (rand < 0.5) rarityToGet = "Legendary";  // 0.5%
        else if (rand < 5.5) rarityToGet = "Epic"; // 5%
        else if (rand < 25.5) rarityToGet = "Rare"; // 20%
        else rarityToGet = "Uncommon";
        
        let potentialAether = aetherCards.filter(c => c.rarity === rarityToGet);
        if (potentialAether.length === 0) {
            // Fallback to most common rarity if no cards of the target rarity exist
            potentialAether = aetherCards.filter(c => c.rarity === 'Common');
        }
        
        return getRandomItem(potentialAether.length > 0 ? potentialAether : aetherCards);
    }

    const drawnIds: number[] = [];
    
    // 1. Aether Slot
    const aetherCard = getAetherCard();
    pack.push(aetherCard);
    drawnIds.push(aetherCard.id);

    // 2. Three Common/Uncommon slots
    for (let i = 0; i < 3; i++) {
        const rand = Math.random();
        const rarity: Rarity = rand < 0.2 ? "Uncommon" : "Common";
        pack.push(getCardByRarityAndElement(rarity, element, drawnIds));
        drawnIds.push(pack[pack.length - 1].id);
    }
    
    // 3. High-Rarity Slot (guaranteed at least one rare)
    const random = Math.random() * 100;
    let highRarity: Rarity;
    if (random <= 0.01) highRarity = "GOD";
    else if (random <= 0.51) highRarity = "Legendary";
    else if (random <= 20.51) highRarity = "Epic";
    else highRarity = "Rare";
    
    pack.push(getCardByRarityAndElement(highRarity, element, drawnIds));

    // Shuffle the pack so the rare card isn't always last
    return pack.sort(() => Math.random() - 0.5);
}


function PackOpeningComponent() {
  const { t } = useI18n();
  const { addCardsToInventory, inventory, awardAccountXp } = useAppContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const packElement = searchParams.get('element') as Element | null;

  const [revealedCount, setRevealedCount] = useState(0);
  const [pack, setPack] = useState<CardData[]>([]);
  const [inspectedCard, setInspectedCard] = useState<InspectedCard | null>(null);
  const [openingState, setOpeningState] = useState<'ripping' | 'revealing'>('ripping');
  const [isRevealingHighRarity, setIsRevealingHighRarity] = useState(false);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (packElement) {
      setRevealedCount(0);
      setPack(generatePack(packElement));
      setInspectedCard(null); // Reset inspected card on new pack
      setOpeningState('ripping');
      setIsRevealingHighRarity(false);
    }
  }, [packElement]);

  const handleCardRevealed = () => {
    setRevealedCount(prev => prev + 1);
  };

  const handleCollect = () => {
    playSound('positive');
    addCardsToInventory(pack.map(c => c.id));
    void awardAccountXp('packOpened');
    router.push('/sets/awakening/packs');
  };

  const handleCardClick = (card: CardData) => {
    playSound('positive');
    setInspectedCard({ ...card, instanceId: `pack-opened-${card.id}` });
  };
  
  const onRipComplete = () => {
    setTimeout(() => {
      setOpeningState('revealing');
    }, 500); // Small delay after rip before cards are clickable
  };

  const allRevealed = revealedCount === PACK_SIZE;

   const mockGameState: any = {
    activePlayer: 'player',
    phase: 'main',
  };

  return (
    <>
      <div ref={flashRef} id="flash" className="fixed inset-0 bg-white opacity-0 z-[1000] pointer-events-none"></div>
      <CardDetailModal
        card={inspectedCard}
        gameState={mockGameState}
        onClose={() => { playSound('negative'); setInspectedCard(null); }}
        onActivate={() => {}}
      />
      <div className="w-screen h-screen bg-background/90 flex flex-col items-center justify-center p-8 overflow-hidden">
        
        {openingState === 'ripping' && packElement && (
            <PackRip element={packElement} onRipComplete={onRipComplete} />
        )}
        
        {openingState === 'revealing' && (
           <>
            <h2 className="text-3xl font-bold text-primary mb-8">
                {allRevealed ? t('packRevealed') : t('clickToReveal')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-10 justify-items-center mb-8">
                {pack.map((card, index) =>
                  <RevealingCard 
                    key={card.id + '-' + index}
                    card={card}
                    onCardClick={handleCardClick}
                    onRevealed={handleCardRevealed}
                    flashRef={flashRef}
                    isBlocked={isRevealingHighRarity}
                    onAnimationStart={() => setIsRevealingHighRarity(true)}
                    onAnimationEnd={() => setIsRevealingHighRarity(false)}
                    initialInventory={inventory}
                  />
                )}
            </div>
            {allRevealed && (
                <Button onClick={handleCollect} variant="tcg" size="lg">
                  {t('collect')}
                </Button>
            )}
           </>
        )}
      </div>
    </>
  );
}

// Wrapper component to handle suspense
export default function PackOpeningPage() {
    return (
        <Suspense fallback={<div className="w-screen h-screen flex items-center justify-center bg-background text-primary">Loading Pack...</div>}>
            <PackOpeningComponent />
        </Suspense>
    );
}
