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
        },
        {
            id: 'ancestral-guardian',
            classId: 'barbarian',
            name: 'Path of the Ancestral Guardian',
            description: 'Some barbarians hail from cultures that revere their ancestors. These tribes teach that the warriors of the past linger in the world as mighty spirits, who can guide and protect the living.',
            featuresByLevel: {
                3: ['Ancestral Protectors'],
                6: ['Spirit Shield'],
                10: ['Consult the Spirits'],
                14: ['Vengeful Ancestors']
            },
            features: [
                {
                    id: 'ancestral-protectors',
                    name: 'Ancestral Protectors',
                    level: 3,
                    description: 'While you are raging, the first creature you hit with an attack on your turn becomes the target of the warriors. Until the start of your next turn, that target has disadvantage on any attack roll that is not against you, and when the target hits a creature other than you with an attack, that creature has resistance to the damage dealt by the attack.',
                    type: 'passive',
                    metadata: { onHitDebuff: true }
                },
                {
                    id: 'spirit-shield',
                    name: 'Spirit Shield',
                    level: 6,
                    description: 'The guardian spirits that aid you can provide supernatural protection. If you are raging and another creature you can see within 30 feet of you takes damage, you can use your reaction to reduce that damage by 2d6.',
                    type: 'reaction'
                }
            ]
        },
        {
            id: 'storm-herald',
            classId: 'barbarian',
            name: 'Path of the Storm Herald',
            description: 'Barbarians who follow this path attract the primal magic of storms. When in a fury, these barbarians emanate powerful auras of destructive energy.',
            featuresByLevel: {
                3: ['Storm Aura'],
                6: ['Storm Soul'],
                10: ['Shielding Storm'],
                14: ['Raging Storm']
            },
            features: [
                {
                    id: 'storm-aura-desert',
                    name: 'Storm Aura (Desert)',
                    level: 3,
                    description: 'When you rage, you emanate a powerful aura in a 10-foot radius. Each creature of your choice in your aura when you enter your rage takes 2 fire damage. This damage increases when you reach certain levels in this class.',
                    type: 'passive',
                    metadata: { auraType: 'desert', damageType: 'fire', radius: 10 }
                },
                {
                    id: 'storm-aura-sea',
                    name: 'Storm Aura (Sea)',
                    level: 3,
                    description: 'When you rage, you can choose one other creature you can see in your aura. The target must make a Dexterity saving throw. The target takes 1d6 lightning damage on a failed save, or half as much damage on a successful one.',
                    type: 'bonus_action',
                    metadata: { auraType: 'sea', damageType: 'lightning', radius: 10 }
                },
                {
                    id: 'storm-aura-tundra',
                    name: 'Storm Aura (Tundra)',
                    level: 3,
                    description: 'When you rage, each creature of your choice in your aura gains 2 temporary hit points, as icy spirits grant them frost resistance.',
                    type: 'passive',
                    metadata: { auraType: 'tundra', damageType: 'cold', radius: 10 }
                }
            ]
        },
        {
            id: 'zealot',
            classId: 'barbarian',
            name: 'Path of the Zealot',
            description: 'Some deities inspire their followers to pitch themselves into a ferocious battle fury. These barbarians are zealots—warriors who channel their rage into powerful displays of divine power.',
            featuresByLevel: {
                3: ['Divine Fury', 'Warrior of the Gods'],
                6: ['Fanatical Focus'],
                10: ['Zealous Presence'],
                14: ['Rage Beyond Death']
            },
            features: [
                {
                    id: 'divine-fury',
                    name: 'Divine Fury',
                    level: 3,
                    description: 'While you are raging, the first creature you hit on each of your turns with a weapon attack takes extra damage equal to 1d6 + half your barbarian level. The extra damage is necrotic or radiant; you choose the type of damage when you gain this feature.',
                    type: 'passive',
                    metadata: { extraDamage: '1d6+half-level', damageType: 'radiant-or-necrotic' }
                },
                {
                    id: 'warrior-of-the-gods',
                    name: 'Warrior of the Gods',
                    level: 3,
                    description: 'If a spell, such as Raise Dead, has the sole effect of restoring you to life (but not undeath), the caster does not need material components to cast the spell on you.',
                    type: 'passive'
                },
                {
                    id: 'rage-beyond-death',
                    name: 'Rage Beyond Death',
                    level: 14,
                    description: 'While you are raging, having 0 hit points does not knock you unconscious. You still must make death saving throws, and you suffer the normal effects of taking damage while at 0 hit points. However, if you would die due to failing death saving throws, you do not die until your rage ends.',
                    type: 'passive'
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
        },
        {
            id: 'eldritch-knight',
            classId: 'fighter',
            name: 'Eldritch Knight',
            description: 'The archetypal Eldritch Knight combines the martial mastery common to all fighters with a careful study of magic. Eldritch Knights use magical techniques similar to those practiced by wizards.',
            featuresByLevel: {
                3: ['Spellcasting', 'Weapon Bond'],
                7: ['War Magic'],
                10: ['Eldritch Strike'],
                15: ['Arcane Charge'],
                18: ['Improved War Magic']
            },
            features: [
                {
                    id: 'weapon-bond',
                    name: 'Weapon Bond',
                    level: 3,
                    description: 'You learn a ritual that creates a magical bond between yourself and one weapon. You cannot be disarmed of that weapon unless you are incapacitated. If it is on the same plane of existence, you can summon that weapon as a bonus action on your turn, causing it to teleport instantly to your hand.',
                    type: 'bonus_action'
                },
                {
                    id: 'war-magic',
                    name: 'War Magic',
                    level: 7,
                    description: 'When you use your action to cast a cantrip, you can make one weapon attack as a bonus action.',
                    type: 'bonus_action'
                },
                {
                    id: 'eldritch-strike',
                    name: 'Eldritch Strike',
                    level: 10,
                    description: 'When you hit a creature with a weapon attack, that creature has disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'samurai',
            classId: 'fighter',
            name: 'Samurai',
            description: 'The Samurai is a fighter who draws on an implacable fighting spirit to overcome enemies. A Samurai\'s resolve is nearly unbreakable, and the enemies in a Samurai\'s path have two choices: yield or die fighting.',
            featuresByLevel: {
                3: ['Fighting Spirit', 'Bonus Proficiency'],
                7: ['Elegant Courtier'],
                10: ['Tireless Spirit'],
                15: ['Rapid Strike'],
                18: ['Strength Before Death']
            },
            features: [
                {
                    id: 'fighting-spirit',
                    name: 'Fighting Spirit',
                    level: 3,
                    description: 'As a bonus action on your turn, you can give yourself advantage on weapon attack rolls until the end of the current turn. When you do so, you also gain 5 temporary hit points. You can use this feature three times, and you regain all expended uses when you finish a long rest.',
                    type: 'bonus_action',
                    metadata: { uses: 3, recharge: 'long-rest', tempHP: 5 }
                },
                {
                    id: 'rapid-strike',
                    name: 'Rapid Strike',
                    level: 15,
                    description: 'If you take the Attack action on your turn and have advantage on an attack roll against one of the targets, you can forgo the advantage for that roll to make an additional weapon attack against that target, as part of the same action.',
                    type: 'passive'
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
        },
        {
            id: 'arcane-trickster',
            classId: 'rogue',
            name: 'Arcane Trickster',
            description: 'Some rogues enhance their fine-honed skills of stealth and agility with magic, learning tricks of enchantment and illusion. These rogues include pickpockets and burglars, but also pranksters, mischief-makers, and a significant number of adventurers.',
            featuresByLevel: {
                3: ['Spellcasting', 'Mage Hand Legerdemain'],
                9: ['Magical Ambush'],
                13: ['Versatile Trickster'],
                17: ['Spell Thief']
            },
            features: [
                {
                    id: 'mage-hand-legerdemain',
                    name: 'Mage Hand Legerdemain',
                    level: 3,
                    description: 'When you cast mage hand, you can make the spectral hand invisible, and you can perform additional tasks with it: stow or retrieve objects from containers, pick locks, and disarm traps at range.',
                    type: 'passive'
                },
                {
                    id: 'magical-ambush',
                    name: 'Magical Ambush',
                    level: 9,
                    description: 'If you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any saving throw it makes against the spell this turn.',
                    type: 'passive'
                },
                {
                    id: 'spell-thief',
                    name: 'Spell Thief',
                    level: 17,
                    description: 'You gain the ability to magically steal the knowledge of how to cast a spell from another spellcaster. When a creature casts a spell that targets you or includes you in its area of effect, you can use your reaction to force the creature to make a saving throw with its spellcasting ability modifier. On a failed save, you negate the spell\'s effect against you, and you steal the knowledge of the spell if it is at least 1st level and of a level you can cast. For the next 8 hours, you know the spell and can cast it using your spell slots.',
                    type: 'reaction'
                }
            ]
        },
        {
            id: 'scout',
            classId: 'rogue',
            name: 'Scout',
            description: 'You are skilled in stealth and surviving far from the streets of a city, allowing you to scout ahead of your companions during expeditions. Rogues who embrace this archetype are at home in the wilderness and among barbarians and rangers.',
            featuresByLevel: {
                3: ['Skirmisher', 'Survivalist'],
                9: ['Superior Mobility'],
                13: ['Ambush Master'],
                17: ['Sudden Strike']
            },
            features: [
                {
                    id: 'skirmisher',
                    name: 'Skirmisher',
                    level: 3,
                    description: 'You can move up to half your speed as a reaction when an enemy ends its turn within 5 feet of you. This movement doesn\'t provoke opportunity attacks.',
                    type: 'reaction'
                },
                {
                    id: 'survivalist',
                    name: 'Survivalist',
                    level: 3,
                    description: 'You gain proficiency in the Nature and Survival skills if you don\'t already have it. Your proficiency bonus is doubled for any ability check you make that uses either of those proficiencies.',
                    type: 'passive'
                },
                {
                    id: 'sudden-strike',
                    name: 'Sudden Strike',
                    level: 17,
                    description: 'If you take the Attack action on your turn, you can make one additional attack as a bonus action. This attack can benefit from your Sneak Attack even if you have already used it this turn, but only if the attack is against a different creature.',
                    type: 'bonus_action'
                }
            ]
        },
        {
            id: 'swashbuckler',
            classId: 'rogue',
            name: 'Swashbuckler',
            description: 'You focus your training on the art of the blade, relying on speed, elegance, and charm in equal parts. While some warriors are brutes clad in heavy armor, your method of fighting looks almost like a performance.',
            featuresByLevel: {
                3: ['Fancy Footwork', 'Rakish Audacity'],
                9: ['Panache'],
                13: ['Elegant Maneuver'],
                17: ['Master Duelist']
            },
            features: [
                {
                    id: 'fancy-footwork',
                    name: 'Fancy Footwork',
                    level: 3,
                    description: 'During your turn, if you make a melee attack against a creature, that creature can\'t make opportunity attacks against you for the rest of your turn.',
                    type: 'passive'
                },
                {
                    id: 'rakish-audacity',
                    name: 'Rakish Audacity',
                    level: 3,
                    description: 'You add your Charisma modifier to your initiative rolls. In addition, you don\'t need advantage on your attack roll to use your Sneak Attack if no creature other than your target is within 5 feet of you.',
                    type: 'passive',
                    metadata: { initiativeBonus: 'charisma', soloSneakAttack: true }
                },
                {
                    id: 'master-duelist',
                    name: 'Master Duelist',
                    level: 17,
                    description: 'If you miss with an attack roll, you can roll it again with advantage. Once you use this feature, you can\'t use it again until you finish a short or long rest.',
                    type: 'reaction',
                    metadata: { uses: 1, recharge: 'short-rest' }
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
        },
        {
            id: 'divination',
            classId: 'wizard',
            name: 'School of Divination',
            description: 'The counsel of a diviner is sought by royalty and commoners alike, for all seek a clearer understanding of the past, present, and future. As a diviner, you strive to part the veils of space, time, and consciousness so that you can see clearly.',
            featuresByLevel: {
                2: ['Divination Savant', 'Portent'],
                6: ['Expert Divination'],
                10: ['The Third Eye'],
                14: ['Greater Portent']
            },
            features: [
                {
                    id: 'portent',
                    name: 'Portent',
                    level: 2,
                    description: 'When you finish a long rest, roll two d20s and record the numbers rolled. You can replace any attack roll, saving throw, or ability check made by you or a creature that you can see with one of these foretelling rolls. You must choose to do so before the roll.',
                    type: 'reaction',
                    metadata: { portentDice: 2 }
                },
                {
                    id: 'greater-portent',
                    name: 'Greater Portent',
                    level: 14,
                    description: 'You roll three d20s for your Portent feature, rather than two.',
                    type: 'passive',
                    metadata: { portentDice: 3 }
                }
            ]
        },
        {
            id: 'necromancy',
            classId: 'wizard',
            name: 'School of Necromancy',
            description: 'The School of Necromancy explores the cosmic forces of life, death, and undeath. As you focus your studies in this tradition, you learn to manipulate the energy that animates all living things.',
            featuresByLevel: {
                2: ['Necromancy Savant', 'Grim Harvest'],
                6: ['Undead Thralls'],
                10: ['Inured to Undeath'],
                14: ['Command Undead']
            },
            features: [
                {
                    id: 'grim-harvest',
                    name: 'Grim Harvest',
                    level: 2,
                    description: 'Once per turn when you kill one or more creatures with a spell of 1st level or higher, you regain hit points equal to twice the spell\'s level, or three times its level if the spell belongs to the School of Necromancy. You don\'t gain this benefit for killing constructs or undead.',
                    type: 'passive'
                },
                {
                    id: 'undead-thralls',
                    name: 'Undead Thralls',
                    level: 6,
                    description: 'You add the Animate Dead spell to your spellbook if it is not there already. When you cast Animate Dead, you can target one additional corpse or pile of bones, creating another zombie or skeleton. Whenever you create an undead using a necromancy spell, it has additional benefits: its hit point maximum is increased by an amount equal to your wizard level, and it adds your proficiency bonus to its weapon damage rolls.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'illusion',
            classId: 'wizard',
            name: 'School of Illusion',
            description: 'You focus your studies on magic that dazzles the senses, befuddles the mind, and tricks even the wisest folk. Your magic is subtle, but the illusions crafted by your keen mind make the impossible seem real.',
            featuresByLevel: {
                2: ['Illusion Savant', 'Improved Minor Illusion'],
                6: ['Malleable Illusions'],
                10: ['Illusory Self'],
                14: ['Illusory Reality']
            },
            features: [
                {
                    id: 'improved-minor-illusion',
                    name: 'Improved Minor Illusion',
                    level: 2,
                    description: 'You learn the minor illusion cantrip. If you already know this cantrip, you learn a different wizard cantrip of your choice. When you cast minor illusion, you can create both a sound and an image with a single casting of the spell.',
                    type: 'passive'
                },
                {
                    id: 'malleable-illusions',
                    name: 'Malleable Illusions',
                    level: 6,
                    description: 'When you cast an illusion spell that has a duration of 1 minute or longer, you can use your action to change the nature of that illusion (using the spell\'s normal parameters for the illusion), provided that you can see the illusion.',
                    type: 'action'
                },
                {
                    id: 'illusory-self',
                    name: 'Illusory Self',
                    level: 10,
                    description: 'You can create an illusory duplicate of yourself as an instant, almost instinctual reaction to danger. When a creature makes an attack roll against you, you can use your reaction to interpose the illusory duplicate between the attacker and yourself. The attack automatically misses you, then the illusion dissipates.',
                    type: 'reaction',
                    metadata: { uses: 1, recharge: 'short-rest' }
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
        },
        {
            id: 'light',
            classId: 'cleric',
            name: 'Light Domain',
            description: 'Gods of light promote the ideals of rebirth and renewal, truth, vigilance, and beauty, often using the symbol of the sun. Some of these gods are portrayed as the sun itself or as a charioteer who guides the sun across the sky.',
            featuresByLevel: {
                1: ['Bonus Cantrip', 'Warding Flare'],
                2: ['Channel Divinity: Radiance of the Dawn'],
                6: ['Improved Flare'],
                8: ['Potent Spellcasting'],
                17: ['Corona of Light']
            },
            features: [
                {
                    id: 'warding-flare',
                    name: 'Warding Flare',
                    level: 1,
                    description: 'When you are attacked by a creature within 30 feet of you that you can see, you can use your reaction to impose disadvantage on the attack roll, causing light to flare before the attacker before it hits or misses. You can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a long rest.',
                    type: 'reaction',
                    metadata: { uses: 'wisdom', recharge: 'long-rest' }
                },
                {
                    id: 'radiance-of-the-dawn',
                    name: 'Radiance of the Dawn',
                    level: 2,
                    description: 'You can use your Channel Divinity to harness sunlight, banishing darkness and dealing radiant damage. As an action, you present your holy symbol, and any magical darkness within 30 feet of you is dispelled. Additionally, each hostile creature within 30 feet must make a Constitution saving throw. A creature takes radiant damage equal to 2d10 + your cleric level on a failed saving throw, and half as much damage on a successful one.',
                    type: 'action'
                }
            ]
        },
        {
            id: 'tempest',
            classId: 'cleric',
            name: 'Tempest Domain',
            description: 'Gods whose portfolios include the Tempest domain govern storms, sea, and sky. They include gods of lightning and thunder, gods of earthquakes, some fire gods, and certain gods of violence, physical strength, and courage.',
            featuresByLevel: {
                1: ['Bonus Proficiencies', 'Wrath of the Storm'],
                2: ['Channel Divinity: Destructive Wrath'],
                6: ['Thunderbolt Strike'],
                8: ['Divine Strike'],
                17: ['Stormborn']
            },
            features: [
                {
                    id: 'wrath-of-the-storm',
                    name: 'Wrath of the Storm',
                    level: 1,
                    description: 'When a creature within 5 feet of you that you can see hits you with an attack, you can use your reaction to cause the creature to make a Dexterity saving throw. The creature takes 2d8 lightning or thunder damage (your choice) on a failed saving throw, and half as much damage on a successful one. You can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a long rest.',
                    type: 'reaction',
                    metadata: { uses: 'wisdom', recharge: 'long-rest', damageType: 'lightning-or-thunder' }
                },
                {
                    id: 'destructive-wrath',
                    name: 'Destructive Wrath',
                    level: 2,
                    description: 'You can use your Channel Divinity to wield the power of the storm with unchecked ferocity. When you roll lightning or thunder damage, you can use your Channel Divinity to deal maximum damage, instead of rolling.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'knowledge',
            classId: 'cleric',
            name: 'Knowledge Domain',
            description: 'The gods of knowledge value learning and understanding above all. Some teach that knowledge is to be gathered and shared in libraries and universities, or promote the practical knowledge of craft and invention.',
            featuresByLevel: {
                1: ['Blessings of Knowledge'],
                2: ['Channel Divinity: Knowledge of the Ages'],
                6: ['Channel Divinity: Read Thoughts'],
                8: ['Potent Spellcasting'],
                17: ['Visions of the Past']
            },
            features: [
                {
                    id: 'blessings-of-knowledge',
                    name: 'Blessings of Knowledge',
                    level: 1,
                    description: 'You learn two languages of your choice. You also become proficient in your choice of two of the following skills: Arcana, History, Nature, or Religion. Your proficiency bonus is doubled for any ability check you make that uses either of those skills.',
                    type: 'passive',
                    metadata: { expertise: true, skills: ['arcana', 'history', 'nature', 'religion'] }
                },
                {
                    id: 'knowledge-of-the-ages',
                    name: 'Knowledge of the Ages',
                    level: 2,
                    description: 'You can use your Channel Divinity to tap into a divine well of knowledge. As an action, you choose one skill or tool. For 10 minutes, you have proficiency with the chosen skill or tool.',
                    type: 'action'
                }
            ]
        },
        {
            id: 'trickery',
            classId: 'cleric',
            name: 'Trickery Domain',
            description: 'Gods of trickery are mischief-makers and instigators who stand as a constant challenge to the accepted order among both gods and mortals. They are patrons of thieves, scoundrels, gamblers, rebels, and liberators.',
            featuresByLevel: {
                1: ['Blessing of the Trickster'],
                2: ['Channel Divinity: Invoke Duplicity'],
                6: ['Channel Divinity: Cloak of Shadows'],
                8: ['Divine Strike'],
                17: ['Improved Duplicity']
            },
            features: [
                {
                    id: 'blessing-of-the-trickster',
                    name: 'Blessing of the Trickster',
                    level: 1,
                    description: 'You can use your action to touch a willing creature other than yourself to give it advantage on Dexterity (Stealth) checks. This blessing lasts for 1 hour or until you use this feature again.',
                    type: 'action'
                },
                {
                    id: 'invoke-duplicity',
                    name: 'Invoke Duplicity',
                    level: 2,
                    description: 'You can use your Channel Divinity to create an illusory duplicate of yourself. As an action, you create a perfect illusion of yourself that lasts for 1 minute, or until you lose your concentration. The illusion appears in an unoccupied space that you can see within 30 feet of you. When you and your illusion are within 5 feet of a creature that can see the illusion, you have advantage on attack rolls against that creature.',
                    type: 'action'
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
        },
        {
            id: 'swords',
            classId: 'bard',
            name: 'College of Swords',
            description: 'Bards of the College of Swords are called blades, and they entertain through daring feats of weapon prowess. Blades perform stunts such as sword swallowing, knife throwing and juggling, and mock combats.',
            featuresByLevel: {
                3: ['Bonus Proficiencies', 'Fighting Style', 'Blade Flourish'],
                6: ['Extra Attack'],
                14: ['Master\'s Flourish']
            },
            features: [
                {
                    id: 'blade-flourish',
                    name: 'Blade Flourish',
                    level: 3,
                    description: 'You can make one additional attack as part of the Attack action on your turn. You can also use one of the following Blade Flourish options on that attack: Defensive Flourish (add the Bardic Inspiration die to AC until next turn), Slashing Flourish (deal damage to another creature within 5 feet), or Mobile Flourish (push the target away and follow with movement).',
                    type: 'action',
                    metadata: { usesBardicInspiration: true }
                },
                {
                    id: 'masters-flourish',
                    name: 'Master\'s Flourish',
                    level: 14,
                    description: 'Whenever you use a Blade Flourish option, you can roll a d6 and use it instead of expending a Bardic Inspiration die.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'glamour',
            classId: 'bard',
            name: 'College of Glamour',
            description: 'The College of Glamour is the home of bards who mastered their craft in the vibrant realm of the Feywild or under the tutelage of someone who dwelled there. Tutored by satyrs, eladrin, and other fey, these bards learn to use their magic to delight and captivate others.',
            featuresByLevel: {
                3: ['Mantle of Inspiration', 'Enthralling Performance'],
                6: ['Mantle of Majesty'],
                14: ['Unbreakable Majesty']
            },
            features: [
                {
                    id: 'mantle-of-inspiration',
                    name: 'Mantle of Inspiration',
                    level: 3,
                    description: 'As a bonus action, you can expend one use of your Bardic Inspiration to grant yourself a wondrous appearance. When you do so, choose a number of creatures you can see and that can see you within 60 feet of you, up to a number equal to your Charisma modifier (minimum of one). Each of them gains 5 temporary hit points and can immediately use its reaction to move up to its speed without provoking opportunity attacks.',
                    type: 'bonus_action',
                    metadata: { usesBardicInspiration: true }
                },
                {
                    id: 'unbreakable-majesty',
                    name: 'Unbreakable Majesty',
                    level: 14,
                    description: 'As a bonus action, you can assume a magically majestic presence for 1 minute or until you are incapacitated. For the duration, whenever any creature tries to attack you for the first time on a turn, the attacker must make a Charisma saving throw against your spell save DC. On a failed save, it can\'t attack you on this turn and must choose a new target for its attack. On successful save, it can attack you on this turn, but has disadvantage on any attack roll against you.',
                    type: 'bonus_action',
                    metadata: { uses: 1, recharge: 'short-rest' }
                }
            ]
        },
        {
            id: 'whispers',
            classId: 'bard',
            name: 'College of Whispers',
            description: 'Most folk are happy to welcome a bard into their midst. Bards of the College of Whispers use this to their advantage. They appear to be like other bards, sharing news, singing songs, and telling tales. In truth, the College of Whispers teaches its students that they are wolves among sheep.',
            featuresByLevel: {
                3: ['Psychic Blades', 'Words of Terror'],
                6: ['Mantle of Whispers'],
                14: ['Shadow Lore']
            },
            features: [
                {
                    id: 'psychic-blades',
                    name: 'Psychic Blades',
                    level: 3,
                    description: 'When you hit a creature with a weapon attack, you can expend one use of your Bardic Inspiration to deal an additional 2d6 psychic damage to that target. You can do so only once per round on your turn. The damage increases when you reach certain levels in this class: to 3d6 at 5th level, 5d6 at 10th level, and 8d6 at 15th level.',
                    type: 'passive',
                    metadata: { usesBardicInspiration: true, damageType: 'psychic' }
                },
                {
                    id: 'mantle-of-whispers',
                    name: 'Mantle of Whispers',
                    level: 6,
                    description: 'When a humanoid dies within 30 feet of you, you can magically capture its shadow using your reaction. You retain this shadow until you use it or you finish a long rest. You can use the shadow as an action. When you do so, it vanishes, magically transforming into a disguise that appears on you. You now look like the dead person, and your disguise is undetectable.',
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
        },
        {
            id: 'shepherd',
            classId: 'druid',
            name: 'Circle of the Shepherd',
            description: 'Druids of the Circle of the Shepherd commune with the spirits of nature, especially the spirits of beasts and the fey, and call to those spirits for aid. These druids recognize that all living things play a role in the natural world, yet they focus on protecting animals and fey creatures that have difficulty defending themselves.',
            featuresByLevel: {
                2: ['Speech of the Woods', 'Spirit Totem'],
                6: ['Mighty Summoner'],
                10: ['Guardian Spirit'],
                14: ['Faithful Summons']
            },
            features: [
                {
                    id: 'spirit-totem',
                    name: 'Spirit Totem',
                    level: 2,
                    description: 'As a bonus action, you can magically summon an incorporeal spirit to a point you can see within 60 feet of you. The spirit creates an aura in a 30-foot radius around that point. Choose Bear Spirit (temp HP to allies), Hawk Spirit (advantage on attacks), or Unicorn Spirit (healing boost). The spirit lasts for 1 minute.',
                    type: 'bonus_action',
                    metadata: { uses: 1, recharge: 'short-rest' }
                },
                {
                    id: 'mighty-summoner',
                    name: 'Mighty Summoner',
                    level: 6,
                    description: 'Beasts and fey that you conjure are more resilient than normal. Any beast or fey summoned or created by a spell that you cast gains extra hit points equal to 2 per Hit Die it has, and the damage from its natural weapons is considered magical.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'dreams',
            classId: 'druid',
            name: 'Circle of Dreams',
            description: 'Druids who are members of the Circle of Dreams hail from regions that have strong ties to the Feywild and its dreamlike realms. The druids\' guardianship of the natural world makes for a natural alliance between them and good-aligned fey.',
            featuresByLevel: {
                2: ['Balm of the Summer Court'],
                6: ['Hearth of Moonlight and Shadow'],
                10: ['Hidden Paths'],
                14: ['Walker in Dreams']
            },
            features: [
                {
                    id: 'balm-of-the-summer-court',
                    name: 'Balm of the Summer Court',
                    level: 2,
                    description: 'You have a pool of fey energy represented by a number of d6s equal to your druid level. As a bonus action, you can choose a creature you can see within 120 feet of you and spend a number of those dice equal to half your druid level or less. Roll the spent dice and add them together. The target regains a number of hit points equal to the total. The target also gains 1 temporary hit point per die spent.',
                    type: 'bonus_action'
                },
                {
                    id: 'hidden-paths',
                    name: 'Hidden Paths',
                    level: 10,
                    description: 'As a bonus action on your turn, you can teleport up to 60 feet to an unoccupied space you can see. Alternatively, you can use your action to teleport one willing creature you touch up to 30 feet to an unoccupied space you can see. You can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a long rest.',
                    type: 'bonus_action',
                    metadata: { uses: 'wisdom', recharge: 'long-rest' }
                }
            ]
        },
        {
            id: 'spores',
            classId: 'druid',
            name: 'Circle of Spores',
            description: 'Druids of the Circle of Spores find beauty in decay. They see in mold and other fungi the ability to transform lifeless material into abundant, albeit somewhat strange, life. These druids believe that life and death are parts of a grand cycle.',
            featuresByLevel: {
                2: ['Halo of Spores', 'Symbiotic Entity'],
                6: ['Fungal Infestation'],
                10: ['Spreading Spores'],
                14: ['Fungal Body']
            },
            features: [
                {
                    id: 'halo-of-spores',
                    name: 'Halo of Spores',
                    level: 2,
                    description: 'When a creature you can see moves into a space within 10 feet of you or starts its turn there, you can use your reaction to deal 1d4 necrotic damage to that creature unless it succeeds on a Constitution saving throw against your spell save DC. The necrotic damage increases to 1d6 at 6th level, 1d8 at 10th level, and 1d10 at 14th level.',
                    type: 'reaction',
                    metadata: { damageType: 'necrotic' }
                },
                {
                    id: 'symbiotic-entity',
                    name: 'Symbiotic Entity',
                    level: 2,
                    description: 'As an action, you can expend a use of your Wild Shape feature to awaken your spores, rather than transforming into a beast form. You gain 4 temporary hit points for each level you have in this class. While this feature is active, you gain the following benefits: When you deal your Halo of Spores damage, roll the damage die a second time and add it to the total. Your melee weapon attacks deal an extra 1d6 necrotic damage to any target they hit.',
                    type: 'action'
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
        },
        {
            id: 'four-elements',
            classId: 'monk',
            name: 'Way of the Four Elements',
            description: 'You follow a monastic tradition that teaches you to harness the elements. When you focus your ki, you can align yourself with the forces of creation and bend the four elements to your will, using them as an extension of your body.',
            featuresByLevel: {
                3: ['Disciple of the Elements'],
                6: ['Additional Elemental Discipline'],
                11: ['Additional Elemental Discipline'],
                17: ['Additional Elemental Discipline']
            },
            features: [
                {
                    id: 'elemental-attunement',
                    name: 'Elemental Attunement',
                    level: 3,
                    description: 'You can use your action to briefly control elemental forces within 30 feet of you, causing one of the following effects: Create a harmless sensory effect related to an element, instantly light or snuff out a small flame, chill or warm up to 1 pound of nonliving material, or cause earth, fire, water, or mist to form simple shapes for 1 minute.',
                    type: 'action'
                },
                {
                    id: 'fangs-of-the-fire-snake',
                    name: 'Fangs of the Fire Snake',
                    level: 3,
                    description: 'When you use the Attack action on your turn, you can spend 1 ki point to cause tendrils of flame to stretch out from your fists and feet. Your reach with your unarmed strikes increases by 10 feet for that action, as well as the rest of the turn. A hit with such an attack deals fire damage instead of bludgeoning damage, and if you spend 1 ki point when the attack hits, it also deals an extra 1d10 fire damage.',
                    type: 'action',
                    metadata: { damageType: 'fire', kiCost: 1 }
                }
            ]
        },
        {
            id: 'kensei',
            classId: 'monk',
            name: 'Way of the Kensei',
            description: 'Monks of the Way of the Kensei train relentlessly with their weapons, to the point where the weapon becomes an extension of the body. Founded on a mastery of sword fighting, the tradition has expanded to include many different weapons.',
            featuresByLevel: {
                3: ['Path of the Kensei'],
                6: ['One with the Blade'],
                11: ['Sharpen the Blade'],
                17: ['Unerring Accuracy']
            },
            features: [
                {
                    id: 'path-of-the-kensei',
                    name: 'Path of the Kensei',
                    level: 3,
                    description: 'You gain proficiency with your Kensei Weapons (choose 2 weapons without the heavy or special property). You can use Dexterity instead of Strength for the attack and damage rolls, and they count as monk weapons. When you make an unarmed strike as part of the Attack action and are holding a kensei weapon, you gain +2 AC until the start of your next turn.',
                    type: 'passive'
                },
                {
                    id: 'sharpen-the-blade',
                    name: 'Sharpen the Blade',
                    level: 11,
                    description: 'As a bonus action, you can expend up to 3 ki points to grant one kensei weapon you touch a bonus to attack and damage rolls equal to the number of ki points spent. This bonus lasts for 1 minute or until you use this feature again.',
                    type: 'bonus_action',
                    metadata: { kiCost: '1-3' }
                }
            ]
        },
        {
            id: 'drunken-master',
            classId: 'monk',
            name: 'Way of the Drunken Master',
            description: 'The Way of the Drunken Master teaches its students to move with the jerky, unpredictable movements of a drunkard. A drunken master\'s erratic stumbles conceal a carefully executed dance of blocks, parries, advances, attacks, and retreats.',
            featuresByLevel: {
                3: ['Bonus Proficiencies', 'Drunken Technique'],
                6: ['Tipsy Sway'],
                11: ['Drunkard\'s Luck'],
                17: ['Intoxicated Frenzy']
            },
            features: [
                {
                    id: 'drunken-technique',
                    name: 'Drunken Technique',
                    level: 3,
                    description: 'You gain proficiency in the Performance skill if you don\'t already have it. Your martial arts technique mixes combat training with the precision of a dancer and the antics of a jester. You gain the benefit of the Disengage action when you use Flurry of Blows, and your walking speed increases by 10 feet for that turn.',
                    type: 'passive'
                },
                {
                    id: 'drunkards-luck',
                    name: 'Drunkard\'s Luck',
                    level: 11,
                    description: 'When you make an ability check, an attack roll, or a saving throw and have disadvantage on the roll, you can spend 2 ki points to cancel the disadvantage for that roll.',
                    type: 'passive',
                    metadata: { kiCost: 2 }
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
        },
        {
            id: 'ancients',
            classId: 'paladin',
            name: 'Oath of the Ancients',
            description: 'The Oath of the Ancients is as old as the race of elves and the rituals of the druids. Sometimes called fey knights, green knights, or horned knights, paladins who swear this oath cast their lot with the side of the light in the cosmic struggle against darkness because they love the beautiful and life-giving things of the world.',
            featuresByLevel: {
                3: ['Channel Divinity: Nature\'s Wrath', 'Channel Divinity: Turn the Faithless'],
                7: ['Aura of Warding'],
                15: ['Undying Sentinel'],
                20: ['Elder Champion']
            },
            features: [
                {
                    id: 'natures-wrath',
                    name: 'Nature\'s Wrath',
                    level: 3,
                    description: 'You can use your Channel Divinity to invoke primeval forces to ensnare a foe. As an action, you can cause spectral vines to spring up and reach for a creature within 10 feet of you that you can see. The creature must succeed on a Strength or Dexterity saving throw (its choice) or be restrained.',
                    type: 'action'
                },
                {
                    id: 'aura-of-warding',
                    name: 'Aura of Warding',
                    level: 7,
                    description: 'You and friendly creatures within 10 feet of you have resistance to damage from spells.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'redemption',
            classId: 'paladin',
            name: 'Oath of Redemption',
            description: 'The Oath of Redemption sets a paladin on a difficult path, one that requires a holy warrior to use violence only as a last resort. Paladins who dedicate themselves to this oath believe that any person can be redeemed and that the path of benevolence and justice is one that anyone can walk.',
            featuresByLevel: {
                3: ['Channel Divinity: Emissary of Peace', 'Channel Divinity: Rebuke the Violent'],
                7: ['Aura of the Guardian'],
                15: ['Protective Spirit'],
                20: ['Emissary of Redemption']
            },
            features: [
                {
                    id: 'emissary-of-peace',
                    name: 'Emissary of Peace',
                    level: 3,
                    description: 'You can use your Channel Divinity to augment your presence with divine power. As a bonus action, you grant yourself a +5 bonus to Charisma (Persuasion) checks for the next 10 minutes.',
                    type: 'bonus_action'
                },
                {
                    id: 'rebuke-the-violent',
                    name: 'Rebuke the Violent',
                    level: 3,
                    description: 'You can use your Channel Divinity to rebuke those who use violence. When an attacker within 30 feet of you deals damage with an attack against a creature other than you, you can use your reaction to force the attacker to make a Wisdom saving throw. On a failed save, the attacker takes radiant damage equal to the damage it just dealt. On a successful save, it takes half as much damage.',
                    type: 'reaction'
                }
            ]
        },
        {
            id: 'conquest',
            classId: 'paladin',
            name: 'Oath of Conquest',
            description: 'The Oath of Conquest calls to paladins who seek glory in battle and the subjugation of their enemies. It isn\'t enough for these paladins to establish order. They must crush the forces of chaos. Sometimes called knight tyrants or iron mongers, those who swear this oath gather into grim orders.',
            featuresByLevel: {
                3: ['Channel Divinity: Conquering Presence', 'Channel Divinity: Guided Strike'],
                7: ['Aura of Conquest'],
                15: ['Scornful Rebuke'],
                20: ['Invincible Conqueror']
            },
            features: [
                {
                    id: 'conquering-presence',
                    name: 'Conquering Presence',
                    level: 3,
                    description: 'You can use your Channel Divinity to exude a terrifying presence. As an action, you force each creature of your choice that you can see within 30 feet of you to make a Wisdom saving throw. On a failed save, a creature becomes frightened of you for 1 minute. The frightened creature can repeat this saving throw at the end of each of its turns.',
                    type: 'action'
                },
                {
                    id: 'aura-of-conquest',
                    name: 'Aura of Conquest',
                    level: 7,
                    description: 'If a creature is frightened of you, its speed is reduced to 0 while in the aura, and that creature takes psychic damage equal to half your paladin level if it starts its turn there.',
                    type: 'passive'
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
        },
        {
            id: 'gloom-stalker',
            classId: 'ranger',
            name: 'Gloom Stalker',
            description: 'Gloom Stalkers are at home in the darkest places: deep under the earth, in gloomy alleyways, in primeval forests, and wherever else the light dims. Most folk enter such places with trepidation, but a Gloom Stalker ventures boldly into the darkness.',
            featuresByLevel: {
                3: ['Dread Ambusher', 'Umbral Sight'],
                7: ['Iron Mind'],
                11: ['Stalker\'s Flurry'],
                15: ['Shadowy Dodge']
            },
            features: [
                {
                    id: 'dread-ambusher',
                    name: 'Dread Ambusher',
                    level: 3,
                    description: 'At the start of your first turn of each combat, your walking speed increases by 10 feet, which lasts until the end of that turn. If you take the Attack action on that turn, you can make one additional weapon attack as part of that action. If that attack hits, the target takes an extra 1d8 damage of the weapon\'s damage type.',
                    type: 'passive',
                    metadata: { firstTurnBonus: true }
                },
                {
                    id: 'umbral-sight',
                    name: 'Umbral Sight',
                    level: 3,
                    description: 'You gain darkvision out to a range of 60 feet. If you already have darkvision from your race, its range increases by 30 feet. You are also adept at evading creatures that rely on darkvision. While in darkness, you are invisible to any creature that relies on darkvision to see you in that darkness.',
                    type: 'passive'
                },
                {
                    id: 'stalkers-flurry',
                    name: 'Stalker\'s Flurry',
                    level: 11,
                    description: 'Once on each of your turns when you miss with a weapon attack, you can make another weapon attack as part of the same action.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'horizon-walker',
            classId: 'ranger',
            name: 'Horizon Walker',
            description: 'Horizon Walkers guard the world against threats that originate from other planes or that seek to ravage the mortal realm with otherworldly magic. They seek out planar portals and keep watch over them.',
            featuresByLevel: {
                3: ['Detect Portal', 'Planar Warrior'],
                7: ['Ethereal Step'],
                11: ['Distant Strike'],
                15: ['Spectral Defense']
            },
            features: [
                {
                    id: 'planar-warrior',
                    name: 'Planar Warrior',
                    level: 3,
                    description: 'As a bonus action, you can choose one creature you can see within 30 feet of you. The next time you hit that creature on this turn with a weapon attack, all damage dealt by the attack becomes force damage, and the creature takes an extra 1d8 force damage from the attack. When you reach 11th level in this class, the extra damage increases to 2d8.',
                    type: 'bonus_action',
                    metadata: { damageType: 'force' }
                },
                {
                    id: 'distant-strike',
                    name: 'Distant Strike',
                    level: 11,
                    description: 'When you take the Attack action, you can teleport up to 10 feet before each attack to an unoccupied space you can see. If you attack at least two different creatures with the action, you can make one additional attack with it against a third creature.',
                    type: 'passive'
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
        },
        {
            id: 'shadow-magic',
            classId: 'sorcerer',
            name: 'Shadow Magic',
            description: 'You are a creature of shadow, for your innate magic comes from the Shadowfell itself. You might trace your lineage to an entity from that place, or perhaps you were exposed to its fell energy and transformed by it.',
            featuresByLevel: {
                1: ['Eyes of the Dark', 'Strength of the Grave'],
                6: ['Hound of Ill Omen'],
                14: ['Shadow Walk'],
                18: ['Umbral Form']
            },
            features: [
                {
                    id: 'eyes-of-the-dark',
                    name: 'Eyes of the Dark',
                    level: 1,
                    description: 'You have darkvision with a range of 120 feet. When you reach 3rd level in this class, you learn the darkness spell, which doesn\'t count against your number of sorcerer spells known. In addition, you can cast it by spending 2 sorcery points or by expending a spell slot. If you cast it with sorcery points, you can see through the darkness created by the spell.',
                    type: 'passive'
                },
                {
                    id: 'strength-of-the-grave',
                    name: 'Strength of the Grave',
                    level: 1,
                    description: 'When damage reduces you to 0 hit points, you can make a Charisma saving throw (DC 5 + the damage taken). On a success, you instead drop to 1 hit point. You can\'t use this feature if you are reduced to 0 hit points by radiant damage or by a critical hit.',
                    type: 'passive'
                },
                {
                    id: 'hound-of-ill-omen',
                    name: 'Hound of Ill Omen',
                    level: 6,
                    description: 'As a bonus action, you can spend 3 sorcery points to summon a hound of ill omen to target one creature you can see within 120 feet of you. The hound uses the dire wolf\'s statistics with some changes. The hound appears in an unoccupied space of your choice within 30 feet of the target. The target has disadvantage on saving throws against your spells while the hound is within 5 feet of it.',
                    type: 'bonus_action',
                    metadata: { sorceryPointCost: 3 }
                }
            ]
        },
        {
            id: 'divine-soul',
            classId: 'sorcerer',
            name: 'Divine Soul',
            description: 'Sometimes the spark of magic that fuels a sorcerer comes from a divine source that glimmers within the soul. Having such a blessed soul is a sign that your innate magic might come from a distant but powerful familial connection to a divine being.',
            featuresByLevel: {
                1: ['Divine Magic', 'Favored by the Gods'],
                6: ['Empowered Healing'],
                14: ['Otherworldly Wings'],
                18: ['Unearthly Recovery']
            },
            features: [
                {
                    id: 'divine-magic',
                    name: 'Divine Magic',
                    level: 1,
                    description: 'Your link to the divine allows you to learn spells from the cleric spell list. When your Spellcasting feature lets you learn a sorcerer cantrip or a sorcerer spell of 1st level or higher, you can choose the new spell from the cleric spell list or the sorcerer spell list. In addition, choose an affinity for the source of your divine power: Good (cure wounds), Evil (inflict wounds), Law (bless), Chaos (bane), or Neutrality (protection from evil and good). You learn that spell, which doesn\'t count against your number of sorcerer spells known.',
                    type: 'passive'
                },
                {
                    id: 'favored-by-the-gods',
                    name: 'Favored by the Gods',
                    level: 1,
                    description: 'If you fail a saving throw or miss with an attack roll, you can roll 2d4 and add it to the total, possibly changing the outcome. Once you use this feature, you can\'t use it again until you finish a short or long rest.',
                    type: 'reaction',
                    metadata: { uses: 1, recharge: 'short-rest' }
                },
                {
                    id: 'unearthly-recovery',
                    name: 'Unearthly Recovery',
                    level: 18,
                    description: 'As a bonus action when you have fewer than half of your hit points remaining, you can regain a number of hit points equal to half your hit point maximum. Once you use this feature, you can\'t use it again until you finish a long rest.',
                    type: 'bonus_action',
                    metadata: { uses: 1, recharge: 'long-rest' }
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
        },
        {
            id: 'great-old-one',
            classId: 'warlock',
            name: 'The Great Old One',
            description: 'Your patron is a mysterious entity whose nature is utterly foreign to the fabric of reality. It might come from the Far Realm, the space beyond reality, or it could be one of the elder gods known only in legends.',
            featuresByLevel: {
                1: ['Awakened Mind'],
                6: ['Entropic Ward'],
                10: ['Thought Shield'],
                14: ['Create Thrall']
            },
            features: [
                {
                    id: 'awakened-mind',
                    name: 'Awakened Mind',
                    level: 1,
                    description: 'Your alien knowledge gives you the ability to touch the minds of other creatures. You can telepathically speak to any creature you can see within 30 feet of you. You don\'t need to share a language with the creature for it to understand your telepathic utterances, but the creature must be able to understand at least one language.',
                    type: 'passive'
                },
                {
                    id: 'entropic-ward',
                    name: 'Entropic Ward',
                    level: 6,
                    description: 'When a creature makes an attack roll against you, you can use your reaction to impose disadvantage on that roll. If the attack misses you, your next attack roll against the creature has advantage if you make it before the end of your next turn. Once you use this feature, you can\'t use it again until you finish a short or long rest.',
                    type: 'reaction',
                    metadata: { uses: 1, recharge: 'short-rest' }
                }
            ]
        },
        {
            id: 'celestial',
            classId: 'warlock',
            name: 'The Celestial',
            description: 'Your patron is a powerful being of the Upper Planes. You have bound yourself to an ancient empyrean, solar, ki-rin, unicorn, or other entity that resides in the planes of everlasting bliss. Your pact with that being allows you to experience the barest touch of the holy light that illuminates the multiverse.',
            featuresByLevel: {
                1: ['Healing Light', 'Bonus Cantrips'],
                6: ['Radiant Soul'],
                10: ['Celestial Resilience'],
                14: ['Searing Vengeance']
            },
            features: [
                {
                    id: 'healing-light',
                    name: 'Healing Light',
                    level: 1,
                    description: 'You gain a pool of d6s that you spend to fuel this healing. The number of dice in the pool equals 1 + your warlock level. As a bonus action, you can heal one creature you can see within 60 feet of you, spending dice from the pool. The maximum number of dice you can spend at once equals your Charisma modifier (minimum of one die). Roll the dice you spend, add them together, and restore a number of hit points equal to the total.',
                    type: 'bonus_action'
                },
                {
                    id: 'radiant-soul',
                    name: 'Radiant Soul',
                    level: 6,
                    description: 'You have resistance to radiant damage, and when you cast a spell that deals radiant or fire damage, you can add your Charisma modifier to one radiant or fire damage roll of that spell against one of its targets.',
                    type: 'passive'
                }
            ]
        },
        {
            id: 'hexblade',
            classId: 'warlock',
            name: 'The Hexblade',
            description: 'You have made your pact with a mysterious entity from the Shadowfell—a force that manifests in sentient magic weapons carved from the stuff of shadow. The mighty sword Blackrazor is the most notable of these weapons, which have been spread across the multiverse over the ages.',
            featuresByLevel: {
                1: ['Hexblade\'s Curse', 'Hex Warrior'],
                6: ['Accursed Specter'],
                10: ['Armor of Hexes'],
                14: ['Master of Hexes']
            },
            features: [
                {
                    id: 'hexblades-curse',
                    name: 'Hexblade\'s Curse',
                    level: 1,
                    description: 'As a bonus action, choose one creature you can see within 30 feet of you. The target is cursed for 1 minute. The curse ends early if the target dies, you die, or you are incapacitated. Until the curse ends, you gain benefits: you gain a bonus to damage rolls against the cursed target equal to your proficiency bonus, any attack roll you make against the cursed target is a critical hit on a roll of 19 or 20, and if the cursed target dies, you regain hit points equal to your warlock level + your Charisma modifier.',
                    type: 'bonus_action',
                    metadata: { uses: 1, recharge: 'short-rest' }
                },
                {
                    id: 'hex-warrior',
                    name: 'Hex Warrior',
                    level: 1,
                    description: 'You gain proficiency with medium armor, shields, and martial weapons. Whenever you finish a long rest, you can touch one weapon that you are proficient with and that lacks the two-handed property. When you attack with that weapon, you can use your Charisma modifier, instead of Strength or Dexterity, for the attack and damage rolls.',
                    type: 'passive',
                    metadata: { charismaWeapon: true }
                },
                {
                    id: 'armor-of-hexes',
                    name: 'Armor of Hexes',
                    level: 10,
                    description: 'If the target cursed by your Hexblade\'s Curse hits you with an attack roll, you can use your reaction to roll a d6. On a 4 or higher, the attack instead misses you, regardless of its roll.',
                    type: 'reaction'
                }
            ]
        }
    ]
};
