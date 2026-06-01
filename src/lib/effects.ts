
import { produce } from 'immer';
import { MASTER_DB } from './cards';
import { playSound } from './audio';
import type { GameState, PlayerId, GameCard, CardData, GameLog, GameLogEntry, DamageIndicatorInfo, InspectedCard, Rarity } from './types';


export const showDamageIndicator = (draft: GameState, targetId: string, amount: number, isTutorial?: boolean, onTutorialAction?: (action: string, card?: GameCard) => void) => {
    if (amount < 0) {
        playSound('damage');
        if (isTutorial && onTutorialAction && targetId === 'player') {
            onTutorialAction('PLAYER_DAMAGED');
        }
    }
    const newIndicator: DamageIndicatorInfo = {
        id: Math.random(),
        targetId,
        amount,
    };
    draft.damageIndicators.push(newIndicator);
};

export const addLogAndToast = (draft: GameState, message: (string | {type: 'card', cardId: number, content: string} | {type: 'player', playerId: PlayerId})[], type: GameLog['type'] = 'info', player?: PlayerId) => {
    const logMessage: GameLogEntry[] = message.map(m => {
        if (typeof m === 'string') return { type: 'text', content: m };
        return m;
    });
    
    const lastEntry = draft.log[draft.log.length - 1];
    const newId = (lastEntry ? lastEntry.id : 0) + 1;
    
    const newEntry: GameLog = { id: newId, message: logMessage, type, player };
    
    // Use assignment instead of push to avoid extensibility issues on frozen arrays
    draft.log = [...draft.log, newEntry];

    // For the active player, we also show a message in their avatar bubble if it's an error
    if (type === 'error' && player) {
        playSound('negative');
        draft.players[player].currentMessage = logMessage.map(m => m.type === 'text' ? m.content : '').join('');
    }
}

const triggerFluxAdept = (draft: GameState, playerId: PlayerId) => {
    const player = draft.players[playerId];
    const hasFluxAdept = player.unitZone.some(u => u?.id === 34);
    if (hasFluxAdept && !player.usedFluxAdeptThisTurn) {
        if (player.deck.length > 0) {
            const newCard = player.deck.pop();
            if (newCard) player.hand.push(newCard);
            addLogAndToast(draft, [{type: 'card', cardId: 34, content: 'Flux Adept'}, ` lässt dich eine Karte ziehen.`], 'effect', playerId);
            player.usedFluxAdeptThisTurn = true;
        }
    }
}

export const gainAether = (draft: GameState, playerId: PlayerId, amount: number, fromEffect: boolean = false) => {
    const player = draft.players[playerId];
    player.aether.current += amount;

    // Check for Aether Core
    const opponentId = playerId === 'player' ? 'opponent' : 'player';
    const opponent = draft.players[opponentId];
    if (opponent.aetherZone.some(a => a?.id === 86)) {
        addLogAndToast(draft, [{type: 'card', cardId: 86, content: 'Aether Core'}, ` fügt dem Gegner 1 Schaden zu.`], 'effect', opponentId);
        applyDamageToPlayer(draft, 1, playerId, undefined, undefined, opponentId);
    }

    if (fromEffect) {
        triggerFluxAdept(draft, playerId);
    }
};

export const getCost = (draft: GameState, card: GameCard, cardOwner: PlayerId): number => {
    // Aether cards ALWAYS cost 0
    if (card.type === 'Aether') return 0;
    
    if (card.id === 14 && draft.isTutorial) return 2;

    let cost = card.cost;
    const player = draft.players[cardOwner];
    const opponentId = cardOwner === 'player' ? 'opponent' : 'player';
    const opponent = draft.players[opponentId];
    
    if (card.type === 'Unit' && player.unitZone.some(u => u?.attachedRelic?.id === 79)) {
        cost = Math.max(0, cost - 1);
    }

    if (card.type === 'Spell') {
        // Opponent's effects that increase my spell cost
        if (opponent.unitZone.some(u => u?.id === 36)) { // Aether Guardian
            cost += 1;
        }
        if (opponent.unitZone.some(u => u?.attachedRelic?.id === 32) && !opponent.declaredAttacksThisTurn) { // Pearl of Stillness on opponent
            cost += 1;
        }
        if (opponent.aetherZone.some(a => a?.id === 84) && !opponent.declaredAttacksThisTurn) { // Disruptive Aether on opponent
             cost += 1;
        }

        // My effects that reduce my spell cost
        if (player.unitZone.some(u => u?.id === 40)) { // Aether Dragon
            cost = Math.max(1, cost - 1);
        }
        if (player.nextSpellCostReduction > 0) {
            cost = Math.max(0, cost - player.nextSpellCostReduction);
        }
    }
    return cost;
};

export const getUnitCost = (unit: GameCard): number => {
    return unit.cost + (unit.tempCostModifier || 0);
}


export const applyDamageToPlayer = (draft: GameState, damage: number, playerId: PlayerId, isTutorial?: boolean, onTutorialAction?: (action: string, card?: GameCard) => void, dealerId?: PlayerId) => {
    const player = draft.players[playerId];
    let finalDamage = damage;
    
    const dealerPlayerId = dealerId || (playerId === 'player' ? 'opponent' : 'player');
    const dealer = draft.players[dealerPlayerId];

    if (dealer.nextDamageEffectBonus > 0) {
        finalDamage += dealer.nextDamageEffectBonus;
        addLogAndToast(draft, [`Overheat verstärkt den Schaden um ${dealer.nextDamageEffectBonus}.`], 'effect', dealerPlayerId);
        dealer.nextDamageEffectBonus = 0;
    }

    if (player.unitZone.some(u => u?.id === 19)) { // Deepsea Guardian
        finalDamage = Math.max(0, finalDamage - 1);
        if (finalDamage < damage) {
            addLogAndToast(draft, [{type: 'card', cardId: 19, content: 'Deepsea Guardian'}, ` reduziert den Schaden.`], 'effect', playerId);
        }
    }
    
    player.hp -= finalDamage;
    showDamageIndicator(draft, playerId, -finalDamage, isTutorial, onTutorialAction);
    return finalDamage;
}


