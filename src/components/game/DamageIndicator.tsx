'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DamageIndicatorInfo } from '@/lib/types';

interface DamageIndicatorProps extends DamageIndicatorInfo {
    onAnimationEnd: () => void;
}

export default function DamageIndicator({ targetId, amount, onAnimationEnd }: DamageIndicatorProps) {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            setPosition({
                top: rect.top + rect.height / 2,
                left: rect.left + rect.width / 2,
            });
        }

        const timer = setTimeout(onAnimationEnd, 1500); // Corresponds to animation duration
        return () => clearTimeout(timer);
    }, [targetId, onAnimationEnd]);

    if (!position) {
        return null;
    }

    const isDamage = amount < 0;
    const displayText = isDamage ? `${amount}` : `+${amount}`;

    return (
        <div
            className={cn(
                "damage-indicator fixed pointer-events-none z-[100] text-6xl font-bold drop-shadow-lg",
                isDamage ? "text-red-500" : "text-green-400"
            )}
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translate(-50%, -50%)',
            }}
        >
            {displayText}
        </div>
    );
}
