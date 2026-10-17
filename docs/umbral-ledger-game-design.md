# UMBRAL LEDGER
### Game Design Document — Concept & Pre-Production Bible (working title)

> A dark-fantasy stealth-action game about a shadow that was once part of a terrible man.
> **Shadow · Time · Fire**

**Status:** v0.2. Your first round of decisions is applied (see 0.1), and the vertical slice (Prologue + Hollowmere) is built in Phaser (see Section 15). This document is still written to be argued with, edited, and cut down.

---

## 0. How to read this document

Every item is tagged so you can tell whose idea it is and who owns the decision:

| Tag | Meaning |
|---|---|
| **[KEEP]** | Your idea, recommended as-is. |
| **[RECOMMEND]** | My suggestion. Always followed by **Why**, so you can overrule it with full information. |
| **[PROBLEM]** | A risk in the idea as you described it, with a proposed fix. |
| **[YOUR CALL]** | A creative or business decision that belongs to you. I give options and a default, but the choice is yours. |
| **[DECIDED]** | You made the call. The text describes your decision. |

### Assumptions I made (correct me if wrong)

1. Your sentence about the "hidden future powerup" reads to me as: *the player finds a hidden power that shows an alternative future, and from then on the story can split into branches decided by the player's choices plus a luck/random factor.* I've built the **Foresight system** (Section 4.6) around that. If you meant something different, that section is the one to rewrite.
2. "We" means a small team (not a studio). I've sized every recommendation for a small team and flagged the places where ambition outruns that.
3. Target platform is PC first (keyboard + gamepad). Console/mobile are decisions in Section 9.
4. The game is single-player and story-driven, roughly 12–18 hours for a first playthrough.
5. I'm using the working title **UMBRAL LEDGER** (the Entity keeps a ledger of souls). Rename freely.

### 0.1 Decision log (v0.2)

These are your answers to the v0.1 problems, and where each one changed the document.

| Item | Your decision | Where it lives now |
|---|---|---|
| P1 Scope | Build the vertical slice first so look and feel can change cheaply. Dev mode must let you jump to any checkpoint. The MVP comes later, before the trailer. | P1, 7.1, Section 15 |
| P2 Branches | Most branch points are Light or Heavy. Only a few Keystones, and only in a few maps that are real breakpoints in the story. | P2, 3.8, 4.6, 4.10 |
| P3, P4 | Accepted as written (Threads, findable Stillpoints, Fate Viewer, world replay). | P3, P4, 4.8 |
| P5 Endings | The worlds are NOT really saved. Exactly one fully bad ending where nothing the player did was good. The other bad endings soften it (sleep, hypnosis, living under the villain). Exactly one happy ending where the villain is defeated, and it needs the perfect Keystone choices. | P5, 3.6 |
| P6 Objectives | Templates accepted, but worlds that hold a Keystone must feel different. | P6, 3.8 ("Breakpoint worlds") |
| P7 | Accepted. | P7, 4.4 |
| P8 Stealth | Readable, but the enemies must feel threatening from the start. The player is prey. Stealth must feel rewarding. | P8, 4.3 |
| P9 Light | At the start light is extremely dangerous (almost no resistance). Resistance grows as the game goes on. (You wrote this under P10; it answers P9.) | P9, 4.2 |
| P10 to P17 | Accepted as written, except P12 below. | as written |
| P12 Trust | There must be reasons to trust the Entity and reasons to suspect it. For most of the game, the reasons to trust must outnumber the reasons to suspect, so trusting it feels right. (You wrote this under P14; it answers P12.) | P12, 3.7 |
| The sin | The man's sin is deceit and murder together. No playable sin memories. | 3.2 |
| The hub | Section 3.3 kept as written. | 3.3 |
| Entity's motive | B + C. Option D ("borrowed eyes") is dropped. | 3.4 |
| Engine | Phaser for the vertical slice. | 6.1, Section 15 |

---

## 1. Executive summary

**High concept.** You die as a bad man. Something offers you a second chance: save dying worlds, and the pieces of your soul will be returned. But you aren't *him*. You are a sliver of his soul, a shadow, the part he refused to look at. Sunlight burns you. You're weak. And every world you save makes you more like the man you were.

**Elevator pitch.** *"Solo Leveling's power fantasy meets Re:Zero's despair, played as a stealth game where you are the shadow, the light is the enemy, and the kind voice guiding you is lying."*

