
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Construction, ArrowLeft, Swords } from 'lucide-react';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TranslationKey, useI18n } from '@/i18n';

const playModes = [
    {
        titleKey: 'quickPlay',
        descriptionKey: 'quickPlayDescription',
        href: '/play/ai-match',
        imgUrl: '/ui/thumbnail/fast-play.jpg',
        videoUrl: '/ui/thumbnail/fast-play.mp4',
        imgHint: 'AI robot battle',
        enabled: true,
    },
    {
        titleKey: 'campaign',
        descriptionKey: 'campaignDescription',
        href: '/play/campaign',
        imgUrl: '/ui/thumbnail/mission.jpg',
        videoUrl: '/ui/thumbnail/mission.mp4',
        imgHint: 'epic journey',
        enabled: true,
    },
    {
        titleKey: 'pvpOnline',
        descriptionKey: 'pvpOnlineDescription',
        href: '/play/pvp',
        imgUrl: '/ui/thumbnail/multiplayer.jpg',
        videoUrl: '/ui/thumbnail/multiplayer.mp4',
        imgHint: 'two warriors fighting',
        enabled: true,
    },
    {
        titleKey: 'ranked',
        descriptionKey: 'rankedDescription',
        href: '#',
        imgUrl: '/ui/thumbnail/ranked.jpg',
        videoUrl: '/ui/thumbnail/ranked.mp4',
        imgHint: 'king throne',
        enabled: false,
    },
    {
        titleKey: 'privateMatch',
        descriptionKey: 'privateMatchDescription',
        href: '#',
        imgUrl: '/ui/thumbnail/private-match.jpg',
        videoUrl: '/ui/thumbnail/private-match.mp4',
        imgHint: 'friendly duel',
        enabled: false,
    },
    {
        titleKey: 'tutorial',
        descriptionKey: 'tutorialDescription',
        href: '/play/tutorial',
        imgUrl: '/ui/thumbnail/tutorial.jpg',
        videoUrl: '/ui/thumbnail/tutorial.mp4',
        imgHint: 'wise master teaching',
        enabled: true,
    },
];

const PlayMenuItem = ({ titleKey, descriptionKey, href, imgUrl, videoUrl, imgHint, enabled }: (typeof playModes)[0]) => {
  const { t } = useI18n();
  const title = t(titleKey as TranslationKey);
  const description = t(descriptionKey as TranslationKey);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glowVideoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  const handleMouseEnter = () => {
    if (!enabled) return;
    playSound('positive');
    if (videoRef.current) videoRef.current.play();
    if (glowVideoRef.current) glowVideoRef.current.play();
  };

  const handleMouseLeave = () => {
    if (!enabled) return;
    if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
    if (glowVideoRef.current) {
        glowVideoRef.current.pause();
        glowVideoRef.current.currentTime = 0;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (enabled) {
      playSound('selection');
      router.push(href);
    }
  };

  return (
    <Link
      href={href}
      className={cn(
        "menu-tile group/tile",
        !enabled && "disabled-tile opacity-60 cursor-not-allowed"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      
      {/* AMBIENT GLOW LAYER */}
      {videoUrl && enabled && (
        <video
          ref={glowVideoRef}
          src={videoUrl}
          muted
          loop
          playsInline
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
          className={cn("object-cover transition-transform duration-700 ease-out scale-100 opacity-70 z-0 rounded-xl", enabled && "group-hover/tile:scale-105 group-hover/tile:opacity-20")}
          data-ai-hint={imgHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-20 transition-opacity duration-300 group-hover:opacity-50 rounded-xl"></div>
      </div>
      <div className="absolute inset-0 flex flex-col items-start justify-end p-4 text-left text-white z-30 pointer-events-none">
        <h2
          className={cn(
            "text-xl font-black uppercase tracking-wider text-white transition-colors duration-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
            enabled && "group-hover/tile:text-holo-gold group-hover/tile:drop-shadow-[0_2px_4px_rgba(255,215,0,0.5)]"
          )}
          data-text={title}
        >
          {title}
        </h2>
        <div className={cn("h-px w-full my-2 bg-gray-500 transition-colors duration-300", enabled && "group-hover/tile:bg-yellow-400")}/>
        <p className="text-sm font-bold text-white max-w-[200px]">
          {description}
        </p>
        {!enabled && (
          <div className="mt-4 flex items-center text-yellow-400 font-semibold">
            <Construction className="mr-2 h-5 w-5" />
            <span>{t('comingSoon')}</span>
          </div>
        )}
      </div>
    </Link>
  );
};


export default function PlayPage() {
  const { t } = useI18n();
  const firstRow = playModes.slice(0, 3);
  const secondRow = playModes.slice(3, 6);

  return (
    <>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 py-12 text-center">
        <div className="vignette" />
        <h1 className="mb-12 text-5xl font-bold tracking-wider title-gradient uppercase relative z-10">{t('battleMode')}</h1>
        <div className="menu-master-container w-full relative z-10">
            <div className="menu-row">
                {firstRow.map(mode => <PlayMenuItem key={mode.titleKey} {...mode} />)}
            </div>
            <div className="menu-row">
                {secondRow.map(mode => <PlayMenuItem key={mode.titleKey} {...mode} />)}
            </div>
        </div>
         <Link href="/game" passHref className="inline-block mt-16 relative z-10">
          <Button variant="tcg">
              <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToMainMenu')}
          </Button>
        </Link>
      </div>
    </>
  );
}
