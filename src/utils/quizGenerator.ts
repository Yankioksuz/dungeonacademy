import type { QuizQuestion, QuizCategory, RuleContent, Race, Class, Background, SpellContent, AbilityContent } from '@/types';
import rulesContent from '@/content/rules.json';
import characterCreationContent from '@/content/characterCreation.json';
import spellsContent from '@/content/spells.json';
import abilitiesContent from '@/content/abilities.json';

export function generateQuestionsFromRules(count: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const usedIndices = new Set<number>();

  while (questions.length < count && usedIndices.size < rulesContent.length) {
    const randomIndex = Math.floor(Math.random() * rulesContent.length);
    if (usedIndices.has(randomIndex)) continue;
    usedIndices.add(randomIndex);

    const rule = rulesContent[randomIndex];
    const question = createRuleQuestion(rule, questions.length);
    if (question) questions.push(question);
  }

  return questions;
}

export function generateQuestionsFromCharacterCreation(count: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const allContent = [
    ...characterCreationContent.races,
    ...characterCreationContent.classes,
    ...characterCreationContent.backgrounds,
  ];

  const usedIndices = new Set<number>();
  while (questions.length < count && usedIndices.size < allContent.length) {
    const randomIndex = Math.floor(Math.random() * allContent.length);
    if (usedIndices.has(randomIndex)) continue;
    usedIndices.add(randomIndex);

    const item = allContent[randomIndex];
    const question = createCharacterCreationQuestion(item as Race | Class | Background, questions.length);
    if (question) questions.push(question);
  }

  return questions;
}

export function generateQuestionsFromSpells(count: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const usedIndices = new Set<number>();

  while (questions.length < count && usedIndices.size < spellsContent.length) {
    const randomIndex = Math.floor(Math.random() * spellsContent.length);
    if (usedIndices.has(randomIndex)) continue;
    usedIndices.add(randomIndex);

    const spell = spellsContent[randomIndex];
    const question = createSpellQuestion(spell, questions.length);
    if (question) questions.push(question);
  }

  return questions;
}

export function generateQuestionsFromAbilities(count: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const usedIndices = new Set<number>();

  while (questions.length < count && usedIndices.size < abilitiesContent.length) {
    const randomIndex = Math.floor(Math.random() * abilitiesContent.length);
    if (usedIndices.has(randomIndex)) continue;
    usedIndices.add(randomIndex);

    const ability = abilitiesContent[randomIndex];
    const question = createAbilityQuestion(ability as AbilityContent, questions.length);
    if (question) questions.push(question);
  }

  return questions;
}

export function generateQuiz(category: QuizCategory, questionCount: number = 5): QuizQuestion[] {
  switch (category) {
    case 'rules':
      return generateQuestionsFromRules(questionCount);
    case 'character-creation':
      return generateQuestionsFromCharacterCreation(questionCount);
    case 'spells':
      return generateQuestionsFromSpells(questionCount);
    case 'abilities':
      return generateQuestionsFromAbilities(questionCount);
    default:
      return [];
  }
}

