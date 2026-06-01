'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { query, collection, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, limit, orderBy, setDoc } from 'firebase/firestore';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, UserCheck, UserX, MessageSquare, Send, ArrowLeft, Loader2, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/audio';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { cosmeticItems, FrameItem } from '@/lib/cosmetics';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useI18n, type TranslationKey } from '@/i18n';
import { getAccountTitle, getLevelInfo } from '@/lib/progression';

// Helper component for a single friend list entry
const FriendListItem = ({ otherId, active, onClick }: { otherId: string, active: boolean, onClick: (profile: any) => void }) => {
    const firestore = useFirestore();
    const { t } = useI18n();
    const userRef = useMemoFirebase(() => doc(firestore, 'users', otherId), [firestore, otherId]);
    const { data: profile, isLoading } = useDoc(userRef);

    if (isLoading) return <div className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />;
    if (!profile) return null;

    const equippedAvatar = cosmeticItems.avatars.find(a => a.id === (profile.equippedCosmetics?.avatar || 'avatar_0'));

    return (
        <div
            className={cn(
            "flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-primary/50 transition-all cursor-pointer group",
            active ? "bg-primary/10 border-primary/50" : "bg-black/20"
            )}
            onClick={() => onClick({ ...profile, id: otherId })}
        >
            <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-full overflow-hidden border border-primary/30">
                    <Image src={equippedAvatar?.img || '/avatar/spirit.jpg'} alt="Avatar" fill className="object-cover" />
                </div>
                <div>
                    <p className="font-bold text-sm">{profile.username || t('unknownBinder')}</p>
                    <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">{t('chat')}</p>
                </div>
            </div>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </div>
    );
};

