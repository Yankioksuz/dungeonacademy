import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Sword, Save } from 'lucide-react';
import { Button } from './ui/button';
import { SaveLoadMenu } from './SaveLoadMenu';
import { useGame } from '@/contexts/GameContext';
import { useSaveSystem } from '@/hooks/useSaveSystem';

export function Navigation() {
  const { t } = useTranslation();
  const { reset } = useGame();
  const { deleteSave } = useSaveSystem();
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const handleNewGameConfirm = () => {
    deleteSave(false);
    deleteSave(true);
    reset();
    setShowNewGameConfirm(false);
    setShowSaveMenu(false);
  };

  return (
    <>
      <nav className="border-b border-fantasy-dark-border bg-fantasy-dark-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sword className="h-6 w-6 text-fantasy-gold" />
            <h1 className="text-lg md:text-xl font-bold font-fantasy text-fantasy-gold">
              {t('app.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewGameConfirm(true)}
              className="flex items-center gap-2"
            >
              <Sword className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">
                {t('common.newGame', 'New Game')}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveMenu(true)}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">
                Save/Load
              </span>
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
      {showSaveMenu && (
        <SaveLoadMenu
          onClose={() => setShowSaveMenu(false)}
        />
      )}

      {showNewGameConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 fade-in">
          <div className="w-full max-w-md bg-fantasy-dark-card border border-fantasy-gold/30 rounded-lg p-6 shadow-2xl slide-up">
            <h3 className="text-xl font-bold text-fantasy-gold mb-4">
              {t('common.newGame', 'New Game')}
            </h3>
            <p className="text-gray-300 mb-6">
              {t('common.confirmNewGame', 'Are you sure you want to start a new game? All unsaved progress will be lost.')}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewGameConfirm(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleNewGameConfirm}
              >
                {t('common.confirm', 'Confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
