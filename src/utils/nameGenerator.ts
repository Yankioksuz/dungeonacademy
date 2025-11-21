// Fantasy name generator for D&D character creation

const namesByRace = {
  Human: {
    male: [
      'Aldric', 'Brennan', 'Cedric', 'Davian', 'Eldon', 'Finnian', 'Gareth', 'Henrik',
      'Ivor', 'Jasper', 'Kellan', 'Leoric', 'Magnus', 'Nolan', 'Oswin', 'Pierce',
      'Quinlan', 'Roderic', 'Soren', 'Tristan', 'Ulric', 'Victor', 'Warren', 'Xavier'
    ],
    female: [
      'Aeliana', 'Beatrice', 'Cecilia', 'Delphine', 'Elara', 'Freya', 'Giselle', 'Helena',
      'Isolde', 'Jovanna', 'Keira', 'Liora', 'Mirana', 'Natalia', 'Ophelia', 'Petra',
      'Quinn', 'Rosalind', 'Selene', 'Thalia', 'Ursula', 'Vivienne', 'Winifred', 'Ysabel'
    ],
  },
  Elf: {
    male: [
      'Aelar', 'Beiro', 'Carric', 'Dayereth', 'Erevan', 'Faenor', 'Galinndan', 'Hadarai',
      'Immeral', 'Jannalor', 'Kelvhan', 'Laucian', 'Mindartis', 'Naal', 'Onas', 'Peren',
      'Quarion', 'Riardon', 'Soveliss', 'Thamior', 'Ualair', 'Varis', 'Wrenn', 'Xiloscient'
    ],
    female: [
      'Adrie', 'Birel', 'Chaedi', 'Drusilia', 'Enna', 'Felosial', 'Gweylysa', 'Hatae',
      'Ielenia', 'Jelenneth', 'Keyleth', 'Leshanna', 'Meriele', 'Naivara', 'Olna', 'Quelenna',
      'Raesya', 'Silaqui', 'Theirastra', 'Ueleth', 'Valanthe', 'Wynneth', 'Xanaphia', 'Yllana'
    ],
  },
  Dwarf: {
    male: [
      'Adrik', 'Baern', 'Brocc', 'Darrak', 'Eberk', 'Fargrim', 'Gardain', 'Harbek',
      'Thorin', 'Kragg', 'Mordinok', 'Norvak', 'Orsik', 'Rurik', 'Taklinn', 'Tordek',
      'Ulfgar', 'Vondal', 'Barendd', 'Dain', 'Gimli', 'Thrakk', 'Travok', 'Veit'
    ],
    female: [
      'Amber', 'Bardryn', 'Dagnal', 'Diesa', 'Eldeth', 'Falkrunn', 'Gurdis', 'Helja',
      'Ildera', 'Kathra', 'Liftrasa', 'Mardred', 'Nora', 'Oriff', 'Riswynn', 'Sannl',
      'Torbera', 'Vistra', 'Artin', 'Brunna', 'Gunnloda', 'Hlin', 'Kristryd', 'Zirke'
    ],
  },
  Halfling: {
    male: [
      'Alton', 'Beau', 'Cade', 'Dunkin', 'Eldon', 'Finnan', 'Garret', 'Hobbs',
      'Igan', 'Jasper', 'Kelby', 'Lindal', 'Merric', 'Osborn', 'Perrin', 'Reed',
      'Shadar', 'Tye', 'Ulmo', 'Vern', 'Wellby', 'Xander', 'Yohan', 'Zeno'
    ],
    female: [
      'Alain', 'Blossom', 'Cora', 'Dee', 'Eida', 'Finna', 'Gynnie', 'Halle',
      'Ivy', 'Jillian', 'Kithri', 'Lavinia', 'Merla', 'Nedda', 'Olive', 'Paela',
      'Quilla', 'Rose', 'Seraphina', 'Trym', 'Una', 'Verna', 'Willow', 'Ysolde'
    ],
  },
  Dragonborn: {
    male: [
      'Arjhan', 'Balasar', 'Bharash', 'Donaar', 'Ghesh', 'Heskan', 'Kriv', 'Medrash',
      'Nadarr', 'Pandjed', 'Patrin', 'Rhogar', 'Shamash', 'Shedinn', 'Torinn', 'Verthisathurgiesh',
      'Akra', 'Bhenkumbyrznaax', 'Drago', 'Fyron', 'Gorza', 'Kraal', 'Thava', 'Zedaar'
    ],
    female: [
      'Akra', 'Biri', 'Daar', 'Farideh', 'Harann', 'Jheri', 'Kava', 'Korinn',
      'Mishann', 'Nala', 'Perra', 'Raiann', 'Sora', 'Surina', 'Thava', 'Uadjit',
      'Vyrloka', 'Wivvyrholdalphiax', 'Xaehra', 'Yikari', 'Zofin', 'Azra', 'Eryx', 'Kerra'
    ],
  },
  'Half-Orc': {
    male: [
      'Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk',
      'Mhurren', 'Ront', 'Shump', 'Thokk', 'Grom', 'Throk', 'Ugrash', 'Vrokk',
      'Zug', 'Brak', 'Dreg', 'Gorth', 'Korg', 'Murk', 'Ruk', 'Thak'
    ],
    female: [
      'Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Ownka',
      'Shautha', 'Sutha', 'Vola', 'Volen', 'Yevelda', 'Grenda', 'Hrolga', 'Katra',
      'Mursha', 'Orza', 'Ranna', 'Throga', 'Urka', 'Varka', 'Zula', 'Bogha'
    ],
  },
  Tiefling: {
    male: [
      'Akmenos', 'Amnon', 'Barakas', 'Damakos', 'Ekemon', 'Iados', 'Kairon', 'Leucis',
      'Melech', 'Mordai', 'Morthos', 'Pelaios', 'Skamos', 'Therai', 'Zagan', 'Azzael',
      'Carrion', 'Despair', 'Eclipse', 'Fear', 'Glory', 'Havoc', 'Ideal', 'Music'
    ],
    female: [
      'Akta', 'Anakis', 'Bryseis', 'Criella', 'Damaia', 'Ea', 'Kallista', 'Lerissa',
      'Makaria', 'Nemeia', 'Orianna', 'Phelaia', 'Rieta', 'Art', 'Carrion', 'Chant',
      'Creed', 'Despair', 'Excellence', 'Fear', 'Glory', 'Hope', 'Ideal', 'Music'
    ],
  },
};

