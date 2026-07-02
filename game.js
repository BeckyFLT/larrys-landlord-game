/* =============================================================
   LARRY'S LANDLORD — game.js
   Chunk 1: scaffold + state machine + Start screen
   ============================================================= */
/// <reference path="./v2-candidates/dramaturgical-router/harness/router-types.d.ts" />
/// <reference path="./v2-candidates/dramaturgical-router/harness/result-types.d.ts" />

/**
 * Legacy v1 runtime aliases. The v2 router is now the production data source;
 * these shapes keep dormant v1 helper functions type-checkable while they are
 * left in place for a later engine cleanup.
 * @typedef {'a'|'b'} Side
 * @typedef {any} Scenario
 * @typedef {any} HandCard
 * @typedef {{image?: string, altText?: string}} PortraitSource
 * @typedef {{name: string, handle: string, text: string, stats: string, image?: string, altText?: string}} Post
 * @typedef {{masthead: string, headline: string, image?: string, altText?: string}} FrontPage
 * @typedef {{masthead: string, headline: string, standfirst: string, image?: string, altText?: string}} Newspaper
 */

var LARRY_SVG =
  '<svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">' +
    '<g fill="none" stroke="#F5CE3E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M76,42 L59,9 L101,31"/><path d="M134,42 L151,9 L109,31"/>' +
      '<path d="M67,22 L73,38"/><path d="M143,22 L137,38"/>' +
      '<path d="M63,70 C63,46 86,31 105,31 C124,31 147,46 147,70 C147,94 128,109 105,109 C82,109 63,94 63,70 Z"/>' +
      '<path d="M80,65 Q90,57 101,65 Q90,73 80,65 Z"/><path d="M109,65 Q120,57 131,65 Q120,73 109,65 Z"/>' +
      '<path d="M100,79 L110,79 L105,85 Z"/><path d="M105,85 Q100,91 93,89"/><path d="M105,85 Q110,91 117,89"/>' +
      '<path d="M93,82 Q70,80 49,85"/><path d="M94,87 Q72,90 52,96"/><path d="M117,82 Q140,80 161,85"/><path d="M116,87 Q138,90 158,96"/>' +
      '<path d="M82,104 Q105,122 128,104"/>' +
      '<path d="M70,101 C43,129 43,202 63,243"/><path d="M140,101 C168,129 168,202 148,243"/>' +
      '<path d="M137,108 C160,134 161,200 146,237" stroke-width="2" opacity="0.45"/>' +
      '<path d="M63,243 Q105,265 148,243"/>' +
      '<path d="M86,150 C82,186 84,221 87,244"/><path d="M124,150 C128,186 126,221 123,244"/>' +
      '<path d="M78,244 q9,8 18,-1"/><path d="M112,245 q9,8 18,-2"/>' +
      '<path d="M105,110 C101,152 103,201 105,238"/>' +
      '<path d="M147,238 C188,252 215,230 205,200 C200,182 184,182 178,197"/>' +
      '<path d="M168,243 l6,-9"/><path d="M184,240 l6,-9"/><path d="M198,228 l8,-5"/>' +
      '<path d="M150,150 q10,4 15,13"/><path d="M151,172 q10,4 15,13"/><path d="M149,193 q10,4 14,13"/>' +
    '</g>' +
    '<circle cx="90" cy="65" r="2.6" fill="#F5CE3E"/><circle cx="120" cy="65" r="2.6" fill="#F5CE3E"/>' +
  '</svg>';

var DEFAULT_PLAYER_NAME = '';
var defaultPlayerNameCleared = false;

/** Clear the suggested player name once, without erasing later edits. */
function clearDefaultPlayerNameOnce() {
  if (defaultPlayerNameCleared) return;
  defaultPlayerNameCleared = true;
  var nameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('pm-name'));
  if (nameInput && nameInput.value === DEFAULT_PLAYER_NAME) nameInput.value = '';
}

/* ---------- engine-internal types (game state) ----------
   These describe the live engine. Production data now comes from the v2
   dramaturgical router; the old v1 content helpers remain inert until the
   engine can be slimmed down in a separate cleanup. */
/**
 * @typedef {'start'|'decide'|'press'|'reaction'|'end'} GameScreen
 */
/**
 * Live meter values, keyed by Meter. Modelled as a string→number map so the
 * engine can read meters[dynamicKey]; the four real keys are living/press/
 * politics/capital.
 * @typedef {Record<string, number>} Meters
 */
/**
 * @typedef {Object} Snapshot
 * @property {Meters} meters
 * @property {Record<string, boolean>} passedPolicies
 * @property {boolean} passedHelpPolicy
 * @property {number} concentratedPower
 * @property {Array<number|null>} scenarioUnlockTurn
 * @property {number|null} pressFixedTurn
 * @property {number|null} politicsFixedTurn
 * @property {string|null} deadMeter
 */
/**
 * @typedef {Object} GameState
 * @property {GameScreen} screen
 * @property {string} playerName
 * @property {number} startStep
 * @property {Record<string, Side>} cabinet
 * @property {boolean|null} larryNice
 * @property {boolean} larryLoyal
 * @property {number} turn
 * @property {number} scenarioIndex
 * @property {number} scenarioTurn
 * @property {Array<number|null>} scenarioUnlockTurn
 * @property {string|null} lastPolicy
 * @property {Partial<Deltas>} lastDeltas
 * @property {Record<string, boolean>} passedPolicies
 * @property {boolean} passedHelpPolicy
 * @property {number|null} pressFixedTurn
 * @property {number|null} politicsFixedTurn
 * @property {Meters} meters
 * @property {number} concentratedPower
 * @property {string|null} deadMeter
 * @property {Snapshot|null} _preActionSnapshot
 * @property {number} weekNum
 * @property {number} weekDay
 * @property {boolean} firstReactionlessPressSeen
 * @property {Array<{tier:string, count:number, promise:string}>} weekVerdicts
 */
/**
 * A scoring outcome row (a value in GRADES).
 * @typedef {Object} Grade
 * @property {string} title
 * @property {string} verdict
 * @property {string} label
 */
/**
 * @typedef {Object} V2ConsequenceNotice
 * @property {'timed'|'liability'|'follow-up'} kind
 * @property {string} label
 * @property {string} text
 * @property {string} [html]
 */

/* =============================================================
   GLOBAL CONFIG — engine tunables gathered in one block.
   ============================================================= */

/* ---------- starting meter values ---------- */
/* Political Power (capital) is a "time meter" — drops by SCENARIO_CAPITAL_DECAY at
   the end of each scenario, regardless of picks. The v1 unlock threshold and
   cabinet map below are inert compatibility shims; v2 balance lives in router
   data. No per-card capital costs. */
/** @type {Meters} */
var STARTING_METERS = { living: 34, press: 25, politics: 25, capital: 70 };
var SCENARIO_CAPITAL_DECAY = 30;
var UNLOCK_THRESHOLD = 45;
/** @type {Record<string, Record<Side, string>>} */
var CABINET_TO_SCENARIO = {};
/** @type {Record<string, Scenario>} */
var SCENARIOS = {};

/* ---------- scenario / turn counts (DATA-DRIVEN) ----------
   Scenarios-per-game is derived from the cabinet pick-pairs; turns-per-scenario is
   each scenario's turnCopy.length, read at the point of use. NOTE: the cabinet
   PICKER (index.html pick-row-1..3 + the start-step machine) is still hardwired to
   exactly 3 picks, so although the engine is now count-agnostic, SCENARIO_COUNT must
   stay 3 in shipped data until that UI is generalised (tracked as a separate backlog
   issue). Turn counts carry no such limit. */
/** @type {string[]} */
var PAIR_IDS = Object.keys(CABINET_TO_SCENARIO);
var SCENARIO_COUNT = PAIR_IDS.length;

/* ---------- the four meters ----------
   One definition for what was scattered across render code + the share text:
   key, three label vocabularies (strip / chip / share), colour, and static role
   (goal vs gate). This is a DRY gather, NOT a move toward a variable meter count —
   the set is fixed at four. The per-scenario gate is data (Scenario.gateMeter);
   `role` here is only the static taxonomy. */
/**
 * @typedef {Object} MeterDef
 * @property {string} key
 * @property {'goal'|'gate'} role
 * @property {string} color
 * @property {string} label  full label — decide-screen strip
 * @property {string} short  short label — delta chips
 * @property {string} share  title-case label — share text
 * @property {string} icon
 */
/** @type {MeterDef[]} */
// Keep colours in sync with the CSS meter tokens in styles.css.
var METERS = [
  { key: 'living',   role: 'goal', color: '#25C998', label: 'LIVING STANDARDS', short: 'LIVING', share: 'Living Standards', icon: 'icons/meter-living-standards.svg' },
  { key: 'press',    role: 'gate', color: '#FF335E', label: 'MEDIA CLIMATE',    short: 'MEDIA',  share: 'Media Climate',    icon: 'icons/meter-media-climate.svg' },
  { key: 'politics', role: 'gate', color: '#4D7CFF', label: 'PUBLIC TRUST',     short: 'TRUST',  share: 'Public Trust',     icon: 'icons/meter-public-trust.svg' },
  { key: 'capital',  role: 'gate', color: '#FFC93C', label: 'POLITICAL POWER',  short: 'POWER',  share: 'Political Power',  icon: 'icons/meter-political-power.svg' }
];
/** @type {Record<string, string>} meter key -> colour, derived from METERS */
var METER_COLORS = {};
METERS.forEach(function(d) { METER_COLORS[d.key] = d.color; });

/**
 * @param {string} key
 * @returns {MeterDef|null}
 */
function meterDefForKey(key) {
  for (var i = 0; i < METERS.length; i++) {
    if (METERS[i].key === key) return METERS[i];
  }
  return null;
}

/**
 * @param {MeterDef} meter
 * @param {string} className
 * @returns {string}
 */
function meterIconHtml(meter, className) {
  return '<span class="meter-label-icon ' + attrEsc(className) + '" aria-label="' + attrEsc(meter.share) + '" title="' + attrEsc(meter.share) + '">' +
    '<img src="' + attrEsc(meter.icon) + '" alt="">' +
  '</span>';
}

/* Donut-ring meter readout — shared by every screen that shows the meters
   (decide, cabinet pick, rules intro, reaction, end). The SVG uses a 100×100
   viewBox so the maths stays simple: radius 42 → circumference ≈ 263.89. The
   coloured ring is drawn with stroke-dashoffset = "how much is still empty",
   so full offset = 0%, zero offset = 100%. */
var RING_R = 42;
var RING_C = 2 * Math.PI * RING_R; // circumference ≈ 263.894

/**
 * Dash offset that draws a ring filled to `value` percent.
 * @param {number} value 0–100
 * @returns {number}
 */
function ringOffset(value) {
  var v = Math.max(0, Math.min(100, value));
  return RING_C * (1 - v / 100);
}

/**
 * One meter drawn as a donut: coloured progress ring, icon in the centre, and
 * the score below. `.m-fill` / `.m-val` / `data-m` are kept so the existing
 * reveal animations and per-meter colour rules keep working.
 * @param {MeterDef} meter
 * @param {number} value 0–100
 * @returns {string}
 */
/** @param {any} meter @param {number} value @param {number} [delta] @returns {string} */
function meterDonutHtml(meter, value, delta) {
  var v = Math.round(value);
  var dv = delta == null ? 0 : Math.round(delta);
  var deltaHtml = dv === 0 ? '' :
    '<span class="meter-donut__delta" data-m="' + meter.key + '" style="color:' + (METER_COLORS[meter.key] || 'inherit') + '">' +
      (dv > 0 ? '▲ +' + dv : '▼ ' + Math.abs(dv)) +
    '</span>';
  return '<div class="meter-donut" data-m="' + meter.key + '">' +
    '<div class="meter-donut__ring">' +
      '<svg class="meter-donut__svg" viewBox="0 0 100 100" aria-hidden="true">' +
        '<circle class="meter-donut__track" cx="50" cy="50" r="' + RING_R + '"></circle>' +
        '<circle class="m-fill meter-donut__bar" data-m="' + meter.key + '" cx="50" cy="50" r="' + RING_R + '" ' +
          'transform="rotate(-90 50 50)" ' +
          'style="stroke-dasharray:' + RING_C.toFixed(2) + ';stroke-dashoffset:' + ringOffset(v).toFixed(2) + ';"></circle>' +
      '</svg>' +
      '<span class="meter-donut__icon">' +
        '<img src="' + attrEsc(meter.icon) + '" alt="" aria-label="' + attrEsc(meter.share) + '">' +
      '</span>' +
    '</div>' +
    '<span class="m-val meter-donut__value" data-m="' + meter.key + '">' + v + '</span>' +
    deltaHtml +
    '<span class="meter-donut__tip" role="tooltip">' + htmlEsc(meter.share) + '</span>' +
  '</div>';
}

/**
 * @param {MeterDef} meter
 * @param {number} value
 * @returns {string}
 */
function meterImpactHtml(meter, value) {
  var sign = value > 0 ? '+' : '';
  var label = meter.share + ' ' + (value > 0 ? 'plus ' : 'minus ') + Math.abs(value);
  return '<span class="meter-impact" aria-label="' + attrEsc(label) + '">' +
    meterIconHtml(meter, 'meter-impact__icon') +
    '<span class="meter-impact__delta">' + sign + value + '</span>' +
  '</span>';
}

/* ---------- instant-loss detection (RETIRED) ----------
   Meters no longer end the run. A meter hitting 0 just means it's floored — it still
   gates which policies you can unlock, but the term always plays out to the election.
   This function is kept (several callers reference it) but now always reports "no death";
   the collapse endings and the early end-trigger have been removed. */
/** @returns {string|null} always null — a dead meter no longer ends the run */
function anyMeterDead() {
  return null;
}


/* ---------- full game state ---------- */
/** @type {GameState} */
var state = {
  screen: 'start',
  playerName: '',       // typed on the welcome screen; '' falls back to "Prime Minister"
  startStep: 0,
  cabinet: {},          // { pair1: 'a'|'b', pair2: 'a'|'b', pair3: 'a'|'b' }
  larryNice: null,      // true | false
  larryLoyal: true,     // true until the player declines an available Larry option (or shoos Larry); gates the bonus ending
  turn: 1,              // global turn counter (monotonic; no fixed max — the game ends when scenarios run out)
  scenarioIndex: 0,     // which of the picked scenarios is currently playing (0-based)
  scenarioTurn: 1,      // turn within the current scenario (1-based)
  scenarioUnlockTurn: new Array(SCENARIO_COUNT).fill(null),  // per-scenario: scenarioTurn when gate meter first hit threshold; 0 if already there at scenario start; null if never
  lastPolicy: null,     // card id of the policy just chosen
  lastDeltas: {},
  passedPolicies: {},   // { cardId: true } — every picked card
  passedHelpPolicy: false,
  pressFixedTurn: null,    // turn number when Free Press first hit 45
  politicsFixedTurn: null, // turn number when Clean Politics first hit 45
  meters: Object.assign({}, STARTING_METERS),
  concentratedPower: 100,  // hidden — never shown to player
  deadMeter: null,         // first meter to hit 0; latches a loss permanently (see anyMeterDead)
  _preActionSnapshot: null,
  weekNum: 1,              // progress bar: current "week" = scenario number (1-based)
  weekDay: 1,              // progress bar: current day within the week (1 = manifesto pick / opening)
  firstReactionlessPressSeen: false, // press screens with no reaction after: first one prompts "first policy decision", the rest "next decision"
  weekVerdicts: []         // each week's manifesto result {tier,count,promise}, in play order — read by the endgame
};

var V2_MODE = isV2QueryMode();

/**
 * @typedef {Object} V2BridgeState
 * @property {RouterConfig|null} config
 * @property {RouterApi|null} router
 * @property {RouterProductionViewAdapterApi|null} adapter
 * @property {RouterState|null} routerState
 * @property {RouterSurface|null} activeSurface
 * @property {RouterProductionSurfaceView|null} activeSurfaceView
 * @property {Record<string, RouterChoiceAvailability>} choiceAvailability
 * @property {string|null} pendingChoiceId
 * @property {RouterProductionChoiceView|null} pendingChoiceView
 * @property {RouterProductionSurfaceView|null} lastSurfaceView
 * @property {RouterProductionChoiceView|null} lastChoiceView
 * @property {RouterResolveResult|RouterPassiveResult|null} lastResult
 * @property {V2ConsequenceNotice|null} activeSurfaceNotice
 * @property {V2ConsequenceNotice[]} lastConsequenceNotices
 * @property {Array<{surface:RouterProductionSurfaceView, choice:RouterProductionChoiceView}>} weekDecisions
 * @property {{tier:string, count:number, promise:string}|null} weekReaction
 * @property {string[]} pickTwoSelected
 * @property {string[]} pickTwoCommitted
 * @property {Record<string, string[]>} weekCardOrder
 */
/** @type {V2BridgeState} */
var v2Bridge = {
  config: null,
  router: null,
  adapter: null,
  routerState: null,
  activeSurface: null,
  activeSurfaceView: null,
  choiceAvailability: {},
  pendingChoiceId: null,
  pendingChoiceView: null,
  lastSurfaceView: null,
  lastChoiceView: null,
  lastResult: null,
  activeSurfaceNotice: null,
  lastConsequenceNotices: [],
  weekDecisions: [],   // the current round's policy decisions (for the weekly verdict + feed)
  weekReaction: null,  // set when the once-a-week full reaction is showing; cleared on advance
  pickTwoSelected: [],  // ids chosen on a 'pick-two' beat, pending confirm
  pickTwoCommitted: [], // the beat's committed ids, for the light press reaction
  weekCardOrder: {}     // per-week shuffled card order (choice ids), so decision 2/2 mirrors decision 1/2
};

/** @returns {boolean} */
function isV2QueryMode() {
  return true;
}

/** @returns {number} */
function v2Seed() {
  if (typeof window === 'undefined' || !window.location) return 5402;
  try {
    var raw = new URLSearchParams(window.location.search).get('v2seed');
    var n = raw == null ? NaN : parseInt(raw, 10);
    return Number.isFinite(n) ? n : 5402;
  } catch (_err) {
    return 5402;
  }
}

/** @returns {boolean} */
function isV2Mode() { return V2_MODE; }

/** @returns {void} */
function v2ResolveGlobals() {
  if (v2Bridge.config && v2Bridge.router && v2Bridge.adapter) return;
  var w = /** @type {Window & typeof globalThis} */ (window);
  v2Bridge.config = w.DRAMATURGICAL_ROUTER_BALANCE_DATA || null;
  v2Bridge.router = w.DramaturgicalRouter || null;
  v2Bridge.adapter = w.DramaturgicalRouterProductionViewAdapter || null;
  if (!v2Bridge.config || !v2Bridge.router || !v2Bridge.adapter) {
    throw new Error('V2 router globals did not load. Check index.html script order.');
  }
}

/** @returns {string} */
function v2ResultHref() {
  if (!isV2Mode() || !v2Bridge.routerState) return '';
  v2ResolveGlobals();
  var w = /** @type {any} */ (window);
  /** @type {RouterStateResultAdapterApi|undefined} */
  var resultAdapter = w.RouterStateResultAdapter;
  /** @type {ResultCodecApi|undefined} */
  var resultCodec = w.ResultCodec;
  if (!resultAdapter || !resultCodec) return '';
  try {
    var input = resultAdapter.adaptRouterStateToResultInput(
      /** @type {RouterConfig} */ (v2Bridge.config),
      v2Bridge.routerState
    );
    return 'result.html' + resultCodec.encodeResultSearch(input);
  } catch (error) {
    console.warn('[v2 result] could not build result URL', error);
    return '';
  }
}

/** @returns {boolean} */
function v2ShouldOpenResultPage() {
  return isV2Mode() && !(/** @type {any} */ (window).__BETTER_GAME_SUPPRESS_RESULT_REDIRECT);
}

/** @returns {boolean} */
function openV2ResultPage() {
  if (!v2ShouldOpenResultPage()) return false;
  var href = v2ResultHref();
  if (!href) return false;
  window.location.assign(href);
  return true;
}

/** @returns {boolean} true when the first surface is ready */
function v2StartRun() {
  v2ResolveGlobals();
  var config = /** @type {RouterConfig} */ (v2Bridge.config);
  var router = /** @type {RouterApi} */ (v2Bridge.router);
  var scenario = config.scenarios[0];
  if (!scenario) return false;
  v2Bridge.routerState = router.createInitialState(config, scenario.id, v2Seed());
  v2Bridge.lastResult = null;
  v2Bridge.lastChoiceView = null;
  v2Bridge.lastSurfaceView = null;
  v2Bridge.pendingChoiceId = null;
  v2Bridge.pendingChoiceView = null;
  v2Bridge.pickTwoCommitted = [];
  v2Bridge.weekCardOrder = {};
  v2Bridge.activeSurfaceNotice = null;
  v2Bridge.lastConsequenceNotices = [];
  state.turn = 1;
  state.scenarioIndex = 0;
  state.scenarioTurn = 1;
  state.lastPolicy = null;
  state.lastDeltas = {};
  state.passedPolicies = {};
  state.larryNice = null;
  state.larryLoyal = true;
  state.deadMeter = null;
  v2SyncMeters();
  return v2PrepareNextPlayableSurface() === 'surface';
}

/** @returns {void} */
function v2SyncMeters() {
  if (!v2Bridge.routerState) return;
  state.meters = Object.assign({}, v2Bridge.routerState.meters);
  state.deadMeter = v2Bridge.routerState.deadMeter;
  state.turn = v2Bridge.routerState.beat + 1;
}

/**
 * @param {RouterMeterImpact[]} impacts
 * @returns {Partial<Deltas>}
 */
function v2ImpactsToDeltas(impacts) {
  /** @type {Partial<Deltas>} */
  var deltas = {};
  impacts.forEach(function(impact) {
    deltas[impact.meter] = (deltas[impact.meter] || 0) + impact.delta;
  });
  return deltas;
}

/**
 * @param {RouterResolveResult} result
 * @returns {Partial<Deltas>}
 */
function v2ResolveResultDeltas(result) {
  return v2ImpactsToDeltas(result.timedVisible.concat(result.immediateVisible));
}

/** @param {Partial<Deltas>} deltas @returns {boolean} */
function v2HasVisibleDeltas(deltas) {
  for (var key in deltas) {
    if (deltas[key]) return true;
  }
  return false;
}

/**
 * @param {RouterState} routerState
 * @param {string} surfaceId
 * @returns {RouterQueuedLiability|null}
 */
function v2DueLiabilityForSurface(routerState, surfaceId) {
  var due = routerState.queuedLiabilities.filter(function(liability) {
    return liability.surfaceId === surfaceId && liability.dueIn <= 0;
  }).sort(function(a, b) {
    return b.priority - a.priority;
  });
  return due.length ? due[0] : null;
}

/**
 * @param {RouterState} routerState
 * @returns {RouterQueuedTimedEffect[]}
 */
function v2TimedEffectsLandingNow(routerState) {
  return routerState.queuedTimedEffects.filter(function(effect) {
    var startsIn = effect.startsIn;
    if (startsIn > 0) startsIn -= 1;
    return startsIn === 0 && effect.ticksRemaining > 0;
  });
}

/**
 * @param {string|undefined} text
 * @returns {string}
 */
function v2ProductionSafeNote(text) {
  var note = String(text || '').trim();
  if (!note) return '';
  if (/%|\bchance\b|\bprobab|\bhidden\b|\baxis\b|\bdebug\b|\bprototype\b/i.test(note)) return '';
  if (/\b[a-z0-9]+(?:-[a-z0-9]+){3,}\b/.test(note)) return '';
  if (/[A-Za-z0-9]+_[A-Za-z0-9]+/.test(note)) return '';
  return note;
}

