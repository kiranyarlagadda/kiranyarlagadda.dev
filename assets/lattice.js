import{p as k,s as T,f as L}from"./glsl.js";import{S as H,i as B,P as F,I,a as y,b as V,V as i,c as $,A as j,M as G,C as U,d as W,m as _,n as q}from"./three.module.js";const Q={id:"lattice",title:"Lattice",tags:["instancing","one draw call","hero background"],blurb:"Eighteen thousand billboarded dots drawn in a single instanced call. Height, scale and colour all come out of one fbm field evaluated in the vertex shader, with a travelling swell that follows the pointer. This is the one that actually belongs behind a hero headline. It stays legible under text and costs a single draw call.",stats:{instances:"18,000","draw calls":"1","CPU per frame":"3 uniforms"},params:{amp:{label:"Swell height",type:"range",min:.1,max:4,step:.05,value:1.5},size:{label:"Dot size",type:"range",min:.04,max:.32,step:.005,value:.135},speed:{label:"Drift speed",type:"range",min:0,max:.6,step:.01,value:.16}}},u=180,P=100,l=u*P,E=`
  precision highp float;

  uniform float uTime;
  uniform vec3  uPointer;
  uniform float uPointerAmount;
  uniform float uAmp;
  uniform float uDotSize;
  uniform float uDrift;

  attribute vec2  aOffset;
  attribute float aRand;

  varying float vHeight;
  varying float vRand;
  varying vec2  vLocal;

  ${T}
  ${L}

  void main(){
    vec3 base = vec3(aOffset.x, aOffset.y, 0.0);

    // Slow drifting swell.
    float field = fbm(vec3(aOffset * 0.42, uTime * uDrift), 4, 2.0, 0.5);

    // Pointer raises a soft gaussian bump that trails the cursor.
    float d = distance(aOffset, uPointer.xy);
    float bump = exp(-d * d * 0.35) * uPointerAmount;

    float h = field * uAmp + bump * 1.5;
    base.z += h;

    vHeight = h;
    vRand = aRand;
    vLocal = position.xy;

    // Billboard in view space so every dot faces the camera regardless of the
    // plane's tilt.
    vec4 mv = modelViewMatrix * vec4(base, 1.0);

    float scale = uDotSize * (0.45 + 0.75 * smoothstep(-1.0, 1.5, h)) * (0.7 + aRand * 0.6);
    mv.xy += position.xy * scale;

    gl_Position = projectionMatrix * mv;
  }
`,N=`
  precision highp float;

  uniform float uTime;

  varying float vHeight;
  varying float vRand;
  varying vec2  vLocal;

  ${k}

  void main(){
    // Round the quad off into a soft disc.
    float r = length(vLocal) * 2.0;
    float alpha = (1.0 - smoothstep(0.35, 1.0, r));
    if (alpha <= 0.001) discard;

    float t = clamp(vHeight * 0.42 + 0.5, 0.0, 1.0);

    vec3 col = palette(
      t * 0.8 + vRand * 0.05,
      vec3(0.28, 0.30, 0.40),
      vec3(0.32, 0.34, 0.40),
      vec3(0.90, 0.85, 0.80),
      vec3(0.10, 0.28, 0.52)
    );

    // Crests pick up a cool highlight, troughs sink toward the background.
    col += vec3(0.40, 0.62, 1.00) * pow(clamp(t, 0.0, 1.0), 4.0) * 0.9;
    col *= mix(0.35, 1.25, t);

    gl_FragColor = vec4(col, alpha * mix(0.35, 1.0, t));
  }
`;function X({renderer:x,width:A,height:S,params:c={}}){const d=new H,t=new B(38,A/S,.1,200);t.position.set(0,-14,13),t.lookAt(0,1.5,0);const s=new F(1,1),a=new I;a.index=s.index,a.attributes.position=s.attributes.position,a.attributes.uv=s.attributes.uv,a.instanceCount=l;const f=new Float32Array(l*2),m=new Float32Array(l),v=.26;for(let e=0;e<l;e++){const r=e%u,n=Math.floor(e/u);f[e*2+0]=(r-u/2)*v,f[e*2+1]=(n-P/2)*v,m[e]=Math.random()}a.setAttribute("aOffset",new y(f,2)),a.setAttribute("aRand",new y(m,1)),a.boundingSphere=new V(new i,60);const o=new $({vertexShader:E,fragmentShader:N,transparent:!0,depthWrite:!1,blending:j,uniforms:{uTime:{value:0},uPointer:{value:new i(0,0,0)},uPointerAmount:{value:0},uAmp:{value:c.amp??1.5},uDotSize:{value:c.size??.135},uDrift:{value:c.speed??.16}}}),p=new G(a,o);p.frustumCulled=!1,d.add(p);const h=new _,z=new q(new i(0,0,1),0),g=new i,b=new i(0,0,0),w=new W,C=new U(263434);function R(e,r,n){o.uniforms.uTime.value=e,n.active&&(w.set(n.x,n.y),h.setFromCamera(w,t),h.ray.intersectPlane(z,g)&&b.lerp(g,.08)),o.uniforms.uPointer.value.copy(b),o.uniforms.uPointerAmount.value+=((n.active?1:0)-o.uniforms.uPointerAmount.value)*.05,t.position.x=Math.sin(e*.09)*1.6,t.position.y=-14+Math.cos(e*.07)*.8,t.lookAt(0,1.5,0),x.render(d,t)}function D(e,r){t.aspect=e/r,t.updateProjectionMatrix()}function M(){s.dispose(),a.dispose(),o.dispose()}function O(e){e.amp!==void 0&&(o.uniforms.uAmp.value=e.amp),e.size!==void 0&&(o.uniforms.uDotSize.value=e.size),e.speed!==void 0&&(o.uniforms.uDrift.value=e.speed)}return{render:R,resize:D,dispose:M,setParams:O,background:C}}export{X as create,Q as meta};
