
'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import DeckSelectionModal from '@/components/game/DeckSelectionModal';
import { type Deck, StarterDecks } from '@/lib/decks';
import LoadingScreen from '@/components/ui/loading-screen';
import CoinTossModal from '@/components/game/CoinTossModal';
import { PlayerId, type SavedDeck, type Element, type CardData, Mission } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookCheck, FolderKanban } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { missions } from '@/lib/missions';
import GameBoardMission from '@/components/game/GameBoardMission';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

type SelectionMode = 'starter' | 'custom' | null;

const SelectionTile = ({ title, description, icon, imgUrl, videoUrl, imgHint, enabled = true, onSelect, priority = false }: { title: string, description: string, icon: React.ReactNode, imgUrl: string, videoUrl?: string, imgHint: string, enabled?: boolean, onSelect: () => void, priority?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleMouseEnter = () => {
        playSound('positive');
        if (videoRef.current) {
            videoRef.current.play().catch(e => console.error("Video autoplay failed", e));
        }
    };

    const handleMouseLeave = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };
    
    const content = (
         <>
            <div className="menu-tile-border"></div>
            <div className="w-full h-full relative rounded-xl overflow-hidden z-10 group">
                {videoUrl && (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0 group-hover:opacity-100 z-10 rounded-xl"
                    />
                )}
                <Image 
                    src={imgUrl} 
                    alt={title} 
                    fill 
                    priority={priority}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className={cn(
                        "object-cover transition-opacity duration-300 opacity-50 z-0 rounded-xl",
                        videoUrl && "group-hover:opacity-0"
                    )}
                    data-ai-hint={imgHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-xl"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white z-10" style={{textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>
                    {icon}
                    <h2 className="mt-4 text-3xl font-bold uppercase tracking-wider">{title}</h2>
                    <p className="mt-2 text-white/80 text-base max-w-sm">{description}</p>
                </div>
            </div>
        </>
    );
    
    if (!enabled) {
        return (
            <div className="group menu-tile-container aspect-video overflow-hidden opacity-60 cursor-not-allowed">
               {content}
            </div>
        )
    }

    return (
        <div 
            className="group menu-tile-container aspect-video overflow-hidden cursor-pointer"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => { playSound('selection'); onSelect(); }}
        >
           {content}
        </div>
    );
}

export default function MissionPage() {
  const { savedDecks, getCardById } = useAppContext();
  const { t, localizeDeck, localizeMission } = useI18n();
  const params = useParams();
  const missionId = params.missionId as string;

  const mission = useMemo(() => missions.find(m => m.id === missionId), [missionId]);
  
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCoinToss, setShowCoinToss] = useState(false);
  const [startingPlayer, setStartingPlayer] = useState<PlayerId | null>(null);

  const customDecksForSelection: Deck[] = useMemo(() => {
    return savedDecks.map(savedDeck => {
        const cardCounts = savedDeck.cardIds.reduce((acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        const cards = Object.entries(cardCounts).map(([id, count]) => ({ id: Number(id), count }));

        const cardObjects = savedDeck.cardIds.map(id => getCardById(id)).filter((c): c is CardData => !!c && c.type !== 'Aether');
        const elementCounts = cardObjects.reduce((acc, card) => {
            acc[card.element] = (acc[card.element] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        let mainElement: Element = 'Aether';
        if (Object.keys(elementCounts).length > 0) {
            mainElement = Object.keys(elementCounts).reduce((a, b) => elementCounts[a] > elementCounts[b] ? a : b) as Element;
        }

        return {
            id: parseInt(savedDeck.id, 10),
            name: savedDeck.name,
            description: t('cardsCount', { count: savedDeck.cardIds.length }),
            style: t('customDeck'),
            element: mainElement,
            img: '/ui/thumbnail/decks.jpg',
            img_hint: 'custom deck',
            cards: cards,
            stats: { strength: 50, defense: 50, tempo: 50 }
        };
    });
  }, [savedDecks, getCardById, t]);

  const handleDeckSelect = (deck: Deck) => {
    setSelectedDeck(deck);
    setIsLoading(true);
  };
  
  const handleLoadingFinished = useCallback(() => {
    setIsLoading(false);
    setShowCoinToss(true);
  }, []);

  const handleCoinTossFinished = (winner: PlayerId) => {
    setStartingPlayer(winner);
    setShowCoinToss(false);
  }

  const handleReset = () => {
    setSelectedDeck(null);
    setIsLoading(false);
    setShowCoinToss(false);
    setStartingPlayer(null);
    setSelectionMode(null);
  };
  
  const renderInitialSelection = () => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-8 p-8">
            <h1 className="mb-8 text-5xl font-bold tracking-wider title-gradient uppercase">{t('chooseDeckType')}</h1>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl w-full">
                <SelectionTile 
                    title={t('chooseStarterDeckTitle')}
                    description={t('chooseStarterDeckDescription')}
                    icon={<BookCheck className="h-10 w-10"/>}
                    imgUrl="/ui/thumbnail/private-match.jpg"
                    videoUrl="/ui/thumbnail/private-match.mp4"
                    imgHint="friendly duel"
                    onSelect={() => setSelectionMode('starter')}
                    priority={true}
                />
                <SelectionTile 
                    title={t('chooseCustomDeckTitle')}
                    description={t('chooseCustomDeckDescription')}
                    icon={<FolderKanban className="h-10 w-10"/>}
                    imgUrl="/ui/thumbnail/ranked.jpg"
                    videoUrl="/ui/thumbnail/ranked.mp4"
                    imgHint="king throne"
                    onSelect={() => setSelectionMode('custom')}
                    enabled={true}
                />
             </div>
             <Link href="/play/campaign" passHref className="inline-block mt-16">
                <Button variant="tcg">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToMissionSelection')}
                </Button>
            </Link>
        </div>
    )
  }

  const renderContent = () => {
    if (!mission) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-8 p-8">
            <h1 className="mb-8 text-5xl font-bold tracking-wider title-gradient uppercase">{t('missionNotFound')}</h1>
            <Link href="/play/campaign" passHref className="inline-block mt-16">
                <Button variant="tcg">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToCampaign')}
                </Button>
            </Link>
        </div>
      )
    }
    
    if (isLoading) {
        return <LoadingScreen onFinished={handleLoadingFinished} />;
    }
    
    if (!selectedDeck) {
        if (!selectionMode) {
            return renderInitialSelection();
        }

        const decksToShow = selectionMode === 'starter' ? StarterDecks.map(deck => localizeDeck(deck)) : customDecksForSelection;
        
        if (selectionMode === 'custom' && customDecksForSelection.length === 0) {
             return (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-8 p-8">
                    <h2 className="text-2xl font-bold">{t('noCustomDecksFound')}</h2>
                    <p className="text-muted-foreground">{t('createDeckFirst')}</p>
                     <div className="flex gap-4 mt-8">
                        <Button variant="outline" onClick={() => setSelectionMode(null)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('back')}
                        </Button>
                        <Button asChild>
                            <Link href="/deck-builder">{t('toDeckBuilder')}</Link>
                        </Button>
                    </div>
                </div>
            )
        }

        return (
            <>
                <DeckSelectionModal decks={decksToShow} onDeckSelect={handleDeckSelect} />
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                     <Button variant="tcg" onClick={() => setSelectionMode(null)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('backToTypeSelection')}
                    </Button>
                </div>
            </>
        );
    }
    
    if (showCoinToss) {
      return <CoinTossModal onTossFinished={handleCoinTossFinished} />;
    }

    if (startingPlayer) {
      return <GameBoardMission playerDeck={selectedDeck} mission={localizeMission(mission)} startingPlayer={startingPlayer} onReset={handleReset} />;
    }

    return null;
  }

  return (
    <div className="w-screen h-screen bg-background overflow-hidden">
      {renderContent()}
    </div>
  );
}
