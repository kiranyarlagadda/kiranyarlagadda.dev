// Entry point for the Arcade page (/arcade/).
//
// Three screens, one state machine driven by location.hash:
//   no hash, first visit this session -> intro, then select
//   no hash thereafter (or reduced motion, or an unknown hash) -> select
//   #<game>                                                    -> that game
//
// The games and the <arcade-game> element live in their own repo:
// https://github.com/kiranyarlagadda/arcade
// Importing the package registers the custom element.
import { GAME_NAMES, GAME_INFO } from 'arcade';

// The cabinet scene behind the intro and select screen comes from Element
// Lab. Importing it registers <lab-scene> the same way.
import 'element-lab';

// The intro scene is being written in a parallel project and is not yet in
// the installed element-lab, so this name currently resolves to nothing: the
// element sets data-state="error" and renders its fallback background, but
// every timing and UI path below still runs. Flip this to 'lattice' (which
// does exist) to see the choreography while that scene is unfinished, then
// set it back before shipping.
const INTRO_SCENE = 'cabinet';

const INTRO_DURATION = 2600; // ms, zoom 0 -> 1
const INTRO_SEEN_KEY = 'arcade-intro-seen';
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(pointer: coarse)').matches;

// ------------------------------------------------------------------ marks
//
// Tile icons. Aim reuses the brand's 3x3 mark (it already reads as a grid of
// targets); chess gets a small hand-drawn crown. Both use currentColor so
// .tile-icon's own color rule decides the ink.

const GAME_ICONS = {
  aim: `<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">
    <circle cx="16" cy="16" r="4.6" fill="#5c6478" />
    <circle cx="32" cy="16" r="4.6" fill="#5c6478" />
    <circle cx="48" cy="16" r="4.6" fill="#5c6478" />
    <circle cx="16" cy="32" r="4.6" fill="#5c6478" />
    <circle cx="48" cy="32" r="4.6" fill="#5c6478" />
    <circle cx="16" cy="48" r="4.6" fill="#5c6478" />
    <circle cx="32" cy="48" r="4.6" fill="#5c6478" />
    <circle cx="48" cy="48" r="4.6" fill="#5c6478" />
    <circle cx="32" cy="32" r="4.6" fill="#ffb454" />
    <circle cx="32" cy="32" r="8" fill="none" stroke="#ffb454" stroke-opacity="0.45" stroke-width="1.8" />
  </svg>`,
  chess: `<svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
    <path d="M16 46 L20 22 L27 33 L32 18 L37 33 L44 22 L48 46 Z"
      fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" />
    <rect x="15" y="46" width="34" height="6" rx="1.5" fill="currentColor" />
  </svg>`,
};

// Draughts: the disc from the design sheet, two turned rings.
GAME_ICONS.draughts = `<svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
  <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" stroke-width="2.6" />
  <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6" />
</svg>`;

const DEFAULT_ICON = `<svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
  <circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" stroke-width="2.6" />
</svg>`;

// ------------------------------------------------------------------- refs

const sceneHost = document.getElementById('sceneHost');

const introEl = document.getElementById('intro');

const selectEl = document.getElementById('select');
const tilesEl = document.getElementById('tiles');

const gameEl = document.getElementById('game');
const stage = document.getElementById('stage'); // <arcade-game>
const backBtn = document.getElementById('back');
const gameTitleEl = document.getElementById('gameTitle');
const stateEl = document.getElementById('state');
const gearBtn = document.getElementById('gear');
const resultsEl = document.getElementById('results');
const statsEl = document.getElementById('stats');
const drawerEl = document.getElementById('drawer');
const drawerCloseBtn = document.getElementById('drawerClose');
const controlsEl = document.getElementById('controls');

// -------------------------------------------------------------- the scene
//
// One <lab-scene> lives behind the intro and the select screen. It is torn
// down completely while a game is showing, so the game gets the full frame
// budget, and rebuilt at zoom 1 on the way back out.

let sceneEl = null;

