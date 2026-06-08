"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[2003],{13553:(e,t,n)=>{n.d(t,{p:()=>c});var o=n(95155),i=n(12115),r=n(87548),a=n(76566),l=n(30497),s=n(88979);function c(){let e=(0,a.zz)(e=>e.voxels),t=(0,a.zz)(e=>e.selectedInstanceId);(0,s.jy)(e=>e.revision),(0,a.WI)();let n=(0,i.useMemo)(()=>{let t=new Map;for(let n of Object.values(e)){t.has(n.type)||t.set(n.type,[]);let e=(0,l.gd)(n.type);if(!e)continue;let o=new r.Matrix4,[i,a,s]=e.size,c=n.position.x+i/2,u=n.position.y+a/2,f=n.position.z+s/2;o.compose(new r.Vector3(c,u,f),new r.Quaternion,new r.Vector3(i,a,s)),t.get(n.type).push(o)}return t},[e]),c=(0,l._G)();return(0,o.jsxs)("group",{children:[c.map(e=>{var t;let i=null!=(t=n.get(e.id))?t:[];return 0===i.length?null:(0,o.jsx)(u,{def:e,matrices:i},e.id)}),t&&(0,o.jsx)(f,{instanceId:t})]})}function u(e){let{def:t,matrices:n}=e,l=(0,i.useRef)(null),s=(0,a.zz)(e=>e.setSelected);(0,i.useEffect)(()=>{if(!l.current)return;let e=l.current;e.count=n.length;for(let t=0;t<n.length;t++)e.setMatrixAt(t,n[t]);e.instanceMatrix.needsUpdate=!0},[n]);let c=(0,i.useMemo)(()=>"network"===t.category?new r.Color(t.color).multiplyScalar(.15):"safety"===t.category?new r.Color(t.color).multiplyScalar(.1):new r.Color("#000000"),[t.category,t.color]);return(0,o.jsxs)("instancedMesh",{ref:l,args:[void 0,void 0,n.length],castShadow:!0,receiveShadow:!0,onClick:e=>{if(e.stopPropagation(),void 0===e.instanceId)return;let n=Object.keys(a.zz.getState().voxels).filter(e=>{var n;return(null==(n=a.zz.getState().voxels[e])?void 0:n.type)===t.id})[e.instanceId];n&&s(n)},children:[(0,o.jsx)("boxGeometry",{args:[1,1,1]}),(0,o.jsx)("meshStandardMaterial",{color:t.color,roughness:.7,metalness:.2,emissive:c,emissiveIntensity:1})]})}function f(e){let{instanceId:t}=e,n=(0,a.zz)(e=>e.voxels[t]);if(!n)return null;let i=(0,l.gd)(n.type);if(!i)return null;let[r,s,c]=i.size;return(0,o.jsxs)("mesh",{position:[n.position.x+r/2,n.position.y+s/2,n.position.z+c/2],scale:[r+.05,s+.05,c+.05],children:[(0,o.jsx)("boxGeometry",{args:[1,1,1]}),(0,o.jsx)("meshBasicMaterial",{color:"#fbbf24",wireframe:!0})]})}},22003:(e,t,n)=>{n.r(t),n.d(t,{BuilderCanvas:()=>b});var o=n(95155),i=n(30258),r=n(88945),a=n(12115),l=n(83388),s=n(87548);let c=a.forwardRef((e,t)=>{let{envMap:n,resolution:o=256,frames:i=1/0,makeDefault:c,children:u,...f}=e,d=(0,l.C)(e=>{let{set:t}=e;return t}),m=(0,l.C)(e=>{let{camera:t}=e;return t}),v=(0,l.C)(e=>{let{size:t}=e;return t}),h=a.useRef(null);a.useImperativeHandle(t,()=>h.current,[]);let g=a.useRef(null),p=function(e,t,n){let o=(0,l.C)(e=>e.size),i=(0,l.C)(e=>e.viewport),r="number"==typeof e?e:o.width*i.dpr,c=o.height*i.dpr,u=("number"==typeof e?void 0:e)||{},{samples:f=0,depth:d,...m}=u,v=null!=d?d:u.depthBuffer,h=a.useMemo(()=>{let e=new s.WebGLRenderTarget(r,c,{minFilter:s.LinearFilter,magFilter:s.LinearFilter,type:s.HalfFloatType,...m});return v&&(e.depthTexture=new s.DepthTexture(r,c,s.FloatType)),e.samples=f,e},[]);return a.useLayoutEffect(()=>{h.setSize(r,c),f&&(h.samples=f)},[f,h,r,c]),a.useEffect(()=>()=>h.dispose(),[]),h}(o);a.useLayoutEffect(()=>{f.manual||(h.current.aspect=v.width/v.height)},[v,f]),a.useLayoutEffect(()=>{h.current.updateProjectionMatrix()});let w=0,y=null,x="function"==typeof u;return(0,l.D)(e=>{x&&(i===1/0||w<i)&&(g.current.visible=!1,e.gl.setRenderTarget(p),y=e.scene.background,n&&(e.scene.background=n),e.gl.render(e.scene,h.current),e.scene.background=y,e.gl.setRenderTarget(null),g.current.visible=!0,w++)}),a.useLayoutEffect(()=>{if(c)return d(()=>({camera:h.current})),()=>d(()=>({camera:m}))},[h,c,d]),a.createElement(a.Fragment,null,a.createElement("perspectiveCamera",(0,r.A)({ref:h},f),!x&&u),a.createElement("group",{ref:g},x&&u(p.texture)))});var u=n(16750);let f=parseInt(s.REVISION.replace(/\D+/g,"")),d=function(e,t,n,o){var i;return(i=class extends s.ShaderMaterial{constructor(o){for(let i in super({vertexShader:t,fragmentShader:n,...o}),e)this.uniforms[i]=new s.Uniform(e[i]),Object.defineProperty(this,i,{get(){return this.uniforms[i].value},set(e){this.uniforms[i].value=e}});this.uniforms=s.UniformsUtils.clone(this.uniforms)}}).key=s.MathUtils.generateUUID(),i}({cellSize:.5,sectionSize:1,fadeDistance:100,fadeStrength:1,fadeFrom:1,cellThickness:.5,sectionThickness:1,cellColor:new s.Color,sectionColor:new s.Color,infiniteGrid:!1,followCamera:!1,worldCamProjPosition:new s.Vector3,worldPlanePosition:new s.Vector3},"\n    varying vec3 localPosition;\n    varying vec4 worldPosition;\n\n    uniform vec3 worldCamProjPosition;\n    uniform vec3 worldPlanePosition;\n    uniform float fadeDistance;\n    uniform bool infiniteGrid;\n    uniform bool followCamera;\n\n    void main() {\n      localPosition = position.xzy;\n      if (infiniteGrid) localPosition *= 1.0 + fadeDistance;\n      \n      worldPosition = modelMatrix * vec4(localPosition, 1.0);\n      if (followCamera) {\n        worldPosition.xyz += (worldCamProjPosition - worldPlanePosition);\n        localPosition = (inverse(modelMatrix) * worldPosition).xyz;\n      }\n\n      gl_Position = projectionMatrix * viewMatrix * worldPosition;\n    }\n  ","\n    varying vec3 localPosition;\n    varying vec4 worldPosition;\n\n    uniform vec3 worldCamProjPosition;\n    uniform float cellSize;\n    uniform float sectionSize;\n    uniform vec3 cellColor;\n    uniform vec3 sectionColor;\n    uniform float fadeDistance;\n    uniform float fadeStrength;\n    uniform float fadeFrom;\n    uniform float cellThickness;\n    uniform float sectionThickness;\n\n    float getGrid(float size, float thickness) {\n      vec2 r = localPosition.xz / size;\n      vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);\n      float line = min(grid.x, grid.y) + 1.0 - thickness;\n      return 1.0 - min(line, 1.0);\n    }\n\n    void main() {\n      float g1 = getGrid(cellSize, cellThickness);\n      float g2 = getGrid(sectionSize, sectionThickness);\n\n      vec3 from = worldCamProjPosition*vec3(fadeFrom);\n      float dist = distance(from, worldPosition.xyz);\n      float d = 1.0 - min(dist / fadeDistance, 1.0);\n      vec3 color = mix(cellColor, sectionColor, min(1.0, sectionThickness * g2));\n\n      gl_FragColor = vec4(color, (g1 + g2) * pow(d, fadeStrength));\n      gl_FragColor.a = mix(0.75 * gl_FragColor.a, gl_FragColor.a, g2);\n      if (gl_FragColor.a <= 0.0) discard;\n\n      #include <tonemapping_fragment>\n      #include <".concat(f>=154?"colorspace_fragment":"encodings_fragment",">\n    }\n  ")),m=a.forwardRef((e,t)=>{let{args:n,cellColor:o="#000000",sectionColor:i="#2080ff",cellSize:c=.5,sectionSize:u=1,followCamera:f=!1,infiniteGrid:m=!1,fadeDistance:v=100,fadeStrength:h=1,fadeFrom:g=1,cellThickness:p=.5,sectionThickness:w=1,side:y=s.BackSide,...x}=e;(0,l.e)({GridMaterial:d});let z=a.useRef(null);a.useImperativeHandle(t,()=>z.current,[]);let P=new s.Plane,S=new s.Vector3(0,1,0),C=new s.Vector3(0,0,0);return(0,l.D)(e=>{P.setFromNormalAndCoplanarPoint(S,C).applyMatrix4(z.current.matrixWorld);let t=z.current.material,n=t.uniforms.worldCamProjPosition,o=t.uniforms.worldPlanePosition;P.projectPoint(e.camera.position,n.value),o.value.set(0,0,0).applyMatrix4(z.current.matrixWorld)}),a.createElement("mesh",(0,r.A)({ref:z,frustumCulled:!1},x),a.createElement("gridMaterial",(0,r.A)({transparent:!0,"extensions-derivatives":!0,side:y},{cellSize:c,sectionSize:u,cellColor:o,sectionColor:i,cellThickness:p,sectionThickness:w},{fadeDistance:v,fadeStrength:h,fadeFrom:g,infiniteGrid:m,followCamera:f})),a.createElement("planeGeometry",{args:n}))});var v=n(76566),h=n(13553),g=n(30497);function p(){let{camera:e,gl:t}=(0,l.C)(),[n,i]=(0,a.useState)(!0),[r,c]=(0,a.useState)(new s.Vector3(0,0,0)),[u,f]=(0,a.useState)([1,1,1]),[d,m]=(0,a.useState)("#22c55e"),h=(0,v.zz)(e=>e.activeBlockType),p=(0,v.zz)(e=>e.rotation),w=(0,v.zz)(e=>e.placeBlock);(0,v.zz)(e=>e.hoveredCell);let y=(0,v.zz)(e=>e.setHoveredCell),x=(0,v.zz)(e=>e.gridSize),z=(0,v.zz)(e=>e.byCell),P=(0,a.useRef)(new s.Raycaster),S=(0,a.useRef)(new s.Plane(new s.Vector3(0,1,0),0)),C=(0,a.useRef)(new s.Vector2(0,0)),M=(0,a.useRef)(null);return((0,a.useEffect)(()=>{if(!h)return;let e=(0,g.gd)(h);if(!e)return;let[t,n,o]=e.size;p%2==1&&([t,o]=[o,t]),f([t,n,o]),m(e.color)},[h,p]),(0,a.useEffect)(()=>{let e=t.domElement;function n(t){let n=e.getBoundingClientRect();C.current.x=(t.clientX-n.left)/n.width*2-1,C.current.y=-(2*((t.clientY-n.top)/n.height))+1}function o(e){if(!h||0!==e.button)return;let t=v.zz.getState().hoveredCell;if(!t)return;let n=w(h,t,p);n.ok||console.warn("Placement failed:",n.reason)}function i(e){if("Escape"===e.key&&v.zz.getState().setActiveBlockType(null),"r"===e.key||"R"===e.key){let e=v.zz.getState().rotation;v.zz.getState().setRotation((e+1)%4)}}return e.addEventListener("mousemove",n),e.addEventListener("click",o),e.addEventListener("keydown",i),()=>{e.removeEventListener("mousemove",n),e.removeEventListener("click",o),e.removeEventListener("keydown",i)}},[t,h,p,w]),(0,l.D)(()=>{var t;if(!h)return void y(null);P.current.setFromCamera(C.current,e);let n=P.current.intersectObject(null!=(t=e.parent)?t:new s.Object3D,!0);if(0===n.length){let e=new s.Vector3;if(P.current.ray.intersectPlane(S.current,e),!e)return;let t=Math.floor(e.x+x.w/2),n=Math.floor(e.z+x.d/2);return t<0||t>=x.w||n<0||n>=x.d?void i(!1):(c(new s.Vector3(t+u[0]/2,0+u[1]/2,n+u[2]/2)),y({x:t,y:0,z:n}),void i(!0))}let o=n[0],r=Math.floor(o.point.x+x.w/2),a=Math.floor(o.point.z+x.d/2),l=Math.max(0,Math.floor(o.point.y));c(new s.Vector3(r+u[0]/2,l+u[1]/2,a+u[2]/2)),y({x:r,y:l,z:a});let f=!0;for(let e=0;e<u[0];e++)for(let t=0;t<u[1];t++)for(let n=0;n<u[2];n++)if(z["".concat(r+e,",").concat(l+t,",").concat(a+n)]){f=!1;break}i(f)}),h)?(0,o.jsxs)("mesh",{ref:M,position:r,scale:u,renderOrder:999,children:[(0,o.jsx)("boxGeometry",{args:[1,1,1]}),(0,o.jsx)("meshBasicMaterial",{color:n?"#22c55e":"#ef4444",transparent:!0,opacity:.35,wireframe:!n})]}):null}let w=parseInt(s.REVISION.replace(/\D+/g,""));var y=Object.defineProperty,x=(e,t,n)=>(((e,t,n)=>t in e?y(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n)(e,"symbol"!=typeof t?t+"":t,n),n);let z=(()=>{let e={uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new s.Vector3},up:{value:new s.Vector3(0,1,0)}},vertexShader:`
      uniform vec3 sunPosition;
      uniform float rayleigh;
      uniform float turbidity;
      uniform float mieCoefficient;
      uniform vec3 up;

      varying vec3 vWorldPosition;
      varying vec3 vSunDirection;
      varying float vSunfade;
      varying vec3 vBetaR;
      varying vec3 vBetaM;
      varying float vSunE;

      // constants for atmospheric scattering
      const float e = 2.71828182845904523536028747135266249775724709369995957;
      const float pi = 3.141592653589793238462643383279502884197169;

      // wavelength of used primaries, according to preetham
      const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
      // this pre-calcuation replaces older TotalRayleigh(vec3 lambda) function:
      // (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
      const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

      // mie stuff
      // K coefficient for the primaries
      const float v = 4.0;
      const vec3 K = vec3( 0.686, 0.678, 0.666 );
      // MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
      const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

      // earth shadow hack
      // cutoffAngle = pi / 1.95;
      const float cutoffAngle = 1.6110731556870734;
      const float steepness = 1.5;
      const float EE = 1000.0;

      float sunIntensity( float zenithAngleCos ) {
        zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
        return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
      }

      vec3 totalMie( float T ) {
        float c = ( 0.2 * T ) * 10E-18;
        return 0.434 * c * MieConst;
      }

      void main() {

        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
        vWorldPosition = worldPosition.xyz;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        gl_Position.z = gl_Position.w; // set z to camera.far

        vSunDirection = normalize( sunPosition );

        vSunE = sunIntensity( dot( vSunDirection, up ) );

        vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

        float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

      // extinction (absorbtion + out scattering)
      // rayleigh coefficients
        vBetaR = totalRayleigh * rayleighCoefficient;

      // mie coefficients
        vBetaM = totalMie( turbidity ) * mieCoefficient;

      }
    `,fragmentShader:`
      varying vec3 vWorldPosition;
      varying vec3 vSunDirection;
      varying float vSunfade;
      varying vec3 vBetaR;
      varying vec3 vBetaM;
      varying float vSunE;

      uniform float mieDirectionalG;
      uniform vec3 up;

      const vec3 cameraPos = vec3( 0.0, 0.0, 0.0 );

      // constants for atmospheric scattering
      const float pi = 3.141592653589793238462643383279502884197169;

      const float n = 1.0003; // refractive index of air
      const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

      // optical length at zenith for molecules
      const float rayleighZenithLength = 8.4E3;
      const float mieZenithLength = 1.25E3;
      // 66 arc seconds -> degrees, and the cosine of that
      const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

      // 3.0 / ( 16.0 * pi )
      const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
      // 1.0 / ( 4.0 * pi )
      const float ONE_OVER_FOURPI = 0.07957747154594767;

      float rayleighPhase( float cosTheta ) {
        return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
      }

      float hgPhase( float cosTheta, float g ) {
        float g2 = pow( g, 2.0 );
        float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
        return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
      }

      void main() {

        vec3 direction = normalize( vWorldPosition - cameraPos );

      // optical length
      // cutoff angle at 90 to avoid singularity in next formula.
        float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
        float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
        float sR = rayleighZenithLength * inverse;
        float sM = mieZenithLength * inverse;

      // combined extinction factor
        vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

      // in scattering
        float cosTheta = dot( direction, vSunDirection );

        float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
        vec3 betaRTheta = vBetaR * rPhase;

        float mPhase = hgPhase( cosTheta, mieDirectionalG );
        vec3 betaMTheta = vBetaM * mPhase;

        vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
        Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

      // nightsky
        float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
        float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
        vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
        vec3 L0 = vec3( 0.1 ) * Fex;

      // composition + solar disc
        float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
        L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

        vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

        vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );

        gl_FragColor = vec4( retColor, 1.0 );

      #include <tonemapping_fragment>
      #include <${w>=154?"colorspace_fragment":"encodings_fragment"}>

      }
    `},t=new s.ShaderMaterial({name:"SkyShader",fragmentShader:e.fragmentShader,vertexShader:e.vertexShader,uniforms:s.UniformsUtils.clone(e.uniforms),side:s.BackSide,depthWrite:!1});class n extends s.Mesh{constructor(){super(new s.BoxGeometry(1,1,1),t)}}return x(n,"SkyShader",e),x(n,"material",t),n})(),P=a.forwardRef((e,t)=>{let{inclination:n=.6,azimuth:o=.1,distance:i=1e3,mieCoefficient:l=.005,mieDirectionalG:c=.8,rayleigh:u=.5,turbidity:f=10,sunPosition:d=function(e,t){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:new s.Vector3,o=Math.PI*(e-.5),i=2*Math.PI*(t-.5);return n.x=Math.cos(i),n.y=Math.sin(o),n.z=Math.sin(i),n}(n,o),...m}=e,v=a.useMemo(()=>new s.Vector3().setScalar(i),[i]),[h]=a.useState(()=>new z);return a.createElement("primitive",(0,r.A)({object:h,ref:t,"material-uniforms-mieCoefficient-value":l,"material-uniforms-mieDirectionalG-value":c,"material-uniforms-rayleigh-value":u,"material-uniforms-sunPosition-value":d,"material-uniforms-turbidity-value":f,scale:v},m))});function S(){let e=(0,v.zz)(e=>e.gridSize),t=(0,a.useMemo)(()=>new s.PlaneGeometry(e.w+40,e.d+40),[e.w,e.d]);return(0,o.jsxs)("group",{children:[(0,o.jsx)(P,{sunPosition:[50,30,20],turbidity:6,rayleigh:1.5,mieCoefficient:.005,mieDirectionalG:.7}),(0,o.jsx)("mesh",{rotation:[-Math.PI/2,0,0],position:[e.w/2-.5,-.05,e.d/2-.5],receiveShadow:!0,geometry:t,children:(0,o.jsx)("meshStandardMaterial",{color:"#1a1f2e",roughness:.95,metalness:.05})}),(0,o.jsxs)("mesh",{rotation:[-Math.PI/2,0,0],position:[e.w/2-.5,-.04,e.d/2-.5],children:[(0,o.jsx)("planeGeometry",{args:[e.w,e.d]}),(0,o.jsx)("meshBasicMaterial",{color:"#1a2740",transparent:!0,opacity:.5})]})]})}var C=n(54924);function M(e){let{angleDeg:t=45,range:n=12,height:i=2.5}=e,r=(0,v.zz)(e=>e.voxels),l=(0,v.zz)(e=>e.mode),c=(0,a.useMemo)(()=>"inspect"!==l?[]:Object.values(r).map(e=>{var t;let n=(0,C.gd)(e.type);return n&&"cctv"===n.id?{id:e.id,x:e.position.x+.5,y:e.position.y+i,z:e.position.z+.5,yawRad:(null!=(t=e.rotation)?t:0)*Math.PI/2}:null}).filter(e=>null!==e),[r,l,i]);if(0===c.length)return null;let u=Math.tan(t*Math.PI/180/2)*n;return(0,o.jsx)("group",{children:c.map(e=>(0,o.jsxs)("group",{position:[e.x,e.y,e.z],rotation:[0,-e.yawRad,0],children:[(0,o.jsxs)("mesh",{rotation:[0,0,-Math.PI/2],position:[n/2,0,0],children:[(0,o.jsx)("coneGeometry",{args:[u,n,16,1,!0]}),(0,o.jsx)("meshBasicMaterial",{color:"#5fa8d3",transparent:!0,opacity:.18,side:s.DoubleSide,depthWrite:!1})]}),(0,o.jsxs)("mesh",{children:[(0,o.jsx)("sphereGeometry",{args:[.08,8,8]}),(0,o.jsx)("meshBasicMaterial",{color:"#5fa8d3"})]})]},e.id))})}var E=n(78484);function b(e){let{showGrid:t=!0,showPreview:n=!0,frameloop:r="demand"}=e,l=(0,v.zz)(e=>e.gridSize),f=(0,v.zz)(e=>e.camera),d=(0,E.I)(),[g,w]=(0,a.useState)([1,2]);return(0,a.useEffect)(()=>{var e;w((null!=(e=navigator.hardwareConcurrency)?e:4)<4?[1,1.5]:[1,2])},[]),(0,o.jsx)(i.Hl,{shadows:!0,dpr:g,frameloop:r,gl:{antialias:!0,alpha:!1,powerPreference:"high-performance"},onCreated:e=>{let{gl:t,scene:n}=e;t.setClearColor(new s.Color("#0b1020")),n.fog=new s.Fog("#0b1020",30,200)},className:"h-full w-full",children:(0,o.jsxs)(a.Suspense,{fallback:null,children:[(0,o.jsx)(c,{makeDefault:!0,position:f.position,fov:50,near:.1,far:500}),(0,o.jsx)(u.N,{target:f.target,enableDamping:!d,dampingFactor:.08,minDistance:5,maxDistance:120,maxPolarAngle:.49*Math.PI}),(0,o.jsx)("ambientLight",{intensity:.45}),(0,o.jsx)("hemisphereLight",{args:["#a0b4d8","#0a0e1a",.4]}),(0,o.jsx)("directionalLight",{position:[30,50,20],intensity:1,castShadow:!0,"shadow-mapSize":[1024,1024],"shadow-camera-far":100,"shadow-camera-left":-40,"shadow-camera-right":40,"shadow-camera-top":40,"shadow-camera-bottom":-40}),t&&(0,o.jsx)(m,{position:[0,0,0],args:[l.w,l.d],cellSize:1,cellThickness:.6,cellColor:"#3b4860",sectionSize:4,sectionThickness:1.2,sectionColor:"#5b6b8a",fadeDistance:80,fadeStrength:1.2,infiniteGrid:!1}),(0,o.jsx)(S,{}),(0,o.jsx)(h.p,{}),(0,o.jsx)(M,{}),n&&(0,o.jsx)(p,{})]})})}},78484:(e,t,n)=>{n.d(t,{I:()=>r});var o=n(12115),i=n(68267);function r(){let[e,t]=(0,o.useState)(!1),n=(0,i.t0)(e=>e.reducedMotion);return(0,o.useEffect)(()=>{if(!window.matchMedia)return;let e=window.matchMedia("(prefers-reduced-motion: reduce)");t(e.matches);let n=e=>t(e.matches);return e.addEventListener("change",n),()=>e.removeEventListener("change",n)},[]),e||n}}}]);