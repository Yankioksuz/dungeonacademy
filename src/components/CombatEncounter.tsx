import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import { Sword, Shield, Skull, Backpack, X, Flame, Wand, Activity, HeartPulse, Brain, Zap, Sparkles, Search, MessageCircle, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerCharacter, CombatEnemy, CombatLogEntry, SpellContent, CombatLogEntryType, Condition, AbilityName, Item } from '@/types';
import { useGame } from '@/contexts/GameContext';
import {
  canAct,
  getCombatAdvantage,
  getSavingThrowAdvantage,
  detectDamageType,
  getEnemyAbilityMod,
  getEnemySavingThrowBonus,
  isEnemyConditionImmune,
  adjustDamageForDefenses,
} from '@/utils/combatUtils';
import { determineEnemyAction } from '@/utils/enemyAI';

import { CombatLogPanel } from './CombatLogPanel';

import { DiceRollModal } from './DiceRollModal';
import { CombatEnemyCard } from './CombatEnemyCard';
import { EnemyStatBlock } from './EnemyStatBlock';
import { CombatInventoryModal } from './CombatInventoryModal';
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
import { portraits } from '@/data/portraits';

import {
  calculateArmorClass,
  isWeaponProficient,
  getSavingThrowModifier, // Use robust modifier calculator
} from '@/utils/characterStats';

// Subclass feature utilities
import {
  getCritThreshold,
  getDivineFuryDamage,
  getHexbladeCurseEffects,
  getRakishAudacityBonus,
  canUseAncestralProtectors,
  hasHexWarrior,
} from '@/utils/subclassFeatures';

// Magic item effects
import {
  getWeaponAttackBonus,
  getWeaponExtraDamage,
  isMagicWeapon,
  isAttuned,
  hasCloakOfDisplacement,
  hasAdamantineArmor,
} from '@/utils/magicItemEffects';


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

