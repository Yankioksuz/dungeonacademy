import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { useTranslation } from 'react-i18next';
import { Save, Upload, Trash2, X, Clock } from 'lucide-react';
import { useSaveSystem } from '@/hooks/useSaveSystem';
import { useGame } from '@/contexts/GameContext';

interface SaveLoadMenuProps {
  onClose: () => void;
}

export function SaveLoadMenu({ onClose }: SaveLoadMenuProps) {
  const { t } = useTranslation();
  const { getSaveInfo, deleteSave, hasSave, saveGame } = useSaveSystem();
  const { character, adventure, characterCreationStep, isInAdventure, quests, journal, loadFromSave } = useGame();
  const [confirmDelete, setConfirmDelete] = useState<'manual' | 'auto' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const manualSaveInfo = getSaveInfo(false);
  const autoSaveInfo = getSaveInfo(true);
  const hasManualSave = hasSave(false);
  const hasAutoSave = hasSave(true);

  const handleSave = () => {
    saveGame(character, adventure, characterCreationStep, isInAdventure, quests, journal, false);
    onClose();
  };

  const handleDelete = (type: 'manual' | 'auto') => {
    deleteSave(type === 'auto');
    setConfirmDelete(null);
  };

  const handleLoad = (type: 'manual' | 'auto') => {
    setLoadError(null);
    const success = loadFromSave(type === 'auto');
    if (success) {
      onClose();
    } else {
      setLoadError(t('saveLoad.loadFailed', 'Failed to load save data.'));
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl solid-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{t('saveLoad.title')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <CardDescription>
            {t('saveLoad.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Save */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-fantasy-purple" />
              <h3 className="font-semibold">{t('saveLoad.autoSave')}</h3>
              <Badge variant="fantasy" className="text-xs">{t('saveLoad.automatic')}</Badge>
            </div>
            {hasAutoSave && autoSaveInfo ? (
              <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="font-semibold text-lg">{autoSaveInfo.characterName}</p>
                    <div className="text-sm space-y-1">
                      <p><strong>{t('saveLoad.level')} {autoSaveInfo.characterLevel}</strong> {autoSaveInfo.characterRace} {autoSaveInfo.characterClass}</p>
                      {autoSaveInfo.isInAdventure && autoSaveInfo.adventureTitle && (
                        <p className="text-fantasy-purple">📜 {autoSaveInfo.adventureTitle}</p>
                      )}
                      <p className="text-muted-foreground">
                        {t('saveLoad.saved')} {formatDate(autoSaveInfo.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoad('auto')}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {t('saveLoad.load')}
                    </Button>
                    {confirmDelete === 'auto' ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('auto')}
                        >
                          {t('saveLoad.confirm')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          {t('saveLoad.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete('auto')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-fantasy-dark-card/50 rounded-md border border-fantasy-purple/20 text-center text-muted-foreground">
                {t('saveLoad.noAutoSave')}
              </div>
            )}
          </div>

          {/* Manual Save */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-fantasy-gold" />
                <h3 className="font-semibold">{t('saveLoad.manualSave')}</h3>
                <Badge variant="gold" className="text-xs">{t('saveLoad.playerCreated')}</Badge>
              </div>
              <Button
                variant="fantasy"
                size="sm"
                onClick={handleSave}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {t('saveLoad.saveGame', 'Save Game')}
              </Button>
            </div>

            {hasManualSave && manualSaveInfo ? (
              <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-gold/30">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="font-semibold text-lg">{manualSaveInfo.characterName}</p>
                    <div className="text-sm space-y-1">
                      <p><strong>{t('saveLoad.level')} {manualSaveInfo.characterLevel}</strong> {manualSaveInfo.characterRace} {manualSaveInfo.characterClass}</p>
                      {manualSaveInfo.isInAdventure && manualSaveInfo.adventureTitle && (
                        <p className="text-fantasy-purple">📜 {manualSaveInfo.adventureTitle}</p>
                      )}
                      <p className="text-muted-foreground">
                        {t('saveLoad.saved')} {formatDate(manualSaveInfo.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoad('manual')}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {t('saveLoad.load')}
                    </Button>
                    {confirmDelete === 'manual' ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('manual')}
                        >
                          {t('saveLoad.confirm')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          {t('saveLoad.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete('manual')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-fantasy-dark-card/50 rounded-md border border-fantasy-gold/20 text-center text-muted-foreground">
                {t('saveLoad.noManualSave')}
                <p className="text-xs mt-2">{t('saveLoad.noManualSaveHint')}</p>
              </div>
            )}
          </div>

          {loadError && (
            <p className="text-sm text-red-400 border border-red-500/30 rounded-md p-2">
              {loadError}
            </p>
          )}

          <div className="flex gap-2 pt-4 border-t border-fantasy-purple/20">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {t('saveLoad.close')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
