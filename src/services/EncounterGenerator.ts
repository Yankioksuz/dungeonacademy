import type {
    Encounter,
    EncounterOption,
    PlayerCharacter,
    Adventure,
    Item,
} from '@/types';
import itemsData from '@/content/items.json';

// ============================================================================
// UTILITIES
// ============================================================================

const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rollDice = (count: number, sides: number): number => {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
};

// ============================================================================
// LOOT TIERS
// ============================================================================

type LootTier = 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary';

const LOOT_POOLS: Record<LootTier, Item[]> = {
    common: [
        ...itemsData.potions.filter(i => (i.value ?? 0) <= 50),
        ...itemsData.weapons.filter(i => (i.value ?? 0) <= 15 && !i.rarity),
    ] as unknown as Item[],
    uncommon: [
        ...itemsData.potions.filter(i => (i.value ?? 0) > 50 && (i.value ?? 0) <= 200),
        ...itemsData.weapons.filter(i => (i.value ?? 0) > 15 && (i.value ?? 0) <= 100),
        ...itemsData.armor.filter(i => (i.value ?? 0) <= 100),
    ] as unknown as Item[],
    rare: [
        ...itemsData.weapons.filter(i => i.rarity === 'rare'),
        ...itemsData.armor.filter(i => i.rarity === 'rare' || (i.value ?? 0) > 100),
        ...itemsData.scrolls || [],
    ] as unknown as Item[],
    'very-rare': [
        ...itemsData.weapons.filter(i => i.rarity === 'very rare'),
        ...itemsData.armor.filter(i => i.rarity === 'very rare'),
    ] as unknown as Item[],
    legendary: [
        ...itemsData.weapons.filter(i => i.rarity === 'legendary'),
        ...itemsData.armor.filter(i => i.rarity === 'legendary'),
    ] as unknown as Item[],
};

const getLootTierForFloor = (floor: number): LootTier => {
    const roll = Math.random() * 100;
    if (floor >= 15) {
        if (roll < 20) return 'legendary';
        if (roll < 70) return 'very-rare';
        return 'rare';
    } else if (floor >= 10) {
        if (roll < 20) return 'very-rare';
        if (roll < 60) return 'rare';
        return 'uncommon';
    } else if (floor >= 5) {
        if (roll < 10) return 'rare';
        if (roll < 40) return 'uncommon';
        return 'common';
    } else {
        if (roll < 10) return 'uncommon';
        return 'common';
    }
};

const getRandomLoot = (floor: number): Item | null => {
    const tier = getLootTierForFloor(floor);
    const pool = LOOT_POOLS[tier];
    if (!pool || pool.length === 0) {
        // Fallback to potions
        return random(itemsData.potions as unknown as Item[]);
    }
    return random(pool);
};

// ============================================================================
// ENEMY TIERS BY FLOOR
// ============================================================================

interface EnemyTemplate {
    id: string;
    name: string;
    baseHp: number;
    armorClass: number;
    attackBonus: number;
    damage: string;
    baseXp: number;
    creatureType?: string;
}

const ENEMY_TIERS: Record<string, EnemyTemplate[]> = {
    tier1: [ // Floors 1-4
        { id: 'goblin', name: 'Goblin', baseHp: 7, armorClass: 15, attackBonus: 4, damage: '1d6+2', baseXp: 50 },
        { id: 'skeleton', name: 'Skeleton', baseHp: 13, armorClass: 13, attackBonus: 4, damage: '1d6+2', baseXp: 50, creatureType: 'undead' },
        { id: 'kobold', name: 'Kobold', baseHp: 5, armorClass: 12, attackBonus: 4, damage: '1d4+2', baseXp: 25 },
        { id: 'giant-rat', name: 'Giant Rat', baseHp: 7, armorClass: 12, attackBonus: 4, damage: '1d4+2', baseXp: 25 },
    ],
    tier2: [ // Floors 5-9
        { id: 'orc', name: 'Orc', baseHp: 15, armorClass: 13, attackBonus: 5, damage: '1d12+3', baseXp: 100 },
        { id: 'hobgoblin', name: 'Hobgoblin', baseHp: 11, armorClass: 18, attackBonus: 3, damage: '1d8+1', baseXp: 100 },
        { id: 'zombie', name: 'Zombie', baseHp: 22, armorClass: 8, attackBonus: 3, damage: '1d6+1', baseXp: 50, creatureType: 'undead' },
        { id: 'giant-spider', name: 'Giant Spider', baseHp: 26, armorClass: 14, attackBonus: 5, damage: '1d8+3', baseXp: 200 },
    ],
    tier3: [ // Floors 10-14
        { id: 'ghoul', name: 'Ghoul', baseHp: 22, armorClass: 12, attackBonus: 4, damage: '2d4+2', baseXp: 200, creatureType: 'undead' },
        { id: 'bugbear', name: 'Bugbear', baseHp: 27, armorClass: 16, attackBonus: 4, damage: '2d8+2', baseXp: 200 },
        { id: 'werewolf', name: 'Werewolf', baseHp: 58, armorClass: 12, attackBonus: 5, damage: '2d4+3', baseXp: 700 },
        { id: 'wight', name: 'Wight', baseHp: 45, armorClass: 14, attackBonus: 4, damage: '1d8+2', baseXp: 700, creatureType: 'undead' },
    ],
    tier4: [ // Floors 15-19
        { id: 'ogre', name: 'Ogre', baseHp: 59, armorClass: 11, attackBonus: 6, damage: '2d8+4', baseXp: 450 },
        { id: 'troll', name: 'Troll', baseHp: 84, armorClass: 15, attackBonus: 7, damage: '2d6+4', baseXp: 1800 },
        { id: 'wraith', name: 'Wraith', baseHp: 67, armorClass: 13, attackBonus: 6, damage: '3d8+3', baseXp: 1800, creatureType: 'undead' },
        { id: 'vampire-spawn', name: 'Vampire Spawn', baseHp: 82, armorClass: 15, attackBonus: 6, damage: '2d6+3', baseXp: 1800, creatureType: 'undead' },
    ],
    tier5: [ // Floors 20+
        { id: 'hill-giant', name: 'Hill Giant', baseHp: 105, armorClass: 13, attackBonus: 8, damage: '3d8+5', baseXp: 1800 },
        { id: 'young-dragon', name: 'Young Black Dragon', baseHp: 127, armorClass: 18, attackBonus: 7, damage: '2d10+4', baseXp: 2900, creatureType: 'dragon' },
        { id: 'mind-flayer', name: 'Mind Flayer', baseHp: 71, armorClass: 15, attackBonus: 7, damage: '2d10+4', baseXp: 2900 },
    ],
    boss: [ // Special boss enemies
        { id: 'ogre-boss', name: 'Ogre Chieftain', baseHp: 85, armorClass: 14, attackBonus: 8, damage: '2d10+5', baseXp: 1100 },
        { id: 'death-knight', name: 'Death Knight', baseHp: 120, armorClass: 18, attackBonus: 9, damage: '3d6+5', baseXp: 3000, creatureType: 'undead' },
        { id: 'beholder', name: 'Beholder', baseHp: 180, armorClass: 18, attackBonus: 10, damage: '4d6+4', baseXp: 10000 },
    ],
};

