import { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { useTranslation } from 'react-i18next';
import { Sword, BookOpen, Dice6, DoorOpen, CheckCircle2, Backpack, X, Tent, ShoppingBag, Brain, Wand2 } from 'lucide-react';
import type { Item, TalentOption, Encounter, SkillName, SpellContent, Subclass, Feat, PlayerCharacter } from '@/types';
import { cn } from '@/lib/utils';
import { CombatEncounter } from './CombatEncounter';
import { Inventory } from './Inventory';
import { DiceRollModal } from './DiceRollModal';
import { LevelUpModal } from './LevelUpModal';
import { SUBCLASSES } from '@/data/subclasses';
import itemsData from '@/content/items.json';
import spellsData from '@/content/spells.json';
import talentsContent from '@/content/talents.json';
import featsData from '@/content/feats.json';
import { QuestTracker } from './QuestTracker';
import { JournalPanel } from './JournalPanel';
import { Shop } from './Shop';
import { CharacterSheet } from './CharacterSheet';
import { portraits } from '@/data/portraits';
import {
  canRitualCast,
  getAvailableSlotLevels,
  getScaledCantripDamage,
  getSpellcastingAbility,
  getUpcastDamageOrEffect,
  isPreparedCaster,
  shouldCheckScrollUse,
  getSpellHealing,
} from '@/lib/spells';
import {
  getProficiencyBonus
} from '@/utils/skillUtils';
import { calculateMaxHitPoints } from '@/utils/characterUtils';
import { checkFeatPrerequisites } from '@/utils/featUtils';
import { getNPCPortraitSrc } from '@/data/npcPortraits';
import {
  meetsMulticlassPrereqs,
  canLeaveCurrentClass,
  MULTICLASS_PREREQUISITES,
  MULTICLASS_PROFICIENCIES
} from '@/data/multiclass';
import characterCreationContent from '@/content/characterCreation.json';

// Force update check

const SUBCLASS_LEVELS: Record<string, number> = {
  cleric: 1,
  sorcerer: 1,
  warlock: 1,
  druid: 2,
  wizard: 2,
  barbarian: 3,
  bard: 3,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
};

const itemCollections = [
  itemsData.weapons,
  itemsData.armor,
  itemsData.potions,
  itemsData.scrolls,
  itemsData.treasure,
];

const findItemTemplate = (itemId: string): Item | undefined => {
  for (const collection of itemCollections) {
    const match = collection.find((item) => item.id === itemId);
    if (match) {
      return match as unknown as Item;
    }
  }
  return undefined;
};

const createItemInstance = (item: Item): Item => {
  const uniqueSuffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    ...item,
    templateId: item.templateId ?? item.id,
    id: `${item.id}-${uniqueSuffix}`,
  };
};

interface RollResult {
  roll: number;
  total: number;
  isCritical: boolean;
  isCriticalFailure: boolean;
}

interface SkillCheckState {
  skill: string;
  ability: string;
  dc: number;
  modifier: number;
  breakdown: string;
}

const rollRandom = (sides: number) => Math.floor(Math.random() * sides) + 1;
type EncounterOptionType = Encounter['options'][0];

