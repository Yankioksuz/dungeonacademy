import { portraits as portraitData } from '@/data/portraits';
import { cn } from '@/lib/utils';

interface PortraitSelectorProps {
  raceId?: string | null;
  gender?: 'male' | 'female' | 'non-binary' | 'other' | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyLabel?: string;
}

export function PortraitSelector({ raceId, gender, selectedId, onSelect, emptyLabel }: PortraitSelectorProps) {
  const normalizedGender = !gender || gender === 'other' ? undefined : gender;
  const options = raceId
    ? portraitData.filter((portrait) => {
      const matchesRace = portrait.race === raceId.toLowerCase();
      const matchesGender = normalizedGender ? portrait.gender === normalizedGender : true;
      return matchesRace && matchesGender;
    })
    : portraitData;

  if (!raceId || options.length === 0) {
    return emptyLabel ? (
      <div className="p-6 text-center text-sm bg-fantasy-dark-card border border-dashed border-fantasy-purple/30 rounded-md text-muted-foreground">
        {emptyLabel}
      </div>
    ) : null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {options.map((portrait) => {
        const isSelected = selectedId === portrait.id;
        return (
          <button
            type="button"
            key={portrait.id}
            onClick={() => onSelect(portrait.id)}
            className={cn(
              'relative rounded-2xl border-2 transition-all bg-fantasy-dark-card overflow-hidden',
              isSelected
                ? 'border-fantasy-gold shadow-lg shadow-black/40'
                : 'border-transparent hover:border-fantasy-gold/60'
            )}
          >
            <img
              src={portrait.src}
              alt={portrait.name}
              className="w-full max-h-80 object-cover"
            />
            {isSelected && (
              <span className="absolute top-3 right-3 text-xs bg-fantasy-gold text-black px-2 py-0.5 rounded-full shadow">
                Selected
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
