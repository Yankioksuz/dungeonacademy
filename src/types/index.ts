export const TYPES_VERSION = '2.0.0'; // Updated for D&D 5e mechanics

// ============================================================================
// D&D 5e Core Mechanics Types
// ============================================================================

// Skill System
export type SkillName =
  | 'acrobatics' | 'animal-handling' | 'arcana' | 'athletics'
  | 'deception' | 'history' | 'insight' | 'intimidation'
  | 'investigation' | 'medicine' | 'nature' | 'perception'
  | 'performance' | 'persuasion' | 'religion' | 'sleight-of-hand'
  | 'stealth' | 'survival';

export interface SkillProficiency {
  proficient: boolean;
  expertise: boolean; // Double proficiency bonus
}

export type Skills = Record<SkillName, SkillProficiency>;

// Ability names for type safety
export type AbilityName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

// Condition System
export type ConditionType =
  | 'blinded' | 'charmed' | 'deafened' | 'frightened'
  | 'grappled' | 'incapacitated' | 'invisible' | 'paralyzed'
  | 'petrified' | 'poisoned' | 'prone' | 'restrained'
  | 'stunned' | 'unconscious' | 'hexed' | 'turned' | 'pacified' | 'hidden' | 'reckless' | 'haste' | 'flying'
  | 'displacement-broken' // Cloak of Displacement temporarily inactive
  | 'armor-not-proficient' // Wearing armor without proficiency
  | 'exhaustion-1' | 'exhaustion-2' | 'exhaustion-3' | 'exhaustion-4' | 'exhaustion-5' | 'exhaustion-6';

export interface Condition {
  type: ConditionType;
  name: string;
  description: string;
  duration?: number; // rounds, -1 for indefinite
  source?: string; // spell or ability that caused it
}

// Death Saving Throws
export interface DeathSaves {
  successes: number; // 0-3
  failures: number; // 0-3
}

// Roll Modifiers
export type RollModifier = 'advantage' | 'disadvantage' | 'normal';

// Saving Throw Proficiencies
export type SavingThrowProficiencies = Record<AbilityName, boolean>;

// ============================================================================
// Quiz and Content Types
// ============================================================================


export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  category: QuizCategory;
}

export type QuizCategory = 'rules' | 'character-creation' | 'spells' | 'abilities';

export interface Quiz {
  id: string;
  title: string;
  category: QuizCategory;
  questions: QuizQuestion[];
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  percentage: number;
}

export interface DnDContent {
  rules: RuleContent[];
  characterCreation: CharacterCreationContent;
  spells: SpellContent[];
  abilities: AbilityContent[];
}

export interface RuleContent {
  id: string;
  title: string;
  description: string;
  category: string;
  details: string[];
}

export interface CharacterCreationContent {
  races: Race[];
  classes: Class[];
  backgrounds: Background[];
}

export interface Race {
  id: string;
  name: string;
  description: string;
  abilityScoreIncrease: { [key: string]: number | undefined };
  traits: string[];
  speed?: number; // Base walking speed in feet (default 30)
}

export interface Class {
  id: string;
  name: string;
  description: string;
  hitDie: string;
  primaryAbility: string;
  savingThrows: string[]; // Will be converted to savingThrowProficiencies
  savingThrowProficiencies?: AbilityName[]; // NEW: Type-safe saving throws
  features: string[];
}

// NEW: Multiclassing support - tracks levels in each class
export interface ClassLevel {
  class: Class;
  level: number;
  subclass?: Subclass;
}

export interface Background {
  id: string;
  name: string;
  description: string;
  skillProficiencies: string[];
  languages?: string[];
  equipment: string[];
}

export interface SpellContent {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  classes: string[];
  damage?: string;
  healing?: string;
  damageType?: string;
  saveType?: string;
  concentration?: boolean;
  ritual?: boolean;
  upcastDescription?: string;
  cantripScaling?: {
    level5?: string;
    level11?: string;
    level17?: string;
  };
  componentTags?: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialDescription?: string;
  };

  // NEW: Enhanced spell properties
  areaOfEffect?: {
    type: 'sphere' | 'cone' | 'cube' | 'cylinder' | 'line';
    size: number; // in feet
  };
  attackType?: 'melee' | 'ranged' | 'none';
  targets?: string; // e.g., "1 creature", "up to 3 creatures"
}

export interface AbilityContent {
  id: string;
  name: string;
  class: string;
  level: number;
  description: string;
  type: 'feature' | 'spell' | 'ability';
}