function createRuleQuestion(rule: RuleContent, index: number): QuizQuestion | null {
  const questionTypes = [
    () => {
      // Question about what a rule covers
      const wrongCategories = ['Combat', 'Magic', 'Character Creation', 'Equipment'].filter(c => c !== rule.category);
      const options = [rule.category, ...wrongCategories.slice(0, 3)].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(rule.category);

      return {
        question: `What category does the rule "${rule.title}" belong to?`,
        options,
        correctAnswer: correctIndex,
        explanation: `"${rule.title}" belongs to the ${rule.category} category. ${rule.description}`,
      };
    },
    () => {
      // Question about a specific detail from the rule
      if (rule.details && rule.details.length > 0) {
        const correctDetail = rule.details[Math.floor(Math.random() * rule.details.length)];
        const otherRules = rulesContent.filter(r => r.id !== rule.id);
        const wrongDetails: string[] = [];

        // Collect wrong details from other rules
        for (const otherRule of otherRules) {
          if (otherRule.details && otherRule.details.length > 0) {
            wrongDetails.push(...otherRule.details.slice(0, 2));
          }
        }

        const shuffledWrong = wrongDetails.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [correctDetail, ...shuffledWrong].sort(() => Math.random() - 0.5);
        const correctIndex = options.indexOf(correctDetail);

        return {
          question: `Which of the following is true about ${rule.title}?`,
          options,
          correctAnswer: correctIndex,
          explanation: `${correctDetail} This is part of the ${rule.title} rule.`,
        };
      }
      return null;
    },
    () => {
      // Question about what the rule describes
      const wrongTitles = rulesContent
        .filter(r => r.id !== rule.id)
        .map(r => r.title)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [rule.title, ...wrongTitles].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(rule.title);

      return {
        question: `Which rule covers: "${rule.description.substring(0, 80)}${rule.description.length > 80 ? '...' : ''}"?`,
        options,
        correctAnswer: correctIndex,
        explanation: `"${rule.title}" covers this topic. ${rule.description}`,
      };
    },
  ];

  const selectedType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  const result = selectedType();
  if (!result) return null;

  return {
    id: `rule-${rule.id}-${index}`,
    category: 'rules',
    ...result,
  };
}

