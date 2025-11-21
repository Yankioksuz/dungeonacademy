import type { QuizResult as QuizResultType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trophy, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuizResultProps {
  result: QuizResultType;
  onRestart: () => void;
}

export function QuizResult({ result, onRestart }: QuizResultProps) {
  const { t } = useTranslation();

  const getMessage = () => {
    if (result.percentage >= 80) {
      return t('results.excellent');
    } else if (result.percentage >= 60) {
      return t('results.good');
    } else {
      return t('results.needsPractice');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto scroll-parchment slide-up">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Trophy className="h-16 w-16 text-fantasy-gold pulse-glow" />
        </div>
        <CardTitle className="text-3xl">{t('results.title')}</CardTitle>
        <p className="text-lg mt-2 text-fantasy-gold font-semibold">{getMessage()}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-4 bg-fantasy-dark-card rounded-lg border border-fantasy-purple/30">
            <div className="text-3xl font-bold text-fantasy-gold mb-1">
              {result.percentage}%
            </div>
            <div className="text-sm text-muted-foreground">{t('results.percentage')}</div>
          </div>
          <div className="text-center p-4 bg-fantasy-dark-card rounded-lg border border-fantasy-purple/30">
            <div className="text-3xl font-bold text-fantasy-gold mb-1">
              {result.score}/{result.totalQuestions}
            </div>
            <div className="text-sm text-muted-foreground">{t('results.score')}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>{t('results.correct')}</span>
            </div>
            <Badge variant="fantasy">{result.correctAnswers}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-500/30">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <span>{t('results.incorrect')}</span>
            </div>
            <Badge variant="destructive">{result.incorrectAnswers}</Badge>
          </div>
        </div>

        <Button
          variant="fantasy"
          size="lg"
          className="w-full"
          onClick={onRestart}
        >
          {t('quiz.restart')}
        </Button>
      </CardContent>
    </Card>
  );
}

