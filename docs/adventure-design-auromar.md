# Adventure Design: The Sanctum of the Flayed God (Epic Scale)

## Overview
**Title:** The Sanctum of the Flayed God
**Estimated Playtime:** 6-8 Hours (Mini-Campaign)
**Level Range:** 4-6
**Theme:** Gothic Horror, Dark Fantasy, Occultism, Body Horror.
**Scale:** **Epic**. This adventure contains ~155 distinct encounters/nodes.
**Structure:** Hub-and-Spoke with **5 Massive Branching Paths** (mini-dungeons).

## Story Hook
*   **The Premise:** The **Sanguine Pontiff** has awakened the **Temple of Xylos**.
*   **The Goal:** Stop the *Rite of the Black Sun*.
*   **The Scale:** To reach the Pontiff, you must navigate one of the "Cardinal Wings" of the Cathedral. Each is a sprawling dungeon/social web in itself.

## The 5 Mega-Paths (Act 3)
Each path is a self-contained story arc with at least 25 nodes.

### 1. Path of the Martyr (The Wing of Sorrow)
*   **Theme:** Escort Mission & Moral Endurance.
*   **Flow:** You find the "Penitent's Walk," a gauntlet where victims are marched.
*   **Content (25+ Nodes):**
    *   Find and liberate diverse prisoners (Nobles, Peasants, Captured Paladins).
    *   Manage a "Survivor Group" mechanic (Keep them alive through traps).
    *   *The Test of Faith:* Puzzles where you must sacrifice HP/Resources to open doors for others.
    *   *Boss:* The Jailer (A demon that feeds on despair).

### 2. Path of the Inquisitor (The Wing of Judgment)
*   **Theme:** Combat Gauntlet & Boss Rush.
*   **Flow:** A direct assault up the "Stairs of Ascendance" guarded by the Elite.
*   **Content (25+ Nodes):**
    *   5 Distinct Floors, each with unique tactical combats.
    *   *The Hall of Mirrors:* Fight shadow-versions of previous bosses.
    *   *The Armory:* Loot unique gear to help in the next fight.
    *   *Mini-Bosses:* The Three High Priests (War, Famine, Death).
    *   Strategy: Rest points are scarce; resource management is key.

### 3. Path of the Shadow (The Rafters & Flutes)
*   **Theme:** Platforming, Stealth, & Verticality.
*   **Flow:** Navigating the unstable architecture *above* the cathedral.
*   **Content (25+ Nodes):**
    *   Navigating the "Organ Pipes" (Sonic puzzles/hazards).
    *   Stealth challenges: Avoid the "Gargoyle Watchers".
    *   *The Nest:* A sub-plot involving the Harpies living in the roof.
    *   *Assassination:* Setup traps to drop chandeliers on enemies below.
    *   High risk of falling (instant death saves).

### 4. Path of the Acolyte (The Inner Coven)
*   **Theme:** Social Deduction & Deep Lore.
*   **Flow:** Infiltrating the cult as a member. 
*   **Content (25+ Nodes):**
    *   *The Barracks:* Live among the cultists. Learn their hierarchy.
    *   *Ritual Tasks:* Perform mini-games (chanting, carving) to gain Rank.
    *   *Sabotage vs Loyalty:* Choose to sabotage rituals subtly or frame rivals.
    *   *The Feast:* A deeply disturbing social event where you must maintain cover.
    *   *Outcome:* You can literally walk up to the Boss and stab him in the back (skip Phase 1).

### 5. Path of the Occultist (The Forbidden Library)
*   **Theme:** Puzzle Dungeon & Cosmic Horror.
*   **Flow:** Entering the "Library of Skin," a dimension folded inside the walls.
*   **Content (25+ Nodes):**
    *   Researching the "True Name".
    *   *The Book Dungeons:* Enter into cursed books to solve riddles.
    *   *Sanity Battles:* Non-combat encounters where you fight to keep your mind.
    *   *The Librarian:* A neutral entity you must bargain with.
    *   *Reward:* Banish the God entirely (Best Ending).

## General Adventure Flow

