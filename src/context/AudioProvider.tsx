'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAppContext } from './AppContext';
import { setSfxVolume as setGlobalSfxVolume } from '@/lib/audio';

// This component now manages the background theme music
export default function AudioProvider({ children }: { children: React.ReactNode }) {
  const { masterVolume, musicVolume, sfxVolume, hasInteracted } = useAppContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pathname = usePathname();

  // Initialize the audio element once
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/theme.mp3');
      audioRef.current.loop = true;
    }
  }, []);

  // Consolidated effect for playback control and volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Determine playback conditions
    const isImmersiveRoute = (pathname.startsWith('/play/') && pathname !== '/play') || pathname === '/';
    const shouldPlay = hasInteracted && !isImmersiveRoute && masterVolume > 0 && musicVolume > 0;

    // Apply volume
    audio.volume = masterVolume * musicVolume;

    // Play or pause based on conditions
    if (shouldPlay) {
      // Check if it's not already playing to avoid interrupting
      if (audio.paused) {
        audio.play().catch(error => {
          // It's safe to ignore the AbortError, which happens when play() is interrupted by pause().
          if (error.name !== 'AbortError') {
            console.error("Audio play failed:", error);
          }
        });
      }
    } else {
      // Check if it's not already paused to avoid interrupting
      if (!audio.paused) {
        audio.pause();
      }
    }

  }, [pathname, hasInteracted, masterVolume, musicVolume]);


  // Update the global SFX volume
   useEffect(() => {
    setGlobalSfxVolume(masterVolume * sfxVolume);
  }, [masterVolume, sfxVolume]);


  return <>{children}</>;
}