function mountScene(zoom) {
  if (!sceneEl) {
    sceneEl = document.createElement('lab-scene');
    sceneEl.setAttribute('name', INTRO_SCENE);
    // A little ambient life on the cabinet beyond the zoom itself. Harmless
    // no-ops on any scene that does not declare these params.
    sceneEl.setAttribute('sway', '0.4');
    sceneEl.setAttribute('glow', '0.6');
    sceneEl.setAttribute('scan', '0.5');
    sceneEl.setAttribute('dust', '0.4');
    sceneHost.append(sceneEl);
  }
  sceneEl.setAttribute('zoom', String(zoom));
  return sceneEl;
}

function unmountScene() {
  sceneEl?.remove();
  sceneEl = null;
}

// -------------------------------------------------------------- the intro

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Writes `zoom` on `scene` every frame for `duration` ms. Returns a canceller. */
function animateZoom(scene, duration, onDone) {
  let raf = requestAnimationFrame(frame);
  let start = null;
  let cancelled = false;

  function frame(now) {
    if (cancelled) return;
    if (start === null) start = now;
    const t = Math.min(1, (now - start) / duration);
    scene.setAttribute('zoom', easeInOutCubic(t).toFixed(4));
    if (t < 1) raf = requestAnimationFrame(frame);
    else onDone();
  }

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

let skipHandler = null;
function armSkip(fn) {
  skipHandler = fn;
  addEventListener('pointerdown', skipHandler);
  addEventListener('keydown', skipHandler);
}
function disarmSkip() {
  if (!skipHandler) return;
  removeEventListener('pointerdown', skipHandler);
  removeEventListener('keydown', skipHandler);
  skipHandler = null;
}

function playIntro() {
  const scene = mountScene(0);
  let done = false;
  let failsafe = null;

  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(failsafe);
    disarmSkip();
    crossfadeToSelect();
  };

  const cancel = animateZoom(scene, INTRO_DURATION, finish);
  const jumpToEnd = () => {
    cancel();
    scene.setAttribute('zoom', '1');
    finish();
  };
  armSkip(jumpToEnd);

  // Frames can crawl on a weak GPU or a throttled tab, which would stretch
  // the intro well past its budget. Wall-clock failsafe: nobody waits more
  // than a second and a half beyond the intended length.
  failsafe = setTimeout(jumpToEnd, INTRO_DURATION + 1500);
}

/** Draws the select screen "on the cabinet's screen": a 400ms crossfade. */
function crossfadeToSelect() {
  try { sessionStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* private mode: the intro just plays again */ }
  populateTiles();
  selectEl.hidden = false;

  // Two rAFs so the browser paints the pre-transition state (select at
  // opacity 0) before the transition-triggering classes land in the same
  // frame as the style change, which would just jump instead of fading.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      selectEl.classList.add('is-visible');
      introEl.classList.add('is-leaving');
    });
  });

  setTimeout(() => { introEl.hidden = true; }, 420);
}

// ------------------------------------------------------------ the screens

function showSelect() {
  introEl.hidden = true;
  introEl.classList.remove('is-leaving');
  gameEl.hidden = true;
  setDrawer(false, true);

  // Leaving a game disposes it (and its worker, if it had one) rather than
  // leaving it paused behind the tiles.
  stage.removeAttribute('name');

  mountScene(1);
  populateTiles();
  selectEl.hidden = false;
  selectEl.classList.add('is-visible');
}

function showGame(name) {
  introEl.hidden = true;
  introEl.classList.remove('is-leaving');
  selectEl.hidden = true;
  selectEl.classList.remove('is-visible');
  unmountScene();
  setDrawer(false, true);

  resultsEl.hidden = true;
  statsEl.replaceChildren();
  gameTitleEl.textContent = '';
  stateEl.textContent = 'idle';
  stateEl.dataset.state = 'idle';

  // Drop the outgoing game's params so one game's knobs never leak onto the
  // next through a shared attribute name. Then clear `name` itself before
  // setting it again, even when it is unchanged, so a fresh game-ready
  // always fires and refills the title and controls.
  if (stage.paramSchema) {
    for (const key of Object.keys(stage.paramSchema)) stage.removeAttribute(key);
  }
  stage.removeAttribute('name');
  gameEl.hidden = false;
  stage.setAttribute('name', name);
}

