---
description: How to create a new adventure with full race/class/background coverage
---

# Adventure Creation Workflow

This workflow guides the creation of new adventures for the D&D game, ensuring proper structure, complete coverage for all player options, and validation.

## 1. Adventure Planning

### 1.1 Define Core Concept
- **Title**: Unique, evocative name
- **Theme**: Gothic horror, wilderness survival, political intrigue, dungeon crawl, etc.
- **Story Arc**: Beginning hook → Rising tension → Climax → Resolution
- **Estimated Length**: 15-45 encounters

### 1.2 Create Adventure File
Location: `src/content/adventure-[name].json`

Basic structure:
```json
{
    "id": "adventure-id",
    "title": "Adventure Title",
    "description": "Brief description for adventure selection screen.",
    "encounters": []
}
```

## 2. Encounter Structure

### 2.1 Encounter Types
- `exploration` - Discovery, investigation, travel
- `social` - NPC dialogue, negotiations
- `combat` - Direct combat encounters
- `skill` - Skill check challenges
- `ending` - Adventure conclusions

### 2.2 Required Encounter Properties
```json
{
    "id": "unique-encounter-id",
    "title": "Display Title",
    "description": "Narrative description shown to player.",
    "type": "exploration|social|combat|skill|ending",
    "mapPosition": { "x": 100, "y": 300 },
    "options": [],
    "completed": false
}
```

### 2.3 Hub Encounters
For adventures with branching paths, create hub encounters with `"repeatable": true`:
```json
{
    "id": "hub-name-hub",
    "repeatable": true,
    ...
}
```

### 2.4 Map Positions
- Start encounters at x: 100
- Progress left to right (increasing x)
- Use y-axis (100-600) for branching paths
- Keep related encounters at similar x values

## 3. Dialog Options

### 3.1 Standard Option Structure
```json
{
    "id": "option-id",
    "text": "Text shown to player",
    "type": "continue|skill|attack",
    "outcome": "Result narrative",
    "nextEncounterId": "next-encounter"
}
```

### 3.2 Skill Check Options
```json
{
    "id": "skill-option",
    "text": "[Skill] Description",
    "type": "skill",
    "skill": "Stealth",
    "ability": "Dexterity",
    "difficultyClass": 14,
    "successOutcome": "Success text",
    "failureOutcome": "Failure text",
    "successNextEncounterId": "success-encounter",
    "failureNextEncounterId": "failure-encounter",
    "xpReward": 50
}
```

### 3.3 Race/Class/Background-Specific Options
```json
{
    "id": "race-specific",
    "text": "[Race Name] Dialog text",
    "type": "continue",
    "requiresRace": "Half-Elf",
    "outcome": "Result text",
    "nextEncounterId": "next",
    "xpReward": 40
}
```

```json
{
    "id": "class-specific",
    "text": "[Class Name] Dialog text",
    "type": "continue",
    "requiresClass": "Paladin",
    "outcome": "Result text",
    "nextEncounterId": "next",
    "xpReward": 45
}
```

```json
{
    "id": "background-specific",
    "text": "[Background Name] Dialog text",
    "type": "continue",
    "requiresBackground": "Criminal",
    "outcome": "Result text",
    "nextEncounterId": "next",
    "xpReward": 35
}
```

## 4. Coverage Requirements

### 4.1 Required Races (9)
Each adventure MUST include at least one dialog option for each race:
- [ ] Dragonborn
- [ ] Dwarf
- [ ] Elf
- [ ] Gnome
- [ ] Half-Elf
- [ ] Half-Orc
- [ ] Halfling
- [ ] Human
- [ ] Tiefling

### 4.2 Required Classes (12)
Each adventure MUST include at least one dialog option for each class:
- [ ] Barbarian
- [ ] Bard
- [ ] Cleric
- [ ] Druid
- [ ] Fighter
- [ ] Monk
- [ ] Paladin
- [ ] Ranger
- [ ] Rogue
- [ ] Sorcerer
- [ ] Warlock
- [ ] Wizard

### 4.3 Required Backgrounds (13)
Each adventure MUST include at least one dialog option for each background:
- [ ] Acolyte
- [ ] Charlatan
- [ ] Criminal
- [ ] Entertainer
- [ ] Folk Hero
- [ ] Guild Artisan
- [ ] Hermit
- [ ] Noble
- [ ] Outlander
- [ ] Sage
- [ ] Sailor
- [ ] Soldier
- [ ] Urchin

### 4.4 Distribution Strategy
- Spread options across the adventure journey (early, mid, late game)
- Don't cluster all special options in one encounter
- Aim for 2-3 race/class/background options per major encounter
- Ensure all paths through the adventure encounter some special options

## 5. Contextual Appropriateness

### 5.1 Race Option Guidelines
| Race | Themes | Good Contexts |
|------|--------|---------------|
| Dragonborn | Draconic power, imposing presence | Intimidation, elemental situations |
| Dwarf | Stonework, crafting, endurance | Underground, forges, ancient ruins |
| Elf | Fey ancestry, magic, longevity | Ethereal, nature, history |
| Gnome | Curiosity, mechanisms, magic | Libraries, puzzles, artifice |
| Half-Elf | Bridge between worlds, diplomacy | Social encounters, liminal spaces |
| Half-Orc | Endurance, intimidation, strength | Combat preparation, physical challenges |
| Halfling | Luck, agility, resourcefulness | Tight spaces, risky situations |
| Human | Adaptability, empathy, resolve | Universal, emotional moments |
| Tiefling | Infernal heritage, outsider status | Fiendish locations, dark bargains |