const getEnemyTier = (floor: number): string => {
    if (floor >= 20) return 'tier5';
    if (floor >= 15) return 'tier4';
    if (floor >= 10) return 'tier3';
    if (floor >= 5) return 'tier2';
    return 'tier1';
};

// ============================================================================
// ENCOUNTER TEMPLATES
// ============================================================================

// Exploration room templates
const EXPLORATION_TEMPLATES = [
    { title: 'Dusty Hallway', description: 'The air is stale and thick with dust. Cobwebs stretch across the ceiling.' },
    { title: 'Ancient Corridor', description: 'Water drips from the ceiling, forming small puddles on the uneven floor.' },
    { title: 'Stone Passage', description: 'Torches line the walls, flickering with an unnatural blue light.' },
    { title: 'Narrow Tunnel', description: 'The stone walls are carved with indecipherable runes that seem to shift when looked at directly.' },
    { title: 'Crumbling Chamber', description: 'Parts of the ceiling have collapsed. Rubble litters the floor.' },
    { title: 'Flooded Hall', description: 'Ankle-deep water covers the floor. Something moves beneath the surface.' },
    { title: 'Fungal Grotto', description: 'Glowing mushrooms provide an eerie light. Spores fill the air.' },
    { title: 'Bone-Strewn Room', description: 'Skeletal remains crunch underfoot. These adventurers were not as lucky.' },
];

// Combat room templates
const COMBAT_TEMPLATES = [
    { title: 'Guard Room', description: 'You stumble into a room occupied by hostile creatures!' },
    { title: 'Beast Den', description: 'Eyes glow in the darkness ahead. Prepare for battle!' },
    { title: 'Ambush Point', description: 'This chamber is being used as a lair. You are not welcome here.' },
    { title: 'Ritual Chamber', description: 'A group of enemies stands between you and the next exit.' },
    { title: 'Feeding Ground', description: 'Blood stains the floor. The creatures here are hungry.' },
    { title: 'Patrol Route', description: 'You\'ve walked into a patrol. They attack immediately!' },
];

// Trap templates
const TRAP_TEMPLATES = [
    {
        title: 'Poison Dart Corridor',
        description: 'Tiny holes line the walls. Pressure plates are barely visible on the floor.',
        trapType: 'darts',
        damage: '2d6',
        damageType: 'poison',
        saveAbility: 'Dexterity',
        dc: 13
    },
    {
        title: 'Pit Trap',
        description: 'The floor ahead looks unstable. A thin layer of dust hides something.',
        trapType: 'pit',
        damage: '2d6',
        damageType: 'bludgeoning',
        saveAbility: 'Dexterity',
        dc: 14
    },
    {
        title: 'Flame Jets',
        description: 'Scorch marks cover the walls. The smell of oil hangs in the air.',
        trapType: 'fire',
        damage: '3d6',
        damageType: 'fire',
        saveAbility: 'Dexterity',
        dc: 15
    },
    {
        title: 'Crushing Walls',
        description: 'The walls here are suspiciously close together. Gears click in the distance.',
        trapType: 'crushing',
        damage: '4d6',
        damageType: 'bludgeoning',
        saveAbility: 'Strength',
        dc: 15
    },
    {
        title: 'Arcane Runes',
        description: 'Glowing symbols cover the floor. Magic crackles in the air.',
        trapType: 'arcane',
        damage: '2d8',
        damageType: 'force',
        saveAbility: 'Intelligence',
        dc: 14
    },
];

