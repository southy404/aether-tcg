

'use client';

import { useState } from 'react';
import { MASTER_DB } from '@/lib/cards';
import Card from '@/components/Card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Rarity, InspectedCard, CardData } from '@/lib/types';
import CardDetailModal from '@/components/game/CardDetailModal';
import { useI18n } from '@/i18n';

const SET_NAME = "AWAKENING";
const setCards = MASTER_DB.filter(c => c.set === SET_NAME).sort((a, b) => a.numberInSet - b.numberInSet);

const countByRarity = (rarity: Rarity) => setCards.filter(c => c.rarity === rarity).length;
const countAether = () => setCards.filter(c => c.type === 'Aether').length;

const numCommons = countByRarity('Common');
const numRares = countByRarity('Rare');
const numEpics = countByRarity('Epic');
const numLegendaries = countByRarity('Legendary');
const numGods = countByRarity('GOD');
const numAether = countAether();

const packStructure = {
    totalCards: 5,
    commonSlots: 2,
    rareSlot: 1,
    highRaritySlot: 1,
    aetherSlot: 1,
};

const highRarityChances = {
    Rare: 0.7949, // 100 - 20 - 0.5 - 0.01 = 79.49
    Epic: 0.20,
    Legendary: 0.005,
    GOD: 0.0001,
};

const calculateChancePerCard = (card: CardData): string => {
    let totalChance = 0;
    const { rarity, type } = card;

    if (type === 'Aether') {
        const numAetherCards = setCards.filter(c => c.type === 'Aether').length;
        if (numAetherCards === 0) return '0%';
        totalChance = packStructure.aetherSlot / numAetherCards;
    } else {
        const numCardsOfRarity = setCards.filter(c => c.rarity === rarity && c.type !== 'Aether').length;
        if (numCardsOfRarity === 0) return '0%';

        let chanceInSlots = 0;
        if (rarity === 'Common') {
            chanceInSlots = packStructure.commonSlots;
        } else if (rarity === 'Rare') {
            chanceInSlots = packStructure.rareSlot + (packStructure.highRaritySlot * highRarityChances.Rare);
        } else if (rarity === 'Epic') {
            chanceInSlots = packStructure.highRaritySlot * highRarityChances.Epic;
        } else if (rarity === 'Legendary') {
            chanceInSlots = packStructure.highRaritySlot * highRarityChances.Legendary;
        } else if (rarity === 'GOD') {
            chanceInSlots = packStructure.highRaritySlot * highRarityChances.GOD;
        }
        totalChance = chanceInSlots / numCardsOfRarity;
    }
    
    // Convert to percentage and format
    const percentage = totalChance * 100;
    if (percentage < 0.01) return `<0.01%`;
    if (percentage > 100) return `>100%`; // Should not happen with correct logic
    return `~${percentage.toFixed(2)}%`;
};

const probabilities: Record<string, string> = {};
setCards.forEach(card => {
    probabilities[card.id] = calculateChancePerCard(card);
});


const getRarityColor = (rarity: Rarity) => {
    switch (rarity) {
        case 'Uncommon': return 'text-green-400';
        case 'Rare': return 'text-blue-400';
        case 'Epic': return 'text-purple-400';
        case 'Legendary': return 'text-yellow-400';
        case 'GOD': return 'text-red-500';
        default: return 'text-muted-foreground';
    }
}

export default function AwakeningSetPage() {
  const [inspectedCard, setInspectedCard] = useState<InspectedCard | null>(null);
  const { t, rarity } = useI18n();

  // A minimal mock GameState is needed for CardDetailModal
  const mockGameState: any = {
    activePlayer: 'player',
    phase: 'main',
  };

  const handleCardClick = (card: CardData) => {
    setInspectedCard({ ...card, instanceId: `${card.id}` });
  };

  return (
    <>
      <CardDetailModal
        card={inspectedCard}
        gameState={mockGameState}
        onClose={() => setInspectedCard(null)}
        onActivate={() => {}} // No activate functionality in set view
      />
      <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
              <h1 className="text-4xl font-bold title-gradient uppercase">{t('cardSetTitle', { name: SET_NAME })}</h1>
              <p className="text-muted-foreground mt-2">{t('cardsInSet', { count: setCards.length })}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-12 justify-items-center">
            {setCards.map((card) => (
               <div key={card.id} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => handleCardClick(card)}>
                  <Card card={card} />
                  <div className="text-center text-xs">
                      <p className={`font-bold ${getRarityColor(card.rarity)}`}>{rarity(card.rarity)}</p>
                      <p className="text-muted-foreground">
                        {t('chancePerCard', { chance: probabilities[card.id] })}
                      </p>
                  </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-16">
              <Link href="/sets" passHref>
                  <Button variant="tcg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToSetSelection')}
                  </Button>
              </Link>
          </div>
      </div>
    </>
  );
}