// Gameplay types
export interface PlayerCharacter {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'non-binary' | 'other';
  race: Race;
  class: Class; // Primary class (first in classes array) - kept for backward compatibility
  classes?: ClassLevel[]; // NEW: All class levels for multiclassing
  background: Background;
  portraitId?: string;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  hitPoints: number;
  maxHitPoints: number;
  temporaryHitPoints: number; // NEW: Temporary HP
  hitDice?: {
    current: number;
    max: number;
    die: string; // e.g., "d10"
  };
  level: number;
  xp: number;
  maxXp: number;
  gold: number;

  // NEW: D&D 5e Mechanics
  proficiencyBonus: number; // Calculated from level: +2 (1-4), +3 (5-8), +4 (9-12), etc.
  skills: Skills; // UPDATED: Changed from string[] to Skills object
  savingThrowProficiencies: SavingThrowProficiencies; // NEW: Saving throw proficiencies from class
  conditions: Condition[]; // NEW: Active conditions
  deathSaves: DeathSaves; // NEW: Death saving throws (when at 0 HP)
  lastLongRest?: number; // Timestamp (in-game time) of last long rest

  // NEW: Racial & Class Details
  languages: string[];
  weaponProficiencies: string[];
  armorProficiencies: string[];
  senses: string[]; // e.g. "Darkvision (60 ft)"
  draconicAncestry?: {
    type: string; // e.g. "Red", "Blue"
    damageType: string; // e.g. "Fire", "Lightning"
    breathCone: boolean; // true for cone, false for line
  };
  fightingStyle?: string; // Fighter choice
  pactBoon?: string; // Warlock Pact
  sorcerousOrigin?: string; // Sorcerer origin

  // Passive Scores (calculated)
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;

  // Equipment System
  spells?: SpellContent[];
  inventory?: Item[];
  equipment?: Equipment;  // NEW: Full equipment loadout
  // Legacy fields (maintained for backward compatibility)
  equippedWeapon?: Item;
  equippedArmor?: Item;
  equippedShield?: Item;
  attunedItems?: Item[]; // Magic item attunement (max 3)
  talents?: string[];
  bonusSkills?: string[]; // e.g. human extra skill
  expertiseSkills?: string[]; // e.g. rogue expertise picks
  spellSlots?: {
    [level: number]: {
      current: number;
      max: number;
    };
  };
  knownSpells?: string[];
  preparedSpells?: string[];
  concentratingOn?: {
    spellId: string;
    spellName: string;
    startedAt: number;
  };
  featureUses?: FeatureUses;
  adventureHistory?: AdventureHistoryEntry[];
  subclass?: Subclass; // NEW: Selected Subclass
  feats?: string[]; // IDs of taken feats
  resilientAbility?: AbilityName; // Chosen ability for Resilient feat
}

export interface FeatEffect {
  type: 'initiative' | 'passive' | 'hpPerLevel' | 'resource' | 'action' | 'toggle' | 'speed' | 'proficiency' | 'abilityScore' | 'acBonus' | 'damageReduction' | 'reaction' | 'bonusAction' | 'passiveBonus' | 'savingThrowProficiency' | 'cantrip' | 'spell';
  description?: string; // Human readable description of effect
  key?: string;
  value?: number;
  trigger?: string;
  reset?: string;
  attackPenalty?: number;
  damageBonus?: number;
  weaponProp?: string;
  weaponType?: string;
  ability?: string; // For abilityScore effects
  choice?: string | string[]; // For choice-based effects
}

export interface Feat {
  id: string;
  name: string;
  description: string;
  source?: string; // PHB, XGE, etc.

  // Prerequisites
  prerequisites?: {
    abilityScore?: {
      ability: AbilityName;
      minimum: number;
    };
    race?: string[];
    class?: string[];
    level?: number;
    proficiency?: string;
    armor?: string; // e.g. "Medium Armor"
    spellcasting?: boolean;
  };

  // Benefits
  benefits?: {
    abilityScoreIncrease?: {
      ability: AbilityName | 'choice' | 'chosen';
      amount: number;
    }[];
    specialAbility?: string;
    proficiencies?: string[];
    other?: string[];
  };

  effects?: FeatEffect[];
}

export interface Subclass {
  id: string;
  name: string;
  description: string;
  classId: string;
  featuresByLevel: Record<number, string[]>;
  features: SubclassFeature[];
}

export interface SubclassFeature {
  id: string;
  name: string;
  level: number;
  description: string;
  type: 'passive' | 'action' | 'bonus_action' | 'reaction';
  metadata?: Record<string, unknown>; // For improved Crit range, bonus healing stats, etc.
}