// Shrine templates
const SHRINE_TEMPLATES = [
    { title: 'Healing Fountain', description: 'Crystal clear water bubbles from an ornate fountain. It radiates warmth.', shrineType: 'healing' },
    { title: 'Blessing Altar', description: 'An altar to a forgotten god still holds power. Gold offerings lie scattered.', shrineType: 'blessing' },
    { title: 'Dark Altar', description: 'This shrine promises power at a price. Blood stains the stone.', shrineType: 'dark' },
    { title: 'Forgotten Statue', description: 'A statue of an ancient hero stands here. Something glitters in its hands.', shrineType: 'fortune' },
];

// Puzzle templates  
const PUZZLE_TEMPLATES = [
    { title: 'Runic Lock', description: 'A heavy door is sealed with arcane runes. They need to be deciphered.', puzzleType: 'arcana', dc: 14 },
    { title: 'Riddle Door', description: 'A voice echoes through the chamber: "Answer my riddle to pass."', puzzleType: 'riddle', dc: 13 },
    { title: 'Pressure Plates', description: 'A grid of tiles covers the floor. Step wrong and you trigger something.', puzzleType: 'investigation', dc: 12 },
    { title: 'Ancient Mechanism', description: 'Gears and levers control this door. The mechanism is ancient but intact.', puzzleType: 'history', dc: 15 },
];

// Merchant templates
const MERCHANT_TEMPLATES = [
    { title: 'Wandering Trader', description: 'A hooded figure has set up a small stall. "Looking to buy or sell, friend?"' },
    { title: 'Goblin Merchant', description: 'A goblin with a cart full of goods eyes you warily. "No killing! I have wares!"' },
    { title: 'Ghostly Vendor', description: 'A spectral merchant hovers beside ethereal wares. "Coin is coin, living or dead."' },
];

// Rest templates
const REST_TEMPLATES = [
    { title: 'Hidden Alcove', description: 'A small alcove offers respite from the dungeon. It seems safe to rest here.' },
    { title: 'Abandoned Camp', description: 'Previous adventurers left supplies here. The fire pit is cold but usable.' },
    { title: 'Sacred Ground', description: 'This chamber feels peaceful. Monsters seem to avoid this place.' },
];

// Social encounter templates
const SOCIAL_TEMPLATES = [
    { title: 'Lost Adventurer', description: 'A wounded adventurer leans against the wall. They look desperate.' },
    { title: 'Mysterious Stranger', description: 'A cloaked figure studies you from the shadows. They don\'t seem hostile.' },
    { title: 'Trapped Spirit', description: 'A ghostly apparition floats in the center of the room, bound by chains.' },
    { title: 'Rival Party', description: 'Another group of adventurers has arrived. Their intentions are unclear.' },
];

// ============================================================================
// CHARACTER-SPECIFIC OPTIONS
// ============================================================================

