import{h as pe}from"./glsl.js";import{S as ge,f as we,P as xe,p as ye,c as _,C as s,M as v,q as p,r as K,A as Q,k as be,s as Me,t as Se,B as Ge,j as X,b as Ce,V as ne,d as Te}from"./three.module.js";const Y=263434,Pe=15659512,h=16757844,$=8368383,_e=6055032,ae=.52,se=.39,c=.9,Ee=.34,Ae=-6,m=.44,ie=50,J=1.4,ee=1.6,Le={id:"cabinet",title:"Cabinet",tags:["three","glsl","scene"],blurb:"The arcade intro: a dark room, one glowing cabinet, and a camera that walks up to the screen until the screen is the whole page. The attract-mode dots keep pacing their grid whether or not anyone is watching.",stats:{triangles:"44","draw calls":"8"},params:{zoom:{label:"Zoom",type:"range",min:0,max:1,step:.01,value:0},sway:{label:"Camera sway",type:"range",min:0,max:1,step:.01,value:.35},glow:{label:"Glow",type:"range",min:0,max:2,step:.01,value:1},scan:{label:"Scanlines",type:"range",min:0,max:1,step:.01,value:.5},dust:{label:"Dust motes",type:"range",min:0,max:1,step:.01,value:.6,structural:!0}}},ke=`
  varying vec2 vGround; // world-space XZ, so the fragment shader knows real distances

  void main(){
    vGround = (modelMatrix * vec4(position, 1.0)).xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,Re=`
  precision highp float;

  uniform vec3  uGround;
  uniform vec3  uGlowColor;
  uniform float uGlow;
  uniform float uTime;
  varying vec2  vGround;

  void main(){
    float d = length(vGround);

    // The cabinet faces +Z, so "in front of it" is the positive side. Bias
    // the glow that way instead of spreading it evenly in a circle.
    float forward = smoothstep(-2.0, 3.0, vGround.y);
    float pulse = 0.92 + 0.08 * sin(uTime * 0.6);
    float glow = (1.0 - smoothstep(0.6, 3.5, d)) * mix(0.06, 0.28, forward) * pulse;

    // Faint carpet grid, thin lines every half metre, fading before the edge
    // of the plane so there is no visible seam against the clear colour.
    vec2 g = abs(fract(vGround * 2.0) - 0.5);
    float line = max(1.0 - smoothstep(0.02, 0.05, g.x), 1.0 - smoothstep(0.02, 0.05, g.y));
    line *= 1.0 - smoothstep(2.0, 12.0, d);

    vec3 col = uGround + uGlowColor * glow * uGlow + vec3(0.5, 0.55, 0.65) * line * 0.04;
    gl_FragColor = vec4(col, 1.0);
  }
