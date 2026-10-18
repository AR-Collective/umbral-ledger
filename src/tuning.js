// =====================================================================
// TUNING: every gameplay number lives here.
//
// Why one file: when a playtester says "the light kills me too fast" or
// "the Lanternmen are too easy", you should change ONE number in ONE place
// and see the result on the next reload. Nothing else in the code hardcodes
// these values. The dev menu (press the ` key) also edits many of them live.
// =====================================================================

export const TUNING = {
  // Screen size the game is designed for. The canvas scales to fit any window.
  view: { width: 1280, height: 720 },

  physics: {
    gravity: 1900,          // pixels per second squared while rising
    fallGravityMult: 1.45,  // falling pulls harder than rising: jumps feel snappy, not floaty
    maxFall: 1050,
  },

  player: {
    bodyW: 24, bodyH: 56,         // collision box while standing
    mergedH: 26,                  // collision box height while merged into the shade
    runSpeed: 232,
    mergedSpeed: 74,
    groundAccel: 2600, groundDecel: 3400, airAccel: 1800,
    jumpVelocity: 720,            // about 136 px high
    jumpCutVelocity: 380,         // releasing jump early cuts the arc here (a tap still hops)
    coyoteTime: 0.10,             // you can still jump this long after walking off a ledge
    jumpBuffer: 0.12,             // pressing jump this early before landing still counts
    stepUp: 18,                   // walk up ledges this tall without jumping (no snagging on small lips)
    dashSpeed: 600, dashTime: 0.15, dashCooldown: 0.85,
    strikeRange: 50, strikeCooldown: 0.45,
    ambushWindow: 0.35,           // striking within this many seconds of leaving Merge counts as an Ambush
    maxSubstance: 100,
    interactRange: 72,
  },

  // ---------------------------------------------------------------
  // LIGHT. Every light has a bright CORE and a faint HALO.
  //   Core  = Light: burns you, and watchers see you from far away.
  //   Halo  = Dim:   no damage, but watchers see you at mid range.
  //   Dark  = Shade: safe; merged in shade you are invisible.
  // The renderer draws exactly these zones, so what you see is what hurts.
  // ---------------------------------------------------------------
  light: {
    burnAt: 0.5,            // one light contributing this much = Light
    burnTotal: 0.8,         // or all lights together this much = Light
    dimAt: 0.1,             // below this total = Shade
    shape: {                // the falloff curve, as fractions of a light's radius
      coreEnd: 0.58,        // the bright core ends here...
      edgeEnd: 0.64,        // ...and has dropped to the halo by here (a visible edge)
      coreBottom: 0.74,     // brightness at the outer edge of the core
      halo: 0.24,           // brightness where the halo starts (fades to 0 at the radius)
    },
    glowMax: 0.3,           // "glow" lights (lit windows) never get brighter than this: they never burn
    occluderInset: 10,      // light soaks this far into walls and floors, so surfaces get a lit rim
    lightmapScale: 0.5,     // the light layer is drawn at half resolution (soft edges, cheaper)
    lightmapPad: 140,       // drawn this far past the screen edges so fast camera moves never show a seam
    visualGain: { burn: 0.68, beam: 0.6, glow: 0.75, safe: 0.55, sun: 0.42 },

    // Light Resistance: one row per returned soul fragment. Row 0 is the very start.
    // In Light you take one TICK of damage per interval (with a red flash), after a short grace.
    resistance: [
      { grace: 0.35, interval: 1.0, tick: 34, fireMult: 1.5 },  // 3 ticks (about 2.4 s) kill you
      { grace: 0.40, interval: 1.0, tick: 28, fireMult: 1.5 },
      { grace: 0.45, interval: 1.0, tick: 24, fireMult: 1.4 },
      { grace: 0.50, interval: 1.0, tick: 20, fireMult: 1.4 },
      { grace: 0.55, interval: 1.0, tick: 17, fireMult: 1.3 },
      { grace: 0.60, interval: 1.0, tick: 14, fireMult: 1.3 },
      { grace: 0.65, interval: 1.0, tick: 12, fireMult: 1.2 },
      { grace: 0.70, interval: 1.0, tick: 10, fireMult: 1.2 },
    ],
    tickResetAfter: 0.5,    // leave the light this long and the next exposure starts a fresh grace
    regenDelay: 1.2,        // seconds without damage before Substance regrows in Shade
    regenPerSec: 24,
    flashTime: 0.45,        // how long the red screen pulse of a damage tick lasts
  },

  stealth: {
    // How far a watcher can see you, by the light YOU are standing in.
    range: { light: 400, dim: 260, shade: 110 },
    cone: 40, alertCone: 70,     // half-angle of the vision cone in degrees
    // Near sense: this close, a watcher notices you whatever the light (you are
    // practically touching). Only merging INSIDE cover (a crate, cart, pillar) hides you.
    near: { front: 72, back: 36, height: 80, fillTime: 0.22 },
    // Merging changes how visible you are, per light state. 0 means invisible.
    merge: { light: 1.0, dim: 0.5, shade: 0.0 },
    // Seconds to fill the detection meter at medium distance, per light state.
    fillTime: { light: 0.5, dim: 1.0, shade: 1.8 },
    movingMult: 1.25, stillMult: 0.8,
    searchMult: 1.5,             // already-searching watchers spot you faster
    suspiciousAt: 0.35,          // meter level that triggers the "?" state
    doubleTake: 0.35,            // seconds the meter pauses at "?" so you can react (fairness valve)
    decay: 0.25,                 // meter drain per second when they cannot see you
    loseTime: 1.3,               // alert watchers who lose sight this long start searching
    searchTime: 10,
    lookTime: 3.2,               // suspicious watchers look around this long before giving up
    callRadius: 340,             // an alert watcher wakes others this close
    fogVision: 0.45,             // full fog cuts vision range by this fraction
    survivorCrouchMult: 0.55,
    coneShowDistance: 440,       // vision cones are drawn when you are this close to a watcher
  },

  noise: {
    step: 60, landSoft: 70, landHard: 150, dash: 90, whiff: 130, takedown: 140, bell: 2400,
  },

  enemies: {
    // eyeH: eye height above the feet. The lantern's glow core (about 70 px) burns
    // and reveals anyone at the bearer's feet, so nobody can hide under a lantern.
    lanternman: {
      walk: 62, chase: 270, eyeH: 96, grab: 34, killable: true,
      lantern: { radius: 310, intensity: 0.95, spread: 34, glowRadius: 125, glowIntensity: 0.92 },
    },
    guardian: {
      walk: 55, chase: 175, eyeH: 128, grab: 36, killable: false,
      lantern: { radius: 330, intensity: 0.95, spread: 30, glowRadius: 135, glowIntensity: 0.9 },
    },
    acolyte: {
      walk: 40, chase: 150, eyeH: 46, grab: 28, killable: true, lantern: null,
    },
    // The Last Noon: a guardian sworn to the stopped sun. Strikes glance off
    // its armour; it takes three Black Embers, and an Eclipse staggers it.
    sunguard: {
      sprite: 'guardian', walk: 60, chase: 200, eyeH: 128, grab: 38, killable: false, hp: 3, tint: 0xffe2b0,
      lantern: { radius: 300, intensity: 0.95, spread: 28, glowRadius: 120, glowIntensity: 0.9 },
    },
  },

  // ---------------------------------------------------------------
  // ABILITIES returned by soul fragments (the final world has them all).
  // ---------------------------------------------------------------
  abilities: {
    // Black Ember: a bolt of black flame. Snuffs fires and lamps, burns enemies.
    ember: { cost: 7, minSubstance: 16, cooldown: 0.45, speed: 760, life: 0.9, damage: 1, radius: 16, splash: 70 },
    // Echo: a shadow clone that walks on and makes noise. Watchers chase it instead of you.
    echo: { cooldown: 7, life: 4.5, speed: 120, noise: 320 },
    // Eclipse: light cannot touch you for a while, and the Corona burst hits everything near.
    eclipse: { duration: 4.5, radius: 300, radius2: 400, stun: 2.6, killsToCharge: 4, slowmo: 0.35 },
    // Cling: slide down shaded walls and kick off them.
    cling: { slide: 110, kickX: 330, kickY: 700, lockTime: 0.2 },
    // Shadow Dash: the upgraded Shade Step cuts down weak enemies it passes through.
    dashCut: { width: 34 },
  },

  // When a world says grabs hurt instead of kill (the Last Noon), this much.
  grab: { damage: 25, knockback: 420, cooldown: 1.2 },

  // The Sun-Warden, boss of the Last Noon.
  warden: {
    cracks: 3,                 // hits on his exposed core to win
    staggerTime: 6.5,          // how long he kneels once his braziers are out
    lanceEvery: [2.6, 1.9, 1.4], lanceTell: 0.95, lanceWidth: 70, lanceDamage: 40,
    sweepEvery: [0, 9, 7], sweepTime: 3.2,
    summonEvery: [0, 0, 11],
    relightDelay: 1.5,
  },

  wickMother: {
    // She walks a little slower than you run, but her lunges make her faster
    // on average. Shade Step (dash) is how you keep your lead.
    speed: 205, catchUpSpeed: 270, catchUpDistance: 520,
    lungeEvery: [3.5, 5.5], lungeTell: 0.8, lungeDistance: 230, lungeTime: 0.5,
    lungeRange: 560,
    lightRadius: 430, lightIntensity: 0.9, coneRadius: 720, coneSpread: 28, coneIntensity: 0.95, coneDir: 48,
    startBehind: 430, startBehindUnlucky: 320,
  },

  survivor: { walk: 190, crouchWalk: 70, followGap: 52, hop: 600, giveUpDistance: 700 },

  foresight: {
    sipSeconds: 3,          // how far ahead a Sip looks
    glimpseSeconds: 6,      // with the Hollowmere Hour-Shard
    playbackSpeed: 2,       // the ghost replay loops this many times faster than real time
    desaturate: 0.85,
  },

  // The Last Noon: a sun stopped overhead, burning through the ash in shafts.
  noon: { sunIntensity: 0.42, elevation: 78 },   // below burnAt: open ground is Dim (seen, not burned)

  dawn: {
    startElevation: 12, endElevation: 45,  // sun angle in degrees during the chase
    duration: 26,                          // seconds from first light to full morning
    sunIntensity: 0.9,
  },

  camera: {
    lerpX: 0.11, lerpY: 0.07,
    lookAhead: 130,          // the camera leads you in the direction you face
    lookAheadRate: 2.2,
    offsetY: 170,            // your feet sit this far below the middle of the screen (about 3/4 down)
    groundFollow: true,      // the camera tracks the floor you stand on, not every jump
  },

  threads: { perWorld: 3 },
  sand: { max: 3 },

  // Heavy branch odds rules
  branches: {
    minChance: 5,           // no outcome is ever pushed below 5%
    badLuckBonus: 10,       // each unlucky Heavy roll adds this to the next Favorable
  },

  // Dev mode: set enabled to false for the trailer or judging build.
  dev: { enabled: true },
};

// Returns the resistance row for a given fragment count, clamped to the table.
export function resistanceFor(level) {
  const table = TUNING.light.resistance;
  return table[Math.max(0, Math.min(table.length - 1, level))];
}
