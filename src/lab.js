// Entry point for the Element Lab gallery page (/lab/).
//
// This file is deliberately thin. All the WebGL work lives in the <lab-scene>
// element and the scene modules; the gallery is just a tab bar that swaps the
// element's `name` attribute and prints whatever metadata comes back.
//
// It doubles as the reference example: if you want a scene on some other page,
// this is all it takes.

// The scenes and the <lab-scene> element live in their own repo:
// https://github.com/kiranyarlagadda/element-lab
// Importing the package registers the custom element.
import { SCENE_NAMES } from 'element-lab';

const stage = document.querySelector('lab-scene');
const tabsEl = document.getElementById('tabs');
const titleEl = document.getElementById('title');
const blurbEl = document.getElementById('blurb');
const tagsEl = document.getElementById('tags');
const statsEl = document.getElementById('stats');
const controlsEl = document.getElementById('controls');
const snippetEl = document.getElementById('snippet');
const perfEl = document.getElementById('perf');

// ---------------------------------------------------------------- tab bar

SCENE_NAMES.forEach((name) => {
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
  // Drop the outgoing scene's params so one scene's knobs never leak onto the
  // next, which shares attribute names like `speed` and `size`.
  if (stage.paramSchema) {
    for (const key of Object.keys(stage.paramSchema)) stage.removeAttribute(key);
  }
  stage.setAttribute('name', name);
  history.replaceState(null, '', `#${name}`);
  markActiveTab(name);
}

// The element announces its own metadata once a scene is built, so the gallery
// never needs to import the scene modules itself.
stage.addEventListener('scene-ready', (event) => {
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

  statsEl.replaceChildren(...Object.entries(meta.stats ?? {}).flatMap(([key, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = key;
    const dd = document.createElement('dd');
    dd.textContent = value;
    return [dt, dd];
  }));
});

// Back/forward and pasted #hash links both land on the right scene.
addEventListener('hashchange', () => {
  const name = location.hash.slice(1);
  if (SCENE_NAMES.includes(name) && name !== stage.getAttribute('name')) select(name);
});

// ------------------------------------------------------------- controls
//
// Built from whatever the scene declares in meta.params, so adding a knob to a
// scene makes a control appear here with no changes to this file.

function buildControls(schema) {
  const entries = Object.entries(schema ?? {});
  controlsEl.hidden = entries.length === 0;
  if (entries.length === 0) {
    controlsEl.replaceChildren();
    updateSnippet();
    return;
  }

  controlsEl.replaceChildren(...entries.map(([key, spec]) => {
    const row = document.createElement('label');
    row.className = 'control';

    const name = document.createElement('span');
    name.className = 'control-label';
    name.textContent = spec.label ?? key;

    const readout = document.createElement('output');
    readout.className = 'control-value';

    const input = document.createElement('input');
    input.dataset.key = key;

    if (spec.type === 'color') {
      input.type = 'color';
      input.value = stage.getAttribute(key) ?? spec.value;
      readout.textContent = input.value;
    } else if (spec.type === 'toggle') {
      input.type = 'checkbox';
      input.checked = (stage.getAttribute(key) ?? String(spec.value)) !== 'false';
      readout.textContent = input.checked ? 'on' : 'off';
    } else {
      input.type = 'range';
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step ?? 0.01;
      input.value = stage.getAttribute(key) ?? spec.value;
      readout.textContent = input.value;
    }

    input.addEventListener('input', () => {
      const value = spec.type === 'toggle' ? String(input.checked) : input.value;
      readout.textContent = spec.type === 'toggle' ? (input.checked ? 'on' : 'off') : value;
      // Setting the attribute is what drives the scene: the element watches
      // its own attributes and forwards changes through setParams().
      stage.setAttribute(key, value);
      updateSnippet();
    });

    row.append(name, input, readout);
    return row;
  }));

  updateSnippet();
}

/** The tag that reproduces exactly what is on screen. */
function updateSnippet() {
  const name = stage.getAttribute('name');
  const schema = stage.paramSchema ?? {};
  const parts = [`name="${name}"`];

  for (const [key, spec] of Object.entries(schema)) {
    const set = stage.getAttribute(key);
    // Only include values the visitor actually changed.
    if (set !== null && set !== String(spec.value)) parts.push(`${key}="${set}"`);
  }

  snippetEl.textContent = `<lab-scene ${parts.join(' ')}></lab-scene>`;
}

function resetParams() {
  const schema = stage.paramSchema ?? {};
  for (const key of Object.keys(schema)) stage.removeAttribute(key);
  buildControls(schema);
}

document.getElementById('reset').addEventListener('click', resetParams);

document.getElementById('copy').addEventListener('click', async (e) => {
  try {
    await navigator.clipboard.writeText(snippetEl.textContent);
    e.target.textContent = 'copied';
    setTimeout(() => { e.target.textContent = 'copy'; }, 1400);
  } catch {
    // Clipboard can be blocked; select the text so it can be copied by hand.
    const range = document.createRange();
    range.selectNodeContents(snippetEl);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }
});

addEventListener('keydown', (e) => {
  const i = SCENE_NAMES.indexOf(stage.getAttribute('name'));
  if (e.key === 'ArrowRight') select(SCENE_NAMES[(i + 1) % SCENE_NAMES.length]);
  if (e.key === 'ArrowLeft') select(SCENE_NAMES[(i - 1 + SCENE_NAMES.length) % SCENE_NAMES.length]);
});

// ------------------------------------------------------------------- fps

let frames = 0;
let mark = performance.now();
(function sample() {
  requestAnimationFrame(sample);
  frames++;
  const now = performance.now();
  if (now - mark >= 500) {
    perfEl.textContent = `${Math.round((frames * 1000) / (now - mark))} fps`;
    frames = 0;
    mark = now;
  }
})();

// --------------------------------------------------------------- start up

const requested = location.hash.slice(1);
select(SCENE_NAMES.includes(requested) ? requested : SCENE_NAMES[0]);
