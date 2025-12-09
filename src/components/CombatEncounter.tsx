import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import { Sword, Shield, Heart, Skull, Backpack, X, Flame, Wand, Activity, HeartPulse, Brain, Zap, Sparkles, Book, Search, MessageCircle, FlaskConical, Scroll, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerCharacter, CombatEnemy, CombatLogEntry, SpellContent, CombatLogEntryType, Condition, AbilityName } from '@/types';
import { useGame } from '@/contexts/GameContext';
import { canAct, getCombatAdvantage, getSavingThrowAdvantage } from '@/utils/combatUtils';

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
import { getDefaultFeatureUses } from '@/utils/featureUtils';
import type { FeatureUses } from '@/types';
import { getEnemyById, mergeEnemyOverride } from '@/utils/enemies';

import {
  calculateArmorClass,
  calculateAbilityModifier,
} from '@/utils/characterStats';

type CombatEnemyState = CombatEnemy & {
  conditions: Condition[];
};

type EnemyAction = NonNullable<CombatEnemy['actions']>[number];
type InitialEnemyInput = {
  id?: string;
  enemyId?: string;
  legendaryActions?: CombatEnemy['legendaryActions'];
  breathDamage?: string;
  breathType?: string;
};

const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing',
  'poison', 'psychic', 'radiant', 'slashing', 'thunder'
];

const detectDamageType = (damage: string): string => {
  const normalized = damage.toLowerCase();
  const match = DAMAGE_TYPES.find((type) => normalized.includes(type));
  return match || 'slashing';
};

const abilityLookup: Record<string, keyof CombatEnemy['abilityScores']> = {
  str: 'strength',
  strength: 'strength',
  dex: 'dexterity',
  dexterity: 'dexterity',
  con: 'constitution',
  constitution: 'constitution',
  int: 'intelligence',
  intelligence: 'intelligence',
  wis: 'wisdom',
  wisdom: 'wisdom',
  cha: 'charisma',
  charisma: 'charisma',
};

const averageDamageFromString = (damage: string): number => {
  if (!damage) return 0;
  let total = 0;
  let matched = false;
  const regex = /(\d+)d(\d+)([+-]\d+)?/gi;
  let m;
  while ((m = regex.exec(damage)) !== null) {
    matched = true;
    const count = Number(m[1]);
    const sides = Number(m[2]);
    const mod = m[3] ? Number(m[3]) : 0;
    total += count * ((sides + 1) / 2) + mod;
  }
  if (!matched) {
    const flat = parseInt(damage, 10);
    if (!Number.isNaN(flat)) total += flat;
  }
  return total;
};


