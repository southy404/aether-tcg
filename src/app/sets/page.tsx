'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { playSound } from '@/lib/audio';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n';

const SET_NAME = "AWAKENING";
const PACK_COST = 100;

export default function SetsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const glowVideoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { t } = useI18n();

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
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    playSound('selection');
    router.push(href);
  };


  return (
    <>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 py-12 text-center">
        <div className="vignette" />
        <h1 className="mb-12 text-5xl font-bold tracking-wider title-gradient uppercase relative z-10">{t('cardSets')}</h1>
        
        <div className="menu-master-container w-full max-w-xl relative z-10">
            <div className="menu-row h-[300px]">
                 <Link 
                    href="/sets/awakening/packs"
                    className="group/tile menu-tile block relative w-full"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => handleClick(e, "/sets/awakening/packs")}
                >
                    
                    {/* AMBIENT GLOW LAYER */}
                    <video
                        ref={glowVideoRef}
                        src="/ui/thumbnail/awakening.mp4"
                        muted
                        loop
                        playsInline
                        className="ambient-glow rounded-xl"
                    />
                    {/* MAIN CONTENT LAYER */}
                    <div className="absolute inset-0 z-10 w-full h-full overflow-hidden rounded-xl">
                        <video
                        ref={videoRef}
                        src="/ui/thumbnail/awakening.mp4"
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out scale-100 group-hover/tile:scale-102 opacity-0 group-hover/tile:opacity-100 z-10 rounded-xl"
                        />
                        <Image 
                            src="/ui/thumbnail/awakening-set.jpg" 
                            alt={SET_NAME}
                            fill 
                            className={cn(
                                "object-cover transition-transform duration-700 ease-out scale-100 opacity-70 z-0 rounded-xl",
                                "group-hover/tile:scale-105 group-hover/tile:opacity-20"
                            )}
                            data-ai-hint="celestial justice"
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-20 rounded-xl"></div>
                    </div>
                    
                     {/* TEXT */}
                    <div className="absolute inset-0 flex flex-col items-start justify-end p-6 text-left z-30 pointer-events-none">
                        <h2 className={cn(
                            "text-3xl font-black uppercase tracking-tighter text-white transition-colors duration-300",
                            "group-hover/tile:text-holo-gold group-hover/tile:drop-shadow-[0_2px_4px_rgba(255,215,0,0.5)]"
                        )} 
                        data-text={SET_NAME}
                        >
                            {SET_NAME}
                        </h2>
                        <div className={cn(
                            "h-px w-full my-2 bg-gray-500 transition-colors duration-300",
                            "group-hover/tile:bg-yellow-400"
                        )}/>
                        <p className="text-base font-bold text-white max-w-[300px]">
                            {t('setPackInfo', { count: 5, cost: PACK_COST })}
                        </p>
                    </div>
                </Link>
            </div>
        </div>

        <Link href="/sets/awakening" passHref className="inline-block mt-8 relative z-10">
            <Button variant="outline" onClick={() => playSound('selection')}>
                <BookOpen className="mr-2 h-4 w-4"/>
                {t('viewAwakeningSet')}
            </Button>
        </Link>

        <Link href="/game" passHref className="inline-block mt-8 relative z-10">
            <Button variant="tcg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToMainMenu')}
            </Button>
        </Link>
      </div>
    </>
  );
}
