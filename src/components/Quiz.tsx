import { useState } from 'react';
import { useQuiz } from '@/hooks/useQuiz';
import { QuizQuestion } from './QuizQuestion';
import { QuizResult } from './QuizResult';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { QuizCategory } from '@/types';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

export function Quiz() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | ''>('');
  const {
    questions,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    selectedAnswer,
    answers,
    isFinished,
    showResult,
    startQuiz,
    selectAnswer,
    submitAnswer,
    nextQuestion,
    getResult,
    reset,
  } = useQuiz();

  const handleStartQuiz = () => {
    if (selectedCategory) {
      startQuiz(selectedCategory as QuizCategory, 5);
    }
  };

  const handleRestart = () => {
    reset();
    setSelectedCategory('');
  };

  if (questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 fade-in">
        <Card className="w-full max-w-2xl mx-auto scroll-parchment slide-up">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Sparkles className="h-12 w-12 text-fantasy-gold" />
            </div>
            <CardTitle className="text-3xl">{t('quiz.selectCategory')}</CardTitle>
            <CardDescription className="text-lg mt-2">
              {t('app.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as QuizCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('quiz.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rules">{t('categories.rules')}</SelectItem>
                <SelectItem value="character-creation">{t('categories.characterCreation')}</SelectItem>
                <SelectItem value="spells">{t('categories.spells')}</SelectItem>
                <SelectItem value="abilities">{t('categories.abilities')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="fantasy"
              size="lg"
              className="w-full"
              onClick={handleStartQuiz}
              disabled={!selectedCategory}
            >
              {t('quiz.start')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFinished) {
    const result = getResult();
    if (!result) return null;

    return (
      <div className="container mx-auto px-4 py-8 fade-in">
        <QuizResult result={result} onRestart={handleRestart} />
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="container mx-auto px-4 py-8 fade-in">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {t('quiz.question')} {currentQuestionIndex + 1} {t('quiz.of')} {totalQuestions}
          </span>
          <span className="text-sm font-semibold text-fantasy-gold">
            {t('quiz.score')}: {answers.filter(a => a.isCorrect).length}/{answers.length}
          </span>
        </div>
        <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="h-2" />
      </div>

      <QuizQuestion
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={totalQuestions}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={selectAnswer}
        showResult={showResult}
      />

      <div className="flex justify-center mt-6 gap-4">
        {!showResult ? (
          <Button
            variant="fantasy"
            size="lg"
            onClick={submitAnswer}
            disabled={selectedAnswer === null}
          >
            {t('quiz.submit')}
          </Button>
        ) : (
          <Button
            variant="gold"
            size="lg"
            onClick={nextQuestion}
          >
            {currentQuestionIndex < totalQuestions - 1 ? t('quiz.next') : t('quiz.finish')}
          </Button>
        )}
      </div>
    </div>
  );
}