/**
 * @param {string} text
 * @returns {string}
 */
function v2EnsureSentence(text) {
  var clean = text.trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : clean + '.';
}

/**
 * @param {RouterMeterImpact[]} impacts
 * @returns {string}
 */
function v2ImpactSummary(impacts) {
  var deltas = v2ImpactsToDeltas(impacts);
  /** @type {string[]} */
  var parts = [];
  METERS.forEach(function(meter) {
    var value = deltas[meter.key];
    if (!value) return;
    parts.push(meter.share + ' ' + (value > 0 ? '+' : '') + value);
  });
  return parts.join(', ');
}

/**
 * @param {RouterMeterImpact[]} impacts
 * @returns {string}
 */
function v2ImpactSummaryHtml(impacts) {
  var deltas = v2ImpactsToDeltas(impacts);
  /** @type {string[]} */
  var parts = [];
  METERS.forEach(function(meter) {
    var value = deltas[meter.key];
    if (!value) return;
    parts.push(meterImpactHtml(meter, value));
  });
  return parts.join(' ');
}

/**
 * @param {RouterQueuedTimedEffect[]} effects
 * @param {RouterMeterImpact[]} impacts
 * @param {boolean} hasImmediate
 * @returns {string}
 */
function v2TimedConsequenceText(effects, impacts, hasImmediate) {
  var note = '';
  for (var i = 0; i < effects.length; i++) {
    note = v2ProductionSafeNote(effects[i].note);
    if (note) break;
  }
  var base = note || (hasImmediate
    ? 'A delayed consequence from an earlier decision landed alongside today\'s choice.'
    : 'A delayed consequence from an earlier decision has landed.');
  var summary = v2ImpactSummary(impacts);
  return v2EnsureSentence(base) + (summary ? ' ' + summary + '.' : '');
}

/**
 * @param {RouterQueuedTimedEffect[]} effects
 * @param {RouterMeterImpact[]} impacts
 * @param {boolean} hasImmediate
 * @returns {string}
 */
function v2TimedConsequenceHtml(effects, impacts, hasImmediate) {
  var note = '';
  for (var i = 0; i < effects.length; i++) {
    note = v2ProductionSafeNote(effects[i].note);
    if (note) break;
  }
  var base = note || (hasImmediate
    ? 'A delayed consequence from an earlier decision landed alongside today\'s choice.'
    : 'A delayed consequence from an earlier decision has landed.');
  var summary = v2ImpactSummaryHtml(impacts);
  return htmlEsc(v2EnsureSentence(base)) + (summary ? ' ' + summary + '.' : '');
}

/**
 * @param {RouterQueuedLiability} liability
 * @returns {string}
 */
function v2DueLiabilityText(liability) {
  return v2ProductionSafeNote(liability.note) || 'A previous decision has returned to your desk.';
}

/**
 * @param {RouterState} routerState
 * @param {RouterSurface} surface
 * @returns {V2ConsequenceNotice|null}
 */
function v2SurfaceConsequenceNotice(routerState, surface) {
  var liability = v2DueLiabilityForSurface(routerState, surface.id);
  if (liability) {
    return { kind: 'liability', label: 'RETURNING FALLOUT', text: v2DueLiabilityText(liability) };
  }
  if (routerState.history.length > 0 && routerState.forcedSurfaceId === surface.id) {
    return { kind: 'follow-up', label: 'FOLLOW-UP', text: 'A direct follow-up from your last decision is on the desk.' };
  }
  return null;
}

/**
 * @param {RouterResolveResult} result
 * @param {RouterQueuedTimedEffect[]} timedEffects
 * @returns {V2ConsequenceNotice[]}
 */
function v2ResolveConsequenceNotices(result, timedEffects) {
  /** @type {V2ConsequenceNotice[]} */
  var notices = [];
  if (result.timedVisible.length) {
    notices.push({
      kind: 'timed',
      label: 'EARLIER EFFECTS STILL MOVING',
      text: v2TimedConsequenceText(timedEffects, result.timedVisible, result.immediateVisible.length > 0),
      html: v2TimedConsequenceHtml(timedEffects, result.timedVisible, result.immediateVisible.length > 0)
    });
  }
  return notices;
}

/**
 * @param {RouterPassiveResult} result
 * @param {RouterQueuedTimedEffect[]} timedEffects
 * @returns {V2ConsequenceNotice[]}
 */
function v2PassiveConsequenceNotices(result, timedEffects) {
  if (!result.timedVisible.length) return [];
  return [{
    kind: 'timed',
    label: 'DELAYED CONSEQUENCE',
    text: v2TimedConsequenceText(timedEffects, result.timedVisible, false),
    html: v2TimedConsequenceHtml(timedEffects, result.timedVisible, false)
  }];
}

/**
 * @param {V2ConsequenceNotice} notice
 * @returns {string}
 */
function v2NoticeHtml(notice) {
  return '<div class="v2-consequence v2-consequence--' + attrEsc(notice.kind) + '">' +
    '<span class="v2-consequence__label">' + htmlEsc(notice.label) + '</span> ' +
    '<span class="v2-consequence__text">' + (notice.html || htmlEsc(notice.text)) + '</span>' +
  '</div>';
}

/** @returns {string} */
function v2DecideContextHtml() {
  return '';
}

/** @returns {string} */
function v2ReactionFalloutHtml() {
  if (!v2Bridge.lastConsequenceNotices.length) return '';
  return '<div class="reaction-fallout__stack">' + v2Bridge.lastConsequenceNotices.map(v2NoticeHtml).join('') + '</div>';
}

/* Shuffle the display order of policy cards so the same category isn't always
   in the same slot (previously the reform card was always 1st, the Larry/cat
   card always 4th). Only policy in-tray surfaces are shuffled — manifesto and
   cabinet "pick two" screens keep their authored pairing/order. Card position
   only affects the visual tilt, and availability is keyed by choice id, so
   reordering is purely cosmetic. Runs once per surface (in
   v2PrepareNextPlayableSurface, not renderDecide) so cards don't reshuffle on
   every redraw.

   The order is fixed WITHIN a week: decision 1/2 rolls the shuffle and decision
   2/2 replays it, so cards don't jump around between the week's two screens.
   Cards shared by both decisions keep their slot; the one card that differs
   (the week's second Larry option) inherits the slot its predecessor held.
   Each new week rolls a fresh shuffle. */
/** @param {RouterProductionSurfaceView|null} surfaceView @returns {void} */
function v2ShufflePolicyCards(surfaceView) {
  if (!surfaceView || surfaceView.kind !== 'policy' || !Array.isArray(surfaceView.choices)) return;
  var c = surfaceView.choices;
  var weekMatch = /^policy-(.+)-turn-\d+$/.exec(surfaceView.id || '');
  var weekKey = weekMatch ? weekMatch[1] : null;
  var stored = weekKey ? v2Bridge.weekCardOrder[weekKey] : null;
  if (stored && stored.length === c.length) {
    /** @type {Record<string, RouterProductionChoiceView>} */
    var byId = {};
    c.forEach(function(choice) { byId[choice.id] = choice; });
    /** @type {Array<RouterProductionChoiceView|null>} */
    var next = new Array(c.length).fill(null);
    /** @type {number[]} */
    var freeSlots = [];
    stored.forEach(function(id, slot) {
      if (byId[id]) { next[slot] = byId[id]; delete byId[id]; }
      else freeSlots.push(slot);
    });
    var leftover = c.filter(function(choice) { return !!byId[choice.id]; });
    leftover.forEach(function(choice, k) { next[freeSlots[k]] = choice; });
    for (var s = 0; s < c.length; s++) c[s] = /** @type {RouterProductionChoiceView} */ (next[s]);
  } else {
    for (var i = c.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = c[i]; c[i] = c[j]; c[j] = tmp;
    }
  }
  if (weekKey) v2Bridge.weekCardOrder[weekKey] = c.map(function(choice) { return choice.id; });
}

/** @returns {'surface'|'passive'|'end'} */
function v2PrepareNextPlayableSurface() {
  v2ResolveGlobals();
  var config = /** @type {RouterConfig} */ (v2Bridge.config);
  var router = /** @type {RouterApi} */ (v2Bridge.router);
  var adapter = /** @type {RouterProductionViewAdapterApi} */ (v2Bridge.adapter);
  var routerState = /** @type {RouterState} */ (v2Bridge.routerState);
  if (!routerState || routerState.tags.endgameChoiceMade) return 'end';

  for (var guard = 0; guard < 20; guard++) {
    var candidate = router.selectNextSurface(config, routerState);
    if (candidate) {
      v2Bridge.activeSurface = candidate.surface;
      v2Bridge.activeSurfaceView = adapter.adaptSurface(config, candidate.surface);
      v2ShufflePolicyCards(v2Bridge.activeSurfaceView);
      v2Bridge.activeSurfaceNotice = v2SurfaceConsequenceNotice(routerState, candidate.surface);
      v2Bridge.choiceAvailability = {};
      router.listChoices(config, routerState, candidate.surface.id).forEach(function(availability) {
        v2Bridge.choiceAvailability[availability.choice.id] = availability;
      });
      v2Bridge.pendingChoiceId = null;
      v2Bridge.pendingChoiceView = null;
      v2Bridge.pickTwoCommitted = [];
      v2SyncMeters();
      return 'surface';
    }

    if (!routerState.queuedTimedEffects.length && !routerState.queuedLiabilities.length) break;
    var timedEffects = v2TimedEffectsLandingNow(routerState);
    var passive = router.advanceAftermath(config, routerState);
    v2Bridge.routerState = passive.state;
    routerState = passive.state;
    v2Bridge.activeSurface = null;
    v2Bridge.activeSurfaceView = null;
    v2Bridge.lastSurfaceView = {
      id: 'passive-aftermath',
      kind: 'aftermath',
      presentation: 'aftermath',
      weight: 0,
      title: 'Aftermath',
      scene: 'Consequences from earlier decisions keep moving through the country.',
      choices: []
    };
    v2Bridge.lastChoiceView = {
      id: 'passive-aftermath',
      label: 'Let the consequences land.',
      visibleImpacts: passive.timedVisible,
      media: {
        source: 'fallback',
        altText: '',
        fallback: { label: 'Aftermath', accent: '#4D7CFF', altText: '' }
      }
    };
    v2Bridge.lastResult = passive;
    v2Bridge.activeSurfaceNotice = null;
    v2Bridge.lastConsequenceNotices = v2PassiveConsequenceNotices(passive, timedEffects);
    state.lastDeltas = v2ImpactsToDeltas(passive.timedVisible);
    v2SyncMeters();
    if (v2HasVisibleDeltas(state.lastDeltas)) return 'passive';
  }

  v2Bridge.activeSurface = null;
  v2Bridge.activeSurfaceView = null;
  v2Bridge.activeSurfaceNotice = null;
  v2SyncMeters();
  return 'end';
}

/**
 * @param {RouterProductionSurfaceView} surfaceView
 * @param {string} choiceId
 * @returns {RouterProductionChoiceView|null}
 */
function v2FindChoiceView(surfaceView, choiceId) {
  for (var i = 0; i < surfaceView.choices.length; i++) {
    if (surfaceView.choices[i].id === choiceId) return surfaceView.choices[i];
  }
  return null;
}

/**
 * @param {RouterProductionChoiceView} choiceView
 * @returns {Partial<Deltas>}
 */
function v2ChoiceDeltas(choiceView) {
  return v2ImpactsToDeltas(choiceView.visibleImpacts);
}

/**
 * @param {RouterProductionChoiceView} choiceView
 * @returns {boolean}
 */
function v2ChoiceHasPress(choiceView) {
  return !!choiceView.reaction;
}

/**
 * @param {RouterProductionSurfaceView|null} surfaceView
 * @returns {boolean}
 */
function v2SkipsFullReaction(surfaceView) {
  // These get only the small (spinny-paper) reaction: non-final policy
  // decisions, private beats (the One Visit set-piece), the pick-two bonus
  // beats, and manifesto picks. The full weekly reaction fires from the round
  // ender (the week's second policy decision) — see v2IsRoundEndingSetpiece.
  return !!surfaceView && (
    surfaceView.kind === 'private' ||
    surfaceView.kind === 'policy' ||
    surfaceView.presentation === 'pick-two' ||
    v2IsManifestoSurface(surfaceView)
  );
}

/* The round-ending decision — the "final decision of the week" — is the week's
   SECOND policy decision. After it commits, the full weekly reaction (with the
   manifesto verdict) shows, BEFORE the week's closing beat (One Visit / the
   pick-two beats), which then only gets the light spinny-paper reaction. */
/** @param {any} sv @returns {boolean} */
function v2IsRoundEndingSetpiece(sv) {
  return !!sv && sv.kind === 'policy' && /-turn-2$/.test(sv.id || '');
}

/** @type {Record<string,string>} */
var V2_PROMISE_TITLES = {
  nhs: 'NHS Waiting Times', taxLoopholes: 'Closing Tax Loopholes',
  housing: 'the Housing Shortage', carbon: 'Carbon Emissions',
  costOfLiving: 'the Cost of Living Crisis', water: 'Nationalising Water'
};
/** @returns {string} the promise the just-finished round was about */
function v2WeekPromiseTitle() {
  for (var i = 0; i < v2Bridge.weekDecisions.length; i++) {
    var m = /^policy-(.+)-turn-/.exec(v2Bridge.weekDecisions[i].surface.id || '');
    if (m) return V2_PROMISE_TITLES[m[1]] || m[1];
  }
  return 'your manifesto promise';
}

/* Weekly verdict for the two-decision week: enacting the big locked fix
   (role 'upgraded' — only reachable by taking the reform first) fulfils the
   promise, the quick fix alone (role 'direct') is a partial delivery, and a
   week of neither (cats, or a reform with no follow-through) fails it. */
/** @returns {{tier:string, count:number, promise:string}} */
function v2WeekVerdict() {
  var tookBig = false, tookQuick = false;
  v2Bridge.weekDecisions.forEach(function(d) {
    var role = d.choice && d.choice.cardRole;
    if (role === 'upgraded') tookBig = true;
    if (role === 'direct') tookQuick = true;
  });
  var promise = v2WeekPromiseTitle();
  var tier = tookBig ? 'fulfilled' : tookQuick ? 'partly' : 'failed';
  return { tier: tier, count: (tookBig ? 1 : 0) + (tookQuick ? 1 : 0), promise: promise };
}

/* Compute this week's verdict AND record it on state.weekVerdicts (in play order)
   so the endgame can count how many promises were fully delivered. Called once,
   at the moment the weekly reaction is opened. */
/** @returns {{tier:string, count:number, promise:string}} */
function v2RecordWeekVerdict() {
  var verdict = v2WeekVerdict();
  if (!state.weekVerdicts) state.weekVerdicts = [];
  state.weekVerdicts.push(verdict);
  return verdict;
}

/* Did the player enact Electoral Reform (the Week 3 legacy lever)? This is the
   gate on re-election in the endgame. */
/** @returns {boolean} */
function v2EnactedElectoralReform() {
  var rs = v2Bridge.routerState;
  return !!(rs && rs.tags && rs.tags['electoral-reform']);
}

/* Combined press/social feed for the weekly reaction: the lead front page plus
   one Mewsky and one Hex post from each of the round's policy decisions. */
/** @returns {{fronts:Array<any>, msky:Array<Post>, hex:Array<Post>}} */
function v2WeekFeeds() {
  /** @type {Array<any>} */ var fronts = [];
  /** @type {Array<Post>} */ var msky = [];
  /** @type {Array<Post>} */ var hex = [];
  v2Bridge.weekDecisions.forEach(function(d) {
    var c = d.choice;
    if (!c || !c.reaction) return;
    var np = v2PickNewspaper(c.reaction, c);
    if (np) fronts.push({ masthead: np.masthead, headline: np.headline, image: np.image, altText: np.altText });
    if (c.reaction.bluesky && c.reaction.bluesky[0]) msky.push(c.reaction.bluesky[0]);
    var xt = v2PickHex(c.reaction, c);
    if (xt && xt[0]) hex.push(xt[0]);
  });
  return { fronts: fronts, msky: msky, hex: hex };
}

/** @param {any} surfaceView @returns {boolean} is this a manifesto (cabinet agenda) pick */
function v2IsManifestoSurface(surfaceView) {
  return !!surfaceView && (surfaceView.presentation === 'agenda-pair' || /^cabinet-pair-pair\d$/.test(surfaceView.id || ''));
}

/** @returns {void} */
function v2AfterCommittedChoice() {
  // The round's final decision (a set-piece) opens the once-a-week full reaction.
  if (v2IsRoundEndingSetpiece(v2Bridge.lastSurfaceView)) {
    v2Bridge.weekReaction = v2RecordWeekVerdict();
    go('reaction');
    return;
  }
  if (v2SkipsFullReaction(v2Bridge.lastSurfaceView)) {
    v2Bridge.lastConsequenceNotices = [];
    nextV2Beat();
    return;
  }
  go('reaction');
}

/**
 * @param {RouterProductionChoiceView} choiceView
 * @returns {'negative'|'neutral'}
 */
function v2ReactionTone(choiceView) {
  var deltas = choiceView.visibleImpacts;
  var pressDelta = 0;
  var total = 0;
  deltas.forEach(function(impact) {
    total += impact.delta;
    if (impact.meter === 'press') pressDelta += impact.delta;
  });
  return pressDelta < 0 || (pressDelta === 0 && total < 0) ? 'negative' : 'neutral';
}

/* How softened the press is right now, on a 0–3 scale (0 = hilariously vicious,
   3 = fair/measured). Tied to the press-reform thaw — the same ladder the
   manifesto-pick montages use — so the whole press reads consistently. Swap the
   body for a press-meter band if we ever want it to react to the meter directly. */
/** @returns {number} 0..3 */
function v2PressTier() {
  return v2MediaReformLevel();
}

/* Pick a card's lead newspaper for the current press tier. Cards authored with a
   4-step `tiers` array scale with the thaw; un-migrated cards fall back to the
   old negative/neutral pair (chosen by the choice's own impact). */
/**
 * @param {any} reaction
 * @param {RouterProductionChoiceView} choiceView
 * @returns {any}
 */
function v2PickNewspaper(reaction, choiceView) {
  var n = reaction && reaction.newspaper;
  if (!n) return null;
  if (n.tiers) { var t = v2PressTier(); return n.tiers[t < 0 ? 0 : t > 3 ? 3 : t]; }
  return n[v2ReactionTone(choiceView)];
}

/* Pick a card's Hex (X-style) posts for the current press tier, same fallback. */
/**
 * @param {any} reaction
 * @param {RouterProductionChoiceView} choiceView
 * @returns {Array<Post>}
 */
function v2PickHex(reaction, choiceView) {
  var x = reaction && reaction.xtwitter;
  if (!x) return [];
  if (x.tiers) { var t = v2PressTier(); return x.tiers[t < 0 ? 0 : t > 3 ? 3 : t] || []; }
  return x[v2ReactionTone(choiceView)] || [];
}

/**
 * @param {string} choiceId
 * @returns {void}
 */
function pickV2Choice(choiceId) {
  if (!v2Bridge.activeSurface || !v2Bridge.activeSurfaceView) return;
  var availability = v2Bridge.choiceAvailability[choiceId];
  if (availability && !availability.available) return;
  var choiceView = v2FindChoiceView(v2Bridge.activeSurfaceView, choiceId);
  if (!choiceView) return;
  demoRecordStep();  // snapshot the decide screen before committing the choice
  v2Bridge.pendingChoiceId = choiceId;
  v2Bridge.pendingChoiceView = choiceView;
  // Manifesto picks always get the light press montage (spin + social), even
  // though they carry no bespoke reaction data — it's auto-generated.
  if (v2ChoiceHasPress(choiceView) || v2IsManifestoSurface(v2Bridge.activeSurfaceView)) {
    go('press');
    return;
  }
  v2CommitPendingChoice();
  v2AfterCommittedChoice();
}

/* Larry-loyalty tracking for the bonus ending: the player stays "loyal" only by
   taking every Larry option they're actually offered. The first time an
   available Larry card is on the table and they pick something else, the bonus
   is off. (Petting/shooing Larry is handled separately via state.larryNice.) */
/**
 * @param {any} surfaceView the surface that was just resolved
 * @param {string[]} chosenIds the id(s) the player committed
 * @returns {void}
 */
function v2NoteLarryLoyalty(surfaceView, chosenIds) {
  if (!state.larryLoyal || !surfaceView || !surfaceView.choices) return;
  if (surfaceView.id === V2_LARRY_SURFACE_ID) return;  // pet/shoo handled via state.larryNice
  var larryChoices = surfaceView.choices.filter(function(/** @type {any} */ c) {
    if (c.cardRole !== 'larry') return false;
    var a = v2Bridge.choiceAvailability[c.id];
    return !a || a.available;  // only count Larry options the player could actually take
  });
  if (!larryChoices.length) return;
  var tookLarry = larryChoices.some(function(/** @type {any} */ c) { return chosenIds.indexOf(c.id) !== -1; });
  if (!tookLarry) state.larryLoyal = false;
}

/** @returns {void} */
function v2CommitPendingChoice() {
  v2ResolveGlobals();
  if (!v2Bridge.routerState || !v2Bridge.activeSurface || !v2Bridge.activeSurfaceView || !v2Bridge.pendingChoiceId) return;
  var router = /** @type {RouterApi} */ (v2Bridge.router);
  var config = /** @type {RouterConfig} */ (v2Bridge.config);
  var timedEffects = v2TimedEffectsLandingNow(v2Bridge.routerState);
  var result = router.resolveChoice(config, v2Bridge.routerState, v2Bridge.activeSurface.id, v2Bridge.pendingChoiceId);
  v2Bridge.routerState = result.state;
  v2Bridge.lastResult = result;
  v2Bridge.lastSurfaceView = v2Bridge.activeSurfaceView;
  v2Bridge.lastChoiceView = v2Bridge.pendingChoiceView;
  v2NoteLarryLoyalty(v2Bridge.activeSurfaceView, [v2Bridge.pendingChoiceId]);
  // Track the round's policy decisions for the weekly verdict; a new manifesto
  // pick starts a fresh week.
  if (v2Bridge.activeSurfaceView.kind === 'cabinet') v2Bridge.weekDecisions = [];
  if (v2Bridge.activeSurfaceView.kind === 'policy') {
    v2Bridge.weekDecisions.push({ surface: v2Bridge.lastSurfaceView, choice: v2Bridge.lastChoiceView });
  }
  v2Bridge.lastConsequenceNotices = v2ResolveConsequenceNotices(result, timedEffects);
  state.lastPolicy = v2Bridge.pendingChoiceId;
  state.lastDeltas = v2ResolveResultDeltas(result);
  v2Bridge.pendingChoiceId = null;
  v2Bridge.pendingChoiceView = null;
  v2Bridge.activeSurfaceNotice = null;
  v2SyncMeters();
}

/** @returns {void} */
function nextV2Beat() {
  v2Bridge.weekReaction = null;  // leaving any weekly reaction
  if (!v2Bridge.routerState || v2Bridge.routerState.tags.endgameChoiceMade) {
    go('end');
    return;
  }
  var next = v2PrepareNextPlayableSurface();
  if (next === 'surface') {
    go('decide');
  } else if (next === 'passive') {
    go('reaction');
  } else {
    go('end');
  }
}