export const applyHealToPlayer = (draft: GameState, amount: number, playerId: PlayerId) => {
    const player = draft.players[playerId];
    player.hp = Math.min(20, player.hp + amount);
    showDamageIndicator(draft, playerId, amount);

    player.unitZone.forEach(unit => {
        if (unit && unit.id === 54) { // Golem
            unit.atk = (unit.atk || 0) + 1;
            unit.currentAtk = (unit.currentAtk || 0) + 1;
            addLogAndToast(draft, [{type: 'card', cardId: 54, content: 'Golem'}, ` wird durch die Heilung stärker.`], 'effect', playerId);
        }
    });

    const hasThornCrown = player.unitZone.some(u => u?.attachedRelic?.id === 64);
    if (hasThornCrown) {
        const unitsWithSpaceForFokus = player.unitZone.filter(u => u && u.fokus !== undefined && u.currentFokus < u.fokus);
        if (unitsWithSpaceForFokus.length > 0) {
            const randomIndex = Math.floor(Math.random() * unitsWithSpaceForFokus.length);
            const randomUnit = unitsWithSpaceForFokus[randomIndex];
            if (randomUnit) {
                randomUnit.currentFokus += 1;
                addLogAndToast(draft, [{type: 'card', cardId: 64, content: 'Thorn Crown'}, ` gibt `, {type: 'card', cardId: randomUnit.id, content: randomUnit.name}, ` 1 Fokus.`], 'effect', playerId);
            }
        }
    }
};

export const moveUnitToGraveyard = (draft: GameState, playerId: PlayerId, position: number) => {
    const unit = draft.players[playerId].unitZone[position];
    if (unit) {
        addLogAndToast(draft, [ {type: 'card', cardId: unit.id, content: unit.name}, ` wurde zerstört.`], 'effect', playerId);

        draft.players[playerId].graveyard.push(unit);
        draft.players[playerId].unitZone[position] = null;

        // Aurex passive check
        for (const pId of ['player', 'opponent'] as PlayerId[]) {
            const playerWithAurex = draft.players[pId];
            playerWithAurex.unitZone.forEach(u => {
                if (u && u.id === 41) { // Aurex
                    u.currentFokus = Math.min(u.fokus || 0, u.currentFokus + 1);
                    addLogAndToast(draft, [{type:'card', cardId: 41, content: 'Aurex'}, ` erhält 1 Fokus durch den Tod von `, {type:'card', cardId: unit.id, content: unit.name}, `.`] , 'effect', pId);
                }
            });
        }

        // Re-evaluate auras when a unit leaves the board
        const wardenCount = draft.players[playerId].unitZone.filter(u => u?.id === 53).length;
        if (unit.id === 53) { // If the unit that died was a warden, recalculate for all
            addLogAndToast(draft, [`Verdant Wardens Effekt endet.`], 'effect', playerId);
            draft.players[playerId].unitZone.forEach(otherUnit => {
                if (otherUnit) {
                    const hpBonus = wardenCount + 1; // +1 because we are in the middle of removing one
                    const newMaxHp = (otherUnit.hp || 0) - hpBonus + wardenCount;
                    if (otherUnit.currentHp) {
                        otherUnit.currentHp = Math.min(otherUnit.currentHp, newMaxHp);
                    }
                    otherUnit.hp = newMaxHp;

                    if (otherUnit.currentHp <= 0) {
                        otherUnit.effect = 'destroy';
                    }
                }
            });
        }
        
        // "On Death" effects
        switch (unit.id) {
            case 3: { // Ashwalker
                const opponentId = unit.owner === 'player' ? 'opponent' : 'player';
                const isOwnerHuman = draft.isPvp || unit.owner === 'player';

                if (isOwnerHuman) {
                    draft.combatState.isTargeting = {
                        sourceCard: unit,
                        abilityId: 'ON_DEATH_DAMAGE'
                    };
                    addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name},`'s letzter Wille... Wähle ein Ziel für 1 Schaden.`], 'effect', playerId);
                } else {
                    const validUnitTargets = draft.players[opponentId].unitZone
                        .map((u, i) => ({ unit: u, pos: i }))
                        .filter(t => t.unit !== null);

                    if (validUnitTargets.length > 0 && Math.random() < 0.5) {
                        const randomTarget = validUnitTargets[Math.floor(Math.random() * validUnitTargets.length)];
                        addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: 'Ashwalker'},` fügt `, {type:'card', cardId: randomTarget.unit!.id, content: randomTarget.unit!.name}, ` 1 Schaden zu.` ], 'effect', unit.owner);
                        applyDamageToUnit(draft, 1, opponentId, randomTarget.pos, unit.owner);
                    } else {
                         addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: 'Ashwalker'},` fügt dem gegnerischen Spieler 1 Schaden zu.` ], 'effect', unit.owner);
                        applyDamageToPlayer(draft, 1, opponentId, undefined, undefined, unit.owner);
                    }
                }
                break;
            }
             case 8: { // Kael
                addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, ` wird in 1 Zug wiederbelebt...`], 'effect', playerId);
                draft.players[playerId].reviveQueue.push({ card: unit, turns: 1 });
                break;
            }
        }
        
        // Check for traps that trigger on death
        for (const pId of ['player', 'opponent'] as PlayerId[]) {
            const playerWithTrap = draft.players[pId];
            playerWithTrap.trapZone.forEach(trap => {
                if (trap && (trap.id === 15 || trap.id === 63)) { // Backdraft or Natural Retaliation
                    if (unit.owner === pId) { // If it's the trap owner's unit that died
                         const isOwnerHuman = draft.isPvp || trap.owner === 'player';
                         if (isOwnerHuman) {
                             draft.pendingResponse = {
                                card: trap,
                                triggerSource: { unit },
                                type: 'TRAP'
                            };
                        } else {
                            if (Math.random() < 0.8) {
                                applyTrapEffect(draft, trap, { unit });
                            }
                        }
                    }
                }
            });
        }
    }
};

