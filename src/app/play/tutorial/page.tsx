
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
import { GameCard, GameState } from '@/lib/types';
import { MASTER_DB } from '@/lib/cards';
import { useAppContext, type AccountXpAwardResult } from '@/context/AppContext';
import { useI18n } from '@/i18n';

const tutorialSteps = [
    // Player Turn 1
    { id: 'intro', text: 'Willkommen, Beschwörer. Ich bin ein Geist des Aethers. Bist du bereit, die Grundlagen zu lernen?', buttonText: 'Tutorial starten' },
    { id: 'start-game', text: 'Du bist am Zug.', autoAdvance: true, delay: 1500 },
    { id: 'draw-card-prompt', text: 'Du ziehst eine Karte.', autoAdvance: true, delay: 1500 },
    { id: 'play-aether', text: 'Spiele als erstes eine Aether-Quelle, um deinen Aether-Vorrat aufzufüllen.', highlightSelector: '#card-in-hand-80', dropZoneSelector: '.aether-zone' },
    { id: 'play-trap', text: 'Gut. Du hast nicht genug Aether für eine Einheit. Lege stattdessen eine Fallenkarte.', highlightSelector: '#card-in-hand-14', dropZoneSelector: '.trap-zone' },
    { id: 'go-to-combat', text: 'Du kannst weiter nichts tun. Wechsle nun in die Kampfphase.', highlightSelector: '.end-turn-button' },
    { id: 'end-turn', text: 'Da du diese Runde keine Einheit zum Angreifen hast, beende deinen Zug.', highlightSelector: '.end-turn-button' },
    
    // Opponent Turn 1
    { id: 'opponent-turn-1-start', text: 'Der Gegner ist am Zug.', autoAdvance: true, delay: 1500 },
    { id: 'opponent-draws-1', text: 'Er zieht eine Karte.', autoAdvance: true, delay: 1500 },
    { id: 'await-opponent-aether-1', text: '', autoAdvance: false },
    { id: 'opponent-plays-aether-1', text: 'Er legt eine Aether-Quelle.', autoAdvance: true, delay: 2000 },
    { id: 'await-opponent-unit-1', text: '', autoAdvance: false },
    { id: 'opponent-plays-unit-1', text: 'Jetzt beschwört er eine Einheit.', autoAdvance: true, delay: 2000 },
    { id: 'opponent-turn-end-1', text: 'Seine Einheit hat "Beschwörungskrankheit" und kann diesen Zug nicht angreifen, also beendet er seinen Zug.', autoAdvance: false },

    // Player Turn 2
    { id: 'player-turn-2-start', text: 'Sehr gut. Du bist wieder am Zug.', autoAdvance: true, delay: 1500 },
    { id: 'player-turn-2-draw', text: 'Du ziehst eine Karte.', autoAdvance: true, delay: 1500 },
    { id: 'play-flamebounder', text: 'Dein Aether-Vorrat ist wieder aufgeladen. Beschwöre jetzt den Flamebounder!', highlightSelector: '#card-in-hand-4', dropZoneSelector: '.unit-zone' },
    { id: 'player-turn-2-go-to-combat', text: 'Deine Einheit kann diesen Zug noch nicht angreifen. Wechsle in die Kampfphase.', highlightSelector: '.end-turn-button' },
    { id: 'player-turn-2-end', text: 'Beende nun deinen Zug.', highlightSelector: '.end-turn-button' },

    // Opponent Turn 2
    { id: 'opponent-turn-2-start', text: 'Der Gegner ist wieder dran.', autoAdvance: true, delay: 1500 },
    { id: 'opponent-draws-2', text: 'Er zieht eine Karte.', autoAdvance: true, delay: 1500 },
    { id: 'await-opponent-aether-2', text: '', autoAdvance: false },
    { id: 'opponent-plays-aether-2', text: 'Er legt eine weitere Aether-Quelle...', autoAdvance: true, delay: 2000 },
    { id: 'await-opponent-attack-2', text: '', autoAdvance: false },
    { id: 'activate-trap', text: 'Der Gegner greift jetzt an! Aktiviere deine Falle, um den Angriff zu stoppen!', highlightSelector: '#activate-trap-button' },
    { id: 'trap-success', text: 'Du hast die Einheit zerstört, bevor sie dich angreifen konnte!', autoAdvance: true, delay: 4000 },

    // Player Turn 3
    { id: 'player-turn-3-start', text: 'Perfekt abgewehrt. Du bist wieder dran.', autoAdvance: true, delay: 1500 },
    { id: 'player-turn-3-draw', text: 'Du ziehst eine Karte.', autoAdvance: true, delay: 1500 },
    { id: 'play-relic', text: 'Spiele die "Flaming Crown". Relikte sind permanente Karten, die das Spielgeschehen beeinflussen. Ziehe sie auf deinen Flamebounder.', highlightSelector: '#card-in-hand-16', dropZoneSelector: '[data-card-id="4"]' },
    { id: 'play-ashwalker', text: 'Spiele nun den "Ashwalker".', highlightSelector: '#card-in-hand-3', dropZoneSelector: '.unit-zone' },
    { id: 'use-overcharge', text: 'Nutze "Overcharge" auf deinem Flamebounder. Klicke die Karte an und wähle die Overcharge-Option im Detail-Fenster.', highlightSelector: '[data-card-id="4"]' },
    { id: 'confirm-overcharge', text: 'Bestätige die Überladung. Du gibst Aether aus, um den Angriff zu erhöhen, aber die Einheit erleidet am Ende des Zuges Schaden.', highlightSelector: '.overcharge-confirm-button' },
    { id: 'player-turn-3-go-to-combat', text: 'Sehr gut! Wechsle nun in die Kampfphase.', highlightSelector: '.end-turn-button' },
    { id: 'declare-attack', text: 'Sehr gut! Dein Ashwalker ist noch erschöpft. Greife nur mit dem Flamebounder an, indem du ihn anklickst.', highlightSelector: '[data-card-id="4"]' },
    { id: 'confirm-attack', text: 'Bestätige deinen Angriff, um den Gegner direkt anzugreifen!', highlightSelector: '.end-turn-button' },
    
    // Opponent Turn 3
    { id: 'opponent-turn-3-start', text: 'Der Gegner überlebt knapp, aber er ist in die Enge getrieben.', autoAdvance: true, delay: 3000 },
    { id: 'opponent-draws-3', text: 'Er zieht eine Karte.', autoAdvance: true, delay: 1500 },
    { id: 'await-opponent-defender-3', text: '', autoAdvance: false },
    { id: 'opponent-plays-defender', text: 'Er beschwört eine Einheit!', autoAdvance: true, delay: 2000 },
    { id: 'opponent-turn-end-3', text: 'Sein Zug endet. Jetzt bist du am Drücker.', autoAdvance: false },

    // Player Turn 4
    { id: 'player-turn-4-draw', text: 'Du hast "Fireburst" auf der Hand! Ein mächtiger Zauber, der direkt Schaden verursacht.', autoAdvance: false },
    { id: 'play-fireburst', text: 'Spiele Fireburst auf die gegnerische EInheit, umsie zu zerstören!', highlightSelector: '#card-in-hand-10', dropZoneSelector: '#opponent' },
    { id: 'victory', text: 'Hervorragend! Du hast die Grundlagen gemeistert.', buttonText: 'Tutorial beenden' },
];