/** @param {string} text @returns {string} */
function htmlEsc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/** @returns {string[]} the three active scenario keys, in play order */
function activeScenarioKeys() {
  return PAIR_IDS.map(function(pair) {
    return CABINET_TO_SCENARIO[pair][state.cabinet[pair] || 'a'];
  });
}

/** @returns {Scenario} the scenario currently being played */
function currentScenario() {
  return SCENARIOS[activeScenarioKeys()[state.scenarioIndex]];
}

/* ---------- flat card index ----------
   Cards are nested in & owned by their scenario. Build a flat lookup so the
   engine can address any card by a stable string id (scenarioId + '#' + handIndex),
   used for passedPolicies, lastPolicy and onclick handlers. */
/** @type {Record<string, HandCard>} */
var CARDS = {};
Object.keys(SCENARIOS).forEach(function(sid) {
  (/** @type {HandCard[]} */ (SCENARIOS[sid].hand || [])).forEach(function(
    /** @type {HandCard} */ card,
    /** @type {number} */ i
  ) { CARDS[sid + '#' + i] = card; });
});
/**
 * @param {string} id card id (scenarioId#handIndex)
 * @returns {HandCard}
 */
function getCard(id) { return CARDS[id]; }


/* ---------- which cards appear this turn ----------
   A card is offered if it has no `turns` (shown every turn) or its `turns`
   list includes the current scenarioTurn. Parked cards (turns: []) never show. */
/** @returns {string[]} the card ids offered this turn */
function getTurnCards() {
  var sid = activeScenarioKeys()[state.scenarioIndex];
  var hand = SCENARIOS[sid].hand;
  /** @type {string[]} */
  var ids = [];
  for (var i = 0; i < hand.length; i++) {
    var c = hand[i];
    if (!c.turns || c.turns.indexOf(state.scenarioTurn) !== -1) ids.push(sid + '#' + i);
  }
  return ids;
}

/* ---------- v2 production decision surface ---------- */
var V2_LARRY_SURFACE_ID = 'flat-larry-at-your-ankles';
var V2_LARRY_PET_CHOICE_ID = 'pet-larry';

function renderV2Decide() {
  var surface = v2Bridge.activeSurfaceView;
  var routerState = v2Bridge.routerState;
  if (!surface || !routerState) {
    var prepared = v2PrepareNextPlayableSurface();
    if (prepared !== 'surface') {
      go(prepared === 'passive' ? 'reaction' : 'end');
      return;
    }
    surface = /** @type {RouterProductionSurfaceView} */ (v2Bridge.activeSurfaceView);
    routerState = /** @type {RouterState} */ (v2Bridge.routerState);
  }

  var canvas = document.getElementById('canvas');
  if (canvas) canvas.setAttribute('data-v2-surface', surface.id);
  // The progress bar runs the whole of week 1 starting at the Letter of Last
  // Resort; v2UpdateWeekProgress maps each decision surface to its dot.
  v2UpdateWeekProgress(surface);
  renderWeekProgress();
  document.getElementById('decide-week').textContent =
    v2IsRoundEndingSetpiece(surface)
      ? 'THE FINAL DECISION OF THE WEEK'
      : 'IN-TRAY ' + (routerState.beat + 1) + ' · ' + v2SurfaceLabel(surface);
  document.getElementById('decide-title').textContent = surface.title;

  // Larry's two-policy lever: petting upgrades the week from one policy to two
  // (heading starts at "One More Policy"); shooing keeps it at "Two More
  // Policies" but he later docks you to one. See v2PickTwoIntroHtml.
  if (surface.id === 'week2-policy-pick') {
    document.getElementById('decide-title').textContent =
      state.larryNice === true ? 'One More Policy' : 'Two More Policies';
  }
  var subEl = document.getElementById('decide-sub');
  subEl.innerHTML = htmlEsc(surface.scene) + v2DecideContextHtml();
  // Player-facing subcopy is hidden by default; show it only on the framing
  // surfaces that need explaining — the opening Letter and the manifesto picks.
  var showSub = surface.kind === 'cabinet' || surface.id === 'flat-the-letter-of-last-resort' || surface.id === 'flat-one-visit-one-camera';
  subEl.classList.toggle('decide-sub--show', showSub);

  if (surface.id === V2_LARRY_SURFACE_ID) {
    renderV2LarrySurface(surface);
    return;
  }

  renderDecideMeters();

  if (surface.presentation === 'pick-two') {
    v2Bridge.pickTwoSelected = [];   // fresh selection each time we enter the beat
    renderV2PickTwoGrid(surface);
    return;
  }

  var grid = document.getElementById('cards-grid');
  grid.className = 'cards-grid cards-grid--v2 cards-grid--v2-' + surface.presentation + ' cards-grid--v2-kind-' + surface.kind;
  grid.innerHTML = surface.choices.map(function(choice, i) {
    return renderV2ChoiceCard(surface, choice, i);
  }).join('');
}

/* ---------- "pick two of four" beat ----------
   A bonus decision where the player spends two policy slots out of four options,
   then confirms. Resolves both picks through the router in order, so their meter
   moves and tags (e.g. press-reform, electoral-reform) all land. */

/* First-pass advisor casting for the pick-two cards (Becky to tune): each policy
   gets the face of a fitting cabinet member, and the two Larry cards get a cat
   adviser. Reuses the real portrait art in images/cabinet/. */
/** @type {Record<string, string>} */
var PICK_TWO_FIGURES = {
  'online-media-reform': 'images/cabinet/reg_broadsheet.png',
  'improve-public-transport': 'images/cabinet/mason_carrick.png',
  'fix-potholes': 'images/cabinet/chunk_slumberton.png',
  'enact-electoral-reform': 'images/cabinet/vera_suffrage.png',
  'enact-wealth-tax': 'images/cabinet/isla_mann.png',
  'scrap-hospital-parking': 'images/cabinet/dr_ina_tentcare.png',
  'larry-national-statue': 'images/cabinet/watson_tabby.png',
  'larry-cat-civil-servants': 'images/cabinet/sir_pur_reginald.png'
};

/* Job title shown under each pick-two card, matching the advisor cast in
   PICK_TWO_FIGURES. Titles are each character's canonical cabinet role (Becky to
   tune alongside the casting above). */
/** @type {Record<string, string>} */
var PICK_TWO_ROLES = {
  'online-media-reform': 'CULTURE SECRETARY',
  'improve-public-transport': 'HOUSING SECRETARY',
  'fix-potholes': 'CRAFT & COMMUNITIES CHAMPION',
  'enact-electoral-reform': 'CONSTITUTION MINISTER',
  'enact-wealth-tax': 'CHANCELLOR',
  'scrap-hospital-parking': 'HEALTH SECRETARY',
  'larry-national-statue': 'LOCAL GOVERNMENT STANDARDS MINISTER',
  'larry-cat-civil-servants': "CHIEF MOUSER'S ADVISER"
};

/* How many policy slots a pick-two beat actually grants. Week 2 ("Two More
   Policies") is Larry's lever: pet him earlier and he wins you an extra slot
   (you genuinely pick two); shoo him and he takes one back (just the one).
   Every other pick-two beat is two. */
/**
 * @param {any} surface
 * @returns {number} 1 or 2
 */
function v2PickTwoLimit(surface) {
  if (surface && surface.id === 'week2-policy-pick' && state.larryNice === false) return 1;
  return 2;
}

/* Intro copy shown above a pick-two beat. Week 2 plays out the petting/shooing
   pay-off as a little Larry exchange; Week 3 ("Your Legacy") gets a plain
   framing line. Returns ready-to-insert HTML. */
/**
 * @param {any} surface
 * @returns {string}
 */
function v2PickTwoIntroHtml(surface) {
  /** @param {string} html @returns {string} */
  function wrap(html) { return '<div class="pick-two__intro">' + html + '</div>'; }
  /* The Larry exchange sits on ONE line (quoted, with Larry's meow in yellow)
     so the intro doesn't push the four cards below the fold on desktop. */
  /** @param {string} html @returns {string} */
  function larryInline(html) {
    return '<span class="pick-two__larry-inline">Larry: "Meow!"</span> ' + html;
  }
  if (surface && surface.id === 'week2-policy-pick') {
    if (state.larryNice === true) {
      // Petted Larry: he wins you a bonus second policy (one -> two).
      return wrap(
        '<p class="pick-two__line">"We have time for one more policy this week Prime Minister" ' +
        larryInline('"Oh go on, you can choose two."') + '</p>');
    }
    if (state.larryNice === false) {
      // Shooed Larry: he docks you a policy (two -> one).
      return wrap(
        '<p class="pick-two__line">"We have time for two more policies this week" ' +
        larryInline('"Actually, only time for one. (maybe you shouldn\'t have shooed him!)"') + '</p>');
    }
    return wrap('<p class="pick-two__line">We\'ve got time for two more policies this week, Prime Minister. Which will you choose?</p>');
  }
  if (surface && surface.id === 'week3-legacy-pick') {
    return wrap('<p class="pick-two__line">It\'s your final week in office, Prime Minister. There\'s room for two last policies. Which will you choose?</p>');
  }
  return '';
}

/**
 * @param {RouterProductionSurfaceView} surface
 * @returns {void}
 */
function renderV2PickTwoGrid(surface) {
  var grid = document.getElementById('cards-grid');
  if (!grid) return;
  var selected = v2Bridge.pickTwoSelected || [];
  var limit = v2PickTwoLimit(surface);
  grid.className = 'cards-grid cards-grid--v2 cards-grid--v2-pick-two cards-grid--v2-kind-' + surface.kind;
  var cards = surface.choices.map(function(choice, i) {
    return renderV2PickTwoCard(surface, choice, i, selected.indexOf(choice.id) !== -1);
  }).join('');
  var n = selected.length;
  var ready = n === limit;
  grid.innerHTML =
    v2PickTwoIntroHtml(surface) +
    '<div class="pick-two__cards">' + cards + '</div>' +
    '<div class="pick-two__bar">' +
      '<span class="pick-two__count">' + n + ' of ' + limit + ' chosen</span>' +
      '<button class="btn btn--go pick-two__confirm" onclick="confirmV2PickTwo()"' + (ready ? '' : ' disabled') + '>' +
        (limit === 1 ? 'Enact this policy →' : 'Enact these two →') +
      '</button>' +
    '</div>';
}

/**
 * @param {RouterProductionSurfaceView} surface
 * @param {RouterProductionChoiceView} choice
 * @param {number} idx
 * @param {boolean} isSelected
 * @returns {string}
 */
function renderV2PickTwoCard(surface, choice, idx, isSelected) {
  var availability = v2Bridge.choiceAvailability[choice.id];
  var locked = !!availability && !availability.available;
  var rot = idx % 2 === 0 ? 'card--tilt-l' : 'card--tilt-r';
  var displayLabel = choice.label;
  var pitch = choice.note || '';
  var deltas = v2ChoiceDeltas(choice);
  // Legacy pick: staying loyal to Larry (chose every Larry card so far)
  // upgrades the cat card from "Hire 10 More Cat Civil Servants" to
  // "Give Cats the Vote".
  if (choice.id === 'larry-cat-civil-servants' && state.larryLoyal === true) {
    displayLabel = 'Give Cats the Vote';
    pitch = 'You backed Larry at every turn — now every cat gets the vote.';
  }
  // Advisor art uses the same large standing-figure treatment as the policy-hand
  // cards (anchored bottom-right), not a cramped portrait circle.
  var fig = PICK_TWO_FIGURES[choice.id];
  var figureHtml = fig
    ? '<img class="decision-card__figure' + (CAT_FIGURES[fig] ? ' decision-card__figure--cat' : '') +
        (locked ? ' decision-card__figure--locked' : '') + '" src="' + attrEsc(fig) + '" alt="">'
    : '';
  var role = PICK_TWO_ROLES[choice.id] || '';
  var accent = v2AccentFor(surface, choice);
  var ctaHtml = locked ? v2UnavailableStatusHtml(choice, availability) :
    '<div><span class="decision-card__cta" style="background:' + attrEsc(accent) + ';">' +
      (isSelected ? 'PICKED ✓' : 'PICK THIS →') +
    '</span></div>';
  var cls = 'card decision-card decision-card--pickable ' + rot +
    (fig ? ' decision-card--figure' : '') +
    (isSelected ? ' decision-card--selected' : '') + (locked ? ' decision-card--locked' : '');
  return '<button type="button"' + (locked ? ' disabled' : '') +
    ' onclick="toggleV2Pick(' + attrEsc(JSON.stringify(choice.id)) + ')" class="' + cls + '">' +
    '<span class="pick-two__check" aria-hidden="true">✓</span>' +
    '<div class="decision-card__body">' +
      '<div class="decision-card__name">' + htmlEsc(displayLabel) + '</div>' +
      (role ? '<div class="decision-card__role">' + htmlEsc(role) + '</div>' : '') +
      (pitch ? '<div class="decision-card__pitch">' + htmlEsc(pitch) + '</div>' : '') +
      renderDeltaChips(deltas, locked) +
      ctaHtml +
    '</div>' +
    figureHtml +
  '</button>';
}

/**
 * Toggle a card in/out of the two-slot selection (cap of 2), then re-render.
 * @param {string} choiceId
 * @returns {void}
 */
function toggleV2Pick(choiceId) {
  if (!v2Bridge.activeSurfaceView) return;
  var availability = v2Bridge.choiceAvailability[choiceId];
  if (availability && !availability.available) return;
  var sel = v2Bridge.pickTwoSelected || (v2Bridge.pickTwoSelected = []);
  var limit = v2PickTwoLimit(v2Bridge.activeSurfaceView);
  var at = sel.indexOf(choiceId);
  if (at !== -1) {
    sel.splice(at, 1);
  } else if (sel.length < limit) {
    sel.push(choiceId);
  }
  renderV2PickTwoGrid(v2Bridge.activeSurfaceView);
}

/**
 * Commit both chosen policies: resolve each through the router (so meters + tags
 * land), combine the deltas for the dials, then advance to the forced follow-up.
 * @returns {void}
 */
function confirmV2PickTwo() {
  var sel = (v2Bridge.pickTwoSelected || []).slice();
  if (!v2Bridge.routerState || !v2Bridge.activeSurface || !v2Bridge.activeSurfaceView) return;
  if (sel.length !== v2PickTwoLimit(v2Bridge.activeSurfaceView)) return;
  var router = /** @type {RouterApi} */ (v2Bridge.router);
  var config = /** @type {RouterConfig} */ (v2Bridge.config);
  var surfaceId = v2Bridge.activeSurface.id;
  /** @type {Record<string, number>} */
  var combined = {};
  sel.forEach(function(cid) {
    var result = router.resolveChoice(config, v2Bridge.routerState, surfaceId, cid);
    v2Bridge.routerState = result.state;
    v2Bridge.lastResult = result;
    var d = v2ResolveResultDeltas(result);
    ['living', 'press', 'politics', 'capital'].forEach(function(k) { combined[k] = (combined[k] || 0) + (d[k] || 0); });
  });
  var endingSurface = v2Bridge.activeSurfaceView;
  v2NoteLarryLoyalty(endingSurface, sel);
  v2Bridge.lastSurfaceView = endingSurface;
  v2Bridge.lastChoiceView = v2FindChoiceView(endingSurface, sel[0]);
  v2Bridge.pickTwoCommitted = sel;
  state.lastPolicy = sel[sel.length - 1];
  state.lastDeltas = combined;
  v2Bridge.lastConsequenceNotices = [];
  v2Bridge.pickTwoSelected = [];
  v2SyncMeters();
  // Show the light press reaction to the picks; its button then advances to the
  // next beat (or, after the Week 3 legacy pick, straight to the election).
  go('press');
}

/**
 * Restores the original Larry start-step visual inside the v2 router flow.
 * @param {RouterProductionSurfaceView} surface
 * @returns {void}
 */
function renderV2LarrySurface(surface) {
  renderDecideMeters();
  var grid = document.getElementById('cards-grid');
  grid.className = 'cards-grid v2-larry-surface';
  grid.removeAttribute('data-larry-choice-made');
  grid.innerHTML =
    '<div class="start-larry v2-larry-surface__body">' +
      '<img class="start-larry__figure" src="images/larry-pet-shoo.png" alt="Larry the cat winding around your ankles">' +
      '<div class="start-larry__title">' + htmlEsc(surface.title) + '</div>' +
      '<div class="start-larry__sub">' + htmlEsc(surface.scene) + '</div>' +
      '<div class="start-larry__actions">' +
        surface.choices.map(renderV2LarryChoiceButton).join('') +
      '</div>' +
      '<div id="v2-larry-toast" class="larry-toast" hidden>Larry will remember this.</div>' +
    '</div>';
}

/**
 * @param {RouterProductionChoiceView} choice
 * @returns {string}
 */
function renderV2LarryChoiceButton(choice) {
  var availability = v2Bridge.choiceAvailability[choice.id];
  var locked = !!availability && !availability.available;
  var buttonClass = choice.id === V2_LARRY_PET_CHOICE_ID ? 'btn--go' : 'btn--ghost';
  return '<button onclick="pickV2LarryChoice(' + attrEsc(JSON.stringify(choice.id)) + ')" class="btn ' + buttonClass + ' start-larry__button"' +
    (locked ? ' disabled' : '') + '>' + htmlEsc(choice.label) + '</button>';
}

/* Larry reacts to the click: hearts drift up from the cat on a pet, one grumpy
   face on a shoo. Instant feedback so the toast pause doesn't read as a freeze. */
/** @param {boolean} nice @param {Element|null} host the .start-larry block @returns {void} */
function larryChoiceFloats(nice, host) {
  if (!host) return;
  var emoji = nice ? ['❤️', '❤️', '❤️'] : ['😾'];
  var offsets = nice ? [-16, 4, 18] : [2];  // % from centre, spread across the cat
  emoji.forEach(function(e, i) {
    var span = document.createElement('span');
    span.className = 'larry-float';
    span.textContent = e;
    span.style.left = 'calc(50% + ' + offsets[i] + '%)';
    span.style.animationDelay = (i * 0.22) + 's';
    host.appendChild(span);
  });
}

/**
 * Preserve the old Larry toast pause for player clicks, while still committing
 * the choice through the v2 router data.
 * @param {string} choiceId
 * @returns {void}
 */
function pickV2LarryChoice(choiceId) {
  if (!v2Bridge.activeSurface || v2Bridge.activeSurface.id !== V2_LARRY_SURFACE_ID) {
    pickV2Choice(choiceId);
    return;
  }
  var grid = document.getElementById('cards-grid');
  if (grid && grid.getAttribute('data-larry-choice-made') === 'true') return;
  var availability = v2Bridge.choiceAvailability[choiceId];
  if (availability && !availability.available) return;
  if (!v2Bridge.activeSurfaceView) return;
  var choiceView = v2FindChoiceView(v2Bridge.activeSurfaceView, choiceId);
  if (!choiceView) return;

  state.larryNice = choiceId === V2_LARRY_PET_CHOICE_ID;
  v2Bridge.pendingChoiceId = choiceId;
  v2Bridge.pendingChoiceView = choiceView;
  if (grid) grid.setAttribute('data-larry-choice-made', 'true');
  document.querySelectorAll('.start-larry__button').forEach(function(/** @type {any} */ button) {
    button.disabled = true;
  });
  v2CommitPendingChoice();

  larryChoiceFloats(state.larryNice === true, document.querySelector('.v2-larry-surface__body'));
  var toast = document.getElementById('v2-larry-toast');
  if (toast) toast.hidden = false;
  setTimeout(function() {
    if (toast) toast.hidden = true;
    nextV2Beat();
  }, 1600);
}

/**
 * @param {RouterProductionSurfaceView} surface
 * @returns {string}
 */
function v2SurfaceLabel(surface) {
  if (surface.presentation === 'agenda-pair') return 'CABINET AGENDA';
  if (surface.presentation === 'pick-two') return 'TWO MORE POLICIES';
  if (surface.presentation === 'policy-hand') return 'POLICY DECISION';
  if (surface.presentation === 'aftermath' || surface.kind === 'aftermath') return 'AFTERMATH';
  return v2SurfaceKindLabel(surface.kind) + ' BRIEFING';
}

/** @type {number} */
var PUBLIC_POLICY_COUNT = 2;

/* ---------- week / day progress ----------
   The timeline is framed as weeks (one per scenario/reform stream): a manifesto
   pick, one day per policy decision, plus each week's framing beats. So the
   weeks stay a similar length, One Visit One Camera counts as WEEK 2's opening
   beat (it still plays right after week 1's verdict):
     Week 1: Letter, Larry, manifesto, two decisions            (5 dots)
     Week 2: One Visit, manifesto, two decisions, the pick-two  (5 dots)
     Week 3: manifesto, two decisions, the legacy pick          (4 dots)
   Other beats keep the last known day so the bar stays steady. */
/** @type {number} */
var DAYS_PER_WEEK = PUBLIC_POLICY_COUNT + 2;

/* Week 1 opens with two extra beats — the Letter of Last Resort, then Larry —
   before the manifesto pick. */
/** @type {number} */
var WEEK1_OPENING_BEATS = 2;

/** @param {number} week @returns {number} total dots (days) shown for that week */
function daysInWeek(week) {
  return week === 3 ? DAYS_PER_WEEK : DAYS_PER_WEEK + 1;
}

/** @param {number} week @returns {number} the dot of week's manifesto pick (decisions follow it) */
function manifestoDay(week) {
  return week === 1 ? WEEK1_OPENING_BEATS + 1 : week === 2 ? 2 : 1;
}

/** @returns {number} manifesto (cabinet-pair) picks made so far */
function v2CountChosenPairs() {
  var tags = (v2Bridge.routerState && v2Bridge.routerState.tags) || {};
  var n = 0;
  if (tags['pair-pair1-chosen']) n += 1;
  if (tags['pair-pair2-chosen']) n += 1;
  if (tags['pair-pair3-chosen']) n += 1;
  return n;
}

/** @param {any} surface the decide surface on screen */
function v2UpdateWeekProgress(surface) {
  if (!surface) return;
  var id = surface.id || '';
  // Week 1's two opening beats, before any manifesto pick.
  if (id === 'flat-the-letter-of-last-resort') { state.weekNum = 1; state.weekDay = 1; return; }
  if (id === V2_LARRY_SURFACE_ID)               { state.weekNum = 1; state.weekDay = 2; return; }
  // One Visit plays between week 1's verdict and week 2's manifesto pick, and
  // counts as week 2's opening beat so the weeks stay a similar length.
  if (id === 'flat-one-visit-one-camera') { state.weekNum = 2; state.weekDay = 1; return; }
  var pairMatch = /^cabinet-pair-pair(\d)$/.exec(id);
  if (pairMatch) {            // a manifesto pick
    var w = Number(pairMatch[1]);
    state.weekNum = w;
    state.weekDay = manifestoDay(w);
    return;
  }
  var policyIdx = v2PolicyIndexFromSurface(surface);
  if (policyIdx) {            // policy turn K -> the K-th dot after the manifesto
    if (!state.weekNum) state.weekNum = Math.max(1, v2CountChosenPairs());
    state.weekDay = Math.min(daysInWeek(state.weekNum), policyIdx + manifestoDay(state.weekNum));
    return;
  }
  // The pick-two beats close their weeks with the final dot.
  if (id === 'week2-policy-pick') { state.weekNum = 2; state.weekDay = daysInWeek(2); return; }
  if (id === 'week3-legacy-pick') { state.weekNum = 3; state.weekDay = daysInWeek(3); return; }
  // crisis / endgame / other: keep the current week & day, just ensure set
  if (!state.weekNum) state.weekNum = Math.max(1, v2CountChosenPairs());
  if (!state.weekDay) state.weekDay = 1;
}