export const applyDamageToUnit = (draft: GameState, damage: number, targetPlayerId: PlayerId, targetPosition: number, dealerId?: PlayerId, isTutorial?: boolean, onTutorialAction?: (action: string, card?: GameCard) => void, attacker?: { card: GameCard }) => {
    const targetUnit = draft.players[targetPlayerId].unitZone[targetPosition];
    if (targetUnit && targetUnit.currentHp !== undefined) {
        let finalDamage = damage;
        const dealerPlayerId = dealerId || (targetPlayerId === 'player' ? 'opponent' : 'player');
        const dealer = draft.players[dealerPlayerId];
        
        if (dealer.nextDamageEffectBonus > 0) {
            finalDamage += dealer.nextDamageEffectBonus;
            addLogAndToast(draft, [`Overheat verstärkt den Schaden um ${dealer.nextDamageEffectBonus}.`], 'effect', dealerPlayerId);
            dealer.nextDamageEffectBonus = 0;
        }

        if (targetUnit.id === 55) { // Behemoth
            finalDamage = Math.max(0, finalDamage - 1);
            if (finalDamage < damage) {
                addLogAndToast(draft, [{type: 'card', cardId: 55, content: 'Behemoth'}, ` reduziert den erlittenen Schaden.`], 'effect', targetPlayerId);
            }
        }
        
        if (targetUnit.isInvulnerable) {
            addLogAndToast(draft, [{type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` ist unverwundbar und erleidet keinen Schaden.`], 'effect', targetPlayerId);
            return;
        }

        targetUnit.currentHp -= finalDamage;
        showDamageIndicator(draft, targetUnit.instanceId, -finalDamage, isTutorial, onTutorialAction);
        
        if (targetUnit.id === 9 && targetUnit.currentHp > 0) { // Barbarossa
            targetUnit.atk = (targetUnit.atk || 0) + 1;
            targetUnit.currentAtk = (targetUnit.currentAtk || 0) + 1;
            addLogAndToast(draft, [{type: 'card', cardId: targetUnit.id, content: targetUnit.name}, `'s Wut steigert seinen Angriff.`], 'effect', targetPlayerId);
        }

        const attackerCard = attacker?.card;
        if (attackerCard?.id === 69) { // Chainblade Adept
            const isAttackerHuman = draft.isPvp || attackerCard.owner === 'player';
            const opponentId = targetPlayerId;

            if (isAttackerHuman) {
                draft.combatState.isTargeting = {
                    sourceCard: attackerCard,
                    abilityId: 'CHAINBLADE_ADEPT_DAMAGE'
                };
                addLogAndToast(draft, [{type: 'card', cardId: 69, content: 'Chainblade Adept'}, `'s Effekt wurde ausgelöst. Wähle ein Ziel für 1 Schaden.`], 'info', attackerCard.owner);
            } else { // AI Logic
                const validUnitTargets = draft.players[opponentId].unitZone
                    .map((u, i) => ({ unit: u, pos: i }))
                    .filter(t => t.unit !== null && t.unit.instanceId !== targetUnit.instanceId);
                
                if (validUnitTargets.length > 0 && Math.random() < 0.5) {
                    const randomTarget = validUnitTargets[Math.floor(Math.random() * validUnitTargets.length)];
                    addLogAndToast(draft, [{type: 'card', cardId: 69, content: 'Chainblade Adept'},` fügt `, {type:'card', cardId: randomTarget.unit!.id, content: randomTarget.unit!.name}, ` 1 Schaden zu.` ], 'effect', attackerCard.owner);
                    applyDamageToUnit(draft, 1, opponentId, randomTarget.pos, attackerCard.owner);
                } else {
                     addLogAndToast(draft, [{type: 'card', cardId: 69, content: 'Chainblade Adept'},` fügt dem gegnerischen Spieler 1 Schaden zu.` ], 'effect', attackerCard.owner);
                    applyDamageToPlayer(draft, 1, opponentId, undefined, undefined, attackerCard.owner);
                }
            }
        }

        if (targetUnit.currentHp <= 0) {
            targetUnit.effect = 'destroy';
        } else {
            targetUnit.effect = 'damage';
        }
    }
};

export const applyPermanentAttackDebuff = (draft: GameState, amount: number, targetPlayerId: PlayerId, targetPosition: number) => {
    const targetUnit = draft.players[targetPlayerId].unitZone[targetPosition];
    if (targetUnit) {
        targetUnit.permanentAtkModifier = (targetUnit.permanentAtkModifier || 0) - amount;
        targetUnit.currentAtk = Math.max(0, (targetUnit.currentAtk || 0) - amount);
    }
};

export const applyFokusAbility = (draft: GameState, sourceCard: InspectedCard, target: {playerId: PlayerId, position?: number}) => {
    if (!sourceCard.owner || sourceCard.position === undefined) return;
    
    const owner = draft.players[sourceCard.owner];
    const unit = owner.unitZone[sourceCard.position];
    if (!unit) return;

    if (unit.usedFokusThisTurn) {
        addLogAndToast(draft, [`Diese Einheit hat ihre Fokus-Fähigkeit diesen Zug bereits genutzt.`], 'error', sourceCard.owner);
        return;
    }

    addLogAndToast(draft, [{type: 'player', playerId: owner.id}, `'s `, {type: 'card', cardId: unit.id, content: unit.name}, ` aktiviert seine Fähigkeit.`] , 'effect', owner.id);

    switch (sourceCard.id) {
        case 5: { // Tinkerer (prev. Cinder Pyromancer)
            const cost = 1;
            if (unit.currentFokus < cost) {
                addLogAndToast(draft, [`Nicht genug Fokus auf `, {type: 'card', cardId: unit.id, content: unit.name}, `.` ], 'error', sourceCard.owner);
                return;
            }
            if (target.position === undefined || target.playerId === sourceCard.owner) {
                addLogAndToast(draft, ['Ungültiges Ziel für Tinkerer.'], 'error', sourceCard.owner);
                return;
            }
            const damage = 2;
            unit.currentFokus -= cost;
            unit.usedFokusThisTurn = true;
            const targetUnit = draft.players[target.playerId].unitZone[target.position];
            addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, ` fügt `, {type: 'card', cardId: targetUnit!.id, content: targetUnit!.name}, ` ${damage} Schaden zu.`], 'effect', sourceCard.owner);
            applyDamageToUnit(draft, damage, target.playerId, target.position, sourceCard.owner);
            break;
        }
        case 17: { // Ice Nomad
            const cost = 2;
            if (unit.currentFokus < cost) {
                addLogAndToast(draft, [`Nicht genug Fokus auf `, {type: 'card', cardId: unit.id, content: unit.name}, `.` ], 'error', sourceCard.owner);
                return;
            }
            unit.currentFokus -= cost;
            unit.usedFokusThisTurn = true;
            unit.currentAtk = (unit.currentAtk || 0) + 1;
            unit.tempAttackBonus = (unit.tempAttackBonus || 0) + 1;
            addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, ` erhält +1 Angriff für diese Runde.`], 'effect', sourceCard.owner);
            break;
        }
        case 24: { // Water Elementar
            if (target.position !== undefined) {
                const targetUnit = draft.players[target.playerId].unitZone[target.position];
                if (targetUnit) {
                    targetUnit.atk = Math.max(0, (targetUnit.atk || 0) - 1);
                    targetUnit.currentAtk = Math.max(0, (targetUnit.currentAtk || 0) - 1);
                    addLogAndToast(draft, [{type: 'card', cardId: unit.id, content: unit.name}, ` reduziert den Angriff von `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` permanent.`] , 'effect', unit.owner);
                }
            }
            break;
        }
        case 35: { // Aether Channeler
            const cost = 1;
            if (unit.currentFokus < cost) {
                addLogAndToast(draft, [`Nicht genug Fokus auf `, {type: 'card', cardId: unit.id, content: unit.name}, `.` ], 'error', sourceCard.owner);
                return;
            }
             draft.pendingChoice = {
                card: unit,
                abilityId: 'FOKUS_ABILITY',
                options: [
                    { id: 'gain_aether', text: 'Erhalte 1 Aether', description: 'Füge deinem Vorrat 1 Aether hinzu.' },
                    { id: 'reduce_cost', text: 'Zauberkosten reduzieren', description: 'Der nächste Zauber in diesem Zug kostet 1 weniger.' },
                ]
             };
            break;
        }
        case 41: { // Aurex
            const cost = 1;
            if (unit.currentFokus < cost) {
                addLogAndToast(draft, [`Nicht genug Fokus auf `, {type: 'card', cardId: unit.id, content: unit.name}, `.` ], 'error', sourceCard.owner);
                return;
            }

            const canUseUltimate = unit.currentFokus >= 4;
            const ultimateOption = { id: 'ultimate', text: 'Ultimate: Zerstöre alle Einheiten ≤3 Kosten', description: 'Du verlierst 1 HP pro zerstörter Einheit. Kosten: 4 Fokus.' };
            
            draft.pendingChoice = {
                card: unit,
                abilityId: 'FOKUS_ABILITY',
                options: [
                    { id: 'debuff_atk', text: 'Einheit schwächen', description: 'Eine Einheit erhält -2 ATK. Kosten: 1 Fokus.' },
                    { id: 'summon_shadow', text: 'Schatten beschwören', description: 'Beschwöre einen 1/1 Schatten. Kosten: 1 Fokus.' },
                ]
            };
            if(canUseUltimate) draft.pendingChoice.options.push(ultimateOption);
            break;
        }
    }
};

