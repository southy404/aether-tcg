'use client';

// This file now only handles Sound Effects (SFX)

// Global state for SFX volume, calculated from AppContext
let currentSfxVolume = 0.5; // Default value

// We keep a cache of audio objects to avoid re-creating them
const audioCache: { [key: string]: HTMLAudioElement } = {};

// Function to update the global SFX volume from our new AudioProvider
export const setSfxVolume = (volume: number) => {
  currentSfxVolume = volume;
};

// This function will be called from our components for sound effects
export const playSound = (sound: 'positive' | 'selection' | 'negative' | 'epic' | 'damage' | 'cards' | 'fire' | 'lightning' | 'lvl-up' | 'spell' | 'start' | 'win' | 'wind' | 'aether' | 'coin') => {
  // If SFX volume is 0, do nothing.
  if (currentSfxVolume === 0) {
    return;
  }

  // Only run this code in the browser
  if (typeof window !== 'undefined') {
    try {
      let audio: HTMLAudioElement;
      
      // Check if the sound is already in our cache
      if (audioCache[sound]) {
        audio = audioCache[sound];
      } else {
        // If not, create a new Audio object and add it to the cache
        const soundFile = sound === 'damage' ? 'dmg' : sound;
        audio = new Audio(`/${soundFile}.mp3`);
        audioCache[sound] = audio;
      }
      
      // Set the volume before playing
      audio.volume = currentSfxVolume;

      // Stop the sound if it's already playing and reset it
      audio.currentTime = 0;
      
      // Play the sound and catch any potential errors
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // This can happen if the user hasn't interacted with the page yet,
          // or if another sound is playing. We can safely ignore this in most cases.
          console.error(`Could not play sound: ${sound}`, error);
        });
      }
    } catch (error) {
      console.error(`Error initializing or playing sound: ${sound}`, error);
    }
  }
};