export interface AdventureHistoryEntry {
  id: string;
  adventureId: string;
  adventureTitle: string;
  completedAt: number;
  outcome: 'success' | 'failure' | 'abandoned';
  summary?: string;
  levelAtCompletion: number;
}

export interface TalentOption {
  id: string;
  name: string;
  description: string;
  bonus: {
    type: 'skill' | 'combat' | 'social';
    value: string;
  };
  requirements?: {
    level?: number;
    classId?: string;
  };
}

// Equipment Slot System
export type EquipmentSlot = 'mainHand' | 'offHand' | 'armor' | 'helmet' | 'gloves' | 'boots' | 'amulet' | 'ring1' | 'ring2';

export interface Equipment {
  mainHand?: Item;    // Primary weapon
  offHand?: Item;     // Shield or secondary weapon
  armor?: Item;       // Body armor
  helmet?: Item;      // Head slot
  gloves?: Item;      // Hands slot
  boots?: Item;       // Feet slot
  amulet?: Item;      // Neck slot
  ring1?: Item;       // Ring slot 1
  ring2?: Item;       // Ring slot 2
}

// Item Effect System
export type ItemEffectType = 'skillBonus' | 'abilityCheckBonus' | 'saveBonus' | 'advantage';

export interface ItemEffect {
  type: ItemEffectType;
  skill?: SkillName; // For skillBonus
  ability?: AbilityName; // For abilityCheckBonus
  save?: AbilityName | 'all'; // For saveBonus
  condition?: string; // For conditional effects (e.g., "fear" for saves vs fear)
  value: number; // Bonus amount
  when?: 'equipped' | 'attuned' | 'always'; // When the effect applies
}

export interface Item {
  id: string;
  templateId?: string;
  name: string;
  type: string; // broadened from strict union to string to allow flexibility, or keep union if preferred
  subtype?: string; // e.g., "Simple Melee", "Martial Ranged"
  armorType?: 'light' | 'medium' | 'heavy' | 'shield' | 'clothing';
  rarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary' | 'artifact';
  description: string;
  damage?: string;
  armorClass?: number;
  healing?: number;
  value?: number;
  equipped?: boolean;
  spellId?: string;
  spellLevel?: number;
  properties?: string[];
  attackBonus?: number;
  pinned?: boolean;
  // Armor-specific properties

  stealthDisadvantage?: boolean;
  strengthRequirement?: number;
  // Stat bonuses for equipment
  acBonus?: number;  // Bonus to AC (rings, amulets)
  savingThrowBonus?: number;
  abilityBonus?: { ability: string; value: number };
  // Item effects (skill bonuses, etc.)
  effects?: ItemEffect[];
}

export interface CombatEnemy {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  maxHitPoints?: number; // Alias for maxHp (used in some contexts)
  armorClass: number;
  attackBonus: number;
  damage: string;
  damageType?: string;
  effectType?: 'fear' | 'charm' | 'poison' | 'magic';
  xpReward?: number;
  creatureType?: string;
  initiative: number;
  isDefeated: boolean;
  conditions: Condition[];
  actions?: {
    name: string;
    toHit: number;
    damage: string;
    description?: string;
    type?: string;
    reach?: string;
    range?: string;
    targets?: string;
    damageType?: string;
    save?: {
      ability: string;
      dc: number;
      onSave?: string;
      onFail?: string;
    };
  }[];
  conditionImmunities?: string[];
  damageImmunities?: string[];
  damageResistances?: string[];
  damageVulnerabilities?: string[];
  abilityScores?: Record<'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', number>;
  savingThrows?: Record<string, number>;
  savingThrowBonus?: number;
  traits?: string[];
  legendaryActions?: {
    name: string;
    cost: number;
    damage?: string;
    description?: string;
  }[];
  saveDC?: number;
  breathDC?: number;
  breathDamage?: string;
  breathType?: string;
  behavior?: 'aggressive' | 'cautious' | 'controller' | 'support';
  // Extended properties for stat blocks
  speed?: Record<string, number>;
  senses?: string[];
  languages?: string[];
  skills?: Record<string, number>;
  challenge?: number | string;
  size?: string;
  alignment?: string;
  statBlockSource?: string;
  statBlockHeading?: string;
}


export interface FeatureUses {
  // Core class features
  actionSurge: boolean;
  secondWind: boolean;
  bardicInspiration: number;
  rage: number;
  channelDivinity: number;
  layOnHands: number;
  luckPoints?: number;
  kiPoints: number;
  wildShape: number;
  sorceryPoints: number;

