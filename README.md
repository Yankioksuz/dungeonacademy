# Dungeon Academy 🎲⚔️

A comprehensive web-based D&D 5e teaching application that combines interactive quizzes with immersive adventure gameplay. Learn the rules of Dungeons & Dragons through hands-on experience with character creation, tactical combat, and narrative-driven quests.

![Fantasy UI](https://img.shields.io/badge/UI-Fantasy%20Themed-purple?style=for-the-badge)
![D&D 5e](https://img.shields.io/badge/D%26D-5e-red?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

## ✨ Features

### 🎮 Adventure Mode
- **Character Creation**: Create your hero with multiple races (Human, Elf, Dwarf, Halfling, Dragonborn), classes (Fighter, Wizard, Rogue, Cleric), and backgrounds
- **Portrait System**: Choose from a variety of character portraits
- **Interactive Adventures**: Experience branching narrative adventures with meaningful choices
- **Skill Checks**: Roll dice for Persuasion, Stealth, Investigation, and more with detailed breakdowns
- **Combat System**: Engage in turn-based tactical combat with:
  - Attack rolls and damage calculation
  - Spell casting with saving throws
  - Death saving throws
  - Status effects and buffs
  - Item usage (potions, scrolls, burning oil)
- **Quest Tracking**: Follow main and side quests with objectives
- **Journal System**: Keep a log of your adventures and discoveries
- **XP & Leveling**: Gain experience, level up, and learn new talents
- **Inventory Management**: Collect weapons, armor, potions, and treasure
- **Save/Load System**: Auto-save your progress and manage multiple save files
- **Adventure History**: Track your completed adventures with outcomes (Success/Failure/Abandoned)

### 📚 Learning Mode
- **Interactive Quizzes**: Learn D&D 5e rules through multiple-choice questions
- **Multiple Categories**: 
  - Core Rules (combat, skills, saving throws, ability scores)
  - Character Creation (races, classes, backgrounds)
  - Spells (spell information and mechanics)
  - Abilities (class features and abilities)
- **Tutorial System**: In-game tutorials explain mechanics as you play
- **Toggleable Hints**: Turn tutorials on/off based on your experience level

### 🎨 Design & UX
- **Fantasy-Themed UI**: Immersive dark theme with gold accents and parchment textures
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Multi-language Support**: English and Turkish translations
- **Smooth Animations**: Dice rolling animations, fade-ins, and transitions
- **Premium Components**: Built with shadcn/ui for a polished experience

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS with custom fantasy theme
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: React Context API
- **Internationalization**: react-i18next
- **Build Tool**: Vite
- **Routing**: React Router DOM

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Yankioksuz/dungeonacademy.git
cd dungeonacademy
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📁 Project Structure

```
/src
  /components
    - Adventure.tsx          # Main adventure gameplay
    - AdventureHistory.tsx   # Adventure history tracker
    - Camp.tsx              # Adventure selection hub
    - CharacterCreation.tsx # Character creation wizard
    - CombatEncounter.tsx   # Turn-based combat system
    - DiceRoller.tsx        # 3D dice rolling animations
    - Inventory.tsx         # Item management
    - QuestTracker.tsx      # Quest and journal UI
    - Shop.tsx              # Merchant system
    /ui                     # shadcn/ui base components
  /content                  # D&D content JSON files
    - adventure.json        # Tutorial adventure
    - adventure-shadows.json # Shadows of the Azure Spire
    - items.json            # Weapons, armor, potions
    - spells.json           # Spell database
  /contexts
    - GameContext.tsx       # Global game state
  /hooks                    # Custom React hooks
  /i18n                     # Translation files (EN/TR)
  /types                    # TypeScript type definitions
```

## 🎯 How to Play

### Adventure Mode

1. **Create Your Character**: Choose your race, class, background, and customize ability scores
2. **Select an Adventure**: Pick from available quests at the Camp
3. **Make Choices**: Navigate through encounters using skill checks, combat, or dialogue
4. **Roll Dice**: Test your skills against difficulty checks with detailed roll breakdowns
5. **Fight Enemies**: Engage in tactical turn-based combat
6. **Level Up**: Gain XP, increase your level, and learn new talents
7. **Track Progress**: View your quest objectives and journal entries
8. **Manage History**: Review your past adventures in the History tab

### Quiz Mode

1. Select a quiz category from the dropdown
2. Click "Start Quiz" to begin
3. Answer questions by selecting an option
4. View explanations after each answer
5. See your final score and results

## 🌍 Language Support

Click the language switcher in the navigation bar to toggle between English and Turkish.

## 🎲 Game Mechanics

### Combat System
- **Initiative**: Turn order determined by Dexterity-based rolls
- **Attack Rolls**: d20 + ability modifier + proficiency bonus vs. AC
- **Damage**: Weapon dice + ability modifier
- **Spell Casting**: Spell save DC = 8 + proficiency + spellcasting ability
- **Death Saves**: Roll d20 when at 0 HP (3 successes = stable, 3 failures = death)

### Skill Checks
- **Roll**: d20 + ability modifier + proficiency (if trained)
- **DC**: Difficulty Class set by the encounter
- **Breakdown**: Detailed explanation of roll components

## 🤝 Contributing

This is an educational project. Contributions are welcome! Feel free to:
- Add more adventures and encounters
- Create new items, spells, or enemies
- Improve UI/UX
- Add more languages
- Implement additional D&D 5e mechanics

## 📝 License

This project is for educational purposes. D&D and related content are property of Wizards of the Coast.

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Inspired by D&D 5e System Reference Document
- Character portraits generated with AI tools

---

**Made with ❤️ for D&D enthusiasts and newcomers alike**