```mermaid
graph TD
    Start[Act 1: Entry (10 Nodes)] --> Hub[Act 2: The Nave Hub (15 Nodes)]
    
    Hub --> Choice{Choose Your Path}
    
    Choice --> Martyr[Path of Martyr (25 Nodes)]
    Choice --> Inquisitor[Path of Inquisitor (25 Nodes)]
    Choice --> Shadow[Path of Shadow (25 Nodes)]
    Choice --> Acolyte[Path of Acolyte (25 Nodes)]
    Choice --> Occultist[Path of Occultist (25 Nodes)]
    
    Martyr --> Boss[Act 4: The Climax (10 Nodes)]
    Inquisitor --> Boss
    Shadow --> Boss
    Acolyte --> Boss
    Occultist --> Boss
    
    Boss --> Endings{4 Endings}
```

## Rewards & Assets

### New Item Rewards
We will introduce **12 Unique Items** themed around Blood Magic and Sanity.

1.  **Shield of the Weeping Saint:** (Path of Martyr - Boss Drop)
    *   *Effect:* +2 AC. Can use Reaction to take damage intended for an adjacent ally.
2.  **Blade of the Purifier:** (Path of Inquisitor - High Priest Drop)
    *   *Effect:* Longsword +1. Deals extra Radiant damage to Undead/Fiends. Glows near blood magic.
3.  **Cloak of Whispers:** (Path of Shadow - Harpy Nest Chest)
    *   *Effect:* Advantage on Stealth. Once per day, turn invisible for 1 turn.
4.  **Ring of the Covenant:** (Path of Acolyte - Rank Up Reward)
    *   *Effect:* Cultists treat you as friendly. +2 Deception vs Religious fanatics.
5.  **Lens of Truth:** (Path of Occultist - Library Puzzle Reward)
    *   *Effect:* Reveals hidden magical text and invisible enemies.
6.  **Vial of The Sanguine God:** (Consumable - Found in Act 2)
    *   *Effect:* Heals 4d8 HP but adds +1 Corruption.
7.  **The Pontiff's Crosier:** (End Boss Drop - Evil/Chaos)
    *   *Effect:* Quarterstaff +2. Can cast *Vampiric Touch* 1/day.
8.  **Tear of the Martyr:** (End Boss Drop - Good)
    *   *Effect:* Wondrous Item. Revival Charm (Auto-revive to 1HP if downed).
9.  **Bone-Shard Dagger:** (Loot - Common)
    *   *Effect:* Dagger. On Crit, inflicts *Bleed* (1d4 dmg/turn).
10. **Robes of the Flayed:** (Loot - Occultist)
    *   *Effect:* AC 12 + Dex. Resistance to Necrotic damage.
11. **Gargoyle Stone Skin Potion:** (Loot - Shadow)
    *   *Effect:* Resistance to physical damage for 1 minute, but speed halved.
12. **Key of Bone:** (Story Item)
    *   *Effect:* Opens the Black Gate.

### Asset Requirements (Portrait Generation)

The following will need unique **Portrait Generation**:

**Primary NPCs (High Quality):**
1.  **The Sanguine Pontiff:** (Male, Lich-like but regal, red robes, gold mask).
2.  **Baron Krov (The Jailer):** (Male, huge muscular brute, executioner hood, scarred skin).
3.  **The Librarian:** (Female, Ghost/Specter, translucent, holding a chained book).
4.  **High Priest Vex:** (Male, Inquisitor armor, flaming mace).
5.  **Sister Elara:** (Female, Martyr/Guide NPC, ragged holy vestments).

**Monsters/Enemies:**
6.  **The Blood Avatar:** (The Phase 2 Boss - a monstrosity of gore and bone).
7.  **Cultist:** (Hooded figure with bone dagger).
8.  **Gargoyle Watcher:** (Stone demon with glowing eyes).
9.  **Flesh Golem:** (Stitched body horror construct).
10. **Harpy Matriarch:** (Gothic horror version of a harpy).
11. **Skeletal Knight:** (Heavily armored undead).

**Environment/Chests (Optional):**
12. **The Blood Font:** (A massive gothic font filled with blood).
13. **The Iron Maiden Chest:** (A chest that looks like a torture device).
