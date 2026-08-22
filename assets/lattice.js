import{p as T,s as I,f as L}from"./glsl.js";import{S as N,f as B,P as V,I as x,c as G,V as d,A as $,M as j,C as _,a as S,b as q,d as E,m as U,n as W}from"./three.module.js";const Y={id:"lattice",title:"Lattice",tags:["instancing","one draw call","hero background"],blurb:"Eighteen thousand billboarded dots drawn in a single instanced call. Height, scale and colour all come out of one fbm field evaluated in the vertex shader, with a travelling swell that follows the pointer. This is the one that actually belongs behind a hero headline. It stays legible under text and costs a single draw call.",stats:{"draw calls":"1","CPU per frame":"3 uniforms"},params:{amp:{label:"Swell height",type:"range",min:.1,max:4,step:.05,value:1.5},size:{label:"Dot size",type:"range",min:.04,max:.32,step:.005,value:.135},speed:{label:"Drift speed",type:"range",min:0,max:.6,step:.01,value:.16},density:{label:"Grid density",type:"select",structural:!0,value:180,options:[{label:"4,500 dots",value:90},{label:"18,000 dots",value:180},{label:"40,500 dots",value:270},{label:"72,000 dots",value:360}]},spacing:{label:"Spacing",type:"range",min:.12,max:.5,step:.005,value:.26},hue:{label:"Hue",type:"range",min:0,max:1,step:.005,value:0}}},J=`
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

  ${I}
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
`,K=`
  precision highp float;

  uniform float uTime;
  uniform float uHue;

  varying float vHeight;
  varying float vRand;
  varying vec2  vLocal;

  ${T}

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
      vec3(0.10, 0.28, 0.52) + uHue
    );

    // Crests pick up a cool highlight, troughs sink toward the background.
    col += vec3(0.40, 0.62, 1.00) * pow(clamp(t, 0.0, 1.0), 4.0) * 0.9;
    col *= mix(0.35, 1.25, t);

    gl_FragColor = vec4(col, alpha * mix(0.35, 1.0, t));
  }
`;function Z({renderer:C,width:M,height:z,params:l={}}){const g=new N,i=new B(38,M/z,.1,200);i.position.set(0,-14,13),i.lookAt(0,1.5,0);let s=Number(l.density)||180,p=Math.round(s*100/180),r=l.spacing??.26;const m=new V(1,1);let v=new x;function b(e){const a=s*p,t=new Float32Array(a*2),c=new Float32Array(a);for(let o=0;o<a;o++){const h=o%s,f=Math.floor(o/s);t[o*2+0]=(h-s/2)*r,t[o*2+1]=(f-p/2)*r,c[o]=Math.random()}e.index=m.index,e.attributes.position=m.attributes.position,e.attributes.uv=m.attributes.uv,e.instanceCount=a,e.setAttribute("aOffset",new S(t,2)),e.setAttribute("aRand",new S(c,1)),e.boundingSphere=new q(new d,200)}b(v);const n=new G({vertexShader:J,fragmentShader:K,transparent:!0,depthWrite:!1,blending:$,uniforms:{uTime:{value:0},uPointer:{value:new d(0,0,0)},uPointerAmount:{value:0},uAmp:{value:l.amp??1.5},uDotSize:{value:l.size??.135},uDrift:{value:l.speed??.16},uHue:{value:l.hue??0}}}),u=new j(v,n);u.frustumCulled=!1,g.add(u);const w=new U,D=new W(new d(0,0,1),0),y=new d,P=new d(0,0,0),A=new E,H=new _(263434);function R(e,a,t){n.uniforms.uTime.value=e,t.active&&(A.set(t.x,t.y),w.setFromCamera(A,i),w.ray.intersectPlane(D,y)&&P.lerp(y,.08)),n.uniforms.uPointer.value.copy(P),n.uniforms.uPointerAmount.value+=((t.active?1:0)-n.uniforms.uPointerAmount.value)*.05,i.position.x=Math.sin(e*.09)*1.6,i.position.y=-14+Math.cos(e*.07)*.8,i.lookAt(0,1.5,0),C.render(g,i)}function k(e,a){i.aspect=e/a,i.updateProjectionMatrix()}function F(){m.dispose(),u.geometry.dispose(),n.dispose()}function O(e){e.amp!==void 0&&(n.uniforms.uAmp.value=e.amp),e.size!==void 0&&(n.uniforms.uDotSize.value=e.size),e.speed!==void 0&&(n.uniforms.uDrift.value=e.speed),e.hue!==void 0&&(n.uniforms.uHue.value=e.hue);const a=Number(e.density),t=e.spacing===void 0?r:Number(e.spacing),c=Number.isFinite(a)&&a!==s,o=Number.isFinite(t)&&t!==r;if(c||o){c&&(s=a,p=Math.round(s*100/180)),o&&(r=t);const h=u.geometry,f=new x;b(f),u.geometry=f,v=f,h.dispose()}}return{render:R,resize:k,dispose:F,setParams:O,background:H}}export{Z as create,Y as meta};
