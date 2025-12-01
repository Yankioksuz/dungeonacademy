# D&D 5e Basic Rules v0.2 - Discrepancy Analysis

**Project:** Dungeon Academy  
**Analysis Date:** 2025-12-01  
**Reference:** D&D 5e Basic Rules v0.2 (2014)

---

## Executive Summary

This document compares the Dungeon Academy project's implementation against the official D&D 5e Basic Rules v0.2 to identify missing content, incomplete implementations, and discrepancies.

### Overall Coverage
- ✅ **Strong:** Character creation basics, core combat mechanics, spell system foundation
- ⚠️ **Partial:** Races, classes, spells, abilities, equipment
- ❌ **Missing:** Many core rules, conditions, advanced mechanics, DM tools

---

## 1. Character Races

### ✅ Implemented (5/9)
- Human
- Elf
- Dwarf
- Halfling
- Dragonborn

### ❌ Missing from Basic Rules (4/9)
- **Gnome** - Small, intelligent, inventive race
- **Half-Elf** - Versatile hybrid with Charisma bonus
- **Half-Orc** - Strong warriors with relentless endurance
- **Tiefling** - Infernal heritage, Charisma-based

### 📋 Race Implementation Issues

#### Incomplete Racial Traits
Your current races are missing detailed trait implementations:

1. **Human**
   - ✅ Has: +1 to all abilities
   - ❌ Missing: Specific language choices, skill proficiency selection

2. **Elf**
   - ✅ Has: +2 Dexterity, basic traits listed
   - ❌ Missing: Subraces (High Elf, Wood Elf), specific weapon proficiencies, cantrip for High Elf

3. **Dwarf**
   - ✅ Has: +2 Constitution, basic traits
   - ❌ Missing: Subraces (Hill Dwarf, Mountain Dwarf), tool proficiencies, specific ability bonuses

4. **Halfling**
   - ✅ Has: +2 Dexterity, basic traits
   - ❌ Missing: Subraces (Lightfoot, Stout), additional ability bonuses

5. **Dragonborn**
   - ✅ Has: +2 Strength, +1 Charisma
   - ❌ Missing: Specific dragon type selection, breath weapon mechanics, damage resistance implementation

---

## 2. Character Classes

### ✅ Implemented (5/12)
- Fighter
- Wizard
- Cleric
- Rogue
- Ranger

### ❌ Missing from Basic Rules (7/12)
- **Barbarian** - Rage-based melee warrior
- **Bard** - Charisma caster with support abilities
- **Druid** - Nature magic and wild shape
- **Monk** - Martial artist with ki powers
- **Paladin** - Holy warrior with smite abilities
- **Sorcerer** - Innate magic caster
- **Warlock** - Pact-based caster

### 📋 Class Implementation Issues

#### Missing Class Features

**Fighter:**
- ❌ Fighting Style selection (Defense, Dueling, Great Weapon Fighting, etc.)
- ❌ Martial Archetype (Champion, Battle Master, Eldritch Knight)
- ❌ Indomitable (reroll saving throw)

**Wizard:**
- ❌ Arcane Tradition (School of Evocation, etc.)
- ❌ Spell Mastery
- ❌ Signature Spells
- ⚠️ Arcane Recovery (listed but not implemented)

**Cleric:**
- ❌ Divine Domain selection (Life, Light, Trickery, etc.)
- ❌ Domain spells
- ❌ Destroy Undead
- ⚠️ Channel Divinity (listed but not fully implemented)

**Rogue:**
- ❌ Roguish Archetype (Thief, Assassin, Arcane Trickster)
- ❌ Uncanny Dodge
- ❌ Evasion
- ❌ Reliable Talent

**Ranger:**
- ❌ Ranger Archetype (Hunter, Beast Master)
- ❌ Primeval Awareness
- ❌ Land's Stride
- ❌ Hide in Plain Sight

---

## 3. Spells

### Current Implementation
You have **8 spells** implemented across all levels.