const getClassSpecificOptions = (
    character: PlayerCharacter | null,
    encounterType: string,
    floor: number
): EncounterOption[] => {
    if (!character) return [];
    const className = character.class.name;
    const options: EncounterOption[] = [];
    const baseDC = 10 + Math.floor(floor / 3);

    switch (encounterType) {
        case 'trap':
            if (className === 'Rogue') {
                options.push({
                    id: 'rogue-disarm',
                    text: '[Rogue] Expertly disarm the trap',
                    type: 'skill',
                    skill: 'Sleight of Hand',
                    difficultyClass: Math.max(8, baseDC - 3),
                    ability: 'Dexterity',
                    outcome: 'You examine the trap mechanism.',
                    successOutcome: 'Your trained hands easily disable the mechanism. The way is clear.',
                    failureOutcome: 'You fumble and trigger the trap!',
                    xpReward: 25 + floor * 5,
                    requiresClass: 'Rogue',
                });
            }
            if (className === 'Ranger') {
                options.push({
                    id: 'ranger-spot',
                    text: '[Ranger] Spot the safe path',
                    type: 'skill',
                    skill: 'Survival',
                    difficultyClass: Math.max(8, baseDC - 2),
                    ability: 'Wisdom',
                    outcome: 'You study the trap\'s patterns.',
                    successOutcome: 'Your tracking skills reveal the safe route through.',
                    failureOutcome: 'You misread the signs and trigger the trap!',
                    xpReward: 20 + floor * 5,
                    requiresClass: 'Ranger',
                });
            }
            if (className === 'Wizard') {
                options.push({
                    id: 'wizard-counter',
                    text: '[Wizard] Counter the magical trigger',
                    type: 'skill',
                    skill: 'Arcana',
                    difficultyClass: baseDC,
                    ability: 'Intelligence',
                    outcome: 'You weave counterspell energies.',
                    successOutcome: 'The magical trigger fizzles harmlessly.',
                    failureOutcome: 'Your spell fails! The trap activates!',
                    xpReward: 25 + floor * 5,
                    requiresClass: 'Wizard',
                });
            }
            break;

        case 'shrine':
            if (className === 'Cleric' || className === 'Paladin') {
                options.push({
                    id: 'divine-prayer',
                    text: `[${className}] Offer a prayer to the shrine`,
                    type: 'continue',
                    outcome: 'Your divine connection resonates with the shrine. You feel blessed.',
                    xpReward: 30 + floor * 5,
                    requiresClass: className,
                    // This would grant healing or temp HP
                });
            }
            if (className === 'Warlock') {
                options.push({
                    id: 'warlock-bargain',
                    text: '[Warlock] Make a pact with the shrine\'s power',
                    type: 'continue',
                    outcome: 'Dark energy flows into you. Power at a price.',
                    xpReward: 40 + floor * 5,
                    requiresClass: 'Warlock',
                });
            }
            break;

        case 'puzzle':
            if (className === 'Wizard' || className === 'Sorcerer') {
                options.push({
                    id: 'arcane-solve',
                    text: `[${className}] Apply arcane knowledge`,
                    type: 'skill',
                    skill: 'Arcana',
                    difficultyClass: Math.max(8, baseDC - 3),
                    ability: 'Intelligence',
                    outcome: 'The magical nature of this puzzle is clear to you.',
                    successOutcome: 'Your arcane expertise easily solves the puzzle!',
                    failureOutcome: 'Even your magic can\'t crack this one.',
                    xpReward: 30 + floor * 5,
                    requiresClass: className,
                });
            }
            if (className === 'Bard') {
                options.push({
                    id: 'bard-lore',
                    text: '[Bard] Recall ancient lore about this puzzle',
                    type: 'skill',
                    skill: 'History',
                    difficultyClass: Math.max(8, baseDC - 2),
                    ability: 'Intelligence',
                    outcome: 'Something about this puzzle seems familiar...',
                    successOutcome: 'A song about this very puzzle! The answer is in the lyrics!',
                    failureOutcome: 'You can\'t quite remember the tale.',
                    xpReward: 25 + floor * 5,
                    requiresClass: 'Bard',
                });
            }
            break;

        case 'combat':
            if (className === 'Fighter' || className === 'Barbarian') {
                options.push({
                    id: 'tactical-advantage',
                    text: `[${className}] Assess tactical advantage`,
                    type: 'continue',
                    outcome: 'Your battle experience reveals the enemy\'s weakness.',
                    xpReward: 15,
                    requiresClass: className,
                });
            }
            break;

        case 'social':
            if (className === 'Bard') {
                options.push({
                    id: 'bard-charm',
                    text: '[Bard] Charm them with your wit',
                    type: 'skill',
                    skill: 'Persuasion',
                    difficultyClass: baseDC,
                    ability: 'Charisma',
                    outcome: 'You turn on the charm.',
                    successOutcome: 'They\'re completely won over by your charisma!',
                    failureOutcome: 'They seem unimpressed by your theatrics.',
                    xpReward: 25 + floor * 5,
                    requiresClass: 'Bard',
                });
            }
            break;
    }

    return options;
};

const getRaceSpecificOptions = (
    character: PlayerCharacter | null,
    encounterType: string,
    floor: number
): EncounterOption[] => {
    if (!character) return [];
    const raceName = character.race.name;
    const options: EncounterOption[] = [];
    const baseDC = 10 + Math.floor(floor / 3);

    switch (encounterType) {
        case 'trap':
            if (raceName === 'Dwarf') {
                options.push({
                    id: 'dwarf-stonework',
                    text: '[Dwarf] Recognize the stonework construction',
                    type: 'continue',
                    outcome: 'Your dwarven heritage reveals the trap\'s mechanism. You disable it safely.',
                    xpReward: 25 + floor * 5,
                    requiresRace: 'Dwarf',
                });
            }
            if (raceName === 'Dragonborn') {
                options.push({
                    id: 'dragonborn-resist',
                    text: '[Dragonborn] Brave the trap with draconic resilience',
                    type: 'continue',
                    outcome: 'Your draconic constitution lets you shrug off the trap\'s effects.',
                    xpReward: 20 + floor * 5,
                    requiresRace: 'Dragonborn',
                });
            }
            break;

        case 'exploration':
            if (raceName === 'Elf' || raceName === 'Half-Elf') {
                options.push({
                    id: 'elf-perception',
                    text: `[${raceName}] Use keen elven senses`,
                    type: 'skill',
                    skill: 'Perception',
                    difficultyClass: Math.max(8, baseDC - 3),
                    ability: 'Wisdom',
                    outcome: 'Your elven senses pierce the darkness.',
                    successOutcome: 'You spot hidden details others would miss!',
                    failureOutcome: 'Even your keen eyes find nothing.',
                    xpReward: 20 + floor * 5,
                    requiresRace: raceName,
                });
            }
            if (raceName === 'Halfling') {
                options.push({
                    id: 'halfling-lucky',
                    text: '[Halfling] Trust your luck',
                    type: 'continue',
                    outcome: 'Fortune favors the small! You stumble upon something valuable.',
                    xpReward: 25 + floor * 5,
                    requiresRace: 'Halfling',
                });
            }
            break;

        case 'shrine':
            if (raceName === 'Tiefling') {
                options.push({
                    id: 'tiefling-infernal',
                    text: '[Tiefling] Read the infernal inscriptions',
                    type: 'continue',
                    outcome: 'Your infernal heritage lets you understand the shrine\'s dark secrets.',
                    xpReward: 30 + floor * 5,
                    requiresRace: 'Tiefling',
                });
            }
            break;

        case 'social':
            if (raceName === 'Half-Orc') {
                options.push({
                    id: 'half-orc-intimidate',
                    text: '[Half-Orc] Intimidate with your presence',
                    type: 'skill',
                    skill: 'Intimidation',
                    difficultyClass: Math.max(8, baseDC - 3),
                    ability: 'Charisma',
                    outcome: 'You bare your tusks menacingly.',
                    successOutcome: 'They back down immediately!',
                    failureOutcome: 'They don\'t seem impressed.',
                    xpReward: 20 + floor * 5,
                    requiresRace: 'Half-Orc',
                });
            }
            if (raceName === 'Human') {
                options.push({
                    id: 'human-adaptable',
                    text: '[Human] Use your adaptable nature',
                    type: 'skill',
                    skill: 'Persuasion',
                    difficultyClass: baseDC,
                    ability: 'Charisma',
                    outcome: 'You try to find common ground.',
                    successOutcome: 'Your versatility wins them over!',
                    failureOutcome: 'They remain unconvinced.',
                    xpReward: 20 + floor * 5,
                    requiresRace: 'Human',
                });
            }
            break;
    }

    return options;
};