// Surnames by race
const surnamesByRace = {
  Human: [
    'Ashwood', 'Blackwell', 'Brightblade', 'Carver', 'Deepwood', 'Eagleheart', 'Fairwind',
    'Goldleaf', 'Harlow', 'Ironforge', 'Kingsley', 'Lightfoot', 'Morningstar', 'Northwood',
    'Oakenshield', 'Proudfoot', 'Ravencrest', 'Silverhand', 'Stormwind', 'Thornhill'
  ],
  Elf: [
    'Amakiir', 'Berevan', 'Craulnober', 'Deepwater', 'Ealoeth', 'Featherfall', 'Galanodel',
    'Holimion', 'Ilphelkiir', 'Liadon', 'Meliamne', 'Naïlo', 'Siannodel', 'Xiloscient',
    'Moonwhisper', 'Stargazer', 'Windwalker', 'Silvermoon', 'Dawnbringer', 'Nightbreeze'
  ],
  Dwarf: [
    'Battlehammer', 'Brawnanvil', 'Dankil', 'Fireforge', 'Frostbeard', 'Gorunn', 'Holderhek',
    'Ironfist', 'Loderr', 'Lutgehr', 'Rumnaheim', 'Strakeln', 'Torunn', 'Ungart',
    'Ironfoot', 'Stonehelm', 'Anvilbreaker', 'Deepdelver', 'Hammerfall', 'Strongarm'
  ],
  Halfling: [
    'Brushgather', 'Goodbarrel', 'Greenbottle', 'High-hill', 'Hilltopple', 'Leagallow',
    'Tealeaf', 'Thorngage', 'Tosscobble', 'Underbough', 'Brightwood', 'Fernfoot',
    'Littlefoot', 'Meadowbrook', 'Quickstep', 'Smallburrow', 'Swiftfoot', 'Willowrun'
  ],
  Dragonborn: [
    'Clethtinthiallor', 'Daardendrian', 'Delmirev', 'Drachedandion', 'Fenkenkabradon',
    'Kepeshkmolik', 'Kerrhylon', 'Kimbatuul', 'Linxakasendalor', 'Myastan', 'Nemmonis',
    'Norixius', 'Ophinshtalajiir', 'Prexijandilin', 'Shestendeliath', 'Turnuroth'
  ],
  'Half-Orc': [
    'Ironhide', 'Skullsplitter', 'Bloodfist', 'Stonecrusher', 'Grimjaw', 'Blacktusk',
    'Bonecrusher', 'Flamebeard', 'Thunderfist', 'Warbringer', 'Axehand', 'Roughhide',
    'Sharptooth', 'Strongback', 'Wildheart', 'Heavyhand', 'Ravager', 'Breaker'
  ],
  Tiefling: [
    // Tieflings often take virtue names or infernal surnames
    'of Pride', 'of Sorrow', 'the Seeker', 'the Wanderer', 'Hellborn', 'Infernalis',
    'Ashenheart', 'Darkflame', 'Embervein', 'Fiendish', 'Grimhorn', 'Hellfire',
    'Nightborn', 'Shadowclaw', 'Soulforge', 'Bloodthorn', 'Cinderfall', 'Doomwhisper'
  ],
};

export function generateRandomName(raceName?: string, gender?: 'male' | 'female' | 'non-binary' | 'other'): string {
  // Default to Human if no race specified
  const race = raceName || 'Human';
  
  // Get names for the race, fallback to Human if race not found
  const raceNames = namesByRace[race as keyof typeof namesByRace] || namesByRace.Human;
  const raceSurnames = surnamesByRace[race as keyof typeof surnamesByRace] || surnamesByRace.Human;
  
  // Determine which gender names to use
  let genderForNames: 'male' | 'female';
  if (gender === 'male' || gender === 'female') {
    genderForNames = gender;
  } else {
    // For non-binary/other/not specified, randomly choose from available names
    genderForNames = Math.random() > 0.5 ? 'male' : 'female';
  }
  
  const firstNames = raceNames[genderForNames];
  
  // Pick random first name and surname
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const surname = raceSurnames[Math.floor(Math.random() * raceSurnames.length)];
  
  // Some races use full names, others just first names
  if (race === 'Elf' || race === 'Dwarf' || race === 'Human') {
    return `${firstName} ${surname}`;
  }
  
  // Halflings, Dragonborn, Half-Orcs, and Tieflings can have surnames but not always
  if (Math.random() > 0.3) {
    return `${firstName} ${surname}`;
  }
  
  return firstName;
}

export function generateMultipleNames(raceName?: string, count: number = 5): string[] {
  const names = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 3; // Prevent infinite loop
  
  while (names.size < count && attempts < maxAttempts) {
    names.add(generateRandomName(raceName));
    attempts++;
  }
  
  return Array.from(names);
}