`,Fe=`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,Ue=`
  precision highp float;

  uniform float uTime;
  uniform float uScan;
  uniform float uGlow;
  uniform vec3  uAmber;
  uniform vec3  uBlue;
  varying vec2  vUv;

  ${pe}

  // Cheap barrel distortion. Cheaper than it looks: one dot product.
  vec2 curveUv(vec2 uv){
    vec2 c = uv * 2.0 - 1.0;
    c *= 1.0 + 0.12 * dot(c, c);
    return c * 0.5 + 0.5;
  }

  void main(){
    vec2 uv = curveUv(vUv);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Three by three dot grid -- the cabinet's mark. One dot walks the grid
    // roughly once a second so the screen never looks paused.
    vec2 cell = floor(uv * 3.0);
    vec2 local = fract(uv * 3.0) - 0.5;
    float dotShape = 1.0 - smoothstep(0.16, 0.30, length(local));

    float index = cell.y * 3.0 + cell.x;
    float activeIndex = mod(floor(uTime * 1.1), 9.0);
    float lit = 1.0 - step(0.5, abs(index - activeIndex));
    float pulse = 0.75 + 0.25 * sin(uTime * 6.0);

    vec3 dim = vec3(0.14, 0.17, 0.24);
    vec3 litColor = uAmber * (1.0 + 0.4 * pulse);
    vec3 col = vec3(0.01, 0.015, 0.02) + dotShape * mix(dim, litColor, lit);

    // Scanlines, tinted faintly blue in the gaps between them.
    float scanline = 0.5 + 0.5 * sin(uv.y * 260.0);
    col *= mix(1.0, 0.82 + 0.18 * scanline, uScan);
    col += uBlue * (1.0 - scanline) * 0.025 * uScan;

    // Phosphor flicker plus a little animated grain so the tube never looks
    // like a static texture.
    float flicker = 0.97 + 0.02 * sin(uTime * 33.0) + 0.01 * hash11(floor(uTime * 14.0));
    float grain = hash11(dot(uv * 512.0, vec2(12.9898, 78.233)) + uTime * 47.0) - 0.5;
    col *= flicker;
    col += grain * 0.03;

    // Vignette to sell the curved glass.
    vec2 vc = vUv * 2.0 - 1.0;
    float vig = 1.0 - smoothstep(0.55, 1.05, dot(vc, vc));
    col *= mix(0.55, 1.0, vig);

    vec3 base = vec3(0.01, 0.015, 0.02);
    col = base + (col - base) * uGlow;

    gl_FragColor = vec4(col, 1.0);
  }
`,Be=`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,Ve=`
  precision highp float;
  uniform vec3  uColor;
  uniform float uGlow;
  varying vec2  vUv;
  void main(){
    vec2 c = vUv * 2.0 - 1.0;
    float r = length(c);
    // A ring rather than a filled disc: it stays dark over whatever bright
    // thing this plane sits in front of (the screen's own content, the
    // marquee's own emissive face) and only shows as light bleeding onto the
    // surface just past it.
    float ring = smoothstep(0.55, 0.75, r) * (1.0 - smoothstep(0.85, 1.05, r)) * 0.55;
    gl_FragColor = vec4(uColor * ring, ring * uGlow);
  }
`,ze=`
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;

  void main(){
    vec3 p = position;
    p.y += sin(uTime * 0.15 + aSeed * 6.2831) * 0.08;
    p.x += sin(uTime * 0.09 + aSeed * 4.0) * 0.05;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(48.0, (1.6 + aSeed * 1.4) * uPixelRatio / max(-mv.z, 0.05));
  }
`,Ie=`
  precision highp float;
  uniform vec3 uColor;
  void main(){
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q) * 2.0;
    if (r > 1.0) discard;
    float a = 1.0 - smoothstep(0.0, 1.0, r);
    gl_FragColor = vec4(uColor, a * a * 0.5);
  }