export const applyOnPlayEffect = (draft: GameState, card: GameCard, position: number, isTutorial?: boolean, onTutorialAction?: (action: string, card?: GameCard) => void) => {
    const owner = draft.players[card.owner];
    const opponentId = card.owner === 'player' ? 'opponent' : 'player';
    const opponent = draft.players[opponentId];

    if (card.type === 'Unit' && card.owner !== opponentId) {
        const opponentTrapIndex = opponent.trapZone.findIndex(t => t?.id === 31); // Frozen Lock
        if (opponentTrapIndex !== -1) {
            const trap = opponent.trapZone[opponentTrapIndex]!;
            const isOpponentHuman = draft.isPvp || opponentId === 'player';
            if (isOpponentHuman) {
                draft.pendingResponse = {
                    card: trap,
                    triggerSource: { unit: card },
                    type: 'TRAP'
                };
            } else if (Math.random() < 0.8) {
                applyTrapEffect(draft, trap, { unit: card });
            }
        }
    }


    if (card.type === 'Unit') {
      const wardenCount = owner.unitZone.filter(u => u?.id === 53).length;
      if (wardenCount > 0) {
        const newUnit = owner.unitZone[position];
        if (newUnit) {
          newUnit.hp = (newUnit.hp || 0) + wardenCount;
          newUnit.currentHp = (newUnit.currentHp || 0) + wardenCount;
          addLogAndToast(draft, [`Verdant Warden(s) geben `, { type: 'card', cardId: newUnit.id, content: newUnit.name }, ` +${wardenCount} HP.`], 'effect', card.owner);
        }
      }
      
      if(owner.aetherZone.some(c => c?.id === 81)) { // Bound Aether
          const newUnit = owner.unitZone[position];
          if (newUnit) {
              newUnit.currentFokus += 1;
              addLogAndToast(draft, [{type: 'card', cardId: 81, content: 'Bound Aether'}, ` gibt `, {type: 'card', cardId: newUnit.id, content: newUnit.name}, ` +1 Fokus.`], 'effect', owner.id);
          }
      }
    }
    
    if (card.type === 'Aether' && owner.unitZone.some(u => u && u.id === 39)) {
        applyHealToPlayer(draft, 1, card.owner);
        addLogAndToast(draft, [`Kai heilt dich um 1 HP.`], 'effect', card.owner);
    }
    
    switch (card.id) {
        case 1: { // Inferno Drake
            const damage = 2;
            addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` fügt allen gegnerischen Einheiten ${damage} Schaden zu.`], 'effect', owner.id);
            opponent.unitZone.forEach((_, pos) => {
                applyDamageToUnit(draft, damage, opponentId, pos, owner.id, isTutorial, onTutorialAction);
            });
            break;
        }
        case 7: { // Soburin
            addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` zerstört alle gegnerischen Fallenkarten.`], 'effect', owner.id);
            opponent.trapZone.forEach((trapCard, index) => {
                if (trapCard) {
                    opponent.graveyard.push(trapCard);
                    opponent.trapZone[index] = null;
                }
            });
            break;
        }
        case 20: { // Frostveil Siren
            const hasValidTargets = opponent.unitZone.some(u => u !== null);
            if (hasValidTargets) {
                const isOwnerHuman = draft.isPvp || card.owner === 'player';
                if (isOwnerHuman) {
                    addLogAndToast(draft, [`Wähle eine gegnerische Einheit, die eingefroren werden soll.`], 'info', owner.id);
                    draft.combatState.isTargeting = {
                        sourceCard: card,
                        abilityId: 'ON_PLAY_FREEZE'
                    };
                } else { // AI logic
                    const validTargets = opponent.unitZone
                        .map((unit, index) => ({ unit, index }))
                        .filter(item => item.unit !== null);
                    
                    if (validTargets.length > 0) {
                        let target = validTargets.reduce((prev, current) => 
                            ((prev.unit?.currentAtk || 0) > (current.unit?.currentAtk || 0)) ? prev : current
                        );
                        const targetUnit = draft.players[opponentId].unitZone[target.index];
                        if (targetUnit) {
                            targetUnit.isFrozen = true;
                            addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` friert `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` ein.` ], 'effect', card.owner);
                        }
                    }
                }
            } else {
                addLogAndToast(draft, [`Keine Ziele für `, {type: 'card', cardId: card.id, content: card.name}, `'s Effekt.`] , 'info', owner.id);
            }
            break;
        }
        case 33: { // Aether Initiate
            addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` gewährt 1 Aether.`], 'effect', owner.id);
            gainAether(draft, owner.id, 1, true);
            break;
        }
        case 38: { // Sileth
            const validTargets = opponent.unitZone
                .map((u, i) => ({ unit: u, pos: i }))
                .filter(item => item.unit && getUnitCost(item.unit) <= 3);

            if (validTargets.length > 0) {
                 const isOwnerHuman = draft.isPvp || card.owner === 'player';
                 if (isOwnerHuman) {
                    addLogAndToast(draft, [`Wähle eine gegnerische Einheit mit Kosten 3 oder weniger, die verbannt werden soll.`], 'info', owner.id);
                    draft.combatState.isTargeting = {
                        sourceCard: card,
                        abilityId: 'ON_PLAY_BANISH'
                    };
                } else { // AI logic
                    let target = validTargets.reduce((prev, current) => 
                        ((prev.unit?.currentAtk || 0) > (current.unit?.currentAtk || 0)) ? prev : current
                    );
                    const targetUnit = draft.players[opponentId].unitZone[target.pos];
                    if (targetUnit) {
                        addLogAndToast(draft, [{ type: 'card', cardId: card.id, content: card.name }, ` verbannt `, { type: 'card', cardId: targetUnit.id, content: targetUnit.name }, `.`] , 'effect', card.owner);
                        moveUnitToGraveyard(draft, opponentId, target.pos);
                    }
                }
            } else {
                addLogAndToast(draft, [`Keine gültigen Ziele für `, { type: 'card', cardId: card.id, content: card.name }, `'s Effekt.`], 'info', owner.id);
            }
            break;
        }
        case 50: { // Seedling Swarm
            const plantTokenData = MASTER_DB.find(c => c.id === 999);
            if(plantTokenData) {
                const emptyUnitSlot = owner.unitZone.findIndex(u => u === null);
                if (emptyUnitSlot !== -1) {
                    const token: GameCard = {
                        ...plantTokenData,
                        instanceId: `token-plant-${Math.random()}`,
                        owner: card.owner,
                        currentHp: 1,
                        currentAtk: 1,
                        isExhausted: true,
                        currentFokus: 0,
                        usedFokusThisTurn: false,
                        position: emptyUnitSlot,
                    };
                    owner.unitZone[emptyUnitSlot] = token;
                    addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` beschwört einen 1/1 Parasit.`], 'effect', card.owner);
                } else {
                    addLogAndToast(draft, [`Kein Platz für einen Parasit.`], 'info', card.owner);
                }
            }
            break;
        }
        case 52: { // Lifebloom Druid
            applyHealToPlayer(draft, 2, card.owner);
            addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` heilt seinen Besitzer um 2 HP.`], 'effect', card.owner);
            break;
        }
        case 70: { // Arc Striker
            const damage = 2;
            const isOwnerHuman = draft.isPvp || card.owner === 'player';
            if (isOwnerHuman) {
                draft.combatState.isTargeting = {
                    sourceCard: card,
                    abilityId: 'ON_PLAY_DAMAGE_TARGET'
                };
                addLogAndToast(draft, [`Wähle ein Ziel für `, {type:'card', cardId: card.id, content: card.name},`'s Effekt.`], 'info', owner.id);
            } else { // AI logic
                const validUnitTargets = opponent.unitZone
                    .map((u, i) => ({ unit: u, pos: i }))
                    .filter(item => item.unit !== null);

                if (validUnitTargets.length > 0) {
                    let target = validUnitTargets.find(t => t.unit!.currentHp! <= damage);
                    if (!target) {
                        target = validUnitTargets.reduce((prev, current) => 
                            ((prev.unit?.currentAtk || 0) > (current.unit?.currentAtk || 0)) ? prev : current
                        );
                    }
                    addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` fügt `, {type: 'card', cardId: target.unit!.id, content: target.unit!.name}, ` ${damage} Schaden zu.`], 'effect', card.owner);
                    applyDamageToUnit(draft, damage, opponentId, target.pos, card.owner, isTutorial, onTutorialAction);
                } else {
                    addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` fügt dem gegnerischen Spieler ${damage} Schaden zu.`], 'effect', card.owner);
                    applyDamageToPlayer(draft, damage, opponentId, isTutorial, onTutorialAction, card.owner);
                }
            }
            break;
        }
    }
    
    if (card.id === 53) { // Verdant Warden
      addLogAndToast(draft, [`Verdant Warden gibt deinen anderen Einheiten +1 HP.`], 'effect', owner.id);
      owner.unitZone.forEach(unit => {
        if (unit && unit.instanceId !== card.instanceId) {
          unit.hp = (unit.hp || 0) + 1;
          unit.currentHp = (unit.currentHp || 0) + 1;
        }
      });
    }
    

    if (card.type === 'Relic') {
        const owner = draft.players[card.owner];
        const targetUnit = owner.unitZone.find(u => u?.attachedRelic?.instanceId === card.instanceId);
        if (targetUnit && card.id === 16) { // Flaming Crown
             addLogAndToast(draft, [{type: 'card', cardId: card.id, content: card.name}, ` wurde an `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` angelegt.`] , 'effect', card.owner);
        }
    }
};

