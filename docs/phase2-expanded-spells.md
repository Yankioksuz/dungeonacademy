# Phase 2.4: Expanded Spell System ✨

**Priority:** 🟠 High  
**Complexity:** ⭐⭐⭐ Complex  
**Estimated Time:** 6-8 days  

---

## 📋 Overview

Implement advanced D&D 5e spell mechanics including concentration, ritual casting, spell preparation, cantrip scaling, spell scrolls, and upcasting.

---

## 🎯 Goals

1. Add concentration tracking and checks
2. Implement ritual casting
3. Add spell preparation for prepared casters
4. Scale cantrips with character level
5. Create spell scroll items
6. Implement upcasting mechanics
7. Add spell components tracking (optional)

---

## 🗂️ Data Model Updates

### Spell Type Enhancements

```typescript
// src/types/index.ts

export interface Spell {
  // ... existing properties ...
  
  concentration: boolean;
  ritual: boolean;
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialDescription?: string;
  };
  
  // Scaling
  upcastDescription?: string;
  cantrip Scaling?: {
    level5: string;
    level11: string;
    level17: string;
  };
}

// Add to PlayerCharacter
export interface PlayerCharacter {
  // ... existing ...
  concentratingOn?: {
    spellId: string;
    spellName: string;
    startedAt: number;
  };
  preparedSpells?: string[]; // For Clerics, Druids, Paladins
}
```

---

## 🎯 Feature Implementations

### 1. Concentration System

**Rules:**
- Only one concentration spell active at a time
- Casting new concentration spell ends previous
- Taking damage requires CON save (DC = 10 or half damage, whichever is higher)
- Failing save ends concentration

**Implementation:**

```typescript
// src/utils/concentration.ts

export function startConcentration(
  character: PlayerCharacter,
  spell: Spell
): PlayerCharacter {
  return {
    ...character,
    concentratingOn: {
      spellId: spell.id,
      spellName: spell.name,
      startedAt: Date.now()
    }
  };
}

export function makeConcentrationCheck(
  character: PlayerCharacter,
  damage: number
): boolean {
  const dc = Math.max(10, Math.floor(damage / 2));
  const conModifier = Math.floor((character.abilityScores.constitution - 10) / 2);
  const profBonus = Math.floor((character.level - 1) / 4) + 2;
  
  // War Caster feat gives advantage
  const hasWarCaster = character.feats?.includes('war-caster');
  
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + conModifier + profBonus;
  
  return total >= dc;
}

export function endConcentration(
  character: PlayerCharacter
): PlayerCharacter {
  return {
    ...character,
    concentratingOn: undefined
  };
}
```

**UI Indicator:**
- Show concentration icon on character portrait
- Display spell name being concentrated on
- Highlight when concentration check needed

---

### 2. Ritual Casting

**Rules:**
- Cast ritual spells without using spell slot
- Takes 10 minutes longer to cast
- Only spells with ritual tag
- Some classes can ritual cast (Wizard, Cleric, Druid)

**Implementation:**

```typescript
// Check if character can ritual cast
export function canRitualCast(character: PlayerCharacter): boolean {
  const ritualClasses = ['Wizard', 'Cleric', 'Druid', 'Bard'];
  return ritualClasses.includes(character.class.name) ||
         character.feats?.includes('ritual-caster');
}

// Cast spell as ritual
export function castRitual(
  character: PlayerCharacter,
  spell: Spell
): { success: boolean; message: string } {
  if (!spell.ritual) {
    return { success: false, message: 'This spell cannot be cast as a ritual' };
  }
  
  if (!canRitualCast(character)) {
    return { success: false, message: 'You cannot cast rituals' };
  }
  
  // No spell slot consumed
  return {
    success: true,
    message: `You spend 10 minutes casting ${spell.name} as a ritual`
  };
}
```

**Ritual Spells:**
- Detect Magic
- Identify
- Find Familiar
- Comprehend Languages
- Alarm
- Leomund's Tiny Hut

---

### 3. Spell Preparation