// Ability name lookup for save ability shorthand
const abilityLookup: Record<string, AbilityName> = {
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

  const addLog = (message: string, type: CombatLogEntryType = 'info', details?: string, source?: string, target?: string) => {
    const entry: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      message,
      type,
      details,
      source,
      target
    };
    setCombatLog(prev => [entry, ...prev]);
  };

  const endConcentration = () => {
    if (character.concentratingOn) {
      addLog(`Concentration on ${character.concentratingOn.spellName} ended.`, 'info');
      updateCharacter(prev => {
        if (!prev) return prev;
        return { ...prev, concentratingOn: undefined };
      });
    }
  };



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
  // Feat States
  const [gwmActive, setGwmActive] = useState(false);
  const [sharpshooterActive, setSharpshooterActive] = useState(false);
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

  // Warlock State
  const isWarlock = character.class.name.toLowerCase() === 'warlock';

  // ==========================================
  // SUBCLASS FEATURE STATES
  // ==========================================

  // Combat tracking
  const [isFirstTurn, setIsFirstTurn] = useState(true); // For Dread Ambusher, Assassinate
  const [divineFuryUsedThisTurn, setDivineFuryUsedThisTurn] = useState(false); // Zealot first hit bonus
  const [ancestralProtectorsTarget, setAncestralProtectorsTarget] = useState<string | null>(null); // First enemy hit while raging
  const [savageAttackerUsedThisTurn, setSavageAttackerUsedThisTurn] = useState(false); // Savage Attacker feat

  // Fighter Subclass States
  const [fightingSpiritUses, setFightingSpiritUses] = useState(defaultUses.fightingSpirit || 0); // Samurai
  const [fightingSpiritActive, setFightingSpiritActive] = useState(false);
  // TODO: Add superiorityDiceLeft for Battle Master maneuvers when implemented

  // Rogue Subclass States
  const [psychicBladesUsedThisTurn, setPsychicBladesUsedThisTurn] = useState(false); // Whispers

  // Wizard Subclass States
  const [portentDiceRolls] = useState<number[]>(() => {
    // Roll portent dice at combat start for Divination wizards
    if (character.subclass?.id === 'divination') {
      const count = (character.level || 1) >= 14 ? 3 : 2;
      return Array.from({ length: count }, () => Math.floor(Math.random() * 20) + 1);
    }
    return [];
  });
  // TODO: Add arcaneWardCurrentHp for Abjuration wizards when implemented

  // TODO: Add wardingFlareUses and wrathOfTheStormUses for Cleric subclasses when implemented

  // Warlock Subclass States  
  const [hexbladesCurseTarget, setHexbladesCurseTarget] = useState<string | null>(null);
  const [hexbladesCurseAvailable, setHexbladesCurseAvailable] = useState(defaultUses.hexbladesCurse || 0);
  const [healingLightDicePool, setHealingLightDicePool] = useState(defaultUses.healingLightDice || 0);

  // TODO: Add tidesOfChaosAvailable and favoredByTheGodsAvailable for Sorcerer subclasses when implemented

  // Bard Subclass States  
  const [, setCuttingWordsUsedThisTurn] = useState(false);

  // Paladin Subclass States
  const [vowOfEnmityTarget, setVowOfEnmityTarget] = useState<string | null>(null);

  // Derived subclass info
  const subclassId = character.subclass?.id || '';
  const critThreshold = useMemo(() => {
    let threshold = getCritThreshold(character);
    // Hexblade's Curse also lowers crit threshold on cursed target
    if (hexbladesCurseTarget) {
      threshold = Math.min(threshold, 19);
    }
    return threshold;
  }, [character, hexbladesCurseTarget]);

  const [offhandAvailable, setOffhandAvailable] = useState(true);
  const [bonusActionUsed, setBonusActionUsed] = useState(false);
  const [reactionUsed, setReactionUsed] = useState(false);
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

  const getLightWeapons = (): Item[] => {
    const equipped = character.equippedWeapon;
    const inv = character.inventory || [];
    const lightFromInv = inv.filter(
      (item) =>
        item.type === 'weapon' &&
        (item.properties || []).includes('light')
    );
    // Include equipped weapon if it's light
    if (equipped && (equipped.properties || []).includes('light')) {
      // Avoid duplicates
      const exists = lightFromInv.some(w => w.id === equipped.id);
      if (!exists) return [equipped, ...lightFromInv];
    }
    return lightFromInv;
  };

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
    effectType?: 'poison' | 'charm' | 'fear' | 'magic' | 'concentration'
  ) => {
    const baseRoll = rollDice(20);
    let advantageType = getSavingThrowAdvantage(
      {
        ...character,
        conditions: character.conditions || [],
        traits: character.race?.traits || [],
        features: character.class.features || []
      },
      ability,
      effectType
    );

    // War Caster: Advantage on CON saves for Concentration
    if (ability === 'constitution' && effectType === 'concentration' && character.feats?.includes('war-caster')) {
      if (advantageType === 'disadvantage') advantageType = 'normal';
      else if (advantageType === 'normal') advantageType = 'advantage';
      addLog("War Caster grants advantage on Concentration save.", 'info');
    }

    // Barbarian Danger Sense (Handled by getSavingThrowAdvantage)

    const secondRoll = rollDice(20);
    let roll = baseRoll;
    if (advantageType === 'advantage') roll = Math.max(baseRoll, secondRoll);
    if (advantageType === 'disadvantage') roll = Math.min(baseRoll, secondRoll);
    roll = applyHalflingLucky(roll, 'saving throw');

    const total = roll + getSavingThrowModifier(character, ability);
    return { roll, total, advantageType };
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



  const applyEnemyDamageToPlayer = (
    actingEnemy: CombatEnemyState,
    damageRoll: number,
    incomingDamageType: string
  ) => {
    let remainingDamage = damageRoll;

    // Uncanny Dodge (uses reaction)
    const hasUncannyDodge = activeBuffs.some(b => b.id === 'uncanny-dodge');
    if (hasUncannyDodge && !reactionUsed) {
      const halvedDamage = Math.ceil(remainingDamage / 2);
      remainingDamage = halvedDamage;
      addLog('Uncanny Dodge! Damage halved. (Reaction)', 'info');
      setActiveBuffs(prev => prev.filter(b => b.id !== 'uncanny-dodge'));
      setReactionUsed(true);
    }

    // Heavy Armor Master
    if (character.feats?.includes('heavy-armor-master') &&
      character.equippedArmor?.armorType === 'heavy' &&
      ['bludgeoning', 'piercing', 'slashing'].includes(incomingDamageType.toLowerCase())) {
      remainingDamage = Math.max(0, remainingDamage - 3);
      addLog('Heavy Armor Master reduces damage by 3.', 'info');
    }

    // Apply Resistances
    const traits = character.race?.traits || [];
    const ancestry = character.draconicAncestry;
    let resisted = false;

    if (incomingDamageType === 'fire' && traits.includes('Hellish Resistance')) resisted = true;
    if (incomingDamageType === 'poison' && traits.includes('Dwarven Resilience')) resisted = true;
    if (ancestry && incomingDamageType.toLowerCase() === ancestry.damageType.toLowerCase()) resisted = true;

    // Rage Resistance
    if (rageActive) {
      if (character.subclass?.id === 'totem-warrior' && incomingDamageType.toLowerCase() !== 'psychic') {
        resisted = true;
        addLog('Bear Totem Rage reduces the damage!', 'info');
      } else if (['bludgeoning', 'piercing', 'slashing'].includes(incomingDamageType.toLowerCase())) {
        resisted = true;
        addLog('Rage reduces the damage!', 'info');
      }
    }

    // Apply Resistance (halving damage)
    if (resisted) {
      remainingDamage = Math.floor(remainingDamage / 2);
      addLog(`Resisted ${incomingDamageType} damage!`, 'info');
    }

    // Apply damage to Temporary Hit Points
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

    // Apply damage to Wild Shape HP if active
    if (wildShapeActive && remainingDamage > 0) {
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
      remainingDamage = excessDamage;
    }

    // Apply Damage to HP
    if (remainingDamage > 0) {
      setPlayerHp(prev => {
        let newHp = Math.max(0, prev - remainingDamage);

        if (newHp === 0) {
          if (traits.includes('Relentless Endurance') && !relentlessEnduranceUsed) {
            newHp = 1;
            setRelentlessEnduranceUsed(true);
            addLog(`${character.name} uses Relentless Endurance to stay at 1 HP!`, 'heal');
          } else {
            addLog(`${character.name} falls unconscious!`, 'miss');
          }
        }

        updateCharacter(char => {
          if (!char) return char;
          return { ...char, hitPoints: newHp };
        });

        return newHp;
      });

      addLog(`${actingEnemy.name} deals ${remainingDamage} ${incomingDamageType} damage to ${character.name}.`, 'damage', undefined, actingEnemy.name, character.name);

      // Concentration Check
      if (character.concentratingOn) {
        const dc = Math.max(10, Math.floor(remainingDamage / 2));
        const saveResult = rollPlayerSavingThrow('constitution', 'concentration');

        if (saveResult.total >= dc) {
          addLog(`Maintained concentration on ${character.concentratingOn.spellName}. (Rolled ${saveResult.total} vs DC ${dc})`, 'info');
        } else {
          addLog(`Lost concentration on ${character.concentratingOn.spellName}! (Rolled ${saveResult.total} vs DC ${dc})`, 'warning');
          endConcentration();
        }
      }
    } else {
      addLog(`${actingEnemy.name} deals no damage to ${character.name}.`, 'info');
    }

    // Handle Secondary Effects (Poison, Charm, Fear)
    if (actingEnemy.effectType) {
      const effect = actingEnemy.effectType;
      const dc = actingEnemy.saveDC || 12;
      const saveAbility = effect === 'poison' ? 'constitution' : 'wisdom';
      const save = rollPlayerSavingThrow(saveAbility, effect as 'poison' | 'charm' | 'fear');

      if (save.total < dc) {
        if (effect === 'fear') {
          applyPlayerCondition({ type: 'frightened', name: 'Frightened', description: 'Disadvantage on attacks while source is visible.', duration: 2, source: actingEnemy.name });
          addLog(`${character.name} is frightened! (Failed save ${save.total} vs DC ${dc})`, 'condition');
        } else if (effect === 'charm') {
          applyPlayerCondition({ type: 'charmed', name: 'Charmed', description: 'Cannot attack the charmer; charmer has advantage on socials.', duration: 2, source: actingEnemy.name });
          addLog(`${character.name} is charmed! (Failed save ${save.total} vs DC ${dc})`, 'condition');
        } else if (effect === 'poison') {
          const monkImmune = character.class.id === 'monk' && character.level >= 10;
          if (!monkImmune && !traits.includes('Poison Immunity')) {
            applyPlayerCondition({ type: 'poisoned', name: 'Poisoned', description: 'Disadvantage on attack rolls and ability checks.', duration: 3, source: actingEnemy.name });
            addLog(`${character.name} is poisoned! (Failed save ${save.total} vs DC ${dc})`, 'condition');
          } else {
            addLog(`${character.name} is immune to poison.`, 'info');
          }
        }
      } else {
        addLog(`${character.name} resists the ${effect} effect. (Save ${save.total} vs DC ${dc})`, 'info');
      }
    }
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

        // Hexblade's Curse Kill Healing
        if (hexbladesCurseTarget === enemyId) {
          const hexCurseEffects = getHexbladeCurseEffects(character);
          if (hexCurseEffects) {
            const healAmount = hexCurseEffects.healingOnKill;
            setPlayerHp(prev => Math.min(character.maxHitPoints || 99, prev + healAmount));
            addLog(`Hexblade's Curse: ${character.name} regains ${healAmount} HP from cursed target's death!`, 'heal');
            setHexbladesCurseTarget(null); // Curse ends
          }
        }

        // Grim Harvest (Wizard - Necromancy) - heal on spell kills
        // This is already handled in spell damage, but ensure it works for all sources
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

  const nextTurn = useCallback(() => {
    setTimeout(() => {
      setCurrentTurnIndex(prev => {
        // Guard against empty turnOrder (should not happen, but just in case)
        if (turnOrder.length === 0) return 0;
        const nextIndex = (prev + 1) % turnOrder.length;

        // Track if we've completed a full round (back to player)
        const isNewRound = nextIndex === 0;

        // Reset per-turn features when player's turn starts
        if (turnOrder[nextIndex]?.id === 'player') {
          // Reset attack count for the new turn
          setAttacksLeft(maxAttacks);

          // Reset per-turn combat features
          setSneakAttackUsedThisTurn(false);
          setSavageAttackerUsedThisTurn(false);
          setDivineFuryUsedThisTurn(false);
          setPsychicBladesUsedThisTurn(false);
          setCuttingWordsUsedThisTurn(false);

          // Reset offhand attack availability, bonus action, and reaction
          setOffhandAvailable(true);
          setBonusActionUsed(false);
          setReactionUsed(false);

          // First turn only lasts for the first round
          if (isNewRound) {
            setIsFirstTurn(false);
          }
        }

        return nextIndex;
      });
    }, 500);
  }, [turnOrder, maxAttacks]);

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

        // Cloak of Displacement: Attackers have disadvantage
        const hasCloakActive = hasCloakOfDisplacement(character) &&
          !character.conditions.some(c => c.type === 'displacement-broken');
        if (hasCloakActive) {
          rollType = rollType === 'advantage' ? 'normal' : 'disadvantage';
          addLog(`Cloak of Displacement! Attack is at disadvantage.`, 'info');
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
        const originalRoll = attackRoll; // Store for crit check

        if (rollType === 'advantage') {
          attackRoll = Math.max(attackRoll, rollDice(20));
          addLog(`${actingEnemy.name} attacks with advantage!`, 'info');
        } else if (rollType === 'disadvantage') {
          attackRoll = Math.min(attackRoll, rollDice(20));
          addLog(`${actingEnemy.name} attacks with disadvantage.`, 'info');
        }

        const totalAttack = attackRoll + actionAttackBonus;

        // Check for critical hit (nat 20)
        let isCriticalHit = attackRoll === 20 || (rollType !== 'disadvantage' && originalRoll === 20);

        // Adamantine Armor: Critical hits become normal hits
        if (isCriticalHit && hasAdamantineArmor(character)) {
          isCriticalHit = false;
          addLog(`Adamantine Armor! Critical hit negated!`, 'info');
        }

        // Player AC Calculation
        // Player AC Calculation
        // Use centralized AC calculation which handles Unarmored Defense (Barbarian/Monk)
        const baseAC = calculateArmorClass(character);
        const playerAC = baseAC + getPlayerDefenseBonus() - (character.fightingStyle === 'Defense' ? 1 : 0); // subtract 1 if calculateArmorClass includes it, avoiding double count if getPlayerDefenseBonus also does?
        // Wait, calculateArmorClass ALREADY includes Fighting Style 'Defense'.
        // Let's check getPlayerDefenseBonus implementation.
        const effectiveAC = wildShapeActive ? WOLF_STATS.ac : playerAC;

        // Defensive Duelist feat (uses reaction)
        // When wielding a finesse weapon you're proficient with and hit by melee attack,
        // add proficiency bonus to AC for that attack
        let defensiveDuelistBonus = 0;
        const isMeleeAttack = action.type === 'melee' || !action.type;
        const hasDefensiveDuelist = character.feats?.includes('defensive-duelist');
        const hasFinesseWeapon = (character.equippedWeapon?.properties || []).includes('finesse');

        if (hasDefensiveDuelist && hasFinesseWeapon && isMeleeAttack && !reactionUsed) {
          // Check if this would turn a hit into a miss
          const boostedAC = effectiveAC + character.proficiencyBonus;
          if (totalAttack >= effectiveAC && totalAttack < boostedAC && !isCriticalHit) {
            defensiveDuelistBonus = character.proficiencyBonus;
            setReactionUsed(true);
            addLog(`Defensive Duelist! AC boosted by +${defensiveDuelistBonus} (Reaction)`, 'info');
          }
        }

        if (totalAttack >= effectiveAC + defensiveDuelistBonus || isCriticalHit) { // Nat 20 always hits
          // Break Cloak of Displacement on hit
          if (hasCloakActive) {
            applyPlayerCondition({
              type: 'displacement-broken',
              name: 'Displacement Broken',
              description: 'Cloak of Displacement is temporarily inactive until your next turn.',
              duration: 1,
              source: actingEnemy.name
            });
          }

          if (playerHp <= 0 && !wildShapeActive) {
            addLog(`${actingEnemy.name} attacks your unconscious body!`, 'damage');
            recordDeathSave(false);
            recordDeathSave(false);
            if ((character.deathSaves?.failures || 0) + 2 >= 3) {
              addLog(`${character.name} has succumbed to their wounds.`, 'defeat');
            }
          } else {
            let damageRoll = rollDamageFromString(actionDamageFormula);

            // Critical hit: double damage dice
            if (isCriticalHit) {
              damageRoll += rollDamageFromString(actionDamageFormula);
              addLog(`CRITICAL HIT!`, 'damage');
            }

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
        resolveAttackAction(chosenAction || { name: actingEnemy.name, toHit: actingEnemy.attackBonus, damage: actingEnemy.damage || '1d6+2', damageType: actingEnemy.damageType });
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
    if (attacksLeft <= 0) {
      addLog('No attacks remaining this turn!', 'miss');
      return;
    }
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

    // ==========================================
    // SUBCLASS ATTACK MODIFIERS
    // ==========================================

    // Hexblade: Hex Warrior - use CHA for weapon attacks
    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    let useCharisma = false;
    if (hasHexWarrior(character) && !weaponProps.includes('two-handed')) {
      useCharisma = true;
      addLog('Hex Warrior: Using Charisma for attack!', 'info');
    }

    // Samurai: Fighting Spirit - advantage on attacks
    if (fightingSpiritActive) {
      if (rollType === 'disadvantage') {
        rollType = 'normal';
      } else {
        rollType = 'advantage';
      }
      addLog('Fighting Spirit: Advantage on attack!', 'info');
    }

    // Swashbuckler: Rakish Audacity - add CHA to initiative (handled elsewhere) and solo sneak attack
    const rakishAudacity = getRakishAudacityBonus(character);

    // Assassinate: Advantage against creatures that haven't acted yet
    const enemyHasActed = turnOrder.findIndex(t => t.id === enemy.id) < currentTurnIndex;
    if (isFirstTurn && subclassId === 'assassin' && !enemyHasActed) {
      if (rollType === 'disadvantage') {
        rollType = 'normal';
      } else {
        rollType = 'advantage';
      }
      addLog('Assassinate: Advantage on creature that hasn\'t acted!', 'info');
    }

    // Vow of Enmity - advantage against cursed target
    if (vowOfEnmityTarget === enemy.id) {
      if (rollType === 'disadvantage') {
        rollType = 'normal';
      } else {
        rollType = 'advantage';
      }
      addLog('Vow of Enmity: Advantage on attack!', 'info');
    }

    const effectiveProficiencyBonus = isWeaponProficient(character, character.equippedWeapon) ? character.proficiencyBonus : 0;
    let attackModifier = (useCharisma ? chaMod : useDex ? dexMod : abilityMod) + effectiveProficiencyBonus;
    let damageDice = character.equippedWeapon?.damage || '1d4';
    let damageBonus = useCharisma ? chaMod : useDex ? dexMod : abilityMod;
    const weaponDamageType = detectDamageType(character.equippedWeapon?.damage || damageDice || '');
    const isMagicalWeapon = isMagicWeapon(character.equippedWeapon);

    // ==========================================
    // MAGIC WEAPON BONUSES
    // ==========================================
    const magicWeaponBonus = getWeaponAttackBonus(character.equippedWeapon);
    if (magicWeaponBonus > 0) {
      attackModifier += magicWeaponBonus;
      damageBonus += magicWeaponBonus;
      addLog(`Magic weapon bonus: +${magicWeaponBonus} to attack and damage!`, 'info');
    }

    // Get extra damage dice from magic weapons (Flame Tongue, Frost Brand, etc.)
    // Extra damage is calculated in the attack resolution callback below

    // Fighting Styles
    if (character.fightingStyle === 'Archery' && isRanged) {
      attackModifier += 2;
    }
    const isTwoHanded = weaponProps.includes('two-handed') || weaponProps.includes('heavy');
    if (character.fightingStyle === 'Dueling' && !isRanged && !isTwoHanded) {
      damageBonus += 2;
    }

    // Feat Modifiers
    if (gwmActive && weaponProps.includes('heavy')) {
      attackModifier -= 5;
      damageBonus += 10;
      addLog('Using Great Weapon Master!', 'info');
    }
    if (sharpshooterActive && isRanged) {
      attackModifier -= 5;
      damageBonus += 10;
      addLog('Using Sharpshooter!', 'info');
    }

    const versatileBonus = weaponProps.find(p => p.startsWith('versatile-'));
    if (versatileBonus) {
      const altDie = versatileBonus.split('-')[1];
      // If no shield and no offhand already used, use versatile die
      if (!character.equippedShield && !character.equippedArmor?.name?.toLowerCase().includes('shield')) {
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

    // IMMEDIATELY decrement attacks left to prevent spam clicking
    const currentAttacksLeft = attacksLeft;
    setAttacksLeft(prev => prev - 1);
    const remainingAfterThis = currentAttacksLeft - 1;

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

    let finalAttackModifier = attackModifier;
    if (gwmActive && !isRanged) finalAttackModifier -= 5; // Assumes Heavy check is done or user knows
    if (sharpshooterActive && isRanged) finalAttackModifier -= 5;

    const total = roll + finalAttackModifier + inspirationRoll;

    // Dynamic critical hit threshold (Champion, Hexblade's Curse)
    let effectiveCritThreshold = critThreshold;
    // Hexblade's Curse only applies to cursed target
    if (hexbladesCurseTarget === enemy.id) {
      effectiveCritThreshold = Math.min(effectiveCritThreshold, 19);
    }

    const isCritical = roll >= effectiveCritThreshold;
    const isCriticalFailure = roll === 1;

    // Assassinate: Auto-crit if target is surprised (first turn and hasn't acted)
    const isAssassinateCrit = isFirstTurn && subclassId === 'assassin' && !enemyHasActed && total >= targetAC;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical: isCritical || isAssassinateCrit, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC || isCritical) {
        let damageRoll = rollWeaponDamage(damageDice, true) + damageBonus;

        // Savage Attacker feat: reroll damage once per turn
        if (character.feats?.includes('savage-attacker') && !isRanged && !savageAttackerUsedThisTurn) {
          const reroll = rollWeaponDamage(damageDice, true) + damageBonus;
          if (reroll > damageRoll) {
            addLog(`Savage Attacker! Rerolled damage: ${damageRoll} → ${reroll}`, 'info');
            damageRoll = reroll;
          } else {
            addLog(`Savage Attacker! Kept original damage (${damageRoll} vs reroll ${reroll})`, 'info');
          }
          setSavageAttackerUsedThisTurn(true);
        }

        if (rageActive && !isRanged && isUsingStrength) {
          damageRoll += 2;
          addLog('Rage Damage Bonus! (+2)', 'info');
        }

        if (gwmActive && !isRanged) {
          damageRoll += 10;
          addLog('Great Weapon Master! (+10)', 'info');
        }
        if (sharpshooterActive && isRanged) {
          damageRoll += 10;
          addLog('Sharpshooter! (+10)', 'info');
        }

        // Magic Weapon Extra Damage (Flame Tongue, Frost Brand, etc.)
        const weaponAttuned = character.equippedWeapon ? isAttuned(character, character.equippedWeapon) : false;
        const extraDamages = getWeaponExtraDamage(character.equippedWeapon, weaponAttuned);
        for (const extra of extraDamages) {
          // Parse dice like "2d6" or "1d6"
          const diceMatch = extra.dice.match(/(\d+)d(\d+)/);
          if (diceMatch) {
            const numDice = parseInt(diceMatch[1]);
            const diceSize = parseInt(diceMatch[2]);
            let extraDamageRoll = 0;
            for (let i = 0; i < numDice; i++) {
              extraDamageRoll += rollDice(diceSize);
            }
            // Double on crit
            if (isCritical) {
              for (let i = 0; i < numDice; i++) {
                extraDamageRoll += rollDice(diceSize);
              }
            }
            damageRoll += extraDamageRoll;
            addLog(`${extra.description}! (+${extraDamageRoll} ${extra.type} damage)`, 'info');
          }
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

        // ==========================================
        // SUBCLASS DAMAGE BONUSES
        // ==========================================

        // Hexblade's Curse - proficiency bonus damage
        if (hexbladesCurseTarget === enemy.id) {
          const curseBonus = character.proficiencyBonus || 2;
          damageRoll += curseBonus;
          addLog(`Hexblade's Curse! (+${curseBonus} damage)`, 'info');
        }

        // Divine Fury (Zealot Barbarian) - first hit while raging
        if (rageActive && !divineFuryUsedThisTurn) {
          const furyDamage = getDivineFuryDamage(character, rageActive);
          if (furyDamage) {
            const furyRoll = rollDice(6) + Math.floor((character.level || 1) / 2);
            damageRoll += furyRoll;
            addLog(`Divine Fury! (+${furyRoll} ${furyDamage.type} damage)`, 'info');
            setDivineFuryUsedThisTurn(true);
          }
        }

        // Ancestral Protectors (Ancestral Guardian) - mark first enemy hit while raging
        if (rageActive && canUseAncestralProtectors(character, rageActive) && !ancestralProtectorsTarget) {
          setAncestralProtectorsTarget(enemy.id);
          addLog(`Ancestral Protectors! ${enemy.name} is harried by spirits!`, 'info');
        }

        // Dread Ambusher (Gloom Stalker) - first turn extra damage
        if (isFirstTurn && subclassId === 'gloom-stalker') {
          const ambushDamage = rollDice(8);
          damageRoll += ambushDamage;
          addLog(`Dread Ambusher! (+${ambushDamage} damage)`, 'info');
        }

        // Planar Warrior (Horizon Walker) - force damage conversion
        if (subclassId === 'horizon-walker') {
          const planarDice = (character.level || 1) >= 11 ? 2 : 1;
          let planarDamage = 0;
          for (let i = 0; i < planarDice; i++) planarDamage += rollDice(8);
          damageRoll += planarDamage;
          addLog(`Planar Warrior! (+${planarDamage} force damage)`, 'info');
        }

        // Psychic Blades (Whispers Bard) - bonus psychic damage
        if (subclassId === 'whispers' && inspirationAvailable > 0 && !psychicBladesUsedThisTurn) {
          const psychicDice = (character.level || 1) >= 15 ? 8 : (character.level || 1) >= 10 ? 5 : (character.level || 1) >= 5 ? 3 : 2;
          let psychicDamage = 0;
          for (let i = 0; i < psychicDice; i++) psychicDamage += rollDice(6);
          damageRoll += psychicDamage;
          addLog(`Psychic Blades! (+${psychicDamage} psychic damage)`, 'info');
          setInspirationAvailable(prev => prev - 1);
          setPsychicBladesUsedThisTurn(true);
        }

        // Swashbuckler Rakish Audacity - sneak attack when no allies needed
        if (isRogue && subclassId === 'swashbuckler' && !sneakAttackUsedThisTurn && rakishAudacity) {
          // Can sneak attack if target is only adjacent enemy (simplified: always allow if have Rakish Audacity)
          const sneakDice = Math.ceil(character.level / 2);
          let sneakDamage = 0;
          for (let i = 0; i < sneakDice; i++) sneakDamage += rollDice(6);
          damageRoll += sneakDamage;
          addLog(`Rakish Audacity Sneak Attack! (+${sneakDamage} damage)`, 'info');
          setSneakAttackUsedThisTurn(true);
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
        // Skulker: Missed attack doesn't reveal position
        const isMiss = total < targetAC && !isCritical;
        const hasSkulker = character.feats?.includes('skulker');

        if (hasSkulker && isMiss) {
          addLog(`${character.name} misses, but remains hidden (Skulker)!`, 'info');
        } else {
          updateCharacter(prev => ({
            ...prev,
            conditions: prev.conditions.filter(c => c.type !== 'hidden')
          }));
          addLog(`${character.name} reveals their position!`, 'info');
        }
      }

      // Already decremented attacksLeft at start of attack, just handle turn logic
      if (remainingAfterThis > 0) {
        addLog(`You have ${remainingAfterThis} attack(s) remaining!`, 'info');
      } else {
        nextTurn();
      }
    });
  };

  const handleOffhandAttack = () => {
    if (!offhandAvailable || bonusActionUsed || !selectedEnemy || isRolling) return;
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
      setBonusActionUsed(true);
      nextTurn();
    });
  };

  // Polearm Master: Bonus action 1d4 bludgeoning attack with polearm butt end
  const handlePolearmBonusAttack = () => {
    if (bonusActionUsed || !selectedEnemy || isRolling) return;
    if (!character.feats?.includes('polearm-master')) return;

    const weapon = character.equippedWeapon;
    const polearmWeapons = ['glaive', 'halberd', 'quarterstaff', 'spear', 'pike'];
    const isPolearm = weapon && polearmWeapons.some(p =>
      weapon.name?.toLowerCase().includes(p) || weapon.id?.toLowerCase().includes(p)
    );

    if (!isPolearm) {
      addLog('Polearm Master requires a glaive, halberd, quarterstaff, spear, or pike.', 'miss');
      return;
    }

    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const strMod = Math.floor((character.abilityScores.strength - 10) / 2);
    const attackBonus = strMod + character.proficiencyBonus;
    const targetAC = getEnemyEffectiveAC(enemy);

    setIsRolling(true);
    const roll = rollDice(20);
    const total = roll + attackBonus;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC || isCritical) {
        let damageRoll = rollDice(4) + strMod;
        if (isCritical) damageRoll += rollDice(4);

        const { adjustedDamage, note } = adjustDamageForDefenses(enemy, damageRoll, 'bludgeoning', { isMagical: false });
        addLog(`${character.name} hits ${enemy.name} with a polearm butt attack for ${adjustedDamage} bludgeoning damage!`, 'damage');
        if (note) addLog(`${enemy.name} ${note}.`, 'info');
        applyDamageToEnemy(enemy.id, adjustedDamage, 'bludgeoning', { preAdjusted: true });
      } else {
        addLog(`${character.name} misses ${enemy.name} with the polearm butt attack.`, 'miss');
      }
      setBonusActionUsed(true);
    });
  };

  // Crossbow Expert: Bonus action hand crossbow attack when attacking with one-handed weapon
  const handleCrossbowBonusAttack = () => {
    if (bonusActionUsed || !selectedEnemy || isRolling) return;
    if (!character.feats?.includes('crossbow-expert')) return;

    // Check for hand crossbow in inventory
    const handCrossbow = (character.inventory || []).find(item =>
      item.type === 'weapon' && (item.name?.toLowerCase().includes('hand crossbow') || item.id?.includes('hand-crossbow'))
    );

    if (!handCrossbow) {
      addLog('Crossbow Expert bonus attack requires a hand crossbow.', 'miss');
      return;
    }

    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
    const attackBonus = dexMod + character.proficiencyBonus;
    const targetAC = getEnemyEffectiveAC(enemy);

    setIsRolling(true);
    const roll = rollDice(20);
    const total = roll + attackBonus;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC || isCritical) {
        let damageRoll = rollDice(6) + dexMod; // Hand crossbow is 1d6
        if (isCritical) damageRoll += rollDice(6);

        const { adjustedDamage, note } = adjustDamageForDefenses(enemy, damageRoll, 'piercing', { isMagical: false });
        addLog(`${character.name} hits ${enemy.name} with a hand crossbow for ${adjustedDamage} piercing damage!`, 'damage');
        if (note) addLog(`${enemy.name} ${note}.`, 'info');
        applyDamageToEnemy(enemy.id, adjustedDamage, 'piercing', { preAdjusted: true });
      } else {
        addLog(`${character.name} misses ${enemy.name} with the hand crossbow.`, 'miss');
      }
      setBonusActionUsed(true);
    });
  };

  // Healer feat: Use an action to heal 1d6 + 4 + target's hit dice (once per creature per short rest)
  const [healerUsedThisRest, setHealerUsedThisRest] = useState(false);
  const handleHealerAction = () => {
    if (!character.feats?.includes('healer')) return;
    if (healerUsedThisRest) {
      addLog('Healer feat already used this rest!', 'miss');
      return;
    }
    if (!isPlayerTurn || isRolling) return;

    // Heal the player (self-heal as simplified version)
    const hitDice = character.hitDice?.max || character.level;
    const healing = rollDice(6) + 4 + hitDice;

    updateCharacter(prev => {
      if (!prev) return prev;
      const newHp = Math.min(prev.maxHitPoints, prev.hitPoints + healing);
      return { ...prev, hitPoints: newHp };
    });

    addLog(`${character.name} uses Healer's Kit mastery to heal for ${healing} HP!`, 'info');
    setHealerUsedThisRest(true);
    nextTurn();
  };

  // Charger feat: Bonus action for +5 damage melee attack
  const handleChargerAttack = () => {
    if (!character.feats?.includes('charger')) return;
    if (bonusActionUsed || !selectedEnemy || isRolling) return;

    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const weapon = character.equippedWeapon;
    if (!weapon) {
      addLog('No weapon equipped for Charger attack!', 'miss');
      return;
    }

    const strMod = Math.floor((character.abilityScores.strength - 10) / 2);
    const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
    const weaponProps = weapon.properties || [];
    const isFinesse = weaponProps.includes('finesse');
    const attackMod = isFinesse ? Math.max(strMod, dexMod) : strMod;
    const attackBonus = attackMod + character.proficiencyBonus;
    const targetAC = getEnemyEffectiveAC(enemy);

    setIsRolling(true);
    const roll = rollDice(20);
    const total = roll + attackBonus;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= targetAC || isCritical) {
        // Parse weapon damage
        const damageParts = (weapon.damage || '1d6').split('d');
        const diceCount = parseInt(damageParts[0] || '1');
        const diceSides = parseInt(damageParts[1]?.replace(/\+.*/, '') || '6');

        let damageRoll = attackMod + 5; // +5 from Charger
        for (let i = 0; i < diceCount; i++) {
          damageRoll += rollDice(diceSides);
        }
        if (isCritical) {
          for (let i = 0; i < diceCount; i++) {
            damageRoll += rollDice(diceSides);
          }
        }

        const damageType = 'slashing';
        const { adjustedDamage, note } = adjustDamageForDefenses(enemy, damageRoll, damageType, { isMagical: false });
        addLog(`${character.name} CHARGES into ${enemy.name} for ${adjustedDamage} damage (+5 from Charger)!`, 'damage');
        if (note) addLog(`${enemy.name} ${note}.`, 'info');
        applyDamageToEnemy(enemy.id, adjustedDamage, damageType, { preAdjusted: true });
      } else {
        addLog(`${character.name}'s charge attack misses ${enemy.name}!`, 'miss');
      }
      setBonusActionUsed(true);
    });
  };

  // Inspiring Leader feat: Grant self temp HP = level + CHA mod (once per short rest, simplified)
  const [inspiringLeaderUsed, setInspiringLeaderUsed] = useState(false);
  const handleInspiringLeader = () => {
    if (!character.feats?.includes('inspiring-leader')) return;
    if (inspiringLeaderUsed) {
      addLog('Inspiring Leader already used this rest!', 'miss');
      return;
    }
    if (!isPlayerTurn || isRolling) return;

    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    const tempHp = character.level + chaMod;

    updateCharacter(prev => {
      if (!prev) return prev;
      const currentTemp = prev.temporaryHitPoints || 0;
      // Temp HP doesn't stack, take higher
      return { ...prev, temporaryHitPoints: Math.max(currentTemp, tempHp) };
    });

    addLog(`${character.name} delivers an inspiring speech! Gained ${tempHp} temporary HP!`, 'info');
    setInspiringLeaderUsed(true);
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

    // Check if this is a bonus action spell
    const isBonusActionSpell = spell.castingTime?.toLowerCase().includes('bonus action');
    if (isBonusActionSpell && bonusActionUsed) {
      addLog('Bonus action already used this turn!', 'miss');
      return;
    }

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

    // Consume bonus action for bonus action spells
    if (isBonusActionSpell) {
      setBonusActionUsed(true);
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

    } else if (spell.id === 'haste') {
      applyPlayerCondition({ type: 'haste', name: 'Hasted', description: 'Double speed, +2 AC, extra action.', duration: 10, source: 'Haste' });
      addLog(`${character.name} casts Haste! You feel faster.`, 'info');
    } else if (spell.id === 'fly') {
      applyPlayerCondition({ type: 'flying', name: 'Flying', description: 'You have a flying speed of 60 feet. Immune to Prone in most cases.', duration: 600, source: 'Fly' }); // 10 minutes
      addLog(`${character.name} casts Fly! You take to the skies.`, 'info');
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

    // Alert Feat (+5 Initiative)
    if (character.feats?.includes('alert')) {
      playerInitiative += 5;
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
      // Haste Boost
      const hasHaste = character.conditions?.some(c => c.type === 'haste');
      setAttacksLeft(maxAttacks + (hasHaste ? 1 : 0));

      setRecklessAttackActive(false); // Reset Reckless at start of turn (player must choose to use it again)

      // Decrement Player Condition Durations - deferred to avoid setState-during-render warning
      queueMicrotask(() => {
        updateCharacter(prev => {
          if (!prev) return prev;
          const updatedConditions = prev.conditions.map(c => {
            if (typeof c.duration === 'number' && c.duration > 0) {
              return { ...c, duration: c.duration - 1 };
            }
            return c;
          }).filter(c => c.duration === undefined || c.duration !== 0);
          return { ...prev, conditions: updatedConditions };
        });
      });

      addLog(`Your turn! You have ${maxAttacks + (hasHaste ? 1 : 0)} attack(s).`, 'info');
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

  // For prepared casters (Wizard, Cleric, Druid, Paladin), use preparedSpells; otherwise use knownSpells
  const availableSpells = useMemo(() => {
    if (isPreparedCaster(character.class.name)) {
      return character.preparedSpells ?? [];
    }
    return character.knownSpells ?? [];
  }, [character.knownSpells, character.preparedSpells, character.class.name]);

  const canCastAnySpell = useMemo(() => {
    if (availableSpells.length === 0) return false;
    return availableSpells.some((spellId) => {
      const spell = spellsData.find((s) => s.id === spellId);
      if (!spell) return false;
      if (spell.level === 0) return true;
      const pool = character.spellSlots?.[spell.level];
      return Boolean(pool && pool.current > 0);
    });
  }, [availableSpells, character.spellSlots]);

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
    if (!secondWindAvailable || bonusActionUsed) return;
    const healRoll = rollDice(10);
    const totalHeal = healRoll + character.level;
    setPlayerHp(prev => Math.min(character.maxHitPoints, prev + totalHeal));
    setSecondWindAvailable(false);
    persistFeatureUses({ secondWind: false });
    setBonusActionUsed(true);
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
    if (!rageAvailable || rageActive || bonusActionUsed) return;
    setRageAvailable(prev => prev - 1);
    persistFeatureUses({ rage: Math.max(0, rageAvailable - 1) });
    setRageActive(true);
    setRageRoundsLeft(10); // 1 minute
    setBonusActionUsed(true);
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
    const attackBonus = strMod + prof + (character.equippedWeapon?.attackBonus || 0);

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
    if (!inspirationAvailable || hasInspirationDie || bonusActionUsed) return;
    setInspirationAvailable(prev => prev - 1);
    persistFeatureUses({ bardicInspiration: Math.max(0, inspirationAvailable - 1) });
    setHasInspirationDie(true);
    setBonusActionUsed(true);
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
    if (kiPoints <= 0 || bonusActionUsed) return;
    setKiPoints(prev => prev - 1);
    persistFeatureUses({ kiPoints: Math.max(0, kiPoints - 1) });
    setBonusActionUsed(true);

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
      addLog(`${character.name} drinks ${item.name}! Speed increased (Haste).`, 'info');
      applyPlayerCondition({ type: 'haste', name: 'Hasted', description: 'Double speed, +2 AC, extra action.', duration: 10, source: 'Potion of Speed' });
    } else if (item.name.toLowerCase().includes('invisibility')) {
      applyPlayerCondition({ type: 'invisible', name: 'Invisible', description: 'Attackers have disadvantage.', duration: 600, source: item.name }); // 1 hour
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
    if (bonusActionUsed) {
      addLog('Bonus action already used this turn!', 'miss');
      return;
    }
    setBonusActionUsed(true);
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
    const hasDisadvantage = (character.equippedArmor?.armorType === 'heavy' || character.equippedArmor?.stealthDisadvantage);
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
    const dc = 12 + (parseInt(String(enemy.challenge ?? '0'), 10) || 0);

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
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Combat Log - Left Side (like Adventure Narrative Log) */}
      <div className="w-full lg:w-1/3 order-2 lg:order-1">
        <div className="lg:sticky lg:top-24">
          <CombatLogPanel logs={combatLog} className="max-h-[calc(100vh-8rem)]" />
        </div>
      </div>

      {/* Main Combat Area - Right Side */}
      <div className="w-full lg:flex-1 order-1 lg:order-2 space-y-6">
        {/* Combatants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Player Column (Card + Actions) */}
          <div className="space-y-4">
            {/* Player Status Card - styled like CombatEnemyCard */}
            <Card
              className={cn(
                'transition-all border-2 overflow-hidden',
                isPlayerTurn ? 'border-fantasy-gold shadow-lg shadow-fantasy-gold/20' : 'border-border',
                playerHp <= 0 && 'opacity-50 grayscale'
              )}
            >
              <CardContent className="p-0">
                <div className="flex">
                  {/* Portrait Section */}
                  <div className="relative w-20 h-20 flex-shrink-0">
                    {character.portraitId ? (
                      <img
                        src={portraits.find(p => p.id === character.portraitId)?.src}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-fantasy-dark-card text-fantasy-gold font-fantasy text-2xl">
                        {character.name.charAt(0)}
                      </div>
                    )}
                    {playerHp <= 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Skull className="h-8 w-8 text-red-500" />
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-sm">{character.name}</h4>
                        <div className="text-xs text-muted-foreground">
                          {character.race.name} {character.class.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Shield className="h-3 w-3" /> AC {calculateArmorClass(character)}
                        </div>
                      </div>
                      {isPlayerTurn && (
                        <Badge variant="gold" className="animate-pulse text-[10px]">{t('combat.yourTurn')}</Badge>
                      )}
                    </div>

                    {/* HP Bar */}
                    <div className="space-y-1">
                      <Progress
                        value={(wildShapeActive ? (wildShapeHp / WOLF_STATS.maxHp) : (playerHp / character.maxHitPoints)) * 100}
                        className={cn("h-2", wildShapeActive && "bg-amber-900/20 [&>div]:bg-amber-700")}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {wildShapeActive ? `${wildShapeHp} / ${WOLF_STATS.maxHp} (Wolf)` : `${playerHp} / ${character.maxHitPoints}`}
                        </span>
                        {(character.temporaryHitPoints || 0) > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-blue-900/50 text-blue-200">
                            +{character.temporaryHitPoints} THP
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Status Badges */}
                    {(character.concentratingOn || isFighter || isRogue || hasInspirationDie || (isBarbarian && rageActive) || activeBuffs.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {character.concentratingOn && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            <Brain className="h-2 w-2 mr-1" /> {character.concentratingOn.spellName}
                          </Badge>
                        )}
                        {isFighter && (
                          <>
                            <Badge variant={actionSurgeAvailable ? 'fantasy' : 'outline'} className="text-[10px] px-1 py-0">
                              Action Surge
                            </Badge>
                            <Badge variant={secondWindAvailable ? 'fantasy' : 'outline'} className="text-[10px] px-1 py-0">
                              Second Wind
                            </Badge>
                          </>
                        )}
                        {isRogue && (
                          <Badge variant={!sneakAttackUsedThisTurn ? 'fantasy' : 'outline'} className="text-[10px] px-1 py-0">
                            Sneak Attack
                          </Badge>
                        )}
                        {hasInspirationDie && (
                          <Badge variant="fantasy" className="text-[10px] px-1 py-0 animate-pulse">
                            Inspiration
                          </Badge>
                        )}
                        {isBarbarian && rageActive && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 animate-pulse">
                            RAGE
                          </Badge>
                        )}
                        {activeBuffs.map(buff => (
                          <Badge key={buff.id} variant="secondary" className="text-[10px] px-1 py-0">
                            {buff.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Conditions */}
                    {character.conditions && character.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {character.conditions.map((condition, idx) => (
                          <Badge
                            key={`${condition.type}-${idx}`}
                            variant="destructive"
                            className="text-[10px] px-1 py-0"
                          >
                            {condition.type} {condition.duration && `(${condition.duration})`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Death Saves - shown when HP <= 0 */}
                {playerHp <= 0 && (
                  <div className="px-3 pb-3 pt-1 border-t border-red-900/30 bg-red-950/20">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground mr-1">Saves:</span>
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={`success-${i}`}
                            className={cn(
                              "w-3 h-3 rounded-full border border-green-600",
                              i < (character.deathSaves?.successes || 0) ? "bg-green-600" : "bg-transparent"
                            )}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground mr-1">Fails:</span>
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={`failure-${i}`}
                            className={cn(
                              "w-3 h-3 rounded-full border border-red-600",
                              i < (character.deathSaves?.failures || 0) ? "bg-red-600" : "bg-transparent"
                            )}
                          />
                        ))}
                      </div>
                      {isPlayerTurn && (
                        <Button
                          onClick={handleDeathSave}
                          disabled={isRolling}
                          size="sm"
                          variant="destructive"
                          className="h-6 text-xs px-2"
                        >
                          Roll
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions Section - Same column as Player */}
            <div className="space-y-3">
              <h3 className="font-fantasy text-lg flex items-center gap-2">
                <Activity className="h-4 w-4" /> {t('combat.actions')}
              </h3>

              {playerHp > 0 ? (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {/* Feat Toggles */}
                    {character.feats?.includes('great-weapon-master') && (
                      <div className="flex items-center space-x-2 pb-2">
                        <input
                          type="checkbox"
                          id="gwm-toggle"
                          checked={gwmActive}
                          onChange={(e) => setGwmActive(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-fantasy-gold focus:ring-fantasy-gold bg-black/20"
                        />
                        <label htmlFor="gwm-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-red-400">
                          Great Weapon Master (-5 Hit / +10 Dmg)
                        </label>
                      </div>
                    )}
                    {character.feats?.includes('sharpshooter') && (
                      <div className="flex items-center space-x-2 pb-2">
                        <input
                          type="checkbox"
                          id="sharpshooter-toggle"
                          checked={sharpshooterActive}
                          onChange={(e) => setSharpshooterActive(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-fantasy-gold focus:ring-fantasy-gold bg-black/20"
                        />
                        <label htmlFor="sharpshooter-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-emerald-400">
                          Sharpshooter (-5 Hit / +10 Dmg)
                        </label>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="default"
                        className="w-full justify-start"
                        onClick={handlePlayerAttack}
                        disabled={!isPlayerTurn || isRolling || !selectedEnemy || attacksLeft <= 0}
                      >
                        <Sword className="mr-2 h-4 w-4" /> {t('combat.attack')} {attacksLeft > 1 && `(${attacksLeft})`}
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
                      {character.featureUses?.luckPoints !== undefined && character.featureUses.luckPoints > 0 && (
                        <Button
                          variant="outline"
                          className="w-full justify-start text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
                          onClick={() => {
                            addLog('Used a Luck Point! Reroll the d20.', 'info');
                            // Logic to decrement luck points would go here, needing an updateCharacter call
                            updateCharacter((prev) => {
                              if (!prev || !prev.featureUses) return prev;
                              return {
                                ...prev,
                                featureUses: {
                                  ...prev.featureUses,
                                  luckPoints: (prev.featureUses.luckPoints ?? 0) - 1
                                }
                              };
                            });
                          }}
                          disabled={!isPlayerTurn || isRolling}
                        >
                          <Sparkles className="mr-2 h-4 w-4" /> Use Luck Point ({character.featureUses.luckPoints})
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

                          {/* ==========================================
                          FEAT ABILITIES
                          ========================================== */}
                          {character.feats?.includes('great-weapon-master') && (
                            <Button
                              variant={gwmActive ? "fantasy" : "secondary"}
                              size="sm"
                              onClick={() => setGwmActive(!gwmActive)}
                              disabled={!isPlayerTurn || isRolling}
                            >
                              <Sword className="mr-2 h-3 w-3" /> {gwmActive ? 'GWM Active (-5/+10)' : 'Great Weapon Master'}
                            </Button>
                          )}
                          {character.feats?.includes('sharpshooter') && (
                            <Button
                              variant={sharpshooterActive ? "fantasy" : "secondary"}
                              size="sm"
                              onClick={() => setSharpshooterActive(!sharpshooterActive)}
                              disabled={!isPlayerTurn || isRolling}
                            >
                              <Crosshair className="mr-2 h-3 w-3" /> {sharpshooterActive ? 'Sharpshooter Active (-5/+10)' : 'Sharpshooter'}
                            </Button>
                          )}
                          {character.feats?.includes('lucky') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const current = character.featureUses?.luckPoints ?? 0;
                                if (current > 0) {
                                  updateCharacter(prev => {
                                    if (!prev) return prev;
                                    return { ...prev, featureUses: { ...prev.featureUses, luckPoints: current - 1 } as FeatureUses };
                                  });
                                  addLog(`${character.name} uses a Luck point!`, 'info');
                                }
                              }}
                              disabled={!isPlayerTurn || isRolling || (character.featureUses?.luckPoints ?? 0) <= 0}
                            >
                              <Sparkles className="mr-2 h-3 w-3" /> Use Luck Point ({character.featureUses?.luckPoints ?? 0})
                            </Button>
                          )}

                          {/* ==========================================
                          SUBCLASS-SPECIFIC ABILITIES
                          ========================================== */}

                          {/* Fighter: Samurai - Fighting Spirit */}
                          {subclassId === 'samurai' && fightingSpiritUses > 0 && (
                            <Button
                              variant={fightingSpiritActive ? "fantasy" : "secondary"}
                              size="sm"
                              onClick={() => {
                                if (!fightingSpiritActive) {
                                  setFightingSpiritActive(true);
                                  setFightingSpiritUses(prev => prev - 1);
                                  // Gain temp HP
                                  const tempHp = (character.level || 1) >= 15 ? 15 : (character.level || 1) >= 10 ? 10 : 5;
                                  updateCharacter(prev => {
                                    if (!prev) return prev;
                                    const currentTemp = prev.temporaryHitPoints || 0;
                                    return { ...prev, temporaryHitPoints: Math.max(currentTemp, tempHp) };
                                  });
                                  addLog(`Fighting Spirit! ${character.name} gains advantage on attacks and ${tempHp} temporary HP!`, 'info');
                                }
                              }}
                              disabled={!isPlayerTurn || fightingSpiritUses <= 0 || fightingSpiritActive || isRolling}
                              className={cn(fightingSpiritActive && "ring-2 ring-yellow-400")}
                            >
                              <Sword className="mr-2 h-3 w-3" /> {fightingSpiritActive ? 'Spirit Active!' : `Fighting Spirit (${fightingSpiritUses})`}
                            </Button>
                          )}

                          {/* Paladin: Vengeance - Vow of Enmity */}
                          {isPaladin && subclassId === 'vengeance' && channelDivinityUses > 0 && (
                            <Button
                              variant={vowOfEnmityTarget ? "fantasy" : "secondary"}
                              size="sm"
                              onClick={() => {
                                if (!vowOfEnmityTarget && selectedEnemy) {
                                  setVowOfEnmityTarget(selectedEnemy);
                                  setChannelDivinityUses(prev => prev - 1);
                                  const targetEnemy = enemies.find(e => e.id === selectedEnemy);
                                  addLog(`Vow of Enmity! ${character.name} swears vengeance against ${targetEnemy?.name || 'the enemy'}! Advantage on attacks for 1 minute.`, 'info');
                                }
                              }}
                              disabled={!isPlayerTurn || !selectedEnemy || vowOfEnmityTarget !== null || channelDivinityUses <= 0 || isRolling}
                              className={cn(vowOfEnmityTarget && "ring-2 ring-purple-500")}
                            >
                              <Crosshair className="mr-2 h-3 w-3" /> {vowOfEnmityTarget ? 'Vow Active!' : 'Vow of Enmity'}
                            </Button>
                          )}

                          {/* Warlock: Hexblade - Hexblade's Curse */}
                          {isWarlock && subclassId === 'hexblade' && hexbladesCurseAvailable > 0 && (
                            <Button
                              variant={hexbladesCurseTarget ? "destructive" : "secondary"}
                              size="sm"
                              onClick={() => {
                                if (!hexbladesCurseTarget && selectedEnemy) {
                                  setHexbladesCurseTarget(selectedEnemy);
                                  setHexbladesCurseAvailable(prev => prev - 1);
                                  const targetEnemy = enemies.find(e => e.id === selectedEnemy);
                                  addLog(`Hexblade's Curse! ${targetEnemy?.name || 'The enemy'} is cursed! (+${character.proficiencyBonus} damage, crit on 19-20, heal on kill)`, 'info');
                                }
                              }}
                              disabled={!isPlayerTurn || !selectedEnemy || hexbladesCurseTarget !== null || isRolling}
                              className={cn(hexbladesCurseTarget && "ring-2 ring-purple-700 animate-pulse")}
                            >
                              <Skull className="mr-2 h-3 w-3" /> {hexbladesCurseTarget ? 'Curse Active!' : `Hexblade's Curse`}
                            </Button>
                          )}

                          {/* Warlock: Celestial - Healing Light */}
                          {isWarlock && subclassId === 'celestial' && healingLightDicePool > 0 && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const chaMod = Math.max(1, Math.floor((character.abilityScores.charisma - 10) / 2));
                                const diceToUse = Math.min(chaMod, healingLightDicePool);
                                let healing = 0;
                                for (let i = 0; i < diceToUse; i++) {
                                  healing += Math.floor(Math.random() * 6) + 1;
                                }
                                setHealingLightDicePool(prev => prev - diceToUse);
                                setPlayerHp(prev => Math.min(character.maxHitPoints || 99, prev + healing));
                                addLog(`Healing Light! ${character.name} heals for ${healing} HP (used ${diceToUse}d6)!`, 'heal');
                              }}
                              disabled={!isPlayerTurn || healingLightDicePool <= 0 || playerHp >= (character.maxHitPoints || 99) || isRolling}
                            >
                              <HeartPulse className="mr-2 h-3 w-3" /> Healing Light ({healingLightDicePool}d6)
                            </Button>
                          )}

                          {/* Wizard: Divination - Portent Dice */}
                          {isWizard && subclassId === 'divination' && portentDiceRolls.length > 0 && (
                            <div className="col-span-2 p-2 bg-purple-500/10 rounded border border-purple-500/30">
                              <p className="text-xs font-bold text-purple-300 mb-1">Portent Dice</p>
                              <div className="flex gap-2 flex-wrap">
                                {portentDiceRolls.map((roll, index) => (
                                  <Badge key={index} variant="fantasy" className="text-sm font-bold">
                                    {roll}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Replace any d20 roll with these!</p>
                            </div>
                          )}

                          {/* Bard: Lore - Cutting Words display */}
                          {isBard && subclassId === 'lore' && inspirationAvailable > 0 && (
                            <Badge variant="secondary" className="text-xs col-span-2 justify-center py-1">
                              <Brain className="mr-1 h-3 w-3" /> Cutting Words Ready (use as reaction)
                            </Badge>
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
                            <Sword className="mr-2 h-3 w-3" /> Off-Hand Attack
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

                    {/* Inventory Modal is rendered outside this section */}

                    {showSpellMenu && (
                      <div className="mt-4 border rounded-md p-2 bg-background">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-sm">Cast Spell ({slotSummary})</h4>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSpellMenu(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {availableSpells.map(spellId => {
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
            {/* End Player Column */}
          </div >

          {/* Enemies Column */}
          < div className="space-y-4" >
            <div className="grid gap-3">
              {enemies.map((enemy) => (
                <CombatEnemyCard
                  key={enemy.id}
                  enemy={enemy}
                  isSelected={selectedEnemy === enemy.id}
                  effectiveAC={getEnemyEffectiveAC(enemy)}
                  onSelect={() => setSelectedEnemy(enemy.id)}
                />
              ))}
            </div>
            {
              selectedEnemyData && (
                <EnemyStatBlock
                  enemy={selectedEnemyData}
                  isAnalyzed={analyzedEnemies.has(selectedEnemyData.id)}
                />
              )
            }
          </div >
        </div >

        {/* Dice Roll Modal */}
        < DiceRollModal
          isOpen={showDiceModal}
          isRolling={isRolling}
          diceRoll={diceResult}
          rollResult={rollResult}
          onRollComplete={() => setIsRolling(false)
          }
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

        {/* Combat Inventory Modal */}
        < CombatInventoryModal
          isOpen={showInventory}
          onClose={() => setShowInventory(false)}
          inventory={character.inventory || []}
          torchOilAvailable={torchOilAvailable}
          onUseTorchOil={handleUseTorchOil}
          onUsePotion={handleUsePotion}
          onUseScroll={handleUseScroll}
        />
      </div >
    </div >
  );
}