export const applyTrapEffect = (draft: GameState, trapCard: GameCard, triggerSource: any) => {
    const player = draft.players[trapCard.owner];
    const trapIndex = player.trapZone.findIndex(c => c?.instanceId === trapCard.instanceId);

    if (trapIndex === -1) {
        return;
    }

    const isOwnerHuman = draft.isPvp || trapCard.owner === 'player';

    if (trapCard.id === 30) { // Sudden Undertow
        if (!isOwnerHuman) { // AI logic
            const attackingUnits = draft.combatState.attacks
                .filter(a => a.attacker.playerId === (trapCard.owner === 'player' ? 'opponent' : 'player'))
                .map(a => ({ unit: a.attacker.card, position: a.attacker.position }));
            
            if (attackingUnits.length > 0) {
                const strongestAttacker = attackingUnits.reduce((strongest, current) => 
                    (current.unit.currentAtk || 0) > (strongest.unit.currentAtk || 0) ? current : strongest
                );
                triggerSource = { playerId: strongestAttacker.unit.owner, position: strongestAttacker.position };
            } else {
                return; // No target
            }
        } else { // Human targeting
            addLogAndToast(draft, [`Wähle eine angreifende Einheit für `, {type:'card', cardId: trapCard.id, content: trapCard.name}, `.`] , 'info', trapCard.owner);
            draft.combatState.isTargeting = {
                sourceCard: trapCard,
                abilityId: 'TRAP_SUDDEN_UNDERTOW'
            };
            return;
        }
    }
    
    const [playedCard] = player.trapZone.splice(trapIndex, 1, null);
    if (!playedCard) return;

    playSound('spell');
    addLogAndToast(draft, [{type: 'player', playerId: player.id}, `'s Falle "`, {type: 'card', cardId: playedCard.id, content: playedCard.name}, `" wurde ausgelöst!`], 'effect', trapCard.owner);
    
    if (playedCard.previewVideoUrl) {
        draft.fullscreenCardAnimation = { ...playedCard, instanceId: `trap-anim-${playedCard.id}` };
    }
    
    switch(playedCard.id) {
        case 14: { // Flamethrower
             if ('position' in triggerSource) {
                const attacker = draft.players[triggerSource.playerId].unitZone[triggerSource.position];
                
                const attackIndex = draft.combatState.attacks.findIndex(a => a.attacker.playerId === triggerSource.playerId && a.attacker.position === triggerSource.position);
                if (attackIndex > -1) {
                    const removedAttack = draft.combatState.attacks.splice(attackIndex, 1)[0];
                    addLogAndToast(draft, [`Der Angriff von `, {type: 'card', cardId: removedAttack.attacker.card.id, content: removedAttack.attacker.card.name}, ` wurde gestoppt.`], 'effect', trapCard.owner);
                }

                if (attacker) {
                    const damage = 3;
                    addLogAndToast(draft, [{type: 'card', cardId: playedCard.id, content: playedCard.name}, ` fügt `, {type: 'card', cardId: attacker.id, content: attacker.name}, ` ${damage} Schaden zu.`], 'effect', trapCard.owner);
                    applyDamageToUnit(draft, damage, triggerSource.playerId, triggerSource.position, trapCard.owner);
                }
            }
            break;
        }
        case 15: { // Backdraft
            if ('unit' in triggerSource) {
                const damage = 2;
                const opponentId = trapCard.owner === 'player' ? 'opponent' : 'player';
                addLogAndToast(draft, [{type: 'card', cardId: playedCard.id, content: playedCard.name}, ` fügt allen gegnerischen Einheiten ${damage} Schaden zu.`], 'effect', trapCard.owner);
                draft.players[opponentId].unitZone.forEach((_, pos) => {
                    applyDamageToUnit(draft, damage, opponentId, pos, trapCard.owner);
                });
            }
            break;
        }
        case 31: { // Frozen Lock
            if ('unit' in triggerSource) {
                const targetUnit = draft.players[triggerSource.unit.owner].unitZone[triggerSource.unit.position!];
                if (targetUnit) {
                    targetUnit.isFrozen = true;
                    addLogAndToast(draft, [{type: 'card', cardId: playedCard.id, content: playedCard.name}, ` friert die neue Einheit `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` ein.` ], 'effect', trapCard.owner);
                }
            }
            break;
        }
        case 47: { // Temporal Chamber
            if ('position' in triggerSource) {
                const attacker = draft.players[triggerSource.playerId].unitZone[triggerSource.position];
                
                const attackIndex = draft.combatState.attacks.findIndex(a => a.attacker.playerId === triggerSource.playerId && a.attacker.position === triggerSource.position);
                if (attackIndex > -1) {
                    const removedAttack = draft.combatState.attacks.splice(attackIndex, 1)[0];
                    addLogAndToast(draft, [`Der Angriff von `, {type: 'card', cardId: removedAttack.attacker.card.id, content: removedAttack.attacker.card.name}, ` wurde gestoppt.`], 'effect', trapCard.owner);
                }

                if (attacker) {
                    attacker.isFrozen = true;
                    addLogAndToast(draft, [{type: 'card', cardId: playedCard.id, content: playedCard.name}, ` lässt `, {type: 'card', cardId: attacker.id, content: attacker.name}, ` den nächsten Zug überspringen.`], 'effect', trapCard.owner);
                }
            }
            break;
        }
        case 48: { // Echo of Aether
            if ('spell' in triggerSource) {
                const originalSpell = triggerSource.spell;
                const copiedSpell: GameCard = { ...originalSpell, owner: trapCard.owner, instanceId: `copy-${originalSpell.instanceId}`};
                
                const needsTarget = [10, 26, 28, 59, 60, 72, 75].includes(copiedSpell.id);
                if (needsTarget) {
                    draft.combatState.isTargeting = {
                        sourceCard: copiedSpell,
                        abilityId: 'COPIED_SPELL'
                    };
                    addLogAndToast(draft, [`Wähle ein Ziel für den kopierten Zauber `, {type: 'card', cardId: copiedSpell.id, content: copiedSpell.name}, `.`] , 'info', trapCard.owner);
                } else {
                    applySpellEffect(draft, copiedSpell, {});
                }
            }
            break;
        }
        case 62: { // Thorn Snare
            if ('position' in triggerSource) {
                const attacker = draft.players[triggerSource.playerId].unitZone[triggerSource.position];
                
                const attackIndex = draft.combatState.attacks.findIndex(a => a.attacker.playerId === triggerSource.playerId && a.attacker.position === triggerSource.position);
                if (attackIndex > -1) {
                    const removedAttack = draft.combatState.attacks.splice(attackIndex, 1)[0];
                    addLogAndToast(draft, [`Der Angriff von `, {type: 'card', cardId: removedAttack.attacker.card.id, content: removedAttack.attacker.card.name}, ` wurde gestoppt.`], 'effect', trapCard.owner);
                }

                if (attacker) {
                    const damage = 2;
                    addLogAndToast(draft, [{type: 'card', cardId: playedCard.id, content: playedCard.name}, ` fügt `, {type: 'card', cardId: attacker.id, content: attacker.name}, ` ${damage} Schaden zu.`], 'effect', trapCard.owner);
                    applyDamageToUnit(draft, damage, triggerSource.playerId, triggerSource.position, trapCard.owner);
                }
            }
            break;
        }
        case 63: { // Natural Retaliation
             if ('unit' in triggerSource) {
                const opponentId = trapCard.owner === 'player' ? 'opponent' : 'player';
                const opponentUnits = draft.players[opponentId].unitZone.filter(u => u !== null);
                if (opponentUnits.length > 0) {
                    draft.combatState.isTargeting = {
                        sourceCard: playedCard,
                        abilityId: 'TRAP_DAMAGE'
                    };
                    addLogAndToast(draft, [`Wähle ein Ziel für `, {type: 'card', cardId: playedCard.id, content: playedCard.name},`'s Vergeltung.`], 'info', trapCard.owner);
                }
            }
            break;
        }
        case 77: { // Static Trap
            if ('spell' in triggerSource) {
                addLogAndToast(draft, [`Falle "`, {type: 'card', cardId: playedCard.id, content: playedCard.name}, `" wurde durch `, {type: 'card', cardId: triggerSource.spell.id, content: triggerSource.spell.name}, ` ausgelöst!`], 'effect', trapCard.owner);
                const damage = 2;
                const opponentId = trapCard.owner === 'player' ? 'opponent' : 'player';
                applyDamageToPlayer(draft, damage, opponentId, undefined, undefined, trapCard.owner);
                addLogAndToast(draft, [{type: 'card', cardId: playedCard.id, content: playedCard.name}, ` fügt dem Gegner ${damage} Schaden zu.`], 'effect', trapCard.owner);
            }
            break;
        }
         case 78: { // Sandstorm
            if ('damage' in triggerSource) {
                const preventedDamage = triggerSource.damage;
                addLogAndToast(draft, [{type: 'card', cardId: playedCard.id, content: playedCard.name}, ` verhindert ${preventedDamage} Schaden.`], 'effect', trapCard.owner);
                const attackIndex = draft.combatState.attacks.findIndex(a => a.target?.type === 'player' && a.target.playerId === triggerSource.playerId);
                if (attackIndex !== -1) {
                    draft.combatState.attacks.splice(attackIndex, 1);
                }
            }
            break;
        }
    }
    
    player.graveyard.push(playedCard);
    playSound('selection');
};

