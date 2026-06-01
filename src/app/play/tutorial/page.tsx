
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { cn } from '@/lib/utils';
import GameBoard, { createInitialState } from '@/components/game/GameBoard';
import { StarterDecks } from '@/lib/decks';
import { GameCard, GameState } from '@/lib/types';
import { useAppContext, type AccountXpAwardResult } from '@/context/AppContext';
import { TranslationKey, useI18n } from '@/i18n';

type TutorialStep = {
    id: string;
    /** i18n key for the spirit dialogue. Omit for purely-mechanical await steps. */
    textKey?: TranslationKey;
    /** i18n key for the action button (only intro + victory have one). */
    buttonTextKey?: TranslationKey;
    /** Auto-advance after the typing animation finishes. */
    autoAdvance?: boolean;
    /** Delay before auto-advance. */
    delay?: number;
    /** CSS selector of the element to highlight (lifted above the dim overlay). */
    highlightSelector?: string;
    /** CSS selector of the drop zone that accepts the highlighted card. */
    dropZoneSelector?: string;
};

const tutorialSteps: TutorialStep[] = [
    // Player Turn 1
    { id: 'intro', textKey: 'tutorialIntro', buttonTextKey: 'tutorialStart' },
    { id: 'start-game', textKey: 'tutorialStartGame', autoAdvance: true, delay: 1500 },
    { id: 'draw-card-prompt', textKey: 'tutorialDrawCardPrompt', autoAdvance: true, delay: 1500 },
    { id: 'play-aether', textKey: 'tutorialPlayAetherStep', highlightSelector: '#card-in-hand-80', dropZoneSelector: '.aether-zone' },
    { id: 'play-trap', textKey: 'tutorialPlayTrapStep', highlightSelector: '#card-in-hand-14', dropZoneSelector: '.trap-zone' },
    { id: 'go-to-combat', textKey: 'tutorialGoToCombatStep', highlightSelector: '.end-turn-button' },
    { id: 'end-turn', textKey: 'tutorialEndTurnStep', highlightSelector: '.end-turn-button' },

    // Opponent Turn 1
    { id: 'opponent-turn-1-start', textKey: 'tutorialOpponentTurn1Start', autoAdvance: true, delay: 1500 },
    { id: 'opponent-draws-1', textKey: 'tutorialOpponentDraws', autoAdvance: true, delay: 1500 },
    { id: 'await-opponent-aether-1', autoAdvance: false },
    { id: 'opponent-plays-aether-1', textKey: 'tutorialOpponentPlaysAether', autoAdvance: true, delay: 2000 },
    { id: 'await-opponent-unit-1', autoAdvance: false },
    { id: 'opponent-plays-unit-1', textKey: 'tutorialOpponentPlaysUnit', autoAdvance: true, delay: 2000 },
    { id: 'opponent-turn-end-1', textKey: 'tutorialOpponentTurnEnd1', autoAdvance: false },

    // Player Turn 2
    { id: 'player-turn-2-start', textKey: 'tutorialPlayer2Start', autoAdvance: true, delay: 1500 },
    { id: 'player-turn-2-draw', textKey: 'tutorialPlayer2Draw', autoAdvance: true, delay: 1500 },
    { id: 'play-flamebounder', textKey: 'tutorialPlayFlamebounder', highlightSelector: '#card-in-hand-4', dropZoneSelector: '.unit-zone' },
    { id: 'player-turn-2-go-to-combat', textKey: 'tutorialPlayer2GoToCombat', highlightSelector: '.end-turn-button' },
    { id: 'player-turn-2-end', textKey: 'tutorialPlayer2End', highlightSelector: '.end-turn-button' },

    // Opponent Turn 2
    { id: 'opponent-turn-2-start', textKey: 'tutorialOpponentTurn2Start', autoAdvance: true, delay: 1500 },
    { id: 'opponent-draws-2', textKey: 'tutorialOpponentDraws', autoAdvance: true, delay: 1500 },
    { id: 'await-opponent-aether-2', autoAdvance: false },
    { id: 'opponent-plays-aether-2', textKey: 'tutorialOpponentPlaysAether2', autoAdvance: true, delay: 2000 },
    { id: 'await-opponent-attack-2', autoAdvance: false },
    { id: 'activate-trap', textKey: 'tutorialActivateTrap', highlightSelector: '#activate-trap-button' },
    { id: 'trap-success', textKey: 'tutorialTrapSuccess', autoAdvance: true, delay: 4000 },

    // Player Turn 3
    { id: 'player-turn-3-start', textKey: 'tutorialPlayer3Start', autoAdvance: true, delay: 1500 },
    { id: 'player-turn-3-draw', textKey: 'tutorialPlayer3Draw', autoAdvance: true, delay: 1500 },
    { id: 'play-relic', textKey: 'tutorialPlayRelic', highlightSelector: '#card-in-hand-16', dropZoneSelector: '[data-card-id="4"]' },
    { id: 'play-ashwalker', textKey: 'tutorialPlayAshwalker', highlightSelector: '#card-in-hand-3', dropZoneSelector: '.unit-zone' },
    { id: 'use-overcharge', textKey: 'tutorialUseOvercharge', highlightSelector: '[data-card-id="4"]' },
    { id: 'confirm-overcharge', textKey: 'tutorialConfirmOvercharge', highlightSelector: '.overcharge-confirm-button' },
    { id: 'player-turn-3-go-to-combat', textKey: 'tutorialPlayer3GoToCombat', highlightSelector: '.end-turn-button' },
    { id: 'declare-attack', textKey: 'tutorialDeclareAttack', highlightSelector: '[data-card-id="4"]' },
    { id: 'confirm-attack', textKey: 'tutorialConfirmAttack', highlightSelector: '.end-turn-button' },

    // Opponent Turn 3
    { id: 'opponent-turn-3-start', textKey: 'tutorialOpponentTurn3Start', autoAdvance: true, delay: 3000 },
    { id: 'opponent-draws-3', textKey: 'tutorialOpponentDraws3', autoAdvance: true, delay: 1500 },
    { id: 'await-opponent-defender-3', autoAdvance: false },
    { id: 'opponent-plays-defender', textKey: 'tutorialOpponentPlaysDefender', autoAdvance: true, delay: 2000 },
    { id: 'opponent-turn-end-3', textKey: 'tutorialOpponentTurnEnd3', autoAdvance: false },

    // Player Turn 4
    { id: 'player-turn-4-draw', textKey: 'tutorialPlayer4Draw', autoAdvance: false },
    { id: 'play-fireburst', textKey: 'tutorialPlayFireburst', highlightSelector: '#card-in-hand-10', dropZoneSelector: '#opponent' },
    { id: 'victory', textKey: 'tutorialVictory', buttonTextKey: 'tutorialFinish' },
];

