'use client';

import Image from 'next/image';
import { cosmeticItems } from '@/lib/cosmetics';

const FALLBACK_PLAYMAT = '/cosmetics/playmat/playmat-void.jpg';

export default function EquippedPlaymatBackground({ playmatId }: { playmatId?: string }) {
  const equippedPlaymat = cosmeticItems.playmats.find((playmat) => playmat.id === playmatId);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-none">
      <Image
        src={equippedPlaymat?.img || FALLBACK_PLAYMAT}
        alt="Equipped Playmat"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]" />
    </div>
  );
}