// -------------------------------------------------------------- the tiles

function buildTile(name) {
  const info = GAME_INFO[name] ?? { title: name, tag: '', blurb: '' };

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  button.setAttribute('role', 'listitem');

  const icon = document.createElement('span');
  icon.className = 'tile-icon';
  icon.innerHTML = GAME_ICONS[name] ?? DEFAULT_ICON;

  const title = document.createElement('span');
  title.className = 'tile-title';
  title.textContent = info.title;

  const tag = document.createElement('span');
  tag.className = 'tile-tag';
  tag.textContent = info.tag;

  const blurb = document.createElement('span');
  blurb.className = 'tile-blurb';
  blurb.textContent = info.blurb;

  button.append(icon, title, tag, blurb);
  button.addEventListener('click', () => { location.hash = name; });
  return button;
}

function populateTiles() {
  if (tilesEl.childElementCount) return; // built once, reused every visit
  tilesEl.replaceChildren(...GAME_NAMES.map(buildTile));
}

// Left/right roves focus across the tiles, same spirit as the lab's tab
// switching, on top of the ordinary tab order the buttons already have.
tilesEl.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  const tiles = [...tilesEl.children];
  const i = tiles.indexOf(document.activeElement);
  if (i === -1) return;
  event.preventDefault();
  const next = event.key === 'ArrowRight' ? (i + 1) % tiles.length : (i - 1 + tiles.length) % tiles.length;
  tiles[next].focus();
});

backBtn.addEventListener('click', () => { location.hash = ''; });

// ------------------------------------------------------------- game state

stage.addEventListener('game-ready', (event) => {
  const { meta } = event.detail;
  if (!meta) return;
  gameTitleEl.textContent = meta.title;
  buildControls(meta.params);
});

stage.addEventListener('game-state', (event) => {
  const { state } = event.detail;
  stateEl.textContent = state;
  stateEl.dataset.state = state;
});

// ---------------------------------------------------------------- results

stage.addEventListener('game-result', (event) => {
  const { stats, best } = event.detail;

  // Every game reports its own stats shape, so the rows come straight from
  // the object rather than a fixed list. A few keys get a nicer rendering.
  const format = (key, value) => {
    if (value == null) return 'n/a';
    if (key === 'accuracy') return `${Math.round(value * 100)}%`;
    if (key === 'meanInterval') return `${Math.round(value)} ms`;
    if (typeof value === 'number' && !Number.isInteger(value)) return value.toFixed(2);
    return String(value);
  };
  const label = (key) => key.replace(/([A-Z])/g, ' $1').toLowerCase();

  const rows = Object.entries(stats ?? {}).map(([key, value]) => [label(key), format(key, value)]);
  if (best != null) rows.push(['best', String(best)]);

  statsEl.replaceChildren(...rows.map(([name, value]) => {
    const row = document.createElement('div');
    row.className = 'stat';
    const dt = document.createElement('dt');
    dt.textContent = name;
    const dd = document.createElement('dd');
    dd.textContent = value;
    row.append(dt, dd);
    return row;
  }));

  resultsEl.hidden = false;
});

// ---------------------------------------------------------------- drawer

let drawerOpen = false;

function setDrawer(open, immediate = false) {
  drawerOpen = open;
  gearBtn.setAttribute('aria-expanded', String(open));
  gearBtn.classList.toggle('is-active', open);

  if (open) {
    drawerEl.hidden = false;
    if (immediate || REDUCED_MOTION) drawerEl.classList.add('is-open');
    else requestAnimationFrame(() => requestAnimationFrame(() => drawerEl.classList.add('is-open')));
  } else {
    drawerEl.classList.remove('is-open');
    if (immediate || REDUCED_MOTION) drawerEl.hidden = true;
    else setTimeout(() => { if (!drawerOpen) drawerEl.hidden = true; }, 280);
  }
}

