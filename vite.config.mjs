import { defineConfig } from 'vite';

// The VPS deploy is a plain file sync with no build step, so bundles are built
// locally and committed to assets/. Everything else here stays hand-written
// HTML and CSS.
//
// Three entry points:
//   assets/cards.js  -> the project-card backdrop on /projects.html
//   assets/lab.js    -> the <lab-scene> gallery on /lab/
//   assets/arcade.js -> the <arcade-game> tab bar on /arcade/, which also
//                        pulls in element-lab for its lattice backdrop
//
// Three.js is shared across all of them as a common chunk, so visiting any
// combination of these pages downloads it once. Scenes are split out
// individually and fetched only when one is actually shown.
//
// Note the output paths: outDir is the repo root and the 'assets/' prefix lives
// in the filename patterns, rather than outDir being 'assets' with bare names.
// That is deliberate. Vite builds module-preload URLs from `base` + chunk
// filename, so bare names under the default base made it request /orrery.js
// (404) alongside the real /assets/orrery.js. Moving the prefix into the
// filename fixes the generated URLs without touching `base`, which cannot be
// changed here because it also relocates the dev server's root and 404s /lab/.
export default defineConfig({
  // assets/ holds build output with stable (unhashed) filenames, so the dev
  // server will happily serve a stale copy after `npm run build`. Tell it not
  // to cache, otherwise every rebuild needs a server restart to show up.
  server: {
    headers: { 'Cache-Control': 'no-store' },
  },
  // The arcade's engine runs in a module worker that imports games lazily, so
  // its bundle must be ES format (the classic default cannot hold a dynamic
  // import). Worker chunks get their own prefix so a chunk the worker shares
  // by name with the page (rules.js, say) cannot overwrite the page's copy.
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/engine-[name].js',
        chunkFileNames: 'assets/engine-[name].js',
        // Every game's adapter is called adapter.js, so name the worker's
        // per-game chunks after the game instead of letting Rollup number
        // them (engine-adapter.js, engine-adapter2.js).
        manualChunks(id) {
          const match = id.match(/\/games\/([^/]+)\//);
          return match ? match[1] : undefined;
        },
      },
    },
  },
  build: {
    outDir: '.',
    // MUST stay false: outDir is the repo root, and emptying it would delete
    // the site.
    emptyOutDir: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      input: {
        cards: 'src/cards.js',
        lab: 'src/lab.js',
        arcade: 'src/arcade.js',
      },
      output: {
        format: 'es',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
      },
    },
  },
});
