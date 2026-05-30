'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { playSound } from '@/lib/audio';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

const SYM_H = 90;
const basePool = [
  ...Array(1).fill("7️⃣"),
  ...Array(3).fill("⭐"),
  ...Array(6).fill("🔔"),
  ...Array(15).fill("💎"),
  ...Array(37).fill("🍋"),
  ...Array(63).fill("🍒"),
];

const PayoutTable = () => (
  <div className="payout-table">
    <h3>PAYOUT TABLE</h3>
    <div className="pay-row"><span>7️⃣</span><span>300</span></div>
    <div className="pay-row"><span>⭐</span><span>100</span></div>
    <div className="pay-row"><span>🔔</span><span>50</span></div>
    <div className="pay-row"><span>💎</span><span>30</span></div>
    <div className="pay-row"><span>🍋</span><span>15</span></div>
    <div className="pay-row" style={{ border: 'none' }}>
      <span>🍒</span><span>10</span>
    </div>
  </div>
);

const labelDefs = [
    { text: '3', yClass: 't-1', id: '3-top' },
    { text: '2', yClass: 't-2', id: '2-top' },
    { text: '1', yClass: 't-3', id: '1-mid' },
    { text: '2', yClass: 't-4', id: '2-bot' },
    { text: '3', yClass: 't-5', id: '3-bot' },
];

const betOptions = [10, 20, 30];

