// Item Icon Mapping
// Maps item IDs to their icon imports

// Legendary Weapons
import flameTongueSword from '@/assets/items/flame_tongue_sword_1765543018028.png';
import frostBrandSword from '@/assets/items/frost_brand_sword_1765543032751.png';
import holyAvengerSword from '@/assets/items/holy_avenger_sword_1765543047648.png';
import vorpalSword from '@/assets/items/vorpal_sword_1765543062709.png';
import oathbow from '@/assets/items/oathbow_1765543240403.png';

// Legendary Staves
import staffOfTheMagi from '@/assets/items/staff_of_the_magi_1765543077659.png';
import staffOfFire from '@/assets/items/staff_of_fire_1765543282500.png';
import staffOfPower from '@/assets/items/staff_of_power_1765543298789.png';

// Legendary Cloaks
import cloakOfInvisibility from '@/assets/items/cloak_of_invisibility_1765543101504.png';
import cloakOfDisplacement from '@/assets/items/cloak_of_displacement_1765543332086.png';

// Legendary Rings
import ringOfInvisibility from '@/assets/items/ring_of_invisibility_1765543116691.png';
import ringThreeWishes from '@/assets/items/ring_three_wishes_1765543191516.png';
import ringOfProtection from '@/assets/items/ring_of_protection_1765543348073.png';
import ringOfRegeneration from '@/assets/items/ring_of_regeneration_1765543255187.png';

// Legendary Misc
import deckOfManyThings from '@/assets/items/deck_of_many_things_1765543133426.png';
import beltStormGiant from '@/assets/items/belt_storm_giant_1765543148718.png';
import iounStoneMastery from '@/assets/items/ioun_stone_mastery_1765543166369.png';
import talismanPureGood from '@/assets/items/talisman_pure_good_1765543210630.png';
import primordialWinterShard from '@/assets/items/primordial_winter_shard_1765543224808.png';

// Rare Items
import helmOfBrilliance from '@/assets/items/helm_of_brilliance_1765543317950.png';
import bracersOfDefense from '@/assets/items/bracers_of_defense_1765543373777.png';

// Item ID to Icon mapping
export const ITEM_ICONS: Record<string, string> = {
    // Weapons
    'flame-tongue': flameTongueSword,
    'frost-brand': frostBrandSword,
    'holy-avenger': holyAvengerSword,
    'vorpal-sword': vorpalSword,
    'oathbow': oathbow,

    // Staves
    'staff-of-the-magi': staffOfTheMagi,
    'staff-of-fire': staffOfFire,
    'staff-of-power': staffOfPower,

    // Cloaks
    'cloak-of-invisibility': cloakOfInvisibility,
    'cloak-of-displacement': cloakOfDisplacement,

    // Rings
    'ring-of-invisibility': ringOfInvisibility,
    'ring-of-three-wishes': ringThreeWishes,
    'ring-of-protection': ringOfProtection,
    'ring-of-regeneration': ringOfRegeneration,

    // Belts
    'belt-of-giant-strength-storm': beltStormGiant,

    // Ioun Stones
    'ioun-stone-mastery': iounStoneMastery,

    // Amulets & Talismans
    'talisman-of-pure-good': talismanPureGood,

    // Quest Items
    'primordial-winter-shard': primordialWinterShard,
    'deck-of-many-things': deckOfManyThings,

    // Headgear
    'helm-of-brilliance': helmOfBrilliance,

    // Armor/Bracers
    'bracers-of-defense': bracersOfDefense,
};

/**
 * Get the icon source for an item by its ID
 * Returns undefined if no icon exists for the item
 */
export function getItemIconSrc(itemId: string): string | undefined {
    return ITEM_ICONS[itemId];
}

/**
 * Check if an item has a custom icon
 */
export function hasItemIcon(itemId: string): boolean {
    return itemId in ITEM_ICONS;
}