const getBackgroundSpecificOptions = (
    character: PlayerCharacter | null,
    encounterType: string,
    floor: number
): EncounterOption[] => {
    if (!character) return [];
    const bgName = character.background.name;
    const options: EncounterOption[] = [];
    const baseDC = 10 + Math.floor(floor / 3);

    switch (encounterType) {
        case 'trap':
            if (bgName === 'Criminal') {
                options.push({
                    id: 'criminal-bypass',
                    text: '[Criminal] You\'ve seen this trap before',
                    type: 'continue',
                    outcome: 'Your criminal experience includes bypassing traps like this.',
                    xpReward: 25 + floor * 5,
                    requiresBackground: 'Criminal',
                });
            }
            break;

        case 'exploration':
            if (bgName === 'Outlander') {
                options.push({
                    id: 'outlander-survive',
                    text: '[Outlander] Use survival instincts',
                    type: 'skill',
                    skill: 'Survival',
                    difficultyClass: Math.max(8, baseDC - 3),
                    ability: 'Wisdom',
                    outcome: 'You check for signs of danger.',
                    successOutcome: 'Your wilderness experience reveals hidden paths!',
                    failureOutcome: 'This dungeon is unlike the wilds you know.',
                    xpReward: 20 + floor * 5,
                    requiresBackground: 'Outlander',
                });
            }
            break;

        case 'puzzle':
            if (bgName === 'Sage') {
                options.push({
                    id: 'sage-knowledge',
                    text: '[Sage] Apply scholarly knowledge',
                    type: 'skill',
                    skill: 'History',
                    difficultyClass: Math.max(8, baseDC - 4),
                    ability: 'Intelligence',
                    outcome: 'You recall relevant texts.',
                    successOutcome: 'You\'ve read about this exact puzzle in ancient tomes!',
                    failureOutcome: 'Your memory fails you.',
                    xpReward: 30 + floor * 5,
                    requiresBackground: 'Sage',
                });
            }
            if (bgName === 'Acolyte') {
                options.push({
                    id: 'acolyte-ritual',
                    text: '[Acolyte] Recognize religious symbols',
                    type: 'skill',
                    skill: 'Religion',
                    difficultyClass: Math.max(8, baseDC - 3),
                    ability: 'Intelligence',
                    outcome: 'These symbols look familiar from your temple studies.',
                    successOutcome: 'You understand the divine puzzle!',
                    failureOutcome: 'These symbols are beyond your training.',
                    xpReward: 25 + floor * 5,
                    requiresBackground: 'Acolyte',
                });
            }
            break;

        case 'merchant':
            if (bgName === 'Noble') {
                options.push({
                    id: 'noble-discount',
                    text: '[Noble] Negotiate a noble\'s discount',
                    type: 'continue',
                    outcome: 'Your aristocratic bearing commands respect. Better prices!',
                    xpReward: 15,
                    requiresBackground: 'Noble',
                });
            }
            if (bgName === 'Guild Artisan') {
                options.push({
                    id: 'artisan-trade',
                    text: '[Guild Artisan] Offer your crafting expertise',
                    type: 'continue',
                    outcome: 'The merchant appreciates a fellow tradesperson. Special items available!',
                    xpReward: 20,
                    requiresBackground: 'Guild Artisan',
                });
            }
            break;

        case 'social':
            if (bgName === 'Entertainer') {
                options.push({
                    id: 'entertainer-perform',
                    text: '[Entertainer] Win them over with a performance',
                    type: 'skill',
                    skill: 'Performance',
                    difficultyClass: baseDC,
                    ability: 'Charisma',
                    outcome: 'You break into a performance.',
                    successOutcome: 'They\'re captivated by your show!',
                    failureOutcome: 'Tough crowd.',
                    xpReward: 25 + floor * 5,
                    requiresBackground: 'Entertainer',
                });
            }
            if (bgName === 'Folk Hero') {
                options.push({
                    id: 'folk-hero-inspire',
                    text: '[Folk Hero] Inspire them with tales of hope',
                    type: 'continue',
                    outcome: 'Your reputation as a hero of the people precedes you.',
                    xpReward: 20 + floor * 5,
                    requiresBackground: 'Folk Hero',
                });
            }
            if (bgName === 'Soldier') {
                options.push({
                    id: 'soldier-command',
                    text: '[Soldier] Command respect as a veteran',
                    type: 'skill',
                    skill: 'Intimidation',
                    difficultyClass: Math.max(8, baseDC - 2),
                    ability: 'Charisma',
                    outcome: 'Your military bearing is unmistakable.',
                    successOutcome: 'They recognize a seasoned warrior and stand down.',
                    failureOutcome: 'They don\'t seem intimidated.',
                    xpReward: 20 + floor * 5,
                    requiresBackground: 'Soldier',
                });
            }
            break;

        case 'rest':
            if (bgName === 'Hermit') {
                options.push({
                    id: 'hermit-meditate',
                    text: '[Hermit] Enter deep meditation',
                    type: 'continue',
                    outcome: 'Your practiced solitude allows for profound rest. Extra healing!',
                    xpReward: 15,
                    requiresBackground: 'Hermit',
                });
            }
            break;
    }

    return options;
};

