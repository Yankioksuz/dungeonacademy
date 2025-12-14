// Item Icon Mapping
// Maps item IDs to their icon imports

// Legendary Weapons
import flameTongueSword from '@/assets/items/flame_tongue_sword_1765543018028.png';
import frostBrandSword from '@/assets/items/frost_brand_sword_1765543032751.png';
import holyAvengerSword from '@/assets/items/holy_avenger_sword_1765543047648.png';
import vorpalSword from '@/assets/items/vorpal_sword_1765543062709.png';
import oathbow from '@/assets/items/oathbow_1765543240403.png';

// Common Weapons
import commonLongsword from '@/assets/items/common_longsword_1765721672716.png';
import commonShortsword from '@/assets/items/common_shortsword_1765721702245.png';
import commonDagger from '@/assets/items/common_dagger_1765721720048.png';
import commonGreataxe from '@/assets/items/common_greataxe_1765721739899.png';
import commonShortbow from '@/assets/items/common_shortbow_1765721762418.png';
import commonLongbow from '@/assets/items/common_longbow_1765721789332.png';
import commonQuarterstaff from '@/assets/items/common_quarterstaff_1765721807153.png';

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

// Magic Weapons
import sunblade from '@/assets/items/sunblade_1765720541974.png';
import daggerVenom from '@/assets/items/dagger_venom_1765720562043.png';
import frostRuneAxe from '@/assets/items/frost_rune_axe_1765720579205.png';

// Magic Armor & Shields
import adamantineArmor from '@/assets/items/adamantine_armor_1765720597002.png';
import dragonScaleMail from '@/assets/items/dragon_scale_mail_1765720624424.png';
import animatedShield from '@/assets/items/animated_shield_1765720641250.png';
import spellguardShield from '@/assets/items/spellguard_shield_1765720657459.png';

// Wondrous Items
import bagOfHolding from '@/assets/items/bag_of_holding_1765720673425.png';
import bootsOfElvenkind from '@/assets/items/boots_of_elvenkind_1765720700815.png';
import gauntletsOfOgrePower from '@/assets/items/gauntlets_of_ogre_power_1765720717184.png';
import wandOfFireballs from '@/assets/items/wand_of_fireballs_1765720731080.png';
import rodPactKeeper from '@/assets/items/rod_pact_keeper_1765720746530.png';

// Quest/Other
import heartShard from '@/assets/items/heart_shard_1765720761124.png';
import rimeguardMedallion from '@/assets/items/rimeguard_medallion_1765720779909.png';

// Item ID to Icon mapping
export const ITEM_ICONS: Record<string, string> = {
    // Weapons
    'flame-tongue': flameTongueSword,
    'frost-brand': frostBrandSword,
    'holy-avenger': holyAvengerSword,
    'vorpal-sword': vorpalSword,
    'oathbow': oathbow,

    // Common Weapons
    'longsword': commonLongsword,
    'shortsword': commonShortsword,
    'dagger': commonDagger,
    'greataxe': commonGreataxe,
    'shortbow': commonShortbow,
    'longbow': commonLongbow,
    'quarterstaff': commonQuarterstaff,

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

    // Magic Weapons
    'sunblade': sunblade,
    'dagger-venom': daggerVenom,
    'frost-rune-axe': frostRuneAxe,

    // Magic Armor & Shields
    'adamantine-armor': adamantineArmor,
    'dragon-scale-mail': dragonScaleMail,
    'animated-shield': animatedShield,
    'spellguard-shield': spellguardShield,

    // Wondrous Items
    'bag-of-holding': bagOfHolding,
    'boots-of-elvenkind': bootsOfElvenkind,
    'gauntlets-of-ogre-power': gauntletsOfOgrePower,
    'wand-of-fireballs': wandOfFireballs,
    'rod-of-the-pact-keeper': rodPactKeeper,

    // Quest Items (New)
    'heart-shard': heartShard,
    'rimeguard-medallion': rimeguardMedallion,
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
