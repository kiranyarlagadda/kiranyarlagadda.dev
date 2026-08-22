import{s as J,c as K,h as Q,p as Y}from"./glsl.js";import{O as Z,S as E,P as ee,c as S,V as F,M as te,A as ae,f as oe,C as ie,g as B,h as H,N as L,R as N,F as W,H as se,i as re,B as le,j as q,b as ne,k as ue}from"./three.module.js";const Pe={id:"driftfield",title:"Driftfield",tags:["gpgpu","ping-pong fbo","curl noise"],blurb:"Up to a million particles whose positions live entirely in a floating-point texture. Each frame a fragment shader advects every one of them through a divergence-free curl-noise field and writes the result to a second texture, which becomes next frame’s input. The CPU never touches a particle.",stats:{"sim passes/frame":"1","CPU work":"none","CPU per particle":"zero"},params:{count:{label:"Particles",type:"select",structural:!0,value:512,options:[{label:"16,384",value:128},{label:"65,536",value:256},{label:"262,144",value:512},{label:"1,048,576",value:1024}]},speed:{label:"Flow speed",type:"range",min:.05,max:1.4,step:.01,value:.48},scale:{label:"Noise scale",type:"range",min:.4,max:4,step:.01,value:1.75},size:{label:"Particle size",type:"range",min:2,max:11,step:.1,value:5.5},decay:{label:"Lifetime",type:"range",min:.03,max:.6,step:.01,value:.14},force:{label:"Pointer push",type:"range",min:0,max:1.6,step:.01,value:.55},hue:{label:"Hue",type:"range",min:0,max:1,step:.005,value:0},exposure:{label:"Brightness",type:"range",min:.15,max:1.6,step:.01,value:.55}}},fe=`
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

  ${J}
  ${K}
  ${Q}

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
`,V=`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,ce=`
  precision highp float;
  uniform sampler2D uPos;
  varying vec2 vUv;
  void main(){ gl_FragColor = texture2D(uPos, vUv); }
`,pe=`
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
`,ve=`
  precision highp float;

  uniform float uExposure;
  uniform float uHue;
  varying float vSpeed;
  varying float vLife;

  ${Y}

  void main(){
    vec2 q = gl_PointCoord - 0.5;
    float r2 = dot(q, q);
    if (r2 > 0.25) discard;

    // Soft round sprite, no texture needed.
    float sprite = 1.0 - smoothstep(0.0, 0.25, r2);

    // Fade in on spawn, out on death, so respawns never pop.
    float fade = (1.0 - smoothstep(0.82, 1.0, vLife)) * smoothstep(0.0, 0.18, vLife);

    float t = clamp(vSpeed * 42.0, 0.0, 1.0);
    vec3 col = palette(
      t,
      vec3(0.34, 0.30, 0.44),
      vec3(0.42, 0.36, 0.44),
      vec3(1.00, 0.95, 0.85),
      vec3(0.00, 0.18, 0.42) + uHue
    );
    col += vec3(0.35, 0.55, 1.0) * pow(t, 3.0) * 0.8;

    gl_FragColor = vec4(col * uExposure, sprite * fade * 0.35);
  }