const determineEnemyAction = (
  enemy: CombatEnemy,
  player: PlayerCharacter,
  breathReady: boolean,
  allies: CombatEnemy[] = []
): EnemyAction | { type: 'breath'; name: string; damage: string; damageType?: string; save?: { ability: string; dc: number; onSave?: string; onFail?: string } } | undefined => {
  const actions = enemy.actions || [];

  // 1. Gather all possible actions including breath
  const pool: Array<EnemyAction | { type: 'breath'; name: string; damage: string; damageType?: string; save?: { ability: string; dc: number; onSave?: string; onFail?: string } }> = [...actions];
  if (breathReady && enemy.breathDamage && enemy.breathType) {
    pool.push({
      type: 'breath',
      name: 'Breath Weapon',
      damage: enemy.breathDamage,
      damageType: enemy.breathType,
      save: { ability: 'dex', dc: enemy.breathDC || 12 }
    });
  }

  if (pool.length === 0) return undefined;

  const behavior = enemy.behavior || 'aggressive';
  const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;

  // --- BEHAVIOR LOGIC ---

  // CAUTIOUS: If low HP (<40%), prioritize ranged or defensive (if we had defensive actions).
  // For now, if cautious and low HP, try to find a ranged attack or just random to avoid being predictable.
  if (behavior === 'cautious' && hpPercent < 40) {
    // Logic for fleeing or dodging would go here.
    // For now, prefer actions that might have range or control? 
    // Fallback: Pick random viable action instead of always strongest.
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // SUPPORT: Heal allies if they are low.
  if (behavior === 'support') {
    const lowHealthAlly = allies.find(a => !a.isDefeated && (a.currentHp / a.maxHp) < 0.5);
    if (lowHealthAlly) {
      // Look for 'Heal' or 'Cure' action in pool
      const healAction = pool.find(a => a.name.toLowerCase().includes('heal') || a.name.toLowerCase().includes('cure'));
      if (healAction) return healAction;
    }
    // If no one needs healing, or no heal action, fall through to default.
  }

  // AGGRESSIVE (Default): Maximize Damage
  // Default logic: Pick highest average damage.
  return pool.reduce((best, action) => {
    if (!best) return action;
    const bestAvg = averageDamageFromString(best.damage || enemy.damage || '');
    const currentAvg = averageDamageFromString(action.damage || enemy.damage || '');
    return currentAvg > bestAvg ? action : best;
  }, undefined as typeof pool[0] | undefined);
};


const getEnemyAbilityMod = (enemy: CombatEnemy, ability: string): number => {
  const key = abilityLookup[ability.toLowerCase()] || 'strength';
  const score = enemy.abilityScores?.[key];
  if (typeof score === 'number') {
    return Math.floor((score - 10) / 2);
  }
  return 0;
};

const getEnemySavingThrowBonus = (enemy: CombatEnemy, ability: string): number => {
  const key = abilityLookup[ability.toLowerCase()] || 'strength';
  const shortKey = key.slice(0, 3);
  const explicit = enemy.savingThrows?.[key] ?? enemy.savingThrows?.[shortKey];
  if (typeof explicit === 'number') return explicit;
  if (enemy.savingThrowBonus) return enemy.savingThrowBonus;
  return getEnemyAbilityMod(enemy, key);
};

const isEnemyConditionImmune = (enemy: CombatEnemy, condition: string) => {
  const immunities = (enemy.conditionImmunities || []).map(i => i.toLowerCase());
  return immunities.includes(condition.toLowerCase());
};

const adjustDamageForDefenses = (
  enemy: CombatEnemy,
  amount: number,
  damageType: string,
  options?: { isSpell?: boolean; isMagical?: boolean }
) => {
  const type = (damageType || 'slashing').toLowerCase();
  const isMagical = options?.isSpell || options?.isMagical;
  const matchType = (entries?: string[]) =>
    (entries || []).some((entry) => {
      const normalized = entry.toLowerCase();
      if (normalized.includes('nonmagical') && isMagical) return false;
      return normalized.includes(type);
    });

  if (matchType(enemy.damageImmunities)) {
    return { adjustedDamage: 0, note: `immune to ${type}` };
  }

  let adjustedDamage = amount;
  let note: string | null = null;

  if (matchType(enemy.damageVulnerabilities)) {
    adjustedDamage *= 2;
    note = `vulnerable to ${type}`;
  }

  if (matchType(enemy.damageResistances)) {
    adjustedDamage = Math.floor(adjustedDamage / 2);
    note = `resists ${type}`;
  }

  return { adjustedDamage, note };
};

interface CombatEncounterProps {
  character: PlayerCharacter;
  enemies: Array<{
    id?: string;
    enemyId?: string;
    name: string;
    armorClass: number;
    hitPoints: number;
    attackBonus: number;
    damage: string;
    damageType?: string;
    effectType?: 'fear' | 'charm' | 'poison' | 'magic';
    xpReward?: number;
    savingThrowBonus?: number;
    creatureType?: string;
    legendaryActions?: CombatEnemy['legendaryActions'];
    breathDC?: number;
    breathDamage?: string;
    breathType?: string;
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
    initialEnemies.map((enemy, index) => {
      const sourceId = enemy.id || enemy.enemyId || '';
      const catalogEnemy = sourceId ? getEnemyById(sourceId) : null;
      const base = catalogEnemy
        ? mergeEnemyOverride(catalogEnemy, {
          name: enemy.name || catalogEnemy.name,
          armorClass: enemy.armorClass || catalogEnemy.armorClass,
          attackBonus: enemy.attackBonus || catalogEnemy.attackBonus,
          damage: enemy.damage || catalogEnemy.damage,
          damageType: enemy.damageType || catalogEnemy.damageType,
          effectType: enemy.effectType || catalogEnemy.effectType,
          xpReward: enemy.xpReward || catalogEnemy.xpReward,
          savingThrowBonus: enemy.savingThrowBonus || catalogEnemy.savingThrowBonus,
          maxHp: enemy.hitPoints || catalogEnemy.maxHp,
          currentHp: enemy.hitPoints || catalogEnemy.maxHp,
          legendaryActions: enemy.legendaryActions || catalogEnemy.legendaryActions,
          breathDC: enemy.breathDC || catalogEnemy.breathDC,
          breathDamage: enemy.breathDamage || catalogEnemy.breathDamage,
          breathType: enemy.breathType || catalogEnemy.breathType,
        })
        : {
          id: enemy.id || `enemy-${index}`,
          name: enemy.name,
          currentHp: enemy.hitPoints,
          maxHp: enemy.hitPoints,
          temporaryHp: 0,
          armorClass: enemy.armorClass,
          attackBonus: enemy.attackBonus,
          damage: enemy.damage,
          damageType: enemy.damageType || detectDamageType(enemy.damage || ''),
          creatureType: enemy.creatureType,
          effectType: enemy.effectType,
          initiative: 0,
          isDefeated: false,
          xpReward: enemy.xpReward,
          savingThrowBonus: enemy.savingThrowBonus,
          conditions: [],
        };

      return {
        ...base,
        id: base.id || `enemy-${index}`,
        initiative: Math.floor(Math.random() * 20) + 1,
        isDefeated: false,
        conditions: [],
        temporaryHp: 0,
      };
    })
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
  const [analyzedEnemies, setAnalyzedEnemies] = useState<Set<string>>(new Set());
  const [legendaryPoints, setLegendaryPoints] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialEnemies.forEach((enemy: InitialEnemyInput, index) => {
      const catalogEnemy = enemy.id ? getEnemyById(enemy.id) : getEnemyById(enemy.enemyId || '');
      const id = enemy.id || enemy.enemyId || `enemy-${index}`;
      if (catalogEnemy?.legendaryActions?.length || enemy.legendaryActions?.length) {
        map[id] = 3;
      }
    });
    return map;
  });
  const [enemyBreathReady, setEnemyBreathReady] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialEnemies.forEach((enemy: InitialEnemyInput, index) => {
      const catalogEnemy = enemy.id ? getEnemyById(enemy.id) : getEnemyById(enemy.enemyId || '');
      const id = enemy.id || enemy.enemyId || `enemy-${index}`;
      const hasBreath = (catalogEnemy?.breathDamage && catalogEnemy.breathType) || (enemy.breathDamage && enemy.breathType);
      if (hasBreath) {
        map[id] = true;
      }
    });
    return map;
  });
  // Removed local playerStatusEffects, using character.conditions
  const [playerDefeated, setPlayerDefeated] = useState(false);
  const [victoryAchieved, setVictoryAchieved] = useState(false);
  // Removed local deathSaves, using character.deathSaves

  // Extra Attack State
  const [attacksLeft, setAttacksLeft] = useState(1);
  const maxAttacks = useMemo(() => {
    let count = 1;
    const level = character.level;
    const cls = character.class.name.toLowerCase();

    // Fighter
    if (cls === 'fighter') {
      if (level >= 20) count = 4;
      else if (level >= 11) count = 3;
      else if (level >= 5) count = 2;
    }
    // Barbarian, Paladin, Ranger, Monk
    else if (['barbarian', 'paladin', 'ranger', 'monk'].includes(cls)) {
      if (level >= 5) count = 2;
    }
    // Warlock (Thirsting Blade check - assumes it's in features or invocations)
    // Simplified: Check if features includes 'Thirsting Blade'
    if (cls === 'warlock' && (character.class.features || []).includes('Thirsting Blade')) {
      count = 2;
    }

    return count;
  }, [character.level, character.class.name, character.class.features]);

  const isFighter = character.class.name.toLowerCase() === 'fighter';
  const isRogue = character.class.name.toLowerCase() === 'rogue';
  const defaultUses = useMemo(() => character.featureUses || getDefaultFeatureUses(character), [character]);

  const persistFeatureUses = useCallback((updates: Partial<FeatureUses>) => {
    updateCharacter((prev) => {
      if (!prev) return prev;
      const current = prev.featureUses || getDefaultFeatureUses(prev);
      return { ...prev, featureUses: { ...current, ...updates } };
    });
  }, [updateCharacter]);

  const [actionSurgeAvailable, setActionSurgeAvailable] = useState(isFighter ? defaultUses.actionSurge : false);
  const [secondWindAvailable, setSecondWindAvailable] = useState(isFighter ? defaultUses.secondWind : false);
  const [sneakAttackUsedThisTurn, setSneakAttackUsedThisTurn] = useState(false);
  const [activeBuffs, setActiveBuffs] = useState<Array<{ id: string; name: string; bonus?: number; duration: number }>>([]);
  const [relentlessEnduranceUsed, setRelentlessEnduranceUsed] = useState(false);

  // Barbarian Rage State
  const isBarbarian = character.class.name.toLowerCase() === 'barbarian';
  const [rageAvailable, setRageAvailable] = useState(isBarbarian ? defaultUses.rage : 0); // 2 Rages per long rest at level 1
  const [rageActive, setRageActive] = useState(false);
  const [rageRoundsLeft, setRageRoundsLeft] = useState(0);
  const [recklessAttackActive, setRecklessAttackActive] = useState(false);

  // Bardic Inspiration State
  const isBard = character.class.name.toLowerCase() === 'bard';
  const [inspirationAvailable, setInspirationAvailable] = useState(isBard ? defaultUses.bardicInspiration : 0);
  const [hasInspirationDie, setHasInspirationDie] = useState(false);
  const [useInspiration, setUseInspiration] = useState(false);

  // Paladin Lay on Hands State
  const isPaladin = character.class.name.toLowerCase() === 'paladin';
  const [layOnHandsPool, setLayOnHandsPool] = useState(isPaladin ? defaultUses.layOnHands : 0);
  const [divineSmiteActive, setDivineSmiteActive] = useState(false);

  // Monk Ki State
  const isMonk = character.class.name.toLowerCase() === 'monk';
  const [kiPoints, setKiPoints] = useState(isMonk ? defaultUses.kiPoints : 0);

  // Druid Wild Shape State
  const isDruid = character.class.name.toLowerCase() === 'druid';
  const [wildShapeAvailable, setWildShapeAvailable] = useState(isDruid ? defaultUses.wildShape : 0);
  const [wildShapeActive, setWildShapeActive] = useState(false);
  const [wildShapeHp, setWildShapeHp] = useState(0);
  const WOLF_STATS = { name: 'Wolf', maxHp: 11, ac: 13, speed: 40, str: 12, dex: 15, con: 12 };

  // Sorcerer Metamagic State
  const isSorcerer = character.class.name.toLowerCase() === 'sorcerer';
  const [sorceryPoints, setSorceryPoints] = useState(isSorcerer ? defaultUses.sorceryPoints : 0);
  const [empoweredSpellUsed, setEmpoweredSpellUsed] = useState(false);

  // Cleric Channel Divinity State
  const isCleric = character.class.name.toLowerCase() === 'cleric';
  const [channelDivinityUses, setChannelDivinityUses] = useState(isCleric ? defaultUses.channelDivinity : 0); // 1 use at level 2+ usually, simplified to 1 for now

  // Ranger State
  const isRanger = character.class.name.toLowerCase() === 'ranger';
  const [favoredEnemyActive, setFavoredEnemyActive] = useState(false);

  // Wizard State
  const isWizard = character.class.name.toLowerCase() === 'wizard';
  const [arcaneRecoveryUsed, setArcaneRecoveryUsed] = useState(false);
  const [offhandAvailable, setOffhandAvailable] = useState(true);
  const [offhandWeaponId, setOffhandWeaponId] = useState<string | null>(null);
  const selectedEnemyData = useMemo(
    () => enemies.find((enemy) => enemy.id === selectedEnemy) || null,
    [enemies, selectedEnemy]
  );
  const legendaryCreatures = useMemo(
    () => enemies.filter((enemy) => enemy.legendaryActions?.length && !enemy.isDefeated),
    [enemies]
  );

  const findTorchOilItem = () =>
    (character.inventory || []).find(
      (item) =>
        (item.templateId || item.id)?.startsWith('torch-oil')
    );

  const getOffhandWeapon = () => {
    const lightWeapons = getLightWeapons();
    if (offhandWeaponId) {
      const found = lightWeapons.find(w => w.id === offhandWeaponId);
      if (found) return found;
    }
    return lightWeapons[0];
  };

  const getLightWeapons = () => {
    const equipped = character.equippedWeapon;
    if (equipped && (equipped.properties || []).includes('light')) return equipped;
    const inv = character.inventory || [];
    return inv.filter(
      (item) =>
        item.type === 'weapon' &&
        (item.properties || []).includes('light')
    );
  };

  const formatSpeed = useCallback((speed?: CombatEnemy['speed']) => {
    if (!speed) return t('combat.none');
    const parts = Object.entries(speed)
      .filter(([, value]) => !!value)
      .map(([type, value]) => `${type} ${value} ft.`);
    return parts.length ? parts.join(', ') : t('combat.none');
  }, [t]);

  const formatList = useCallback((items?: string[]) => {
    if (!items || items.length === 0) return t('combat.none');
    return items.join(', ');
  }, [t]);

  const formatActionMeta = useCallback((action: NonNullable<CombatEnemy['actions']>[number]) => {
    const parts: string[] = [];
    if (action.toHit !== undefined) parts.push(`+${action.toHit} to hit`);
    if (action.reach) parts.push(`reach ${action.reach} ft.`);
    if (action.range) parts.push(`range ${action.range}`);
    if (action.targets) parts.push(action.targets);
    if (action.damage) parts.push(action.damage);
    if (action.save) {
      const dcText = action.save.dc ? `DC ${action.save.dc}` : 'Save';
      const abilityText = action.save.ability ? ` ${action.save.ability}` : '';
      parts.push(`${dcText}${abilityText}`);
    }
    return parts.join(' · ');
  }, []);

  useEffect(() => {
    const uses = character.featureUses || getDefaultFeatureUses(character);
    if (isFighter) {
      setActionSurgeAvailable(uses.actionSurge);
      setSecondWindAvailable(uses.secondWind);
    }
    if (isBarbarian) setRageAvailable(uses.rage);
    if (isBard) setInspirationAvailable(uses.bardicInspiration);
    if (isPaladin) setLayOnHandsPool(uses.layOnHands);
    if (isMonk) setKiPoints(uses.kiPoints);
    if (isDruid) setWildShapeAvailable(uses.wildShape);
    if (isSorcerer) setSorceryPoints(uses.sorceryPoints);
    if (isCleric) setChannelDivinityUses(uses.channelDivinity);
    setOffhandAvailable(true);
  }, [character.featureUses, character.level, character.class.name, isBarbarian, isBard, isCleric, isDruid, isFighter, isMonk, isPaladin, isSorcerer]);

  const hasHalflingLucky = (character.race?.traits || []).includes('Lucky');

  const applyHalflingLucky = (roll: number, context: string) => {
    if (hasHalflingLucky && roll === 1) {
      const reroll = rollDice(20);
      addLog(`${character.name}'s Lucky trait rerolls a natural 1 (${context}).`, 'info');
      return reroll;
    }
    return roll;
  };

  const applyPlayerCondition = (condition: Condition) => {
    updateCharacter((prev) => {
      if (!prev) return prev;
      if (prev.conditions.some(c => c.type === condition.type)) return prev;
      return { ...prev, conditions: [...prev.conditions, condition] };
    });
  };

  const rollPlayerSavingThrow = (
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
    effectType?: 'poison' | 'charm' | 'fear' | 'magic'
  ) => {
    const baseRoll = rollDice(20);
    let advantageType = getSavingThrowAdvantage(
      { ...character, conditions: character.conditions || [], traits: character.race?.traits || [] },
      ability,
      effectType
    );

    // Barbarian Danger Sense
    if (isBarbarian && character.level >= 2 && ability === 'dexterity') {
      const isBlinded = character.conditions.some(c => c.type === 'blinded');
      const isDeafened = character.conditions.some(c => c.type === 'deafened');
      const isIncapacitated = character.conditions.some(c => c.type === 'incapacitated');

      if (!isBlinded && !isDeafened && !isIncapacitated) {
        if (advantageType === 'disadvantage') advantageType = 'normal';
        else if (advantageType === 'normal') advantageType = 'advantage';
        addLog("Danger Sense grants advantage on Dexterity save.", 'info');
      }
    }

    const secondRoll = rollDice(20);
    let roll = baseRoll;
    if (advantageType === 'advantage') roll = Math.max(baseRoll, secondRoll);
    if (advantageType === 'disadvantage') roll = Math.min(baseRoll, secondRoll);
    roll = applyHalflingLucky(roll, 'saving throw');

    const abilityMod = Math.floor((character.abilityScores[ability] - 10) / 2);
    const prof = character.savingThrowProficiencies?.[ability] ? character.proficiencyBonus : 0;
    return { roll, total: roll + abilityMod + prof, advantageType };
  };

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

  const applyEnemyDamageToPlayer = (
    actingEnemy: CombatEnemyState,
    damageRoll: number,
    incomingDamageType: string
  ) => {
    setPlayerHp(prev => {
      let remainingDamage = damageRoll;

      // Uncanny Dodge (Applies to Attacks only, but we'll approximate 'not effectType' or check incomingDamage logic)
      // Since we don't strictly track 'isAttack' here easily without signature change, we'll assume physical damage is an attack.
      // Or we can rely on proper flagging.
      // For MVP: If Uncanny Dodge is active, halve damage once then remove it.
      const hasUncannyDodge = activeBuffs.some(b => b.id === 'uncanny-dodge');
      if (hasUncannyDodge) {
        remainingDamage = Math.ceil(remainingDamage / 2);
        addLog('Uncanny Dodge! Damage halved.', 'info');
        // Remove it (Reaction consumed)
        setActiveBuffs(prev => prev.filter(b => b.id !== 'uncanny-dodge'));

        // In strict rules, you choose AFTER seeing damage. 
        // Here we simplified to "Prepare it". 
        // Since it consumes reaction, it resets at start of turn?
        // We set duration 1, so it clears next turn anyway.
        updateCharacter(current => { if (!current) return current; return { ...current, conditions: current.conditions } }); // Trigger update
      }

      // Apply Resistances
      const traits = character.race?.traits || [];
      const ancestry = character.draconicAncestry;

      if (actingEnemy.effectType) {
        const effect = actingEnemy.effectType;
        const saveAbility = effect === 'poison' ? 'constitution' : 'wisdom';
        const dc = actingEnemy.saveDC || 12;
        const save = rollPlayerSavingThrow(saveAbility, effect);
        if (save.total < dc) {
          if (effect === 'fear') {
            applyPlayerCondition({ type: 'frightened', name: 'Frightened', description: 'Disadvantage on attacks while source is visible.', duration: 2, source: actingEnemy.name });
            addLog(`${character.name} is frightened! (Failed save ${save.total} vs DC ${dc})`, 'condition');
          } else if (effect === 'charm') {
            applyPlayerCondition({ type: 'charmed', name: 'Charmed', description: 'Cannot attack the charmer; charmer has advantage on socials.', duration: 2, source: actingEnemy.name });
            addLog(`${character.name} is charmed! (Failed save ${save.total} vs DC ${dc})`, 'condition');
          } else if (effect === 'poison') {
            applyPlayerCondition({ type: 'poisoned', name: 'Poisoned', description: 'Disadvantage on attack rolls and ability checks.', duration: 3, source: actingEnemy.name });
            addLog(`${character.name} is poisoned! (Failed save ${save.total} vs DC ${dc})`, 'condition');
          }
        } else {
          addLog(`${character.name} resists the ${effect} effect. (Save ${save.total} vs DC ${dc})`, 'info');
        }
      }

      let resisted = false;
      if (incomingDamageType === 'fire' && traits.includes('Hellish Resistance')) resisted = true;
      if (incomingDamageType === 'poison' && traits.includes('Dwarven Resilience')) resisted = true;
      if (ancestry && incomingDamageType.toLowerCase() === ancestry.damageType.toLowerCase()) resisted = true;

      if (incomingDamageType === 'poison') {
        const save = rollPlayerSavingThrow('constitution', 'poison');
        const dc = 12;
        if (save.total >= dc) {
          remainingDamage = Math.floor(remainingDamage / 2);
          addLog(`Constitution save succeeds vs poison (${save.total} vs DC ${dc}). Damage halved.`, 'info');
        } else {
          addLog(`Constitution save fails vs poison (${save.total} vs DC ${dc}).`, 'miss');
        }
      }

      const magicTypes = ['fire', 'cold', 'lightning', 'acid', 'poison', 'psychic', 'radiant', 'necrotic', 'thunder', 'force'];
      if (magicTypes.includes(incomingDamageType) && incomingDamageType !== 'poison') {
        const saveAbility: 'dexterity' | 'wisdom' = ['fire', 'cold', 'lightning', 'acid', 'thunder', 'force'].includes(incomingDamageType) ? 'dexterity' : 'wisdom';
        const save = rollPlayerSavingThrow(saveAbility, 'magic');
        const dc = actingEnemy.saveDC || 12;

        // Evasion (Rogue 7, Monk 7)
        const hasEvasion = (isRogue || isMonk) && character.level >= 7 && saveAbility === 'dexterity';

        if (save.total >= dc) {
          remainingDamage = hasEvasion ? 0 : Math.floor(remainingDamage / 2);
          addLog(`${hasEvasion ? 'Evasion!' : 'Magic save succeeds'} (${save.total} vs DC ${dc}). ${hasEvasion ? 'No damage taken.' : 'Damage halved.'}`, 'info');
        } else {
          remainingDamage = hasEvasion ? Math.floor(remainingDamage / 2) : remainingDamage; // Evasion halves damage on fail? No, standard Evasion is Half on Fail. Standard rule is Full on Fail.
          // Wait, Standard Rule: Save = Half, Fail = Full.
          // Evasion Rule: Save = 0, Fail = Half.
          if (hasEvasion) {
            addLog(`Evasion! Save fails (${save.total} vs DC ${dc}) but damage is halved.`, 'info');
          } else {
            addLog(`Magic save fails (${save.total} vs DC ${dc}).`, 'miss');
          }
        }
      }

      // Barbarian Rage Resistance
      // Barbarian Rage Resistance
      if (rageActive) {
        if (character.subclass?.id === 'totem-warrior' && incomingDamageType.toLowerCase() !== 'psychic') {
          resisted = true;
          addLog('Bear Totem Rage reduces the damage!', 'info');
        } else if (['bludgeoning', 'piercing', 'slashing'].includes(incomingDamageType.toLowerCase())) {
          resisted = true;
          addLog('Rage reduces the damage!', 'info');
        }
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

      // Knock Prone on hits from certain enemies
      if ((actingEnemy.traits || []).includes('knock-prone')) {
        const dc = actingEnemy.saveDC || 11;
        const save = rollPlayerSavingThrow('strength');
        if (save.total < dc) {
          applyPlayerCondition({
            type: 'prone',
            name: 'Prone',
            description: 'Disadvantage on ranged attacks; melee attackers have advantage.',
            duration: 2,
            source: actingEnemy.name
          });
          addLog(`${character.name} is knocked prone! (Failed STR save ${save.total} vs DC ${dc})`, 'condition');
        }
      }

      return newHp;
    });
  };

  const spendLegendaryAction = (enemyId: string, action: NonNullable<CombatEnemy['legendaryActions']>[number]) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.isDefeated) return;
    const cost = action.cost || 1;
    const remaining = legendaryPoints[enemyId] ?? 0;
    if (remaining < cost) {
      addLog(`${enemy.name} has no legendary actions left for that option.`, 'miss');
      return;
    }
    setLegendaryPoints(prev => ({ ...prev, [enemyId]: Math.max(0, remaining - cost) }));
    addLog(`${enemy.name} spends a legendary action: ${action.name}. ${action.description}`, 'info');
  };

  const applyDamageToEnemy = (
    enemyId: string,
    amount: number,
    damageType: string,
    options?: { isSpell?: boolean; isMagical?: boolean; source?: string; preAdjusted?: boolean }
  ) => {
    setEnemies(prev => prev.map(e => {
      if (e.id !== enemyId) return e;
      const { adjustedDamage, note } = options?.preAdjusted
        ? { adjustedDamage: amount, note: null }
        : adjustDamageForDefenses(e, amount, damageType, options);
      if (note) {
        addLog(`${e.name} ${note}.`, 'info');
      }
      let newHp = Math.max(0, e.currentHp - adjustedDamage);
      if (newHp === 0 && (e.traits || []).includes('undead-fortitude') && e.damageType !== 'radiant') {
        const dc = 5 + adjustedDamage;
        const save = rollDice(20) + getEnemySavingThrowBonus(e, 'constitution');
        if (save >= dc) {
          newHp = 1;
          addLog(`${e.name} clings to undeath! (Undead Fortitude)`, 'condition');
        }
      }

      if (newHp === 0 && !e.isDefeated) {
        // Dark One's Blessing (Warlock - Fiend)
        // "When you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level."
        if (character.class.id === 'warlock' && character.subclass?.id === 'fiend') {
          const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
          const tempAmount = Math.max(1, chaMod + character.level);

          updateCharacter((prevChar) => {
            if (!prevChar) return prevChar;
            const currentTemp = prevChar.temporaryHitPoints || 0;
            // Does not stack, takes higher
            if (tempAmount > currentTemp) {
              addLog(`${prevChar.name} gains ${tempAmount} temporary hit points from the Dark One's Blessing!`, 'heal');
              return { ...prevChar, temporaryHitPoints: tempAmount };
            }
            return prevChar;
          });
        }
      }

      return { ...e, currentHp: newHp, isDefeated: newHp === 0 };
    }));
  };

  const getEnemyEffectiveAC = (enemy: CombatEnemyState) => {
    const isProne = enemy.conditions.some(c => c.type === 'prone');
    return enemy.armorClass - (isProne ? 2 : 0);
  };

  const rollDice = (sides: number = 20) => {
    return Math.floor(Math.random() * sides) + 1;
  };

  const rollDamageFromString = (damage: string) => {
    if (!damage) return 0;
    let total = 0;
    let matched = false;
    const regex = /(\d+)d(\d+)([+-]\d+)?/gi;
    let m;
    while ((m = regex.exec(damage)) !== null) {
      matched = true;
      const count = Number(m[1]);
      const sides = Number(m[2]);
      const mod = m[3] ? Number(m[3]) : 0;
      for (let i = 0; i < count; i++) {
        total += rollDice(sides);
      }
      total += mod;
    }
    if (!matched) {
      const flat = parseInt(damage, 10);
      if (!Number.isNaN(flat)) total += flat;
    }
    return total;
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

    if (updatedEnemy.legendaryActions?.length) {
      setLegendaryPoints(prev => ({ ...prev, [updatedEnemy.id]: 3 }));
      addLog(`${updatedEnemy.name}'s legendary actions refresh.`, 'info');
    }

    let breathReady = enemyBreathReady[updatedEnemy.id] ?? Boolean(updatedEnemy.breathDamage && updatedEnemy.breathType);
    if (updatedEnemy.breathDamage && updatedEnemy.breathType && !breathReady) {
      const recharge = rollDice(6);
      if (recharge >= 5) {
        breathReady = true;
        setEnemyBreathReady(prev => ({ ...prev, [updatedEnemy.id]: true }));
        addLog(`${updatedEnemy.name}'s breath weapon recharges!`, 'info');
      } else {
        addLog(`${updatedEnemy.name}'s breath weapon does not recharge.`, 'info');
      }
    }

    const grappled = updatedEnemy.conditions.some((c) => c.type === 'grappled');
    if (grappled) {
      addLog(`${updatedEnemy.name} struggles against the grapple and cannot act this turn.`, 'condition');
      setEnemies(prev => prev.map(e => e.id === enemyId ? updatedEnemy : e));
      nextTurn();
      return;
    }

    const actingEnemy = updatedEnemy;
    const chosenAction = determineEnemyAction(actingEnemy, character, breathReady, enemies);

    if (!canAct(actingEnemy)) {
      addLog(`${actingEnemy.name} is incapacitated and cannot act!`, 'condition');
      nextTurn();
      return;
    }

    // Prevent multiple enemy turns
    const timeout = setTimeout(() => {
      const resolveAttackAction = (action: EnemyAction | { type: 'breath'; name: string; damage: string; damageType?: string; save?: { ability: string; dc: number; onSave?: string; onFail?: string } }) => {
        const actionAttackBonus = (action as EnemyAction)?.toHit ?? actingEnemy.attackBonus;
        const actionDamageFormula = action.damage || actingEnemy.damage || '1d6+2';
        const actionDamageType = action.damageType || actingEnemy.damageType || detectDamageType(actionDamageFormula);
        const actionName = action.name || actingEnemy.name;

        // Determine Advantage/Disadvantage
        let rollType = getCombatAdvantage(actingEnemy, character, 'melee');
        const aliveAllies = enemies.filter(e => !e.isDefeated && e.id !== actingEnemy.id).length;
        if ((actingEnemy.traits || []).includes('pack-tactics') && aliveAllies > 0) {
          rollType = 'advantage';
        }
        if ((actingEnemy.traits || []).includes('sunlight-sensitivity')) {
          rollType = rollType === 'advantage' ? 'normal' : 'disadvantage';
        }

        // Stealth: Hitting a hidden target has disadvantage
        if (character.conditions.some(c => c.type === 'hidden')) {
          rollType = rollType === 'advantage' ? 'normal' : 'disadvantage';
          addLog(`${character.name} is hidden! Attack is at disadvantage.`, 'info');
        }

        if (actionName) {
          addLog(`${actingEnemy.name} uses ${actionName}.`, 'info');
        }

        // Save-based or breath actions
        const saveBlock = (action as EnemyAction).save || action.save;
        if (saveBlock) {
          const saveAbilityKey = abilityLookup[saveBlock.ability?.toLowerCase() || 'dex'] || 'dexterity';
          const dc = saveBlock.dc || actingEnemy.saveDC || 12;
          const save = rollPlayerSavingThrow(saveAbilityKey as AbilityName);
          let damageRoll = rollDamageFromString(actionDamageFormula);
          if ((actingEnemy.traits || []).includes('brute')) {
            damageRoll += rollDice(6);
          }
          const incomingDamageType = actionDamageType || detectDamageType(actingEnemy.damage || '');
          if (save.total >= dc) {
            const half = Math.floor(damageRoll / 2);
            addLog(saveBlock.onSave || `${character.name} succeeds on ${saveAbilityKey.toUpperCase()} save (${save.total} vs DC ${dc}).`, 'info');
            addLog(`${actingEnemy.name} ${t('combat.hits')} ${character.name} ${t('combat.for')} ${half} ${t('combat.damage')}!`, 'damage');
            applyEnemyDamageToPlayer(actingEnemy, half, incomingDamageType);
          } else {
            addLog(saveBlock.onFail || `${character.name} fails ${saveAbilityKey.toUpperCase()} save (${save.total} vs DC ${dc}).`, 'miss');
            addLog(`${actingEnemy.name} ${t('combat.hits')} ${character.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage');
            applyEnemyDamageToPlayer(actingEnemy, damageRoll, incomingDamageType);
          }
          if (action.type === 'breath') {
            setEnemyBreathReady(prev => ({ ...prev, [actingEnemy.id]: false }));
          }
          return;
        }

        let attackRoll = rollDice(20);

        if (rollType === 'advantage') {
          attackRoll = Math.max(attackRoll, rollDice(20));
          addLog(`${actingEnemy.name} attacks with advantage!`, 'info');
        } else if (rollType === 'disadvantage') {
          attackRoll = Math.min(attackRoll, rollDice(20));
          addLog(`${actingEnemy.name} attacks with disadvantage.`, 'info');
        }

        const totalAttack = attackRoll + actionAttackBonus;

        // Player AC Calculation
        // Player AC Calculation
        // Use centralized AC calculation which handles Unarmored Defense (Barbarian/Monk)
        const baseAC = calculateArmorClass(character);
        const playerAC = baseAC + getPlayerDefenseBonus() - (character.fightingStyle === 'Defense' ? 1 : 0); // subtract 1 if calculateArmorClass includes it, avoiding double count if getPlayerDefenseBonus also does?
        // Wait, calculateArmorClass ALREADY includes Fighting Style 'Defense'.
        // Let's check getPlayerDefenseBonus implementation.
        const effectiveAC = wildShapeActive ? WOLF_STATS.ac : playerAC;

        if (totalAttack >= effectiveAC) {
          if (playerHp <= 0 && !wildShapeActive) {
            addLog(`${actingEnemy.name} attacks your unconscious body!`, 'damage');
            recordDeathSave(false);
            recordDeathSave(false);
            if ((character.deathSaves?.failures || 0) + 2 >= 3) {
              addLog(`${character.name} has succumbed to their wounds.`, 'defeat');
            }
          } else {
            let damageRoll = rollDamageFromString(actionDamageFormula);
            if ((actingEnemy.traits || []).includes('brute')) {
              damageRoll += rollDice(6);
            }
            addLog(`${actingEnemy.name} ${t('combat.hits')} ${character.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage');

            const incomingDamageType = actionDamageType || detectDamageType(actingEnemy.damage || '');
            applyEnemyDamageToPlayer(actingEnemy, damageRoll, incomingDamageType);
          }
        } else {
          addLog(`${actingEnemy.name} ${t('combat.attacks')} ${character.name} ${t('combat.butMisses')}`, 'miss');
        }
      };

      // Multiattack handling: run multiple listed attacks if present
      if (chosenAction && (chosenAction.type === 'special' || chosenAction.name?.toLowerCase().includes('multiattack')) && (actingEnemy.actions || []).length > 1) {
        const otherAttacks = (actingEnemy.actions || []).filter(a => a !== chosenAction && (a.damage || a.toHit !== undefined || a.save));
        if (otherAttacks.length) {
          otherAttacks.slice(0, 2).forEach((action) => resolveAttackAction(action));
        } else {
          resolveAttackAction(chosenAction);
        }
      } else {
        resolveAttackAction(chosenAction || { name: actingEnemy.name, damage: actingEnemy.damage || '1d6+2', damageType: actingEnemy.damageType });
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
    let targetAC = getEnemyEffectiveAC(enemy);
    if ((enemy.traits || []).includes('nimble-escape')) {
      targetAC += 2;
    }

    setAttackDetails({ name: 'Grapple (Athletics)', dc: targetAC, modifier });
    setIsRolling(true);
    setShowDiceModal(true);

    const baseRoll = rollDice(20);
    const roll = applyHalflingLucky(baseRoll, 'grapple (Athletics)');
    const total = roll + modifier;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC) {
        if (isEnemyConditionImmune(enemy, 'grappled')) {
          addLog(`${enemy.name} cannot be grappled.`, 'miss');
        } else {
          addLog(`${character.name} grapples ${enemy.name}! They lose their next action.`, 'condition');
          const grappleCondition: Condition = {
            type: 'grappled',
            name: 'Grappled',
            description: 'Creature speed becomes 0.',
            duration: 1,
            source: 'Grapple'
          };
          setEnemies(prev => prev.map(e => e.id === enemy.id ? { ...e, conditions: [...e.conditions, grappleCondition] } : e));
        }
      } else {
        addLog(`${character.name} fails to grapple ${enemy.name}.`, 'miss');
      }
      nextTurn();
    });
  };



  const parseDice = (formula: string) => {
    const cleaned = formula.toLowerCase().replace(/[^0-9d+]/g, '') || '1d6';
    const [dicePart, modifierPart] = cleaned.split('+');
    const [countStr, sidesStr] = (dicePart || '1d6').split('d');
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

    const weaponProps = character.equippedWeapon?.properties || [];
    const isRanged = weaponProps.includes('ranged');
    let rollType = getCombatAdvantage(character, enemy, isRanged ? 'ranged' : 'melee');

    // Stealth Advantage Logic
    const isHidden = character.conditions.some(c => c.type === 'hidden');
    if (isHidden) {
      if (rollType === 'disadvantage') rollType = 'normal'; // Cancel out
      else rollType = 'advantage';
      addLog(`${character.name} attacks from the shadows! (Advantage)`, 'info');
      // Remove hidden condition after attack logic checks (handled in pending action or immediately? 
      // Strictly, you are no longer hidden *after* the attack hits/misses, but for advantage calc it matters now.
      // We should queue removal.)
    }
    if ((enemy.traits || []).includes('sunlight-sensitivity')) {
      if (rollType === 'disadvantage') {
        // cancel out
        // no change
      } else {
        rollType = 'advantage';
      }
    }

    const abilityMod = Math.floor((character.abilityScores.strength - 10) / 2); // Default Strength
    // Finesse check
    const isFinesse = weaponProps.includes('finesse');
    const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);

    const isMonk = character.class.name.toLowerCase() === 'monk';
    const isSimpleWeapon = character.equippedWeapon?.type.includes('Simple');
    const useDex = isFinesse || isRanged || (isMonk && (isSimpleWeapon || !character.equippedWeapon));
    const isUsingStrength = !useDex;

    let attackModifier = (useDex ? dexMod : abilityMod) + character.proficiencyBonus;
    let damageDice = character.equippedWeapon?.damage || '1d4';
    let damageBonus = useDex ? dexMod : abilityMod;
    const weaponDamageType = detectDamageType(character.equippedWeapon?.damage || damageDice || '');
    const isMagicalWeapon = (character.equippedWeapon?.properties || []).includes('magic');

    // Fighting Styles
    if (character.fightingStyle === 'Archery' && isRanged) {
      attackModifier += 2;
    }
    const isTwoHanded = weaponProps.includes('two-handed') || weaponProps.includes('heavy');
    if (character.fightingStyle === 'Dueling' && !isRanged && !isTwoHanded) {
      damageBonus += 2;
    }
    const versatileBonus = weaponProps.find(p => p.startsWith('versatile-'));
    if (versatileBonus) {
      const altDie = versatileBonus.split('-')[1];
      // If no shield and no offhand already used, use versatile die
      if (!character.equippedArmor?.name?.toLowerCase().includes('shield')) {
        damageDice = `1${altDie}`;
      }
    }

    const rollWeaponDamage = (formula: string, includeModifier: boolean = true) => {
      const [dicePart, modifierPart] = formula.split('+');
      const [countStr, sidesStr] = dicePart.split('d');
      const count = parseInt(countStr || '1', 10);
      const sides = parseInt(sidesStr || '6', 10);
      const modifier = includeModifier ? parseInt(modifierPart || '0', 10) : 0;
      let total = modifier;
      for (let i = 0; i < count; i++) {
        let roll = rollDice(sides);
        if (character.fightingStyle === 'Great Weapon Fighting' && isTwoHanded && !isRanged && roll <= 2) {
          roll = rollDice(sides);
        }
        total += roll;
      }
      return total;
    };

    // Pact of the Blade bonus to weapon attacks
    if (character.pactBoon === 'Pact of the Blade') {
      attackModifier += 1;
      damageBonus += 1;
    }

    // Check attacks left
    // Note: attacksLeft state should be checked before starting UI, but we do it here too?
    // Actually we should prevent the function call if 0, but let's handle decrement inside the success callback.

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
    roll = applyHalflingLucky(roll, 'attack roll');

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
        let damageRoll = rollWeaponDamage(damageDice, true) + damageBonus;

        if (rageActive && !isRanged && isUsingStrength) {
          damageRoll += 2;
          addLog('Rage Damage Bonus! (+2)', 'info');
        }
        if (isCritical) {
          damageRoll += rollWeaponDamage(damageDice, false); // Crit adds extra dice

          // Half-Orc Savage Attacks
          if ((character.race?.traits || []).includes('Savage Attacks')) {
            damageRoll += rollWeaponDamage(damageDice, false);
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

        // Paladin Divine Smite
        if (divineSmiteActive && isPaladin) {
          // Find highest available slot level? Or just level 1?
          // For MVP, we use Level 1.
          const slotLevel = 1;
          const slotPool = character.spellSlots?.[slotLevel];
          if (slotPool && slotPool.current > 0) {
            const spent = spendSpellSlot(slotLevel);
            if (spent) {
              let smiteDice = 2; // 2d8 for 1st level
              // Add +1d8 for Undead/Fiend
              const type = (enemy.creatureType || '').toLowerCase();
              if (type.includes('undead') || type.includes('fiend')) {
                smiteDice += 1;
                addLog('Divine Smite hits an Undead/Fiend! (+1d8)', 'info');
              }
              let smiteDamage = 0;
              for (let i = 0; i < smiteDice; i++) smiteDamage += rollDice(8);

              if (isCritical) {
                for (let i = 0; i < smiteDice; i++) smiteDamage += rollDice(8);
                addLog('Divine Smite Critical!', 'info');
              }

              damageRoll += smiteDamage;
              addLog(`Divine Smite! (+${smiteDamage} radiant damage)`, 'info');
              setDivineSmiteActive(false); // Consume toggle
            }
          } else {
            addLog('Divine Smite failed! No Level 1 slots available.', 'miss');
            setDivineSmiteActive(false);
          }
        }

        // Colossus Slayer (Ranger - Hunter)
        if (character.class.id === 'ranger' && character.subclass?.id === 'hunter') {
          if (enemy.currentHp < enemy.maxHp) {
            const csDamage = rollDice(8);
            damageRoll += csDamage;
            addLog(`Colossus Slayer! (+${csDamage} damage)`, 'info');
          }
        }

        const damageType = weaponDamageType || detectDamageType(enemy.damage || '');
        const { adjustedDamage, note } = adjustDamageForDefenses(enemy, damageRoll, damageType, { isMagical: isMagicalWeapon });
        addLog(`${character.name} hits ${enemy.name} for ${adjustedDamage} damage!`, 'damage');
        if (note) {
          addLog(`${enemy.name} ${note}.`, 'info');
        }
        applyDamageToEnemy(enemy.id, adjustedDamage, damageType, { preAdjusted: true });
      } else {
        addLog(`${character.name} misses ${enemy.name}.`, 'miss');
      }

      // Remove Hidden Condition if present
      if (isHidden) {
        updateCharacter(prev => ({
          ...prev,
          conditions: prev.conditions.filter(c => c.type !== 'hidden')
        }));
        addLog(`${character.name} reveals their position!`, 'info');
      }

      setAttacksLeft(prev => {
        const remaining = prev - 1;
        if (remaining > 0) {
          addLog(`You have ${remaining} attack(s) remaining!`, 'info');
          return remaining;
        }
        nextTurn();
        return 0;
      });
    });
  };

  const handleOffhandAttack = () => {
    if (!offhandAvailable || !selectedEnemy || isRolling) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const offhand = getOffhandWeapon();
    if (!offhand) {
      addLog('No light weapon available for an off-hand attack.', 'miss');
      return;
    }
    const weaponProps = offhand.properties || [];
    const isLight = weaponProps.includes('light');
    if (!isLight) {
      addLog('Off-hand attack requires a light weapon.', 'miss');
      return;
    }
    const isRanged = weaponProps.includes('ranged');
    const isTwoHanded = weaponProps.includes('two-handed') || weaponProps.includes('heavy');
    if (isTwoHanded) {
      addLog('Off-hand attack not available with two-handed/heavy weapons.', 'miss');
      return;
    }

    const rollType = getCombatAdvantage(character, enemy, isRanged ? 'ranged' : 'melee');
    const abilityMod = Math.floor((character.abilityScores.strength - 10) / 2);
    const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
    const isFinesse = weaponProps.includes('finesse');
    const useDex = isFinesse || isRanged;
    const attackModifier = (useDex ? dexMod : abilityMod) + character.proficiencyBonus;
    const damageDice = offhand.damage || '1d4';
    const offhandDamageType = detectDamageType(offhand.damage || damageDice);
    const isMagicalOffhand = (offhand.properties || []).includes('magic');

    const rollWeaponDamage = (formula: string) => {
      const [dicePart] = formula.split('+');
      const [countStr, sidesStr] = dicePart.split('d');
      const count = parseInt(countStr || '1', 10);
      const sides = parseInt(sidesStr || '6', 10);
      let total = 0; // off-hand: no ability mod to damage
      for (let i = 0; i < count; i++) {
        total += rollDice(sides);
      }
      return total;
    };

    const targetAC = getEnemyEffectiveAC(enemy);
    setAttackDetails({ name: 'Off-Hand Attack', dc: targetAC, modifier: attackModifier });
    setIsRolling(true);
    setShowDiceModal(true);

    const r1 = rollDice(20);
    const r2 = rollDice(20);
    let roll = r1;
    if (rollType === 'advantage') roll = Math.max(r1, r2);
    if (rollType === 'disadvantage') roll = Math.min(r1, r2);
    roll = applyHalflingLucky(roll, 'off-hand attack');
    const total = roll + attackModifier;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC || isCritical) {
        let damageRoll = rollWeaponDamage(damageDice);
        if (isCritical) {
          damageRoll += rollWeaponDamage(damageDice);
        }
        const { adjustedDamage, note } = adjustDamageForDefenses(enemy, damageRoll, offhandDamageType, { isMagical: isMagicalOffhand });
        addLog(`${character.name} hits ${enemy.name} with an off - hand attack using ${offhand.name} for ${adjustedDamage} damage!`, 'damage');
        if (note) addLog(`${enemy.name} ${note}.`, 'info');
        applyDamageToEnemy(enemy.id, adjustedDamage, offhandDamageType, { preAdjusted: true });
      } else {
        addLog(`${character.name} misses ${enemy.name} with the off - hand attack.`, 'miss');
      }
      setOffhandAvailable(false);
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

    // Wild Magic Surge (Sorcerer)
    if (character.class.id === 'sorcerer' && character.subclass?.id === 'wild-magic' && !isCantrip) {
      // "Immediately after you cast a sorcerer spell of 1st level or higher, the DM can have you roll a d20."
      // We auto-roll for fun.
      const surgeRoll = rollDice(20);
      if (surgeRoll === 1) {
        addLog('Wild Magic Surge triggered! (Rolled 1 on d20)', 'info');
        // Simplified Effect for MVP:
        const effectRoll = rollDice(4);
        let effectMsg = "";
        if (effectRoll === 1) effectMsg = "You verify gravity still works.";
        else if (effectRoll === 2) effectMsg = "You teleport 20ft significantly.";
        else if (effectRoll === 3) effectMsg = "A flumph appears nearby.";
        else effectMsg = "You regain 5 HP.";

        addLog(`Surge Effect: ${effectMsg}`, 'info');
        if (effectRoll === 4) {
          setPlayerHp(prev => Math.min(character.maxHitPoints, prev + 5));
        }
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
        addLog(`Agonizing Blast!(+${charismaMod} damage)`, 'info');
      }

      // Warlock: Hex Damage (Spells)
      const targetEnemy = enemies.find(e => e.id === selectedEnemy);
      if (targetEnemy && targetEnemy.conditions.some(c => c.type === 'hexed') && (spell.damage || spell.level === 0)) {
        const hexDamage = rollDice(6);
        finalDamage += hexDamage;
        addLog(`Hex!(+${hexDamage} necrotic damage)`, 'info');
      }

      let saveMessage = '';

      // Handle Saving Throw
      if (spell.saveType) {
        let spellDC = getSpellSaveDC(character);
        if (character.pactBoon === 'Pact of the Tome') {
          spellDC += 1;
        }
        const enemy = enemies.find(e => e.id === selectedEnemy);
        if (enemy) {
          const saveRoll = rollDice(20);
          const saveTotal = saveRoll + getEnemySavingThrowBonus(enemy, spell.saveType);
          if (saveTotal >= spellDC) {
            finalDamage = Math.floor(damageTotal / 2);
            saveMessage = ` (Saved! Rolled ${saveTotal} vs DC ${spellDC})`;
          } else {
            saveMessage = ` (Failed Save! Rolled ${saveTotal} vs DC ${spellDC})`;
          }
        }
      }

      const targetEnemyData = enemies.find(e => e.id === selectedEnemy);
      const damageType = spell.damageType || detectDamageType(spell.damage || spell.name || '');
      if (targetEnemyData) {
        const { adjustedDamage, note } = adjustDamageForDefenses(targetEnemyData, finalDamage, damageType, { isSpell: true, isMagical: true });
        finalDamage = adjustedDamage;
        if (note) {
          addLog(`${targetEnemyData.name} ${note}.`, 'info');
        }
      }

      // Apply damage
      if (targetEnemyData) {
        applyDamageToEnemy(targetEnemyData.id, finalDamage, damageType, { preAdjusted: true });
      }

      addLog(`${character.name} casts ${spell.name} on ${targetEnemyData?.name} for ${finalDamage} ${spell.damageType} damage!${saveMessage} `, 'damage');

    } else if (spell.healing) {
      // Healing Spell
      let healTotal = parseDice(damageOrHealingFormula || spell.healing);
      healTotal += abilityMod;
      if (character.sorcerousOrigin === 'Divine Soul') {
        healTotal += 2;
      }

      setPlayerHp(prev => Math.min(character.maxHitPoints, prev + healTotal));
      updateCharacter(prev => ({ ...prev, hitPoints: Math.min(character.maxHitPoints, prev.hitPoints + healTotal) }));
      addLog(`${character.name} casts ${spell.name} and heals for ${healTotal} HP!`, 'heal');

    } else if (spell.id === 'shield') {
      const shieldBonus = 5;
      setActiveBuffs(prev => [...prev.filter(b => b.id !== 'shield-spell'), { id: 'shield-spell', name: 'Shield', bonus: shieldBonus, duration: 1 }]);
      addLog(`${character.name} casts Shield!(+5 AC)`, 'info');

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

    if (character.conditions.some(c => c.type === 'hidden')) {
      updateCharacter(prev => ({
        ...prev,
        conditions: prev.conditions.filter(c => c.type !== 'hidden')
      }));
      addLog(`${character.name} reveals their position by casting a spell!`, 'info');
    }

    setShowSpellMenu(false);
    nextTurn();
  };

  const handleDeathSave = () => {
    setAttackDetails({ name: 'Death Save', dc: 10, modifier: 0 });
    setIsRolling(true);
    setShowDiceModal(true);

    const baseRoll = rollDice(20);
    const roll = applyHalflingLucky(baseRoll, 'death saving throw');
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
        addLog(`${character.name} suffers a critical failure on death save!(2 failures)`, 'damage');
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
    const baseInitRoll = Math.floor(Math.random() * 20) + 1;
    const initRoll = applyHalflingLucky(baseInitRoll, 'initiative');
    let playerInitiative = initRoll + Math.floor((character.abilityScores.dexterity - 10) / 2);

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

    if (currentEntity && currentEntity.id === 'player') {
      setOffhandAvailable(true);
      setSneakAttackUsedThisTurn(false);
      setAttacksLeft(maxAttacks);
      setRecklessAttackActive(false); // Reset Reckless at start of turn (player must choose to use it again)

      // Decrement Player Condition Durations
      updateCharacter(prev => {
        if (!prev) return prev;
        const updatedConditions = prev.conditions.map(c => {
          if (typeof c.duration === 'number' && c.duration > 0) {
            return { ...c, duration: c.duration - 1 };
          }
          return c;
        }).filter(c => c.duration === undefined || c.duration !== 0); // Keep indefinite (-1) and positive. Remove 0.

        // Also check if any expired condition needs logging?
        // Ideally we'd log "Metamagic expired" or "Reckless stance ends", but for now just cleanup.
        return { ...prev, conditions: updatedConditions };
      });

      addLog(`Your turn! You have ${maxAttacks} attack(s).`, 'info');
    }
  }, [currentTurnIndex, turnOrder, maxAttacks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for combat end
  useEffect(() => {
    const allEnemiesHandled = enemies.every(e => e.isDefeated || e.conditions.some(c => c.type === 'pacified'));
    if (allEnemiesHandled && enemies.length > 0 && !victoryAchieved) {
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
    persistFeatureUses({ secondWind: false });
    addLog(`${character.name} uses Second Wind and regains ${totalHeal} HP.`, 'heal');
  };

  const handleActionSurge = () => {
    if (!actionSurgeAvailable) return;
    setActionSurgeAvailable(false);
    persistFeatureUses({ actionSurge: false });
    addLog(`${character.name} uses Action Surge! You gain extra attacks.`, 'info');
    setAttacksLeft(prev => prev + maxAttacks);
  };

  const handleRage = () => {
    if (!rageAvailable || rageActive) return;
    setRageAvailable(prev => prev - 1);
    persistFeatureUses({ rage: Math.max(0, rageAvailable - 1) });
    setRageActive(true);
    setRageRoundsLeft(10); // 1 minute
    addLog(`${character.name} enters a Rage!`, 'info');
    // Visual effect could be added here
  };

  const handleFrenziedStrike = () => {
    if (!selectedEnemy || isRolling || !rageActive) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const weapon = character.equippedWeapon || { name: 'Unarmed Strike', damage: '1+0', type: 'weapon', properties: [] };
    const strMod = Math.floor((character.abilityScores.strength - 10) / 2);
    const prof = character.proficiencyBonus;
    const attackBonus = strMod + prof + (character.formattedAttackBonus || 0); // Simplified

    // Rage Damage Bonus
    const rageBonus = 2; // +2 damage while raging (simplified, increases at higher levels)

    // Roll
    setAttackDetails({ name: 'Frenzied Strike', dc: getEnemyEffectiveAC(enemy), modifier: attackBonus });
    setIsRolling(true);
    setShowDiceModal(true);

    const roll = applyHalflingLucky(rollDice(20), 'frenzied strike');
    const total = roll + attackBonus;
    const isCritical = roll === 20;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure: roll === 1 });

    setPendingCombatAction(() => () => {
      if (total >= getEnemyEffectiveAC(enemy) || isCritical) {
        let dmg = rollDamageFromString(weapon.damage || '1') + strMod + rageBonus;
        if (isCritical) {
          dmg += rollDamageFromString(weapon.damage || '1');
          if ((character.race?.traits || []).includes('Savage Attacks')) {
            dmg += rollDamageFromString(weapon.damage || '1');
          }
        }

        const damageType = detectDamageType(weapon.damage || '');
        const { adjustedDamage, note } = adjustDamageForDefenses(enemy, dmg, damageType, { isMagical: (weapon.properties || []).includes('magic') });

        applyDamageToEnemy(enemy.id, adjustedDamage, damageType, { preAdjusted: true });
        addLog(`${character.name} hits with a Frenzied Strike for ${adjustedDamage} damage!`, 'damage');
        if (note) addLog(`${enemy.name} ${note}.`, 'info');
      } else {
        addLog(`${character.name} misses with Frenzied Strike.`, 'miss');
      }
      nextTurn();
    });
  };

  const handleBardicInspiration = () => {
    if (!inspirationAvailable || hasInspirationDie) return;
    setInspirationAvailable(prev => prev - 1);
    persistFeatureUses({ bardicInspiration: Math.max(0, inspirationAvailable - 1) });
    setHasInspirationDie(true);
    addLog(`${character.name} uses Bardic Inspiration! You gain a d6 inspiration die.`, 'info');
  };

  const handleWildShape = () => {
    if (!wildShapeAvailable || wildShapeActive) return;
    setWildShapeAvailable(prev => prev - 1);
    persistFeatureUses({ wildShape: Math.max(0, wildShapeAvailable - 1) });
    setWildShapeActive(true);
    setWildShapeHp(WOLF_STATS.maxHp);
    addLog(`${character.name} transforms into a Wolf!`, 'info');
  };

  const handleMetamagic = (action: 'empowered' | 'quickened' | 'create_slot') => {
    if (sorceryPoints <= 0) return;

    if (action === 'empowered') {
      if (sorceryPoints < 1) return;
      setSorceryPoints(prev => prev - 1);
      persistFeatureUses({ sorceryPoints: Math.max(0, sorceryPoints - 1) });
      setEmpoweredSpellUsed(true);
      addLog(`${character.name} uses Empowered Spell! Next spell damage will be boosted.`, 'info');
    } else if (action === 'quickened') {
      if (sorceryPoints < 2) return;
      setSorceryPoints(prev => prev - 2);
      persistFeatureUses({ sorceryPoints: Math.max(0, sorceryPoints - 2) });
      addLog(`${character.name} uses Quickened Spell! (Mechanic: Cast as Bonus Action)`, 'info');
    } else if (action === 'create_slot') {
      if (sorceryPoints < 2) return;
      // Restore a level 1 slot
      if (character.spellSlots && character.spellSlots[1]) {
        if (character.spellSlots[1].current < character.spellSlots[1].max) {
          setSorceryPoints(prev => prev - 2);
          persistFeatureUses({ sorceryPoints: Math.max(0, sorceryPoints - 2) });
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
      persistFeatureUses({ channelDivinity: Math.max(0, channelDivinityUses - 1) });
      addLog(`${character.name} presents their holy symbol to Turn Undead!`, 'info');

      // Apply to all undead enemies
      // Simplified: For now, we don't have enemy types, so we'll apply to selected enemy or log effect
      if (selectedEnemy) {
        const enemy = enemies.find(e => e.id === selectedEnemy);
        if (enemy) {
          if (enemy.creatureType && !enemy.creatureType.toLowerCase().includes('undead')) {
            addLog(`${enemy.name} is not undead and shrugs off the holy symbol.`, 'miss');
            return;
          }
          // Simulate Wisdom Save
          const saveDC = 8 + character.proficiencyBonus + Math.floor((character.abilityScores.wisdom - 10) / 2);
          const saveRoll = rollDice(20) + getEnemySavingThrowBonus(enemy, 'wisdom');

          if (saveRoll < saveDC) {
            const turnedCondition: Condition = {
              type: 'turned',
              name: 'Turned',
              description: 'Must spend turns trying to move as far away as possible.',
              duration: 10, // 1 minute
              source: 'Turn Undead'
            };
            if (isEnemyConditionImmune(enemy, 'turned')) {
              addLog(`${enemy.name} is immune to being turned.`, 'miss');
            } else {
              setEnemies(prev => prev.map(e => e.id === selectedEnemy ? { ...e, conditions: [...e.conditions, turnedCondition] } : e));
              addLog(`${enemy.name} is Turned! (Failed save ${saveRoll} vs DC ${saveDC})`, 'condition');
            }
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
      persistFeatureUses({ channelDivinity: Math.max(0, channelDivinityUses - 1) });
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
    persistFeatureUses({ layOnHands: Math.max(0, layOnHandsPool - healAmount) });
    setPlayerHp(prev => prev + healAmount);
    updateCharacter(prev => ({ ...prev, hitPoints: prev.hitPoints + healAmount }));
    addLog(`${character.name} uses Lay on Hands to heal ${healAmount} HP.`, 'heal');
  };

  const handleKiAction = (action: 'flurry' | 'defense' | 'step') => {
    if (kiPoints <= 0) return;
    setKiPoints(prev => prev - 1);
    persistFeatureUses({ kiPoints: Math.max(0, kiPoints - 1) });

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
          const roll1 = applyHalflingLucky(rollDice(20), 'flurry attack');
          if (roll1 + attackBonus >= getEnemyEffectiveAC(enemy)) {
            hit1 = true;
            dmg1 = rollDice(4) + mod; // Martial Arts die d4
          }

          // Attack 2
          let hit2 = false;
          let dmg2 = 0;
          const roll2 = applyHalflingLucky(rollDice(20), 'flurry attack');
          if (roll2 + attackBonus >= getEnemyEffectiveAC(enemy)) {
            hit2 = true;
            dmg2 = rollDice(4) + mod;
          }

          // Apply damage
          const totalDmg = dmg1 + dmg2;
          if (totalDmg > 0) {
            const damageType = 'bludgeoning';
            const { adjustedDamage, note } = adjustDamageForDefenses(enemy, totalDmg, damageType, { isMagical: false });
            applyDamageToEnemy(enemy.id, adjustedDamage, damageType, { preAdjusted: true });
            addLog(`Flurry hits for ${adjustedDamage} damage! (${hit1 ? dmg1 : 'miss'} + ${hit2 ? dmg2 : 'miss'})`, 'damage');
            if (note) addLog(`${enemy.name} ${note}.`, 'info');

            // Open Hand Technique (Monk)
            if (character.subclass?.id === 'open-hand') {
              const dc = 8 + character.proficiencyBonus + Math.floor((character.abilityScores.wisdom - 10) / 2);
              const save = rollDice(20) + getEnemySavingThrowBonus(enemy, 'dexterity');
              if (save < dc) {
                addLog(`${enemy.name} fails DEX save (DC ${dc}) and is knocked Prone!`, 'condition');
                setEnemies(prev => prev.map(e => {
                  if (e.id !== enemy.id) return e;
                  const prone: Condition = { type: 'prone', name: 'Prone', description: 'Knocked prone by Open Hand.', duration: 1, source: 'Flurry' };
                  return { ...e, conditions: [...e.conditions, prone] };
                }));
              } else {
                addLog(`${enemy.name} succeeds DEX save (DC ${dc}) against Open Hand technique.`, 'info');
              }
            }
          } else {
            addLog(`Flurry of Blows missed both attacks.`, 'miss');
          }
          nextTurn();
        }
      }
    }
  };

  const consumeItem = (itemId: string) => {
    updateCharacter(prev => {
      if (!prev || !prev.inventory) return prev;
      return {
        ...prev,
        inventory: prev.inventory.filter(i => i.id !== itemId)
      };
    });
  };

  const handleUsePotion = (item: Item) => {
    if (item.type !== 'potion') return;

    if (item.name.toLowerCase().includes('healing') || item.healing) {
      const healAmount = item.healing || rollDice(4) + 2;
      setPlayerHp(prev => Math.min(character.maxHitPoints, prev + healAmount));
      updateCharacter(prev => ({ ...prev, hitPoints: Math.min(character.maxHitPoints, prev.hitPoints + healAmount) }));
      addLog(`${character.name} drinks ${item.name} and heals for ${healAmount} HP.`, 'heal');
    } else if (item.name.toLowerCase().includes('speed')) {
      addLog(`${character.name} drinks ${item.name}! Speed increased.`, 'info');
    } else if (item.name.toLowerCase().includes('invisibility')) {
      applyPlayerCondition({ type: 'invisible', name: 'Invisible', description: 'Attackers have disadvantage.', duration: 10, source: item.name });
      addLog(`${character.name} drinks ${item.name} and becomes invisible!`, 'info');
    } else {
      addLog(`${character.name} drinks ${item.name}.`, 'info');
    }

    consumeItem(item.id);
    setShowInventory(false);
  };

  const handleUseScroll = (item: Item) => {
    if (item.type !== 'scroll' || !item.spellId) {
      addLog(`Cannot use ${item.name}.`, 'miss');
      return;
    }

    addLog(`${character.name} reads ${item.name}!`, 'spell');
    handleCastSpell(item.spellId, { fromScroll: true, bypassPreparation: true });
    consumeItem(item.id);
    setShowInventory(false);
  };

  const handleCunningAction = (actionType: 'dash' | 'disengage' | 'hide') => {
    addLog(`${character.name} uses Cunning Action to ${actionType}!`, 'info');
    // Implement specific logic if needed, e.g., Disengage prevents opportunity attacks (not implemented yet)
    // Hide could require a stealth check.
    if (actionType === 'hide') {
      // Simple hide logic
      const stealthRoll = applyHalflingLucky(rollDice(20), 'stealth check') + Math.floor((character.abilityScores.dexterity - 10) / 2) + (character.skills?.stealth?.proficient ? 2 : 0);
      addLog(`Stealth Check: ${stealthRoll}`, 'info');
    }
  };

  const handleShove = () => {
    if (!selectedEnemy) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy) return;

    const athleticsCheck = applyHalflingLucky(rollDice(20), 'shove (Athletics)') + Math.floor((character.abilityScores.strength - 10) / 2) + (character.skills?.athletics?.proficient ? 2 : 0);
    const enemyAthletics = rollDice(20) + (enemy.skills?.athletics ?? enemy.attackBonus ?? 0); // Simplified enemy check using skills if available

    if (athleticsCheck > enemyAthletics) {
      if (isEnemyConditionImmune(enemy, 'prone')) {
        addLog(`${enemy.name} cannot be knocked prone.`, 'miss');
      } else {
        addLog(`${character.name} shoves ${enemy.name} prone!`, 'condition');
        const proneCondition: Condition = {
          type: 'prone',
          name: 'Prone',
          description: 'Disadvantage on attack rolls. Attackers have advantage on melee attacks.',
          duration: 1,
          source: 'Shove'
        };
        setEnemies(prev => prev.map(e => e.id === enemy.id ? { ...e, conditions: [...e.conditions, proneCondition] } : e));
      }
    } else {
      addLog(`${character.name} fails to shove ${enemy.name}.`, 'miss');
    }
    nextTurn();
  };

  const handleBreathWeapon = () => {
    const ancestry = character.draconicAncestry;
    const damageType = ancestry?.damageType || 'Fire';
    const shape = ancestry?.breathCone ? 'cone' : 'line';
    const normalizedType = damageType.toLowerCase();

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

      const { adjustedDamage, note } = adjustDamageForDefenses(enemy, damageTaken, normalizedType, { isSpell: true, isMagical: true });
      const newHp = Math.max(0, enemy.currentHp - adjustedDamage);
      if (note) addLog(`${enemy.name} ${note}.`, 'info');
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

  const getEnemyPassivePerception = (enemy: CombatEnemy) => {
    // 10 + Perception Mod
    const wisMod = getEnemyAbilityMod(enemy, 'wisdom');
    const perceptionBonus = enemy.skills?.perception ? (parseInt(enemy.skills.perception.toString()) || 0) : 0;
    // If skills.perception is just a number in the JSON (simplified), or if it's a structured object we might need more checks.
    // Assuming for now it matches the type definition or is a direct number if simplified.
    // If 'skills' is Record<string, number>, we use it.
    // If checking `skills` type from enemies.ts/types:
    // It seems `skills` in CombatEnemy is `Record<string, number> | undefined` based on typical usage, 
    // but definitions say `Skills` is `Record<SkillName, SkillProficiency>`.
    // Let's assume for enemies it might be simplified or we just use Wis mod if complex.
    // SAFETY: Use Wis Mod as baseline, add any explicit bonus if we can find it.
    return 10 + wisMod + perceptionBonus;
  };

  const handleHide = () => {
    if (isRolling) return;

    // Check against highest passive perception of active enemies
    let maxPassive = 0;
    enemies.forEach(e => {
      if (!e.isDefeated) {
        const pp = getEnemyPassivePerception(e);
        if (pp > maxPassive) maxPassive = pp;
      }
    });

    if (maxPassive === 0) maxPassive = 10; // Fallback

    const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
    const isProficient = character.skills?.stealth?.proficient;
    const bonus = dexMod + (isProficient ? character.proficiencyBonus : 0);
    const hasDisadvantage = (character.equippedArmor?.type === 'heavy' || character.equippedArmor?.stealthDisadvantage);
    // Simplified armor check

    let roll = rollDice(20);
    if (hasDisadvantage) {
      roll = Math.min(roll, rollDice(20));
      addLog('Rolling Stealth with Disadvantage (Armor)', 'info');
    }
    roll = applyHalflingLucky(roll, 'stealth check');
    const total = roll + bonus;

    setAttackDetails({ name: 'Stealth check', dc: maxPassive, modifier: bonus });
    setIsRolling(true);
    setShowDiceModal(true);
    setDiceResult(roll);
    setRollResult({ roll, total, isCritical: roll === 20, isCriticalFailure: roll === 1 });

    setPendingCombatAction(() => () => {
      if (total >= maxPassive) {
        const hiddenCondition: Condition = {
          type: 'hidden',
          name: 'Hidden',
          description: 'Unseen and unheard. Attacks have advantage.',
          duration: -1,
          source: 'Hide Action'
        };
        applyPlayerCondition(hiddenCondition);
        addLog(`${character.name} slips into the shadows and is Hidden! (${total} vs PP ${maxPassive})`, 'info');
      } else {
        addLog(`${character.name} tries to hide but is spotted! (${total} vs PP ${maxPassive})`, 'miss');
      }
      nextTurn();
    });
  };

  const handleSpeak = () => {
    if (!selectedEnemy || isRolling) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy) return;

    if (enemy.isDefeated) return;
    if (analyzedEnemies.has(enemy.id) && enemy.conditions.some(c => c.type === 'pacified')) {
      addLog(`${enemy.name} is already pacified.`, 'info');
      return;
    }

    // 1. Check Languages
    // Default to 'Common' if not specified
    const enemyLanguages = (enemy.languages || ['Common']).map(l => l.toLowerCase());
    const playerLanguages = (character.languages || ['Common']).map(l => l.toLowerCase());

    const sharedLanguage = playerLanguages.find(l => enemyLanguages.includes(l));

    if (!sharedLanguage) {
      addLog(`${character.name} tries to speak to the ${enemy.name}, but you share no languages!`, 'miss');
      // Don't consume full turn? Or do? Let's consume it as a wasted effort.
      nextTurn();
      return;
    }

    // 2. Roll Persuasion (or Intimidation if we had a choice)
    // Default to Persuasion for "Speak"
    const skill = 'persuasion';
    const dc = 12 + (parseInt(enemy.challenge || '0') || 0);

    const skillMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    const isProficient = character.skills?.[skill]?.proficient;
    const bonus = skillMod + (isProficient ? character.proficiencyBonus : 0);

    const roll = applyHalflingLucky(rollDice(20), `persuasion check`);
    const total = roll + bonus;

    setAttackDetails({ name: `Diplomacy (${sharedLanguage})`, dc, modifier: bonus });
    setIsRolling(true);
    setShowDiceModal(true);
    setDiceResult(roll);
    setRollResult({ roll, total, isCritical: roll === 20, isCriticalFailure: roll === 1 });

    setPendingCombatAction(() => () => {
      if (total >= dc) {
        addLog(`${character.name} convinces the ${enemy.name} to stand down! (Persuasion ${total} vs DC ${dc})`, 'info');

        const pacifiedCondition: Condition = {
          type: 'pacified',
          name: 'Pacified',
          description: 'Enemy is unwilling to fight.',
          duration: -1, // Permanent until attacked
          source: character.name
        };

        setEnemies(prev => prev.map(e => e.id === enemy.id ? {
          ...e,
          conditions: [...e.conditions, pacifiedCondition],
          // Visual cue: fade out or similar handled by renderer checking 'pacified'
        } : e));

        // Check for Diplomatic Victory (if all active enemies are pacified or defeated)
        // We'll let the standard useEffect listener handle victory if we treat pacified as "out of combat"
        // For now, next turn.
      } else {
        addLog(`${character.name} fails to persuade the ${enemy.name}.`, 'miss');
      }
      nextTurn();
    });
  };

  const handleAnalyzeEnemy = () => {
    if (!selectedEnemy || isRolling) return;
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy) return;

    if (analyzedEnemies.has(enemy.id)) {
      addLog(`You have already analyzed ${enemy.name}.`, 'info');
      return;
    }

    // Determine Skill
    let skill: 'arcana' | 'nature' | 'religion' | 'insight' | 'history' = 'insight'; // Default
    const type = (enemy.creatureType || '').toLowerCase();
    if (['beast', 'plant', 'fey', 'monstrosity'].some(t => type.includes(t))) skill = 'nature';
    else if (['undead', 'fiend', 'celestial'].some(t => type.includes(t))) skill = 'religion';
    else if (['construct', 'elemental', 'dragon', 'aberration'].some(t => type.includes(t))) skill = 'arcana';
    else if (['humanoid', 'giant'].some(t => type.includes(t))) skill = 'history';

    // Calculate DC (10 + Challenge Rating, min 10)
    let cr = 0;
    if (typeof enemy.challenge === 'number') cr = enemy.challenge;
    else if (typeof enemy.challenge === 'string') cr = parseFloat(enemy.challenge) || 0;
    const dc = Math.max(10, 10 + Math.floor(cr));

    // Roll Check
    const skillMod = Math.floor((character.abilityScores[
      skill === 'nature' || skill === 'religion' || skill === 'insight' ? 'wisdom' : 'intelligence'
    ] - 10) / 2);

    // Check proficiency
    const isProficient = character.skills?.[skill]?.proficient;
    const bonus = skillMod + (isProficient ? character.proficiencyBonus : 0);

    const roll = applyHalflingLucky(rollDice(20), `${skill} check`);
    const total = roll + bonus;

    setAttackDetails({ name: `Analyze (${skill.charAt(0).toUpperCase() + skill.slice(1)})`, dc, modifier: bonus });
    setIsRolling(true);
    setShowDiceModal(true);
    setDiceResult(roll);
    setRollResult({ roll, total, isCritical: roll === 20, isCriticalFailure: roll === 1 });

    setPendingCombatAction(() => () => {
      if (total >= dc) {
        setAnalyzedEnemies(prev => new Set(prev).add(enemy.id));
        addLog(`${character.name} successfully analyzes the ${enemy.name}! Weaknesses revealed.`, 'info');
      } else {
        addLog(`${character.name} fails to recall information about the ${enemy.name}.`, 'miss');
      }
      // Consumes action? Yes, usually.
      nextTurn();
    });
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
          {selectedEnemyData && (
            <Card className="border-dashed border-muted">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{t('combat.statBlock')}</p>
                    <h4 className="font-bold">{selectedEnemyData.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {[selectedEnemyData.size, selectedEnemyData.creatureType, selectedEnemyData.alignment].filter(Boolean).join(' · ') || t('combat.none')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {selectedEnemyData.challenge && (
                      <Badge variant="outline" className="text-xs">
                        CR {selectedEnemyData.challenge}
                      </Badge>
                    )}
                    {selectedEnemyData.xpReward !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {t('combat.xpShort')}: {selectedEnemyData.xpReward}
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedEnemyData.abilityScores && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map((ability) => {
                      const score = selectedEnemyData.abilityScores?.[ability] || 0;
                      const mod = Math.floor((score - 10) / 2);
                      const label = ability.slice(0, 3).toUpperCase();
                      return (
                        <div key={ability} className="bg-muted/40 rounded px-2 py-1">
                          <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
                          <div className="font-semibold">{score} ({mod >= 0 ? '+' : ''}{mod})</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">{t('combat.speed')}:</span> {formatSpeed(selectedEnemyData.speed)}</div>
                  <div><span className="text-muted-foreground">{t('combat.senses')}:</span> {formatList(selectedEnemyData.senses)}</div>
                  <div><span className="text-muted-foreground">{t('combat.languages')}:</span> {formatList(selectedEnemyData.languages)}</div>
                  <div><span className="text-muted-foreground">{t('combat.defenses')}:</span> {formatList(selectedEnemyData.damageResistances)}</div>
                  <div><span className="text-muted-foreground">{t('combat.immunities')}:</span> {formatList(selectedEnemyData.damageImmunities)}</div>
                  <div><span className="text-muted-foreground">{t('combat.vulnerabilities')}:</span> {formatList(selectedEnemyData.damageVulnerabilities)}</div>
                  <div className="md:col-span-2 space-y-1">
                    <div><span className="text-muted-foreground">{t('combat.conditionImmunities')}:</span> {formatList(selectedEnemyData.conditionImmunities)}</div>
                    {!analyzedEnemies.has(selectedEnemyData.id) && (
                      <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                        <Search className="h-3 w-3" /> Analyze enemy to reveal weaknesses
                      </div>
                    )}
                  </div>
                </div>

                {analyzedEnemies.has(selectedEnemyData.id) && (
                  <div className="mt-2 p-2 bg-blue-900/20 rounded border border-blue-900/30 text-xs">
                    <p className="font-bold mb-1 text-blue-200 flex items-center gap-1"><Book className="h-3 w-3" /> Analysis Results</p>
                    {selectedEnemyData.damageVulnerabilities && selectedEnemyData.damageVulnerabilities.length > 0 && (
                      <p className="text-red-300"><strong>Vulnerable:</strong> {selectedEnemyData.damageVulnerabilities.join(', ')}</p>
                    )}
                    {selectedEnemyData.damageResistances && selectedEnemyData.damageResistances.length > 0 && (
                      <p className="text-yellow-300"><strong>Resistant:</strong> {selectedEnemyData.damageResistances.join(', ')}</p>
                    )}
                    {selectedEnemyData.damageImmunities && selectedEnemyData.damageImmunities.length > 0 && (
                      <p className="text-gray-400"><strong>Immune:</strong> {selectedEnemyData.damageImmunities.join(', ')}</p>
                    )}
                    {!selectedEnemyData.damageVulnerabilities?.length && !selectedEnemyData.damageResistances?.length && !selectedEnemyData.damageImmunities?.length && (
                      <p className="text-muted-foreground">No specific damage resistances or vulnerabilities known.</p>
                    )}
                  </div>
                )}

                {selectedEnemyData.statBlockSource && (
                  <a
                    href={selectedEnemyData.statBlockSource.startsWith('http') ? selectedEnemyData.statBlockSource : `/${selectedEnemyData.statBlockSource}`}
                    className="text-xs text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('combat.source')}: {selectedEnemyData.statBlockHeading || selectedEnemyData.statBlockSource}
                  </a>
                )}

                {selectedEnemyData.actions && selectedEnemyData.actions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase font-bold text-muted-foreground">{t('combat.actionsList')}</p>
                    {selectedEnemyData.actions.map((action) => (
                      <div key={action.name} className="border rounded-md p-2 bg-background/60">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm">{action.name}</div>
                          {action.type && (
                            <Badge variant="secondary" className="text-[10px] uppercase">{action.type}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatActionMeta(action)}</p>
                        {action.description && (
                          <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedEnemyData.legendaryActions && selectedEnemyData.legendaryActions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase font-bold text-muted-foreground">{t('combat.legendaryActions')}</p>
                    {selectedEnemyData.legendaryActions.map((action) => (
                      <div key={action.name} className="text-xs">
                        <span className="font-semibold">{action.name}:</span> {action.description}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
                  {isBarbarian && character.level >= 2 && (
                    <Button
                      variant={recklessAttackActive ? "destructive" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        const newState = !recklessAttackActive;
                        setRecklessAttackActive(newState);
                        if (newState) {
                          addLog('You throw aside all concern for defense to attack with fierce desperation! (Reckless Attack)', 'info');
                          updateCharacter(prev => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              conditions: [...prev.conditions.filter(c => c.type !== 'reckless'), { type: 'reckless', name: 'Reckless', description: 'Advantage on attacks, enemies have advantage on attacks against you.', duration: 1 }]
                            };
                          });
                        } else {
                          addLog('You regain your defensive composure.', 'info');
                          updateCharacter(prev => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              conditions: prev.conditions.filter(c => c.type !== 'reckless')
                            };
                          });
                        }
                      }}
                      disabled={!isPlayerTurn || isRolling}
                    >
                      <Sword className="mr-2 h-4 w-4" /> {recklessAttackActive ? 'Reckless (Active)' : 'Reckless Attack'}
                    </Button>
                  )}
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
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleAnalyzeEnemy}
                    disabled={!isPlayerTurn || isRolling || !selectedEnemy || analyzedEnemies.has(selectedEnemy || '')}
                  >
                    <Search className="mr-2 h-4 w-4" /> {analyzedEnemies.has(selectedEnemy || '') ? 'Analyzed' : 'Analyze'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleSpeak}
                    disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Speak
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
                          {character.level >= 5 && (
                            <Button
                              variant={activeBuffs.some(b => b.id === 'uncanny-dodge') ? "fantasy" : "secondary"}
                              size="sm"
                              onClick={() => {
                                if (activeBuffs.some(b => b.id === 'uncanny-dodge')) {
                                  setActiveBuffs(prev => prev.filter(b => b.id !== 'uncanny-dodge'));
                                } else {
                                  setActiveBuffs(prev => [...prev, { id: 'uncanny-dodge', name: 'Uncanny Dodge', duration: 1, bonus: 0 }]);
                                  addLog(`${character.name} prepares to use Uncanny Dodge (Will halve next attack damage).`, 'info');
                                }
                              }}
                              disabled={!isPlayerTurn && false /* Allow toggling off turn? No, isPlayerTurn handles Reacts? */}
                            >
                              <Shield className="mr-2 h-3 w-3" /> Uncanny Dodge
                            </Button>
                          )}
                        </>
                      )}
                      {isBarbarian && (
                        <>
                          <Button
                            variant={rageActive ? "destructive" : "secondary"}
                            size="sm"
                            onClick={handleRage}
                            disabled={!isPlayerTurn || rageAvailable <= 0 || rageActive || isRolling}
                            className={cn(rageActive && "animate-pulse ring-2 ring-red-500")}
                          >
                            <Flame className="mr-2 h-3 w-3" /> {rageActive ? 'Raging!' : `Rage (${rageAvailable})`}
                          </Button>
                          {character.subclass?.id === 'berserker' && rageActive && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleFrenziedStrike}
                              disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                              className="border-red-500 bg-red-500/10 text-red-700 hover:bg-red-500/20"
                            >
                              <Sword className="mr-2 h-3 w-3" /> Frenzied Strike
                            </Button>
                          )}
                        </>
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
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleLayOnHands}
                            disabled={!isPlayerTurn || layOnHandsPool <= 0 || playerHp >= character.maxHitPoints || isRolling}
                          >
                            <HeartPulse className="mr-2 h-3 w-3" /> Lay on Hands ({layOnHandsPool})
                          </Button>
                          <Button
                            variant={divineSmiteActive ? "fantasy" : "secondary"}
                            size="sm"
                            onClick={() => setDivineSmiteActive(!divineSmiteActive)}
                            disabled={!isPlayerTurn || (character.spellSlots?.[1]?.current || 0) <= 0 || isRolling}
                            className={cn(divineSmiteActive && "ring-2 ring-yellow-400")}
                          >
                            <Zap className="mr-2 h-3 w-3" /> {divineSmiteActive ? 'Smite Ready!' : 'Divine Smite'}
                          </Button>
                        </>
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
                          {character.subclass?.id === 'life' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleChannelDivinity('preserve-life')}
                              disabled={!isPlayerTurn || channelDivinityUses <= 0 || isRolling}
                            >
                              <HeartPulse className="mr-2 h-3 w-3" /> Preserve Life
                            </Button>
                          )}
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
                    {offhandAvailable && getOffhandWeapon() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOffhandAttack}
                        disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                        className="w-full justify-start"
                      >
                        <Swords className="mr-2 h-3 w-3" /> Off-Hand Attack
                      </Button>
                    )}
                    {getLightWeapons().length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {getLightWeapons().map((w) => (
                          <Button
                            key={w.id}
                            variant={offhandWeaponId === w.id ? 'default' : 'outline'}
                            size="sm"
                            className="text-[11px]"
                            onClick={() => setOffhandWeaponId(w.id)}
                          >
                            {w.name}
                          </Button>
                        ))}
                      </div>
                    )}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleHide}
                      disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                    >
                      <Activity className="mr-2 h-3 w-3" /> Hide
                    </Button>
                  </div>
                </div>

                {legendaryCreatures.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2 font-bold uppercase">Legendary Actions</p>
                    <div className="space-y-2">
                      {legendaryCreatures.map((enemy) => {
                        const remaining = legendaryPoints[enemy.id] ?? 0;
                        if (remaining <= 0) return null;
                        return (
                          <div key={enemy.id} className="border rounded-md p-2 bg-muted/40">
                            <div className="flex justify-between items-center text-sm mb-1">
                              <span className="font-semibold">{enemy.name}</span>
                              <Badge variant="outline" className="text-[10px]">Points: {remaining}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(enemy.legendaryActions || []).map((action) => {
                                const cost = action.cost || 1;
                                const disabled = cost > remaining;
                                return (
                                  <Button
                                    key={`${enemy.id}-${action.name}`}
                                    variant="secondary"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => spendLegendaryAction(enemy.id, action)}
                                    className="justify-start text-xs"
                                  >
                                    {action.name} {cost > 1 ? `(Cost ${cost})` : ''}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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

                      {/* Pinned Items */}
                      {(character.inventory || []).filter(i => i.pinned).map(item => {
                        const isPotion = item.type === 'potion';
                        const isScroll = item.type === 'scroll';
                        const isUsable = isPotion || isScroll;

                        return (
                          <Button
                            key={`pinned-${item.id}`}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (isPotion) handleUsePotion(item);
                              if (isScroll) handleUseScroll(item);
                            }}
                            className="justify-start border-fantasy-gold/50 bg-fantasy-gold/5"
                            disabled={!isUsable}
                          >
                            <div className="flex items-center w-full">
                              <Pin className="mr-2 h-3 w-3 text-fantasy-gold fill-current" />
                              <span className={cn(!isUsable && "text-muted-foreground")}>{item.name}</span>
                              {!isUsable && <span className="ml-auto text-[10px] italic opacity-70"> (Cannot use)</span>}
                            </div>
                          </Button>
                        );
                      })}

                      {/* Potions (exclude pinned) */}
                      {(character.inventory || []).filter(i => i.type === 'potion' && !i.pinned).map(item => (
                        <Button key={item.id} variant="outline" size="sm" onClick={() => handleUsePotion(item)} className="justify-start">
                          <FlaskConical className="mr-2 h-3 w-3 text-red-400" /> {item.name}
                        </Button>
                      ))}

                      {/* Scrolls (exclude pinned) */}
                      {(character.inventory || []).filter(i => i.type === 'scroll' && !i.pinned).map(item => (
                        <Button key={item.id} variant="outline" size="sm" onClick={() => handleUseScroll(item)} className="justify-start">
                          <Scroll className="mr-2 h-3 w-3 text-yellow-600" /> {item.name}
                        </Button>
                      ))}

                      {!(character.inventory || []).some(i => i.type === 'potion' || i.type === 'scroll' || (i.templateId || i.id)?.startsWith('torch-oil') || i.pinned) && (
                        <p className="text-xs text-muted-foreground italic">No usable items found.</p>
                      )}
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
    </div >
  );
}