### Basic Rules Coverage
The Basic Rules includes **100+ spells** from cantrips to 9th level.

### ❌ Missing Spell Levels
- **Level 2:** No spells implemented
- **Level 4:** No spells implemented
- **Level 5:** No spells implemented
- **Level 6:** No spells implemented
- **Level 7:** No spells implemented
- **Level 8:** No spells implemented
- **Level 9:** No spells implemented

### 📋 Critical Missing Spells

#### Cantrips (0-level)
- Light
- Mage Hand
- Prestidigitation
- Ray of Frost
- Shocking Grasp
- Guidance
- Resistance
- Thaumaturgy

#### 1st Level
- Bless
- Command
- Guiding Bolt
- Inflict Wounds
- Mage Armor
- Sleep
- Thunderwave
- Burning Hands

#### 2nd Level
- Hold Person
- Invisibility
- Misty Step
- Scorching Ray
- Spiritual Weapon
- Suggestion

#### 3rd Level
- Counterspell
- Dispel Magic
- Haste
- Lightning Bolt
- Revivify
- Spirit Guardians

### ⚠️ Spell Mechanic Issues

Your current spells are missing:
- **Concentration mechanics** - No tracking of concentration
- **Ritual casting** - Detect Magic has ritual tag but no implementation
- **Area of effect** - No AoE mechanics for Fireball, Sacred Flame
- **Saving throw DCs** - Not calculated or displayed
- **Spell attack bonuses** - Not shown to player
- **Material components** - Listed but not enforced
- **Spell preparation** - Clerics/Druids should prepare spells daily

---

## 4. Core Game Mechanics

### ✅ Implemented
- Basic ability scores and modifiers
- Saving throws (concept)
- Skill checks with DCs
- Combat basics (turns, actions)
- Armor Class
- Hit points and damage

### ❌ Missing Core Mechanics

#### Advantage/Disadvantage
- No implementation of advantage/disadvantage system
- Critical for D&D 5e gameplay
- Affects attacks, saves, and ability checks

#### Proficiency Bonus
- Not clearly tracked or displayed
- Should scale with level: +2 (1-4), +3 (5-8), +4 (9-12), etc.

#### Skills System
- Only 6 rules implemented, but D&D has **18 skills**:
  - ❌ Acrobatics, Animal Handling, Arcana
  - ❌ Athletics, Deception, History
  - ❌ Insight, Intimidation, Investigation
  - ❌ Medicine, Nature, Perception
  - ❌ Performance, Persuasion, Religion
  - ❌ Sleight of Hand, Stealth, Survival

#### Conditions
- **0 of 14 conditions implemented**
- Blinded, Charmed, Deafened, Frightened
- Grappled, Incapacitated, Invisible, Paralyzed
- Petrified, Poisoned, Prone, Restrained
- Stunned, Unconscious

#### Death Saving Throws
- Mentioned in rules.json but not implemented
- Should track successes/failures
- Stabilization mechanics

---

## 5. Equipment & Items

### Current Implementation
- 3 weapons (Shortsword, Longsword, Quarterstaff)
- 2 armor pieces (Leather, Chain Mail)
- 2 healing potions
- 3 spell scrolls
- 7 treasure items

### ❌ Missing Equipment Categories

#### Weapons
Missing most weapon types:
- Simple Melee: Club, Dagger, Greatclub, Handaxe, Javelin, Mace, Sickle, Spear
- Simple Ranged: Light Crossbow, Dart, Shortbow, Sling
- Martial Melee: Battleaxe, Flail, Glaive, Greataxe, Greatsword, Halberd, Lance, Maul, Morningstar, Pike, Rapier, Scimitar, Trident, War Pick, Warhammer, Whip
- Martial Ranged: Blowgun, Hand Crossbow, Heavy Crossbow, Longbow

#### Armor
Missing armor types:
- Light: Padded, Studded Leather
- Medium: Hide, Chain Shirt, Scale Mail, Breastplate, Half Plate
- Heavy: Ring Mail, Splint, Plate
- Shields