/* Draw the week progress bar (day pips) into #week-progress. */
function renderWeekProgress() {
  var el = document.getElementById('week-progress');
  if (!el) return;
  var week = state.weekNum || 1;
  var day = state.weekDay || 1;
  var total = daysInWeek(week);
  var pips = '';
  for (var i = 1; i <= total; i++) {
    if (i > 1) pips += '<span class="week-progress__link"></span>';
    pips += '<span class="week-progress__pip' + (i <= day ? ' week-progress__pip--done' : '') + '"></span>';
  }
  // Total weeks is hard-wired to 3 (the shipped v2 flow's three cabinet picks).
  // Don't use SCENARIO_COUNT here: it's derived from the legacy v1 CABINET_TO_SCENARIO
  // map, which is empty in the v2 build, so it would render "OF 0".
  var weeksTotal = 3;
  el.innerHTML =
    '<div class="week-progress__head">' +
      '<span class="week-progress__label">WEEK ' + week + ' OF ' + weeksTotal + ' PROGRESS</span>' +
    '</div>' +
    '<div class="week-progress__track">' + pips + '</div>';
}

/**
 * Player-facing policy progress. The router can spend many private beats
 * between policy turns, but the public rhythm is still the three big policy
 * decisions inside a chosen reform arc.
 * @param {RouterProductionSurfaceView|null|undefined} surface
 * @returns {string}
 */
function publicPolicyLabel(surface) {
  var policyIndex = publicPolicyIndexForSurface(surface);
  return 'Policy ' + policyIndex + ' of ' + PUBLIC_POLICY_COUNT;
}

/**
 * @param {RouterProductionSurfaceView|null|undefined} surface
 * @returns {number}
 */
function publicPolicyIndexForSurface(surface) {
  var surfacePolicyIndex = v2PolicyIndexFromSurface(surface);
  if (surfacePolicyIndex !== null) return surfacePolicyIndex;

  var lastSurfacePolicyIndex = v2PolicyIndexFromSurface(v2Bridge.lastSurfaceView);
  if (lastSurfacePolicyIndex !== null) return lastSurfacePolicyIndex;

  var routerState = v2Bridge.routerState;
  var tags = routerState && routerState.tags || {};
  var latestCompletedPolicyIndex = 0;
  Object.keys(tags).forEach(function(tag) {
    if (!tags[tag]) return;
    var match = /^policy-.+-turn-(\d+)-complete$/.exec(tag);
    if (!match) return;
    latestCompletedPolicyIndex = Math.max(latestCompletedPolicyIndex, Number(match[1]));
  });
  return clampPublicPolicyIndex(latestCompletedPolicyIndex || 1);
}

/**
 * @param {RouterProductionSurfaceView|null|undefined} surface
 * @returns {number|null}
 */
function v2PolicyIndexFromSurface(surface) {
  if (!surface) return null;
  var match = /^policy-.+-turn-(\d+)$/.exec(surface.id);
  if (match) return clampPublicPolicyIndex(Number(match[1]));
  var refTurn = surface.sourceRef && surface.sourceRef.turn;
  if (surface.kind === 'policy' && typeof refTurn === 'number') return clampPublicPolicyIndex(refTurn);
  return null;
}

/**
 * @param {number} policyIndex
 * @returns {number}
 */
function clampPublicPolicyIndex(policyIndex) {
  return Math.min(PUBLIC_POLICY_COUNT, Math.max(1, Math.round(policyIndex)));
}

/**
 * @param {RouterSurfaceKind} kind
 * @returns {string}
 */
function v2SurfaceKindLabel(kind) {
  var labels = {
    policy: 'POLICY',
    media: 'MEDIA',
    party: 'PARTY',
    private: 'PRIVATE',
    scandal: 'SCANDAL',
    cabinet: 'CABINET',
    liability: 'LIABILITY',
    endgame: 'ENDGAME',
    aftermath: 'AFTERMATH'
  };
  return labels[kind] || 'BRIEFING';
}

/**
 * @param {RouterProductionSurfaceView} surface
 * @param {RouterProductionChoiceView} choice
 * @param {number} idx
 * @returns {string}
 */
function renderV2ChoiceCard(surface, choice, idx) {
  if (surface.presentation === 'agenda-pair') {
    return renderV2AgendaPairCard(surface, choice, idx);
  }
  if (surface.presentation === 'single-choice' && surface.kind === 'private') {
    return renderV2PrivateChoiceCard(surface, choice, idx);
  }
  return renderV2DecisionCard(surface, choice, idx);
}

/**
 * @param {RouterProductionChoiceView} choice
 * @returns {string}
 */
function v2ChoiceAccent(choice) {
  return (choice.cabinetPick && choice.cabinetPick.dotColor) ||
    choice.media.dotColor ||
    choice.media.dot ||
    choice.media.fallback.accent;
}

/* Per-policy accent colour. Larry policies are yellow; otherwise the colour is
   keyed on the reform area (scenario): NHS/water blue, tax/housing red,
   carbon/cost-of-living green. Falls back to the card's own accent for anything
   that isn't a policy/manifesto card. */
/**
 * @param {RouterProductionSurfaceView} surface
 * @param {RouterProductionChoiceView} choice
 * @returns {string}
 */
function v2AccentFor(surface, choice) {
  if (choice.cardRole === 'larry') return '#FFC93C';            // yellow
  // structural reforms carry their own colour, whatever scenario they sit in
  /** @type {Record<string,string>} */
  var byReform = {
    'independent-press-regulator': '#25C998',   // media reform -> green
    'cap-big-money-donations': '#4D7CFF',        // money in politics -> blue
    'media-ownership-reform': '#FF335E'         // media ownership -> press red
  };
  if (byReform[choice.id]) return byReform[choice.id];
  var sid = '';
  var pick = /^choose-(.+)$/.exec(choice.id || '');             // manifesto pick
  if (pick) sid = pick[1];
  else {
    var pol = /^policy-(.+)-turn-\d+$/.exec((surface && surface.id) || ''); // policy hand
    if (pol) sid = pol[1];
  }
  /** @type {Record<string,string>} */
  var byScenario = {
    nhs: '#4D7CFF', water: '#4D7CFF',            // blue
    taxLoopholes: '#FF335E', housing: '#FF335E', // red
    carbon: '#25C998', costOfLiving: '#25C998'   // green
  };
  return byScenario[sid] || v2ChoiceAccent(choice);
}

/**
 * @param {RouterProductionChoiceView} choice
 * @returns {string}
 */
function v2ChoiceActionText(choice) {
  return choice.label.replace(/\.$/, '');
}

/**
 * @param {RouterChoiceAvailability|undefined} availability
 * @returns {boolean}
 */
function v2ChoiceAlreadyEnacted(availability) {
  return !!availability && availability.reasons.indexOf('already enacted') !== -1;
}

/**
 * @param {string|undefined} meterKey
 * @param {string|undefined} lockText
 * @returns {string}
 */
function meterRequirementHtml(meterKey, lockText) {
  var meter = meterKey ? meterDefForKey(meterKey) : null;
  var text = lockText || 'Score is not high enough to unlock.';
  if (!meter) return '<span class="decision-card__lock-word">LOCKED</span> ' + htmlEsc(text);
  var label = meter.share + ': ' + text;
  return '<span class="decision-card__lock-meter" aria-label="' + attrEsc(label) + '" title="' + attrEsc(label) + '">' +
    meterIconHtml(meter, 'decision-card__lock-icon') +
    '<span class="decision-card__lock-copy">' + htmlEsc(text) + '</span>' +
  '</span>';
}

/**
 * @param {RouterProductionChoiceView} choice
 * @param {RouterChoiceAvailability|undefined} availability
 * @param {string} [extraClass]
 * @returns {string}
 */
function v2UnavailableStatusHtml(choice, availability, extraClass) {
  var className = extraClass ? ' ' + extraClass : '';
  if (v2ChoiceAlreadyEnacted(availability)) {
    return '<div class="decision-card__done' + className + '">' +
      '<span class="decision-card__done-text">✓ ENACTED</span>' +
    '</div>';
  }
  if (choice.lock && choice.lock.meter && choice.lock.threshold != null) {
    var meterLockText = choice.lock.text || choice.lockText || (availability ? availability.reasons.join(' · ') : undefined);
    return '<div class="decision-card__lock' + className + '">' +
      meterRequirementHtml(choice.lock.meter, meterLockText) +
    '</div>';
  }
  var lockText = (choice.lock && choice.lock.text) || choice.lockText || (availability ? availability.reasons.join(' · ') : 'Locked');
  return '<div class="decision-card__lock' + className + '">' +
    '<span class="decision-card__lock-word">LOCKED</span> ' + htmlEsc(lockText) +
  '</div>';
}

/**
 * @param {RouterProductionSurfaceView} surface
 * @param {RouterProductionChoiceView} choice
 * @param {number} idx
 * @returns {string}
 */
function renderV2AgendaPairCard(surface, choice, idx) {
  var availability = v2Bridge.choiceAvailability[choice.id];
  var unavailable = !!availability && !availability.available;
  var enacted = v2ChoiceAlreadyEnacted(availability);
  var locked = unavailable && !enacted;
  var rotations = ['rot-l', 'rot-r'];
  var rot = rotations[idx % rotations.length];
  var cabinetPick = choice.cabinetPick || {};
  var name = cabinetPick.ministerName || choice.sponsor || choice.label;
  var role = cabinetPick.ministerRole || choice.cardRole || 'CABINET';
  var quote = cabinetPick.quote || choice.note || surface.scene;
  var accent = v2AccentFor(surface, choice);
  var deltas = v2ChoiceDeltas(choice);
  var cardBody =
    '<div class="cabinet-pick-card__body">' +
      '<div class="badge badge--ink cabinet-pick-card__badge"><span class="cabinet-pick-card__dot" style="background:' + attrEsc(accent) + ';"></span><span>ON THE DESK · ' + htmlEsc(role) + '</span></div>' +
      '<div class="cabinet-pick-card__minister">' +
        '<div><div class="cabinet-pick-card__name">' + htmlEsc(name) + '</div></div>' +
      '</div>' +
      '<div class="cabinet-pick-card__quote">' + htmlEsc(quote) + '</div>' +
      renderDeltaChips(deltas, unavailable) +
      (unavailable
        ? v2UnavailableStatusHtml(choice, availability)
        : '<span class="cabinet-pick-card__cta" style="background:' + attrEsc(accent) + ';">TAKE IT ON →</span>') +
    '</div>';
  // Figure is a sibling appended after the body (not inside it), so it can sit
  // absolutely positioned over the card without disturbing the body's flex
  // layout — same pattern as renderV2DecisionCard's decision-card__figure.
  var body = cardBody + v2ChoiceFigure(choice, locked, name, role);

  if (unavailable) {
    return '<div class="card ' + (enacted ? 'card--done cabinet-pick-card--done' : 'card--locked cabinet-pick-card--locked') + ' cabinet-pick-card cabinet-pick-card--figure">' + body + '</div>';
  }
  return '<button onclick="pickV2Choice(' + attrEsc(JSON.stringify(choice.id)) + ')" class="card cabinet-pick-card cabinet-pick-card--figure ' + rot + '">' + body + '</button>';
}

/**
 * @param {RouterProductionSurfaceView} surface
 * @param {RouterProductionChoiceView} choice
 * @param {number} idx
 * @returns {string}
 */
function renderV2PrivateChoiceCard(surface, choice, idx) {
  var availability = v2Bridge.choiceAvailability[choice.id];
  var unavailable = !!availability && !availability.available;
  var enacted = v2ChoiceAlreadyEnacted(availability);
  var locked = unavailable && !enacted;
  var rotations = ['rot-a', 'rot-b', 'rot-c', 'rot-d'];
  var rot = rotations[idx % rotations.length];
  var deltas = v2ChoiceDeltas(choice);
  var note = choice.note || choice.endNote || '';
  var body =
    '<div class="private-choice-card__kicker">' + htmlEsc(v2SurfaceKindLabel(surface.kind)) + ' LINE</div>' +
    '<div class="private-choice-card__label">' + htmlEsc(choice.label) + '</div>' +
    (note ? '<div class="private-choice-card__note">' + htmlEsc(note) + '</div>' : '') +
    renderDeltaChips(deltas, unavailable) +
    (unavailable
      ? v2UnavailableStatusHtml(choice, availability, 'private-choice-card__lock')
      : '<div><span class="private-choice-card__cta">CHOOSE →</span></div>');

  if (unavailable) {
    return '<div class="card ' + (enacted ? 'card--done private-choice-card--done' : 'card--locked private-choice-card--locked') + ' private-choice-card">' + body + '</div>';
  }
  return '<button onclick="pickV2Choice(' + attrEsc(JSON.stringify(choice.id)) + ')" class="card private-choice-card ' + rot + '">' + body + '</button>';
}

/**
 * @param {RouterProductionSurfaceView} surface
 * @param {RouterProductionChoiceView} choice
 * @param {number} idx
 * @returns {string}
 */
function renderV2DecisionCard(surface, choice, idx) {
  var availability = v2Bridge.choiceAvailability[choice.id];
  var unavailable = !!availability && !availability.available;
  var enacted = v2ChoiceAlreadyEnacted(availability);
  var locked = unavailable && !enacted;
  var rotations = ['rot-a', 'rot-b', 'rot-c', 'rot-d'];
  var rot = rotations[idx % rotations.length];
  var name = surface.presentation === 'policy-hand'
    ? (choice.sourceCardName || choice.sponsor || choice.label)
    : v2ChoiceActionText(choice);
  var role = surface.presentation === 'policy-hand'
    ? (choice.sourceMinisterRole || choice.cardRole || 'POLICY')
    : v2SurfaceKindLabel(surface.kind);
  var pitch = surface.presentation === 'policy-hand'
    ? (choice.note || choice.endNote || surface.scene)
    : (choice.note || choice.endNote || 'Choose your line.');
  var accent = v2AccentFor(surface, choice);
  var cta = surface.kind === 'policy' ? 'BACK THIS' : 'CHOOSE';
  var deltas = v2ChoiceDeltas(choice);
  var modifier = surface.presentation === 'single-choice'
    ? ' decision-card--crisis decision-card--crisis-' + surface.kind
    : '';
  var badgePrefix = surface.presentation === 'policy-hand' ? 'ENACTS' : v2SurfaceKindLabel(surface.kind);
  var badgeText = surface.presentation === 'policy-hand' ? choice.label : 'YOUR LINE';
  // Minister-sponsored (policy-hand) cards get the large standing figure on the
  // right; other kinds keep the compact portrait circle on the left.
  var hasFigure = surface.presentation === 'policy-hand';
  if (hasFigure) modifier += ' decision-card--figure';
  var cardBody =
    '<div class="decision-card__body">' +
      '<div class="decision-card__head">' +
        '<div>' +
          '<div class="decision-card__name">' + htmlEsc(name) + '</div>' +
          '<div class="decision-card__role">' + htmlEsc(role) + '</div>' +
        '</div>' +
        (locked ? '<span class="decision-card__locked-badge">LOCKED</span>' : '') +
      '</div>' +
      '<div class="decision-card__pitch">' + htmlEsc(pitch) + '</div>' +
      (surface.presentation === 'policy-hand' ? '' :
        '<div class="badge badge--ink decision-card__enacts"><span class="decision-card__dot" style="background:' + attrEsc(accent) + ';"></span><span>' + htmlEsc(badgePrefix) + ' · ' + htmlEsc(badgeText) + '</span></div>') +
      renderDeltaChips(deltas, unavailable) +
      (unavailable
        ? v2UnavailableStatusHtml(choice, availability)
        : '<div><span class="decision-card__cta" style="background:' + attrEsc(accent) + ';">' + cta + ' →</span></div>') +
    '</div>';
  var body = hasFigure
    ? cardBody + v2ChoiceFigure(choice, locked, name, role)
    : v2ChoicePortrait(choice, locked) + cardBody;

  if (unavailable) {
    return '<div class="card ' + (enacted ? 'card--done decision-card--done' : 'card--locked decision-card--locked') + ' decision-card' + modifier + '">' + body + '</div>';
  }
  return '<button onclick="pickV2Choice(' + attrEsc(JSON.stringify(choice.id)) + ')" class="card decision-card ' + rot + modifier + '">' + body + '</button>';
}

/**
 * @param {RouterProductionChoiceView} choice
 * @param {boolean} locked
 * @returns {string}
 */
function v2ChoicePortrait(choice, locked) {
  var media = choice.media;
  var source = choice.cabinetPick || choice.policyCard;
  if (source) return portraitHTML(source, locked ? 'locked' : 'bright');
  return '<span class="portrait portrait--placeholder' + (locked ? ' portrait--locked' : '') + '" style="background:' + attrEsc(media.fallback.accent) + ';">' +
    '<span class="portrait__label">' + htmlEsc(media.fallback.label) + '</span>' +
  '</span>';
}

/* Map a cabinet character to their full-figure illustration, keyed on the
   displayed name (normalised to letters/digits only, so punctuation/spacing
   don't matter). Unknown characters fall back to the cat advisor (for mousers)
   or the generic placeholder until their bespoke art arrives. */
/** @type {Record<string, string>} */
var CHARACTER_IMAGES = {
  drinatentcare: 'images/cabinet/dr_ina_tentcare.png',
  regbroadsheet: 'images/cabinet/reg_broadsheet.png',
  islamann: 'images/cabinet/isla_mann.png',
  masoncarrick: 'images/cabinet/mason_carrick.png',
  tobytenant: 'images/cabinet/toby_tenant.png',
  pennycrunch: 'images/cabinet/penny_crunch.png',
  pippalyne: 'images/cabinet/pippa_lyne.png',
  honestyboxe: 'images/cabinet/honesty_boxe.png',
  verasuffrage: 'images/cabinet/vera_suffrage.png',
  brooktrent: 'images/cabinet/brook_trent.png',
  chunkslumberton: 'images/cabinet/chunk_slumberton.png',
  watsontabby: 'images/cabinet/watson_tabby.png',
  sirhairballtomsworth: 'images/cabinet/sir_hairball_tomsworth.png',
  sirpurreginald: 'images/cabinet/sir_pur_reginald.png',
  sirtomcatbury: 'images/cabinet/sir_tom_catbury.png',
  pennyfurball: 'images/cabinet/penny_furball.png',
  ladywhiskerpostlethwaite: 'images/cabinet/lady_whisker_postlethwaite.png',
  lizfelinetower: 'images/cabinet/liz_felinetower.png',
  mewstracker: 'images/cabinet/mews_tracker.png'
};
/** @type {Record<string, boolean>} Cabinet figures that are cats — rendered smaller than people. */
var CAT_FIGURES = {
  'images/cabinet/cat-advisor.png': true,
  'images/cabinet/sir_pur_reginald.png': true,
  'images/cabinet/watson_tabby.png': true,
  'images/cabinet/sir_hairball_tomsworth.png': true,
  'images/cabinet/sir_tom_catbury.png': true,
  'images/cabinet/penny_furball.png': true,
  'images/cabinet/lady_whisker_postlethwaite.png': true,
  'images/cabinet/liz_felinetower.png': true,
  'images/cabinet/mews_tracker.png': true
};
/**
 * @param {string} name
 * @param {string} [role]
 * @returns {string} image path
 */
function characterImage(name, role) {
  var key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (CHARACTER_IMAGES[key]) return CHARACTER_IMAGES[key];
  var r = (role || '').toLowerCase();
  if (r.indexOf('mouser') !== -1) return 'images/cabinet/cat-advisor.png';
  return 'images/cabinet/placeholder-advisor.png';
}

/* Large standing-figure illustration for a decision card (replaces the little
   "MUG" portrait circle on minister-sponsored cards). Uses the card's own image
   if the data carries one, else resolves by character name. */
/**
 * @param {RouterProductionChoiceView} choice
 * @param {boolean} locked
 * @param {string} name displayed character name, used to resolve the figure
 * @param {string} role displayed character role, used to resolve the figure
 * @returns {string}
 */
function v2ChoiceFigure(choice, locked, name, role) {
  // NOTE: the v2 data still carries legacy image paths to deleted placeholder
  // PNGs, so we resolve by character name/role for now. Switch to source.image
  // here once real per-card art exists on disk.
  var src = characterImage(name, role);
  var isCat = !!CAT_FIGURES[src];
  return '<img class="decision-card__figure' +
    (isCat ? ' decision-card__figure--cat' : '') +
    (locked ? ' decision-card__figure--locked' : '') +
    '" src="' + attrEsc(src) + '" alt="' + attrEsc(name || '') + '">';
}

/* ---------- render the decide screen ---------- */
function renderDecide() {
  if (isV2Mode()) {
    renderV2Decide();
    return;
  }
  // Catches the case where the gate meter was already at threshold when the scenario began
  // (e.g., from a previous scenario's reform).
  maybeRecordUnlock();
  var s = currentScenario();
  var copy = s.turnCopy[state.scenarioTurn - 1];

  document.getElementById('decide-week').textContent =
    'SCENARIO ' + (state.scenarioIndex + 1) + ' OF ' + SCENARIO_COUNT +
    ' · TURN ' + state.scenarioTurn + ' OF ' + s.turnCopy.length +
    ' · ' + s.label.toUpperCase();
  document.getElementById('decide-title').textContent = copy.title;
  document.getElementById('decide-sub').innerHTML = copy.sub;

  renderDecideMeters();

  var grid = document.getElementById('cards-grid');
  grid.className = 'cards-grid';
  var cardKeys = getTurnCards();

  // Only upgraded cards carry requiresMeter; lock the one(s) below threshold.
  // (Kept as a list with the >1 fallback, though one upgraded card shows per turn.)
  /** @type {string[]} */
  var lockedKeys = [];
  cardKeys.forEach(function(key) {
    var p = getCard(key);
    if (p.requiresMeter && !state.passedPolicies[key] && state.meters[p.requiresMeter] < UNLOCK_THRESHOLD) {
      lockedKeys.push(key);
    }
  });
  /** @type {Record<string, boolean>} */
  var forceUnlock = {};
  if (lockedKeys.length > 1) {
    lockedKeys.sort(function(a, b) { return state.meters[getCard(b).requiresMeter] - state.meters[getCard(a).requiresMeter]; });
    for (var li = 0; li < lockedKeys.length - 1; li++) forceUnlock[lockedKeys[li]] = true;
  }

  grid.innerHTML = cardKeys.map(function(key, i) {
    return renderCard(key, i, forceUnlock[key]);
  }).join('');

  // inject Larry SVG into any new .larry slots inside the decide screen
  document.querySelectorAll('#screen-decide .larry').forEach(function(el) {
    if (!el.innerHTML) el.innerHTML = LARRY_SVG;
  });

}

/* ---------- compact always-on meter strip (decide + pick screens) ---------- */
/**
 * Build the four-meter donut strip from current state.meters and render it into
 * the element with the given id. Shared by the decide, pick and rules screens.
 * @param {string} id target element id
 */
/** @param {string} id @param {boolean} [withDeltas] @returns {void} */
function renderMetersInto(id, withDeltas) {
  var el = document.getElementById(id);
  if (!el) return;
  var deltas = withDeltas ? (state.lastDeltas || {}) : {};
  el.innerHTML = METERS.map(function(d) {
    return meterDonutHtml(d, state.meters[d.key], deltas[d.key]);
  }).join('');
}
// Decide-screen dials show the +/- the previous decision applied (from the
// second decision on, once there's a prior action to report).
function renderDecideMeters() { renderMetersInto('decide-meter-cells', true); }

/* Render a compact row of "+N METER" chips for each non-zero delta on a card.
   Used on available + locked cards so the player can see the impact upfront. */