**Genre.** Stealth-action with light RPG progression, mission-based "hub and worlds" structure, and a branching narrative. (Closest relatives: Dishonored, Hades' narrative structure, Hollow Knight's atmosphere, Darkest Dungeon's dread.)

**Perspective.** **2D side-view with real-time dynamic lighting, plus anime/manhwa-style cutscenes.** (Full reasoning in Section 5.1.)

**Length.** Prologue + 7 worlds + finale. ~60–90 minutes per world. 12–18 hours first playthrough; ~25 hours to see everything.

**Four design pillars** (every decision should be checkable against these):

1. **Weak and watched.** The player should feel like prey who slowly, uncomfortably becomes a predator.
2. **Light is the enemy; shadow is home.** The light/shadow system is the game's physics. Everything else hangs off it.
3. **Every future has a price.** Foresight shows you options, never free ones.
4. **Power is a trap.** Getting stronger and getting closer to the Entity's goal are the same thing, and the game should make the player feel that before they understand it.

**Unique selling points:**
- You are literally a shadow; the core mechanic is a *real* light/shadow simulation, not a stealth meter.
- A branching-futures system that is readable (odds shown) and fair (luck affects hardship, never the ending).
- Every world has a different *kind* of victory, not just a different skin.
- A twist that recontextualizes a mechanic, not just the story: the light resistance you earn world after world, which feels like healing, is the Entity fireproofing a vessel for itself.

---

## 2. Honest review of the original idea

### 2.1 What's strong (keep these)

- **[KEEP] The soul-sliver / shadow premise.** It gives you story, mechanic, and aesthetic in one idea. The player's weakness (sunlight damage) is explained by the story, and the story is delivered through the weakness. This is the best thing in your concept.
- **[KEEP] Power-return as progression.** "A piece of soul returns" is a better progression frame than XP. It gives each world a reason to exist and each reward a narrative weight.
- **[KEEP] The betrayal ending.** A guide who turns out to be the villain is a known trope, but it works *especially* well here because the player is mechanically dependent on the guide (more on this in 3.4).
- **[KEEP] Unique win condition per world.** This is what will stop the game feeling repetitive. It's also the most expensive thing in the design, so see P6 below.
- **[KEEP] Few, findable checkpoints.** This is the right instinct for tension. It needs careful handling (P3) but it is what makes a stealth game feel dangerous.
- **[KEEP] Weak-start, strong-later with the same enemies becoming easy.** The most satisfying feeling in games like this is returning to something that once terrified you and walking through it. Plan for it deliberately.

### 2.2 Problems (and fixes)

Severity: **Critical** = could stop the project. **High** = will hurt the game if ignored. **Medium** = worth fixing before production. **Low** = clarify.

---

#### P1 — Scope explosion · **Critical** · [DECIDED]

**What's wrong.** Each of these is, on its own, a full project: a stealth system, a combat system with combos, branching story, 7+ different worlds, a unique win-condition per world, many bosses, and 3D/anime cutscenes. Multiplied together it is far beyond what a small team can finish.

**Fix.**
- **[DECIDED]** Three nested games: a *Vertical Slice* (Prologue + World 1) first, then an *MVP* (Prologue + 3 worlds + finale) before the trailer, then the *Full Game* (7 worlds). Section 7 has the plan and the cut list.
- **[DECIDED]** The vertical slice has a **dev mode** that jumps to any Stillpoint or named spot, so a change to one area can be tested in seconds. It is built (Section 15).
- **Why:** Most indie games die from scope, not from bad ideas. A design that has a pre-agreed "what we cut first" list survives; one without it collapses at month 18.

---

#### P2 — Random luck deciding branches · **Critical (design) / High (cost)** · [DECIDED]

**What's wrong.** Two separate issues hide here.

*Design:* Players accept randomness in *moment-to-moment combat* (dodge rolls, loot), but they resent randomness in *narrative outcomes*, especially when it costs them 40 minutes. "I made the right choice and the dice killed my ally" feels like the game cheated. It's worse in a game with few checkpoints.

*Cost:* Every branch multiplies content. Four branch points with two outcomes each is 16 possible paths. This grows exponentially and cannot be authored.

**Fix.**
- **[DECIDED]** Three tiers (details in 4.6): **Light** (flavor changes, random), **Heavy** (structural changes, weighted random with shown odds and bad-luck protection), and **Keystone** (the few choices that decide the ending, **never random**). Almost every branch point in the game is Light or Heavy.
- **[DECIDED]** Only **three Keystones**, one per act, each in a **Breakpoint world** (Verith, the Choir of Glass, the Court of Masks). See 3.8.
- **[RECOMMEND]** Use **"diamond" branching**: paths split and then **reconverge**. Never a pure tree.
- **[RECOMMEND]** Vary content by **state, not by new maps**: same level, different time of day, different enemy placement, ally present or absent.
- **Why:** Luck should change *how hard or strange* the road is, never whether the player's moral choices count. And diamond structure is the only branching a small team can afford.

---

#### P3 — "Death ends the game" + hidden, few checkpoints · **High** · [DECIDED]

**What's wrong.** Taken literally ("game over = delete your save") combined with hard-to-find checkpoints, this means a player can lose an hour of progress to a mistake they couldn't have avoided because they didn't know where the checkpoint was. Souls-likes get away with this because the *rules are visible and consistent*; yours are hidden.

**Fix (accepted).**
- Checkpoints are **hard to reach but easy to recognize** once nearby (audio hum, particles, Foresight reveals them). At least one per world *before* any danger, one midway, and one before the climax; 1–2 optional hidden extras as exploration rewards.
- **Threads** (4.8): each world gives you a limited number. Death costs one and sends you back to the last Stillpoint. Run out and the world *fails* (is Fractured), with story consequences, not a delete-save.
- **[YOUR CALL]** A true **permadeath mode ("Oblivion")** for players who want exactly what you described.

---

#### P4 — One happy ending, gated by choices the player can't know about · **High** · [DECIDED]

**Fix (accepted, now with three Keystones).**
- Three Keystone choices, each with a *consistent moral shape* (3.8), each in a world that feels different from the others (a Breakpoint world).
- Light, non-spoilery feedback that *something mattered* (a candle in the hub), without saying what.
- A post-game **Fate Viewer** that reveals which choices were Keystones and what the alternatives would have done.
- **World replay** so a player can fix a Keystone without a full restart.
- **Why:** A hidden-requirement ending is only satisfying if the player can look back and say "oh, *that's* what the game was asking."

---

#### P5 — "Everything was for nothing" · **High** · [DECIDED]

**Your decision.** The worlds are **not** really saved. "Saving" a world was always preparing it for the Entity. There is exactly **one fully bad ending** where the player sees that nothing they did was good. The other bad endings soften that loss (the villain wins, but the people are put into a painless sleep, or live hypnotized, or live under the villain's rule). There is exactly **one happy ending**, where the villain is defeated, and it needs the perfect Keystone choices. Section 3.6 has the full ending table.

**The risk I still see, and how the design handles it.** An ending that says "nothing mattered" can make players feel the hours were wasted and stop caring. Two things keep it a tragedy instead of a shrug:
- **[RECOMMEND]** The fully bad ending is the result of the *worst* Keystone record (zero of three), so it reads as a consequence the player earned, not a cosmic joke on everyone.
- **[RECOMMEND]** Every bad ending shows the *specific* people the player met (Maren and Edrin from Hollowmere, the Cantor, the apprentice) in their fate. Loss is personal or it is nothing.
- **Why:** The despair you want (Re:Zero, Berserk) works because the audience cared about who was lost. Showing faces turns "nothing mattered" into "I failed *them*", which makes the true ending feel like a real victory.

---

#### P6 — A unique win condition per world = a unique game per world · **High (cost)** · [DECIDED]

**What's wrong.** "Evade enemies" in World 1, "retrieve an item" in World 2, "rescue someone" in World 4 each need distinct level design, scripting, UI, and failure states. This is the single biggest production multiplier in your idea.

**Fix.**
- **[DECIDED]** Build **objective templates** (Escort, Retrieve, Rescue, Boss, Negotiate, Infiltrate/Investigate, Survive) in the engine **once**, and reuse each across several worlds with different content.
- **[DECIDED]** One **shared moment-to-moment toolkit** (hide, strike, step, light, foresight) so the *verbs* never change, only the *goal* does.
- **[DECIDED, your addition]** The worlds that hold a Keystone are **Breakpoint worlds** and must feel different. 3.8 lists what makes them different (a bespoke set piece outside the template library, Foresight going blind at the Keystone, the Almoner unable to follow you there).
- **Why:** Players notice variety in goals. They don't notice that the underlying controls and systems are the same. Spending the bespoke budget only on the three Breakpoint worlds puts the expensive work exactly where the story turns.

---

#### P7 — "Complex abilities" vs. "players won't know how to use them" · **Medium** · [DECIDED]

**Complexity of *interaction* is good; complexity of *input* is bad.**

- A **small number of verbs** (hide, strike, step, cast, foresee) that **interact with each other and the environment**. See 4.4.
- No fighting-game motion inputs. Every combo is **two systems meeting**, not ten buttons in order.
- Teach each ability **alone first**, then in a combination, then let the player discover the third on their own. An in-game **Combo Codex** records combos as they're discovered. (The vertical slice has the first two: Ambush and Drop Kill.)

---

#### P8 — Stealth-as-the-early-game is hard to do well · **Medium** · [DECIDED]

**Your decision.** The enemies must feel **threatening** from the first minute, so the player feels like prey, and stealth must feel **rewarding**. Readability stays; "forgiving early enemies" is removed.

**How the design does both: readable but lethal.**
- **Lethal:** in light, a watcher fills its detection meter in about half a second up close. Lanternmen chase faster than you can run. One grab kills (costs a Thread).
- **Readable:** visible vision cones when you are near (with an inner band showing how close is too close even in shade), a meter that fills over their heads, a **"?" beat** before every **"!"** (the meter pauses for a third of a second at "?" so you can react), and a unique sound for every state change.
- **Fair escapes:** watchers walk on the ground and cannot climb, so going up is always an escape. Deep shade plus Merge makes you invisible even when they walk past, unless their own lantern lights you. Cover (pillars, crates, carts) is total shade.
- **Rewarding:** silent takedowns from behind or above, combos that are recorded in the Codex, the Whisper noticing when you slip away ("They have stopped looking."), and the "Unseen" bonus that improves Heavy branch odds.
- **Why:** Fear comes from consequences, not from hidden rules. The player should die often early and always know exactly why.

---

#### P9 — Light damage and progression · **Medium** · [DECIDED]

**Your decision.** At the start, light is **really bad** for the player: zero to little resistance. Resistance grows through the game.

- **[DECIDED]** A **Light Resistance ladder** with one step per returned fragment (4.2). At step 0, full light kills from full Substance in about 2.5 seconds and even Dim light hurts. By the end, the same light takes many times longer.
- **[RECOMMEND, kept]** A short **grace period** (0.3s at the start) and a **ramp**, so brushing the edge of a light is a warning, not a death. Light is also a **puzzle** (swinging lanterns, clouds over windows, a turning mill wheel, a rising sun), so the safe path changes with time.
- **Why it matters for the story:** this ladder is also the twist's mechanical reveal (3.4). The thing the player feels as "healing" is the Entity preparing a vessel that can survive in light.

---

#### P10 — Paranoia and "urges" can become a gimmick (or an annoyance) · **Medium**

Hallucinations and fake alerts are easy to overdo; players resent being lied to by the interface.

- **[RECOMMEND]** Make the dark-mind mechanics a real system (the **Craving + Whisper** system in 4.9) where *temptation has gameplay benefits* and *paranoia is mostly atmospheric*, with a few clearly-signaled "lies." Include accessibility toggles.
- **Why:** A temptation that gives you real power is a real choice. A temptation that's just a screen effect is decoration.

---

#### P11 — An unlikeable protagonist · **Medium**

A "bad person" protagonist can alienate players, especially if they never learn what he did.

- **[RECOMMEND]** Separate the **player character (the shadow)** from **the man (the sinner)**. The player is the part of him that *regrets*, the thing he buried. The player learns who the man was, memory by memory (Section 3.2).
- **Why:** Players will forgive a sinner they're investigating; they won't root for one they're asked to *be* from the first minute. It also makes the "urges" feel like something *contaminating* the player rather than something the player is.

---

#### P12 — "The kind guide is evil" is a known twist · **Medium** · [DECIDED]

**Your decision.** There must be real reasons to **trust** the Entity and real reasons to **suspect** it, and for most of the game the trust reasons outnumber the suspicion reasons, so trusting it feels right.

- **[DECIDED]** A planned **trust and suspicion budget per act** (3.7): Act I about 7 trust beats to 3 suspicion beats, Act II close to even, Act III flips.
- **[DECIDED]** Trust beats must be *real*: the Entity's advice is correct, it saves you ("Not yet. Again."), it gives you gifts that genuinely help. Suspicion beats are quiet and deniable (it casts no shadow, its own lamp hurts you, it says Hollowmere "will sleep easy now").
- **[RECOMMEND]** The reveal lands through a **mechanic**: the Light Resistance ladder (3.4).
- **Why:** If the player trusted it for a good reason, the betrayal hurts. If they never had a reason, it is just a twist.

---

#### P13 — Contradiction: "must rely on stealth at the start" vs. "unlocks stealth later" · **Low (clarify)**

I read the intent as: **stealth is the foundation from minute one**, and later unlocks add *alternative* approaches (combat, fire, time manipulation, diplomacy, disguise). That's how the doc is built.

---

#### P14 — Fire is a theme without a role · **Medium**

- **[RECOMMEND]** Fire is **the enemy of shadows and also the hero's cost**: lights hurt you, but you eventually learn **Black Ember**, a flame that casts *darkness* and burns *you* a little each time. Fire also appears as **checkpoint-adjacent imagery**, the **cause of the man's death**, the **man's own method** (3.2), and **the Entity's method** (3.4).
- **Why:** The three themes should each cost something and each reinforce the others: shadow = identity, time = knowledge, fire = sacrifice.

---

#### P15 — "Fantasy worlds" will blur together · **Medium**

- **[RECOMMEND]** Give every world: **one visual hook, one rule that's true only there, and one enemy type that exists only there.** (Section 3.5 does this for all seven.)

---

#### P16 — The power curve undermines tension · **Medium**

- **[RECOMMEND]** Tension has to *migrate* from outside to inside: as external threats shrink, the **Craving/Whisper** pressure grows (internal), and each new world introduces enemies that **counter the player's newest strength** (e.g., "Lightbinders" who dispel shade).

---

#### P17 — 3D or anime cutscenes are expensive · **Medium**

- **[RECOMMEND]** **Manhwa-style animated panels** (parallax, camera pushes, minimal animation, voiced) for most scenes, and **fully animated sequences only for 4–5 key beats**. Details in 5.3. (The vertical slice's cutscenes are manhwa panels built in code.)

---

#### 2.3 Summary of problems

| # | Problem | Severity | Fix in one line |
|---|---|---|---|
| P1 | Scope | Critical | Vertical slice (built) → MVP → full, with a cut list |
| P2 | RNG branching | Critical | 3 tiers; mostly Light/Heavy; 3 Keystones in Breakpoint worlds |
| P3 | Death + hidden checkpoints | High | Thread system; findable-but-fair checkpoints |
| P4 | Hidden good-ending requirements | High | 3 Keystones, hints, Fate Viewer, world replay |
| P5 | "All for nothing" | High | Worlds not saved; 1 true, 1 fully bad, softened bad endings; show faces |
| P6 | Unique goals per world | High | Templates; bespoke work only in Breakpoint worlds |
| P7 | Ability complexity | Medium | Complex interactions, simple inputs |
| P8 | Stealth readability | Medium | Readable but lethal; prey from minute one |
| P9 | Light | Medium | Near-zero resistance at start; Light Resistance ladder |
| P10 | Paranoia gimmick | Medium | Craving/Whisper with real mechanical stakes |
| P11 | Unlikeable protagonist | Medium | Player is the regretful sliver, not the sinner |
| P12 | Known twist | Medium | Trust outweighs suspicion until Act III; reveal through a mechanic |
| P13 | Stealth contradiction | Low | Stealth is the base; unlocks add alternatives |
| P14 | Fire has no role | Medium | Fire = cost, enemy, death, the man's method and the Entity's |
| P15 | Generic fantasy | Medium | Hook + rule + enemy per world |
| P16 | Power vs tension | Medium | Move tension inward; counter-enemies |
| P17 | Cutscene cost | Medium | Manhwa panels + 4–5 full animations |

---

## 3. Story & World Design

### 3.1 Premise

A man dies in a fire of his own making. He expected oblivion or punishment. Instead, **something** finds what remains: not the man, but a thin, cast-off fragment of his soul, a shadow. It offers a bargain: *go into dying worlds and save them, and for each one saved, a piece of the man returns to you. When you are whole, the ledger closes.*

The player is that fragment. It has no name, no face, and almost no memory. It burns in light. It can barely fight. And it is being sent to places that are far too dangerous for it.

### 3.2 The protagonist and the sin

**The player is the *Jungian shadow*: the part of the man he refused to look at.** Not his strength, not his charm, but his guilt, fear, and the faint capacity to regret. That is why the player starts weak: the man's strength and appetites are in the *other* pieces. **Getting stronger means becoming him.**

Each returned fragment gives a **new ability**, a **memory**, a step of **Light Resistance**, and a louder **Whisper**. The player's name is not known until the final fragment.

#### [DECIDED] The sin is deceit and murder, together

Instead of seven different sins, there is **one sin told in seven memories**, like a mystery the player solves about themselves. Each memory is a piece of the same night (and the years of lies around it). The order of the memories is the order of the reveal.

**Three ways to make deceit and murder one act.** Pick one; my default is A.

| Option | The sin | Why it fits | Weakness |
|---|---|---|---|
| **A. The hero of the fire** *(default)* | He set fire to a house to kill someone (a brother, a partner, a rival in an inheritance), then ran back into the smoke and was carried out a hero. The town thanked him for years. He died, years later, in a fire he set to destroy the last proof. | Fire, deceit and murder are one act. It **mirrors the Entity exactly** (it also starts the fire and plays the rescuer), which answers *why this soul*: like calls to like. The death in "a fire of his own making" finally means something. | The mirror with the Entity is strong, so some players will guess the motive earlier. That is fine if the clues are fair. |
| **B. The false witness** | He killed someone and then framed an innocent friend, who was hanged for it. Two deaths: one by his hand, one by his lie. | Deceit is the heavier sin, which suits a story about a lying guide. Strong Court of Masks material. | Fire becomes decoration again (P14). |
| **C. The poisoner-healer** | A trusted village healer who slowly poisoned a patient for their land while comforting the family. | Quiet, intimate horror. A "kind voice that is lying", like the Entity. | Hard to show in 2D action; mostly dialogue. |

**Default A, memory by memory:**

| Fragment | World | Memory (what the player learns) |
|---|---|---|
| 1 | Hollowmere | A crowd in the smoke shouting his name like a blessing. Soot on his hands. (Written in the vertical slice.) |
| 2 | Verith | Years of being thanked. The house he was given as a reward. |
| 3 | Ashfall | The night itself: he bought the lamp oil. |
| 4 | Choir of Glass | Who was inside the house, and that she trusted him. |
| 5 | Marrow | The inheritance he collected afterwards. |
| 6 | Court of Masks | A witness who almost told the truth, and how he silenced her with a lie. |
| 7 | The Last Noon | The second fire: the one that killed him, set to burn the last proof. |

**[DECIDED] No playable sin memories.** Memories are Tier 2 manhwa panels.

**Content note:** keep the violence implied and off-screen (8.2). The horror is that the town loved him.

### 3.3 The hub: the Hourglass Hall *(kept as written)*

An in-between place the player returns to between worlds.

- A vast, dim hall with a **great hourglass** in the center. Its sand level shows time remaining for the "bargain."
- **World portals** shaped like candle flames or cracked mirrors.
- **The Ledger**, a book where each world, each fragment, and each choice is recorded.
- **The Skill Altar** for spending Remnants on upgrades.
- **The Entity's presence**: a voice, a lamp, and eventually a figure.

**[RECOMMEND]** The hub must **change after each world**: new details, different lighting, small objects that appear or disappear. By the late game, the hub should feel subtly *wrong* in ways that reward re-examination.

### 3.4 The Entity

**Personality.** Warm, patient, gently humorous, endlessly reasonable. It praises the player, never rushes them, and always has a gentle explanation.

**Visual hook: the Entity casts no shadow.** In the vertical slice, robed statues with exactly the Entity's silhouette cast shadows in the same light. The Entity does not. Nobody mentions it.

**Name.** **The Almoner** (gives what is needed, keeps a ledger of what is owed), revealed as **the Horologer** in Act III. [YOUR CALL, default kept]

#### [DECIDED] Why saving worlds benefits the Entity: B + C

**What "D, borrowed eyes" meant, since it was unclear:** the idea was that the Foresight power was never yours. It was the Entity looking *through* you, because it cannot see its own future, and every future you peeked at taught it something. The twist would have been "the tool you trusted was spying for the villain." You chose not to use it, and B + C stands well on its own.

**The spine, B + C:**

> **B, the arsonist-firefighter.** The Entity *starts* each world's crisis (the borrowed light in Hollowmere's lanterns, the broken clock in Verith, the Cinder King's fire), then sends the shadow to resolve it. A world that has been "saved" by its agent is a world that has accepted it: the Entity claims it.
>
> **C, the soul is a key.** The Entity is shut outside the worlds it hunts. It needs a vessel that can stand inside them, and a soul shaped like its own fits best. The man was chosen because he did on a small scale exactly what the Entity does on a large one (3.2, option A). Each returned fragment completes the key.

**What replaces D's mechanical reveal: the Light Resistance ladder.** The player has felt each step of resistance as healing. In Act III the Horologer explains it, kindly: *a vessel for me must be able to stand in light.* Every step on the ladder was the Entity fireproofing its new body. The mechanic the player wanted most is the betrayal. In the final fight, the resistance you earned is used against you (the Horologer floods the arena with light that you can now survive, and that makes you visible to everything).

**Why B + C works:** B explains the worlds (why they were dying, and why "saving" them is not saving them), C explains the player (why this soul, why fragments), and the ladder makes the player feel it in their hands.

### 3.5 The seven worlds

Every world has: a **visual hook**, a **unique rule**, a **win condition** (different type each time), a **new ability**, a **memory**, and a **boss or climax**. Breakpoint worlds (with a Keystone) are marked.

> Estimated length per world: 60–90 minutes. Each world has **3–4 areas** (10–20 min each), **3 branch points** (2 Light + 1 Heavy), a climax, an intro and outro cutscene.

---

#### Prologue — The Hourglass Hall *(tutorial, ~15–20 min)* · BUILT

- **Purpose:** Teach movement, light damage, timing light, Merge behind cover, the silent strike, Stillpoints and Sand, Foresight, and the bargain.
- **Opening:** the man's death as manhwa panels. Then control passes to the shadow in a corner of the hall.
- **Win condition:** Reach the portal. Dying here costs no Thread: the Almoner pulls you back ("Not yet. Again."), a trust beat.

---

#### World 1 — HOLLOWMERE · *Evade & Escort* · BUILT

- **Visual hook:** A fog-bound village at night; the fog glows faintly orange.
- **Unique rule:** **The fog hides you, but dawn is coming.** Fog shortens how far the Lanternmen see. At dawn it burns off and the sun rises.
- **Crisis:** The **Lanternmen**, villagers possessed by borrowed light (the Entity's doing, clue for Act III).
- **Win condition:** Find Maren and Edrin in the chapel and lead them to the dawn gate. If either is taken, you lose a Thread.
- **Branches:** a Light branch at the fork (which road the extra Lanternman walks, and how thick the fog is), and a Heavy branch at the bell (ring it or not; visible odds shifted by your choices).
- **Climax:** The **Wick-Mother**, a giant of candles, wakes at first light. You cannot fight her. You run inside the long shadows of dawn, which shrink as the sun climbs.
- **New ability:** **Cling** (playable from World 2).
- **Memory 1:** the crowd in the smoke.

---

#### World 2 — VERITH, THE STOPPED CITY · *Retrieve (heist in a time loop)* · BREAKPOINT (K1)

- **Visual hook:** A city of clockwork towers and frozen citizens, caught mid-motion.
- **Unique rule:** **The city resets every 10 minutes.** You keep your memory; guards don't.
- **Win condition (Retrieve):** Collect **three gears** across loops and restore the clock.
- **Climax:** A **puzzle-duel with the Clockmaster**, who also remembers each loop.
- **New ability:** **Reprieve**, rewind the last ~3 seconds (1 charge per checkpoint).
- **Keystone K1** (3.8).

---

#### World 3 — ASHFALL · *Defeat the boss*

- **Visual hook:** A kingdom ablaze; towers like candles, rivers of embers.
- **Unique rule:** **Fire provides light but also hides you**, because smoke blurs detection.
- **Win condition (Boss):** Multi-phase fight with **the Cinder King**, the first time you *must* fight.
- **New ability:** **Black Ember**, a flame that casts **darkness**, can **snuff** lights or **burn** enemies, and **costs you Substance**.
- **Memory 3:** he bought the lamp oil. This is the one that stings.

---

#### World 4 — THE CHOIR OF GLASS · *Rescue* · BREAKPOINT (K2)

- **Visual hook:** A cathedral-city of stained glass and mirrors, flooded with colored light.
- **Unique rule:** **Light is everywhere, so shadows are what you build** (panels, curtains).
- **Win condition (Rescue):** Free the **Cantor**, then escort her through the cathedral.
- **Climax:** A **Lightbinder** who dispels shadows, in a room of mirrors.
- **New ability:** **Bind**.
- **Keystone K2.**

---

#### World 5 — MARROW · *Negotiate (broker a peace)*

- **Visual hook:** Bone-colored dunes and sunken mining towns.
- **Unique rule:** **Time of day matters.** Factions act differently at noon, dusk, and night.
- **Win condition (Negotiate):** Gather leverage through stealth, then broker terms. **No boss.** Failure is war.
- **New ability:** **Long Sight**, upgraded Foresight.
- **[DECIDED change]** The old K3 (betray a faction for a relic) is now this world's **Heavy branch**, not a Keystone.

---

#### World 6 — THE COURT OF MASKS · *Investigate & infiltrate* · BREAKPOINT (K3)

- **Visual hook:** A never-ending masquerade ball inside a palace of reflections.
- **Unique rule:** **Everyone wears a mask, and masks can be swapped.**
- **Win condition (Investigate):** Identify the real traitor. **Accuse the wrong person and the world fails.**
- **New ability:** **Veil**.
- **Keystone K3:** a witness from the man's past recognizes you (Memory 6 is about her).
- **Act III begins here.**

---

#### World 7 — THE LAST NOON · *Survive & sacrifice*

- **Visual hook:** A world where the sun has stopped at its peak. **No natural shade exists.**
- **Unique rule:** **Shade must be carried or created.**
- **Win condition:** Cross the scorched land, reach the **Sun-Warden**, and bring night, at the cost of a piece of your own shadow.
- **New ability:** **Eclipse**, temporary immunity to light.
- **Memory 7:** the second fire, the one that killed him.

---

#### Finale — THE HOURGLASS HALL · *Confrontation*

- **Setting:** The hub, transformed. The truth is revealed.
- **Gameplay:** A multi-phase encounter against **the Horologer**, who predicts and rewinds and floods the hall with light you can now survive (3.4). Never a "defeat it with damage" fight.
- **Outcome:** decided by your Keystone record (3.6).

---

### 3.6 [DECIDED] Endings

One happy ending. One fully bad ending. The bad endings in between soften the loss but the villain still wins. The ending is read from how many Keystones you got right, which is simple to learn in hindsight and easy for the Fate Viewer to explain.

| Ending | Trigger | What happens |
|---|---|---|
| **Noon** *(the only happy ending)* | **3 of 3** Keystones | You see through the Horologer, refuse to become its vessel, and burn the Ledger. It is defeated. The worlds are freed. You step into sunlight and nothing happens: a shadow with a name, standing in the light. |
| **The Long Sleep** *(bad, softened)* | 2 of 3 | The Horologer enters time through you. Your partial resistance bought one mercy: the people of every world you touched are put into a painless sleep, and they never wake. You see Maren and Edrin asleep at the dawn gate. |
| **The Lantern Peace** *(bad, softened)* | 1 of 3 | The worlds live on, hypnotized and content, carrying borrowed light for their new god. Everyone is calm. Nobody is free. The Lanternmen are everyone. |
| **Ash** *(the one fully bad ending)* | 0 of 3 | Everything you saved was being prepared, and now it is harvested. Each world burns, one by one, in the order you saved them, and the Ledger lists every name. Nothing you did was good. |
| **Unraveled** *(fail state)* | A world Fractured and abandoned, or permadeath | The soul fades. Can occur anywhere. |

**The true ending's image:** the game opens with light *hurting* the player. It closes with the player standing in sunlight *and nothing happens*. Because the Light Resistance ladder was the Entity's doing, the final image now means something extra: the player stands in the light *without* having become its vessel.

### 3.7 [DECIDED] Trust and suspicion budget

For most of the game the reasons to trust the Almoner must outnumber the reasons to suspect it.

| Act | Trust beats (real help) | Suspicion beats (quiet, deniable) | Ratio |
|---|---|---|---|
| I (Prologue, W1, W2) | Saves you on death in the Prologue; honest warnings about light and fire; correct advice (strike from behind, hide in the doorway when the bell rings); gives Sand and an Hour-Shard; "Not without them" when you leave survivors behind | Casts no shadow; its own lamp burns you in its chamber; "Hollowmere will sleep easy now" | about 7 : 3 |
| II (W3, W4, W5) | Warns you before the Cinder King's phases; comforts you after Memory 3 | The Ledger starts writing "collected" in small print; saved survivors appear in the Hall, grateful but afraid; at K2 it calls the Cantor's sacrifice "efficient" | about 4 : 4 |
| III (W6, W7, Finale) | It still helps, but explains less | The Whisper starts disagreeing with it; the hourglass sand runs up when you look away; its name changes in the Ledger; the light-resistance truth | flips |

**Rules:** a trust beat must actually help the player (correct advice, a real gift), or it is not trust. A suspicion beat must have an innocent reading the first time.

### 3.8 [DECIDED] Three Keystones in three Breakpoint worlds

Keystones are **never random**. Each has the same *moral shape*: **choosing another over your own power, or truth over comfort.**

| Key | World | The choice | "Wrong" path (power or comfort) | "Right" path (cost) |
|---|---|---|---|---|
| **K1** | Verith (Act I) | The city can be saved, but the Clockmaker's apprentice stays frozen forever. | Take the clean win. | Spend your last Sand to free her. No reward; weaker for Ashfall. |
| **K2** | Choir of Glass (Act II) | The Cantor offers to sacrifice herself to end the curse. The Almoner calls it efficient. | Accept; gain power. | Refuse, and complete a harder alternative mission. |
| **K3** | Court of Masks (Act III) | A witness from the man's past recognizes you. | Lie or silence her (the man's sin again). | Confess. |

**What makes a Breakpoint world feel different (your P6 addition):**
1. **Foresight goes blind at the Keystone.** For the only time in the game, the futures cannot be read: "Some futures can't be read. Only chosen." This also signals to the player that this choice is special without telling them why.
2. **The Almoner cannot follow you there.** At the Keystone moment it says it cannot see you (a trust beat on first reading: it respects your choice; a suspicion beat on replay: it could not steer you).
3. **One bespoke set piece** outside the objective templates (the loop-duel in Verith, the singing escort in the Choir, the trial in the Court). This is where the bespoke budget goes.
4. **The hub reacts:** after a Breakpoint world, a candle in the Hall is lit or stays dark.

### 3.9 Structure and pacing

| Act | Content | Emotional tone |
|---|---|---|
| **I** | Prologue, World 1–2 | Fear, wonder, dependence. The Entity is a mentor. |
| **II** | World 3–5 | Power, growth, temptation. First cracks. |
| **III** | World 6–7, Finale | Doubt, truth, choice. |

### 3.10 Inspirations (what to take, what to avoid)

| Work | Take | Avoid |
|---|---|---|
| **Solo Leveling** | Shadow motif, power fantasy, a "system" that may serve someone else | Pure power-fantasy without cost |
| **Re:Zero** | Return/rewind as emotional torture; despair from foreknowledge | Needlessly cruel loops with no payoff |
| **Mushoku Tensei** | A bad man given a second chance; redemption as *work* | Making him automatically deserving |
| **Omniscient Reader's Viewpoint** | Unseen watchers who benefit from the protagonist's struggle | Overly meta lore |
| **Tower of God** | Distinct "floors" with different rules | Overcomplicated rule sets |
| **The Beginning After the End** | Reincarnation worldbuilding, weight of a past life | Generic isekai tropes |
| **Berserk** | Dread, moral weight, a hero marked by his past | Gratuitous cruelty |
| **Dishonored** (game) | Stealth + supernatural abilities that interact | Over-reliance on lethal/non-lethal binary |
| **Hollow Knight** (game) | Mood, restraint, sparse text, world as mystery | Backtracking-heavy structure |
| **Darkest Dungeon** (game) | Dread, mental pressure as a mechanic | Punitive stress with no counterplay |

---

## 4. Gameplay Systems

### 4.1 Core loops

**Macro loop (per world):**
`Hub → choose world → briefing → 3–4 areas (with branches) → climax → outro → fragment returns (memory + ability + resistance) → hub changes → spend Remnants → next world`

**Micro loop (moment to moment):**
`Observe → (optionally) Foresee → Plan route through light and shade → Act → Adapt when it goes wrong`

### 4.2 Light and Shadow system (the game's physics)

**Three light states (plus a fire sub-type)** at the player's position:

| State | Meaning | Effect |
|---|---|---|
| **Shade** | Not lit by anything | Regenerate Substance, Merge hides you completely, enemies see you only up close |
| **Dim** | Weak or indirect light | Stealth reduced; **hurts slightly at the lowest resistance steps** |
| **Light** | Direct sun, lantern, window | Burns you; enemies see you from far away |
| **Fire** *(sub-type of Light)* | Open flame (candles, the Wick-Mother) | Burns harder |

**[DECIDED] Light Resistance ladder (values as built, all in `tuning.js`):**

| Step | When | Grace in light | Burn per second (start → after ramp) | Dim burn |
|---|---|---|---|---|
| 0 | Prologue, World 1 | 0.30s | 26 → 62 | 7/s |
| 1 | After World 1 | 0.40s | 22 → 52 | 4/s |
| 2 | After World 2 | 0.50s | 18 → 44 | none |
| 3–7 | Later worlds | 0.6s to 1.0s | down to 6 → 16 | none |

At step 0, full light kills from full Substance in about 2.5 seconds. Shade regrows Substance after 1 second without damage.

**One rule above all: "If it looks dark, it is dark."** One light query is shared by the renderer and the AI. In the build this is `getLightAt(x, y)`; the unit tests check that the drawn light and the computed light agree.

**Time as light:** swinging lanterns, clouds passing a window, a turning mill wheel whose spokes throw shadow blades, and a sunrise whose shadows shrink are all in the vertical slice.

### 4.3 Stealth system

**Three channels:** visibility (light at your position, distance, cone), noise (footsteps, landings, dashes, missed strikes), movement (moving targets are spotted faster).

**Enemy states:** `Unaware → Suspicious → Alert → Searching → (back to) Unaware`

**[DECIDED] Values as built (tune in `tuning.js` or live in the dev panel):**
- Vision range by the light you stand in: Light 380px, Dim 250px, Shade 130px. Fog cuts this by up to 45%.
- Detection fill time (medium distance): Light 0.55s, Dim 1.1s, Shade 1.8s. Faster up close, faster when you move.
- The "?" beat: the meter pauses 0.35s at Suspicious so you can react.
- Cone: 38° half-angle, 65° when alert or searching.
- Lanternmen walk at 62px/s and chase at 270px/s. You run at 240px/s. One grab kills.
- Merged in shade: invisible, even to a watcher walking past, unless its lantern lights you.
- Cover (pillars, statues, crates, carts, the well): inside it you are in total shade.
- Search: 10 seconds, then back to patrol.

**Readability rules (kept):** cones visible near you (with an inner band), unique sound per state, never straight from Unaware to Alert.

**Enemy archetypes (reusable across worlds, re-skinned):**

| Archetype | Senses | Counterplay |
|---|---|---|
| **Lantern-bearer** | Carries a moving light; poor hearing | Stay outside its radius; snuff the lantern (Ember) |
| **Hound** | Hearing & smell; ignores light | Don't make noise; use Echo decoys |
| **Seeker** | Detects unnatural shadow movement | Move only when other things move; Merge before it turns |
| **Ward** | Static light source or camera-like | Time your movement; destroy with Black Ember |
| **Brute** | Slow, strong | Stealth-kill from above (Cling); Bind |
| **Lightbinder** | Casts light and dispels shade | Break line of sight; high priority target |
| **Caster** | Ranged, creates light zones | Close distance through shade |

### 4.4 Abilities and combos

**Principle: Few verbs, many interactions.**

| Unlocked at | Ability | Function |
|---|---|---|
| **Start** | **Merge** | Hold down to melt into the floor; slow; silent; invisible in deep shade |
| **Start** | **Dim Strike** | Silent takedown from behind or from above, only on enemies that have not noticed you |
| **Start** | **Shade Step** | A short dash; crosses a strip of light; makes a little noise |
| **Start** | **Foresight (Sip)** | Stop time and watch a 3-second ghost replay of nearby watchers (1 Sand) |
| **After W1** | **Cling** | Attach to shaded walls and ceilings |
| **After W2** | **Reprieve** | Rewind ~3 seconds |
| **After W3** | **Black Ember** | Snuff lights or burn enemies; costs Substance |
| **After W4** | **Bind** | Link to an enemy's shadow |
| **After W5** | **Long Sight** | Longer Foresight |
| **After W6** | **Veil** | Borrow a shadow |
| **After W7** | **Eclipse** | Temporary immunity to light |

**Combos in the vertical slice:** **Ambush** (strike within 0.35s of leaving Merge: silent, nobody nearby notices) and **Drop Kill** (fall onto an unaware enemy). Both are recorded in the Combo Codex.

**Combo / interaction table for later worlds** (a sample; expand as you playtest):

| Combo | Result |
|---|---|
| **Merge + Dim Strike** | **Ambush**: silent, nearby enemies do not notice (built) |
| **Fall + Dim Strike** | **Drop Kill**: takedown from above (built; Cling makes it a ceiling attack later) |
| **Echo + Dim Strike** | **Lure & Punish**: draw an enemy away, then take it alone |
| **Black Ember (Snuff) + Merge** | **Blackout**: extinguish a light, creating a new hiding zone |
| **Black Ember (Burn) + Bind** | **Pyre Chain**: bound enemy ignites; fire spreads along connected shadows |
| **Bind + Foresight** | **Read**: see which bound enemy will move next |
| **Reprieve + any** | **Second Chance**: undo a failed attempt (limited) |
| **Eclipse + Black Ember** | **Corona**: area burst, temporary light immunity for allies |

**Controls (as built; gamepad in brackets):**

| Input | Action |
|---|---|
| A / D or arrows (left stick) | Move |
| Space / W / Up (A) | Jump (tap for a short hop) |
| Hold S / Down (stick down) | Merge |
| J (X) | Dim Strike |
| K (B) | Shade Step |
| Hold F (LT) | Foresight |
| E (Y) | Interact |
| Q (RB) | Survivors wait / follow |
| Esc (Start) | Pause and Ledger |

**[RECOMMEND]** When more abilities exist, **limit equipped abilities to 3**, swapped at Stillpoints.
**Why:** A limited loadout makes each choice meaningful and keeps the screen readable.

**Teaching rules:** introduce an ability in a safe space; again in a mildly dangerous space; combine it with a prior ability; let the player discover the third use; record it in the Codex.

### 4.5 Combat

Combat is *possible* but never the first answer early on. In World 1 there is no fight at all: a missed strike makes noise and a grab kills.

### 4.6 Foresight and the Branch system (the signature mechanic)

#### Layer 1: Micro-Foresight (built)

- **Hold F (or LT):** time stops, the world desaturates, and ghosts of every nearby watcher replay the next 3 seconds on a loop, with their view cones and dotted paths. Costs 1 Sand. Stillpoints reveal themselves with a beam of cold light while you look.
- The ghosts run the *same* movement rules as the real watchers, so the vision is honest. If you make noise, the real future changes.

#### Layer 2: Macro-Branches

| Tier | Randomness? | Examples | Per world |
|---|---|---|---|
| **Light** | Random | Which road a patrol walks; how thick the fog is | ~2 |
| **Heavy** | Weighted random with visible odds | Which Lanternmen answer the bell | ~1 |
| **Keystone** | **Never random** | K1–K3 (3.8) | 0–1 (3 total) |

**How Heavy branches work (built at the Hollowmere bell):**
1. Base odds (Favorable 50 / Mixed 35 / Unfavorable 15).
2. Visible modifiers shift the odds (in Hollowmere: "not seen since the square" +10; "Maren and Edrin waiting in shade" +15). You can close the panel, prepare, and come back.
3. Odds are shown as bands (Likely / Possible / Unlikely).
4. **[DECIDED change from v0.1]** Without the world's Hour-Shard you still see the bands. With it, Foresight also shows **one sampled vision** (which can be wrong) and the Sip lasts 6 seconds instead of 3. Why: the signature mechanic should always be visible, and exploration should still pay.
5. The roll is saved the moment it happens. Reloading a Stillpoint never re-rolls.
6. Hidden bad-luck protection makes the next Heavy roll kinder after an unlucky one.
7. **Reweave:** once per world, re-roll a Heavy result for the price of a Thread.

**The Foresight honesty rule:** *Foresight never lies about what could happen. It can be wrong about what will.*

**Diamond branching** (built at the Hollowmere fork: rooftops or cellars, reconverging at the square; the bell outcome changes who stands on the mill road and who waits in the square).

### 4.7 Resources

| Resource | Role | Recovers |
|---|---|---|
| **Substance** | Health; light burns it | In shade; at Stillpoints |
| **Sand** | Foresight charges (the Prologue hands you your first ones) | Pickups; Stillpoints |
| **Threads** | Deaths allowed per world | Per world |
| **Embers** | Black Ember charges *(later)* | Rare pickups |

### 4.8 Checkpoints, death, and failure

- **Stillpoints:** a faint cold crystal, motionless floating dust, a calm hum (the only calm sound in the game), and a cold glow that does not hurt. Resting restores Substance and Sand.
- **Hollowmere's Stillpoints:** start, midway (the Well), before the climax (the Millstone), and one hidden on the low road (the Root Cellar).
- **Threads:** 3 per world. Death returns you to the last Stillpoint with the world as it was then (except branch rolls, which stay rolled).
- **Failure:** 0 Threads and the world is **Fractured**, recorded in the Ledger. You can try again.
- **Never soft-lock silently:** if a survivor is taken, the game says so immediately and costs a Thread.

### 4.9 Craving, Whisper, and Paranoia (the dark-mind system)

In the vertical slice only the **Whisper** exists: a violet voice that drifts up from the player ("...that felt familiar." after the first takedown; "They have stopped looking." when you escape a search). The full system for later worlds:

#### Craving (the urges)

A hidden-ish meter that rises when the player spends time in light, takes "ruthless" actions, or accepts tempting offers. It lowers when the player resists, or does merciful or patient things.

#### Temptation (the gameplay hook)

**[RECOMMEND]** The **Whisper** offers *real* shortcuts:
- Kill an unarmed guard (silent, easy, but +Craving and a Ledger mark).
- Steal from a dying NPC (a useful item, but trust lost).
- Abandon an escort at a dangerous moment (saves you; world outcome worsens).
- Use a "dirty" ability variant (stronger, higher Craving).

**Rules:** temptations are **mechanically attractive**; the cost is **delayed and visible later**; temptations are **never required** for victory.
**Why:** If being "bad" is always strictly worse, it's not a choice.

#### Whisper (the voice)

- The man's voice grows louder with each fragment.
- Early: occasional flavor lines, mostly harmless.
- Mid: gives accurate but ruthless advice.
- Late: starts disagreeing with the Entity (an Act III suspicion beat, 3.7).

#### Paranoia (atmosphere with teeth)

- **Mostly cosmetic**: shadows that move wrongly, distant footsteps, a whisper at the edge of hearing.
- **A few clearly-signaled "lies"**: a false alert icon with a **distinct visual signature** the player can learn to tell apart.
- Intensity scales with Craving.

**[RECOMMEND] Accessibility:** toggles for flashing/strobing, hallucination intensity, jump-scares, and screen shake (screen shake is already toggleable in the slice).

### 4.10 Choices (budget and rules)

| Tier | Count (whole game) | Visibility |
|---|---|---|
| **Micro choices** | Many | Obvious, low stakes |
| **Branch choices** (Light & Heavy) | ~21 (3 per world) | Marked; Foresight preview |
| **Keystone choices** | **3** | Unmarked, but Breakpoint worlds feel different |

Max 3 options per choice. Every major choice is recorded in the Ledger in plain language.

### 4.11 Progression

1. **Fragment progression (fixed):** each fragment unlocks a specific ability, a memory, and a step of Light Resistance.
2. **Remnant upgrades (flexible):** spent at the Skill Altar. Respec is free.

No enemy level-scaling: Hollowmere's Lanternmen should feel trivial when they reappear in Marrow.

### 4.12 Bosses

| Boss | World | Type | Gimmick |
|---|---|---|---|
| Wick-Mother | 1 | Chase | Built: she lunges, her candles burn the ground ahead of her, and the sun rises; run inside the shrinking shadows; Shade Step keeps your lead |
| Clockmaster | 2 | Puzzle-duel | Remembers loops |
| Cinder King | 3 | Action | Fire phases; Black Ember snuffs braziers |
| Lightbinder Prelate | 4 | Action/puzzle | Mirrors |
| *(none)* | 5 | Negotiation | The "boss" is a conversation |
| The Unmasked | 6 | Deduction | A trial |
| Sun-Warden | 7 | Survival/sacrifice | Cross, then give up part of yourself |
| The Horologer | Finale | Multi-phase | Predicts, rewinds, and floods the hall with light you can now survive |

### 4.13 Level design principles

Hand-crafted. Layered routes. Verticality (watchers cannot climb). Safe pockets every 60–90 seconds of tension. Light puzzles. Warm = danger, cold = safe. Rule of three for teaching.

### 4.14 Time pressure

Avoid hard countdowns in exploration. Hollowmere uses event-driven time: the dawn only starts when you reach the end of the mill road with the survivors.

### 4.15 Accessibility and difficulty

Never rely on color alone: the light-state glyph changes shape (crescent, half disc, sun), the player's edge throws embers when burning, and an optional full HUD (H) shows a Substance bar. Screen shake can be turned off. Subtitles with speaker labels everywhere.

---

## 5. Presentation: Perspective, Art, Cutscenes, Audio, UI

### 5.1 2D or 3D?

**[DECIDED] 2D side-view gameplay with real-time dynamic lighting.** Cutscenes are **anime/manhwa-style 2D**, not 3D.

| Factor | 2D side-view | 2.5D (3D models on a 2D plane) | Full 3D |
|---|---|---|---|
| **Production cost** | Lowest | Medium | Highest |
| **Shadow/light readability** | **Excellent** (clear silhouettes, simple cones) | Good | Hard (camera, occlusion, clutter) |
| **Stealth AI complexity** | Low–medium | Medium | High (navigation, line-of-sight in 3D) |
| **Art per world** | Paint/stylize backgrounds | Model environments | Model + texture + light-bake everything |
| **Cutscene style match** | Seamless with 2D anime cutscenes | Mixed | Needs a separate 3D cinematic pipeline |
| **Small-team feasibility** | **High** | Medium | Low |

**Why 2D:**
1. **The protagonist is a shadow.** In 2D, silhouettes are crisp and the light/shade state can be read at a glance.
2. **Seven distinct worlds** are far cheaper as painted 2D environments than as seven 3D asset sets.
3. **Stealth AI** in 2D is dramatically simpler to build, debug, and balance.
4. **Style consistency:** one art pipeline, one visual language, for gameplay and cutscenes.

### 5.2 Art direction

Restricted palette: near-monochrome navy and black; warm colors are rare and mean danger or cost; gold means time, Stillpoints and the Entity; the player is ink black with a violet edge that frays when Substance is low. Hollowmere's accent is the orange fog.

Every image in the vertical slice is painted in code (no external assets, no copyright risk). Any texture can be swapped for real art by loading a PNG under the same key.

### 5.3 Cutscenes

Tier 1 (fully animated) for 4–6 key beats; Tier 2 (manhwa panels) for world intros, outros and memories; Tier 3 in-engine. The vertical slice uses Tier 2 panels for the opening, the Hollowmere title card, and the fragment return.

### 5.4 Audio

Silence as a weapon; adaptive layers that rise with detection; a clock tick under Foresight and the dawn chase that stops at Stillpoints; a unique sound for every detection state. In the vertical slice all audio is synthesized live, so it reacts continuously (burning sizzle that scales with the burn, heartbeat with danger, muffling when Substance is low).

### 5.5 UI/UX

Minimal HUD by default (Threads, Sand, light-state glyph). The Ledger is the pause menu. Choice UI: max 3 options, no timers.

---

## 6. Technical Notes

### 6.1 Engine

**[DECIDED] Phaser 3 (3.90) for the vertical slice.** Phaser is a web engine, so the game runs in any browser and a judge can play a link with no install. Phaser 3 was chosen over Phaser 4 because it is the version with years of tutorials and answers online, and its API is stable. The lighting is our own (Section 15), because "if it looks dark, it is dark" is too important to leave to a black box.

### 6.2 The light query

Built: `getLightAt(x, y)` returns `{ value, state, fire }` and is the only source of truth for damage and AI. The renderer draws from the same lights, occluders, falloff curve and blending maths.

### 6.3 AI

Watchers have a pure movement function (so Foresight can simulate them) and a separate perception step. Debug views for cones, meters and noise rings are in the dev panel.

### 6.4 Save system and branching state

One saved state: seed, Threads, Sand, flags since the last Stillpoint, branch outcomes, ledger, codex, stats. Branch rolls use a seeded stream per branch id, so the same run always rolls the same way.

### 6.5 Testing branches

The vertical slice has unit tests (lighting agreement, odds maths, roll determinism) and was checked with scripted bot runs through both fork routes and the dawn chase.

### 6.6 Platform

Web first for the jam (Phaser). PC desktop builds can come later.

---

## 7. Production Plan

### 7.1 Phases

| Phase | Goal | Status |
|---|---|---|
| **0. Prototype** | Prove the 30 seconds are fun | Folded into the slice |
| **1. Vertical slice** | Prologue + Hollowmere, Light and Heavy branches, Stillpoints, Threads, Foresight, dev mode | **Built** |
| **2. MVP** | Worlds 1–3 + Finale (cut-down) with endings, before the trailer | Next |
| **3. Beta** | All worlds, all Keystones, all endings | Later |
| **4. Polish** | Balance, accessibility, audio mix, localization | Later |

### 7.2 Per-world content checklist

3–4 areas · 3 branch points · 1 climax · intro and outro panels · 1 new ability · 1 signature rule · 1 unique enemy · 1 memory · 3+ Stillpoints · 1 hidden Hour-Shard · defined failure states · Ledger entries.

### 7.3 Rough effort (heuristic, adjust to your team)

| Item | Rough effort for a small team |
|---|---|
| Each additional world | 2–3 months |
| MVP (Worlds 2–3 + Finale on top of the slice) | 5–8 months |
| Full game | roughly 2.5–3.5 years part-time with 3–5 people |

**Caveat:** these are rules of thumb, not predictions. Your own data should replace them.

### 7.4 Cut list (in order of what to drop first)

1. Worlds 6 and 7 merged into one final world
2. Veil and World 6's investigation mechanic
3. Reweave and Fortune
4. Oblivion/Harrowing modes
5. Black Ember's Burn mode (keep Snuff)
6. Hidden Hour-Shards
7. Tier 1 cutscenes beyond the death and the ending

**Must not cut:** the light/shade system, readable stealth, Foresight, Stillpoints/Threads, the Entity's reveal through the Light Resistance ladder, and the three Keystones.

### 7.5 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep | High | Critical | Phase gates; cut list; one "owner" for scope |
| Stealth feels unfair | High | High | Readability rules; the "?" beat; playtest early and often |
| Light too punishing at step 0 | Medium | High | Grace and ramp; live sliders in the dev panel; cover everywhere |
| Branch content explosion | High | High | Diamond structure; variation by state |
| Foresight confusing | Medium | High | Strong visual language (time stops, ghosts, desaturation) |
| Twist predicted | Medium | Medium | Trust budget (3.7); reveal through the Light Resistance ladder |
| Players miss Keystones | High | Medium | Breakpoint worlds feel different; Fate Viewer; world replay |
| Art pipeline bottleneck | Medium | High | Procedural art now; swap textures by key later |
| Burnout | High | Critical | Realistic milestones; playable builds every month |

### 7.6 Playtesting

- Test with **strangers**, not teammates.
- **Watch, don't explain.** Record where players die, get confused, or quit.
- Metrics: time-to-first-death, deaths per area, Stillpoint discovery rate (especially the hidden Root Cellar), Foresight usage, Thread loss per world, and how often players read the bell's modifiers and change something before ringing.
- Ask: *"Why did you get caught?"* If the answer is "I don't know," that's a bug.

---

## 8. Content, Tone & Boundaries

### 8.1 Tone rules

- **Dread over shock.** Anticipation, silence, wrong-feeling spaces. Jump-scares rarely, if at all.
- **Restraint in text.** Short, plain, slightly ominous language. The Ledger and the Entity sound calm.
- **Moral weight over gore.** The sins matter because of *who they hurt*, not how graphically they are shown.
- **The player should feel *watched*:** NPCs who stare at the shadow, a hall that seems to listen.

### 8.2 Content rating

**[YOUR CALL]** Teen vs. Mature. **[RECOMMEND]** Upper Teen. Keep the worst acts **implied or off-screen**. For the sin (3.2): the murder and the fires stay off-screen; the horror is the town's gratitude.

### 8.3 Sensitive material

- Keep memories **specific and human-scale**, and avoid sexual violence or the abuse of children.
- Temptations are **moral choices with consequences**, never rewards the game celebrates.
- Include a **content notice** at game start and a way to skip intense scenes (cutscenes are skippable with Esc).

### 8.4 Writing guidelines

- **Environmental storytelling first**, dialogue second, exposition last.
- The Entity **never lies outright** until the reveal; it *omits*.
- Every NPC the player saves has **one specific, human detail**, so rescues feel personal.

---

## 9. Decisions That Are Yours

| # | Decision | Options | Status |
|---|---|---|---|
| 1 | Title | Many | Umbral Ledger (placeholder) |
| 2 | 2D, 2.5D, or 3D | See 5.1 | **Decided: 2D** |
| 3 | Team size and roles | n/a | Open |
| 4 | Engine | Phaser / Godot / Unity | **Decided for the slice: Phaser 3** |
| 5 | Platform(s) | Web / PC / console | Web first for the jam |
| 6 | Content rating | Teen / Mature | Default: upper Teen |
| 7 | The man's sin | 3.2 options A, B, C | **Decided: deceit + murder.** Version open; default A (the hero of the fire) |
| 8 | The Entity's name | Almoner / Horologer / Gardener / Auditor | Default: Almoner → Horologer |
| 9 | Why saving worlds benefits the Entity | A / B / C / D | **Decided: B + C** |
| 10 | Number of worlds | 4–7 | Default: 7, with a cut plan |
| 11 | Number of Keystones | 3 / 4 | **Decided: few.** Default: 3, one per act |
| 12 | Permadeath mode | Include / skip | Default: optional |
| 13 | Reweave | Include / skip | Included in the slice (1 per world, costs a Thread) |
| 14 | Foresight as core vs. found item | Core + hidden upgrades / fully hidden | Core + hidden upgrades (built) |
| 15 | Playable sin memories | Include / cut | **Decided: cut** |
| 16 | Hub feedback on Keystones | Subtle / none | Default: a candle |
| 17 | Fractured world consequence | Light / heavy | Default: medium |
| 18 | Voice acting scope | Full / partial / none | Default: partial |
| 19 | Release model | Premium / other | Default: premium |
| 20 | Endings | See 3.6 | **Decided: 1 happy, 1 fully bad, softened bad endings between** |
| 21 | Memory 1 text in the slice | Keep / rewrite | Written for option A; swap it in `story.js` if you pick B or C |

---

## 10. "First 30 Minutes" Script (as built)

| Time | What happens | What the player learns |
|---|---|---|
| 0:00 | Manhwa panels: the fire on Tanner's Row; the shadow peels away | Tone, the man, fire |
| 1:00 | Wake as a shadow in the Hall; the Almoner greets you | You are small; the voice is kind |
| 2:00 | A thin moonbeam | Light hurts, even weak light |
| 3:00 | A window beam that clouds over | Time the light |
| 4:00 | Pillar gallery, a guardian with a lamp | Merge behind cover |
| 6:00 | An acolyte facing away | Strike from behind (and Ambush) |
| 8:00 | A Stillpoint, the first Sand | Checkpoints, Sand |
| 9:00 | A guardian pacing between crates | Foresight |
| 11:00 | The Hourglass chamber; statues cast shadows, the Almoner does not | The bargain; Shade Step; first clue |
| 13:00 | Hollowmere title card; fog; the first Stillpoint | The stakes |
| 15:00 | A lamp and a low wall | Light edges, cover |
| 17:00 | The first Lanternman steps out of a doorway | You are prey |
| 20:00 | The fork: roofs or cellars | A Light branch |
| 25:00 | The chapel: Maren and Edrin | Escort, Wait and Follow |
| 30:00 | The bell | A Heavy branch with odds |

---

## 11. Templates

### 11.1 World sheet

```
WORLD NAME:
Breakpoint world (Keystone)? yes / no
Visual hook:
Unique rule:
Crisis (and how the Entity started it):
Win condition (type):
Fail states:
New ability (and safe teaching space):
Enemy types (new / reused):
Boss or climax:
Memory (which piece of the sin):
Branch points (Light / Heavy / Keystone):
Stillpoints (guaranteed / hidden):
Hidden Hour-Shard location:
Cutscenes (Tier 1 / 2 / 3):
Trust beats / suspicion beats placed:
Estimated length:
```

### 11.2 Branch point sheet

```
ID:
World / area:
Tier (Light / Heavy / Keystone):
Trigger and how it is signposted:
Options (max 3):
Base odds (if random):
Choice modifiers to odds (visible):
Outcomes (flags set):
Reconvergence point:
Content variation (by state, not new map):
Ledger entry:
Foresight preview content (bands / vision with Hour-Shard):
```

### 11.3 Ability sheet

```
NAME:
Unlocked at:
One-sentence function:
Cost (resource):
Safe teaching space:
Interactions with other abilities:
Counter-enemy that challenges it:
Failure/abuse case to check:
```

---

## 12. Quality Checklist (run before every milestone)

**Readability**
- [ ] Can a new player tell light from shade at a glance, without color alone?
- [ ] Can every detection event be explained by something the player saw or heard?
- [ ] Is "if it looks dark, it is dark" true everywhere? (Run `npm test` and the dev light grid.)

**Fairness**
- [ ] Is every checkpoint reachable and recognizable?
- [ ] Is every fail state announced clearly and immediately?
- [ ] Is there any way to soft-lock? (Run the bots.)
- [ ] Can luck ever change a Keystone or the ending? (It must not.)

**Narrative**
- [ ] Does each Keystone follow the moral shape, and does its world feel like a Breakpoint?
- [ ] Is the trust and suspicion budget (3.7) respected for the act?
- [ ] Does the Ledger accurately record every major choice?

**Feel**
- [ ] Is the first 30 seconds fun with no story attached?
- [ ] Does the player feel like prey early and stronger later?
- [ ] Does tension shift inward (Craving) as external threats shrink?

**Scope**
- [ ] Does the current plan have a written cut list?
- [ ] Is there a playable build every month?

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Substance** | The player's health: how much "shadow" remains |
| **Sand** | Foresight resource |
| **Stillpoint** | Checkpoint; a pocket where time holds still |
| **Thread** | A death allowance per world |
| **Fractured** | State of a world the player failed to save |
| **Remnants** | Currency for flexible upgrades |
| **Craving** | The meter of the man's appetite growing in the player |
| **Whisper** | The man's voice, growing louder per fragment |
| **Ledger** | The Entity's book; also the player-facing record of choices |
| **Keystone** | One of three non-random choices that decide the ending |
| **Breakpoint world** | A world that holds a Keystone and is built to feel different |
| **Light Resistance** | The per-fragment ladder that reduces light damage, and the Entity's vessel work |
| **Hour-Shard** | Hidden upgrade for Foresight (longer Sip, visions at branch points) |
| **Black Ember** | A flame that casts darkness and costs Substance |
| **Reweave** | Once per world, re-roll a Heavy branch for a Thread |

---

## 14. One-page recap

1. **2D** with dynamic lighting; **manhwa-style cutscenes**.
2. **Protect the core:** light/shade rules, readable but lethal stealth, Foresight, Stillpoints, the reveal, three Keystones.
3. **Luck affects hardship, never meaning.** Keystones are never random.
4. **Branch like a diamond;** vary content by state.
5. **Death costs Threads, not saves.** A failed world is Fractured.
6. **Power is the trap:** each fragment is an ability, a memory, a louder Whisper, and a step of Light Resistance that the Entity wanted you to have.
7. **The Entity casts no shadow.** Trust outweighs suspicion until Act III.
8. **One happy ending, one fully bad ending,** softened bad endings between, all read from the Keystone record.
9. **The true ending flips the opening:** light burns you at the start; at the end you stand in it as yourself.

---

## 15. Vertical slice (built)

**What it is:** the Prologue and Hollowmere, playable end to end in a browser, in the `umbral-ledger` Phaser project.

**What is implemented:** the shared light query and renderer (lanterns, windows, candles, swinging lamps, a turning mill wheel, a directional dawn sun with real shadows), the Light Resistance ladder at step 0, Merge, Dim Strike with Ambush and Drop Kill, Shade Step, readable but lethal watchers (Lanternmen, guardians, an acolyte), survivors with Wait/Follow, Foresight ghosts, the Light branch at the fork, the Heavy branch at the bell with modifiers, bands, a vision with the Hour-Shard, saved rolls and Reweave, Stillpoints including a hidden one, Threads and Fractured worlds, the Wick-Mother dawn chase, manhwa panel cutscenes, the Ledger and Combo Codex, synthesized adaptive audio, and a dev panel (press the backtick key) with checkpoint jumps, cheats, debug views, forced branch outcomes and live tuning sliders.

**What is deliberately missing:** Cling and later abilities, the hub between worlds, Craving and Paranoia, Remnants and the Skill Altar, gamepad remapping, and Keystones (Hollowmere is not a Breakpoint world).

*End of document. v0.2. Edit, cut, and argue.*
