
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import GameBoard from '@/components/game/GameBoard';
import LoadingScreen from '@/components/ui/loading-screen';
import { StarterDecks, type Deck } from '@/lib/decks';
import { createInitialState } from '@/components/game/GameBoard';
import type { GameState, PlayerId, GameCard, CardData, Element } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { playSound } from '@/lib/audio';
import DeckSelectionModal from '@/components/game/DeckSelectionModal';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';
import { MASTER_DB } from '@/lib/cards';
import CoinTossModal from '@/components/game/CoinTossModal';
import { useI18n } from '@/i18n';

export default function PvpMatchPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const { username, getCardById, savedDecks } = useAppContext();
  const { t, localizeDeck } = useI18n();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Listen to the room document
  const roomRef = useMemo(() => (firestore ? doc(firestore, 'rooms', roomId) : null), [firestore, roomId]);
  const { data: roomData, loading: roomLoading } = useDoc(roomRef);

  // Custom decks for selection
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

  const allAvailableDecks = useMemo(() => [...StarterDecks.map(deck => localizeDeck(deck)), ...customDecksForSelection], [customDecksForSelection, localizeDeck]);

  const handleDeckSelect = async (deck: Deck) => {
    if (!roomRef || !user) return;
    setSelectedDeck(deck);
    
    await updateDoc(roomRef, {
        [`playerDecks.${user.uid}`]: deck,
        updatedAt: serverTimestamp(),
    });
  };

  // 2. Handle Coin Toss (Host logic)
  useEffect(() => {
    if (!roomData || !user || !firestore || roomData.status !== 'waiting') return;

    const isHost = roomData.players[0] === user.uid;
    const bothDecksPresent = roomData.players.length === 2 && roomData.players.every(pId => !!roomData.playerDecks?.[pId]);

    if (isHost && bothDecksPresent) {
      // Pick a random player to call the coin toss
      const chooserUid = roomData.players[Math.floor(Math.random() * 2)];
      updateDoc(roomRef!, {
        status: 'coin-toss',
        coinToss: {
            chooserUid: chooserUid,
            choice: null,
            result: null,
            winnerUid: null,
        },
        updatedAt: serverTimestamp(),
      });
    }
  }, [roomData, user, firestore, roomRef]);

  // 3. Initialize Game State after Coin Toss (Host only)
  useEffect(() => {
    if (!roomData || !user || !firestore || gameState) return;
    if (roomData.status !== 'coin-toss' || !roomData.coinToss?.winnerUid) return;

    const isHost = roomData.players[0] === user.uid;
    if (isHost) {
      const hostUid = roomData.players[0];
      const guestUid = roomData.players[1];
      
      const hostDeck = roomData.playerDecks[hostUid];
      const guestDeck = roomData.playerDecks[guestUid];

      // Determine who is 'player' and who is 'opponent' in the internal model
      // Host is always 'player' internally, Guest is always 'opponent'
      const winnerUid = roomData.coinToss.winnerUid;
      const startingRole: PlayerId = winnerUid === hostUid ? 'player' : 'opponent';

      // We wait a bit before setting status to 'playing' so both clients can finish coin toss animation
      setTimeout(() => {
          const initial = createInitialState(hostDeck, startingRole, false, roomData.playerNames[hostUid]);
          
          const createDeckFromList = (cardList: {id: number, count: number}[], owner: PlayerId): GameCard[] => {
              let deck: GameCard[] = [];
              cardList.forEach(item => {
                  const cardData = MASTER_DB.find(c => c.id === item.id);
                  if (cardData) {
                      for (let i = 0; i < item.count; i++) {
                          deck.push({
                              ...cardData,
                              instanceId: `${cardData.id}-${owner}-${Math.random()}-${i}`,
                              owner: owner,
                              currentHp: cardData.hp,
                              currentAtk: cardData.atk,
                              currentFokus: cardData.fokus || 0,
                              canAttack: false,
                              isExhausted: false,
                              hasBlockedThisTurn: false,
                              usedFokusThisTurn: false,
                              overcharge: cardData.keywords?.overcharge ? { used: false, damage: 0 } : undefined,
                              isFrozen: false,
                              isEntangled: false,
                              isInvulnerable: false,
                              tempAttackBonus: 0,
                              permanentAtkModifier: 0,
                              tempCostModifier: 0,
                          } as any);
                      }
                  }
              });
              return deck;
          };

          initial.players.opponent.name = roomData.playerNames[guestUid] || t('opponent');
          initial.players.opponent.deck = createDeckFromList(guestDeck.cards, 'opponent')
              .map((card) => ({ card, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ card }) => card);
          
          initial.isPvp = true;

          updateDoc(roomRef!, {
            status: 'playing',
            gameState: JSON.parse(JSON.stringify(initial)),
            updatedAt: serverTimestamp(),
          });
      }, 3000); // 3 second delay for animation
    }
  }, [roomData, user, firestore, gameState, roomRef]);

  // 4. Sync GameState from Firestore
  useEffect(() => {
    if (!roomRef) return;

    return onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (data && data.gameState) {
        setGameState(data.gameState);
        setIsInitializing(false);
      }
    });
  }, [roomRef]);

  const onTutorialAction = useCallback((action: string, newState?: any): boolean => {
    if (action === 'UPDATE_STATE' && newState && roomRef) {
      updateDoc(roomRef, {
        gameState: JSON.parse(JSON.stringify(newState)),
        updatedAt: serverTimestamp(),
      });
      return true;
    }
    return false;
  }, [roomRef]);

  const handleCoinTossFinished = (winnerRole: PlayerId) => {
    // Logic handled by useEffect monitoring winnerUid
  };

  if (roomLoading || (gameState && isInitializing)) {
    return <LoadingScreen onFinished={() => {}} />;
  }

  if (!roomData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white gap-4">
        <h1 className="text-2xl font-bold">{t('roomNotFound')}</h1>
        <Link href="/play/pvp">
          <Button variant="tcg">{t('backToLobby')}</Button>
        </Link>
      </div>
    );
  }

  const isHost = roomData.players[0] === user?.uid;
  const viewerRole: PlayerId = isHost ? 'player' : 'opponent';

  const myDeckInRoom = roomData.playerDecks?.[user?.uid || ''];
  if (!selectedDeck && !myDeckInRoom) {
      return (
          <div className="w-screen h-screen bg-background">
              <DeckSelectionModal decks={allAvailableDecks} onDeckSelect={handleDeckSelect} />
          </div>
      );
  }

  if (roomData.status === 'coin-toss') {
      return (
          <div className="w-screen h-screen bg-background">
              <CoinTossModal 
                onTossFinished={handleCoinTossFinished} 
                isPvP={true}
                roomData={roomData}
                roomRef={roomRef!}
                viewerUid={user?.uid!}
              />
          </div>
      )
  }

  return (
    <div className="w-screen h-screen bg-background overflow-hidden">
      {gameState ? (
        <GameBoard 
          playerDeck={selectedDeck || myDeckInRoom} 
          startingPlayer={gameState.activePlayer} 
          onReset={() => router.push('/play/pvp')}
          isControlled={true}
          initialGameState={gameState}
          onTutorialAction={onTutorialAction}
          viewerRole={viewerRole}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-white gap-4">
          <div className="animate-pulse text-2xl font-bold title-gradient">{t('waitingForPlayers')}</div>
          <p className="text-muted-foreground">{t('gameStartsWhenReady')}</p>
          <div className="flex gap-8 mt-8">
              {roomData.players.map((pId: string) => (
                  <div key={pId} className="flex flex-col items-center gap-2">
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border-2", roomData.playerDecks?.[pId] ? "border-green-500 bg-green-500/20" : "border-gray-500 bg-gray-500/20")}>
                          {roomData.playerDecks?.[pId] ? <Check className="text-green-500"/> : <Loader2 className="animate-spin text-gray-500"/>}
                      </div>
                      <span className="text-sm font-semibold">{roomData.playerNames[pId]}</span>
                  </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
