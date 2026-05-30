
'use client';

import { useAppContext } from '@/context/AppContext';
import Card from '@/components/Card';
import { useState, useMemo } from 'react';
import type { CardData, CardType, Rarity, InspectedCard, Element } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CardDetailModal from '@/components/game/CardDetailModal';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';

export default function CollectionPage() {
  const { inventory, getCardById } = useAppContext();
  const { t, localizeCard, cardType, element: elementLabel, rarity } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('cost');
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [setFilter, setSetFilter] = useState<'all' | string>('all');
  const [elementFilter, setElementFilter] = useState<Element | 'all'>('all');
  const [inspectedCard, setInspectedCard] = useState<InspectedCard | null>(null);

  const collectionCards: CardData[] = useMemo(() => {
    return Array.from(new Set(inventory)) // Use a Set to get unique card IDs
      .map(id => getCardById(id))
      .filter((card): card is CardData => card !== undefined);
  }, [inventory, getCardById]);
  
  const inventoryCounts = useMemo(() => {
    return inventory.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }, [inventory]);

  const availableSets = useMemo(() => [...new Set(collectionCards.map(c => c.set))], [collectionCards]);
  const availableElements: Element[] = useMemo(() => {
    const elements = collectionCards.map(c => c.element);
    // Filter out duplicates and keep the original order as much as possible
    return [...new Set(elements)];
  }, [collectionCards]);

  const filteredAndSortedCards = useMemo(() => {
    let cards = collectionCards;

    if (searchTerm) {
      cards = cards.filter(card =>
        localizeCard(card).name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (localizeCard(card).text && localizeCard(card).text.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (typeFilter !== 'all') {
      cards = cards.filter(card => card.type === typeFilter);
    }
    
    if (rarityFilter !== 'all') {
      cards = cards.filter(card => card.rarity === rarityFilter);
    }

    if (setFilter !== 'all') {
        cards = cards.filter(card => card.set === setFilter);
    }

    if (elementFilter !== 'all') {
      cards = cards.filter(card => card.element === elementFilter);
    }


    return cards.sort((a, b) => {
      switch (sortOrder) {
        case 'cost':
          return a.cost - b.cost;
        case 'name':
          return localizeCard(a).name.localeCompare(localizeCard(b).name);
        case 'rarity':
          const rarityOrder: Record<Rarity, number> = { 'Common': 0, 'Uncommon': 1, 'Rare': 2, 'Epic': 3, 'Legendary': 4, 'GOD': 5 };
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        case 'number':
            if (a.set === b.set) {
                return a.numberInSet - b.numberInSet;
            }
            return a.set.localeCompare(b.set);
        default:
          return 0;
      }
    });
  }, [collectionCards, searchTerm, sortOrder, typeFilter, rarityFilter, setFilter, elementFilter, localizeCard]);

  // A minimal mock GameState is needed for CardDetailModal
  const mockGameState: any = {
    activePlayer: 'player',
    phase: 'main',
  };

  return (
    <>
    <CardDetailModal
        card={inspectedCard}
        gameState={mockGameState}
        onClose={() => setInspectedCard(null)}
        onActivate={() => {}} // No activate functionality in collection
      />
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold tracking-wider title-gradient uppercase">{t('myCollection')}</h1>
        <p className="text-muted-foreground mt-2">{t('uniqueCardsOwned', { count: collectionCards.length })}</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-8 p-4 bg-card rounded-lg border">
        <Input 
          placeholder={t('search')}
          className="max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={sortOrder} onValueChange={setSortOrder} modal={false}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('sortBy')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cost">{t('cost')}</SelectItem>
            <SelectItem value="name">{t('name')}</SelectItem>
            <SelectItem value="rarity">{t('rarity')}</SelectItem>
            <SelectItem value="number">{t('cardNumber')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as CardType | 'all')} modal={false}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            <SelectItem value="Unit">{cardType('Unit')}</SelectItem>
            <SelectItem value="Spell">{cardType('Spell')}</SelectItem>
            <SelectItem value="Trap">{cardType('Trap')}</SelectItem>
            <SelectItem value="Aether">Aether</SelectItem>
            <SelectItem value="Relic">{cardType('Relic')}</SelectItem>
          </SelectContent>
        </Select>
         <Select value={rarityFilter} onValueChange={(value) => setRarityFilter(value as Rarity | 'all')} modal={false}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('rarity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allRarities')}</SelectItem>
            <SelectItem value="Common">{rarity('Common')}</SelectItem>
            <SelectItem value="Uncommon">{rarity('Uncommon')}</SelectItem>
            <SelectItem value="Rare">{rarity('Rare')}</SelectItem>
            <SelectItem value="Epic">{rarity('Epic')}</SelectItem>
            <SelectItem value="Legendary">{rarity('Legendary')}</SelectItem>
            <SelectItem value="GOD">{rarity('GOD')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={setFilter} onValueChange={(value) => setSetFilter(value as string | 'all')} modal={false}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Set" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allSets')}</SelectItem>
            {availableSets.map(set => (
                <SelectItem key={set} value={set}>{set}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={elementFilter} onValueChange={(value) => setElementFilter(value as Element | 'all')} modal={false}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('element')} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{t('allElements')}</SelectItem>
                {availableElements.map(element => (
                    <SelectItem key={element} value={element}>{elementLabel(element)}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      {filteredAndSortedCards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6 justify-items-center">
          {filteredAndSortedCards.map((card, i) => (
             <div key={`${card.id}-${i}`} className="relative" onClick={() => setInspectedCard({ ...card, instanceId: `${card.id}` })}>
              <Card card={card} />
              <Badge variant="secondary" className="absolute top-2 right-2 select-none">
                x{inventoryCounts[card.id] || 0}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">{t('noCardsFound')}</p>
        </div>
      )}
    </div>
    </>
  );
}
