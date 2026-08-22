import{p as D,t as S,s as q,f as C}from"./glsl.js";import{S as P,f as T,l as m,c as A,V as M,M as N,C as R,d as F}from"./three.module.js";const j={id:"chroma",title:"Chroma",tags:["vertex displacement","analytic normals","iridescence"],blurb:"An icosphere pushed around by fractal noise in the vertex shader. The interesting part is the lighting: displacing vertices invalidates the mesh normals, so this resamples the displacement at two tangent-space neighbours and rebuilds the normal per vertex. Skip that and the whole thing shades like a smooth ball wearing a lumpy costume.",stats:{"noise taps/vertex":"21",normals:"recomputed per vertex"},params:{amp:{label:"Displacement",type:"range",min:.02,max:.6,step:.01,value:.28},freq:{label:"Noise frequency",type:"range",min:.4,max:4,step:.05,value:1.5},speed:{label:"Rotation",type:"range",min:0,max:.6,step:.01,value:.15},detail:{label:"Mesh detail",type:"select",structural:!0,value:56,options:[{label:"3,840 verts",value:7},{label:"21,780 verts",value:32},{label:"194,940 verts",value:56},{label:"253,500 verts",value:64}]},hue:{label:"Hue",type:"range",min:0,max:1,step:.005,value:0},shine:{label:"Reflectivity",type:"range",min:0,max:1.6,step:.01,value:.85}}},H=`
  precision highp float;

  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uRadius;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vDisp;

  ${q}
  ${C}

  float displace(vec3 dir){
    vec3 q = dir * uFreq;
    // Two counter-drifting fbm layers so the surface never looks like it is
    // simply scrolling in one direction.
    float a = fbm(q + vec3(0.0, 0.0,  uTime * 0.20), 4, 2.0, 0.5);
    float b = fbm(q.zxy * 1.7 + vec3(0.0, 0.0, -uTime * 0.13), 3, 2.1, 0.55);
    return (a * 0.75 + b * 0.35) * uAmp;
  }

  vec3 toSurface(vec3 dir){
    return dir * (uRadius + displace(dir));
  }

  void main(){
    vec3 dir = normalize(position);

    // Build a stable tangent frame; swap the up vector near the poles so the
    // cross product never collapses to zero.
    vec3 up = abs(dir.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 tangent   = normalize(cross(dir, up));
    vec3 bitangent = normalize(cross(dir, tangent));

    const float e = 0.015;
    vec3 p0 = toSurface(dir);
    vec3 p1 = toSurface(normalize(dir + tangent   * e));
    vec3 p2 = toSurface(normalize(dir + bitangent * e));

    // Rebuild the normal from the actual displaced neighbourhood.
    vec3 n = normalize(cross(p1 - p0, p2 - p0));

    vDisp    = (length(p0) - uRadius) / max(uAmp, 0.0001);
    vNormal  = normalize(normalMatrix * n);
    vec4 world = modelMatrix * vec4(p0, 1.0);
    vWorldPos = world.xyz;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`,V=`
  precision highp float;

  uniform vec3  uCameraPos;
  uniform float uTime;
  uniform float uHue;
  uniform float uShine;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vDisp;

  ${D}
  ${S}

  // Cheap procedural environment. Good enough to sell a reflection without
  // shipping a cubemap.
  vec3 environment(vec3 dir){
    float horizon = smoothstep(-0.35, 0.55, dir.y);
    vec3 sky    = mix(vec3(0.05, 0.07, 0.14), vec3(0.30, 0.42, 0.70), horizon);
    vec3 ground = vec3(0.04, 0.035, 0.05);
    vec3 col = mix(ground, sky, smoothstep(-0.10, 0.10, dir.y));
    // A soft key light baked into the environment.
    col += vec3(1.0, 0.85, 0.65) * pow(clamp(dot(dir, normalize(vec3(0.6, 0.7, 0.4))), 0.0, 1.0), 24.0) * 1.6;
    return col;
  }

  void main(){
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 reflectDir = reflect(-viewDir, n);

    float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 3.0);

    // Thin-film style shift: the hue tracks view angle, which is what makes
    // oil slicks and soap bubbles read as iridescent rather than just colourful.
    float shift = ndv * 0.85 + vDisp * 0.30 + uTime * 0.03;
    vec3 iridescence = palette(
      shift,
      vec3(0.56, 0.54, 0.62),
      vec3(0.26, 0.24, 0.30),
      vec3(1.00, 1.00, 1.00),
      vec3(0.02, 0.16, 0.32) + uHue
    );

    vec3 keyDir = normalize(vec3(0.6, 0.8, 0.45));
    float diffuse = clamp(dot(n, keyDir), 0.0, 1.0);
    vec3 halfVec = normalize(keyDir + viewDir);
    float spec = pow(clamp(dot(n, halfVec), 0.0, 1.0), 96.0);

    vec3 env = environment(reflectDir);

    vec3 col = iridescence * (0.20 + 0.75 * diffuse);
    col = mix(col, env * iridescence * 1.4, fresnel * uShine);
    col += vec3(1.0) * spec * 0.6;

    // Crevices go darker; ridges catch a little extra light.
    col *= mix(0.72, 1.16, smoothstep(-1.0, 1.0, vDisp));

    col = tonemapACES(col * 1.1);
    col = pow(col, vec3(1.0 / 2.2));

    gl_FragColor = vec4(col, 1.0);
  }
`;function G({renderer:d,width:p,height:f,params:r={}}){const c=new P,o=new T(45,p/f,.1,100);o.position.set(0,0,3.4);let l=Number(r.detail)||56,u=new m(1,l);const i=new A({vertexShader:H,fragmentShader:V,uniforms:{uTime:{value:0},uAmp:{value:r.amp??.28},uFreq:{value:r.freq??1.5},uRadius:{value:1},uCameraPos:{value:new M},uHue:{value:r.hue??0},uShine:{value:r.shine??.85}}}),t=new N(u,i);c.add(t);function h(e){l=e;const a=t.geometry;t.geometry=new m(1,l),u=t.geometry,a.dispose()}const n=new F(0,0);let v=r.speed??.15;const g=new R(395021);function y(e,a,s){i.uniforms.uTime.value=e;const z=s.active?s.x:0,k=s.active?s.y:0;n.x+=(z-n.x)*.05,n.y+=(k-n.y)*.05,t.rotation.y=e*v+n.x*.6,t.rotation.x=n.y*-.5,o.position.z=3.4,o.lookAt(0,0,0),i.uniforms.uCameraPos.value.copy(o.position),d.render(c,o)}function b(e,a){o.aspect=e/a,o.updateProjectionMatrix()}function w(){t.geometry.dispose(),i.dispose()}function x(e){e.amp!==void 0&&(i.uniforms.uAmp.value=e.amp),e.freq!==void 0&&(i.uniforms.uFreq.value=e.freq),e.speed!==void 0&&(v=e.speed),e.hue!==void 0&&(i.uniforms.uHue.value=e.hue),e.shine!==void 0&&(i.uniforms.uShine.value=e.shine);const a=Number(e.detail);Number.isFinite(a)&&a!==l&&h(a)}return{render:y,resize:b,dispose:w,setParams:x,background:g}}export{G as create,j as meta};
