'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { produce } from 'immer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { cn } from '@/lib/utils';
import GameBoard, { createInitialState } from '@/components/game/GameBoard';
import { StarterDecks } from '@/lib/decks';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GameCard, GameState } from '@/lib/types';
import { TranslationKey, useI18n } from '@/i18n';

type TutorialStep = {
  id: string;
  textKey: TranslationKey;
  buttonTextKey?: TranslationKey;
  autoAdvance?: boolean;
  delay?: number;
  highlightSelector?: string;
  dropZoneSelector?: string;
};

const tutorialSteps: TutorialStep[] = [
  { id: 'intro', textKey: 'tutorialIntro', buttonTextKey: 'tutorialStart' },
  { id: 'start-game', textKey: 'tutorialStartGame', autoAdvance: true, delay: 2000 },
  { id: 'play-aether', textKey: 'tutorialPlayAether', highlightSelector: '#card-in-hand-80', dropZoneSelector: '.aether-zone' },
  { id: 'play-trap', textKey: 'tutorialPlayTrap', highlightSelector: '#card-in-hand-14', dropZoneSelector: '.trap-zone' },
  { id: 'go-to-combat', textKey: 'tutorialGoToCombat', highlightSelector: '.end-turn-button' },
  { id: 'end-turn', textKey: 'tutorialEndTurn', highlightSelector: '.end-turn-button' },
  { id: 'opponent-turn', textKey: 'tutorialOpponentTurn' },
  { id: 'play-unit', textKey: 'tutorialPlayUnit', highlightSelector: '#card-in-hand-4', dropZoneSelector: '.unit-zone' },
  { id: 'attack', textKey: 'tutorialAttack', highlightSelector: '#opponent' },
  { id: 'finish-him', textKey: 'tutorialFinishHim', highlightSelector: '#card-in-hand-10', dropZoneSelector: '#opponent' },
  { id: 'end', textKey: 'tutorialEndText' },
];

const spiritFrames = [
    '/tutorial/spirit-1.png',
    '/tutorial/spirit-2.png',
    '/tutorial/spirit-3.png',
    '/tutorial/spirit-2.png'
];
const spiritBlinkFrame = '/tutorial/spirit-0.png';