/**
 * @param {Partial<Deltas>} deltas
 * @param {boolean} [locked]
 * @returns {string}
 */
function renderDeltaChips(deltas, locked) {
  /** @type {string[]} */
  var chips = [];
  METERS.forEach(function(d) {
    var v = deltas && deltas[d.key];
    if (!v) return;
    var sign = v > 0 ? '+' : '';
    var chipClass = locked ? 'chip chip--locked' : 'chip';
    var chipLabel = d.share + ' ' + (v > 0 ? 'plus ' : 'minus ') + Math.abs(v);
    chips.push(
      '<span class="' + chipClass + '" aria-label="' + attrEsc(chipLabel) + '">' +
        meterIconHtml(d, 'chip__icon') +
        '<span class="chip__value">' + sign + v + '</span>' +
      '</span>'
    );
  });
  if (!chips.length) return '';
  return '<div class="chip-row">' + chips.join('') + '</div>';
}

/**
 * @param {{requiresMeter?: string, lockText?: string}} card
 * @returns {string}
 */
function renderLockText(card) {
  var meter = card.requiresMeter ? meterDefForKey(card.requiresMeter) : null;
  if (meter) {
    return meterRequirementHtml(card.requiresMeter, card.lockText);
  }
  return '<span class="decision-card__lock-word">LOCKED</span> ' + htmlEsc(card.lockText || 'Locked');
}

/**
 * @param {string} key card id
 * @param {number} idx slot index (0-3), drives the rotation
 * @param {boolean} [forceUnlock] render an otherwise-locked help card as available
 * @returns {string}
 */
function renderCard(key, idx, forceUnlock) {
  var rotations = ['rot-a', 'rot-b', 'rot-c', 'rot-d'];
  var rot = rotations[idx % rotations.length];

  var p = getCard(key);
  var passed = state.passedPolicies[key];

  // Already passed — show as done
  if (passed) {
    return '<div class="card card--done decision-card decision-card--done">' +
      portraitHTML(p, 'bright') +
      '<div class="decision-card__body">' +
        '<div class="decision-card__name">' + p.name + '</div>' +
        '<div class="decision-card__role">' + p.ministerRole +'</div>' +
        '<div class="decision-card__done">' +
          '<span class="decision-card__done-text">✓ DONE · ' + p.action + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  if (p.role === 'structural') {
    // Available structural card — bright, clickable
    return '<button onclick="pickPolicy(\'' + key + '\')" class="card decision-card ' + rot + '">' +
      portraitHTML(p, 'bright') +
      '<div class="decision-card__body">' +
        '<div class="decision-card__name">' + p.name + '</div>' +
        '<div class="decision-card__role">' + p.ministerRole +'</div>' +
        '<div class="decision-card__pitch">' + p.pitch + '</div>' +
        '<div class="badge badge--ink decision-card__enacts"><span class="decision-card__dot" style="background:' + p.dot + ';"></span><span>ENACTS · ' + p.action + '</span></div>' +
        renderDeltaChips(p.deltas, false) +
        '<div><span class="decision-card__cta" style="background:' + p.dot + ';">BACK THIS →</span></div>' +
      '</div>' +
    '</button>';
  }

  // Help-people card — check if locked
  var meterKey = p.requiresMeter;
  var meterVal = state.meters[meterKey];
  var locked = meterVal < UNLOCK_THRESHOLD && !forceUnlock;

  if (!locked) {
    // Unlocked help-people card — bright and clickable
    return '<button onclick="pickPolicy(\'' + key + '\')" class="card decision-card ' + rot + '">' +
      portraitHTML(p, 'bright') +
      '<div class="decision-card__body">' +
        '<div class="decision-card__name">' + p.name + '</div>' +
        '<div class="decision-card__role">' + p.ministerRole +'</div>' +
        '<div class="decision-card__pitch">' + p.pitch + '</div>' +
        '<div class="badge badge--ink decision-card__enacts"><span class="decision-card__dot" style="background:' + p.dot + ';"></span><span>ENACTS · ' + p.action + '</span></div>' +
        renderDeltaChips(p.deltas, false) +
        '<div><span class="decision-card__cta decision-card__cta--dark" style="background:' + p.dot + ';">BACK THIS →</span></div>' +
      '</div>' +
    '</button>';
  }

  // Locked help-people card
  return '<div class="card card--locked decision-card decision-card--locked">' +
    portraitHTML(p, 'locked') +
    '<div class="decision-card__body">' +
      '<div class="decision-card__head">' +
        '<div>' +
          '<div class="decision-card__name">' + p.name + '</div>' +
          '<div class="decision-card__role">' + p.ministerRole +'</div>' +
        '</div>' +
        '<span class="decision-card__locked-badge">🔒 LOCKED</span>' +
      '</div>' +
	      '<div class="decision-card__pitch">' + p.pitch + '</div>' +
	      renderDeltaChips(p.deltas, true) +
	      '<div class="decision-card__lock">' + renderLockText(p) + '</div>' +
	    '</div>' +
	  '</div>';
}

/* ---------- player picks a policy → show press attack ---------- */
/** @param {string} key card id the player chose */
function pickPolicy(key) {
  state.lastPolicy = key;
  go('press');
}

/**
 * Escape a string for safe interpolation into a double-quoted HTML attribute.
 * Reaction text fields are authored raw HTML, but image paths / alt text land
 * inside attributes, so quotes & angle brackets must not break out.
 * @param {string} s
 * @returns {string}
 */
function attrEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Default profile pictures per network, used when a post carries no image. */
var MSKY_AVATAR = 'images/avatars/msky.png';
var HEX_AVATAR = 'images/avatars/hex.png';

/**
 * A social-post avatar. The per-post avatar files in the data were removed
 * (placeholders), so we use the network default (`fallback`) — woman for Mewsky,
 * boy for Hex — falling back to the post's own image, then the hatched circle.
 * @param {Post} f
 * @param {string} [fallback] default avatar image for this network
 * @returns {string}
 */
function avatarHTML(f, fallback) {
  var src = fallback || f.image;
  if (src) {
    return '<img class="avatar" src="' + attrEsc(src) + '" alt="' + attrEsc(f.altText || '') + '">';
  }
  return '<span class="avatar avatar--placeholder"></span>';
}

/**
 * The 56×56 cabinet-member avatar shown on a policy/pick card: the minister's
 * `image` PORTRAIT when set (rounded, cover-cropped), else the original hatched
 * "MUG" placeholder circle. `mode` 'locked' renders the greyed/darker treatment
 * used by locked help-cards; 'bright' is the default. Shared by renderCard's
 * four variants and the pick screen so an absent image always falls back.
 * @param {{image?:string, altText?:string}} p
 * @param {'bright'|'locked'} [mode]
 * @returns {string}
 */
function portraitHTML(p, mode) {
  var locked = mode === 'locked';
  if (p.image) {
    return '<img src="' + attrEsc(p.image) + '" alt="' + attrEsc(p.altText || '') +
      '" class="portrait' + (locked ? ' portrait--locked' : '') + '">';
  }
  return '<span class="portrait portrait--placeholder' + (locked ? ' portrait--locked' : '') + '">' +
    '<span class="portrait__label">MUG</span>' +
  '</span>';
}

/**
 * Wire the press-screen hero photo: show the real <img> when the newspaper
 * carries an `image`, else fall back to the hatched "PRESS PHOTO" placeholder.
 * @param {Newspaper} np
 */
function setPressPhoto(np) {
  var img = document.getElementById('np-photo');
  var ph = document.getElementById('np-photo-placeholder');
  if (np.image) {
    img.setAttribute('src', np.image);
    img.setAttribute('alt', np.altText || '');
    img.hidden = false;
    if (ph) ph.hidden = true;
  } else {
    img.removeAttribute('src');
    img.setAttribute('alt', '');
    img.hidden = true;
    if (ph) ph.hidden = false;
  }
}

/** Chance (0–1) that a "PM" headline swaps in the player's name. 1 = always. */
var NAME_HEADLINE_CHANCE = 1;

/**
 * Weave the player's name into a headline by swapping the word "PM" (including
 * the possessive "PM'S") for their name. No-op when no name was entered. Only
 * ~1 in 5 headlines mention "PM", so it still reads as an occasional touch
 * rather than every headline. Lower NAME_HEADLINE_CHANCE to make it rarer.
 * @param {string} text the authored headline
 * @param {string} nameToken player's name, already cased/escaped for the target context
 * @returns {string}
 */
function injectName(text, nameToken) {
  if (!state.playerName) return text;
  if (Math.random() >= NAME_HEADLINE_CHANCE) return text;
  return text.replace(/\bPM(['’]S)?\b/g, function(_m, poss) { return nameToken + (poss || ''); });
}

function showV2Press() {
  var choice = v2Bridge.pendingChoiceView || v2Bridge.lastChoiceView;
  var surface = v2Bridge.activeSurfaceView || v2Bridge.lastSurfaceView;
  if (!choice || !surface) return;
  var reaction = choice.reaction;
  // Manifesto picks have no bespoke reaction data — auto-generate a light
  // montage (tabloid front page + Mewsky + Hex), tone driven by how far the
  // press has been reformed (0 vicious .. 3 neutral).
  var manifesto = v2IsManifestoSurface(surface)
    ? v2ManifestoMontage(choice, v2MediaReformLevel())
    : null;
  var np = manifesto ? manifesto.newspaper
    : reaction && reaction.newspaper
      ? v2PickNewspaper(reaction, choice)
      : {
          masthead: choice.media.fallback.label.toUpperCase(),
          headline: choice.label,
          standfirst: surface.scene,
          image: choice.media.image,
          altText: choice.media.altText
        };
  document.getElementById('np-dateline').textContent = 'IN-TRAY ' + state.turn + ' · 60p';
  document.getElementById('np-masthead').textContent  = np.masthead;
  document.getElementById('np-headline').textContent  = injectName(np.headline, state.playerName.toUpperCase());
  document.getElementById('np-standfirst').textContent = np.standfirst;
  setPressPhoto(np);
  // Social posts fly in alongside the spinning newspaper. Both manifesto picks
  // and reaction turns show 2 Mewsky + 2 Hex on desktop. Mobile CSS hides every
  // post after the first, so the extra post is desktop-only (don't change mobile).
  // On a pick-two beat both committed picks get a say: one post per pick, per network.
  var pickViews = (v2Bridge.pickTwoCommitted || [])
    .map(function(cid) { return v2FindChoiceView(surface, cid); })
    .filter(function(cv) { return !!(cv && cv.reaction); });
  var mewsky, hex;
  if (surface.presentation === 'pick-two' && pickViews.length) {
    mewsky = pickViews.map(function(cv) { return (cv.reaction.bluesky || [])[0]; }).filter(Boolean).slice(0, 2);
    hex = pickViews.map(function(cv) { return v2PickHex(cv.reaction, cv)[0]; }).filter(Boolean).slice(0, 2);
  } else {
    mewsky = manifesto ? manifesto.mewsky
      : (reaction && reaction.bluesky ? reaction.bluesky.slice(0, 2) : []);
    hex = manifesto ? manifesto.hex
      : v2PickHex(reaction, choice).slice(0, 2);
  }
  setPressStack('press-left', mewsky, '');
  setPressStack('press-right', hex, 'HEX');
  // Button label. The week's final policy decision leads into the full weekly
  // reaction ("SEE THE FALLOUT"); the Week 3 legacy pick leads straight into
  // the election. Everything else (manifesto picks / private beats / pick-two
  // beats) advances to the next decision — the very first such newspaper
  // invites the first policy decision.
  var falloutBtn = document.querySelector('.press-overlay__fallout');
  if (falloutBtn) {
    if (v2IsRoundEndingSetpiece(surface)) {
      falloutBtn.textContent = 'SEE THE FALLOUT →';
    } else if (surface.id === 'week3-legacy-pick') {
      falloutBtn.textContent = 'GENERAL ELECTION →';
    } else if (v2SkipsFullReaction(surface)) {
      falloutBtn.textContent = state.firstReactionlessPressSeen
        ? 'MAKE YOUR NEXT DECISION →'
        : 'MAKE YOUR FIRST POLICY DECISION →';
    } else {
      falloutBtn.textContent = 'SEE THE FALLOUT →';
    }
  }
  replaySpin();
}

/* Render a stack of one or more flying social posts into a press-screen side
   column. Hides the column if there are no posts. */
/**
 * @param {string} id element id
 * @param {Array<Post>|null|undefined} posts
 * @param {string} network badge text ('' for Mewsky, 'HEX' for Hex)
 */
function setPressStack(id, posts, network) {
  var el = document.getElementById(id);
  if (!el) return;
  var list = (posts || []).filter(Boolean);
  if (!list.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = list.map(function(post) {
    return '<div class="press-post' + (network ? ' press-post--x' : ' press-post--bluesky') + '">' +
      '<div class="post__header">' +
        avatarHTML(post, network ? HEX_AVATAR : MSKY_AVATAR) +
        '<div class="post__byline"><div class="post__name">' + htmlEsc(post.name) + '</div><div class="post__handle">' + htmlEsc(post.handle) + '</div></div>' +
        (network ? '<span class="post__network">' + htmlEsc(network) + '</span>' : '') +
      '</div>' +
      '<div class="post__text">' + htmlEsc(post.text) + '</div>' +
    '</div>';
  }).join('');
}

/** @param {string} sid scenario id @returns {string} short human name */
function v2ScenarioShortName(sid) {
  /** @type {Record<string,string>} */
  var map = {
    nhs: 'the NHS', taxLoopholes: 'tax loopholes', housing: 'housing',
    carbon: 'the climate', costOfLiving: 'the cost of living', water: 'the water crisis'
  };
  return map[sid] || 'the agenda';
}

/* How thawed the media is: 0 = hilariously vicious .. 3 = neutral. Driven by
   how many press reforms have been enacted (the "press-reform" history beats:
   the round-1 Independent Press Regulator + the two State-of-the-Press beats). */
/** @returns {number} 0..3 */
function v2MediaReformLevel() {
  var rs = v2Bridge.routerState;
  if (!rs || !rs.history) return 0;
  var n = 0;
  for (var i = 0; i < rs.history.length; i++) {
    var tags = rs.history[i].tags;
    if (tags && tags.indexOf('press-reform') !== -1) n++;
  }
  return n > 3 ? 3 : n;
}

/* The four-step media landscape that thaws as press reforms land.
   Index = media level (0 vicious .. 3 neutral). Each level's posts are ordered
   so the montage's first two read the mood. Msky (warmer) ends 2 positive /
   1 neutral; Hex (cooler) ends 1 positive / 2 neutral.
   FIRST-PASS COPY — the voice is meant to be tuned later. */
var MEDIA_TONE = [
  { // 0 — hilariously vicious
    masthead: 'THE DAILY RAGE',
    msky: [
      { name: 'Doomscroll Dan', handle: '@dan.msky.social', text: 'incredible. picked the one fight guaranteed to send the front pages feral.', stats: '1.5K reposts' },
      { name: 'Rosa', handle: '@rosa.msky.social', text: 'ok a PM actually *doing* something on day one? cautious but i’m here for it', stats: '2.1K reposts' },
      { name: 'Politics Bites', handle: '@polbites.msky.social', text: 'early days. the real test is whether any of this survives the lobby.', stats: '1.2K reposts' }
    ],
    hex: [
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'And who is paying for ALL of this? YOU are. Day one and already reaching into your pocket.', stats: '4.3K quotes' },
      { name: 'Nigel Pinstripe', handle: '@nigelp', text: 'An unelected PM lecturing the country with no mandate for ANY of this. Outrageous.', stats: '3.3K quotes' },
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'Lobby mood this morning: feral. Three editors already on the warpath.', stats: '2.7K quotes' }
    ]
  },
  { // 1 — very negative (one press reform in)
    masthead: 'THE DAILY RAGE',
    msky: [
      { name: 'Rosa', handle: '@rosa.msky.social', text: 'reforming the press AND governing? the rage-merchants are going to hate this lol', stats: '2.4K reposts' },
      { name: 'Politics Bites', handle: '@polbites.msky.social', text: 'notable: the coverage is *slightly* less unhinged than yesterday. watch this space.', stats: '1.3K reposts' },
      { name: 'Doomscroll Dan', handle: '@dan.msky.social', text: 'still bracing for the inevitable hit pieces tbh', stats: '1.1K reposts' }
    ],
    hex: [
      { name: 'Nigel Pinstripe', handle: '@nigelp', text: 'Now coming for the FREE PRESS. This is how it starts, folks.', stats: '3.1K quotes' },
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'Editors furious about the regulator — but a couple privately admit the PM has a point.', stats: '1.8K quotes' },
      { name: 'Lobby Watch', handle: '@lobbywatch', text: 'Tone shifting. Fewer front-page kickings than we’d have predicted a week ago.', stats: '1.1K quotes' }
    ]
  },
  { // 2 — a bit negative (two press reforms in)
    masthead: 'THE GLOBE',
    msky: [
      { name: 'Rosa', handle: '@rosa.msky.social', text: 'genuinely cannot remember the last time coverage was this… fair? weird feeling', stats: '2.6K reposts' },
      { name: 'Frontline', handle: '@frontline.msky.social', text: 'you can feel the press loosening its grip. about time.', stats: '1.7K reposts' },
      { name: 'Politics Bites', handle: '@polbites.msky.social', text: 'reform on reform. the proprietors have lost a lot of their teeth this week.', stats: '1.4K reposts' }
    ],
    hex: [
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'The pack isn’t baying like it was. Grudging, but it’s a hearing.', stats: '1.6K quotes' },
      { name: 'Lobby Watch', handle: '@lobbywatch', text: 'Surprisingly even coverage this morning. The regulator is biting.', stats: '1.2K quotes' },
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'Fine, SOME of this adds up. Doesn’t mean I trust them.', stats: '2.0K quotes' }
    ]
  },
  { // 3 — neutral (fully reformed press)
    masthead: 'THE DAILY CHRONICLE',
    msky: [
      { name: 'Rosa', handle: '@rosa.msky.social', text: 'a press that reports instead of shrieks. this is what reform actually buys you', stats: '3.1K reposts' },
      { name: 'Frontline', handle: '@frontline.msky.social', text: 'coverage you can actually read without your blood pressure spiking. love that for us', stats: '2.2K reposts' },
      { name: 'Politics Bites', handle: '@polbites.msky.social', text: 'measured front pages across the board today. a genuinely different media climate.', stats: '1.6K reposts' }
    ],
    hex: [
      { name: 'Lobby Watch', handle: '@lobbywatch', text: 'Fair hearing across the board this morning. The PM has changed the weather on Fleet Street.', stats: '1.4K quotes' },
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'Steady, sober coverage. The reformed regulator is holding.', stats: '1.3K quotes' },
      { name: 'Nigel Pinstripe', handle: '@nigelp', text: 'Not how I’d have done it. But I’ll concede the reporting is straighter now.', stats: '1.5K quotes' }
    ]
  }
];

/* Hex posts for a manifesto pick: unlike Mewsky (which reads the press mood,
   from MEDIA_TONE above), Hex reacts to the POLICY AREA the player just chose —
   never to how the papers are covering it. Two tone bands: hostile while the
   press is unreformed (level 0–1), grudging once it has thawed (2–3).
   FIRST-PASS COPY — Becky to tune. */
/** @type {Record<string, {hostile: Post[], softened: Post[]}>} */
var HEX_PROMISE_TAKES = {
  nhs: {
    hostile: [
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'Billions more into the NHS black hole. Where is it coming from? Your pocket.', stats: '4.1K quotes' },
      { name: 'Nigel Pinstripe', handle: '@nigelp', text: 'Every PM promises to fix the waiting lists. The waiting lists remain unfixed. Good luck.', stats: '3.2K quotes' }
    ],
    softened: [
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'Health first out of the gate. Ambitious — the waiting-list numbers will make or break this.', stats: '1.9K quotes' },
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'If the waiting lists actually move, fair play. Watching the numbers, not the speeches.', stats: '1.6K quotes' }
    ]
  },
  taxLoopholes: {
    hostile: [
      { name: 'Sir Reginald Purse', handle: '@regpurse', text: 'Hounding wealth creators out of Britain by teatime. The yachts are already warming up.', stats: '3.8K quotes' },
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: '“Closing loopholes” always starts with billionaires and ends with YOUR pension.', stats: '3.4K quotes' }
    ],
    softened: [
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'Treasury reckons the loophole push is worth billions a year. The lawyers are sharpening pencils.', stats: '1.8K quotes' },
      { name: 'Sir Reginald Purse', handle: '@regpurse', text: 'One concedes some of these loopholes were… generous. One will be consulting one’s accountant.', stats: '2.1K quotes' }
    ]
  },
  housing: {
    hostile: [
      { name: 'Nigel Pinstripe', handle: '@nigelp', text: 'They’ll concrete over the green belt and STILL nobody you know will get a house.', stats: '3.6K quotes' },
      { name: 'Sir Reginald Purse', handle: '@regpurse', text: 'A war on landlords, dressed up as compassion. Property is the last safe investment in this country.', stats: '2.9K quotes' }
    ],
    softened: [
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'Housing as the week’s priority. Every government says it; the completions data will say whether it’s real.', stats: '1.7K quotes' },
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'Build the houses, watch rents fall, save the housing-benefit bill. The maths isn’t hard.', stats: '1.5K quotes' }
    ]
  },
  carbon: {
    hostile: [
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'Net zero, gross cost. Guess who pays for the windmills? You do.', stats: '3.9K quotes' },
      { name: 'Nigel Pinstripe', handle: '@nigelp', text: 'Britain: 1% of global emissions, 100% of the lectures. Priorities, PM.', stats: '3.3K quotes' }
    ],
    softened: [
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'The climate push is on. Industry wants certainty more than it fears the targets — worth remembering.', stats: '1.8K quotes' },
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'Green investment either cuts bills in ten years or it doesn’t. Hold them to the number.', stats: '1.4K quotes' }
    ]
  },
  costOfLiving: {
    hostile: [
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'You can’t subsidise your way out of a cost-of-living crisis. Somebody always pays. It’s you.', stats: '4.0K quotes' },
      { name: 'Nigel Pinstripe', handle: '@nigelp', text: 'The PM discovers bills are high. Groundbreaking. Wait till they see who’s been in charge.', stats: '3.1K quotes' }
    ],
    softened: [
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'Cost of living tops the grid. Politically unavoidable — the question is whether the help reaches February’s bills.', stats: '1.9K quotes' },
      { name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'Targeted help beats blanket giveaways. If they keep it tight, this is defensible.', stats: '1.5K quotes' }
    ]
  },
  water: {
    hostile: [
      { name: 'Sir Reginald Purse', handle: '@regpurse', text: 'Nationalisation talk before lunch. The pension funds holding water stock will remember this.', stats: '3.5K quotes' },
      { name: 'Nigel Pinstripe', handle: '@nigelp', text: 'The state can’t run a bath, and now it wants to run the water companies.', stats: '3.0K quotes' }
    ],
    softened: [
      { name: 'Westminster Whisper', handle: '@wmwhisper', text: 'Water on the agenda at last. The sewage numbers made this unavoidable for any government.', stats: '1.7K quotes' },
      { name: 'Sir Reginald Purse', handle: '@regpurse', text: 'Even one’s shareholder friends concede the rivers are… suboptimal. Reform was coming.', stats: '1.6K quotes' }
    ]
  }
};

/** @param {string} sid @param {number} level @returns {Post[]} */
function v2ManifestoHexPosts(sid, level) {
  var takes = HEX_PROMISE_TAKES[sid];
  if (!takes) return MEDIA_TONE[level].hex.slice(0, 2);
  return (level <= 1 ? takes.hostile : takes.softened).slice(0, 2);
}

