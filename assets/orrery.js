import{S as ae,f as ne,B as q,L as se,A as D,o as ie,C as _,j as m,b as N,V as T,c as J,k as U,d as re}from"./three.module.js";const I=[{name:"Mercury",colour:10260358,size:.55,a:[.38709927,37e-8],e:[.20563593,1906e-8],I:[7.00497902,-.00594749],L:[252.2503235,149472.67411175],lp:[77.45779628,.16047689],an:[48.33076593,-.12534081]},{name:"Venus",colour:14928282,size:.85,a:[.72333566,39e-7],e:[.00677672,-4107e-8],I:[3.39467605,-7889e-7],L:[181.9790995,58517.81538729],lp:[131.60246718,.00268329],an:[76.67984255,-.27769418]},{name:"Earth",colour:7317724,size:.9,a:[1.00000261,562e-8],e:[.01671123,-4392e-8],I:[-1531e-8,-.01294668],L:[100.46457166,35999.37244981],lp:[102.93768193,.32327364],an:[0,0]},{name:"Mars",colour:12673855,size:.7,a:[1.52371034,1847e-8],e:[.0933941,7882e-8],I:[1.84969142,-.00813131],L:[-4.55343205,19140.30268499],lp:[-23.94362959,.44441088],an:[49.55953891,-.29257343]},{name:"Jupiter",colour:14198904,size:1.9,a:[5.202887,-11607e-8],e:[.04838624,-13253e-8],I:[1.30439695,-.00183714],L:[34.39644051,3034.74612775],lp:[14.72847983,.21252668],an:[100.47390909,.20469106]},{name:"Saturn",colour:14729331,size:1.7,a:[9.53667594,-.0012506],e:[.05386179,-50991e-8],I:[2.48599187,.00193609],L:[49.95424423,1222.49362201],lp:[92.59887831,-.41897216],an:[113.66242448,-.28867794]},{name:"Uranus",colour:9425880,size:1.35,a:[19.18916464,-.00196176],e:[.04725744,-4397e-8],I:[.77263783,-.00242939],L:[313.23810451,428.48202785],lp:[170.9542763,.40805281],an:[74.01692503,.04240589]},{name:"Neptune",colour:5996500,size:1.3,a:[30.06992276,26291e-8],e:[.00859048,5105e-8],I:[1.77004347,35372e-8],L:[-55.12002969,218.45945325],lp:[44.96476227,-.32241464],an:[131.78422574,-.00508664]}],d=Math.PI/180;function le(e){return(e.getTime()/864e5+24405875e-1-2451545)/36525}function K(e,t){return{a:e.a[0]+e.a[1]*t,e:e.e[0]+e.e[1]*t,I:e.I[0]+e.I[1]*t,L:e.L[0]+e.L[1]*t,lp:e.lp[0]+e.lp[1]*t,an:e.an[0]+e.an[1]*t}}function ce(e){let t=e%360;return t>180&&(t-=360),t<-180&&(t+=360),t}function ue(e,t){const n=180/Math.PI*t;let a=e+n*Math.sin(e*d);for(let i=0;i<12;i++){const l=(e-(a-n*Math.sin(a*d)))/(1-t*Math.cos(a*d));if(a+=l,Math.abs(l)<1e-7)break}return a}function Y(e,t,n){const a=e.lp-e.an,i=Math.cos(a*d),s=Math.sin(a*d),l=Math.cos(e.an*d),r=Math.sin(e.an*d),p=Math.cos(e.I*d),h=Math.sin(e.I*d);return{x:(i*l-s*r*p)*t+(-s*l-i*r*p)*n,y:(i*r+s*l*p)*t+(-s*r+i*l*p)*n,z:s*h*t+i*h*n}}function de(e,t){const n=K(e,t),a=ce(n.L-n.lp),i=ue(a,n.e),s=n.a*(Math.cos(i*d)-n.e),l=n.a*Math.sqrt(1-n.e*n.e)*Math.sin(i*d),r=Y(n,s,l);return r.r=Math.hypot(r.x,r.y,r.z),r}function pe(e,t,n=256){const a=K(e,t),i=a.a*Math.sqrt(1-a.e*a.e),s=[];for(let l=0;l<n;l++){const r=l/n*360,p=a.a*(Math.cos(r*d)-a.e),h=i*Math.sin(r*d);s.push(Y(a,p,h))}return s}const he=45,W=(e,t)=>Math.sqrt(e)*t,Q=new Date,ve={id:"orrery",title:"Orrery",tags:["nasa/jpl data","kepler","real positions"],blurb:"The actual solar system, not an impression of one. Every position comes from JPL’s Keplerian elements, solved through Kepler’s equation and rotated into the J2000 ecliptic, so the planets start exactly where they are today. The orbits carry their real shapes, tilts and relative periods. Radial distance is square-rooted and the bodies are not to scale, or Mercury would sit inside the Sun’s glare.",stats:{epoch:Q.toISOString().slice(0,10),source:"JPL SSD","draw calls":"3"},params:{speed:{label:"Days per second",type:"range",min:0,max:400,step:1,value:45},size:{label:"Body size",type:"range",min:40,max:320,step:1,value:130},zoom:{label:"Camera distance",type:"range",min:9,max:30,step:.1,value:16},elevation:{label:"Camera height",type:"range",min:.5,max:16,step:.1,value:6.8},orbits:{label:"Orbit lines",type:"range",min:0,max:1,step:.01,value:.7},spread:{label:"Distance spread",type:"range",min:1,max:2.6,step:.02,value:1.6}}},H=`
  precision highp float;
  attribute float aSize;
  attribute vec3 aColour;
  uniform float uPixelRatio;
  uniform float uBodyScale;
  varying vec3 vColour;
  void main(){
    vColour = aColour;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * uBodyScale / max(-mv.z, 0.001);
  }
`,fe=`
  precision highp float;
  varying vec3 vColour;
  void main(){
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q) * 2.0;
    if (r > 1.0) discard;
    // Solid core with a soft halo, so small bodies still read at distance.
    float core = (1.0 - smoothstep(0.30, 0.55, r));
    float halo = (1.0 - smoothstep(0.0, 1.0, r)) * 0.5;
    vec3 col = vColour * (core * 1.6 + halo * 1.5);
    gl_FragColor = vec4(col, min(1.0, core + halo * 1.2));
  }
`,me=`
  precision highp float;
  uniform float uTime;
  void main(){
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q) * 2.0;
    if (r > 1.0) discard;
    float core = (1.0 - smoothstep(0.0, 0.22, r));
    float halo = pow((1.0 - smoothstep(0.0, 1.0, r)), 2.2);
    // Barely-there breathing so the star does not look like a dead sprite.
    float pulse = 0.94 + 0.06 * sin(uTime * 0.7);
    vec3 col = mix(vec3(1.0, 0.72, 0.32), vec3(1.0, 0.97, 0.88), core);
    gl_FragColor = vec4(col * (core * 2.2 + halo * 1.1) * pulse, core + halo * 0.85);
  }
`;function ge({renderer:e,width:t,height:n,params:a={}}){const i=new ae,s=new ne(45,t/n,.1,400),l=le(Q);let r=a.spread??1.6,p=a.elevation??6.8;const h=new q;function j(){const o=[],c=[];for(const u of I){const b=pe(u,l,320),x=new _(u.colour);for(let w=0;w<b.length;w++)for(const f of[b[w],b[(w+1)%b.length]]){const L=Math.hypot(f.x,f.y,f.z),S=W(L,r)/L;o.push(f.x*S,f.y*S,f.z*S),c.push(x.r*.8,x.g*.8,x.b*.8)}}h.setAttribute("position",new m(new Float32Array(o),3)),h.setAttribute("color",new m(new Float32Array(c),3))}j();const E=new se({vertexColors:!0,transparent:!0,opacity:a.orbits??.7,blending:D,depthWrite:!1});i.add(new ie(h,E));const B=I.length,P=new Float32Array(B*3),A=new Float32Array(B*3),O=new Float32Array(B);I.forEach((o,c)=>{const u=new _(o.colour);A[c*3+0]=u.r,A[c*3+1]=u.g,A[c*3+2]=u.b,O[c]=o.size});const y=new q,F=new m(P,3);F.setUsage(35048),y.setAttribute("position",F),y.setAttribute("aColour",new m(A,3)),y.setAttribute("aSize",new m(O,1)),y.boundingSphere=new N(new T,40);const C=new J({vertexShader:H,fragmentShader:fe,transparent:!0,depthWrite:!1,blending:D,uniforms:{uPixelRatio:{value:e.getPixelRatio()},uBodyScale:{value:a.size??130}}});i.add(new U(y,C));const v=new q;v.setAttribute("position",new m(new Float32Array(3),3)),v.setAttribute("aSize",new m(new Float32Array([3.4]),1)),v.setAttribute("aColour",new m(new Float32Array([1,1,1]),3)),v.boundingSphere=new N(new T,1);const M=new J({vertexShader:H,fragmentShader:me,transparent:!0,depthWrite:!1,blending:D,uniforms:{uPixelRatio:{value:e.getPixelRatio()},uBodyScale:{value:a.size??130},uTime:{value:0}}});i.add(new U(v,M));const g=new re(0,0);let V=a.speed??he,G=a.zoom??16;const X=new _(197642);function Z(o,c,u){const b=l+o*V/36525;I.forEach((oe,R)=>{const z=de(oe,b),k=W(z.r,r)/z.r;P[R*3+0]=z.x*k,P[R*3+1]=z.y*k,P[R*3+2]=z.z*k}),F.needsUpdate=!0,M.uniforms.uTime.value=o;const x=u.active?u.x:0,w=u.active?u.y:0;g.x+=(x-g.x)*.04,g.y+=(w-g.y)*.04;const f=o*.045+g.x*.7,L=p+g.y*4.5,S=G;s.position.set(Math.sin(f)*S,Math.cos(f)*S,L),s.up.set(0,0,1),s.lookAt(0,0,0),e.render(i,s)}function $(o,c){s.aspect=o/c;const u=o>760?-o*.17:0;s.setViewOffset(o,c,u,0,o,c),s.updateProjectionMatrix(),C.uniforms.uPixelRatio.value=e.getPixelRatio(),M.uniforms.uPixelRatio.value=e.getPixelRatio()}function ee(){h.dispose(),E.dispose(),y.dispose(),C.dispose(),v.dispose(),M.dispose()}function te(o){o.speed!==void 0&&(V=o.speed),o.zoom!==void 0&&(G=o.zoom),o.size!==void 0&&(C.uniforms.uBodyScale.value=o.size,M.uniforms.uBodyScale.value=o.size),o.elevation!==void 0&&(p=o.elevation),o.orbits!==void 0&&(E.opacity=o.orbits);const c=Number(o.spread);Number.isFinite(c)&&c!==r&&(r=c,j())}return{render:Z,resize:$,dispose:ee,setParams:te,background:X}}export{ge as create,ve as meta};