// ============================================================================
// MAIN GENERATOR CLASS
// ============================================================================

export class EncounterGenerator {
    static generateNextRoom(adventure: Adventure, character: PlayerCharacter | null): Encounter {
        const floor = adventure.currentFloor || 1;
        const roomsOnFloor = adventure.roomsOnFloor || 0;
        const totalRooms = adventure.totalRoomsCleared || 0;

        // Determine encounter type
        const encounterType = this.determineEncounterType(floor, roomsOnFloor);

        // Generate unique ID
        const uniqueId = `endless-${floor}-${totalRooms}-${Date.now().toString(36)}`;

        // Generate encounter based on type
        let encounter: Encounter;

        switch (encounterType) {
            case 'combat':
                encounter = this.generateCombatEncounter(uniqueId, floor, character);
                break;
            case 'trap':
                encounter = this.generateTrapEncounter(uniqueId, floor, character);
                break;
            case 'puzzle':
                encounter = this.generatePuzzleEncounter(uniqueId, floor, character);
                break;
            case 'treasure':
                encounter = this.generateTreasureEncounter(uniqueId, floor, character);
                break;
            case 'shrine':
                encounter = this.generateShrineEncounter(uniqueId, floor, character);
                break;
            case 'merchant':
                encounter = this.generateMerchantEncounter(uniqueId, floor, character);
                break;
            case 'rest':
                encounter = this.generateRestEncounter(uniqueId, floor, character);
                break;
            case 'boss':
                encounter = this.generateBossEncounter(uniqueId, floor, character);
                break;
            case 'social':
                encounter = this.generateSocialEncounter(uniqueId, floor, character);
                break;
            default:
                encounter = this.generateExplorationEncounter(uniqueId, floor, character);
        }

        return encounter;
    }

    private static determineEncounterType(floor: number, roomsOnFloor: number): string {
        // Boss fight at every 5th floor (first room of that floor)
        if (roomsOnFloor === 0 && floor > 1 && floor % 5 === 0) {
            return 'boss';
        }

        // Guaranteed rest before boss floors
        if (roomsOnFloor === 4 && (floor + 1) % 5 === 0) {
            return 'rest';
        }

        // Random encounter type based on weighted probability
        const roll = Math.random() * 100;

        if (roll < 35) return 'combat';        // 35%
        if (roll < 55) return 'exploration';   // 20%
        if (roll < 65) return 'trap';          // 10%
        if (roll < 72) return 'social';        // 7%
        if (roll < 79) return 'puzzle';        // 7%
        if (roll < 86) return 'treasure';      // 7%
        if (roll < 93) return 'shrine';        // 7%
        if (roll < 97) return 'merchant';      // 4%
        return 'rest';                         // 3%
    }