`;function we({renderer:s,width:j,height:k,params:u={}}){const z={type:!!s.getContext().getExtension("EXT_color_buffer_float")?W:se,format:N,minFilter:L,magFilter:L,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,wrapS:H,wrapT:H},M=new Z(-1,1,1,-1,0,1),y=new E,T=new ee(2,2),r=new S({vertexShader:V,fragmentShader:fe,depthTest:!1,depthWrite:!1,uniforms:{uPos:{value:null},uTime:{value:0},uDt:{value:.016},uScale:{value:u.scale??1.75},uSpeed:{value:u.speed??.48},uDecay:{value:u.decay??.14},uPointer:{value:new F(999,999,999)},uPointerForce:{value:0}}}),P=new S({vertexShader:V,fragmentShader:ce,depthTest:!1,depthWrite:!1,uniforms:{uPos:{value:null}}}),h=new te(T,r);h.frustumCulled=!1,y.add(h);const l=new S({vertexShader:pe,fragmentShader:ve,transparent:!0,depthWrite:!1,blending:ae,uniforms:{uPos:{value:null},uPrevPos:{value:null},uSize:{value:u.size??5.5},uPixelRatio:{value:s.getPixelRatio()},uExposure:{value:u.exposure??.55},uHue:{value:u.hue??0}}}),w=new E,i=new oe(50,j/k,.1,100);i.position.set(0,0,3.1);let D=0,n=null,v=null,f=null,p=null,d=0;function R(){p&&w.remove(p),n?.forEach(e=>e.dispose()),v?.dispose(),f?.dispose(),n=null,v=null,f=null,p=null}function C(e){R(),D=e;const o=e*e;n=[new B(e,e,z),new B(e,e,z)];const a=new Float32Array(o*4);for(let t=0;t<o;t++){const x=Math.random()*2-1,A=Math.random()*Math.PI*2,_=Math.sqrt(1-x*x),b=.3+Math.random()*.6;a[t*4+0]=_*Math.cos(A)*b,a[t*4+1]=_*Math.sin(A)*b,a[t*4+2]=x*b,a[t*4+3]=Math.random()}v=new re(a,e,e,N,W),v.needsUpdate=!0,P.uniforms.uPos.value=v,h.material=P;for(const t of n)s.setRenderTarget(t),s.render(y,M);s.setRenderTarget(null),h.material=r;const c=new Float32Array(o*2),g=new Float32Array(o*3);for(let t=0;t<o;t++)c[t*2+0]=(t%e+.5)/e,c[t*2+1]=(Math.floor(t/e)+.5)/e;f=new le,f.setAttribute("position",new q(g,3)),f.setAttribute("aRef",new q(c,2)),f.boundingSphere=new ne(new F,4),p=new ue(f,l),p.frustumCulled=!1,w.add(p),d=0,l.uniforms.uPos.value=n[0].texture,l.uniforms.uPrevPos.value=n[1].texture}C(Number(u.count)||512);const m=new F(999,999,999),G=new ie(329227);let U=u.force??.55;function $(e,o,a){if(a.active){m.set(a.x,a.y,.5).unproject(i),m.sub(i.position).normalize();const t=-i.position.z/m.z;m.multiplyScalar(t).add(i.position),r.uniforms.uPointer.value.copy(m)}r.uniforms.uPointerForce.value+=((a.active?U:0)-r.uniforms.uPointerForce.value)*.06,r.uniforms.uTime.value=e,r.uniforms.uDt.value=o;const c=1-d;r.uniforms.uPos.value=n[d].texture,s.setRenderTarget(n[c]),s.render(y,M),s.setRenderTarget(null),l.uniforms.uPos.value=n[c].texture,l.uniforms.uPrevPos.value=n[d].texture,d=c;const g=e*.07;i.position.x=Math.sin(g)*3.1,i.position.z=Math.cos(g)*3.1,i.position.y=Math.sin(e*.11)*.35,i.lookAt(0,0,0),s.render(w,i)}function O(e){const o=r.uniforms;e.scale!==void 0&&(o.uScale.value=e.scale),e.speed!==void 0&&(o.uSpeed.value=e.speed),e.decay!==void 0&&(o.uDecay.value=e.decay),e.force!==void 0&&(U=e.force),e.size!==void 0&&(l.uniforms.uSize.value=e.size),e.hue!==void 0&&(l.uniforms.uHue.value=e.hue),e.exposure!==void 0&&(l.uniforms.uExposure.value=e.exposure);const a=Number(e.count);Number.isFinite(a)&&a!==D&&C(a)}function I(e,o){i.aspect=e/o,i.updateProjectionMatrix(),l.uniforms.uPixelRatio.value=s.getPixelRatio()}function X(){R(),T.dispose(),r.dispose(),P.dispose(),l.dispose()}return{render:$,resize:I,dispose:X,setParams:O,background:G}}export{we as create,Pe as meta};
