/**
 * Combat ability tooltips for class actions, feat abilities, and combat maneuvers
 * Used to display helpful information in the combat UI
 */

export interface AbilityTooltip {
    name: string;
    description: string;
    actionType?: 'action' | 'bonus action' | 'reaction' | 'free action' | 'special';
    usesResource?: string;
}

export const classActionTooltips: Record<string, AbilityTooltip> = {
    // Fighter
    'second-wind': {
        name: 'Second Wind',
        description: 'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.',
        actionType: 'bonus action',
        usesResource: 'Once per short rest'
    },
    'action-surge': {
        name: 'Action Surge',
        description: 'You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action on top of your regular action and a possible bonus action. Once you use this feature, you must finish a short or long rest before you can use it again.',
        actionType: 'free action',
        usesResource: 'Once per short rest'
    },
    'fighting-spirit': {
        name: 'Fighting Spirit',
        description: 'As a bonus action, you can give yourself advantage on weapon attack rolls until the end of the current turn. When you do so, you also gain 5 temporary hit points. The temporary HP increases to 10 at 10th level and 15 at 15th level.',
        actionType: 'bonus action',
        usesResource: '3 uses per long rest'
    },

    // Barbarian
    'rage': {
        name: 'Rage',
        description: 'In battle, you fight with primal ferocity. On your turn, you can enter a rage as a bonus action. While raging, you gain advantage on Strength checks and saving throws, bonus damage on melee attacks using Strength, and resistance to bludgeoning, piercing, and slashing damage.',
        actionType: 'bonus action',
        usesResource: 'Uses per long rest (based on level)'
    },
    'reckless-attack': {
        name: 'Reckless Attack',
        description: 'You can throw aside all concern for defense to attack with fierce desperation. When you make your first attack on your turn, you can decide to attack recklessly. Doing so gives you advantage on melee weapon attack rolls using Strength during this turn, but attack rolls against you have advantage until your next turn.',
        actionType: 'special'
    },
    'frenzied-strike': {
        name: 'Frenzied Strike',
        description: 'You can go into a frenzy when you rage. If you do so, for the duration of your rage you can make a single melee weapon attack as a bonus action on each of your turns after this one. When your rage ends, you suffer one level of exhaustion.',
        actionType: 'bonus action',
        usesResource: 'While raging'
    },

    // Rogue
    'dash': {
        name: 'Cunning Action: Dash',
        description: 'Your quick thinking and agility allow you to move and act quickly. You can take the Dash action as a bonus action, doubling your movement speed for this turn.',
        actionType: 'bonus action'
    },
    'disengage': {
        name: 'Cunning Action: Disengage',
        description: 'Your quick thinking and agility allow you to move and act quickly. You can take the Disengage action as a bonus action, preventing opportunity attacks against you for the rest of the turn.',
        actionType: 'bonus action'
    },
    'hide': {
        name: 'Cunning Action: Hide',
        description: 'Your quick thinking and agility allow you to move and act quickly. You can take the Hide action as a bonus action, attempting to become hidden from enemies.',
        actionType: 'bonus action'
    },
    'uncanny-dodge': {
        name: 'Uncanny Dodge',
        description: 'When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack\'s damage against you.',
        actionType: 'reaction'
    },

    // Bard
    'bardic-inspiration': {
        name: 'Bardic Inspiration',
        description: 'You can inspire others through stirring words or music. As a bonus action, you can choose one creature other than yourself. That creature gains one Bardic Inspiration die (d6, increasing with level). Once within the next 10 minutes, the creature can roll the die and add the number rolled to one ability check, attack roll, or saving throw it makes.',
        actionType: 'bonus action',
        usesResource: 'Charisma modifier per long rest'
    },
    'cutting-words': {
        name: 'Cutting Words',
        description: 'You can use your wit to distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your reaction to expend one of your uses of Bardic Inspiration, rolling a Bardic Inspiration die and subtracting the number rolled from the creature\'s roll.',
        actionType: 'reaction',
        usesResource: 'Bardic Inspiration die'
    },

    // Paladin
    'lay-on-hands': {
        name: 'Lay on Hands',
        description: 'Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you take a long rest. With that pool, you can restore a total number of hit points equal to your paladin level × 5. As an action, you can touch a creature and draw power from the pool to restore a number of hit points to that creature, up to the maximum amount remaining in your pool.',
        actionType: 'action',
        usesResource: 'HP pool (level × 5)'
    },
    'divine-smite': {
        name: 'Divine Smite',
        description: 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target, in addition to the weapon\'s damage. The extra damage is 2d8 for a 1st-level spell slot, plus 1d8 for each spell level higher than 1st, to a maximum of 5d8. The damage increases by 1d8 if the target is an undead or a fiend.',
        actionType: 'special',
        usesResource: 'Spell slot'
    },
    'vow-of-enmity': {
        name: 'Vow of Enmity',
        description: 'As a bonus action, you can utter a vow of enmity against a creature you can see within 10 feet of you, using your Channel Divinity. You gain advantage on attack rolls against the creature for 1 minute or until it drops to 0 hit points or falls unconscious.',
        actionType: 'bonus action',
        usesResource: 'Channel Divinity'
    },

    // Monk
    'flurry-of-blows': {
        name: 'Flurry of Blows',
        description: 'Immediately after you take the Attack action on your turn, you can spend 1 ki point to make two unarmed strikes as a bonus action.',
        actionType: 'bonus action',
        usesResource: '1 Ki point'
    },
    'patient-defense': {
        name: 'Patient Defense',
        description: 'You can spend 1 ki point to take the Dodge action as a bonus action on your turn. Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker.',
        actionType: 'bonus action',
        usesResource: '1 Ki point'
    },
    'step-of-wind': {
        name: 'Step of the Wind',
        description: 'You can spend 1 ki point to take the Disengage or Dash action as a bonus action on your turn, and your jump distance is doubled for the turn.',
        actionType: 'bonus action',
        usesResource: '1 Ki point'
    },

    // Druid
    'wild-shape': {
        name: 'Wild Shape',
        description: 'You can use your action to magically assume the shape of a beast that you have seen before. You can use this feature twice. You regain expended uses when you finish a short or long rest. You can stay in a beast shape for a number of hours equal to half your druid level (rounded down).',
        actionType: 'action',
        usesResource: '2 per short rest'
    },

    // Sorcerer
    'empowered-spell': {
        name: 'Empowered Spell',
        description: 'When you roll damage for a spell, you can spend 1 sorcery point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls.',
        actionType: 'special',
        usesResource: '1 Sorcery point'
    },
    'quickened-spell': {
        name: 'Quickened Spell',
        description: 'When you cast a spell that has a casting time of 1 action, you can spend 2 sorcery points to change the casting time to 1 bonus action for this casting.',
        actionType: 'special',
        usesResource: '2 Sorcery points'
    },
    'create-slot': {
        name: 'Flexible Casting: Create Spell Slot',
        description: 'You can transform unexpended sorcery points into spell slots. Creating a 1st-level spell slot costs 2 sorcery points.',
        actionType: 'bonus action',
        usesResource: '2 Sorcery points'
    },

    // Cleric
    'turn-undead': {
        name: 'Channel Divinity: Turn Undead',
        description: 'As an action, you present your holy symbol and speak a prayer censuring the undead. Each undead that can see or hear you within 30 feet of you must make a Wisdom saving throw. If the creature fails its saving throw, it is turned for 1 minute or until it takes any damage.',
        actionType: 'action',
        usesResource: 'Channel Divinity'
    },
    'preserve-life': {
        name: 'Channel Divinity: Preserve Life',
        description: 'As an action, you present your holy symbol and evoke healing energy that can restore a number of hit points equal to five times your cleric level. Choose any creatures within 30 feet of you, and divide those hit points among them. This feature can restore a creature to no more than half of its hit point maximum.',
        actionType: 'action',
        usesResource: 'Channel Divinity'
    },

    // Ranger
    'favored-enemy': {
        name: 'Favored Enemy',
        description: 'You have significant experience studying, tracking, hunting, and even talking to a certain type of enemy. You have advantage on Wisdom (Survival) checks to track your favored enemies, as well as on Intelligence checks to recall information about them.',
        actionType: 'special'
    },

    // Wizard
    'arcane-recovery': {
        name: 'Arcane Recovery',
        description: 'You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your wizard level (rounded up).',
        actionType: 'special',
        usesResource: 'Once per short rest'
    },
    'portent': {
        name: 'Portent',
        description: 'When you finish a long rest, roll two d20s and record the numbers rolled. You can replace any attack roll, saving throw, or ability check made by you or a creature that you can see with one of these foretelling rolls. You must choose to do so before the roll.',
        actionType: 'special',
        usesResource: '2 dice per long rest'
    },

    // Warlock
    'hexblades-curse': {
        name: "Hexblade's Curse",
        description: 'As a bonus action, you can curse a creature you can see within 30 feet of you. The curse lasts for 1 minute. You gain a bonus to damage rolls against the cursed target equal to your proficiency bonus. Any attack roll you make against the cursed target is a critical hit on a roll of 19 or 20. If the cursed target dies, you regain hit points equal to your warlock level + Charisma modifier.',
        actionType: 'bonus action',
        usesResource: 'Once per short rest'
    },
    'healing-light': {
        name: 'Healing Light',
        description: 'As a bonus action, you can heal one creature you can see within 60 feet of you, spending dice from your pool of healing dice. The maximum number of dice you can spend at once equals your Charisma modifier (minimum of one die). Roll those dice and restore a number of hit points equal to the total.',
        actionType: 'bonus action',
        usesResource: '1 + Warlock level d6s per long rest'
    }
};

