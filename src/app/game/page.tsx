'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio';
import React, { useRef, useState, useEffect, Suspense } from 'react';
import LoadingScreen from '@/components/ui/loading-screen';
import { useSearchParams, useRouter } from 'next/navigation';
import { TranslationKey, useI18n } from '@/i18n';

const menuItems = [
  {
    href: '/play',
    titleKey: 'play',
    descriptionKey: 'playDescription',
    imgUrl: '/ui/thumbnail/play.jpg',
    videoUrl: '/ui/thumbnail/play.mp4',
    imgHint: 'epic battle scene'
  },
  {
    href: '/collection',
    titleKey: 'collection',
    descriptionKey: 'collectionDescription',
    imgUrl: '/ui/thumbnail/collection.jpg',
    videoUrl: '/ui/thumbnail/collection.mp4',
    imgHint: 'ancient library'
  },
  {
    href: '/deck-builder',
    titleKey: 'decks',
    descriptionKey: 'decksDescription',
    imgUrl: '/ui/thumbnail/decks.jpg',
    videoUrl: '/ui/thumbnail/decks.mp4',
    imgHint: 'fantasy workshop'
  },
  {
    href: '/sets',
    titleKey: 'sets',
    descriptionKey: 'setsDescription',
    imgUrl: '/ui/thumbnail/sets.jpg',
    videoUrl: '/ui/thumbnail/sets.mp4',
    imgHint: 'fantasy market'
  },
  {
    href: '/shop',
    titleKey: 'shop',
    descriptionKey: 'shopDescription',
    imgUrl: '/ui/thumbnail/shop.jpg',
    videoUrl: '/ui/thumbnail/shop.mp4',
    imgHint: 'magic shop'
  },
  {
    href: '/marketplace',
    titleKey: 'marketplace',
    descriptionKey: 'marketplaceDescription',
    imgUrl: '/ui/thumbnail/marketplace.jpg',
    videoUrl: '/ui/thumbnail/marketplace.mp4',
    imgHint: 'ancient scroll'
  },
];

const MenuItem = ({ href, titleKey, descriptionKey, imgUrl, videoUrl, imgHint }: any) => {
  const { t } = useI18n();
  const title = t(titleKey as TranslationKey);
  const description = t(descriptionKey as TranslationKey);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glowVideoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    playSound('positive');
    if (videoRef.current) videoRef.current.play();
    if (glowVideoRef.current) glowVideoRef.current.play();
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
    if (glowVideoRef.current) {
        glowVideoRef.current.pause();
        glowVideoRef.current.currentTime = 0;
    }
  };

  return (
    <Link
      href={href}
      className={cn("menu-tile group/tile")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => playSound('selection')}
    >
      
      {/* AMBIENT GLOW LAYER */}
      {videoUrl && (
        <video
          ref={glowVideoRef}
          src={videoUrl}
          muted loop playsInline
          className="ambient-glow rounded-xl"
        />
      )}
      
      {/* MAIN CONTENT LAYER */}
      <div className="absolute inset-0 z-10 w-full h-full overflow-hidden rounded-xl">
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out scale-100 group-hover/tile:scale-102 opacity-0 group-hover/tile:opacity-100 z-10 rounded-xl"
          />
        )}
        <Image
          src={imgUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 ease-out scale-100 group-hover/tile:scale-105 opacity-100 group-hover/tile:opacity-20 z-0 rounded-xl"
          data-ai-hint={imgHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-20 rounded-xl"></div>
      </div>

      {/* TEXT */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 z-30 pointer-events-none">
        <h2 className={cn(
            "text-2xl font-black uppercase tracking-tighter text-white transition-colors duration-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
            "group-hover/tile:text-holo-gold group-hover/tile:drop-shadow-[0_2px_4px_rgba(255,215,0,0.5)]"
          )}
          data-text={title}
        >
          {title}
        </h2>
        <div className={cn(
            "h-px w-full my-2 bg-gray-500 transition-colors duration-300",
            "group-hover/tile:bg-yellow-400"
        )}/>
        <p className="text-sm font-bold text-white max-w-[200px]">
          {description}
        </p>
      </div>
    </Link>
  );
};


function GamePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(searchParams.get('from') === 'intro');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const onLoadingFinished = () => {
    setShowLoading(false);
    // Remove the query param from URL without reloading the page
    const newUrl = `${window.location.pathname}`;
    router.replace(newUrl, { scroll: false });
  };
  
  if (!isClient) {
      return null;
  }

  if (showLoading) {
    return <LoadingScreen onFinished={onLoadingFinished} />;
  }

  const firstRow = menuItems.slice(0, 3);
  const secondRow = menuItems.slice(3, 6);

  return (
     <div className="relative min-h-screen bg-black flex items-center justify-center p-8 overflow-hidden">
      <Image
        src="/ui/background/background.jpg"
        alt="AETHER TCG Background"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="vignette" />
      
      {/* Der Master-Container steuert die globale Interaktion */}
      <div className="menu-master-container z-20">
        
        <div className="logo-container flex flex-col items-center justify-center text-center">
           <Image src="/logo.png?v=2" alt="Logo" width={300} height={60} />
        </div>

        {/* REIHE 1 */}
        <div className="menu-row">
          {firstRow.map((item, idx) => (
            <MenuItem 
                key={item.href} 
                {...item}
            />
          ))}
        </div>

        {/* REIHE 2 */}
        <div className="menu-row">
          {secondRow.map((item) => (
            <MenuItem 
                key={item.href} 
                {...item}
            />
          ))}
        </div>

      </div>
       {/* Preload images */}
       <div style={{ display: 'none' }}>
        {menuItems.map(item => (
          <img key={`preload-${item.href}`} src={item.imgUrl} alt="" />
        ))}
      </div>
    </div>
  );
}


export default function GamePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GamePageContent />
        </Suspense>
    )
}
