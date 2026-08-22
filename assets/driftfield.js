import{s as $,c as H,h as I,p as X}from"./glsl.js";import{f as z,g as D,N as R,R as A,F as U,H as Z,h as J,O as K,S as _,P as Q,c as x,V as y,M as Y,i as ee,B as te,j as E,b as oe,A as ae,k as se,C as ie}from"./three.module.js";const me={id:"driftfield",title:"Driftfield",tags:["gpgpu","ping-pong fbo","curl noise"],blurb:"A quarter-million particles whose positions live entirely in a floating-point texture. Each frame a fragment shader advects every one of them through a divergence-free curl-noise field and writes the result to a second texture, which becomes next frame’s input. The CPU never touches a particle.",stats:{particles:"262,144","sim passes/frame":"1","CPU work":"none"}},a=512,d=a*a,re=`
  precision highp float;

  uniform sampler2D uPos;
  uniform float uTime;
  uniform float uDt;
  uniform float uScale;
  uniform float uSpeed;
  uniform float uDecay;
  uniform vec3  uPointer;
  uniform float uPointerForce;

  varying vec2 vUv;

  ${$}
  ${H}
  ${I}

  void main(){
    vec4 data  = texture2D(uPos, vUv);
    vec3 pos   = data.xyz;
    float life = data.w;

    // Flow: curl noise sampled in a slowly drifting 4th dimension (time on z)
    // so the field itself evolves instead of being a frozen sculpture.
    vec3 vel = curlNoise(pos * uScale + vec3(0.0, 0.0, uTime * 0.06)) * uSpeed;

    // Pointer shoves particles away with an inverse-square falloff.
    vec3 away = pos - uPointer;
    float d2  = dot(away, away);
    vel += normalize(away + 1e-5) * uPointerForce / (1.0 + d2 * 9.0);

    // Weak spring to the origin, otherwise the cloud slowly evaporates.
    vel -= pos * 0.09;

    pos  += vel * uDt;
    life -= uDt * uDecay;

    // Respawn dead particles on a jittered shell.
    if (life <= 0.0){
      vec3 r   = hash31(vUv.x * 3571.0 + vUv.y * 7919.0 + uTime * 13.0);
      vec3 dir = normalize(r * 2.0 - 1.0);
      pos  = dir * (0.30 + r.x * 0.55);
      life = 1.0;
    }

    gl_FragColor = vec4(pos, life);
  }
`,q=`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,ne=`
  precision highp float;
  uniform sampler2D uPos;
  varying vec2 vUv;
  void main(){ gl_FragColor = texture2D(uPos, vUv); }
