// =====================================================================
// STORY: every line of player-facing text lives here.
//
// Why: writers can rewrite the whole game's voice without touching code,
// and translating later means translating one file.
//
// Speakers:
//   entity  : the Almoner (the kind voice). Gold, bottom of the screen.
//   whisper : the man's voice inside you. Violet, drifts near the player.
//   maren / edrin : survivors. Shown above their heads.
//   hint    : control hints. Bottom left, plain.
//
// Trust and suspicion (design decision P12): for most of the game the reasons
// to TRUST the Almoner outnumber the reasons to suspect it. Lines tagged
// [TRUST] or [SUSPECT] in comments below are deliberate beats. The Prologue and
// Hollowmere together have 7 trust beats and 3 quiet suspicion beats.
// =====================================================================

export const SPEAKERS = {
  entity: { name: 'THE ALMONER', color: '#e8c372' },
  whisper: { name: '', color: '#b48cff' },
  maren: { name: 'Maren', color: '#e9d6c4' },
  edrin: { name: 'Edrin', color: '#d3dccb' },
  hint: { name: '', color: '#a9a6b8' },
};

export const LINES = {
  // ---------------- Prologue: the Hourglass Hall ----------------
  p_wake1: { speaker: 'entity', text: "There you are. Don't be frightened, little ember. You are safe here." }, // [TRUST]
  p_wake2: { speaker: 'entity', text: 'Come toward my lamp. Slowly. You are new to having no body.' },
  p_hint_move: { speaker: 'hint', text: 'Move: A / D or arrows.   Jump: Space.' },
  p_beam1: { speaker: 'entity', text: 'Careful. Light unmakes you. That beam is thin, and still it bites.' }, // [TRUST] honest warning
  p_beam_hint: { speaker: 'hint', text: 'Light burns your Substance. Your edges fray as it drains. Shade heals you.' },
  p_clouds: { speaker: 'entity', text: 'The clouds will lend you a moment. Wait for it, then go.' },
  p_guardian1: { speaker: 'entity', text: 'A guardian of the Hall. It will not let you pass if it sees you. Get behind a pillar and be still.' },
  p_merge_hint: { speaker: 'hint', text: 'Hold S / Down to Merge with the shade. Merged in deep shade, you cannot be seen.' },
  p_guardian2: { speaker: 'entity', text: 'Its lamp is its eye. Keep a pillar between you and the light.' },
  p_acolyte1: { speaker: 'entity', text: 'That one is weak, and it has not seen you. Come up behind it. Strike.' }, // [TRUST] good advice
  p_strike_hint: { speaker: 'hint', text: 'J: strike. Works from behind or from above, on enemies that have not noticed you.' },
  p_acolyte_done: { speaker: 'entity', text: 'Good. You did only what was needed.' },
  p_whisper_first: { speaker: 'whisper', text: '...that felt familiar.' },
  p_sand: { speaker: 'entity', text: 'Sand from my glass. It lets you borrow a few seconds you have not lived yet.' }, // [TRUST] a gift
  p_foresight1: { speaker: 'entity', text: 'There is a gift in you. Hold F and look a little way ahead. See where it walks before it walks there.' },
  p_foresight_hint: { speaker: 'hint', text: 'Hold F: Foresight (costs 1 Sand). Time stops while you look ahead.' },
  p_stillpoint: { speaker: 'entity', text: 'A Stillpoint. I hold time still for you there. If you fall, you wake at the last one you touched.' }, // [TRUST]
  p_dash_hint: { speaker: 'hint', text: 'K: Shade Step, a quick dash. Good for crossing light. It makes a little noise.' },
  p_statues: { speaker: 'entity', text: 'Keep to the statues\' shade, little ember. My lamp is not gentle with you.' }, // [TRUST] protective / [SUSPECT] its light hurts you
  p_bargain1: { speaker: 'entity', text: 'I am called the Almoner. I give what is needed, and I keep a ledger of what is owed.' },
  p_bargain2: { speaker: 'entity', text: 'Worlds are dying. Save them one by one, and a piece of the man you were comes home to you.' },
  p_bargain3: { speaker: 'entity', text: 'When you are whole, the ledger closes. That is a promise.' },
  p_portal: { speaker: 'entity', text: 'Hollowmere is first. Go on. I will be watching.' }, // [SUSPECT] faint
  p_death: { speaker: 'entity', text: 'Not yet. Again.' }, // [TRUST] it saves you

  // ---------------- World 1: Hollowmere ----------------
  h_arrive1: { speaker: 'entity', text: 'Hollowmere. Its people are hiding from their own lanterns tonight.' },
  h_arrive2: { speaker: 'entity', text: 'Find whoever is left and lead them to the dawn gate in the east. Quietly. The fog will hide you until morning.' },
  h_fog_hint: { speaker: 'hint', text: 'Fog shortens how far they can see. It burns away at dawn.' },
  h_first_lm1: { speaker: 'entity', text: 'Down. Into the dark. Do not move.' }, // [TRUST] it saves you
  h_first_lm2: { speaker: 'whisper', text: "He'd catch you. You know he would." },
  h_first_lm3: { speaker: 'entity', text: 'The Lanternmen were villagers once. If one sees you, run, and do not stop until you are in deep shade.' },
  h_lamp: { speaker: 'entity', text: 'Lamps do not move. Find the edge of their light and keep to it.' },
  h_cover_hint: { speaker: 'hint', text: 'Low walls and crates block light. Merge behind them.' },
  h_swing: { speaker: 'entity', text: 'Those lanterns swing. Watch the rhythm. Time is on your side if you are patient.' },
  h_shard_hint: { speaker: 'entity', text: 'Something of mine fell up there. Take it. It will let you see further.' }, // [TRUST] a gift
  h_fork: { speaker: 'entity', text: 'Two roads to the square. Over the roofs, or under them through the cellars.' },
  h_fork_whisper: { speaker: 'whisper', text: 'Up. Nobody ever looks up.' },
  h_cellar: { speaker: 'entity', text: 'Candles down here. Open flame is worse for you than lamplight. Much worse.' },
  h_hidden_still: { speaker: 'entity', text: 'You found a quiet place. Clever ember.' },
  h_square1: { speaker: 'entity', text: 'The chapel. Someone is breathing in there.' },
  h_maren1: { speaker: 'maren', text: "You're not one of them. You're a shadow with nobody attached." },
  h_edrin1: { speaker: 'edrin', text: "It's beckoning, Maren. We follow ghosts now?" },
  h_maren2: { speaker: 'maren', text: "We follow anything that isn't carrying a lantern." },
  h_escort_hint: { speaker: 'hint', text: 'Survivors follow you. Q: tell them to wait or follow. Light does not hurt them, but it shows them.' },
  h_square2: { speaker: 'entity', text: 'They cannot merge like you. Keep them out of the light, and keep the lanterns looking the other way.' },
  h_bell1: { speaker: 'entity', text: 'The old bell. Ring it and the Lanternmen will go to it. Most of them, I think.' },
  h_bell_hint: { speaker: 'hint', text: 'A branch point. Press E to look at the futures it could bring.' },
  h_bell_hide: { speaker: 'entity', text: 'They will come this way. Into the doorway, merge, and be still.' }, // [TRUST]
  h_bell_whisper: { speaker: 'whisper', text: 'Bells bring crowds. You remember crowds.' },
  h_millroad: { speaker: 'entity', text: 'The mill road runs east. Dawn is close. I can feel it in the glass.' },
  h_wheel: { speaker: 'entity', text: "The wheel's shadow turns. Move while it covers you." },
  h_wick_early: { speaker: 'whisper', text: 'Something big heard that bell.' },
  h_go_back: { speaker: 'entity', text: 'Not without them, little ember. Someone was breathing in the chapel.' }, // [TRUST]
  h_dawn1: { speaker: 'maren', text: 'The sky! It is getting light!' },
  h_dawn2: { speaker: 'entity', text: 'Run. All of you. She is waking.' },
  h_dawn3: { speaker: 'edrin', text: 'The Wick-Mother. Go, go!' },
  h_dawn_whisper: { speaker: 'whisper', text: 'The sun or the candles. Choose how you burn.' },
  h_dawn_hint: { speaker: 'hint', text: 'A low sun throws long shadows. Run inside them. They shrink as the sun climbs.' },
  h_end1: { speaker: 'maren', text: 'We made it. Shadow, whoever you were... thank you.' },
  h_end2: { speaker: 'entity', text: 'Well done, little ember. Hollowmere will sleep easy now.' }, // [TRUST] praise / [SUSPECT] "sleep" foreshadows an ending
};

