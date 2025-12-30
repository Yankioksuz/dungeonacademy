
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import {
  Sword,
  Shield,
  Zap,
  Crosshair,
  // RotateCcw,
  Flag,
  EyeOff,
  Skull,
  Brain,
  Activity,
  Sparkles,
  Wand,
  Backpack,
  Search,
  MessageCircle,
  HeartPulse,
  Flame,
  X,
  Sun,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerCharacter, CombatEnemy, CombatLogEntry, SpellContent, CombatLogEntryType, Condition, AbilityName, Item } from '@/types';
import { useGame } from '@/contexts/GameContext';
import {
  canAct,
  hasCondition,
  getCombatAdvantage,
  getSavingThrowAdvantage,
  detectDamageType,
  // getEnemyAbilityMod,
  getEnemySavingThrowBonus,
  isEnemyConditionImmune,
  adjustDamageForDefenses,
} from '@/utils/combatUtils';
import { determineEnemyAction } from '@/utils/enemyAI';
import { ConditionManager } from '@/managers/ConditionManager';
import { getAttackRollModifier, canTakeAction } from '@/utils/combatMechanics';
import { processStartOfTurnConditions, autoFailsSave } from '@/utils/conditionEffects';
import { ConditionBadge } from '@/components/ConditionBadge';
import { Tooltip } from './ui/tooltip';
import {
  classActionTooltips,
  combatManeuverTooltips,
  featAbilityTooltips,
  generalActionTooltips
} from '@/content/combatAbilityTooltips';

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

// Multiclass utilities
import { hasClassFeature, getLevelInClass } from '@/utils/characterUtils';

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
  getWeaponOnHitConditions,
} from '@/utils/magicItemEffects';

// Battle Master Maneuvers
import {
  BATTLE_MASTER_MANEUVERS,
  rollSuperiorityDie,
} from '@/data/battleMasterManeuvers';


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
  surprisedEnemies?: string[];
  initialPlayerHidden?: boolean;
}