export function Adventure() {
  const { t } = useTranslation();
  const {
    character,
    adventure,
    completeEncounter,
    advanceToNextEncounter,
    endAdventure,
    reset,
    addItem,
    equipItem,
    unequipItem,
    useItem: consumeItem,
    updateCharacter,
    quests,
    addQuest,
    updateQuestStatus,
    updateQuestObjective,
    addJournalEntry,
    journal,
    gainXp,
    tutorialsEnabled,
    startConcentration,
    endConcentration,
    spendSpellSlot,
    attuneItem,
    unattuneItem,
    equipToSlot,
    unequipSlot
  } = useGame();
  const currentEncounter = useMemo<Encounter | null>(() => {
    if (!adventure || !adventure.encounters || adventure.encounters.length === 0) {
      return null;
    }
    const index = adventure.currentEncounterIndex;
    if (index >= 0 && index < adventure.encounters.length) {
      return adventure.encounters[index];
    }
    return adventure.encounters[0];
  }, [adventure]);
  const [narrativeLog, setNarrativeLog] = useState<{ id: string; message: string }[]>([]);
  const hasNarrativeEntries = narrativeLog.length > 0;
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [currentSkillCheck, setCurrentSkillCheck] = useState<SkillCheckState | null>(null);
  const [showTutorial, setShowTutorial] = useState(tutorialsEnabled);
  const [inCombat, setInCombat] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showQuestJournal, setShowQuestJournal] = useState(false);
  const [showRestMenu, setShowRestMenu] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSpellMenu, setShowSpellMenu] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);

  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  const [showGameOver, setShowGameOver] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState({ level: 1, hpIncrease: 0 });
  const questEvents = useRef<Set<string>>(new Set());
  const PRIMARY_QUEST_ID = 'stop-goblin-raids';
  const allTalents = talentsContent as TalentOption[];
  const allFeats = featsData;
  const [availableTalents, setAvailableTalents] = useState<TalentOption[]>([]);
  const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null);
  const [availableFeats, setAvailableFeats] = useState<Feat[]>([]);
  const [selectedFeatId, setSelectedFeatId] = useState<string | null>(null);
  const [asiScore1, setAsiScore1] = useState<string | undefined>();
  const [asiScore2, setAsiScore2] = useState<string | undefined>();
  const [availableSubclasses, setAvailableSubclasses] = useState<Subclass[]>([]);
  const [selectedSubclassId, setSelectedSubclassId] = useState<string | null>(null);

  // Multiclass state
  const [selectedMulticlassId, setSelectedMulticlassId] = useState<string | null>(null);
  const allClasses = characterCreationContent.classes;

  const visitedEncounters = adventure?.visitedEncounterIds || [];
  const slotBadges = useMemo(() => {
    if (!character?.spellSlots) return [];
    return Object.entries(character.spellSlots)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([lvl, pool]) => `L${lvl} ${pool.current}/${pool.max}`);
  }, [character?.spellSlots]);

  useEffect(() => {
    setShowTutorial(tutorialsEnabled);
  }, [tutorialsEnabled]);

  useEffect(() => {
    if (!currentEncounter) return;
    const encounterId = currentEncounter.id;
    const triggered = questEvents.current;
    const hasPrimaryQuest = quests.some((quest) => quest.id === PRIMARY_QUEST_ID);

    if (!hasPrimaryQuest && (encounterId === 'village-square' || encounterId === 'talk-to-farmer')) {
      addQuest({
        id: PRIMARY_QUEST_ID,
        title: 'Stop the Goblin Raids',
        description: 'Help Oakhaven by gathering intel, tracking the goblins to their camp, and securing the stolen supplies.',
        status: 'available',
        category: 'main',
        objectives: [
          { id: 'gather-intel', text: 'Gather information in the village square', completed: false },
          { id: 'reach-camp', text: 'Follow the trail to the goblin camp', completed: false },
          { id: 'secure-supplies', text: 'Recover the stolen supplies for the villagers', completed: false },
        ],
        rewards: ['XP bonus', 'Village gratitude', 'Recovered loot'],
      });
      addJournalEntry('Villagers pleaded for help to stop the goblin raids.', 'New Quest');
    }

    if (encounterId === 'quest-accept' && !triggered.has('quest-started')) {
      triggered.add('quest-started');
      updateQuestStatus(PRIMARY_QUEST_ID, 'active');
      updateQuestObjective(PRIMARY_QUEST_ID, 'gather-intel', true);
      addJournalEntry('You accepted the quest and set out toward the farms.', 'Quest Updated');
    }

    if (encounterId === 'goblin-encounter' && !triggered.has('quest-reach-camp')) {
      triggered.add('quest-reach-camp');
      updateQuestObjective(PRIMARY_QUEST_ID, 'reach-camp', true);
      addJournalEntry('You located the goblin camp in the ruins.', 'Quest Updated');
    }

    if ((encounterId === 'combat-resolution' || encounterId === 'return-to-village') && !triggered.has('quest-complete')) {
      triggered.add('quest-complete');
      updateQuestObjective(PRIMARY_QUEST_ID, 'secure-supplies', true);
      updateQuestStatus(PRIMARY_QUEST_ID, 'completed');
      addJournalEntry('The villagers have their supplies back and the raids are over—for now.', 'Quest Complete');
    }

    if (encounterId === 'observe-camp-success' && !triggered.has('hobgoblin-note')) {
      triggered.add('hobgoblin-note');
      addJournalEntry('You spotted a hobgoblin lieutenant directing the camp. This intel could prove useful.', 'Observation');
    }
  }, [
    currentEncounter,
    quests,
    addQuest,
    updateQuestStatus,
    updateQuestObjective,
    addJournalEntry
  ]);

  useEffect(() => {
    if (
      currentEncounter &&
      currentEncounter.type === 'combat' &&
      currentEncounter.autoStartCombat &&
      currentEncounter.enemy
    ) {
      setInCombat(true);
    }
  }, [currentEncounter]);

  // Clear outcome message when encounter changes
  useEffect(() => {
    setOutcomeMessage(null);
  }, [currentEncounter?.id]);

  // Adventure is started from Game component, no auto-start needed

  const addToNarrativeLog = (message: string) => {
    setNarrativeLog((prev) => {
      const entry = { id: `${Date.now()}-${Math.random()}`, message };
      const next = [entry, ...prev];
      return next.slice(0, 25);
    });
  };

  const grantItems = (itemIds?: string[]) => {
    if (!itemIds?.length) return;
    itemIds.forEach((itemId) => {
      const template = findItemTemplate(itemId);
      if (template) {
        addItem(createItemInstance(template));
      }
    });
  };

  const resetDiceState = () => {
    setDiceRoll(null);
    setRollResult(null);
    setIsRollingDice(false);
  };
  const rollDice = (sides: number = 20) => {
    setIsRollingDice(true);
    const roll = rollRandom(sides);
    setDiceRoll(roll);
    return roll;
  };

  const parseDice = (formula: string) => {
    const [dicePart, modifierPart] = formula.split('+');
    const [countStr, sidesStr] = dicePart.split('d');
    const count = parseInt(countStr || '1', 10);
    const sides = parseInt(sidesStr || '6', 10);
    const modifier = parseInt(modifierPart || '0', 10);
    let total = modifier;
    for (let i = 0; i < count; i++) {
      total += rollRandom(sides);
    }
    return total;
  };

  const handleDiceRollComplete = () => {
    setIsRollingDice(false);
  };

  const handleModalClose = () => {
    setShowDiceModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleSkillCheck = (skill: string, difficultyClass: number, ability: string) => {
    if (!character) {
      return false;
    }
    const roll = rollDice(20);

    // Calculate modifiers
    const abilityKey = ability.toLowerCase() as keyof typeof character.abilityScores;
    const abilityScore = character.abilityScores[abilityKey] || 10;
    const abilityMod = Math.floor((abilityScore - 10) / 2);

    const isProficient = character.skills[skill as SkillName]?.proficient;
    const proficiencyBonus = isProficient ? getProficiencyBonus(character.level) : 0;

    const totalModifier = abilityMod + proficiencyBonus;
    const total = roll + totalModifier;

    const success = total >= difficultyClass;

    // Store detailed result for the modal/log
    setRollResult({
      roll,
      total,
      isCritical: roll === 20,
      isCriticalFailure: roll === 1,
    });

    // Store check details for narrative log
    setCurrentSkillCheck({
      skill,
      ability,
      dc: difficultyClass,
      modifier: totalModifier,
      breakdown: `(Roll: ${roll} + ${ability.substring(0, 3)}: ${abilityMod} + Prof: ${proficiencyBonus})`
    });

    return success;
  };

  const handleEndConcentration = () => {
    if (!character?.concentratingOn) return;
    addToNarrativeLog(`Concentration on ${character.concentratingOn.spellName} ends.`);
    endConcentration();
  };

  const handleAdventureCast = (
    spellId: string,
    options?: {
      slotLevel?: number;
      castAsRitual?: boolean;
      fromScroll?: boolean;
      bypassPreparation?: boolean;
      source?: 'scroll' | 'spellbook';
    }
  ) => {
    if (!character) return false;
    const spell = spellsData.find((s) => s.id === spellId) as unknown as SpellContent;
    if (!spell) {
      addToNarrativeLog('The spell fizzles. (Unknown spell)');
      return false;
    }

    const castAsRitual = options?.castAsRitual ?? false;
    const fromScroll = options?.fromScroll ?? false;
    const preparedList = character.preparedSpells ?? character.knownSpells ?? [];
    const preparedOk = options?.bypassPreparation
      ? true
      : !isPreparedCaster(character.class.name) || preparedList.includes(spellId);

    if (!preparedOk) {
      addToNarrativeLog(`${spell.name} is not prepared.`);
      return false;
    }

    const isCantrip = spell.level === 0;
    const computedSlotLevel = spell.level > 0 && !castAsRitual && !fromScroll
      ? (options?.slotLevel ?? getAvailableSlotLevels(character, spell)[0])
      : undefined;
    if (spell.level > 0 && !castAsRitual && !fromScroll) {
      const slotPool = character.spellSlots?.[computedSlotLevel ?? spell.level];
      if (!computedSlotLevel || !slotPool || slotPool.current <= 0) {
        addToNarrativeLog(`No available slots to cast ${spell.name}.`);
        return false;
      }
      const spent = spendSpellSlot(computedSlotLevel);
      if (!spent) {
        addToNarrativeLog(`Unable to spend a level ${computedSlotLevel} slot.`);
        return false;
      }
    }

    const abilityKey = getSpellcastingAbility(character.class.name);
    const abilityMod = Math.floor((character.abilityScores[abilityKey] - 10) / 2);
    const effectiveSlotLevel = fromScroll
      ? (options?.slotLevel ?? spell.level)
      : (computedSlotLevel ?? spell.level);

    const buildFormula = () => {
      if (isCantrip) return getScaledCantripDamage(spell, character.level) || spell.damage || spell.healing || '';
      return getUpcastDamageOrEffect(spell, effectiveSlotLevel) || spell.damage || spell.healing || '';
    };

    const effectFormula = buildFormula();
    let effectMessage = '';

    if (spell.healing && effectFormula) {
      let healTotal = parseDice(effectFormula);
      healTotal += abilityMod;
      healTotal += getSpellHealing(spell, effectiveSlotLevel || spell.level, character); // Bonus Healing (e.g. Life Domain)
      const before = character.hitPoints;
      const newHp = Math.min(character.maxHitPoints, before + healTotal);
      const actualHeal = Math.max(0, newHp - before);
      updateCharacter((prev) => {
        if (!prev) return prev;
        return { ...prev, hitPoints: newHp };
      });
      effectMessage = `restoring ${actualHeal} HP`;
    } else {
      effectMessage = 'the spell takes effect';
    }

    if (spell.concentration) {
      if (character.concentratingOn && character.concentratingOn.spellId !== spell.id) {
        addToNarrativeLog(`Concentration on ${character.concentratingOn.spellName} ends as ${spell.name} begins.`);
      }
      startConcentration(spell.id, spell.name);
    }

    const labels: string[] = [];
    if (castAsRitual) labels.push('ritual');
    if (fromScroll) labels.push('scroll');
    if (effectiveSlotLevel && effectiveSlotLevel > spell.level) {
      labels.push(`upcast to L${effectiveSlotLevel}`);
    }

    const labelText = labels.length ? ` (${labels.join(', ')})` : '';
    addToNarrativeLog(`${character.name} casts ${spell.name}${labelText}, ${effectMessage}.`);
    addJournalEntry(`${character.name} cast ${spell.name}${labelText}.`, 'Spell Cast');
    setShowSpellMenu(false);
    return true;
  };

  // Watch for level up to show modal
  const prevLevelRef = useRef(character?.level || 1);
  useEffect(() => {
    if (character && character.level > prevLevelRef.current) {
      setShowLevelUp(true);
      setLevelUpData({
        level: character.level,
        hpIncrease: 10 // Simplified, ideally calculated or passed
      });
      // Generate talents based on new level if needed
      const newTalents = allTalents.filter(t => !character.talents?.includes(t.id)).slice(0, 3);
      setAvailableTalents(newTalents);

      // Check for Feats/ASI (Levels 4, 8, 12, 16, 19)
      const ASI_LEVELS = [4, 8, 12, 16, 19];
      // Fighter gets extra at 6 and 14
      if (character.class.id === 'fighter') {
        ASI_LEVELS.push(6, 14);
      }
      // Rogue gets extra at 10
      if (character.class.id === 'rogue') {
        ASI_LEVELS.push(10);
      }

      if (ASI_LEVELS.includes(character.level)) {
        const takenFeats = character.feats || [];
        const available = allFeats.filter(f => !takenFeats.includes(f.id) && checkFeatPrerequisites(f, character));
        setAvailableFeats(available);
      } else {
        setAvailableFeats([]);
      }

      // Check for Subclass Selection
      const subclassLevel = SUBCLASS_LEVELS[character.class.id] || 3;
      if (character.level === subclassLevel && !character.subclass) {
        const classSubclasses = SUBCLASSES[character.class.id] || [];
        setAvailableSubclasses(classSubclasses);
      } else {
        setAvailableSubclasses([]);
      }

      // Reset multiclass selection
      setSelectedMulticlassId(null);
    }
    prevLevelRef.current = character?.level || 1;
  }, [character?.level, allTalents, allFeats, character]);

  const handleOptionClick = (option: EncounterOptionType) => {
    if (!currentEncounter || !character) return;
    resetDiceState();

    // Mark option as selected
    const optionKey = `${currentEncounter.id}-${option.id}`;
    setSelectedOptions(prev => new Set(prev).add(optionKey));
    addToNarrativeLog(`${character.name} chooses "${option.text}"`);

    // Show outcome message if there is one
    if (option.outcome) {
      setOutcomeMessage(option.outcome);
      addToNarrativeLog(option.outcome);
    } else {
      setOutcomeMessage(null);
    }

    let targetEncounterId = option.nextEncounterId;
    const delay = option.outcome ? 3000 : 1500;
    const stayInEncounter = option.stayInEncounter ?? false;

    if (option.firstTimeEncounterId) {
      const hasVisitedFirst = visitedEncounters.includes(option.firstTimeEncounterId);
      if (!hasVisitedFirst) {
        targetEncounterId = option.firstTimeEncounterId;
      }
    }

    if (option.grantsItemIds) {
      grantItems(option.grantsItemIds);
    }

    if (option.xpReward) {
      gainXp(option.xpReward);
    }

    if (option.type === 'skill') {
      // Use skill from option if specified, otherwise use from encounter skillCheck
      const skillToUse = option.skill || currentEncounter.skillCheck?.skill;
      const dcToUse = option.difficultyClass || currentEncounter.skillCheck?.difficultyClass || 10;
      const abilityToUse = option.ability || currentEncounter.skillCheck?.ability || 'Charisma';

      if (skillToUse) {
        setShowDiceModal(true);
        const success = handleSkillCheck(skillToUse, dcToUse, abilityToUse);
        const successMsg = option.successOutcome || currentEncounter.skillCheck?.success;
        const failureMsg = option.failureOutcome || currentEncounter.skillCheck?.failure;

        // Prepare the action to run after modal closes
        setPendingAction(() => () => {
          if (successMsg || failureMsg) {
            setOutcomeMessage(success ? (successMsg || '') : (failureMsg || ''));
          }

          const baseRoll = diceRoll ?? rollResult?.total ?? 0;
          const totalRoll = rollResult?.total ?? baseRoll;
          const dcValue = currentSkillCheck?.dc ?? dcToUse;
          const skillName = currentSkillCheck?.skill || skillToUse;
          const breakdown = currentSkillCheck?.breakdown || '';
          const resultText = success ? t('adventure.success') : t('adventure.failure');

          addToNarrativeLog(
            `Skill Check (${skillName}): ${totalRoll} vs DC ${dcValue} → ${resultText} ${breakdown}`
          );

          if (success && currentEncounter.skillCheck?.rewardItemIds) {
            grantItems(currentEncounter.skillCheck.rewardItemIds);
          }

          if (success && currentEncounter.skillCheck?.xpReward) {
            gainXp(currentEncounter.skillCheck.xpReward);
          }

          if (option.endsAdventure) {
            const finalDelay = option.outcome ? 3000 : 1500;
            completeEncounter(currentEncounter.id);
            setTimeout(() => {
              setShowTutorial(tutorialsEnabled);
              endAdventure('success', option.outcome || t('adventure.completed'));
            }, finalDelay);
            return;
          }

          let finalTargetId = targetEncounterId;
          if (success && option.successNextEncounterId) {
            finalTargetId = option.successNextEncounterId;
          } else if (!success && option.failureNextEncounterId) {
            finalTargetId = option.failureNextEncounterId;
          }

          if (!stayInEncounter) {
            const isReturningToHub = finalTargetId === 'village-square-return' ||
              finalTargetId === 'village-square';
            const isRepeatableEncounter = currentEncounter.repeatable;

            if (!isRepeatableEncounter && !isReturningToHub) {
              completeEncounter(currentEncounter.id);
            }
          }

          if (finalTargetId) {
            advanceToNextEncounter(finalTargetId);
            setShowTutorial(tutorialsEnabled);
          }
        });

        return; // Stop execution here, wait for modal
      }
    } else if (option.type === 'attack' && currentEncounter.enemy) {
      // Enter full combat mode instead of simple attack
      setInCombat(true);
      return; // Don't complete encounter yet
    }

    if (option.endsAdventure) {
      completeEncounter(currentEncounter.id);
      setTimeout(() => {
        setShowTutorial(tutorialsEnabled);
        endAdventure('success', option.outcome || t('adventure.completed'));
      }, delay);
      return;
    }

    if (stayInEncounter) {
      return;
    }

    // Only mark encounter as completed if it's progressing the story (not returning to hub)
    // Social/exploration encounters that return to village square shouldn't be marked completed
    const isReturningToHub = targetEncounterId === 'village-square-return' ||
      targetEncounterId === 'village-square';
    const isRepeatableEncounter = currentEncounter.repeatable;

    if (!isRepeatableEncounter && !isReturningToHub) {
      completeEncounter(currentEncounter.id);
    }

    // Navigate to next encounter by ID
    if (targetEncounterId) {
      setTimeout(() => {
        advanceToNextEncounter(targetEncounterId);
        setShowTutorial(tutorialsEnabled);
      }, delay);
    }
  };

  const handleTalentConfirm = () => {
    // Handle Multiclass Selection
    if (selectedMulticlassId) {
      const selectedClass = allClasses.find(c => c.id === selectedMulticlassId);
      if (selectedClass && character) {
        updateCharacter((prev) => {
          if (!prev) return prev;

          // Create or update classes array
          const currentClasses = prev.classes || [{
            class: prev.class,
            level: prev.level,
            subclass: prev.subclass
          }];

          // Check if already has a level in this class
          const existingClassIndex = currentClasses.findIndex(cl => cl.class.id === selectedMulticlassId);

          let updatedClasses;
          if (existingClassIndex >= 0) {
            // Add level to existing class
            updatedClasses = currentClasses.map((cl, i) =>
              i === existingClassIndex ? { ...cl, level: cl.level + 1 } : cl
            );
          } else {
            // Add new class at level 1
            updatedClasses = [...currentClasses, {
              class: selectedClass as any,
              level: 1,
              subclass: undefined
            }];
          }

          let updatedArmorProfs = [...(prev.armorProficiencies || [])];
          let updatedWeaponProfs = [...(prev.weaponProficiencies || [])];

          // Apply multiclass proficiencies only when taking FIRST level in a new class
          if (existingClassIndex < 0) {
            const classId = selectedMulticlassId.toLowerCase();
            const mcProfs = MULTICLASS_PROFICIENCIES[classId];
            if (mcProfs) {
              mcProfs.armor.forEach(prof => {
                if (!updatedArmorProfs.includes(prof)) {
                  updatedArmorProfs.push(prof);
                }
              });
              mcProfs.weapons.forEach(prof => {
                if (!updatedWeaponProfs.includes(prof)) {
                  updatedWeaponProfs.push(prof);
                }
              });
            }
          }

          return {
            ...prev,
            classes: updatedClasses,
            armorProficiencies: updatedArmorProfs,
            weaponProficiencies: updatedWeaponProfs,
            // Update primary class display for backward compatibility
            class: updatedClasses[0].class,
          };
        });
        addJournalEntry(`Took a level in ${selectedClass.name}. Now multiclassing!`, 'Multiclass');
      }
    }

    // Handle Subclass Selection
    if (selectedSubclassId && availableSubclasses.length > 0) {
      const selectedSubclass = availableSubclasses.find(s => s.id === selectedSubclassId);
      if (selectedSubclass) {
        updateCharacter((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            subclass: selectedSubclass
          };
        });
        addJournalEntry(`Chose the path of ${selectedSubclass.name}.`, 'Subclass Selected');
      }
    }

    // Handle Feat Selection
    if (selectedFeatId && availableFeats.length > 0) {
      const selectedFeat = availableFeats.find(f => f.id === selectedFeatId);
      if (selectedFeat) {
        updateCharacter((prev) => {
          if (!prev) return prev;
          const currentFeats = prev.feats || [];
          const newFeats = [...currentFeats, selectedFeatId];

          // Apply proficiencies from feat effects
          let updatedArmorProfs = [...(prev.armorProficiencies || [])];
          let updatedWeaponProfs = [...(prev.weaponProficiencies || [])];
          const newAbilityScores = { ...prev.abilityScores };

          if (selectedFeat.effects) {
            for (const effect of selectedFeat.effects) {
              // Handle proficiency grants
              if (effect.type === 'proficiency' && effect.key) {
                if (effect.key === 'heavy-armor' && !updatedArmorProfs.includes('Heavy Armor')) {
                  updatedArmorProfs.push('Heavy Armor');
                }
                if (effect.key === 'medium-armor' && !updatedArmorProfs.includes('Medium Armor')) {
                  updatedArmorProfs.push('Medium Armor');
                }
                if (effect.key === 'light-armor' && !updatedArmorProfs.includes('Light Armor')) {
                  updatedArmorProfs.push('Light Armor');
                }
              }
              // Handle ability score bonuses (fixed)
              if (effect.type === 'abilityScore' && effect.ability && effect.value) {
                const ability = effect.ability as keyof typeof newAbilityScores;
                if (ability in newAbilityScores) {
                  newAbilityScores[ability] = (newAbilityScores[ability] || 10) + effect.value;
                }
              }
              // Handle ability score bonuses (choice - default to first option)
              if (effect.type === 'abilityScore' && effect.choice && Array.isArray(effect.choice) && effect.value) {
                const ability = effect.choice[0] as keyof typeof newAbilityScores;
                if (ability && ability in newAbilityScores) {
                  newAbilityScores[ability] = (newAbilityScores[ability] || 10) + effect.value;
                  addJournalEntry(`Feat bonus: Increased ${ability} by ${effect.value}`, 'Ability Improvement');
                }
              }
            }
          }

          // Special handling for Resilient (default to Constitution for now as UI is limited)
          if (selectedFeat.id === 'resilient' && !prev.resilientAbility) {
            // Default to Constitution
            const ability = 'constitution';
            newAbilityScores[ability] = (newAbilityScores[ability] || 10) + 1;
            // We need to return resilientAbility in the state update, but it's not in the variable scope here
            // We'll add it to the return object below
          }
        }

      // Use utility to calculate new Max HP (handles Tough feat etc)
      const newMaxHp = calculateMaxHitPoints({ ...prev, feats: newFeats });
        const hpDiff = newMaxHp - prev.maxHitPoints;

        const update: Partial<PlayerCharacter> = {
          ...prev,
          maxHitPoints: newMaxHp,
          hitPoints: prev.hitPoints + hpDiff,
          feats: newFeats,
          armorProficiencies: updatedArmorProfs,
          weaponProficiencies: updatedWeaponProfs,
          abilityScores: newAbilityScores
        };

        if (selectedFeat?.id === 'resilient') {
          if (update) update.resilientAbility = 'constitution';
        }

        return update as PlayerCharacter;
      });
      if (selectedFeat) {
        addJournalEntry(`Gained the feat: ${selectedFeat.name}.`, 'Feat Gained');
      }
    }
  } else if (asiScore1) {
    // Handle ASI Selection
    updateCharacter((prev) => {
      if (!prev) return prev;
      const newAbilityScores = { ...prev.abilityScores };
      // +2 to score1 if score2 is empty
      if (!asiScore2) {
        const key = asiScore1 as keyof typeof newAbilityScores;
        newAbilityScores[key] = (newAbilityScores[key] || 10) + 2;
        addJournalEntry(`Increased ${key} by 2.`, 'Ability Score Improved');
      } else {
        // +1 to both
        const key1 = asiScore1 as keyof typeof newAbilityScores;
        const key2 = asiScore2 as keyof typeof newAbilityScores;
        newAbilityScores[key1] = (newAbilityScores[key1] || 10) + 1;
        newAbilityScores[key2] = (newAbilityScores[key2] || 10) + 1;
        addJournalEntry(`Increased ${key1} and ${key2} by 1.`, 'Ability Score Improved');
      }
      return {
        ...prev,
        abilityScores: newAbilityScores
      };
    });
  }

  const selectedTalent = availableTalents.find((talent) => talent.id === selectedTalentId);

  if (selectedTalent) {
    updateCharacter((prev) => {
      if (!prev) return prev;
      const existingTalents = prev.talents || [];
      const newTalents = existingTalents.includes(selectedTalent.id)
        ? existingTalents
        : [...existingTalents, selectedTalent.id];

      const updatedSkills = { ...prev.skills };
      if (selectedTalent.bonus.type === 'skill' && selectedTalent.bonus.value) {
        const skillName = selectedTalent.bonus.value as SkillName;
        if (!updatedSkills[skillName]?.proficient) {
          updatedSkills[skillName] = {
            ...updatedSkills[skillName],
            proficient: true
          };
        }
      }

      return {
        ...prev,
        talents: newTalents,
        skills: updatedSkills,
      };
    });

    addJournalEntry(`Learned the ${selectedTalent.name} talent. ${selectedTalent.description}`, 'Talent Gained');
  }

  setAvailableTalents([]);
  setSelectedTalentId(null);
  setAvailableFeats([]);
  setSelectedFeatId(null);
  setAsiScore1(undefined);
  setAsiScore2(undefined);
  setAvailableSubclasses([]);
  setSelectedSubclassId(null);
  setSelectedMulticlassId(null);
  setShowLevelUp(false);
};