`;function oe(i,r){const u=i/r,t=Math.tan(p.degToRad(ie/2)),e=se/(2*t),n=ae/(2*t*u);return Math.max(.12,Math.min(e,n))}function te(i){const r=new Float32Array(i*3),u=new Float32Array(i);for(let e=0;e<i;e++)r[e*3+0]=(Math.random()-.5)*.8,r[e*3+1]=c-.32+Math.random()*.67,r[e*3+2]=m+.15+Math.random()*1.25,u[e]=Math.random();const t=new Ge;return t.setAttribute("position",new X(r,3)),t.setAttribute("aSeed",new X(u,1)),t.boundingSphere=new Ce(new ne(0,c,m+.7),2),t}function je({renderer:i,width:r,height:u,params:t={}}){const e=new ge,n=new we(ie,r/u,.05,30);let L=t.zoom??0,E=t.sway??.35,a=t.glow??1,A=t.scan??.5,j=t.dust??.6,D=oe(r,u);const g=new xe(1,1),y=new ye(1,1,1),b=new _({vertexShader:ke,fragmentShader:Re,uniforms:{uGround:{value:new s(Y)},uGlowColor:{value:new s(h).lerp(new s($),.15)},uGlow:{value:a},uTime:{value:0}}}),k=new v(g,b);k.rotation.x=-Math.PI/2,k.scale.set(26,26,1),e.add(k);function Z(o,l){return new K({color:o,roughness:l+(Math.random()-.5)*.08,metalness:.08})}const O=Z(724244,.75),R=new v(y,O);R.scale.set(.74,1.3,.62),R.position.set(0,.65,0),e.add(R);const W=Z(658450,.7),M=new v(y,W);M.scale.set(.64,.56,.1),M.position.set(0,c,Ee),M.rotation.x=p.degToRad(Ae),e.add(M);const F=new K({color:1707782,roughness:.6,metalness:.05,emissive:new s(h),emissiveIntensity:J*a}),U=new v(y,F);U.scale.set(.68,.22,.14),U.position.set(0,1.41,.32),e.add(U);const w=new _({vertexShader:Fe,fragmentShader:Ue,uniforms:{uTime:{value:0},uScan:{value:A},uGlow:{value:a},uAmber:{value:new s(h)},uBlue:{value:new s($)}}}),B=new v(g,w);B.scale.set(ae,se,1),B.position.set(0,c,m),e.add(B);const S=new _({vertexShader:Be,fragmentShader:Ve,transparent:!0,depthWrite:!1,blending:Q,uniforms:{uColor:{value:new s(h)},uGlow:{value:a}}}),V=new v(g,S);V.scale.set(.8,.6,1),V.position.set(0,c,m-.01),e.add(V);const z=new v(g,S);z.scale.set(.9,.34,1),z.position.set(0,1.41,.4),e.add(z);let G=Math.round(j*500),x=te(G);const C=new _({vertexShader:ze,fragmentShader:Ie,transparent:!0,depthWrite:!1,blending:Q,uniforms:{uTime:{value:0},uPixelRatio:{value:i.getPixelRatio()},uColor:{value:new s(h).lerp(new s(Pe),.5)}}});let H=new be(x,C);e.add(H);const re=new Me(_e,.6);e.add(re);const I=new Se(h,ee*a,4,2);I.position.set(0,c,m+.15),e.add(I);const N=new ne(0,.35,3.1),f=new Te(0,0),le=new s(Y);function ce(o,l,d){b.uniforms.uTime.value=o,w.uniforms.uTime.value=o,C.uniforms.uTime.value=o;const T=p.clamp(L,0,1),q=1-Math.pow(1-T,3),me=m+D;n.position.set(p.lerp(N.x,0,q),p.lerp(N.y,c,q),p.lerp(N.z,me,q));const P=1-T;n.position.x+=Math.sin(o*.35)*.1*E*P,n.position.y+=Math.cos(o*.27)*.045*E*P;const fe=d.active?d.x:0,he=d.active?d.y:0;f.x+=(fe-f.x)*.05,f.y+=(he-f.y)*.05,n.position.x+=f.x*.14*P,n.position.y+=f.y*.07*P,n.lookAt(0,c,m),i.render(e,n)}function ue(o,l){n.aspect=o/l,n.updateProjectionMatrix(),D=oe(o,l),C.uniforms.uPixelRatio.value=i.getPixelRatio()}function de(){g.dispose(),y.dispose(),b.dispose(),O.dispose(),W.dispose(),F.dispose(),w.dispose(),S.dispose(),x.dispose(),C.dispose()}function ve(o){o.zoom!==void 0&&(L=o.zoom),o.sway!==void 0&&(E=o.sway),o.scan!==void 0&&(A=o.scan,w.uniforms.uScan.value=A),o.glow!==void 0&&(a=o.glow,w.uniforms.uGlow.value=a,S.uniforms.uGlow.value=a,b.uniforms.uGlow.value=a,F.emissiveIntensity=J*a,I.intensity=ee*a);const l=Number(o.dust);if(Number.isFinite(l)){const d=Math.round(l*500);if(d!==G){j=l,G=d;const T=x;x=te(G),H.geometry=x,T.dispose()}}}return{render:ce,resize:ue,dispose:de,setParams:ve,background:le}}export{je as create,Le as meta};
