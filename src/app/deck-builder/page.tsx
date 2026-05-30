
'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, Info, Flame, Waves, Sparkles, Leaf, Zap, Shield, Swords, Trash2, Edit } from 'lucide-react';
import { playSound } from '@/lib/audio';
import { StarterDecks, type Deck } from '@/lib/decks';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MASTER_DB } from '@/lib/cards';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from '@/components/ui/alert-dialog';
import type { SavedDeck } from '@/lib/types';
import { useI18n } from '@/i18n';


const ElementIcon = ({ element }: { element: Deck['element'] }) => {
    switch (element) {
        case 'Feuer':
            return <Flame className="h-8 w-8 text-red-500" />;
        case 'Wasser':
            return <Waves className="h-8 w-8 text-blue-500" />;
        case 'Aether':
            return <Sparkles className="h-8 w-8 text-purple-500" />;
        case 'Erde':
            return <Leaf className="h-8 w-8 text-green-500" />;
        case 'Luft':
            return <Zap className="h-8 w-8 text-yellow-500" />;
        default:
            return null;
    }
};

const DeckStat = ({ icon: Icon, label, value, colorClass }: { icon: React.ElementType, label: string, value: number, colorClass: string }) => (
    <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${colorClass}`} />
        <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{label}</span>
                <span className={`text-sm font-bold ${colorClass}`}>{value}%</span>
            </div>
            <Progress value={value} className="h-2 [&>div]:bg-current" color={colorClass} />
        </div>
    </div>
);


const StarterDeckTile = ({ deck, onSelect }: { deck: Deck, onSelect: (id: number) => void }) => {
  const { localizeDeck, localizeCard, t } = useI18n();
  const localizedDeck = localizeDeck(deck);
  const cardList = deck.cards
    .map(item => {
        const cardData = MASTER_DB.find(c => c.id === item.id);
        return cardData ? { ...cardData, count: item.count } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a,b) => a.cost - b.cost || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative aspect-[3/4] cursor-pointer group/wrap w-full"
        onClick={() => onSelect(deck.id)}
        onMouseEnter={() => playSound('positive')}
      >
        <div
          className="w-full h-full relative transition-transform duration-300 ease-out group-hover/wrap:scale-105"
        >
          <Image src={deck.img} alt={localizedDeck.name} fill className="object-contain" data-ai-hint={deck.img_hint} />
        </div>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="link" size="sm" className="text-muted-foreground">
            <Info className="mr-2 h-4 w-4" /> Info
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl grid md:grid-cols-2 gap-x-8 p-6">
          <div className="flex flex-col justify-between">
            <div>
                <DialogHeader className="mb-4">
                  <div className="flex items-start gap-4">
                    <ElementIcon element={deck.element} />
                    <div>
                      <DialogTitle className="text-2xl">{localizedDeck.name}</DialogTitle>
                      <DialogDescription>{localizedDeck.style}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mb-4">{localizedDeck.description}</p>
                <div className="space-y-4">
                  <DeckStat icon={Swords} label={t('strength')} value={deck.stats.strength} colorClass="text-red-400" />
                  <DeckStat icon={Shield} label={t('defense')} value={deck.stats.defense} colorClass="text-blue-400" />
                  <DeckStat icon={Zap} label={t('tempo')} value={deck.stats.tempo} colorClass="text-yellow-400" />
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6 text-center">{t('editStarterDeckHint')}</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">{t('cardList', { count: deck.cards.reduce((acc, c) => acc + c.count, 0) })}</h4>
            <ScrollArea className="h-96 border rounded-md p-2 bg-background/50">
                <div className="space-y-1 pr-2">
                    {cardList.map((card, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-1.5 rounded">
                            <span className={cn('font-medium', 
                                card.rarity === 'Legendary' || card.rarity === 'GOD' ? 'text-yellow-400' : 
                                card.rarity === 'Epic' ? 'text-purple-400' :
                                card.rarity === 'Rare' ? 'text-blue-400' : 'text-foreground'
                            )}>{localizeCard(card).name}</span>
                            <Badge variant="secondary" className="font-mono">{card.count}x</Badge>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default function DecksPage() {
  const router = useRouter();
  const { savedDecks, deleteDeck } = useAppContext();
  const { t } = useI18n();
  const [deckToDelete, setDeckToDelete] = useState<SavedDeck | null>(null);

  const handleSelectStarterDeck = (deckId: number) => {
    playSound('selection');
    router.push(`/deck-builder/edit?starter=${deckId}`);
  }

  const handleDeleteClick = (deck: SavedDeck) => {
    playSound('negative');
    setDeckToDelete(deck);
  }

  const confirmDelete = () => {
    if(deckToDelete) {
        deleteDeck(deckToDelete.id);
        playSound('selection');
        setDeckToDelete(null);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
       <Image 
            src="/ui/background/loading-4.jpg" 
            alt="Decks Background"
            fill
            className="object-cover opacity-10 z-0 fixed h-screen"
            data-ai-hint="fantasy scroll"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0 fixed h-screen"></div>

      <AlertDialog open={!!deckToDelete} onOpenChange={() => setDeckToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitleComponent>{t('deleteDeckTitle')}</AlertDialogTitleComponent>
            <DialogDescription>
              {t('deleteDeckDescription', { name: deckToDelete?.name || '' })}
            </DialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('confirmDelete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container relative mx-auto flex flex-col items-center p-4 py-12 text-center">
        <h1 className="mb-8 text-5xl font-bold tracking-wider title-gradient uppercase">{t('decks')}</h1>
        
        <h2 className="text-3xl font-bold text-center mb-8">{t('myDecks')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-8 max-w-7xl w-full">
            {savedDecks.map(deck => (
                <Card key={deck.id} className="flex flex-col bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="truncate">{deck.name}</CardTitle>
                        <CardDescription>{deck.cardIds.length} {t('cards')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        <Image src="/logo.png" alt="Deck Icon" width={100} height={21}/>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button asChild className="flex-1">
                            <Link href={`/deck-builder/edit?deckId=${deck.id}`}><Edit className="mr-2 h-4 w-4"/> {t('edit')}</Link>
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(deck)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
             <Link 
                href="/deck-builder/edit"
                className="group menu-tile-container aspect-[3/4] inline-block bg-card/80 backdrop-blur-sm rounded-xl"
                onMouseEnter={() => playSound('positive')}
                onClick={() => playSound('selection')}
            >
                <div className="menu-tile-content flex flex-col items-center justify-center">
                    <PlusCircle className="h-16 w-16" />
                    <h2 className="mt-4 text-2xl font-bold uppercase tracking-wider">{t('createNewDeck')}</h2>
                    <p className="mt-2 text-white/80 text-base">{t('buildDeckFromScratch')}</p>
                </div>
                <div className="menu-tile-border"></div>
            </Link>
        </div>
        
        <h2 className="text-3xl font-bold text-center mt-16 mb-8">{t('starterDecks')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-8 max-w-7xl w-full">
            {StarterDecks.map((deck) => (
                <StarterDeckTile key={deck.id} deck={deck} onSelect={handleSelectStarterDeck} />
            ))}
        </div>

        <Link href="/game" passHref className="inline-block mt-16">
            <Button variant="tcg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToMainMenu')}
            </Button>
        </Link>
      </div>
    </div>
  );
}