    private static generateCombatEncounter(id: string, floor: number, character: PlayerCharacter | null): Encounter {
        const template = random(COMBAT_TEMPLATES);
        const tierName = getEnemyTier(floor);
        const enemyTemplate = random(ENEMY_TIERS[tierName]);

        // Scale enemy stats based on floor
        const scaledHp = Math.floor(enemyTemplate.baseHp * (1 + floor * 0.1));
        const scaledAttack = enemyTemplate.attackBonus + Math.floor(floor / 4);
        const scaledXp = Math.floor(enemyTemplate.baseXp * (1 + floor * 0.15));

        const options: EncounterOption[] = [
            {
                id: 'fight',
                text: 'Fight!',
                type: 'attack',
                outcome: 'You engage the enemy!',
                stayInEncounter: true,
            },
        ];

        // Add class-specific combat options
        options.push(...getClassSpecificOptions(character, 'combat', floor));

        return {
            id,
            title: template.title,
            description: `${template.description} A **${enemyTemplate.name}** blocks your path!`,
            type: 'combat',
            autoStartCombat: true,
            enemy: {
                id: enemyTemplate.id,
                name: enemyTemplate.name,
                hitPoints: scaledHp,
                armorClass: enemyTemplate.armorClass,
                attackBonus: scaledAttack,
                damage: enemyTemplate.damage,
                xpReward: scaledXp,
            },
            options,
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generateExplorationEncounter(id: string, floor: number, character: PlayerCharacter | null): Encounter {
        const template = random(EXPLORATION_TEMPLATES);
        const loot = getRandomLoot(floor);

        const options: EncounterOption[] = [
            {
                id: 'continue',
                text: 'Move forward',
                type: 'continue',
                outcome: 'You press on into the darkness...',
            },
            {
                id: 'search',
                text: 'Search the room',
                type: 'skill',
                skill: 'Investigation',
                ability: 'Intelligence',
                difficultyClass: 10 + Math.floor(floor / 2),
                outcome: 'You search the area carefully.',
                successOutcome: loot ? `You find a ${loot.name}!` : 'You find some loose coins.',
                failureOutcome: 'You find nothing of interest.',
                grantsItemIds: loot ? [loot.id] : undefined,
                xpReward: 10 + floor * 5,
                stayInEncounter: true,
            },
        ];

        // Add character-specific options
        options.push(...getClassSpecificOptions(character, 'exploration', floor));
        options.push(...getRaceSpecificOptions(character, 'exploration', floor));
        options.push(...getBackgroundSpecificOptions(character, 'exploration', floor));

        return {
            id,
            title: template.title,
            description: template.description,
            type: 'exploration',
            options,
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generateTrapEncounter(id: string, floor: number, character: PlayerCharacter | null): Encounter {
        const template = random(TRAP_TEMPLATES);

        const options: EncounterOption[] = [
            {
                id: 'avoid-trap',
                text: 'Carefully navigate around the trap',
                type: 'skill',
                skill: 'Acrobatics',
                ability: 'Dexterity',
                difficultyClass: template.dc + Math.floor(floor / 3),
                outcome: `You attempt to bypass the ${template.title.toLowerCase()}.`,
                successOutcome: 'You gracefully avoid the trap and continue safely.',
                failureOutcome: `The trap triggers! You take ${template.damage} ${template.damageType} damage.`,
                xpReward: 15 + floor * 5,
            },
            {
                id: 'force-through',
                text: 'Just run through it',
                type: 'continue',
                outcome: `You barrel through. The trap triggers, dealing ${template.damage} ${template.damageType} damage, but you make it through.`,
            },
        ];

        // Add character-specific trap options
        options.push(...getClassSpecificOptions(character, 'trap', floor));
        options.push(...getRaceSpecificOptions(character, 'trap', floor));
        options.push(...getBackgroundSpecificOptions(character, 'trap', floor));

        return {
            id,
            title: template.title,
            description: template.description,
            type: 'exploration',
            options,
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generatePuzzleEncounter(id: string, floor: number, character: PlayerCharacter | null): Encounter {
        const template = random(PUZZLE_TEMPLATES);
        const loot = getRandomLoot(floor);

        const skillMap: Record<string, string> = {
            arcana: 'Arcana',
            riddle: 'Investigation',
            investigation: 'Investigation',
            history: 'History',
        };

        const options: EncounterOption[] = [
            {
                id: 'solve-puzzle',
                text: `Attempt to solve the puzzle`,
                type: 'skill',
                skill: skillMap[template.puzzleType] || 'Investigation',
                ability: 'Intelligence',
                difficultyClass: template.dc + Math.floor(floor / 3),
                outcome: 'You study the puzzle intently.',
                successOutcome: loot ? `Success! The puzzle reveals a hidden ${loot.name}.` : 'Success! The way forward is revealed.',
                failureOutcome: 'The puzzle remains unsolved. You must find another way.',
                grantsItemIds: loot ? [loot.id] : undefined,
                xpReward: 25 + floor * 5,
            },
            {
                id: 'bypass-puzzle',
                text: 'Look for another way around',
                type: 'continue',
                outcome: 'You find a longer route that bypasses the puzzle entirely.',
            },
        ];

        // Add character-specific puzzle options
        options.push(...getClassSpecificOptions(character, 'puzzle', floor));
        options.push(...getBackgroundSpecificOptions(character, 'puzzle', floor));

        return {
            id,
            title: template.title,
            description: template.description,
            type: 'exploration',
            options,
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generateTreasureEncounter(id: string, floor: number, _character: PlayerCharacter | null): Encounter {
        const loot = getRandomLoot(floor);
        const goldAmount = rollDice(floor, 10) + (floor * 5);

        return {
            id,
            title: 'Treasure Vault',
            description: `You discover a hidden vault! Glittering gold and valuables are scattered about. ${loot ? `Among them, a ${loot.name} catches your eye.` : ''}`,
            type: 'exploration',
            options: [
                {
                    id: 'take-treasure',
                    text: 'Claim the treasure',
                    type: 'continue',
                    outcome: `You pocket ${goldAmount} gold pieces${loot ? ` and the ${loot.name}` : ''}.`,
                    grantsItemIds: loot ? [loot.id] : undefined,
                    xpReward: 20 + floor * 10,
                },
            ],
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generateShrineEncounter(id: string, floor: number, character: PlayerCharacter | null): Encounter {
        const template = random(SHRINE_TEMPLATES);

        const options: EncounterOption[] = [];

        switch (template.shrineType) {
            case 'healing':
                options.push({
                    id: 'drink-water',
                    text: 'Drink from the fountain',
                    type: 'continue',
                    outcome: 'The blessed waters restore your vitality. (Restore HP)',
                    xpReward: 15,
                });
                break;
            case 'blessing':
                options.push({
                    id: 'offer-gold',
                    text: 'Make an offering (10 gold)',
                    type: 'continue',
                    outcome: 'The altar accepts your offering. You feel protected. (Gain Temp HP)',
                    xpReward: 20,
                });
                break;
            case 'dark':
                options.push({
                    id: 'dark-pact',
                    text: 'Accept the power (Lose HP for bonus)',
                    type: 'continue',
                    outcome: 'Dark energy floods through you. Pain and power intertwine.',
                    xpReward: 30,
                });
                break;
            case 'fortune':
                options.push({
                    id: 'fortune-test',
                    text: 'Reach for the treasure',
                    type: 'skill',
                    skill: 'Investigation',
                    ability: 'Intelligence',
                    difficultyClass: 12 + Math.floor(floor / 2),
                    outcome: 'You examine the statue carefully.',
                    successOutcome: 'It was real! You claim the treasure.',
                    failureOutcome: 'It was an illusion. The treasure fades.',
                    xpReward: 25,
                });
                break;
        }

        options.push({
            id: 'leave-shrine',
            text: 'Leave the shrine alone',
            type: 'continue',
            outcome: 'You decide not to interfere with the shrine.',
        });

        // Add character-specific shrine options
        options.push(...getClassSpecificOptions(character, 'shrine', floor));
        options.push(...getRaceSpecificOptions(character, 'shrine', floor));

        return {
            id,
            title: template.title,
            description: template.description,
            type: 'social',
            options,
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generateMerchantEncounter(id: string, floor: number, character: PlayerCharacter | null): Encounter {
        const template = random(MERCHANT_TEMPLATES);

        const options: EncounterOption[] = [
            {
                id: 'browse-wares',
                text: 'Browse the merchant\'s wares',
                type: 'continue',
                outcome: 'You examine the goods on offer. (Opens Shop)',
                // In a full implementation, this would open the shop UI
            },
            {
                id: 'move-on',
                text: 'Just passing through',
                type: 'continue',
                outcome: 'The merchant shrugs as you continue on your way.',
            },
        ];

        // Add background-specific merchant options
        options.push(...getBackgroundSpecificOptions(character, 'merchant', floor));

        return {
            id,
            title: template.title,
            description: template.description,
            type: 'social',
            options,
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generateRestEncounter(id: string, floor: number, character: PlayerCharacter | null): Encounter {
        const template = random(REST_TEMPLATES);

        const options: EncounterOption[] = [
            {
                id: 'short-rest',
                text: 'Take a short rest',
                type: 'continue',
                outcome: 'You rest for an hour, spending hit dice to recover health.',
                xpReward: 10,
            },
            {
                id: 'continue-on',
                text: 'Press onward',
                type: 'continue',
                outcome: 'No time to rest. You continue deeper into the dungeon.',
            },
        ];

        // Add background-specific rest options
        options.push(...getBackgroundSpecificOptions(character, 'rest', floor));

        return {
            id,
            title: template.title,
            description: template.description,
            type: 'exploration',
            options,
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generateBossEncounter(id: string, floor: number, _character: PlayerCharacter | null): Encounter {
        const bossTemplate = random(ENEMY_TIERS.boss);

        // Scale boss stats significantly
        const scaledHp = Math.floor(bossTemplate.baseHp * (1 + floor * 0.2));
        const scaledAttack = bossTemplate.attackBonus + Math.floor(floor / 3);
        const scaledXp = Math.floor(bossTemplate.baseXp * (1.5 + floor * 0.1));

        return {
            id,
            title: `BOSS: ${bossTemplate.name}`,
            description: `**FLOOR ${floor} BOSS!** The ground trembles as ${bossTemplate.name} emerges from the shadows. This is the guardian of the depths.`,
            type: 'combat',
            autoStartCombat: true,
            enemy: {
                id: bossTemplate.id,
                name: bossTemplate.name,
                hitPoints: scaledHp,
                armorClass: bossTemplate.armorClass + 2,
                attackBonus: scaledAttack,
                damage: bossTemplate.damage,
                xpReward: scaledXp,
            },
            options: [
                {
                    id: 'fight-boss',
                    text: 'Face the boss!',
                    type: 'attack',
                    outcome: 'The battle for the floor begins!',
                    stayInEncounter: true,
                },
            ],
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }

    private static generateSocialEncounter(id: string, floor: number, character: PlayerCharacter | null): Encounter {
        const template = random(SOCIAL_TEMPLATES);

        const options: EncounterOption[] = [
            {
                id: 'approach',
                text: 'Approach cautiously',
                type: 'skill',
                skill: 'Persuasion',
                ability: 'Charisma',
                difficultyClass: 10 + Math.floor(floor / 2),
                outcome: 'You approach and try to communicate.',
                successOutcome: 'They seem friendly! They share information about dangers ahead.',
                failureOutcome: 'They\'re not interested in talking.',
                xpReward: 15 + floor * 3,
                stayInEncounter: true, // Stay so player can then choose to continue
            },
            {
                id: 'ignore',
                text: 'Ignore them and continue',
                type: 'continue',
                outcome: 'You give them a wide berth and continue on your way.',
            },
            {
                id: 'continue-deeper',
                text: 'Continue deeper into the dungeon',
                type: 'continue',
                outcome: 'You press onward into the darkness...',
            },
        ];

        // Add character-specific social options
        options.push(...getClassSpecificOptions(character, 'social', floor));
        options.push(...getRaceSpecificOptions(character, 'social', floor));
        options.push(...getBackgroundSpecificOptions(character, 'social', floor));

        return {
            id,
            title: template.title,
            description: template.description,
            type: 'social',
            options,
            completed: false,
            mapPosition: { x: 400, y: 300 + floor * 100 },
        };
    }
}