export default function SocialPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { username: myName } = useAppContext();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeChatProfile, setActiveChatProfile] = useState<any | null>(null);
  const [messageText, setMessageText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Friendships
  const friendshipsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'friendships'), where('users', 'array-contains', user.uid));
  }, [firestore, user]);
  const { data: friendships, isLoading: loadingFriends } = useCollection(friendshipsQuery);

  // 2. Fetch Pending Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'friendRequests'), where('toId', '==', user.uid), where('status', '==', 'pending'));
  }, [firestore, user]);
  const { data: pendingRequests } = useCollection(requestsQuery);

  const sentRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'friendRequests'), where('fromId', '==', user.uid), where('status', '==', 'pending'));
  }, [firestore, user]);
  const { data: sentRequests } = useCollection(sentRequestsQuery);

  // 3. Chat ID calculation
  const currentChatId = useMemo(() => {
      if (!user || !activeChatProfile) return null;
      return [user.uid, activeChatProfile.id].sort().join('_');
  }, [user, activeChatProfile]);

  // 4. Fetch Messages
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !currentChatId) return null;
    return query(collection(firestore, 'friendships', currentChatId, 'messages'), orderBy('createdAt', 'asc'), limit(50));
  }, [firestore, currentChatId]);
  const { data: messages } = useCollection(messagesQuery);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !firestore) return;
    setIsSearching(true);
    try {
      const q = query(collection(firestore, 'users'), where('username', '>=', searchTerm), where('username', '<=', searchTerm + '\uf8ff'), limit(5));
      const snap = await getDocs(q);
      const results = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user?.uid);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetUser: any) => {
    if (!user || !firestore) return;
    playSound('selection');
    
    const alreadySent = sentRequests?.some(r => r.toId === targetUser.id);
    if (alreadySent) {
        toast({ title: t('requestAlreadySent'), description: t('requestAlreadySentDescription') });
        return;
    }

    const reqData = {
      fromId: user.uid,
      fromName: myName,
      toId: targetUser.id,
      status: 'pending',
      createdAt: serverTimestamp()
    };

    addDoc(collection(firestore, 'friendRequests'), reqData)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'friendRequests',
          operation: 'create',
          requestResourceData: reqData
        }));
      });
    
    toast({ title: t('requestSent'), description: t('requestSentToUser', { user: targetUser.username }) });
  };

  const acceptRequest = async (request: any) => {
    if (!firestore || !user) return;
    playSound('positive');
    
    const friendshipId = [user.uid, request.fromId].sort().join('_');
    const friendshipData = {
      id: friendshipId,
      users: [user.uid, request.fromId],
      createdAt: serverTimestamp()
    };

    // Use setDoc with deterministic ID to ensure security rules can find it via get()
    setDoc(doc(firestore, 'friendships', friendshipId), friendshipData)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `friendships/${friendshipId}`,
          operation: 'write',
          requestResourceData: friendshipData
        }));
      });

    const reqRef = doc(firestore, 'friendRequests', request.id);
    updateDoc(reqRef, { status: 'accepted' })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: reqRef.path,
          operation: 'update',
          requestResourceData: { status: 'accepted' }
        }));
      });

    toast({ title: t('friendAdded'), description: t('nowFriendsWith', { user: request.fromName }) });
  };

  const declineRequest = async (requestId: string) => {
    if (!firestore) return;
    playSound('negative');
    const reqRef = doc(firestore, 'friendRequests', requestId);
    deleteDoc(reqRef).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: reqRef.path,
        operation: 'delete'
      }));
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !currentChatId || !user || !firestore) return;
    
    const text = messageText;
    setMessageText('');
    
    const msgData = {
      senderId: user.uid,
      text: text,
      createdAt: serverTimestamp()
    };

    const messagesCol = collection(firestore, 'friendships', currentChatId, 'messages');
    addDoc(messagesCol, msgData)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `friendships/${currentChatId}/messages`,
          operation: 'create',
          requestResourceData: msgData
        }));
      });
    
    playSound('selection');
  };

  const friends = useMemo(() => {
    if (!friendships) return [];
    return friendships.map(f => {
        const otherId = f.users.find((id: string) => id !== user?.uid);
        return { ...f, otherId };
    });
  }, [friendships, user]);

  const activeChatAvatar = activeChatProfile ? cosmeticItems.avatars.find(a => a.id === (activeChatProfile.equippedCosmetics?.avatar || 'avatar_0')) : null;
  const activeChatFrame = activeChatProfile ? cosmeticItems.frames.find(f => f.id === (activeChatProfile.equippedCosmetics?.frame || 'frame_1')) as (FrameItem & { glowColor?: string; shine?: boolean; }) : null;
  const activeChatLevelInfo = activeChatProfile ? getLevelInfo(activeChatProfile.xp || 0) : null;
  const activeChatTitle = activeChatLevelInfo
    ? (activeChatProfile?.accountTitle ?? getAccountTitle(activeChatLevelInfo.level))
    : null;

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-black">
      <Image 
          src="/ui/background/loading.png" 
          alt="Social Background"
          fill
          className="object-cover opacity-10 z-0"
          data-ai-hint="dark blue magic"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>

      <div className="container relative z-10 mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-wider title-gradient uppercase">{t('socialHub')}</h1>
          <p className="text-muted-foreground mt-2 text-lg">{t('socialHubDescription')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto h-[700px]">
          {/* Sidebar: Friends & Search */}
          <Card className="lg:col-span-4 bg-card/80 backdrop-blur-sm border-primary/20 flex flex-col overflow-hidden">
            <Tabs defaultValue="friends" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/20">
                <TabsTrigger value="friends">{t('friends')}</TabsTrigger>
                <TabsTrigger value="search">{t('searchTab')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="friends" className="flex-grow flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-grow p-4">
                  {loadingFriends ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                  ) : friends.length > 0 ? (
                    <div className="space-y-3">
                      {friends.map(friend => (
                        <FriendListItem 
                            key={friend.id} 
                            otherId={friend.otherId} 
                            active={activeChatProfile?.id === friend.otherId}
                            onClick={setActiveChatProfile}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>{t('noFriendsYet')}</p>
                      <p className="text-sm">{t('searchOtherPlayers')}</p>
                    </div>
                  )}

                  {pendingRequests && pendingRequests.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 ml-1">{t('requestsCount', { count: pendingRequests.length })}</h3>
                      <div className="space-y-2">
                        {pendingRequests.map(req => (
                          <div key={req.id} className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <span className="text-sm font-bold">{req.fromName}</span>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={() => acceptRequest(req)}><UserCheck className="h-4 w-4"/></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => declineRequest(req.id)}><UserX className="h-4 w-4"/></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="search" className="flex-grow flex flex-col p-4 space-y-4 overflow-hidden">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    placeholder={t('playerName')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-black/40"
                  />
                  <Button type="submit" size="icon" disabled={isSearching}><Search className="h-4 w-4"/></Button>
                </form>
                
                <ScrollArea className="flex-grow">
                  {isSearching ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-3">
                      {searchResults.map(res => (
                        <div key={res.id} className="flex items-center justify-between p-3 bg-black/20 border border-border/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-primary/30">
                                <AvatarFallback><UserIcon /></AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-sm">{res.username}</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => sendFriendRequest(res)}><UserPlus className="h-4 w-4"/></Button>
                        </div>
                      ))}
                    </div>
                  ) : searchTerm && (
                    <div className="text-center py-8 text-muted-foreground text-sm">{t('noPlayersFound')}</div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-8 bg-card/80 backdrop-blur-sm border-primary/20 flex flex-col overflow-hidden relative">
            {activeChatProfile ? (
              <>
                <CardHeader className="bg-black/20 border-b border-border/50 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 flex items-center justify-center">
                            <div className="avatar-container" style={{ transform: 'scale(0.35)'}}>
                                {activeChatFrame?.glowColor && <div className="back-aura" style={{ '--glow-color': activeChatFrame.glowColor } as React.CSSProperties} />}
                                {activeChatFrame && <div className={cn("frame-base", activeChatFrame.className)} />}
                                <div className={cn("avatar-content", activeChatFrame?.shine && "cosmetic-shine")}>
                                    <Image src={activeChatAvatar?.img || '/avatar/spirit.jpg'} alt="Avatar" fill className="object-cover" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <CardTitle className="text-lg">{activeChatProfile.username}</CardTitle>
                            <CardDescription>
                              {t('accountLevel')} {activeChatLevelInfo?.level ?? 1} • {activeChatTitle ? t(activeChatTitle as TranslationKey) : t('noviceBinder')}
                            </CardDescription>
                        </div>
                    </div>
                    <Link href={`/profile?userId=${activeChatProfile.id}`} target="_blank">
                        <Button variant="ghost" size="sm">{t('viewProfile')}</Button>
                    </Link>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-grow p-0 overflow-hidden flex flex-col">
                  <ScrollArea className="flex-grow p-6" ref={chatScrollRef}>
                    <div className="space-y-4">
                      {messages?.map((msg, i) => {
                        const isMe = msg.senderId === user?.uid;
                        return (
                          <div key={msg.id || i} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                            <div className="flex items-center gap-2 mb-1">
                                {!isMe && <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{activeChatProfile.username}</span>}
                                {isMe && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('you')}</span>}
                            </div>
                            <div className={cn(
                              "max-w-[70%] p-3 rounded-2xl text-sm shadow-lg",
                              isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none border border-border/50"
                            )}>
                              {msg.text}
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  
                  <div className="p-4 bg-black/20 border-t border-border/50">
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <Input
                        placeholder={t('yourMessage')}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="bg-black/40 h-12"
                      />
                      <Button type="submit" size="icon" className="h-12 w-12 rounded-xl" variant="tcg">
                        <Send className="h-5 w-5" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
                    <MessageSquare className="h-10 w-10 opacity-20" />
                </div>
                <div className="text-center">
                    <p className="text-xl font-bold">{t('pickAFriend')}</p>
                    <p className="text-sm">{t('pickAFriendDescription')}</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="text-center mt-12">
          <Link href="/game">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToMainMenu')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
