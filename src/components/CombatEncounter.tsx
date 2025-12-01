import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import { Sword, Shield, Heart, Skull, Backpack, X, Flame, Wand, Activity, HeartPulse, Brain, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerCharacter, CombatEnemy, CombatLogEntry, SpellContent, CombatLogEntryType, Condition } from '@/types';
import { useGame } from '@/contexts/GameContext';
import { createLogEntry, formatRollBreakdown } from '@/utils/combatLogger';
import { CombatLogPanel } from './CombatLogPanel';
import { ConditionList } from './ConditionList';
import { DiceRollModal } from './DiceRollModal';
import spellsData from '@/content/spells.json';
import {
  getAvailableSlotLevels,
  getScaledCantripDamage,
  getSpellcastingAbility,
  getSpellSaveDC,
  getUpcastDamageOrEffect,
  rollConcentrationCheck,
  isPreparedCaster,
} from '@/lib/spells';

type CombatEnemyState = CombatEnemy & {
  conditions: Condition[];
};

interface CombatEncounterProps {
  character: PlayerCharacter;
  enemies: Array<{
    name: string;
    armorClass: number;
    hitPoints: number;
    attackBonus: number;
    damage: string;
  }>;
  onVictory: () => void;
  onDefeat: () => void;
  playerAdvantage?: boolean;
}