const HAND_ACTION_STEPS = new Set([
    'play-aether', 'play-trap', 'play-flamebounder',
    'play-relic', 'play-ashwalker', 'play-fireburst',
]);

const spiritFrames = [
    '/tutorial/spirit-1.png',
    '/tutorial/spirit-2.png',
    '/tutorial/spirit-3.png',
    '/tutorial/spirit-2.png',
];

const spiritBlinkFrame = '/tutorial/spirit-0.png';
const spiritSadFrame = '/tutorial/spirit-sad.png';

type SpiritGuideProps = {
    step: TutorialStep;
    onAction: () => void;
    isSpeaking: boolean;
    textToShow: string;
    phase: 'intro' | 'playing';
    showButton: boolean;
    isStartingTutorial: boolean;
    isSad: boolean;
};

const SpiritGuide = ({ step, onAction, isSpeaking, textToShow, phase, showButton, isStartingTutorial, isSad }: SpiritGuideProps) => {
    const { t } = useI18n();
    const [frameIndex, setFrameIndex] = useState(0);
    const [isBlinking, setIsBlinking] = useState(false);

    // Animation loop for speaking
    useEffect(() => {
        if (!isSpeaking || isSad) {
            setFrameIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setFrameIndex((prev) => (prev + 1) % spiritFrames.length);
        }, 130);
        return () => clearInterval(interval);
    }, [isSpeaking, isSad]);

    // Separate loop for blinking (only when not speaking)
    useEffect(() => {
        if (isSpeaking || isSad) {
            setIsBlinking(false);
            return;
        }

        let blinkTimeout: NodeJS.Timeout;
        const scheduleBlink = (): NodeJS.Timeout => {
            const nextBlink = 4000 + Math.random() * 4000;
            return setTimeout(() => {
                setIsBlinking(true);
                setTimeout(() => {
                    setIsBlinking(false);
                    if (!isSpeaking && !isSad) {
                        blinkTimeout = scheduleBlink();
                    }
                }, 150);
            }, nextBlink);
        };

        blinkTimeout = scheduleBlink();
        return () => clearTimeout(blinkTimeout);

    }, [isSpeaking, isSad]);

    const currentSrc = isSad ? spiritSadFrame : (isBlinking ? spiritBlinkFrame : spiritFrames[frameIndex]);

    return (
        <div
            id="spirit-container"
            className={cn(
                "spirit-container z-[155]",
                phase
            )}
        >
            <div
                className={cn(
                    "speech-bubble",
                    (textToShow || isSpeaking) && "active"
                )}
            >
                <p id="text-target" className="text-sm font-medium text-cyan-50 leading-relaxed text-center min-h-[60px]">
                    {textToShow}
                </p>
            </div>

            <div className="relative w-[200px] h-[200px]">
              <Image
                src={currentSrc}
                width={200}
                height={200}
                className={"spirit-img"}
                alt="Spirit"
                priority
                unoptimized
              />
            </div>

            {showButton && step.buttonTextKey && (
                <div className={cn(
                    "mt-4 transition-opacity duration-500",
                    isStartingTutorial ? "opacity-0" : "opacity-100"
                )}>
                    <Button onClick={onAction} variant="tcg" className="pointer-events-auto">
                        {t(step.buttonTextKey)}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default function TutorialPage() {
    const { t } = useI18n();
    const { username, awardAccountXp, completedTutorial } = useAppContext();
    const [tutorialPhase, setTutorialPhase] = useState<'intro' | 'playing' | 'finished'>('intro');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isSpiritSpeaking, setIsSpiritSpeaking] = useState(false);
    const [textToShow, setTextToShow] = useState('');
    const [showIntroButton, setShowIntroButton] = useState(false);
    const [currentHighlight, setCurrentHighlight] = useState<string | undefined>(undefined);
    const [gameboardKey, setGameboardKey] = useState(0);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isDraggingCard, setIsDraggingCard] = useState(false);
    const [isTutorialStepWithHandAction, setIsTutorialStepWithHandAction] = useState(false);
    const [isStartingTutorial, setIsStartingTutorial] = useState(false);
    const [isSpiritSad, setIsSpiritSad] = useState(false);
    const [tutorialXpAward, setTutorialXpAward] = useState<AccountXpAwardResult | null>(null);

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const finishTutorial = useCallback(() => {
        void awardAccountXp('tutorialCompleted', {
            alreadyCompleted: completedTutorial,
        }).then(setTutorialXpAward);
        setTutorialPhase('finished');
    }, [awardAccountXp, completedTutorial]);

    const advanceStep = useCallback((nextIndex?: number) => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        const index = nextIndex !== undefined ? nextIndex : currentStepIndex + 1;
        if (index >= tutorialSteps.length) {
            finishTutorial();
            return;
        }

        const step = tutorialSteps[index];

        setCurrentStepIndex(index);

        const fullText = step.textKey ? t(step.textKey) : '';

        if (fullText) {
          setIsSpiritSpeaking(true);
          try {
              const audio = new Audio('/tutorial/listen.mp3');
              audio.volume = 0.4;
              audio.play().catch(e => console.error("Listen sound failed", e));
          } catch (e) {
              console.error("Could not play listen sound", e);
          }
        } else {
            setIsSpiritSpeaking(false);
        }

        setTextToShow('');
        setShowIntroButton(false);
        setCurrentHighlight(undefined);
        setIsTutorialStepWithHandAction(false);

        let i = 0;

        const typeEffect = () => {
            if (i <= fullText.length) {
                const currentChunk = fullText.substring(0, i);
                setTextToShow(currentChunk);
                i++;
                typingTimeoutRef.current = setTimeout(typeEffect, 40);
            } else {
                setIsSpiritSpeaking(false);

                if (step.id === 'intro' || step.id === 'victory') {
                    setShowIntroButton(true);
                } else if (step.autoAdvance) {
                    typingTimeoutRef.current = setTimeout(() => {
                        advanceStep(index + 1);
                    }, step.delay || 1500);
                } else {
                    setIsTutorialStepWithHandAction(HAND_ACTION_STEPS.has(step.id));
                    setCurrentHighlight(step.highlightSelector);
                }
            }
        };

        if (!fullText) {
             if (step.autoAdvance) {
                typingTimeoutRef.current = setTimeout(() => {
                    advanceStep(index + 1);
                }, step.delay || 1500);
            } else {
                setIsTutorialStepWithHandAction(HAND_ACTION_STEPS.has(step.id));
                setCurrentHighlight(step.highlightSelector);
            }
        } else {
            typingTimeoutRef.current = setTimeout(typeEffect, 50);
        }

    }, [currentStepIndex, finishTutorial, t]);

    const handleTutorialAction = useCallback((actionType: string, card?: GameCard): boolean => {
        const step = tutorialSteps[currentStepIndex];

        if (actionType === 'UPDATE_STATE' && card) {
            setGameState(card as any as GameState);
            return true;
        }

        if (actionType === 'PLAYER_DAMAGED') {
            setIsSpiritSad(true);
            setTimeout(() => setIsSpiritSad(false), 400);
            return true;
        }

        if (actionType === 'SUCCESS') {
            setTextToShow('');
            setCurrentHighlight(undefined);
            setIsTutorialStepWithHandAction(false);
            setTimeout(() => {
                advanceStep();
            }, 500);
            return true;
        }

        // AI signal for turn end. We still need this to transition from AI's last action to player's turn start.
        if (actionType === 'AI_TURN_END' && (step.id === 'opponent-plays-unit-1' || step.id === 'opponent-plays-defender')) {
            advanceStep();
            return true;
        }

        let isActionCorrect = false;

        const checkAction = (expectedAction: string, cardId?: number) => {
            if (actionType === 'attack-declaration' && step.id === 'declare-attack') {
                 if(card?.id === 4) isActionCorrect = true;
            } else if (cardId !== undefined) {
                if (actionType === expectedAction && card?.id === cardId) isActionCorrect = true;
            } else {
                if (actionType === expectedAction) isActionCorrect = true;
            }
        }

        if (step.id === 'use-overcharge' && actionType === 'clickCard-4') {
             isActionCorrect = true;
             return true;
        }

        switch (step.id) {
            case 'play-aether': checkAction('playAether', 80); break;
            case 'play-trap': checkAction('playTrap', 14); break;
            case 'go-to-combat': checkAction('next-phase-main'); break;
            case 'end-turn': checkAction('next-phase-combat'); break;
            case 'activate-trap': checkAction('activate-trap'); break;
            case 'play-flamebounder': checkAction('playUnit', 4); break;
            case 'player-turn-2-go-to-combat': checkAction('next-phase-main'); break;
            case 'player-turn-2-end': checkAction('next-phase-combat'); break;
            case 'play-relic': checkAction('playRelic', 16); break;
            case 'play-ashwalker': checkAction('playUnit', 3); break;
            case 'confirm-overcharge': checkAction('confirm-overcharge'); break;
            case 'player-turn-3-go-to-combat': checkAction('next-phase-main'); break;
            case 'declare-attack': checkAction('attack-declaration', 4); break;
            case 'confirm-attack': checkAction('next-phase-combat'); break;
            case 'play-fireburst': checkAction('playSpell', 10); break;
            case 'victory': finishTutorial(); return true;
        }

        if (!isActionCorrect) {
            if (!actionType.startsWith('AI_')) {
                 playSound('negative');
            }
        }
        return isActionCorrect;
    }, [currentStepIndex, advanceStep, finishTutorial]);


    useEffect(() => {
        if (tutorialPhase === 'intro' && !isStartingTutorial) {
            advanceStep(0);
        }
    }, [tutorialPhase, advanceStep, isStartingTutorial]);

    // Mirrors the current highlight selector into the DOM as a CSS class.
    // Without this, only #card-in-hand-XX selectors work (because <CardInHand /> handles its own
    // isHighlighted prop) — every other target (end-turn button, on-board unit, trap button,
    // overcharge dialog button) would be hidden under the dim overlay with no glow to follow.
    // The interval re-applies the class whenever the DOM changes (button shows up later, unit
    // gets re-rendered after combat, etc).
    useEffect(() => {
        const MARK = 'tutorial-highlight-dynamic';
        const HIGHLIGHT = 'tutorial-highlight';

        const cleanup = () => {
            document.querySelectorAll(`.${MARK}`).forEach((el) => {
                el.classList.remove(HIGHLIGHT, MARK);
            });
        };

        if (!currentHighlight) {
            cleanup();
            return;
        }

        const apply = () => {
            // First sweep: remove our prior dynamic highlights so we don't leave stale glows
            // on elements that no longer match the selector.
            document.querySelectorAll(`.${MARK}`).forEach((el) => {
                el.classList.remove(HIGHLIGHT, MARK);
            });
            try {
                const targets = document.querySelectorAll(currentHighlight);
                targets.forEach((el) => {
                    el.classList.add(HIGHLIGHT, MARK);
                });
            } catch {
                // Invalid selector — ignore.
            }
        };

        apply();
        const interval = setInterval(apply, 200);
        return () => {
            clearInterval(interval);
            cleanup();
        };
    }, [currentHighlight]);

     useEffect(() => {
        if (!gameState || tutorialPhase !== 'playing') return;

        const currentStep = tutorialSteps[currentStepIndex];

        const { players, phase, activePlayer, pendingResponse, overchargeState } = gameState;

        if (phase === 'start' && currentStep.id === 'intro') {
             advanceStep(1); // Go to 'start-game'
             return;
        }

        const isPlayerDrawStep = ['draw-card-prompt', 'player-turn-2-draw', 'player-turn-3-draw', 'player-turn-4-draw'].includes(currentStep.id);
        if (isPlayerDrawStep && phase === 'main') {
            setTimeout(() => { if (!isSpiritSpeaking) advanceStep() }, 500);
            return;
        }

        if (currentStep.id === 'confirm-attack' && activePlayer === 'opponent' && phase === 'start') {
            advanceStep();
            return;
        }

        if (activePlayer === 'opponent') {
            if (currentStep.id === 'end-turn' && phase === 'start') {
                advanceStep(); // to opponent-turn-1-start
                return;
            }
             if ((currentStep.id === 'opponent-turn-1-start' || currentStep.id === 'opponent-turn-2-start' || currentStep.id === 'opponent-turn-3-start') && phase === 'draw') {
                advanceStep(); // to opponent-draws-X
                return;
            }
            if ((currentStep.id === 'opponent-draws-1' || currentStep.id === 'opponent-draws-2') && phase === 'main') {
                advanceStep(); // to await-opponent-aether-X
                return;
            }
             if (currentStep.id === 'opponent-draws-3' && phase === 'main') {
                advanceStep(); // to await-opponent-defender-3
                return;
            }
            if (currentStep.id === 'await-opponent-aether-1' && players.opponent.aetherZone.some(c => c !== null)) {
                advanceStep(); // to opponent-plays-aether-1
                return;
            }
             if (currentStep.id === 'await-opponent-unit-1' && players.opponent.unitZone.some(u => u?.id === 18)) {
                advanceStep(); // to opponent-plays-unit-1
                return;
            }
            if (currentStep.id === 'await-opponent-aether-2' && players.opponent.aetherZone.filter(c => c !== null).length > 1) {
                advanceStep(); // to opponent-plays-aether-2
                return;
            }
            if (currentStep.id === 'await-opponent-attack-2' && pendingResponse) {
                advanceStep(); // to activate-trap
                return;
            }
             if (currentStep.id === 'await-opponent-defender-3' && players.opponent.unitZone.some(u => u?.id === 25)) {
                advanceStep(); // to opponent-plays-defender
                return;
            }
        }

        if (activePlayer === 'player' && phase === 'start') {
            if (currentStep.id === 'opponent-turn-end-1' || currentStep.id === 'opponent-turn-end-3' || currentStep.id === 'trap-success') {
                advanceStep(); // to next player turn
                return;
            }
        }

        if (overchargeState && currentStep.id === 'use-overcharge') {
            advanceStep();
            return;
        }

        if (currentStep.id === 'declare-attack' && gameState.combatState.attacks.some(a => a.attacker.card.id === 4)) {
            advanceStep();
            return;
        }

    }, [gameState, currentStepIndex, tutorialPhase, isSpiritSpeaking, advanceStep]);


    const startTutorial = () => {
        playSound('selection');
        setIsStartingTutorial(true);
        setShowIntroButton(false);
        setIsSpiritSpeaking(false);
        setTextToShow('');

        setTimeout(() => {
            setTutorialPhase('playing');
            setGameState(createInitialState(StarterDecks[0], 'player', true, username));
            setGameboardKey(prev => prev + 1);
        }, 500);
    }

    const currentStep = tutorialSteps[currentStepIndex];

    if (tutorialPhase === 'finished') {
        return (
             <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-center p-8">
                 <h1 className="text-5xl font-bold title-gradient uppercase">{t('tutorialCompleteTitle')}</h1>
                 <p className="text-lg text-muted-foreground mt-4 max-w-2xl">{t('tutorialVictory')}</p>
                 {tutorialXpAward && tutorialXpAward.xpGained > 0 && (
                    <p className="text-cyan-300 font-bold mt-4">{t('xpGained', { amount: tutorialXpAward.xpGained })}</p>
                 )}
                 <Link href="/play" className="mt-8">
                     <Button variant="tcg">{t('tutorialBackToPlay')}</Button>
                 </Link>
             </div>
        )
    }

    return (
        <div className="w-screen h-screen overflow-hidden relative bg-black">
             <div
                className={cn(
                    "highlight-overlay z-[150]",
                    isDraggingCard && 'hidden',
                    !currentHighlight && 'hidden'
                )}
            ></div>

            <SpiritGuide
              step={currentStep}
              onAction={() => currentStep.id === 'intro' ? startTutorial() : finishTutorial()}
              isSpeaking={isSpiritSpeaking}
              textToShow={textToShow}
              phase={tutorialPhase}
              showButton={showIntroButton}
              isStartingTutorial={isStartingTutorial}
              isSad={isSpiritSad}
            />

            {tutorialPhase === 'playing' && gameState && (
                <GameBoard
                    key={gameboardKey}
                    playerDeck={StarterDecks[0]}
                    isTutorial={true}
                    isControlled={true}
                    initialGameState={gameState}
                    onTutorialAction={handleTutorialAction}
                    tutorialState={{step: {...currentStep, highlightSelector: currentHighlight}, isHandAction: isTutorialStepWithHandAction}}
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
    );
}