export function CombatEncounter(props: CombatEncounterProps) {
  const { character, enemies: initialEnemies, onVictory, onDefeat, playerAdvantage, surprisedEnemies, initialPlayerHidden } = props;
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
          id: enemy.id || `enemy - ${index} `,
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

      const enemyId = base.id || `enemy-${index}`;
      const isSurprised = surprisedEnemies?.includes(enemyId);

      const initialConditions: Condition[] = [...(base.conditions || [])];
      if (isSurprised) {
        initialConditions.push({
          type: 'surprised',
          name: 'Surprised',
          description: 'Cannot move or take actions on first turn.',
          duration: 1,
          source: 'Ambush'
        });
      }

      return {
        ...base,
        id: enemyId,
        initiative: Math.floor(Math.random() * 20) + 1,
        isDefeated: false,
        conditions: initialConditions,
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

  // Favored by the Gods boost system
  const [canBoostRoll, setCanBoostRoll] = useState(false);
  const [boostCallback, setBoostCallback] = useState<((bonus: number) => void) | null>(null);

  const [showInventory, setShowInventory] = useState(false);
  const [showSpellMenu, setShowSpellMenu] = useState(false);
  const [analyzedEnemies, setAnalyzedEnemies] = useState<Set<string>>(new Set());
  const [legendaryPoints, setLegendaryPoints] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialEnemies.forEach((enemy: InitialEnemyInput, index) => {
      const catalogEnemy = enemy.id ? getEnemyById(enemy.id) : getEnemyById(enemy.enemyId || '');
      const id = enemy.id || enemy.enemyId || `enemy - ${index} `;
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
      const id = enemy.id || enemy.enemyId || `enemy - ${index} `;
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
  const [_rageRoundsLeft, setRageRoundsLeft] = useState(0);
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

  // Battle Master States
  const [superiorityDiceLeft, setSuperiorityDiceLeft] = useState(defaultUses.superiorityDice || 0);
  const [pendingManeuver, setPendingManeuver] = useState<string | null>(null); // Active maneuver for next attack
  const [feintingAttackActive, setFeintingAttackActive] = useState(false); // Feinting Attack advantage
  const isBattleMaster = character.subclass?.id === 'battle-master';

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

  // Derived subclass info - declare early for use below
  const subclassId = character.subclass?.id || '';

  // Wizard Subclass States - Abjuration
  const [arcaneWardHp, setArcaneWardHp] = useState(defaultUses.arcaneWardHp || 0);
  const isAbjurationWizard = character.class?.name?.toLowerCase() === 'wizard' && subclassId === 'abjuration';

  // Cleric Subclass States - Light Domain
  const [wardingFlareUses, setWardingFlareUses] = useState(defaultUses.wardingFlare || 0);
  const isLightCleric = character.class?.name?.toLowerCase() === 'cleric' && subclassId === 'light';

  // Cleric Subclass States - Tempest Domain
  const [wrathOfTheStormUses, setWrathOfTheStormUses] = useState(defaultUses.wrathOfTheStorm || 0);
  const isTempestCleric = character.class?.name?.toLowerCase() === 'cleric' && subclassId === 'tempest';

  // Sorcerer Subclass States - Wild Magic
  const [tidesOfChaosAvailable, setTidesOfChaosAvailable] = useState(defaultUses.tidesOfChaos || 0);
  const isWildMagicSorcerer = character.class?.name?.toLowerCase() === 'sorcerer' && subclassId === 'wild-magic';
  const [tidesOfChaosActive, setTidesOfChaosActive] = useState(false); // Advantage on next roll

  // Sorcerer Subclass States - Divine Soul
  const [favoredByTheGodsAvailable, setFavoredByTheGodsAvailable] = useState(defaultUses.favoredByTheGods || 0);
  const isDivineSoulSorcerer = character.class?.name?.toLowerCase() === 'sorcerer' && subclassId === 'divine-soul';

  // Warlock Subclass States  
  const [hexbladesCurseTarget, setHexbladesCurseTarget] = useState<string | null>(null);
  const [hexbladesCurseAvailable, setHexbladesCurseAvailable] = useState(defaultUses.hexbladesCurse || 0);
  const [healingLightDicePool, setHealingLightDicePool] = useState(defaultUses.healingLightDice || 0);

  // Bard Subclass States  
  const [, setCuttingWordsUsedThisTurn] = useState(false);

  // Paladin Subclass States
  const [vowOfEnmityTarget, setVowOfEnmityTarget] = useState<string | null>(null);

  // Critical hit threshold
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
  // Note: Legendary actions are now handled automatically via performLegendaryAction()
  // and displayed on enemy cards via legendaryPoints prop

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


  const applyPlayerCondition = useCallback((condition: Condition) => {
    updateCharacter((prev) => {
      if (!prev) return prev;
      if (prev.conditions.some(c => c.type === condition.type)) return prev;
      return { ...prev, conditions: [...prev.conditions, condition] };
    });
  }, [updateCharacter]);

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

    // Initial Hidden State
    if (initialPlayerHidden) {
      // We need to use a timeout or ensure character update happens after mount
      // Checking if already hidden to avoid infinite loops if this effect re-runs
      const isHidden = character.conditions.some(c => c.type === 'hidden');
      if (!isHidden) {
        applyPlayerCondition({
          type: 'hidden',
          name: 'Hidden',
          description: 'Unseen by enemies. Advantage on attacks, attacks against you have disadvantage.',
          duration: -1, // Indefinite until broken
          source: 'Stealth'
        });
        addLog(`${character.name} starts combat hidden from view!`, 'info');
      }
    }
  }, [character.featureUses, character.level, character.class.name, isBarbarian, isBard, isCleric, isDruid, isFighter, isMonk, isPaladin, isSorcerer, initialPlayerHidden]);


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

  const hasHalflingLucky = (character.race?.traits || []).includes('Lucky');

  const applyHalflingLucky = (roll: number, context: string) => {
    if (hasHalflingLucky && roll === 1) {
      const reroll = rollDice(20);
      addLog(`${character.name} 's Lucky trait rerolls a natural 1 (${context}).`, 'info');
      return reroll;
    }
    return roll;
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

    // Bless: Add 1d4 to saving throw
    let blessBonus = 0;
    if (character.conditions.some(c => c.type === 'blessed')) {
      blessBonus = rollDice(4);
      addLog(`Bless! +${blessBonus} to save!`, 'info');
    }

    return { roll, total: total + blessBonus, advantageType };
  };

  const getPlayerDefenseBonus = () => {
    // Check for active buffs that provide AC bonus
    return activeBuffs.reduce((acc, buff) => acc + (buff.bonus || 0), 0);
  };





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

    // Abjuration Wizard: Arcane Ward absorbs damage first
    if (isAbjurationWizard && arcaneWardHp > 0) {
      const absorbed = absorbDamageWithArcaneWard(remainingDamage);
      remainingDamage = Math.max(0, remainingDamage - absorbed);
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
          const monkImmune = hasClassFeature(character, 'monk', 10);
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
      return; // Silently return if not enough points
    }
    setLegendaryPoints(prev => ({ ...prev, [enemyId]: Math.max(0, remaining - cost) }));
    addLog(`⚡ ${enemy.name} uses Legendary Action: ${action.name}!`, 'condition');
    addLog(`   ➤ ${action.description}`, 'info');

    // Helper to roll damage from complex formulas like "3d6+4+6d6" or "4d8+10"
    const rollLegendaryDamage = (damageStr: string): number => {
      if (!damageStr) return 0;
      let total = 0;
      // Match all dice expressions like XdY and modifiers like +N or -N
      const parts = damageStr.match(/(\d+d\d+|[+-]?\d+)/g) || [];
      for (const part of parts) {
        if (part.includes('d')) {
          const [numDice, sides] = part.split('d').map(n => parseInt(n));
          for (let i = 0; i < numDice; i++) {
            total += Math.floor(Math.random() * sides) + 1;
          }
        } else {
          total += parseInt(part);
        }
      }
      return Math.max(0, total);
    };

    // Handle enemy self-healing (e.g., Unicorn's Heal Self)
    if (action.healing) {
      const healAmount = rollLegendaryDamage(action.healing);
      setEnemies(prev => prev.map(e => {
        if (e.id !== enemyId) return e;
        const newHp = Math.min(e.maxHp, e.currentHp + healAmount);
        return { ...e, currentHp: newHp };
      }));
      addLog(`${enemy.name} heals for ${healAmount} HP!`, 'heal');
      return; // Healing actions don't damage the player
    }

    // Handle damage with optional saving throw
    if (action.damage) {
      let totalDamage = rollLegendaryDamage(action.damage);
      const damageType = action.damageType || 'magical';

      // If action has a save DC, apply saving throw
      if (action.saveDC) {
        const saveAbility = (action.saveAbility || 'constitution') as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
        const save = rollPlayerSavingThrow(saveAbility);

        if (save.total >= action.saveDC) {
          // Success
          if (action.halfOnSave) {
            totalDamage = Math.floor(totalDamage / 2);
            addLog(`${character.name} succeeds ${saveAbility.toUpperCase()} save (${save.total} vs DC ${action.saveDC}) - Half damage!`, 'info');
          } else {
            addLog(`${character.name} succeeds ${saveAbility.toUpperCase()} save (${save.total} vs DC ${action.saveDC}) - No damage!`, 'info');
            totalDamage = 0;
          }
        } else {
          addLog(`${character.name} fails ${saveAbility.toUpperCase()} save (${save.total} vs DC ${action.saveDC})!`, 'miss');
        }
      }

      if (totalDamage > 0) {
        addLog(`${enemy.name} deals ${totalDamage} ${damageType} damage!`, 'damage');
        applyEnemyDamageToPlayer(enemy, totalDamage, damageType);
      }
    }

    // Apply conditions if specified (effect-only actions or combined damage+effect)
    if (action.effect) {
      const effectLower = action.effect.toLowerCase();
      const saveDC = action.saveDC || enemy.saveDC || 15;
      const saveAbility = (action.saveAbility || 'wisdom') as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

      // Only roll save if we haven't already handled damage (avoids double save)
      const needsSave = !action.damage || !action.saveDC;
      let saveFailed = false;

      if (needsSave) {
        const save = rollPlayerSavingThrow(saveAbility);
        saveFailed = save.total < saveDC;
        if (saveFailed) {
          addLog(`${character.name} fails ${saveAbility.toUpperCase()} save (${save.total} vs DC ${saveDC})!`, 'miss');
        } else {
          addLog(`${character.name} succeeds ${saveAbility.toUpperCase()} save (${save.total} vs DC ${saveDC})!`, 'info');
        }
      } else {
        // If we already rolled a save for damage, check if they failed
        const save = rollPlayerSavingThrow(saveAbility);
        saveFailed = save.total < saveDC;
      }

      if (saveFailed) {
        if (effectLower.includes('frighten') || effectLower === 'fear') {
          addLog(`${character.name} is Frightened!`, 'condition');
          updateCharacter(prev => ({
            ...prev,
            conditions: [...prev.conditions.filter(c => c.type !== 'frightened'),
            { type: 'frightened', name: 'Frightened', description: 'Disadvantage on attacks while frightened.', duration: 1, source: enemy.name }]
          }));
        }
        if (effectLower.includes('paralyze') || effectLower.includes('paralyz')) {
          addLog(`${character.name} is Paralyzed!`, 'condition');
          updateCharacter(prev => ({
            ...prev,
            conditions: [...prev.conditions.filter(c => c.type !== 'paralyzed'),
            { type: 'paralyzed', name: 'Paralyzed', description: 'Cannot move or take actions.', duration: 1, source: enemy.name }]
          }));
        }
        if (effectLower.includes('blind') || effectLower === 'blinded') {
          addLog(`${character.name} is Blinded!`, 'condition');
          updateCharacter(prev => ({
            ...prev,
            conditions: [...prev.conditions.filter(c => c.type !== 'blinded'),
            { type: 'blinded', name: 'Blinded', description: 'Cannot see; attacks have disadvantage.', duration: 1, source: enemy.name }]
          }));
        }
        if (effectLower.includes('stun') || effectLower === 'stunned') {
          addLog(`${character.name} is Stunned!`, 'condition');
          updateCharacter(prev => ({
            ...prev,
            conditions: [...prev.conditions.filter(c => c.type !== 'stunned'),
            { type: 'stunned', name: 'Stunned', description: 'Cannot move or take actions; attacks against have advantage.', duration: 1, source: enemy.name }]
          }));
        }
        if (effectLower.includes('prone')) {
          addLog(`${character.name} is knocked Prone!`, 'condition');
          updateCharacter(prev => ({
            ...prev,
            conditions: [...prev.conditions.filter(c => c.type !== 'prone'),
            { type: 'prone', name: 'Prone', description: 'Attack rolls against have advantage within 5ft. Standing costs half movement.', duration: 1, source: enemy.name }]
          }));
        }
      }
    }
  };

  // AI function to automatically use legendary actions at the end of other creatures' turns
  const performLegendaryAction = useCallback(() => {
    const legendaryEnemies = enemies.filter(e => !e.isDefeated && e.legendaryActions && e.legendaryActions.length > 0);

    for (const enemy of legendaryEnemies) {
      const remaining = legendaryPoints[enemy.id] ?? 0;
      if (remaining <= 0) continue;

      // AI chooses which legendary action to use based on cost and situation
      const affordableActions = (enemy.legendaryActions || []).filter(a => (a.cost || 1) <= remaining);
      if (affordableActions.length === 0) continue;

      // Prioritize: high damage actions if player is hurt, cheap actions otherwise
      const playerHealthPercent = (playerHp / character.maxHitPoints);
      let chosenAction: typeof affordableActions[0] | undefined;

      if (playerHealthPercent < 0.3) {
        // Player is low - use highest cost action for maximum effect
        chosenAction = affordableActions.reduce((best, current) =>
          (current.cost || 1) > (best?.cost || 1) ? current : best
          , affordableActions[0]);
      } else {
        // Use a random action, weighted toward cheaper ones
        const weights = affordableActions.map(a => 1 / (a.cost || 1));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < affordableActions.length; i++) {
          random -= weights[i];
          if (random <= 0) {
            chosenAction = affordableActions[i];
            break;
          }
        }
        if (!chosenAction) chosenAction = affordableActions[0];
      }

      if (chosenAction) {
        spendLegendaryAction(enemy.id, chosenAction);
      }
    }
  }, [enemies, legendaryPoints, playerHp, character.maxHitPoints]);

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
        const warlockLevel = getLevelInClass(character, 'warlock');
        if (warlockLevel > 0 && character.subclass?.id === 'fiend') {
          const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
          const tempAmount = Math.max(1, chaMod + warlockLevel);

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



  const nextTurn = useCallback(() => {
    // Legendary creatures can take legendary actions at the end of other creatures' turns
    // Check if there are legendary enemies and trigger their actions
    const hasLegendaryEnemies = enemies.some(e => !e.isDefeated && e.legendaryActions && e.legendaryActions.length > 0);
    if (hasLegendaryEnemies) {
      // 50% chance each turn that a legendary creature uses a legendary action
      // This simulates the DM's choice while keeping combat dynamic
      if (Math.random() < 0.5) {
        performLegendaryAction();
      }
    }

    setTimeout(() => {
      setCurrentTurnIndex(prev => {
        // Guard against empty turnOrder (should not happen, but just in case)
        if (turnOrder.length === 0) return 0;
        const nextIndex = (prev + 1) % turnOrder.length;

        // Track if we've completed a full round (back to player)
        const isNewRound = nextIndex === 0;

        // Reset per-turn features when player's turn starts
        // Reset per-turn features when player's turn starts
        if (turnOrder[nextIndex]?.id === 'player') {
          // Update conditions (decrement duration)
          const { expired } = ConditionManager.updateConditions(character);
          if (expired.length > 0) {
            expired.forEach(c => addLog(`${c.name} condition expired.`, 'info'));
            // We need to update character state with new conditions
            updateCharacter(prev => ({
              ...prev,
              conditions: prev.conditions.filter(c => !expired.find(e => e.type === c.type))
            }));
            // Actually updateConditions helper returns the *new* state ideally, but our helper returns *expired* list and assumes we manage state? 
            // Wait, ConditionManager.updateConditions(entity) returns { active, expired }.
            // Let's re-check ConditionManager.ts signature.
          }



          // Reset attack count for the new turn
          setAttacksLeft(maxAttacks);

          // Reset per-turn combat features
          setSneakAttackUsedThisTurn(false);
          setSavageAttackerUsedThisTurn(false);
          setDivineFuryUsedThisTurn(false);
          setPsychicBladesUsedThisTurn(false);
          setCuttingWordsUsedThisTurn(false);

          // Reset Battle Master pending maneuver if not used
          if (pendingManeuver) {
            addLog('Unused maneuver was cancelled.', 'info');
            setPendingManeuver(null);
          }
          setFeintingAttackActive(false);

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
  }, [turnOrder, maxAttacks, enemies, performLegendaryAction, character, updateCharacter]);

  const performEnemyTurn = (enemyId: string) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.isDefeated) {
      nextTurn();
      return;
    }

    const { entity: updatedEnemyEntity, expired } = ConditionManager.updateConditions(enemy);
    let updatedEnemy = updatedEnemyEntity as CombatEnemy;

    if (expired.length > 0) {
      expired.forEach(c => addLog(`${enemy.name}: ${c.name} condition expired.`, 'info'));
    }

    // Process ongoing condition effects (poison damage, etc.)
    const turnEffects = processStartOfTurnConditions(updatedEnemy, enemy.name);
    if (turnEffects.damage > 0) {
      turnEffects.logs.forEach(log => addLog(log.message, log.type));
      const newHp = Math.max(0, updatedEnemy.currentHp - turnEffects.damage);
      updatedEnemy = { ...updatedEnemy, currentHp: newHp, isDefeated: newHp <= 0 };
      if (updatedEnemy.isDefeated) {
        addLog(`${enemy.name} succumbs to ${turnEffects.damageType} damage!`, 'damage');
      }
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

    // Check for Surprised condition specifically (it expires at end of turn, so we check the state before updates)
    if (hasCondition(enemy, 'surprised')) {
      addLog(`${updatedEnemy.name} is surprised and cannot act!`, 'condition');
      // Updated enemy already has condition removed (duration 1 -> 0), so saving it clears it for next turn
      setEnemies(prev => prev.map(e => e.id === enemyId ? updatedEnemy : e));
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

        // Determine Advantage/Disadvantage (includes condition checks via getCombatAdvantage)
        let rollType = getCombatAdvantage(actingEnemy, character, 'melee');

        // Log if enemy has disadvantage due to conditions
        if (actingEnemy.conditions.some(c => ['poisoned', 'blinded', 'frightened', 'restrained'].includes(c.type))) {
          const conditionNames = actingEnemy.conditions
            .filter(c => ['poisoned', 'blinded', 'frightened', 'restrained'].includes(c.type))
            .map(c => c.name)
            .join(', ');
          addLog(`${actingEnemy.name} attacks with Disadvantage (${conditionNames})!`, 'condition');
        }

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

        // Light Cleric: Warding Flare - impose disadvantage on attacker
        if (shouldUseWardingFlare()) {
          useWardingFlare(actingEnemy.name);
          rollType = rollType === 'advantage' ? 'normal' : 'disadvantage';
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

            // Battle Master: Parry - reduce damage on melee hit
            const isMeleeAttack = action.type === 'melee' || !action.type;
            if (shouldAutoParry(isMeleeAttack)) {
              const parryReduction = calculateParryReduction();
              if (parryReduction > 0) {
                damageRoll = Math.max(0, damageRoll - parryReduction);
              }
            }

            addLog(`${actingEnemy.name} ${t('combat.hits')} ${character.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage');

            const incomingDamageType = actionDamageType || detectDamageType(actingEnemy.damage || '');
            applyEnemyDamageToPlayer(actingEnemy, damageRoll, incomingDamageType);

            // Tempest Cleric: Wrath of the Storm - deal damage when hit by melee
            if (shouldUseWrathOfTheStorm() && isMeleeAttack) {
              useWrathOfTheStorm(actingEnemy);
            }
          }
        } else {
          addLog(`${actingEnemy.name} ${t('combat.attacks')} ${character.name} ${t('combat.butMisses')}`, 'miss');

          // Battle Master: Riposte - counter-attack on melee miss
          const isMeleeAttack = action.type === 'melee' || !action.type;
          if (isBattleMaster && superiorityDiceLeft > 0 && !reactionUsed && isMeleeAttack) {
            executeRiposte(actingEnemy.id);
          }
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


  const handleHide = () => {
    if (isRolling) return;

    // Check if can act
    if (!canTakeAction(character)) {
      addLog(`${character.name} cannot act!`, 'condition');
      return;
    }

    const isHidden = character.conditions.some(c => c.type === 'hidden');
    if (isHidden) {
      addLog(`${character.name} is already hidden.`, 'info');
      return;
    }

    // Determine Action Cost
    let isBonusAction = false;
    // Rogue Cunning Action (Level 2+) - supports multiclassing
    if (hasClassFeature(character, 'rogue', 2)) {
      isBonusAction = true;
    }
    // Goblin Nimble Escape
    if ((character.race.traits || []).includes('Nimble Escape')) {
      isBonusAction = true;
    }

    if (isBonusAction) {
      if (bonusActionUsed) {
        addLog('Already used Bonus Action this turn.', 'warning');
        return;
      }
    } else {
      if (attacksLeft < maxAttacks) { // Simplified check for "Action used"
        addLog('Action already used.', 'warning');
        return;
      }
    }

    // Calculate Highest Passive Perception among enemies
    const highestPassive = enemies
      .filter(e => !e.isDefeated)
      .reduce((max, e) => {
        const wisdom = e.abilityScores?.wisdom || 10;
        const mod = Math.floor((wisdom - 10) / 2);
        const passive = 10 + mod + (e.skills?.perception || 0);
        return Math.max(max, passive);
      }, 10);

    // Roll Stealth
    const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
    const proficiency = character.skills.stealth?.proficient ? character.proficiencyBonus : 0;
    const expertise = character.skills.stealth?.expertise ? character.proficiencyBonus : 0;
    const modifier = dexMod + proficiency + expertise;

    // Check for heavy armor disadvantage on Stealth
    const equippedArmor = character.equippedArmor;
    const hasStealthDisadvantage = equippedArmor?.properties?.includes('stealth-disadvantage') ||
      equippedArmor?.type === 'heavy';

    setAttackDetails({ name: 'Hide (Stealth)', dc: highestPassive, modifier });
    setIsRolling(true);
    setShowDiceModal(true);

    let baseRoll = rollDice(20);
    if (hasStealthDisadvantage) {
      const secondRoll = rollDice(20);
      baseRoll = Math.min(baseRoll, secondRoll);
      addLog(`Heavy armor imposes disadvantage on Stealth (rolled ${baseRoll} and ${secondRoll}, using ${baseRoll}).`, 'info');
    }
    const roll = applyHalflingLucky(baseRoll, 'Hide (Stealth)');
    const total = roll + modifier;
    const isCritical = roll === 20;
    const isCriticalFailure = roll === 1;

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical, isCriticalFailure });

    setPendingCombatAction(() => () => {
      if (total >= highestPassive) {
        applyPlayerCondition({
          type: 'hidden',
          name: 'Hidden',
          description: 'Unseen by enemies. Advantage on attacks, attacks against you have disadvantage.',
          duration: -1,
          source: 'Stealth'
        });
        addLog(`${character.name} slips into the shadows! (Stealth ${total} vs DC ${highestPassive})`, 'info');
      } else {
        addLog(`${character.name} tries to hide but is spotted! (Stealth ${total} vs DC ${highestPassive})`, 'miss');
      }

      if (isBonusAction) {
        setBonusActionUsed(true);
      } else {
        // Consume Action: clear attacks
        setAttacksLeft(0);
      }
      // Note: Hiding doesn't end turn automatically
    });
  };

  /**
   * Dodge Action - imposes disadvantage on attacks against you until your next turn
   */
  const handleDodge = () => {
    if (isRolling) return;

    // Check if can act
    if (!canTakeAction(character)) {
      addLog(`${character.name} cannot act!`, 'condition');
      return;
    }

    // Check if action is available
    if (attacksLeft < maxAttacks) {
      addLog('Action already used this turn.', 'warning');
      return;
    }

    // Apply dodging condition
    applyPlayerCondition({
      type: 'invisible' as Condition['type'], // Using invisible for disadvantage on attacks
      name: 'Dodging',
      description: 'Attacks against you have disadvantage. Advantage on DEX saves.',
      duration: 1,
      source: 'Dodge Action'
    });

    addLog(`${character.name} takes the Dodge action! Attacks against you have disadvantage.`, 'info');

    // Consume action
    setAttacksLeft(0);
    nextTurn();
  };

  const handlePlayerAttack = () => {
    if (!selectedEnemy || isRolling) return;
    if (attacksLeft <= 0) {
      addLog('No attacks remaining this turn!', 'miss');
      return;
    }
    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    if (!canTakeAction(character)) {
      addLog(`${character.name} cannot act!`, 'condition');
      return;
    }

    const weaponProps = character.equippedWeapon?.properties || [];
    const isRanged = weaponProps.includes('ranged');

    // Determine Advantage/Disadvantage using centralized mechanics
    let rollType = getAttackRollModifier(character, enemy, isRanged ? 'ranged' : 'melee');

    // Notify if hidden (ConditionManager/mechanics handles the math, but we want to log it specifically if we want)
    // Actually getAttackRollModifier handles the math. We just check for logging here if desired
    // Notifying if hidden (ConditionManager/mechanics handles the math, but we want to log it specifically if we want)
    if (character.conditions.some(c => c.type === 'hidden')) {
      addLog(`${character.name} attacks from the shadows! (Advantage)`, 'info');
    }
    const isHidden = character.conditions.some(c => c.type === 'hidden');

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

    // Battle Master: Feinting Attack - advantage on next attack
    if (feintingAttackActive) {
      if (rollType === 'disadvantage') {
        rollType = 'normal';
      } else {
        rollType = 'advantage';
      }
      addLog('Feinting Attack: Advantage on attack!', 'info');
    }

    // Wild Magic Sorcerer: Tides of Chaos - advantage on next roll
    if (consumeTidesOfChaos()) {
      if (rollType === 'disadvantage') {
        rollType = 'normal';
      } else {
        rollType = 'advantage';
      }
      addLog('Tides of Chaos: Advantage on attack!', 'info');
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

    // Battle Master: Precision Attack bonus
    const precisionBonus = applyPrecisionAttack();
    if (precisionBonus > 0) {
      finalAttackModifier += precisionBonus;
    }

    // Bless: Add 1d4 to attack roll
    let blessBonus = 0;
    if (character.conditions.some(c => c.type === 'blessed')) {
      blessBonus = rollDice(4);
      addLog(`Bless! +${blessBonus} to attack!`, 'info');
    }

    const total = roll + finalAttackModifier + inspirationRoll + blessBonus;

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

    // Auto-crit: Paralyzed or Unconscious enemies (melee only)
    const isConditionAutoCrit = !isRanged &&
      enemy.conditions.some(c => c.type === 'paralyzed' || c.type === 'unconscious') &&
      total >= targetAC;

    if (isConditionAutoCrit && !isCritical) {
      addLog(`Critical Hit! ${enemy.name} is helpless!`, 'damage');
    }

    setDiceResult(roll);
    setRollResult({ roll, total, isCritical: isCritical || isAssassinateCrit || isConditionAutoCrit, isCriticalFailure });

    // Check if Divine Soul Sorcerer can boost a failed attack
    if (total < targetAC && !isCritical) {
      checkFavoredByTheGodsBoost(total, targetAC, () => {
        // This callback is called when the player uses Favored by the Gods
        // The boost is handled in useFavoredByTheGods which updates rollResult
      });
    }

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
        // Sneak Attack: Swashbuckler Rakish Audacity (can sneak attack 1v1)
        if (isRogue && !sneakAttackUsedThisTurn && rakishAudacity?.soloSneakAttack) {
          const sneakDice = Math.ceil(character.level / 2);
          const sneakDamage = rollDice(6) * sneakDice;
          damageRoll += sneakDamage;
          addLog(`Rakish Audacity Sneak Attack! (+${sneakDamage} damage)`, 'info');
          setSneakAttackUsedThisTurn(true);
        }

        // Battle Master: Apply on-hit maneuver effects
        if (pendingManeuver && isBattleMaster) {
          damageRoll = applyManeuverOnHit(enemy, damageRoll);
        }

        const damageType = weaponDamageType || detectDamageType(enemy.damage || '');
        const { adjustedDamage, note } = adjustDamageForDefenses(enemy, damageRoll, damageType, { isMagical: isMagicalWeapon });

        // Warn player if their weapon cannot hurt this enemy
        if (adjustedDamage === 0 && damageRoll > 0) {
          addLog(`⚠️ ${enemy.name} is immune to ${damageType} damage!`, 'warning');
          if (!isMagicalWeapon && note?.includes('nonmagical')) {
            addLog(`💡 Tip: You need a magic weapon to harm this creature!`, 'info');
          }
        } else {
          addLog(`${character.name} hits ${enemy.name} for ${adjustedDamage} damage!`, 'damage');
        }

        if (note) {
          addLog(`${enemy.name} ${note}.`, 'info');
        }
        applyDamageToEnemy(enemy.id, adjustedDamage, damageType, { preAdjusted: true });

        // === WEAPON ON-HIT CONDITIONS ===
        const onHitEffects = getWeaponOnHitConditions(character.equippedWeapon);
        for (const effect of onHitEffects) {
          let conditionApplied = false;

          if (effect.saveDC && effect.saveAbility) {
            // Target makes a saving throw
            const saveBonus = getEnemySavingThrowBonus(enemy, effect.saveAbility);
            const saveRoll = rollDice(20) + saveBonus;

            if (saveRoll < effect.saveDC) {
              conditionApplied = true;
              addLog(`${enemy.name} fails ${effect.saveAbility.toUpperCase()} save (${saveRoll} vs DC ${effect.saveDC})!`, 'condition');

              // Apply extra damage if any
              if (effect.extraDamage) {
                const extraDmg = rollDamageFromString(effect.extraDamage);
                applyDamageToEnemy(enemy.id, extraDmg, 'poison', { preAdjusted: false });
                addLog(`${enemy.name} takes ${extraDmg} poison damage from ${effect.description}!`, 'damage');
              }
            } else {
              addLog(`${enemy.name} resists ${effect.description} (${saveRoll} vs DC ${effect.saveDC}).`, 'info');
            }
          } else {
            // No save required (e.g., Net)
            conditionApplied = true;
          }

          if (conditionApplied) {
            // Apply the condition to the enemy
            setEnemies(prev => prev.map(e => {
              if (e.id !== enemy.id) return e;
              // Use ConditionManager to add condition
              const updatedEnemy = ConditionManager.addCondition(e, effect.condition, effect.duration, effect.description);
              return updatedEnemy as CombatEnemy;
            }));
            addLog(`${enemy.name} is ${effect.condition}! (${effect.description})`, 'condition');
          }
        }
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
  const healerFeatUsed = character.featureUses?.healerFeatUsed ?? false;

  const handleHealerAction = () => {
    if (!character.feats?.includes('healer')) return;
    if (healerFeatUsed) {
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
      const currentUses = prev.featureUses || getDefaultFeatureUses(prev);
      return {
        ...prev,
        hitPoints: newHp,
        featureUses: { ...currentUses, healerFeatUsed: true }
      };
    });

    addLog(`${character.name} uses Healer's Kit mastery to heal for ${healing} HP!`, 'info');
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
  const inspiringLeaderUsed = character.featureUses?.inspiringLeaderUsed ?? false;

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
      const currentUses = prev.featureUses || getDefaultFeatureUses(prev);
      return {
        ...prev,
        temporaryHitPoints: Math.max(currentTemp, tempHp),
        featureUses: { ...currentUses, inspiringLeaderUsed: true }
      };
    });

    addLog(`${character.name} delivers an inspiring speech! Gained ${tempHp} temporary HP!`, 'info');
  };

  // ==========================================
  // BATTLE MASTER MANEUVERS
  // ==========================================

  /**
   * Activate a maneuver that triggers on the next attack (Precision, Trip, Menacing, etc.)
   */
  const activateManeuver = (maneuverId: string) => {
    if (!isBattleMaster || superiorityDiceLeft <= 0) {
      addLog('No superiority dice remaining!', 'miss');
      return;
    }

    const maneuver = BATTLE_MASTER_MANEUVERS.find(m => m.id === maneuverId);
    if (!maneuver) return;

    // For on-attack and on-hit maneuvers, set as pending
    if (maneuver.timing === 'on-attack' || maneuver.timing === 'on-hit') {
      setPendingManeuver(maneuverId);
      addLog(`${character.name} readies ${maneuver.name}!`, 'info');
    }
  };

  /**
   * Rally - bonus action to grant temp HP
   */
  const handleRally = () => {
    if (!isBattleMaster || superiorityDiceLeft <= 0 || bonusActionUsed || !isPlayerTurn) return;

    const dieRoll = rollSuperiorityDie(character.level);
    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    const tempHp = dieRoll + Math.max(0, chaMod);

    setSuperiorityDiceLeft(prev => prev - 1);
    setBonusActionUsed(true);

    updateCharacter(prev => {
      if (!prev) return prev;
      const currentTemp = prev.temporaryHitPoints || 0;
      return {
        ...prev,
        temporaryHitPoints: Math.max(currentTemp, tempHp)
      };
    });

    addLog(`${character.name} rallies! Gained ${tempHp} temporary HP!`, 'heal');
  };

  /**
   * Feinting Attack - bonus action for advantage + damage on next attack
   */
  const handleFeintingAttack = () => {
    if (!isBattleMaster || superiorityDiceLeft <= 0 || bonusActionUsed || !isPlayerTurn) return;

    setFeintingAttackActive(true);
    setPendingManeuver('feinting-attack');
    setBonusActionUsed(true);

    addLog(`${character.name} feints, gaining advantage on the next attack!`, 'info');
  };

  /**
   * Apply a maneuver's effect after hitting (called from attack resolution)
   */
  const applyManeuverOnHit = (enemy: CombatEnemyState, baseDamage: number): number => {
    if (!pendingManeuver || !isBattleMaster) return baseDamage;

    const maneuver = BATTLE_MASTER_MANEUVERS.find(m => m.id === pendingManeuver);
    if (!maneuver) return baseDamage;

    // For on-hit maneuvers, consume die and apply effects
    if (maneuver.timing === 'on-hit') {
      setSuperiorityDiceLeft(prev => prev - 1);
      const dieRoll = rollSuperiorityDie(character.level);
      let totalDamage = baseDamage;

      // Add damage from die
      if (maneuver.effect.addDamageDie) {
        totalDamage += dieRoll;
        addLog(`${maneuver.name}: +${dieRoll} damage!`, 'damage');
      }

      // Apply saving throw effect
      if (maneuver.effect.targetSave && maneuver.effect.onFailedSave) {
        const strMod = Math.floor((character.abilityScores.strength - 10) / 2);
        const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
        const saveDC = 8 + character.proficiencyBonus + Math.max(strMod, dexMod);

        // Enemy save
        const enemySaveBonus = getEnemySavingThrowBonus(enemy, maneuver.effect.targetSave);
        const saveRoll = rollDice(20) + enemySaveBonus;

        if (saveRoll < saveDC) {
          // Failed save - apply condition
          const condition = maneuver.effect.onFailedSave.condition;
          if (condition === 'prone') {
            setEnemies(prev => prev.map(e =>
              e.id === enemy.id ? {
                ...e,
                conditions: [...e.conditions, {
                  type: 'prone',
                  name: 'Prone',
                  description: 'Attack rolls within 5 feet have advantage. Disadvantage on attacks.',
                  duration: -1,
                  source: maneuver.name
                }]
              } : e
            ));
            addLog(`${enemy.name} is knocked prone! (Save ${saveRoll} vs DC ${saveDC})`, 'condition');
          } else if (condition === 'frightened') {
            setEnemies(prev => prev.map(e =>
              e.id === enemy.id ? {
                ...e,
                conditions: [...e.conditions, {
                  type: 'frightened',
                  name: 'Frightened',
                  description: 'Disadvantage on ability checks and attacks while source is in sight.',
                  duration: 1,
                  source: maneuver.name
                }]
              } : e
            ));
            addLog(`${enemy.name} is frightened! (Save ${saveRoll} vs DC ${saveDC})`, 'condition');
          } else if (condition === 'pushed') {
            addLog(`${enemy.name} is pushed back ${maneuver.effect.onFailedSave.pushDistance} feet! (Save ${saveRoll} vs DC ${saveDC})`, 'info');
          } else if (condition === 'disarmed') {
            // Apply disarmed - enemy has disadvantage on attacks
            setEnemies(prev => prev.map(e =>
              e.id === enemy.id ? {
                ...e,
                conditions: [...e.conditions, {
                  type: 'restrained', // Use restrained for disadvantage effect
                  name: 'Disarmed',
                  description: 'Dropped weapon. Disadvantage on attacks until recovered.',
                  duration: 1,
                  source: maneuver.name
                }]
              } : e
            ));
            addLog(`${enemy.name} is disarmed! (Save ${saveRoll} vs DC ${saveDC})`, 'condition');
          } else if (condition === 'goaded') {
            // Apply goaded - tracked separately to affect AI targeting
            setEnemies(prev => prev.map(e =>
              e.id === enemy.id ? {
                ...e,
                conditions: [...e.conditions, {
                  type: 'charmed', // Use charmed as proxy for goaded
                  name: 'Goaded',
                  description: 'Has disadvantage on attacks against targets other than the Battle Master.',
                  duration: 1,
                  source: `${character.name} (Goading Attack)`
                }]
              } : e
            ));
            addLog(`${enemy.name} is goaded into focusing on ${character.name}! (Save ${saveRoll} vs DC ${saveDC})`, 'condition');
          }
        } else {
          addLog(`${enemy.name} resists the maneuver! (Save ${saveRoll} vs DC ${saveDC})`, 'info');
        }
      }

      // Clear pending maneuver
      setPendingManeuver(null);
      setFeintingAttackActive(false);

      return totalDamage;
    }

    // For feinting attack, just add damage die (advantage was already applied)
    if (pendingManeuver === 'feinting-attack') {
      setSuperiorityDiceLeft(prev => prev - 1);
      const dieRoll = rollSuperiorityDie(character.level);
      addLog(`Feinting Attack: +${dieRoll} damage!`, 'damage');
      setPendingManeuver(null);
      setFeintingAttackActive(false);
      return baseDamage + dieRoll;
    }

    return baseDamage;
  };

  /**
   * Apply Precision Attack - add superiority die to attack roll (called before hit determination)
   */
  const applyPrecisionAttack = (): number => {
    if (pendingManeuver !== 'precision-attack' || !isBattleMaster || superiorityDiceLeft <= 0) return 0;

    setSuperiorityDiceLeft(prev => prev - 1);
    const dieRoll = rollSuperiorityDie(character.level);
    setPendingManeuver(null);

    addLog(`Precision Attack: +${dieRoll} to attack roll!`, 'info');
    return dieRoll;
  };

  /**
   * Execute Riposte - counter-attack when enemy misses
   */
  const executeRiposte = (enemyId: string) => {
    if (!isBattleMaster || superiorityDiceLeft <= 0 || reactionUsed) return;

    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.isDefeated) {
      return;
    }

    setReactionUsed(true);
    setSuperiorityDiceLeft(prev => prev - 1);

    // Make a weapon attack
    const abilityMod = Math.max(
      Math.floor((character.abilityScores.strength - 10) / 2),
      Math.floor((character.abilityScores.dexterity - 10) / 2)
    );
    const attackRoll = rollDice(20);
    const total = attackRoll + abilityMod + character.proficiencyBonus;
    const targetAC = getEnemyEffectiveAC(enemy);

    if (attackRoll === 1) {
      addLog(`Riposte: Critical miss! (${attackRoll})`, 'miss');
    } else if (total >= targetAC || attackRoll === 20) {
      const baseDamage = rollDice(8) + abilityMod; // Assume d8 weapon
      const superiorityDamage = rollSuperiorityDie(character.level);
      const totalDamage = baseDamage + superiorityDamage;

      addLog(`Riposte! ${character.name} counter-attacks ${enemy.name} for ${totalDamage} damage! (${total} vs AC ${targetAC})`, 'damage');

      setEnemies(prev => prev.map(e => {
        if (e.id === enemyId) {
          const newHp = Math.max(0, e.currentHp - totalDamage);
          return { ...e, currentHp: newHp, isDefeated: newHp <= 0 };
        }
        return e;
      }));
    } else {
      addLog(`Riposte: ${character.name}'s counter-attack misses! (${total} vs AC ${targetAC})`, 'miss');
    }
  };

  /**
   * Execute Parry - reduce incoming damage (returns reduced damage amount)
   * Called during enemy attack resolution
   */
  const calculateParryReduction = (): number => {
    if (!isBattleMaster || superiorityDiceLeft <= 0 || reactionUsed) {
      return 0; // No reduction possible
    }

    setReactionUsed(true);
    setSuperiorityDiceLeft(prev => prev - 1);

    const dieRoll = rollSuperiorityDie(character.level);
    const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
    const reduction = dieRoll + dexMod;

    addLog(`Parry! Reducing damage by ${reduction}!`, 'info');
    return reduction;
  };

  /**
   * Check if Parry should auto-trigger (for simplicity, auto-parry on melee hits when available)
   */
  const shouldAutoParry = (isMeleeAttack: boolean): boolean => {
    return isBattleMaster && superiorityDiceLeft > 0 && !reactionUsed && isMeleeAttack;
  };

  // ==========================================
  // CLERIC DOMAIN REACTIONS
  // ==========================================

  /**
   * Warding Flare (Light Domain) - Impose disadvantage on attacker
   * Returns true if flare was used
   */
  const shouldUseWardingFlare = (): boolean => {
    return isLightCleric && wardingFlareUses > 0 && !reactionUsed;
  };

  const useWardingFlare = (attackerName: string): void => {
    if (!shouldUseWardingFlare()) return;

    setWardingFlareUses(prev => prev - 1);
    setReactionUsed(true);
    addLog(`Warding Flare! ${attackerName} has disadvantage on this attack!`, 'info');
  };

  /**
   * Wrath of the Storm (Tempest Domain) - Deal lightning/thunder damage when hit
   */
  const shouldUseWrathOfTheStorm = (): boolean => {
    return isTempestCleric && wrathOfTheStormUses > 0 && !reactionUsed;
  };

  const useWrathOfTheStorm = (attacker: CombatEnemyState): void => {
    if (!shouldUseWrathOfTheStorm()) return;

    setWrathOfTheStormUses(prev => prev - 1);
    setReactionUsed(true);

    const wisMod = Math.floor((character.abilityScores.wisdom - 10) / 2);
    const saveDC = 8 + character.proficiencyBonus + wisMod;
    const saveBonus = getEnemySavingThrowBonus(attacker, 'dexterity');
    const saveRoll = rollDice(20) + saveBonus;

    // 2d8 lightning or thunder damage
    let damage = rollDice(8) + rollDice(8);

    if (saveRoll >= saveDC) {
      damage = Math.floor(damage / 2);
      addLog(`Wrath of the Storm! ${attacker.name} takes ${damage} lightning damage (DEX save ${saveRoll} vs DC ${saveDC} - half)!`, 'damage');
    } else {
      addLog(`Wrath of the Storm! ${attacker.name} takes ${damage} lightning damage (DEX save ${saveRoll} vs DC ${saveDC} - failed)!`, 'damage');
    }

    setEnemies(prev => prev.map(e => {
      if (e.id === attacker.id) {
        const newHp = Math.max(0, e.currentHp - damage);
        return { ...e, currentHp: newHp, isDefeated: newHp <= 0 };
      }
      return e;
    }));
  };

  // ==========================================
  // WIZARD SUBCLASS FEATURES
  // ==========================================

  /**
   * Arcane Ward (Abjuration) - Absorb damage
   * Returns amount of damage absorbed (reduced from incoming)
   */
  const absorbDamageWithArcaneWard = (incomingDamage: number): number => {
    if (!isAbjurationWizard || arcaneWardHp <= 0) return 0;

    const absorbed = Math.min(arcaneWardHp, incomingDamage);
    setArcaneWardHp(prev => prev - absorbed);

    if (absorbed > 0) {
      addLog(`Arcane Ward absorbs ${absorbed} damage! (${arcaneWardHp - absorbed} HP remaining)`, 'info');
    }

    return absorbed;
  };

  // ==========================================
  // SORCERER SUBCLASS FEATURES
  // ==========================================

  /**
   * Tides of Chaos (Wild Magic) - Gain advantage on one roll
   */
  const activateTidesOfChaos = (): void => {
    if (!isWildMagicSorcerer || tidesOfChaosAvailable <= 0) return;

    setTidesOfChaosAvailable(prev => prev - 1);
    setTidesOfChaosActive(true);
    addLog(`Tides of Chaos activated! Advantage on next attack, check, or save!`, 'info');
  };

  /**
   * Consume Tides of Chaos advantage (returns true if active)
   */
  const consumeTidesOfChaos = (): boolean => {
    if (!tidesOfChaosActive) return false;
    setTidesOfChaosActive(false);
    return true;
  };

  /**
   * Favored by the Gods (Divine Soul) - Add 2d4 to failed save/attack
   * Called when player clicks the boost button in dice modal
   */
  const useFavoredByTheGods = (): void => {
    if (!isDivineSoulSorcerer || favoredByTheGodsAvailable <= 0 || !boostCallback) return;

    setFavoredByTheGodsAvailable(prev => prev - 1);
    const bonus = rollDice(4) + rollDice(4);
    addLog(`Favored by the Gods! Added +${bonus} to the roll!`, 'info');

    // Update the displayed roll result
    if (rollResult) {
      const newTotal = rollResult.total + bonus;
      setRollResult({
        ...rollResult,
        total: newTotal
      });
    }

    // Call the boost callback with the bonus
    boostCallback(bonus);

    // Disable further boosting
    setCanBoostRoll(false);
    setBoostCallback(null);
  };

  /**
   * Check if current roll can be boosted by Favored by the Gods
   */
  const checkFavoredByTheGodsBoost = (
    rollTotal: number,
    targetDC: number,
    onBoost: (bonus: number) => void
  ): void => {
    // Only Divine Soul Sorcerers with uses remaining can boost
    if (!isDivineSoulSorcerer || favoredByTheGodsAvailable <= 0) return;

    // Only offer boost if the roll failed but could potentially succeed with 2d4 (2-8)
    const maxBoost = 8;
    if (rollTotal < targetDC && rollTotal + maxBoost >= targetDC) {
      setCanBoostRoll(true);
      setBoostCallback(() => onBoost);
    }
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
    // Check if this is a cantrip first - cantrips don't need preparation
    const isCantrip = spell.level === 0;
    const preparedOk = options?.bypassPreparation
      ? true
      : !isPreparedCaster(character.class.name) || isCantrip || preparedList.includes(spellId);
    if (!preparedOk) {
      addLog(`${spell.name} is not prepared.`, 'miss');
      return;
    }

    const abilityKey = getSpellcastingAbility(character.class.name);
    const abilityMod = Math.floor((character.abilityScores[abilityKey] - 10) / 2);
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
      // Check if this is an AoE spell
      const isAoE = spell.areaOfEffect && spell.areaOfEffect.size > 0;

      // For AoE spells, target all living enemies
      // For single-target spells, require a selected enemy
      const targetEnemies = isAoE
        ? enemies.filter(e => !e.isDefeated)
        : selectedEnemy
          ? [enemies.find(e => e.id === selectedEnemy)].filter(Boolean) as typeof enemies
          : [];

      if (targetEnemies.length === 0) {
        if (!isAoE) {
          addLog('No target selected.', 'miss');
        }
        return;
      }

      // Get base spell DC
      let spellDC = getSpellSaveDC(character);
      if (character.pactBoon === 'Pact of the Tome') {
        spellDC += 1;
      }

      // Get damage type
      const damageType = spell.damageType || detectDamageType(spell.damage || spell.name || '');

      // Process each target
      let totalDamageDealt = 0;
      const hitEnemies: string[] = [];

      for (const targetEnemy of targetEnemies) {
        if (!targetEnemy) continue;

        // Roll base damage (same roll for all targets based on D&D rules)
        const baseDamageRoll = parseDice(damageOrHealingFormula || '1d6');
        let finalDamage = baseDamageRoll;

        // Metamagic: Empowered Spell (only once per cast)
        if (empoweredSpellUsed && targetEnemy === targetEnemies[0]) {
          const bonus = rollDice(6);
          finalDamage += bonus;
          setEmpoweredSpellUsed(false);
          addLog(`Empowered Spell! Added ${bonus} damage.`, 'info');
        }

        // Warlock Eldritch Invocations for Eldritch Blast
        if (!isAoE && spell.id === 'eldritch-blast' && character.class.name.toLowerCase() === 'warlock') {
          const invocations = character.eldritchInvocations || [];

          // Agonizing Blast: Add CHA to damage (requires level 2)
          if ((invocations.includes('agonizing-blast') || character.level >= 2)) {
            const charismaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
            finalDamage += charismaMod;
            addLog(`Agonizing Blast! (+${charismaMod} damage)`, 'info');
          }

          // Repelling Blast: Push target 10ft
          if (invocations.includes('repelling-blast')) {
            addLog(`Repelling Blast! ${targetEnemy.name} is pushed 10 feet!`, 'info');
          }
        }

        // Warlock: Hex Damage
        if (targetEnemy.conditions.some(c => c.type === 'hexed')) {
          const hexDamage = rollDice(6);
          finalDamage += hexDamage;
          addLog(`Hex! (+${hexDamage} necrotic damage to ${targetEnemy.name})`, 'info');
        }

        // Handle Saving Throw
        let savedForHalf = false;
        if (spell.saveType) {
          const saveAbility = spell.saveType as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

          if (autoFailsSave(targetEnemy, saveAbility)) {
            addLog(`${targetEnemy.name} auto-fails ${saveAbility.toUpperCase()} save! (incapacitated)`, 'condition');
          } else {
            const saveRoll = rollDice(20);
            const saveBonus = getEnemySavingThrowBonus(targetEnemy, spell.saveType);
            const saveTotal = saveRoll + saveBonus;

            if (saveTotal >= spellDC) {
              savedForHalf = true;
              finalDamage = Math.floor(baseDamageRoll / 2);
              if (isAoE) {
                addLog(`${targetEnemy.name} saves! (${saveTotal} vs DC ${spellDC}) - Half damage`, 'info');
              }
            } else {
              if (isAoE) {
                addLog(`${targetEnemy.name} fails save! (${saveTotal} vs DC ${spellDC})`, 'damage');
              }
            }
          }
        }

        // Apply resistances/immunities
        const { adjustedDamage, note } = adjustDamageForDefenses(targetEnemy, finalDamage, damageType, { isSpell: true, isMagical: true });
        finalDamage = adjustedDamage;
        if (note) {
          addLog(`${targetEnemy.name} ${note}.`, 'info');
        }

        // Apply damage
        if (finalDamage > 0) {
          applyDamageToEnemy(targetEnemy.id, finalDamage, damageType, { preAdjusted: true });
          totalDamageDealt += finalDamage;
          hitEnemies.push(`${targetEnemy.name} (${finalDamage}${savedForHalf ? ' - saved' : ''})`);
        }
      }

      // Log the spell cast
      if (isAoE) {
        const aoeType = spell.areaOfEffect?.type || 'area';
        const aoeSize = spell.areaOfEffect?.size || 0;
        addLog(`💥 ${character.name} casts ${spell.name}! (${aoeSize}ft ${aoeType})`, 'damage');
        if (hitEnemies.length > 0) {
          addLog(`Hits: ${hitEnemies.join(', ')}`, 'damage');
        }
      } else {
        const singleTarget = targetEnemies[0];
        addLog(`${character.name} casts ${spell.name} on ${singleTarget?.name} for ${totalDamageDealt} ${damageType} damage!`, 'damage');
      }

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

      // BUFF SPELLS
    } else if (spell.id === 'bless') {
      // Bless: +1d4 to attacks and saves
      applyPlayerCondition({
        type: 'blessed' as Condition['type'],
        name: 'Blessed',
        description: 'Add 1d4 to attack rolls and saving throws.',
        duration: 10,
        source: 'Bless'
      });
      addLog(`${character.name} casts Bless! +1d4 to attacks and saves.`, 'info');

    } else if (spell.id === 'bane') {
      // Bane: Up to 3 enemies -1d4 to attacks and saves (CHA save)
      const livingEnemies = enemies.filter(e => !e.isDefeated);
      const spellDC = getSpellSaveDC(character);
      let affectedCount = 0;

      for (const enemy of livingEnemies.slice(0, 3)) {
        const saveBonus = getEnemySavingThrowBonus(enemy, 'charisma');
        const saveRoll = rollDice(20) + saveBonus;

        if (saveRoll < spellDC) {
          const baneCondition: Condition = {
            type: 'poisoned' as Condition['type'], // Use poisoned as proxy for disadvantage
            name: 'Baned',
            description: 'Subtract 1d4 from attack rolls and saving throws.',
            duration: 10,
            source: 'Bane'
          };
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, conditions: [...e.conditions, baneCondition] } : e
          ));
          addLog(`${enemy.name} is affected by Bane! (Save ${saveRoll} vs DC ${spellDC})`, 'condition');
          affectedCount++;
        } else {
          addLog(`${enemy.name} resists Bane! (Save ${saveRoll} vs DC ${spellDC})`, 'info');
        }
      }
      addLog(`${character.name} casts Bane! ${affectedCount} enemies affected.`, 'info');

    } else if (spell.id === 'hunters-mark') {
      // Hunter's Mark: Like Hex but for Rangers
      if (!selectedEnemy) return;
      const markCondition: Condition = {
        type: 'hexed' as Condition['type'], // Use same type as Hex for damage tracking
        name: "Hunter's Mark",
        description: 'Takes extra 1d6 damage from weapon attacks.',
        duration: 60, // 1 hour
        source: "Hunter's Mark"
      };
      setEnemies(prev => prev.map(e => e.id === selectedEnemy ? { ...e, conditions: [...e.conditions, markCondition] } : e));
      addLog(`${character.name} marks ${enemies.find(e => e.id === selectedEnemy)?.name} as quarry!`, 'condition');

    } else if (spell.id === 'faerie-fire') {
      // Faerie Fire: Outlined enemies grant advantage on attacks (DEX save)
      const livingEnemies = enemies.filter(e => !e.isDefeated);
      const spellDC = getSpellSaveDC(character);
      let affectedCount = 0;

      for (const enemy of livingEnemies) {
        const saveBonus = getEnemySavingThrowBonus(enemy, 'dexterity');
        const saveRoll = rollDice(20) + saveBonus;

        if (saveRoll < spellDC) {
          const faerieCondition: Condition = {
            type: 'restrained' as Condition['type'], // Use restrained for advantage effect
            name: 'Faerie Fire',
            description: 'Outlined in light. Attacks against this creature have advantage.',
            duration: 10,
            source: 'Faerie Fire'
          };
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, conditions: [...e.conditions, faerieCondition] } : e
          ));
          addLog(`${enemy.name} is outlined! (Save ${saveRoll} vs DC ${spellDC})`, 'condition');
          affectedCount++;
        } else {
          addLog(`${enemy.name} resists Faerie Fire! (Save ${saveRoll} vs DC ${spellDC})`, 'info');
        }
      }
      addLog(`${character.name} casts Faerie Fire! ${affectedCount} creatures outlined.`, 'info');

      // CONTROL SPELLS
    } else if (spell.id === 'hold-person') {
      // Hold Person: Paralyze a humanoid (WIS save)
      if (!selectedEnemy) {
        addLog('No target selected.', 'miss');
        return;
      }
      const spellDC = getSpellSaveDC(character);
      const enemy = enemies.find(e => e.id === selectedEnemy);
      if (enemy) {
        const saveBonus = getEnemySavingThrowBonus(enemy, 'wisdom');
        const saveRoll = rollDice(20) + saveBonus;

        if (saveRoll < spellDC) {
          const paralyzedCondition: Condition = {
            type: 'paralyzed',
            name: 'Held',
            description: 'Paralyzed by Hold Person. Auto-fail STR/DEX saves. Attacks from 5ft are crits.',
            duration: 10,
            source: 'Hold Person'
          };
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, conditions: [...e.conditions, paralyzedCondition] } : e
          ));
          addLog(`${enemy.name} is paralyzed! (Save ${saveRoll} vs DC ${spellDC})`, 'condition');
        } else {
          addLog(`${enemy.name} resists Hold Person! (Save ${saveRoll} vs DC ${spellDC})`, 'info');
        }
        addLog(`${character.name} casts Hold Person on ${enemy.name}!`, 'info');
      }

    } else if (spell.id === 'web') {
      // Web: Restrain enemies in area (DEX save)
      const livingEnemies = enemies.filter(e => !e.isDefeated);
      const spellDC = getSpellSaveDC(character);
      let affectedCount = 0;

      for (const enemy of livingEnemies) {
        const saveBonus = getEnemySavingThrowBonus(enemy, 'dexterity');
        const saveRoll = rollDice(20) + saveBonus;

        if (saveRoll < spellDC) {
          const webCondition: Condition = {
            type: 'restrained',
            name: 'Webbed',
            description: 'Restrained by sticky webs. Speed 0, disadvantage on attacks, attacks against have advantage.',
            duration: 60, // 1 hour concentration
            source: 'Web'
          };
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, conditions: [...e.conditions, webCondition] } : e
          ));
          addLog(`${enemy.name} is caught in the web! (Save ${saveRoll} vs DC ${spellDC})`, 'condition');
          affectedCount++;
        } else {
          addLog(`${enemy.name} avoids the web! (Save ${saveRoll} vs DC ${spellDC})`, 'info');
        }
      }
      addLog(`${character.name} casts Web! ${affectedCount} creatures restrained.`, 'info');

    } else if (spell.id === 'command') {
      // Command: Force enemy to obey (WIS save, 1 turn)
      if (!selectedEnemy) {
        addLog('No target selected.', 'miss');
        return;
      }
      const spellDC = getSpellSaveDC(character);
      const enemy = enemies.find(e => e.id === selectedEnemy);
      if (enemy) {
        const saveBonus = getEnemySavingThrowBonus(enemy, 'wisdom');
        const saveRoll = rollDice(20) + saveBonus;

        if (saveRoll < spellDC) {
          const commandCondition: Condition = {
            type: 'incapacitated',
            name: 'Commanded',
            description: 'Following a one-word command. Cannot take normal actions.',
            duration: 1,
            source: 'Command'
          };
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, conditions: [...e.conditions, commandCondition] } : e
          ));
          addLog(`${enemy.name} follows your command! (Save ${saveRoll} vs DC ${spellDC})`, 'condition');
        } else {
          addLog(`${enemy.name} resists your command! (Save ${saveRoll} vs DC ${spellDC})`, 'info');
        }
        addLog(`${character.name} commands ${enemy.name}!`, 'info');
      }

    } else if (spell.id === 'entangle') {
      // Entangle: Restrain enemies in area (STR save)
      const livingEnemies = enemies.filter(e => !e.isDefeated);
      const spellDC = getSpellSaveDC(character);
      let affectedCount = 0;

      for (const enemy of livingEnemies) {
        const saveBonus = getEnemySavingThrowBonus(enemy, 'strength');
        const saveRoll = rollDice(20) + saveBonus;

        if (saveRoll < spellDC) {
          const entangleCondition: Condition = {
            type: 'restrained',
            name: 'Entangled',
            description: 'Restrained by grasping plants. Speed 0, disadvantage on attacks.',
            duration: 10,
            source: 'Entangle'
          };
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, conditions: [...e.conditions, entangleCondition] } : e
          ));
          addLog(`${enemy.name} is entangled! (Save ${saveRoll} vs DC ${spellDC})`, 'condition');
          affectedCount++;
        } else {
          addLog(`${enemy.name} breaks free! (Save ${saveRoll} vs DC ${spellDC})`, 'info');
        }
      }
      addLog(`${character.name} casts Entangle! ${affectedCount} creatures restrained.`, 'info');

    } else if (spell.id === 'hypnotic-pattern') {
      // Hypnotic Pattern: AoE charmed + incapacitated (WIS save)
      const livingEnemies = enemies.filter(e => !e.isDefeated);
      const spellDC = getSpellSaveDC(character);
      let affectedCount = 0;

      for (const enemy of livingEnemies) {
        const saveBonus = getEnemySavingThrowBonus(enemy, 'wisdom');
        const saveRoll = rollDice(20) + saveBonus;

        if (saveRoll < spellDC) {
          const hypnoticCondition: Condition = {
            type: 'charmed',
            name: 'Hypnotized',
            description: 'Charmed and incapacitated by swirling colors. Speed 0. Cannot act.',
            duration: 10,
            source: 'Hypnotic Pattern'
          };
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, conditions: [...e.conditions, hypnoticCondition] } : e
          ));
          addLog(`${enemy.name} is mesmerized! (Save ${saveRoll} vs DC ${spellDC})`, 'condition');
          affectedCount++;
        } else {
          addLog(`${enemy.name} looks away! (Save ${saveRoll} vs DC ${spellDC})`, 'info');
        }
      }
      addLog(`${character.name} casts Hypnotic Pattern! ${affectedCount} creatures charmed.`, 'info');

    } else if (spell.id === 'sleep') {
      // Sleep: HP pool mechanic - 5d8 HP puts enemies to sleep from lowest HP first
      let sleepPool = 0;
      for (let i = 0; i < 5; i++) {
        sleepPool += rollDice(8);
      }
      addLog(`${character.name} casts Sleep! Roll: ${sleepPool} HP of creatures.`, 'info');

      // Sort living enemies by current HP (lowest first)
      const livingEnemies = enemies
        .filter(e => !e.isDefeated)
        .sort((a, b) => a.currentHp - b.currentHp);

      let remainingPool = sleepPool;
      let affectedCount = 0;

      for (const enemy of livingEnemies) {
        // Undead and creatures immune to being charmed can't be put to sleep
        const isImmune = (enemy.traits || []).some(t =>
          t.toLowerCase().includes('undead') ||
          t.toLowerCase().includes('charm immunity') ||
          t.toLowerCase().includes('elf')
        );

        if (isImmune) {
          addLog(`${enemy.name} is immune to Sleep!`, 'info');
          continue;
        }

        if (enemy.currentHp <= remainingPool) {
          remainingPool -= enemy.currentHp;
          const sleepCondition: Condition = {
            type: 'unconscious',
            name: 'Sleeping',
            description: 'Magically asleep. Unconscious until damaged or woken.',
            duration: 10,
            source: 'Sleep'
          };
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, conditions: [...e.conditions, sleepCondition] } : e
          ));
          addLog(`${enemy.name} falls asleep! (${enemy.currentHp} HP)`, 'condition');
          affectedCount++;
        } else {
          addLog(`${enemy.name} too hardy to sleep. (${enemy.currentHp} HP > ${remainingPool} remaining)`, 'info');
        }
      }
      addLog(`Sleep affects ${affectedCount} creatures!`, 'info');

    } else if (spell.id === 'banishment') {
      // Banishment: Remove target from combat on failed CHA save
      if (!selectedEnemy) {
        addLog('No target selected.', 'miss');
        return;
      }
      const spellDC = getSpellSaveDC(character);
      const enemy = enemies.find(e => e.id === selectedEnemy);
      if (enemy) {
        const saveBonus = getEnemySavingThrowBonus(enemy, 'charisma');
        const saveRoll = rollDice(20) + saveBonus;

        if (saveRoll < spellDC) {
          // Mark enemy as banished (effectively defeated but can return)
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? {
              ...e,
              isDefeated: true,
              conditions: [...e.conditions, {
                type: 'incapacitated' as Condition['type'],
                name: 'Banished',
                description: 'Sent to a harmless demiplane. Returns if concentration breaks.',
                duration: 10,
                source: 'Banishment'
              }]
            } : e
          ));
          addLog(`${enemy.name} is banished to another plane! (Save ${saveRoll} vs DC ${spellDC})`, 'condition');
          addLog(`💫 ${enemy.name} vanishes!`, 'damage');
        } else {
          addLog(`${enemy.name} resists banishment! (Save ${saveRoll} vs DC ${spellDC})`, 'info');
        }
        addLog(`${character.name} casts Banishment on ${enemy.name}!`, 'info');
      }
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [isPlayerTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  const torchOilAvailable = Boolean(findTorchOilItem());

  // For prepared casters (Wizard, Cleric, Druid, Paladin), use preparedSpells for leveled spells + always include cantrips from knownSpells
  const availableSpells = useMemo(() => {
    if (isPreparedCaster(character.class.name)) {
      // Get cantrips from known spells (always available)
      const knownCantrips = (character.knownSpells ?? []).filter(spellId => {
        const spell = spellsData.find(s => s.id === spellId);
        return spell && spell.level === 0;
      });
      // Get prepared leveled spells
      const preparedLeveled = character.preparedSpells ?? [];
      // Combine: cantrips + prepared leveled spells
      return [...new Set([...knownCantrips, ...preparedLeveled])];
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
    addLog(`${character.name} coats their weapon in torch oil! (+1 Fire Damage)`, 'info');
    setActiveBuffs(prev => [...prev, { id: 'torch-oil', name: 'Flaming Weapon', bonus: 0, duration: 10 }]); // Bonus 0 to AC, but we can handle damage elsewhere
    // Remove item from inventory (mock)
    nextTurn();
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
                        <div className="text-sm font-bold">{character.name}</div>

                        {/* Conditions Badges */}
                        {character.conditions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 mb-2">
                            {character.conditions.map((condition, idx) => (
                              <div key={`${condition.type}-${idx}`}>
                                <ConditionBadge type={condition.type} duration={condition.duration} size="sm" />
                              </div>
                            ))}
                          </div>
                        )}
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
                      <Tooltip
                        content={
                          <div>
                            <div className="font-bold mb-1">{generalActionTooltips['attack'].name}</div>
                            <div className="text-xs text-muted-foreground">{generalActionTooltips['attack'].description}</div>
                            {generalActionTooltips['attack'].actionType && (
                              <div className="text-xs text-fantasy-gold mt-1">Action Type: {generalActionTooltips['attack'].actionType}</div>
                            )}
                          </div>
                        }
                        position="right"
                      >
                        <Button
                          variant="default"
                          className="w-full justify-start"
                          onClick={handlePlayerAttack}
                          disabled={!isPlayerTurn || isRolling || !selectedEnemy || attacksLeft <= 0}
                        >
                          <Sword className="mr-2 h-4 w-4" /> {t('combat.attack')} {attacksLeft > 1 && `(${attacksLeft})`}
                        </Button>
                      </Tooltip>
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
                      <Tooltip
                        content={
                          <div>
                            <div className="font-bold mb-1">{generalActionTooltips['defend'].name}</div>
                            <div className="text-xs text-muted-foreground">{generalActionTooltips['defend'].description}</div>
                            <div className="text-xs text-fantasy-gold mt-1">Action Type: {generalActionTooltips['defend'].actionType}</div>
                          </div>
                        }
                        position="right"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={handleDefend}
                          disabled={!isPlayerTurn || isRolling}
                        >
                          <Shield className="mr-2 h-4 w-4" /> {t('combat.defend')}
                        </Button>
                      </Tooltip>
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
                      <Tooltip
                        content={
                          <div>
                            <div className="font-bold mb-1">{generalActionTooltips['cast-spell'].name}</div>
                            <div className="text-xs text-muted-foreground">{generalActionTooltips['cast-spell'].description}</div>
                            <div className="text-xs text-fantasy-gold mt-1">Action Type: {generalActionTooltips['cast-spell'].actionType}</div>
                          </div>
                        }
                        position="right"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setShowSpellMenu(!showSpellMenu)}
                          disabled={!isPlayerTurn || isRolling || !canCastAnySpell}
                        >
                          <Wand className="mr-2 h-4 w-4" /> {t('combat.castSpell')}
                        </Button>
                      </Tooltip>
                      <Tooltip
                        content={
                          <div>
                            <div className="font-bold mb-1">{generalActionTooltips['use-item'].name}</div>
                            <div className="text-xs text-muted-foreground">{generalActionTooltips['use-item'].description}</div>
                            <div className="text-xs text-fantasy-gold mt-1">Action Type: {generalActionTooltips['use-item'].actionType}</div>
                          </div>
                        }
                        position="right"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setShowInventory(!showInventory)}
                          disabled={!isPlayerTurn || isRolling}
                        >
                          <Backpack className="mr-2 h-4 w-4" /> {t('combat.item')}
                        </Button>
                      </Tooltip>
                      <Tooltip
                        content={
                          <div>
                            <div className="font-bold mb-1">{generalActionTooltips['analyze'].name}</div>
                            <div className="text-xs text-muted-foreground">{generalActionTooltips['analyze'].description}</div>
                            <div className="text-xs text-fantasy-gold mt-1">Action Type: {generalActionTooltips['analyze'].actionType}</div>
                          </div>
                        }
                        position="right"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={handleAnalyzeEnemy}
                          disabled={!isPlayerTurn || isRolling || !selectedEnemy || analyzedEnemies.has(selectedEnemy || '')}
                        >
                          <Search className="mr-2 h-4 w-4" /> {analyzedEnemies.has(selectedEnemy || '') ? 'Analyzed' : 'Analyze'}
                        </Button>
                      </Tooltip>
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
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['second-wind'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['second-wind'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['second-wind'].actionType}</div>
                                    {classActionTooltips['second-wind'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['second-wind'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleSecondWind}
                                  disabled={!isPlayerTurn || !secondWindAvailable || isRolling}
                                >
                                  <HeartPulse className="mr-2 h-3 w-3" /> Second Wind
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">Hide</div>
                                    <div className="text-xs text-muted-foreground">Attempt to hide from enemies. Requires Stealth check vs Passive Perception.</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: Action</div>
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleHide}
                                  disabled={!isPlayerTurn || isRolling || attacksLeft <= 0}
                                >
                                  <EyeOff className="mr-2 h-3 w-3" /> Hide
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">Dodge</div>
                                    <div className="text-xs text-muted-foreground">Focus on avoiding attacks. Attacks against you have disadvantage until your next turn. Advantage on DEX saves.</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: Action</div>
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleDodge}
                                  disabled={!isPlayerTurn || isRolling || attacksLeft < maxAttacks}
                                >
                                  <Shield className="mr-2 h-3 w-3" /> Dodge
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['action-surge'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['action-surge'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['action-surge'].actionType}</div>
                                    {classActionTooltips['action-surge'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['action-surge'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleActionSurge}
                                  disabled={!isPlayerTurn || !actionSurgeAvailable || isRolling}
                                >
                                  <Zap className="mr-2 h-3 w-3" /> Action Surge
                                </Button>
                              </Tooltip>
                            </>
                          )}
                          {isRogue && (
                            <>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['dash'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['dash'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['dash'].actionType}</div>
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleCunningAction('dash')}
                                  disabled={!isPlayerTurn || isRolling}
                                >
                                  <Activity className="mr-2 h-3 w-3" /> Dash
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['disengage'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['disengage'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['disengage'].actionType}</div>
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleCunningAction('disengage')}
                                  disabled={!isPlayerTurn || isRolling}
                                >
                                  <Activity className="mr-2 h-3 w-3" /> Disengage
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['hide'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['hide'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['hide'].actionType}</div>
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleHide}
                                  disabled={!isPlayerTurn || isRolling}
                                >
                                  <Activity className="mr-2 h-3 w-3" /> Hide
                                </Button>
                              </Tooltip>
                              {character.level >= 5 && (
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">{classActionTooltips['uncanny-dodge'].name}</div>
                                      <div className="text-xs text-muted-foreground">{classActionTooltips['uncanny-dodge'].description}</div>
                                      <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['uncanny-dodge'].actionType}</div>
                                    </div>
                                  }
                                  position="right"
                                >
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
                                </Tooltip>
                              )}
                            </>
                          )}
                          {isBarbarian && (
                            <>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['rage'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['rage'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['rage'].actionType}</div>
                                    {classActionTooltips['rage'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['rage'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant={rageActive ? "destructive" : "secondary"}
                                  size="sm"
                                  onClick={handleRage}
                                  disabled={!isPlayerTurn || rageAvailable <= 0 || rageActive || isRolling}
                                  className={cn(rageActive && "animate-pulse ring-2 ring-red-500")}
                                >
                                  <Flame className="mr-2 h-3 w-3" /> {rageActive ? 'Raging!' : `Rage (${rageAvailable})`}
                                </Button>
                              </Tooltip>
                              {character.subclass?.id === 'berserker' && rageActive && (
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">{classActionTooltips['frenzied-strike'].name}</div>
                                      <div className="text-xs text-muted-foreground">{classActionTooltips['frenzied-strike'].description}</div>
                                      <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['frenzied-strike'].actionType}</div>
                                    </div>
                                  }
                                  position="right"
                                >
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleFrenziedStrike}
                                    disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                                    className="border-red-500 bg-red-500/10 text-red-700 hover:bg-red-500/20"
                                  >
                                    <Sword className="mr-2 h-3 w-3" /> Frenzied Strike
                                  </Button>
                                </Tooltip>
                              )}
                            </>
                          )}
                          {isBard && (
                            <Tooltip
                              content={
                                <div>
                                  <div className="font-bold mb-1">{classActionTooltips['bardic-inspiration'].name}</div>
                                  <div className="text-xs text-muted-foreground">{classActionTooltips['bardic-inspiration'].description}</div>
                                  <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['bardic-inspiration'].actionType}</div>
                                  {classActionTooltips['bardic-inspiration'].usesResource && (
                                    <div className="text-xs text-blue-400 mt-1">{classActionTooltips['bardic-inspiration'].usesResource}</div>
                                  )}
                                </div>
                              }
                              position="right"
                            >
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleBardicInspiration}
                                disabled={!isPlayerTurn || inspirationAvailable <= 0 || hasInspirationDie || isRolling}
                              >
                                <Sparkles className="mr-2 h-3 w-3" /> Inspire ({inspirationAvailable})
                              </Button>
                            </Tooltip>
                          )}
                          {isPaladin && (
                            <>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['lay-on-hands'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['lay-on-hands'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['lay-on-hands'].actionType}</div>
                                    {classActionTooltips['lay-on-hands'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['lay-on-hands'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleLayOnHands}
                                  disabled={!isPlayerTurn || layOnHandsPool <= 0 || playerHp >= character.maxHitPoints || isRolling}
                                >
                                  <HeartPulse className="mr-2 h-3 w-3" /> Lay on Hands ({layOnHandsPool})
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['divine-smite'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['divine-smite'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['divine-smite'].actionType}</div>
                                    {classActionTooltips['divine-smite'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['divine-smite'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant={divineSmiteActive ? "fantasy" : "secondary"}
                                  size="sm"
                                  onClick={() => setDivineSmiteActive(!divineSmiteActive)}
                                  disabled={!isPlayerTurn || (character.spellSlots?.[1]?.current || 0) <= 0 || isRolling}
                                  className={cn(divineSmiteActive && "ring-2 ring-yellow-400")}
                                >
                                  <Zap className="mr-2 h-3 w-3" /> {divineSmiteActive ? 'Smite Ready!' : 'Divine Smite'}
                                </Button>
                              </Tooltip>
                            </>
                          )}
                          {isMonk && (
                            <>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['flurry-of-blows'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['flurry-of-blows'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['flurry-of-blows'].actionType}</div>
                                    {classActionTooltips['flurry-of-blows'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['flurry-of-blows'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleKiAction('flurry')}
                                  disabled={!isPlayerTurn || kiPoints <= 0 || !selectedEnemy || isRolling}
                                >
                                  <Activity className="mr-2 h-3 w-3" /> Flurry of Blows ({kiPoints})
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['patient-defense'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['patient-defense'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['patient-defense'].actionType}</div>
                                    {classActionTooltips['patient-defense'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['patient-defense'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleKiAction('defense')}
                                  disabled={!isPlayerTurn || kiPoints <= 0 || isRolling}
                                >
                                  <Shield className="mr-2 h-3 w-3" /> Patient Defense ({kiPoints})
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['step-of-wind'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['step-of-wind'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['step-of-wind'].actionType}</div>
                                    {classActionTooltips['step-of-wind'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['step-of-wind'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleKiAction('step')}
                                  disabled={!isPlayerTurn || kiPoints <= 0 || isRolling}
                                >
                                  <Activity className="mr-2 h-3 w-3" /> Step of Wind ({kiPoints})
                                </Button>
                              </Tooltip>
                            </>
                          )}
                          {isDruid && (
                            <Tooltip
                              content={
                                <div>
                                  <div className="font-bold mb-1">{classActionTooltips['wild-shape'].name}</div>
                                  <div className="text-xs text-muted-foreground">{classActionTooltips['wild-shape'].description}</div>
                                  <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['wild-shape'].actionType}</div>
                                  {classActionTooltips['wild-shape'].usesResource && (
                                    <div className="text-xs text-blue-400 mt-1">{classActionTooltips['wild-shape'].usesResource}</div>
                                  )}
                                </div>
                              }
                              position="right"
                            >
                              <Button
                                variant={wildShapeActive ? "destructive" : "secondary"}
                                size="sm"
                                onClick={handleWildShape}
                                disabled={!isPlayerTurn || wildShapeAvailable <= 0 || wildShapeActive || isRolling}
                              >
                                <Activity className="mr-2 h-3 w-3" /> {wildShapeActive ? 'Beast Form' : `Wild Shape (${wildShapeAvailable})`}
                              </Button>
                            </Tooltip>
                          )}
                          {isSorcerer && (
                            <>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['empowered-spell'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['empowered-spell'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['empowered-spell'].actionType}</div>
                                    {classActionTooltips['empowered-spell'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['empowered-spell'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant={empoweredSpellUsed ? "fantasy" : "secondary"}
                                  size="sm"
                                  onClick={() => handleMetamagic('empowered')}
                                  disabled={!isPlayerTurn || sorceryPoints < 1 || empoweredSpellUsed || isRolling}
                                >
                                  <Zap className="mr-2 h-3 w-3" /> Empowered (1 SP)
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['quickened-spell'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['quickened-spell'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['quickened-spell'].actionType}</div>
                                    {classActionTooltips['quickened-spell'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['quickened-spell'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleMetamagic('quickened')}
                                  disabled={!isPlayerTurn || sorceryPoints < 2 || isRolling}
                                >
                                  <Activity className="mr-2 h-3 w-3" /> Quickened (2 SP)
                                </Button>
                              </Tooltip>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['create-slot'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['create-slot'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['create-slot'].actionType}</div>
                                    {classActionTooltips['create-slot'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['create-slot'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleMetamagic('create_slot')}
                                  disabled={!isPlayerTurn || sorceryPoints < 2 || isRolling}
                                >
                                  <Sparkles className="mr-2 h-3 w-3" /> Create Slot (2 SP)
                                </Button>
                              </Tooltip>
                              <div className="col-span-2 text-xs text-center text-muted-foreground">
                                Sorcery Points: {sorceryPoints}
                              </div>
                            </>
                          )}
                          {isCleric && (
                            <>
                              <Tooltip
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{classActionTooltips['turn-undead'].name}</div>
                                    <div className="text-xs text-muted-foreground">{classActionTooltips['turn-undead'].description}</div>
                                    <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['turn-undead'].actionType}</div>
                                    {classActionTooltips['turn-undead'].usesResource && (
                                      <div className="text-xs text-blue-400 mt-1">{classActionTooltips['turn-undead'].usesResource}</div>
                                    )}
                                  </div>
                                }
                                position="right"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleChannelDivinity('turn-undead')}
                                  disabled={!isPlayerTurn || channelDivinityUses <= 0 || isRolling || !selectedEnemy}
                                >
                                  <Sparkles className="mr-2 h-3 w-3" /> Turn Undead
                                </Button>
                              </Tooltip>
                              {character.subclass?.id === 'life' && (
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">{classActionTooltips['preserve-life'].name}</div>
                                      <div className="text-xs text-muted-foreground">{classActionTooltips['preserve-life'].description}</div>
                                      <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['preserve-life'].actionType}</div>
                                      {classActionTooltips['preserve-life'].usesResource && (
                                        <div className="text-xs text-blue-400 mt-1">{classActionTooltips['preserve-life'].usesResource}</div>
                                      )}
                                    </div>
                                  }
                                  position="right"
                                >
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleChannelDivinity('preserve-life')}
                                    disabled={!isPlayerTurn || channelDivinityUses <= 0 || isRolling}
                                  >
                                    <HeartPulse className="mr-2 h-3 w-3" /> Preserve Life
                                  </Button>
                                </Tooltip>
                              )}
                              <div className="col-span-2 text-xs text-center text-muted-foreground">
                                Channel Divinity: {channelDivinityUses}
                              </div>
                            </>
                          )}
                          {isRanger && (
                            <Tooltip
                              content={
                                <div>
                                  <div className="font-bold mb-1">{classActionTooltips['favored-enemy'].name}</div>
                                  <div className="text-xs text-muted-foreground">{classActionTooltips['favored-enemy'].description}</div>
                                  <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['favored-enemy'].actionType}</div>
                                </div>
                              }
                              position="right"
                            >
                              <Button
                                variant={favoredEnemyActive ? "default" : "secondary"}
                                size="sm"
                                onClick={() => setFavoredEnemyActive(!favoredEnemyActive)}
                                disabled={!isPlayerTurn || isRolling}
                              >
                                <Crosshair className="mr-2 h-3 w-3" /> {favoredEnemyActive ? 'Favored Enemy Active' : 'Favored Enemy'}
                              </Button>
                            </Tooltip>
                          )}
                          {isWizard && (
                            <Tooltip
                              content={
                                <div>
                                  <div className="font-bold mb-1">{classActionTooltips['arcane-recovery'].name}</div>
                                  <div className="text-xs text-muted-foreground">{classActionTooltips['arcane-recovery'].description}</div>
                                  <div className="text-xs text-fantasy-gold mt-1">Action Type: {classActionTooltips['arcane-recovery'].actionType}</div>
                                  {classActionTooltips['arcane-recovery'].usesResource && (
                                    <div className="text-xs text-blue-400 mt-1">{classActionTooltips['arcane-recovery'].usesResource}</div>
                                  )}
                                </div>
                              }
                              position="right"
                            >
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleArcaneRecovery}
                                disabled={!isPlayerTurn || arcaneRecoveryUsed || isRolling}
                              >
                                <Sparkles className="mr-2 h-3 w-3" /> Arcane Recovery
                              </Button>
                            </Tooltip>
                          )}

                          {/* ==========================================
                          FEAT ABILITIES
                          ========================================== */}
                          {character.feats?.includes('great-weapon-master') && (
                            <Tooltip
                              content={
                                <div>
                                  <div className="font-bold mb-1">{featAbilityTooltips['great-weapon-master-power'].name}</div>
                                  <div className="text-xs text-muted-foreground">{featAbilityTooltips['great-weapon-master-power'].description}</div>
                                  <div className="text-xs text-fantasy-gold mt-1">Action Type: {featAbilityTooltips['great-weapon-master-power'].actionType}</div>
                                </div>
                              }
                              position="right"
                            >
                              <Button
                                variant={gwmActive ? "fantasy" : "secondary"}
                                size="sm"
                                onClick={() => setGwmActive(!gwmActive)}
                                disabled={!isPlayerTurn || isRolling}
                              >
                                <Sword className="mr-2 h-3 w-3" /> {gwmActive ? 'GWM Active (-5/+10)' : 'Great Weapon Master'}
                              </Button>
                            </Tooltip>
                          )}
                          {character.feats?.includes('sharpshooter') && (
                            <Tooltip
                              content={
                                <div>
                                  <div className="font-bold mb-1">{featAbilityTooltips['sharpshooter-power'].name}</div>
                                  <div className="text-xs text-muted-foreground">{featAbilityTooltips['sharpshooter-power'].description}</div>
                                  <div className="text-xs text-fantasy-gold mt-1">Action Type: {featAbilityTooltips['sharpshooter-power'].actionType}</div>
                                </div>
                              }
                              position="right"
                            >
                              <Button
                                variant={sharpshooterActive ? "fantasy" : "secondary"}
                                size="sm"
                                onClick={() => setSharpshooterActive(!sharpshooterActive)}
                                disabled={!isPlayerTurn || isRolling}
                              >
                                <Crosshair className="mr-2 h-3 w-3" /> {sharpshooterActive ? 'Sharpshooter Active (-5/+10)' : 'Sharpshooter'}
                              </Button>
                            </Tooltip>
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

                          {/* Polearm Master Button */}
                          {character.feats?.includes('polearm-master') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handlePolearmBonusAttack}
                              disabled={!isPlayerTurn || isRolling || bonusActionUsed}
                            >
                              <Sword className="mr-2 h-3 w-3" /> Polearm Bonus Attack
                            </Button>
                          )}

                          {/* Crossbow Expert Button */}
                          {character.feats?.includes('crossbow-expert') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleCrossbowBonusAttack}
                              disabled={!isPlayerTurn || isRolling || bonusActionUsed}
                            >
                              <Crosshair className="mr-2 h-3 w-3" /> Crossbow Bonus Attack
                            </Button>
                          )}

                          {/* Charger Button */}
                          {character.feats?.includes('charger') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleChargerAttack}
                              disabled={!isPlayerTurn || isRolling || bonusActionUsed}
                            >
                              <Zap className="mr-2 h-3 w-3" /> Charge Attack (+5 Dmg)
                            </Button>
                          )}

                          {/* Healer Button */}
                          {character.feats?.includes('healer') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleHealerAction}
                              disabled={!isPlayerTurn || isRolling || healerFeatUsed}
                            >
                              <HeartPulse className="mr-2 h-3 w-3" /> Healer's Kit (1d6+4+Lvl)
                            </Button>
                          )}

                          {/* Inspiring Leader Button */}
                          {character.feats?.includes('inspiring-leader') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleInspiringLeader}
                              disabled={!isPlayerTurn || isRolling || inspiringLeaderUsed}
                            >
                              <Flag className="mr-2 h-3 w-3" /> Inspiring Leader (Temp HP)
                            </Button>
                          )}

                          {/* ==========================================
                          BATTLE MASTER MANEUVERS
                          ========================================== */}
                          {isBattleMaster && (
                            <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-lg border border-fantasy-gold/20">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-fantasy-gold">Battle Master</span>
                                <Badge variant="outline" className="text-fantasy-gold border-fantasy-gold">
                                  {superiorityDiceLeft} Dice (d{character.level >= 18 ? 12 : character.level >= 10 ? 10 : 8})
                                </Badge>
                              </div>

                              {/* On-Hit Maneuvers */}
                              <div className="flex flex-wrap gap-1">
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">Precision Attack</div>
                                      <div className="text-xs text-muted-foreground">Add superiority die to your attack roll. Use before or after rolling.</div>
                                    </div>
                                  }
                                  position="top"
                                >
                                  <Button
                                    variant={pendingManeuver === 'precision-attack' ? 'fantasy' : 'secondary'}
                                    size="sm"
                                    onClick={() => activateManeuver('precision-attack')}
                                    disabled={!isPlayerTurn || isRolling || superiorityDiceLeft <= 0}
                                    className="text-xs"
                                  >
                                    Precision (+Attack)
                                  </Button>
                                </Tooltip>
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">Trip Attack</div>
                                      <div className="text-xs text-muted-foreground">On hit: Add die to damage. Target makes STR save or is knocked prone.</div>
                                    </div>
                                  }
                                  position="top"
                                >
                                  <Button
                                    variant={pendingManeuver === 'trip-attack' ? 'fantasy' : 'secondary'}
                                    size="sm"
                                    onClick={() => activateManeuver('trip-attack')}
                                    disabled={!isPlayerTurn || isRolling || superiorityDiceLeft <= 0}
                                    className="text-xs"
                                  >
                                    Trip (Prone)
                                  </Button>
                                </Tooltip>
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">Menacing Attack</div>
                                      <div className="text-xs text-muted-foreground">On hit: Add die to damage. Target makes WIS save or is frightened until end of your next turn.</div>
                                    </div>
                                  }
                                  position="top"
                                >
                                  <Button
                                    variant={pendingManeuver === 'menacing-attack' ? 'fantasy' : 'secondary'}
                                    size="sm"
                                    onClick={() => activateManeuver('menacing-attack')}
                                    disabled={!isPlayerTurn || isRolling || superiorityDiceLeft <= 0}
                                    className="text-xs"
                                  >
                                    Menacing (Fear)
                                  </Button>
                                </Tooltip>
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">Pushing Attack</div>
                                      <div className="text-xs text-muted-foreground">On hit: Add die to damage. Target makes STR save or is pushed 15 feet away.</div>
                                    </div>
                                  }
                                  position="top"
                                >
                                  <Button
                                    variant={pendingManeuver === 'pushing-attack' ? 'fantasy' : 'secondary'}
                                    size="sm"
                                    onClick={() => activateManeuver('pushing-attack')}
                                    disabled={!isPlayerTurn || isRolling || superiorityDiceLeft <= 0}
                                    className="text-xs"
                                  >
                                    Push (15ft)
                                  </Button>
                                </Tooltip>
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">Disarming Attack</div>
                                      <div className="text-xs text-muted-foreground">On hit: Add die to damage. Target makes STR save or is disarmed (disadvantage).</div>
                                    </div>
                                  }
                                  position="top"
                                >
                                  <Button
                                    variant={pendingManeuver === 'disarming-attack' ? 'fantasy' : 'secondary'}
                                    size="sm"
                                    onClick={() => activateManeuver('disarming-attack')}
                                    disabled={!isPlayerTurn || isRolling || superiorityDiceLeft <= 0}
                                    className="text-xs"
                                  >
                                    Disarm
                                  </Button>
                                </Tooltip>
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">Goading Attack</div>
                                      <div className="text-xs text-muted-foreground">On hit: Add die to damage. Target makes WIS save or must attack you (or have disadvantage).</div>
                                    </div>
                                  }
                                  position="top"
                                >
                                  <Button
                                    variant={pendingManeuver === 'goading-attack' ? 'fantasy' : 'secondary'}
                                    size="sm"
                                    onClick={() => activateManeuver('goading-attack')}
                                    disabled={!isPlayerTurn || isRolling || superiorityDiceLeft <= 0}
                                    className="text-xs"
                                  >
                                    Goad
                                  </Button>
                                </Tooltip>
                              </div>

                              {/* Bonus Action Maneuvers */}
                              <div className="flex flex-wrap gap-1">
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">Rally</div>
                                      <div className="text-xs text-muted-foreground">Bonus Action: Gain temporary HP equal to superiority die + CHA modifier.</div>
                                    </div>
                                  }
                                  position="top"
                                >
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleRally}
                                    disabled={!isPlayerTurn || isRolling || bonusActionUsed || superiorityDiceLeft <= 0}
                                    className="text-xs"
                                  >
                                    <HeartPulse className="mr-1 h-3 w-3" /> Rally (Temp HP)
                                  </Button>
                                </Tooltip>
                                <Tooltip
                                  content={
                                    <div>
                                      <div className="font-bold mb-1">Feinting Attack</div>
                                      <div className="text-xs text-muted-foreground">Bonus Action: Gain advantage on your next attack. If it hits, add die to damage.</div>
                                    </div>
                                  }
                                  position="top"
                                >
                                  <Button
                                    variant={feintingAttackActive ? 'fantasy' : 'secondary'}
                                    size="sm"
                                    onClick={handleFeintingAttack}
                                    disabled={!isPlayerTurn || isRolling || bonusActionUsed || superiorityDiceLeft <= 0}
                                    className="text-xs"
                                  >
                                    Feint (Advantage)
                                  </Button>
                                </Tooltip>
                              </div>

                              {pendingManeuver && (
                                <div className="text-xs text-fantasy-gold italic">
                                  {BATTLE_MASTER_MANEUVERS.find(m => m.id === pendingManeuver)?.name} ready for next attack!
                                </div>
                              )}
                            </div>
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

                          {/* Cleric: Light Domain - Warding Flare (info display) */}
                          {isLightCleric && wardingFlareUses > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                              <Sun className="h-4 w-4 text-yellow-400" />
                              <span className="text-xs text-yellow-300">
                                Warding Flare: {wardingFlareUses} uses (auto-imposes disadvantage on attackers)
                              </span>
                            </div>
                          )}

                          {/* Cleric: Tempest Domain - Wrath of the Storm (info display) */}
                          {isTempestCleric && wrathOfTheStormUses > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded border border-blue-500/30">
                              <Zap className="h-4 w-4 text-blue-400" />
                              <span className="text-xs text-blue-300">
                                Wrath of the Storm: {wrathOfTheStormUses} uses (auto-deals 2d8 lightning when hit)
                              </span>
                            </div>
                          )}

                          {/* Wizard: Abjuration - Arcane Ward (info display) */}
                          {isAbjurationWizard && (
                            <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded border border-purple-500/30">
                              <Shield className="h-4 w-4 text-purple-400" />
                              <span className="text-xs text-purple-300">
                                Arcane Ward: {arcaneWardHp} HP (absorbs damage first)
                              </span>
                            </div>
                          )}

                          {/* Sorcerer: Wild Magic - Tides of Chaos */}
                          {isWildMagicSorcerer && tidesOfChaosAvailable > 0 && (
                            <Button
                              variant={tidesOfChaosActive ? "fantasy" : "secondary"}
                              size="sm"
                              onClick={activateTidesOfChaos}
                              disabled={!isPlayerTurn || tidesOfChaosActive || tidesOfChaosAvailable <= 0 || isRolling}
                              className={cn(tidesOfChaosActive && "ring-2 ring-pink-500 animate-pulse")}
                            >
                              <Sparkles className="mr-2 h-3 w-3" /> {tidesOfChaosActive ? 'Advantage Ready!' : `Tides of Chaos (${tidesOfChaosAvailable})`}
                            </Button>
                          )}

                          {/* Sorcerer: Divine Soul - Favored by the Gods (info display) */}
                          {isDivineSoulSorcerer && favoredByTheGodsAvailable > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-gold-500/10 rounded border border-yellow-500/30">
                              <Star className="h-4 w-4 text-yellow-400" />
                              <span className="text-xs text-yellow-300">
                                Favored by the Gods: {favoredByTheGodsAvailable} use (add 2d4 to failed save/attack)
                              </span>
                            </div>
                          )}
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
                        <Tooltip
                          content={
                            <div>
                              <div className="font-bold mb-1">{combatManeuverTooltips['shove'].name}</div>
                              <div className="text-xs text-muted-foreground">{combatManeuverTooltips['shove'].description}</div>
                              <div className="text-xs text-fantasy-gold mt-1">Action Type: {combatManeuverTooltips['shove'].actionType}</div>
                            </div>
                          }
                          position="right"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShove}
                            disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Shove
                          </Button>
                        </Tooltip>
                        <Tooltip
                          content={
                            <div>
                              <div className="font-bold mb-1">{combatManeuverTooltips['grapple'].name}</div>
                              <div className="text-xs text-muted-foreground">{combatManeuverTooltips['grapple'].description}</div>
                              <div className="text-xs text-fantasy-gold mt-1">Action Type: {combatManeuverTooltips['grapple'].actionType}</div>
                            </div>
                          }
                          position="right"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleGrapple}
                            disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Grapple
                          </Button>
                        </Tooltip>
                        <Tooltip
                          content={
                            <div>
                              <div className="font-bold mb-1">{combatManeuverTooltips['combat-hide'].name}</div>
                              <div className="text-xs text-muted-foreground">{combatManeuverTooltips['combat-hide'].description}</div>
                              <div className="text-xs text-fantasy-gold mt-1">Action Type: {combatManeuverTooltips['combat-hide'].actionType}</div>
                            </div>
                          }
                          position="right"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleHide}
                            disabled={!isPlayerTurn || isRolling || !selectedEnemy}
                          >
                            <Activity className="mr-2 h-3 w-3" /> Hide
                          </Button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Legendary Actions are handled by the AI automatically when player ends turn - see performLegendaryActions */}

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
                              <Tooltip
                                key={spellId}
                                content={
                                  <div>
                                    <div className="font-bold mb-1">{spell.name}</div>
                                    <div className="text-xs mb-2">
                                      <span className="text-fantasy-gold">{spell.school}</span>
                                      {isCantrip ? ' Cantrip' : ` Level ${spell.level}`}
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      <strong>Casting Time:</strong> {spell.castingTime}
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      <strong>Range:</strong> {spell.range}
                                    </div>
                                    {spell.duration && (
                                      <div className="text-xs text-muted-foreground mb-1">
                                        <strong>Duration:</strong> {spell.duration}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-2">{spell.description}</div>
                                    {spell.damage && (
                                      <div className="text-xs text-red-400 mt-1">
                                        <strong>Damage:</strong> {spell.damage} {spell.damageType}
                                      </div>
                                    )}
                                    {spell.healing && (
                                      <div className="text-xs text-green-400 mt-1">
                                        <strong>Healing:</strong> {spell.healing}
                                      </div>
                                    )}
                                    {spell.areaOfEffect && (
                                      <div className="text-xs text-orange-400 mt-1">
                                        <strong>Area:</strong> {spell.areaOfEffect.size}ft {spell.areaOfEffect.type} (hits all enemies)
                                      </div>
                                    )}
                                  </div>
                                }
                                position="left"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-xs"
                                  disabled={!hasSlot}
                                  onClick={() => handleCastSpell(spellId)}
                                >
                                  <Sparkles className="mr-2 h-3 w-3 text-blue-400" />
                                  {spell.name} {isCantrip ? '(Cantrip)' : `(L${spell.level})`}
                                  {spell.areaOfEffect && <span className="ml-1 text-orange-400">⚡</span>}
                                </Button>
                              </Tooltip>
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
                  legendaryPoints={legendaryPoints[enemy.id]}
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
            setCanBoostRoll(false);
            setBoostCallback(null);
            if (pendingCombatAction) {
              pendingCombatAction();
              setPendingCombatAction(null);
            }
          }}
          skillName={attackDetails?.name || 'Attack Roll'}
          difficultyClass={attackDetails?.dc}
          modifier={attackDetails?.modifier}
          // Favored by the Gods boost
          canBoost={canBoostRoll && favoredByTheGodsAvailable > 0}
          boostLabel={`Favored by the Gods (+2d4) - ${favoredByTheGodsAvailable} use left`}
          onBoost={useFavoredByTheGods}
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
