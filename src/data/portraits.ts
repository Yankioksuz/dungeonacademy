const portraitModules = import.meta.glob('@/assets/portraits/*.{png,jpg,jpeg,webp}', {
  eager: true,
}) as Record<string, { default: string }>;

export interface PortraitDefinition {
  id: string;
  race: string;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  name: string;
  src: string;
}

const formatName = (idSegment: string) =>
  idSegment
    .split('-')
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(' ');

const normalizeGender = (genderSegment: string): PortraitDefinition['gender'] => {
  const normalized = genderSegment.toLowerCase();
  if (normalized === 'nb') return 'non-binary';
  if (normalized === 'm') return 'male';
  if (normalized === 'f') return 'female';
  if (['male', 'female', 'other', 'non-binary'].includes(normalized)) {
    return normalized as PortraitDefinition['gender'];
  }
  return 'other';
};

export const portraits: PortraitDefinition[] = Object.entries(portraitModules).map(([path, module]) => {
  const filename = path.split('/').pop() || 'unknown.png';
  const [race = 'unknown', genderSegment = 'other', idSegment = '01'] = filename.toLowerCase().replace(/\.(png|jpg|jpeg|webp)$/i, '').split('-');
  const gender = normalizeGender(genderSegment);

  return {
    id: `${race}-${genderSegment}-${idSegment}`,
    race: race.toLowerCase(),
    gender,
    name: formatName(`${race} ${idSegment}`),
    src: module.default,
  };
});

export const getPortraitsFor = (raceId?: string, gender?: string) => {
  if (!raceId) return portraits;
  return portraits.filter((portrait) => {
    const matchesRace = portrait.race === raceId.toLowerCase();
    const matchesGender = gender ? portrait.gender === gender : true;
    return matchesRace && matchesGender;
  });
};
