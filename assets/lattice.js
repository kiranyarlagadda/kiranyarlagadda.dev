import{p as k,s as T,f as L}from"./glsl.js";import{S as z,i as H,P as B,I as F,a as b,b as I,V as s,c as V,A as D,M as $,C as j,d as G,m as U,n as W}from"./three.module.js";const J={id:"lattice",title:"Lattice",tags:["instancing","one draw call","hero background"],blurb:"Eighteen thousand billboarded dots drawn in a single instanced call. Height, scale and colour all come out of one fbm field evaluated in the vertex shader, with a travelling swell that follows the pointer. This is the one that actually belongs behind a hero headline. It stays legible under text and costs a single draw call.",stats:{instances:"18,000","draw calls":"1","CPU per frame":"3 uniforms"}},c=180,y=100,l=c*y,_=`
  precision highp float;

  uniform float uTime;
  uniform vec3  uPointer;
  uniform float uPointerAmount;
  uniform float uAmp;
  uniform float uDotSize;

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
    float field = fbm(vec3(aOffset * 0.42, uTime * 0.16), 4, 2.0, 0.5);

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
`,q=`
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
`;function K({renderer:x,width:P,height:A}){const f=new z,t=new H(38,P/A,.1,200);t.position.set(0,-14,13),t.lookAt(0,1.5,0);const i=new B(1,1),a=new F;a.index=i.index,a.attributes.position=i.attributes.position,a.attributes.uv=i.attributes.uv,a.instanceCount=l;const u=new Float32Array(l*2),d=new Float32Array(l),m=.26;for(let e=0;e<l;e++){const r=e%c,n=Math.floor(e/c);u[e*2+0]=(r-c/2)*m,u[e*2+1]=(n-y/2)*m,d[e]=Math.random()}a.setAttribute("aOffset",new b(u,2)),a.setAttribute("aRand",new b(d,1)),a.boundingSphere=new I(new s,60);const o=new V({vertexShader:_,fragmentShader:q,transparent:!0,depthWrite:!1,blending:D,uniforms:{uTime:{value:0},uPointer:{value:new s(0,0,0)},uPointerAmount:{value:0},uAmp:{value:1.5},uDotSize:{value:.135}}}),v=new $(a,o);v.frustumCulled=!1,f.add(v);const h=new U,S=new W(new s(0,0,1),0),p=new s,g=new s(0,0,0),w=new G,C=new j(263434);function R(e,r,n){o.uniforms.uTime.value=e,n.active&&(w.set(n.x,n.y),h.setFromCamera(w,t),h.ray.intersectPlane(S,p)&&g.lerp(p,.08)),o.uniforms.uPointer.value.copy(g),o.uniforms.uPointerAmount.value+=((n.active?1:0)-o.uniforms.uPointerAmount.value)*.05,t.position.x=Math.sin(e*.09)*1.6,t.position.y=-14+Math.cos(e*.07)*.8,t.lookAt(0,1.5,0),x.render(f,t)}function M(e,r){t.aspect=e/r,t.updateProjectionMatrix()}function O(){i.dispose(),a.dispose(),o.dispose()}return{render:R,resize:M,dispose:O,background:C}}export{K as create,J as meta};
