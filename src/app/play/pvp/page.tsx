'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, serverTimestamp, updateDoc, doc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Swords, Users, PlusCircle, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n';

export default function PvpLobbyPage() {
  const { isOnline, username } = useAppContext();
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Listen for active rooms
  const roomsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), where('status', '==', 'waiting'));
  }, [firestore]);

  const { data: rooms, loading } = useCollection(roomsQuery);

  // Determine whether the current user already has an open room (host, waiting for opponent).
  // This is the single source of truth — we no longer rely on a local isSearching flag that
  // could go out of sync (page reload, navigation, multiple tabs) with what's in Firestore.
  const myOpenRoom = useMemo(() => {
    if (!user || !rooms) return null;
    return rooms.find((r: any) => r.players?.[0] === user.uid && r.players?.length === 1) ?? null;
  }, [rooms, user]);

  // When my own room receives a second player, redirect into the duel.
  useEffect(() => {
    if (!user || !rooms) return;
    const startedRoom = rooms.find((r: any) =>
      r.players?.includes(user.uid) && r.players.length === 2,
    );
    if (startedRoom) {
      router.push(`/play/pvp/${startedRoom.id}`);
    }
  }, [rooms, user, router]);

  // Auto-delete the open room when the user leaves the page (navigation OR tab close).
  // Without this the room would linger in Firestore and clutter every other player's lobby.
  // We use a ref so the cleanup always sees the latest room id without re-binding listeners.
  const myOpenRoomIdRef = useRef<string | null>(null);
  useEffect(() => {
    myOpenRoomIdRef.current = myOpenRoom?.id ?? null;
  }, [myOpenRoom]);

  useEffect(() => {
    if (!firestore) return;

    const deleteOpenRoom = () => {
      const roomId = myOpenRoomIdRef.current;
      if (!roomId) return;
      // Fire-and-forget — we can't await synchronous unload handlers.
      void deleteDoc(doc(firestore, 'rooms', roomId)).catch(() => {});
      myOpenRoomIdRef.current = null;
    };

    const onBeforeUnload = () => deleteOpenRoom();
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onBeforeUnload);
      // Soft navigation away from /play/pvp also drops the open room.
      deleteOpenRoom();
    };
  }, [firestore]);

  const handleCreateRoom = async () => {
    if (!firestore || !user || isCreating || myOpenRoom) return;
    setIsCreating(true);
    playSound('selection');

    try {
      const roomData = {
        players: [user.uid],
        playerNames: { [user.uid]: username },
        status: 'waiting',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(firestore, 'rooms'), roomData);
      // Don't subscribe here — the rooms collection listener already drives the join redirect
      // and the "you have an open room" UI state.
    } catch (e) {
      console.error('Error creating room:', e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelRoom = async () => {
    if (!firestore || !myOpenRoom || isCancelling) return;
    setIsCancelling(true);
    playSound('negative');
    try {
      await deleteDoc(doc(firestore, 'rooms', myOpenRoom.id));
    } catch (e) {
      console.error('Error cancelling room:', e);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!firestore || !user) return;
    // A user with their own open room shouldn't be able to join another room — they'd leave
    // their lobby slot orphaned. Force them to cancel first.
    if (myOpenRoom) return;
    playSound('selection');

    try {
        const roomRef = doc(firestore, 'rooms', roomId);
        await updateDoc(roomRef, {
            players: arrayUnion(user.uid),
            [`playerNames.${user.uid}`]: username,
            updatedAt: serverTimestamp(),
        });
        router.push(`/play/pvp/${roomId}`);
    } catch (e) {
        console.error("Error joining room:", e);
    }
  };

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-center p-8">
        <h1 className="text-4xl font-bold title-gradient mb-4">{t('onlineMode')}</h1>
        <p className="text-gray-400 mb-8 max-w-md">{t('loginToPlayOnline')}</p>
        <Link href="/">
          <Button variant="tcg">{t('toLogin')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      <Image 
          src="/ui/background/loading-3.jpg" 
          alt="PvP Lobby"
          fill
          className="object-cover opacity-10 z-0"
          data-ai-hint="celestial battleground"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>

      <div className="container relative z-10 mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-wider title-gradient uppercase">{t('duelLobby')}</h1>
          <p className="text-muted-foreground mt-2 text-lg">{t('duelLobbyDescription')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Matchmaking Control */}
          <Card className="lg:col-span-1 bg-card/80 backdrop-blur-sm border-primary/30">
            <CardHeader>
              <CardTitle>{t('readyForBattle')}</CardTitle>
              <CardDescription>{t('createSessionDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button
                size="lg"
                className="w-full h-24 text-xl"
                variant={myOpenRoom ? "secondary" : "tcg"}
                onClick={handleCreateRoom}
                disabled={isCreating || !!myOpenRoom}
              >
                {isCreating || myOpenRoom ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin h-6 w-6" />
                    <span>{t('searchingOpponent')}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <PlusCircle className="h-6 w-6" />
                    <span>{t('newDuel')}</span>
                  </div>
                )}
              </Button>
              {myOpenRoom && (
                <Button
                  variant="outline"
                  className="gap-2 border-destructive/60 text-destructive hover:bg-destructive/10"
                  onClick={handleCancelRoom}
                  disabled={isCancelling}
                >
                  {isCancelling ? <Loader2 className="animate-spin h-4 w-4" /> : <X className="h-4 w-4" />}
                  {t('cancel')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Room List */}
          <Card className="lg:col-span-2 bg-card/80 backdrop-blur-sm border-primary/30">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t('openRooms')}
                </CardTitle>
                <Badge variant="secondary">{rooms?.length || 0} {t('active')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
              ) : rooms && rooms.length > 0 ? (
                <div className="space-y-4">
                  {rooms.map(room => {
                    const hostId = room.players[0];
                    const hostName = room.playerNames[hostId] || t('unknown');
                    return (
                        <div key={room.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Swords className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                            <p className="font-bold">{t('roomOf', { player: hostName })}</p>
                            <p className="text-xs text-muted-foreground">{t('waitingForParticipant')}</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={room.players.includes(user?.uid) || !!myOpenRoom}
                        >
                            {room.players.includes(user?.uid) ? t('yourRoom') : t('join')}
                        </Button>
                        </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>{t('noOpenRooms')}</p>
                  <p className="text-sm">{t('createChallengeRoom')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Link href="/play">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
