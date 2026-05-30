
'use client';

import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cosmeticItems, FrameItem } from '@/lib/cosmetics';
import { ArrowLeft, UserPlus, Send, ShieldCheck, Swords, Trophy, BookOpen, Sparkles, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, query, collection, where, addDoc, serverTimestamp } from 'firebase/firestore';
import React, { Suspense, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/audio';
import { useI18n, type TranslationKey } from '@/i18n';
import { getAccountTitle, getLevelInfo, getNextLevelReward, type LevelReward } from '@/lib/progression';

function ProfileContent() {
    const { t } = useI18n();
    const { equippedCosmetics: myCosmetics, inventory: myInventory, xp: myXp, level: myLevel, accountTitle: myAccountTitle, xpProgress: myXpProgress, xpInCurrentLevel: myXpInCurrentLevel, xpPerLevel: myXpPerLevel, totalXpForNextLevel: myTotalXpForNextLevel, username: myUsername, wins: myWins, losses: myLosses, gamesPlayed: myGamesPlayed } = useAppContext();
    const { user: currentUser } = useUser();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    
    const targetUserId = searchParams.get('userId');
    const isOwnProfile = !targetUserId || targetUserId === currentUser?.uid;

    // Fetch remote user data if needed
    const userRef = useMemoFirebase(() => {
        if (!firestore || isOwnProfile || !targetUserId) return null;
        return doc(firestore, 'users', targetUserId);
    }, [firestore, isOwnProfile, targetUserId]);

    const { data: remoteUser, isLoading: remoteLoading } = useDoc(userRef);

    // Friend Request Status logic
    const reqQuery = useMemoFirebase(() => {
        if (!firestore || !currentUser || isOwnProfile || !targetUserId) return null;
        return query(collection(firestore, 'friendRequests'), where('fromId', '==', currentUser.uid), where('toId', '==', targetUserId));
    }, [firestore, currentUser, isOwnProfile, targetUserId]);
    const { data: requests } = useCollection(reqQuery);

    const friendshipQuery = useMemoFirebase(() => {
        if (!firestore || !currentUser || isOwnProfile || !targetUserId) return null;
        const friendshipId = [currentUser.uid, targetUserId].sort().join('_');
        return query(collection(firestore, 'friendships'), where('users', 'array-contains', currentUser.uid));
    }, [firestore, currentUser, isOwnProfile, targetUserId]);
    const { data: friendships } = useCollection(friendshipQuery);

    const isFriend = useMemo(() => {
        if (!friendships || !targetUserId) return false;
        return friendships.some(f => f.users.includes(targetUserId));
    }, [friendships, targetUserId]);

    const hasSentRequest = useMemo(() => {
        return !!requests && requests.some(r => r.status === 'pending');
    }, [requests]);

    const handleAddFriend = async () => {
        if (!currentUser || !targetUserId || !firestore || isFriend || hasSentRequest) return;
        playSound('selection');
        try {
            await addDoc(collection(firestore, 'friendRequests'), {
                fromId: currentUser.uid,
                fromName: myUsername,
                toId: targetUserId,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            toast({ title: 'Anfrage gesendet', description: 'Deine Freundschaftsanfrage wurde verschickt.' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleStartChat = () => {
        router.push('/social');
    };

    const formatLevelReward = (reward: LevelReward | null) => {
        if (!reward) return t('noLevelReward');
        const parts: string[] = [];
        if (reward.merits) parts.push(t('meritsReward', { amount: reward.merits }));
        if (reward.gold) parts.push(t('goldReward', { amount: reward.gold }));
        if (reward.awakeningPacks) parts.push(t('awakeningPackReward', { amount: reward.awakeningPacks }));
        return parts.join(' + ') || t('noLevelReward');
    };

    // Determine data to show
    const profileData = useMemo(() => {
        if (isOwnProfile) {
            return {
                username: myUsername,
                equippedCosmetics: myCosmetics,
                inventory: myInventory,
                xp: myXp,
                wins: myWins,
                losses: myLosses,
                gamesPlayed: myGamesPlayed,
                level: myLevel,
                accountTitle: myAccountTitle,
                xpInCurrentLevel: myXpInCurrentLevel,
                xpPerLevel: myXpPerLevel,
                xpProgress: myXpProgress,
                totalXpForNextLevel: myTotalXpForNextLevel
            };
        }
        if (remoteUser) {
            const xp = remoteUser.xp ?? 0;
            const levelInfo = getLevelInfo(xp);
            const accountTitle = remoteUser.accountTitle ?? getAccountTitle(levelInfo.level);

            return {
                username: remoteUser.username || 'Unbekannter Binder',
                equippedCosmetics: remoteUser.equippedCosmetics || { avatar: 'avatar_0', frame: 'frame_1', effect: 'effect_1', cardBack: 'sleeve_0', coin: 'coin_1', playmat: 'playmat_1' },
                inventory: remoteUser.inventory || [],
                xp: xp,
                wins: remoteUser.wins ?? 0,
                losses: remoteUser.losses ?? 0,
                gamesPlayed: remoteUser.gamesPlayed ?? 0,
                level: levelInfo.level,
                accountTitle,
                xpInCurrentLevel: levelInfo.xpInCurrentLevel,
                xpPerLevel: levelInfo.xpPerLevel,
                xpProgress: levelInfo.xpProgress,
                totalXpForNextLevel: levelInfo.totalXpForNextLevel
            };
        }
        return null;
    }, [isOwnProfile, remoteUser, myUsername, myCosmetics, myInventory, myXp, myWins, myLosses, myGamesPlayed, myLevel, myAccountTitle, myXpInCurrentLevel, myXpPerLevel, myXpProgress, myTotalXpForNextLevel]);

    if (remoteLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Suche Binder in den Archiven...</p>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                <h1 className="text-4xl font-bold text-destructive">Binder nicht gefunden</h1>
                <p className="text-muted-foreground max-w-md">Dieses Profil existiert nicht oder die Daten sind im Aether verschollen.</p>
                <Link href="/game">
                    <Button variant="tcg"><ArrowLeft className="mr-2 h-4 w-4"/> Zum Hauptmenü</Button>
                </Link>
            </div>
        );
    }

    const equippedAvatar = cosmeticItems.avatars.find(a => a.id === profileData.equippedCosmetics.avatar);
    const equippedFrame = cosmeticItems.frames.find(f => f.id === profileData.equippedCosmetics.frame) as (FrameItem & { glowColor?: string; shine?: boolean; });
    
    const winRate = profileData.gamesPlayed > 0 ? ((profileData.wins / profileData.gamesPlayed) * 100).toFixed(1) : "0.0";

    return (
        <div className="container relative z-10 mx-auto flex flex-col items-center p-4 py-12">
            {/* Profile Header */}
            <div className="flex flex-col items-center gap-6 text-center w-full max-w-4xl">
                <div className="relative h-40 w-40 flex items-center justify-center">
                    <div className="avatar-container" style={{ transform: 'scale(1.1)'}}>
                        {equippedFrame?.glowColor && (
                            <div className="back-aura" style={{ '--glow-color': equippedFrame.glowColor } as React.CSSProperties} />
                        )}
                        {equippedFrame?.particleEffect && (
                            <div className={cn("particle-wrap", equippedFrame.particleEffect)} style={{ filter: `drop-shadow(0 0 5px ${equippedFrame.glowColor || '#fff'})` }}>
                                <div className="p-dot p1" /><div className="p-dot p2" /><div className="p-dot p3" /><div className="p-dot p4" /><div className="p-dot p5" />
                            </div>
                        )}
                        {equippedFrame && <div className={cn("frame-base", equippedFrame.className)} />}
                        <div className={cn("avatar-content", equippedFrame?.shine && "cosmetic-shine")}>
                            {equippedFrame?.glowColor && (
                                <div className="cosmetic-glow" style={{ '--glow-color': `${equippedFrame.glowColor}40` } as React.CSSProperties} />
                            )}
                            {equippedAvatar && <Image
                                src={equippedAvatar.img}
                                alt="User Avatar"
                                fill
                                className="object-cover"
                            />}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <h1 className="text-5xl font-bold tracking-wider">{profileData.username}</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-lg text-primary font-semibold">
                            <Trophy className="h-5 w-5 text-yellow-400" />
                            <span>{t('accountTitle')}: {t(profileData.accountTitle as TranslationKey)}</span>
                        </div>
                    </div>
                    {/* Level Progress */}
                    <div className="w-64 mt-4">
                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                            <span className="font-bold text-yellow-400">Level {profileData.level}</span>
                            <span>{profileData.xpInCurrentLevel.toLocaleString('de-DE')} / {profileData.xpPerLevel.toLocaleString('de-DE')} EP</span>
                        </div>
                        <Progress value={profileData.xpProgress} className="h-3"/>
                    </div>
                </div>

                {!isOwnProfile && (
                    <div className="flex items-center gap-4 mt-4">
                        {isFriend ? (
                            <Button variant="outline" disabled className="gap-2 border-green-500 text-green-500">
                                <Check className="h-4 w-4" /> Freunde
                            </Button>
                        ) : (
                            <Button 
                                variant="outline" 
                                className="gap-2" 
                                onClick={handleAddFriend}
                                disabled={hasSentRequest}
                            >
                                <UserPlus className="h-4 w-4" /> 
                                {hasSentRequest ? 'Anfrage gesendet' : 'Freund hinzufügen'}
                            </Button>
                        )}
                        <Button 
                            variant="secondary" 
                            className="gap-2"
                            onClick={handleStartChat}
                            disabled={!isFriend}
                        >
                            <Send className="h-4 w-4" /> Nachricht senden
                        </Button>
                    </div>
                )}
                {isOwnProfile && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Echte Cloud-Statistiken sind jetzt aktiv.
                    </p>
                )}
            </div>

            {/* Stats Section */}
            <div className="mt-16 w-full max-w-5xl">
                <h2 className="text-3xl font-bold text-center mb-8">Statistiken</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2 text-xl">
                                <Swords className="h-6 w-6"/>
                                Kampf-Bilanz
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-4xl font-bold text-primary">{profileData.gamesPlayed}</p>
                            <p className="text-muted-foreground">Spiele gesamt</p>
                            <div className="flex justify-around pt-2 text-lg">
                                <div>
                                    <p className="font-bold text-green-400">{profileData.wins}</p>
                                    <p className="text-xs text-muted-foreground">Siege</p>
                                </div>
                                <div>
                                    <p className="font-bold text-red-400">{profileData.losses}</p>
                                    <p className="text-xs text-muted-foreground">Niederlagen</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground pt-2">Sieg-Rate: {winRate}%</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2 text-xl">
                                <Sparkles className="h-6 w-6 text-cyan-400"/>
                                Erfahrung
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-4xl font-bold text-cyan-400">{profileData.xp.toLocaleString('de-DE')}</p>
                            <p className="text-muted-foreground">Gesamt-EP</p>
                            <div className="flex justify-around pt-2 text-lg">
                                <div>
                                    <p className="font-bold text-white">Level {profileData.level}</p>
                                    <p className="text-xs text-muted-foreground">Aktuelle Stufe</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground pt-2">{t('nextLevelAt', { xp: profileData.totalXpForNextLevel.toLocaleString('de-DE') })}</p>
                            <p className="text-sm text-muted-foreground">{t('nextReward')}: {formatLevelReward(getNextLevelReward(profileData.level))}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2 text-xl">
                                <BookOpen className="h-6 w-6"/>
                                Sammlung
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-4xl font-bold text-primary">{[...new Set(profileData.inventory)].length}</p>
                            <p className="text-muted-foreground">Einzigartige Karten im Besitz</p>
                            {isOwnProfile && (
                                <Link href="/collection" passHref>
                                    <Button variant="link" className="mt-2">Zur Sammlung</Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="text-center mt-16">
                <Link href={isOwnProfile ? "/game" : "/marketplace"} passHref>
                    <Button variant="tcg">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {isOwnProfile ? "Zurück zum Hauptmenü" : "Zurück zum Marktplatz"}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
            <Image 
                src="/ui/background/loading.png" 
                alt="Profile Background"
                fill
                className="object-cover opacity-10 z-0"
                data-ai-hint="dark abstract background"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>
            <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-12 w-12" /></div>}>
                <ProfileContent />
            </Suspense>
        </div>
    );
}