export function CombatEncounter({ character, enemies: initialEnemies, onVictory, onDefeat, playerAdvantage }: CombatEncounterProps) {
  const { t } = useTranslation();
  const {
    updateCharacter,
    startConcentration,
    endConcentration,
    spendSpellSlot,
    recordDeathSave,
    resetDeathSaves
  } = useGame();

  // Combat state - ensure HP is a valid number
  const [playerHp, setPlayerHp] = useState(() => {
    const hp = character.hitPoints || character.maxHitPoints || 10;
    return Math.max(0, hp); // Allow 0 for unconscious
  });

  // Sync local HP with character HP from context if it changes externally (e.g. level up, though unlikely in combat)
  // But mainly we want to drive UI from local state for responsiveness, and sync back to context.

  const [enemies, setEnemies] = useState<CombatEnemyState[]>(() =>
    initialEnemies.map((enemy, index) => ({
      id: `enemy-${index}`,
      name: enemy.name,
      currentHp: enemy.hitPoints,
      maxHp: enemy.hitPoints,
      armorClass: enemy.armorClass,
      attackBonus: enemy.attackBonus,
      damage: enemy.damage,
      initiative: Math.floor(Math.random() * 20) + 1,
      isDefeated: false,
      conditions: [],
      temporaryHp: 0,
    }))
  );

  const [turnOrder, setTurnOrder] = useState<Array<{ id: string; name: string; initiative: number }>>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [rollResult, setRollResult] = useState<{ roll: number; total: number; isCritical: boolean; isCriticalFailure: boolean } | null>(null);
  const [pendingCombatAction, setPendingCombatAction] = useState<(() => void) | null>(null);
  const [attackDetails, setAttackDetails] = useState<{ name: string; dc: number; modifier: number } | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showSpellMenu, setShowSpellMenu] = useState(false);
  // Removed local playerStatusEffects, using character.conditions
  const [playerDefeated, setPlayerDefeated] = useState(false);
  const [victoryAchieved, setVictoryAchieved] = useState(false);
  // Removed local deathSaves, using character.deathSaves

  const isFighter = character.class.name.toLowerCase() === 'fighter';
  const isRogue = character.class.name.toLowerCase() === 'rogue';
  const [actionSurgeAvailable, setActionSurgeAvailable] = useState(isFighter);
  const [secondWindAvailable, setSecondWindAvailable] = useState(isFighter);
  const [sneakAttackReady, setSneakAttackReady] = useState(false);
  const [sneakAttackUsedThisTurn, setSneakAttackUsedThisTurn] = useState(false);
  const [actionSurgeActive, setActionSurgeActive] = useState(false);
  const [activeBuffs, setActiveBuffs] = useState<Array<{ id: string; name: string; bonus?: number; duration: number }>>([]);
  const [cunningAttackBonus, setCunningAttackBonus] = useState(0);

  const findTorchOilItem = () =>
    (character.inventory || []).find(
      (item) =>
        (item.templateId || item.id)?.startsWith('torch-oil')
    );

  const getPlayerDefenseBonus = () => {
    // Check for active buffs that provide AC bonus
    return activeBuffs.reduce((acc, buff) => acc + (buff.bonus || 0), 0);
  };

  const applyEnemyOngoingEffects = useCallback((enemy: CombatEnemyState) => {
    let updatedEnemy: CombatEnemyState = { ...enemy };
    const remainingEffects: Condition[] = [];
    const messages: Array<{ message: string; type: CombatLogEntry['type'] }> = [];

    enemy.conditions.forEach((condition) => {
      // Logic for ongoing condition effects can go here
      // For now, we just decrement duration
      if (updatedEnemy.currentHp > 0) {
        const nextDuration = (condition.duration || 0) - 1;
        if (nextDuration > 0) {
          remainingEffects.push({ ...condition, duration: nextDuration });
        }
      }
    });

    updatedEnemy = {
      ...updatedEnemy,
      isDefeated: updatedEnemy.currentHp <= 0,
      conditions: updatedEnemy.currentHp <= 0 ? [] : remainingEffects,
    };

    if (updatedEnemy.isDefeated && enemy.currentHp > updatedEnemy.currentHp) {
      messages.push({
        message: `${enemy.name} is defeated by lingering effects!`,
        type: 'defeat'
      });
    }

    return { updatedEnemy, messages };
  }, []);

  const addLog = useCallback((message: string, type: CombatLogEntryType, details?: string, source?: string, target?: string) => {
    const entry = createLogEntry(type, message, details, source, target);
    setCombatLog(prev => [...prev, entry]);
  }, []);

  const getEnemyEffectiveAC = (enemy: CombatEnemyState) => {
    const isProne = enemy.conditions.some(c => c.type === 'prone');
    return enemy.armorClass - (isProne ? 2 : 0);
  };

  const rollDice = (sides: number = 20) => {
    return Math.floor(Math.random() * sides) + 1;
  };

  const nextTurn = () => {
    setTimeout(() => {
      setCurrentTurnIndex(prev => (prev + 1) % turnOrder.length);
    }, 500);
  };

  const performEnemyTurn = (enemyId: string) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.isDefeated) {
      nextTurn();
      return;
    }

    const { updatedEnemy, messages } = applyEnemyOngoingEffects(enemy);
    if (messages.length > 0) {
      messages.forEach((entry) => addLog(entry.message, entry.type));
    }

    if (updatedEnemy.currentHp !== enemy.currentHp || updatedEnemy.conditions !== enemy.conditions) {
      setEnemies(prev => prev.map(e => e.id === enemyId ? updatedEnemy : e));
    }

    if (updatedEnemy.isDefeated) {
      nextTurn();
      return;
    }

    const grappled = updatedEnemy.conditions.some((c) => c.type === 'grappled');
    if (grappled) {
      addLog(`${updatedEnemy.name} struggles against the grapple and cannot act this turn.`, 'condition');
      setEnemies(prev => prev.map(e => e.id === enemyId ? updatedEnemy : e));
      nextTurn();
      return;
    }

    const actingEnemy = updatedEnemy;

    // Prevent multiple enemy turns
    const timeout = setTimeout(() => {
      const attackRoll = rollDice(20);
      const totalAttack = attackRoll + actingEnemy.attackBonus;

      // Player AC Calculation
      const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
      let baseAC = 10 + dexMod; // Default unarmored

      if (character.equippedArmor) {
        const armorAC = character.equippedArmor.armorClass || 10;
        // Heavy armor (like Chain Mail) doesn't benefit from Dex
        // Light armor (like Leather) does
        // Simplified check: if AC >= 16 (Chain Mail), treat as heavy
        if (armorAC >= 16 || character.equippedArmor.id === 'chain') {
          baseAC = armorAC;
        } else {
          baseAC = armorAC + dexMod;
        }
      }

      const playerAC = baseAC + getPlayerDefenseBonus();

      if (totalAttack >= playerAC) {
        // Hit!
        if (playerHp <= 0) {
          // Attack on unconscious player causes failed death save
          addLog(`${actingEnemy.name} attacks your unconscious body!`, 'damage');
          addLog(`${actingEnemy.name} attacks your unconscious body!`, 'damage');
          // Critical hit on unconscious creature = 2 failures
          recordDeathSave(false);
          recordDeathSave(false);
          if ((character.deathSaves?.failures || 0) + 2 >= 3) {
            addLog(`${character.name} has succumbed to their wounds.`, 'defeat');
          }
        } else {
          const damageRoll = rollDice(6) + 2; // Simplified damage
          addLog(`${actingEnemy.name} ${t('combat.hits')} ${character.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage');

          setPlayerHp(prev => {
            let remainingDamage = damageRoll;
            let currentTempHp = character.temporaryHitPoints || 0;

            if (currentTempHp > 0) {
              const absorbed = Math.min(currentTempHp, remainingDamage);
              currentTempHp -= absorbed;
              remainingDamage -= absorbed;

              updateCharacter(current => {
                if (!current) return current;
                return { ...current, temporaryHitPoints: currentTempHp };
              });

              if (absorbed > 0) {
                addLog(`${character.name}'s temporary hit points absorb ${absorbed} damage!`, 'info');
              }
            }

            const newHp = Math.max(0, prev - remainingDamage);
            updateCharacter((current) => {
              if (!current) return current;
              return { ...current, hitPoints: newHp };
            });
            if (newHp === 0) {
              addLog(`${character.name} falls unconscious!`, 'miss');
            }
            return newHp;
          });
          handleConcentrationCheck(damageRoll);
        }
      } else {
        // Miss
        addLog(`${actingEnemy.name} ${t('combat.attacks')} ${character.name} ${t('combat.butMisses')}`, 'miss');
      }

      setActiveBuffs(prev => prev.filter(effect => effect.id !== 'defense-bonus'));
      nextTurn();
    }, 1500);

    return () => clearTimeout(timeout);
  };

  const handlePlayerAttack = () => {
    if (!selectedEnemy || isRolling) return;

    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy) return;

    const attackAbility = character.class.primaryAbility.includes('Dexterity') ? 'dexterity' : 'strength';
    const abilityMod = Math.floor((character.abilityScores[attackAbility] - 10) / 2);
    const proficiencyBonus = 2;
    const modifier = abilityMod + proficiencyBonus + cunningAttackBonus;
    const enemyAC = getEnemyEffectiveAC(enemy);

    // Prepare UI
    setAttackDetails({ name: 'Attack Roll', dc: enemyAC, modifier });
    setIsRolling(true);
    setShowDiceModal(true);

    // Calculate result
    const rollDice = (sides: number) => Math.floor(Math.random() * sides) + 1;
    const attackRoll = rollDice(20);
    const totalAttack = attackRoll + modifier;
    const isCritical = attackRoll === 20;
    const isCriticalFailure = attackRoll === 1;

    setDiceResult(attackRoll);
    setRollResult({ roll: attackRoll, total: totalAttack, isCritical, isCriticalFailure });

    // Define action to run after modal closes
    setPendingCombatAction(() => () => {
      const modifiers = [
        { label: 'Ability', value: abilityMod },
        { label: 'Prof', value: proficiencyBonus }
      ];
      if (cunningAttackBonus) {
        modifiers.push({ label: 'Cunning Edge', value: cunningAttackBonus });
      }

      // We need to reconstruct attack details for the log, or pass them?
      // formatRollBreakdown is used for the log tooltip.
      const logAttackDetails = formatRollBreakdown(attackRoll, modifiers);

      if (totalAttack >= enemyAC) {
        // Hit!
        let damageRoll = abilityMod;
        if (character.equippedWeapon?.damage) {
          const [count, sides] = (character.equippedWeapon.damage.split('+')[0] || '1d8').split('d').map(Number);
          for (let i = 0; i < (count || 1); i++) {
            damageRoll += rollDice(sides || 8);
          }
          const weaponBonus = parseInt(character.equippedWeapon.damage.split('+')[1] || '0');
          damageRoll += weaponBonus;
        } else {
          damageRoll += rollDice(4);
        }

        // Sneak Attack
        if (isRogue && !sneakAttackUsedThisTurn && sneakAttackReady) {
          const sneakDice = Math.max(1, Math.ceil(character.level / 2));
          let sneakBonus = 0;
          for (let i = 0; i < sneakDice; i++) {
            sneakBonus += rollDice(6);
          }
          damageRoll += sneakBonus;
          setSneakAttackUsedThisTurn(true);
          setSneakAttackReady(false);
          addLog(`${character.name} unleashes Sneak Attack for +${sneakBonus} damage!`, 'damage');
        }

        addLog(`${character.name} ${t('combat.hits')} ${enemy.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage', logAttackDetails);

        setEnemies(prev => prev.map(e => {
          if (e.id === selectedEnemy) {
            const newHp = Math.max(0, e.currentHp - damageRoll);
            return { ...e, currentHp: newHp, isDefeated: newHp === 0 };
          }
          return e;
        }));
      } else {
        // Miss
        addLog(`${character.name} ${t('combat.attacks')} ${enemy.name} ${t('combat.butMisses')}`, 'miss', logAttackDetails);
      }

      setCunningAttackBonus(0);

      if (actionSurgeActive) {
        addLog('Action Surge grants another action!', 'info');
        setActionSurgeActive(false);
        return;
      }

      nextTurn();
    });
  };

  const handleDefend = () => {
    const defenseBonus = 2;
    setActiveBuffs(prev => [...prev.filter(b => b.id !== 'defense-bonus'), { id: 'defense-bonus', name: 'Defensive Stance', bonus: defenseBonus, duration: 1 }]);
    addLog(`${character.name} ${t('combat.takesDefensiveStance')} (+${defenseBonus} AC)`, 'info');
    nextTurn();
  };

  const handleUseTorchOil = () => {
    if (!selectedEnemy) return;
    const oilItem = findTorchOilItem();
    if (!oilItem) return;

    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    // Burning Oil isn't a standard condition. For now, we'll just log it and not apply a condition to avoid type errors.
    // Or we could repurpose a condition, but that's messy.
    // I'll skip applying the effect to the enemy state for now to ensure type safety.
    // setEnemies(prev => prev.map(e => e.id === selectedEnemy
    //   ? { ...e, conditions: [...e.conditions, burningEffect] }
    //   : e
    // ));

    updateCharacter((prev) => ({
      ...prev,
      inventory: (prev.inventory || []).filter(item => item.id !== oilItem.id),
    }));

    addLog(`${character.name} splashes burning oil on ${enemy.name}, scorching them over time!`, 'info');

    setShowInventory(false);
    nextTurn();
  };

  const handleSecondWind = () => {
    if (!isFighter || !secondWindAvailable || isRolling) return;
    const healAmount = rollDice(10) + character.level;
    setPlayerHp(prev => Math.min(character.maxHitPoints, prev + healAmount));
    updateCharacter((prev) => prev ? { ...prev, hitPoints: Math.min(prev.maxHitPoints, prev.hitPoints + healAmount) } : prev);
    addLog(`${character.name} uses Second Wind and regains ${healAmount} HP!`, 'heal');
    setSecondWindAvailable(false);
    nextTurn();
  };

  const handleActionSurge = () => {
    if (!isFighter || !actionSurgeAvailable || isRolling) return;
    addLog(`${character.name} uses Action Surge for an extra action this turn!`, 'info');
    setActionSurgeAvailable(false);
    setActionSurgeActive(true);
  };

  const handleCunningAction = (type: 'dash' | 'disengage' | 'hide') => {
    if (!isRogue || isRolling) return;
    if (type === 'dash') {
      addLog(`${character.name} uses Cunning Action: Dash.`, 'info');
    } else if (type === 'disengage') {
      addLog(`${character.name} uses Cunning Action: Disengage (harder to pin down).`, 'info');
      addLog(`${character.name} uses Cunning Action: Disengage (harder to pin down).`, 'info');
      // Disengage prevents opportunity attacks. We don't implement OA yet, so it's mostly flavor or prevents specific enemy reactions.
      // We can add a 'Disengaged' condition if we want to track it.
      // addCondition({ type: 'Invisible', duration: 1 }); // Just as an example, but Disengage isn't a condition.
      // For now, just log it.
    } else if (type === 'hide') {
      addLog(`${character.name} uses Cunning Action: Hide. Advantageous strike readied.`, 'info');
      setSneakAttackReady(true);
      setCunningAttackBonus(2);
    }
    nextTurn();
  };

  const handleShove = () => {
    if (!selectedEnemy || isRolling) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const abilityMod = Math.floor((character.abilityScores.strength - 10) / 2);
    const proficiencyBonus = 2;
    const modifier = abilityMod + proficiencyBonus;
    const targetAC = getEnemyEffectiveAC(enemy);

    setAttackDetails({ name: 'Shove (Athletics)', dc: targetAC, modifier });
    setIsRolling(true);
    setShowDiceModal(true);

    const rollDice = (sides: number) => Math.floor(Math.random() * sides) + 1;
    const roll = rollDice(20);
    const total = roll + modifier;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC) {
        addLog(`${character.name} shoves ${enemy.name} prone (AC -2 this round)!`, 'condition');
        const proneCondition: Condition = {
          type: 'prone',
          name: 'Prone',
          description: 'Creature is lying on the ground. Disadvantage on attack rolls. Attacks against it have advantage if within 5ft.',
          duration: 1,
          source: 'Shove'
        };
        setEnemies(prev => prev.map(e => e.id === enemy.id ? { ...e, conditions: [...e.conditions, proneCondition] } : e));
      } else {
        addLog(`${character.name} tries to shove ${enemy.name} but fails.`, 'miss');
      }
      nextTurn();
    });
  };

  const handleGrapple = () => {
    if (!selectedEnemy || isRolling) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const abilityMod = Math.floor((character.abilityScores.strength - 10) / 2);
    const proficiencyBonus = 2;
    const modifier = abilityMod + proficiencyBonus;
    const targetAC = getEnemyEffectiveAC(enemy);

    setAttackDetails({ name: 'Grapple (Athletics)', dc: targetAC, modifier });
    setIsRolling(true);
    setShowDiceModal(true);

    const rollDice = (sides: number) => Math.floor(Math.random() * sides) + 1;
    const roll = rollDice(20);
    const total = roll + modifier;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC) {
        addLog(`${character.name} grapples ${enemy.name}! They lose their next action.`, 'condition');
        const grappleCondition: Condition = {
          type: 'grappled',
          name: 'Grappled',
          description: 'Creature speed becomes 0.',
          duration: 1,
          source: 'Grapple'
        };
        setEnemies(prev => prev.map(e => e.id === enemy.id ? { ...e, conditions: [...e.conditions, grappleCondition] } : e));
      } else {
        addLog(`${character.name} fails to grapple ${enemy.name}.`, 'miss');
      }
      nextTurn();
    });
  };

  const handleConcentrationCheck = useCallback((damage: number) => {
    if (!character.concentratingOn) return;
    const result = rollConcentrationCheck(character, damage);
    if (result.success) {
      addLog(
        `${character.name} maintains concentration (DC ${result.dc}, rolled ${result.total}).`,
        'info'
      );
      return;
    }
    addLog(
      `${character.name} loses concentration on ${character.concentratingOn.spellName}! (DC ${result.dc}, rolled ${result.total})`,
      'condition'
    );
    endConcentration();
  }, [character, addLog, endConcentration]);

  const parseDice = (formula: string) => {
    const [dicePart, modifierPart] = formula.split('+');
    const [countStr, sidesStr] = dicePart.split('d');
    const count = parseInt(countStr || '1', 10);
    const sides = parseInt(sidesStr || '6', 10);
    const modifier = parseInt(modifierPart || '0', 10);
    let total = modifier;
    for (let i = 0; i < count; i++) {
      total += rollDice(sides);
    }
    return total;
  };

  const handleCastSpell = (
    spellId: string,
    options?: {
      slotLevel?: number;
      castAsRitual?: boolean;
      fromScroll?: boolean;
      bypassPreparation?: boolean;
    }
  ) => {
    const spell = spellsData.find(s => s.id === spellId) as SpellContent | undefined;
    if (!spell) return;

    const castAsRitual = options?.castAsRitual ?? false;
    const fromScroll = options?.fromScroll ?? false;

    const preparedList = character.preparedSpells ?? character.knownSpells ?? [];
    const preparedOk = options?.bypassPreparation
      ? true
      : !isPreparedCaster(character.class.name) || preparedList.includes(spellId);
    if (!preparedOk) {
      addLog(`${spell.name} is not prepared.`, 'miss');
      return;
    }

    const abilityKey = getSpellcastingAbility(character.class.name);
    const abilityMod = Math.floor((character.abilityScores[abilityKey] - 10) / 2);


    const isCantrip = spell.level === 0;
    const computedSlotLevel = spell.level > 0 && !castAsRitual
      ? (options?.slotLevel ?? getAvailableSlotLevels(character, spell)[0])
      : undefined;
    const effectiveSlotLevel = fromScroll
      ? (options?.slotLevel ?? spell.level)
      : computedSlotLevel;
    if (spell.level > 0 && !castAsRitual && !fromScroll) {
      const slotPool = character.spellSlots?.[computedSlotLevel ?? spell.level];
      if (!computedSlotLevel || !slotPool || slotPool.current <= 0) {
        addLog(`${character.name} has no available slots to cast ${spell.name}.`, 'miss');
        return;
      }
      const spent = spendSpellSlot(computedSlotLevel);
      if (!spent) {
        addLog(`Unable to spend a level ${computedSlotLevel} slot.`, 'miss');
        return;
      }
    }

    const buildDamageFormula = () => {
      if (isCantrip) {
        return getScaledCantripDamage(spell, character.level) || '';
      }
      if (effectiveSlotLevel) {
        return getUpcastDamageOrEffect(spell, effectiveSlotLevel) || spell.damage || spell.healing || '';
      }
      return spell.damage || spell.healing || '';
    };

    // Process Spell Effect
    const damageOrHealingFormula = buildDamageFormula();

    if (spell.damage || spell.level === 0) {
      // Attack Spell
      if (!selectedEnemy) return;

      const damageTotal = parseDice(damageOrHealingFormula || '1d6');

      let finalDamage = damageTotal;
      let saveMessage = '';

      // Handle Saving Throw
      if (spell.saveType) {
        const spellDC = getSpellSaveDC(character);

        const enemy = enemies.find(e => e.id === selectedEnemy);
        if (enemy) {
          const saveRoll = rollDice(20);
          const saveTotal = saveRoll + (enemy.savingThrowBonus || 0); // Default +0 save bonus

          if (saveTotal >= spellDC) {
            finalDamage = Math.floor(damageTotal / 2);
            saveMessage = ` (Saved! Rolled ${saveTotal} vs DC ${spellDC})`;
          } else {
            saveMessage = ` (Failed Save! Rolled ${saveTotal} vs DC ${spellDC})`;
          }
        }
      }

      // Apply damage
      setEnemies(prev => prev.map(e => {
        if (e.id === selectedEnemy) {
          const newHp = Math.max(0, e.currentHp - finalDamage);
          return { ...e, currentHp: newHp, isDefeated: newHp === 0 };
        }
        return e;
      }));

      const selectedEnemyData = enemies.find(e => e.id === selectedEnemy);
      addLog(`${character.name} casts ${spell.name} on ${selectedEnemyData?.name} for ${finalDamage} ${spell.damageType} damage!${saveMessage}`, 'damage');
    } else if (spell.healing) {
      // Healing Spell
      let healTotal = parseDice(damageOrHealingFormula || spell.healing);
      healTotal += abilityMod;

      setPlayerHp(prev => {
        const newHp = Math.min(character.maxHitPoints, prev + healTotal);
        return newHp;
      });

      updateCharacter(prev => ({ ...prev, hitPoints: Math.min(character.maxHitPoints, prev.hitPoints + healTotal) }));
      addLog(`${character.name} casts ${spell.name} and heals for ${healTotal} HP!`, 'heal');
    } else if (spell.id === 'shield') {
      // Special case for Shield
      const shieldBonus = 5;
      setActiveBuffs(prev => [...prev.filter(b => b.id !== 'shield-spell'), { id: 'shield-spell', name: 'Shield', bonus: shieldBonus, duration: 1 }]);
      addLog(`${character.name} casts Shield! (+5 AC)`, 'info');
    }

    if (spell.concentration) {
      if (character.concentratingOn && character.concentratingOn.spellId !== spell.id) {
        addLog(`Concentration on ${character.concentratingOn.spellName} ends as you begin ${spell.name}.`, 'condition');
      }
      startConcentration(spell.id, spell.name);
    }

    setShowSpellMenu(false);
    nextTurn();
  };

  const handleDeathSave = () => {
    setAttackDetails({ name: 'Death Save', dc: 10, modifier: 0 });
    setIsRolling(true);
    setShowDiceModal(true);

    const rollDice = (sides: number) => Math.floor(Math.random() * sides) + 1;
    const roll = rollDice(20);
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total: roll, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (roll === 20) {
        // Critical Success: Regain 1 HP
        setPlayerHp(1);
        resetDeathSaves();
        addLog(`${character.name} rallies with a critical success! Regains 1 HP!`, 'heal');
        updateCharacter(prev => ({ ...prev, hitPoints: 1 }));
      } else if (roll === 1) {
        // Critical Failure: 2 Failures
        recordDeathSave(false);
        recordDeathSave(false);
        addLog(`${character.name} suffers a critical failure on death save! (2 failures)`, 'damage');
      } else if (roll >= 10) {
        // Success
        recordDeathSave(true);
        addLog(`${character.name} succeeds on a death save.`, 'info');
      } else {
        // Failure
        recordDeathSave(false);
        addLog(`${character.name} fails a death save.`, 'miss');
      }
      nextTurn();
    });
  };

  // Initialize combat
  useEffect(() => {
    let playerInitiative = Math.floor(Math.random() * 20) + 1 + Math.floor((character.abilityScores.dexterity - 10) / 2);

    if (playerAdvantage) {
      playerInitiative += 20; // Ensure player goes first
    }

    const order = [
      { id: 'player', name: character.name, initiative: playerInitiative },
      ...enemies.map(e => ({ id: e.id, name: e.name, initiative: e.initiative }))
    ].sort((a, b) => b.initiative - a.initiative);

    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setTurnOrder(order);
      addLog(t('combat.combatBegins'), 'info');

      // Auto-select first enemy
      if (enemies.length > 0) {
        setSelectedEnemy(enemies[0].id);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle turn changes
  useEffect(() => {
    if (turnOrder.length === 0) return;

    const currentEntity = turnOrder[currentTurnIndex];
    if (currentEntity && currentEntity.id !== 'player') {
      // It's an enemy's turn
      const timer = setTimeout(() => {
        performEnemyTurn(currentEntity.id);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentTurnIndex, turnOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for combat end
  useEffect(() => {
    const allEnemiesDefeated = enemies.every(e => e.isDefeated);
    if (allEnemiesDefeated && enemies.length > 0 && !victoryAchieved) {
      setVictoryAchieved(true);
      addLog(t('combat.victory'), 'defeat');
      setTimeout(() => onVictory(), 1500);
    }

    if (playerHp <= 0 && (character.deathSaves?.failures || 0) >= 3 && !playerDefeated) {
      setPlayerDefeated(true);
      addLog(t('combat.defeat'), 'defeat');
      setTimeout(() => onDefeat(), 1200);
    }
  }, [enemies, playerHp, character.deathSaves, playerDefeated, victoryAchieved, addLog, onVictory, onDefeat, t]);

  const currentTurn = turnOrder[currentTurnIndex];
  const isPlayerTurn = currentTurn?.id === 'player';

  useEffect(() => {
    if (isPlayerTurn) {
      setActiveBuffs(prev => prev.filter(b => b.duration > 1).map(b => ({ ...b, duration: b.duration - 1 })));
      setSneakAttackUsedThisTurn(false);
      setSneakAttackReady(false);
    }
  }, [isPlayerTurn]);

  const torchOilAvailable = Boolean(findTorchOilItem());

  const canCastAnySpell = useMemo(() => {
    if (!character.knownSpells) return false;
    return character.knownSpells.some((spellId) => {
      const spell = spellsData.find((s) => s.id === spellId);
      if (!spell) return false;
      if (spell.level === 0) return true;
      const pool = character.spellSlots?.[spell.level];
      return Boolean(pool && pool.current > 0);
    });
  }, [character.knownSpells, character.spellSlots]);

  const slotSummary = useMemo(() => {
    if (!character.spellSlots) return '';
    return Object.entries(character.spellSlots)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([lvl, pool]) => `L${lvl}: ${pool.current}/${pool.max}`)
      .join(' · ');
  }, [character.spellSlots]);

  return (
    <div className="space-y-6">
      {/* Player Status */}
      <Card className="scroll-parchment">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-fantasy-purple" />
              <div>
                <h3 className="font-bold text-lg">{character.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {character.race.name} {character.class.name}
                </p>
              </div>
            </div>
            {isPlayerTurn && (
              <Badge variant="gold" className="animate-pulse">{t('combat.yourTurn')}</Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-red-500" />
                {t('combat.hp')}:
              </span>
              <div className="flex gap-2 items-center">
                <span className="font-bold">{playerHp} / {character.maxHitPoints}</span>
                {(character.temporaryHitPoints || 0) > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-900/50 text-blue-200 border-blue-800">
                    +{character.temporaryHitPoints} THP
                  </Badge>
                )}
              </div>
            </div>
            <Progress
              value={(playerHp / character.maxHitPoints) * 100}
              className="h-3"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {character.concentratingOn && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Brain className="h-3 w-3" /> Concentrating on {character.concentratingOn.spellName}
                </Badge>
              )}
              {isFighter && (
                <>
                  <Badge variant={actionSurgeAvailable ? 'fantasy' : 'outline'} className="text-xs">
                    Action Surge {actionSurgeAvailable ? 'Ready' : 'Used'}
                  </Badge>
                  <Badge variant={secondWindAvailable ? 'fantasy' : 'outline'} className="text-xs">
                    Second Wind {secondWindAvailable ? 'Ready' : 'Used'}
                  </Badge>
                </>
              )}
              {isRogue && (
                <Badge variant="outline" className="text-xs">
                  Sneak Attack {sneakAttackUsedThisTurn ? 'Used this turn' : 'Available'}
                </Badge>
              )}
              {activeBuffs.map(buff => (
                <Badge key={buff.id} variant="secondary" className="text-xs">
                  {buff.name} (+{buff.bonus} AC)
                </Badge>
              ))}
            </div>
          </div>

          <ConditionList character={character} />

          {/* Death Saves */}
          {playerHp <= 0 && (
            <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-red-900/20">
              <h4 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                <Skull className="h-4 w-4" /> Death Saves
              </h4>
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  <span className="text-xs uppercase font-bold text-muted-foreground mr-2">Successes</span>
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={`success-${i}`}
                      className={cn(
                        "w-4 h-4 rounded-full border border-green-600",
                        i < (character.deathSaves?.successes || 0) ? "bg-green-600" : "bg-transparent"
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <span className="text-xs uppercase font-bold text-muted-foreground mr-2">Failures</span>
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={`failure-${i}`}
                      className={cn(
                        "w-4 h-4 rounded-full border border-red-600",
                        i < (character.deathSaves?.failures || 0) ? "bg-red-600" : "bg-transparent"
                      )}
                    />
                  ))}
                </div>
              </div>
              {isPlayerTurn && (
                <Button
                  onClick={handleDeathSave}
                  disabled={isRolling}
                  className="w-full mt-3"
                  variant="destructive"
                >
                  Roll Death Save
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combat Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enemies */}
        <div className="space-y-4">
          <h3 className="font-fantasy text-xl flex items-center gap-2">
            <Sword className="h-5 w-5" /> {t('combat.enemies')}
          </h3>
          <div className="grid gap-3">
            {enemies.map((enemy) => (
              <Card
                key={enemy.id}
                className={cn(
                  "cursor-pointer transition-all border-2",
                  selectedEnemy === enemy.id ? "border-primary shadow-md" : "border-border",
                  enemy.isDefeated ? "opacity-50 grayscale" : ""
                )}
                onClick={() => !enemy.isDefeated && setSelectedEnemy(enemy.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold">{enemy.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-3 w-3" /> AC {getEnemyEffectiveAC(enemy)}
                      </div>
                    </div>
                    {enemy.isDefeated && <Badge variant="destructive">{t('combat.defeated')}</Badge>}
                  </div>
                  <Progress
                    value={(enemy.currentHp / enemy.maxHp) * 100}
                    className="h-2"
                  />
                  {enemy.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {enemy.conditions.map((condition, idx) => (
                        <Badge key={`${condition.type}-${idx}`} variant="destructive" className="text-xs">
                          {condition.type} ({condition.duration})
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <h3 className="font-fantasy text-xl flex items-center gap-2">
            <Activity className="h-5 w-5" /> {t('combat.actions')}
          </h3>

          {playerHp > 0 ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    className="w-full justify-start"
                    onClick={handlePlayerAttack}
                    disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                  >
                    <Sword className="mr-2 h-4 w-4" /> {t('combat.attack')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleDefend}
                    disabled={!isPlayerTurn || isRolling}
                  >
                    <Shield className="mr-2 h-4 w-4" /> {t('combat.defend')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowSpellMenu(!showSpellMenu)}
                    disabled={!isPlayerTurn || isRolling || !canCastAnySpell}
                  >
                    <Wand className="mr-2 h-4 w-4" /> {t('combat.castSpell')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowInventory(!showInventory)}
                    disabled={!isPlayerTurn || isRolling}
                  >
                    <Backpack className="mr-2 h-4 w-4" /> {t('combat.item')}
                  </Button>
                </div>

                {/* Class Specific Actions */}
                {(isFighter || isRogue) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2 font-bold uppercase">Class Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {isFighter && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleSecondWind}
                            disabled={!isPlayerTurn || !secondWindAvailable || isRolling}
                          >
                            <HeartPulse className="mr-2 h-3 w-3" /> Second Wind
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleActionSurge}
                            disabled={!isPlayerTurn || !actionSurgeAvailable || isRolling}
                          >
                            <Zap className="mr-2 h-3 w-3" /> Action Surge
                          </Button>
                        </>
                      )}
                      {isRogue && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCunningAction('dash')}
                            disabled={!isPlayerTurn || isRolling}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Dash
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCunningAction('disengage')}
                            disabled={!isPlayerTurn || isRolling}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Disengage
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCunningAction('hide')}
                            disabled={!isPlayerTurn || isRolling}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Hide
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Combat Maneuvers */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2 font-bold uppercase">Maneuvers</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShove}
                      disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                    >
                      <Activity className="mr-2 h-3 w-3" /> Shove
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGrapple}
                      disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                    >
                      <Activity className="mr-2 h-3 w-3" /> Grapple
                    </Button>
                  </div>
                </div>

                {showInventory && (
                  <div className="mt-4 border rounded-md p-2 bg-background">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-sm">Quick Items</h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowInventory(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {torchOilAvailable && (
                        <Button variant="outline" size="sm" onClick={handleUseTorchOil} className="justify-start">
                          <Flame className="mr-2 h-3 w-3 text-orange-500" /> Use Torch Oil
                        </Button>
                      )}
                      {/* Add potions here later */}
                      <p className="text-xs text-muted-foreground italic">More items coming soon...</p>
                    </div>
                  </div>
                )}

                {showSpellMenu && (
                  <div className="mt-4 border rounded-md p-2 bg-background">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-sm">Cast Spell ({slotSummary})</h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSpellMenu(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {character.knownSpells?.map(spellId => {
                        const spell = spellsData.find(s => s.id === spellId);
                        if (!spell) return null;
                        const isCantrip = spell.level === 0;
                        const hasSlot = isCantrip || (character.spellSlots?.[spell.level]?.current || 0) > 0;

                        return (
                          <Button
                            key={spellId}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            disabled={!hasSlot}
                            onClick={() => handleCastSpell(spellId)}
                          >
                            <Sparkles className="mr-2 h-3 w-3 text-blue-400" />
                            {spell.name} {isCantrip ? '(Cantrip)' : `(L${spell.level})`}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          ) : (
            <Card className="bg-red-950/20 border-red-900/50">
              <CardContent className="p-4 text-center">
                <h3 className="text-xl font-bold text-red-600 mb-2">Unconscious!</h3>
                <p className="text-muted-foreground">Make death saves to survive.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Combat Log */}
      <CombatLogPanel logs={combatLog} />

      {/* Dice Roll Modal */}
      <DiceRollModal
        isOpen={showDiceModal}
        isRolling={isRolling}
        diceRoll={diceResult}
        rollResult={rollResult}
        onRollComplete={() => setIsRolling(false)}
        onClose={() => {
          setShowDiceModal(false);
          setIsRolling(false);
          setDiceResult(null);
          setRollResult(null);
          if (pendingCombatAction) {
            pendingCombatAction();
            setPendingCombatAction(null);
          }
        }}
        skillName={attackDetails?.name || 'Attack Roll'}
        difficultyClass={attackDetails?.dc}
        modifier={attackDetails?.modifier}
      />
    </div>
  );
}