**Rules:**
- Prepared casters (Cleric, Druid, Paladin) can prepare spells from full class list
- Number prepared = spellcasting modifier + level
- Can change prepared spells after long rest
- Known casters (Wizard, Sorcerer, Bard) don't prepare

**Implementation:**

```typescript
export function getMaxPreparedSpells(character: PlayerCharacter): number {
  const preparedCasters = ['Cleric', 'Druid', 'Paladin'];
  
  if (!preparedCasters.includes(character.class.name)) {
    return 0; // Not a prepared caster
  }
  
  const spellcastingAbility = character.class.spellcastingAbility || 'wisdom';
  const abilityMod = Math.floor(
    (character.abilityScores[spellcastingAbility] - 10) / 2
  );
  
  return Math.max(1, abilityMod + character.level);
}

export function prepareSpell(
  character: PlayerCharacter,
  spellId: string
): PlayerCharacter {
  const maxPrepared = getMaxPreparedSpells(character);
  const currentPrepared = character.preparedSpells || [];
  
  if (currentPrepared.length >= maxPrepared) {
    throw new Error('Maximum spells already prepared');
  }
  
  return {
    ...character,
    preparedSpells: [...currentPrepared, spellId]
  };
}
```

**UI Component:**
- Spell preparation modal
- Show available spells from class list
- Drag and drop to prepare/unprepare
- Show prepared count vs max

---

### 4. Cantrip Scaling

**Rules:**
- Cantrips increase damage at levels 5, 11, 17
- Typically add additional damage dice

**Implementation:**

```typescript
export function getCantripDamage(
  spell: Spell,
  characterLevel: number
): string {
  if (spell.level !== 0) return spell.damage || '';
  
  const baseDamage = spell.damage || '1d8';
  const [count, die] = baseDamage.split('d');
  const dieSize = die;
  
  let diceCount = parseInt(count);
  
  if (characterLevel >= 17) diceCount = 4;
  else if (characterLevel >= 11) diceCount = 3;
  else if (characterLevel >= 5) diceCount = 2;
  
  return `${diceCount}d${dieSize}`;
}
```

**Scaling Cantrips:**
- Fire Bolt: 1d10 → 2d10 → 3d10 → 4d10
- Eldritch Blast: 1 beam → 2 beams → 3 beams → 4 beams
- Sacred Flame: 1d8 → 2d8 → 3d8 → 4d8

---

### 5. Spell Scrolls

**Rules:**
- Consumable items containing spells
- Can cast spell from scroll (uses action)
- Uses character's spell attack/DC
- Destroyed after use
- Can use scrolls of spells not in your class list (with check)

**Implementation:**

```typescript
// Add to items.json
{
  "id": "scroll-fireball",
  "name": "Spell Scroll (Fireball)",
  "type": "scroll",
  "rarity": "uncommon",
  "value": 150,
  "spell": "fireball",
  "spellLevel": 3,
  "description": "A scroll containing the Fireball spell. You can use an action to cast this spell from the scroll."
}

// Cast from scroll
export function castFromScroll(
  character: PlayerCharacter,
  scroll: Item
): { success: boolean; message: string } {
  if (!scroll.spell) {
    return { success: false, message: 'Not a spell scroll' };
  }
  
  // Check if spell is on character's class list
  const spell = getSpellById(scroll.spell);
  const onClassList = spell.classes.includes(character.class.name);
  
  if (!onClassList && scroll.spellLevel > 0) {
    // Require ability check (DC = 10 + spell level)
    const dc = 10 + scroll.spellLevel;
    const abilityMod = getSpellcastingModifier(character);
    const roll = Math.floor(Math.random() * 20) + 1;
    
    if (roll + abilityMod < dc) {
      return {
        success: false,
        message: `Failed to cast from scroll (${roll + abilityMod} vs DC ${dc})`
      };
    }
  }
  
  // Cast spell and destroy scroll
  return {
    success: true,
    message: `You cast ${spell.name} from the scroll, which crumbles to dust`
  };
}
```

---

### 6. Upcasting

**Rules:**
- Cast spell using higher level slot
- Increased effect (more damage, targets, duration)
- Show upcast options when casting

**Implementation:**