const spiritFrames = [
    '/tutorial/spirit-1.png',
    '/tutorial/spirit-2.png',
    '/tutorial/spirit-3.png',
    '/tutorial/spirit-2.png'
];
 
const spiritBlinkFrame = '/tutorial/spirit-0.png';
const spiritSadFrame = '/tutorial/spirit-sad.png';

const SpiritGuide = ({ step, onAction, isSpeaking, textToShow, phase, showButton, isStartingTutorial, isSad }: { step: typeof tutorialSteps[0], onAction: () => void, isSpeaking: boolean, textToShow: string, phase: 'intro' | 'playing', showButton: boolean, isStartingTutorial: boolean, isSad: boolean }) => {
    const [frameIndex, setFrameIndex] = useState(0);
    const [isBlinking, setIsBlinking] = useState(false);

    // Animations-Loop for speaking
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

            {showButton && step.buttonText && (
                <div className={cn(
                    "mt-4 transition-opacity duration-500",
                    isStartingTutorial ? "opacity-0" : "opacity-100"
                )}>
                    <Button onClick={onAction} variant="tcg" className="pointer-events-auto">
                        {step.buttonText}
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
        
        if (step.text) {
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
        const fullText = step.text;

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
                    const isHandAction = ['play-aether', 'play-trap', 'play-flamebounder', 'play-relic', 'play-ashwalker', 'play-fireburst'].includes(step.id);
                    setIsTutorialStepWithHandAction(isHandAction);
                    setCurrentHighlight(step.highlightSelector);
                }
            }
        };
        
        if (!step.text) {
             if (step.autoAdvance) {
                typingTimeoutRef.current = setTimeout(() => {
                    advanceStep(index + 1);
                }, step.delay || 1500);
            } else {
                const isHandAction = ['play-aether', 'play-trap', 'play-flamebounder', 'play-relic', 'play-ashwalker', 'play-fireburst'].includes(step.id);
                setIsTutorialStepWithHandAction(isHandAction);
                setCurrentHighlight(step.highlightSelector);
            }
        } else {
            typingTimeoutRef.current = setTimeout(typeEffect, 50);
        }

    }, [currentStepIndex, finishTutorial]);

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
                 <h1 className="text-5xl font-bold title-gradient uppercase">Tutorial Abgeschlossen!</h1>
                 <p className="text-lg text-muted-foreground mt-4 max-w-2xl">{tutorialSteps.find(s => s.id === 'victory')?.text}</p>
                 {tutorialXpAward && tutorialXpAward.xpGained > 0 && (
                    <p className="text-cyan-300 font-bold mt-4">{t('xpGained', { amount: tutorialXpAward.xpGained })}</p>
                 )}
                 <Link href="/play" className="mt-8">
                     <Button variant="tcg">Zurück zur Spielauswahl</Button>
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

    

    