#### Weapon Properties
Not implemented:
- Finesse, Heavy, Light, Loading
- Range, Reach, Thrown, Two-Handed
- Versatile, Ammunition

#### Adventuring Gear
Missing essential items:
- Backpack, Bedroll, Rope, Torches
- Rations, Waterskin, Tinderbox
- Thieves' Tools, Healer's Kit
- Spell Components, Holy Symbols

---

## 6. Combat System

### ✅ Implemented
- Turn-based combat
- Initiative
- Basic attack rolls
- Damage calculation
- HP tracking

### ❌ Missing Combat Mechanics

#### Actions in Combat
- **Dash** - Double movement
- **Disengage** - Move without opportunity attacks
- **Dodge** - Impose disadvantage on attacks
- **Help** - Give ally advantage
- **Hide** - Stealth in combat
- **Ready** - Prepare action with trigger
- **Search** - Look for something
- **Use Object** - Interact with items

#### Bonus Actions
- No bonus action system
- Critical for many class features

#### Reactions
- No reaction system
- Needed for opportunity attacks, Shield spell, etc.

#### Movement
- No movement tracking
- No difficult terrain
- No opportunity attacks

#### Critical Hits
- Not implemented
- Should deal double damage dice

#### Two-Weapon Fighting
- Not implemented
- Bonus action attack with offhand

#### Cover
- No cover mechanics
- Should provide AC bonus

---

## 7. Backgrounds

### ✅ Implemented (5/13)
- Acolyte
- Criminal
- Folk Hero
- Noble
- Sage

### ❌ Missing from Basic Rules (8/13)
- Charlatan
- Entertainer
- Guild Artisan
- Hermit
- Outlander
- Sailor
- Soldier
- Urchin

### 📋 Background Issues
- Skill proficiencies listed but not applied to character
- Languages not tracked
- Equipment not added to inventory
- Background features not implemented

---

## 8. Rest System

### Current Status
Your README mentions rest support, but implementation is limited.

### ❌ Missing Rest Mechanics

#### Short Rest
- No hit dice spending system
- No class feature restoration (Action Surge, etc.)
- No time tracking (1 hour requirement)

#### Long Rest
- ✅ Restores HP (mentioned)
- ✅ Restores spell slots (mentioned)
- ❌ Hit dice restoration (half of total)
- ❌ Once per 24 hours restriction
- ❌ Class feature restoration

---

## 9. Leveling & Progression

### ✅ Implemented
- XP tracking
- Level-up modal
- HP increase on level up

### ❌ Missing Progression Features

#### Ability Score Improvements
- Gained at levels 4, 8, 12, 16, 19
- Choice between +2 to one ability or +1 to two
- Alternative: Take a feat instead

#### Proficiency Bonus Scaling
- Should increase at levels 5, 9, 13, 17
- Affects attacks, saves, skills, spell DCs

#### Class Feature Progression
- Most class features at levels 2, 3, 5, 6, 7, etc. not implemented
- Subclass selection at level 3 missing

#### Spell Slot Progression
- Need full spell slot table for all levels
- Different for each spellcasting class

---

## 10. Advanced Mechanics

### ❌ Completely Missing

#### Multiclassing
- Combining levels from multiple classes
- Prerequisites and restrictions

#### Feats
- Optional rule for character customization
- 40+ feats in Basic Rules

#### Inspiration
- DM awards for good roleplay
- Advantage on one roll

#### Exhaustion
- 6 levels of exhaustion
- Penalties for each level

#### Encumbrance
- Carrying capacity based on Strength
- Movement penalties for heavy loads

---

## 11. Magic Items

### Current Implementation
- Basic items with gold value
- Spell scrolls

### ❌ Missing Magic Item System

#### Rarity System
- Common, Uncommon, Rare, Very Rare, Legendary

#### Attunement
- Some items require attunement
- Limited to 3 attuned items