const SpiritGuide = ({ step, onAction, isSpeaking, textToShow, phase, showButton }: { step: typeof tutorialSteps[0], onAction: () => void, isSpeaking: boolean, textToShow: string, phase: 'intro' | 'playing', showButton: boolean }) => {
    const { t } = useI18n();
    const spiritImgRef = useRef<HTMLImageElement>(null);
    const [frameIndex, setFrameIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [currentText, setCurrentText] = useState('');

    useEffect(() => {
        if (textToShow && textToShow !== currentText) {
            setIsFadingOut(true);
            const fadeOutTimer = setTimeout(() => {
                setCurrentText(textToShow);
                setIsVisible(true);
                setIsFadingOut(false);
            }, 300);
            return () => clearTimeout(fadeOutTimer);
        } else if (!textToShow && currentText) {
             setIsFadingOut(true);
             const fadeOutTimer = setTimeout(() => {
                setCurrentText('');
                setIsVisible(false);
                setIsFadingOut(false);
            }, 300);
            return () => clearTimeout(fadeOutTimer);
        } else if (textToShow && !currentText) {
            setCurrentText(textToShow);
            setIsVisible(true);
        }
    }, [textToShow, currentText]);


    useEffect(() => {
        let speakInterval: NodeJS.Timeout;
        if (isSpeaking) {
            speakInterval = setInterval(() => {
                setFrameIndex(prev => (prev + 1) % spiritFrames.length);
            }, 130);
        } else {
             setFrameIndex(0);
             if (spiritImgRef.current) spiritImgRef.current.src = spiritFrames[0];
        }
        return () => clearInterval(speakInterval);
    }, [isSpeaking]);

     useEffect(() => {
        let blinkTimeout: NodeJS.Timeout;
        const scheduleBlink = () => {
            blinkTimeout = setTimeout(() => {
                if (spiritImgRef.current && !isSpeaking) {
                     spiritImgRef.current.src = spiritBlinkFrame;
                     setTimeout(() => {
                        if (spiritImgRef.current && !isSpeaking) spiritImgRef.current.src = spiritFrames[0];
                     }, 150);
                }
                scheduleBlink();
            }, 2000 + Math.random() * 3000);
        };
        
        scheduleBlink();
        return () => clearTimeout(blinkTimeout);

    }, [isSpeaking]);

    return (
        <div 
            id="spirit-container" 
            className={cn(
                "spirit-container",
                phase
            )}
        >
            <div 
                className={cn(
                    "speech-bubble transition-opacity duration-300", 
                     isVisible && !isFadingOut ? "opacity-100" : "opacity-0"
                )}
            >
                <p id="text-target" className="text-sm font-medium text-cyan-50 leading-relaxed text-center min-h-[60px]">
                    {currentText}
                </p>
                {showButton && step.buttonTextKey && (
                    <Button onClick={onAction} className="w-full mt-4 pointer-events-auto">
                        {t(step.buttonTextKey as TranslationKey)}
                    </Button>
                )}
            </div>
            <div>
              <Image 
                ref={spiritImgRef}
                src={isSpeaking ? spiritFrames[frameIndex] : spiritFrames[0]}
                width={200} 
                height={200} 
                className={"spirit-img"} 
                alt="Spirit" 
                unoptimized
              />
            </div>
        </div>
    );
};

export default function TutorialPage() {
    const { t } = useI18n();
    const [tutorialPhase, setTutorialPhase] = useState<'intro' | 'playing' | 'finished'>('intro');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isSpiritSpeaking, setIsSpiritSpeaking] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [showIntroButton, setShowIntroButton] = useState(false);
    const [currentHighlight, setCurrentHighlight] = useState<string | undefined>(undefined);
    const [gameboardKey, setGameboardKey] = useState(0);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isDraggingCard, setIsDraggingCard] = useState(false);

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
   const advanceStep = useCallback((nextIndex?: number) => {
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }

    const index = nextIndex !== undefined ? nextIndex : currentStepIndex + 1;
    
    if (index >= tutorialSteps.length) {
        setTutorialPhase('finished');
        return;
    }

    setCurrentStepIndex(index);
    const step = tutorialSteps[index];
    
    setIsSpiritSpeaking(true);
    setDisplayedText(''); 
    setShowIntroButton(false);
    setCurrentHighlight(undefined);

    let i = 0;
    const fullText = t(step.textKey as TranslationKey);
    let currentTypingText = ""; 

    const typeEffect = () => {
        if (i < fullText.length) {
            currentTypingText += fullText.charAt(i);
            setDisplayedText(currentTypingText);
            i++;
            typingTimeoutRef.current = setTimeout(typeEffect, 40);
        } else {
            setIsSpiritSpeaking(false);
            if (step.id === 'intro') {
                setShowIntroButton(true);
            } else if (step.autoAdvance) {
                setTimeout(() => advanceStep(index + 1), step.delay || 1000);
            } else {
                setCurrentHighlight(step.highlightSelector);
            }
        }
    };
    
    typingTimeoutRef.current = setTimeout(typeEffect, 50);
}, [currentStepIndex, t]);


    useEffect(() => {
        if (tutorialPhase === 'intro') {
            advanceStep(0);
        }
    }, [tutorialPhase, advanceStep]);
    
    useEffect(() => {
        if (!gameState || tutorialPhase !== 'playing') return;

        const gameLoop = () => {
            setGameState(
                produce(draft => {
                    if (!draft || draft.winner) return;
                    const activePlayerId = draft.activePlayer;
                    
                    if ((activePlayerId === 'player' && (draft.phase === 'start' || draft.phase === 'draw'))) {
                        // Let the gameboard handle its internal phase progression for player
                    }
                })
            );
        };
        const timeoutId = setTimeout(gameLoop, 1000);
        return () => clearTimeout(timeoutId);

    }, [gameState, tutorialPhase]);

    useEffect(() => {
        if (gameState?.phase === 'main' && currentStepIndex === 1) {
            setTimeout(() => advanceStep(2), 500);
        }
    }, [gameState?.phase, currentStepIndex, advanceStep]);

    const startTutorial = () => {
        playSound('selection');
        setTutorialPhase('playing');
        setGameState(createInitialState(StarterDecks[0], 'player', true));
        setGameboardKey(prev => prev + 1);

        setTimeout(() => {
            advanceStep(1); 
        }, 800);
    }
    
    const handleTutorialAction = (actionType: string, card?: GameCard): boolean => {
        const step = tutorialSteps[currentStepIndex];
        
        if (actionType === 'UPDATE_STATE' && card) {
            setGameState(card as any as GameState);
            return true;
        }

        if (actionType === 'SUCCESS') {
            setDisplayedText('');
            setCurrentHighlight(undefined);
            setTimeout(() => {
                advanceStep();
            }, 1000);
            return true;
        }

        let isActionCorrect = false;
        if (step.id === 'play-aether' && actionType === 'playAether') isActionCorrect = true;
        if (step.id === 'play-trap' && actionType === 'playTrap') isActionCorrect = true;
        if (step.id === 'go-to-combat' && actionType === 'next-phase-main') isActionCorrect = true;
        if (step.id === 'end-turn' && actionType === 'next-phase-combat') isActionCorrect = true;
        if (step.id === 'play-unit' && actionType === 'playUnit') isActionCorrect = true;
        if (step.id === 'attack' && actionType === 'attack-declaration') isActionCorrect = true;
        if (step.id === 'finish-him' && card?.type === 'Spell' ) isActionCorrect = true;

        if (!isActionCorrect) {
            playSound('negative');
        }
        return isActionCorrect;
    };

    const currentStep = tutorialSteps[currentStepIndex];

    if (currentStep.id === 'end') {
        return (
             <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-center p-8">
                 <h1 className="text-5xl font-bold title-gradient uppercase">{t('tutorialCompleteTitle')}</h1>
                 <p className="text-lg text-muted-foreground mt-4 max-w-2xl">{t(currentStep.textKey as TranslationKey)}</p>
                 <Link href="/play" className="mt-8">
                     <Button variant="tcg">{t('backToGameSelection')}</Button>
                 </Link>
             </div>
        )
    }
    
    return (
        <DndProvider backend={HTML5Backend}>
            <div className="w-screen h-screen overflow-hidden relative bg-black">
                 <div 
                    className={cn(
                        "highlight-overlay",
                        isDraggingCard && 'hidden',
                    )}
                ></div>
                
                <SpiritGuide 
                  step={currentStep} 
                  onAction={startTutorial} 
                  isSpeaking={isSpiritSpeaking}
                  textToShow={displayedText}
                  phase={tutorialPhase === 'finished' ? 'intro' : tutorialPhase}
                  showButton={showIntroButton}
                />
                
                {tutorialPhase === 'playing' && gameState && (
                    <GameBoard 
                        key={gameboardKey}
                        playerDeck={StarterDecks[0]} 
                        isTutorial={true}
                        isControlled={true}
                        initialGameState={gameState}
                        onTutorialAction={handleTutorialAction}
                        tutorialState={{step: {...currentStep, highlightSelector: currentHighlight}}}
                        onDragStateChange={setIsDraggingCard}
                        startingPlayer="player"
                        onReset={() => {
                            setTutorialPhase('intro');
                            setGameState(null);
                            setCurrentStepIndex(0);
                            advanceStep(0);
                        }}
                    />
                )}
                 {tutorialPhase === 'playing' && !gameState && (
                     <div className="flex items-center justify-center h-full text-white">Loading Game...</div>
                )}
            </div>
        </DndProvider>
    );
}
