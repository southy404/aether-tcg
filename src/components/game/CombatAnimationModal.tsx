
'use client';

import React, { useEffect } from 'react';
import Card from '../Card';
import { CombatAttack } from '@/lib/types';
import { Swords } from 'lucide-react';
import { playSound } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface CombatAnimationModalProps {
  attacks: CombatAttack[];
  onAnimationEnd: () => void;
}

const CombatPair = ({ attack }: { attack: CombatAttack }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
      <Card card={attack.attacker.card} />
      <Swords className="h-8 w-8 text-red-500 animate-pulse" />
      {attack.blocker ? (
        <Card card={attack.blocker.card} />
      ) : (
        <div className="w-[200px] h-[290px] flex items-center justify-center text-center p-4 border-2 border-dashed border-red-500/50 rounded-xl bg-red-500/10">
          <p className="text-2xl font-bold text-red-400">{t('directAttackLabel')}</p>
        </div>
      )}
    </div>
  );
};


export default function CombatAnimationModal({ attacks, onAnimationEnd }: CombatAnimationModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    playSound('epic'); // Play a sound for the combat phase
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 4000); // Show the combat scene for 4 seconds

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  const directAttacks = attacks.filter(a => !a.blocker);
  const blockedAttacks = attacks.filter(a => a.blocker);

  return (
    <div className="absolute inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-8 overflow-y-auto">
      <h2 className="text-5xl font-bold title-gradient uppercase mb-8">{t('combatPhaseLabel')}</h2>
      <div className="flex flex-wrap items-start justify-center gap-8">
        {blockedAttacks.map((attack, index) => (
          <div key={index} className="relative p-4">
             <div className="absolute inset-0 -z-10 bg-black/30 rounded-xl border border-primary/30"></div>
             <CombatPair attack={attack} />
          </div>
        ))}
         {directAttacks.length > 0 && (
           <div className="flex flex-col items-center gap-4 p-4">
              <h3 className="text-2xl font-bold text-red-400">{t('directAttacksLabel')}</h3>
              <div className="flex flex-wrap gap-4 justify-center">
                  {directAttacks.map((attack, index) => (
                      <Card key={index} card={attack.attacker.card} />
                  ))}
              </div>
            </div>
         )}
      </div>
    </div>
  );
}