const handleCombatVictory = () => {
  if (!currentEncounter) return;
  setInCombat(false);
  completeEncounter(currentEncounter.id);

  // Award random item as reward
  const lootPool = [...itemsData.weapons, ...itemsData.armor, ...itemsData.potions, ...itemsData.treasure];
  const randomTemplate = lootPool[Math.floor(Math.random() * lootPool.length)];
  addItem(createItemInstance(randomTemplate as unknown as Item));

  // Award XP for victory
  const xpReward = currentEncounter.enemy?.xpReward || currentEncounter.xpReward || 50;
  gainXp(xpReward);

  setTimeout(() => {
    const combatOption = currentEncounter.options.find(opt => opt.type === 'attack');
    if (combatOption?.nextEncounterId) {
      advanceToNextEncounter(combatOption.nextEncounterId);
    }
  }, 2000);
};

const handleCombatDefeat = () => {
  // First hide combat interface
  setInCombat(false);
  // Then immediately show game over screen
  setShowGameOver(true);
};

const handleUseInventoryItem = (item: Item) => {
  if (!character) return;

  if (item.type === 'potion' && typeof item.healing === 'number') {
    const before = character.hitPoints;
    consumeItem(item);
    const actualHeal = Math.max(0, Math.min(character.maxHitPoints - before, item.healing));
    addToNarrativeLog(`${character.name} drinks ${item.name} and recovers ${actualHeal} HP.`);
    addJournalEntry(`${character.name} used ${item.name}.`, 'Item Used');
    setShowInventory(false);
    return;
  }

  if (item.type === 'scroll' && item.spellId) {
    const scrollSpell = spellsData.find((s) => s.id === item.spellId) as unknown as SpellContent;
    if (!scrollSpell) {
      addToNarrativeLog('The scroll is illegible.');
      consumeItem(item);
      setShowInventory(false);
      return;
    }

    const { requiresCheck, dc, abilityMod } = shouldCheckScrollUse(character, scrollSpell);
    let failed = false;
    if (requiresCheck) {
      const roll = rollRandom(20);
      const total = roll + abilityMod + getProficiencyBonus(character.level);
      if (total < dc) {
        failed = true;
        addToNarrativeLog(`${character.name} fails to cast ${scrollSpell.name} from the scroll (rolled ${total} vs DC ${dc}).`);
      } else {
        addToNarrativeLog(`${character.name} manages to cast ${scrollSpell.name} from the scroll (rolled ${total} vs DC ${dc}).`);
      }
    } else {
      addToNarrativeLog(`${character.name} casts ${scrollSpell.name} from the scroll.`);
    }

    if (!failed) {
      const castResult = handleAdventureCast(scrollSpell.id, {
        slotLevel: item.spellLevel ?? scrollSpell.level,
        fromScroll: true,
        bypassPreparation: true,
        source: 'scroll'
      });
      if (castResult !== false) {
        consumeItem(item);
      }
    }
    setShowInventory(false);
    return;
  }

  consumeItem(item);
  setShowInventory(false);
};

