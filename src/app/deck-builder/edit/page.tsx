
'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { StarterDecks } from '@/lib/decks';
import type { CardData, Element, Rarity, CardType } from '@/lib/types';
import { Card as UICard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import Card from '@/components/Card';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { playSound } from '@/lib/audio';
import Link from 'next/link';
import { MASTER_DB } from '@/lib/cards';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const MAX_COPIES = 3;
const MAX_LEGENDARIES = 1;
const DECK_SIZE = 40;
const AETHER_CARDS_REQUIRED = 10;

const rarityOrder: Record<Rarity, number> = { 'Common': 0, 'Uncommon': 1, 'Rare': 2, 'Epic': 3, 'Legendary': 4, 'GOD': 5 };
const typeOrder: Record<CardType, number> = { 'Unit': 0, 'Spell': 1, 'Trap': 2, 'Aether': 3, 'Relic': 4 };


function DeckBuilderContent() {
  const { inventory, getCardById, savedDecks, saveDeck, updateDeck } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const starterDeckId = searchParams.get('starter');
  const deckId = searchParams.get('deckId');
  
  const isStarterDeckMode = !!starterDeckId;

  const [deck, setDeck] = useState<CardData[]>([]);
  const [deckName, setDeckName] = useState('Neues Deck');
  const [searchTerm, setSearchTerm] = useState('');
  const [elementFilter, setElementFilter] = useState<Element | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState('cost');
  
  const starterDeckDefinition = useMemo(() => {
    if (!isStarterDeckMode) return null;
    return StarterDecks.find(d => d.id === parseInt(starterDeckId!)) || null;
  }, [starterDeckId, isStarterDeckMode]);

  useEffect(() => {
    if (starterDeckDefinition) {
      const initialDeck: CardData[] = [];
      starterDeckDefinition.cards.forEach(item => {
        const cardData = getCardById(item.id);
        if (cardData) {
          for (let i = 0; i < item.count; i++) {
            initialDeck.push(cardData);
          }
        }
      });
      setDeck(initialDeck);
      setDeckName(starterDeckDefinition.name);
    } else if (deckId) {
      const deckToEdit = savedDecks.find(d => d.id === deckId);
      if (deckToEdit) {
        const initialDeck: CardData[] = deckToEdit.cardIds.map(id => getCardById(id)).filter((c): c is CardData => !!c);
        setDeck(initialDeck);
        setDeckName(deckToEdit.name);
      }
    }
  }, [starterDeckDefinition, deckId, savedDecks, getCardById]);

  const ownedInventoryCounts = useMemo(() => {
    return inventory.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }, [inventory]);

  const starterDeckCounts = useMemo(() => {
    const cardMap = new Map<number, number>();
    if (starterDeckDefinition) {
      starterDeckDefinition.cards.forEach(item => {
        cardMap.set(item.id, item.count);
      });
    }
    return cardMap;
  }, [starterDeckDefinition]);

  const sortedCollection = useMemo(() => {
    let cards = Array.from(new Set(inventory))
      .map(id => getCardById(id))
      .filter((c): c is CardData => !!c)
      .map(c => ({...c, isLoaner: false}));

    if (isStarterDeckMode) {
      const ownedIds = new Set(cards.map(c => c.id));
      starterDeckCounts.forEach((count, id) => {
        if (!ownedIds.has(id)) {
          const cardData = getCardById(id);
          if (cardData) {
            cards.push({ ...cardData, isLoaner: true });
          }
        }
      });
    }
    
    return cards
      .filter(card => 
        (!searchTerm ||
          card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (card.text && card.text.toLowerCase().includes(searchTerm.toLowerCase())) ||
          card.type.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (elementFilter === 'all' || card.element === elementFilter) &&
        (rarityFilter === 'all' || card.rarity === rarityFilter) &&
        (typeFilter === 'all' || card.type === typeFilter)
      )
      .sort((a, b) => {
        switch (sortOrder) {
          case 'cost': return a.cost - b.cost || a.name.localeCompare(b.name);
          case 'name': return a.name.localeCompare(b.name);
          case 'rarity': return rarityOrder[b.rarity] - rarityOrder[a.rarity] || a.name.localeCompare(b.name);
          case 'number': return (a.set || '').localeCompare(b.set || '') || a.numberInSet - b.numberInSet;
          case 'type': return typeOrder[a.type] - typeOrder[b.type] || a.name.localeCompare(b.name);
          case 'atk': return (b.atk ?? -1) - (a.atk ?? -1) || a.name.localeCompare(b.name);
          case 'hp': return (b.hp ?? -1) - (a.hp ?? -1) || a.name.localeCompare(b.name);
          default: return 0;
        }
      });
  }, [inventory, getCardById, isStarterDeckMode, starterDeckCounts, searchTerm, elementFilter, rarityFilter, typeFilter, sortOrder]);


  const availableElements: Element[] = useMemo(() => {
    const elements = MASTER_DB.map(c => c.element);
    return [...new Set(elements)];
  }, []);

  const deckCounts = useMemo(() => deck.reduce((acc, card) => {
      acc[card.id] = (acc[card.id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>), [deck]);

  const deckCardList = useMemo(() => {
    const uniqueIds = [...new Set(deck.map(c => c.id))];
    return uniqueIds
      .map(id => deck.find(c => c.id === id))
      .filter((card): card is CardData => card !== undefined)
      .sort((a,b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }, [deck]);

  const numLegendaries = useMemo(() => deck.filter(c => c.rarity === 'Legendary' || c.rarity === 'GOD').length, [deck]);
  const numAetherCards = useMemo(() => deck.filter(c => c.type === 'Aether').length, [deck]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (deck.length !== DECK_SIZE) {
      issues.push(`Deck muss genau ${DECK_SIZE} Karten enthalten.`);
    }
     if (numAetherCards !== AETHER_CARDS_REQUIRED) {
      issues.push(`Deck muss genau ${AETHER_CARDS_REQUIRED} Aether-Karten enthalten.`);
    }
    if (numLegendaries > MAX_LEGENDARIES) {
      issues.push(`Deck darf maximal ${MAX_LEGENDARIES} legendäre Karte enthalten.`);
    }
    Object.entries(deckCounts).forEach(([id, count]) => {
      const card = getCardById(Number(id));
      if (card?.type !== 'Aether' && count > MAX_COPIES) {
        issues.push(`Zu viele Kopien von "${card?.name}" (max. ${MAX_COPIES}).`);
      }
    });
    return issues;
  }, [deck.length, numLegendaries, deckCounts, getCardById, numAetherCards]);
  
  const addCardToDeck = (card: CardData) => {
    const countInDeck = deckCounts[card.id] || 0;
    
    if (card.type !== 'Aether' && countInDeck >= MAX_COPIES) {
      playSound('negative');
      return;
    }
     if ((card.rarity === 'Legendary' || card.rarity === 'GOD') && numLegendaries >= MAX_LEGENDARIES && !deck.some(c => c.id === card.id)) {
        playSound('negative');
        return;
    }

    const availableOwned = ownedInventoryCounts[card.id] || 0;
    const requiredByStarter = starterDeckCounts.get(card.id) || 0;
    
    let totalAvailable: number;
    if (isStarterDeckMode) {
        totalAvailable = Math.max(availableOwned, requiredByStarter);
    } else {
        totalAvailable = availableOwned;
    }

    if (countInDeck >= totalAvailable) {
      if(isStarterDeckMode && card.type !== 'Aether' && countInDeck < MAX_COPIES && availableOwned > (countInDeck - (requiredByStarter > availableOwned ? requiredByStarter - availableOwned : 0))) {
         // Allow adding owned cards to reach the 3-copy limit if the starter deck has fewer
      } else {
        playSound('negative');
        return;
      }
    }

    playSound('selection');
    setDeck(prev => [...prev, card]);
  };

  const removeCardFromDeck = (card: CardData) => {
    const cardIndex = deck.findIndex(c => c.id === card.id);
    if (cardIndex > -1) {
      const newDeck = [...deck];
      newDeck.splice(cardIndex, 1);
      setDeck(newDeck);
      playSound('negative');
    }
  };
  
  const handleRightClick = (e: React.MouseEvent, card: CardData) => {
    e.preventDefault();
    e.stopPropagation();
    removeCardFromDeck(card);
  };

  const handleSaveDeck = () => {
    if (validationIssues.length > 0) {
      playSound('negative');
      toast({
        title: 'Deck ungültig!',
        description: 'Bitte behebe die Fehler in deinem Deck, bevor du speicherst.',
        variant: 'destructive',
      });
      return;
    }

    const cardIds = deck.map(c => c.id);
    if (deckId) {
      updateDeck(deckId, deckName, cardIds);
      toast({ title: 'Deck aktualisiert!', description: `Dein Deck "${deckName}" wurde erfolgreich gespeichert.` });
    } else {
      saveDeck(deckName, cardIds);
      toast({ title: 'Deck gespeichert!', description: `Dein neues Deck "${deckName}" wurde erstellt.` });
    }
    playSound('positive');
    router.push('/deck-builder');
  };

  
  const renderCard = (card: CardData & { isLoaner?: boolean }) => {
    const countInDeck = deckCounts[card.id] || 0;
    
    const availableOwned = ownedInventoryCounts[card.id] || 0;
    const requiredInStarter = starterDeckCounts.get(card.id) || 0;
    
    let totalAvailableForDeck: number;
    let canAdd: boolean;
    
    if (isStarterDeckMode) {
      totalAvailableForDeck = Math.max(availableOwned, requiredInStarter);
      canAdd = countInDeck < totalAvailableForDeck;
    } else {
        totalAvailableForDeck = availableOwned;
        canAdd = countInDeck < totalAvailableForDeck;
    }

    if (card.type !== 'Aether' && countInDeck >= MAX_COPIES) canAdd = false;
    if ((card.rarity === 'Legendary' || card.rarity === 'GOD') && numLegendaries >= MAX_LEGENDARIES && !deck.some(c => c.id === card.id)) canAdd = false;
          
    return (
        <div 
          key={`${card.id}-${card.isLoaner ? 'loaned' : 'owned'}`} 
          className="relative group cursor-pointer"
          onClick={() => addCardToDeck(card)}
          onContextMenu={(e) => handleRightClick(e, card)}
          onMouseEnter={() => canAdd && playSound('positive')}
        >
           <div className={cn(
              'transition-all duration-200 rounded-lg',
              !canAdd && 'opacity-50 saturate-50',
              canAdd && 'group-hover:ring-2 group-hover:ring-primary',
              card.isLoaner && 'saturate-75'
          )}>
            <Card card={card} disableHover={true} />
          </div>
           <Badge className="absolute top-2 right-2 select-none" variant={countInDeck > 0 ? 'default' : 'secondary'}>
               {countInDeck} / {totalAvailableForDeck}
           </Badge>
           {card.isLoaner && <Badge className="absolute top-2 left-2 select-none" variant='outline'>Leihgabe</Badge>}
        </div>
    );
  };

  return (
    <div className="container relative z-10 mx-auto p-4 flex flex-col md:flex-row gap-4 h-[calc(100vh-80px)]">
      {/* Collection View */}
      <UICard className="w-full md:w-2/3 flex flex-col bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Kartensammlung</CardTitle>
            <Link href="/deck-builder" passHref className="inline-block">
              <Button variant="tcg"><ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Deck-Übersicht</Button>
            </Link>
          </div>
          <div className='flex gap-2 mt-2 flex-wrap'>
            <Input
              placeholder="Karten suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow min-w-[200px]"
            />
            <Select value={sortOrder} onValueChange={setSortOrder} modal={false}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sortieren nach" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">Kosten</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="rarity">Seltenheit</SelectItem>
                <SelectItem value="number">Kartennummer</SelectItem>
                <SelectItem value="type">Typ</SelectItem>
                <SelectItem value="atk">Angriff</SelectItem>
                <SelectItem value="hp">Leben</SelectItem>
              </SelectContent>
            </Select>
            <Select value={elementFilter} onValueChange={(value) => setElementFilter(value as Element | 'all')} modal={false}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Element" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Elemente</SelectItem>
                {availableElements.map(element => (<SelectItem key={element} value={element}>{element}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as CardType | 'all')} modal={false}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Typ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="Unit">Einheit</SelectItem>
                <SelectItem value="Spell">Zauber</SelectItem>
                <SelectItem value="Trap">Falle</SelectItem>
                <SelectItem value="Aether">Aether</SelectItem>
                <SelectItem value="Relic">Relic</SelectItem>
              </SelectContent>
            </Select>
             <Select value={rarityFilter} onValueChange={(value) => setRarityFilter(value as Rarity | 'all')} modal={false}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Seltenheit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Seltenheiten</SelectItem>
                <SelectItem value="Common">Gewöhnlich</SelectItem>
                <SelectItem value="Uncommon">Ungewöhnlich</SelectItem>
                <SelectItem value="Rare">Selten</SelectItem>
                <SelectItem value="Epic">Episch</SelectItem>
                <SelectItem value="Legendary">Legendär</SelectItem>
                <SelectItem value="GOD">Gott</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea className="h-full">
            {sortedCollection.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 justify-items-center pb-8">
                {sortedCollection.map(card => renderCard(card))}
              </div>
            ) : (
              <div className="text-center py-20"><p className="text-xl text-muted-foreground">Keine Karten für deine Filter gefunden.</p></div>
            )}
          </ScrollArea>
        </CardContent>
      </UICard>

      {/* Deck View */}
      <UICard className="w-full md:w-1/3 flex flex-col bg-card/80 backdrop-blur-sm">
          <CardHeader>
             <Input 
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                className="text-lg font-bold p-0 border-none focus:ring-0 bg-transparent"
              />
            <CardDescription>
              {deck.length} / {DECK_SIZE} Karten | {numAetherCards} / {AETHER_CARDS_REQUIRED} Aether | {numLegendaries} / {MAX_LEGENDARIES} Legendär
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
              {deckCardList.map(card => (
                <div key={card.id} className="flex items-center justify-between p-2 rounded-md bg-card/50 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{deckCounts[card.id] || 0}x</Badge>
                    <span className={`font-semibold rarity-${card.rarity}`}>{card.name}</span>
                  </div>
                   <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addCardToDeck(card)}>
                          <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCardFromDeck(card)}>
                          <Minus className="h-4 w-4" />
                      </Button>
                  </div>
                </div>
              ))}
              </div>
            </ScrollArea>
          </CardContent>
          <Separator />
          <div className="p-4 space-y-2">
            {validationIssues.length > 0 && (
               <Alert variant="destructive">
                <AlertTitle>Deck-Regeln verletzt</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {validationIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <Button variant="tcg" className="w-full" onClick={handleSaveDeck}>Deck speichern</Button>
             <Button className="w-full" variant="destructive" onClick={() => { setDeck([]); playSound('negative'); }}>
              <Trash2 className="mr-2 h-4 w-4"/>
              Deck leeren
            </Button>
          </div>
        </UICard>
    </div>
  );
}

export default function DeckBuilderPage() {
  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        <Image 
            src="/ui/background/loading-4.jpg" 
            alt="Deck Builder Background"
            fill
            className="object-cover opacity-10 z-0"
            data-ai-hint="fantasy library"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>
        <Suspense fallback={<div>Loading...</div>}>
          <DeckBuilderContent />
        </Suspense>
    </div>
  )
}
