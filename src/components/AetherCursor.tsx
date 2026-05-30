'use client';

import { useEffect, useRef } from 'react';

export default function AetherCursor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const createAether = (x: number, y: number) => {
      const spark = document.createElement('div');
      spark.className = 'spark';
      
      const size = Math.random() * 2 + 0.5;
      const duration = Math.random() * 500 + 400;
      const color = Math.random() > 0.2 ? 'var(--aether-glow)' : 'var(--aether-purple)';

      spark.style.width = size + 'px';
      spark.style.height = size + 'px';
      spark.style.left = x + 'px';
      spark.style.top = y + 'px';
      
      spark.style.boxShadow = `0 0 ${size * 2}px white, 0 0 ${size * 5}px ${color}`;
      
      spark.style.setProperty('--x', (Math.random() - 0.5) * 30 + 'px');
      spark.style.setProperty('--y', (Math.random() - 0.5) * 30 - 15 + 'px');
      spark.style.setProperty('--duration', duration + 'ms');

      container.appendChild(spark);
      setTimeout(() => spark.remove(), duration);
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Check if the cursor is over a card. If so, the Card component will handle the effect.
      const target = e.target as HTMLElement;
      if (target.closest('.card-wrap')) {
        return;
      }
      
      const { clientX, clientY } = e;
      const dist = Math.hypot(clientX - lastPos.current.x, clientY - lastPos.current.y);
      
      if (dist > 5) {
          createAether(clientX, clientY);
          lastPos.current = { x: clientX, y: clientY };
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
        // Don't create a burst if clicking on a card, as the card itself might have interactions.
        const target = e.target as HTMLElement;
        if (target.closest('.card-wrap')) {
            return;
        }
        for(let i=0; i<12; i++) createAether(e.clientX, e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="aether-container"
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[99999]"
    ></div>
  );
}

    