```typescript
export function getUpcastDamage(
  spell: Spell,
  slotLevel: number
): string {
  if (!spell.upcastDescription || slotLevel <= spell.level) {
    return spell.damage || '';
  }
  
  const levelsAbove = slotLevel - spell.level;
  
  // Example: Fireball adds 1d6 per level
  if (spell.id === 'fireball') {
    return `${8 + levelsAbove}d6`;
  }
  
  // Example: Magic Missile adds 1 dart per level
  if (spell.id === 'magic-missile') {
    return `${3 + levelsAbove} darts`;
  }
  
  return spell.damage || '';
}
```

**Upcast Examples:**
- Fireball: 8d6 → 9d6 → 10d6 (add 1d6 per level)
- Magic Missile: 3 darts → 4 darts → 5 darts
- Cure Wounds: 1d8 → 2d8 → 3d8 (add 1d8 per level)
- Scorching Ray: 3 rays → 4 rays → 5 rays

---

## 🔧 Implementation Steps

### Step 1: Update Spell Data (4 hours)

**File:** `src/content/spells.json`

Add concentration, ritual, components, upcast info to all spells.

### Step 2: Implement Concentration System (4 hours)

- Add concentration state to character
- Create concentration check logic
- Add UI indicators
- Integrate with combat damage

### Step 3: Add Ritual Casting (3 hours)

- Add ritual casting option to spell UI
- Implement ritual casting logic
- Add time advancement

### Step 4: Implement Spell Preparation (5 hours)

- Create spell preparation UI
- Add preparation logic
- Restrict casting to prepared spells
- Allow changing on long rest

### Step 5: Scale Cantrips (2 hours)

- Update cantrip damage calculation
- Apply scaling based on character level

### Step 6: Create Spell Scrolls (4 hours)

- Add scroll items to loot tables
- Implement scroll casting
- Add ability check for non-class spells

### Step 7: Implement Upcasting (4 hours)

- Add upcast option to spell casting UI
- Calculate upcast effects
- Update damage/targets/duration

### Step 8: Add Spell Components (Optional, 3 hours)

- Track material components
- Require component pouch or focus
- Expensive components consume gold

---

## ✅ Testing Checklist

### Concentration
- [ ] Only one concentration spell active
- [ ] New concentration ends previous
- [ ] Damage triggers concentration check
- [ ] Correct DC calculation
- [ ] War Caster gives advantage
- [ ] UI shows concentration status

### Ritual Casting
- [ ] Can cast ritual spells without slot
- [ ] Only ritual-tagged spells
- [ ] Only ritual-capable classes
- [ ] Time advances properly

### Spell Preparation
- [ ] Max prepared calculated correctly
- [ ] Can prepare up to max
- [ ] Can only cast prepared spells
- [ ] Can change after long rest
- [ ] Known casters not affected

### Cantrip Scaling
- [ ] Scales at levels 5, 11, 17
- [ ] Damage increases correctly
- [ ] Displays scaled damage

### Spell Scrolls
- [ ] Can cast from scroll
- [ ] Scroll consumed after use
- [ ] Ability check for non-class spells
- [ ] Uses character's spell DC

### Upcasting
- [ ] Can choose higher slot level
- [ ] Effects increase correctly
- [ ] UI shows upcast options
- [ ] Damage/targets scale properly

---

## 🎨 UI Components

### Concentration Indicator
```
┌─────────────────┐
│ 🧠 Concentrating│
│ Bless           │
│ 2 rounds        │
└─────────────────┘
```

### Spell Casting Modal with Upcast
```
┌──────────────────────────────┐
│ Cast Fireball             [X]│
├──────────────────────────────┤
│ Choose Spell Slot Level:     │
│                              │
│ ○ Level 3 (8d6 damage)       │
│ ● Level 4 (9d6 damage)       │
│ ○ Level 5 (10d6 damage)      │
│                              │
│ Spell Slots Remaining:       │
│ Level 3: ●●○○                │
│ Level 4: ●○○                 │
│ Level 5: ●○                  │
│                              │
│ [Cancel]          [Cast]     │
└──────────────────────────────┘
```

---

See implementation code in component files.
