# kiranyarlagadda.dev

<<<<<<< HEAD
Source for [kiranyarlagadda.dev](https://kiranyarlagadda.dev): a small personal
site with a homepage, project list, and an interactive WebGL gallery. Most pages
are hand-written HTML and CSS; Vite only builds the WebGL pieces.

## Local development

```bash
npm install
npm run dev      # http://localhost:5179
npm run build    # rebuilds the committed files in assets/
```

There is no framework and no router. Pages are plain `.html` files:

| URL | File |
|---|---|
| `/` | `index.html` |
| `/projects.html` | `projects.html` |
| `/lab/` | `lab/index.html` |

The production server does not run a build. `assets/*.js` is committed output,
so changes under `src/` or changes to Element Lab must be rebuilt and committed.

## Element Lab dependency

[Element Lab](https://github.com/kiranyarlagadda/element-lab) is a separate
project. This repository provides the `/lab/` gallery shell and project-card
backdrops, while the scenes and `<lab-scene>` component come from that package.

The dependency must remain pinned to an explicit release tag in both
`package.json` and `package-lock.json`. The current site version is `v0.3.1`.
Do not point the site at `main` or another floating reference.

To publish a new Element Lab version on the site:

1. Tag the release in the Element Lab repository.
2. Run `npm install github:kiranyarlagadda/element-lab#vX.Y.Z` here.
3. Confirm both package files name the same tag.
4. Run `npm run build` and test `/projects.html` and `/lab/`.
5. Commit the package files and regenerated `assets/*.js` together.

Scene implementation, shader checks, and the component API belong in the
[Element Lab README](https://github.com/kiranyarlagadda/element-lab#readme).

## Adding a project to /projects.html

Copy one `<li>` block in `projects.html` and edit the text. `data-hue` (0–1)
shifts that card's backdrop colour. Nothing else needs changing, because the
JavaScript finds cards by their `data-card` attribute.

Repository links in project cards should open in a new tab with
`target="_blank" rel="noopener noreferrer"`.
=======
Personal site. Hand-written HTML and CSS, plus three small bundles built with
Vite: two WebGL galleries and a canvas game arcade.
>>>>>>> 932dcb9 (Add /arcade/: the aim trainer behind one <arcade-game> tag)

## Favicons

Each page has its own icon on a shared dark tile: an orbit for the home and
projects pages, the lab dot for `/lab/`, the arcade's 3x3 mark for `/arcade/`.
Sources and fallbacks are generated:

```bash
python3 tools/favicons.py
```

It writes `favicon.svg`, `favicon.ico` (16 and 32 px) and `apple-touch-icon.png`
(180 px) per page using macOS `qlmanage` and `sips`, so there is nothing to
install. Edit the shapes in the script, rerun, commit the outputs.

<<<<<<< HEAD
=======
## Running it

```bash
npm install
npm run dev      # http://localhost:5179
```

There is no framework and no router. Pages are plain `.html` files:

| URL | File |
|---|---|
| `/` | `index.html` |
| `/projects.html` | `projects.html` |
| `/lab/` | `lab/index.html` |
| `/arcade/` | `arcade/index.html` |

## Building

```bash
npm run build
```

This writes `assets/*.js`. **Those files are committed on purpose.** The server
only syncs files and never runs a build, so if you change anything in `src/` you
must run `npm run build` and commit the result, or the live site will not
change.

```bash
npm run watch    # rebuild on every save while developing
```

Run `npm run watch` in one terminal and `npm run dev` in another. The dev server
sends `Cache-Control: no-store`, so a rebuild shows up on plain reload without
restarting anything.

Shader linting lives in the element-lab repo alongside the shaders.

## Layout

```
index.html          landing page, no JavaScript at all
projects.html       project list; each project is one <li> block
projects.css
lab/index.html      the Element Lab gallery (chrome only)
lab/lab.css
arcade/index.html   the arcade (chrome only)
arcade/arcade.css
src/
  cards.js          WebGL backdrop behind the project cards
  lab.js            gallery tab bar; imports the element from element-lab
  arcade.js         game tab bar; imports the element from arcade
assets/             BUILT OUTPUT, do not edit by hand
```

The WebGL scenes are **not in this repo**. They live in
[element-lab](https://github.com/kiranyarlagadda/element-lab) and are installed
as a dependency pinned to a tag. `/lab/` here is just branding and a tab bar
around `<lab-scene>`.

The games aren't in this repo either. They live in
[arcade](https://github.com/kiranyarlagadda/arcade), installed the same way.
`/arcade/` is branding and a tab bar around `<arcade-game>`, and it borrows the
lab's lattice scene for its backdrop.

## Adding a project to /projects.html

Copy one `<li>` block in `projects.html` and edit the text. `data-hue` (0–1)
shifts that card's backdrop colour. Nothing else needs changing, because the
JavaScript finds cards by their `data-card` attribute.

## Adding a scene to the lab

Scenes live in the [element-lab](https://github.com/kiranyarlagadda/element-lab)
repo, not here. Add it there, tag a release, then point this repo at the new tag:

```bash
npm install github:kiranyarlagadda/element-lab#v0.2.0
npm run build
```

The gallery picks up new scenes automatically. It builds its tab bar from the
package's `SCENE_NAMES` export, so there is nothing to edit in `src/lab.js`.

## Adding a game to the arcade

Games live in the [arcade](https://github.com/kiranyarlagadda/arcade) repo, not
here. Add it there, tag a release, then point this repo at the new tag:

```bash
npm install github:kiranyarlagadda/arcade#v0.2.0
npm run build
```

The arcade picks up new games automatically. It builds its tab bar from the
package's `GAME_NAMES` export and its controls from whatever the game reports
in `game-ready`, so there is nothing to edit in `src/arcade.js`.

## Using a scene on any page

```html
<script type="module" src="/assets/lab.js"></script>
<lab-scene name="gyroid" style="height: 60vh"></lab-scene>
```

The element creates nothing until it is near the viewport, then sizes itself,
runs the render loop, pauses when scrolled off screen, and cleans up when removed
from the DOM. Full API in the element-lab README.

## Things that will bite you

- **Y is flipped between DOM and WebGL.** DOM Y grows downward, world Y grows
  upward. Negating Y mirrors the geometry, which reverses triangle winding and
  makes everything back-facing, giving you a draw call that reports triangles but paints
  nothing. `src/cards.js` uses `side: DoubleSide` for exactly this reason.
- **Chunk filenames carry the `assets/` prefix on purpose.** Vite builds
  module-preload URLs from `base` + chunk filename. With `outDir: 'assets'` and
  bare names, every scene was fetched twice: `/orrery.js` (404) alongside the
  real `/assets/orrery.js`. Do not "simplify" this back, and do not fix it with
  `base` either: that relocates the dev server root and 404s `/lab/`.
- **`emptyOutDir` must stay `false`.** `outDir` is the repo root.
- **A zero-sized canvas makes camera aspect `NaN`** and silently blanks
  everything. `src/cards.js` clamps to a 1px minimum.
- **Don't use Vite's `build.lib` mode here.** It skips whitespace minification
  and tree-shakes poorly. It cost ~290 KB of dead Three.js.
- **Phones skip the card backdrop entirely.** It is a hover effect, and touch
  devices cannot hover, so `projects.html` gates the import behind
  `(hover: hover) and (pointer: fine)`.

>>>>>>> 932dcb9 (Add /arcade/: the aim trainer behind one <arcade-game> tag)
## Deploying

Push to `main`. A timer on the VPS notices the new commit within a minute,
syncs the files, and pings the `ops-alerts` ntfy topic. There is no build step
on the server. Whatever is committed is what gets served.
