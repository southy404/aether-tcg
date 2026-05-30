
'use client';

import { PlayerState, EquippedCosmetics } from '@/lib/types';
import { Heart, Droplet, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectableElement } from 'react-dnd';
import Image from 'next/image';
import { cosmeticItems, FrameItem } from '@/lib/cosmetics';
import { useEffect, useState } from 'react';
import Link from 'next/link';


interface PlayerAvatarProps {
  player: PlayerState;
  onAvatarClick: () => void;
  isTargetForSpell: boolean;
  dropRef?: (node: ConnectableElement) => void;
  equippedCosmetics?: EquippedCosmetics;
  isMultiTarget?: boolean;
  customAvatar?: string;
}

export default function PlayerAvatar({ player, onAvatarClick, isTargetForSpell, dropRef, equippedCosmetics, isMultiTarget, customAvatar }: PlayerAvatarProps) {
  const isPlayer = player.id === 'player';
  const [showEmote, setShowEmote] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (player.currentEmote) {
      setShowEmote(true);
      const timer = setTimeout(() => {
        setShowEmote(false);
      }, 3000); // Emote disappears after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [player.currentEmote]);

  useEffect(() => {
    if (player.currentMessage) {
        setShowMessage(true);
        const timer = setTimeout(() => {
            setShowMessage(false);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [player.currentMessage]);


  const finalEquipped = isPlayer && equippedCosmetics ? equippedCosmetics : {
      avatar: 'avatar_0',
      frame: 'frame_1',
      effect: 'effect_1',
      cardBack: 'sleeve_1',
      coin: 'coin_1',
      playmat: 'playmat_1'
  };

  const equippedAvatar = cosmeticItems.avatars.find(a => a.id === finalEquipped.avatar);
  const equippedFrame = cosmeticItems.frames.find(f => f.id === finalEquipped.frame) as (FrameItem & { glowColor?: string; shine?: boolean; });

  const AvatarDisplay = (
    <div className="avatar-container shrink-0" style={{ transform: 'scale(0.6)', width: '150px', height: '150px' }}>
      {equippedFrame?.glowColor && (
        <div className="back-aura" style={{ '--glow-color': equippedFrame.glowColor } as React.CSSProperties} />
      )}
      {equippedFrame?.particleEffect && (
        <div className={cn("particle-wrap", equippedFrame.particleEffect)} style={{ filter: `drop-shadow(0 0 5px ${equippedFrame.glowColor || '#fff'})` }}>
          <div className="p-dot p1" />
          <div className="p-dot p2" />
          <div className="p-dot p3" />
          <div className="p-dot p4" />
          <div className="p-dot p5" />
        </div>
      )}
      {equippedFrame && <div className={cn("frame-base", equippedFrame.className)} />}
      <div className={cn("avatar-content", equippedFrame?.shine && "cosmetic-shine")}>
        {equippedFrame?.glowColor && (
          <div className="cosmetic-glow" style={{ '--glow-color': `${equippedFrame.glowColor}40` } as React.CSSProperties} />
        )}
        <Image
            src={(isPlayer && equippedAvatar) ? equippedAvatar.img : customAvatar ? customAvatar : `https://api.dicebear.com/7.x/micah/svg?seed=${player.id}`}
            alt="User Avatar"
            fill
            className="object-cover"
        />
      </div>
    </div>
  )

  const bubbleAlignmentClasses = 'bottom-full mb-2 left-1/2 -translate-x-1/2';
  const speechBubbleTailClasses = 'absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-primary';


  return (
    <div className="relative mt-4">
      <div 
        id={player.id}
        ref={dropRef}
        className={cn(
          `relative flex items-center justify-between gap-2 p-3 pt-5 rounded-lg transition-all bg-black/20 border border-primary/50 w-72 min-h-[90px]`,
          isPlayer ? 'flex-row' : 'flex-row-reverse',
          isTargetForSpell && 'cursor-crosshair bg-red-500/20 hover:bg-red-500/40 border-2 border-red-500',
          isMultiTarget && 'border-yellow-400 bg-yellow-500/20 shadow-lg shadow-yellow-400/50'
        )}
        onClick={onAvatarClick}
      >
          <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-40 text-center")}>
             <div className="border border-primary/80 bg-background px-3 py-0.5 rounded-md hover:border-primary hover:scale-105 transition-all cursor-pointer">
                <Link href={`/profile?userId=${player.id}`} target="_blank">
                    <h2 className="text-base font-bold text-primary truncate">{player.name}</h2>
                </Link>
             </div>
          </div>
          
          <div className={cn("flex flex-col gap-1 text-sm", isPlayer ? "pl-2" : "pr-2")}>
                <div className="flex items-center gap-2 font-bold">
                    <Heart className="text-red-500 h-4 w-4 shrink-0" />
                    <span>HP: {player.hp}</span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                    <Droplet className="text-blue-400 h-4 w-4 shrink-0" />
                    <span>Aether: {player.aether.current}/{player.aether.max}</span>
                </div>
                 <div className="flex items-center gap-2 font-bold">
                    <Layers className="text-gray-400 h-4 w-4 shrink-0" />
                    <span>Deck: {player.deck.length}</span>
                </div>
          </div>

          <div className={cn("flex items-center justify-center cursor-pointer hover:scale-110 transition-transform", isPlayer ? "mr-[-25px]" : "ml-[-25px]")}>
            <Link href={`/profile?userId=${player.id}`} target="_blank">
                {AvatarDisplay}
            </Link>
          </div>
      </div>
      
       {showEmote && player.currentEmote && (
            <div 
              key={player.currentEmote.name}
              className={cn("absolute z-50 w-32 h-20 bg-background/80 border border-primary rounded-lg p-1 animate-in fade-in zoom-in-90", bubbleAlignmentClasses)}
            >
                <div className="relative w-full h-full">
                    <Image 
                        src={player.currentEmote.url} 
                        alt={player.currentEmote.name} 
                        fill
                        className="object-contain"
                    />
                </div>
                <div className={speechBubbleTailClasses}></div>
            </div>
        )}
        {showMessage && player.currentMessage && (
             <div 
              key={player.currentMessage}
              className={cn("absolute z-50 max-w-xs bg-background/80 border border-primary rounded-lg p-2 text-sm animate-in fade-in zoom-in-90", bubbleAlignmentClasses)}
            >
                {player.currentMessage}
                <div className={speechBubbleTailClasses}></div>
            </div>
        )}
    </div>
  );
}
