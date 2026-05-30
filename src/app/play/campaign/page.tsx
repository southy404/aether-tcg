
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { cn } from '@/lib/utils';
import type { Mission } from '@/lib/types';
import { missions as allMissions } from '@/lib/missions';
import { useAppContext } from '@/context/AppContext';
import { useI18n } from '@/i18n';

const MissionTile = ({ mission, onSelect, isLocked }: { mission: Mission, onSelect: (missionId: string) => void, isLocked: boolean }) => {
    const { localizeMission } = useI18n();
    const localizedMission = localizeMission(mission);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleMouseEnter = () => {
        if (isLocked) return;
        playSound('positive');
        if (videoRef.current) {
            videoRef.current.play().catch(e => console.error("Video autoplay failed", e));
        }
    };

    const handleMouseLeave = () => {
        if (isLocked) return;
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };
    
    const handleSelect = () => {
        if (isLocked) {
            playSound('negative');
            return;
        }
        onSelect(mission.id);
    }

    return (
         <div 
            className={cn(
                "group menu-tile-container aspect-[9/16]",
                isLocked ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleSelect}
        >
        <div className={cn("menu-tile-content relative w-full h-full rounded-xl overflow-hidden z-10 transition-all duration-300", isLocked && 'grayscale opacity-70')}>
            {isLocked && (
                <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center">
                    <Lock className="h-16 w-16 text-white/70" />
                </div>
            )}
            {mission.videoSrc && (
                <video
                    ref={videoRef}
                    src={mission.videoSrc}
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0 group-hover:opacity-100 z-10 rounded-xl"
                />
            )}
            <Image
                src={mission.coverImg}
                alt={localizedMission.title}
                fill
                className={cn(
                    'object-cover transition-opacity duration-500 z-0 rounded-xl',
                    'opacity-70 group-hover:opacity-0'
                )}
                data-ai-hint={mission.hint}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-20 transition-opacity duration-300 group-hover:opacity-50 rounded-xl"></div>
            <div 
                className="absolute inset-x-0 bottom-0 p-4 text-center text-white z-20" 
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
            >
                <h2 className="text-3xl font-bold uppercase tracking-wider">{localizedMission.title}</h2>
                <p className="mt-1 text-white/80 text-base">{localizedMission.description}</p>
            </div>
        </div>
        <div className={cn("menu-tile-border", isLocked && 'opacity-50')}></div>
    </div>
    );
};

export default function CampaignPage() {
    const router = useRouter();
    const { completedMissions } = useAppContext();
    const { t } = useI18n();

    const handleSelectMission = (missionId: string) => {
        playSound('selection');
        router.push(`/play/campaign/${missionId}`);
    };

    return (
        <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
             <Image 
                src="/ui/background/mission-background.jpg" 
                alt="Campaign Background"
                fill
                className="object-cover opacity-10 z-0"
                data-ai-hint="fantasy battlefield"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>
            <div className="container mx-auto flex flex-col items-center p-4 py-12 text-center relative z-10">
                <h1 className="mb-12 text-5xl font-bold tracking-wider title-gradient uppercase">{t('campaign')}</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl w-full">
                    {allMissions.map(mission => {
                        const isLocked = !!mission.prerequisite && !completedMissions.includes(mission.prerequisite);
                        return (
                            <MissionTile 
                                key={mission.id} 
                                mission={mission} 
                                onSelect={handleSelectMission}
                                isLocked={isLocked}
                            />
                        )
                    })}
                </div>
                <Link href="/play" passHref className="inline-block mt-16">
                    <Button variant="tcg">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('backToPlaySelection')}
                    </Button>
                </Link>
            </div>
        </div>
    );
}
