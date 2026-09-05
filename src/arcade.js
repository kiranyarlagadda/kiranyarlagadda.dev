// Entry point for the Arcade page (/arcade/).
//
// Same idea as src/lab.js: this file is chrome only. Every game lives behind
// one <arcade-game> tag in its own package, and this script just builds a tab
// bar, reads whatever metadata the element hands back, and turns its param
// schema into controls. Nothing here knows what "aim" or any other game
// actually is.

// The games and the <arcade-game> element live in their own repo:
// https://github.com/kiranyarlagadda/arcade
// Importing the package registers the custom element.
import { GAME_NAMES } from 'arcade';

// The lattice scene behind the page is decorative, borrowed straight from the
// lab. Importing element-lab registers <lab-scene> the same way.
import 'element-lab';

const stage = document.querySelector('arcade-game');
const tabsEl = document.getElementById('tabs');
const stateEl = document.getElementById('state');
const titleEl = document.getElementById('title');
const blurbEl = document.getElementById('blurb');
const tagsEl = document.getElementById('tags');
const controlsEl = document.getElementById('controls');
const resultsEl = document.getElementById('results');
const statsEl = document.getElementById('stats');

const isTouch = matchMedia('(pointer: coarse)').matches;

// ---------------------------------------------------------------- tab bar

GAME_NAMES.forEach((name) => {
  const button = document.createElement('button');
  button.className = 'tab';
  button.type = 'button';
  button.textContent = name;
  button.addEventListener('click', () => select(name));
  tabsEl.append(button);
});

function markActiveTab(name) {
  [...tabsEl.children].forEach((b) => {
    b.classList.toggle('is-active', b.textContent === name);
    b.setAttribute('aria-pressed', String(b.textContent === name));
  });
}

function select(name) {
  // Drop the outgoing game's params so one game's knobs never leak onto the
  // next through a shared attribute name.
  if (stage.paramSchema) {
    for (const key of Object.keys(stage.paramSchema)) stage.removeAttribute(key);
  }
  resultsEl.hidden = true;
  stage.setAttribute('name', name);
  history.replaceState(null, '', `#${name}`);
  markActiveTab(name);
}

// The element announces its own metadata once a game is built, so this page
// never needs to import the game modules itself.
stage.addEventListener('game-ready', (event) => {
  const { name, meta } = event.detail;
  markActiveTab(name);
  if (!meta) return;

  buildControls(meta.params);

  titleEl.textContent = meta.title;
  blurbEl.textContent = meta.blurb;

  tagsEl.replaceChildren(...meta.tags.map((tag) => {
    const li = document.createElement('li');
    li.textContent = tag;
    return li;
  }));
});

// Back/forward and pasted #hash links both land on the right game.
addEventListener('hashchange', () => {
  const name = location.hash.slice(1);
  if (GAME_NAMES.includes(name) && name !== stage.getAttribute('name')) select(name);
});

// ------------------------------------------------------------- game state

stage.addEventListener('game-state', (event) => {
  const { state } = event.detail;
  stateEl.textContent = state;
  stateEl.dataset.state = state;
});

// ---------------------------------------------------------------- results

stage.addEventListener('game-result', (event) => {
  const { stats, best } = event.detail;

  const rows = [
    ['hits', stats.hits],
    ['misses', stats.misses],
    ['accuracy', `${Math.round(stats.accuracy * 100)}%`],
    ['targets/sec', stats.targetsPerSecond.toFixed(2)],
    ['mean interval', stats.meanInterval == null ? 'n/a' : `${Math.round(stats.meanInterval)} ms`],
    ['best', best ?? 'first run'],
  ];

  statsEl.replaceChildren(...rows.flatMap(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    return [dt, dd];
  }));

  resultsEl.hidden = false;
});

// ------------------------------------------------------------- controls
//
// Built from whatever the game declares in meta.params, exactly like the lab
// panel does it, so adding a knob to a game makes a control appear here with
// no changes to this file. The schema's types are narrower than the lab's
// scenes use (number, select, boolean rather than range/color/toggle), so the
// mapping below is simpler.

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

// --------------------------------------------------------------- start up

const requested = location.hash.slice(1);
select(GAME_NAMES.includes(requested) ? requested : GAME_NAMES[0]);