  // Fighter subclass features
  fightingSpirit: number; // Samurai - 3/long rest
  superiorityDice: number; // Battle Master - 4-6/short rest

  // Rogue subclass features
  masterDuelist: number; // Swashbuckler - 1/short rest

  // Wizard subclass features
  portentDice: number; // Divination - 2-3/long rest
  arcaneWardHp: number; // Abjuration - current ward HP
  illusorySelf: number; // Illusion - 1/short rest

  // Cleric subclass features
  wardingFlare: number; // Light - WIS/long rest
  wrathOfTheStorm: number; // Tempest - WIS/long rest

  // Paladin subclass features
  vowOfEnmity: number; // Vengeance - uses Channel Divinity

  // Druid subclass features
  spiritTotem: number; // Shepherd - 1/short rest

  // Sorcerer subclass features
  tidesOfChaos: number; // Wild Magic - 1/long rest
  favoredByTheGods: number; // Divine Soul - 1/short rest
  houndOfIllOmen: number; // Shadow Magic - sorcery point based

  // Warlock subclass features
  hexbladesCurse: number; // Hexblade - 1/short rest
  feyPresence: number; // Archfey - 1/short rest
  entropicWard: number; // Great Old One - 1/short rest
  healingLightDice: number; // Celestial - 1+level/long rest
  unbreakableMajesty: number; // Glamour Bard - 1/short rest

  // Barbarian subclass features
  spiritShield: number; // Ancestral Guardian - unlimited while raging
}

export interface CombatState {
  isActive: boolean;
  turn: number;
  currentTurnEntity: 'player' | string; // player or enemy id
  player: {
    hp: number;
    initiative: number;
  };
  enemies: CombatEnemy[];
  combatLog: CombatLogEntry[];
}

export type CombatLogEntryType =
  | 'attack' | 'damage' | 'heal' | 'miss' | 'defeat' | 'info' | 'xp' | 'levelup'
  | 'spell' | 'condition' | 'initiative' | 'warning';

export interface CombatLogEntry {
  id: string;
  message: string;
  type: CombatLogEntryType;
  timestamp: number;
  details?: string;
  source?: string;
  target?: string;
}

export interface Encounter {
  id: string;
  title: string;
  description: string;
  type: 'combat' | 'skill' | 'social' | 'exploration' | 'tutorial';
  autoStartCombat?: boolean;
  playerAdvantage?: boolean;
  repeatable?: boolean;
  tutorial?: {
    title: string;
    content: string;
    concept: string;
  };
  options: EncounterOption[];
  enemy?: {
    id?: string;
    enemyId?: string;
    name: string;
    armorClass: number;
    hitPoints: number;
    attackBonus: number;
    damage: string;
    xpReward?: number;
    damageType?: string;
  };
  skillCheck?: {
    skill: string;
    difficultyClass: number;
    ability: string;
    success: string;
    failure: string;
    rewardItemIds?: string[];
    xpReward?: number;
  };
  completed: boolean;
  xpReward?: number;
  // Spatial map position (optional - if not set, auto-layout is used)
  mapPosition?: {
    x: number;
    y: number;
  };
  questId?: string;
}

export interface EncounterOption {
  id: string;
  text: string;
  repeatText?: string;
  type: 'attack' | 'skill' | 'spell' | 'action' | 'continue';
  skill?: string;
  ability?: string;
  difficultyClass?: number;
  spell?: string;
  outcome: string;
  nextEncounterId?: string;
  requiresRace?: string;
  requiresClass?: string;
  requiresBackground?: string;
  successNextEncounterId?: string;
  failureNextEncounterId?: string;
  successOutcome?: string;
  failureOutcome?: string;
  stayInEncounter?: boolean;
  firstTimeEncounterId?: string;
  grantsItemIds?: string[];
  requiresVisitedEncounterId?: string;
  isExitOption?: boolean;
  xpReward?: number;
  endsAdventure?: boolean;
}

export interface Adventure {
  id: string;
  title: string;
  description: string;
  encounters: Encounter[];
  currentEncounterIndex: number;
  visitedEncounterIds?: string[];
}

export type QuestStatus = 'available' | 'active' | 'completed';

export interface QuestObjective {
  id: string;
  text: string;
  completed: boolean;
}

export type QuestCategory = 'main' | 'side';

export interface QuestEntry {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  category: QuestCategory;
  objectives: QuestObjective[];
  rewards?: string[];
}

export interface JournalEntry {
  id: string;
  title?: string;
  message: string;
  timestamp: number;
}