function createCharacterCreationQuestion(item: Race | Class | Background, index: number): QuizQuestion | null {
  if ('abilityScoreIncrease' in item) {
    // Race question
    const otherRaces = characterCreationContent.races
      .filter(r => r.id !== item.id)
      .map(r => r.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [item.name, ...otherRaces].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(item.name);

    // Create a question about a specific trait or ability score
    const abilityScores = Object.keys(item.abilityScoreIncrease);
    if (abilityScores.length > 0 && item.traits && item.traits.length > 0) {
      // Question about racial trait
      return {
        id: `race-${item.id}-${index}`,
        category: 'character-creation',
        question: `Which race has the "${item.traits[0]}" trait?`,
        options,
        correctAnswer: correctIndex,
        explanation: `${item.name} has the ${item.traits[0]} trait. ${item.description}`,
      };
    } else if (abilityScores.length > 0) {
      // Question about ability score increase
      const mainAbility = abilityScores[0];
      const increase = item.abilityScoreIncrease[mainAbility];

      return {
        id: `race-${item.id}-${index}`,
        category: 'character-creation',
        question: `Which race gets a +${increase} bonus to ${mainAbility}?`,
        options,
        correctAnswer: correctIndex,
        explanation: `${item.name} gets a +${increase} bonus to ${mainAbility}. ${item.description}`,
      };
    }

    return {
      id: `race-${item.id}-${index}`,
      category: 'character-creation',
      question: `Which race is described as: "${item.description.substring(0, 60)}..."?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${item.name}: ${item.description}`,
    };
  } else if ('hitDie' in item) {
    // Class question
    // Question about hit die
    const hitDice = ['d6', 'd8', 'd10', 'd12'];
    const wrongHitDice = hitDice.filter(d => d !== item.hitDie).sort(() => Math.random() - 0.5).slice(0, 3);
    const hitDieOptions = [item.hitDie, ...wrongHitDice].sort(() => Math.random() - 0.5);
    const hitDieCorrectIndex = hitDieOptions.indexOf(item.hitDie);

    return {
      id: `class-${item.id}-${index}`,
      category: 'character-creation',
      question: `What hit die does the ${item.name} class use?`,
      options: hitDieOptions,
      correctAnswer: hitDieCorrectIndex,
      explanation: `The ${item.name} class uses a ${item.hitDie} hit die. ${item.description}`,
    };
  } else {
    // Background question
    const otherBackgrounds = characterCreationContent.backgrounds
      .filter(b => b.id !== item.id)
      .map(b => b.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [item.name, ...otherBackgrounds].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(item.name);

    // Question about skill proficiencies
    if (item.skillProficiencies && item.skillProficiencies.length > 0) {
      const skills = item.skillProficiencies[0];

      return {
        id: `background-${item.id}-${index}`,
        category: 'character-creation',
        question: `Which background grants proficiency in ${skills}?`,
        options,
        correctAnswer: correctIndex,
        explanation: `The ${item.name} background grants proficiency in ${item.skillProficiencies.join(' and ')}. ${item.description}`,
      };
    }

    return {
      id: `background-${item.id}-${index}`,
      category: 'character-creation',
      question: `Which background is described as: "${item.description.substring(0, 60)}..."?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${item.name}: ${item.description}`,
    };
  }
}

function createSpellQuestion(spell: SpellContent, index: number): QuizQuestion | null {
  const questionTypes = [
    () => {
      // Question about spell level
      const wrongLevels = [
        spell.level > 0 ? spell.level - 1 : 1,
        spell.level + 1,
        spell.level + 2,
      ].filter(l => l >= 0 && l <= 9);

      const options = [
        `Level ${spell.level}`,
        ...wrongLevels.map(l => `Level ${l}`)
      ].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(`Level ${spell.level}`);

      return {
        question: `What level is the ${spell.name} spell?`,
        options,
        correctAnswer: correctIndex,
        explanation: `${spell.name} is a ${spell.level}${getOrdinal(spell.level)} level ${spell.school} spell. ${spell.description}`,
      };
    },
    () => {
      // Question about school of magic
      const allSchools = ['Evocation', 'Abjuration', 'Divination', 'Enchantment', 'Illusion', 'Necromancy', 'Transmutation', 'Conjuration'];
      const wrongSchools = allSchools
        .filter(s => s !== spell.school)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [spell.school, ...wrongSchools].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(spell.school);

      return {
        question: `What school of magic does ${spell.name} belong to?`,
        options,
        correctAnswer: correctIndex,
        explanation: `${spell.name} is a ${spell.school} spell. ${spell.description}`,
      };
    },
    () => {
      // Question about casting time
      const commonCastingTimes = ['1 action', '1 bonus action', '1 reaction', '1 minute', '10 minutes', '1 hour'];
      const wrongTimes = commonCastingTimes
        .filter(t => t !== spell.castingTime)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [spell.castingTime, ...wrongTimes].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(spell.castingTime);

      return {
        question: `What is the casting time of ${spell.name}?`,
        options,
        correctAnswer: correctIndex,
        explanation: `${spell.name} has a casting time of ${spell.castingTime}. ${spell.description}`,
      };
    },
    () => {
      // Question about range
      const commonRanges = ['Touch', 'Self', '30 feet', '60 feet', '120 feet', '150 feet'];
      const wrongRanges = commonRanges
        .filter(r => r !== spell.range)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [spell.range, ...wrongRanges].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(spell.range);

      return {
        question: `What is the range of ${spell.name}?`,
        options,
        correctAnswer: correctIndex,
        explanation: `${spell.name} has a range of ${spell.range}. ${spell.description}`,
      };
    },
  ];

  const selectedType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  const result = selectedType();

  return {
    id: `spell-${spell.id}-${index}`,
    category: 'spells',
    ...result,
  };
}

function createAbilityQuestion(ability: AbilityContent, index: number): QuizQuestion | null {
  const allClasses = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Paladin', 'Barbarian', 'Bard', 'Sorcerer', 'Warlock', 'Druid', 'Monk'];
  const wrongClasses = allClasses
    .filter(c => c !== ability.class)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const options = [ability.class, ...wrongClasses].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(ability.class);

  return {
    id: `ability-${ability.id}-${index}`,
    category: 'abilities',
    question: `Which class gains the "${ability.name}" ability at ${ability.level}${getOrdinal(ability.level)} level?`,
    options,
    correctAnswer: correctIndex,
    explanation: `${ability.name} is a ${ability.class} ability gained at ${ability.level}${getOrdinal(ability.level)} level. ${ability.description}`,
  };
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
