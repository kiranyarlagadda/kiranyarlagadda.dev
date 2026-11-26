# kiranyarlagadda.dev

Source for [kiranyarlagadda.dev](https://kiranyarlagadda.dev): a small personal
site with a homepage, project list, an interactive WebGL gallery, and an arcade
of browser games. Most pages are plain HTML and CSS; Vite only builds the
WebGL pieces and the arcade bundle.

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
| `/arcade/` | `arcade/index.html` |

The production server does not run a build. `assets/*.js` is committed output,
so changes under `src/`, to Element Lab, or to the arcade package must be rebuilt
and committed.

## Element Lab dependency

[Element Lab](https://github.com/kiranyarlagadda/element-lab) is a separate
project. This repository provides the `/lab/` gallery shell and project-card
backdrops, while the scenes and `<lab-scene>` component come from that package.

The dependency must remain pinned to an explicit release tag in both
`package.json` and `package-lock.json`. The current site version is `v0.4.0`.
Do not point the site at `main` or another floating reference.

To publish a new Element Lab version on the site:

1. Tag the release in the Element Lab repository.
2. Run `npm install github:kiranyarlagadda/element-lab#vX.Y.Z` here.
3. Confirm both package files name the same tag.
4. Run `npm run build` and test `/projects.html` and `/lab/`.
5. Commit the package files and regenerated `assets/*.js` together.

Scene implementation, shader checks, and the component API belong in the
[Element Lab README](https://github.com/kiranyarlagadda/element-lab#readme).

## Arcade dependency

[Arcade](https://github.com/kiranyarlagadda/arcade) is the same arrangement:
this repository holds the `/arcade/` shell, and every game plus the
`<arcade-game>` element comes from that package, pinned to a release tag in
both package files. The current site version is `v0.3.0`.

To publish a new arcade version on the site:

1. Tag the release in the arcade repository.
2. Run `npm install github:kiranyarlagadda/arcade#vX.Y.Z` here.
3. Confirm both package files name the same tag.
4. Run `npm run build` and test `/arcade/` and `/projects.html`.
5. Commit the package files and regenerated `assets/*.js` together.

The shell builds its tab bar from the package's `GAME_NAMES` export and its
controls from what each game reports, so a new game needs no change here.

## Adding a project to /projects.html

Copy one `<li>` block in `projects.html` and edit the text. `data-hue` (0–1)
shifts that card's backdrop colour. Nothing else needs changing, because the
JavaScript finds cards by their `data-card` attribute.

Repository links in project cards should open in a new tab with
`target="_blank" rel="noopener noreferrer"`.

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

## Deploying

Push to `main`. A timer on the VPS notices the new commit within a minute,
syncs the files, and pings the `ops-alerts` ntfy topic. There is no build step
on the server. Whatever is committed is what gets served.
