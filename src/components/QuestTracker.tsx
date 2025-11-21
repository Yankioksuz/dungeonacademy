import type { QuestEntry, QuestCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface QuestTrackerProps {
  quests: QuestEntry[];
}

const statusLabelMap: Record<QuestEntry['status'], string> = {
  available: 'Available',
  active: 'Active',
  completed: 'Completed',
};

const statusVariantMap: Record<QuestEntry['status'], 'outline' | 'fantasy' | 'gold'> = {
  available: 'outline',
  active: 'fantasy',
  completed: 'gold',
};

const categoryLabelMap: Record<QuestCategory, string> = {
  main: 'Main Quests',
  side: 'Side Quests',
};

export function QuestTracker({ quests }: QuestTrackerProps) {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    main: true,
    side: true,
    completed: false,
  });

  if (!quests.length) {
    return null;
  }

  const activeQuests = quests.filter((quest) => quest.status !== 'completed');
  const completedQuests = quests.filter((quest) => quest.status === 'completed');

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const renderQuestList = (questList: QuestEntry[]) => (
    <div className="space-y-4">
      {questList.map((quest) => (
        <div key={quest.id} className="p-3 rounded-md border border-fantasy-purple/20 bg-fantasy-dark-card/60">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{quest.title}</h3>
            <Badge variant={statusVariantMap[quest.status]}>
              {t(`quests.status.${quest.status}`, statusLabelMap[quest.status])}
            </Badge>
          </div>
          {quest.category && quest.status !== 'completed' && (
            <p className="text-xs text-muted-foreground mb-1">
              {t(`quests.category.${quest.category}`, categoryLabelMap[quest.category])}
            </p>
          )}
          <p className="text-sm text-muted-foreground mb-3">{quest.description}</p>
          <div className="space-y-2">
            {quest.objectives.map((objective) => (
              <div key={objective.id} className="flex items-start gap-2 text-sm">
                {objective.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-fantasy-gold mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
                )}
                <span className={objective.completed ? 'text-fantasy-gold' : ''}>
                  {objective.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="solid-panel h-full">
      <CardHeader>
        <CardTitle>{t('quests.title', 'Quests')}</CardTitle>
        <CardDescription>{t('quests.description', 'Track your current objectives and progress.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {['main', 'side'].map((category) => {
          const filtered = activeQuests.filter((quest) => quest.category === category);
          if (filtered.length === 0) return null;
          const isExpanded = expandedCategories[category];
          const labelKey = `quests.category.${category}`;

          return (
            <div key={category}>
              <button
                className="flex items-center justify-between w-full text-left text-sm font-semibold text-fantasy-gold mb-2"
                onClick={() => toggleCategory(category)}
              >
                <span>{t(labelKey, categoryLabelMap[category as QuestCategory])}</span>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {isExpanded && renderQuestList(filtered)}
            </div>
          );
        })}

        {completedQuests.length > 0 && (
          <div>
            <button
              className="flex items-center justify-between w-full text-left text-sm font-semibold text-muted-foreground mb-2"
              onClick={() => toggleCategory('completed')}
            >
              <span>{t('quests.completed', 'Completed Quests')}</span>
              {expandedCategories.completed ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {expandedCategories.completed && renderQuestList(completedQuests)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