// Survivor barks, picked at random.
export const BARKS = {
  wait: ["We'll stay.", 'Right here. Hurry.', 'Waiting.'],
  follow: ['Right behind you.', 'Lead on.', 'Together, then.'],
  noticed: ['Did it see us?', 'Shh. Shh.', "Don't move."],
  lost: ['Where did it go?', 'Shadow? Shadow!'],
};

// The man's voice when you slip away from a search.
export const WHISPERS = {
  escaped: ['They have stopped looking.', 'Gone. Like you were never there.', 'You always were good at disappearing.'],
};

export const DEATH_TEXT = {
  burned: 'The light took you.',
  fire: 'The flame took you.',
  caught: 'They caught you.',
  wick: 'The Wick-Mother caught you.',
  survivor: (name) => `${name} was taken.`,
  unravel: 'You unravel back to the Stillpoint.',
};

export const THREAD_TEXT = {
  snapped: (n) => (n === 1 ? 'A Thread snaps. One remains.' : `A Thread snaps. ${n} remain.`),
  fractured: (world) => `${world} is Fractured.`,
};

export const TOASTS = {
  stillpoint: 'Stillpoint. Time holds still here.',
  sand: 'Sand',
  shard: 'Hour-Shard. Foresight now looks 6 seconds ahead and shows visions at branch points.',
  combo: (name) => `Combo discovered: ${name}`,
  hiddenStill: 'A hidden Stillpoint.',
};

