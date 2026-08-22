import{s as I,c as X,h as Z,p as J}from"./glsl.js";import{f as D,g as R,N as A,R as U,F as _,H as K,h as Q,O as Y,S as E,P as ee,c as x,V as S,M as te,i as ae,B as oe,j as q,b as se,A as ie,k as re,C as ne}from"./three.module.js";const ge={id:"driftfield",title:"Driftfield",tags:["gpgpu","ping-pong fbo","curl noise"],blurb:"A quarter-million particles whose positions live entirely in a floating-point texture. Each frame a fragment shader advects every one of them through a divergence-free curl-noise field and writes the result to a second texture, which becomes next frame’s input. The CPU never touches a particle.",stats:{particles:"262,144","sim passes/frame":"1","CPU work":"none"},params:{speed:{label:"Flow speed",type:"range",min:.05,max:1.4,step:.01,value:.48},scale:{label:"Noise scale",type:"range",min:.4,max:4,step:.01,value:1.75},size:{label:"Particle size",type:"range",min:2,max:11,step:.1,value:5.5},decay:{label:"Lifetime",type:"range",min:.03,max:.6,step:.01,value:.14}}},s=512,d=s*s,le=`
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

  ${I}
  ${X}
  ${Z}

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
`,B=`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,ue=`
  precision highp float;
  uniform sampler2D uPos;
  varying vec2 vUv;
  void main(){ gl_FragColor = texture2D(uPos, vUv); }
`,ce=`
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
`,fe=`
  precision highp float;

  uniform float uExposure;
  varying float vSpeed;
  varying float vLife;

  ${J}

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
`;function ye({renderer:t,width:L,height:W,params:m={}}){const F={type:!!t.getContext().getExtension("EXT_color_buffer_float")?_:K,format:U,minFilter:A,magFilter:A,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,wrapS:R,wrapT:R},i=[new D(s,s,F),new D(s,s,F)],f=new Float32Array(d*4);for(let e=0;e<d;e++){const r=Math.random()*2-1,n=Math.random()*Math.PI*2,u=Math.sqrt(1-r*r),c=.3+Math.random()*.6;f[e*4+0]=u*Math.cos(n)*c,f[e*4+1]=u*Math.sin(n)*c,f[e*4+2]=r*c,f[e*4+3]=Math.random()}const h=new Q(f,s,s,U,_);h.needsUpdate=!0;const z=new Y(-1,1,1,-1,0,1),P=new E,b=new ee(2,2),a=new x({vertexShader:B,fragmentShader:le,depthTest:!1,depthWrite:!1,uniforms:{uPos:{value:h},uTime:{value:0},uDt:{value:.016},uScale:{value:m.scale??1.75},uSpeed:{value:m.speed??.48},uDecay:{value:m.decay??.14},uPointer:{value:new S(999,999,999)},uPointerForce:{value:0}}}),g=new te(b,a);g.frustumCulled=!1,P.add(g);const M=new x({vertexShader:B,fragmentShader:ue,depthTest:!1,depthWrite:!1,uniforms:{uPos:{value:h}}}),V=t.autoClear;g.material=M;for(const e of i)t.setRenderTarget(e),t.render(P,z);t.setRenderTarget(null),t.autoClear=V,g.material=a;const T=new E,o=new ae(50,L/W,.1,100);o.position.set(0,0,3.1);const w=new Float32Array(d*2),j=new Float32Array(d*3);for(let e=0;e<d;e++)w[e*2+0]=(e%s+.5)/s,w[e*2+1]=(Math.floor(e/s)+.5)/s;const p=new oe;p.setAttribute("position",new q(j,3)),p.setAttribute("aRef",new q(w,2)),p.boundingSphere=new se(new S,4);const l=new x({vertexShader:ce,fragmentShader:fe,transparent:!0,depthWrite:!1,blending:ie,uniforms:{uPos:{value:i[0].texture},uPrevPos:{value:i[1].texture},uSize:{value:m.size??5.5},uPixelRatio:{value:t.getPixelRatio()},uExposure:{value:.55}}}),C=new re(p,l);C.frustumCulled=!1,T.add(C);let y=0;const v=new S(999,999,999),k=new ne(329227);function N(e,r,n){if(n.active){v.set(n.x,n.y,.5).unproject(o),v.sub(o.position).normalize();const H=-o.position.z/v.z;v.multiplyScalar(H).add(o.position),a.uniforms.uPointer.value.copy(v)}a.uniforms.uPointerForce.value+=((n.active?.55:0)-a.uniforms.uPointerForce.value)*.06,a.uniforms.uTime.value=e,a.uniforms.uDt.value=r;const u=1-y;a.uniforms.uPos.value=i[y].texture,t.setRenderTarget(i[u]),t.render(P,z),t.setRenderTarget(null),l.uniforms.uPos.value=i[u].texture,l.uniforms.uPrevPos.value=i[y].texture,y=u;const c=e*.07;o.position.x=Math.sin(c)*3.1,o.position.z=Math.cos(c)*3.1,o.position.y=Math.sin(e*.11)*.35,o.lookAt(0,0,0),t.render(T,o)}function G(e,r){o.aspect=e/r,o.updateProjectionMatrix(),l.uniforms.uPixelRatio.value=t.getPixelRatio()}function O(){i.forEach(e=>e.dispose()),h.dispose(),b.dispose(),p.dispose(),a.dispose(),M.dispose(),l.dispose()}function $(e){e.scale!==void 0&&(a.uniforms.uScale.value=e.scale),e.speed!==void 0&&(a.uniforms.uSpeed.value=e.speed),e.decay!==void 0&&(a.uniforms.uDecay.value=e.decay),e.size!==void 0&&(l.uniforms.uSize.value=e.size)}return{render:N,resize:G,dispose:O,setParams:$,background:k}}export{ye as create,ge as meta};
