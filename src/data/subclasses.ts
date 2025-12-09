import type { Subclass } from '../types';

export const SUBCLASSES: Record<string, Subclass[]> = {
    barbarian: [
        {
            id: 'berserker',
            classId: 'barbarian',
            name: 'Path of the Berserker',
            description: 'For some barbarians, rage is a means to an end—that end being violence. The Path of the Berserker is a path of untrammeled fury, slick with blood.',
            featuresByLevel: {
                3: ['Frenzy'],
                6: ['Mindless Rage'],
                10: ['Intimidating Presence'],
                14: ['Retaliation']
            },
            features: [
                {
                    id: 'frenzy',
                    name: 'Frenzy',
                    level: 3,
                    description: 'You can go into a frenzy when you rage. If you do so, for the duration of your rage you can make a single melee weapon attack as a bonus action on each of your turns after this one. When your rage ends, you suffer one level of exhaustion.',
                    type: 'bonus_action'
                },
                {
                    id: 'mindless-rage',
                    name: 'Mindless Rage',
                    level: 6,
                    description: 'You cannot be charmed or frightened while raging. If you are charmed or frightened when you enter your rage, the effect is suspended for the duration of the rage.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'totem-warrior',
            classId: 'barbarian',
            name: 'Path of the Totem Warrior',
            description: 'The Path of the Totem Warrior is a spiritual journey, as the barbarian accepts a spirit animal as a guide, protector, and inspiration.',
            featuresByLevel: {
                3: ['Totem Spirit (Bear)'],
                6: ['Aspect of the Beast (Bear)'],
                10: ['Spirit Walker'],
                14: ['Totemic Attunement (Bear)']
            },
            features: [
                {
                    id: 'totem-spirit-bear',
                    name: 'Totem Spirit (Bear)',
                    level: 3,
                    description: 'While raging, you have resistance to all damage except psychic damage.',
                    type: 'passive',
                    metadata: { resistance: 'all-except-psychic' }
                }
            ]
        }
    ],
    fighter: [
        {
            id: 'champion',
            classId: 'fighter',
            name: 'Champion',
            description: 'The archetypal Champion focuses on the development of raw physical power honed to deadly perfection.',
            featuresByLevel: {
                3: ['Improved Critical'],
                7: ['Remarkable Athlete'],
                10: ['Additional Fighting Style'],
                15: ['Superior Critical'],
                18: ['Survivor']
            },
            features: [
                {
                    id: 'improved-critical',
                    name: 'Improved Critical',
                    level: 3,
                    description: 'Your weapon attacks score a critical hit on a roll of 19 or 20.',
                    type: 'passive',
                    metadata: { critThreshold: 19 }
                }
            ]
        },
        {
            id: 'battle-master',
            classId: 'fighter',
            name: 'Battle Master',
            description: 'Those who emulate the archetypal Battle Master employ martial techniques passed down through generations.',
            featuresByLevel: {
                3: ['Combat Superiority', 'Student of War'],
                7: ['Know Your Enemy'],
                10: ['Improved Combat Superiority'],
                15: ['Relentless'],
                18: ['Improved Combat Superiority']
            },
            features: [
                {
                    id: 'combat-superiority',
                    name: 'Combat Superiority',
                    level: 3,
                    description: 'You gain a set of superiority dice that are fueled by special moves called maneuvers. You have 4 superiority dice, which are d8s.',
                    type: 'passive',
                    metadata: { resource: 'superiority-dice', max: 4, die: 'd8' }
                }
            ]
        }
    ],
    rogue: [
        {
            id: 'thief',
            classId: 'rogue',
            name: 'Thief',
            description: 'You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype.',
            featuresByLevel: {
                3: ['Fast Hands', 'Second-Story Work'],
                9: ['Supreme Sneak'],
                13: ['Use Magic Device'],
                17: ['Thief\'s Reflexes']
            },
            features: [
                {
                    id: 'fast-hands',
                    name: 'Fast Hands',
                    level: 3,
                    description: 'You can use the bonus action granted by your Cunning Action to make a Dexterity (Sleight of Hand) check, use your thieves\' tools to disarm a trap or open a lock, or take the Use an Object action.',
                    type: 'bonus_action'
                }
            ]
        },
        {
            id: 'assassin',
            classId: 'rogue',
            name: 'Assassin',
            description: 'You focus your training on the grim art of death. Those who adhere to this archetype are diverse: hired killers, spies, bounty hunters, and even specially anointed priests trained to exterminate the enemies of their deity.',
            featuresByLevel: {
                3: ['Assassinate', 'Bonus Proficiencies'],
                9: ['Infiltration Expertise'],
                13: ['Imposter'],
                17: ['Death Strike']
            },
            features: [
                {
                    id: 'assassinate',
                    name: 'Assassinate',
                    level: 3,
                    description: 'You have advantage on attack rolls against any creature that hasn\'t taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit.',
                    type: 'passive'
                }
            ]
        }
    ],
    wizard: [
        {
            id: 'evocation',
            classId: 'wizard',
            name: 'School of Evocation',
            description: 'You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and stinging acid.',
            featuresByLevel: {
                2: ['Evocation Savant', 'Sculpt Spells'],
                6: ['Potent Cantrip'],
                10: ['Empowered Evocation'],
                14: ['Overchannel']
            },
            features: [
                {
                    id: 'sculpt-spells',
                    name: 'Sculpt Spells',
                    level: 2,
                    description: 'You can create pockets of relative safety within the effects of your evocation spells. When you cast an evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 + the spell\'s level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'abjuration',
            classId: 'wizard',
            name: 'School of Abjuration',
            description: 'The School of Abjuration emphasizes magic that blocks, banishes, or protects. Detractors of this school say that its tradition is about denial, negation rather than positive assertion.',
            featuresByLevel: {
                2: ['Abjuration Savant', 'Arcane Ward'],
                6: ['Projected Ward'],
                10: ['Improved Abjuration'],
                14: ['Spell Resistance']
            },
            features: [
                {
                    id: 'arcane-ward',
                    name: 'Arcane Ward',
                    level: 2,
                    description: 'You can weave magic around yourself for protection. When you cast an abjuration spell of 1st level or higher, you can simultaneously use a strand of the spell\'s magic to create a magical ward on yourself that lasts until you finish a long rest. The ward has a hit point maximum equal to twice your wizard level + your Intelligence modifier.',
                    type: 'passive'
                }
            ]
        }
    ],
    cleric: [
        {
            id: 'life',
            classId: 'cleric',
            name: 'Life Domain',
            description: 'The Life domain focuses on the vibrant positive energy - one of the fundamental forces of the universe - that sustains all life. The gods of life promote vitality and health through healing the sick and wounded, caring for those in need, and driving away the forces of death and undeath.',
            featuresByLevel: {
                1: ['Bonus Proficiency', 'Disciple of Life'],
                2: ['Channel Divinity: Preserve Life'],
                6: ['Blessed Healer'],
                8: ['Divine Strike'],
                17: ['Supreme Healing']
            },
            features: [
                {
                    id: 'disciple-of-life',
                    name: 'Disciple of Life',
                    level: 1,
                    description: 'Whenever you use a spell of 1st level or higher to restore hit points to a creature, the creature regains additional hit points equal to 2 + the spell\'s level.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'war',
            classId: 'cleric',
            name: 'War Domain',
            description: 'War has many manifestations. It can make heroes of ordinary people. It can be desperate and horrifying, with acts of cruelty and cowardice eclipsing instances of excellence and courage.',
            featuresByLevel: {
                1: ['Bonus Proficiencies', 'War Priest'],
                2: ['Channel Divinity: Guided Strike'],
                6: ['Channel Divinity: War God\'s Blessing'],
                8: ['Divine Strike'],
                17: ['Avatar of Battle']
            },
            features: [
                {
                    id: 'war-priest',
                    name: 'War Priest',
                    level: 1,
                    description: 'When you use the Attack action, you can make one weapon attack as a bonus action. You can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest.',
                    type: 'bonus_action'
                }
            ]
        }
    ],
    bard: [
        {
            id: 'lore',
            classId: 'bard',
            name: 'College of Lore',
            description: 'Bards of the College of Lore know something about just about anything, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales.',
            featuresByLevel: {
                3: ['Bonus Proficiencies', 'Cutting Words'],
                6: ['Additional Magical Secrets'],
                14: ['Peerless Skill']
            },
            features: [
                {
                    id: 'cutting-words',
                    name: 'Cutting Words',
                    level: 3,
                    description: 'You can use your wit to distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your reaction to expend one of your uses of Bardic Inspiration, rolling a Bardic Inspiration die and subtracting the number rolled from the creature\'s roll.',
                    type: 'reaction'
                }
            ]
        },
        {
            id: 'valor',
            classId: 'bard',
            name: 'College of Valor',
            description: 'Bards of the College of Valor are daring skalds whose tales keep the memory of the great heroes of the past alive.',
            featuresByLevel: {
                3: ['Bonus Proficiencies', 'Combat Inspiration'],
                6: ['Extra Attack'],
                14: ['Battle Magic']
            },
            features: [
                {
                    id: 'combat-inspiration',
                    name: 'Combat Inspiration',
                    level: 3,
                    description: 'A creature that has a Bardic Inspiration die from you can roll that die and add the number rolled to a weapon damage roll it just made. Alternatively, when an attack roll is made against the creature, it can use its reaction to roll the Bardic Inspiration die and add the number rolled to its AC against that attack.',
                    type: 'reaction'
                }
            ]
        }
    ],
    druid: [
        {
            id: 'moon',
            classId: 'druid',
            name: 'Circle of the Moon',
            description: 'Druids of the Circle of the Moon are fierce guardians of the wilds. Their order gathers under the full moon to share news and trade warnings.',
            featuresByLevel: {
                2: ['Combat Wild Shape', 'Circle Forms'],
                6: ['Primal Strike'],
                10: ['Elemental Wild Shape'],
                14: ['Thousand Forms']
            },
            features: [
                {
                    id: 'combat-wild-shape',
                    name: 'Combat Wild Shape',
                    level: 2,
                    description: 'You gain the ability to use Wild Shape on your turn as a bonus action, rather than as an action. Additionally, while you are transformed by Wild Shape, you can use a bonus action to expend one spell slot to regain 1d8 hit points per level of the spell slot expended.',
                    type: 'bonus_action'
                }
            ]
        },
        {
            id: 'land',
            classId: 'druid',
            name: 'Circle of the Land',
            description: 'The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition.',
            featuresByLevel: {
                2: ['Bonus Cantrip', 'Natural Recovery'],
                6: ['Land\'s Stride'],
                10: ['Nature\'s Ward'],
                14: ['Nature\'s Sanctuary']
            },
            features: [
                {
                    id: 'natural-recovery',
                    name: 'Natural Recovery',
                    level: 2,
                    description: 'During a short rest, you choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your druid level (rounded up), and none of the slots can be 6th level or higher.',
                    type: 'passive'
                }
            ]
        }
    ],
    monk: [
        {
            id: 'open-hand',
            classId: 'monk',
            name: 'Way of the Open Hand',
            description: 'Monks of the Way of the Open Hand are the ultimate masters of martial arts combat, whether armed or unarmed. They learn techniques to push and trip their opponents, manipulate ki to heal damage to their bodies, and practice advanced meditation that can protect them from harm.',
            featuresByLevel: {
                3: ['Open Hand Technique'],
                6: ['Wholeness of Body'],
                11: ['Tranquility'],
                17: ['Quivering Palm']
            },
            features: [
                {
                    id: 'open-hand-technique',
                    name: 'Open Hand Technique',
                    level: 3,
                    description: 'Whenever you hit a creature with one of the attacks granted by your Flurry of Blows, you can impose one of the following effects on that target: It must succeed on a Dexterity saving throw or be knocked prone. It must make a Strength saving throw. If it fails, you can push it up to 15 feet away from you. It can\'t take reactions until the end of your next turn.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'shadow',
            classId: 'monk',
            name: 'Way of Shadow',
            description: 'Monks of the Way of Shadow follow a tradition that values stealth and subterfuge. These monks might be called ninjas or shadowdancers, and they serve as spies and assassins.',
            featuresByLevel: {
                3: ['Shadow Arts'],
                6: ['Shadow Step'],
                11: ['Cloak of Shadows'],
                17: ['Opportunist']
            },
            features: [
                {
                    id: 'shadow-arts',
                    name: 'Shadow Arts',
                    level: 3,
                    description: 'You can use your ki to duplicate the effects of certain spells. As an action, you can spend 2 ki points to cast Darkness, Darkvision, Pass Without Trace, or Silence, without providing material components.',
                    type: 'action'
                }
            ]
        }
    ],
    paladin: [
        {
            id: 'devotion',
            classId: 'paladin',
            name: 'Oath of Devotion',
            description: 'The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order. Sometimes called cavaliers, white knights, or holy warriors, these paladins meet the ideal of the knight in shining armor, acting with honor in pursuit of justice and the greater good.',
            featuresByLevel: {
                3: ['Channel Divinity: Sacred Weapon', 'Channel Divinity: Turn the Unholy'],
                7: ['Aura of Devotion'],
                15: ['Purity of Spirit'],
                20: ['Holy Nimbus']
            },
            features: [
                {
                    id: 'sacred-weapon',
                    name: 'Sacred Weapon',
                    level: 3,
                    description: 'As an action, you can imbue one weapon that you are holding with positive energy, using your Channel Divinity. For 1 minute, you add your Charisma modifier to attack rolls made with that weapon (with a minimum bonus of +1). The weapon also emits bright light in a 20-foot radius and dim light 20 feet beyond that.',
                    type: 'action'
                }
            ]
        },
        {
            id: 'vengeance',
            classId: 'paladin',
            name: 'Oath of Vengeance',
            description: 'The Oath of Vengeance is a solemn commitment to punish those who have committed a grievous sin. When evil forces slaughter helpless villagers, when an entire people turns against the will of the gods, when a thieves\' guild grows too violent, when a dragon rampages through the countryside—at times like these, paladins arise and swear an Oath of Vengeance to set right that which has gone wrong.',
            featuresByLevel: {
                3: ['Channel Divinity: Abjure Enemy', 'Channel Divinity: Vow of Enmity'],
                7: ['Relentless Avenger'],
                15: ['Soul of Vengeance'],
                20: ['Avenging Angel']
            },
            features: [
                {
                    id: 'vow-of-enmity',
                    name: 'Vow of Enmity',
                    level: 3,
                    description: 'As a bonus action, you can utter a vow of enmity against a creature you can see within 10 feet of you, using your Channel Divinity. You gain advantage on attack rolls against the creature for 1 minute or until it drops to 0 hit points or falls unconscious.',
                    type: 'bonus_action'
                }
            ]
        }
    ],
    ranger: [
        {
            id: 'hunter',
            classId: 'ranger',
            name: 'Hunter',
            description: 'Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness.',
            featuresByLevel: {
                3: ['Hunter\'s Prey'],
                7: ['Defensive Tactics'],
                11: ['Multiattack'],
                15: ['Superior Hunter\'s Defense']
            },
            features: [
                {
                    id: 'colossus-slayer',
                    name: 'Colossus Slayer',
                    level: 3,
                    description: 'Your tenacity can wear down the most potent foes. When you hit a creature with a weapon attack, the creature takes an extra 1d8 damage if it\'s below its hit point maximum. You can deal this extra damage only once per turn.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'beast-master',
            classId: 'ranger',
            name: 'Beast Master',
            description: 'The Beast Master archetype embodies a friendship between the civilized races and the beasts of the world. United in focus, beast and ranger work as one to fight the monstrous foes that threaten civilization and the wilderness alike.',
            featuresByLevel: {
                3: ['Ranger\'s Companion'],
                7: ['Exceptional Training'],
                11: ['Bestial Fury'],
                15: ['Share Spells']
            },
            features: [
                {
                    id: 'rangers-companion',
                    name: 'Ranger\'s Companion',
                    level: 3,
                    description: 'You gain a beast companion that accompanies you on your adventures and is trained to fight alongside you. Add your proficiency bonus to the beast\'s AC, attack rolls, and damage rolls, as well as to any saving throws and skills it is proficient in.',
                    type: 'passive',
                    metadata: { hasCompanion: true }
                }
            ]
        }
    ],
    sorcerer: [
        {
            id: 'draconic',
            classId: 'sorcerer',
            name: 'Draconic Bloodline',
            description: 'Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors. Most often, sorcerers with this origin trace their descent back to a mighty sorcerer of ancient times who made a bargain with a dragon or who might even have claimed a dragon parent.',
            featuresByLevel: {
                1: ['Draconic Resilience', 'Dragon Ancestor'],
                6: ['Elemental Affinity'],
                14: ['Dragon Wings'],
                18: ['Draconic Presence']
            },
            features: [
                {
                    id: 'draconic-resilience',
                    name: 'Draconic Resilience',
                    level: 1,
                    description: 'As magic flows through your body, it causes physical traits of your dragon ancestors to emerge. At 1st level, your hit point maximum increases by 1 and increases by 1 again whenever you gain a level in this class. Additionally, parts of your skin are covered by a thin sheen of dragon-like scales. When you aren\'t wearing armor, your AC equals 13 + your Dexterity modifier.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'wild-magic',
            classId: 'sorcerer',
            name: 'Wild Magic',
            description: 'Your innate magic comes from the wild forces of chaos that underlie the order of creation.',
            featuresByLevel: {
                1: ['Wild Magic Surge', 'Tides of Chaos'],
                6: ['Bend Luck'],
                14: ['Controlled Chaos'],
                18: ['Spell Bombardment']
            },
            features: [
                {
                    id: 'tides-of-chaos',
                    name: 'Tides of Chaos',
                    level: 1,
                    description: 'You can manipulate the forces of chance and chaos to gain advantage on one attack roll, ability check, or saving throw. Once you do so, you must finish a long rest before you can use this feature again.',
                    type: 'reaction'
                }
            ]
        }
    ],
    warlock: [
        {
            id: 'fiend',
            classId: 'warlock',
            name: 'The Fiend',
            description: 'You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil, even if you strive against those aims. Such beings desire the corruption or destruction of all things, intimately including you.',
            featuresByLevel: {
                1: ['Dark One\'s Blessing'],
                6: ['Dark One\'s Own Luck'],
                10: ['Fiendish Resilience'],
                14: ['Hurl Through Hell']
            },
            features: [
                {
                    id: 'dark-ones-blessing',
                    name: 'Dark One\'s Blessing',
                    level: 1,
                    description: 'Starting at 1st level, when you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level (minimum of 1).',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'archfey',
            classId: 'warlock',
            name: 'The Archfey',
            description: 'Your patron is a lord or lady of the fey, a creature of legend who holds secrets that were forgotten before the mortal races were born. This being\'s motivations are often inscrutable, and sometimes whimsical, and might involve a striving for greater magical power or the settling of age-old grudges.',
            featuresByLevel: {
                1: ['Fey Presence'],
                6: ['Misty Escape'],
                10: ['Beguiling Defenses'],
                14: ['Dark Delirium']
            },
            features: [
                {
                    id: 'fey-presence',
                    name: 'Fey Presence',
                    level: 1,
                    description: 'Starting at 1st level, your patron bestows upon you the ability to project the beguiling and fearsome presence of the fey. As an action, you can cause each creature in a 10-foot cube originating from you to make a Wisdom saving throw against your warlock spell save DC. The creatures that fail their saving throws are all charmed or frightened by you (your choice) until the end of your next turn.',
                    type: 'action'
                }
            ]
        }
    ]
};