const handlePinItem = (item: Item) => {
  updateCharacter((prev) => {
    if (!prev || !prev.inventory) return prev;
    const updatedInventory = prev.inventory.map((i) =>
      i.id === item.id ? { ...i, pinned: !i.pinned } : i
    );
    return { ...prev, inventory: updatedInventory };
  });
};

const getAbilityModifier = (ability: string) => {
  if (!character) return 0;
  const abilityKey = ability.toLowerCase() as keyof typeof character.abilityScores;
  const score = character.abilityScores[abilityKey];
  return Math.floor((score - 10) / 2);
};

const handleShortRest = () => {
  if (!character) return;
  // Short Rest: Heal using Hit Dice (simplified: heal 50% of max HP)
  // In full 5e, you roll hit dice. Here we'll just give a flat boost for now or roll 1 hit die.
  const hitDieStr = character.class.hitDie || 'd8';
  const hitDieVal = parseInt(hitDieStr.replace('d', '')) || 8;
  const conMod = Math.floor((character.abilityScores.constitution - 10) / 2);
  const healAmount = Math.max(1, rollDice(hitDieVal) + conMod);

  updateCharacter((prev) => ({
    ...prev,
    hitPoints: Math.min(prev.maxHitPoints, prev.hitPoints + healAmount),
    concentratingOn: undefined,
  }));

  addJournalEntry(`Took a short rest and regained ${healAmount} HP.`, 'Rest');
  setShowRestMenu(false);

  // Advance time/world state if we had that, for now just close menu
};

