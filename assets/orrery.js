import{S as Z,i as $,C as q,B as _,j as f,L as ee,A as j,o as te,b as V,V as B,c as G,k as O,d as oe}from"./three.module.js";const z=[{name:"Mercury",colour:10260358,size:.55,a:[.38709927,37e-8],e:[.20563593,1906e-8],I:[7.00497902,-.00594749],L:[252.2503235,149472.67411175],lp:[77.45779628,.16047689],an:[48.33076593,-.12534081]},{name:"Venus",colour:14928282,size:.85,a:[.72333566,39e-7],e:[.00677672,-4107e-8],I:[3.39467605,-7889e-7],L:[181.9790995,58517.81538729],lp:[131.60246718,.00268329],an:[76.67984255,-.27769418]},{name:"Earth",colour:7317724,size:.9,a:[1.00000261,562e-8],e:[.01671123,-4392e-8],I:[-1531e-8,-.01294668],L:[100.46457166,35999.37244981],lp:[102.93768193,.32327364],an:[0,0]},{name:"Mars",colour:12673855,size:.7,a:[1.52371034,1847e-8],e:[.0933941,7882e-8],I:[1.84969142,-.00813131],L:[-4.55343205,19140.30268499],lp:[-23.94362959,.44441088],an:[49.55953891,-.29257343]},{name:"Jupiter",colour:14198904,size:1.9,a:[5.202887,-11607e-8],e:[.04838624,-13253e-8],I:[1.30439695,-.00183714],L:[34.39644051,3034.74612775],lp:[14.72847983,.21252668],an:[100.47390909,.20469106]},{name:"Saturn",colour:14729331,size:1.7,a:[9.53667594,-.0012506],e:[.05386179,-50991e-8],I:[2.48599187,.00193609],L:[49.95424423,1222.49362201],lp:[92.59887831,-.41897216],an:[113.66242448,-.28867794]},{name:"Uranus",colour:9425880,size:1.35,a:[19.18916464,-.00196176],e:[.04725744,-4397e-8],I:[.77263783,-.00242939],L:[313.23810451,428.48202785],lp:[170.9542763,.40805281],an:[74.01692503,.04240589]},{name:"Neptune",colour:5996500,size:1.3,a:[30.06992276,26291e-8],e:[.00859048,5105e-8],I:[1.77004347,35372e-8],L:[-55.12002969,218.45945325],lp:[44.96476227,-.32241464],an:[131.78422574,-.00508664]}],h=Math.PI/180;function ae(e){return(e.getTime()/864e5+24405875e-1-2451545)/36525}function U(e,t){return{a:e.a[0]+e.a[1]*t,e:e.e[0]+e.e[1]*t,I:e.I[0]+e.I[1]*t,L:e.L[0]+e.L[1]*t,lp:e.lp[0]+e.lp[1]*t,an:e.an[0]+e.an[1]*t}}function ne(e){let t=e%360;return t>180&&(t-=360),t<-180&&(t+=360),t}function se(e,t){const a=180/Math.PI*t;let o=e+a*Math.sin(e*h);for(let n=0;n<12;n++){const s=(e-(o-a*Math.sin(o*h)))/(1-t*Math.cos(o*h));if(o+=s,Math.abs(s)<1e-7)break}return o}function N(e,t,a){const o=e.lp-e.an,n=Math.cos(o*h),c=Math.sin(o*h),s=Math.cos(e.an*h),r=Math.sin(e.an*h),d=Math.cos(e.I*h),m=Math.sin(e.I*h);return{x:(n*s-c*r*d)*t+(-c*s-n*r*d)*a,y:(n*r+c*s*d)*t+(-c*r+n*s*d)*a,z:c*m*t+n*m*a}}function re(e,t){const a=U(e,t),o=ne(a.L-a.lp),n=se(o,a.e),c=a.a*(Math.cos(n*h)-a.e),s=a.a*Math.sqrt(1-a.e*a.e)*Math.sin(n*h),r=N(a,c,s);return r.r=Math.hypot(r.x,r.y,r.z),r}function ie(e,t,a=256){const o=U(e,t),n=o.a*Math.sqrt(1-o.e*o.e),c=[];for(let s=0;s<a;s++){const r=s/a*360,d=o.a*(Math.cos(r*h)-o.e),m=n*Math.sin(r*h);c.push(N(o,d,m))}return c}const ce=45,le=1.6,T=e=>Math.sqrt(e)*le,W=new Date,pe={id:"orrery",title:"Orrery",tags:["nasa/jpl data","kepler","real positions"],blurb:"The actual solar system, not an impression of one. Every position comes from JPL’s Keplerian elements, solved through Kepler’s equation and rotated into the J2000 ecliptic, so the planets start exactly where they are today. The orbits carry their real shapes, tilts and relative periods. Radial distance is square-rooted and the bodies are not to scale, or Mercury would sit inside the Sun’s glare.",stats:{epoch:W.toISOString().slice(0,10),source:"JPL SSD","draw calls":"3"}},J=`
  precision highp float;
  attribute float aSize;
  attribute vec3 aColour;
  uniform float uPixelRatio;
  varying vec3 vColour;
  void main(){
    vColour = aColour;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * 130.0 / max(-mv.z, 0.001);
  }
`,ue=`
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
`,he=`
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
`;function fe({renderer:e,width:t,height:a}){const o=new Z,n=new $(45,t/a,.1,400),c=ae(W),s=[],r=[];for(const i of z){const l=ie(i,c,320),u=new q(i.colour);for(let y=0;y<l.length;y++){const E=l[y],F=l[(y+1)%l.length];for(const p of[E,F]){const P=Math.hypot(p.x,p.y,p.z),x=T(P)/P;s.push(p.x*x,p.y*x,p.z*x),r.push(u.r*.8,u.g*.8,u.b*.8)}}}const d=new _;d.setAttribute("position",new f(new Float32Array(s),3)),d.setAttribute("color",new f(new Float32Array(r),3));const m=new ee({vertexColors:!0,transparent:!0,opacity:.7,blending:j,depthWrite:!1});o.add(new te(d,m));const C=z.length,M=new Float32Array(C*3),S=new Float32Array(C*3),D=new Float32Array(C);z.forEach((i,l)=>{const u=new q(i.colour);S[l*3+0]=u.r,S[l*3+1]=u.g,S[l*3+2]=u.b,D[l]=i.size});const g=new _,L=new f(M,3);L.setUsage(35048),g.setAttribute("position",L),g.setAttribute("aColour",new f(S,3)),g.setAttribute("aSize",new f(D,1)),g.boundingSphere=new V(new B,40);const I=new G({vertexShader:J,fragmentShader:ue,transparent:!0,depthWrite:!1,blending:j,uniforms:{uPixelRatio:{value:e.getPixelRatio()}}});o.add(new O(g,I));const v=new _;v.setAttribute("position",new f(new Float32Array(3),3)),v.setAttribute("aSize",new f(new Float32Array([3.4]),1)),v.setAttribute("aColour",new f(new Float32Array([1,1,1]),3)),v.boundingSphere=new V(new B,1);const A=new G({vertexShader:J,fragmentShader:he,transparent:!0,depthWrite:!1,blending:j,uniforms:{uPixelRatio:{value:e.getPixelRatio()},uTime:{value:0}}});o.add(new O(v,A));const w=new oe(0,0),K=new q(197642);function H(i,l,u){const y=c+i*ce/36525;z.forEach((X,R)=>{const b=re(X,y),k=T(b.r)/b.r;M[R*3+0]=b.x*k,M[R*3+1]=b.y*k,M[R*3+2]=b.z*k}),L.needsUpdate=!0,A.uniforms.uTime.value=i;const E=u.active?u.x:0,F=u.active?u.y:0;w.x+=(E-w.x)*.04,w.y+=(F-w.y)*.04;const p=i*.045+w.x*.7,P=6.8+w.y*4.5,x=16;n.position.set(Math.sin(p)*x,Math.cos(p)*x,P),n.up.set(0,0,1),n.lookAt(0,0,0),e.render(o,n)}function Y(i,l){n.aspect=i/l;const u=i>760?-i*.17:0;n.setViewOffset(i,l,u,0,i,l),n.updateProjectionMatrix(),I.uniforms.uPixelRatio.value=e.getPixelRatio(),A.uniforms.uPixelRatio.value=e.getPixelRatio()}function Q(){d.dispose(),m.dispose(),g.dispose(),I.dispose(),v.dispose(),A.dispose()}return{render:H,resize:Y,dispose:Q,background:K}}export{fe as create,pe as meta};
