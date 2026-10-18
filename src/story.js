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
  p_merge_hint: { speaker: 'hint', text: 'Hold S / Down to Merge with the shade. Merged in deep shade, you cannot be seen. Merged, you move slowly and silently.' },
  p_guardian_hint: { speaker: 'hint', text: 'Guardians cannot be struck down. Your strike does nothing to them: hide, and let them pass.' },
  p_guardian2: { speaker: 'entity', text: 'Its lamp is its eye. Keep a pillar between you and the light.' },
  p_acolyte1: { speaker: 'entity', text: 'That one is weak, and it has not seen you. Come up behind it. Strike.' }, // [TRUST] good advice
  p_strike_hint: { speaker: 'hint', text: 'J: strike. Only from behind or from above, and only on enemies that have not noticed you. It fells Acolytes and Lanternmen, never Guardians. A miss makes noise.' },
  p_acolyte_done: { speaker: 'entity', text: 'Good. You did only what was needed.' },
  p_whisper_first: { speaker: 'whisper', text: '...that felt familiar.' },
  p_sand: { speaker: 'entity', text: 'Sand from my glass. It lets you borrow a few seconds you have not lived yet.' }, // [TRUST] a gift
  p_foresight1: { speaker: 'entity', text: 'There is a gift in you. Hold F and look a little way ahead. See where it walks before it walks there.' },
  p_foresight_hint: { speaker: 'hint', text: 'Hold F: Foresight (costs 1 Sand). Time stops while you look ahead.' },
  p_stillpoint: { speaker: 'entity', text: 'A Stillpoint. I hold time still for you there. If you fall, you wake at the last one you touched.' }, // [TRUST]
  p_stillpoint_hint: { speaker: 'hint', text: 'Touching a Stillpoint sets your checkpoint and refills your Sand.' },
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
  h_threads_hint: { speaker: 'hint', text: 'Threads (top left): each death here snaps one and returns you to your last Stillpoint. Lose all three and Hollowmere is Fractured.' },
  h_first_lm1: { speaker: 'entity', text: 'Down. Into the dark. Do not move.' }, // [TRUST] it saves you
  h_first_lm2: { speaker: 'whisper', text: "He'd catch you. You know he would." },
  h_first_lm3: { speaker: 'entity', text: 'The Lanternmen were villagers once. If one sees you, run, and do not stop until you are in deep shade.' },
  h_lm_hint: { speaker: 'hint', text: 'A Lanternman can be struck down (J) from behind or above, but only before he notices you. Once he is alerted, run. Running steps make noise; merged steps do not.' },
  h_lamp: { speaker: 'entity', text: 'Lamps do not move. Find the edge of their light and keep to it.' },
  h_cover_hint: { speaker: 'hint', text: 'Low walls, crates and carts block light. Merge behind them. Up close, shade is not enough: only cover hides you.' },
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
  h_dawn_hint: { speaker: 'hint', text: 'A low sun throws long shadows. Run inside them. Jump the debris glowing in your path: every stumble lets her close in.' },
  h_wick_hint: { speaker: 'hint', text: 'The Wick-Mother cannot be struck, and there is no hiding from her. Outrun her. K (Shade Step) buys you distance when she lunges.' },
  h_end1: { speaker: 'maren', text: 'We made it. Shadow, whoever you were... thank you.' },
  h_end2: { speaker: 'entity', text: 'Well done, little ember. Hollowmere will sleep easy now.' }, // [TRUST] praise / [SUSPECT] "sleep" foreshadows an ending

  // ---------------- World 7: The Last Noon (the final world) ----------------
  n_arrive1: { speaker: 'entity', text: 'The Last Noon. The sun stopped here eleven years ago. It has been burning ever since.' },
  n_arrive2: { speaker: 'entity', text: 'Six pieces of him came home with you. You are nearly whole, little ember. Let me show you what they gave back.' }, // [SUSPECT] "him", not "you"
  n_whisper1: { speaker: 'whisper', text: 'Feels good, doesn\'t it. Being strong again.' },
  n_ember: { speaker: 'entity', text: 'That fire is in your way. You have a fire of your own now. Black, and hungry.' },
  n_ember_hint: { speaker: 'hint', text: 'L: Black Ember. Throw black fire: it snuffs braziers and lamps, and burns enemies. Each throw costs a little Substance.' },
  n_cling: { speaker: 'entity', text: 'Too high to jump. But his hands remember walls. Let them.' },
  n_cling_hint: { speaker: 'hint', text: 'Cling: jump at a wall and hold toward it to slide down it. Press Jump to kick off. Kick between the two walls to climb.' },
  n_shafts: { speaker: 'entity', text: 'The sun burns through the ash in places. Do not stand in it. Go through it the way a blade goes through cloth.' },
  n_shaft_hint: { speaker: 'hint', text: 'K: Shadow Dash carries you through a shaft of sun before it can burn you.' },
  n_market: { speaker: 'entity', text: 'Lanternmen. You ran from these once. Do you remember how small you were?' },
  n_dashcut_hint: { speaker: 'hint', text: 'Your dash has teeth now. Dash (K) through a Lanternman or an Acolyte to cut him down, seen or unseen. Grabs here hurt, but they no longer kill.' },
  n_whisper2: { speaker: 'whisper', text: 'They used to frighten you. Look at them now.' },
  n_sunguard: { speaker: 'entity', text: 'A Sunguard. Your strike will not open that armour. Burn it, or send it chasing a shadow of you.' },
  n_echo_hint: { speaker: 'hint', text: 'U: Echo. A shadow of you runs on ahead, making noise. Watchers see it, chase it and grab it instead of you.' },
  n_sunguard_hint: { speaker: 'hint', text: 'Sunguards cannot be struck or dash-cut. Three Black Embers bring one down. An Eclipse staggers it.' },
  n_ambush: { speaker: 'entity', text: 'They know you are here. Let them come, little ember. Show them what you have become.' }, // [SUSPECT] it wants you to enjoy this
  n_eclipse_hint: { speaker: 'hint', text: 'I: Eclipse. For a few seconds the light cannot touch you, and the Corona throws down everything near. Each enemy you fell charges it again.' },
  n_stair: { speaker: 'entity', text: 'The throne is above. The Warden holds the sun in his crown. Take it from him.' },
  n_throne1: { speaker: 'entity', text: 'There. The Sun-Warden. His braziers feed his shield. Put them out, and he will have to kneel.' },
  n_throne2: { speaker: 'hint', text: 'Snuff all three braziers (L) to break his shield. When he kneels, hit the glowing core: strike, dash or Corona. Jump to reach it. Hide behind a pillar from his sweeping gaze.' },
  n_warden_kneel: { speaker: 'entity', text: 'Now! His heart is open!', repeat: true },
  n_warden_crack1: { speaker: 'whisper', text: 'Again. Hurt it again.' },
  n_warden_crack2: { speaker: 'entity', text: 'Once more, little ember. Then this world can finally sleep.' },
  n_end1: { speaker: 'entity', text: 'Look up. Night. The first in eleven years.' },
  n_end2: { speaker: 'whisper', text: 'I remember my name now.' },
  n_end_hint: { speaker: 'hint', text: 'Walk to where the Warden stood to take the last piece of him.' },
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
  noon_saved: 'The Last Noon. You broke the Warden\'s crown, and the sun went down.',
  noon_whole: 'The seventh piece of him came home. The ledger is full.',
};