const handleLongRest = () => {
  if (!character) return;
  // Long Rest: Full HP and Spell Slots
  updateCharacter((prev) => ({
    ...prev,
    hitPoints: prev.maxHitPoints,
    concentratingOn: undefined,
    spellSlots: prev.spellSlots ? Object.fromEntries(
      Object.entries(prev.spellSlots).map(([level, slot]) => [level, { ...slot, current: slot.max }])
    ) : undefined
  }));

  addJournalEntry('Took a long rest. HP and Spell Slots fully restored.', 'Rest');
  setShowRestMenu(false);
};

if (!adventure || !currentEncounter) {
  return null;
}

if (showGameOver) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 fade-in">
      <div className="text-center space-y-6 p-8 max-w-md">
        <h2 className="text-5xl font-bold text-red-600 mb-4 animate-pulse">YOU DIED</h2>
        <p className="text-xl text-gray-300">
          Your journey has come to a tragic end. But every end is a new beginning.
        </p>
        <Button
          onClick={() => {
            setShowGameOver(false);
            reset();
          }}
          className="w-full py-6 text-xl bg-red-700 hover:bg-red-800 text-white border-2 border-red-500"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}

if (!character) {
  return (
    <div className="container mx-auto px-4 py-8 fade-in">
      <Card className="w-full max-w-2xl mx-auto scroll-parchment slide-up">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">{t('adventure.noCharacter')}</CardTitle>
          <CardDescription className="text-lg mt-2">
            {t('adventure.createCharacterFirst')}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

if (inCombat && currentEncounter.enemy) {
  return (
    <div className="container mx-auto px-4 py-8 fade-in">
      <CombatEncounter
        character={character}
        enemies={[currentEncounter.enemy]}
        onVictory={handleCombatVictory}
        onDefeat={handleCombatDefeat}
        playerAdvantage={currentEncounter.playerAdvantage}
      />
    </div>
  );
}

return (
  <div className="container mx-auto px-4 py-8 fade-in">
    <DiceRollModal
      isOpen={showDiceModal}
      isRolling={isRollingDice}
      diceRoll={diceRoll}
      rollResult={rollResult}
      onRollComplete={handleDiceRollComplete}
      onClose={handleModalClose}
      skillName={currentSkillCheck?.skill}
      difficultyClass={currentSkillCheck?.dc}
      modifier={currentSkillCheck?.modifier}
    />

    <LevelUpModal
      isOpen={showLevelUp}
      level={levelUpData.level}
      hpIncrease={levelUpData.hpIncrease}
      talents={availableTalents}
      selectedTalentId={selectedTalentId}
      onSelectTalent={setSelectedTalentId}
      feats={availableFeats}
      selectedFeatId={selectedFeatId}
      onSelectFeat={(id) => {
        setSelectedFeatId(id);
        setAsiScore1(undefined);
        setAsiScore2(undefined);
      }}
      asiScore1={asiScore1}
      asiScore2={asiScore2}
      onSelectAsi={(s1, s2) => {
        setAsiScore1(s1);
        setAsiScore2(s2);
        setSelectedFeatId(null);
      }}
      subclasses={availableSubclasses}
      selectedSubclassId={selectedSubclassId}
      onSelectSubclass={setSelectedSubclassId}
      onConfirm={handleTalentConfirm}
      // Multiclass props
      currentClassName={character?.class.name}
      multiclassOptions={character ? allClasses
        .filter(c => c.id !== character.class.id)
        .map(c => ({
          class: c as any,
          meetsPrereqs: meetsMulticlassPrereqs(character, c.id) && canLeaveCurrentClass(character),
          prereqReason: !canLeaveCurrentClass(character)
            ? `Need ${character.class.name} prereqs`
            : MULTICLASS_PREREQUISITES[c.id.toLowerCase()]
              ? Object.entries(MULTICLASS_PREREQUISITES[c.id.toLowerCase()]!)
                .filter(([k]) => k !== 'orCondition')
                .map(([k, v]) => `${k.substring(0, 3).toUpperCase()} ${v}`)
                .join(', ')
              : undefined
        })) : []}
      selectedMulticlassId={selectedMulticlassId}
      onSelectMulticlass={setSelectedMulticlassId}
      canLeaveCurrentClass={character ? canLeaveCurrentClass(character) : false}
    />
    {showExitConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="max-w-md w-full bg-fantasy-dark-card border border-fantasy-purple/40 rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-bold text-fantasy-gold">{t('adventure.exitTitle', 'Leave adventure?')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('adventure.exitBody', 'You will return to camp. Progress in this adventure will be lost unless it has been completed.')}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowExitConfirm(false);
                endAdventure('abandoned', t('adventure.abandoned', 'Abandoned the adventure.'));
              }}
            >
              {t('adventure.exitConfirm', 'Return to Camp')}
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Character Stats Bar */}
    <div className="mb-6 flex flex-wrap gap-4 justify-center items-center">
      {/* Character Portrait Trigger */}
      {/* Character Profile Pill */}
      <button
        onClick={() => setShowCharacterSheet(true)}
        className="group relative flex items-center pr-5 pl-1 py-1 gap-3 bg-black/40 hover:bg-black/60 border border-fantasy-gold/30 rounded-full transition-all hover:border-fantasy-gold/60"
      >
        <div className="h-10 w-10 rounded-full border border-fantasy-gold/70 overflow-hidden bg-black/50 shadow-md">
          {character.portraitId ? (
            <img
              src={portraits.find(p => p.id === character.portraitId)?.src}
              alt={character.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-fantasy-dark-card text-fantasy-gold font-fantasy text-sm">
              {character.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-0.5">
          <span className="text-sm font-bold text-fantasy-gold leading-none">
            {character.name}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5">
            {character.race.name} {character.class.name} <span className="text-fantasy-gold/50">•</span> Lvl {character.level}
          </span>
        </div>
      </button>
      <Badge variant="gold" className="text-sm px-4 py-2">
        HP: {character.hitPoints}/{character.maxHitPoints}
      </Badge>
      {slotBadges.length > 0 && (
        <Badge variant="outline" className="text-sm px-3 py-2 flex items-center gap-2">
          <span>Slots:</span>
          <span className="text-xs text-muted-foreground">{slotBadges.join(' | ')}</span>
        </Badge>
      )}
      {character.concentratingOn && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm px-3 py-2 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span>Concentration: {character.concentratingOn.spellName}</span>
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleEndConcentration}>
            End
          </Button>
        </div>
      )}
      <Badge variant="outline" className="text-sm px-4 py-2 flex flex-col items-start gap-1 min-w-[120px]">
        <div className="flex justify-between w-full text-xs gap-3">
          <span>Level {character.level}</span>
          <span className="text-muted-foreground">{character.xp}/{character.maxXp || 300} XP</span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-fantasy-gold transition-all duration-500"
            style={{ width: `${Math.min(100, ((character.xp || 0) / (character.maxXp || 300)) * 100)}%` }}
          />
        </div>
      </Badge>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInventory(true)}
          className="flex items-center gap-2"
        >
          <Backpack className="h-4 w-4" />
          {t('adventure.inventory', 'Inventory')} {character.inventory && character.inventory.length > 0 && `(${character.inventory.length})`}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQuestJournal(true)}
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          {t('adventure.questJournal', 'Quests & Journal')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRestMenu(true)}
          className="flex items-center gap-2"
          disabled={inCombat}
        >
          <Tent className="h-4 w-4" />
          {t('adventure.rest', 'Rest')}
        </Button>
        {(character.knownSpells?.length > 0 || Object.keys(character.spellSlots || {}).length > 0) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpellMenu(true)}
            className="flex items-center gap-2"
            disabled={inCombat}
          >
            <Wand2 className="h-4 w-4" />
            Cast Spell
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowShop(true)}
          className="flex items-center gap-2"
          disabled={inCombat}
        >
          <ShoppingBag className="h-4 w-4" />
          Merchant
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-2"
          disabled={inCombat}
        >
          <DoorOpen className="h-4 w-4" />
          {t('adventure.exit', 'Leave Adventure')}
        </Button>
      </div>
    </div>

    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="w-full lg:w-1/3 order-2 lg:order-1">
        <Card className="bg-fantasy-dark-card/80 border border-fantasy-purple/20 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('adventure.narrativeLog', 'Narrative Log')}</CardTitle>
            <CardDescription>{t('adventure.narrativeLogHint', 'Key actions and dice rolls from your journey.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {hasNarrativeEntries ? (
              narrativeLog.map((entry) => (
                <p key={entry.id} className="text-sm text-muted-foreground border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  • {entry.message}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('adventure.narrativeLogEmpty', 'Your choices will be tracked here once the adventure begins.')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="w-full lg:flex-1 order-1 lg:order-2">
        <Card className="w-full scroll-parchment slide-up">
          <CardHeader>
            {currentEncounter.completed && (
              <div className="mb-2">
                <Badge variant="gold">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t('adventure.completed')}
                </Badge>
              </div>
            )}
            <CardTitle className="text-2xl">{currentEncounter.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tutorial Box */}
            {currentEncounter.tutorial && showTutorial && (
              <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-fantasy-dark-card to-fantasy-dark-surface border border-fantasy-gold/30 shadow-lg">
                <div className="absolute inset-y-0 left-0 w-1 bg-fantasy-gold" />
                <div className="p-5 pl-6">
                  <div className="flex items-start gap-4">
                    <BookOpen className="h-6 w-6 text-fantasy-gold mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <h4 className="text-lg font-semibold text-fantasy-gold">
                        {t('adventure.tutorial')}: {currentEncounter.tutorial.title}
                      </h4>
                      <p className="text-base leading-relaxed text-foreground/90">
                        {currentEncounter.tutorial.content}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-fantasy-gold"
                        onClick={() => setShowTutorial(false)}
                      >
                        {t('adventure.hideTutorial')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description with optional NPC Portrait */}
            <div className="space-y-2">
              {/* NPC Portrait Detection */}
              {(() => {
                // Check for NPC names in the encounter title or description
                const npcIds = ['thora', 'pip', 'mara', 'kaela', 'eldred', 'vael', 'ryell'];
                const titleLower = currentEncounter.title.toLowerCase();
                const descLower = currentEncounter.description.toLowerCase();

                // Find the NPC that appears earliest in the title or description
                let bestMatch = null;
                let bestIndex = Infinity;

                for (const id of npcIds) {
                  // Check title (highest priority)
                  const titleIdx = titleLower.indexOf(id);
                  if (titleIdx !== -1) {
                    // Title matches are effectively index 0 priority (or slightly better)
                    const adjustedIdx = titleIdx - 1000;
                    if (adjustedIdx < bestIndex) {
                      bestIndex = adjustedIdx;
                      bestMatch = id;
                    }
                    continue;
                  }

                  // Check description if social
                  if (currentEncounter.type === 'social') {
                    const descIdx = descLower.indexOf(id);
                    if (descIdx !== -1 && descIdx < bestIndex) {
                      bestIndex = descIdx;
                      bestMatch = id;
                    }
                  }
                }

                const matchedNpc = bestMatch;
                const portraitSrc = matchedNpc ? getNPCPortraitSrc(matchedNpc) : undefined;
                const hasNpcPortrait = portraitSrc && (currentEncounter.type === 'social' || titleLower.includes(matchedNpc || ''));
                const hasOutcome = outcomeMessage && !isRollingDice;

                // Smart Hide: If we have an outcome and an NPC, show outcome as the NPC's speech
                if (hasNpcPortrait && hasOutcome) {
                  return (
                    <div className="flex gap-4 items-start fade-in">
                      <img
                        src={portraitSrc}
                        alt={matchedNpc || 'NPC'}
                        className="w-24 h-24 rounded-lg border-2 border-fantasy-gold/50 object-cover shadow-lg flex-shrink-0"
                      />
                      <p className="text-lg leading-relaxed flex-1">{outcomeMessage}</p>
                    </div>
                  );
                }

                // Show portrait with initial description (no outcome yet)
                if (hasNpcPortrait) {
                  return (
                    <div className="flex gap-4 items-start">
                      <img
                        src={portraitSrc}
                        alt={matchedNpc || 'NPC'}
                        className="w-24 h-24 rounded-lg border-2 border-fantasy-gold/50 object-cover shadow-lg flex-shrink-0"
                      />
                      <p className="text-lg flex-1">{currentEncounter.description}</p>
                    </div>
                  );
                }

                // No NPC portrait - show description normally
                return <p className="text-lg">{currentEncounter.description}</p>;
              })()}

              {/* Outcome Message from Last Choice - only show if no NPC portrait handled it */}
              {outcomeMessage && !isRollingDice && (() => {
                // Check if an NPC portrait is handling the outcome display
                const npcIds = ['thora', 'pip', 'mara', 'kaela', 'eldred', 'vael', 'ryell'];
                const titleLower = currentEncounter.title.toLowerCase();
                const descLower = currentEncounter.description.toLowerCase();

                let hasNpcMatch = false;
                for (const id of npcIds) {
                  if (titleLower.includes(id) || (currentEncounter.type === 'social' && descLower.includes(id))) {
                    const portraitSrc = getNPCPortraitSrc(id);
                    if (portraitSrc) {
                      hasNpcMatch = true;
                      break;
                    }
                  }
                }

                // If NPC portrait is showing the outcome, don't show it again
                if (hasNpcMatch) {
                  return null;
                }

                // Show standalone outcome for non-NPC encounters
                return (
                  <div className="my-6 pl-5 border-l-4 border-fantasy-gold/60 fade-in">
                    <p className="text-lg font-body text-foreground leading-relaxed">
                      {outcomeMessage}
                    </p>
                  </div>
                );
              })()}

              {/* Dynamic character-specific flavor text */}
              {showTutorial && currentEncounter.type === 'combat' && character.class.name === 'Wizard' && (
                <div className="my-4 pl-5 border-l-4 border-fantasy-purple/60">
                  <p className="text-base text-fantasy-purple-light leading-relaxed">
                    Your arcane training gives you a moment to assess the magical energies in the area...
                  </p>
                </div>
              )}
              {showTutorial && currentEncounter.type === 'combat' && character.class.name === 'Barbarian' && (
                <div className="my-4 pl-5 border-l-4 border-red-500/60">
                  <p className="text-base text-red-400 leading-relaxed">
                    You feel the battle rage stirring within you, ready to be unleashed...
                  </p>
                </div>
              )}
            </div>

            {/* Enemy Stats */}
            {currentEncounter.enemy && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Sword className="h-5 w-5 text-red-400" />
                  <h4 className="font-semibold text-red-400">{currentEncounter.enemy.name}</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>AC: {currentEncounter.enemy.armorClass}</div>
                  <div>HP: {currentEncounter.enemy.hitPoints}</div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">{t('adventure.whatDoYouDo')}</h4>
              {currentEncounter.options
                .filter((option) => {
                  // Filter options based on character requirements
                  if (option.requiresRace && character.race.name !== option.requiresRace) {
                    return false;
                  }
                  if (option.requiresClass && character.class.name !== option.requiresClass) {
                    return false;
                  }
                  if (option.requiresBackground && character.background.name !== option.requiresBackground) {
                    return false;
                  }
                  if (option.requiresVisitedEncounterId && !visitedEncounters.includes(option.requiresVisitedEncounterId)) {
                    return false;
                  }
                  return true;
                })
                .map((option) => {
                  const hasVisitedTarget = option.nextEncounterId
                    ? visitedEncounters.includes(option.nextEncounterId)
                    : false;
                  const optionLabel = hasVisitedTarget && option.repeatText ? option.repeatText : option.text;
                  const isSkillCheck = option.type === 'skill';
                  const isSelected = selectedOptions.has(`${currentEncounter.id}-${option.id}`);
                  const skillData = isSkillCheck
                    ? {
                      skill: option.skill || currentEncounter.skillCheck?.skill,
                      ability: option.ability || currentEncounter.skillCheck?.ability,
                      difficulty: option.difficultyClass || currentEncounter.skillCheck?.difficultyClass,
                      success: option.successOutcome || currentEncounter.skillCheck?.success,
                      failure: option.failureOutcome || currentEncounter.skillCheck?.failure,
                    }
                    : null;
                  const abilityModifier = skillData?.ability ? getAbilityModifier(skillData.ability) : null;

                  return (
                    <div key={option.id}>
                      <Button
                        variant={option.type === 'attack' ? 'destructive' : 'outline'}
                        className={cn(
                          "w-full justify-start text-left h-auto py-5 px-5 text-base",
                          (option.requiresRace || option.requiresClass || option.requiresBackground) &&
                          "border-fantasy-gold/50 bg-fantasy-gold/10 hover:bg-fantasy-gold/20",
                          isSelected && "opacity-60 text-muted-foreground"
                        )}
                        onClick={() => handleOptionClick(option)}
                        disabled={currentEncounter.completed && !option.endsAdventure}
                      >
                        <div className="flex flex-wrap items-center gap-3 w-full">
                          <span className="flex items-center gap-2 text-left">
                            {option.isExitOption && <DoorOpen className="h-5 w-5 text-muted-foreground" />}
                            {isSkillCheck && <Dice6 className="h-5 w-5 text-fantasy-purple" />}
                            <span>{optionLabel}</span>
                          </span>
                          {skillData && skillData.skill && skillData.ability && skillData.difficulty && (
                            <span className="flex items-center gap-2 text-xs text-fantasy-purple">
                              <span className="font-semibold whitespace-nowrap">
                                {skillData.skill} • {skillData.ability} (DC {skillData.difficulty})
                              </span>
                              {typeof abilityModifier === 'number' && (
                                <Badge variant="outline" className="text-[11px] px-2 py-0 whitespace-nowrap">
                                  {skillData.ability}: {abilityModifier >= 0 ? '+' : ''}{abilityModifier}
                                </Badge>
                              )}
                            </span>
                          )}
                          {(option.requiresRace || option.requiresClass || option.requiresBackground) && (
                            <Badge variant="gold" className="ml-auto text-xs">Special</Badge>
                          )}
                        </div>
                      </Button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    {
      showQuestJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl bg-fantasy-dark-card border border-fantasy-gold/30 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => setShowQuestJournal(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-fantasy-gold/20">
              <BookOpen className="h-6 w-6 text-fantasy-gold" />
              <h2 className="text-2xl font-fantasy text-fantasy-gold tracking-wide">Quest Log & Journal</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <QuestTracker quests={quests} />
              <JournalPanel journal={journal} />
            </div>
          </div>
        </div>
      )
    }

    {
      showRestMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md">
            <Card className="border-fantasy-gold bg-fantasy-dark-card shadow-2xl">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full"
                onClick={() => setShowRestMenu(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tent className="h-6 w-6 text-fantasy-gold" />
                  Rest & Recovery
                </CardTitle>
                <CardDescription>
                  Take a moment to tend to your wounds and prepare for the journey ahead.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-4 hover:border-fantasy-gold/50 transition-colors"
                  onClick={handleShortRest}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold">Short Rest</span>
                    <span className="text-xs text-muted-foreground">Spend 1 Hit Die to regain HP.</span>
                  </div>
                  <Badge variant="secondary">1 hr</Badge>
                </Button>
                <Button
                  variant="fantasy"
                  className="w-full justify-between h-auto py-4"
                  onClick={handleLongRest}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold">Long Rest</span>
                    <span className="text-xs text-white/80">Restore all HP and Spell Slots.</span>
                  </div>
                  <Badge variant="secondary" className="bg-black/20">8 hrs</Badge>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    {
      showSpellMenu && !inCombat && character && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl">
            <Card className="border-fantasy-purple bg-fantasy-dark-card shadow-2xl relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full"
                onClick={() => setShowSpellMenu(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <CardHeader>
                <CardTitle className="flex justify-between items-center pr-8">
                  <span className="font-fantasy tracking-wider text-fantasy-gold">Spells & Magic</span>
                  {slotBadges.length > 0 && (
                    <Badge variant="outline">
                      {slotBadges.join(' | ')}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                {character.knownSpells?.map((spellId) => {
                  const spell = spellsData.find((s) => s.id === spellId) as unknown as SpellContent;
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
                      className="w-full rounded-xl border border-fantasy-purple/30 bg-black/20 p-4 hover:bg-fantasy-purple/10 hover:border-fantasy-purple/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-base text-white flex items-center gap-2 mb-1">
                            {spell.name}
                            {spell.concentration && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex items-center gap-1 border-amber-500/50 text-amber-400">
                                <Brain className="h-3 w-3" /> Concentration
                              </Badge>
                            )}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                            <span className="text-fantasy-purple">{spell.school}</span>
                            <span>•</span>
                            <span>{spell.castingTime}</span>
                            <span>•</span>
                            <span>{spell.range}</span>
                          </div>
                          <p className="text-sm text-muted-foreground/90 leading-relaxed">
                            {spell.description}
                          </p>
                          {!preparedRequirement && (
                            <span className="text-[11px] text-amber-400 mt-2 inline-block">⚠ Not prepared</span>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs px-2 py-1 bg-fantasy-purple/20 text-fantasy-purple border-fantasy-purple/30">
                          {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                        {isCantrip && (
                          <Button
                            size="sm"
                            variant="fantasy"
                            onClick={() => handleAdventureCast(spellId)}
                            className="text-xs"
                          >
                            Cast Cantrip
                          </Button>
                        )}
                        {availableSlotLevels.map((lvl) => (
                          <Button
                            key={`${spellId}-slot-${lvl}-adv`}
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdventureCast(spellId, { slotLevel: lvl })}
                            disabled={!preparedRequirement}
                            className="text-xs"
                          >
                            Use Lvl {lvl} Slot
                          </Button>
                        ))}
                        {canCastAsRitual && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAdventureCast(spellId, { castAsRitual: true })}
                            disabled={!preparedRequirement}
                            className="text-xs"
                          >
                            🕯️ Ritual
                          </Button>
                        )}
                        {noResources && (
                          <span className="text-xs text-muted-foreground italic">No slots remaining</span>
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

    {/* Shop Modal */}
    {
      showShop && (
        <Shop onClose={() => setShowShop(false)} />
      )
    }

    {/* Inventory Modal */}
    {
      showInventory && (
        <Inventory
          character={character}
          onEquipItem={equipItem}
          onUnequipItem={unequipItem}
          onEquipToSlot={equipToSlot}
          onUnequipSlot={unequipSlot}
          onUseItem={handleUseInventoryItem}
          onPinItem={handlePinItem}
          onAttuneItem={attuneItem}
          onUnattuneItem={unattuneItem}
          onClose={() => setShowInventory(false)}
        />
      )
    }

    {/* Character Sheet Modal */}
    {
      showCharacterSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto no-scrollbar pt-6">
            <CharacterSheet character={character} onClose={() => setShowCharacterSheet(false)} />
          </div>
        </div>
      )
    }


  </div >
);
}