/** @param {number} level @param {string} sid @param {string} area @returns {string} */
function v2ToneHeadline(level, sid, area) {
  /** @type {Record<string,string>} */
  var vicious = {
    nhs: 'PM PULLS THE PLUG ON YOUR NHS — DAY ONE',
    taxLoopholes: 'TAXING TIMES: PM RAIDS YOUR WALLET BY LUNCH',
    housing: 'PM’S HOUSING DREAM: ALL BRICKS, NO MORTAR',
    carbon: 'PM’S GREEN DREAM IS PURE HOT AIR',
    costOfLiving: 'PM’S SUMS DON’T ADD UP — AND YOU’LL FOOT THE BILL',
    water: 'PM IN HOT WATER BEFORE BREAKFAST'
  };
  if (level <= 0) return vicious[sid] || 'PM ALL AT SEA BEFORE THE KETTLE’S BOILED';
  if (level === 1) return '‘DOOMED TO FAIL’: CRITICS SAVAGE PM OVER ' + area.toUpperCase();
  if (level === 2) return 'QUESTIONS OVER PM’S PLAN FOR ' + area.toUpperCase();
  return 'PM SETS OUT PLAN FOR ' + area.toUpperCase();
}

/** @param {number} level @param {string} area @param {string} pm @returns {string} */
function v2ToneStandfirst(level, area, pm) {
  if (level <= 0) return 'Fleet Street erupts as ' + pm + ' picks a fight over ' + area + ' before the kettle’s even boiled — and the knives are already out.';
  if (level === 1) return 'Commentators queue up to predict failure for the government’s push on ' + area + '.';
  if (level === 2) return 'The plan for ' + area + ' gets a wary, more even-handed hearing across the papers.';
  return 'The government names ' + area + ' as a priority — to a notably calmer reception.';
}

/* Front-page photo pools for the auto-generated manifesto montage. The baked
   card reactions in router-balance-data.js carry their own images; the montage
   is built at runtime, so it picks from the same pools here. Same tone rule as
   the newspaper tiers: levels 0–1 (hostile) draw the angry set, 2–3 the calm set. */
var NEWS_HOSTILE_IMAGES = [
  'images/news-hostile-1.png', 'images/news-hostile-2.png', 'images/news-hostile-3.png',
  'images/news-hostile-4.png', 'images/news-hostile-5.png'
];
var NEWS_NEUTRAL_IMAGES = [
  'images/news-neutral-1.png', 'images/news-neutral-2.png',
  'images/news-neutral-3.png', 'images/news-neutral-4.png'
];
/* FNV-1a 32-bit: a stable string→number hash so an image is picked once per
   (scenario, level) and stays put across replays — the "fixed shuffle". */
/** @param {string} str @returns {number} */
function v2StableHash(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* Auto-generated montage for a manifesto pick (the small "spinny paper"): a
   tabloid front page plus social posts, with the tone driven by the current
   media reform level (0 vicious .. 3 neutral). */
/**
 * @param {RouterProductionChoiceView} choice
 * @param {number} level
 * @returns {{newspaper:{masthead:string,headline:string,standfirst:string,image:string,altText:string}, mewsky:Array<Post>, hex:Array<Post>}}
 */
function v2ManifestoMontage(choice, level) {
  var m = /^choose-(.+)$/.exec(choice.id || '');
  var sid = m ? m[1] : '';
  var area = v2ScenarioShortName(sid);
  var pm = state.playerName ? state.playerName.toUpperCase() : 'THE PM';
  var lv = level < 0 ? 0 : level > 3 ? 3 : level;
  var tone = MEDIA_TONE[lv];
  var pool = lv <= 1 ? NEWS_HOSTILE_IMAGES : NEWS_NEUTRAL_IMAGES;
  var img = pool[v2StableHash(sid + ':manifesto:' + lv) % pool.length];
  return {
    newspaper: {
      masthead: tone.masthead,
      headline: v2ToneHeadline(lv, sid, area),
      standfirst: v2ToneStandfirst(lv, area, pm),
      image: img,
      altText: lv <= 1
        ? 'A hostile tabloid front page attacking the Prime Minister.'
        : 'A measured newspaper front page reporting the story plainly.'
    },
    // press montage shows two posts (mobile hides the extra). Mewsky reads the
    // press mood; Hex reacts to the policy area itself (never the coverage).
    mewsky: tone.msky.slice(0, 2),
    hex: v2ManifestoHexPosts(sid, lv)
  };
}

/**
 * @param {RouterProductionSurfaceView} surface
 * @returns {{masthead:string, bskyName:string, bskyHandle:string, xName:string, xHandle:string}}
 */
function v2FallbackReactionCopy(surface) {
  if (surface.kind === 'aftermath') {
    return { masthead: 'AFTERMATH', bskyName: 'Briefing Room', bskyHandle: '@briefing.room', xName: 'Lobby Watch', xHandle: '@lobbywatch' };
  }
  if (surface.kind === 'cabinet') {
    return { masthead: 'CABINET', bskyName: 'Cabinet Desk', bskyHandle: '@cabinet.desk', xName: 'Lobby Watch', xHandle: '@lobbywatch' };
  }
  if (surface.kind === 'private') {
    return { masthead: 'PRIVATE OFFICE', bskyName: 'Private Office', bskyHandle: '@private.office', xName: 'Lobby Watch', xHandle: '@lobbywatch' };
  }
  if (surface.kind === 'media') {
    return { masthead: 'MEDIA WATCH', bskyName: 'Media Monitor', bskyHandle: '@media.monitor', xName: 'Lobby Watch', xHandle: '@lobbywatch' };
  }
  if (surface.kind === 'party') {
    return { masthead: 'PARTY ROOM', bskyName: 'Whips Office', bskyHandle: '@whips.office', xName: 'Lobby Watch', xHandle: '@lobbywatch' };
  }
  if (surface.kind === 'scandal' || surface.kind === 'liability') {
    return { masthead: 'STANDARDS DESK', bskyName: 'Standards Desk', bskyHandle: '@standards.desk', xName: 'Lobby Watch', xHandle: '@lobbywatch' };
  }
  return { masthead: v2SurfaceKindLabel(surface.kind), bskyName: 'Policy Desk', bskyHandle: '@policy.desk', xName: 'Lobby Watch', xHandle: '@lobbywatch' };
}

function showPress() {
  if (isV2Mode()) {
    showV2Press();
    return;
  }
  var p = getCard(state.lastPolicy);
  // Two-state reaction: neutral once this scenario's gate meter is fixed, else negative.
  var scn = currentScenario();
  var fixed = state.meters[scn.gateMeter] >= UNLOCK_THRESHOLD;
  var np = p.reaction.newspaper[fixed ? 'neutral' : 'negative'];
  document.getElementById('np-dateline').textContent = 'WEEK ' + state.turn + ' · 60p';
  document.getElementById('np-masthead').textContent  = np.masthead;
  document.getElementById('np-headline').textContent  = injectName(np.headline, state.playerName.toUpperCase());
  document.getElementById('np-standfirst').textContent = np.standfirst;
  setPressPhoto(np);
  replaySpin();
}

function replaySpin() {
  restartAnim(document.getElementById('newspaper'), 'spinIn .9s cubic-bezier(.16,.8,.3,1) forwards');
  restartAnim(document.getElementById('flash'),     'flashout .6s ease-out forwards');
  var left = document.getElementById('press-left');
  var right = document.getElementById('press-right');
  if (left && !left.hidden)   restartAnim(left,  'pressPostInL .8s cubic-bezier(.16,.8,.3,1) .35s both');
  if (right && !right.hidden) restartAnim(right, 'pressPostInR .8s cubic-bezier(.16,.8,.3,1) .5s both');
}

/**
 * @param {HTMLElement} el
 * @param {string} anim CSS animation shorthand
 */
function restartAnim(el, anim) {
  if (!el) return;
  el.style.animation = 'none';
  void el.offsetWidth;  // force reflow so animation restarts
  el.style.animation = anim;
}

/* ---------- "SEE THE FALLOUT" → apply meter changes, show reaction ---------- */
function seeTheFallout() {
  if (isV2Mode()) {
    demoRecordStep();  // snapshot the press screen before revealing the fallout
    // Once the player advances past the first reactionless newspaper, later ones
    // read "MAKE YOUR NEXT DECISION" instead of "MAKE YOUR FIRST POLICY DECISION".
    if (v2SkipsFullReaction(v2Bridge.activeSurfaceView)) {
      state.firstReactionlessPressSeen = true;
    }
    v2CommitPendingChoice();
    v2AfterCommittedChoice();
    return;
  }
  state._preActionSnapshot = {
    meters: Object.assign({}, state.meters),
    passedPolicies: Object.assign({}, state.passedPolicies),
    passedHelpPolicy: state.passedHelpPolicy,
    concentratedPower: state.concentratedPower,
    scenarioUnlockTurn: state.scenarioUnlockTurn.slice(),
    pressFixedTurn: state.pressFixedTurn,
    politicsFixedTurn: state.politicsFixedTurn,
    deadMeter: state.deadMeter
  };
  var p = getCard(state.lastPolicy);
  var m = state.meters;
  var d = p.deltas;

  m.living   = Math.min(100, Math.max(0, m.living   + d.living));
  m.press    = Math.min(100, Math.max(0, m.press    + d.press));
  m.politics = Math.min(100, Math.max(0, m.politics + d.politics));
  m.capital  = Math.min(100, Math.max(0, m.capital  + d.capital));

  // Latch a kill from these deltas NOW, while the meter is still at 0.
  anyMeterDead();

  if (p.role === 'structural') {
    state.concentratedPower = Math.max(0, state.concentratedPower - 25);
  } else {
    state.passedHelpPolicy = true;
  }
  state.passedPolicies[state.lastPolicy] = true;
  // After meter updates, record if this scenario's gate meter has just crossed the unlock threshold.
  maybeRecordUnlock();

  // Record which turn each structural meter first crossed the threshold
  if (state.meters.press >= UNLOCK_THRESHOLD && state.pressFixedTurn === null) {
    state.pressFixedTurn = state.turn;
  }
  if (state.meters.politics >= UNLOCK_THRESHOLD && state.politicsFixedTurn === null) {
    state.politicsFixedTurn = state.turn;
  }

  state.lastDeltas = d;
  go('reaction');
}

/* ---------- reaction screen ---------- */
/** @param {any} sv @returns {boolean} */
function v2IsMediaBeat(sv) { return !!sv && /^media-reform-/.test(sv.id || ''); }

/* The "State of the Press" reaction after a media beat: the press climate at the
   new (thawed) media level, so the reform's effect is visible where you make it. */
function showV2MediaReaction() {
  var level = v2MediaReformLevel();
  var lv = level < 0 ? 0 : level > 3 ? 3 : level;
  var tone = MEDIA_TONE[lv];
  document.getElementById('reaction-week').textContent = 'THE STATE OF THE PRESS';
  var titleLines = ['The lobby is feral.', 'The press is starting to turn.', 'Fleet Street is thawing.', 'A free and fair press, at last.'];
  var titleEl = document.getElementById('reaction-title');
  if (titleEl) titleEl.textContent = titleLines[lv];

  revealMeters();
  var d = state.lastDeltas;
  var colors = METER_COLORS;
  document.querySelectorAll('#ov-reaction .m-delta').forEach(function(/** @type {any} */ el) {
    var k = el.getAttribute('data-m');
    if (d[k]) { el.style.color = colors[k]; el.textContent = (d[k] > 0 ? '▲ +' : '▼ ') + d[k]; }
    else { el.textContent = ''; }
  });

  var larryEl = document.getElementById('larry-event');
  larryEl.hidden = true; larryEl.innerHTML = '';

  var headlines = ['PRESS BARONS DECLARE WAR ON NO.10', 'REGULATOR BILL CLEARS ITS FIRST HURDLE', 'PRESS REFORM BITES: PROPRIETORS IN RETREAT', 'A FREE AND FAIR PRESS, AT LAST'];
  var mediaPool = lv <= 1 ? NEWS_HOSTILE_IMAGES : NEWS_NEUTRAL_IMAGES;
  var mediaImg = mediaPool[v2StableHash('media-reform:' + lv) % mediaPool.length];
  var mediaAlt = lv <= 1
    ? 'A hostile tabloid front page attacking the Prime Minister.'
    : 'A measured newspaper front page reporting the story plainly.';
  document.getElementById('feed-frontpages').innerHTML =
    '<div class="frontpage"><div class="frontpage__masthead">' + htmlEsc(tone.masthead) + '</div>' +
    '<img class="frontpage__image" src="' + attrEsc(mediaImg) + '" alt="' + attrEsc(mediaAlt) + '">' +
    '<div class="frontpage__headline">' + htmlEsc(headlines[lv]) + '</div></div>';
  document.getElementById('feed-bluesky').innerHTML = tone.msky.map(function(f) {
    return '<div class="post post--bluesky"><div class="post__header">' + avatarHTML(f, MSKY_AVATAR) +
      '<div class="post__byline"><div class="post__name">' + htmlEsc(f.name) + '</div><div class="post__handle post__handle--bluesky">' + htmlEsc(f.handle) + '</div></div></div>' +
      '<div class="post__text">' + htmlEsc(f.text) + '</div><div class="post__stats">' + htmlEsc(f.stats || '') + '</div></div>';
  }).join('');
  document.getElementById('feed-xtwitter').innerHTML = tone.hex.map(function(f) {
    return '<div class="post post--x"><div class="post__header">' + avatarHTML(f, HEX_AVATAR) +
      '<div class="post__byline post__byline--x"><div class="post__name">' + htmlEsc(f.name) + '</div><div class="post__handle">' + htmlEsc(f.handle) + '</div></div><span class="post__network">HEX</span></div>' +
      '<div class="post__text">' + htmlEsc(f.text) + '</div><div class="post__stats">' + htmlEsc(f.stats || '') + '</div></div>';
  }).join('');

  initFeedMore();

  var nb = document.getElementById('btn-next-week');
  if (nb) nb.textContent = 'Carry on →';
}

/* The once-a-week full reaction after the final decision of the week: the
   manifesto verdict, the week's meter change, and a combined feed drawn from
   the round's two policy decisions. */
function showV2WeekReaction() {
  var v = v2Bridge.weekReaction || v2WeekVerdict();
  document.getElementById('reaction-week').textContent = 'WEEK ' + (state.weekNum || 1) + ' · MANIFESTO RESULT';
  var verb = v.tier === 'fulfilled' ? 'You delivered on ' : v.tier === 'partly' ? 'You partly delivered on ' : 'You failed to deliver on ';
  var mark = v.tier === 'fulfilled' ? '✓ ' : v.tier === 'partly' ? '↗ ' : '✗ ';
  var titleEl = document.getElementById('reaction-title');
  if (titleEl) titleEl.textContent = mark + verb + v.promise;

  // Secondary line: how far the player has reformed the press by now. Strong at
  // a fully-thawed press (level 3), some progress at level 1–2, nothing at 0.
  var subEl = document.getElementById('reaction-subline');
  if (subEl) {
    var lvl = v2MediaReformLevel();
    if (lvl >= 3) {
      subEl.textContent = '…and implemented strong media reform along the way.';
      subEl.hidden = false;
    } else if (lvl >= 1) {
      subEl.textContent = '…and implemented some media reform along the way.';
      subEl.hidden = false;
    } else {
      subEl.hidden = true;
      subEl.textContent = '';
    }
  }

  // Larry weighs in from the sidelines — savage about the press while it's still
  // hostile (tier 0–1), warmer once the player has thawed it (tier 2–3).
  var larrySpeechEl = document.getElementById('larry-speech');
  if (larrySpeechEl) {
    var pressTier = v2MediaReformLevel();
    larrySpeechEl.textContent = pressTier <= 1
      ? 'The press are eating you alive! I don’t even do that to mice…'
      : 'The papers have stopped hissing at you. Good. Only cats should hiss.';
    larrySpeechEl.hidden = false;
  }

  var explain = v.tier === 'fulfilled'
    ? 'You reformed the system and the big fix sailed through. The promise is delivered.'
    : v.tier === 'partly'
      ? 'The quick fix got through — but the deeper fix stayed locked away.'
      : 'Nothing got fixed this week. The promise failed.';
  var larryEl = document.getElementById('larry-event');
  larryEl.className = 'reaction-larry-event reaction-fallout';
  larryEl.style.background = '';
  larryEl.style.color = '';
  larryEl.hidden = false;
  larryEl.innerHTML = htmlEsc(explain);

  revealMeters();
  /** @type {Record<string,number>} */
  var weekDeltas = {};
  v2Bridge.weekDecisions.forEach(function(d) {
    var dd = v2ImpactsToDeltas((d.choice && d.choice.visibleImpacts) || []);
    ['living', 'press', 'politics', 'capital'].forEach(function(k) { weekDeltas[k] = (weekDeltas[k] || 0) + (dd[k] || 0); });
  });
  var colors = METER_COLORS;
  document.querySelectorAll('#ov-reaction .m-delta').forEach(function(/** @type {any} */ el) {
    var k = el.getAttribute('data-m');
    if (weekDeltas[k]) {
      el.style.color = colors[k];
      el.textContent = (weekDeltas[k] > 0 ? '▲ +' : '▼ ') + weekDeltas[k];
    } else { el.textContent = ''; }
  });

  var feeds = v2WeekFeeds();
  var pm = state.playerName.toUpperCase();
  document.getElementById('feed-frontpages').innerHTML = feeds.fronts.map(function(f) {
    var thumb = f.image ? '<img class="frontpage__image" src="' + attrEsc(f.image) + '" alt="' + attrEsc(f.altText || '') + '">' : '';
    return '<div class="frontpage"><div class="frontpage__masthead">' + htmlEsc(f.masthead) + '</div>' + thumb +
      '<div class="frontpage__headline">' + htmlEsc(injectName(f.headline, pm)) + '</div></div>';
  }).join('');
  document.getElementById('feed-bluesky').innerHTML = feeds.msky.map(function(f) {
    return '<div class="post post--bluesky"><div class="post__header">' + avatarHTML(f, MSKY_AVATAR) +
      '<div class="post__byline"><div class="post__name">' + htmlEsc(f.name) + '</div><div class="post__handle post__handle--bluesky">' + htmlEsc(f.handle) + '</div></div></div>' +
      '<div class="post__text">' + htmlEsc(f.text) + '</div><div class="post__stats">' + htmlEsc(f.stats || '') + '</div></div>';
  }).join('');
  document.getElementById('feed-xtwitter').innerHTML = feeds.hex.map(function(f) {
    return '<div class="post post--x"><div class="post__header">' + avatarHTML(f, HEX_AVATAR) +
      '<div class="post__byline post__byline--x"><div class="post__name">' + htmlEsc(f.name) + '</div><div class="post__handle">' + htmlEsc(f.handle) + '</div></div><span class="post__network">HEX</span></div>' +
      '<div class="post__text">' + htmlEsc(f.text) + '</div><div class="post__stats">' + htmlEsc(f.stats || '') + '</div></div>';
  }).join('');

  initFeedMore();

  // The weekly verdict now shows straight after the week's second policy
  // decision, so the week's closing beat (One Visit / the pick-two beats) is
  // still to come — don't promise "next week" yet.
  var nb = document.getElementById('btn-next-week');
  if (nb) nb.textContent = (state.weekNum || 1) >= 3 ? 'One last decision →' : 'What’s next? →';
}

function showV2Reaction() {
  var subEl = document.getElementById('reaction-subline');
  if (subEl) { subEl.hidden = true; subEl.textContent = ''; }
  var larrySpeechEl = document.getElementById('larry-speech');
  if (larrySpeechEl) { larrySpeechEl.hidden = true; larrySpeechEl.textContent = ''; }
  if (v2Bridge.weekReaction) { showV2WeekReaction(); return; }
  if (v2IsMediaBeat(v2Bridge.lastSurfaceView)) { showV2MediaReaction(); return; }
  var surface = v2Bridge.lastSurfaceView;
  var choice = v2Bridge.lastChoiceView;
  if (!surface || !choice) {
    nextV2Beat();
    return;
  }

  document.getElementById('reaction-week').textContent = publicPolicyLabel(surface);

  // These between-decision beats aren't policy deliveries, so they must set their
  // own headline. Otherwise the page keeps the previous weekly verdict's
  // "✓ You delivered X" line stale on screen, over an unrelated beat.
  var titleEl = document.getElementById('reaction-title');
  if (titleEl) titleEl.textContent = surface.title || 'The Reaction';

  revealMeters();

  var colors = METER_COLORS;
  var d = state.lastDeltas;
  document.querySelectorAll('#ov-reaction .m-delta').forEach(function(/** @type {any} */ el) {
    var k = el.getAttribute('data-m');
    if (d[k] && d[k] !== 0) {
      var sign = d[k] > 0 ? '▲ +' : '▼ ';
      el.style.color = colors[k];
      el.textContent = sign + d[k];
    } else {
      el.textContent = '';
    }
  });

  var larryEl = document.getElementById('larry-event');
  var falloutHtml = v2ReactionFalloutHtml();
  larryEl.className = falloutHtml ? 'reaction-larry-event reaction-fallout' : 'reaction-larry-event';
  larryEl.style.background = '';
  larryEl.style.color = '';
  larryEl.hidden = !falloutHtml;
  larryEl.innerHTML = falloutHtml;

  if (choice.reaction) {
    var tone = v2ReactionTone(choice);
    var r = choice.reaction;
    var frontPages = r.frontPages[tone];
    // The lead front page mirrors the spinning newspaper shown just before this
    // page, so the reaction page opens with the same masthead, headline and
    // image the player just watched spin in (they're the same paper).
    var spinnyNp = v2PickNewspaper(r, choice);
    if (spinnyNp && frontPages.length) {
      frontPages = frontPages.slice();
      frontPages[0] = {
        masthead: spinnyNp.masthead,
        headline: spinnyNp.headline,
        image: spinnyNp.image,
        altText: spinnyNp.altText
      };
    }
    document.getElementById('feed-frontpages').innerHTML = frontPages.map(function(f) {
      var thumb = f.image
        ? '<img class="frontpage__image" src="' + attrEsc(f.image) + '" alt="' + attrEsc(f.altText || '') + '">'
        : '';
      return '<div class="frontpage">' +
        '<div class="frontpage__masthead">' + htmlEsc(f.masthead) + '</div>' +
        thumb +
        '<div class="frontpage__headline">' + htmlEsc(injectName(f.headline, state.playerName.toUpperCase())) + '</div>' +
      '</div>';
    }).join('');

    document.getElementById('feed-bluesky').innerHTML = r.bluesky.map(function(f) {
      return '<div class="post post--bluesky">' +
        '<div class="post__header">' +
          avatarHTML(f, MSKY_AVATAR) +
          '<div class="post__byline"><div class="post__name">' + htmlEsc(f.name) + '</div><div class="post__handle post__handle--bluesky">' + htmlEsc(f.handle) + '</div></div>' +
        '</div>' +
        '<div class="post__text">' + htmlEsc(f.text) + '</div>' +
        '<div class="post__stats">' + htmlEsc(f.stats) + '</div>' +
      '</div>';
    }).join('');

    var xPosts = v2PickHex(r, choice);
    document.getElementById('feed-xtwitter').innerHTML = xPosts.map(function(f) {
      return '<div class="post post--x">' +
        '<div class="post__header">' +
          avatarHTML(f, HEX_AVATAR) +
          '<div class="post__byline post__byline--x"><div class="post__name">' + htmlEsc(f.name) + '</div><div class="post__handle">' + htmlEsc(f.handle) + '</div></div>' +
          '<span class="post__network">HEX</span>' +
        '</div>' +
        '<div class="post__text">' + htmlEsc(f.text) + '</div>' +
        '<div class="post__stats">' + htmlEsc(f.stats) + '</div>' +
      '</div>';
    }).join('');
  } else {
    var note = choice.endNote || choice.note || surface.scene;
    var fallback = v2FallbackReactionCopy(surface);
    var fbLevel = v2MediaReformLevel();
    var fbPool = fbLevel <= 1 ? NEWS_HOSTILE_IMAGES : NEWS_NEUTRAL_IMAGES;
    var fbImg = fbPool[v2StableHash((choice.id || 'fallback') + ':fallback:' + fbLevel) % fbPool.length];
    var fbAlt = fbLevel <= 1
      ? 'A hostile tabloid front page attacking the Prime Minister.'
      : 'A measured newspaper front page reporting the story plainly.';
    document.getElementById('feed-frontpages').innerHTML =
      '<div class="frontpage">' +
        '<div class="frontpage__masthead">' + htmlEsc(fallback.masthead) + '</div>' +
        '<img class="frontpage__image" src="' + attrEsc(fbImg) + '" alt="' + attrEsc(fbAlt) + '">' +
        '<div class="frontpage__headline">' + htmlEsc(choice.label) + '</div>' +
      '</div>';
    document.getElementById('feed-bluesky').innerHTML =
      '<div class="post post--bluesky">' +
        '<div class="post__header"><img class="avatar" src="' + attrEsc(MSKY_AVATAR) + '" alt=""><div class="post__byline"><div class="post__name">' + htmlEsc(fallback.bskyName) + '</div><div class="post__handle post__handle--bluesky">' + htmlEsc(fallback.bskyHandle) + '</div></div></div>' +
        '<div class="post__text">' + htmlEsc(note) + '</div>' +
        '<div class="post__stats">12K reposts</div>' +
      '</div>';
    document.getElementById('feed-xtwitter').innerHTML =
      '<div class="post post--x">' +
        '<div class="post__header"><img class="avatar" src="' + attrEsc(HEX_AVATAR) + '" alt=""><div class="post__byline post__byline--x"><div class="post__name">' + htmlEsc(fallback.xName) + '</div><div class="post__handle">' + htmlEsc(fallback.xHandle) + '</div></div><span class="post__network">HEX</span></div>' +
        '<div class="post__text">' + htmlEsc(surface.title) + '</div>' +
        '<div class="post__stats">8K quotes</div>' +
      '</div>';
  }

  initFeedMore();
  document.getElementById('btn-next-week').textContent = 'What\'s next? →';
}

/* ---------- mobile feed "view more" ----------
   On mobile the Mewsky / Hex feeds show one post; the rest collapse behind a
   "view more" toggle. Called after each reaction render to reset state and show
   the toggle only when there are extra posts. Desktop ignores it via CSS. */
function initFeedMore() {
  ['feed-bluesky', 'feed-xtwitter'].forEach(function(id) {
    var feed = document.getElementById(id);
    var btn = document.querySelector('.feed-more[data-feed="' + id + '"]');
    if (!feed || !btn) return;
    feed.classList.remove('feed--expanded');
    var hasExtra = feed.querySelectorAll('.post').length > 1;
    btn.classList.toggle('feed-more--show', hasExtra);
    btn.textContent = 'View more ▾';
  });
}

/** @param {HTMLElement} btn the clicked "view more" button */
function toggleFeed(btn) {
  var feed = document.getElementById(btn.getAttribute('data-feed') || '');
  if (!feed) return;
  var expanded = feed.classList.toggle('feed--expanded');
  btn.textContent = expanded ? 'View less ▴' : 'View more ▾';
}

function showReaction() {
  if (isV2Mode()) {
    showV2Reaction();
    return;
  }
  var p = getCard(state.lastPolicy);
  // Two-state reaction: neutral once this scenario's gate meter is fixed, else negative.
  var scn = currentScenario();
  var fixed = state.meters[scn.gateMeter] >= UNLOCK_THRESHOLD;

  document.getElementById('reaction-week').textContent =
    'Policy ' + state.scenarioTurn + ' of ' + currentScenario().turnCopy.length;

  // Larry's bubble — tiered, gets softer with each structural reform passed (any of them).
  var structuralsPassed = 0;
  for (var pk in state.passedPolicies) {
    var cc = getCard(pk);
    if (cc && cc.role === 'structural') structuralsPassed++;
  }
  // Meter bars animate in
  revealMeters();

  // Delta labels — written into each meter card
  var colors = METER_COLORS;
  var d = state.lastDeltas;
  document.querySelectorAll('#ov-reaction .m-delta').forEach(function(/** @type {any} */ el) {
    var k = el.getAttribute('data-m');
    if (d[k] && d[k] !== 0) {
      var sign = d[k] > 0 ? '▲ +' : '▼ ';
      el.style.color = colors[k];
      el.textContent = sign + d[k];
    } else {
      el.textContent = '';
    }
  });

  // The v2 reaction path repurposes the #larry-event banner; keep it hidden here.
  var larryEl = document.getElementById('larry-event');
  larryEl.hidden = true;

  // Social feeds — two-state on the hostile axes (press front pages + X); Bluesky single.
  var r = p.reaction;
  var frontPages = r.frontPages[fixed ? 'neutral' : 'negative'];
  document.getElementById('feed-frontpages').innerHTML = frontPages.map(function(/** @type {FrontPage} */ f) {
    var thumb = f.image
      ? '<img class="frontpage__image" src="' + attrEsc(f.image) + '" alt="' + attrEsc(f.altText || '') + '">'
      : '';
    return '<div class="frontpage">' +
      '<div class="frontpage__masthead">' + f.masthead + '</div>' +
      thumb +
      '<div class="frontpage__headline">' + injectName(f.headline, attrEsc(state.playerName.toUpperCase())) + '</div>' +
    '</div>';
  }).join('');

  document.getElementById('feed-bluesky').innerHTML = r.bluesky.map(function(/** @type {Post} */ f) {
    return '<div class="post post--bluesky">' +
      '<div class="post__header">' +
        avatarHTML(f, MSKY_AVATAR) +
        '<div class="post__byline"><div class="post__name">' + f.name + '</div><div class="post__handle post__handle--bluesky">' + f.handle + '</div></div>' +
      '</div>' +
      '<div class="post__text">' + f.text + '</div>' +
      '<div class="post__stats">' + f.stats + '</div>' +
    '</div>';
  }).join('');

  // X feed: negative while the gate is unfixed, neutral once fixed (whole-set swap).
  var xPosts = r.xtwitter[fixed ? 'neutral' : 'negative'];
  document.getElementById('feed-xtwitter').innerHTML = xPosts.map(function(/** @type {Post} */ f) {
    return '<div class="post post--x">' +
      '<div class="post__header">' +
        avatarHTML(f, HEX_AVATAR) +
        '<div class="post__byline post__byline--x"><div class="post__name">' + f.name + '</div><div class="post__handle">' + f.handle + '</div></div>' +
        '<span class="post__network">HEX</span>' +
      '</div>' +
      '<div class="post__text">' + f.text + '</div>' +
      '<div class="post__stats">' + f.stats + '</div>' +
    '</div>';
  }).join('');

  // Next-week button label — three flavours:
  //   end-of-game → "SEE HOW IT ENDED"
  //   end-of-scenario (next click pops the cabinet picker, not a decide screen) → "NEXT IN-TRAY"
  //   normal mid-scenario advance → "ON TO WEEK X"
  var nextTurnNum = state.turn + 1;
  var lastTurnOfScenario = state.scenarioTurn === scn.turnCopy.length;
  var lastScenario = state.scenarioIndex === SCENARIO_COUNT - 1;
  var endingNow = (lastTurnOfScenario && lastScenario) || anyMeterDead() !== null;
  var betweenScenarios = lastTurnOfScenario && !lastScenario;
  var btnLabel;
  if (endingNow)             btnLabel = 'SEE HOW IT ENDED →';
  else if (betweenScenarios) btnLabel = 'NEXT IN-TRAY →';
  else                       btnLabel = 'ON TO WEEK ' + nextTurnNum + ' →';
  document.getElementById('btn-next-week').textContent = btnLabel;
}

function revealMeters() {
  // el typed `any`: textContent is assigned a number here and relies on JS
  // string coercion — pre-existing runtime behaviour, left unchanged.
  document.querySelectorAll('#ov-reaction .m-val').forEach(function(/** @type {any} */ el) {
    el.textContent = Math.round(state.meters[el.getAttribute('data-m')]);
  });
  /** @type {NodeListOf<HTMLElement>} */
  var fills = document.querySelectorAll('#ov-reaction .m-fill');
  fills.forEach(function(el) { el.style.strokeDashoffset = RING_C.toFixed(2); });
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      fills.forEach(function(el) {
        el.style.strokeDashoffset = ringOffset(state.meters[el.getAttribute('data-m')]).toFixed(2);
      });
    });
  });
}

