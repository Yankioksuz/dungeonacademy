# Dungeon Academy 🎲⚔️

Learn D&D 5e rules by playing through narrated adventures, tactical encounters, and guided character building. The app blends a fantasy-themed UI with teaching tools, quick saves, and localized content.

![Fantasy UI](https://img.shields.io/badge/UI-Fantasy%20Themed-purple?style=for-the-badge)
![D&D 5e](https://img.shields.io/badge/D%26D-5e-red?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

## Overview

- React 19 + TypeScript front-end built with Vite, Tailwind, and shadcn/ui.
- Three ready-to-play adventures with branching encounters, quests, and loot:
  - **The First Quest** (Beginner) – Tutorial adventure in Oakhaven village
  - **Shadows of the Azure Spire** (Intermediate) – Political intrigue and mirror conspiracies
  - **The Frozen Depths** (Advanced) – Epic dungeon crawl with interconnected lore
- Guided character creator with portraits, racial traits, class hit dice, and automatic HP/spell setup.
- **Feats system** with 20+ D&D 5e feats available at ASI levels (4, 8, 12, 16, 19).
- **Subclass system** with unique features unlocking at appropriate levels.
- **Magic item attunement** supporting up to 3 attuned items with special properties.
- Dice-driven skill checks, combat encounters, spell slots, and short/long rest support.
- Manual and auto saves (localStorage) plus adventure history and journal logging.
- English and Turkish translations with a live language switcher.
- Quiz engine for rules practice powered by the in-repo rule/ability/spell data.

## Campaigns

### 🏰 The First Quest (Tutorial)
A beginner-friendly adventure in the village of Oakhaven. Learn the basics of D&D gameplay while investigating goblin raids from ancient elven ruins.

### 🪞 Shadows of the Azure Spire
Unmask the cabal inside the Azure Spire by choosing an infiltration route, surviving the twists, and confronting the mastermind in the mirror heart. Features political intrigue, multiple paths, and moral choices.

### ❄️ The Frozen Depths
The mastermind behind the goblin raids and the Azure Spire conspiracy has fled north to an ancient vault beneath the Frostfang Mountains. This campaign ties together the narrative threads from both previous adventures, featuring undead dwarven forges, ice elementals, and a Primordial of endless winter.

## Gameplay

### Character Creation
- Six-step flow: identity, class, background, ability scores, portrait, review.
- Random name generator and inline trait explanations to help new players.
- Calculates HP, hit dice, XP track, spell slots, and a starter spell list based on the chosen class.
- **Subclass selection** at appropriate levels (e.g., level 3 for most classes) with unique features.
- **Feat selection** available at ASI levels (4, 8, 12, 16, 19) as an alternative to ability score increases.

### Feats System
Choose from 20+ D&D 5e feats including:
- **Combat Feats**: Great Weapon Master, Sharpshooter, Sentinel, Polearm Master, Crossbow Expert, Savage Attacker, Charger
- **Defense Feats**: Shield Master, Heavy Armor Master, Medium Armor Master, Tough, Resilient
- **Skill/Utility Feats**: Alert, Observant, Skilled, Lucky, Skulker, Athlete, Healer, Inspiring Leader
- **Spellcasting Feats**: War Caster, Ritual Caster, Magic Initiate
- **Racial Feats**: Fey Touched, Shadow Touched

### Magic Items & Attunement
- Magical items with rarity tiers (common, uncommon, rare, very rare, legendary).
- Attunement system supporting up to 3 attuned items.
- Special item properties including resistance, immunity, and bonus damage.
- Armor types: Adamantine, Mithral, Dragon Scale, and more.

### Camp
- Pick between three packaged adventures and see difficulty/length at a glance.
- Rest (short/long), toggle tutorials, switch portraits, and view full character details.
- Adventure history records completions with outcomes; you can clear individual entries.
- Character sheet with complete stats, feats, equipment, and attunement management.

### Adventure Flow
- Branching encounters with gated options (race/class/background), animated dice rolls, and DC breakdowns.
- Quest tracker and journal update automatically as you progress; manual notes supported.
- Inventory, shop, and loot flow for weapons, armor, potions, scrolls, and gold.
- Spellbook with prepared/known spells, upcasting, ritual casting, concentration tracking, and slot spending/restoration.
- Turn-based combat with conditions, enemy AI, stat blocks, and class-specific abilities.
- Level-up modal with XP carryover, subclass unlocking, and feat selection.

### Combat System
- Turn-based initiative with proper turn management and **Alert** bonuses.
- **Action Economy**: Full support for Standard Actions, Bonus Actions (Two-weapon fighting, Cunning Action, etc.), and Reactions (Attacks of Opportunity, Shield, Uncanny Dodge).
- Class features: Rage, Divine Smite, Ki Points, Channel Divinity, Wild Shape, Bardic Inspiration, and more.
- Subclass abilities: Divine Fury, Psychic Blades, Cutting Words, and specialized features.
- Condition system: Prone, Grappled, Frightened, Charmed, Poisoned, Stunned, and more.
- Enemy AI with tactical decision-making and special actions.

## Save & Load

- Auto-save runs whenever character or adventure state changes.
- Manual saves/loads via the Save/Load menu in the top nav; both manual and auto slots are stored in `localStorage`.
- "New Game" clears both save slots and resets the current run.

## Tech Stack

- React 19 + TypeScript
- Vite for dev/build, React Router DOM for routing
- Tailwind CSS + shadcn/ui (Radix) + lucide-react icons
- react-i18next for localization

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Setup
1) Clone the repository  
```bash
git clone https://github.com/Yankioksuz/dungeonacademy.git
cd dungeonacademy
```
2) Install dependencies  
```bash
npm install
```
3) Run the dev server  
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Other Commands
- `npm run build` – production bundle to `dist/`
- `npm run preview` – preview the production build locally
- `npm run lint` – run ESLint

