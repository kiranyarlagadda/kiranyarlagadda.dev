// Project card backdrops.
//
// One WebGL canvas sits behind the whole grid and draws every card in a single
// instanced call. A canvas per card would be simpler to reason about, but
// browsers cap live WebGL contexts at roughly sixteen and start evicting the
// oldest, so that approach breaks the moment the grid outgrows one screen.
//
// The DOM is the source of truth. Cards are real <article> elements with real
// text and real links; this file reads their geometry and paints behind them.
// If WebGL is unavailable, or the visitor prefers reduced motion, nothing here
// runs and the CSS gradient fallback stands in.

// Named imports rather than `import * as THREE`: this page needs a dozen classes
// out of the library, and namespace imports keep the bundler from shaking the
// rest of it out.
import {
  DoubleSide,
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  PlaneGeometry,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  ShaderMaterial,
  Mesh,
  Vector2,
  Vector3,
  Sphere,
  DynamicDrawUsage,
} from 'three';

const CARD_SELECTOR = '[data-card]';
const RADIUS = 16; // must track --card-radius in projects.css

const vertexShader = /* glsl */ `
  precision highp float;

  attribute vec4  aRect;   // x, y, width, height in CSS pixels (document space)
  attribute float aHue;
  attribute float aSeed;
  attribute float aHover;

  varying vec2  vUv;
  varying vec2  vSize;
  varying vec2  vOrigin;
  varying float vHue;
  varying float vSeed;
  varying float vHover;

  void main(){
    // Plane spans -0.5..0.5, so scaling by the rect size and offsetting by its
    // centre lands the quad exactly on the card's box.
    vec2 centre = aRect.xy + aRect.zw * 0.5;
    vec2 dom = centre + position.xy * aRect.zw;

    // Flip V: world Y grows upward, DOM Y grows downward.
    vUv = vec2(uv.x, 1.0 - uv.y);
    vSize = aRect.zw;
    vOrigin = aRect.xy;
    vHue = aHue;
    vSeed = aSeed;
    vHover = aHover;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(dom.x, -dom.y, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uPointer;   // viewport-space pointer, CSS pixels
  uniform float uRadius;
  uniform float uDark;

  varying vec2  vUv;
  varying vec2  vSize;
  varying vec2  vOrigin;
  varying float vHue;
  varying float vSeed;
  varying float vHover;

  // -- value noise ----------------------------------------------------------
  vec2 hash2(vec2 p){
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
  }

  float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y);
  }

  float fbm(vec2 p){
    float sum = 0.0, amp = 0.5;
    for (int i = 0; i < 5; i++){
      sum += amp * noise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return sum;
  }

  // Signed distance to a rounded box, so the shader honours the same corner
  // radius the CSS uses instead of painting a hard rectangle behind it.
  float roundedBox(vec2 p, vec2 halfSize, float r){
    vec2 q = abs(p) - halfSize + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // A cosine palette drifts out of the violet family as the phase offsets move,
  // which produced warm browns. This ramps between three fixed violets instead,
  // so data-hue can only shift the blue/magenta balance -- never the family.
  vec3 hueColor(float h, float t){
    vec3 deep = vec3(0.13, 0.09, 0.26);
    vec3 mid  = vec3(0.38, 0.24, 0.66);
    vec3 hot  = vec3(0.62, 0.46, 0.96);

    vec3 col = mix(deep, mid, smoothstep(0.0, 0.58, t));
    col = mix(col, hot, smoothstep(0.58, 1.0, t));

    col.r *= mix(0.82, 1.18, h);
    col.b *= mix(1.14, 0.90, h);
    return col;
  }

  void main(){
    vec2 px = (vUv - 0.5) * vSize;
    float d = roundedBox(px, vSize * 0.5, uRadius);

    // Antialiased mask, one pixel of feather.
    float mask = 1.0 - smoothstep(-1.0, 1.0, d);
    if (mask <= 0.001) discard;

    // Flow field, scaled so the pattern is the same physical size on every card
    // regardless of its aspect ratio.
    vec2 q = px / 240.0;
    float t = uTime * 0.06 + vSeed * 10.0;

    float warp = fbm(q * 1.6 + vec2(t, -t * 0.7));
    float field = fbm(q * 2.4 + warp * 1.4 + vec2(-t * 0.5, t * 0.3));

    float band = field * 0.5 + 0.5;

    vec3 col = hueColor(vHue, band + vSeed * 0.2);

    // Pointer glow, in the card's own coordinate space.
    vec2 localPointer = uPointer - vOrigin;
    float pd = distance(localPointer, vUv * vSize) / max(vSize.x, vSize.y);
    float glow = exp(-pd * pd * 9.0) * vHover;

    col += vec3(0.55, 0.42, 0.85) * glow * 0.30;

    // Edge light: brighten just inside the border so the card reads as a solid
    // object rather than a gradient blob.
    float edge = (1.0 - smoothstep(-2.5, 0.0, d)) * smoothstep(-14.0, -2.5, d);
    col += vec3(0.62, 0.52, 0.95) * edge * (0.18 + vHover * 0.45);

    float intensity = mix(0.50, 0.66, vHover);
    // Dark grounds need less light to read; light grounds need more presence.
    intensity *= mix(1.25, 1.0, uDark);

    gl_FragColor = vec4(col * intensity, mask * mix(0.82, 1.0, vHover));
  }
`;

