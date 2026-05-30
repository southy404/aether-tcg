
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Deck } from '@/lib/decks';
import { Flame, Waves, Sparkles, Leaf, Zap, Swords, Shield, Info } from 'lucide-react';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { Progress } from '../ui/progress';
import React from 'react';
import { useI18n } from '@/i18n';

interface DeckSelectionModalProps {
  decks: Deck[];
  onDeckSelect: (deck: Deck) => void;
}

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

const DeckTile = ({ deck, onSelect }: { deck: Deck, onSelect: (deck: Deck) => void }) => {
  const { localizeDeck, t } = useI18n();
  const localizedDeck = localizeDeck(deck);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative aspect-[3/4] cursor-pointer group/wrap w-full"
        onClick={() => onSelect(deck)}
        onMouseEnter={() => playSound('positive')}
      >
        <div className="w-full h-full relative transition-transform duration-300 ease-out group-hover/wrap:scale-105">
          <Image src={deck.img} alt={localizedDeck.name} fill className="object-contain" data-ai-hint={deck.img_hint} />
        </div>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="link" size="sm" className="text-muted-foreground">
            <Info className="mr-2 h-4 w-4" /> Info
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <ElementIcon element={deck.element} />
              <div>
                <DialogTitle className="text-2xl">{localizedDeck.name}</DialogTitle>
                <DialogDescription>{localizedDeck.style}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground my-4">{localizedDeck.description}</p>
          <div className="space-y-4">
            <DeckStat icon={Swords} label={t('strength')} value={deck.stats.strength} colorClass="text-red-400" />
            <DeckStat icon={Shield} label={t('defense')} value={deck.stats.defense} colorClass="text-blue-400" />
            <DeckStat icon={Zap} label={t('tempo')} value={deck.stats.tempo} colorClass="text-yellow-400" />
          </div>
          <Button onClick={() => onSelect(deck)} className="w-full mt-6">
              {t('chooseDeckButton')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default function DeckSelectionModal({ decks, onDeckSelect }: DeckSelectionModalProps) {
  const { t } = useI18n();
  
  const handleSelect = (deck: Deck) => {
    playSound('selection');
    onDeckSelect(deck);
  }
  
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-6xl bg-background/90 border-primary shadow-2xl shadow-primary/20 p-8">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center text-primary font-bold">{t('chooseDeck')}</DialogTitle>
          <DialogDescription className="text-center text-lg">
            {t('chooseStarterDeck')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-8 mt-8">
          {decks.map((deck) => (
            <DeckTile key={deck.id} deck={deck} onSelect={handleSelect} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
