# Dungeon Academy

A web-based gamified D&D teacher application with quiz-based learning, supporting English and Turkish languages, targeting complete beginners with a fantasy-themed UI.

## Features

- **Interactive Quizzes**: Learn D&D 5e through multiple-choice questions
- **Multiple Categories**: 
  - Core Rules (combat, skills, saving throws, ability scores)
  - Character Creation (races, classes, backgrounds)
  - Spells (spell information and mechanics)
  - Abilities (class features and abilities)
- **Multi-language Support**: English and Turkish translations
- **Fantasy UI**: Beautiful dark theme with fantasy-inspired design
- **Design System**: Built with shadcn/ui components
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Design System**: shadcn/ui
- **Styling**: Tailwind CSS with custom fantasy theme
- **i18n**: react-i18next
- **Build Tool**: Vite
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
/src
  /components
    /ui          # shadcn/ui base components
    - Quiz.tsx   # Main quiz component
    - QuizQuestion.tsx
    - QuizResult.tsx
    - Navigation.tsx
    - LanguageSwitcher.tsx
  /content       # D&D content JSON files
  /i18n          # Translation files
  /hooks         # Custom React hooks
  /lib           # Utility functions
  /types         # TypeScript type definitions
  /utils         # Quiz generator utilities
```

## Usage

1. Select a quiz category from the dropdown
2. Click "Start Quiz" to begin
3. Answer questions by selecting an option
4. Click "Submit Answer" to check your answer
5. View explanations and continue to the next question
6. See your final score and results at the end

## Language Switching

Click the language switcher in the navigation bar to toggle between English and Turkish.

## Contributing

This is a learning project. Feel free to extend it with:
- More D&D content
- Additional quiz categories
- More languages
- Additional gamification features (badges, achievements, etc.)

## License

This project is for educational purposes.
