import type { QuizQuestion as QuizQuestionType } from '@/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  onSelectAnswer: (index: number) => void;
  showResult: boolean;
}

export function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  showResult,
}: QuizQuestionProps) {
  const { t } = useTranslation();

  return (
    <Card className="w-full max-w-2xl mx-auto scroll-parchment slide-up">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="fantasy">
            {t('quiz.question')} {questionNumber} {t('quiz.of')} {totalQuestions}
          </Badge>
          <Badge variant="gold">{question.category}</Badge>
        </div>
        <CardTitle className="text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === question.correctAnswer;
          const showCorrect = showResult && isCorrect;
          const showIncorrect = showResult && isSelected && !isCorrect;

          return (
            <Button
              key={index}
              variant={showCorrect ? 'gold' : showIncorrect ? 'destructive' : 'outline'}
              className={cn(
                'w-full justify-start text-left h-auto py-4 px-4 transition-all',
                !showResult && isSelected && 'ring-2 ring-fantasy-purple bg-fantasy-purple/20 border-fantasy-purple hover:bg-fantasy-purple/30',
                showCorrect && 'ring-2 ring-fantasy-gold',
                showIncorrect && 'ring-2 ring-red-500'
              )}
              onClick={() => onSelectAnswer(index)}
              disabled={showResult}
            >
              <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
              <span>{option}</span>
              {showCorrect && (
                <span className="ml-auto text-fantasy-gold">✓</span>
              )}
              {showIncorrect && (
                <span className="ml-auto text-red-500">✗</span>
              )}
            </Button>
          );
        })}
        {showResult && question.explanation && (
          <div className="mt-4 p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30">
            <p className="text-sm font-semibold text-fantasy-gold mb-2">
              {t('quiz.explanation')}:
            </p>
            <p className="text-sm">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