export const COMBOS = {
  Ambush: 'Strike right after leaving Merge. Silent: nobody nearby notices.',
  'Drop Kill': 'Fall onto an unaware enemy from above.',
};

// ---------------- Branches ----------------
export const BRANCH_TEXT = {
  'hollowmere.bell': {
    title: 'The Bell of Hollowmere',
    subtitle: 'Foresight shows what could follow. It cannot promise which future comes.',
    options: {
      ring: {
        label: 'Ring the bell',
        futures: {
          favorable: 'Nearly every Lanternman turns toward the bell. The mill road empties.',
          mixed: 'Some turn toward the bell. Some stay on the road.',
          unfavorable: 'They stay. And something far larger hears it.',
        },
      },
      silent: {
        label: 'Leave it silent',
        certain: 'Nothing changes. The mill road stays watched.',
      },
    },
    modifiers: {
      unseen: 'You have not been seen since the square',
      hidden: 'Maren and Edrin are waiting in shade',
    },
    results: {
      favorable: 'The bell rolls over the rooftops. Lanterns turn, one by one, and drift toward it.',
      mixed: 'The bell rings out. A few lanterns turn. Not all.',
      unfavorable: 'The bell rings. Nobody moves. Then, far off, something answers.',
      silent: 'You leave the bell alone.',
    },
  },
};

export const LEDGER_TEXT = {
  fog_thick: 'Hollowmere. The fog lay thick that night.',
  fog_thin: 'Hollowmere. The fog was thin that night.',
  high: 'You went over the rooftops.',
  low: 'You went under the town, through the cellars.',
  found: 'You found Maren and Edrin hiding in the chapel.',
  bell_favorable: 'You rang the bell. Nearly all of them went to it.',
  bell_mixed: 'You rang the bell. Some of them went to it.',
  bell_unfavorable: 'You rang the bell. It woke something larger.',
  bell_silent: 'You left the bell silent.',
  reweave: 'You reweaved what the bell decided.',
  saved: 'Maren and Edrin reached the dawn gate.',
  closing: 'Hollowmere: saved.',
};

// ---------------- Cutscenes (manhwa-style panels) ----------------
export const CUTSCENES = {
  intro: [
    { art: 'fire', text: 'The fire on Tanner\'s Row burned until morning.' },
    { art: 'doorway', text: 'He died in a fire of his own making.' },
    { art: 'split', text: 'Something stayed behind when the rest of him burned. Not the man. The part of him he never once looked at.' },
    { art: 'lamp', speaker: 'entity', text: 'There you are, little ember.' },
  ],
  hollowmere: [
    { art: 'title', title: 'HOLLOWMERE', text: 'A village that hides from its own lanterns.' },
  ],
  fragment: [
    { art: 'fragment', text: 'A piece of him returns.' },
    // PLACEHOLDER memory: written for the "hero of the fire" sin option in the design doc (3.2).
    // Swap this line if you choose a different version of his deceit and murder.
    { art: 'memory', text: 'A crowd in the smoke, shouting a name like a blessing. Soot on your hands. Everyone thinks you ran in to save them.' },
    { art: 'resist', text: 'Light Resistance rises. The sun will hurt a little less.' },
    { art: 'ability', text: 'Ability returned: Cling. (Playable from World 2.)' },
    { art: 'lamp', speaker: 'entity', text: 'Rest now. There are six more.' },
  ],
};

export const TITLE = {
  name: 'UMBRAL LEDGER',
  tagline: 'Shadow  ·  Time  ·  Fire',
  slice: 'Vertical slice: Prologue and Hollowmere',
};

export const CONTROLS = [
  ['Move', 'A / D  or  Left / Right'],
  ['Jump', 'Space / W / Up'],
  ['Merge (hide)', 'Hold S / Down'],
  ['Strike', 'J'],
  ['Shade Step (dash)', 'K'],
  ['Foresight', 'Hold F'],
  ['Interact', 'E'],
  ['Survivors wait / follow', 'Q'],
  ['Pause and Ledger', 'Esc'],
  ['Dev menu', '`  (backtick)'],
];

export const GAMEPAD_CONTROLS = 'Gamepad: stick move, A jump, Down merge, X strike, B dash, LT foresight, Y interact, RB survivors, Start pause.';