export const combatManeuverTooltips: Record<string, AbilityTooltip> = {
    'shove': {
        name: 'Shove',
        description: 'Using the Attack action, you make a Strength (Athletics) check contested by the target\'s Strength (Athletics) or Dexterity (Acrobatics) check. If you win, you either knock the target prone or push it 5 feet away from you.',
        actionType: 'action'
    },
    'grapple': {
        name: 'Grapple',
        description: 'Using the Attack action, you make a Strength (Athletics) check contested by the target\'s Strength (Athletics) or Dexterity (Acrobatics) check. If you win, the target is grappled (its speed becomes 0). The grappled creature can use its action to escape.',
        actionType: 'action'
    },
    'combat-hide': {
        name: 'Hide',
        description: 'When you take the Hide action, you make a Dexterity (Stealth) check in an attempt to hide, following the rules for hiding. If you succeed, you gain certain benefits.',
        actionType: 'action'
    }
};

export const featAbilityTooltips: Record<string, AbilityTooltip> = {
    'great-weapon-master-power': {
        name: 'Great Weapon Master: Power Attack',
        description: 'Before you make a melee attack with a heavy weapon, you can choose to take a -5 penalty to the attack roll. If the attack hits, you add +10 to the attack\'s damage.',
        actionType: 'special'
    },
    'sharpshooter-power': {
        name: 'Sharpshooter: Precision Strike',
        description: 'Before you make a ranged attack with a ranged weapon, you can choose to take a -5 penalty to the attack roll. If the attack hits, you add +10 to the attack\'s damage.',
        actionType: 'special'
    },
    'lucky': {
        name: 'Lucky',
        description: 'You have 3 luck points. Whenever you make an attack roll, ability check, or saving throw, you may spend one luck point to roll an additional d20 and choose which of the d20s to use.',
        actionType: 'special',
        usesResource: '3 per long rest'
    }
};