// ---------------- Cutscenes (manhwa-style panels) ----------------
export const CUTSCENES = {
  intro: [
    { art: 'fire', text: 'Tanner\'s Row burned until morning. By dawn the whole street smelled of tallow, and nobody would say his name.' },
    { art: 'doorway', text: 'He died in the doorway, in a fire he had set himself. He thought it would hide what he had done. It did, for a while.' },
    { art: 'split', text: 'But something crawled out of the ash. Not the man. The part of him he spent his whole life refusing to look at.' },
    { art: 'lamp', speaker: 'entity', text: 'Hush now. There you are, little ember. I have been waiting such a long time for you.' },
  ],
  hollowmere: [
    { art: 'title', title: 'HOLLOWMERE', text: 'Nobody in Hollowmere lights a window after dusk. The lanterns walk on their own now.' },
  ],
  // The final world. Painted procedurally (CutsceneScene: noon, warden, night).
  lastnoon: [
    { art: 'noon', title: 'THE LAST NOON', text: 'Eleven years ago the sun stopped at noon. It never moved again. The world under it has been burning slowly ever since.' },
    { art: 'warden', text: 'Someone holds it there. They call him the Warden. He has stood in his crown of fire so long he has forgotten what night was for.' },
    { art: 'ascend', text: 'Six pieces of the man walk in you now. You are faster. Stronger. You no longer flinch at the light. You try not to notice how much you like it.' },
    { art: 'lamp', speaker: 'entity', text: 'Bring them night, little ember. Then you will be whole, and the ledger can close.' },
  ],
  lastnoon_end: [
    { art: 'night', text: 'The sun went down. Across the burnt world, people who had never seen a star stood in the street and wept.' },
    { art: 'fragment', text: 'The last piece of him came home. It was the heaviest. It knew his name, and everything that name had done.' },
    { art: 'lamp', speaker: 'entity', text: 'Whole at last. Come back to the Hall, little ember. I have waited so very long for this.' },
  ],
  fragment: [
    { art: 'fragment', text: 'Something warm settles back into you. A piece of him. You do not remember asking for it.' },
    // PLACEHOLDER memory: written for the "hero of the fire" sin option in the design doc (3.2).
    // Swap this line if you choose a different version of his deceit and murder.
    { art: 'memory', text: 'A crowd in the smoke, chanting his name like a prayer. Soot on his hands. They all believe he ran in to save them. He lets them.' },
    { art: 'resist', text: 'Light Resistance rises. The sun bites a little less now. You try not to wonder what that costs.' },
    { art: 'ability', text: 'Ability returned: Cling. His hands remember walls he once climbed in the dark. (Playable from World 2.)' },
    { art: 'lamp', speaker: 'entity', text: 'Rest now, little ember. Six more pieces of him are still out there, waiting in the dark.' },
  ],
};

export const TITLE = {
  name: 'UMBRAL LEDGER',
  tagline: '',
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
  ['Black Ember (final world)', 'L'],
  ['Echo (final world)', 'U'],
  ['Eclipse (final world)', 'I'],
  ['Pause and Ledger', 'Esc'],
  ['Dev menu', '`  (backtick)'],
];

export const GAMEPAD_CONTROLS = 'Gamepad: stick move, A jump, Down merge, X strike, B dash, LT foresight, Y interact, RB survivors, RT ember, LB echo, L3 eclipse, Start pause.';

// The final world opens with the Ledger of Fragments: what each saved world gave back.
export const FRAGMENT_LEDGER = [
  ['I', 'Hollowmere', 'Cling', 'Slide down walls and kick off them'],
  ['II', 'Verith', 'Echo', 'A shadow of you that runs ahead'],
  ['III', 'Ashfall', 'Black Ember', 'Black fire that eats light'],
  ['IV', 'The Choir of Glass', 'Shadow Dash', 'Your Shade Step cuts'],
  ['V', 'Marrow', 'Long Sight', 'Foresight looks further'],
  ['VI', 'The Court of Masks', 'Light Resistance VI', 'The sun bites far less'],
  ['VII', 'The Last Noon', '?', 'The last piece of him is here'],
];