export function mountCardField() {
  const canvas = document.getElementById('cards-gl');
  const cards = [...document.querySelectorAll(CARD_SELECTOR)];
  if (!canvas || cards.length === 0) return null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
  } catch {
    return null; // no WebGL: the CSS fallback already looks fine
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);

  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 0, -1, -100, 100);

  const count = cards.length;
  const base = new PlaneGeometry(1, 1);
  const geometry = new InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.attributes.position = base.attributes.position;
  geometry.attributes.uv = base.attributes.uv;
  geometry.instanceCount = count;

  const rects = new Float32Array(count * 4);
  const hues = new Float32Array(count);
  const seeds = new Float32Array(count);
  const hovers = new Float32Array(count);

  cards.forEach((card, i) => {
    hues[i] = Number.parseFloat(card.dataset.hue ?? '0') || 0;
    seeds[i] = i * 0.37;
  });

  const rectAttr = new InstancedBufferAttribute(rects, 4);
  const hoverAttr = new InstancedBufferAttribute(hovers, 1);
  rectAttr.setUsage(DynamicDrawUsage);
  hoverAttr.setUsage(DynamicDrawUsage);

  geometry.setAttribute('aRect', rectAttr);
  geometry.setAttribute('aHue', new InstancedBufferAttribute(hues, 1));
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute('aHover', hoverAttr);
  geometry.boundingSphere = new Sphere(new Vector3(), 1e6);

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new Vector2(-9999, -9999) },
      uRadius: { value: RADIUS },
      uDark: { value: 0 },
    },
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Document-space layout, cached. Reading getBoundingClientRect every frame
  // would force a synchronous layout on every scroll tick; instead the layout is
  // captured on resize and only the scroll offset changes per frame.
  const layout = cards.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const targetHover = new Float32Array(count);

  function captureLayout() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      layout[i].x = r.left + scrollX;
      layout[i].y = r.top + scrollY;
      layout[i].w = r.width;
      layout[i].h = r.height;
    });
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.left = 0;
    camera.right = w;
    camera.top = 0;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
    captureLayout();
  }

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const applyScheme = () => { material.uniforms.uDark.value = darkQuery.matches ? 1 : 0; };
  applyScheme();
  darkQuery.addEventListener('change', applyScheme);

  cards.forEach((card, i) => {
    card.addEventListener('pointerenter', () => { targetHover[i] = 1; });
    card.addEventListener('pointerleave', () => { targetHover[i] = 0; });
    card.addEventListener('focusin', () => { targetHover[i] = 1; });
    card.addEventListener('focusout', () => { targetHover[i] = 0; });
  });

  window.addEventListener('pointermove', (e) => {
    material.uniforms.uPointer.value.set(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('resize', resize);
  window.addEventListener('load', captureLayout);
  const ro = new ResizeObserver(captureLayout);
  cards.forEach((card) => ro.observe(card));

  resize();

  const start = performance.now();
  let raf = null;

  function draw() {
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    for (let i = 0; i < count; i++) {
      rects[i * 4 + 0] = layout[i].x - scrollX;
      rects[i * 4 + 1] = layout[i].y - scrollY;
      rects[i * 4 + 2] = layout[i].w;
      rects[i * 4 + 3] = layout[i].h;
      hovers[i] += (targetHover[i] - hovers[i]) * 0.12;
    }
    rectAttr.needsUpdate = true;
    hoverAttr.needsUpdate = true;

    material.uniforms.uTime.value = (performance.now() - start) / 1000;
    renderer.render(scene, camera);
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    draw();
  }

  if (reduceMotion) {
    // Still paint the cards, just hold them still.
    draw();
    window.addEventListener('scroll', draw, { passive: true });
    window.addEventListener('resize', draw);
  } else {
    loop();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = null;
      } else if (raf === null) {
        loop();
      }
    });
  }

  document.documentElement.classList.add('gl-ready');

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      geometry.dispose();
      base.dispose();
      material.dispose();
      renderer.dispose();
      document.documentElement.classList.remove('gl-ready');
    },
  };
}

mountCardField();