#### Magic Item Types
- Magic weapons (+1, +2, +3)
- Magic armor
- Potions (various types)
- Rings, Wands, Staffs
- Wondrous items

#### Cursed Items
- Items with negative effects
- Can't be unequipped

---

## 12. DM Tools (Part 4 of Basic Rules)

### ❌ Completely Missing

The Basic Rules includes extensive DM content that could enhance your adventure creation:

#### Monster Manual Content
- 100+ monster stat blocks
- CR (Challenge Rating) system
- Monster abilities and traits

#### Building Encounters
- XP budgets for encounter difficulty
- Encounter multipliers for multiple enemies
- Difficulty thresholds (Easy, Medium, Hard, Deadly)

#### Magic Items
- 50+ magic items with descriptions
- Random treasure tables

#### Running the Game
- Rules for exploration
- Social interaction guidelines
- Environmental hazards

---

## 13. Appendices Content

### ❌ Missing Reference Material

#### Conditions (Appendix A)
- Full descriptions of all 14 conditions
- Mechanical effects

#### Gods of the Multiverse (Appendix B)
- Deity information for Clerics
- Domains and alignments

#### The Five Factions (Appendix C)
- Faction information for backgrounds
- Could enhance your reputation system

#### Planes of Existence (Appendix D)
- Cosmology information
- Potential for planar adventures

---

## Priority Recommendations

### 🔴 Critical (Implement First)

1. **Conditions System** - Essential for tactical combat
2. **Advantage/Disadvantage** - Core 5e mechanic
3. **Missing Races** (Gnome, Half-Elf, Half-Orc, Tiefling)
4. **Spell Expansion** - At least 20-30 more spells
5. **Skills System** - All 18 skills with proficiencies
6. **Rest System** - Short/long rest with hit dice

### 🟠 High Priority

7. **Missing Classes** (Barbarian, Bard, Paladin, Sorcerer)
8. **Class Features** - Subclasses and level progression
9. **Combat Actions** - Dash, Dodge, Help, etc.
10. **Equipment Expansion** - More weapons and armor
11. **Proficiency Bonus** - Proper tracking and scaling

### 🟡 Medium Priority

12. **Feats System**
13. **Magic Items** - Rarity and attunement
14. **Backgrounds** - Missing 8 backgrounds
15. **Ability Score Improvements**
16. **Critical Hits**

---

## Technical Debt

### Data Structure Issues

1. **Spell Data** - Missing fields:
   ```json
   {
     "areaOfEffect": "20-foot radius sphere",
     "saveDC": "calculated",
     "attackBonus": "calculated",
     "higherLevels": "detailed scaling"
   }
   ```

2. **Character Data** - Missing fields:
   ```json
   {
     "proficiencyBonus": 2,
     "skills": {
       "acrobatics": { "proficient": false, "expertise": false },
       // ... all 18 skills
     },
     "conditions": [],
     "hitDice": { "current": 3, "max": 3, "type": "d10" },
     "deathSaves": { "successes": 0, "failures": 0 }
   }
   ```

3. **Combat Data** - Missing:
   - Advantage/disadvantage tracking
   - Reaction system
   - Movement tracking
   - Cover calculation

---

## Conclusion

Your Dungeon Academy project has a solid foundation with character creation, basic combat, and adventure flow. However, it's missing approximately **60-70% of the D&D 5e Basic Rules content**.

### Coverage Breakdown
- **Character Creation:** ~40% complete
- **Core Mechanics:** ~30% complete
- **Combat System:** ~35% complete
- **Spells:** ~5% complete
- **Equipment:** ~10% complete
- **Advanced Rules:** ~5% complete
- **DM Tools:** ~0% complete

### Next Steps
1. Review the priority recommendations
2. Decide which features align with your educational goals
3. Consider implementing in phases (see `feature-recommendations.md`)
4. Focus on mechanics that enhance the learning experience

---

**Note:** This analysis is based on the D&D 5e Basic Rules v0.2 (2014). The full Player's Handbook contains even more content including additional spells, subclasses, and options.
