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

function select(name) {
  stage.setAttribute('name', name);
  history.replaceState(null, '', `#${name}`);
  [...tabsEl.children].forEach((b) => {
    b.classList.toggle('is-active', b.textContent === name);
    b.setAttribute('aria-pressed', String(b.textContent === name));
  });
}

// The element announces its own metadata once a scene is built, so the gallery
// never needs to import the scene modules itself.
stage.addEventListener('scene-ready', (event) => {
  const { meta } = event.detail;
  if (!meta) return;

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