export const applySpellEffect = (draft: GameState, spell: GameCard, target: any) => {
    const owner = draft.players[spell.owner];
    const opponentId = spell.owner === 'player' ? 'opponent' : 'player';
    const opponent = draft.players[opponentId];

    // Handle counterspells
    if (target.spell && spell.id === 27) { // Counterflow
        addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` neutralisiert `, {type: 'card', cardId: target.spell.id, content: target.spell.name}, `.`] , 'effect', spell.owner);
        return;
    }

    switch(spell.id) {
        case 10: // Fireburst
        case 72: // Lightning Bolt
            {
                const damage = spell.id === 10 ? 3 : 2;
                if (target.type === 'unit') {
                    applyDamageToUnit(draft, damage, target.playerId, target.position, spell.owner);
                    const targetUnit = draft.players[target.playerId].unitZone[target.position];
                    if (targetUnit) {
                         addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` fügt `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` ${damage} Schaden zu.`] , 'effect', spell.owner);
                    }
                } else if (target.type === 'player') {
                    applyDamageToPlayer(draft, damage, target.playerId, undefined, undefined, spell.owner);
                    addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` fügt dem gegnerischen Spieler ${damage} Schaden zu.`] , 'effect', spell.owner);
                }
            }
            break;
        case 11: // Overheat
            owner.nextDamageEffectBonus += 2;
            addLogAndToast(draft, [`Der nächste Schadenseffekt wird um 2 verstärkt.`], 'effect', spell.owner);
            break;
        case 12: // Scorching Wave
            {
                const damage = 2;
                addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` fügt allen Einheiten ${damage} Schaden zu.`] , 'effect', spell.owner);
                for (const pId of ['player', 'opponent'] as PlayerId[]) {
                    draft.players[pId].unitZone.forEach((_, pos) => applyDamageToUnit(draft, damage, pId, pos, spell.owner));
                }
            }
            break;
        case 13: // Last Spark
            {
                let damage = 4;
                if(opponent.hp <= 5) damage = 6;
                applyDamageToPlayer(draft, damage, opponentId, undefined, undefined, spell.owner);
                addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` fügt dem gegnerischen Spieler ${damage} Schaden zu.`] , 'effect', spell.owner);
            }
            break;
        case 26: // Freeze Current
            if (target.type === 'unit') {
                const targetUnit = draft.players[target.playerId].unitZone[target.position];
                if (targetUnit) {
                    targetUnit.isFrozen = true;
                    addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` friert `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` ein.` ], 'effect', spell.owner);
                }
            }
            break;
        case 28: // Tidal Recall
             if (target.type === 'unit') {
                const unitToBounce = draft.players[target.playerId].unitZone[target.position];
                if (unitToBounce) {
                    draft.players[target.playerId].unitZone[target.position] = null;
                    draft.players[target.playerId].hand.push(unitToBounce);
                    addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` schickt `, {type: 'card', cardId: unitToBounce.id, content: unitToBounce.name}, ` zurück auf die Hand.`] , 'effect', spell.owner);
                }
            }
            break;
        case 29: // Calm the Depths
        case 58: // Regrowth
            {
                const healAmount = spell.id === 29 ? 4 : 3;
                applyHealToPlayer(draft, healAmount, spell.owner);
                addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` heilt dich um ${healAmount} HP.`] , 'effect', spell.owner);
                if (owner.deck.length > 0) {
                    const newCard = owner.deck.pop()!;
                    owner.hand.push(newCard);
                    addLogAndToast(draft, [`Du ziehst eine Karte.`] , 'info', spell.owner);
                }
            }
            break;
        case 42: // Aether Shift
            draft.multiTargetState = {
                sourceCard: spell,
                abilityId: 'AETHER_SHIFT',
                maxTargets: 2,
                minTargets: 2,
                selectedTargets: [],
            };
            addLogAndToast(draft, [`Wähle zwei Einheiten, um ihre Kosten zu tauschen.`] , 'info', spell.owner);
            break;
        case 43: // Fifth Portal
            gainAether(draft, spell.owner, 2, true);
            addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` gewährt 2 Aether.`] , 'effect', spell.owner);
            break;
        case 44: // Aether Breath
            addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` zerstört alle Einheiten mit Relikten.`] , 'effect', spell.owner);
            for (const pId of ['player', 'opponent'] as PlayerId[]) {
                draft.players[pId].unitZone.forEach((u, i) => {
                    if (u?.attachedRelic) {
                        moveUnitToGraveyard(draft, pId, i);
                    }
                });
            }
            break;
        case 45: // Rewrite Fate
            addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` setzt das Spielfeld zurück.`] , 'effect', spell.owner);
            for (const pId of ['player', 'opponent'] as PlayerId[]) {
                draft.players[pId].unitZone.forEach(u => {
                    if (u) {
                        u.currentAtk = u.atk;
                        u.currentHp = u.hp;
                        u.currentFokus = u.fokus || 0;
                        u.isFrozen = false;
                        u.isEntangled = false;
                        u.isInvulnerable = false;
                        u.permanentAtkModifier = 0;
                        u.tempAttackBonus = 0;
                        u.attachedRelic = undefined;
                    }
                });
            }
            break;
        case 46: // Aether Drain
            owner.aether.current = opponent.aether.current;
            addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` setzt dein Aether auf ${opponent.aether.current}.`], 'effect', spell.owner);
            break;
        case 59: // Entangling Roots
            if (target.type === 'unit') {
                const targetUnit = draft.players[target.playerId].unitZone[target.position];
                if (targetUnit) {
                    targetUnit.isEntangled = true;
                    addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` fesselt `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, `.`] , 'effect', spell.owner);
                }
            }
            break;
        case 60: // Verdant Surge
             if (target.type === 'unit') {
                const targetUnit = draft.players[target.playerId].unitZone[target.position];
                if (targetUnit) {
                    targetUnit.currentAtk = (targetUnit.currentAtk || 0) + 2;
                    targetUnit.tempAttackBonus = (targetUnit.tempAttackBonus || 0) + 2;
                    targetUnit.currentHp = (targetUnit.currentHp || 0) + 2;
                    addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` stärkt `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, ` um +2/+2.`] , 'effect', spell.owner);
                }
            }
            break;
        case 61: // Nature's Balance
             addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` setzt den Angriff aller Einheiten auf 3.`] , 'effect', spell.owner);
             for (const pId of ['player', 'opponent'] as PlayerId[]) {
                draft.players[pId].unitZone.forEach(u => {
                    if (u) {
                        u.currentAtk = 3;
                    }
                });
            }
            break;
        case 73: // Air Temple
            owner.nextUnitHasHaste = true;
            addLogAndToast(draft, [`Die nächste Einheit hat Eile.`], 'effect', spell.owner);
            break;
        case 74: // Chain Lightning
             draft.multiTargetState = {
                sourceCard: spell,
                abilityId: 'CHAIN_LIGHTNING',
                maxTargets: 3,
                minTargets: 1,
                selectedTargets: [],
            };
            addLogAndToast(draft, [`Wähle bis zu 3 Ziele für Kettenblitz.`] , 'info', spell.owner);
            break;
        case 75: // Protective Wind
             if (target.type === 'unit') {
                const targetUnit = draft.players[target.playerId].unitZone[target.position];
                if (targetUnit) {
                    targetUnit.isInvulnerable = true;
                    addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` schützt `, {type: 'card', cardId: targetUnit.id, content: targetUnit.name}, `.`] , 'effect', spell.owner);
                }
            }
            break;
        case 76: // Airstrike
            {
                const damage = 2;
                addLogAndToast(draft, [{type: 'card', cardId: spell.id, content: spell.name}, ` fügt allen gegnerischen Einheiten ${damage} Schaden zu.`] , 'effect', spell.owner);
                opponent.unitZone.forEach((_, pos) => applyDamageToUnit(draft, damage, opponentId, pos, spell.owner));
            }
            break;
    }
};

