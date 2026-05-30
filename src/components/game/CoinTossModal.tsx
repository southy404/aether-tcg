'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { PlayerId } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio';
import { useAppContext } from '@/context/AppContext';
import { cosmeticItems } from '@/lib/cosmetics';
import { DocumentReference, updateDoc } from 'firebase/firestore';
import { useI18n } from '@/i18n';

interface CoinTossModalProps {
    onTossFinished: (winner: PlayerId) => void;
    isPvP?: boolean;
    roomData?: any;
    roomRef?: DocumentReference;
    viewerUid?: string;
}

type CoinSide = 'Kopf' | 'Zahl';

export default function CoinTossModal({ onTossFinished, isPvP, roomData, roomRef, viewerUid }: CoinTossModalProps) {
    const { t } = useI18n();
    const [choice, setChoice] = useState<CoinSide | null>(null);
    const [result, setResult] = useState<CoinSide | null>(null);
    const [isFlipping, setIsFlipping] = useState(false);
    const [showWinner, setShowWinner] = useState(false);
    const { equippedCosmetics } = useAppContext();
    
    const coinRef = useRef<HTMLDivElement>(null);
    const shadowRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    const equippedCoin = cosmeticItems.coins.find(c => c.id === equippedCosmetics.coin) || cosmeticItems.coins[0];

    // PvP Synchronization
    useEffect(() => {
        if (isPvP && roomData?.coinToss) {
            const { choice: remoteChoice, result: remoteResult } = roomData.coinToss;
            
            if (remoteChoice && !choice) {
                setChoice(remoteChoice);
            }

            if (remoteResult && !result && !isFlipping) {
                // If result is present in Firestore but we haven't flipped yet, trigger flip
                performFlip(remoteChoice, remoteResult);
            }
        }
    }, [isPvP, roomData, choice, result, isFlipping]);

    const handleTossChoice = async (playerChoice: CoinSide) => {
        if (isFlipping) return;
        
        playSound('selection');
        setChoice(playerChoice);

        if (isPvP && roomRef) {
            // Chooser generates result and result for PvP consistency
            const tossResult: CoinSide = Math.random() < 0.5 ? 'Kopf' : 'Zahl';
            const chooserUid = roomData.coinToss.chooserUid;
            const winnerUid = playerChoice === tossResult ? chooserUid : roomData.players.find((id: string) => id !== chooserUid);

            await updateDoc(roomRef, {
                'coinToss.choice': playerChoice,
                'coinToss.result': tossResult,
                'coinToss.winnerUid': winnerUid,
            });
        } else {
            const tossResult: CoinSide = Math.random() < 0.5 ? 'Kopf' : 'Zahl';
            performFlip(playerChoice, tossResult);
        }
    };

    const performFlip = (playerChoice: CoinSide, tossResult: CoinSide) => {
        setIsFlipping(true);
        playSound('coin');

        const coin = coinRef.current;
        const shadow = shadowRef.current;
        const stage = stageRef.current;

        if (!coin || !shadow || !stage) return;
        
        const targetRotation = tossResult === 'Kopf' ? 0 : 180;
        const jumpHeight = -450;
        const rotations = 7;

        const tossAnimation = coin.animate(
          [
            { transform: `translateY(0) rotateX(45deg)`, offset: 0 },
            {
              transform: `translateY(${jumpHeight}px) rotateX(${
                rotations * 180
              }deg) scale(0.8)`,
              offset: 0.5,
            },
            {
              transform: `translateY(0) rotateX(${
                rotations * 360 + targetRotation
              }deg)`,
              offset: 1,
            },
          ],
          {
            duration: 1200,
            easing: "cubic-bezier(0.15, 0, 0.15, 1)",
          }
        );

        shadow.animate(
          [
            { transform: "scale(1)", opacity: 0.6 },
            { transform: "scale(0.4)", opacity: 0.1, offset: 0.5 },
            { transform: "scale(1.3)", opacity: 0.6 },
          ],
          { duration: 1200, easing: "ease-in-out" }
        );

        tossAnimation.onfinish = () => {
          stage.classList.add("impact-shake");

          coin.animate(
            [
              { transform: `rotateX(${targetRotation + 15}deg)` },
              { transform: `rotateX(${targetRotation + 55}deg)` },
              { transform: `rotateX(${targetRotation + 45}deg)` },
            ],
            {
              duration: 500,
              easing: "ease-out",
            }
          ).onfinish = () => {
            coin.style.transform = `rotateX(${targetRotation + 45}deg)`;
            stage.classList.remove("impact-shake");
            
            setResult(tossResult);
            
            setTimeout(() => {
                setShowWinner(true);
                const playerWins = playerChoice === tossResult;
                setTimeout(() => {
                    if (isPvP && roomData) {
                        const hostUid = roomData.players[0];
                        const winnerUid = roomData.coinToss.winnerUid;
                        // Map winner UID back to internal role for onTossFinished
                        const winnerRole: PlayerId = winnerUid === hostUid ? 'player' : 'opponent';
                        onTossFinished(winnerRole);
                    } else {
                        onTossFinished(playerWins ? 'player' : 'opponent');
                    }
                }, 1200);
            }, 800);
          };
        };
    };

    const isChooser = isPvP ? roomData?.coinToss?.chooserUid === viewerUid : true;
    const chooserName = isPvP ? roomData?.playerNames[roomData.coinToss.chooserUid] : t('you');
    const displaySide = (side: CoinSide) => side === 'Kopf' ? t('coinHeads') : t('coinTails');

    const getResultMessage = () => {
        if (!result) return null;
        const playerWins = choice === result;
        const winnerName = isPvP ? roomData.playerNames[roomData.coinToss.winnerUid] : (playerWins ? t('you') : t('opponent'));
        const iAmWinner = isPvP ? roomData.coinToss.winnerUid === viewerUid : playerWins;

        return (
            <div className="text-center animate-in fade-in duration-500 space-y-2">
                <p className="text-2xl mb-2">{t('coinShows')} <span className="font-bold text-primary">{displaySide(result)}</span></p>
                 {showWinner && (
                    <p className={`text-4xl font-bold animate-in fade-in duration-500 ${iAmWinner ? 'text-green-400' : 'text-red-400'}`}>
                        {iAmWinner ? t('youStart') : t('playerStarts', { player: winnerName })}
                    </p>
                 )}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-8" ref={stageRef}>
            <h1 className="text-5xl font-bold text-primary tracking-wider">{t('coinToss')}</h1>
            
            <div className="stage">
               <div ref={shadowRef} className="shadow"></div>
                <div id="coin" ref={coinRef} className="coin">
                    <div className="coin-side front">
                        <Image src={equippedCoin.imgHead} alt={t('coinHeads')} fill className="object-contain" />
                    </div>
                    <div className="coin-side back">
                       <Image src={equippedCoin.imgTail} alt={t('coinTails')} fill className="object-contain coin-tail-image" />
                    </div>
                </div>
            </div>

            {result ? (
                getResultMessage()
            ) : choice ? (
                <div className="text-center animate-pulse">
                    <p className="text-2xl">{t('choseCoinSide', { player: chooserName, side: displaySide(choice) })}</p>
                    <p className="text-muted-foreground mt-2">{t('tossInProgress')}</p>
                </div>
            ) : isChooser ? (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-xl text-muted-foreground">{t('chooseSide')}</p>
                    <div className="flex gap-4">
                        <Button variant="tcg" onClick={() => handleTossChoice('Kopf')} disabled={isFlipping}>{t('coinHeads')}</Button>
                        <Button variant="tcg" onClick={() => handleTossChoice('Zahl')} disabled={isFlipping}>{t('coinTails')}</Button>
                    </div>
                </div>
            ) : (
                <div className="text-center animate-pulse">
                    <p className="text-2xl">{t('choosingCoinSide', { player: chooserName })}</p>
                </div>
            )}
        </div>
    );
}
