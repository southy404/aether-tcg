'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Card from '@/components/Card';
import { MASTER_DB } from '@/lib/cards';
import type { CardData, Element, Rarity, InspectedCard } from '@/lib/types';
import { useAppContext } from '@/context/AppContext';
import { getRandomItem, cn } from '@/lib/utils';
import Image from 'next/image';
import CardDetailModal from './game/CardDetailModal';
import { playSound } from '@/lib/audio';
import { useI18n } from '@/i18n';

const PACK_SIZE = 5;

const CardBack = ({ onClick }: { onClick: () => void }) => (
  <div
    className="w-[200px] h-[290px] bg-radial-gradient border-2 border-primary rounded-xl flex justify-center items-center cursor-pointer perspective-1000 p-4 pack-float"
    onClick={onClick}
  >
    <Image src="/logo.png" alt="AETHER Card Back" width={180} height={38} className="object-contain" />
  </div>
);

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
    
    const getCardByType = (type: 'Aether'): CardData => {
        const aetherCards = MASTER_DB.filter(c => c.type === type);
        return getRandomItem(aetherCards);
    }

    const drawnIds: number[] = [];
    
    // 1. Aether Slot
    const aetherCard = getCardByType('Aether');
    pack.push(aetherCard);
    drawnIds.push(aetherCard.id);

    // 2. Common Slots (2 cards)
    pack.push(getCardByRarityAndElement("Common", element, drawnIds));
    drawnIds.push(pack[pack.length - 1].id);
    pack.push(getCardByRarityAndElement("Common", element, drawnIds));
    drawnIds.push(pack[pack.length - 1].id);
    
    // 3. Rare Slot (guaranteed at least one rare)
    pack.push(getCardByRarityAndElement("Rare", element, drawnIds));
    drawnIds.push(pack[pack.length - 1].id);
    
    // 4. High-Rarity Slot
    const random = Math.random() * 100;
    let highRarity: Rarity;
    if (random <= 0.01) highRarity = "GOD";
    else if (random <= 0.51) highRarity = "Legendary"; // 0.01 + 0.50
    else if (random <= 20.51) highRarity = "Epic";      // 0.51 + 20.00
    else highRarity = "Rare";                           // The rest
    
    pack.push(getCardByRarityAndElement(highRarity, element, drawnIds));

    // Shuffle the pack so the rare card isn't always last
    return pack.sort(() => Math.random() - 0.5);
}


function PackOpeningComponent() {
  const { addCardsToInventory } = useAppContext();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const packElement = searchParams.get('element') as Element | null;

  const [revealedCards, setRevealedCards] = useState<(CardData | null)[]>([]);
  const [newCards, setNewCards] = useState<CardData[]>([]);
  const [inspectedCard, setInspectedCard] = useState<InspectedCard | null>(null);

  useEffect(() => {
    if (packElement) {
      setRevealedCards(Array(PACK_SIZE).fill(null));
      const generatedPack = generatePack(packElement);
      setNewCards(generatedPack);
      setInspectedCard(null); // Reset inspected card on new pack
    }
  }, [packElement]);

  const handleReveal = (index: number) => {
    if (revealedCards[index] === null) {
      const card = newCards[index];
      if (card.rarity === 'Epic' || card.rarity === 'Legendary' || card.rarity === 'GOD') {
        playSound('epic');
      } else {
        playSound('selection');
      }
      
      const updatedRevealedCards = [...revealedCards];
      updatedRevealedCards[index] = card;
      setRevealedCards(updatedRevealedCards);
    }
  };

  const handleCollect = () => {
    playSound('positive');
    addCardsToInventory(newCards.map(c => c.id));
    router.push('/sets/awakening/packs');
  };

  const handleCardClick = (card: CardData) => {
    playSound('positive');
    setInspectedCard({ ...card, instanceId: `${card.id}` });
  };
  
  const allRevealed = revealedCards.every(card => card !== null);

   const mockGameState: any = {
    activePlayer: 'player',
    phase: 'main',
  };

  const getRevealAnimationClass = (card: CardData) => {
    if (card.rarity === 'GOD') return 'god-reveal';
    if (card.rarity === 'Legendary') return 'legendary-reveal';
    if (card.rarity === 'Epic') return 'legendary-reveal'; // Can use same as legendary or a different one
    return '';
  }

  return (
    <>
      <CardDetailModal
        card={inspectedCard}
        gameState={mockGameState}
        onClose={() => { playSound('negative'); setInspectedCard(null); }}
        onActivate={() => {}}
      />
      <div className="w-screen h-screen bg-background/90 flex flex-col items-center justify-center p-8">
        <h2 className="text-3xl font-bold text-primary mb-8">
            {allRevealed ? t('packRevealed') : t('clickToReveal')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 justify-items-center mb-8">
            {revealedCards.map((card, index) =>
            card ? (
                <div 
                key={index}
                className={cn("card-reveal", getRevealAnimationClass(card))}
                onClick={() => handleCardClick(card)}
                >
                <Card card={card} />
                </div>
            ) : (
                <CardBack key={index} onClick={() => handleReveal(index)} />
            )
            )}
        </div>
        {allRevealed && (
            <Button onClick={handleCollect} size="lg">
            {t('collect')}
            </Button>
        )}
      </div>
    </>
  );
}

// Wrapper component to handle suspense
export default function PackOpeningPage() {
    return (
        <Suspense fallback={<div>Loading Pack...</div>}>
            <PackOpeningComponent />
        </Suspense>
    );
}
