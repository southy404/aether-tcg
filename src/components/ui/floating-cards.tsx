
'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';

const cardBackUrl = '/card-back-logo.jpg?v=2';

const cardPositions = [
  // Far back cards (smaller, less movement)
  { top: '15%', left: '10%', size: 100, rotation: -12, depth: 0.2 },
  { top: '5%', left: '75%', size: 110, rotation: 15, depth: 0.3 },
  { top: '80%', left: '8%', size: 120, rotation: 8, depth: 0.25 },

  // Mid-ground cards
  { top: '30%', left: '88%', size: 140, rotation: -8, depth: 0.5 },
  { top: '65%', left: '90%', size: 150, rotation: -10, depth: 0.6 },
  { top: '5%', left: '30%', size: 130, rotation: 5, depth: 0.4 },
  
  // Fore-ground cards (larger, more movement)
  { top: '50%', left: '5%', size: 160, rotation: -8, depth: 0.8 },
  { top: '75%', left: '75%', size: 180, rotation: 12, depth: 1.0 },
  { top: '85%', left: '35%', size: 160, rotation: -5, depth: 0.9 },
];


interface CardNode {
    el: HTMLDivElement;
    depth: number;
    rotation: number;
    currentX: number;
    currentY: number;
}

export default function FloatingCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<CardNode[]>([]);
  const targetMousePos = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    cardsRef.current = Array.from(container.querySelectorAll('.floating-card')).map(el => ({
        el: el as HTMLDivElement,
        depth: parseFloat(el.dataset.depth || '0.5'),
        rotation: parseFloat(el.dataset.rotation || '0'),
        currentX: 0,
        currentY: 0,
    }));

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      targetMousePos.current = {
        x: (clientX - innerWidth / 2) / (innerWidth / 2),
        y: (clientY - innerHeight / 2) / (innerHeight / 2),
      };
    };

    const animate = () => {
        cardsRef.current.forEach(card => {
            const targetX = targetMousePos.current.x * 80 * card.depth;
            const targetY = targetMousePos.current.y * 80 * card.depth;

            // Apply easing (lerp)
            card.currentX += (targetX - card.currentX) * 0.1;
            card.currentY += (targetY - card.currentY) * 0.1;

            card.el.style.transform = `translate(${card.currentX}px, ${card.currentY}px) rotate(${card.rotation}deg)`;
        });
        animationFrameId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden z-15 pointer-events-none">
      {cardPositions.map((pos, i) => (
        <div
          key={i}
          className="floating-card absolute transition-transform duration-500 ease-out"
          style={{
            top: pos.top,
            left: pos.left,
            width: `${pos.size}px`,
            height: `${pos.size * 1.45}px`,
            transform: `rotate(${pos.rotation}deg)`,
            filter: `brightness(${0.4 + pos.depth * 0.4})`
          }}
          data-depth={pos.depth}
          data-rotation={pos.rotation}
        >
          <div className="card-frame rarity-Legendary w-full h-full rounded-lg shadow-2xl">
             <div className="relative w-full h-full rounded-lg overflow-hidden">
                <Image
                    src={cardBackUrl}
                    alt="Aether Card Back"
                    fill
                    className="object-cover"
                />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
