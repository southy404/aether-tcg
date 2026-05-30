'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type SparklesCoreProps = {
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  className?: string;
  particleColor?: string;
};

export const SparklesCore: React.FC<SparklesCoreProps> = ({
  background = 'transparent',
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 1200,
  className,
  particleColor = '#FFFFFF',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      let animationFrameId: number;
      let particles: { x: number; y: number; speed: number; size: number; opacity: number }[] = [];

      const createParticles = () => {
        particles = [];
        const numParticles = Math.floor(particleDensity * (canvas.width / dpr / 2000));
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        for (let i = 0; i < numParticles; i++) {
          // Bias Y towards the top (y=0). The higher the power, the more concentrated at the top.
          const y = Math.pow(Math.random(), 2.5) * height;

          // The horizontal spread (triangle shape) depends on y.
          // Wider at the top (y=0), narrower at the bottom (y=height).
          const maxHorizontalSpread = width * (1 - y / height);

          const randomX = Math.random() * 2 - 1; // -1 to 1
          const xOffset = randomX * randomX * randomX * (maxHorizontalSpread / 2);

          const x = width / 2 + xOffset;

          // Opacity is higher closer to the center and top.
          const distFromCenterX = Math.abs(xOffset);
          const maxDistFromCenterX = maxHorizontalSpread / 2 > 0 ? maxHorizontalSpread / 2 : 1;

          const opacityX = Math.max(0, 1 - distFromCenterX / maxDistFromCenterX);
          const opacityY = Math.max(0, 1 - y / height);

          // Combine opacities and apply a power to make edges fade more sharply.
          const opacity = Math.pow(opacityX * opacityY, 2.0);

          particles.push({
            x: x,
            y: y,
            speed: Math.random() * 0.1 + 0.05, // Slower for a more gentle effect
            size: Math.random() * (maxSize - minSize) + minSize,
            opacity: opacity,
          });
        }
      };

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
          p.y += p.speed; // Fall downwards
          if (p.y > canvas.height / dpr) {
            p.y = 0; // Reset to top
            
            // Re-randomize x position based on the new logic for a consistent effect
            const width = canvas.width / dpr;
            const height = canvas.height / dpr;
            const y = 0;
            const maxHorizontalSpread = width * (1 - y / height);
            const randomX = Math.random() * 2 - 1;
            const xOffset = randomX * randomX * randomX * (maxHorizontalSpread / 2);
            p.x = width / 2 + xOffset;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
          ctx.fillStyle = particleColor;
          ctx.globalAlpha = p.opacity;
          ctx.fill();
        });
        animationFrameId = requestAnimationFrame(animate);
      };

      createParticles();
      animate();

      const handleResize = () => {
        const newRect = canvas.getBoundingClientRect();
        canvas.width = newRect.width * dpr;
        canvas.height = newRect.height * dpr;
        ctx.scale(dpr, dpr);
        createParticles();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [isClient, background, minSize, maxSize, particleDensity, particleColor]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 w-full h-full -z-10', className)}
    />
  );
};