gearBtn.addEventListener('click', () => setDrawer(!drawerOpen));
drawerCloseBtn.addEventListener('click', () => setDrawer(false));
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && drawerOpen) setDrawer(false);
});

// ------------------------------------------------------------- controls
//
// Built from whatever the game declares in meta.params, exactly like the old
// single-panel layout did it, so adding a knob to a game makes a control
// appear here with no changes to this file.

function buildControls(schema) {
  const entries = Object.entries(schema ?? {})
    // Raw pointer capture is desktop-only, so there is nothing for a touch
    // visitor to switch here. Drop the row rather than show a dead control.
    .filter(([key]) => !(isTouch && key === 'input'));

  controlsEl.replaceChildren(...entries.map(([key, spec]) => {
    const row = document.createElement('label');
    row.className = 'control';
    row.dataset.key = key;

    const name = document.createElement('span');
    name.className = 'control-label';
    name.textContent = spec.label ?? key;

    const readout = document.createElement('output');
    readout.className = 'control-value';

    const current = stage.getAttribute(key);
    let input;

    if (spec.type === 'select') {
      input = document.createElement('select');
      input.className = 'control-select';
      // Options may be bare values or { value, label } pairs; accept both.
      for (const option of spec.options) {
        const value = option?.value ?? option;
        const el = document.createElement('option');
        el.value = String(value);
        el.textContent = option?.label ?? String(value);
        input.append(el);
      }
      input.value = current ?? String(spec.default);
      readout.textContent = '';
    } else if (spec.type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = (current ?? String(spec.default)) !== 'false';
      readout.textContent = input.checked ? 'on' : 'off';
    } else {
      // 'number': every numeric param the aim game declares is bounded, so a
      // slider reads better than a bare number box.
      input = document.createElement('input');
      input.type = 'range';
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step ?? 1;
      input.value = current ?? spec.default;
      readout.textContent = input.value;
    }

    input.dataset.key = key;

    const readValue = () => (spec.type === 'boolean' ? String(input.checked) : input.value);

    const showValue = () => {
      if (spec.type === 'boolean') readout.textContent = input.checked ? 'on' : 'off';
      else if (spec.type !== 'select') readout.textContent = input.value;
    };

    input.addEventListener('input', () => {
      showValue();
      // Setting the attribute is what drives the game: the element watches
      // its own attributes and forwards changes through to the game state.
      stage.setAttribute(key, readValue());
      if (key === 'input') refreshDependentControls();
    });

    row.append(name, input, readout);
    return row;
  }));

  refreshDependentControls();
}

// Sensitivity and crosshair style only matter once the pointer is captured
// raw, so grey them out otherwise instead of letting a visitor turn knobs
// that are quietly connected to nothing.
function refreshDependentControls() {
  const usingRaw = (stage.getAttribute('input') ?? stage.paramSchema?.input?.default) === 'raw';
  for (const key of ['sensitivity', 'crosshair']) {
    const row = controlsEl.querySelector(`[data-key="${key}"]`);
    if (!row) continue;
    row.classList.toggle('is-disabled', !usingRaw);
    row.querySelector('input, select').disabled = !usingRaw;
  }
}

function resetControls() {
  const schema = stage.paramSchema ?? {};
  for (const key of Object.keys(schema)) stage.removeAttribute(key);
  buildControls(schema);
}

document.getElementById('reset').addEventListener('click', resetControls);

// -------------------------------------------------------------- routing

function render() {
  const name = location.hash.slice(1);
  if (GAME_NAMES.includes(name)) showGame(name);
  else showSelect();
}

addEventListener('hashchange', render);

function boot() {
  const name = location.hash.slice(1);
  if (GAME_NAMES.includes(name)) {
    showGame(name);
    return;
  }

  let seen = null;
  try { seen = sessionStorage.getItem(INTRO_SEEN_KEY); } catch { seen = null; }
  if (name === '' && !seen && !REDUCED_MOTION) playIntro();
  else showSelect();
}

boot();