/* ---------- next turn / end check ---------- */
function nextTurn() {
  if (isV2Mode()) {
    demoRecordStep();  // snapshot the reaction screen before advancing the week
    nextV2Beat();
    return;
  }
  state.turn += 1;
  state.scenarioTurn += 1;
  var rolledOver = false;
  // turnsThisScenario is read BEFORE bumping scenarioIndex — it's the scenario we're leaving.
  var turnsThisScenario = currentScenario().turnCopy.length;
  if (state.scenarioTurn > turnsThisScenario) {
    state.scenarioTurn = 1;
    state.scenarioIndex += 1;
    rolledOver = true;
    // End-of-scenario Political Power decay: fires only when another scenario follows
    // (not after the last, because the game ends there).
    if (state.scenarioIndex < SCENARIO_COUNT) {
      state.meters.capital = Math.max(0, state.meters.capital - SCENARIO_CAPITAL_DECAY);
    }
  }
  if (state.scenarioIndex >= SCENARIO_COUNT || anyMeterDead() !== null) {
    go('end');
    return;
  }
  // Just finished a scenario → pop the next cabinet pick before the new scenario starts.
  if (rolledOver) {
    state.startStep = state.scenarioIndex + 1;  // index 1 -> pair2 step, 2 -> pair3 step
    go('start');
    return;
  }
  go('decide');
}

/* ---------- screen switching ---------- */

/* ---------- gate-unlock tracking ---------- */
/* Records when each scenario's gate meter first hit the unlock threshold.
   0 = was already at threshold when the scenario started (rare but possible).
   1/2/3 = scenarioTurn when it crossed.
   null = never crossed.
   Called after meter updates and at the start of renderDecide. */
function maybeRecordUnlock() {
  var s = currentScenario();
  if (!s || !s.gateMeter) return;
  if (state.scenarioUnlockTurn[state.scenarioIndex] !== null) return;
  if (state.meters[s.gateMeter] >= UNLOCK_THRESHOLD) {
    state.scenarioUnlockTurn[state.scenarioIndex] = state.scenarioTurn;
  }
}

/* ---------- v2 re-election endgame ----------
   The term ends in a general election, decided by just two things: the final Living
   Standards meter (the delivery scoreboard — only policy fixes move it) and whether
   you passed voter (electoral) reform. Living Standards starts at 36; each week is
   two decisions, so a reform-then-big-fix week banks +8, a quick-fix week +3, and a
   cat week nothing. The wealth tax (legacy pick, unlocked by passing all three weekly
   reforms) banks +9 more. Bands: 68+ = the full reform run crowned by the wealth tax,
   60–67 = at least two big-fix weeks, 40–59 = shallow fixes only, under 40 = the cats
   won. Electoral reform only matters at 60 or above. The +9/60 pairing is deliberate:
   it keeps a 1-big-fix run at 59 even with the wealth tax. (All copy below is
   first-pass — Becky to tune.) */

var LARRY_BONUS_LINE = 'You were removed as PM by the British public but appointed king of the cats by the British shorthairs.';

/** @type {Record<string, {title:string, grade:string, verdict:string, label:string, color:string, stamp:string, won:boolean}>} */
var V2_ENDINGS = {
  landslide: {
    title: 'A Landslide', grade: 'A',
    verdict: 'Every promise delivered, and with the press reformed, voters actually heard about it. Five more years.',
    label: '★ LANDSLIDE', color: '#FFC93C', stamp: 'LANDSLIDE', won: true
  },
  fullNoReform: {
    title: 'Beaten by Tactical Voting', grade: 'C',
    verdict: 'More people voted for you than anyone else. It didn\'t matter — the right voted tactically and took the most seats.',
    label: '✗ VOTED OUT', color: '#FF335E', stamp: 'VOTED OUT', won: false
  },
  reelected: {
    title: '★ Re-Elected', grade: 'B',
    verdict: 'You delivered most of your promises, and under the new voting system every one of those votes counted. You\'ll lead the coalition into another term.',
    label: '★ SECOND TERM', color: '#25C998', stamp: 'RE-ELECTED', won: true
  },
  someNoReform: {
    title: 'So Near, Yet Voted Out', grade: 'D',
    verdict: 'You did enough to deserve a second look, but not enough to survive the voting system. The right chose tactically. You didn\'t.',
    label: '✗ VOTED OUT', color: '#FF335E', stamp: 'VOTED OUT', won: false
  },
  mixed: {
    title: 'Not Enough', grade: 'E',
    verdict: 'You didn\'t achieve enough of your manifesto promises and the public don\'t feel better off. You lose the election.',
    label: '✗ VOTED OUT', color: '#FF335E', stamp: 'VOTED OUT', won: false
  },
  none: {
    title: 'Voted Out', grade: 'F',
    verdict: 'You didn\'t achieve any of your manifesto promises. People keep mentioning lettuce. You lose the election.',
    label: '✗ VOTED OUT', color: '#FF335E', stamp: 'VOTED OUT', won: false
  }
};

/* Ending band thresholds on the final Living Standards meter. */
var V2_ENDING_LIVING_FULL = 68;   // the full reform run, crowned by the wealth tax
var V2_ENDING_LIVING_SOME = 60;   // at least two big-fix weeks (wealth tax can cover the third)
var V2_ENDING_LIVING_MIXED = 40;  // quick fixes only

/** @returns {boolean} player took every Larry policy offered (gates the king-of-cats line) */
function v2LarryBonusEarned() {
  return state.larryLoyal === true;
}

/** @returns {{title:string, grade:string, verdict:string, label:string, color:string, stamp:string, won:boolean}} */
function v2ReelectionOutcome() {
  var living = state.meters.living;
  var reform = v2EnactedElectoralReform();
  if (living >= V2_ENDING_LIVING_FULL) return reform ? V2_ENDINGS.landslide : V2_ENDINGS.fullNoReform;
  if (living >= V2_ENDING_LIVING_SOME) return reform ? V2_ENDINGS.reelected : V2_ENDINGS.someNoReform;
  if (living >= V2_ENDING_LIVING_MIXED) return V2_ENDINGS.mixed;
  return V2_ENDINGS.none;
}

/* Fields the end screen renders for a v2 run: the election outcome (final Living
   Standards + voter reform) decides everything — no meter collapses the term. Taking every
   Larry policy earns the king-of-cats line on any losing ending: it replaces the lettuce
   text on the 0-policy ending, and is appended on the other losing endings. */
/** @returns {{stamp:string, title:string, grade:string, verdictHtml:string, label:string, color:string}} */
function v2EndInfo() {
  var ending = v2ReelectionOutcome();
  var larry = !ending.won && v2LarryBonusEarned();
  var verdict = (larry && ending === V2_ENDINGS.none) ? LARRY_BONUS_LINE : ending.verdict;
  var verdictHtml = '<p>' + htmlEsc(verdict) + '</p>';
  if (larry && ending !== V2_ENDINGS.none) {
    verdictHtml += '<p class="end-larry-bonus">' + htmlEsc(LARRY_BONUS_LINE) + '</p>';
  }
  return { stamp: ending.stamp, title: ending.title, grade: ending.grade, verdictHtml: verdictHtml, label: ending.label, color: ending.color };
}

/* ---------- election-night hemicycle ----------
   Geometry lifted from Becky's scratch/ending-screen-modular-scaffold.html:
   650 dots in 14 concentric rows inside a 100x56 viewBox, with the gold dashed
   line between seats 326 and 327. Painted once per showEnd, then filled. */
var END_TOTAL_SEATS = 650;
var END_MAJORITY_SEATS = 326;
var END_CHAMBER_ROWS = 14, END_CHAMBER_INNER_FRAC = 0.42;
var END_CHAMBER_CX = 50, END_CHAMBER_CY = 52, END_CHAMBER_OUTER_R = 47;
var END_CHAMBER_DOT_R = 0.86, END_CHAMBER_EDGE_PAD = 0.04;
var SVG_NS = 'http://www.w3.org/2000/svg';

/** @returns {Array<{ang:number, x:number, y:number}>} seat positions, left → right */
function buildEndSeats() {
  /** @type {number[]} */ var weights = [];
  for (var j = 0; j < END_CHAMBER_ROWS; j++) {
    weights.push(END_CHAMBER_INNER_FRAC + (1 - END_CHAMBER_INNER_FRAC) * (j / (END_CHAMBER_ROWS - 1)));
  }
  var sumW = weights.reduce(function(a, b) { return a + b; }, 0);
  var raw = weights.map(function(w) { return (END_TOTAL_SEATS * w) / sumW; });
  var seatsPerRow = raw.map(Math.floor);
  var placed = seatsPerRow.reduce(function(a, b) { return a + b; }, 0);
  var byFrac = raw
    .map(function(v, idx) { return { j: idx, frac: v - Math.floor(v) }; })
    .sort(function(a, b) { return b.frac - a.frac || b.j - a.j; });
  var extra = 0;
  while (placed < END_TOTAL_SEATS) { seatsPerRow[byFrac[extra % END_CHAMBER_ROWS].j]++; placed++; extra++; }
  /** @type {Array<{ang:number, x:number, y:number}>} */ var seats = [];
  for (var row = 0; row < END_CHAMBER_ROWS; row++) {
    var r = END_CHAMBER_OUTER_R * weights[row];
    var n = seatsPerRow[row];
    for (var k = 0; k < n; k++) {
      var t = n === 1 ? 0.5 : k / (n - 1);
      var ang = Math.PI * (1 - END_CHAMBER_EDGE_PAD) - Math.PI * (1 - 2 * END_CHAMBER_EDGE_PAD) * t;
      seats.push({ ang: ang, x: END_CHAMBER_CX + r * Math.cos(ang), y: END_CHAMBER_CY - r * Math.sin(ang) });
    }
  }
  seats.sort(function(a, b) { return b.ang - a.ang; });
  return seats;
}
var END_CHAMBER_SEATS = buildEndSeats();

/* Draw the gold dashed majority line + one dot per seat, filling the first
   playerSeats dots pink (left → right) and the rest grey. */
/** @param {number} playerSeats @returns {void} */
function paintEndChamber(playerSeats) {
  var svg = document.getElementById('end-chamber-svg');
  if (!svg) return;
  svg.innerHTML = '';
  var majAng = (END_CHAMBER_SEATS[END_MAJORITY_SEATS - 1].ang + END_CHAMBER_SEATS[END_MAJORITY_SEATS].ang) / 2;
  var rIn = END_CHAMBER_OUTER_R * END_CHAMBER_INNER_FRAC - 1.6;
  var rOut = END_CHAMBER_OUTER_R + 1.6;
  var line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(END_CHAMBER_CX + rIn * Math.cos(majAng)));
  line.setAttribute('y1', String(END_CHAMBER_CY - rIn * Math.sin(majAng)));
  line.setAttribute('x2', String(END_CHAMBER_CX + rOut * Math.cos(majAng)));
  line.setAttribute('y2', String(END_CHAMBER_CY - rOut * Math.sin(majAng)));
  line.setAttribute('stroke', '#FFC93C');
  line.setAttribute('stroke-width', '0.9');
  line.setAttribute('stroke-dasharray', '1.6 1.4');
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);
  END_CHAMBER_SEATS.forEach(function(s, i) {
    var c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', s.x.toFixed(2));
    c.setAttribute('cy', s.y.toFixed(2));
    c.setAttribute('r', String(END_CHAMBER_DOT_R));
    c.setAttribute('stroke', 'rgba(0,0,0,.35)');
    c.setAttribute('stroke-width', '0.18');
    c.setAttribute('fill', i < playerSeats ? '#FF335E' : '#6f6d68');
    svg.appendChild(c);
  });
}

/* Election numbers per ending (vote shares are Becky's spec, 2026-07-02).
   Seats are hand-tuned to tell each ending's story: the two 40% outcomes are
   the system lesson — the same vote share leads a coalition under the reformed
   rules (C) but gets squeezed below it by tactical voting under the old ones
   (D). Taking every Larry option overrides any losing run with 0% — the cats
   don't get a vote. */
/** @returns {{pct: number, seats: number}} */
function v2EndVoteNumbers() {
  var ending = v2ReelectionOutcome();
  if (!ending.won && v2LarryBonusEarned()) return { pct: 0, seats: 0 };
  if (ending === V2_ENDINGS.landslide)    return { pct: 52, seats: 338 };
  if (ending === V2_ENDINGS.fullNoReform) return { pct: 45, seats: 312 };
  if (ending === V2_ENDINGS.reelected)    return { pct: 40, seats: 260 };
  if (ending === V2_ENDINGS.someNoReform) return { pct: 40, seats: 238 };
  if (ending === V2_ENDINGS.mixed)        return { pct: 25, seats: 163 };
  return { pct: 5, seats: 8 };
}

/* ---------- the morning-after front page + posts ----------
   One headline + social pack per ending; taking every Larry option overrides
   the pack on any losing ending with the CAT KING edition. NAME is replaced
   with the player's name (fallback: THE PM). */