## Project Structure

```
src/
  components/          // Game screens, UI panels, and modals
    Adventure.tsx      // Adventure runtime (encounters, quests, spells, combat hooks)
    Camp.tsx           // Adventure selection, resting, history, character view
    CharacterCreation.tsx
    CombatEncounter.tsx // Main combat logic with feat integration
    CombatEnemyCard.tsx // Enemy list card component
    CombatLogPanel.tsx  // Combat log display
    EnemyStatBlock.tsx  // Detailed enemy stat block
    ConditionList.tsx   // Status condition display
    CharacterSheet.tsx  // Full character details with feats
    DiceRollModal.tsx   // Animated dice roll overlay
    DiceRoller.tsx
    Inventory.tsx       // Equipment and attunement management
    QuestTracker.tsx
    JournalPanel.tsx
    LevelUpModal.tsx    // Level up with subclass and feat selection
    RestModal.tsx       // Short/long rest handling
    SaveLoadMenu.tsx
    Shop.tsx
    ui/                 // shadcn/ui wrappers
  content/             // JSON data for adventures, items, spells, feats, talents, traits
    adventure.json     // The First Quest (Tutorial)
    adventure-shadows.json // Shadows of the Azure Spire
    adventure-frozen.json  // The Frozen Depths
    feats.json         // D&D 5e feats with effects and prerequisites
    items.json         // Weapons, armor, magic items, consumables
    spells.json        // Spell database
    enemies/           // Enemy stat blocks
  contexts/            // GameContext (state, saves, quests, spells, XP, feats)
  data/                // Class progression, portraits, subclass definitions
  hooks/               // Custom hooks (save system, quizzes, etc.)
  i18n/                // en/tr translations
  types/               // TypeScript type definitions
  utils/               // Helpers for rolls, stats, combat, conditions, enemy AI
    combatUtils.ts     // Combat calculations and damage adjustments
    featUtils.ts       // Feat effect calculations
    enemyAI.ts         // Enemy action selection logic
    conditionUtils.ts  // Status condition effects
    characterStats.ts  // Ability scores and modifiers
docs/                  // Design notes and feature roadmaps
```

## Content & Localization

- Adventures, items, spells, feats, talents, and rule text live in `src/content/*.json`. Adjust or add files to create new adventures or expand the database.
- Portrait metadata is in `src/data/portraits.ts` with images under `src/assets/`.
- Translations live in `src/i18n/en.json` and `src/i18n/tr.json`; update both when adding new strings.

## Contributing

Educational project—contributions welcome! Current priorities:
- Add new adventures or expand encounter branches.
- Enrich the item/spell/feat lists.
- Add more subclass options.
- Improve combat clarity and tutorial text.
- Additional language translations.

## License

This project is for educational purposes. D&D and related content are property of Wizards of the Coast.

## Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Inspired by D&D 5e System Reference Document
- Character portraits and campaign artwork generated with AI tools