`,le=`
  precision highp float;

  uniform sampler2D uPos;
  uniform sampler2D uPrevPos;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute vec2 aRef;

  varying float vSpeed;
  varying float vLife;

  void main(){
    vec4 cur  = texture2D(uPos,     aRef);
    vec3 prev = texture2D(uPrevPos, aRef).xyz;

    // Velocity for free: the ping-pong pair already holds both frames.
    vSpeed = length(cur.xyz - prev);
    vLife  = cur.w;

    vec4 mv = modelViewMatrix * vec4(cur.xyz, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio / max(-mv.z, 0.001);
  }
`,ue=`
  precision highp float;

  uniform float uExposure;
  varying float vSpeed;
  varying float vLife;

  ${X}

  void main(){
    vec2 q = gl_PointCoord - 0.5;
    float r2 = dot(q, q);
    if (r2 > 0.25) discard;

    // Soft round sprite, no texture needed.
    float sprite = (1.0 - smoothstep(0.0, 0.25, r2));

    // Fade in on spawn, out on death, so respawns never pop.
    float fade = (1.0 - smoothstep(0.82, 1.0, vLife)) * smoothstep(0.0, 0.18, vLife);

    float t = clamp(vSpeed * 42.0, 0.0, 1.0);
    vec3 col = palette(
      t,
      vec3(0.34, 0.30, 0.44),
      vec3(0.42, 0.36, 0.44),
      vec3(1.00, 0.95, 0.85),
      vec3(0.00, 0.18, 0.42)
    );
    col += vec3(0.35, 0.55, 1.0) * pow(t, 3.0) * 0.8;

    gl_FragColor = vec4(col * uExposure, sprite * fade * 0.35);
  }
`;function he({renderer:t,width:B,height:W}){const S={type:!!t.getContext().getExtension("EXT_color_buffer_float")?U:Z,format:A,minFilter:R,magFilter:R,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,wrapS:D,wrapT:D},i=[new z(a,a,S),new z(a,a,S)],c=new Float32Array(d*4);for(let e=0;e<d;e++){const r=Math.random()*2-1,n=Math.random()*Math.PI*2,l=Math.sqrt(1-r*r),u=.3+Math.random()*.6;c[e*4+0]=l*Math.cos(n)*u,c[e*4+1]=l*Math.sin(n)*u,c[e*4+2]=r*u,c[e*4+3]=Math.random()}const m=new J(c,a,a,A,U);m.needsUpdate=!0;const F=new K(-1,1,1,-1,0,1),w=new _,M=new Q(2,2),s=new x({vertexShader:q,fragmentShader:re,depthTest:!1,depthWrite:!1,uniforms:{uPos:{value:m},uTime:{value:0},uDt:{value:.016},uScale:{value:1.75},uSpeed:{value:.48},uDecay:{value:.14},uPointer:{value:new y(999,999,999)},uPointerForce:{value:0}}}),h=new Y(M,s);h.frustumCulled=!1,w.add(h);const T=new x({vertexShader:q,fragmentShader:ne,depthTest:!1,depthWrite:!1,uniforms:{uPos:{value:m}}}),L=t.autoClear;h.material=T;for(const e of i)t.setRenderTarget(e),t.render(w,F);t.setRenderTarget(null),t.autoClear=L,h.material=s;const b=new _,o=new ee(50,B/W,.1,100);o.position.set(0,0,3.1);const P=new Float32Array(d*2),V=new Float32Array(d*3);for(let e=0;e<d;e++)P[e*2+0]=(e%a+.5)/a,P[e*2+1]=(Math.floor(e/a)+.5)/a;const f=new te;f.setAttribute("position",new E(V,3)),f.setAttribute("aRef",new E(P,2)),f.boundingSphere=new oe(new y,4);const p=new x({vertexShader:le,fragmentShader:ue,transparent:!0,depthWrite:!1,blending:ae,uniforms:{uPos:{value:i[0].texture},uPrevPos:{value:i[1].texture},uSize:{value:5.5},uPixelRatio:{value:t.getPixelRatio()},uExposure:{value:.55}}}),C=new se(f,p);C.frustumCulled=!1,b.add(C);let g=0;const v=new y(999,999,999),j=new ie(329227);function k(e,r,n){if(n.active){v.set(n.x,n.y,.5).unproject(o),v.sub(o.position).normalize();const O=-o.position.z/v.z;v.multiplyScalar(O).add(o.position),s.uniforms.uPointer.value.copy(v)}s.uniforms.uPointerForce.value+=((n.active?.55:0)-s.uniforms.uPointerForce.value)*.06,s.uniforms.uTime.value=e,s.uniforms.uDt.value=r;const l=1-g;s.uniforms.uPos.value=i[g].texture,t.setRenderTarget(i[l]),t.render(w,F),t.setRenderTarget(null),p.uniforms.uPos.value=i[l].texture,p.uniforms.uPrevPos.value=i[g].texture,g=l;const u=e*.07;o.position.x=Math.sin(u)*3.1,o.position.z=Math.cos(u)*3.1,o.position.y=Math.sin(e*.11)*.35,o.lookAt(0,0,0),t.render(b,o)}function G(e,r){o.aspect=e/r,o.updateProjectionMatrix(),p.uniforms.uPixelRatio.value=t.getPixelRatio()}function N(){i.forEach(e=>e.dispose()),m.dispose(),M.dispose(),f.dispose(),s.dispose(),T.dispose(),p.dispose()}return{render:k,resize:G,dispose:N,background:j}}export{he as create,me as meta};