### 5.2 Class Option Guidelines
| Class | Themes | Good Contexts |
|-------|--------|---------------|
| Barbarian | Rage, physical power, endurance | Combat prep, harsh environments |
| Bard | Performance, charm, lore | Social infiltration, inspiring moments |
| Cleric | Divine power, healing, undead | Religious sites, healing NPCs |
| Druid | Nature, spirits, transformation | Natural locations, corrupted lands |
| Fighter | Tactics, combat expertise, discipline | Battles, military situations |
| Monk | Ki, discipline, acrobatics | Physical challenges, meditation |
| Paladin | Divine sense, righteousness, oaths | Evil detection, moral choices |
| Ranger | Tracking, survival, favored enemies | Wilderness, hunting enemies |
| Rogue | Stealth, shadows, lockpicking | Infiltration, traps, secrets |
| Sorcerer | Innate magic, wild power | Magical phenomena, bloodline moments |
| Warlock | Patron knowledge, dark pacts | Otherworldly entities, bargains |
| Wizard | Arcane knowledge, study, rituals | Libraries, magical puzzles |

### 5.3 Background Option Guidelines
| Background | Themes | Good Contexts |
|------------|--------|---------------|
| Acolyte | Religious knowledge, faith | Temples, undead, spirits |
| Charlatan | Deception, false identities | Infiltration, cons |
| Criminal | Underworld contacts, shadows | Cities, black markets |
| Entertainer | Performance, crowd manipulation | Social events, distractions |
| Folk Hero | Common people, inspiration | Rescuing NPCs, rallying |
| Guild Artisan | Crafts, trade networks | Forges, merchants, repairs |
| Hermit | Solitude, wisdom, secrets | Meditation, hidden knowledge |
| Noble | Authority, etiquette, politics | Courts, negotiations |
| Outlander | Survival, wilderness, tracking | Nature, caves, harsh terrain |
| Sage | Academic knowledge, research | Libraries, ancient lore |
| Sailor | Navigation, sea stories, ropes | Water, climbing, weather |
| Soldier | Military discipline, tactics | Combat, fortifications |
| Urchin | Street smarts, climbing, hiding | Cities, rooftops, poverty |

## 6. Combat Encounters

### 6.1 Combat Structure
```json
{
    "id": "combat-encounter",
    "title": "Combat Title",
    "description": "Combat narrative",
    "type": "combat",
    "autoStartCombat": true,
    "enemy": {
        "id": "enemy-type-id",
        "name": "Display Name",
        "armorClass": 14,
        "hitPoints": 45,
        "attackBonus": 5,
        "damage": "1d8+3",
        "xpReward": 200,
        "damageType": "slashing",
        "creatureType": "humanoid"
    },
    "options": [
        {
            "id": "victory",
            "text": "Victory action",
            "type": "attack",
            "nextEncounterId": "next-encounter"
        }
    ]
}
```

## 7. Item Rewards

### 7.1 Granting Items
```json
{
    "id": "loot-option",
    "text": "Take the treasure",
    "type": "continue",
    "outcome": "You claim the item.",
    "grantsItemIds": ["item-id"],
    "nextEncounterId": "next"
}
```

### 7.2 Requiring Items
```json
{
    "id": "use-item",
    "text": "Use the key",
    "type": "continue",
    "requiresItemId": "key-item-id",
    "outcome": "The door opens.",
    "nextEncounterId": "next"
}
```

**Important**: Ensure all `grantsItemIds` and `requiresItemId` reference items that exist in `src/content/items.json`.

## 8. Validation

### 8.1 Run Validator
```bash
npm run validate:campaigns
```

### 8.2 Check for:
- ❌ **Errors** (must fix):
  - Invalid skill names
  - Orphaned encounters
  - Invalid encounter references
  
- ⚠️ **Warnings** (should fix):
  - Unknown item references
  - Missing map positions

### 8.3 Coverage Verification
After completing the adventure, verify coverage with grep:
```bash
# Check races
grep -o '"requiresRace": "[^"]*"' src/content/adventure-[name].json | sort | uniq

# Check classes
grep -o '"requiresClass": "[^"]*"' src/content/adventure-[name].json | sort | uniq

# Check backgrounds
grep -o '"requiresBackground": "[^"]*"' src/content/adventure-[name].json | sort | uniq
```

## 9. Final Checklist

Before submitting:
- [ ] Adventure has clear beginning, middle, and end
- [ ] All encounters are reachable from start
- [ ] All endings have `"type": "ending"` and final option has `"endsAdventure": true`
- [ ] All 9 races have dialog options
- [ ] All 12 classes have dialog options
- [ ] All 13 backgrounds have dialog options
- [ ] Options are distributed across the adventure (not clustered)
- [ ] All item references are valid
- [ ] Map positions create logical visual flow
- [ ] Validator passes with no errors
- [ ] XP rewards are balanced (25-100 for options, combat XP set properly)

## 10. Example Distribution

For a 20-encounter adventure, distribute approximately:
- **Early game (encounters 1-6)**: 3 races, 4 classes, 4 backgrounds
- **Mid game (encounters 7-14)**: 3 races, 4 classes, 5 backgrounds  
- **Late game (encounters 15-20)**: 3 races, 4 classes, 4 backgrounds

This ensures players encounter their special options regardless of which path they take.
