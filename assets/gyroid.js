import{p as w,t as x}from"./glsl.js";import{S as k,O as b,P,c as T,d as r,M as z,C as S}from"./three.module.js";const O={id:"gyroid",title:"Gyroid",tags:["raymarching","sdf","no geometry"],blurb:"There is no mesh in this scene. Two triangles cover the screen and a fragment shader walks a ray through a distance field for every pixel, solving a gyroid minimal surface analytically. Normals, soft shadows and ambient occlusion are all derived from the same distance function.",stats:{triangles:"2","max ray steps":"96",geometry:"implicit"}},D=`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,C=`
  precision highp float;

  uniform vec2  uResolution;
  uniform float uTime;
  uniform vec2  uPointer;

  varying vec2 vUv;

  ${w}
  ${x}

  mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

  // Gyroid: a triply-periodic minimal surface. Not a true SDF, so every step is
  // scaled down to stay conservative and avoid marching straight through it.
  float gyroid(vec3 p, float scale, float thickness){
    p *= scale;
    float g = dot(sin(p), cos(p.zxy));
    return (abs(g) - thickness) / scale;
  }

  float map(vec3 p){
    p.xz *= rot(uTime * 0.12);
    p.xy *= rot(uTime * 0.08);

    // Carve the infinite lattice down to a rounded blob.
    float shell = length(p) - 1.25;

    // Two octaves at different frequencies read as fine detail on coarse structure.
    float coarse = gyroid(p, 3.0, 0.28);
    float fine   = gyroid(p, 9.7, 0.20);

    float surface = coarse - fine * 0.12;

    return max(shell, surface * 0.55);
  }

  vec3 calcNormal(vec3 p){
    // Tetrahedral central differences: 4 taps instead of 6.
    const vec2 k = vec2(1.0, -1.0);
    const float h = 0.0015;
    return normalize(
      k.xyy * map(p + k.xyy * h) +
      k.yyx * map(p + k.yyx * h) +
      k.yxy * map(p + k.yxy * h) +
      k.xxx * map(p + k.xxx * h)
    );
  }

  float softShadow(vec3 origin, vec3 dir){
    float res = 1.0;
    float t = 0.03;
    for (int i = 0; i < 28; i++){
      float h = map(origin + dir * t);
      if (h < 0.001) return 0.0;
      res = min(res, 10.0 * h / t);
      t += clamp(h, 0.02, 0.22);
      if (t > 4.0) break;
    }
    return clamp(res, 0.0, 1.0);
  }

  float ambientOcclusion(vec3 p, vec3 n){
    float occ = 0.0;
    float weight = 1.0;
    for (int i = 0; i < 5; i++){
      float dist = 0.02 + 0.10 * float(i);
      occ += (dist - map(p + n * dist)) * weight;
      weight *= 0.72;
    }
    return clamp(1.0 - 2.2 * occ, 0.0, 1.0);
  }

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

    // Pointer nudges the camera rather than the object, which reads as parallax.
    vec3 ro = vec3(uPointer.x * 0.55, uPointer.y * 0.45, 4.1);
    vec3 target = vec3(0.0);
    vec3 fwd = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = cross(fwd, right);
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * fwd);

    float t = 0.0;
    float dist = 0.0;
    bool hit = false;

    for (int i = 0; i < 96; i++){
      vec3 p = ro + rd * t;
      dist = map(p);
      if (dist < 0.0008 * t){ hit = true; break; }
      t += dist;
      if (t > 7.0) break;
    }

    vec3 col = vec3(0.0);

    if (hit){
      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);
      vec3 viewDir = -rd;

      vec3 keyDir = normalize(vec3(0.7, 0.9, 0.5));
      float key = clamp(dot(n, keyDir), 0.0, 1.0);
      float shadow = softShadow(p + n * 0.01, keyDir);
      float occ = ambientOcclusion(p, n);

      float fresnel = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 4.0);

      // Base colour keyed off depth into the surface + normal orientation, so
      // the lattice self-colours as it twists.
      float band = length(p) * 0.9 + n.y * 0.35 + uTime * 0.05;
      vec3 base = palette(
        band,
        vec3(0.42, 0.38, 0.50),
        vec3(0.40, 0.36, 0.42),
        vec3(1.00, 0.90, 0.75),
        vec3(0.12, 0.30, 0.55)
      );

      vec3 halfVec = normalize(keyDir + viewDir);
      float spec = pow(clamp(dot(n, halfVec), 0.0, 1.0), 64.0);

      col  = base * (0.16 + 0.90 * key * shadow) * occ;
      col += vec3(1.0, 0.96, 0.92) * spec * shadow * 0.55;
      col += vec3(0.35, 0.60, 1.00) * fresnel * 0.75;

      // Distance haze keeps the far side of the lattice from reading as noise.
      col = mix(col, vec3(0.02, 0.03, 0.06), smoothstep(3.4, 7.2, t));
    } else {
      // Subtle vertical gradient so the negative space is not dead flat.
      col = mix(vec3(0.015, 0.02, 0.045), vec3(0.04, 0.05, 0.09), uv.y + 0.5);
      col += vec3(0.05, 0.08, 0.16) * pow(1.0 - length(uv) * 0.7, 3.0);
    }

    col = tonemapACES(col * 1.15);
    col = pow(col, vec3(1.0 / 2.2));

    gl_FragColor = vec4(col, 1.0);
  }
`;function F({renderer:o,width:f,height:v}){const c=new k,d=new b(-1,1,1,-1,0,1),s=new P(2,2),e=new T({vertexShader:D,fragmentShader:C,depthTest:!1,depthWrite:!1,uniforms:{uResolution:{value:new r(f,v)},uTime:{value:0},uPointer:{value:new r(0,0)}}}),n=new z(s,e);n.frustumCulled=!1,c.add(n);const t=new r(0,0),m=new S(263434);function u(i,l,a){e.uniforms.uTime.value=i;const y=a.active?a.x:0,g=a.active?a.y:0;t.x+=(y-t.x)*.05,t.y+=(g-t.y)*.05,e.uniforms.uPointer.value.copy(t),o.render(c,d)}function h(i,l){e.uniforms.uResolution.value.set(i*o.getPixelRatio(),l*o.getPixelRatio())}function p(){s.dispose(),e.dispose()}return{render:u,resize:h,dispose:p,background:m}}export{F as create,O as meta};
