# Enemy Data Integration Plan

## Current Use
- Loaded via `src/utils/enemies.ts` and surfaced in `CombatEncounter`.
- Fields used today: `id`, `name`, `hitPoints` (as current/max HP), `armorClass`, `attackBonus`, `damage`, `damageType`, `effectType`, `saveDC`, `traits` (limited logic: pack-tactics, sunlight-sensitivity, brute, undead-fortitude, knock-prone, nimble-escape), `savingThrowBonus`, `xpReward`.

## Data Not Yet Used
- Action metadata: `actions` array (toHit, reach/range, save blocks, descriptions).
- `legendaryActions`.
- Breath weapon details: `breathDC`, `breathDamage`, `breathType`.
- Defenses: `damageResistances`, `damageImmunities`, `damageVulnerabilities`, `conditionImmunities`.
- Stats: `abilityScores`, `savingThrows`, `skills`, `size`, `alignment`, `speed`, `senses`, `languages`, `challenge`, `statBlockSource`, `statBlockHeading`.

## Implementation Steps
1) **Display**: Add a “Stat Block” pane in combat showing full enemy info (size, type/alignment text, speed breakdown, senses, languages, defenses, condition immunities, challenge/XP, stat block source link).
2) **Action UI**: Render an enemy action list from `actions`, including tags (melee/ranged/save/special), hit bonus, reach/range, targets, damage, save DC/onSave/onFail text. Let GM pick/roll actions instead of hardcoded single attack.
3) **Legendary Actions**: If `legendaryActions` present, show a post-turn panel to spend 3 points per round; log chosen legendary action text.
4) **Breath Weapons**: When `breathDamage`/`breathType`/`breathDC` exist, surface a “Breath” option with recharge prompt and correct save/half logic.
5) **Defenses in Resolution**: Apply `damageResistances`/`Immunities`/`Vulnerabilities` and `conditionImmunities` when resolving weapon and spell damage/effects.
6) **Stat-Based Saves/Skills**: Use `savingThrows` and `skills` for enemy save rolls and contested checks; default to ability modifiers from `abilityScores` if present.
7) **Traits Coverage**: Expand trait handling beyond the current handful (e.g., Keen Senses advantage on Perception checks, Amphibious/Water Breathing, Spider Climb, Fly speeds affecting targeting).
8) **Multi-Speed & Movement**: Show and respect `speed` (walk/fly/swim/climb/burrow) in targeting cues; optionally gate certain actions by environment.
9) **Challenge/XP**: Prefer `challenge`/`xpReward` from the stat block when awarding XP; display CR in UI.
10) **Logging & Localization**: Pipe all new action/defense outcomes into combat log; add new strings to i18n files.

## Nice-to-Have
- Quick “copy stat block”/“open source” action using `statBlockSource` and `statBlockHeading`.
- Conditional automation toggles so DMs can opt-in to resistances/legendary logic.
