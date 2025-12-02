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
import { canAct, getCombatAdvantage } from '@/utils/combatUtils';

import { createLogEntry } from '@/utils/combatLogger';
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
  const [sneakAttackUsedThisTurn, setSneakAttackUsedThisTurn] = useState(false);
  const [activeBuffs, setActiveBuffs] = useState<Array<{ id: string; name: string; bonus?: number; duration: number }>>([]);
  const [relentlessEnduranceUsed, setRelentlessEnduranceUsed] = useState(false);

  // Barbarian Rage State
  const isBarbarian = character.class.name.toLowerCase() === 'barbarian';
  const [rageAvailable, setRageAvailable] = useState(isBarbarian ? 2 : 0); // 2 Rages per long rest at level 1
  const [rageActive, setRageActive] = useState(false);
  const [rageRoundsLeft, setRageRoundsLeft] = useState(0);

  // Bardic Inspiration State
  const isBard = character.class.name.toLowerCase() === 'bard';
  const charismaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
  const [inspirationAvailable, setInspirationAvailable] = useState(isBard ? Math.max(1, charismaMod) : 0);
  const [hasInspirationDie, setHasInspirationDie] = useState(false);
  const [useInspiration, setUseInspiration] = useState(false);

  // Paladin Lay on Hands State
  const isPaladin = character.class.name.toLowerCase() === 'paladin';
  const [layOnHandsPool, setLayOnHandsPool] = useState(isPaladin ? character.level * 5 : 0);

  // Monk Ki State
  const isMonk = character.class.name.toLowerCase() === 'monk';
  const [kiPoints, setKiPoints] = useState(isMonk ? character.level : 0);

  // Druid Wild Shape State
  const isDruid = character.class.name.toLowerCase() === 'druid';
  const [wildShapeAvailable, setWildShapeAvailable] = useState(isDruid ? 2 : 0);
  const [wildShapeActive, setWildShapeActive] = useState(false);
  const [wildShapeHp, setWildShapeHp] = useState(0);
  const WOLF_STATS = { name: 'Wolf', maxHp: 11, ac: 13, speed: 40, str: 12, dex: 15, con: 12 };

  // Sorcerer Metamagic State
  const isSorcerer = character.class.name.toLowerCase() === 'sorcerer';
  const [sorceryPoints, setSorceryPoints] = useState(isSorcerer ? character.level : 0);
  const [empoweredSpellUsed, setEmpoweredSpellUsed] = useState(false);

  // Cleric Channel Divinity State
  const isCleric = character.class.name.toLowerCase() === 'cleric';
  const [channelDivinityUses, setChannelDivinityUses] = useState(isCleric ? 1 : 0); // 1 use at level 2+ usually, simplified to 1 for now

  // Ranger State
  const isRanger = character.class.name.toLowerCase() === 'ranger';
  const [favoredEnemyActive, setFavoredEnemyActive] = useState(false);

  // Wizard State
  const isWizard = character.class.name.toLowerCase() === 'wizard';
  const [arcaneRecoveryUsed, setArcaneRecoveryUsed] = useState(false);

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

    if (!canAct(actingEnemy)) {
      addLog(`${actingEnemy.name} is incapacitated and cannot act!`, 'condition');
      nextTurn();
      return;
    }

    // Prevent multiple enemy turns
    const timeout = setTimeout(() => {
      // Determine Advantage/Disadvantage
      const rollType = getCombatAdvantage(actingEnemy, character, 'melee');

      const rollDice = (sides: number) => Math.floor(Math.random() * sides) + 1;
      let attackRoll = rollDice(20);

      if (rollType === 'advantage') {
        attackRoll = Math.max(attackRoll, rollDice(20));
        addLog(`${actingEnemy.name} attacks with advantage!`, 'info');
      } else if (rollType === 'disadvantage') {
        attackRoll = Math.min(attackRoll, rollDice(20));
        addLog(`${actingEnemy.name} attacks with disadvantage.`, 'info');
      }

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

      // Wild Shape AC
      const effectiveAC = wildShapeActive ? WOLF_STATS.ac : playerAC;

      if (totalAttack >= effectiveAC) {
        // Hit!
        if (playerHp <= 0 && !wildShapeActive) {
          // Attack on unconscious player causes failed death save
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

            // Apply Resistances
            const traits = character.race?.traits || [];
            const ancestry = character.draconicAncestry;

            // TODO: Get actual damage type from enemy attack
            const incomingDamageType: string = 'slashing';

            let resisted = false;
            if (incomingDamageType === 'fire' && traits.includes('Hellish Resistance')) resisted = true;
            if (incomingDamageType === 'poison' && traits.includes('Dwarven Resilience')) resisted = true;
            if (ancestry && incomingDamageType.toLowerCase() === ancestry.damageType.toLowerCase()) resisted = true;

            // Barbarian Rage Resistance
            if (rageActive && ['bludgeoning', 'piercing', 'slashing'].includes(incomingDamageType)) {
              resisted = true;
              addLog('Rage reduces the damage!', 'info');
            }

            if (resisted) {
              remainingDamage = Math.floor(remainingDamage / 2);
              addLog(`Resisted ${incomingDamageType} damage!`, 'info');
            }

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

            let newHp = Math.max(0, prev - remainingDamage);



            if (wildShapeActive) {
              // Apply damage to Wild Shape HP first
              let excessDamage = 0;
              setWildShapeHp(prevWsHp => {
                const newWsHp = prevWsHp - remainingDamage;
                if (newWsHp <= 0) {
                  excessDamage = Math.abs(newWsHp);
                  setWildShapeActive(false);
                  addLog(`${character.name} reverts to normal form!`, 'info');
                  return 0;
                }
                return newWsHp;
              });

              if (excessDamage > 0) {
                addLog(`Excess damage (${excessDamage}) carries over to normal form!`, 'damage');
                return Math.max(0, prev - excessDamage);
              }
              return prev; // No change to player HP if Wild Shape absorbed it all
            }

            if (newHp === 0) {
              if ((character.race?.traits || []).includes('Relentless Endurance') && !relentlessEnduranceUsed) {
                newHp = 1;
                setRelentlessEnduranceUsed(true);
                addLog(`${character.name} uses Relentless Endurance to stay at 1 HP!`, 'heal');
              } else {
                addLog(`${character.name} falls unconscious!`, 'miss');
              }
            }

            updateCharacter((current) => {
              if (!current) return current;
              return { ...current, hitPoints: newHp };
            });

            return newHp;
          });
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


  const handlePlayerAttack = () => {
    if (!selectedEnemy || isRolling) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    if (!canAct(character)) {
      addLog(`${character.name} cannot act!`, 'miss');
      return;
    }

    const isRanged = character.equippedWeapon?.properties?.includes('ranged') || false;
    const rollType = getCombatAdvantage(character, enemy, isRanged ? 'ranged' : 'melee');

    const abilityMod = Math.floor((character.abilityScores.strength - 10) / 2); // Default Strength
    // Finesse check
    const isFinesse = character.equippedWeapon?.properties?.includes('finesse');
    const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);

    const isMonk = character.class.name.toLowerCase() === 'monk';
    const isSimpleWeapon = character.equippedWeapon?.type.includes('Simple');
    const useDex = isFinesse || isRanged || (isMonk && (isSimpleWeapon || !character.equippedWeapon));
    const isUsingStrength = !useDex;

    let attackModifier = (useDex ? dexMod : abilityMod) + character.proficiencyBonus;
    let damageDice = character.equippedWeapon?.damage || '1d4';
    let damageBonus = useDex ? dexMod : abilityMod;

    // Monk Martial Arts scaling
    if (isMonk && !character.equippedWeapon) {
      if (character.level >= 17) damageDice = '1d10';
      else if (character.level >= 11) damageDice = '1d8';
      else if (character.level >= 5) damageDice = '1d6';
      else damageDice = '1d4';
    }

    if (wildShapeActive) {
      attackModifier = 4; // Wolf
      damageDice = '2d4';
      damageBonus = 2;
    }

    const targetAC = getEnemyEffectiveAC(enemy);

    setAttackDetails({ name: 'Attack', dc: targetAC, modifier: attackModifier });
    setIsRolling(true);
    setShowDiceModal(true);

    const r1 = rollDice(20);
    const r2 = rollDice(20);
    let roll = r1;
    if (rollType === 'advantage') roll = Math.max(r1, r2);
    if (rollType === 'disadvantage') roll = Math.min(r1, r2);

    // Bardic Inspiration Application
    let inspirationRoll = 0;
    if (useInspiration && hasInspirationDie) {
      inspirationRoll = rollDice(6);
      addLog(`${character.name} uses Bardic Inspiration! (+${inspirationRoll})`, 'info');
      setHasInspirationDie(false);
      setUseInspiration(false);
    }

    const total = roll + attackModifier + inspirationRoll;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC || isCritical) {
        let damageRoll = parseDice(damageDice) + damageBonus;

        if (rageActive && !isRanged && isUsingStrength) {
          damageRoll += 2;
          addLog('Rage Damage Bonus! (+2)', 'info');
        }
        if (isCritical) {
          damageRoll += parseDice(damageDice); // Crit adds extra dice

          // Half-Orc Savage Attacks
          if ((character.race?.traits || []).includes('Savage Attacks')) {
            damageRoll += parseDice(damageDice);
            addLog('Savage Attacks! Extra critical damage added.', 'info');
          }

          addLog('Critical Hit!', 'info');
        }

        // Sneak Attack
        if (isRogue && !sneakAttackUsedThisTurn && (rollType === 'advantage' || (enemy.conditions.some(c => c.type === 'prone') && !rollType /* disadvantage cancels */))) {
          const sneakDice = Math.ceil(character.level / 2);
          const sneakDamage = rollDice(6) * sneakDice;
          damageRoll += sneakDamage;
          addLog(`Sneak Attack! (+${sneakDamage} damage)`, 'info');
          setSneakAttackUsedThisTurn(true);
        }

        // Ranger Favored Enemy
        if (favoredEnemyActive) {
          damageRoll += 2;
          addLog('Favored Enemy Bonus! (+2 damage)', 'info');
        }

        // Warlock Hex Damage (Weapon Attacks)
        if (enemy.conditions.some(c => c.type === 'hexed')) {
          const hexDamage = rollDice(6);
          damageRoll += hexDamage;
          addLog(`Hex! (+${hexDamage} necrotic damage)`, 'info');
        }

        addLog(`${character.name} hits ${enemy.name} for ${damageRoll} damage!`, 'damage');

        setEnemies(prev => prev.map(e => {
          if (e.id === enemy.id) {
            const newHp = Math.max(0, e.currentHp - damageRoll);
            return { ...e, currentHp: newHp, isDefeated: newHp === 0 };
          }
          return e;
        }));
      } else {
        addLog(`${character.name} misses ${enemy.name}.`, 'miss');
      }
      nextTurn();
    });
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

      // Metamagic: Empowered Spell
      if (empoweredSpellUsed) {
        const bonus = rollDice(6);
        finalDamage += bonus;
        setEmpoweredSpellUsed(false);
        addLog(`Empowered Spell! Added ${bonus} damage.`, 'info');
      }

      // Warlock: Agonizing Blast
      if (spell.id === 'eldritch-blast' && character.class.name.toLowerCase() === 'warlock' && character.level >= 2) {
        const charismaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
        finalDamage += charismaMod;
        addLog(`Agonizing Blast! (+${charismaMod} damage)`, 'info');
      }

      // Warlock: Hex Damage (Spells)
      const targetEnemy = enemies.find(e => e.id === selectedEnemy);
      if (targetEnemy && targetEnemy.conditions.some(c => c.type === 'hexed') && (spell.damage || spell.level === 0)) {
        const hexDamage = rollDice(6);
        finalDamage += hexDamage;
        addLog(`Hex! (+${hexDamage} necrotic damage)`, 'info');
      }

      let saveMessage = '';

      // Handle Saving Throw
      if (spell.saveType) {
        const spellDC = getSpellSaveDC(character);
        const enemy = enemies.find(e => e.id === selectedEnemy);
        if (enemy) {
          const saveRoll = rollDice(20);
          const saveTotal = saveRoll + (enemy.savingThrowBonus || 0);
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

      setPlayerHp(prev => Math.min(character.maxHitPoints, prev + healTotal));
      updateCharacter(prev => ({ ...prev, hitPoints: Math.min(character.maxHitPoints, prev.hitPoints + healTotal) }));
      addLog(`${character.name} casts ${spell.name} and heals for ${healTotal} HP!`, 'heal');

    } else if (spell.id === 'shield') {
      const shieldBonus = 5;
      setActiveBuffs(prev => [...prev.filter(b => b.id !== 'shield-spell'), { id: 'shield-spell', name: 'Shield', bonus: shieldBonus, duration: 1 }]);
      addLog(`${character.name} casts Shield! (+5 AC)`, 'info');

    } else if (spell.id === 'hex') {
      if (!selectedEnemy) return;
      const hexCondition: Condition = {
        type: 'hexed',
        name: 'Hexed',
        description: 'Takes extra 1d6 necrotic damage from attacks.',
        duration: 10,
        source: 'Hex'
      };
      setEnemies(prev => prev.map(e => e.id === selectedEnemy ? { ...e, conditions: [...e.conditions, hexCondition] } : e));
      addLog(`${character.name} curses ${enemies.find(e => e.id === selectedEnemy)?.name} with Hex!`, 'condition');
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

    // Ranger Natural Explorer (Initiative Bonus)
    if (isRanger) {
      playerInitiative += 5; // Simplified advantage/bonus
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

      // Manage Rage Duration
      if (rageActive) {
        setRageRoundsLeft(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setRageActive(false);
            addLog('Your rage ends.', 'info');
            return 0;
          }
          return next;
        });
      }
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

  const handleDefend = () => {
    setActiveBuffs(prev => [...prev, { id: 'defense-bonus', name: 'Dodge', bonus: 2, duration: 1 }]);
    addLog(`${character.name} takes the Dodge action (+2 AC).`, 'info');
    nextTurn();
  };

  const handleSecondWind = () => {
    if (!secondWindAvailable) return;
    const healRoll = rollDice(10);
    const totalHeal = healRoll + character.level;
    setPlayerHp(prev => Math.min(character.maxHitPoints, prev + totalHeal));
    setSecondWindAvailable(false);
    addLog(`${character.name} uses Second Wind and regains ${totalHeal} HP.`, 'heal');
  };

  const handleActionSurge = () => {
    if (!actionSurgeAvailable) return;
    setActionSurgeAvailable(false);
    addLog(`${character.name} uses Action Surge! You gain an additional action this turn.`, 'info');
    // In this simple turn system, we might just not call nextTurn() after the next action?
    // Or we explicitly allow another action. For now, just logging it.
  };

  const handleRage = () => {
    if (!rageAvailable || rageActive) return;
    setRageAvailable(prev => prev - 1);
    setRageActive(true);
    setRageRoundsLeft(10); // 1 minute
    addLog(`${character.name} enters a Rage!`, 'info');
    // Visual effect could be added here
  };

  const handleBardicInspiration = () => {
    if (!inspirationAvailable || hasInspirationDie) return;
    setInspirationAvailable(prev => prev - 1);
    setHasInspirationDie(true);
    addLog(`${character.name} uses Bardic Inspiration! You gain a d6 inspiration die.`, 'info');
  };

  const handleWildShape = () => {
    if (!wildShapeAvailable || wildShapeActive) return;
    setWildShapeAvailable(prev => prev - 1);
    setWildShapeActive(true);
    setWildShapeHp(WOLF_STATS.maxHp);
    addLog(`${character.name} transforms into a Wolf!`, 'info');
  };

  const handleMetamagic = (action: 'empowered' | 'quickened' | 'create_slot') => {
    if (sorceryPoints <= 0) return;

    if (action === 'empowered') {
      if (sorceryPoints < 1) return;
      setSorceryPoints(prev => prev - 1);
      setEmpoweredSpellUsed(true);
      addLog(`${character.name} uses Empowered Spell! Next spell damage will be boosted.`, 'info');
    } else if (action === 'quickened') {
      if (sorceryPoints < 2) return;
      setSorceryPoints(prev => prev - 2);
      addLog(`${character.name} uses Quickened Spell! (Mechanic: Cast as Bonus Action)`, 'info');
    } else if (action === 'create_slot') {
      if (sorceryPoints < 2) return;
      // Restore a level 1 slot
      if (character.spellSlots && character.spellSlots[1]) {
        if (character.spellSlots[1].current < character.spellSlots[1].max) {
          setSorceryPoints(prev => prev - 2);
          updateCharacter(prev => {
            if (!prev || !prev.spellSlots) return prev;
            return {
              ...prev,
              spellSlots: {
                ...prev.spellSlots,
                1: { ...prev.spellSlots[1], current: prev.spellSlots[1].current + 1 }
              }
            };
          });
          addLog(`${character.name} creates a Level 1 Spell Slot!`, 'heal');
        } else {
          addLog(`Level 1 slots are full.`, 'miss');
        }
      }
    }
  };

  const handleChannelDivinity = (action: 'turn-undead' | 'preserve-life') => {
    if (channelDivinityUses <= 0) return;

    if (action === 'turn-undead') {
      setChannelDivinityUses(prev => prev - 1);
      addLog(`${character.name} presents their holy symbol to Turn Undead!`, 'info');

      // Apply to all undead enemies
      // Simplified: For now, we don't have enemy types, so we'll apply to selected enemy or log effect
      if (selectedEnemy) {
        const enemy = enemies.find(e => e.id === selectedEnemy);
        if (enemy) {
          // Simulate Wisdom Save
          const saveDC = 8 + character.proficiencyBonus + Math.floor((character.abilityScores.wisdom - 10) / 2);
          const saveRoll = rollDice(20) + (enemy.savingThrowBonus || 0);

          if (saveRoll < saveDC) {
            const turnedCondition: Condition = {
              type: 'turned',
              name: 'Turned',
              description: 'Must spend turns trying to move as far away as possible.',
              duration: 10, // 1 minute
              source: 'Turn Undead'
            };
            setEnemies(prev => prev.map(e => e.id === selectedEnemy ? { ...e, conditions: [...e.conditions, turnedCondition] } : e));
            addLog(`${enemy.name} is Turned! (Failed save ${saveRoll} vs DC ${saveDC})`, 'condition');
          } else {
            addLog(`${enemy.name} resists being Turned. (Rolled ${saveRoll} vs DC ${saveDC})`, 'miss');
          }
        }
      } else {
        addLog('Select an enemy to target with Turn Undead.', 'miss');
        return; // Don't spend use if no target
      }

    } else if (action === 'preserve-life') {
      setChannelDivinityUses(prev => prev - 1);
      const healAmount = character.level * 5;

      // Simplified: Heal self for now, or could split.
      setPlayerHp(prev => Math.min(character.maxHitPoints, prev + healAmount));
      updateCharacter(prev => ({ ...prev, hitPoints: Math.min(character.maxHitPoints, prev.hitPoints + healAmount) }));
      addLog(`${character.name} invokes Preserve Life and heals for ${healAmount} HP!`, 'heal');
    }
  };

  const handleArcaneRecovery = () => {
    if (arcaneRecoveryUsed) return;

    // Simplified: Restore one level 1 slot
    const level1Slots = character.spellSlots?.[1];
    if (level1Slots && level1Slots.current < level1Slots.max) {
      updateCharacter(prev => {
        if (!prev.spellSlots) return prev;
        return {
          ...prev,
          spellSlots: {
            ...prev.spellSlots,
            1: { ...prev.spellSlots[1], current: prev.spellSlots[1].current + 1 }
          }
        };
      });
      setArcaneRecoveryUsed(true);
      addLog(`${character.name} uses Arcane Recovery to restore a Level 1 spell slot.`, 'heal');
    } else {
      addLog('No Level 1 slots to recover or already full.', 'miss');
    }
  };

  const handleLayOnHands = () => {
    if (!layOnHandsPool || playerHp >= character.maxHitPoints) return;

    const healAmount = Math.min(5, layOnHandsPool, character.maxHitPoints - playerHp);
    setLayOnHandsPool(prev => prev - healAmount);
    setPlayerHp(prev => prev + healAmount);
    updateCharacter(prev => ({ ...prev, hitPoints: prev.hitPoints + healAmount }));
    addLog(`${character.name} uses Lay on Hands to heal ${healAmount} HP.`, 'heal');
  };

  const handleKiAction = (action: 'flurry' | 'defense' | 'step') => {
    if (kiPoints <= 0) return;
    setKiPoints(prev => prev - 1);

    if (action === 'defense') {
      setActiveBuffs(prev => [...prev, { id: 'patient-defense', name: 'Patient Defense', bonus: 2, duration: 1 }]); // Simulating Dodge with AC bonus
      addLog(`${character.name} uses Patient Defense (Dodge).`, 'info');
    } else if (action === 'step') {
      addLog(`${character.name} uses Step of the Wind (Dash/Disengage).`, 'info');
    } else if (action === 'flurry') {
      addLog(`${character.name} uses Flurry of Blows!`, 'info');
      // Trigger 2 unarmed strikes
      // For simplicity, we'll just simulate the damage rolls immediately without full attack roll UI
      if (selectedEnemy) {
        const enemy = enemies.find(e => e.id === selectedEnemy);
        if (enemy && !enemy.isDefeated) {
          // Calculate modifiers
          const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
          const strMod = Math.floor((character.abilityScores.strength - 10) / 2);
          const mod = Math.max(dexMod, strMod);
          const prof = character.proficiencyBonus;
          const attackBonus = mod + prof;

          // Attack 1
          let hit1 = false;
          let dmg1 = 0;
          const roll1 = rollDice(20);
          if (roll1 + attackBonus >= getEnemyEffectiveAC(enemy)) {
            hit1 = true;
            dmg1 = rollDice(4) + mod; // Martial Arts die d4
          }

          // Attack 2
          let hit2 = false;
          let dmg2 = 0;
          const roll2 = rollDice(20);
          if (roll2 + attackBonus >= getEnemyEffectiveAC(enemy)) {
            hit2 = true;
            dmg2 = rollDice(4) + mod;
          }

          // Apply damage
          const totalDmg = dmg1 + dmg2;
          if (totalDmg > 0) {
            setEnemies(prev => prev.map(e => {
              if (e.id === enemy.id) {
                const newHp = Math.max(0, e.currentHp - totalDmg);
                return { ...e, currentHp: newHp, isDefeated: newHp === 0 };
              }
              return e;
            }));
            addLog(`Flurry hits for ${totalDmg} damage! (${hit1 ? dmg1 : 'miss'} + ${hit2 ? dmg2 : 'miss'})`, 'damage');
          } else {
            addLog(`Flurry of Blows missed both attacks.`, 'miss');
          }
          nextTurn();
        }
      }
    }
  };

  const handleCunningAction = (actionType: 'dash' | 'disengage' | 'hide') => {
    addLog(`${character.name} uses Cunning Action to ${actionType}!`, 'info');
    // Implement specific logic if needed, e.g., Disengage prevents opportunity attacks (not implemented yet)
    // Hide could require a stealth check.
    if (actionType === 'hide') {
      // Simple hide logic
      const stealthRoll = rollDice(20) + Math.floor((character.abilityScores.dexterity - 10) / 2) + (character.skills?.stealth?.proficient ? 2 : 0);
      addLog(`Stealth Check: ${stealthRoll}`, 'info');
    }
  };

  const handleShove = () => {
    if (!selectedEnemy) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy) return;

    const athleticsCheck = rollDice(20) + Math.floor((character.abilityScores.strength - 10) / 2) + (character.skills?.athletics?.proficient ? 2 : 0);
    const enemyAthletics = rollDice(20) + (enemy.attackBonus || 0); // Simplified enemy check

    if (athleticsCheck > enemyAthletics) {
      addLog(`${character.name} shoves ${enemy.name} prone!`, 'condition');
      const proneCondition: Condition = {
        type: 'prone',
        name: 'Prone',
        description: 'Disadvantage on attack rolls. Attackers have advantage on melee attacks.',
        duration: 1,
        source: 'Shove'
      };
      setEnemies(prev => prev.map(e => e.id === enemy.id ? { ...e, conditions: [...e.conditions, proneCondition] } : e));
    } else {
      addLog(`${character.name} fails to shove ${enemy.name}.`, 'miss');
    }
    nextTurn();
  };

  const handleBreathWeapon = () => {
    const ancestry = character.draconicAncestry;
    const damageType = ancestry?.damageType || 'Fire';
    const shape = ancestry?.breathCone ? 'cone' : 'line';

    addLog(`${character.name} exhales a ${shape} of ${damageType.toLowerCase()}!`, 'info');

    // AoE Damage: 2d6 (Level 1)
    const damageRoll = rollDice(6) + rollDice(6);

    // Apply to all enemies
    setEnemies(prev => prev.map(enemy => {
      if (enemy.isDefeated) return enemy;

      // Simulating Save (DC 8 + Con + Prof)
      // Save type depends on ancestry (Con for Cold/Poison, Dex for Fire/Lightning/Acid)
      // const saveStat = ['Cold', 'Poison'].includes(damageType) ? 'constitution' : 'dexterity';

      const saveDC = 8 + Math.floor((character.abilityScores.constitution - 10) / 2) + character.proficiencyBonus;
      const enemySave = rollDice(20); // Flat roll for now

      let damageTaken = damageRoll;
      if (enemySave >= saveDC) {
        damageTaken = Math.floor(damageRoll / 2);
        addLog(`${enemy.name} succeeds on the save and takes half ${damageType} damage (${damageTaken}).`, 'damage');
      } else {
        addLog(`${enemy.name} fails the save and takes full ${damageType} damage (${damageTaken}).`, 'damage');
      }

      const newHp = Math.max(0, enemy.currentHp - damageTaken);
      return {
        ...enemy,
        currentHp: newHp,
        isDefeated: newHp <= 0
      };
    }));

    nextTurn();
  };

  const handleUseTorchOil = () => {
    const oilItem = findTorchOilItem();
    if (!oilItem) return;

    // Logic to consume item and apply effect
    // For now, just log
    addLog(`${character.name} coats their weapon in torch oil! (+1 Fire Damage)`, 'info');
    setActiveBuffs(prev => [...prev, { id: 'torch-oil', name: 'Flaming Weapon', bonus: 0, duration: 10 }]); // Bonus 0 to AC, but we can handle damage elsewhere
    // Remove item from inventory (mock)
    nextTurn();
  };

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
                <span className="font-bold">
                  {wildShapeActive ? `${wildShapeHp} / ${WOLF_STATS.maxHp} (Wolf)` : `${playerHp} / ${character.maxHitPoints}`}
                </span>
                {(character.temporaryHitPoints || 0) > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-900/50 text-blue-200 border-blue-800">
                    +{character.temporaryHitPoints} THP
                  </Badge>
                )}
              </div>
            </div>
            <Progress
              value={(wildShapeActive ? (wildShapeHp / WOLF_STATS.maxHp) : (playerHp / character.maxHitPoints)) * 100}
              className={cn("h-3", wildShapeActive && "bg-amber-900/20 [&>div]:bg-amber-700")}
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
              {hasInspirationDie && (
                <Badge variant="fantasy" className="text-xs animate-pulse">
                  Inspiration Die (d6)
                </Badge>
              )}
              {isBarbarian && rageActive && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  RAGE ({rageRoundsLeft})
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
                  {hasInspirationDie && (
                    <Button
                      variant={useInspiration ? "fantasy" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setUseInspiration(!useInspiration)}
                      disabled={!isPlayerTurn || isRolling}
                    >
                      <Sparkles className="mr-2 h-4 w-4" /> {useInspiration ? 'Using Inspiration!' : 'Use Inspiration'}
                    </Button>
                  )}
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
                {(isFighter || isRogue || isBarbarian || isBard || isPaladin || isMonk || isDruid || isSorcerer || isCleric || isRanger || isWizard) && (
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
                      {isBarbarian && (
                        <Button
                          variant={rageActive ? "destructive" : "secondary"}
                          size="sm"
                          onClick={handleRage}
                          disabled={!isPlayerTurn || rageAvailable <= 0 || rageActive || isRolling}
                          className={cn(rageActive && "animate-pulse ring-2 ring-red-500")}
                        >
                          <Flame className="mr-2 h-3 w-3" /> {rageActive ? 'Raging!' : `Rage (${rageAvailable})`}
                        </Button>
                      )}
                      {isBard && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleBardicInspiration}
                          disabled={!isPlayerTurn || inspirationAvailable <= 0 || hasInspirationDie || isRolling}
                        >
                          <Sparkles className="mr-2 h-3 w-3" /> Inspire ({inspirationAvailable})
                        </Button>
                      )}
                      {isPaladin && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleLayOnHands}
                          disabled={!isPlayerTurn || layOnHandsPool <= 0 || playerHp >= character.maxHitPoints || isRolling}
                        >
                          <HeartPulse className="mr-2 h-3 w-3" /> Lay on Hands ({layOnHandsPool})
                        </Button>
                      )}
                      {isMonk && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleKiAction('flurry')}
                            disabled={!isPlayerTurn || kiPoints <= 0 || !selectedEnemy || isRolling}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Flurry of Blows ({kiPoints})
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleKiAction('defense')}
                            disabled={!isPlayerTurn || kiPoints <= 0 || isRolling}
                          >
                            <Shield className="mr-2 h-3 w-3" /> Patient Defense ({kiPoints})
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleKiAction('step')}
                            disabled={!isPlayerTurn || kiPoints <= 0 || isRolling}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Step of Wind ({kiPoints})
                          </Button>
                        </>
                      )}
                      {isDruid && (
                        <Button
                          variant={wildShapeActive ? "destructive" : "secondary"}
                          size="sm"
                          onClick={handleWildShape}
                          disabled={!isPlayerTurn || wildShapeAvailable <= 0 || wildShapeActive || isRolling}
                        >
                          <Activity className="mr-2 h-3 w-3" /> {wildShapeActive ? 'Beast Form' : `Wild Shape (${wildShapeAvailable})`}
                        </Button>
                      )}
                      {isSorcerer && (
                        <>
                          <Button
                            variant={empoweredSpellUsed ? "fantasy" : "secondary"}
                            size="sm"
                            onClick={() => handleMetamagic('empowered')}
                            disabled={!isPlayerTurn || sorceryPoints < 1 || empoweredSpellUsed || isRolling}
                          >
                            <Zap className="mr-2 h-3 w-3" /> Empowered (1 SP)
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMetamagic('quickened')}
                            disabled={!isPlayerTurn || sorceryPoints < 2 || isRolling}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Quickened (2 SP)
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMetamagic('create_slot')}
                            disabled={!isPlayerTurn || sorceryPoints < 2 || isRolling}
                          >
                            <Sparkles className="mr-2 h-3 w-3" /> Create Slot (2 SP)
                          </Button>
                          <div className="col-span-2 text-xs text-center text-muted-foreground">
                            Sorcery Points: {sorceryPoints}
                          </div>
                        </>
                      )}
                      {isCleric && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleChannelDivinity('turn-undead')}
                            disabled={!isPlayerTurn || channelDivinityUses <= 0 || isRolling || !selectedEnemy}
                          >
                            <Sparkles className="mr-2 h-3 w-3" /> Turn Undead
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleChannelDivinity('preserve-life')}
                            disabled={!isPlayerTurn || channelDivinityUses <= 0 || isRolling}
                          >
                            <HeartPulse className="mr-2 h-3 w-3" /> Preserve Life
                          </Button>
                          <div className="col-span-2 text-xs text-center text-muted-foreground">
                            Channel Divinity: {channelDivinityUses}
                          </div>
                        </>
                      )}
                      {isRanger && (
                        <Button
                          variant={favoredEnemyActive ? "default" : "secondary"}
                          size="sm"
                          onClick={() => setFavoredEnemyActive(!favoredEnemyActive)}
                          disabled={!isPlayerTurn || isRolling}
                        >
                          <Crosshair className="mr-2 h-3 w-3" /> {favoredEnemyActive ? 'Favored Enemy Active' : 'Favored Enemy'}
                        </Button>
                      )}
                      {isWizard && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleArcaneRecovery}
                          disabled={!isPlayerTurn || arcaneRecoveryUsed || isRolling}
                        >
                          <Sparkles className="mr-2 h-3 w-3" /> Arcane Recovery
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Racial Actions */}
                {(character.race?.traits || []).includes('Breath Weapon') && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2 font-bold uppercase">Racial Actions</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleBreathWeapon}
                      disabled={!isPlayerTurn || isRolling}
                      className="w-full justify-start"
                    >
                      <Zap className="mr-2 h-3 w-3" /> Breath Weapon
                    </Button>
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
