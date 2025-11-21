import type { JournalEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { ScrollText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface JournalPanelProps {
  journal: JournalEntry[];
}

export function JournalPanel({ journal }: JournalPanelProps) {
  const { t } = useTranslation();

  if (!journal.length) {
    return null;
  }

  return (
    <Card className="solid-panel h-full">
      <CardHeader className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-fantasy-gold" />
          <CardTitle>{t('journal.title', 'Adventurer\'s Journal')}</CardTitle>
        </div>
        <CardDescription>{t('journal.description', 'Key moments and discoveries from your journey.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto">
        {journal.map((entry) => (
          <div key={entry.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
            <p className="text-sm font-semibold text-fantasy-gold">
              {entry.title || t('journal.entryTitle', 'Entry')}
            </p>
            <p className="text-sm text-muted-foreground">{entry.message}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {new Date(entry.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
