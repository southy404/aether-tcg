'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Element } from '@/lib/types';
import { playSound } from '@/lib/audio';

interface PackRipProps {
  element: Element;
  onRipComplete: () => void;
}

const elementPacks: { [key in Element]?: { img: string; hint: string } } = {
  Feuer: { img: '/set/awakening/booster-awakening-fire.png', hint: 'fire booster pack' },
  Wasser: { img: '/set/awakening/booster-awakening-water.png', hint: 'water booster pack' },
  Aether: { img: '/set/awakening/aether-booster-new.png', hint: 'aether booster pack' },
  Erde: { img: '/set/awakening/booster-awakening-earth.png', hint: 'nature booster pack' },
  Luft: { img: '/set/awakening/booster-awakening-air.png', hint: 'air booster pack' },
};

const BoosterPart = ({ part, imgSrc, isOpened }: { part: 'top' | 'bottom', imgSrc: string, isOpened: boolean }) => {
  return (
    <div
      className={cn(
        "booster-part",
        part === 'top' ? 'booster-part-top' : 'booster-part-bottom',
        isOpened && (part === 'top' ? 'booster-part-top-opened' : 'booster-part-bottom-opened')
      )}
      style={{ backgroundImage: `url(${imgSrc})` }}
    />
  );
};


export default function PackRip({ element, onRipComplete }: PackRipProps) {
  const [isOpened, setIsOpened] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const packRef = useRef<HTMLDivElement>(null);
  
  const packInfo = elementPacks[element] || elementPacks['Aether']!;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpened || !packRef.current) return;
    const rect = packRef.current.getBoundingClientRect();
    const rX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -6;
    const rY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 6;
    setStyle({ transform: `perspective(1000px) rotateX(${rX}deg) rotateY(${rY}deg) scale(1.05)` });
  };

  const handleMouseLeave = () => {
    if (isOpened) return;
    setStyle({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)' });
  };
  
  const handleRip = () => {
    if (isOpened) return;
    setIsOpened(true);
    playSound('epic');
    setTimeout(onRipComplete, 1200); // Wait for animations to mostly finish
  };
  
  return (
    <div
      className="relative w-[300px] h-[525px] cursor-pointer"
      onClick={handleRip}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={packRef} 
        style={style}
        className="absolute inset-0 transition-transform duration-100 ease-out"
      >
        <div className={cn("scene", isOpened && "opened")}>
            <div className="screen-flash"></div>
            <div className="slash"></div>
            <BoosterPart part="bottom" imgSrc={packInfo.img} isOpened={isOpened}/>
            <BoosterPart part="top" imgSrc={packInfo.img} isOpened={isOpened}/>
        </div>
      </div>
    </div>
  );
}
