#!/usr/bin/env node
/**
 * Campaign Validator
 * 
 * Validates all adventure JSON files for:
 * - Graph integrity (all references are valid)
 * - Reachability (all encounters can be reached)
 * - Dead ends (encounters without exits that don't end adventure)
 * - Data consistency (valid skill names, item refs, class/race refs)
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const CONTENT_DIR = path.join(process.cwd(), 'src/content');

const ADVENTURE_FILES = [
    'adventure.json',
    'adventure-shadows.json',
    'adventure-frozen.json',
    'adventure-sanctum.json'
];

// Valid D&D 5e skills
const VALID_SKILLS = [
    'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics',
    'Deception', 'History', 'Insight', 'Intimidation',
    'Investigation', 'Medicine', 'Nature', 'Perception',
    'Performance', 'Persuasion', 'Religion', 'Sleight of Hand',
    'Stealth', 'Survival'
];

// Valid abilities
const VALID_ABILITIES = [
    'Strength', 'Dexterity', 'Constitution',
    'Intelligence', 'Wisdom', 'Charisma'
];

// ============================================================================
// Load Reference Data
// ============================================================================

function loadReferenceData() {
    const data = {
        validClasses: new Set(),
        validRaces: new Set(),
        validBackgrounds: new Set(),
        validItems: new Set()
    };

    // Load character creation data
    try {
        const charCreation = JSON.parse(
            fs.readFileSync(path.join(CONTENT_DIR, 'characterCreation.json'), 'utf8')
        );

        charCreation.classes?.forEach(c => data.validClasses.add(c.name));
        charCreation.races?.forEach(r => data.validRaces.add(r.name));
        charCreation.backgrounds?.forEach(b => data.validBackgrounds.add(b.name));
    } catch (e) {
        console.warn('⚠️  Could not load characterCreation.json:', e.message);
    }

    // Load items data
    try {
        const items = JSON.parse(
            fs.readFileSync(path.join(CONTENT_DIR, 'items.json'), 'utf8')
        );

        // Items can be in different categories
        const categories = ['weapons', 'armor', 'potions', 'consumables', 'treasure', 'misc', 'adventuring', 'tools'];
        categories.forEach(category => {
            items[category]?.forEach(item => data.validItems.add(item.id));
        });
    } catch (e) {
        console.warn('⚠️  Could not load items.json:', e.message);
    }

    return data;
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateAdventure(adventureFile, refData) {
    const filePath = path.join(CONTENT_DIR, adventureFile);

    if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping ${adventureFile} (file not found)`);
        return null;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📜 Validating: ${adventureFile}`);
    console.log('='.repeat(60));

    const adventure = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const encounters = adventure.encounters || [];

    const errors = [];
    const warnings = [];

    // Build encounter ID map
    const encounterIds = new Set(encounters.map(e => e.id));
    const encounterMap = new Map(encounters.map(e => [e.id, e]));

    // -------------------------------------------------------------------------
    // 1. Validate References
    // -------------------------------------------------------------------------
    encounters.forEach(encounter => {
        const ctx = `Encounter "${encounter.id}"`;

        // Check options
        encounter.options?.forEach((option, idx) => {
            const optCtx = `${ctx} → Option "${option.id}"`;

            // nextEncounterId
            if (option.nextEncounterId && !encounterIds.has(option.nextEncounterId)) {
                errors.push(`${optCtx}: Invalid nextEncounterId "${option.nextEncounterId}"`);
            }

            // successNextEncounterId
            if (option.successNextEncounterId && !encounterIds.has(option.successNextEncounterId)) {
                errors.push(`${optCtx}: Invalid successNextEncounterId "${option.successNextEncounterId}"`);
            }

            // failureNextEncounterId
            if (option.failureNextEncounterId && !encounterIds.has(option.failureNextEncounterId)) {
                errors.push(`${optCtx}: Invalid failureNextEncounterId "${option.failureNextEncounterId}"`);
            }

            // firstTimeEncounterId
            if (option.firstTimeEncounterId && !encounterIds.has(option.firstTimeEncounterId)) {
                errors.push(`${optCtx}: Invalid firstTimeEncounterId "${option.firstTimeEncounterId}"`);
            }

            // requiresVisitedEncounterId
            if (option.requiresVisitedEncounterId && !encounterIds.has(option.requiresVisitedEncounterId)) {
                errors.push(`${optCtx}: Invalid requiresVisitedEncounterId "${option.requiresVisitedEncounterId}"`);
            }

            // Validate skill names
            if (option.skill && !VALID_SKILLS.includes(option.skill)) {
                errors.push(`${optCtx}: Invalid skill "${option.skill}"`);
            }

            // Validate ability names
            if (option.ability && !VALID_ABILITIES.includes(option.ability)) {
                errors.push(`${optCtx}: Invalid ability "${option.ability}"`);
            }

            // Validate class requirements
            if (option.requiresClass && !refData.validClasses.has(option.requiresClass)) {
                warnings.push(`${optCtx}: Unknown class "${option.requiresClass}"`);
            }

            // Validate race requirements
            if (option.requiresRace && !refData.validRaces.has(option.requiresRace)) {
                warnings.push(`${optCtx}: Unknown race "${option.requiresRace}"`);
            }

            // Validate background requirements
            if (option.requiresBackground && !refData.validBackgrounds.has(option.requiresBackground)) {
                warnings.push(`${optCtx}: Unknown background "${option.requiresBackground}"`);
            }

            // Validate item grants
            option.grantsItemIds?.forEach(itemId => {
                if (!refData.validItems.has(itemId)) {
                    warnings.push(`${optCtx}: Unknown item "${itemId}"`);
                }
            });
        });

        // Check skill check on encounter level
        if (encounter.skillCheck) {
            if (encounter.skillCheck.skill && !VALID_SKILLS.includes(encounter.skillCheck.skill)) {
                errors.push(`${ctx}: Invalid skillCheck.skill "${encounter.skillCheck.skill}"`);
            }
            if (encounter.skillCheck.ability && !VALID_ABILITIES.includes(encounter.skillCheck.ability)) {
                errors.push(`${ctx}: Invalid skillCheck.ability "${encounter.skillCheck.ability}"`);
            }

            // Validate reward items
            encounter.skillCheck.rewardItemIds?.forEach(itemId => {
                if (!refData.validItems.has(itemId)) {
                    warnings.push(`${ctx}: Unknown skillCheck reward item "${itemId}"`);
                }
            });
        }
    });

    // -------------------------------------------------------------------------
    // 2. Reachability Analysis (BFS - memory efficient)
    // -------------------------------------------------------------------------
    const startEncounter = encounters[0]?.id;
    const reachable = new Set();

    if (startEncounter) {
        const queue = [startEncounter];

        while (queue.length > 0) {
            const encounterId = queue.shift();
            if (reachable.has(encounterId)) continue;
            reachable.add(encounterId);

            const encounter = encounterMap.get(encounterId);
            if (!encounter) continue;

            // Collect all possible next encounters
            encounter.options?.forEach(option => {
                if (option.nextEncounterId && !reachable.has(option.nextEncounterId)) {
                    queue.push(option.nextEncounterId);
                }
                if (option.successNextEncounterId && !reachable.has(option.successNextEncounterId)) {
                    queue.push(option.successNextEncounterId);
                }
                if (option.failureNextEncounterId && !reachable.has(option.failureNextEncounterId)) {
                    queue.push(option.failureNextEncounterId);
                }
                if (option.firstTimeEncounterId && !reachable.has(option.firstTimeEncounterId)) {
                    queue.push(option.firstTimeEncounterId);
                }
            });
        }
    }

    // Find orphaned encounters
    const orphaned = encounters.filter(e => !reachable.has(e.id));
    orphaned.forEach(e => {
        warnings.push(`Orphaned encounter "${e.id}" - not reachable from start`);
    });

    // -------------------------------------------------------------------------
    // 3. Dead End Detection
    // -------------------------------------------------------------------------
    encounters.forEach(encounter => {
        // Check if any option has an exit
        const hasExit = encounter.options?.some(option => {
            return option.endsAdventure ||
                (option.nextEncounterId && !option.stayInEncounter) ||
                option.successNextEncounterId ||
                option.failureNextEncounterId;
        });

        // If no exit and not repeatable, it might be a dead end
        if (!hasExit && !encounter.repeatable) {
            // Check if any option ends the adventure
            const endsAdventure = encounter.options?.some(o => o.endsAdventure);
            if (!endsAdventure && encounter.options?.length > 0) {
                warnings.push(`Potential dead end: "${encounter.id}" has no outbound paths`);
            }
        }
    });

    // -------------------------------------------------------------------------
    // 4. Find Endings Count (simple count, not full path enumeration)
    // -------------------------------------------------------------------------
    let endingCount = 0;
    encounters.forEach(encounter => {
        encounter.options?.forEach(option => {
            if (option.endsAdventure) {
                endingCount++;
            }
        });
    });

    // -------------------------------------------------------------------------
    // 5. Hub Detection (encounters with many inbound links)
    // -------------------------------------------------------------------------
    const inboundCount = new Map();
    encounters.forEach(e => inboundCount.set(e.id, 0));

    encounters.forEach(encounter => {
        const targets = new Set();
        encounter.options?.forEach(option => {
            if (option.nextEncounterId) targets.add(option.nextEncounterId);
            if (option.successNextEncounterId) targets.add(option.successNextEncounterId);
            if (option.failureNextEncounterId) targets.add(option.failureNextEncounterId);
            if (option.firstTimeEncounterId) targets.add(option.firstTimeEncounterId);
        });
        targets.forEach(targetId => {
            if (inboundCount.has(targetId)) {
                inboundCount.set(targetId, inboundCount.get(targetId) + 1);
            }
        });
    });

    const hubs = [...inboundCount.entries()]
        .filter(([id, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // -------------------------------------------------------------------------
    // 6. Generate Report
    // -------------------------------------------------------------------------
    const stats = {
        totalEncounters: encounters.length,
        reachableEncounters: reachable.size,
        orphanedEncounters: orphaned.length,
        endingOptions: endingCount,
        errorCount: errors.length,
        warningCount: warnings.length
    };

    // Print errors
    if (errors.length > 0) {
        console.log('\n❌ ERRORS:');
        errors.forEach(e => console.log(`   • ${e}`));
    }

    // Print warnings (limit to 15)
    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        const displayWarnings = warnings.slice(0, 15);
        displayWarnings.forEach(w => console.log(`   • ${w}`));
        if (warnings.length > 15) {
            console.log(`   ... and ${warnings.length - 15} more warnings`);
        }
    }

    // Print stats
    console.log('\n📊 STATISTICS:');
    console.log(`   • Total encounters: ${stats.totalEncounters}`);
    console.log(`   • Reachable from start: ${stats.reachableEncounters}`);
    console.log(`   • Orphaned encounters: ${stats.orphanedEncounters}`);
    console.log(`   • Adventure endings: ${stats.endingOptions}`);

    // Print hubs
    if (hubs.length > 0) {
        console.log('\n🔀 HUB ENCOUNTERS (most connected):');
        hubs.forEach(([id, count]) => console.log(`   • "${id}" (${count} inbound links)`));
    }

    // Coverage
    const coverage = (stats.reachableEncounters / stats.totalEncounters * 100).toFixed(1);
    console.log(`\n   📈 Coverage: ${coverage}%`);

    // Status
    if (errors.length === 0 && warnings.length === 0) {
        console.log('\n✅ PASSED - No issues found!');
    } else if (errors.length === 0) {
        console.log(`\n⚠️  PASSED WITH WARNINGS - ${warnings.length} warning(s)`);
    } else {
        console.log(`\n❌ FAILED - ${errors.length} error(s), ${warnings.length} warning(s)`);
    }

    return { errors, warnings, stats };
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
    console.log('🎲 D&D Campaign Validator');
    console.log('========================\n');
    console.log('Loading reference data...');

    const refData = loadReferenceData();
    console.log(`   ✓ ${refData.validClasses.size} classes`);
    console.log(`   ✓ ${refData.validRaces.size} races`);
    console.log(`   ✓ ${refData.validBackgrounds.size} backgrounds`);
    console.log(`   ✓ ${refData.validItems.size} items`);

    let totalErrors = 0;
    let totalWarnings = 0;
    let filesValidated = 0;

    ADVENTURE_FILES.forEach(file => {
        const result = validateAdventure(file, refData);
        if (result) {
            totalErrors += result.errors.length;
            totalWarnings += result.warnings.length;
            filesValidated++;
        }
    });

    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Files validated: ${filesValidated}`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log(`   Total warnings: ${totalWarnings}`);

    if (totalErrors > 0) {
        console.log('\n❌ VALIDATION FAILED\n');
        process.exit(1);
    } else if (totalWarnings > 0) {
        console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS\n');
        process.exit(0);
    } else {
        console.log('\n✅ ALL CAMPAIGNS VALIDATED SUCCESSFULLY!\n');
        process.exit(0);
    }
}

main();
