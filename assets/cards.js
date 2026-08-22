import{W as U,S as q,O,P as T,I as Y,a as w,D,b as B,V as I,c as V,d as X,e as j,M as W}from"./three.module.js";const G="[data-card]",_=16,N=`
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
`,Q=`
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
`;function J(){const A=document.getElementById("cards-gl"),r=[...document.querySelectorAll(G)];if(!A||r.length===0)return null;const k=window.matchMedia("(prefers-reduced-motion: reduce)").matches;let i;try{i=new U({canvas:A,alpha:!0,antialias:!1})}catch{return null}if(!i.getContext())return null;i.setPixelRatio(Math.min(window.devicePixelRatio,2)),i.setClearAlpha(0);const E=new q,c=new O(0,1,0,-1,-100,100),s=r.length,f=new T(1,1),a=new Y;a.index=f.index,a.attributes.position=f.attributes.position,a.attributes.uv=f.attributes.uv,a.instanceCount=s;const l=new Float32Array(s*4),z=new Float32Array(s),H=new Float32Array(s),g=new Float32Array(s);r.forEach((e,t)=>{z[t]=Number.parseFloat(e.dataset.hue??"0")||0,H[t]=t*.37});const y=new w(l,4),x=new w(g,1);y.setUsage(D),x.setUsage(D),a.setAttribute("aRect",y),a.setAttribute("aHue",new w(z,1)),a.setAttribute("aSeed",new w(H,1)),a.setAttribute("aHover",x),a.boundingSphere=new B(new I,1e6);const v=new V({vertexShader:N,fragmentShader:Q,transparent:!0,side:j,depthTest:!1,depthWrite:!1,uniforms:{uTime:{value:0},uPointer:{value:new X(-9999,-9999)},uRadius:{value:_},uDark:{value:0}}}),R=new W(a,v);R.frustumCulled=!1,E.add(R);const n=r.map(()=>({x:0,y:0,w:0,h:0})),u=new Float32Array(s);function b(){const e=window.scrollX,t=window.scrollY;r.forEach((o,m)=>{const p=o.getBoundingClientRect();n[m].x=p.left+e,n[m].y=p.top+t,n[m].w=p.width,n[m].h=p.height})}function L(){const e=window.innerWidth,t=window.innerHeight;i.setSize(e,t,!1),c.left=0,c.right=e,c.top=0,c.bottom=-t,c.updateProjectionMatrix(),b()}const C=window.matchMedia("(prefers-color-scheme: dark)"),P=()=>{v.uniforms.uDark.value=C.matches?1:0};P(),C.addEventListener("change",P),r.forEach((e,t)=>{e.addEventListener("pointerenter",()=>{u[t]=1}),e.addEventListener("pointerleave",()=>{u[t]=0}),e.addEventListener("focusin",()=>{u[t]=1}),e.addEventListener("focusout",()=>{u[t]=0})}),window.addEventListener("pointermove",e=>{v.uniforms.uPointer.value.set(e.clientX,e.clientY)},{passive:!0}),window.addEventListener("resize",L),window.addEventListener("load",b);const F=new ResizeObserver(b);r.forEach(e=>F.observe(e)),L();const M=performance.now();let d=null;function h(){const e=window.scrollY,t=window.scrollX;for(let o=0;o<s;o++)l[o*4+0]=n[o].x-t,l[o*4+1]=n[o].y-e,l[o*4+2]=n[o].w,l[o*4+3]=n[o].h,g[o]+=(u[o]-g[o])*.12;y.needsUpdate=!0,x.needsUpdate=!0,v.uniforms.uTime.value=(performance.now()-M)/1e3,i.render(E,c)}function S(){d=requestAnimationFrame(S),h()}return k?(h(),window.addEventListener("scroll",h,{passive:!0}),window.addEventListener("resize",h)):(S(),document.addEventListener("visibilitychange",()=>{document.hidden?(cancelAnimationFrame(d),d=null):d===null&&S()})),document.documentElement.classList.add("gl-ready"),{destroy(){d&&cancelAnimationFrame(d),F.disconnect(),a.dispose(),f.dispose(),v.dispose(),i.dispose(),document.documentElement.classList.remove("gl-ready")}}}J();
