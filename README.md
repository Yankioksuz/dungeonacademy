# Dungeon Academy 🎲⚔️

Learn D&D 5e rules by playing through narrated adventures, tactical encounters, and guided character building. The app blends a fantasy-themed UI with teaching tools, quick saves, and localized content.

![Fantasy UI](https://img.shields.io/badge/UI-Fantasy%20Themed-purple?style=for-the-badge)
![D&D 5e](https://img.shields.io/badge/D%26D-5e-red?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

## Overview

- React 19 + TypeScript front-end built with Vite, Tailwind, and shadcn/ui.
- Two ready-to-play adventures (Tutorial & Shadows of the Azure Spire) with branching encounters, quests, and loot.
- Guided character creator with portraits, racial traits, class hit dice, and automatic HP/spell setup.
- Dice-driven skill checks, combat encounters, spell slots, and short/long rest support.
- Manual and auto saves (localStorage) plus adventure history and journal logging.
- English and Turkish translations with a live language switcher.
- Quiz engine for rules practice powered by the in-repo rule/ability/spell data.

## Gameplay

### Character Creation
- Six-step flow: identity, class, background, ability scores, portrait, review.
- Random name generator and inline trait explanations to help new players.
- Calculates HP, hit dice, XP track, spell slots, and a starter spell list based on the chosen class.

### Camp
- Pick between the two packaged adventures and see difficulty/length at a glance.
- Rest (short/long), toggle tutorials, switch portraits, and view full character details.
- Adventure history records completions with outcomes; you can clear individual entries.

### Adventure Flow
- Branching encounters with gated options (race/class/background), animated dice rolls, and DC breakdowns.
- Quest tracker and journal update automatically as you progress; manual notes supported.
- Inventory, shop, and loot flow for weapons, armor, potions, scrolls, and gold.
- Spellbook with prepared/known spells, upcasting, ritual casting, concentration tracking, and slot spending/restoration.
- Turn-based combat encounters, level-up modal with XP carryover, and rest menu from inside the adventure.

### Quizzes
- Question generator covers rules, character creation, spells, and abilities using `src/content`. The `components/Quiz` flow is ready to embed wherever you want a practice mode.

## Save & Load

- Auto-save runs whenever character or adventure state changes.
- Manual saves/loads via the Save/Load menu in the top nav; both manual and auto slots are stored in `localStorage`.
- “New Game” clears both save slots and resets the current run.

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
    CombatEncounter.tsx
    DiceRoller.tsx
    Inventory.tsx
    QuestTracker.tsx
    JournalPanel.tsx
    SaveLoadMenu.tsx
    ui/                // shadcn/ui wrappers
  content/             // JSON data for adventures, items, spells, talents, traits
  contexts/            // GameContext (state, saves, quests, spells, XP)
  hooks/               // Custom hooks (save system, quizzes, etc.)
  i18n/                // en/tr translations
  utils/               // Helpers for rolls, stats, quiz generation
docs/                  // Design notes and feature roadmaps
```

## Content & Localization

- Adventures, items, spells, talents, and rule text live in `src/content/*.json`. Adjust or add files to create new adventures or expand the database.
- Portrait metadata is in `src/data/portraits.ts` with images under `src/assets/`.
- Translations live in `src/i18n/en.json` and `src/i18n/tr.json`; update both when adding new strings.

## Contributing

Educational project—contributions welcome! Ideas:
- Add new adventures or expand encounter branches.
- Enrich the item/spell/talent lists.
- Improve combat clarity, tutorial text, or localization coverage.
- Surface the quiz flow inside the UI.

## License

This project is for educational purposes. D&D and related content are property of Wizards of the Coast.

## Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Inspired by D&D 5e System Reference Document
- Character portraits generated with AI tools