export default function ArcadePage() {
  const { gems, setGems } = useAppContext();
  const [lastWin, setLastWin] = useState(0);
  const [currentBet, setCurrentBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winMessage, setWinMessage] = useState('');

  const [winningSymbols, setWinningSymbols] = useState<Set<string>>(new Set());
  const [winningLines, setWinningLines] = useState<Set<string>>(new Set());
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set());
  const [activeLines, setActiveLines] = useState<Set<string>>(new Set());

  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const strips = useRef<string[][]>([]);

  useEffect(() => {
    strips.current = [
      [...basePool].sort(() => Math.random() - 0.5),
      [...basePool].sort(() => Math.random() - 0.5),
      [...basePool].sort(() => Math.random() - 0.5),
    ];

    for (let i = 0; i < 3; i++) {
      const el = reelRefs.current[i];
      if (el) {
        const content = [...strips.current[i], ...strips.current[i], ...strips.current[i]];
        el.innerHTML = content.map((s, idx) => `<div class="symbol" id="r${i}s${idx}">${s}</div>`).join("");
        el.style.top = `-${SYM_H * basePool.length}px`;
      }
    }
    handleSetBet(10);
  }, []);

  const handleSetBet = (n: number) => {
    playSound('selection');
    setCurrentBet(n);
    
    const newActiveLines = new Set<string>();
    const newActiveLabels = new Set<string>();
    
    if (n >= 10) {
      newActiveLines.add("line-mid");
      newActiveLabels.add("lb-1-mid-l").add("lb-1-mid-r");
    }
    if (n >= 20) {
      newActiveLines.add("line-top").add("line-bot");
      newActiveLabels.add("lb-2-top-l").add("lb-2-bot-l").add("lb-2-top-r").add("lb-2-bot-r");
    }
    if (n >= 30) {
      newActiveLines.add("line-d1").add("line-d2");
      newActiveLabels.add("lb-3-top-l").add("lb-3-bot-l").add("lb-3-top-r").add("lb-3-bot-r");
    }
    setActiveLines(newActiveLines);
    setActiveLabels(newActiveLabels);
  };

  const handleSpin = async () => {
    if (gems < currentBet || isSpinning) return;
    
    playSound('selection');
    setGems(g => g - currentBet);
    setIsSpinning(true);
    setWinningSymbols(new Set());
    setWinningLines(new Set());
    setLastWin(0);
    setWinMessage('');
    
    const results: number[] = [];
    const spinPromises = reelRefs.current.map((reel, i) => {
      if (!reel) return Promise.resolve();
      
      const target = Math.floor(Math.random() * basePool.length);
      results.push(target);
      
      return new Promise<void>(resolve => {
        reel.style.transition = `top ${2 + i * 0.5}s cubic-bezier(0.15, 0, 0.15, 1.05)`;
        reel.style.top = `-${(target + basePool.length) * SYM_H}px`;
        setTimeout(resolve, 2500 + i * 500);
      });
    });

    await Promise.all(spinPromises);

    checkWin(results);

    reelRefs.current.forEach((reel, i) => {
      if (reel) {
        reel.style.transition = "none";
        reel.style.top = `-${results[i] * SYM_H}px`;
      }
    });

    setIsSpinning(false);
  };

  const checkWin = (res: number[]) => {
    const getIdx = (r: number, offset: number) => (res[r] + (offset + 1)) % basePool.length;
    let totalWin = 0;
    const newWinningSymbols = new Set<string>();
    const newWinningLines = new Set<string>();

    const evalLine = (indices: number[], lineId: string) => {
      const symbols = indices.map((idx, r) => strips.current[r][idx]);
      if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        const payout = { "🍒": 10, "🍋": 15, "💎": 30, "🔔": 50, "⭐": 100, "7️⃣": 300 }[symbols[0]] || 0;
        totalWin += payout;
        newWinningLines.add(lineId);
        indices.forEach((idx, r) => {
          newWinningSymbols.add(`r${r}s${idx}`);
          newWinningSymbols.add(`r${r}s${idx + basePool.length}`);
          newWinningSymbols.add(`r${r}s${idx + basePool.length * 2}`);
        });
        return true;
      }
      return false;
    };

    const grid = {
      top: [getIdx(0, -1), getIdx(1, -1), getIdx(2, -1)],
      mid: [getIdx(0, 0), getIdx(1, 0), getIdx(2, 0)],
      bot: [getIdx(0, 1), getIdx(1, 1), getIdx(2, 1)],
      d1: [getIdx(0, -1), getIdx(1, 0), getIdx(2, 1)],
      d2: [getIdx(0, 1), getIdx(1, 0), getIdx(2, -1)],
    };

    if (currentBet >= 10) evalLine(grid.mid, "line-mid");
    if (currentBet >= 20) {
      evalLine(grid.top, "line-top");
      evalLine(grid.bot, "line-bot");
    }
    if (currentBet >= 30) {
      evalLine(grid.d1, "line-d1");
      evalLine(grid.d2, "line-d2");
    }

    if (totalWin > 0) {
      playSound('epic');
      setGems(g => g + totalWin);
      setLastWin(totalWin);
      setWinMessage(`WIN: ${totalWin}`);
      setTimeout(() => setWinMessage(''), 1800);
    } else {
        playSound('negative');
    }
    setWinningSymbols(newWinningSymbols);
    setWinningLines(newWinningLines);
  };
  
  useEffect(() => {
    const symbols = document.querySelectorAll('.symbol');
    symbols.forEach(s => {
        if (winningSymbols.has(s.id)) {
            s.classList.add('win-highlight');
        } else {
            s.classList.remove('win-highlight');
        }
    });
  }, [winningSymbols])

  return (
    <div className="flex justify-center items-start h-screen overflow-hidden pt-12">
      <div className="main-container">
        <PayoutTable />
        <div className="machine-wrapper">
          <div className="stats-bar">
            <div className="stat-group">
              <div style={{ fontSize: '10px', color: '#555' }}>CREDITS</div>
              <div className="stat-val">{gems}</div>
            </div>
            <div id="win-announcer" className={cn(winMessage && 'win-flash-text')}>{winMessage}</div>
            <div className="stat-group" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#555' }}>PAYOUT</div>
              <div className="stat-val" style={{ color: 'var(--gold)' }}>{lastWin}</div>
            </div>
          </div>

          <div className="slot-area">
             {labelDefs.map(({text, yClass, id}) => (
                <div key={`l-${id}`} className={cn('label l-left', yClass, { active: activeLabels.has(`lb-${id}-l`) })}>{text}</div>
            ))}

            <div className="lines-container">
                {['top', 'mid', 'bot', 'd1', 'd2'].map(id => (
                    <div key={id} className={cn('laser-line', id.startsWith('d') ? `line-d-${id[1]}` : `line-h-${id}`, { 'bet-active': activeLines.has(`line-${id}`), 'win-strike': winningLines.has(`line-${id}`) })}></div>
                ))}
            </div>

            <div className="reels-wrapper">
              {[0, 1, 2].map(i => (
                <div key={i} className="reel-window">
                  <div className="reel-strip" ref={el => reelRefs.current[i] = el}></div>
                </div>
              ))}
            </div>

            {labelDefs.map(({text, yClass, id}) => (
                <div key={`r-${id}`} className={cn('label l-right', yClass, { active: activeLabels.has(`lb-${id}-r`) })}>{text}</div>
            ))}
          </div>

          <div className="controls">
            <div className="bet-group">
                {betOptions.map(bet => (
                    <button key={bet} className={cn('btn-bet', { selected: currentBet === bet })} onClick={() => handleSetBet(bet)}>
                        <div className="flex items-center justify-center gap-2">
                            <span>{bet}</span>
                            <Image src="/gem.png" alt="Gems" width={16} height={16} />
                        </div>
                    </button>
                ))}
            </div>
            <button className="btn-spin" onClick={handleSpin} disabled={isSpinning}>SPIN</button>
          </div>
        </div>
      </div>
      <Link href="/game" passHref className="inline-block absolute bottom-8 left-1/2 -translate-x-1/2">
        <Button variant="tcg" className="bg-background/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Hauptmenü
        </Button>
      </Link>
    </div>
  );
}