/** @typedef {{masthead:string, headline:string, posts:Array<{net:'msky'|'hex', name:string, handle:string, text:string, stats:string}>}} EndPress */
/** @type {Record<string, EndPress>} */
var V2_END_PRESS = {
  landslide: {
    masthead: 'THE DAILY CHRONICLE',
    headline: 'NAME SECURES VICTORY!',
    posts: [
      { net: 'msky', name: 'rosa', handle: '@rosa.msky.social', text: 'five more years of actually fixing things. didn’t know we were allowed that', stats: '↻ 8.2K   ♥ 51K' },
      { net: 'hex', name: 'Nigel Pinstripe', handle: '@nigelp', text: 'The country has voted, and the country is wrong. See you in five years.', stats: '↻ 2.4K   ♥ 9.1K' }
    ]
  },
  fullNoReform: {
    masthead: 'THE DAILY RAGE',
    headline: 'POPULAR PM NAME IN NARROW LOSS SHOCKER',
    posts: [
      { net: 'msky', name: 'rosa', handle: '@rosa.msky.social', text: 'most popular PM in decades and we STILL lost on the seat maths. fix the voting system. please.', stats: '↻ 9.4K   ♥ 62K' },
      { net: 'hex', name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'Won the argument, lost the election. The spreadsheet never lies.', stats: '↻ 3.1K   ♥ 12K' }
    ]
  },
  reelected: {
    masthead: 'THE DAILY CHRONICLE',
    headline: 'NAME WINS IN NAIL BITING RACE',
    posts: [
      { net: 'msky', name: 'Polly Ticks', handle: '@pollyticks.msky.social', text: 'the reformed voting system did its job: votes in, seats out, no spreadsheet sorcery. what a night.', stats: '↻ 4.6K   ♥ 28K' },
      { net: 'hex', name: 'Westminster Whisper', handle: '@wmwhisper', text: 'A close-run thing. Under the old rules this vote share loses; under the new ones it governs.', stats: '↻ 2.2K   ♥ 8.7K' }
    ]
  },
  someNoReform: {
    masthead: 'THE DAILY RAGE',
    headline: 'NAME LOSES IN NAIL BITING RACE',
    posts: [
      { net: 'msky', name: 'rosa', handle: '@rosa.msky.social', text: 'did the tactical voting maths until 2am and it still wasn’t enough. gutted.', stats: '↻ 5.8K   ♥ 34K' },
      { net: 'hex', name: 'Nigel Pinstripe', handle: '@nigelp', text: 'A nail-biter! And the nail says: OUT.', stats: '↻ 2.9K   ♥ 11K' }
    ]
  },
  mixed: {
    masthead: 'THE DAILY RAGE',
    headline: 'NAME FAILS TO DELIVER - LOSES RACE',
    posts: [
      { net: 'msky', name: 'Doomscroll Dan', handle: '@dan.msky.social', text: 'turns out “we’ll get to it” isn’t a manifesto. who knew', stats: '↻ 3.2K   ♥ 19K' },
      { net: 'hex', name: 'TaxpayerWatch', handle: '@taxpayerwatch', text: 'Promised much, delivered little, billed us anyway. Voted accordingly.', stats: '↻ 2.7K   ♥ 10K' }
    ]
  },
  none: {
    masthead: 'THE DAILY RAGE',
    headline: 'NAME GETS FEWER VOTES THAN LETTUCE',
    posts: [
      { net: 'msky', name: 'rosa', handle: '@rosa.msky.social', text: 'the lettuce has declared victory. the lettuce is giving a speech.', stats: '↻ 12K   ♥ 89K' },
      { net: 'hex', name: 'Nigel Pinstripe', handle: '@nigelp', text: 'Outpolled by salad. Britain remains capable of greatness.', stats: '↻ 4.4K   ♥ 17K' }
    ]
  },
  catKing: {
    masthead: 'THE GLOBE',
    headline: 'NAME CROWNED CAT KING',
    posts: [
      { net: 'msky', name: 'Larry (parody)', handle: '@Number10Cat', text: 'the humans voted them out. the cats crowned them king. correct on both counts.', stats: '↻ 31K   ♥ 210K' },
      { net: 'hex', name: 'Westminster Whisper', handle: '@wmwhisper', text: 'The first leader in history to gain a crown by losing an election. The mousers are purring.', stats: '↻ 3.8K   ♥ 15K' }
    ]
  }
};

/** @returns {EndPress} the morning-after pack for the run's outcome */
function v2EndPressPack() {
  var ending = v2ReelectionOutcome();
  if (!ending.won && v2LarryBonusEarned()) return V2_END_PRESS.catKing;
  if (ending === V2_ENDINGS.landslide) return V2_END_PRESS.landslide;
  if (ending === V2_ENDINGS.fullNoReform) return V2_END_PRESS.fullNoReform;
  if (ending === V2_ENDINGS.reelected) return V2_END_PRESS.reelected;
  if (ending === V2_ENDINGS.someNoReform) return V2_END_PRESS.someNoReform;
  if (ending === V2_ENDINGS.mixed) return V2_END_PRESS.mixed;
  return V2_END_PRESS.none;
}

/** Render the seat chart with the (placeholder) election numbers. */
function renderEndChamber() {
  var numbers = v2EndVoteNumbers();
  paintEndChamber(numbers.seats);
  var pctEl = document.getElementById('end-chamber-pct');
  var seatsEl = document.getElementById('end-chamber-seats');
  if (pctEl) pctEl.textContent = numbers.pct + '%';
  if (seatsEl) seatsEl.textContent = String(numbers.seats);
}

/** Render the morning-after front page + social posts. */
function renderEndPress() {
  var pack = v2EndPressPack();
  var name = (state.playerName || 'The PM').toUpperCase();
  var mastheadEl = document.getElementById('end-np-masthead');
  var headlineEl = document.getElementById('end-np-headline');
  if (mastheadEl) mastheadEl.textContent = pack.masthead;
  if (headlineEl) headlineEl.textContent = pack.headline.replace(/NAME/g, name);
  var postsEl = document.getElementById('end-press-posts');
  if (postsEl) {
    postsEl.innerHTML = pack.posts.map(function(f) {
      var isHex = f.net === 'hex';
      return '<div class="post ' + (isHex ? 'post--x' : 'post--bluesky') + '"><div class="post__header">' +
        avatarHTML(f, isHex ? HEX_AVATAR : MSKY_AVATAR) +
        '<div class="post__byline' + (isHex ? ' post__byline--x' : '') + '"><div class="post__name">' + htmlEsc(f.name) + '</div><div class="post__handle' + (isHex ? '' : ' post__handle--bluesky') + '">' + htmlEsc(f.handle) + '</div></div>' +
        (isHex ? '<span class="post__network">HEX</span>' : '') + '</div>' +
        '<div class="post__text">' + htmlEsc(f.text) + '</div><div class="post__stats">' + htmlEsc(f.stats) + '</div></div>';
    }).join('');
  }
}

/* ---------- end screen ---------- */
function showEnd() {
  var info = v2EndInfo();

  document.getElementById('end-title').textContent   = info.title;
  var gradeTag = document.getElementById('end-grade-tag');
  if (gradeTag) gradeTag.textContent = 'Grade: ' + info.grade;
  document.getElementById('end-verdict').innerHTML   = info.verdictHtml;

  // The counting method behind the seat chart: reformed runs use PR.
  var methodEl = document.getElementById('end-method');
  if (methodEl) methodEl.textContent = 'Method: ' + (v2EnactedElectoralReform() ? 'PR' : 'FPTP');

  renderEndChamber();
  renderEndPress();

  // Final meter values + bars
  // el typed `any`: textContent assigned a number (JS coercion), unchanged.
  document.querySelectorAll('#ov-end .m-val').forEach(function(/** @type {any} */ el) {
    el.textContent = Math.round(state.meters[el.getAttribute('data-m')]);
  });
  /** @type {NodeListOf<HTMLElement>} */
  var fills = document.querySelectorAll('#ov-end .m-fill');
  fills.forEach(function(el) { el.style.strokeDashoffset = RING_C.toFixed(2); });
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      fills.forEach(function(el) {
        el.style.strokeDashoffset = ringOffset(state.meters[el.getAttribute('data-m')]).toFixed(2);
      });
    });
  });

  // Larry's pet/shoo reaction: his image plus a separate speech-bubble caption.
  var endLarry = document.getElementById('end-larry');
  if (state.larryNice === null) {
    endLarry.hidden = true;
  } else {
    document.getElementById('end-larry-bubble').textContent =
      state.larryNice ? 'I voted for you!' : 'I didn\'t vote for you!';
    endLarry.hidden = false;
  }

  document.getElementById('share-confirm').hidden = true;
}

/* ---------- share ---------- */
function shareResult() {
  var shareLabel = v2EndInfo().label;
  // Pad the label column to the longest share label + 2 (preserves the original
  // fixed-width alignment: 'Living Standards' is 16 chars, so the column is 18).
  var labelWidth = METERS.reduce(function(w, d) { return Math.max(w, d.share.length); }, 0) + 2;
  var lines = METERS.map(function(d) {
    var v = Math.round(state.meters[d.key]);
    var filled = Math.round(v / 10);
    var bar = '█'.repeat(filled) + '░'.repeat(10 - filled) + ' ' + v;
    return d.share.padEnd(labelWidth) + bar;
  });
  var text =
    'Larry\'s Landlord 🐱\n' +
    shareLabel + '\n\n' +
    lines.join('\n') + '\n\n' +
    'Can you BETTER my score? compassonline.org.uk';

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(showShareCopied);
  } else {
    // Fallback for browsers without clipboard API
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showShareCopied();
  }
}

/* Pop the little "Copied!" note above the share button and let it fade away.
   Restarting the animation makes repeat clicks pop it again. */
function showShareCopied() {
  var el = document.getElementById('share-confirm');
  if (!el) return;
  el.hidden = false;
  restartAnim(el, 'share-copied-pop 1.6s ease forwards');
}

/** @type {GameScreen[]} */
var OVERLAYS = ['start', 'press', 'reaction', 'end'];

/** @param {GameScreen} screen active top-level screen */
function syncRootStateHooks(screen) {
  var canvas = document.getElementById('canvas');
  if (!canvas) return;
  canvas.setAttribute('data-screen', screen);
  if (screen !== 'decide') {
    canvas.removeAttribute('data-v2-surface');
  }
  if (screen === 'start') {
    canvas.setAttribute('data-start-step', String(state.startStep));
  } else {
    canvas.removeAttribute('data-start-step');
  }
}

/** @param {GameScreen} screen one of OVERLAYS, or 'decide' */
function go(screen) {
  state.screen = screen;
  // Every screen change starts at the top — otherwise the new page can inherit
  // the scroll position of the one we just left (e.g. landing part-way down a
  // fresh policy decision).
  if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
  syncRootStateHooks(screen);
  OVERLAYS.forEach(function(id) {
    var el = document.getElementById('ov-' + id);
    if (!el) return;
    el.hidden = (id !== screen);
    // Each overlay is its own scroll container, so reset the one we're showing
    // to the top (window.scrollTo above doesn't touch inner scrollers).
    if (id === screen) el.scrollTop = 0;
  });
  if (screen === 'start')    showStep();
  if (screen === 'decide')   renderDecide();
  if (screen === 'press')    showPress();
  if (screen === 'reaction') showReaction();
  if (screen === 'end')      showEnd();
  updateDemoStatus();
}

/* ---------- start / cabinet flow ---------- */
function begin() {
  var nameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('pm-name'));
  state.playerName = nameInput ? nameInput.value.trim() : '';
  if (isV2Mode()) {
    demoRecordStep();  // snapshot the start screen so BACK can return to it
    if (v2StartRun()) go('decide');
    else go('end');
    return;
  }
  // Step 5 is the rules intro — meet the meters before the first cabinet pick (issue #21).
  state.startStep = 5;
  showStep();
}

/** Advance from the rules intro (step 5) into the first cabinet pick (step 1). */
function toFirstPick() {
  state.startStep = 1;
  showStep();
}

/** Display title for the player — their name if given, else the generic title. */
function pmTitle() {
  return state.playerName ? ('Prime Minister ' + state.playerName) : 'Prime Minister';
}


/**
 * @param {string} post pair id ('pair1'|'pair2'|'pair3')
 * @param {Side} who which option was chosen
 */
function choose(post, who) {
  state.cabinet[post] = who;
  // pair1 picks happen at game start → fall through to the Larry step (4) next.
  // pair2/pair3 picks happen between scenarios → drop straight into the next decide screen.
  if (post === 'pair1') {
    state.startStep = 4;
    showStep();
  } else {
    go('decide');
  }
}

/** @param {boolean} nice true = pet Larry, false = shoo */
function chooseLarry(nice) {
  state.larryNice = nice;
  larryChoiceFloats(nice, document.querySelector('#ov-start .start-larry'));
  var toast = document.getElementById('larry-toast');
  toast.hidden = false;
  setTimeout(function() { toast.hidden = true; go('decide'); }, 1600);
}

function showStep() {
  syncRootStateHooks(state.screen);
  document.querySelectorAll('#ov-start .step').forEach(function(/** @type {any} */ el) {
    var n = parseInt(el.getAttribute('data-step'), 10);
    el.hidden = (n !== state.startStep);
  });
  // Steps 1-3 are the policy-pick screens — refresh their meter strip so it
  // reflects current state.meters (which shift between pair1 and pair2/3 picks).
  if (state.startStep >= 1 && state.startStep <= 3) {
    renderMetersInto('pick-meters-' + state.startStep);
  }
  // Step 5 (rules intro) shows the same live four-meter strip at their starting positions.
  if (state.startStep === 5) {
    renderMetersInto('rules-meters');
  }
  updateDemoStatus();
}

/* ---------- reset ---------- */
function resetGame() {
  demoHistory = [];  // fresh run starts with an empty BACK stack
  state.startStep        = 0;
  state.playerName       = '';
  defaultPlayerNameCleared = false;
  var nameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('pm-name'));
  if (nameInput) nameInput.value = DEFAULT_PLAYER_NAME;
  state.cabinet          = {};
  state.larryNice        = null;
  state.larryLoyal       = true;
  state.turn             = 1;
  state.weekNum          = 1;
  state.weekDay          = 1;
  state.firstReactionlessPressSeen = false;
  state.weekVerdicts     = [];
  state.scenarioIndex    = 0;
  state.scenarioTurn     = 1;
  state.scenarioUnlockTurn = new Array(SCENARIO_COUNT).fill(null);
  state.lastPolicy       = null;
  state.lastDeltas       = {};
  state.passedPolicies   = {};
  state.passedHelpPolicy = false;
  state.pressFixedTurn   = null;
  state.politicsFixedTurn = null;
  state.meters           = Object.assign({}, STARTING_METERS);
  state.concentratedPower = 100;
  state.deadMeter        = null;
  state._preActionSnapshot = null;
  if (isV2Mode()) {
    v2Bridge.routerState = null;
    v2Bridge.activeSurface = null;
    v2Bridge.activeSurfaceView = null;
    v2Bridge.choiceAvailability = {};
    v2Bridge.pendingChoiceId = null;
    v2Bridge.pendingChoiceView = null;
    v2Bridge.lastSurfaceView = null;
    v2Bridge.lastChoiceView = null;
    v2Bridge.lastResult = null;
  }
  go('start');
}

/* ---------- demo nav ---------- */
/* Show/hide the dev-only demo nav bar. demoMode(1) shows, demoMode(0) hides.
   Per-page-load only — not persisted. */
/** @param {number|boolean} on */
function demoMode(on) {
  var bar = document.getElementById('demo-bar');
  if (!bar) return;
  bar.style.display = on ? 'flex' : 'none';
  console.log('[demoMode] demo controls ' + (on ? 'shown' : 'hidden'));
}

/* History stack for the BACK button. The v2 game is driven by a router whose
   forward steps (begin / pick / fallout / next turn) mutate state irreversibly,
   so we can't compute "back" — instead we snapshot the world before each
   FORWARD step and pop the stack to undo. Per-page-load only; cleared on reset. */
/** @type {Array<{state: any, v2: any}>} */
var demoHistory = [];

/**
 * Deep-clone a value. structuredClone where available, JSON as a fallback.
 * @param {any} value
 * @returns {any}
 */
function demoClone(value) {
  if (value == null) return value;
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch (_err) { /* fall through to JSON */ }
  return JSON.parse(JSON.stringify(value));
}

/* Capture everything a BACK step needs to restore: the full game state plus the
   serializable view-state of the v2 bridge. config/router/adapter are long-lived
   singletons (and hold functions), so we keep them by reference, not cloned. */
function demoSnapshot() {
  return {
    state: demoClone(state),
    v2: {
      routerState:            demoClone(v2Bridge.routerState),
      activeSurface:          demoClone(v2Bridge.activeSurface),
      activeSurfaceView:      demoClone(v2Bridge.activeSurfaceView),
      choiceAvailability:     demoClone(v2Bridge.choiceAvailability),
      pendingChoiceId:        v2Bridge.pendingChoiceId,
      pendingChoiceView:      demoClone(v2Bridge.pendingChoiceView),
      lastSurfaceView:        demoClone(v2Bridge.lastSurfaceView),
      lastChoiceView:         demoClone(v2Bridge.lastChoiceView),
      lastResult:             demoClone(v2Bridge.lastResult),
      activeSurfaceNotice:    demoClone(v2Bridge.activeSurfaceNotice),
      lastConsequenceNotices: demoClone(v2Bridge.lastConsequenceNotices)
    }
  };
}

/** Restore a snapshot taken by demoSnapshot(), mutating the live objects in place
   so any held references (window hooks etc.) stay valid.
   @param {{state: any, v2: any}} snap */
function demoRestore(snap) {
  Object.assign(state, snap.state);
  Object.assign(v2Bridge, snap.v2);
}

/* Called by each real forward transition (begin / pick / fallout / next turn)
   just before it mutates, so BACK works whether you played with the real game
   buttons or the demo FORWARD button. */
function demoRecordStep() {
  demoHistory.push(demoSnapshot());
}

function demoBack() {
  if (demoHistory.length === 0) {
    console.log('[demoBack] nothing to undo — already at the first step');
    return;
  }
  demoRestore(demoHistory.pop());
  go(state.screen);
}

function demoForward() {
  var s = state.screen;
  if (isV2Mode()) {
    if (s === 'start') {
      begin();
    } else if (s === 'decide') {
      var surface = v2Bridge.activeSurfaceView;
      if (!surface) return;
      if (surface.presentation === 'pick-two') {
        // Select the first two available cards, then confirm.
        v2Bridge.pickTwoSelected = [];
        for (var pi = 0; pi < surface.choices.length && v2Bridge.pickTwoSelected.length < 2; pi++) {
          var av = v2Bridge.choiceAvailability[surface.choices[pi].id];
          if (!av || av.available) v2Bridge.pickTwoSelected.push(surface.choices[pi].id);
        }
        confirmV2PickTwo();
        return;
      }
      for (var vi = 0; vi < surface.choices.length; vi++) {
        var availability = v2Bridge.choiceAvailability[surface.choices[vi].id];
        if (!availability || availability.available) {
          pickV2Choice(surface.choices[vi].id);
          break;
        }
      }
    } else if (s === 'press') {
      seeTheFallout();
    } else if (s === 'reaction') {
      nextTurn();
    } else if (s === 'end') {
      resetGame();
    }
    return;
  }
  if (s === 'start') {
    if (!state.cabinet.pair1) state.cabinet.pair1 = 'a';
    if (!state.cabinet.pair2) state.cabinet.pair2 = 'a';
    if (!state.cabinet.pair3) state.cabinet.pair3 = 'a';
    if (state.larryNice === null) state.larryNice = true;
    go('decide');
  } else if (s === 'decide') {
    var cards = getTurnCards();
    var pick = null;
    for (var i = 0; i < cards.length; i++) {
      if (!state.passedPolicies[cards[i]]) { pick = cards[i]; break; }
    }
    if (pick) pickPolicy(pick);
  } else if (s === 'press') {
    seeTheFallout();
  } else if (s === 'reaction') {
    nextTurn();
  } else if (s === 'end') {
    resetGame();
  }
}

/* Auto-play the whole run to the end screen by repeatedly stepping forward.
   Guarded against runaway loops: stops at the end screen, after a hard cap, or
   if three forward steps in a row produce no change (something's stuck). */
function demoToEnd() {
  var guard = 0;
  var stuck = 0;
  var prev = '';
  while (state.screen !== 'end' && guard < 600) {
    demoForward();
    guard += 1;
    var surfaceId = (typeof v2Bridge !== 'undefined' && v2Bridge.activeSurfaceView)
      ? v2Bridge.activeSurfaceView.id : '';
    var sig = [state.screen, state.turn, state.scenarioTurn, state.startStep, surfaceId].join('|');
    if (sig === prev) {
      stuck += 1;
      if (stuck >= 3) break;
    } else {
      stuck = 0;
    }
    prev = sig;
  }
  console.log('[demoToEnd] stopped at screen=' + state.screen + ' after ' + guard + ' steps');
}

/* Live "where am I" readout in the demo bar. Safe no-op if the bar isn't present. */
function updateDemoStatus() {
  var el = document.getElementById('demo-status');
  if (!el) return;
  var label = state.screen;
  if (state.screen === 'start') {
    label += ' · step ' + state.startStep;
  } else if (typeof state.turn === 'number' && state.turn > 0) {
    label += ' · week ' + state.turn;
  }
  el.textContent = label.toUpperCase();
}

/* ---------- policy-pick screens (rendered from SCENARIOS[*].pick) ---------- */
/**
 * Combined ± impact of a fight: sum the deltas of the scenario's direct-help
 * card and its upgraded-help card into one aggregate, so the pick card can
 * preview the trade-off before the player commits. Guards against missing
 * cards / deltas so single-impact scenarios degrade gracefully.
 * @param {Scenario} sc
 * @returns {Partial<Deltas>}
 */
function combinedPickDeltas(sc) {
  /** @type {Record<string, number>} */
  var sum = {};
  (/** @type {HandCard[]} */ (sc && sc.hand || [])).forEach(function(/** @type {HandCard} */ card) {
    if (!card || (card.role !== 'direct' && card.role !== 'upgraded')) return;
    var d = card.deltas;
    if (!d) return;
    METERS.forEach(function(m) {
      var v = d[m.key];
      if (typeof v === 'number') sum[m.key] = (sum[m.key] || 0) + v;
    });
  });
  return sum;
}

/**
 * @param {string} pair pair id ('pair1'|'pair2'|'pair3')
 * @param {Side} side which option ('a'|'b')
 * @param {Scenario} sc the scenario behind this option
 * @returns {string}
 */
function buildPickButton(pair, side, sc) {
  var p = sc.pick;
  var rot = side === 'a' ? 'rot-l' : 'rot-r';
  return '<button onclick="choose(\'' + pair + '\',\'' + side + '\')" class="card cabinet-pick-card ' + rot + '">'
    + '<div class="badge badge--ink cabinet-pick-card__badge"><span class="cabinet-pick-card__dot" style="background:' + p.dotColor + ';"></span><span>ON THE DESK · ' + sc.label + '</span></div>'
    + '<div class="cabinet-pick-card__minister">'
    + portraitHTML(p, 'bright')
    + '<div><div class="cabinet-pick-card__name">' + p.ministerName + '</div><div class="cabinet-pick-card__role">' + p.ministerRole + '</div></div>'
    + '</div>'
    + '<div class="cabinet-pick-card__quote">' + p.quote + '</div>'
    + renderDeltaChips(combinedPickDeltas(sc))
    + '<span class="cabinet-pick-card__cta">TAKE IT ON →</span>'
    + '</button>';
}

function renderPicks() {
  ['pair1', 'pair2', 'pair3'].forEach(function(pair, i) {
    var row = document.getElementById('pick-row-' + (i + 1));
    if (!row) return;
    var pairMap = CABINET_TO_SCENARIO[pair];
    if (!pairMap || !SCENARIOS[pairMap.a] || !SCENARIOS[pairMap.b]) {
      row.innerHTML = '';
      return;
    }
    row.innerHTML = buildPickButton(pair, 'a', SCENARIOS[pairMap.a])
                  + buildPickButton(pair, 'b', SCENARIOS[pairMap.b]);
  });
}

/* ---------- meter tooltips: tap a dial on mobile to flash its name ----------
   Desktop hover is handled in CSS; this only adds the brief tap-to-show on touch. */
/** @type {ReturnType<typeof setTimeout> | null} */
var meterTipTimer = null;
document.addEventListener('click', function(e) {
  var target = e.target instanceof Element ? e.target.closest('.meter-donut') : null;
  document.querySelectorAll('.meter-donut.is-tipped').forEach(function(el) {
    if (el !== target) el.classList.remove('is-tipped');
  });
  if (!target) return;
  target.classList.add('is-tipped');
  if (meterTipTimer) clearTimeout(meterTipTimer);
  meterTipTimer = setTimeout(function() { target.classList.remove('is-tipped'); }, 1600);
});

/* ---------- boot ---------- */
document.querySelectorAll('.larry').forEach(function(el) { el.innerHTML = LARRY_SVG; });
var playerNameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('pm-name'));
if (playerNameInput) playerNameInput.addEventListener('focus', clearDefaultPlayerNameOnce);
renderPicks();
go('start');
