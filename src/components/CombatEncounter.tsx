import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import { Sword, Shield, Heart, Skull, Backpack, X, Flame, Wand, Activity, HeartPulse, Dice6, Brain, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiceRoller } from './DiceRoller';
import { Inventory } from './Inventory';
import type { PlayerCharacter, CombatEnemy, CombatLogEntry, SpellContent, CombatLogEntryType } from '@/types';
import { useGame } from '@/contexts/GameContext';
import { createLogEntry, formatRollBreakdown } from '@/utils/combatLogger';
import { CombatLogPanel } from './CombatLogPanel';
import spellsData from '@/content/spells.json';
import {
  canRitualCast,
  getAvailableSlotLevels,
  getScaledCantripDamage,
  getSpellcastingAbility,
  getSpellSaveDC,
  getUpcastDamageOrEffect,
  rollConcentrationCheck,
  isPreparedCaster,
  shouldCheckScrollUse,
  getProficiencyBonus,
} from '@/lib/spells';

interface StatusEffect {
  id: string;
  name: string;
  duration: number;
  type: 'buff' | 'debuff';
  data?: Record<string, number | string>;
}

type CombatEnemyState = CombatEnemy & {
  statusEffects: StatusEffect[];
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
    useItem: consumeItem,
    startConcentration,
    endConcentration,
    spendSpellSlot
  } = useGame();

  // Combat state - ensure HP is a valid number
  const [playerHp, setPlayerHp] = useState(() => {
    const hp = character.hitPoints || character.maxHitPoints || 10;
    return Math.max(1, hp);
  });

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
      statusEffects: [],
    }))
  );

  const [turnOrder, setTurnOrder] = useState<Array<{ id: string; name: string; initiative: number }>>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showSpellMenu, setShowSpellMenu] = useState(false);
  const [playerStatusEffects, setPlayerStatusEffects] = useState<StatusEffect[]>([]);
  const [playerDefeated, setPlayerDefeated] = useState(false);
  const [victoryAchieved, setVictoryAchieved] = useState(false);
  const [deathSaves, setDeathSaves] = useState({ successes: 0, failures: 0 });
  const [isStable, setIsStable] = useState(false);
  const isFighter = character.class.name.toLowerCase() === 'fighter';
  const isRogue = character.class.name.toLowerCase() === 'rogue';
  const [actionSurgeAvailable, setActionSurgeAvailable] = useState(isFighter);
  const [secondWindAvailable, setSecondWindAvailable] = useState(isFighter);
  const [sneakAttackReady, setSneakAttackReady] = useState(false);
  const [sneakAttackUsedThisTurn, setSneakAttackUsedThisTurn] = useState(false);
  const [actionSurgeActive, setActionSurgeActive] = useState(false);
  const [cunningAttackBonus, setCunningAttackBonus] = useState(0);

  const findTorchOilItem = () =>
    (character.inventory || []).find(
      (item) =>
        (item.templateId || item.id)?.startsWith('torch-oil')
    );

  const getPlayerDefenseBonus = () => {
    const defenseEffect = playerStatusEffects.find(effect => effect.id === 'defense-bonus');
    return defenseEffect ? Number(defenseEffect.data?.bonus ?? 0) : 0;
  };

  const applyEnemyOngoingEffects = useCallback((enemy: CombatEnemyState) => {
    let updatedEnemy: CombatEnemyState = { ...enemy };
    const remainingEffects: StatusEffect[] = [];
    const messages: Array<{ message: string; type: CombatLogEntry['type'] }> = [];

    enemy.statusEffects.forEach((effect) => {
      let effectDamage = 0;
      if (effect.id.startsWith('burning-oil')) {
        effectDamage = Number(effect.data?.damage ?? 0);
        if (effectDamage > 0) {
          updatedEnemy.currentHp = Math.max(0, updatedEnemy.currentHp - effectDamage);
          messages.push({
            message: `${enemy.name} suffers ${effectDamage} fire damage from burning oil!`,
            type: 'damage'
          });
        }
      }

      if (updatedEnemy.currentHp > 0) {
        const nextDuration = effect.duration - 1;
        if (nextDuration > 0) {
          remainingEffects.push({ ...effect, duration: nextDuration });
        }
      }
    });

    updatedEnemy = {
      ...updatedEnemy,
      isDefeated: updatedEnemy.currentHp <= 0,
      statusEffects: updatedEnemy.currentHp <= 0 ? [] : remainingEffects,
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
    const shovePenalty = enemy.statusEffects.find((eff) => eff.data?.acPenalty);
    const penalty = shovePenalty ? Number(shovePenalty.data?.acPenalty) : 0;
    return enemy.armorClass - penalty;
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

    if (updatedEnemy.currentHp !== enemy.currentHp || updatedEnemy.statusEffects !== enemy.statusEffects) {
      setEnemies(prev => prev.map(e => e.id === enemyId ? updatedEnemy : e));
    }

    if (updatedEnemy.isDefeated) {
      nextTurn();
      return;
    }

    const grappled = updatedEnemy.statusEffects.some((eff) => eff.id.startsWith('grappled'));
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
          setDeathSaves(prev => {
            const newFailures = prev.failures + 2; // Critical hit (melee range) = 2 failures
            if (newFailures >= 3) {
              addLog(`${character.name} has succumbed to their wounds.`, 'defeat');
            }
            return { ...prev, failures: newFailures };
          });
        } else {
          const damageRoll = rollDice(6) + 2; // Simplified damage
          addLog(`${actingEnemy.name} ${t('combat.hits')} ${character.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage');

          setPlayerHp(prev => {
            const newHp = Math.max(0, prev - damageRoll);
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

      setPlayerStatusEffects(prev => prev.filter(effect => effect.id !== 'defense-bonus'));
      nextTurn();
    }, 1500);

    return () => clearTimeout(timeout);
  };

  const handlePlayerAttack = () => {
    if (!selectedEnemy || isRolling) return;

    setIsRolling(true);
    const attackRoll = rollDice(20);
    setDiceResult(attackRoll);

    const timeout = setTimeout(() => {
      const enemy = enemies.find(e => e.id === selectedEnemy);
      if (!enemy) {
        setIsRolling(false);
        setDiceResult(null);
        return;
      }

      const attackAbility = character.class.primaryAbility.includes('Dexterity') ? 'dexterity' : 'strength';
      const abilityMod = Math.floor((character.abilityScores[attackAbility] - 10) / 2);
      const proficiencyBonus = 2;
      const totalAttack = attackRoll + abilityMod + proficiencyBonus + cunningAttackBonus;
      const attackDetails = formatRollBreakdown(attackRoll, [
        { label: 'Ability', value: abilityMod },
        { label: 'Prof', value: proficiencyBonus }
      ]);
      const enemyAC = enemy ? getEnemyEffectiveAC(enemy) : 10;
      if (cunningAttackBonus) {
        attackDetails.push({ label: 'Cunning Edge', value: cunningAttackBonus });
      }

      if (totalAttack >= enemyAC) {
        // Hit!
        // Calculate damage based on weapon
        let damageRoll = abilityMod;

        if (character.equippedWeapon?.damage) {
          const [count, sides] = (character.equippedWeapon.damage.split('+')[0] || '1d8').split('d').map(Number);
          const weaponBonus = parseInt(character.equippedWeapon.damage.split('+')[1] || '0');

          for (let i = 0; i < (count || 1); i++) {
            damageRoll += rollDice(sides || 8);
          }
          damageRoll += weaponBonus;
        } else {
          // Unarmed strike (1 + STR mod, but we'll be generous with 1d4)
          damageRoll += rollDice(4);
        }

        // Sneak Attack rider for rogues (once per turn)
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

        addLog(`${character.name} ${t('combat.hits')} ${enemy.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage', attackDetails);

        setEnemies(prev => prev.map(e => {
          if (e.id === selectedEnemy) {
            const newHp = Math.max(0, e.currentHp - damageRoll);
            return { ...e, currentHp: newHp, isDefeated: newHp === 0 };
          }
          return e;
        }));
      } else {
        // Miss
        addLog(`${character.name} ${t('combat.attacks')} ${enemy.name} ${t('combat.butMisses')}`, 'miss', attackDetails);
      }

      setCunningAttackBonus(0);
      setIsRolling(false);
      setDiceResult(null);

      if (actionSurgeActive) {
        addLog('Action Surge grants another action!', 'info');
        setActionSurgeActive(false);
        return; // Keep player turn
      }

      nextTurn();
    }, 2000);

    return () => clearTimeout(timeout);
  };

  const handleDefend = () => {
    const defenseBonus = 2;
    setPlayerStatusEffects((prev) => [
      ...prev.filter(effect => effect.id !== 'defense-bonus'),
      {
        id: 'defense-bonus',
        name: t('combat.defensiveStance', 'Defensive Stance'),
        duration: 1,
        type: 'buff',
        data: { bonus: defenseBonus, expiresOn: 'next-turn' },
      },
    ]);
    addLog(`${character.name} ${t('combat.takesDefensiveStance')} (+${defenseBonus} AC)`, 'info');
    nextTurn();
  };

  const handleUseTorchOil = () => {
    if (!selectedEnemy) return;
    const oilItem = findTorchOilItem();
    if (!oilItem) return;

    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const burningEffect: StatusEffect = {
      id: `burning-oil-${Date.now()}`,
      name: t('combat.burningOil', 'Burning Oil'),
      duration: 3,
      type: 'debuff',
      data: { damage: 4 },
    };

    setEnemies(prev => prev.map(e => e.id === selectedEnemy
      ? { ...e, statusEffects: [...e.statusEffects, burningEffect] }
      : e
    ));

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
      setPlayerStatusEffects((prev) => [
        ...prev.filter((e) => e.id !== 'cunning-disengage'),
        { id: 'cunning-disengage', name: 'Disengaged', duration: 1, type: 'buff' }
      ]);
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
    setIsRolling(true);
    const roll = rollDice(20);
    const abilityMod = Math.floor((character.abilityScores.strength - 10) / 2);
    const proficiencyBonus = 2;
    const total = roll + abilityMod + proficiencyBonus;
    const targetAC = getEnemyEffectiveAC(enemy);

    setTimeout(() => {
      if (total >= targetAC) {
        addLog(`${character.name} shoves ${enemy.name} prone (AC -2 this round)!`, 'condition');
        const shoveEffect: StatusEffect = {
          id: `shoved-${Date.now()}`,
          name: 'Shoved/Prone',
          duration: 1,
          type: 'debuff',
          data: { acPenalty: 2 }
        };
        setEnemies(prev => prev.map(e => e.id === enemy.id ? { ...e, statusEffects: [...e.statusEffects, shoveEffect] } : e));
      } else {
        addLog(`${character.name} tries to shove ${enemy.name} but fails.`, 'miss');
      }
      setIsRolling(false);
      setDiceResult(null);
      nextTurn();
    }, 1200);
  };

  const handleGrapple = () => {
    if (!selectedEnemy || isRolling) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;
    setIsRolling(true);
    const roll = rollDice(20);
    const abilityMod = Math.floor((character.abilityScores.strength - 10) / 2);
    const proficiencyBonus = 2;
    const total = roll + abilityMod + proficiencyBonus;
    const targetAC = getEnemyEffectiveAC(enemy);

    setTimeout(() => {
      if (total >= targetAC) {
        addLog(`${character.name} grapples ${enemy.name}! They lose their next action.`, 'condition');
        const grappleEffect: StatusEffect = {
          id: `grappled-${Date.now()}`,
          name: 'Grappled',
          duration: 1,
          type: 'debuff'
        };
        setEnemies(prev => prev.map(e => e.id === enemy.id ? { ...e, statusEffects: [...e.statusEffects, grappleEffect] } : e));
      } else {
        addLog(`${character.name} fails to grapple ${enemy.name}.`, 'miss');
      }
      setIsRolling(false);
      setDiceResult(null);
      nextTurn();
    }, 1200);
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
    const proficiencyBonus = Math.max(2, Math.floor((character.level - 1) / 4) + 2);

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
      const defenseBonus = 5;
      setPlayerStatusEffects((prev) => [
        ...prev.filter(effect => effect.id !== 'shield-spell'),
        {
          id: 'shield-spell',
          name: 'Shield',
          duration: 1,
          type: 'buff',
          data: { bonus: defenseBonus, expiresOn: 'next-turn' },
        },
      ]);
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
    setIsRolling(true);
    const roll = rollDice(20);
    setDiceResult(roll);

    setTimeout(() => {
      setIsRolling(false);
      setDiceResult(null);

      if (roll === 20) {
        // Critical Success: Regain 1 HP
        setPlayerHp(1);
        setDeathSaves({ successes: 0, failures: 0 });
        setIsStable(false);
        addLog(`${character.name} rallies with a critical success! Regains 1 HP!`, 'heal');
        updateCharacter(prev => ({ ...prev, hitPoints: 1 }));
      } else if (roll === 1) {
        // Critical Failure: 2 Failures
        setDeathSaves(prev => ({ ...prev, failures: prev.failures + 2 }));
        addLog(`${character.name} suffers a critical failure on death save! (2 failures)`, 'damage');
      } else if (roll >= 10) {
        // Success
        setDeathSaves(prev => ({ ...prev, successes: prev.successes + 1 }));
        addLog(`${character.name} succeeds on a death save.`, 'info');
      } else {
        // Failure
        setDeathSaves(prev => ({ ...prev, failures: prev.failures + 1 }));
        addLog(`${character.name} fails a death save.`, 'miss');
      }

      nextTurn();
    }, 1500);
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

    if (playerHp <= 0 && deathSaves.failures >= 3 && !playerDefeated) {
      setPlayerDefeated(true);
      addLog(t('combat.defeat'), 'defeat');
      setTimeout(() => onDefeat(), 1200);
    }
  }, [enemies, playerHp, deathSaves, playerDefeated, victoryAchieved, addLog, onVictory, onDefeat, t]);

  const currentTurn = turnOrder[currentTurnIndex];
  const isPlayerTurn = currentTurn?.id === 'player';

  useEffect(() => {
    if (isPlayerTurn) {
      setPlayerStatusEffects(prev =>
        prev.filter(effect => effect.id !== 'defense-bonus' || effect.data?.expiresOn !== 'next-turn')
      );
      setSneakAttackUsedThisTurn(false);
      setSneakAttackReady(false);
    }
  }, [isPlayerTurn]);

  const torchOilAvailable = Boolean(findTorchOilItem());
  const selectedEnemyData = selectedEnemy ? enemies.find(e => e.id === selectedEnemy) : null;
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
              <span className="font-bold">{playerHp} / {character.maxHitPoints}</span>
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
            </div>
            {playerStatusEffects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {playerStatusEffects.map(effect => (
                  <Badge key={effect.id} variant="fantasy" className="text-xs">
                    {effect.name}
                  </Badge>
                ))}
              </div>
            )}
            {playerHp <= 0 && (
              <div className="mt-3 p-2 bg-black/20 rounded-md border border-fantasy-purple/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-fantasy-gold" />
                    Death Saves
                  </span>
                  {isStable && <Badge variant="gold">Stable</Badge>}
                </div>
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span>Successes:</span>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-3 h-3 rounded-full border border-green-500",
                            i < deathSaves.successes && "bg-green-500"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Failures:</span>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-3 h-3 rounded-full border border-red-500",
                            i < deathSaves.failures && "bg-red-500"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enemies */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Skull className="h-5 w-5 text-red-500" />
          {t('combat.enemies')}
        </h3>
        {enemies.map(enemy => (
          <Card
            key={enemy.id}
            className={cn(
              "cursor-pointer transition-all",
              selectedEnemy === enemy.id && "ring-2 ring-fantasy-gold",
              enemy.isDefeated && "opacity-50",
              turnOrder[currentTurnIndex]?.id === enemy.id && "border-fantasy-purple border-2"
            )}
            onClick={() => !enemy.isDefeated && setSelectedEnemy(enemy.id)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-bold">{enemy.name}</h4>
                  <p className="text-xs text-muted-foreground">{t('combat.armorClass')}: {enemy.armorClass}</p>
                </div>
                {enemy.isDefeated && (
                  <Badge variant="destructive">{t('combat.defeated')}</Badge>
                )}
                {turnOrder[currentTurnIndex]?.id === enemy.id && !enemy.isDefeated && (
                  <Badge variant="fantasy">{t('combat.acting')}</Badge>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{t('combat.hp')}:</span>
                  <span className="font-bold">{enemy.currentHp} / {enemy.maxHp}</span>
                </div>
                <Progress
                  value={(enemy.currentHp / enemy.maxHp) * 100}
                  className="h-2"
                />
                {enemy.statusEffects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {enemy.statusEffects.map(effect => (
                      <Badge key={effect.id} variant="destructive" className="text-xs">
                        {effect.name} ({effect.duration})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dice Roller */}
      {
        isRolling && diceResult !== null && (
          <div className="flex justify-center">
            <DiceRoller
              isRolling={isRolling}
              result={diceResult}
              sides={20}
            />
          </div>
        )
      }

      {/* Combat Actions */}
      {
        isPlayerTurn && !isRolling && playerHp > 0 && (
          <Card className="border-fantasy-gold">
            <CardHeader>
              <CardTitle className="text-lg">{t('combat.yourActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="fantasy"
                className="w-full"
                onClick={handlePlayerAttack}
                disabled={!selectedEnemy || enemies.every(e => e.isDefeated)}
              >
                <Sword className="h-4 w-4 mr-2" />
                {t('combat.attack')} {selectedEnemy && enemies.find(e => e.id === selectedEnemy)?.name}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowInventory(true)}
              >
                <Backpack className="h-4 w-4 mr-2" />
                {t('adventure.inventory', 'Inventory')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShove}
                disabled={!selectedEnemyData || selectedEnemyData.isDefeated}
              >
                <Sword className="h-4 w-4 mr-2" />
                Shove (Prone)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGrapple}
                disabled={!selectedEnemyData || selectedEnemyData.isDefeated}
              >
                <Shield className="h-4 w-4 mr-2" />
                Grapple
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleUseTorchOil}
                disabled={!torchOilAvailable || !selectedEnemyData || selectedEnemyData.isDefeated}
              >
                <Flame className="h-4 w-4 mr-2 text-orange-400" />
                {t('combat.useTorchOil', 'Use Torch Oil')}
              </Button>
              {isFighter && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleActionSurge}
                    disabled={!actionSurgeAvailable || !selectedEnemyData || selectedEnemyData.isDefeated}
                  >
                    <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                    Action Surge
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSecondWind}
                    disabled={!secondWindAvailable}
                  >
                    <Heart className="h-4 w-4 mr-2 text-green-400" />
                    Second Wind
                  </Button>
                </>
              )}
              {isRogue && (
                <>
                  <Button
                    variant={sneakAttackReady ? 'fantasy' : 'outline'}
                    className="w-full"
                    onClick={() => setSneakAttackReady((prev) => !prev)}
                    disabled={sneakAttackUsedThisTurn}
                  >
                    <Sparkles className="h-4 w-4 mr-2 text-pink-300" />
                    {sneakAttackReady ? 'Sneak Attack Ready' : 'Ready Sneak Attack'}
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" onClick={() => handleCunningAction('dash')}>
                      Dash
                    </Button>
                    <Button variant="outline" onClick={() => handleCunningAction('disengage')}>
                      Disengage
                    </Button>
                    <Button variant="outline" onClick={() => handleCunningAction('hide')}>
                      Hide
                    </Button>
                  </div>
                </>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowSpellMenu(true)}
                disabled={!character.knownSpells?.length || !canCastAnySpell}
              >
                <Wand className="h-4 w-4 mr-2 text-purple-400" />
                {t('combat.castSpell', 'Cast Spell')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDefend}
              >
                <Shield className="h-4 w-4 mr-2" />
                {t('combat.defend')}
              </Button>
            </CardContent>
          </Card>
        )
      }

      {/* Death Save Actions */}
      {
        isPlayerTurn && !isRolling && playerHp <= 0 && !isStable && (
          <Card className="border-red-500 animate-pulse">
            <CardHeader>
              <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                <HeartPulse className="h-5 w-5" />
                Unconscious!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                You are dying. You must make a death saving throw to survive.
                <br />
                <span className="text-xs opacity-70">3 Successes to stabilize. 3 Failures to die.</span>
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDeathSave}
              >
                <Dice6 className="h-4 w-4 mr-2" />
                Roll Death Save
              </Button>
            </CardContent>
          </Card>
        )
      }

      {/* Stable Actions */}
      {
        isPlayerTurn && !isRolling && playerHp <= 0 && isStable && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="text-lg text-green-500">Stable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You are unconscious but stable. You must wait for healing or 1d4 hours to regain consciousness.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={nextTurn}
              >
                Pass Turn
              </Button>
            </CardContent>
          </Card>
        )
      }

      {
        showInventory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-2xl">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-12 right-0 text-white hover:text-fantasy-gold"
                onClick={() => setShowInventory(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              <Inventory
                character={character}
                onClose={() => setShowInventory(false)}
                onUseItem={(item) => {
                  if (item.type === 'potion' && typeof item.healing === 'number') {
                    const healAmount = item.healing;
                    let actualHeal = 0;
                    setPlayerHp(prev => {
                      const newHp = Math.min(character.maxHitPoints, prev + healAmount);
                      actualHeal = Math.max(0, newHp - prev);
                      return newHp;
                    });
                    consumeItem(item);
                    addLog(`${character.name} uses ${item.name} and recovers ${actualHeal} HP!`, 'heal');
                    nextTurn();
                    setShowInventory(false);
                    return;
                  }
                  if (item.type === 'scroll' && item.spellId) {
                    const scrollSpell = spellsData.find(s => s.id === item.spellId);
                    if (!scrollSpell) {
                      addLog('The scroll is illegible.', 'miss');
                      consumeItem(item);
                      nextTurn();
                      setShowInventory(false);
                      return;
                    }

                    const { requiresCheck, dc, abilityMod } = shouldCheckScrollUse(character, scrollSpell);
                    let failed = false;
                    if (requiresCheck) {
                      const roll = rollDice(20);
                      const total = roll + abilityMod + getProficiencyBonus(character.level);
                      if (total < dc) {
                        failed = true;
                        addLog(
                          `${character.name} fails to cast ${scrollSpell.name} from the scroll (rolled ${total} vs DC ${dc}).`,
                          'miss'
                        );
                      } else {
                        addLog(
                          `${character.name} reads the scroll and manages to cast ${scrollSpell.name}! (rolled ${total} vs DC ${dc})`,
                          'spell'
                        );
                      }
                    } else {
                      addLog(`${character.name} casts ${scrollSpell.name} from the scroll.`, 'spell');
                    }

                    if (!failed) {
                      consumeItem(item);
                      handleCastSpell(scrollSpell.id, {
                        slotLevel: item.spellLevel ?? scrollSpell.level,
                        fromScroll: true,
                        bypassPreparation: true
                      });
                    } else {
                      nextTurn();
                    }
                    setShowInventory(false);
                    return;
                  }
                }}
              />
            </div>
          </div>
        )
      }

      {
        showSpellMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-md">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-12 right-0 text-white hover:text-fantasy-gold"
                onClick={() => setShowSpellMenu(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              <Card className="border-fantasy-purple bg-fantasy-dark-card">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Spellbook</span>
                    {slotSummary && (
                      <Badge variant="outline">
                        {slotSummary}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 max-h-[60vh] overflow-y-auto">
                  {character.knownSpells?.map(spellId => {
                    const spell = spellsData.find(s => s.id === spellId);
                    if (!spell) return null;
                    const availableSlotLevels = getAvailableSlotLevels(character, spell);
                    const canCastAsRitual = spell.ritual && canRitualCast(character);
                    const isCantrip = spell.level === 0;
                    const noResources =
                      !isCantrip &&
                      availableSlotLevels.length === 0 &&
                      !canCastAsRitual;
                    const preparedRequirement =
                      !isPreparedCaster(character.class.name) ||
                      (character.preparedSpells || character.knownSpells || []).includes(spellId);

                    return (
                      <div
                        key={spellId}
                        className="w-full rounded-md border border-fantasy-purple/30 p-3 hover:bg-fantasy-purple/10 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col items-start text-left">
                            <span className="font-bold flex items-center gap-2">
                              {spell.name}
                              {spell.concentration && (
                                <Badge variant="outline" className="text-[11px] flex items-center gap-1">
                                  <Brain className="h-3 w-3" /> Concentration
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground line-clamp-2">{spell.description}</span>
                            {!preparedRequirement && (
                              <span className="text-[11px] text-amber-400 mt-1">Not prepared</span>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2 shrink-0">Lvl {spell.level}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {isCantrip && (
                            <Button
                              size="sm"
                              variant="fantasy"
                              onClick={() => handleCastSpell(spellId)}
                            >
                              Cast Cantrip
                            </Button>
                          )}
                          {availableSlotLevels.map((lvl) => (
                            <Button
                              key={`${spellId}-slot-${lvl}`}
                              size="sm"
                              variant="outline"
                              onClick={() => handleCastSpell(spellId, { slotLevel: lvl })}
                              disabled={!preparedRequirement}
                            >
                              Use Lvl {lvl} Slot
                            </Button>
                          ))}
                          {canCastAsRitual && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCastSpell(spellId, { castAsRitual: true })}
                              disabled={!preparedRequirement}
                            >
                              Cast as Ritual
                            </Button>
                          )}
                          {noResources && (
                            <span className="text-xs text-muted-foreground">No slots remaining</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!character.knownSpells || character.knownSpells.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">You don't know any spells.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      }

      {/* Combat Log */}
      <CombatLogPanel logs={combatLog} className="max-h-60" />
    </div >
  );
}
