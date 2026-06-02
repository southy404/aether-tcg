

'use client';

import { useState } from 'react';
import { MASTER_DB } from '@/lib/cards';
import Card from '@/components/Card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Rarity, InspectedCard, CardData, Element } from '@/lib/types';
import CardDetailModal from '@/components/game/CardDetailModal';
import { useI18n } from '@/i18n';

const SET_NAME = "AWAKENING";
const setCards = MASTER_DB.filter(c => c.set === SET_NAME).sort((a, b) => a.numberInSet - b.numberInSet);

// Mirrors generatePack in /sets/awakening/open-pack — 5 cards, one per slot type.
const PACK = { aetherSlot: 1, commonSlots: 3, rarePlusSlot: 1 } as const;

const COMMON_SLOT_RARITY: Partial<Record<Rarity, number>> = {
    Common: 0.80,
    Uncommon: 0.20,
};

const RARE_PLUS_RARITY: Partial<Record<Rarity, number>> = {
    Epic: 0.20,
    Legendary: 0.005,
    GOD: 0.0001,
};
const RARE_PLUS_RARITY_FULL: Partial<Record<Rarity, number>> = {
    ...RARE_PLUS_RARITY,
    Rare: 1 - (RARE_PLUS_RARITY.Epic! + RARE_PLUS_RARITY.Legendary! + RARE_PLUS_RARITY.GOD!),
};

// Aether slot never rolls Common or GOD — see generatePack.
const AETHER_SLOT_RARITY: Partial<Record<Rarity, number>> = {
    Uncommon: 0.745,
    Rare: 0.20,
    Epic: 0.05,
    Legendary: 0.005,
};

const ELEMENT_BIAS = 0.60;
const PACK_ELEMENTS: Element[] = ['Feuer', 'Wasser', 'Aether', 'Erde', 'Luft'];

const nonAetherCards = setCards.filter(c => c.type !== 'Aether');
const aetherTypeCards = setCards.filter(c => c.type === 'Aether');

const countBy = (pool: CardData[], rarity: Rarity, element?: Element) =>
    pool.filter(c => c.rarity === rarity && (!element || c.element === element)).length;

// Per-slot chance to draw `card`, averaged across all PACK_ELEMENTS pack types.
const slotChance = (card: CardData, includesAether: boolean): number => {
    const pool = includesAether ? setCards : nonAetherCards;
    const nTotal = countBy(pool, card.rarity);
    if (nTotal === 0) return 0;

    let summed = 0;
    for (const packElement of PACK_ELEMENTS) {
        const nBiased = countBy(pool, card.rarity, packElement);
        if (nBiased === 0) {
            // generatePack falls back to a uniform pick when the biased pool is empty.
            summed += 1 / nTotal;
        } else {
            const inBiasedPool = card.element === packElement ? 1 / nBiased : 0;
            summed += ELEMENT_BIAS * inBiasedPool + (1 - ELEMENT_BIAS) / nTotal;
        }
    }
    return summed / PACK_ELEMENTS.length;
};

const calculateChancePerCard = (card: CardData): string => {
    const { rarity, type } = card;
    let chance = 0;

    if (type === 'Aether') {
        const numAetherOfRarity = countBy(aetherTypeCards, rarity);
        if (numAetherOfRarity > 0) {
            chance += PACK.aetherSlot * ((AETHER_SLOT_RARITY[rarity] ?? 0) / numAetherOfRarity);
        }
        // Legendary/GOD Aether-type cards can also drop from the Rare+ slot.
        if (rarity === 'Legendary' || rarity === 'GOD') {
            chance += PACK.rarePlusSlot * (RARE_PLUS_RARITY_FULL[rarity] ?? 0) * slotChance(card, true);
        }
    } else if (rarity === 'Common' || rarity === 'Uncommon') {
        chance += PACK.commonSlots * (COMMON_SLOT_RARITY[rarity] ?? 0) * slotChance(card, false);
    } else if (rarity === 'Rare' || rarity === 'Epic') {
        chance += PACK.rarePlusSlot * (RARE_PLUS_RARITY_FULL[rarity] ?? 0) * slotChance(card, false);
    } else if (rarity === 'Legendary' || rarity === 'GOD') {
        chance += PACK.rarePlusSlot * (RARE_PLUS_RARITY_FULL[rarity] ?? 0) * slotChance(card, true);
    }

    const pct = chance * 100;
    if (pct <= 0) return '0%';
    if (pct < 0.01) return '<0.01%';
    if (pct >= 100) return '~100%';
    return `~${pct.toFixed(2)}%`;
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