export const completeCardPlay = (draft: GameState, cardInstanceId: string, ownerId: PlayerId, target: any) => {
    if (!draft) return false;
    
    const player = draft.players[ownerId];
    
    const cardIndexInHand = player.hand.findIndex(c => c.instanceId === cardInstanceId);
    
    if (cardIndexInHand === -1) {
        console.error("Card to play not found in hand:", cardInstanceId);
        return false;
    }
    
    const cardDataFromHand = player.hand[cardIndexInHand];

    const cardCost = getCost(draft, cardDataFromHand, cardDataFromHand.owner);
    
    player.hand.splice(cardIndexInHand, 1);
    let success = false;
    player.aether.current -= cardCost;

    if (cardDataFromHand.type === 'Unit' && target.type === 'zone' && target.zone === 'Unit' && (player.unitZone[target.position] == null || player.unitZone[target.position]?.id === 999)) {
        const targetSlot = player.unitZone[target.position];
        if (targetSlot == null || targetSlot?.id === 999) {
            const wasParasite = targetSlot?.id === 999;

            const isExhausted = cardDataFromHand.id !== 65 && !player.nextUnitHasHaste;
            const newUnit: GameCard = { ...cardDataFromHand, isExhausted, position: target.position, effect: 'summon' };

            if (wasParasite) {
                addLogAndToast(draft, [`Parasit wird von `, {type: 'card', cardId: cardDataFromHand.id, content: cardDataFromHand.name}, ` absorbiert und verleiht +1/+1.`], 'effect', ownerId);
                newUnit.atk = (newUnit.atk || 0) + 1;
                newUnit.hp = (newUnit.hp || 0) + 1;
                newUnit.currentAtk = (newUnit.currentAtk || 0) + 1;
                newUnit.currentHp = (newUnit.currentHp || 0) + 1;
                // Move the sacrificed Parasite token to the graveyard
                player.graveyard.push(targetSlot);
            }

            player.unitZone[target.position] = newUnit;
            if (player.nextUnitHasHaste) {
                player.nextUnitHasHaste = false;
            }
            applyOnPlayEffect(draft, newUnit, target.position);
            success = true;
        }
    } else if (cardDataFromHand.type === 'Aether' && target.type === 'zone' && target.zone === 'Aether' && player.aetherZone[target.position] == null) {
        const newAetherCard = { ...cardDataFromHand, position: target.position };
        player.aetherZone[target.position] = newAetherCard;
        let aetherGained = 1;
        if (cardDataFromHand.id === 82 && player.unitZone.every(u => u === null)) aetherGained = 2; // Aether Potion
        if (cardDataFromHand.id === 85 && player.aetherZone.filter(c => c !== null).length >= 4) aetherGained = 2; // Ascended Aether
        
        player.aether.max = Math.min(10, player.aether.max + aetherGained);
        player.aether.current = Math.min(player.aether.max, player.aether.current + aetherGained);
        
        player.playedAetherThisTurn = true;
        success = true;
        applyOnPlayEffect(draft, newAetherCard, target.position);
    } else if (cardDataFromHand.type === 'Trap' && target.type === 'zone' && target.zone === 'Trap' && player.trapZone[target.position] == null) {
        player.trapZone[target.position] = { ...cardDataFromHand, position: target.position };
        success = true;
    } else if (cardDataFromHand.type === 'Relic' && target.type === 'unit' && player.unitZone[target.position]) {
        const targetUnit = player.unitZone[target.position];
        if (targetUnit && !targetUnit.attachedRelic) {
            targetUnit.attachedRelic = cardDataFromHand;
            success = true;
            applyOnPlayEffect(draft, cardDataFromHand, target.position);
        } else {
            addLogAndToast(draft, [`Diese Einheit hat bereits ein Relikt.`], 'error', ownerId);
        }
    } else if (cardDataFromHand.type === 'Spell') {
        applySpellEffect(draft, cardDataFromHand, target);
        if (cardDataFromHand.id !== 27) { // Don't discard Counterflow
            player.graveyard.push(cardDataFromHand);
        }
        success = true;
    }

    if (success) {
        if (cardDataFromHand.type === 'Aether') {
          playSound('aether');
        } else if (cardDataFromHand.type !== 'Spell' && cardDataFromHand.type !== 'Trap') {
          playSound('cards');
        }
        if (cardDataFromHand.type === 'Trap') {
          addLogAndToast(draft, [{type: 'player', playerId: ownerId}, ` legt eine verdeckte Karte.`], 'info', ownerId);
        } else if (cardDataFromHand.id !== 50) {
          addLogAndToast(draft, [{type: 'player', playerId: ownerId}, ` spielt `, {type: 'card', cardId: cardDataFromHand.id, content: cardDataFromHand.name}, `.`], 'info', ownerId);
        }
    } else {
        if (!player.hand.some(c => c.instanceId === cardDataFromHand.instanceId)) {
            player.hand.push(cardDataFromHand);
        }
        player.aether.current += cardCost;
    }

    return success;
};
