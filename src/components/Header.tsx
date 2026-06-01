
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Volume2, VolumeX, User, Settings, LogOut, Maximize, Minimize, LogIn, Sparkles, Users } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cosmeticItems, FrameItem } from '@/lib/cosmetics';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { query, collection, where } from 'firebase/firestore';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n, type TranslationKey } from '@/i18n';

export default function Header() {
  const { gems, gold, level, accountTitle, isMuted, toggleMute, equippedCosmetics, username, isOnline } = useAppContext();
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleMuteToggle = () => {
    toggleMute();
    if (isMuted) {
      const audio = new Audio('/selection.mp3');
      audio.volume = 0.5;
      audio.play();
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    // Force the redirect immediately so the player doesn't linger on a protected page
    // while the AuthGuard catches up. router.replace avoids leaving the game route in history.
    router.replace('/');
  };

  // Notification logic for friend requests
  const pendingRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'friendRequests'), where('toId', '==', user.uid), where('status', '==', 'pending'));
  }, [firestore, user]);

  const { data: pendingRequests } = useCollection(pendingRequestsQuery);
  const hasNotifications = pendingRequests && pendingRequests.length > 0;

  const equippedAvatar = cosmeticItems.avatars.find(a => a.id === equippedCosmetics.avatar);
  const equippedFrame = cosmeticItems.frames.find(f => f.id === equippedCosmetics.frame) as (FrameItem & { glowColor?: string; shine?: boolean; });

  return (
    <nav className="sticky top-0 z-[100] flex h-[80px] items-center justify-between border-b border-border/50 bg-background/80 px-4 py-2 backdrop-blur-sm md:px-6">
      <Link href="/game" className="transition-transform hover:scale-105">
        <Image src="/logo-icon.png?v=2" alt="AETHER" width={50} height={50} className="h-[50px] w-auto animate-spin-slow" />
      </Link>
      <div className="flex items-center gap-4 text-lg font-semibold text-primary md:gap-6">
        <Button variant="ghost" size="icon" onClick={handleMuteToggle} className="text-muted-foreground hover:text-primary">
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleFullscreenToggle} className="text-muted-foreground hover:text-primary">
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </Button>
        <LanguageSwitcher />
        
        <Link href="/social" className="relative group p-2 rounded-full hover:bg-white/5 transition-colors">
            <Users className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            {hasNotifications && (
                <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
            )}
        </Link>

        <Link href="/shop/cosmetics" className="flex items-center gap-2 hover:scale-105 transition-transform">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <div className="flex flex-col leading-none">
            <span className="text-white text-base">{gems}</span>
            <span className="text-[10px] uppercase text-cyan-400/70 font-bold">Merits</span>
          </div>
        </Link>
        <Link href="/shop" className="flex items-center gap-2 hover:scale-105 transition-transform">
          <Image src="/coin.png" alt="Gold" width={20} height={20} className="h-5 w-5"/>
          <div className="flex flex-col leading-none">
            <span className="text-white text-base">{gold}</span>
            <span className="text-[10px] uppercase text-yellow-500/70 font-bold">Gold</span>
          </div>
        </Link>

        {isOnline ? (
          <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                  <button className="relative h-12 w-12 flex items-center justify-center cursor-pointer rounded-full">
                       <div className="avatar-container" style={{ transform: 'scale(0.35)'}}>
                          {equippedFrame?.glowColor && <div className="back-aura" style={{ '--glow-color': equippedFrame.glowColor } as React.CSSProperties} />}
                          {equippedFrame && <div className={cn("frame-base", equippedFrame.className)} />}
                          <div className={cn("avatar-content", equippedFrame?.shine && "cosmetic-shine")}>
                              {equippedAvatar && <Image src={equippedAvatar.img} alt="User Avatar" fill className="object-cover" />}
                          </div>
                      </div>
                  </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{username}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {t('aetherLevel')} {level} • {t(accountTitle as TranslationKey)}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/profile"><User className="mr-2 h-4 w-4" /> {t('profile')}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/customize"><Settings className="mr-2 h-4 w-4" /> {t('customize')}</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> {t('logout')}</DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/auth">
            <Button variant="outline" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" /> {t('login')}
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
