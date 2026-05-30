
'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { playSound } from '@/lib/audio';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { TranslationKey, useI18n } from '@/i18n';

const shopCategories = [
    {
        titleKey: 'shopCosmetics',
        descriptionKey: 'shopCosmeticsDescription',
        href: '/shop/cosmetics',
        imgUrl: '/ui/thumbnail/cosmetics-shop.jpg',
        videoUrl: '/ui/thumbnail/cosmetics-shop.mp4',
        imgHint: 'magical art',
        enabled: true,
    },
    {
        titleKey: 'goldShop',
        descriptionKey: 'goldShopDescription',
        href: '/shop/gold',
        imgUrl: '/ui/thumbnail/gold-shop.jpg',
        videoUrl: '/ui/thumbnail/gold-shop.mp4',
        imgHint: 'treasure chest',
        enabled: true,
    },
];

const CategoryTile = ({ titleKey, descriptionKey, href, imgUrl, videoUrl, imgHint, enabled }: (typeof shopCategories)[0]) => {
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
                "menu-tile group/tile bg-background/50 backdrop-blur-sm",
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
            </div>
        </Link>
    );
}

export default function ShopPage() {
  const { t } = useI18n();
  return (
    <>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 py-12 text-center">
        <div className="vignette" />
        <h1 className="mb-12 text-5xl font-bold tracking-wider title-gradient uppercase relative z-10">{t('shop')}</h1>
        <div className="menu-master-container w-full max-w-5xl relative z-10">
            <div className="menu-row h-[300px]">
                {shopCategories.map(cat => <CategoryTile key={cat.href} {...cat} />)}
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