export const generalActionTooltips: Record<string, AbilityTooltip> = {
    'attack': {
        name: 'Attack',
        description: 'Make a melee or ranged weapon attack against an enemy. Roll d20 + attack modifier against the target\'s AC. On a hit, roll damage dice + modifier.',
        actionType: 'action'
    },
    'defend': {
        name: 'Dodge',
        description: 'Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage.',
        actionType: 'action'
    },
    'cast-spell': {
        name: 'Cast a Spell',
        description: 'Cast a spell from your spell list. Most spells require an action to cast, though some require a bonus action or reaction. Casting a leveled spell consumes a spell slot of the appropriate level.',
        actionType: 'action'
    },
    'use-item': {
        name: 'Use an Item',
        description: 'Interact with an object or use an item from your inventory, such as drinking a potion or applying oil to a weapon.',
        actionType: 'action'
    },
    'analyze': {
        name: 'Analyze Enemy',
        description: 'Study an enemy to learn about their strengths and weaknesses. Reveals information about the enemy\'s AC, hit points, resistances, vulnerabilities, and abilities.',
        actionType: 'action'
    },
    'speak': {
        name: 'Speak',
        description: 'Attempt to communicate with an enemy. Some creatures may be willing to negotiate, surrender, or provide information.',
        actionType: 'action'
    },
    'use-inspiration': {
        name: 'Use Bardic Inspiration',
        description: 'Add your Bardic Inspiration die to an attack roll, ability check, or saving throw. The die is consumed after use.',
        actionType: 'free action'
    },
    'breath-weapon': {
        name: 'Breath Weapon',
        description: 'As a dragonborn, you can use your action to exhale destructive energy. The damage type and area are determined by your draconic ancestry. Creatures in the area must make a saving throw or take damage.',
        actionType: 'action',
        usesResource: 'Once per short rest'
    },
    'off-hand-attack': {
        name: 'Off-Hand Attack',
        description: 'When you take the Attack action with a light melee weapon, you can use a bonus action to attack with a different light melee weapon in your other hand. You don\'t add your ability modifier to the damage of the bonus attack, unless that modifier is negative.',
        actionType: 'bonus action'
    }
};
