// ───── 00_data.js ─────
// ───────── 데이터 연결 ─────────
// 게임 데이터는 game/data/*.js가 window.SRG에 올려 둔다. 엔진은 여기서만 읽는다.
const D=window.SRG||{};
['regulars','staff','guests','floors','items','recipes','quests','rules','anomalies','campaign','dialogue'].forEach(k=>{if(!D[k])console.error('데이터 없음: game/data/'+k+'.js');});
const REG=D.regulars,STAFF=D.staff,GUEST=D.guests,FLOOR=D.floors,ITEM=D.items,RECIPES=D.recipes,QUESTS=D.quests,RULES=D.rules,ANOM=D.anomalies,CAMP=D.campaign,DLG=D.dialogue,OILS=D.oils;
const REG_IDS=Object.keys(REG);[REG,STAFF,GUEST].forEach(T=>Object.keys(T).forEach(k=>{T[k].id=k;}));
// 이름 조회: 단골·요리사·손님을 한 표처럼 본다 (옛 코드의 C[id] 호환)
const C=new Proxy({},{get:(_,id)=>REG[id]||STAFF[id]||GUEST[id]||null,has:(_,id)=>!!(REG[id]||STAFF[id]||GUEST[id])});
const nameOf=id=>(C[id]&&C[id].name)||id;
const ITN=new Proxy({},{get:(_,k)=>ITEM[k]?ITEM[k].n:k});   // 옛 코드 호환: ITN[k] = 물건 이름
const K='#382c2b';
// 그림
const ART=window.CHAR_ART||null,UI=window.UI_ART||null,INN=window.INN_ART||null;
function fig(id,o={},back=false){if(ART&&ART.fig){try{return ART.fig(id,o,back);}catch(e){console.warn('CHAR_ART',e);}}return `<ellipse cx="100" cy="100" rx="40" ry="48" fill="#d9b48c" stroke="${K}" stroke-width="3"/>`;}
function featText(id){const a=ART&&ART.DATA&&ART.DATA[id]&&ART.DATA[id].featText;return a?a.filter(x=>!/^\S+ 눈빛?$/.test(x)):(D.featText[id]||[]);}
function itemIcon(k,w=40){const it=ITEM[k]||{};const key=it.icon||k;try{if(INN&&INN.KEYS&&INN.KEYS.item.includes(key))return INN.item(key,w);if(UI&&UI.KEYS&&UI.KEYS.item.includes(key))return UI.item(key,w);}catch(e){}
  return `<svg width="${w}" height="${w}" viewBox="0 0 60 60"><rect x="16" y="14" width="28" height="36" rx="8" fill="#b8a888" stroke="${K}" stroke-width="2.5"/></svg>`;}
// 흔들리지 않는 난수 (?seed=)
let rngState=(+(new URLSearchParams(location.search).get('seed'))||Date.now())>>>0;
function rnd(){rngState=(rngState+0x6D2B79F5)>>>0;let t=rngState;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
const rpick=a=>a[Math.floor(rnd()*a.length)];

// ───── 10_world.js ─────
import * as THREE from 'three';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// ───────── 렌더러·카메라·후처리 ─────────
const $=id=>document.getElementById(id);const QF=new URLSearchParams(location.search);
const cv=$('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
renderer.shadowMap.enabled=!QF.has('noshadow');// PCFSoft + 수동 갱신(autoUpdate=false)을 함께 쓰면 벽·바닥이 통째로 안 그려지는 경우가 있다(0.186.1, 5/5 재현) → PCF + radius
renderer.shadowMap.type=QF.has('soft')?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=QF.has('shadowauto');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,120);
scene.add(camera);
const BASEPIX=QF.has('low')?2:1.3;let PIX=BASEPIX; // 내부 해상도 배율 (클수록 거칠고 가볍다)
// 가짜 환경맵: 놋쇠·유리·젖은 돌에 반사를 준다 (밤에는 세기를 낮춘다)
{const pm=new THREE.PMREMGenerator(renderer);if(!QF.has('noenv'))scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.3;}
// 분위기 필터: 접촉 그림자(깊이 기반) + 시간대 색보정 + 입자 + 비네트 + 색수차 + 밤의 흐림·흔들림 + 위험 반응
const MoodShader={uniforms:{tDiffuse:{value:null},tDepth:{value:null},uProjInv:{value:new THREE.Matrix4()},uAO:{value:1},uTime:{value:0},uNight:{value:0},uDusk:{value:0},uDawn:{value:0},uDanger:{value:0},uFlick:{value:0},uHurt:{value:0},uOn:{value:1},uRes:{value:new THREE.Vector2(640,360)}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform sampler2D tDiffuse,tDepth;uniform mat4 uProjInv;uniform float uAO,uTime,uNight,uDusk,uDawn,uDanger,uFlick,uHurt,uOn;uniform vec2 uRes;varying vec2 vUv;
 float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 vec3 posAt(vec2 q){float d=texture2D(tDepth,q).x;vec4 v=uProjInv*vec4(q*2.0-1.0,d*2.0-1.0,1.0);return v.xyz/v.w;}
 // 퇴실 기록 film.js의 contactShade: 같은 면의 이웃은 가리지 않는다
 float contactShade(vec2 q){if(uAO<.01||texture2D(tDepth,q).x>.9999)return 1.0;vec3 p=posAt(q),n=normalize(cross(dFdx(p),dFdy(p)));vec2 px=1.0/uRes;float occ=0.0;float rad=clamp(26.0/max(-p.z,1.0),2.0,16.0);
  for(int i=0;i<12;i++){float a=float(i)*2.39996323;vec2 o=vec2(cos(a),sin(a))*px*rad*(.4+.6*float(i+1)/12.0);vec3 dl=posAt(clamp(q+o,px,vec2(1.0)-px))-p;float dist=length(dl);float f=max(dot(n,dl)/max(dist,.001)-.12,0.0);occ+=f*(1.0-smoothstep(.08,1.1,dist));}
  return 1.0-clamp(occ/12.0*2.6,0.0,.5)*uAO;}
 void main(){vec2 uv=vUv;
  if(uOn<.5){gl_FragColor=texture2D(tDiffuse,uv)*contactShade(uv);return;}
  float wob=(uNight*.0012+uDanger*.004)*sin(uTime*1.7+uv.y*9.0);uv.x+=wob;
  vec2 c=uv-.5;float d=length(c);
  float ab=(.0012+uNight*.0014+uDanger*.009)*d*2.0;
  vec3 col;col.r=texture2D(tDiffuse,uv+c*ab).r;col.g=texture2D(tDiffuse,uv).g;col.b=texture2D(tDiffuse,uv-c*ab).b;
  col*=contactShade(vUv);
  float bl=smoothstep(.25,.75,d)*(uNight*.8+uDanger*.6);
  if(bl>.01){vec2 px=1.0/uRes;vec3 s=vec3(0);for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)s+=texture2D(tDiffuse,uv+vec2(i,j)*px*2.0).rgb;col=mix(col,s/9.0,bl);}
  float lum=dot(col,vec3(.299,.587,.114));
  col=mix(col,vec3(lum),uNight*.5+uDawn*.1);
  col*=mix(vec3(1.04,1.0,.93),vec3(.74,.86,1.1),uNight);
  col=mix(col,col*vec3(1.16,.94,.74),uDusk*.8);
  col=mix(col,col*vec3(.94,1.0,1.08)+.01,uDawn*.6);
  col=mix(col,vec3(lum*.8,lum*.15,lum*.1),uHurt*.6);
  col=max(col,vec3(.004,.0035,.005));
  float v=smoothstep(.95,.2,d*(1.0+uNight*.35+uDanger*.5));col*=mix(1.0,v,.45+uNight*.3+uDanger*.25);
  float g=rnd(floor(uv*uRes)+fract(uTime*7.0)*100.0)-.5;vec3 gc=sqrt(max(col,vec3(0)));gc+=g*(.028+uNight*.022+uDanger*.05);col=gc*gc;
  col*=1.0-uFlick*.35;
  gl_FragColor=vec4(col,1.0);}`};
const RT=new THREE.WebGLRenderTarget(640,360,{type:THREE.HalfFloatType});RT.depthTexture=new THREE.DepthTexture(640,360);RT.depthTexture.type=THREE.UnsignedIntType;
const composer=new EffectComposer(renderer,RT);
composer.addPass(new RenderPass(scene,camera));
// 두 버퍼가 깊이 텍스처를 공유하면 읽기·쓰기가 겹쳐 GL 오류(1282)와 멈춘 화면이 생긴다 → 버퍼마다 따로
{const d2=new THREE.DepthTexture(640,360);d2.type=THREE.UnsignedIntType;composer.renderTarget2.depthTexture=d2;composer.renderTarget1.depthTexture.type=THREE.UnsignedIntType;}
const mood=new ShaderPass(MoodShader);mood.material.depthTest=false;mood.material.depthWrite=false;composer.addPass(mood);
composer.addPass(new OutputPass());
function resize(){const w=innerWidth,h=innerHeight,iw=Math.round(w/PIX),ih=Math.round(h/PIX);renderer.setSize(iw,ih,false);composer.setSize(iw,ih);mood.uniforms.uRes.value.set(iw,ih);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);
function renderFrame(){if(QF.has('nocomp')){renderer.render(scene,camera);return;}mood.uniforms.tDepth.value=composer.readBuffer.depthTexture;mood.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);composer.render();}

// ───── 11_kit.js ─────
// ───────── 재질 킷 (퇴실 기록 world.js 방식): 캔버스 텍스처 + 밝기 노멀맵 + 월드 좌표 UV ─────────
let seed=7;const rr=()=>((seed=(seed*16807)%2147483647)/2147483647);
const cnv=(w,h=w)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
function toTex(c,srgb=true){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function normalFrom(src,k){const w=src.width,h=src.height,d=src.getContext('2d').getImageData(0,0,w,h).data,out=cnv(w,h),x=out.getContext('2d'),o=x.createImageData(w,h);
  const L=(i,j)=>{i=(i+w)%w;j=(j+h)%h;const q=(j*w+i)*4;return (d[q]*.299+d[q+1]*.587+d[q+2]*.114)/255;};
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const nx=-(L(i+1,j)-L(i-1,j))*k,ny=(L(i,j+1)-L(i,j-1))*k,len=Math.hypot(nx,ny,1),q=(j*w+i)*4;o.data[q]=(nx/len*.5+.5)*255;o.data[q+1]=(ny/len*.5+.5)*255;o.data[q+2]=(1/len*.5+.5)*255;o.data[q+3]=255;}
  x.putImageData(o,0,0);return toTex(out,false);}
// 그림 도구: 픽셀 잡음, 이어지는 얼룩, 결
function grain(x,s,amp){const id=x.getImageData(0,0,s,s),d=id.data;for(let i=0;i<d.length;i+=4){const n=(rr()-.5)*amp;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}x.putImageData(id,0,0);}
function wrap(s,f){for(const dx of [-s,0,s])for(const dy of [-s,0,s])f(dx,dy);}
function blot(x,s,n,r0,r1,rgb,a0,a1){for(let i=0;i<n;i++){const cx=rr()*s,cy=rr()*s,r=r0+rr()*(r1-r0),a=a0+rr()*(a1-a0);wrap(s,(dx,dy)=>{const g=x.createRadialGradient(cx+dx,cy+dy,0,cx+dx,cy+dy,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.fillRect(cx+dx-r,cy+dy-r,r*2,r*2);});}}
function fibers(x,w,h,n,len,alpha,vert){for(let i=0;i<n;i++){const v=rr()>.5?255:0;x.fillStyle=`rgba(${v},${v},${v},${rr()*alpha})`;const a=rr()*w,b=rr()*h,l=rr()*len+1;vert?x.fillRect(a,b,1,l):x.fillRect(a,b,l,1);}}
function woodBoard(x,X,Y,W,H,base,vert,dark){x.fillStyle=base;x.fillRect(X,Y,W,H);x.save();x.beginPath();x.rect(X,Y,W,H);x.clip();
  for(let i=0;i<(vert?W:H)*.9;i++){const t=rr();x.strokeStyle=`rgba(${t>.5?'255,230,190':'30,15,5'},${.04+rr()*.1})`;x.lineWidth=.6+rr()*1.2;x.beginPath();if(vert){const px=X+rr()*W;x.moveTo(px,Y);x.bezierCurveTo(px+rr()*4-2,Y+H*.3,px+rr()*4-2,Y+H*.7,px+rr()*3-1.5,Y+H);}else{const py=Y+rr()*H;x.moveTo(X,py);x.bezierCurveTo(X+W*.3,py+rr()*4-2,X+W*.7,py+rr()*4-2,X+W,py+rr()*3-1.5);}x.stroke();}
  if(rr()<.5){const kx=X+W*(.2+rr()*.6),ky=Y+H*(.2+rr()*.6);x.fillStyle='rgba(40,20,8,.55)';x.beginPath();x.ellipse(kx,ky,vert?2.5:5,vert?5:2.5,0,0,7);x.fill();}
  x.restore();x.fillStyle=dark;vert?x.fillRect(X,Y,1.5,H):x.fillRect(X,Y,W,1.5);}
const PAINT={
 plaster:{tile:[1.6,1.6],n:1.4,f:(x,s)=>{x.fillStyle='#d6c9ae';x.fillRect(0,0,s,s);blot(x,s,26,20,70,'150,130,100',.05,.16);blot(x,s,30,6,22,'255,248,230',.05,.2);grain(x,s,16);
   x.strokeStyle='rgba(90,70,50,.35)';x.lineWidth=.8;for(let i=0;i<5;i++){let px=rr()*s,py=rr()*s;x.beginPath();x.moveTo(px,py);for(let k=0;k<6;k++){px+=rr()*14-7;py+=rr()*12;x.lineTo(px,py);}x.stroke();}}},
 oak:{tile:[.9,.9],n:2,f:(x,s)=>{for(let i=0;i<4;i++)woodBoard(x,i*s/4,0,s/4,s,['#5a3c26','#503422','#5f4029','#553925'][i],true,'rgba(20,10,4,.5)');grain(x,s,10);}},
 plank:{tile:[2.4,1.2],n:2.2,f:(x,s)=>{const rows=5,h=s/rows;for(let r=0;r<rows;r++){const off=rr()*s;const cols=[[0,off],[off,s]];cols.forEach(([a,b],k)=>{const t=['#8a5e3c','#7e5536','#946642','#7a5234','#8f6240'][(r+k*2)%5];woodBoard(x,a,r*h,b-a,h,t,false,'rgba(25,12,4,.8)');});x.fillStyle='rgba(25,12,4,.7)';x.fillRect(off,r*h,2,h);
   x.fillStyle='rgba(20,20,20,.6)';[[off+6,r*h+6],[off+6,r*h+h-7]].forEach(([a,b])=>x.fillRect(a,b,2,2));}grain(x,s,12);blot(x,s,10,20,50,'40,25,10',.05,.15);}},
 wainscot:{tile:[1.2,.9],n:2.4,f:(x,s)=>{for(let i=0;i<5;i++){woodBoard(x,i*s/5,0,s/5,s,['#5b3a24','#523420','#61402a','#56371f','#5d3c25'][i],true,'rgba(15,8,3,.85)');x.fillStyle='rgba(255,220,170,.08)';x.fillRect(i*s/5+2,0,2,s);}grain(x,s,10);}},
 walnut:{tile:[1,1],n:1.6,f:(x,s)=>{for(let i=0;i<6;i++)woodBoard(x,0,i*s/6,s,s/6,['#6e4a30','#664329','#734e33','#6a472e','#704b31','#684530'][i],false,'rgba(20,10,4,.35)');grain(x,s,8);}},
 door:{tile:[1,2.2],n:2.4,f:(x,s)=>{for(let i=0;i<4;i++)woodBoard(x,i*s/4,0,s/4,s,['#5e3d25','#56381f','#62412a','#5a3a23'][i],true,'rgba(10,5,2,.9)');grain(x,s,12);blot(x,s,8,20,60,'20,10,5',.08,.2);}},
 stone:{tile:[1.1,1.1],n:3.2,f:(x,s)=>{x.fillStyle='#3a332c';x.fillRect(0,0,s,s);const rows=6,h=s/rows;for(let r=0;r<rows;r++){let px=(r%2)*18-10;while(px<s){const w=30+rr()*34,v=95+rr()*50|0,tint=rr()*14|0;wrap(s,(dx,dy)=>{x.fillStyle=`rgb(${v+tint},${v+tint*.6},${v-6})`;x.beginPath();x.roundRect(px+dx+2,r*h+dy+2,w-4,h-4,7);x.fill();});px+=w;}}
   blot(x,s,30,6,20,'0,0,0',.06,.18);blot(x,s,20,5,14,'255,240,220',.04,.12);grain(x,s,22);}},
 cobble:{tile:[1.4,1.4],n:3.4,f:(x,s)=>{x.fillStyle='#26221e';x.fillRect(0,0,s,s);const n=8,c=s/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=70+rr()*40|0,cx=i*c+c/2+(rr()-.5)*6,cy=j*c+c/2+(rr()-.5)*6;wrap(s,(dx,dy)=>{const g=x.createRadialGradient(cx+dx-4,cy+dy-4,1,cx+dx,cy+dy,c*.55);g.addColorStop(0,`rgb(${v+30},${v+26},${v+20})`);g.addColorStop(1,`rgb(${v-20},${v-22},${v-24})`);x.fillStyle=g;x.beginPath();x.ellipse(cx+dx,cy+dy,c*.46,c*.42,rr(),0,7);x.fill();});}grain(x,s,18);}},
 roof:{tile:[1.2,1.2],n:2.8,f:(x,s)=>{x.fillStyle='#231a16';x.fillRect(0,0,s,s);const rows=8,h=s/rows;for(let r=0;r<rows;r++){const off=(r%2)*16;for(let k=-1;k<9;k++){const v=58+rr()*26|0;x.fillStyle=`rgb(${v+10},${v},${v-6})`;x.beginPath();x.roundRect(k*32+off+1,r*h,30,h+3,[0,0,6,6]);x.fill();x.fillStyle='rgba(0,0,0,.35)';x.fillRect(k*32+off+1,r*h+h-3,30,3);}}grain(x,s,14);}},
 rug:{tile:null,n:1.2,f:(x,s)=>{x.fillStyle='#6e1f1a';x.fillRect(0,0,s,s);x.strokeStyle='#c99a4a';x.lineWidth=10;x.strokeRect(12,12,s-24,s-24);x.strokeStyle='#2a3a4a';x.lineWidth=5;x.strokeRect(26,26,s-52,s-52);
   x.fillStyle='#c99a4a';for(let i=0;i<5;i++)for(let j=0;j<5;j++){const cx=48+i*40,cy=48+j*40;x.beginPath();x.moveTo(cx,cy-12);x.lineTo(cx+12,cy);x.lineTo(cx,cy+12);x.lineTo(cx-12,cy);x.fill();x.fillStyle=(i+j)%2?'#2a3a4a':'#c99a4a';}fibers(x,s,s,5000,3,.25,false);grain(x,s,14);}},
 runner:{tile:[1.1,2.2],n:1,f:(x,s)=>{x.fillStyle='#4a2a22';x.fillRect(0,0,s,s);x.fillStyle='#a8793c';x.fillRect(10,0,8,s);x.fillRect(s-18,0,8,s);x.fillStyle='#2f3b35';for(let j=0;j<4;j++){const cy=j*s/4+s/8;x.beginPath();x.moveTo(s/2,cy-22);x.lineTo(s/2+34,cy);x.lineTo(s/2,cy+22);x.lineTo(s/2-34,cy);x.fill();}fibers(x,s,s,4000,3,.25,true);grain(x,s,12);}},
 cloth:{tile:[.8,.8],n:.8,f:(x,s)=>{x.fillStyle='#b8a888';x.fillRect(0,0,s,s);for(let i=0;i<s;i+=32){x.fillStyle='rgba(140,50,40,.55)';x.fillRect(i,0,12,s);x.fillRect(0,i,s,12);x.fillStyle='rgba(40,50,70,.35)';x.fillRect(i+20,0,4,s);x.fillRect(0,i+20,s,4);}fibers(x,s,s,6000,2,.2,false);grain(x,s,10);}},
 linen:{tile:[.8,.8],n:.6,f:(x,s)=>{x.fillStyle='#e6dcc6';x.fillRect(0,0,s,s);fibers(x,s,s,5000,3,.12,false);fibers(x,s,s,5000,3,.12,true);grain(x,s,8);}},
 iron:{tile:[.6,.6],n:1.8,f:(x,s)=>{x.fillStyle='#35322f';x.fillRect(0,0,s,s);blot(x,s,30,4,16,'120,60,30',.1,.35);blot(x,s,20,6,20,'10,10,10',.1,.3);grain(x,s,20);}},
 leather:{tile:[.5,.5],n:1.6,f:(x,s)=>{x.fillStyle='#5a3422';x.fillRect(0,0,s,s);blot(x,s,40,4,18,'20,10,5',.1,.3);blot(x,s,30,4,14,'150,90,50',.05,.2);grain(x,s,14);}},
 bread:{tile:[.3,.3],n:2,f:(x,s)=>{x.fillStyle='#b8793c';x.fillRect(0,0,s,s);blot(x,s,40,6,20,'230,180,110',.2,.5);blot(x,s,20,3,10,'90,50,20',.2,.4);grain(x,s,16);}}};
const TEX={};
function tex(k){if(!TEX[k]){const P0=PAINT[k],c=cnv(P0.s||256);const sv=seed;seed=([...k].reduce((a,ch)=>a*31+ch.charCodeAt(0),7)%2147483646)+1;P0.f(c.getContext('2d'),c.width);seed=sv;TEX[k]={map:toTex(c),nrm:P0.n?normalFrom(c,P0.n):null,c};}return TEX[k];}
const MC={};
// M('plank') 결 재질 · M('#hex') 단색 · {rot:1}이면 결을 90도 돌린다
function M(k,o={}){const key=k+JSON.stringify(o);if(MC[key])return MC[key];const {tile,rough=.84,metal=0,rot,env,...rest}=o;let m;
  if(PAINT[k]){const T=tex(k);let map=T.map,nrm=T.nrm;if(rot){map=map.clone();map.center.set(.5,.5);map.rotation=Math.PI/2;map.needsUpdate=true;if(nrm){nrm=nrm.clone();nrm.center.set(.5,.5);nrm.rotation=Math.PI/2;nrm.needsUpdate=true;}}
    m=new THREE.MeshStandardMaterial({map,normalMap:nrm,roughness:rough,metalness:metal,...rest});if(nrm)m.normalScale.set(.9,.9);m.userData.tile=tile!==undefined?tile:PAINT[k].tile;}
  else m=new THREE.MeshStandardMaterial({color:k,roughness:rough,metalness:metal,...rest});
  m.userData.kind=k;if(rot)m.userData.rot=1;if(env!==undefined)m.envMapIntensity=env;return MC[key]=m;}
function mat(kind,rx,ry,opts={}){return M(kind,opts);}   // 옛 호출 호환
// ───────── 기하 도우미 ─────────
const WALLS=[]; // 층별 벽 사각형 {x1,z1,x2,z2,f:1|2|3}
const INTER=[]; // 상호작용 대상 메시
function worldUV(g,w,h,d,t){if(!t)return g;const [su,sv]=t,uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*dims[f][0]/su,uv.getY(i)*dims[f][1]/sv);}return g;}
const tileOf=m=>(Array.isArray(m)?(m.find(q=>q.userData&&q.userData.tile)||{}):m).userData?.tile;
function box(x1,y1,z1,x2,y2,z2,m,opt={}){const w=x2-x1,h=y2-y1,d=z2-z1;const g=worldUV(new THREE.BoxGeometry(w,h,d),w,h,d,tileOf(m));const mesh=new THREE.Mesh(g,m);mesh.position.set((x1+x2)/2,(y1+y2)/2,(z1+z2)/2);mesh.userData.box={w,h,d};
  mesh.castShadow=opt.shadow!==false;mesh.receiveShadow=true;(opt.parent||scene).add(mesh);
  if(opt.col!==undefined)WALLS.push({x1:Math.min(x1,x2),z1:Math.min(z1,z2),x2:Math.max(x1,x2),z2:Math.max(z1,z2),f:opt.col||3});return mesh;}
const GC={};
function rgeo(w,h,d,r,tile){const key=[w,h,d,r,...(tile||[1,1])].map(v=>(+v).toFixed(3)).join();if(GC[key])return GC[key];
  r=Math.min(r,w*.45,h*.45,d*.45);const iw=w/2-r,ih=h/2-r,c=Math.min(r*.8,iw,ih)*.98,s=new THREE.Shape();
  s.moveTo(-iw+c,-ih);s.lineTo(iw-c,-ih);s.quadraticCurveTo(iw,-ih,iw,-ih+c);s.lineTo(iw,ih-c);s.quadraticCurveTo(iw,ih,iw-c,ih);s.lineTo(-iw+c,ih);s.quadraticCurveTo(-iw,ih,-iw,ih-c);s.lineTo(-iw,-ih+c);s.quadraticCurveTo(-iw,-ih,-iw+c,-ih);
  const dd=Math.max(d-2*r,.0005),g=new THREE.ExtrudeGeometry(s,{depth:dd,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,curveSegments:3});g.translate(0,0,-dd/2);
  const uv=g.attributes.uv,[su,sv]=tile||[1,1];for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/su+.5,uv.getY(i)/sv+.5);return GC[key]=g;}
// 둥근 모서리 상자 (모서리 좌표로)
function rbox(x1,y1,z1,x2,y2,z2,m,r=.02,opt={}){const w=x2-x1,h=y2-y1,d=z2-z1;const mesh=new THREE.Mesh(rgeo(w,h,d,r,tileOf(m)),m);mesh.position.set((x1+x2)/2,(y1+y2)/2,(z1+z2)/2);mesh.castShadow=mesh.receiveShadow=true;(opt.parent||scene).add(mesh);
  if(opt.col!==undefined)WALLS.push({x1:Math.min(x1,x2),z1:Math.min(z1,z2),x2:Math.max(x1,x2),z2:Math.max(z1,z2),f:opt.col||3});return mesh;}
function cyl(x,y,z,rt,rb,h,m,seg=14,opt={}){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg,1,!!opt.open),m);mesh.position.set(x,y,z);if(opt.rx)mesh.rotation.x=opt.rx;if(opt.rz)mesh.rotation.z=opt.rz;if(opt.ry)mesh.rotation.y=opt.ry;mesh.castShadow=opt.shadow!==false;mesh.receiveShadow=true;(opt.parent||scene).add(mesh);return mesh;}
function sph(x,y,z,r,m,sx=1,sy=1,sz=1,opt={}){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;(opt.parent||scene).add(mesh);return mesh;}
function plane(x,y,z,w,h,m,ry=0,rx=0,opt={}){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,0,'YXZ');mesh.receiveShadow=true;(opt.parent||scene).add(mesh);return mesh;}
// 불빛: 보이는 불꽃 + 번지는 빛 (실제 광원은 plight로 따로 단다)
const GLOWTEX=(()=>{const c=cnv(64),x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,230,180,1)');g.addColorStop(.25,'rgba(255,190,110,.45)');g.addColorStop(1,'rgba(255,150,60,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const FLAMES={};const FLAMEM=new THREE.MeshBasicMaterial({color:new THREE.Color(0xffb450).multiplyScalar(2.2)});
function flame(x,y,z,s=1,key='misc'){const f=new THREE.Mesh(new THREE.ConeGeometry(.018*s,.06*s,6),FLAMEM);f.position.set(x,y+.03*s,z);scene.add(f);
  const g=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOWTEX,color:0xffc47a,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}));g.position.set(x,y+.035*s,z);g.scale.setScalar(.34*s);scene.add(g);
  (FLAMES[key]=FLAMES[key]||[]).push({f,g,s});return f;}
function setFlames(key,on,k=1){(FLAMES[key]||[]).forEach(o=>{o.f.visible=o.g.visible=on;if(on){o.g.material.opacity=.75*k;o.f.scale.setScalar(.9+.2*k);}});}
// 정적 장식 굽기: 재질별로 합쳐 그리기 호출을 줄인다
function bake(group){if(QF.has('nobake'))return 0;group.updateMatrixWorld(true);const buckets=new Map();const drop=[];
  group.traverse(o=>{if(!o.isMesh||o.userData.keep||Array.isArray(o.material))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);['uv1','uv2'].forEach(a=>g.deleteAttribute(a));
    if(!g.attributes.uv)return;const k=o.material.uuid;if(!buckets.has(k))buckets.set(k,{m:o.material,gs:[],shadow:o.castShadow});buckets.get(k).gs.push(g);drop.push(o);});
  drop.forEach(o=>o.parent.remove(o));const keep=[];group.traverse(o=>{if(o.isMesh&&o.userData.keep)keep.push(o);});keep.forEach(o=>scene.attach(o));let n=0;
  buckets.forEach(({m,gs,shadow})=>{const g=mergeGeometries(gs,false);if(!g)return;const mesh=new THREE.Mesh(g,m);mesh.castShadow=shadow;mesh.receiveShadow=!group.userData.noReceive;scene.add(mesh);n++;});
  scene.remove(group);return n;}

// ───── 12_inn.js ─────
// ───────── 층 높이·충돌 ─────────
// 계단(x16~24, z5~7)은 서쪽으로 갈수록 오른다
const inRamp=(x,z)=>x>=16&&x<=24&&z>=5&&z<=7;
function floorY(x,z,curY){if(inRamp(x,z))return Math.max(0,Math.min(3,3*(24-x)/8));if(x<0||x>24||z<0||z>12)return 0;return curY>1.5?3:0;}
function blocked(x,z,y,r=.28){const f=y>1.5?2:1;
  if(inRamp(x,z)&&y>.4&&y<2.6)return x<16-r||z<5+r||z>7-r;
  for(const w of WALLS){if(w.f!==3&&w.f!==f)continue;if(x+r>w.x1&&x-r<w.x2&&z+r>w.z1&&z-r<w.z2)return true;}return false;}

// ───────── 재질 ─────────
const WALL=M('plaster'),WAIN=M('wainscot'),OAK=M('oak'),OAKH=M('oak',{rot:1}),PLANK=M('plank'),STONE=M('stone'),ROOF=M('roof'),DOORM=M('door',{tile:null});
const BASEB=M('#3a2618',{rough:.7}),CEIL=M('#4a3626',{rough:.95}),GLASS=M('#a9c2cf',{rough:.06,transparent:true,opacity:.2,env:1.4,depthWrite:false});
const IRONM=M('iron',{metal:.55,rough:.55}),BRASSM=M('#c9a45a',{metal:.9,rough:.35,env:1.2});

// ───────── 벽: 회벽 + 징두리 판자·띠장·걸레받이·윗도리(안쪽), 문·창 틀 ─────────
// gaps: [a,b,아래,위,'door'|'win'|'open'] · sides: 안쪽 면(-1,+1)
function trimSeg(axis,c,a,b,y1,y2,sides){const T=.1;
  for(const base of [0,3]){if(base<y1-.01||base+1>y2+.01)continue;
    for(const s of sides){const o=c+s*T,L=(p,q,y0,y1,th,mm)=>axis==='x'?box(a,y0,Math.min(o,o+s*th),b,y1,Math.max(o,o+s*th),mm,{parent:DP}):box(Math.min(o,o+s*th),y0,a,Math.max(o,o+s*th),y1,b,mm,{parent:DP});
      L(a,b,base,base+.92,.025,WAIN);L(a,b,base+.9,base+.97,.05,OAKH);L(a,b,base,base+.13,.04,BASEB);if(y2>=base+2.85)L(a,b,base+2.74,base+2.9,.06,OAKH);}}}
function frameGap(axis,c,[a,b,gy1,gy2,kind],y1,y2){const T=.1,W=.1,D=T+.05;const J=(p,q,y0,y1)=>axis==='x'?box(p,y0,c-D,q,y1,c+D,OAK,{parent:DP}):box(c-D,y0,p,c+D,y1,q,OAK,{parent:DP});
  J(a-W,a,gy1,gy2+W);J(b,b+W,gy1,gy2+W);const top=(y0,y1)=>axis==='x'?box(a-W,y0,c-D,b+W,y1,c+D,OAKH,{parent:DP}):box(c-D,y0,a-W,c+D,y1,b+W,OAKH,{parent:DP});top(gy2,gy2+W+.02);
  if(kind!=='door'){top(gy1-.06,gy1);const sill=axis==='x'?box(a-W,gy1-.03,c-D-.08,b+W,gy1+.02,c+D+.08,OAKH,{parent:DP}):box(c-D-.08,gy1-.03,a-W,c+D+.08,gy1+.02,b+W,OAKH,{parent:DP});}
  if(kind==='win'){const m=(a+b)/2,h=(gy1+gy2)/2;if(axis==='x'){box(m-.025,gy1,c-.025,m+.025,gy2,c+.025,OAK,{parent:DP});box(a,h-.025,c-.025,b,h+.025,c+.025,OAKH,{parent:DP});plane(m,h,c,b-a,gy2-gy1,GLASS,0);}
    else{box(c-.025,gy1,m-.025,c+.025,gy2,m+.025,OAK,{parent:DP});box(c-.025,h-.025,a,c+.025,h+.025,b,OAKH,{parent:DP});plane(c,h,m,b-a,gy2-gy1,GLASS,Math.PI/2);}}}
function wallX(z,x1,x2,y1,y2,f,gaps=[],m=WALL,o={}){const T=.1;let cur=x1;const segs=[];gaps.sort((a,b)=>a[0]-b[0]).forEach(([a,b,gy1=y1,gy2=y2])=>{segs.push([cur,a]);if(gy1>y1)box(a,y1,z-T,b,gy1,z+T,m,{col:0});if(gy2<y2)box(a,gy2,z-T,b,y2,z+T,m);cur=b;});segs.push([cur,x2]);
  segs.forEach(([a,b])=>{if(b-a>.01){box(a,y1,z-T,b,y2,z+T,m,{col:f});if(o.sides)trimSeg('x',z,a,b,y1,y2,o.sides);}});
  gaps.forEach(g=>{const [a,b,gy1=y1]=g;if(gy1>y1+.5)WALLS.push({x1:a,z1:z-T,x2:b,z2:z+T,f:f||3});if(o.frame!==false)frameGap('x',z,[a,b,gy1,g[3]===undefined?y2:g[3],g[4]||(gy1>y1+.3?'win':'door')],y1,y2);});}
function wallZ(x,z1,z2,y1,y2,f,gaps=[],m=WALL,o={}){const T=.1;let cur=z1;const segs=[];gaps.sort((a,b)=>a[0]-b[0]).forEach(([a,b,gy1=y1,gy2=y2])=>{segs.push([cur,a]);if(gy1>y1)box(x-T,y1,a,x+T,gy1,b,m,{col:0});if(gy2<y2)box(x-T,gy2,a,x+T,y2,b,m);cur=b;});segs.push([cur,z2]);
  segs.forEach(([a,b])=>{if(b-a>.01){box(x-T,y1,a,x+T,y2,b,m,{col:f});if(o.sides)trimSeg('z',x,a,b,y1,y2,o.sides);}});
  gaps.forEach(g=>{const [a,b,gy1=y1]=g;if(gy1>y1+.5)WALLS.push({x1:x-T,z1:a,x2:x+T,z2:b,f:f||3});if(o.frame!==false)frameGap('z',x,[a,b,gy1,g[3]===undefined?y2:g[3],g[4]||(gy1>y1+.3?'win':'door')],y1,y2);});}
// 바깥 목골조: 돌 기초 + 기둥 + 띠 + 가새 (바깥 면)
function timber(axis,c,s,a0,b0,gaps){const o=c+s*.1,L=(p,q,y0,y1,th,mm)=>axis==='x'?box(p,y0,Math.min(o,o+s*th),q,y1,Math.max(o,o+s*th),mm,{parent:DP}):box(Math.min(o,o+s*th),y0,p,Math.max(o,o+s*th),y1,q,mm,{parent:DP});
  const free=(p,y0,y1)=>!gaps.some(([a,b,gy1=0,gy2=6])=>p>a-.15&&p<b+.15&&y1>gy1&&y0<gy2);
  let p=a0;const cuts=[];gaps.forEach(([a,b,gy1=0])=>{if(gy1<.2)cuts.push([a,b]);});
  // 기초와 문턱 띠
  let q=a0;cuts.sort((x,y)=>x[0]-y[0]).forEach(([a,b])=>{L(q,a,0,.55,.1,STONE);L(q,a,.55,.72,.07,OAKH);q=b;});L(q,b0,0,.55,.1,STONE);L(q,b0,.55,.72,.07,OAKH);
  L(a0,b0,2.84,3.12,.08,OAKH);L(a0,b0,5.82,6.04,.08,OAKH);
  for(p=a0;p<=b0+.01;p+=2.4){const x=Math.min(p,b0-.09);[[.72,2.84],[3.12,5.82]].forEach(([y0,y1])=>{if(free(x+.09,y0,y1))L(x,x+.18,y0,y1,.07,OAK);});
    if(p+2.4<=b0&&free(p+1.2,3.2,5.8)&&((p/2.4)%2<1)){const len=Math.hypot(2.2,2.6),ang=Math.atan2(2.6,2.2),mm=new THREE.Mesh(new THREE.BoxGeometry(len,.14,.06),OAKH);
      mm.position.set(axis==='x'?p+1.2:o+s*.03,4.47,axis==='x'?o+s*.03:p+1.2);mm.rotation.set(0,axis==='x'?0:Math.PI/2,0,'YXZ');mm.rotateZ(axis==='x'?ang:-ang);mm.castShadow=true;DP.add(mm);}}}

let DP=null; // 굽기(bake)용 장식 모음
function buildInn(){DP=new THREE.Group();scene.add(DP);
  // 바깥 땅과 골목
  box(-40,-.12,-40,64,-.02,52,M('cobble'),{shadow:false});
  // 바닥: 홀·식당은 널마루, 부엌은 돌바닥
  box(0,-.1,0,24,0,12,PLANK);box(0,0,0,7,.012,5,M('stone',{tile:[.9,.9],rough:.9}));
  const slab=()=>[CEIL,CEIL,PLANK,CEIL,CEIL,CEIL];
  box(0,2.9,0,16,3,12,slab());box(16,2.9,0,24,3,5,slab());box(16,2.9,7,24,3,12,slab());
  box(0,6,0,24,6.2,12,[CEIL,CEIL,ROOF,CEIL,CEIL,CEIL]);
  // 바깥벽 (1·2층) — 창과 문
  const S=[[3.4,4.6,0,2.3,'door'],[1.2,2.4,1.0,2.2],[9.4,10.6,1.0,2.2],[13.4,14.6,1.0,2.2],[18.6,19.8,1.0,2.2],[2.17,3.17,3.9,5.1],[7.5,8.5,3.9,5.1],[12.83,13.83,3.9,5.1]];
  const N=[[8.6,9.8,1.0,2.2],[13.2,14.4,1.0,2.2],[2.17,3.17,3.9,5.1],[7.5,8.5,3.9,5.1],[12.83,13.83,3.9,5.1]];
  const Wz=[[2.0,3.2,1.0,2.1],[5.5,6.5,3.9,5.2,'open']],Ez=[[8.6,10.2,1.0,2.2,'open'],[10.7,11.7,0,2.2,'door']];
  wallX(12,0,24,0,6,0,S,WALL,{sides:[-1]});wallX(0,0,24,0,6,0,N,WALL,{sides:[1]});
  wallZ(0,0,12,0,6,0,Wz,WALL,{sides:[1]});wallZ(24,0,12,0,6,0,Ez,WALL,{sides:[-1]});
  timber('x',12,1,0,24,S);timber('x',0,-1,0,24,N);timber('z',0,-1,0,12,Wz);timber('z',24,1,0,12,Ez);
  // 1층 칸막이
  wallX(5,0,16,0,2.9,1,[[3,4.2,0,2.3],[10,12,0,2.3]],WALL,{sides:[-1,1]});
  wallZ(7,0,5,0,2.9,1,[],WALL,{sides:[-1,1]});
  wallZ(16,0,7,0,2.9,1,[],WALL,{sides:[-1]});
  wallX(5,16,24,0,6,0,[],WALL,{sides:[1]});
  wallX(7,16,22.4,0,2.9,1,[],WALL,{sides:[1,-1]});
  // 2층 계단 난간: 동자 기둥 + 손잡이 (충돌은 보이지 않는 판)
  box(16,3,6.9,24,4.05,7.1,new THREE.MeshBasicMaterial({visible:false}),{col:2,shadow:false});
  box(16,3.96,6.93,24,4.05,7.07,OAKH,{parent:DP});box(16,3,6.93,24,3.1,7.07,OAKH,{parent:DP});
  for(let x=16.1;x<24;x+=.16)cyl(x,3.5,7,.018,.022,.86,OAK,6,{parent:DP});[16.05,19.9,23.9].forEach(x=>box(x-.07,3,6.93,x+.07,4.25,7.07,OAK,{parent:DP}));
  // 2층 방
  const RX=[[0,5.33],[5.33,10.67],[10.67,16]],dg=RX.map(([a,b])=>[(a+b)/2-.5,(a+b)/2+.5,3,5.2,'door']);
  wallX(5,0,16,3,6,2,dg,WALL,{sides:[-1,1]});wallX(7,0,16,3,6,2,dg.map(x=>[...x]),WALL,{sides:[-1,1]});
  [5.33,10.67].forEach(x=>{wallZ(x,0,5,3,6,2,[],WALL,{sides:[-1,1]});wallZ(x,7,12,3,6,2,[],WALL,{sides:[-1,1]});});
  wallZ(16,0,5,3,6,2,[],WALL,{sides:[-1]});wallZ(16,7,12,3,6,2,[],WALL,{sides:[-1]});
  // 천장 들보 (1층·2층)
  for(let x=.7;x<16;x+=1.3){box(x-.07,2.72,0,x+.07,2.9,5,OAK,{parent:DP});box(x-.07,2.72,7,x+.07,2.9,12,OAK,{parent:DP});box(x-.07,5.8,0,x+.07,6,12,OAK,{parent:DP});}
  for(let x=16.8;x<24;x+=1.3)box(x-.07,2.72,7,x+.07,2.9,12,OAK,{parent:DP});
  [5,7].forEach(z=>box(0,2.66,z-.12,16,2.9,z+.12,OAKH,{parent:DP}));box(0,5.72,5.9,16,5.86,6.1,OAKH,{parent:DP});
  // 계단 발판 (보이는 것만, 발은 floorY가 처리)
  for(let i=0;i<16;i++){const x=24-i*.5,y=3*(i+1)/16;rbox(x-.52,y-.05,5.1,x+.02,y,6.9,M('walnut'),.015,{parent:DP});box(x-.02,y-3/16,5.12,x,y-.05,6.88,M('#3a2618'),{parent:DP});}
  [5.12,6.88].forEach(z=>{const len=Math.hypot(8,3),mm=new THREE.Mesh(new THREE.BoxGeometry(len,.26,.08),OAKH);mm.position.set(20,1.45,z);mm.rotation.z=-Math.atan2(3,8);mm.castShadow=true;DP.add(mm);});
  // 지붕: 박공 두 면 + 용마루 + 박공벽
  const rl=Math.hypot(6.6,2.4),ra=Math.atan2(2.4,6.6);
  [[-1,2.7],[1,9.3]].forEach(([s,zc])=>{const r=new THREE.Mesh(worldUV(new THREE.BoxGeometry(25.4,.16,rl),25.4,.16,rl,ROOF.userData.tile),ROOF);r.position.set(12,7.35,zc);r.rotation.x=s*ra;r.castShadow=true;r.receiveShadow=true;scene.add(r);});
  box(-.7,8.4,5.9,24.7,8.62,6.1,OAKH,{parent:DP});
  [0,24].forEach(x=>{const sh=new THREE.Shape();sh.moveTo(-6,0);sh.lineTo(6,0);sh.lineTo(0,2.3);sh.lineTo(-6,0);const g=new THREE.ExtrudeGeometry(sh,{depth:.2,bevelEnabled:false});const mm=new THREE.Mesh(g,WALL);mm.rotation.y=Math.PI/2;mm.position.set(x-.1,6.2,6);mm.castShadow=true;scene.add(mm);});
  // 건너편 집들 (골목 동쪽·남쪽)
  [[30,-6,38,4,7.5],[30,6,37,15,6.5],[-6,18,6,25,7],[8,19,20,26,8],[22,19,34,25,6.8],[-14,-2,-6,10,6.5],[0,-15,11,-7,7.2],[13,-14,25,-7,6.4]].forEach(([x1,z1,x2,z2,h])=>house(x1,z1,x2,z2,h));
  bake(DP);DP=null;}
// 이웃집: 목골조 무늬 회벽 + 창 (밤에 불이 켜진다) — 세 가지 무늬
function facadeMat(v){const c=cnv(256,320),x=c.getContext('2d'),e=cnv(256,320),y=e.getContext('2d');seed=99+v*31;x.fillStyle=['#cdbf9f','#c4b79a','#d2c6aa'][v];x.fillRect(0,0,256,320);blot(x,256,20,20,60,'140,120,90',.06,.16);grain(x,256,14);
  const B=['#4a3020','#3a2a22','#56382a'][v];x.fillStyle=B;[[0,0,14,320],[242,0,14,320],[0,0,256,14],[0,150,256,14],[0,306,256,14]].forEach(r=>x.fillRect(...r));x.save();x.lineWidth=12;x.strokeStyle=B;x.beginPath();
  if(v===0){x.moveTo(14,164);x.lineTo(90,306);x.moveTo(242,164);x.lineTo(166,306);}else if(v===1){x.moveTo(14,20);x.lineTo(80,150);x.moveTo(128,164);x.lineTo(128,306);}else{x.moveTo(242,20);x.lineTo(170,150);}x.stroke();x.restore();
  y.fillStyle='#000';y.fillRect(0,0,256,320);[[92,40,72,80],[92,196,72,80]].forEach(([a,b,w,h],i)=>{const ax=v===1&&i===1?150:a;x.fillStyle='#2a2420';x.fillRect(ax,b,w,h);x.fillStyle=B;x.fillRect(ax-6,b-6,w+12,6);x.fillRect(ax-6,b+h,w+12,8);x.fillRect(ax+w/2-3,b,6,h);
    if((v+i)%3===0){y.fillStyle='#ffb45a';y.fillRect(ax,b,w,h);y.fillStyle='#000';y.fillRect(ax+w/2-3,b,6,h);}});
  const m=new THREE.MeshStandardMaterial({map:toTex(c),emissiveMap:toTex(e),emissive:0xffa050,emissiveIntensity:0,roughness:.9});m.userData.tile=[3.4,4.1];return m;}
const FACADES=[0,1,2].map(facadeMat),FACADE={set emissiveIntensity(v){FACADES.forEach(m=>m.emissiveIntensity=v);}};
let HOUSE_I=0;const HOUSES=[]; // 모듈 집(assets)이 오면 상자 집을 숨기고 그 자리에 세운다
function house(x1,z1,x2,z2,h){const F=FACADES[HOUSE_I++%3];const ms=[box(x1,0,z1,x2,h,z2,[F,F,CEIL,CEIL,F,F],{shadow:true}),box(x1-.4,h,z1-.4,x2+.4,h+.25,z2+.4,ROOF),box(x1,0,z1,x2,.5,z2,STONE)];ms.forEach(m=>m.userData.keep=true);HOUSES.push({x1,z1,x2,z2,h,meshes:ms});}
buildInn();

// ───── 13_assets.js ─────
// ───────── 외부 에셋 (CC0, assets/): 텍스처·모델·소리. 없거나 실패하면 절차 생성 그대로 ─────────
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const ASSET_BASE=(QF.get('assets')||'assets')+'/';
const ASSETS={man:null,tex:{},models:{},sfx:{},anchors:[],pending:0,on:!QF.has('noassets')};
// 절차 재질 종류 → 텍스처 키 (assets/tex/<키>_Color.jpg 등). tile: m당 반복
// tint: 텍스처 평균 밝기를 우리 조명에 맞춘다 (planks 원본이 어둡고, plaster는 새하얗다)
const TEXMAP={plank:{k:'floor',tile:[2.0,2.0],tint:[1.05,1.0,.95]},wainscot:{k:'planks',tile:[1.6,1.6],rot:1,tint:[1.75,1.6,1.45]},oak:{k:'planks',tile:[1.2,1.2],tint:[1.7,1.55,1.4]},walnut:{k:'planks',tile:[1.4,1.4],tint:[1.9,1.7,1.5]},door:{k:'planks',tile:[1.0,2.0],tint:[1.6,1.45,1.3]},plaster:{k:'plaster',tile:[2.2,2.2],tint:[.9,.84,.72]},cobble:{k:'cobble',tile:[2.4,2.4],tint:[.9,.88,.84]},roof:{k:'roof',tile:[1.6,1.6],tint:[.9,.85,.8]},rug:{k:'rug',tile:null,tint:[1.15,.5,.42]},iron:{k:'metal',tile:[.8,.8],tint:[.7,.7,.72]}};
// 소품 키 → 모델 파일 (여러 후보 중 있는 것). fit: 목표 크기(m, 가장 큰 축), yOff: 바닥 맞춤
// Quaternius(quaternius_*) 가 먼저, 없으면 KayKit·Kenney 로. ?nq 로 Quaternius 만 끈다
const MODELMAP={
 cauldron:{f:['quaternius_props/Cauldron.gltf','polypizza/cauldron.glb','kaykit_restaurant_bits/stew_pot.gltf'],fit:1.15},
 chandelier:{f:['quaternius_props/Chandelier.gltf','polypizza/chandelier.glb'],fit:1.0},
 barrel:{f:['quaternius_props/Barrel.gltf','kaykit_dungeon_remastered/barrel_large.gltf.glb','kenney_food/barrel.glb'],fit:.9},
 keg:{f:['quaternius_props/Barrel_Apples.gltf','kaykit_dungeon_remastered/keg.gltf.glb'],fit:.8},
 crate:{f:['quaternius_props/Crate_Wooden.gltf','kaykit_dungeon_remastered/box_large.gltf.glb','kaykit_restaurant_bits/crate.gltf'],fit:.6},
 crates:{f:['kaykit_dungeon_remastered/crates_stacked.gltf.glb'],fit:1.1},
 chair:{f:['quaternius_props/Chair_1.gltf','kaykit_furniture_bits/chair_A_wood.gltf','kaykit_dungeon_remastered/chair.gltf.glb'],fit:1.0},
 stool:{f:['quaternius_props/Stool.gltf','kaykit_dungeon_remastered/stool.gltf.glb','kaykit_furniture_bits/chair_stool_wood.gltf'],fit:.5},
 table_long:{f:['quaternius_props/Table_Large.gltf','kaykit_dungeon_remastered/table_long.gltf.glb'],fit:2.85},
 table_round:{f:['kaykit_restaurant_bits/table_round_A_small.gltf'],fit:1.2},
 bed:{f:['quaternius_props/Bed_Twin1.gltf','kaykit_dungeon_remastered/bed_frame.gltf.glb','kaykit_furniture_bits/bed_single_A.gltf'],fit:2.1},
 candle:{f:['quaternius_props/Candle_1.gltf','kaykit_dungeon_remastered/candle_lit.gltf.glb','kaykit_dungeon_remastered/candle.gltf.glb'],fit:.16},
 candle3:{f:['quaternius_props/CandleStick_Triple.gltf','kaykit_dungeon_remastered/candle_triple.gltf.glb'],fit:.22},
 torch:{f:['quaternius_props/Torch_Metal.gltf','kaykit_dungeon_remastered/torch_mounted.gltf.glb'],fit:.5},
 chest:{f:['quaternius_props/Chest_Wood.gltf','kaykit_dungeon_remastered/chest.glb','kaykit_dungeon_remastered/trunk_medium_A.gltf.glb'],fit:1.0},
 banner:{f:['quaternius_props/Banner_1.gltf','kaykit_dungeon_remastered/banner_patternA_green.gltf.glb','kaykit_dungeon_remastered/banner_green.gltf.glb'],fit:1.7},
 shelf:{f:['quaternius_props/Shelf_Simple.gltf','kaykit_dungeon_remastered/shelf_small_candles.gltf.glb','kaykit_dungeon_remastered/shelf_small.gltf.glb'],fit:1.0},
 jar:{f:['quaternius_props/Vase_2.gltf','kaykit_restaurant_bits/jar_A_medium.gltf','kaykit_restaurant_bits/jar_B_medium.gltf'],fit:.26},
 bottle:{f:['quaternius_props/Bottle_1.gltf','kaykit_dungeon_remastered/bottle_A_green.gltf.glb','kaykit_dungeon_remastered/bottle_B_brown.gltf.glb'],fit:.26},
 mug:{f:['quaternius_props/Mug.gltf','kenney_food/mug.glb'],fit:.12},
 plate:{f:['quaternius_props/Table_Plate.gltf','kaykit_dungeon_remastered/plate_food_A.gltf.glb','kenney_food/plate.glb'],fit:.24},
 bench:{f:['quaternius_props/Bench.gltf'],fit:2.78},
 sack:{f:['quaternius_props/Bag.gltf'],fit:.62},
 workbench:{f:['quaternius_props/Workbench.gltf'],fit:2.02},
 book:{f:['quaternius_props/BookGroup_Small_1.gltf'],fit:.3},
 books:{f:['quaternius_props/Book_Stack_1.gltf'],fit:.3},
 cabinet:{f:['quaternius_props/Cabinet.gltf'],fit:1.36},
 bookcase:{f:['quaternius_props/Bookcase_2.gltf'],fit:2.5},
 lantern_wall:{f:['quaternius_props/Lantern_Wall.gltf'],fit:.6},
 potion:{f:['quaternius_props/Potion_1.gltf'],fit:.22},
 coins:{f:['quaternius_props/Coin_Pile.gltf'],fit:.3},
 farmcrate:{f:['quaternius_props/FarmCrate_Apple.gltf'],fit:.6},
 wagon:{f:['quaternius_village/Prop_Wagon.gltf'],fit:4.0},
 stove:{f:['kaykit_restaurant_bits/stove_single.gltf'],fit:1.0},
 kitchentable:{f:['kaykit_restaurant_bits/kitchentable_A.gltf'],fit:1.4},
 bread:{f:['kenney_food/bread.glb','kenney_food/loaf.glb'],fit:.28},
 meat:{f:['kenney_food/meat-raw.glb'],fit:.26},
 mush:{f:['kenney_food/mushroom.glb'],fit:.16},
 stew:{f:['kenney_food/bowl-soup.glb','kaykit_restaurant_bits/stew_bowl.gltf'],fit:.2},
 ham:{f:['kenney_food/whole-ham.glb'],fit:.3},
 cheese:{f:['kenney_food/cheese.glb'],fit:.2},
 sausage:{f:['kenney_food/sausage.glb'],fit:.22},
 pumpkin:{f:['kenney_food/pumpkin.glb'],fit:.3},
 fish:{f:['kenney_food/fish.glb'],fit:.3},
 turkey:{f:['kenney_food/turkey.glb'],fit:.3},
};
// 공용 텍스처(트림 시트)는 먼저 재시도 있는 fetch 로 받아 두고 blob 주소로 바꿔 준다 (로컬 서버가 동시 요청을 끊는 일이 있다)
const LM=new THREE.LoadingManager(),BLOB={};LM.setURLModifier(u=>BLOB[u]||u);
const TEXL=new THREE.TextureLoader(LM),GLTFL=new GLTFLoader(LM);
function fetchRetry(url,n=3){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),8000);return fetch(url,{signal:ac.signal}).then(r=>{if(!r.ok)throw r.status;return r.blob();}).finally(()=>clearTimeout(t)).catch(e=>n>1?new Promise(res=>setTimeout(res,400)).then(()=>fetchRetry(url,n-1)):Promise.reject(e));}
function prewarm(){const man=ASSETS.man,urls=[];
  Object.entries(man.tex||{}).forEach(([k,t])=>(t.maps||[]).forEach(m=>urls.push(ASSET_BASE+'tex/'+k+'_'+m+'.jpg')));
  const q=man.quaternius;if(q&&!QF.has('nq'))Object.entries(q).forEach(([k,list])=>{if(!k.endsWith(':tex'))return;const dir=k.slice(0,-4);list.forEach(f=>urls.push(ASSET_BASE+'models/'+dir+'/'+f));});
  let i=0;const worker=()=>{if(i>=urls.length)return Promise.resolve();const u=urls[i++];return fetchRetry(u).then(b=>{BLOB[u]=URL.createObjectURL(b);}).catch(()=>{}).then(worker);};
  return Promise.all([0,1,2,3].map(worker));}
function assetTex(name,srgb){const t=TEXL.load(ASSET_BASE+'tex/'+name,undefined,undefined,()=>{});t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function assetTexSet(k){if(ASSETS.tex[k])return ASSETS.tex[k];const maps=(ASSETS.man.tex[k]||{}).maps||[];const s={map:assetTex(k+'_Color.jpg',true)};if(maps.includes('NormalGL'))s.normalMap=assetTex(k+'_NormalGL.jpg');if(maps.includes('Roughness'))s.roughnessMap=assetTex(k+'_Roughness.jpg');if(maps.includes('AmbientOcclusion'))s.aoMap=assetTex(k+'_AmbientOcclusion.jpg');return ASSETS.tex[k]=s;}
// 절차 재질에 실제 텍스처를 입힌다 (재질 캐시 MC를 돌며 종류별로)
function applyTextures(){Object.values(MC).forEach(m=>{const kind=m.userData.kind;const T=TEXMAP[kind];if(!T||!ASSETS.man.tex[T.k])return;const set=assetTexSet(T.k);const rot=m.userData.rot||T.rot;
  const use=t=>{if(!t)return null;const c=t.clone();c.needsUpdate=true;if(rot){c.center.set(.5,.5);c.rotation=Math.PI/2;}return c;};
  m.map=use(set.map);m.normalMap=use(set.normalMap);m.roughnessMap=use(set.roughnessMap);if(m.normalMap)m.normalScale.set(.8,.8);if(m.roughnessMap)m.roughness=1;if(T.tint)m.color.setRGB(...T.tint);m.userData.tile=T.tile;m.needsUpdate=true;});
  // 기존 기하의 UV는 절차 타일 기준이라 새 타일에 맞춰 다시 편다
  scene.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.uv||!o.userData.box)return;const m=Array.isArray(o.material)?o.material.find(q=>q.userData&&q.userData.tile):o.material;if(!m||!m.userData.tile)return;const {w,h,d}=o.userData.box;worldUV(o.geometry,w,h,d,m.userData.tile);o.geometry.attributes.uv.needsUpdate=true;});}
// 소품 자리: 절차 소품을 만든 곳에 anchor()를 걸면 모델이 오면 바꿔 끼운다
function anchor(key,x,y,z,ry,group,opt={}){const meshes=[];group.traverse(o=>{if(o.isMesh){o.userData.keep=true;meshes.push(o);}});ASSETS.anchors.push({key,x,y,z,ry:ry||0,meshes,group,opt});return group;}
// 불러온 모델 재질 손질: KayKit 단색은 조금 밝게, Quaternius 는 그대로
function tuneModel(root,q){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(!m)return;if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;m.envMapIntensity=q?.5:.4;if(!q&&m.color)m.color.multiplyScalar(1.15);
  // Quaternius ORM 은 파랑(금속) 채널이 비어 있지 않은 것이 있어 회벽이 금속처럼 검게 나온다 → 이름에 Metal 이 없으면 비금속으로
  if(q&&!/metal/i.test(m.name||'')){m.metalness=0;m.metalnessMap=null;m.needsUpdate=true;}});}});}
function loadModel(key){const M0=MODELMAP[key];if(!M0||ASSETS.models[key]!==undefined)return ASSETS.models[key];ASSETS.models[key]=null;const files=M0.f.filter(f=>hasFile(f));if(!files.length)return null;ASSETS.pending++;
  GLTFL.load(ASSET_BASE+'models/'+files[0],g=>{const root=g.scene;tuneModel(root,files[0].startsWith('quaternius'));
    const box=new THREE.Box3().setFromObject(root);const size=box.getSize(new THREE.Vector3());const s=M0.fit/Math.max(size.x,size.y,size.z);root.scale.setScalar(s);const b2=new THREE.Box3().setFromObject(root);root.position.y-=b2.min.y;const c=b2.getCenter(new THREE.Vector3());root.position.x-=c.x;root.position.z-=c.z;
    const holder=new THREE.Group();holder.add(root);ASSETS.models[key]=holder;ASSETS.pending--;placeAnchors(key);},undefined,()=>{ASSETS.pending--;ASSETS.models[key]=null;});return null;}
function hasFile(f){const man=ASSETS.man;if(!man)return false;const [dir,name]=f.split('/');if(dir==='kenney_food')return man.kenney.includes(name);if(dir==='polypizza')return man.polypizza.includes(name);
  if(dir.startsWith('quaternius_'))return !QF.has('nq')&&!!man.quaternius&&(man.quaternius[dir]||[]).includes(name);return (man.kaykit[dir]||[]).includes(name);}
// 파일 단위 로더 (마을 모듈·인물처럼 MODELMAP 밖의 것). 같은 파일은 한 번만
const GLTFCACHE={};
function loadFile(f){if(GLTFCACHE[f])return GLTFCACHE[f];return GLTFCACHE[f]=new Promise((res,rej)=>{if(!hasFile(f))return rej('no '+f);let tries=0;const go=()=>GLTFL.load(ASSET_BASE+'models/'+f,g=>{tuneModel(g.scene,true);res(g);},undefined,e=>{if(++tries<3)setTimeout(go,500);else rej(e);});go();});}
// ───────── 모듈 집: 상자 집 자리에 2 m 격자 벽·모서리·지붕을 세운다 (Medieval Village MegaKit) ─────────
const VMOD={brick:'Wall_UnevenBrick_Straight',brickWin:'Wall_UnevenBrick_Window_Wide_Flat',brickDoor:'Wall_UnevenBrick_Door_Flat',door:'Door_1_Flat',plaster:'Wall_Plaster_WoodGrid',plasterWin:'Wall_Plaster_Window_Wide_Flat',plasterPlain:'Wall_Plaster_Straight',corner:'Corner_Exterior_Wood',base:'Wall_BottomCover',chimney:'Prop_Chimney',shutter:'WindowShutters_Wide_Flat_Open',win:'Window_Wide_Flat1'};
function buildHouses(){if(QF.has('novillage')||!HOUSES.length)return;const files=[...new Set(Object.values(VMOD))].map(n=>'quaternius_village/'+n+'.gltf');if(!files.every(hasFile))return;
  Promise.all(files.map(loadFile)).then(gs=>{const P={};Object.entries(VMOD).forEach(([k,n])=>{P[k]=gs[files.indexOf('quaternius_village/'+n+'.gltf')].scene;});
    const FH=3.12,W=2;let hi=0;
    // 모듈 벽은 회벽 면이 비어 있어(목골조만) 속 상자가 회벽 노릇을 한다. 살짝 줄여 겹침(z-fighting)을 피한다
    const PL=MC[Object.keys(MC).find(k=>k.startsWith('plaster'))]||new THREE.MeshStandardMaterial({color:0xcdbf9f,roughness:1});
    HOUSES.forEach(H=>{H.meshes.forEach((m,i)=>{if(i===0){m.material=PL;m.castShadow=false;const b=m.userData.box;m.scale.set((b.w-.12)/b.w,1,(b.d-.12)/b.d);}else m.visible=false;});const g=new THREE.Group();scene.add(g);const put=(k,x,y,z,ry)=>{const m=P[k].clone();m.position.set(x,y,z);m.rotation.y=ry;g.add(m);return m;};
      const nx=Math.max(2,Math.ceil((H.x2-H.x1)/W-.01)),nz=Math.max(2,Math.ceil((H.z2-H.z1)/W-.01)),x1=H.x1,z1=H.z1,x2=x1+nx*W,z2=z1+nz*W,floors=Math.max(2,Math.round(H.h/FH)),v=hi++;
      const doorSide=v%4,doorAt=Math.floor(nx/2);
      // 벽: 바깥면이 +z 인 모듈을 네 변에 돌려 세운다. 남(z2) ry=0, 북(z1) ry=π, 동(x2) ry=π/2, 서(x1) ry=-π/2
      const sides=[{n:nx,ry:0,at:i=>[x1+W/2+i*W,z2]},{n:nx,ry:Math.PI,at:i=>[x2-W/2-i*W,z1]},{n:nz,ry:Math.PI/2,at:i=>[x2,z2-W/2-i*W]},{n:nz,ry:-Math.PI/2,at:i=>[x1,z1+W/2+i*W]}];
      sides.forEach((S,si)=>{for(let i=0;i<S.n;i++){const [x,z]=S.at(i);for(let f=0;f<floors;f++){const y=f*FH;let k;
          if(f===0){k=(si===doorSide&&i===doorAt)?'brickDoor':((i+v)%3===1?'brickWin':'brick');if(k==='brickDoor'){const d=put('door',x,y,z,S.ry);d.translateX(-.5);}}
          else{k=(i+f+v)%3===0?'plasterWin':(i+v)%2?'plaster':'plasterPlain';}
          const m=put(k,x,y,z,S.ry);if(k==='plasterWin'||k==='brickWin'){put('win',x,y,z,S.ry);if(k==='plasterWin'&&(i+v)%2)put('shutter',x,y,z,S.ry);}}
        put('base',x,0,z,S.ry);}});
      [[x1,z1],[x2,z1],[x1,z2],[x2,z2]].forEach(([cx,cz])=>{for(let f=0;f<floors;f++)put('corner',cx,f*FH,cz,0);});
      // 지붕: 박공(긴 축이 용마루) — 인 지붕과 같은 기와 재질. 굴뚝 하나
      const top=floors*FH,alongX=nx>=nz,span=alongX?(z2-z1):(x2-x1),len=(alongX?(x2-x1):(z2-z1))+.8,rise=span*.42,rl=Math.hypot(span/2+.4,rise),ra=Math.atan2(rise,span/2+.4);
      const rm=MC[Object.keys(MC).find(k=>k.startsWith('roof'))]||new THREE.MeshStandardMaterial({color:0x6a4a3a});
      [[-1],[1]].forEach(([s])=>{const r=new THREE.Mesh(worldUV(new THREE.BoxGeometry(alongX?len:rl,.14,alongX?rl:len),alongX?len:rl,.14,alongX?rl:len,rm.userData.tile),rm);const cx=(x1+x2)/2,cz=(z1+z2)/2;
        r.position.set(alongX?cx:cx+s*(span/4+.2),top+rise/2,alongX?cz+s*(span/4+.2):cz);if(alongX)r.rotation.x=-s*ra;else r.rotation.z=-s*ra;r.castShadow=true;r.receiveShadow=true;g.add(r);});
      {const sh=new THREE.Shape();sh.moveTo(-span/2,0);sh.lineTo(span/2,0);sh.lineTo(0,rise);sh.lineTo(-span/2,0);const wm=MC[Object.keys(MC).find(k=>k.startsWith('plaster'))]||rm;
        [[-1],[1]].forEach(([s])=>{const mm=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.2,bevelEnabled:false}),wm);if(alongX){mm.rotation.y=Math.PI/2;mm.position.set((x1+x2)/2+s*len/2-s*.5,top,(z1+z2)/2);}else{mm.position.set((x1+x2)/2,top,(z1+z2)/2+s*len/2-s*.5);}g.add(mm);});}
      put('chimney',(x1+x2)/2+(alongX?len*.28:span*.1),top+rise*.35,(z1+z2)/2+(alongX?span*.1:len*.28),0);
      g.userData.noReceive=true;bake(g);});
    renderer.shadowMap.needsUpdate=true;window.__vill=true;console.log('village houses',HOUSES.length);}).catch(e=>console.warn('village',e));}
function placeAnchors(key){const proto=ASSETS.models[key];if(!proto)return;ASSETS.anchors.filter(a=>a.key===key&&!a.placed).forEach(a=>{a.placed=true;a.meshes.forEach(m=>m.visible=false);const inst=proto.clone();inst.position.set(a.x,a.y,a.z);inst.rotation.y=a.ry;if(a.opt.s)inst.scale.multiplyScalar(a.opt.s);scene.add(inst);a.inst=inst;});}
function modelFor(key){const m=ASSETS.models[key];return m?m.clone():null;}
// 소리: 파일이 있으면 합성음 대신 튼다
const SFXMAP={step:['footstep00.ogg','footstep01.ogg','footstep02.ogg','footstep03.ogg','footstep04.ogg','footstep05.ogg'],door:['doorOpen_1.ogg','doorOpen_2.ogg'],doorClose:['doorClose_1.ogg','doorClose_2.ogg'],creak:['creak1.ogg','creak2.ogg','creak3.ogg'],knock:['impactWood_medium_000.ogg','impactWood_medium_001.ogg','impactWood_medium_002.ogg'],coin:['handleCoins.ogg','handleCoins2.ogg'],flip:['bookFlip1.ogg','bookFlip2.ogg','bookFlip3.ogg'],wood:['impactWood_heavy_000.ogg','impactWood_heavy_001.ogg'],hit:['impactWood_heavy_002.ogg','impactWood_heavy_003.ogg'],plate:['impactPlate_light_000.ogg','impactPlate_light_001.ogg'],glass:['impactGlass_light_000.ogg'],pot:['metalPot1.ogg','metalPot2.ogg','metalPot3.ogg'],chop:['chop.ogg','knifeSlice.ogg']};
function loadSfx(){if(!ASSETS.man||!AC)return;Object.entries(SFXMAP).forEach(([k,files])=>{const have=files.filter(f=>ASSETS.man.sfx.includes(f));if(!have.length)return;ASSETS.sfx[k]=[];have.forEach(f=>{fetch(ASSET_BASE+'sfx/'+f).then(r=>r.arrayBuffer()).then(b=>AC.decodeAudioData(b)).then(buf=>ASSETS.sfx[k].push(buf)).catch(()=>{});});});}
function playSfxFile(k,vol=1){const L=ASSETS.sfx[k];if(!L||!L.length||!AC)return false;const s=AC.createBufferSource();s.buffer=L[Math.floor(Math.random()*L.length)];const g=AC.createGain();g.gain.value=vol;s.playbackRate.value=.92+Math.random()*.16;s.connect(g);g.connect(LP);s.start();return true;}
function assetsInit(){if(!ASSETS.on)return;fetch(ASSET_BASE+'manifest.json').then(r=>r.ok?r.json():null).then(m=>{if(!m)return;ASSETS.man=m;return prewarm().then(()=>{applyTextures();Object.keys(MODELMAP).forEach(k=>{if(ASSETS.anchors.some(a=>a.key===k)||['bread','meat','mush','stew','ham','cheese'].includes(k))loadModel(k);});buildHouses();if(typeof rigInit==='function')rigInit();});}).catch(e=>console.warn('assets',e));}

// ───── 20_props.js ─────
// ───────── 소품·조명·문 ─────────
const LIGHTS={};
function plight(key,x,y,z,col,int,dist){const l=new THREE.PointLight(col,int,dist,1.6);l.position.set(x,y,z);scene.add(l);LIGHTS[key]={l,base:int};return l;}
function emis(x1,y1,z1,x2,y2,z2,col){return box(x1,y1,z1,x2,y2,z2,new THREE.MeshBasicMaterial({color:col}),{shadow:false});}
const sun=new THREE.DirectionalLight(0xfff0d8,1.1);sun.position.set(-20,30,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:110});sun.shadow.bias=-.0008;sun.shadow.normalBias=.08;sun.shadow.radius=3;sun.target.position.set(12,0,6);scene.add(sun,sun.target);
const hemi=new THREE.HemisphereLight(0xdfe8ff,0x3a2a1c,.55);scene.add(hemi);
const WOOD=M('walnut'),WOODR=M('walnut',{rot:1}),LINEN=M('linen'),CLOTH=M('cloth'),LEATH=M('leather'),WAX=M('#efe2c4',{rough:.6}),BONE=M('#e6dcc4',{rough:.7}),CERA=M('#9a6a4a',{rough:.5}),GLASSB=M('#6e8a5a',{rough:.1,transparent:true,opacity:.75,env:1.4}),GLASSA=M('#a0522d',{rough:.1,transparent:true,opacity:.8,env:1.4});
// ───────── 가구 조립 (그룹 → 굽기) ─────────
function grp(x,z,ry=0,y=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;(DP||scene).add(g);return g;}
const P2=(g)=>({parent:g});
function table(x1,z1,x2,z2,h=.78,m=WOOD,y0=0){const g=grp(0,0,0,y0),top=h;rbox(x1,top-.06,z1,x2,top,z2,m,.02,P2(g));rbox(x1+.06,top-.16,z1+.06,x2-.06,top-.06,z2-.06,m,.01,P2(g));
  [[x1+.1,z1+.1],[x2-.1,z1+.1],[x1+.1,z2-.1],[x2-.1,z2-.1]].forEach(([x,z])=>rbox(x-.045,0,z-.045,x+.045,top-.06,z+.045,m,.012,P2(g)));return g;}
function chair(x,z,ry,y0=0){const g=grp(x,z,ry,y0);anchor('chair',x,y0,z,ry,g);rbox(-.21,.42,-.21,.21,.47,.21,WOOD,.015,P2(g));[[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]].forEach(([a,b])=>rbox(a-.022,0,b-.022,a+.022,.42,b+.022,WOOD,.008,P2(g)));
  [-.18,.18].forEach(a=>rbox(a-.025,.47,-.21,a+.025,1.02,-.16,WOOD,.01,P2(g)));[.62,.82,.98].forEach(y=>rbox(-.18,y,-.205,.18,y+.06,-.17,WOOD,.01,P2(g)));return g;}
function stool(x,z,y0=0){const g=grp(x,z,0,y0);anchor('stool',x,y0,z,0,g);cyl(0,.46,0,.18,.18,.05,WOOD,12,P2(g));for(let i=0;i<3;i++){const a=i*2.1;const l=cyl(Math.cos(a)*.12,.22,Math.sin(a)*.12,.02,.025,.46,WOOD,6,P2(g));l.rotation.set(Math.sin(a)*.12,0,-Math.cos(a)*.12);}return g;}
function bench(x1,z1,x2,z2,h=.45){const g=grp(0,0);{const along=x2-x1>z2-z1;anchor('bench',(x1+x2)/2,0,(z1+z2)/2,along?0:Math.PI/2,g,{s:(along?x2-x1:z2-z1)/2.78});}rbox(x1,h-.05,z1,x2,h,z2,WOOD,.015,P2(g));const along=x2-x1>z2-z1;[[.15],[.85]].forEach(([t])=>{const px=along?x1+(x2-x1)*t:(x1+x2)/2,pz=along?(z1+z2)/2:z1+(z2-z1)*t;rbox(px-.04,0,pz-.13,px+.04,h-.05,pz+.13,WOOD,.01,P2(g));});return g;}
function barrel(x,z,y=0,r=.3,h=.8,ry=0,lay=false){const g=grp(x,z,ry,y);if(!lay)anchor(r<.29?'keg':'barrel',x,y,z,ry,g);const b=cyl(0,lay?r:h/2,0,r,r,h,WOODR,16,P2(g));const bw=cyl(0,lay?r:h/2,0,r*1.06,r*1.06,h*.55,WOODR,16,P2(g));
  [-.38,0,.38].forEach(t=>{const hp=cyl(0,(lay?r:h/2)+t*h,0,r*(t?1.035:1.075),r*(t?1.035:1.075),.035,IRONM,16,P2(g));if(lay){hp.position.set(t*h,r,0);hp.rotation.z=Math.PI/2;}});
  if(lay){b.rotation.z=bw.rotation.z=Math.PI/2;b.position.set(0,r,0);bw.position.set(0,r,0);}else cyl(0,h+.005,0,r*.96,r*.96,.01,WOOD,16,P2(g));return g;}
function crate(x,y,z,s=.5,ry=0){const g=grp(x,z,ry,y);anchor('crate',x,y,z,ry,g,{s:s/.6});rbox(-s/2,0,-s/2,s/2,s,s/2,M('plank',{tile:[.6,.3]}),.01,P2(g));[-1,1].forEach(k=>{box(-s/2-.01,0,k*s/2-.03,s/2+.01,.05,k*s/2+.01,WOOD,P2(g));box(-s/2-.01,s-.05,k*s/2-.03,s/2+.01,s,k*s/2+.01,WOOD,P2(g));});return g;}
function sack(x,z,s=1,ry=0){const g=grp(x,z,ry);anchor('sack',x,0,z,ry,g,{s});sph(0,.22*s,0,.26*s,M('#9a8664',{rough:1}),1,1.1,.85,P2(g));sph(0,.5*s,0,.09*s,M('#9a8664',{rough:1}),1,1,1,P2(g));cyl(0,.45*s,0,.05*s,.06*s,.05,M('#6a5a3a'),8,P2(g));return g;}
function jar(x,y,z,h=.2,col='#8a5a3a',r=.07){const g=grp(x,z,0,y);anchor('jar',x,y,z,Math.random()*6,g,{s:h/.22});const m=M(col,{rough:.45});cyl(0,h*.45,0,r,r*.85,h*.9,m,12,P2(g));cyl(0,h*.95,0,r*.6,r*.7,h*.12,m,12,P2(g));cyl(0,h*1.04,0,r*.5,r*.55,.03,M('#b89468'),8,P2(g));return g;}
function bottle(x,y,z,col,h=.26){const g=grp(x,z,0,y);anchor('bottle',x,y,z,Math.random()*6,g,{s:h/.26});const m=col==='g'?GLASSB:GLASSA;cyl(0,h*.35,0,.045,.045,h*.7,m,10,P2(g));cyl(0,h*.78,0,.018,.04,h*.18,m,8,P2(g));cyl(0,h*.93,0,.016,.016,h*.14,m,8,P2(g));cyl(0,h*1.02,0,.017,.017,.03,M('#b89468'),6,P2(g));return g;}
function candle(x,y,z,key='misc',h=.14){const g=grp(x,z,0,y);cyl(0,h/2,0,.022,.024,h,WAX,8,P2(g));cyl(0,.004,0,.05,.055,.008,BRASSM,10,P2(g));anchor('candle',x,y,z,0,g,{s:h/.14});return flame(x,y+h,z,1,key);}
function mug(x,y,z){const g=grp(x,z,0,y);cyl(0,.06,0,.04,.037,.12,M('#7a5236',{rough:.6}),10,P2(g));anchor('mug',x,y,z,Math.random()*6,g);}
function plate(x,y,z){const g=grp(x,z,0,y);cyl(0,.008,0,.12,.1,.016,M('#d8cbb0',{rough:.4}),16,P2(g));anchor('plate',x,y,z,0,g);}
function book(x,y,z,w=.18,h=.04,d=.24,col='#6a2a22',ry=0){const g=grp(x,z,ry,y);rbox(-w/2,0,-d/2,w/2,h,d/2,M(col,{rough:.7}),.008,P2(g));box(-w/2+.01,.006,-d/2+.012,w/2,h-.006,d/2-.012,M('#e8dcc0'),P2(g));return g;}
// 쇠고리 샹들리에: 사슬 + 고리 + 초
function chandelier(x,y,z,key,r=.45,n=6){const g=grp(x,z,0,y);anchor('chandelier',x,y-.2,z,0,g,{s:r/.45});const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.025,6,24),IRONM);ring.rotation.x=Math.PI/2;g.add(ring);cyl(0,.35,0,.012,.012,.7,IRONM,6,P2(g));
  for(let i=0;i<3;i++){const a=i*2.094;const c=cyl(Math.cos(a)*r/2,.2,Math.sin(a)*r/2,.008,.008,.52,IRONM,4,P2(g));c.rotation.set(Math.sin(a)*.7,0,-Math.cos(a)*.7);}
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2;candle(x+Math.cos(a)*r,y+.02,z+Math.sin(a)*r,key,.12);}return g;}
function sconce(x,y,z,nx,nz,key){const g=grp(x,z,Math.atan2(nx,nz),y);box(-.05,-.14,-.02,.05,.1,.0,IRONM,P2(g));box(-.012,-.02,0,.012,.02,.16,IRONM,P2(g));candle(x+nx*.17,y+.02,z+nz*.17,key,.13);return g;}
function hangLantern(x,y,z,key){const g=grp(x,z,0,y);box(-.09,-.22,-.09,.09,-.2,.09,IRONM,P2(g));box(-.09,0,-.09,.09,.02,.09,IRONM,P2(g));[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(a*.09-.01,-.2,b*.09-.01,a*.09+.01,0,b*.09+.01,IRONM,P2(g)));
  const gl=box(-.08,-.2,-.08,.08,0,.08,GLASS,P2(g));gl.userData.keep=true;cyl(0,.12,0,.01,.01,.2,IRONM,4,P2(g));flame(x,y-.18,z,1.3,key);return g;}
function rug(x1,z1,x2,z2,y=.006,kind='rug'){const m=M(kind,{rough:1});const p=new THREE.Mesh(new THREE.PlaneGeometry(x2-x1,z2-z1),m);p.rotation.x=-Math.PI/2;p.position.set((x1+x2)/2,y,(z1+z2)/2);p.receiveShadow=true;(DP||scene).add(p);
  if(kind==='runner'){const W=x2-x1,H=z2-z1,pos=p.geometry.attributes.position,uv=p.geometry.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getY(i)/H+.5,pos.getX(i)/2.2);}return p;}
// 종이 쪽지 (의뢰서·수배서): 캔버스로 글줄과 그림을 그린다
function paperTex(i){const c=cnv(128,160),x=c.getContext('2d');seed=300+i*17;x.fillStyle=['#e9dfc4','#e3d6b6','#efe6cf','#ddcfae'][i%4];x.fillRect(0,0,128,160);blot(x,128,6,10,40,'150,120,80',.05,.15);
  x.fillStyle='#3a2a20';x.font='bold 16px serif';x.textAlign='center';x.fillText(['의뢰','수배','구함','경고','공고'][i%5],64,24);x.fillStyle='rgba(58,42,32,.8)';for(let k=0;k<7;k++)x.fillRect(14,40+k*14+(k>2&&i%2?30:0),70+rr()*30,3);
  if(i%2){x.strokeStyle='#5a3a2a';x.lineWidth=2;x.beginPath();x.ellipse(64,70,22,16,0,0,7);x.moveTo(50,66);x.lineTo(44,56);x.moveTo(78,66);x.lineTo(84,56);x.stroke();}
  x.fillStyle='#a8322a';x.beginPath();x.arc(100,140,9,0,7);x.fill();const t=toTex(c);return t;}
function notes(x1,x2,y1,y2,z,dir,n=7){const w=(x2-x1)/n;for(let i=0;i<n;i++){const m=new THREE.MeshStandardMaterial({map:paperTex(i),roughness:.9});const p=new THREE.Mesh(new THREE.PlaneGeometry(.24,.3),m);
  p.position.set(x1+w*(i+.5)+(rr()-.5)*.08,y1+(y2-y1)*((i*37)%100)/100,z);p.rotation.set(0,dir>0?0:Math.PI,(rr()-.5)*.25);(DP||scene).add(p);cyl(p.position.x,p.position.y+.12,z+dir*.005,.01,.01,.02,BRASSM,6,{rx:Math.PI/2,parent:DP||scene});}}
// 깃발 (등불 문장)
const BANNERTEX=(()=>{const c=cnv(128,256),x=c.getContext('2d');x.fillStyle='#2f4a3a';x.fillRect(0,0,128,256);x.fillStyle='#c9a45a';x.fillRect(0,0,128,10);x.fillRect(0,0,8,256);x.fillRect(120,0,8,256);
  x.beginPath();x.moveTo(0,256);x.lineTo(64,210);x.lineTo(128,256);x.fillStyle='#000';x.globalCompositeOperation='destination-out';x.fill();x.globalCompositeOperation='source-over';
  x.fillStyle='#c9a45a';x.fillRect(58,40,12,14);x.beginPath();x.roundRect(40,54,48,62,10);x.fill();x.fillStyle='#2f4a3a';x.beginPath();x.ellipse(64,86,12,18,0,0,7);x.fill();x.fillStyle='#ffdf8a';x.beginPath();x.ellipse(64,90,6,10,0,0,7);x.fill();
  x.fillStyle='#c9a45a';x.font='bold 22px serif';x.textAlign='center';x.fillText('무사귀환',64,160);fibers(x,128,256,3000,3,.2,true);return toTex(c);})();
function banner(x,y,z,ry){const m=new THREE.MeshStandardMaterial({map:BANNERTEX,roughness:1,transparent:true,alphaTest:.5,side:THREE.DoubleSide});const p=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.6,1,8),m);
  const pos=p.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getY(i)*4)*.025);p.geometry.computeVertexNormals();p.position.set(x,y,z);p.rotation.y=ry;scene.add(p);
  const rod=cyl(x,y+.82,z,.02,.02,.95,OAK,6,{rz:Math.PI/2,ry:ry});return p;}
// 마물 두개골 트로피
function skull(x,y,z,ry,s=1){const g=grp(x,z,ry,y);g.scale.setScalar(s);sph(0,0,0,.22,BONE,1,.85,1.2,P2(g));sph(0,-.08,.2,.14,BONE,1,.7,1.1,P2(g));[[-.08,.04,.19],[.08,.04,.19]].forEach(([a,b,c])=>sph(a,b,c,.045,M('#1a1410'),1,1,.6,P2(g)));
  [-1,1].forEach(k=>{const h=new THREE.Mesh(new THREE.ConeGeometry(.05,.42,8),BONE);h.position.set(k*.2,.14,-.02);h.rotation.set(-.4,0,k*-1.0);h.castShadow=true;g.add(h);});rbox(-.2,-.3,-.28,.2,.25,-.24,WOOD,.02,P2(g));return g;}
// 벽에 거는 초상화 (마그다)
function portrait(x,y,z,ry){const c=cnv(128,160),q=c.getContext('2d');seed=77;const gr=q.createLinearGradient(0,0,0,160);gr.addColorStop(0,'#2a2a22');gr.addColorStop(1,'#14120e');q.fillStyle=gr;q.fillRect(0,0,128,160);
  q.fillStyle='#3a2e28';q.beginPath();q.ellipse(64,150,46,40,0,0,7);q.fill();q.fillStyle='#c8a888';q.beginPath();q.ellipse(64,70,22,28,0,0,7);q.fill();q.fillStyle='#4a3a30';q.beginPath();q.ellipse(64,56,28,26,0,Math.PI,0);q.fill();q.fillRect(38,56,10,50);q.fillRect(80,56,10,50);
  q.fillStyle='#ffcf6a';q.beginPath();q.roundRect(92,96,18,26,4);q.fill();blot(q,128,10,10,40,'0,0,0',.1,.25);grain(q,128,14);
  const g=grp(x,z,ry,y);rbox(-.34,-.42,-.03,.34,.42,.02,M('#8a6a3a',{metal:.3,rough:.5}),.02,P2(g));const p=new THREE.Mesh(new THREE.PlaneGeometry(.56,.7),new THREE.MeshStandardMaterial({map:toTex(c),roughness:.6}));p.position.z=.025;g.add(p);return g;}

// ───────── 부엌 ─────────
DP=new THREE.Group();scene.add(DP);
box(1,0,1.2,6,.9,1.8,STONE,{col:1});rbox(.95,.9,1.15,6.05,.97,1.85,M('stone',{tile:[.5,.5]}),.02);                         // 화덕 턱
const potG=new THREE.Group();scene.add(potG);const pot=cyl(3.5,1.2,2.4,.55,.45,.62,M('#2a2a2e',{metal:.6,rough:.45}),20,{parent:potG});const potRim=new THREE.Mesh(new THREE.TorusGeometry(.55,.035,6,24),IRONM);potRim.rotation.x=Math.PI/2;potRim.position.set(3.5,1.5,2.4);potG.add(potRim);anchor('cauldron',3.5,.9,2.4,0,potG);
const potTop=new THREE.Mesh(new THREE.CircleGeometry(.52,20),new THREE.MeshStandardMaterial({color:0x3a3a3a,roughness:.3}));potTop.rotation.x=-Math.PI/2;potTop.position.set(3.5,1.47,2.4);scene.add(potTop);
cyl(3.5,2.2,2.4,.012,.012,1.4,IRONM,4);const bail=new THREE.Mesh(new THREE.TorusGeometry(.56,.012,4,20,Math.PI),IRONM);bail.position.set(3.5,1.5,2.4);scene.add(bail);
box(2.9,0,1.9,4.1,.5,2.9,M('stone',{tile:[.6,.6]}),{col:1});const fire1=emis(3.15,.5,2.15,3.85,.56,2.65,0xff8a3a);
[[3.3,2.3,.4],[3.7,2.5,-.5]].forEach(([x,z,r])=>cyl(x,.58,z,.05,.05,.6,M('#3a2418'),8,{rz:Math.PI/2,ry:r}));flame(3.35,.56,2.35,3.4,'hearth');flame(3.7,.56,2.5,3,'hearth');
// 연기 후드 (돌): 솥 위 사다리꼴
{const h=new THREE.Mesh(new THREE.CylinderGeometry(.55,1.0,.7,4,1,true),M('stone',{tile:[.6,.6]}));h.position.set(3.5,2.5,2.4);h.rotation.y=Math.PI/4;h.material.side=THREE.DoubleSide;h.castShadow=true;scene.add(h);}
pot.userData.it='pot';potTop.userData.it='pot';INTER.push(pot,potTop);
plight('hearth',3.5,1.4,2.8,0xff9a4a,2.2,7);
// 선반 두 단 + 받침쇠 + 병·단지 (재료 자리는 비워 둔다)
[1.3,2.0].forEach(y=>{rbox(.6,y,.12,6.4,y+.06,.55,WOODR,.012);[1,3.2,5.6].forEach(x=>box(x-.02,y-.22,.12,x+.02,y,.16,IRONM,{parent:DP}));});
jar(.9,1.36,.35,.24,'#8a5a3a');jar(5.0,1.36,.33,.2,'#6a4a3a');bottle(5.5,1.36,.35,'g');bottle(5.75,1.36,.3,'a');jar(6.1,1.36,.34,.28,'#9a7a5a',.08);
jar(.9,2.06,.34,.18,'#5a6a4a');bottle(1.3,2.06,.32,'a',.22);jar(4.2,2.06,.34,.22,'#8a5a3a');bottle(4.7,2.06,.3,'g');bottle(4.95,2.06,.34,'g',.2);jar(5.6,2.06,.33,.2,'#7a6a5a');jar(6.05,2.06,.35,.16,'#aa7a4a');
// 매단 약초·소시지 (막대)
cyl(3.5,2.62,3.9,.025,.025,5.2,WOOD,6,{rz:Math.PI/2,parent:DP});for(let i=0;i<11;i++){const x=1.2+i*.46;if(i%3===2){for(let k=0;k<3;k++)cyl(x+k*.04,2.42-k*.02,3.9,.028,.028,.3,M('#7a3a2a',{rough:.5}),6,{parent:DP});}
  else{const hb=new THREE.Mesh(new THREE.ConeGeometry(.07,.34,6),M(i%2?'#5a6a3a':'#7a6a3a',{rough:1}));hb.position.set(x,2.42,3.9);hb.rotation.x=Math.PI;DP.add(hb);}}
// 작업대 + 도마·빵·칼, 통, 자루, 물독
anchor('workbench',6.45,0,3.0,Math.PI/2,table(6.05,2.1,6.85,3.9,.86,WOODR),{s:1.8/2.02});box(6.15,.86,2.3,6.7,.89,2.8,M('walnut',{tile:[.4,.4]}),{parent:DP});sph(6.45,.94,3.25,.11,M('bread'),1.3,.7,1,{parent:DP});box(6.2,.89,3.55,6.6,.9,3.59,M('#b8b8c0',{metal:.9,rough:.3}),{parent:DP});
barrel(.55,4.3);barrel(1.2,4.45,0,.28,.72);sack(6.4,4.4);sack(5.9,4.55,.85,1);cyl(.6,.35,3.2,.24,.2,.7,M('#8a5a3a',{rough:.5}),14,{parent:DP});
stool(4.6,3.4);

// ───────── 식당 ─────────
const dtab=table(8.5,2.05,14.5,2.95,.8);[10,13].forEach(x=>anchor('table_long',x,0,2.5,0,dtab,{s:3/2.85}));box(8.5,0,2.05,14.5,.8,2.95,new THREE.MeshBasicMaterial({visible:false}),{col:1,shadow:false});
const tableHit=box(8.5,.8,2.05,14.5,.95,2.95,new THREE.MeshBasicMaterial({visible:false}),{shadow:false});tableHit.userData.it='table';INTER.push(tableHit);
[9.5,11.5,13.5].forEach(x=>{chair(x,1.35,0);chair(x,3.65,Math.PI);plate(x,.8,2.25);plate(x,.8,2.75);mug(x+.22,.8,2.3);mug(x-.22,.8,2.7);});
candle(10.5,.8,2.5,'dine');candle(12.5,.8,2.5,'dine');sph(11.5,.86,2.5,.14,M('bread'),1.4,.6,1,{parent:DP});cyl(11.5,.82,2.5,.2,.16,.05,M('#7a5a3a'),12,{parent:DP});
chandelier(11.5,2.35,2.5,'dine');plight('dine',11.5,2.2,2.5,0xffc47a,1.6,8);
// 찬장(그릇장)과 술통 받침
{const g=grp(11.9,.35);rbox(-1,0,-.22,1,1.0,.22,WOOD,.02,P2(g));rbox(-1.05,1.0,-.25,1.05,1.05,.25,WOOD,.015,P2(g));rbox(-1,1.05,-.06,1,2.1,.0,WOOD,.01,P2(g));[1.5,1.85].forEach(y=>rbox(-1,y,-.06,1,y+.03,.2,WOOD,.01,P2(g)));
  for(let i=0;i<6;i++){plate(11.2+i*.28,1.53,.44);mug(11.1+i*.34,1.88,.45);}}
box(15.1,0,.3,15.8,.5,1.3,WOOD,{parent:DP});barrel(15.45,.8,.5,.3,.7,0,true);cyl(15.45,.58,.52,.02,.02,.12,BRASSM,6,{parent:DP});
rug(8.1,1.0,14.9,4.0,.006,'rug');

// ───────── 홀 ─────────
// 벽난로: 돌 화구 + 굴뚝 가슴벽 + 선반 들보 + 마물 두개골
box(0,0,8.6,.7,1.4,10.4,new THREE.MeshBasicMaterial({visible:false}),{col:1,shadow:false});box(0,0,8.6,.7,1.4,9.0,STONE);box(0,0,10.0,.7,1.4,10.4,STONE);box(0,1.0,9.0,.7,1.4,10.0,STONE);box(0,0,9.0,.12,1.0,10.0,M('#1a1410',{rough:1}));box(0,0,9.0,.7,.1,10.0,STONE);
box(0,1.4,8.4,.9,1.55,10.6,OAKH);box(0,1.55,8.7,.6,2.9,10.3,STONE);box(.7,0,8.45,.95,.12,10.55,STONE,{parent:DP});const fire2=emis(.15,.1,9.1,.55,.25,9.9,0xff7a2a);[[9.3],[9.7]].forEach(([z])=>cyl(.4,.18,z,.06,.06,.5,M('#3a2418'),8,{rx:Math.PI/2}));flame(.4,.22,9.4,3.2,'hearth2');flame(.42,.22,9.7,2.6,'hearth2');
plight('hearth2',1.1,.8,9.5,0xff8a3a,2.0,8);skull(.9,2.15,9.5,Math.PI/2,1.1);candle(.6,1.55,8.8,'hall');candle(.6,1.55,10.2,'hall');jar(.55,1.55,9.1,.14,'#7a5a3a',.05);
rug(1.2,8.2,3.8,10.8,.006,'rug');bench(1.7,7.6,3.5,7.95);chair(3.1,10.7,-Math.PI/2-.5);chair(3.1,8.2,-Math.PI/2+.5);
// 계산대: 장부·잉크·종·등
{const g=grp(0,0);rbox(5,0,8.6,7.4,1.0,9.2,WOOD,.02,P2(g));[5.6,6.2,6.8].forEach(x=>rbox(x-.25,.15,9.19,x+.25,.85,9.24,WOODR,.015,P2(g)));}
box(5,0,8.6,7.4,1.0,9.2,new THREE.MeshBasicMaterial({visible:false}),{col:1,shadow:false});
const desk=rbox(4.95,1.0,8.55,7.45,1.06,9.25,WOODR,.015);desk.userData.it='desk';INTER.push(desk);
anchor('book',6.0,1.06,8.9,.1,book(6.0,1.06,8.9,.34,.05,.26,'#5a2a1e',.1));cyl(6.5,1.1,8.8,.03,.035,.08,M('#1a2030',{rough:.2}),8,{parent:DP});cyl(6.53,1.2,8.8,.004,.002,.18,M('#e8e0d0'),4,{rz:.3,parent:DP});
sph(5.4,1.1,8.8,.07,BRASSM,1,.7,1,{parent:DP});hangLantern(7.1,1.3,8.8,'hall');
// 의뢰 게시판 (남쪽 벽)
box(6,1.2,11.84,8.4,2.3,11.9,M('#8a5a36',{rough:1}),{parent:DP});{const hb=box(5.95,1.1,11.7,8.45,2.4,11.9,new THREE.MeshBasicMaterial({visible:false}),{shadow:false});hb.userData.it='board';INTER.push(hb);}[[6,1.15,8.4,1.22],[6,2.28,8.4,2.36]].forEach(([a,b,c,d])=>box(a-.05,b,11.8,c+.05,d,11.9,OAKH,{parent:DP}));
[5.95,8.4].forEach(x=>box(x,1.15,11.8,x+.06,2.36,11.9,OAK,{parent:DP}));notes(6.1,8.3,1.35,2.1,11.83,-1,7);
box(6.5,2.42,11.8,7.9,2.62,11.88,WOODR,{parent:DP});
// 깃발, 무기 거치대, 망토 걸이, 둥근 탁자
banner(16.7,2.0,11.82,Math.PI);
{const g=grp(21.2,11.75,Math.PI);rbox(-.7,1.0,-.05,.7,1.08,.05,WOODR,.01,P2(g));rbox(-.7,1.6,-.05,.7,1.68,.05,WOODR,.01,P2(g));[-.45,-.15,.15].forEach(a=>{cyl(a,1.3,-.08,.018,.018,2.4,WOOD,6,P2(g)).rotation.z=.08;const tip=new THREE.Mesh(new THREE.ConeGeometry(.04,.22,6),M('#b8b8c0',{metal:.9,rough:.3}));tip.position.set(a+.1,2.55,-.08);tip.rotation.z=.08;g.add(tip);});
  const sh=cyl(.45,1.45,-.1,.32,.32,.05,WOOD,20,{rx:Math.PI/2,parent:g});cyl(.45,1.45,-.13,.08,.08,.03,BRASSM,12,{rx:Math.PI/2,parent:g});const rim=new THREE.Mesh(new THREE.TorusGeometry(.32,.02,6,24),IRONM);rim.position.set(.45,1.45,-.12);g.add(rim);}
[4.9,5.3,5.7].forEach((x,i)=>{box(x-.02,1.75,11.84,x+.02,1.8,11.9,IRONM,{parent:DP});if(i!==1){const c=new THREE.Mesh(new THREE.CylinderGeometry(.08,.2,.9,8,1,true),M(i?'#4a3a5a':'#5a3a2a',{rough:1,side:THREE.DoubleSide}));c.position.set(x,1.35,11.78);DP.add(c);}});
table(18.9,10.6,20.1,11.6,.76);stool(18.6,10.1);stool(20.4,10.2);mug(19.3,.76,11.0);candle(19.7,.76,11.2,'hall');
chandelier(10,2.4,9.6,'hall',.55,8);plight('hallc',10,2.2,9.6,0xffc27a,1.4,9);
// 귀환 창구 (동쪽 벽): 계산대 + 열쇠판 + 의자
{const g=grp(0,0);rbox(22.9,0,8.4,23.8,.96,10.4,WOOD,.02,P2(g));rbox(22.85,.96,8.35,23.85,1.02,10.45,WOODR,.015,P2(g));}box(22.9,0,8.4,23.8,1.0,10.4,new THREE.MeshBasicMaterial({visible:false}),{col:1,shadow:false});
const winHit=box(23.8,1.0,8.6,24.1,2.2,10.2,new THREE.MeshBasicMaterial({visible:false}),{shadow:false});winHit.userData.it='window';INTER.push(winHit);
const shutter=box(23.93,1.0,8.6,24.06,2.2,10.2,M('#55585e',{metal:.5,rough:.5}));
emis(23.85,2.45,9.3,23.95,2.6,9.5,0xffe0a0);plight('counter',22.9,2.2,9.4,0xffc47a,1.3,6);
box(23.82,1.3,7.4,23.9,2.3,8.3,WOODR,{parent:DP});{const hb=box(23.7,1.3,7.4,23.95,2.3,8.3,new THREE.MeshBasicMaterial({visible:false}),{shadow:false});hb.userData.it='keyboard';INTER.push(hb);}for(let i=0;i<6;i++){const y=1.5+Math.floor(i/2)*.3,z=7.6+(i%2)*.4;cyl(23.8,y+.08,z,.008,.008,.06,BRASSM,4,{rz:Math.PI/2,parent:DP});box(23.76,y-.08,z-.03,23.79,y+.05,z+.03,BRASSM,{parent:DP});}
stool(22.35,9.4);

// ───────── 바깥 골목: 가로등, 상자, 통, 간판 ─────────
cyl(27.9,1.6,11.9,.06,.08,3.2,IRONM,8);box(27.6,3.1,11.6,28.2,3.16,12.2,IRONM);box(27.65,3.16,11.65,28.15,3.56,12.15,GLASS,{shadow:false}).userData.keep=true;box(27.6,3.56,11.6,28.2,3.62,12.2,IRONM);
flame(27.9,3.2,11.9,2.2,'alley');plight('alley',27.9,3.1,11.3,0xffcf7a,1.4,10);
crate(26.2,0,13.2,.6,.3);crate(26.3,.6,13.1,.45,.8);barrel(27,13.6);sack(25.7,13.7);
{const g=grp(4,12.95);box(-.02,2.6,-.8,.02,2.64,.25,IRONM,P2(g));const sign=rbox(-.55,2.0,.18,.55,2.55,.24,WOODR,.02,P2(g));}
{const c=cnv(256,128),x=c.getContext('2d');seed=5;woodBoard(x,0,0,256,128,'#6a4a30',false,'rgba(0,0,0,0)');x.fillStyle='#e8c77a';x.font='bold 44px serif';x.textAlign='center';x.fillText('무사귀환',128,76);x.font='18px serif';x.fillText('— 등불 길드 여관 —',128,106);
 const p=new THREE.Mesh(new THREE.PlaneGeometry(1.08,.52),new THREE.MeshStandardMaterial({map:toTex(c),roughness:.8}));p.position.set(4,2.275,13.195);scene.add(p);const p2=p.clone();p2.rotation.y=Math.PI;p2.position.z=13.125;scene.add(p2);}

// ───────── 2층 복도 등잔과 끝 창문 ─────────
[4,12].forEach((x,i)=>{sconce(x,4.6,5.12,0,1,'cor');plight('cor'+i,x,4.6,5.6,0xffb86a,1.0,6);});
plight('moon',.9,4.5,6,0x8fa4cc,0,11);
const endWin=new THREE.Mesh(new THREE.PlaneGeometry(1,1.3),new THREE.MeshBasicMaterial({color:0x223044}));endWin.position.set(.12,4.55,6);endWin.rotation.y=Math.PI/2;scene.add(endWin);
const endHit=box(.1,3.2,5.2,1.2,6,6.8,new THREE.MeshBasicMaterial({visible:false}),{shadow:false});endHit.userData.it='endwin';INTER.push(endHit);
rug(.4,5.4,15.6,6.6,3.006,'runner');{const g=grp(.45,5.45);rbox(-.2,3,-.15,.2,3.75,.15,WOOD,.02,P2(g));}candle(.45,3.75,5.45,'cor');portrait(5.3,4.5,6.88,Math.PI);
// 창고 궤짝, 선반 판, 수칙집
{const g=grp(.9,6.3);anchor('chest',.9,0,6.3,0,g);rbox(-.5,0,-.35,.5,.6,.35,WOOD,.02,P2(g));rbox(-.52,.6,-.37,.52,.7,.37,WOODR,.02,P2(g));[-.3,.3].forEach(a=>box(a-.03,.05,-.36,a+.03,.66,-.34,IRONM,P2(g)));const hb=box(.35,0,5.9,1.45,.75,6.7,new THREE.MeshBasicMaterial({visible:false}),{shadow:false});hb.userData.it='chest';INTER.push(hb);}
{const hb=box(.6,1.28,.1,6.4,2.14,.3,new THREE.MeshBasicMaterial({visible:false}),{shadow:false});hb.userData.it='shelfboard';INTER.push(hb);}
{const c=cnv(128,160),x=c.getContext('2d');x.fillStyle='#eadfc6';x.fillRect(0,0,128,160);x.strokeStyle='#382c2b';x.lineWidth=4;x.strokeRect(2,2,124,156);x.fillStyle='#6e2a1c';for(let i=0;i<8;i++)x.fillRect(14,20+i*17,60+((i*29)%40),4);x.fillStyle='#a8322a';x.fillRect(14,88,90,4);const p=new THREE.Mesh(new THREE.PlaneGeometry(.5,.62),new THREE.MeshStandardMaterial({map:toTex(c),roughness:.9}));p.position.set(4.5,1.9,11.83);p.rotation.y=Math.PI;scene.add(p);p.userData.it='rulewall';INTER.push(p);}
bake(DP);DP=null;

// ───────── 2층 방과 문 ─────────
const ROOMS=[201,202,203,204,205,206];
const RM={};ROOMS.forEach((r,i)=>{const x=[2.67,8,13.33][i%3],north=i<3;RM[r]={x,north,door:[x,north?5:7],front:[x,6],inside:[x,north?3.6:8.4],bed:[x,north?1.5:10.5]};});
const DOORS={};
function makeDoor(key,x,z,y0,alongX,h=2.2,w=1){const pivot=new THREE.Group();pivot.position.set(alongX?x-w/2:x,y0,alongX?z:z-w/2);scene.add(pivot);
  const d=new THREE.Mesh(new THREE.BoxGeometry(alongX?w:.07,h,alongX?.07:w),DOORM);d.position.set(alongX?w/2:0,h/2,alongX?0:w/2);d.castShadow=d.receiveShadow=true;pivot.add(d);d.userData.it='door:'+key;INTER.push(d);
  // 쇠띠 두 줄 + 고리 손잡이 + 열쇠 구멍 판 (문짝과 함께 돈다)
  [-.62,.62].forEach(yy=>[-1,1].forEach(s=>{const b=alongX?new THREE.Mesh(new THREE.BoxGeometry(w*.9,.07,.012),IRONM):new THREE.Mesh(new THREE.BoxGeometry(.012,.07,w*.9),IRONM);b.position.set(alongX?-.03:s*.041,yy,alongX?s*.041:-.03);d.add(b);}));
  [-1,1].forEach(s=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(.055,.01,6,16),IRONM);ring.position.set(alongX?w*.36:s*.05,-.05,alongX?s*.05:w*.36);if(!alongX)ring.rotation.y=Math.PI/2;d.add(ring);
    const pl=new THREE.Mesh(new THREE.BoxGeometry(alongX?.06:.008,.12,alongX?.008:.06),BRASSM);pl.position.set(alongX?w*.36:s*.042,-.2,alongX?s*.042:w*.36);d.add(pl);});
  const rect=alongX?{x1:x-w/2,z1:z-.08,x2:x+w/2,z2:z+.08}:{x1:x-.08,z1:z-w/2,x2:x+.08,z2:z+w/2};
  DOORS[key]={key,pivot,mesh:d,open:0,target:0,rect,f:y0>1.5?2:1,alongX,x,z,y0,locked:false,npcHold:0,bar:null,moss:null};return DOORS[key];}
makeDoor('front',4,12,0,true,2.3,1.2);makeDoor('side',24,11.2,0,false);
DP=new THREE.Group();scene.add(DP);
ROOMS.forEach(r=>{const R=RM[r],n=R.north,zb=R.bed[1],hz=n?zb-1.0:zb+1.0,s=n?1:-1;
  makeDoor(r,R.door[0],R.door[1],3,true);
  // 침대: 틀·머리판·발판·요·이불·베개
  {const bg=new THREE.Group();DP.add(bg);anchor('bed',R.x,3,zb,n?0:Math.PI,bg);rbox(R.x-.62,3,zb-1.0,R.x+.62,3.38,zb+1.0,WOOD,.02,{parent:bg});rbox(R.x-.64,3,hz-.06,R.x+.64,4.05,hz+.06,WOOD,.025,{parent:bg});rbox(R.x-.64,3,hz+s*2.0-.05,R.x+.64,3.62,hz+s*2.0+.05,WOOD,.02,{parent:bg});
  [-.6,.6].forEach(dx=>cyl(R.x+dx,4.1,hz,.05,.05,.12,WOOD,8,{parent:bg}));
  rbox(R.x-.56,3.38,zb-.95,R.x+.56,3.52,zb+.95,LINEN,.04,{parent:bg});rbox(R.x-.58,3.5,n?zb-.35:zb-.95,R.x+.58,3.6,n?zb+.95:zb+.35,CLOTH,.04,{parent:bg});
  rbox(R.x-.38,3.52,n?zb-.92:zb+.6,R.x+.38,3.66,n?zb-.6:zb+.92,LINEN,.05,{parent:bg});}
  // 궤짝, 책상과 의자, 촛대, 옷걸이
  {const g=grp(R.x,zb+s*1.35,0,3);rbox(-.45,0,-.2,.45,.42,.2,WOOD,.02,P2(g));rbox(-.47,.42,-.22,.47,.5,.22,WOODR,.02,P2(g));[-.3,.3].forEach(a=>box(a-.03,.05,s*.2-.01,a+.03,.48,s*.2+.01,IRONM,P2(g)));}
  const dx=R.x+1.75;table(dx-.4,n?.25:11.1,dx+.4,n?.9:11.75,.75,WOOD,3);chair(dx,n?1.25:10.6,n?Math.PI:0,3);
  candle(dx-.2,3.75,n?.5:11.5,'room');book(dx+.15,3.75,n?.6:11.4,.16,.04,.22,['#4a3a6a','#6a2a22','#2a4a3a'][r%3],.3);
  box(R.x-1.9,4.3,n?.1:11.84,R.x-1.2,4.36,n?.16:11.9,WOODR,{parent:DP});
  rug(R.x-.9,n?2.6:8.6,R.x+.9,n?3.8:9.4,3.006,'rug');
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.34,.16),new THREE.MeshBasicMaterial({map:numTex(r)}));plate.position.set(R.x,5.3,R.north?5.12:6.88);plate.rotation.y=R.north?0:Math.PI;scene.add(plate);});
bake(DP);DP=null;

function numTex(n){const c=document.createElement('canvas');c.width=64;c.height=32;const x=c.getContext('2d');x.fillStyle='#cda65f';x.fillRect(0,0,64,32);x.strokeStyle='#382c2b';x.lineWidth=3;x.strokeRect(1,1,62,30);x.fillStyle='#382c2b';x.font='bold 20px sans-serif';x.textAlign='center';x.fillText(n,32,23);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function doorBlocked(x,z,y,r){const f=y>1.5?2:1;for(const k in DOORS){const d=DOORS[k];if(d.open>.5||d.f!==f)continue;const w=d.rect;if(x+r>w.x1&&x-r<w.x2&&z+r>w.z1&&z-r<w.z2)return true;}return false;}
function setDoor(key,open){const d=DOORS[key];if(!d)return;if(open&&d.locked)return false;d.target=open?1:0;return true;}
function updateDoors(dt){for(const k in DOORS){const d=DOORS[k];if(Math.abs(d.target-d.open)>.01)G.doorMoving=true;d.open+=(d.target-d.open)*Math.min(1,dt*6);d.pivot.rotation.y=(d.alongX?-1:1)*d.open*Math.PI/2*.92;}}


// ───── 21_items.js ─────
// ───────── 물건 모델: 선반·손·바닥에서 같은 모델을 쓴다 ─────────
// 크기는 실제 크기에 가깝게 (m). 원점은 바닥 가운데.
const IM={meat:M('#9a3f2c',{rough:.55}),fat:M('#e8c8a8',{rough:.5}),bone:BONE,stem:M('#efe2c6',{rough:.7}),cap:M('#b0603a',{rough:.6}),dot:M('#f6ecd6',{rough:.6}),
  moss:M('#5a8a3a',{rough:.9,emissive:0x1a3a0c}),stewS:M('#4e2a12',{rough:.55}),burntS:M('#1c1614',{rough:.9}),chunk:M('#b87a4a',{rough:.5})};
function capGeo(r){return new THREE.SphereGeometry(r,14,8,0,Math.PI*2,0,Math.PI/2);}
function itemModel(k){const mk={meat:'meat',mush:'mush',mush_s:'mush',spore:'mush',bread:'bread',stew:'stew',roast:'stew',soup:'stew',burnt:'stew',lunch:'bread'}[k];const mdl=mk?modelFor(mk):null;if(mdl){const g=new THREE.Group();g.add(mdl);if(k==='spore'){mdl.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.emissive=new THREE.Color(0x4a8a18);}});g.userData.cap={material:{emissive:new THREE.Color()}};}g.userData.gltf=true;return g;}
  const g=new THREE.Group();const add=(m,x,y,z,sx=1,sy=1,sz=1,rx=0,rz=0)=>{m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,0,rz);m.castShadow=true;g.add(m);return m;};
  if(k==='meat'){add(new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),IM.meat),0,.055,0,1.25,.8,.95);add(new THREE.Mesh(new THREE.SphereGeometry(.05,10,6),IM.fat),-.035,.08,0,.8,.5,.8);
    add(new THREE.Mesh(new THREE.CylinderGeometry(.013,.015,.12,8),IM.bone),.1,.06,0,1,1,1,0,Math.PI/2);[[.16,.07],[.16,.05]].forEach(([x,y])=>add(new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),IM.bone),x,y,0));}
  else if(k==='mush'||k==='mush_s'||k==='spore'){const cap=k==='spore'?IM.cap.clone():IM.cap;add(new THREE.Mesh(new THREE.CylinderGeometry(.022,.028,.08,10),IM.stem),0,.04,0);const c=add(new THREE.Mesh(capGeo(.06),cap),0,.075,0,1,.75,1);
    [[.03,.02],[-.025,.03],[0,-.035],[.035,-.02]].forEach(([x,z])=>add(new THREE.Mesh(new THREE.SphereGeometry(.009,6,4),IM.dot),x,.105,z,1,.5,1));g.userData.cap=c;
    if(k==='spore'){cap.emissive.setHex(0x4a8a18);for(let i=0;i<5;i++)add(new THREE.Mesh(new THREE.SphereGeometry(.005,5,4),new THREE.MeshBasicMaterial({color:0xb8f070})),(Math.random()-.5)*.1,.03+Math.random()*.05,(Math.random()-.5)*.1);}}
  else if(k==='moss'){[[0,0,.05],[.04,.01,.035],[-.035,.015,.03],[.01,.03,.03]].forEach(([x,z,r])=>add(new THREE.Mesh(new THREE.SphereGeometry(r,8,6),IM.moss),x,r*.7,z,1,.7,1));}
  else if(k==='stew'||k==='burnt'){const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.09,.055,.065,16,1,true),M('walnut',{rough:.6,side:THREE.DoubleSide}));add(bowl,0,.033,0);add(new THREE.Mesh(new THREE.CircleGeometry(.055,14),M('walnut')),0,.001,0,1,1,1,-Math.PI/2);
    add(new THREE.Mesh(new THREE.CircleGeometry(.085,16),k==='stew'?IM.stewS:IM.burntS),0,.055,0,1,1,1,-Math.PI/2);if(k==='stew')[[.03,.01],[-.03,.02],[0,-.035],[.02,-.02]].forEach(([x,z])=>add(new THREE.Mesh(new THREE.SphereGeometry(.014,6,4),IM.chunk),x,.058,z));}
  else{add(new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),M('#8a6040')),0,.05,0);}
  return g;}
// 손에 든 등불 모델 (유리·쇠틀·불꽃)
function lanternModel(){const g=new THREE.Group();const I=IRONM;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const p=new THREE.Mesh(new THREE.BoxGeometry(.008,.13,.008),I);p.position.set(a*.045,.075,b*.045);g.add(p);});
  const base=new THREE.Mesh(new THREE.BoxGeometry(.11,.015,.11),I);base.position.y=.008;g.add(base);const top=new THREE.Mesh(new THREE.ConeGeometry(.075,.05,4),I);top.rotation.y=Math.PI/4;top.position.y=.165;g.add(top);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.025,.005,6,12),I);ring.position.y=.2;g.add(ring);const gl=new THREE.Mesh(new THREE.BoxGeometry(.086,.12,.086),new THREE.MeshStandardMaterial({color:0xfff0c8,roughness:.05,transparent:true,opacity:.18,depthWrite:false}));gl.position.y=.075;g.add(gl);
  const wick=new THREE.Mesh(new THREE.CylinderGeometry(.012,.014,.03,8),WAX);wick.position.y=.03;g.add(wick);
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.012,.04,6),FLAMEM);fl.position.y=.065;g.add(fl);const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOWTEX,color:0xffc47a,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));halo.scale.setScalar(.18);halo.position.y=.07;g.add(halo);
  g.userData.fl=fl;g.userData.halo=halo;return g;}
function clubModel(){const g=new THREE.Group();const h=new THREE.Mesh(new THREE.CylinderGeometry(.03,.018,.42,10),M('walnut'));h.position.y=.21;g.add(h);
  for(let i=0;i<5;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(.01,.02,5),IRONM);const a=i*1.26;s.position.set(Math.cos(a)*.03,.33+(i%2)*.05,Math.sin(a)*.03);s.rotation.set(Math.sin(a)*1.4,0,-Math.cos(a)*1.4);g.add(s);}
  const wrap=new THREE.Mesh(new THREE.CylinderGeometry(.021,.021,.08,8),LEATH);wrap.position.y=.05;g.add(wrap);return g;}

// ───────── 손 (1인칭 모델): 오른손은 든 물건·몽둥이, 왼손은 등불 ─────────
// 충돌 반경(0.28m) 안쪽에 두어 벽을 뚫고 보이지 않게 한다
const VM={right:new THREE.Group(),left:new THREE.Group(),key:null,swing:0,t:0};
camera.add(VM.right,VM.left);VM.right.position.set(.17,-.17,-.27);VM.left.position.set(-.18,-.2,-.27);
const VMLAMP=lanternModel();VM.left.add(VMLAMP);VMLAMP.scale.setScalar(.68);VM.left.visible=false;
const VMCLUB=clubModel();VMCLUB.rotation.set(-.5,0,-.35);VMCLUB.scale.setScalar(.7);
function vmTick(dt,moving){VM.t+=dt*(moving?9:2);const bob=moving?Math.sin(VM.t)*.008:Math.sin(VM.t)*.002,sway=moving?Math.cos(VM.t*.5)*.006:0;
  const club=HUNT&&HUNT.visible&&!SEAT;const key=SEAT?'':club?'club':(P.held||'');
  if(key!==VM.key){VM.key=key;VM.right.clear();if(key==='club')VM.right.add(VMCLUB);else if(key){const m=itemModel(key==='mush_s'?'mush':key);m.scale.setScalar(.62);m.rotation.set(.35,-.5,0);VM.right.add(m);}}
  VM.swing=Math.max(0,VM.swing-dt*4);const sw=Math.sin(VM.swing*Math.PI);
  VM.right.position.set(.19+sway-sw*.08,-.18+bob+sw*.05,-.28-sw*.06);VM.right.rotation.set(-sw*1.1,sw*.5,sw*.4);
  VM.left.visible=!!P.lamp&&!SEAT;VM.left.position.set(-.18-sway,-.2+bob*1.3,-.27);VM.left.rotation.z=Math.sin(VM.t*.5)*.05;VMLAMP.userData.fl.scale.setScalar(.9+Math.random()*.2);
  lantern.position.set(P.lamp?-.16:.25,P.lamp?-.1:-.2,-.3);}

// ───────── 내려놓기와 다시 집기 ─────────
const DROPS=[];const RAY2=new THREE.Raycaster();RAY2.far=2.6;const _nv=new THREE.Vector3();
function dropHeld(){const k=P.held;if(!k)return;RAY2.setFromCamera({x:0,y:0},camera);
  const hit=RAY2.intersectObjects(scene.children,true).find(h=>h.object.isMesh&&h.object.visible&&h.object.material&&h.object.material.visible!==false&&!h.object.material.transparent&&!h.object.userData.npc&&!isVMObj(h.object)&&h.face&&(_nv.copy(h.face.normal).transformDirection(h.object.matrixWorld).y>.7));
  let x,y,z;if(hit){({x,y,z}=hit.point);}else{const f=new THREE.Vector3();camera.getWorldDirection(f);f.y=0;f.normalize();x=P.x+f.x*.7;z=P.z+f.z*.7;y=floorY(x,z,P.y);}
  const id=DROPS.length,m=itemModel(k==='mush_s'?'mush':k);m.position.set(x,y+.002,z);m.rotation.y=Math.random()*6;scene.add(m);
  const hb=new THREE.Mesh(new THREE.BoxGeometry(.24,.2,.24),new THREE.MeshBasicMaterial({visible:false}));hb.position.set(x,y+.08,z);hb.userData.it='drop:'+id;scene.add(hb);INTER.push(hb);
  DROPS.push({k,m,hb});P.held=null;renderBelt();sfx('flip');sub('손',`${ITN[k]||'들고 있던 것'}을(를) 내려놓았다.`);}
function pickDrop(id){const d=DROPS[id];if(!d)return;if(P.held){sub('손','이미 무언가를 들고 있다. 먼저 내려놓는다.');return;}
  P.held=d.k;scene.remove(d.m);scene.remove(d.hb);INTER.splice(INTER.indexOf(d.hb),1);DROPS[id]=null;renderBelt();sfx('flip');}
function isVMObj(o){while(o){if(o===VM.right||o===VM.left)return true;o=o.parent;}return false;}

// ───── 22_doll.js ─────
// ───────── 종이 인형 인물: 머리·몸·소지품·다리 네 장의 판 ─────────
// 아스트라 그림(characters_layers.js)을 층별로 캔버스 텍스처로 굽고, 목·엉덩이·어깨 피벗에 맞춰 세운다.
const ARTL=window.CHAR_ART_L||null,LEGS=window.LEGS_ART||null;
const TEXCACHE={};
function svgTex(key,inner,w,h,vb){if(TEXCACHE[key])return TEXCACHE[key];const c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  const img=new Image();img.onload=()=>{c.getContext('2d').drawImage(img,0,0,w,h);t.needsUpdate=true;};
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${inner}</svg>`);return TEXCACHE[key]=t;}
function figTex(key,inner){return svgTex(key,inner,300,360,'0 0 200 240');}
function layerFig(look,o,back,layer){if(ARTL&&ARTL.fig){try{return ARTL.fig(look,{...o,layer},back);}catch(e){}}return layer==='head'?fig(look,o,back):'';}
function legTex(look,shoes,side){const c=(ARTL&&ARTL.DATA[look])||{};const inner=LEGS?LEGS.leg(c,shoes||'worn_boots',side,false):`<rect x="28" width="44" height="128" fill="#4a3a2e" stroke="#382c2b" stroke-width="2.7"/>`;return svgTex('leg'+look+shoes+side,inner,100,130,'0 0 100 130');}
const NPCS=[];
function outfitOf(id){return (C[id]&&C[id].outfit)||({merchant:'#6a4a8a',pilgrim:'#4a4640',helga:'#7a4b2c',dora:'#8a5a3a',enoch:'#3a3a5a'})[id]||'#5a5048';}
const dollMat=t=>new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.45,side:THREE.DoubleSide});
// 200×240 그림 틀 = 세계 1.0×1.2 m, 바닥에서 1.0 m 위에 놓인다. 피벗(SVG y): 목 160, 엉덩이 240, 어깨 175
const FRAME_Y=1.0,FRAME_H=1.2;
function framePlane(t,pivotSvgY,z){const py=FRAME_Y+FRAME_H*(1-pivotSvgY/240);const g=new THREE.PlaneGeometry(1.0,1.2);g.translate(0,FRAME_Y+FRAME_H/2-py,0);const m=new THREE.Mesh(g,dollMat(t));m.position.set(0,py,z);m.userData.pivot=py;return m;}
function makeNPC(uid,look,o={},opt={}){const g=new THREE.Group(),doll=new THREE.Group();g.add(doll);const shoes=opt.shoes||(REG[look]&&REG[look].shoes)||(look==='hood'?'sandals':look==='enoch'?'merchant':'worn_boots');
  const back=false;
  const torso=framePlane(figTex(look+'|t|'+JSON.stringify(o),layerFig(look,o,back,'torso')),240,0);
  const item=framePlane(figTex(look+'|i|'+JSON.stringify(o),layerFig(look,o,back,'item')),175,.012);
  const head=framePlane(figTex(look+'|h|'+JSON.stringify(o),layerFig(look,o,back,'head')),160,.024);
  doll.add(torso,item,head);
  const legs=[-1,1].map(s=>{const geo=new THREE.PlaneGeometry(.26,.34);geo.translate(0,-.17,0);const m=new THREE.Mesh(geo,dollMat(legTex(look,shoes,s<0?'L':'R')));m.position.set(s*.11,FRAME_Y+.05,-.006);doll.add(m);return m;});
  legs.forEach(m=>{m.geometry=new THREE.PlaneGeometry(.26,1.0);m.geometry.translate(0,-.5,0);m.position.y=FRAME_Y+.02;});
  // 창구용 전체 그림 한 장 (앉아서 볼 때만 보인다)
  const bust=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.2),dollMat(figTex(look+JSON.stringify(o),fig(look,o))));bust.position.y=1.6;bust.visible=false;g.add(bust);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(.7,2.1,.4),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=1.05;g.add(hit);hit.userData.it='npc:'+uid;INTER.push(hit);
  const fs=new THREE.Mesh(new THREE.CircleGeometry(.34,16),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.38,depthWrite:false}));fs.rotation.x=-Math.PI/2;fs.position.y=.015;g.add(fs);
  const small=C[look]&&C[look].small;if(small)g.scale.setScalar(.8);
  scene.add(g);const n={fs,uid,look,o,g,doll,bust,hit,parts:{torso,item,head,legL:legs[0],legR:legs[1]},shoes,x:0,z:0,y:0,path:[],speed:1.35,state:'idle',face:0,visible:true,anim:0,...opt};NPCS.push(n);hit.userData.npc=n;bust.userData.npc=n;if(typeof spriteAttach==='function')spriteAttach(n);if(typeof rigAttach==='function')rigAttach(n);return n;}
function setLook(n,look,o={}){n.look=look;n.o=o;const b=!!n.back;const P_=n.parts;
  P_.torso.material.map=figTex(look+'|t|'+JSON.stringify(o)+(b?'b':''),layerFig(look,o,b,'torso'));P_.item.material.map=figTex(look+'|i|'+JSON.stringify(o)+(b?'b':''),layerFig(look,o,b,'item'));P_.head.material.map=figTex(look+'|h|'+JSON.stringify(o)+(b?'b':''),layerFig(look,o,b,'head'));
  n.bust.material.map=figTex(look+JSON.stringify(o)+(b?'b':''),fig(look,o,b));[P_.torso,P_.item,P_.head,n.bust].forEach(m=>m.material.needsUpdate=true);}
function setShoes(n,shoes){n.shoes=shoes;n.parts.legL.material.map=legTex(n.look,shoes,'L');n.parts.legR.material.map=legTex(n.look,shoes,'R');}
function dollGlow(n,k){[n.parts.torso,n.parts.item,n.parts.head].forEach(p=>{const m=p.material;if(m.emissiveMap!==m.map){m.emissiveMap=m.map;m.needsUpdate=true;}m.emissive.setScalar(k);});}
function placeNPC(n,x,z,y){n.x=x;n.z=z;n.y=y!==undefined?y:floorY(x,z,n.y||0);n.g.position.set(n.x,n.y,n.z);}
function walk(n,pts,done){n.path=pts.map(p=>({x:p[0],z:p[1]}));n.onDone=done||null;n.state='walk';}
function updateNPCs(dt){const cam=camera.position;
  NPCS.forEach(n=>{if(!n.visible){n.g.visible=false;return;}n.g.visible=true;n.anim+=dt;
    if(n.state==='walk'&&n.path.length){const t=n.path[0],dx=t.x-n.x,dz=t.z-n.z,d=Math.hypot(dx,dz),s=n.speed*dt;
      if(d<=s){n.x=t.x;n.z=t.z;n.path.shift();if(!n.path.length){n.state='idle';const cb=n.onDone;n.onDone=null;if(cb)cb(n);}}
      else{n.x+=dx/d*s;n.z+=dz/d*s;n.face=Math.atan2(dx,dz);}
      n.y=floorY(n.x,n.z,n.y);n.bob=(n.bob||0)+dt*9;}
    for(const k in DOORS){const d=DOORS[k];if(Math.abs(n.y-d.y0)>1.2)continue;const near=Math.hypot(n.x-d.x,n.z-d.z)<1.5&&n.state==='walk';if(near&&!d.locked){d.target=1;d.npcHold=1.2;}}
    const walking=n.state==='walk'&&n.path.length,sitting=n.state==='sit',sleeping=n.state==='sleep';
    const sit=sitting?-.42:sleeping?-.62:0;
    n.g.position.set(n.x,n.y+sit+(walking?Math.abs(Math.sin(n.bob))*.04:0),n.z);n.g.rotation.y=n.face;
    const toCam=Math.atan2(cam.x-n.x,cam.z-n.z);let rel=toCam-n.face;while(rel>Math.PI)rel-=2*Math.PI;while(rel<-Math.PI)rel+=2*Math.PI;
    const back=Math.abs(rel)>2.0&&!sleeping;if(back!==!!n.back){n.back=back;setLook(n,n.look,n.o);}
    n.doll.rotation.y=rel;n.bust.rotation.y=rel;
    // 동작: 걷기(다리 교차·몸 흔들림·고개 끄덕), 서기(숨쉬기), 앉기(무릎), 잠(눕기), 말하기(고개 기울임)
    const P_=n.parts,sw=walking?Math.sin(n.bob)*.55:0;
    P_.legL.rotation.x=sitting?-1.45:sleeping?0:sw;P_.legR.rotation.x=sitting?-1.45:sleeping?0:-sw;
    P_.torso.rotation.z=walking?Math.sin(n.bob*.5)*.04:0;P_.item.rotation.z=walking?-Math.sin(n.bob)*.12:Math.sin(n.anim*1.3)*.02;
    const breathe=walking?0:Math.sin(n.anim*1.8)*.012;P_.torso.scale.y=1+breathe;P_.head.position.y=P_.head.userData.pivot+breathe*.6+(walking?Math.abs(Math.sin(n.bob))*.02:0);
    n.talkT=Math.max(0,(n.talkT||0)-dt);P_.head.rotation.z=(n.talkT>0?Math.sin(n.anim*9)*.06:0)+(walking?Math.sin(n.bob*.5)*.03:0);P_.head.rotation.y=n.talkT>0?0:Math.sin(n.anim*.7)*.08;
    n.doll.rotation.x=sleeping?-1.25:0;n.bust.rotation.x=sleeping?-1.2:0;n.fs.visible=!sleeping;
    if(n.sprite)spriteTick(n,dt,walking,sitting,sleeping,rel);else if(n.rig)rigTick(n,dt,walking,sitting,sleeping,rel);});
  for(const k in DOORS){const d=DOORS[k];if(d.npcHold>0){d.npcHold-=dt;if(d.npcHold<=0&&!d.playerOpen)d.target=0;}}}

// ───── 23_rig.js ─────
// ───────── 리깅 3D 인물 (Quaternius CC0, assets/models/quaternius_char): 옷 + 기본 머리 + 머리카락, 애니메이션 라이브러리 ─────────
// 인물 데이터의 rig:{outfit,head,hair[],scale} 가 있으면 종이 인형 대신 3D 몸을 세운다. 창구의 큰 그림(bust)은 그대로 종이다.
// ?norig 로 끈다. ?rig=all 은 rig 가 없는 인물도 기본 몸으로 세운다 (비교용).
import {clone as skelClone} from 'three/addons/utils/SkeletonUtils.js';
const RIG={on:!QF.has('norig'),all:QF.get('rig')==='all',ready:false,parts:{},clips:{},heads:{},toon:!QF.has('notoon'),headScale:+(QF.get('head')||1.42),bodyScale:+(QF.get('body')||.84)};
// 툰 셰이딩: 3단 명암 그라데이션 + 뒤집은 껍질 윤곽선
const mkGrad=arr=>{const d=new Uint8Array(arr.flatMap(v=>[v,v,v,255]));const t=new THREE.DataTexture(d,arr.length,1,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;};
const TOONGRAD=mkGrad([170,218,255]),ANIMEGRAD=mkGrad([200,255]); // 애니풍은 2단
function toonify(root,anime){if(!RIG.toon)return;const hulls=[];const grad=anime?ANIMEGRAD:TOONGRAD,th=anime?0.003:0.0045;root.traverse(o=>{if(!o.isMesh||!o.material)return;const src=o.material;if(/eye/i.test(o.name)){return;}
  // 툰 재질은 환경광을 못 받아 어두워지므로 색을 조금 올리고, 그림자면 색을 살짝 따뜻하게
  const m=new THREE.MeshToonMaterial({map:src.map||null,color:(src.color?src.color.clone():new THREE.Color(0xffffff)),gradientMap:grad,transparent:src.transparent,alphaTest:src.alphaTest||0,side:src.side,emissiveMap:src.map||null,emissive:0xffffff,emissiveIntensity:.2});m.name=src.name;m.userData.baseEmissive=0xffffff;o.material=m;
  const hm=new THREE.MeshBasicMaterial({color:0x33261f,side:THREE.BackSide});hm.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normalize(normal)*'+((anime&&/superhero/i.test(o.name))?0.0012:th).toFixed(4)+';');};
  const h=o.clone();h.material=hm;h.castShadow=false;h.receiveShadow=false;h.userData.hull=true;h.frustumCulled=false;hulls.push([o,h]);});
  hulls.forEach(([o,h])=>o.parent.add(h));}
const RIG_DEFAULT={outfit:'Male_Peasant',head:'Superhero_Male_FullBody',hair:['Hair_SimpleParted'],scale:.95};
const RIG_DEFAULT_F={outfit:'Female_Peasant',head:'Superhero_Female_FullBody',hair:['Hair_Long'],scale:.95};
function rigSpec(n){const c=C[n.look];if(c&&c.rig)return c.rig;if(RIG.all)return (c&&/여|엘프|하플링/.test(c.race||'')&&c.id!=='pipi')?RIG_DEFAULT_F:RIG_DEFAULT;return null;}
// 기본 몸(FullBody)에서 머리만 남긴다: 세 꼭짓점이 모두 머리·목 뼈에 붙은 삼각형만
function headOnly(mesh){const sk=mesh.skeleton;const hb=new Set(sk.bones.map((b,i)=>/^(Head|neck_01)$/.test(b.name)?i:-1).filter(i=>i>=0));const g=mesh.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
  const on=v=>{let w=0;for(let k=0;k<4;k++)if(hb.has(si.getComponent(v,k)))w+=sw.getComponent(v,k);return w>.5;};
  const idx=g.index?Array.from(g.index.array):[...Array(g.attributes.position.count).keys()];const keep=[];for(let i=0;i<idx.length;i+=3){if(on(idx[i])&&on(idx[i+1])&&on(idx[i+2]))keep.push(idx[i],idx[i+1],idx[i+2]);}
  const g2=g.clone();g2.setIndex(keep);g2.computeBoundingSphere();mesh.geometry=g2;}
function rigInit(){if(!RIG.on||!ASSETS.man||!ASSETS.man.quaternius||!ASSETS.man.quaternius.quaternius_char)return;const have=ASSETS.man.quaternius.quaternius_char;
  const specs=[];NPCS.forEach(n=>{const s=rigSpec(n);if(s)specs.push(s);});[RIG_DEFAULT,RIG_DEFAULT_F].forEach(s=>{if(RIG.all)specs.push(s);});Object.values(REG).concat(Object.values(STAFF),Object.values(GUEST)).forEach(c=>{if(c.rig)specs.push(c.rig);});
  const need=new Set();specs.forEach(s=>{need.add(s.outfit);need.add(s.head);(s.hair||[]).forEach(h=>need.add(h));});
  const files=[...need].filter(n=>have.includes(n+'.gltf')).map(n=>'quaternius_char/'+n+'.gltf');window.__rig=RIG;if(!files.length||!have.includes('UAL_clips.glb'))return;console.log('rig init',files.length,'files');
  Promise.all(files.map(loadFile).concat([loadFile('quaternius_char/UAL_clips.glb')])).then(gs=>{
    gs.slice(0,files.length).forEach((g,i)=>{const name=files[i].split('/')[1].replace('.gltf','');const root=g.scene;root.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;if(/FullBody/.test(name)&&/SuperHero|Superhero/i.test(o.name))headOnly(o);}});RIG.parts[name]=root;});
    gs[files.length].animations.forEach(c=>{RIG.clips[c.name]=c;});RIG.ready=true;NPCS.forEach(rigAttach);console.log('rig ready',Object.keys(RIG.parts).length,'parts',Object.keys(RIG.clips).length,'clips');}).catch(e=>console.warn('rig',e));}
// 옷의 뼈대를 기준으로 머리·머리카락을 같은 뼈에 묶는다 (이름이 같은 65개 뼈)
function rigBuild(spec){const outfit=RIG.parts[spec.outfit];if(!outfit)return null;const root=skelClone(outfit);const bones={};root.traverse(o=>{if(o.isBone)bones[o.name]=o;});let master=null;root.traverse(o=>{if(o.isSkinnedMesh&&!master)master=o;});if(!master)return null;
  const arm=master.parent;const skin=[];root.traverse(o=>{if(o.isSkinnedMesh)o.material.forEach?o.material.forEach(m=>skin.push(m)):skin.push(o.material);});
  // 머리(스킨 메시)는 옷의 뼈대에 다시 묶고, 머리카락·수염(스킨 없는 메시)은 Head 뼈에 붙인다
  [spec.head,...(spec.hair||[])].forEach(name=>{const src=RIG.parts[name];if(!src)return;const c=skelClone(src);const skinned=[],plain=[];c.traverse(o=>{if(o.isSkinnedMesh)skinned.push(o);else if(o.isMesh)plain.push(o);});
    skinned.forEach(o=>{const bl=o.skeleton.bones.map(b=>bones[b.name]||b);const sk=new THREE.Skeleton(bl,o.skeleton.boneInverses);const m=o.clone();m.bind(sk,o.bindMatrix);m.frustumCulled=false;m.castShadow=true;arm.add(m);});
    plain.forEach(o=>{const m=o.clone();o.updateWorldMatrix(true,false);m.matrix.copy(o.matrixWorld);m.matrix.decompose(m.position,m.quaternion,m.scale);root.add(m);root.updateMatrixWorld(true);(bones.Head||arm).attach(m);m.castShadow=true;});});
  root.scale.setScalar((spec.scale||1)*(spec.anime?.8:RIG.bodyScale));const mixer=new THREE.AnimationMixer(root);const acts={};Object.entries(RIG.clips).forEach(([k,c])=>{acts[k]=mixer.clipAction(c);});
  // 머리 재질은 인물마다 따로 (얼굴 텍스처를 입히므로)
  let headMesh=null;root.traverse(o=>{if(o.isSkinnedMesh&&o.material&&/Superhero/i.test(o.material.name)&&!headMesh)headMesh=o;});if(headMesh){headMesh.material=headMesh.material.clone();headMesh.material.name='head';}
  toonify(root,!!spec.anime);
  const skinMats=[];root.traverse(o=>{if(o.isMesh&&!o.userData.hull&&o.material&&/Regular|Superhero|SuperHero|^head$/i.test(o.material.name))skinMats.push(o.material);});
  return {root,mixer,acts,cur:null,skinMats,arm,headMesh,bones,faceKey:null,props:[],headScale:spec.headScale||(spec.anime?1.55:0)};}
// ───────── 얼굴: 기본 머리 텍스처에 피부색을 입히고 아스트라의 얼굴 오버레이(art/faces.js)를 겹친다 ─────────
const FACE=window.FACE_ART||null,FACETEX={},SKIN_LIFT=+(QF.get('skinlift')||.38);
function faceData(id){return (FACE&&FACE.DATA&&FACE.DATA[id])||(ARTL&&ARTL.DATA&&ARTL.DATA[id])||{};}
function faceTex(baseImg,id,o,expr){const key=id+JSON.stringify(o||{})+expr;if(FACETEX[key])return FACETEX[key];const S=1024,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.anisotropy=4;FACETEX[key]=t;
  const paint=()=>{x.clearRect(0,0,S,S);if(baseImg)x.drawImage(baseImg,0,0,S,S);let skin=faceData(id).skin;
    // 3D 는 따뜻한 조명·툰 명암으로 그림보다 붉고 어둡게 보이므로 피부색을 흰색 쪽으로 당긴다 (SKIN_LIFT, ?skinlift= 로 시험)
    if(skin){const c=new THREE.Color(skin);c.lerp(new THREE.Color(0xffffff),SKIN_LIFT);skin='#'+c.getHexString();}
    // 애니풍: 원본의 코·입·눈두덩 명암을 피부색으로 덮어 평평하게 (FLAT 비율), 그림은 아스트라 오버레이가 맡는다
    const rigc=C[id]&&C[id].rig;if(skin&&rigc&&rigc.anime){x.globalAlpha=rigc.flat!==undefined?rigc.flat:.8;x.fillStyle=skin;x.fillRect(0,0,S,S);x.globalAlpha=1;}
    // 피부색: 원본의 명암은 두고 색조만 인물 색으로, 원본이 어두운 편이라 살짝 밝힌다
    // 원본을 명암만 남기고(탈색) 인물 피부색을 곱한 뒤 살짝 밝힌다 → 색은 데이터의 skin, 굴곡은 원본
    if(skin){x.globalCompositeOperation='color';x.fillStyle=skin;x.fillRect(0,0,S,S);x.globalCompositeOperation='screen';x.globalAlpha=.3;x.fillStyle=skin;x.fillRect(0,0,S,S);x.globalAlpha=1;x.globalCompositeOperation='source-over';}
    t.needsUpdate=true;
    if(FACE&&FACE.face){let inner='';try{inner=FACE.face(id,o||{},expr);}catch(e){console.warn('faces',e);}if(inner){const img=new Image();img.onload=()=>{x.drawImage(img,0,0,S,S);t.needsUpdate=true;};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 1024 1024">${inner}</svg>`);}}};
  if(baseImg&&baseImg.complete===false)baseImg.addEventListener('load',paint,{once:true});else paint();return t;}
const LIGHTBASE={};
function lightBase(sex){const f='T_Superhero_'+(sex==='female'?'Female':'Male')+'_Light.jpg';if(!hasFile('quaternius_char/'+f))return null;if(LIGHTBASE[f])return LIGHTBASE[f];const img=new Image();img.src=ASSET_BASE+'models/quaternius_char/'+f;return LIGHTBASE[f]=img;}
function rigFace(n,expr){const r=n.rig;if(!r||!r.headMesh)return;const key=n.look+JSON.stringify(n.o||{})+expr;if(r.faceKey===key)return;r.faceKey=key;const m=r.headMesh.material;
  if(!r.baseImg){const sex=/female/i.test((rigSpec(n)||{}).head||'')?'female':'male';r.baseImg=lightBase(sex)||(m.map&&m.map.image);}
  m.map=faceTex(r.baseImg,n.look,n.o,expr);if(m.emissiveMap)m.emissiveMap=m.map;m.needsUpdate=true;
  // 눈알·눈썹은 별도 메시: 잘 때 눈알을 숨기고(텍스처 눈꺼풀이 덮는다), 눈 색·눈썹 색은 인물 데이터로
  const D=faceData(n.look);r.root.traverse(o=>{if(!o.isSkinnedMesh||o.userData.hull)return;if(/eyes?$/i.test(o.name)){o.visible=expr!=='sleep';if(D.eye&&!o.userData.tinted){o.material=o.material.clone();o.material.map=(FACE&&FACE.eye&&FACE.DATA&&FACE.DATA[n.look]&&FACE.DATA[n.look].animeEye)?eyeSvgTex(n.look,o.material.map):eyeTex(o.material.map,D.eye);o.material.needsUpdate=true;o.userData.tinted=true;}}
    if(/eyebrow/i.test(o.name)&&D.hair&&!o.userData.tinted){o.material=o.material.clone();o.material.color.set(D.hair);o.userData.tinted=true;}});
  rigProps(n);}
// 눈 텍스처: 홍채(채도 있는 갈색 부분)만 인물 눈 색으로 바꾼다. 흰자·동공은 그대로
const EYETEX={};
function eyeTex(base,color){if(!base||!base.image)return base;const key=color;if(EYETEX[key])return EYETEX[key];const img=base.image,S=256,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.flipY=base.flipY;EYETEX[key]=t;const tc=new THREE.Color(color);
  const paint=()=>{x.drawImage(img,0,0,S,S);const d=x.getImageData(0,0,S,S),p=d.data;for(let i=0;i<p.length;i+=4){const R=p[i]/255,G=p[i+1]/255,B=p[i+2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B),sat=mx?(mx-mn)/mx:0;if(sat<.18||mx<.08)continue;const lum=.3*R+.59*G+.11*B;const k=lum/(.3*tc.r+.59*tc.g+.11*tc.b||1);p[i]=Math.min(255,tc.r*k*255);p[i+1]=Math.min(255,tc.g*k*255);p[i+2]=Math.min(255,tc.b*k*255);}x.putImageData(d,0,0);t.needsUpdate=true;};
  if(img.complete===false)img.addEventListener('load',paint,{once:true});else paint();return t;}
function eyeSvgTex(id,base){const key='svg'+id;if(EYETEX[key])return EYETEX[key];const S=512,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.flipY=base?base.flipY:false;EYETEX[key]=t;
  let inner='';try{inner=FACE.eye(id);}catch(e){console.warn('eye',e);}if(inner){const img=new Image();img.onload=()=>{x.drawImage(img,0,0,S,S);t.needsUpdate=true;};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 256 256">${inner}</svg>`);}return t;}
// 소품(귀걸이·안경·깃털…): faces.js DATA[id].props 를 단순 도형으로 만들어 Head 뼈에 붙인다. 가짜(n.o)가 side 를 바꾸면 자리를 옮긴다
const PROPM={gold:new THREE.MeshStandardMaterial({color:0xc9a45a,metalness:.9,roughness:.35}),silver:new THREE.MeshStandardMaterial({color:0xd8d8e0,metalness:.9,roughness:.3}),dark:new THREE.MeshStandardMaterial({color:0x2a2420,roughness:.6})};
function headAnchors(r){if(r.anch)return r.anch;const hm=r.headMesh,head=r.bones.Head;if(!hm||!head)return null;const inv=hm.skeleton.boneInverses[hm.skeleton.bones.indexOf(head)];const M=new THREE.Matrix4().copy(inv).multiply(hm.bindMatrix);
  // 머리만 남긴 기하는 색인만 줄었으므로 색인에 쓰인 꼭짓점만 잰다
  const g=hm.geometry,p=g.attributes.position,v=new THREE.Vector3(),bb=new THREE.Box3();const idx=g.index?g.index.array:null;const used=new Set(idx?Array.from(idx):[...Array(p.count).keys()]);used.forEach(i=>{v.fromBufferAttribute(p,i).applyMatrix4(M);bb.expandByPoint(v);});
  let eyes=null;r.root.traverse(o=>{if(o.isSkinnedMesh&&/eye/i.test(o.name)&&!eyes)eyes=o;});const eb=new THREE.Box3();if(eyes){const q=eyes.geometry.attributes.position;for(let i=0;i<q.count;i++){v.fromBufferAttribute(q,i).applyMatrix4(M);eb.expandByPoint(v);}}
  const ec=eyes?eb.getCenter(new THREE.Vector3()):bb.getCenter(new THREE.Vector3());const fz=Math.sign(ec.z-bb.getCenter(new THREE.Vector3()).z)||1;const cx=(bb.min.x+bb.max.x)/2,cz=(bb.min.z+bb.max.z)/2;
  const L=1,R=-1;const ear=s=>new THREE.Vector3(cx+s*(bb.max.x-cx)*.98,ec.y-.01,cz);
  return r.anch={headW:bb.max.x-bb.min.x,earL:ear(L),earR:ear(R),brow:new THREE.Vector3(cx,ec.y+.03,ec.z+fz*.02),nose:new THREE.Vector3(cx,ec.y-.03,ec.z+fz*.03),head:new THREE.Vector3(cx,bb.max.y-.01,cz),neck:new THREE.Vector3(cx,bb.min.y+.03,cz),fz,eyeW:eyes?(eb.max.x-eb.min.x):.06};}
function rigProps(n){const r=n.rig;const A=headAnchors(r);if(!A)return;r.props.forEach(m=>m.parent&&m.parent.remove(m));r.props=[];const D=faceData(n.look);const o=n.o||{};let list=[];
  if(FACE&&FACE.props&&FACE.DATA&&FACE.DATA[n.look]){try{list=FACE.props(n.look,o);}catch(e){}}
  else{list=(D.props||[]).map(p=>{const ov=o[p.feat||p.kind]||o[p.kind==='ring'?'earring':p.kind];if(ov&&ov.side)return {...p,where:(p.where||'').replace(/[LR]$/,ov.side)};return p;});}
  list.forEach(p=>{let mesh=null;const mat=PROPM[p.mat||'gold']||PROPM.gold;const at=A[p.where]||A.head;
    if(p.kind==='ring'){mesh=new THREE.Mesh(new THREE.TorusGeometry(p.r||.012,p.tube||.0025,6,16),mat);mesh.position.copy(at).add(new THREE.Vector3(0,-(p.r||.012),0));mesh.rotation.y=Math.PI/2;}
    else if(p.kind==='circlet'){mesh=new THREE.Mesh(new THREE.TorusGeometry(A.headW*.5*1.02,.0035,6,40),PROPM[p.mat||'silver']);mesh.position.set(A.brow.x,A.brow.y+.012,A.brow.z-A.fz*.045);mesh.rotation.x=Math.PI/2-A.fz*.25;}
    else if(p.kind==='glasses'){const g=new THREE.Group();[-1,1].forEach(s=>{const rim=new THREE.Mesh(new THREE.TorusGeometry(A.eyeW*.28,.0025,6,20),PROPM[p.mat||'dark']);rim.position.set(A.brow.x+s*A.eyeW*.52,A.brow.y-.03,A.brow.z+A.fz*.02);g.add(rim);});mesh=g;}
    else if(p.kind==='feather'){mesh=new THREE.Mesh(new THREE.PlaneGeometry(.012,.06),new THREE.MeshStandardMaterial({color:p.color||0x6a8a4a,side:THREE.DoubleSide,roughness:.9}));mesh.position.copy(at).add(new THREE.Vector3(0,-.035,0));}
    else if(p.kind==='plume'){mesh=new THREE.Mesh(new THREE.ConeGeometry(.02,.12,6),new THREE.MeshStandardMaterial({color:p.color||0xa83030,roughness:.9}));mesh.position.copy(A.head).add(new THREE.Vector3((p.where||'').endsWith('L')?.04:-.04,.05,0));}
    else if(p.kind==='elfEar'){const s=(p.where||'').endsWith('L')?1:-1;const g=new THREE.ConeGeometry(.013,.055,8);g.translate(0,.0275,0);mesh=new THREE.Mesh(g,PROPM.skin||(PROPM.skin=new THREE.MeshToonMaterial({color:p.color||0xf2d6c0,gradientMap:ANIMEGRAD})));mesh.position.copy(at).add(new THREE.Vector3(-s*.006,.014,-.008));mesh.rotation.set(-1.15,0,-s*.95);mesh.castShadow=true;}
    else if(p.kind==='ribbon'){mesh=new THREE.Mesh(new THREE.BoxGeometry(.05,.02,.01),new THREE.MeshStandardMaterial({color:p.color||0xc03050,roughness:.8}));mesh.position.copy(at).add(new THREE.Vector3(0,.03,0));}
    if(!mesh)return;mesh.traverse(q=>{if(q.isMesh)q.castShadow=true;});r.bones.Head.add(mesh);r.props.push(mesh);});}
function rigPlay(r,name,fade=.22){if(r.cur===name||!r.acts[name])return;const a=r.acts[name];a.reset().setEffectiveWeight(1).fadeIn(fade).play();if(r.cur&&r.acts[r.cur])r.acts[r.cur].fadeOut(fade);r.cur=name;}
function rigAttach(n){if(!RIG.ready||n.rig||n.sprite)return;const spec=rigSpec(n);if(!spec)return;const r=rigBuild(spec);if(!r)return;n.rig=r;n.g.add(r.root);n.doll.visible=false;rigPlay(r,'Idle_Loop',0);rigFace(n,'neutral');}
// 매 프레임: 상태에 맞는 동작, 몸의 방향, 앉기·눕기 보정
function rigTick(n,dt,walking,sitting,sleeping,rel){const r=n.rig;const voidLook=n.look==='void';r.root.visible=!voidLook&&n.visible;n.doll.visible=voidLook;if(!r.root.visible)return;
  const talking=(n.talkT||0)>0;let clip=walking?'Walk_Loop':sitting?(talking?'Sitting_Talking_Loop':'Sitting_Idle_Loop'):sleeping?'Idle_Loop':talking?'Idle_Talking_Loop':'Idle_Loop';
  if(n.state==='hunt'||n.luring)clip=walking?'Jog_Fwd_Loop':'Idle_Loop';rigPlay(r,clip);if(r.acts.Walk_Loop)r.acts.Walk_Loop.timeScale=Math.max(.6,n.speed/1.35);
  // 종이 인형은 카메라를 보지만 몸은 걷는 방향·의자 방향을 본다. 서 있을 때 가까이 오면 고개 대신 몸을 살짝 돌린다
  let ty=0;if(!walking&&!sitting&&!sleeping&&Math.abs(rel)<1.4)ty=rel*.7;r.root.rotation.y+=(ty-r.root.rotation.y)*Math.min(1,dt*4);
  r.root.position.y=sitting?.42:sleeping?.62+.25:0;r.root.rotation.x=sleeping?-Math.PI/2:0;r.root.position.z=sleeping?-.3:0;
  const moss=n.o&&n.o.moss;r.skinMats.forEach(m=>{if(m.emissive)m.emissive.setHex(moss?0x3a7a2a:(m.userData.baseEmissive||0));});
  rigFace(n,sleeping?'sleep':talking?'talk':(n.surprise>0?'surprise':'neutral'));
  r.mixer.update(dt);
  // 등신: 머리 뼈를 키운다 (클립에 scale 트랙이 있어 매 프레임 덧씌운다)
  if(r.bones.Head)r.bones.Head.scale.setScalar(r.headScale||RIG.headScale);
  // 고개: 가까이 있는 플레이어를 본다 (애니메이션 위에 덧씌움, 좌우 ±50°, 상하 ±35°)
  if(!sleeping){const hb=r.bones.Head;if(hb){hb.updateWorldMatrix(true,false);const hp=new THREE.Vector3().setFromMatrixPosition(hb.matrixWorld);const cam=camera.position;const dx=cam.x-hp.x,dz=cam.z-hp.z,dh=Math.hypot(dx,dz);
    let want=0,pitch=0;if(dh<3.5&&Math.abs(rel)<1.5){const fwd=n.face+r.root.rotation.y;let a=Math.atan2(dx,dz)-fwd;while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;want=Math.max(-.9,Math.min(.9,a));pitch=Math.max(-.6,Math.min(.6,Math.atan2(cam.y-hp.y-.05,dh)));}
    const ly=r.lookY||0,lp=r.lookP||0,k=Math.min(1,dt*5);r.lookY=ly+(want-ly)*k;r.lookP=lp+(pitch-lp)*k;
    // 세계 축 회전을 부모 뼈 공간으로 옮겨 곱한다 (rotateOnWorldAxis 는 부모 회전을 무시한다)
    const pq=new THREE.Quaternion();hb.parent.getWorldQuaternion(pq);const inv=pq.clone().invert();const rot=(axis,ang)=>{const a=axis.clone().applyQuaternion(inv).normalize();hb.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(a,ang));};
    rot(new THREE.Vector3(0,1,0),r.lookY);const ang=n.face+r.root.rotation.y+r.lookY;rot(new THREE.Vector3(Math.cos(ang),0,-Math.sin(ang)),-r.lookP);}}}

// ───── 24_sprite.js ─────
// ───────── 픽셀 스프라이트 인물 (HD-2D 하이브리드): art/sprites.js 의 도트 프레임을 판 한 장에 세운다 ─────────
// 인물 데이터에 sprite:true 가 있고 SPRITE_ART 에 그림이 있으면 종이 인형·리깅 몸 대신 쓴다. ?nosprite 로 끈다, ?sprite=all 은 그림이 있는 인물 전부.
const SPR=window.SPRITE_ART||null,SPRTEX={};
const SPR_ON=!QF.has('nosprite');
function sprHas(id){return !!(SPR&&SPR.DATA&&SPR.DATA[id]);}
function sprWant(n){if(!SPR_ON||!sprHas(n.look))return false;const c=C[n.look];return !!(c&&c.sprite)||QF.get('sprite')==='all';}
// 문자열 프레임 → 캔버스 텍스처 (nearest, 밉맵 없음)
function sprTex(key,rows,pal,w,h){if(SPRTEX[key])return SPRTEX[key];const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  for(let y=0;y<h;y++){const r=rows[y]||'';for(let i=0;i<w;i++){const ch=r[i];if(!ch||ch==='.'||!pal[ch])continue;x.fillStyle=pal[ch];x.fillRect(i,y,1,1);}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return SPRTEX[key]=t;}
function sprSheet(n){const key=n.look+JSON.stringify(n.o||{});if(n.sprite&&n.sprite.key===key)return n.sprite.sheet;let sheet=null;try{sheet=SPR.get(n.look,n.o||{});}catch(e){console.warn('sprites',e);}return sheet;}
function spriteAttach(n){if(n.sprite||!sprWant(n))return;const sheet=sprSheet(n);if(!sheet)return;const D=SPR.DATA[n.look]||{};const H=(D.height||1.6)*(sheet.h/(sheet.h-2)),W=H*sheet.w/sheet.h;
  const g=new THREE.PlaneGeometry(W,H);g.translate(0,H/2,0);const m=new THREE.MeshLambertMaterial({transparent:true,alphaTest:.5,side:THREE.DoubleSide});const plane=new THREE.Mesh(g,m);plane.castShadow=true;plane.receiveShadow=false;
  const holder=new THREE.Group();holder.add(plane);n.g.add(holder);n.doll.visible=false;if(n.rig)n.rig.root.visible=false;
  n.sprite={key:n.look+JSON.stringify(n.o||{}),sheet,plane,holder,t:0,frame:0,dir:'front',anim:'idle'};sprFrame(n,'front','idle',0);}
function sprFrame(n,dir,anim,i){const s=n.sprite;const sheet=s.sheet;const A=(sheet.anims[dir]||sheet.anims.front||{});let rows=(A[anim]||A.idle||[])[i];if(!rows){const alt=sheet.anims.front||{};rows=(alt[anim]||alt.idle||[])[i]||(alt.idle||[])[0];}if(!rows)return;
  const key=s.key+'|'+dir+'|'+anim+'|'+i;const t=sprTex(key,rows,sheet.pal,sheet.w,sheet.h);if(s.plane.material.map!==t){s.plane.material.map=t;s.plane.material.needsUpdate=true;}}
function spriteRefresh(n){if(!n.sprite)return;const key=n.look+JSON.stringify(n.o||{});if(n.sprite.key===key)return;const sheet=sprSheet(n);if(!sheet)return;n.sprite.sheet=sheet;n.sprite.key=key;sprFrame(n,n.sprite.dir,n.sprite.anim,n.sprite.frame);}
// 매 프레임: 카메라를 향해 서고, 보는 각도에 따라 앞·뒤·옆 그림, 상태에 따라 동작
function spriteTick(n,dt,walking,sitting,sleeping,rel){const s=n.sprite;if(!s)return;spriteRefresh(n);const voidLook=n.look==='void';s.holder.visible=!voidLook&&n.visible;n.doll.visible=voidLook;if(!s.holder.visible)return;
  s.holder.rotation.y=rel;s.holder.rotation.x=sleeping?-1.25:0;s.holder.position.y=sitting?.42:sleeping?.62:0;
  const a=Math.abs(rel);let dir=a<Math.PI/4?'front':a>Math.PI*3/4?'back':(rel>0?'left':'right');if(sleeping)dir='front';
  const talking=(n.talkT||0)>0;const anim=walking?'walk':(talking&&dir==='front'&&s.sheet.anims.front.talk)?'talk':'idle';
  const A=s.sheet.anims[dir]||s.sheet.anims.front;const frames=(A[anim]||A.idle||[]).length||1;const rate=anim==='walk'?Math.max(4,n.speed*5.5):anim==='talk'?4:.9;
  s.t+=dt*rate;const fi=Math.floor(s.t)%frames;if(dir!==s.dir||anim!==s.anim||fi!==s.frame){s.dir=dir;s.anim=anim;s.frame=fi;sprFrame(n,dir,anim,fi);}}
// 창구 초상
function spritePortrait(n){if(!n.sprite||!n.sprite.sheet.portrait)return null;const P=n.sprite.sheet.portrait;return sprTex(n.sprite.key+'|portrait',P.rows,P.pal||n.sprite.sheet.pal,P.w,P.h);}

// ───── 30_play.js ─────
// ───────── 플레이어 ─────────
const controls=new PointerLockControls(camera,document.body);
// 포인터 잠금이 막힌 환경(일부 임베드·자동화 창)에서는 오른쪽 버튼을 끌어서 둘러본다
const LIVE=()=>controls.isLocked||(!!G.free&&!WIN&&G.started&&!G.over);const RUNNING=()=>LIVE()||(!!G.soft&&!WIN&&G.started&&!G.over);
function relock(){if(!G.free&&!SEAT)controls.lock();}
// 창을 ESC 로 닫은 직후: 브라우저가 바로 다시 잠그는 것을 막으므로, 잠그지 않은 채 '클릭하면 계속' 상태로 둔다(시간은 흐른다)
function softUnlock(){if(G.free)return;G.soft=true;$('pause').hidden=true;$('lockHint').textContent='클릭하면 계속';$('lockHint').hidden=false;}
document.addEventListener('pointerlockerror',()=>{if(G.free)return;G.free=true;document.body.classList.add('free');$('lockHint').textContent='마우스 잠금이 막힌 창 — 오른쪽 버튼을 누른 채 끌어서 둘러본다';$('lockHint').hidden=false;$('pause').hidden=true;
  sub('안내','이 창에선 마우스 잠금이 막혀 있다. 오른쪽 버튼을 누른 채 끌어서 둘러보자.',1);});
const EUL=new THREE.Euler(0,0,0,'YXZ');
addEventListener('mousemove',e=>{if(!G.free||!(e.buttons&2)||WIN)return;EUL.setFromQuaternion(camera.quaternion);EUL.y-=e.movementX*.0026;EUL.x=Math.max(-1.45,Math.min(1.45,EUL.x-e.movementY*.0026));camera.quaternion.setFromEuler(EUL);});
addEventListener('contextmenu',e=>{if(G.free)e.preventDefault();});
const P={x:4,z:9.8,y:0,eye:1.62,hp:3,oil:100,lamp:false,held:null,bars:2,heal:1,notes:[],step:0};
Object.defineProperty(P,'money',{get:()=>G.money,set:v=>{G.money=v;}});
camera.position.set(P.x,P.eye,P.z);camera.rotation.set(0,Math.PI*.5,0);
const KEY={};
addEventListener('keydown',e=>{KEY[e.code]=true;onKey(e);});addEventListener('keyup',e=>{KEY[e.code]=false;});
function movePlayer(dt){if(SEAT){seatCam(dt);return;}const lk=leanTick(dt),live=LIVE()&&!LEAN&&!SPOTS.on;
  const sp=(KEY.ShiftLeft||KEY.ShiftRight)?5:3.1;const f=new THREE.Vector3();camera.getWorldDirection(f);f.y=0;f.normalize();const r=new THREE.Vector3(-f.z,0,f.x);
  let mx=0,mz=0;if(live&&KEY.KeyW){mx+=f.x;mz+=f.z;}if(live&&KEY.KeyS){mx-=f.x;mz-=f.z;}if(live&&KEY.KeyD){mx+=r.x;mz+=r.z;}if(live&&KEY.KeyA){mx-=r.x;mz-=r.z;}
  const l=Math.hypot(mx,mz);P.moving=l>0;if(l>0){mx=mx/l*sp*dt;mz=mz/l*sp*dt;
    const nx=P.x+mx;if(!blocked(nx,P.z,P.y)&&!doorBlocked(nx,P.z,P.y,.28))P.x=nx;
    const nz=P.z+mz;if(!blocked(P.x,nz,P.y)&&!doorBlocked(P.x,nz,P.y,.28))P.z=nz;
    P.step+=Math.hypot(mx,mz);if(P.step>.62){P.step=0;sfx('step');}}
  const ty=floorY(P.x,P.z,P.y);P.y+=(ty-P.y)*Math.min(1,dt*14);
  const bob=l>0?Math.sin(performance.now()/110)*.035:0;if(SPOTS.on)spotTick();
  let ox=0,oz=0;if(LEAN){const dx=LEAN.x-P.x,dz=LEAN.z-P.z,dd=Math.hypot(dx,dz)||1;ox=dx/dd*.28*lk;oz=dz/dd*.28*lk;}
  camera.position.set(P.x+ox,P.y+P.eye+bob-.07*lk+(G.shake>0?(Math.random()-.5)*G.shake*.2:0),P.z+oz);}

// ───────── 손과 등불 ─────────
// 도구 전환은 없다. 조준한 대상의 '할 일' 목록에서 휠로 고르고 클릭한다. 등불만 F로 든다.
const TICON={hand:`<path d="M10 30 C6 22 8 16 12 18 L14 22 L14 8 C14 5 18 5 18 8 L18 18 L19 5 C19 2 23 2 23 5 L23 18 L24 7 C24 4 28 4 28 7 L28 19 L29 11 C29 8 33 8 33 11 L32 26 C31 34 26 38 19 38 C14 38 12 35 10 30Z" fill="#f3d9b5" stroke="#382c2b" stroke-width="2.4" stroke-linejoin="round"/>`,
 lamp:`<path d="M20 4 v5" stroke="#382c2b" stroke-width="3"/><rect x="11" y="9" width="18" height="24" rx="4" fill="#ffcf6a" stroke="#382c2b" stroke-width="2.6"/><ellipse cx="20" cy="22" rx="4" ry="6" fill="#fff4c8"/><rect x="9" y="33" width="22" height="4" rx="2" fill="#cda65f" stroke="#382c2b" stroke-width="2"/>`,
 ear:`<path d="M26 34 C18 38 12 32 16 26 C18 22 12 20 12 14 C12 6 20 3 26 5 C33 8 34 18 29 23 C26 26 30 30 26 34Z" fill="#f3c9a5" stroke="#382c2b" stroke-width="2.6" stroke-linejoin="round"/><path d="M19 14 C19 9 26 9 26 15 C26 19 21 19 22 23" fill="none" stroke="#382c2b" stroke-width="2.2" stroke-linecap="round"/>`,
 mouth:`<path d="M6 10 C6 6 9 4 13 4 L29 4 C33 4 35 7 35 10 L35 22 C35 26 32 28 28 28 L18 28 L10 35 L11 28 C8 28 6 26 6 22Z" fill="#fbf6ea" stroke="#382c2b" stroke-width="2.6" stroke-linejoin="round"/><path d="M13 16 h3 M19 16 h3 M25 16 h3" stroke="#382c2b" stroke-width="3" stroke-linecap="round"/>`,
 bar:`<rect x="4" y="15" width="32" height="10" rx="2" fill="#a8744a" stroke="#382c2b" stroke-width="2.6"/><path d="M11 15 v10 M29 15 v10" stroke="#382c2b" stroke-width="2"/><rect x="6" y="11" width="5" height="18" rx="1" fill="#6a6a70" stroke="#382c2b" stroke-width="2"/><rect x="29" y="11" width="5" height="18" rx="1" fill="#6a6a70" stroke="#382c2b" stroke-width="2"/>`,
 heal:`<path d="M16 4 h8 v8 C31 15 33 20 33 26 C33 33 27 37 20 37 C13 37 7 33 7 26 C7 20 9 15 16 12Z" fill="#8fd06a" stroke="#382c2b" stroke-width="2.6" stroke-linejoin="round"/><rect x="14" y="2" width="12" height="5" rx="1.5" fill="#cda65f" stroke="#382c2b" stroke-width="2"/><path d="M14 25 h12 M20 19 v12" stroke="#fbf6ea" stroke-width="3" stroke-linecap="round"/>`,
 club:`<path d="M9 35 L25 13 C27 9 33 7 35 11 C37 15 33 19 29 20 L13 37Z" fill="#8a5a36" stroke="#382c2b" stroke-width="2.6" stroke-linejoin="round"/><path d="M26 12 l2 2 M31 13 l1 2" stroke="#382c2b" stroke-width="2"/>`,
 eye:`<path d="M4 20 C10 10 30 10 36 20 C30 30 10 30 4 20Z" fill="#fbf6ea" stroke="#382c2b" stroke-width="2.6" stroke-linejoin="round"/><circle cx="20" cy="20" r="6" fill="#4a7a8a" stroke="#382c2b" stroke-width="2"/><circle cx="18" cy="18" r="2" fill="#fff"/>`};
const ticon=(k,w=30)=>`<svg width="${w}" height="${w}" viewBox="0 0 40 40">${TICON[k]||TICON.hand}</svg>`;
const lantern=new THREE.PointLight(0xffc27a,0,9,1.5);camera.add(lantern);lantern.position.set(.25,-.2,-.3);
function setLamp(on){if(on&&P.oil<=0){sub('등불','기름이 없다.');return;}if(P.lamp===on)return;P.lamp=on;sfx('flip');renderBelt();document.body.classList.toggle('lamp',on);if(SEAT){if(SEAT.tray)renderTray();else renderSeat();}}
function renderBelt(){$('belt').innerHTML=`<div class="it"><b>손</b> ${P.held?ITN[P.held]||P.held:'빈손'}</div>`+
  `<div class="it lampI ${P.lamp?'on':''}">${ticon('lamp',20)}<kbd>F</kbd><span class="og oil-${(OILS[G.oilPick]||{}).tint||'none'}"><i style="width:${P.oil}%"></i></span><small>${G.oilPick!=='oil'?OILS[G.oilPick].n:''}</small></div>`+
  `<div class="it">${ticon('bar',18)}빗장 ×${P.bars}</div><div class="it">${ticon('heal',18)}치료약 ×${P.heal}</div><div class="it"><kbd>Tab</kbd>장부 <kbd>H</kbd>힌트</div>`;}

// ───────── 바라보는 대상과 할 일 목록 ─────────
const ray=new THREE.Raycaster();ray.far=3.2;let AIM=null,VSEL=0,VKEY='',VLIST=[],PHTML='';
function verbsFor(){
  if(HUNT&&HUNT.visible&&Math.hypot(HUNT.x-P.x,HUNT.z-P.z)<3.4)return{name:'그것',key:'hunt',verbs:[{k:'club',ic:'club',t:'몽둥이를 휘두른다',fn:clubSwing}]};
  const info=AIM?ACT(AIM.it,AIM.npc):null,ok=info&&info.verbs&&info.verbs.length;
  const hv=P.held?{k:'drop',ic:'hand',t:`${ITN[P.held]||'들고 있는 것'}을(를) 내려놓는다`,fn:dropHeld}:null;
  if(ok)return{...info,key:AIM.it,verbs:hv?[...info.verbs,hv]:info.verbs};return hv?{name:'손에 든 것',key:'held:'+P.held,verbs:[hv]}:null;}
function aim(){ray.setFromCamera({x:0,y:0},camera);const hits=ray.intersectObjects(INTER.filter(m=>m.visible&&(!m.userData.npc||m.userData.npc.visible)),false);
  AIM=hits.length?hits[0].object.userData:null;
  const info=WIN||LEAN||STN?null:verbsFor();const key=info?info.key:'';if(key!==VKEY){VKEY=key;VSEL=0;}
  VLIST=info?info.verbs:[];if(VSEL>=VLIST.length)VSEL=0;
  let h='';if(info){h=`<b>${josa(info.name)}</b>`+VLIST.map((v,i)=>{const dim=v.need==='lamp'&&!P.lamp;return `<span class="vb${i===VSEL?' on':''}${dim?' dim':''}">${ticon(v.ic||'hand',16)}${josa(v.t)}${v.min?`<small>+${v.min}분</small>`:''}${dim?'<small>F 등불 필요</small>':''}${i===VSEL?'<kbd>클릭</kbd>':''}</span>`;}).join('')+(VLIST.length>1?'<em>휠 ↕ 고르기</em>':'');}
  if(h!==PHTML){PHTML=h;$('prompt').innerHTML=h;$('cross').classList.toggle('on',!!info);}
  if(VLIST.length>1)tip('wheel','할 일이 여러 줄이면 <b>마우스 휠</b>(또는 Q)로 고른 뒤 클릭한다.');
  if(P.lamp&&P.oil>0&&AIM&&!WIN)lampReveal(AIM);}
function doVerb(){const v=VLIST[VSEL];if(!v)return;if(v.need==='lamp'&&!P.lamp){sub('등불','F를 눌러 등불을 먼저 든다.');return;}v.fn();PHTML='';}
function nextVerb(d=1){if(VLIST.length>1){VSEL=(VSEL+d+VLIST.length)%VLIST.length;tone('triangle',700,.03,.04);}}
// 등불로 비추면 드러나는 것 (포자 버섯, 감염자의 초록 가루)
function lampReveal(a){
  if(a.it&&a.it.startsWith('shelf:')){const s=SHELF[+a.it.split(':')[1]];if(!s)return;tutEvent('shine');
    if(s.k==='spore'&&!s.seen){s.seen=1;if(s.cap)s.cap.material.emissive.setHex(0x4a8a18);sub('등불','갓 아래에 초록 가루— 포자 버섯이다. 이건 빼자.',1);}return;}
  const n=a.npc;if(n&&n.infected&&!n.cured&&!n.lampSeen&&Math.hypot(n.x-P.x,n.z-P.z)<3.2){n.lampSeen=true;setLook(n,n.look,{...(n.o||{}),moss:1});sub(n.name,'등불에 비추자 목덜미에서 초록 가루가 반짝인다.',1);}}
// 귀 대기: 몸을 기울여 1.3초 듣는다 (누르고 있을 필요 없음)
let LEAN=null;
function lean(x,z,fn){if(LEAN)return;LEAN={t:0,x,z,fn};$('ring').classList.add('go');}
function leanTick(dt){if(!LEAN)return 0;LEAN.t+=dt;const k=Math.sin(Math.min(1,LEAN.t/1.3)*Math.PI);if(LEAN.t>=1.3){const fn=LEAN.fn;LEAN=null;$('ring').classList.remove('go');fn();return 0;}return k;}
addEventListener('wheel',e=>{if(!LIVE())return;nextVerb(e.deltaY>0?1:-1);});
addEventListener('mousedown',e=>{if(STN&&e.button===2){closeStation(true);return;}if(G.soft&&!WIN&&!controls.isLocked&&e.button===0&&$('pause').hidden&&$('start').hidden){G.soft=false;relock();return;}if(!LIVE())return;if(e.button===0){G.mouse=true;doVerb();}else if(e.button===2&&!G.free)nextVerb(1);});
addEventListener('mouseup',e=>{if(e.button===0)G.mouse=false;});
function onKey(e){
  if(e.code==='Tab'){e.preventDefault();toggleBook();return;}
  if(SPOTS.on&&!WIN&&!STN&&!SEAT&&(RUNNING()||G.force)&&spotKey(e.code)){e.preventDefault();return;}
  if(e.code==='KeyF'&&G.started&&!G.over){setLamp(!P.lamp);return;}
  if(e.code==='F2'){mood.uniforms.uOn.value=1-mood.uniforms.uOn.value;sub('화면','필터 '+(mood.uniforms.uOn.value?'켜짐':'꺼짐'));}
  if(e.code==='BracketRight'){G.speed*=2;G.npcMul=(G.npcMul||1)*2;sub('치트',`시간 ×${(G.speed/(60/CAMP.HOUR_SEC)).toFixed(1)}`);}if(e.code==='BracketLeft'){G.speed/=2;G.npcMul=(G.npcMul||1)/2;sub('치트',`시간 ×${(G.speed/(60/CAMP.HOUR_SEC)).toFixed(1)}`);}
  if(STN){if(e.code==='Escape'||e.code==='KeyE'||e.code==='Tab'){e.preventDefault();closeStation(e.code==='Escape');}return;}
  if(SEAT){if(e.code==='KeyS'||e.code==='Escape')closeSeat(e.code==='Escape');return;}
  if(e.code==='Escape'&&G.soft&&!WIN&&G.started){G.soft=false;$('lockHint').hidden=true;$('pause').hidden=false;return;}
  if(!LIVE())return;
  if(e.code==='KeyE')doVerb();
  if(e.code==='KeyQ')nextVerb(1);
  if(e.code==='KeyH')hint();}

// ───────── 자막·메모·알림 ─────────
let SUBT=0;
function sub(who,t,log){$('sub').innerHTML=`<b>${who}</b> ${josa(t).replace(/</g,'&lt;')}`;$('sub').classList.add('show');SUBT=5;if(log)note(who,t);}
function note(w,t){P.notes.unshift({w,t:josa(t),at:hhmm(G.t)});}
const hhmm=m=>{m=((Math.floor(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
const JO={'이(가)':['이','가'],'을(를)':['을','를'],'은(는)':['은','는'],'과(와)':['과','와']};
const josa=t=>String(t).replace(/([가-힣])(이\(가\)|을\(를\)|은\(는\)|과\(와\))/g,(m,ch,j)=>ch+JO[j][(ch.charCodeAt(0)-0xAC00)%28?0:1]);
function spend(min){G.t+=min;}

// ───────── 창 (포인터 잠금 해제 + 시간 느리게) ─────────
let WIN=null;
function openWin(id,html,slow=.25){WIN=id;G.scale=slow;controls.unlock();const w=$('win');w.className='card3 '+id;w.innerHTML=html;$('winWrap').hidden=false;}
function closeWin(){WIN=null;G.scale=1;$('winWrap').hidden=true;$('loupe3').hidden=true;$('lockHint').hidden=false;if(SEAT){WIN='seat';G.scale=.5;$('lockHint').hidden=true;}}
$('winWrap').addEventListener('click',e=>{if(e.target.id==='winWrap')closeWin();});
cv.addEventListener('click',()=>{if(!WIN&&G.started&&!G.over)relock();});
controls.addEventListener('lock',()=>{G.soft=false;$('lockHint').hidden=true;$('pause').hidden=true;});
controls.addEventListener('unlock',()=>{if(!WIN&&!G.soft&&G.started&&!G.over){$('pause').hidden=false;}});
$('resumeBtn').onclick=()=>{$('pause').hidden=true;softUnlock();};
// 치트(테스트용): 속도·단계 건너뛰기
$('pause').querySelectorAll('[data-spd]').forEach(b=>b.onclick=()=>{G.speed=(60/CAMP.HOUR_SEC)*(+b.dataset.spd);G.npcMul=+b.dataset.spd;sub('치트',`시간 ×${b.dataset.spd}`);});
$('pause').querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{const ph=CAMP.timeline.find(p=>p.id===b.dataset.jump);if(!ph)return;const tgt=phAt(ph);const cur=dm();if(tgt>cur){G.t+=tgt-cur;}else{G.t+=tgt-cur+1440;}$('pause').hidden=true;softUnlock();sub('치트',`${ph.label}(으)로 건너뜀`);});$('restartBtn').onclick=()=>{clearSave();location.reload();};
$('setSens').oninput=e=>{controls.pointerSpeed=+e.target.value;try{localStorage.setItem('srg_sens',e.target.value);}catch(x){}};
$('setVol').oninput=e=>{if(MASTER)MASTER.gain.value=+e.target.value;try{localStorage.setItem('srg_vol',e.target.value);}catch(x){}};
$('setFilter').onchange=e=>{mood.uniforms.uOn.value=e.target.checked?1:0;};
$('setLow').onchange=e=>{PIX=e.target.checked?2:BASEPIX;resize();};
$('setBig').onchange=e=>{document.body.classList.toggle('big',e.target.checked);};
try{const sv=localStorage.getItem('srg_sens');if(sv){$('setSens').value=sv;controls.pointerSpeed=+sv;}const vv=localStorage.getItem('srg_vol');if(vv)$('setVol').value=vv;}catch(x){}

// 장부 (Tab)
let PAGE='rule';
function toggleBook(){if(WIN==='book'){closeWin();relock();return;}if(WIN&&WIN!=='seat')return;renderBookWin();}
function renderBookWin(){const pg=[['rule','수칙'],['reg','단골'],['room','숙박부'],['quest','의뢰'],['store','창고'],['memo','메모']];
  let h=`<div class="bookTabs">${pg.map(([k,n])=>`<button data-pg="${k}" class="${PAGE===k?'on':''}">${n}</button>`).join('')}<span class="nobuy">Tab으로 닫기 · 펴 있는 동안 시간이 느리게 흐른다</span></div><div class="bookPage">`;
  if(PAGE==='rule'){const pw=todayPW();h+=`<h2>여관 수칙</h2><div class="by">— 마그다 · 오늘의 암구호: <b>${pw.q} → ${pw.a}</b></div><ol class="rl">${RULES.filter(r=>G.rulesKnown.includes(r.id)).map(r=>`<li class="${r.red?'red':''} ${G.struck.includes(r.id)?'struck':''} ${r.ink==='fake'?'wet-'+(r.hint||'wet'):''}"><span class="n">${r.n}.</span><span class="ink-${r.ink==='fake'?'m':r.ink}">${r.t}</span>${r.day&&r.day===G.day?'<em class="newTag">새 줄</em>':''}<button class="mini strike" data-strike="${r.id}">${G.struck.includes(r.id)?'되살린다':'줄 긋기'}</button></li>`).join('')}</ol><p class="nobuy">가짜 줄의 흔적: 젖은 잉크, 겹친 번호, "손님" 말투, 기존 수칙과 모순.</p>`;}
  if(PAGE==='reg')h+=`<h2>단골 카드</h2><div class="regGrid">${REG_IDS.map(id=>{const s=G.regs[id];return `<div class="rcard ${s.gone?'gone':''}"><div class="ph"><svg viewBox="0 0 200 240" width="64" height="77">${fig(id)}</svg></div><div><b>${REG[id].name}</b> <small>${REG[id].race} · ${REG[id].role}</small><div class="ft">${featText(id).slice(0,3).join(' · ')}</div><div class="mm">${REG[id].memo.join(' ')}</div><div class="st">${s.gone?'사라짐':s.hurt?'앓는 중':'멀쩡'}${s.grudge?` · 원망 ${s.grudge}`:''} · 신발: ${SRG.shoes[REG[id].shoes]||REG[id].shoes}</div></div></div>`;}).join('')}</div>`;
  if(PAGE==='room')h+=`<h2>숙박부</h2>${ROOMS.map(r=>{const n=occOf(r);return `<div class="rrow"><b>${r}호</b><span>${n?n.name:'— 빈방 —'}</span><i>${DOORS[r].locked?'빗장 ':''}${DOORS[r].lampHung?'등불 ':''}${ROOMST[r].stain?'얼룩':''}</i></div>`;}).join('')}`;
  if(PAGE==='quest')h+=`<h2>의뢰</h2>${G.sent.length?`<h3>오늘 나간 파티</h3>${G.sent.map(p=>`<div class="rrow"><b>${p.req.fl}</b><span>${p.req.by} — ${p.mem.map(id=>REG[id].name).join(', ')}</span><i>예감 ${omen(p.risk)[0]}</i></div>`).join('')}`:'<p class="nobuy">오늘 나간 파티가 없다.</p>'}<h3>납품할 의뢰</h3>${G.pending.filter(q=>q.req.need&&!q.done).map(q=>`<div class="rrow"><b>${q.req.by}</b><span>${ITN[q.req.need]} ×${q.req.qty}</span><i>${q.req.reward}G</i></div>`).join('')||'<p class="nobuy">없다.</p>'}`;
  if(PAGE==='store'){const m=invAll();h+=`<h2>창고</h2><div class="regGrid">${Object.entries(m).map(([k,n])=>`<div class="rcard"><div class="ph">${itemIcon(k,56)}</div><div><b>${ITN[k]}</b> ×${n}<div class="mm">${ITEM[k]?(ITEM[k].kind==='ing'?'재료 (선반)':ITEM[k].kind==='dish'?'요리':ITEM[k].kind==='pot'?'물약':ITEM[k].kind==='oil'?'기름':''):''}</div></div></div>`).join('')||'<p class="nobuy">비었다.</p>'}</div>`;}
  if(PAGE==='memo')h+=`<h2>메모</h2><div class="by">— 아리의 수첩</div><ol class="notes">${P.notes.map(n=>`<li><small>${n.at}</small> <b>${n.w}</b> ${n.t}</li>`).join('')||'<li class="nobuy">알아낸 것이 여기 쌓인다.</li>'}</ol>`;
  openWin('book',h+'</div>',.25);$('win').querySelectorAll('[data-pg]').forEach(b=>b.onclick=()=>{PAGE=b.dataset.pg;renderBookWin();});
  $('win').querySelectorAll('[data-strike]').forEach(b=>b.onclick=()=>{const id=b.dataset.strike;if(G.struck.includes(id))G.struck=G.struck.filter(x=>x!==id);else{G.struck.push(id);note('수칙',`${id} 줄을 그었다.`);}sfx('flip');renderBookWin();});}
// 방 고르기 (창구 들이기·계산대 손님·식탁에서 방 바꾸기)
function roomPick(n,swap=false){const free=r=>!occOf(r)&&!ROOMST[r].stain;
  openWin('rooms',`<h2>${n.name} — ${swap?'어느 방으로 옮길까?':'어느 방 열쇠를 줄까?'}</h2><p class="nobuy">방은 복도를 따라 201-202-203 (북쪽), 204-205-206 (남쪽). 마주 보는 방도 옆방처럼 소리가 샌다.${swap?` 남은 바꾸기 ${G.limits.swaps}번.`:''}</p>
   <div class="roomRow">${ROOMS.map(r=>`<button class="room" data-r="${r}" ${free(r)?'':'disabled'}><b>${r}호</b><span>${occOf(r)?occOf(r).name:ROOMST[r].stain?'얼룩':'빈방'}</span></button>`).join('')}</div><button class="close" id="rpBack">뒤로</button>`,.25);
  $('win').querySelectorAll('.room').forEach(b=>b.onclick=()=>{if(swap)swapRoom(n,+b.dataset.r);else admitRet(n,+b.dataset.r);closeWin();relock();});$('rpBack').onclick=()=>{closeWin();relock();};}
// 열쇠 구멍: 든 기름에 따라 보이는 것이 다르다
function keyholeWin(r){const n=occOf(r),st=ROOMST[r];if(P.oil<4){sub('등불','기름이 모자라 열쇠 구멍 안이 안 보인다.');return;}P.oil-=4;spend(10);const oil=G.oilPick||'oil';
  let inner,t;const ro={bed:'empty',desk:'empty',mirror:'normal',candle:false,tint:OILS[oil].tint,grayStain:!!st.stain};
  if(!n){t=st.stain?'침대가 비어 있다. 벽에 잿빛 얼룩이 사람 모양으로 번져 있다.':'빈방이다.';inner=INNr(ro);}
  else if(n.fake){const F=ANOM[n.fake.fam];const K=F.patrol.keyhole;t=n.out||n.state==='gone'?K.out:(K[oil]||K.oil);ro.bed=n.out?'empty':'empty';inner=INNr(ro)+(n.out?'':`<g transform="translate(170 73) scale(.64)" ${oil==='oil_moss'?'filter="url(#kh_gray)"':''}>${fig(n.look,n.o,true)}</g>`);
    if(oil==='oil_red'&&n.fake.shape)inner+=`<path d="M300 120 l20 -40 l10 44 z M330 120 l14 -46 l14 46 z" fill="#4a0a0a" opacity=".85"/>`;}
  else if(n.guest){ro.bed='lump';ro.desk=n.guest==='merchant'?'food':'empty';ro.candle=n.guest==='merchant';inner=INNr(ro);t=GUEST[n.guest].lines.keyhole;}
  else{ro.bed='lump';inner=INNr(ro);const sick=n.hurt==='moss'&&!n.cured;t=`${n.name}이(가) 이불을 덮고 잔다.`+(sick?' 이불 위로 초록 가루가 피어오른다.':n.regId==='ren'?' 책상 위에 채집 목록.':'');
    if(sick)inner+=Array.from({length:14},(_,i)=>{const x=85+((i*37)%90),y0=205-((i*23)%30),d=(2.2+(i%5)*.5).toFixed(1);return `<circle cx="${x}" cy="${y0}" r="${1.4+(i%3)*.7}" fill="#a6d85a"><animate attributeName="cy" from="${y0}" to="${y0-55}" dur="${d}s" begin="-${(i*.37).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.9;0" dur="${d}s" begin="-${(i*.37).toFixed(2)}s" repeatCount="indefinite"/></circle>`;}).join('');}
  const tintCls=oil==='oil_moss'?'tint-moss':oil==='oil_red'?'tint-red':'';
  openWin('kh',`<div class="kh"><div class="kc ${tintCls}"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet"><defs><filter id="kh_gray"><feColorMatrix type="saturate" values="0.1"/></filter></defs>${inner}</svg></div><p>${josa(t)}</p><p class="nobuy">${OILS[oil].n}</p><button class="close" id="khc">눈을 뗀다</button></div>`,.25);note(`${r}호`,'열쇠 구멍: '+t);$('khc').onclick=()=>{closeWin();relock();};}
const INNr=o=>(window.INN_ART&&INN_ART.room)?INN_ART.room(o):'<rect width="400" height="300" fill="#2a1d14"/>';

// ───── 31_seat.js ─────
// ───────── 창구 v2: 창구 의자에 앉아 창살 너머를 본다 ─────────
const SEATPOS={x:22.3,z:9.4,y:1.34};let SEAT=null;const SEATM={x:.5,y:.5};
// 창살, 책상 위 소품, 창밖 역광과 먼지
const IRON=mat('#2b2927'),BRASS=mat('#b8904a'),REDB=mat('#8a2e24'),GRNB=mat('#3f6e44');
for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,1.22,6),IRON);b.position.set(24.1,1.6,8.8+i*.3);scene.add(b);}
box(24.08,1.9,8.62,24.12,1.93,10.18,IRON);box(24.08,1.3,8.62,24.12,1.33,10.18,IRON);
const deskCardTex=new THREE.CanvasTexture(Object.assign(document.createElement('canvas'),{width:256,height:340}));deskCardTex.colorSpace=THREE.SRGBColorSpace;
{const x=deskCardTex.image.getContext('2d');x.fillStyle='#eadfc6';x.fillRect(0,0,256,340);x.strokeStyle='#382c2b';x.lineWidth=6;x.strokeRect(3,3,250,334);x.fillStyle='#7a6b58';for(let i=0;i<9;i++)x.fillRect(20,40+i*28,150+((i*37)%70),6);deskCardTex.needsUpdate=true;}
const deskCard=new THREE.Mesh(new THREE.PlaneGeometry(.24,.32),new THREE.MeshLambertMaterial({map:deskCardTex}));deskCard.rotation.set(-Math.PI/2,0,Math.PI/2+.12);deskCard.position.set(23.25,1.056,9.0);scene.add(deskCard);
box(23.4,1.05,9.25,23.7,1.1,9.62,REDB);box(23.41,1.1,9.26,23.69,1.11,9.61,mat('#efe4c8'));                 // 장부
{const bell=new THREE.Mesh(new THREE.SphereGeometry(.07,10,6,0,Math.PI*2,0,Math.PI/2),BRASS);bell.position.set(23.55,1.05,8.78);scene.add(bell);
 const knob=new THREE.Mesh(new THREE.SphereGeometry(.018,6,4),BRASS);knob.position.set(23.55,1.13,8.78);scene.add(knob);}
[[23.12,9.95,GRNB],[23.12,10.18,REDB]].forEach(([x,z,m])=>{const base=new THREE.Mesh(new THREE.CylinderGeometry(.05,.055,.04,10),m);base.position.set(x,1.07,z);scene.add(base);
  const h=new THREE.Mesh(new THREE.CylinderGeometry(.02,.025,.12,8),mat('#6b4a30'));h.position.set(x,1.15,z);scene.add(h);const k=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),mat('#6b4a30'));k.position.set(x,1.22,z);scene.add(k);});
box(23.5,1.05,9.85,23.62,1.09,9.95,mat('#8a6040'));                                                          // 부절 반쪽
const backLight=new THREE.PointLight(0x9fb4d8,0,7,1.4);backLight.position.set(26.3,2.5,9.4);scene.add(backLight);
const lampSpot=new THREE.SpotLight(0xffd6a0,0,7,.16,.6,1.2);scene.add(lampSpot);scene.add(lampSpot.target);
const DUST=(()=>{const n=90,g=new THREE.BufferGeometry(),p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=24.3+Math.random()*2;p[i*3+1]=.9+Math.random()*1.8;p[i*3+2]=8.4+Math.random()*2;}
  g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.Points(g,new THREE.PointsMaterial({color:0xd8c8a8,size:.018,transparent:true,opacity:.55,depthWrite:false}));m.visible=false;scene.add(m);return m;})();
// 창구용 고해상도 얼굴
const HITEX={};
function hiTex(n){if(n.sprite){const pt=spritePortrait(n);if(pt){n.bust.material.map=pt;n.bust.material.needsUpdate=true;return;}}const key=n.look+JSON.stringify(n.o||{});if(!HITEX[key]){const c=document.createElement('canvas');c.width=600;c.height=720;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    const img=new Image();img.onload=()=>{c.getContext('2d').drawImage(img,0,0,600,720);t.needsUpdate=true;};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 200 240">${fig(n.look,n.o||{})}</svg>`);HITEX[key]=t;}
  n.bust.material.map=HITEX[key];n.bust.material.needsUpdate=true;}
function drawDeskCard(n){const c=deskCardTex.image,x=c.getContext('2d'),C0=C[n.look];x.fillStyle='#eadfc6';x.fillRect(0,0,256,340);x.strokeStyle='#382c2b';x.lineWidth=6;x.strokeRect(3,3,250,334);
  x.fillStyle='#382c2b';x.font='bold 30px sans-serif';x.fillText(C0.name,20,48);x.font='18px monospace';x.fillText('No. '+C0.no,20,78);x.fillStyle='#d9c7a0';x.fillRect(20,96,120,144);
  const img=new Image();img.onload=()=>{x.drawImage(img,20,96,120,144);deskCardTex.needsUpdate=true;};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240">${fig(n.look)}</svg>`);
  x.fillStyle='#7a6b58';for(let i=0;i<5;i++)x.fillRect(20,260+i*14,160+((i*37)%60),5);deskCardTex.needsUpdate=true;}
// 앉기와 일어나기
function winSeat(n){if(SEAT){if(SEAT.done)closeSeat();else return;}const q=camera.quaternion.clone();SEAT={n,t:0,from:{x:camera.position.x,y:camera.position.y,z:camera.position.z,q},q:new THREE.Quaternion(),asked:{},keys:false};
  WIN='seat';G.scale=.5;controls.unlock();document.body.classList.add('seat');DUST.visible=true;hiTex(n);n.doll.visible=false;if(n.sprite)n.sprite.holder.visible=false;n.bust.visible=!n.rig||!!n.sprite;drawDeskCard(n);if(!SHUT)shutterOpen(true);
  const sc=n.g.scale.x,top=n.y+1.6*sc;SEAT.pitch=Math.atan2(top-SEATPOS.y-.05,24.9-SEATPOS.x);
  renderSeat();tip('seat1','질문 칩은 <b>시간이 든다</b>. 카드와 다른 점, 말투, 부절을 맞춰 본다.');tip('seat2','<b>F</b>로 등불을 들고 얼굴 위로 마우스를 움직이면 돋보기(기름이 준다).');tip('seat3','판단이 서면 오른쪽 아래 <b>도장</b>. 수칙은 <b>Tab</b>.');}
function closeSeat(soft){if(!SEAT)return;const n=SEAT.n;camera.quaternion.copy(SEAT.from.q);camera.fov=70;camera.updateProjectionMatrix();
  P.x=SEATPOS.x-.15;P.z=SEATPOS.z;P.y=0;SEAT=null;WIN=null;G.scale=1;document.body.classList.remove('seat');DUST.visible=false;lampSpot.intensity=0;backLight.intensity=0;
  $('seat').hidden=true;$('loupe3').hidden=true;n.doll.visible=!n.sprite&&!n.rig;if(n.sprite)n.sprite.holder.visible=true;n.bust.visible=false;if(n.visible)setLook(n,n.look,n.o);if(soft)softUnlock();else{relock();$('lockHint').hidden=!!G.free?false:controls.isLocked;}}
function seatCam(dt){const S=SEAT;S.t=Math.min(1,S.t+dt/.6);const e=1-Math.pow(1-S.t,3);
  camera.position.set(S.from.x+(SEATPOS.x-S.from.x)*e,S.from.y+(SEATPOS.y-S.from.y)*e,S.from.z+(SEATPOS.z-S.from.z)*e);
  S.q.setFromEuler(new THREE.Euler(S.pitch+(.5-SEATM.y)*.12,-Math.PI/2+(.5-SEATM.x)*.36,0,'YXZ'));
  if(S.t<1)camera.quaternion.slerpQuaternions(S.from.q,S.q,e);else camera.quaternion.slerp(S.q,Math.min(1,dt*5));
  camera.fov+=(46-camera.fov)*Math.min(1,dt*5);camera.updateProjectionMatrix();
  const {night}=tod();backLight.intensity=.6+night*1.4;backLight.color.setHex(night>.5?0x9fb4d8:0xffd9a8);
  const pos=DUST.geometry.attributes.position;for(let i=0;i<pos.count;i++){let y=pos.getY(i)+dt*(.02+(i%5)*.01);if(y>2.7)y=.9;pos.setY(i,y);pos.setZ(i,pos.getZ(i)+Math.sin(FT*.7+i)*dt*.03);}pos.needsUpdate=true;
  if(!S.done&&(!S.n.visible||S.n.state!=='atwin')){closeSeat();return;}
  if(P.lamp&&P.oil>0){ray.setFromCamera({x:SEATM.x*2-1,y:-(SEATM.y*2-1)},camera);const pt=ray.ray.at(2.6,new THREE.Vector3());lampSpot.position.copy(camera.position);lampSpot.target.position.copy(pt);lampSpot.intensity=6;P.oil=Math.max(0,P.oil-dt*.5);}else lampSpot.intensity=0;}
// 가운데 UI
const QCHIP=[['ask','근황을 묻는다',10],['pw','암구호를 묻는다',5],['voice','목소리를 듣는다',5],['tally','부절을 맞댄다',2]];
function cardHTML(n){const c=C[n.look];return `<div class="reg3"><h3>단골 기록 카드 · 길드 보관</h3><div class="top"><div class="ph"><svg viewBox="0 0 200 240" width="104" height="125">${fig(n.look)}</svg></div><div><div class="nm">${c.name}</div><div class="rc">${c.race}</div><div class="cardRow"><span>번호</span><span class="no">${c.no}</span></div><div class="cardRow"><span>눈</span><span><i class="eyeSw" style="background:${c.eye}"></i>${c.eyeN}</span></div></div></div><div class="cardRow"><span>특징</span><span>${featText(n.look).map(x=>'· '+x).join('<br>')}</span></div><div class="memo">${c.memo.map(m=>'· '+m).join('<br>')}</div></div>`;}
function renderSeat(){const S=SEAT;if(S.tray){renderTray();return;}const n=S.n,R=n.ret,said=n.said||(n.said=[]);const q=RETN.filter(x=>x.state==='queue').length;const el=$('seat');el.hidden=false;
  el.innerHTML=`<div class="sTop"><b>${n.name}</b><span>귀환 창구${q?` · 뒤에 ${q}명`:''}</span><button id="sLeave">자리 뜨기 <kbd>S</kbd></button></div>
   <div class="sBub">${said.length?said[said.length-1]:R.hi}</div>
   <div class="sChips">${QCHIP.map(([k,t,m])=>`<button data-q="${k}" class="${S.asked[k]?'done':''}">${t}<small>+${m}분</small></button>`).join('')}</div>
   <div class="sLamp">${P.lamp?'등불을 들었다 — 얼굴 위로 마우스를 움직이면 돋보기':'<kbd>F</kbd> 등불을 들면 얼굴을 자세히 본다'}</div>
   <div class="sCard">${cardHTML(n)}</div>
   <div class="sStamp">${S.keys?`<div class="sKeys">${ROOMS.map(r=>{const ok=!OCC[r]&&!ROOMST[r].stain;return `<button data-r="${r}" ${ok?'':'disabled'}><b>${r}</b><small>${OCC[r]?OCC[r].name:ROOMST[r].stain?'얼룩':'빈방'}</small></button>`;}).join('')}<button data-r="0" class="kx">취소</button></div>`:''}
     <button class="st in" data-s="in"><i></i>들이기</button><button class="st out" data-s="out"><i></i>돌려보내기</button></div>`;
  $('sLeave').onclick=closeSeat;
  el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const k=b.dataset.q,m=QCHIP.find(x=>x[0]===k)[2];spend(m);S.asked[k]=1;const t={ask:R.ask,pw:R.pw,voice:R.voice,tally:R.tally}[k];said.push(t);note(n.name,t);sfx(k==='tally'?'wood':'flip');renderSeat();});
  el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{if(b.dataset.s==='in'){S.keys=!S.keys;renderSeat();return;}S.done=true;refuseRet(n);stampOut('out');});
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const r=+b.dataset.r;if(!r){S.keys=false;renderSeat();return;}S.done=true;admitRet(n,r);const c=n.case;if(c&&c.loot&&c.loot.length){S.tray=true;stampOut('in',true);setTimeout(renderTray,800);}else stampOut('in');});}
function stampOut(k,keep){const el=$('seat');el.querySelector('.sStamp').innerHTML=`<div class="stampMark ${k}">${k==='in'?'입관':'반려'}</div>`;sfx('stamp');if(!keep)setTimeout(closeSeat,750);}
// 전리품 트레이: 들인 사람이 내민 물건을 감정하고 산다
function renderTray(){const S=SEAT;if(!S)return;const n=S.n,c=n.case;const el=$('seat');const total=c.loot.reduce((a,x)=>a+(ITEM[x.k].buy||0),0),cut=Math.max(1,Math.round(total*.7));
  const items=c.loot.map((x,i)=>{const shown=x.k==='mush'&&x.spore&&!x.seen?'mush':x.k;const it=ITEM[shown];return `<div class="tItem ${x.seen&&(x.spore||it.cursed)?'bad':''}">${itemIcon(shown,52)}<b>${x.seen&&x.spore?'포자 버섯':it.n}</b><small>${it.buy||0}G${x.seen?(x.spore?' · 포자':it.cursed?' · 수상하다':' · 멀쩡'):''}</small></div>`;}).join('');
  el.innerHTML=`<div class="sTop"><b>${n.name}</b><span>전리품</span></div><div class="tray"><h3>${n.name}이(가) 내민 것</h3><div class="tItems">${items}</div>
   <p class="nobuy">${P.lamp?'등불로 감정했다.':'<kbd>F</kbd> 등불을 들면 감정할 수 있다 (기름 3).'} 가짜의 물건은 아침에 변한다. 깎으면 원망한다.</p>
   <div class="strow"><button data-t="appraise" ${P.lamp&&P.oil>=3&&!S.appraised?'':'disabled'}>감정한다 <small>기름 3</small></button><button class="primary" data-t="buy" ${G.money>=total?'':'disabled'}>제값에 산다 <small>${total}G</small></button><button data-t="cut" ${G.money>=cut?'':'disabled'}>깎는다 <small>${cut}G · 원망</small></button><button data-t="no">거절한다</button></div></div>`;
  el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{const t=b.dataset.t;
    if(t==='appraise'){P.oil-=3;S.appraised=true;c.loot.forEach(x=>x.seen=true);sfx('flip');renderBelt();renderTray();return;}
    if(t==='buy'||t==='cut'){const pay=t==='buy'?total:cut;money(-pay,'전리품 매입');c.loot.forEach(x=>{const k=x.spore&&x.k==='mush'?'spore':x.k;if(ITEM[k].kind==='ing'){G.shelf.push({k,seen:!!x.seen});}else addInv(k,1);});refreshShelf();
      if(t==='cut'&&!n.fake&&n.regId){grudge(n.regId);sub(n.name,'"…깎는다고?" 원망한다.',1);}else sub(n.name,n.fake?'"…고맙습니다, 손님."':(REG[n.regId]?REG[n.regId].lines.bye:'"고맙다."'),1);note('창구',`${n.name}의 전리품 ${c.loot.map(x=>ITN[x.k]).join(', ')}을(를) ${pay}G에 샀다.`);}
    else{sub(n.name,'"…그럼 됐다."');note('창구',`${n.name}의 전리품을 거절했다.`);}
    S.tray=false;closeSeat();});}
addEventListener('mousemove',e=>{if(!SEAT)return;SEATM.x=e.clientX/innerWidth;SEATM.y=e.clientY/innerHeight;seatLoupe(e.clientX,e.clientY);});
// 등불 돋보기: 얼굴 입간판의 화면 위치로 그림 좌표를 구한다
const _c=new THREE.Vector3(),_r=new THREE.Vector3(),_u=new THREE.Vector3();
function seatLoupe(mx,my){const L=$('loupe3');if(!SEAT||!P.lamp||P.oil<=0||$('seat').querySelector('.sKeys')){L.hidden=true;return;}const n=SEAT.n,s=n.g.scale.x;
  n.bust.getWorldPosition(_c);_r.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(.5*s).add(_c);_u.setFromMatrixColumn(camera.matrixWorld,1).multiplyScalar(.6*s).add(_c);
  const pr=v=>{const p=v.clone().project(camera);return[(p.x+1)/2*innerWidth,(1-p.y)/2*innerHeight];};const [cx,cy]=pr(_c),[rx]=pr(_r),[,uy]=pr(_u);
  const fx=100+(mx-cx)/(rx-cx)*100,fy=120+(my-cy)/(cy-uy)*120;if(fx<0||fx>200||fy<0||fy>240){L.hidden=true;return;}
  L.hidden=false;L.style.left=mx+'px';L.style.top=my+'px';L.innerHTML=`<svg viewBox="${fx-26} ${fy-26} 52 52" width="170" height="170">${fig(n.look,n.o||{})}</svg>${n.hurt==='moss'&&!n.cured?'<div class="spore"></div>':''}`;
  if(n.hurt==='moss'&&!n.cured&&!n.lampSeen&&fy>150){n.lampSeen=true;note(n.name,'등불 돋보기: 목덜미에 초록 가루.');}}

// ───── 32_stations.js ─────
// ───────── 작업대: 가까이 가면 이름표, 열면 오른쪽 종이 패널 ─────────
// 작업대를 더하려면 STATIONS에 항목 하나: {name,pos,r,card(),panel(),bind(el)}
let STN=null;
const stIcon=(k,w=34)=>itemIcon(k,w);
const invAll=()=>{const m={};G.shelf.forEach(u=>{const k=u.k==='spore'&&!u.seen?'mush':u.k;m[k]=(m[k]||0)+1;});Object.entries(G.inv).forEach(([k,n])=>m[k]=(m[k]||0)+n);return m;};
const marketOpen=()=>G.phase==='market'||G.phase==='send';
const STATIONS={
 shelf:{name:'재료 선반',pos:[2.9,1.75,.55],r:3.6,
  card:()=>{const m={};G.shelf.forEach(u=>{const k=u.k==='spore'&&!u.seen?'mush':u.k;m[k]=(m[k]||0)+1;});const s=Object.entries(m).map(([k,n])=>`${ITN[k]} ${n}`).join(' · ');return s||'비었다';},
  panel:()=>{const m={};G.shelf.forEach(u=>{const k=u.k==='spore'&&!u.seen?'mush':u.k;m[k]=(m[k]||0)+1;});
   return `<h2>재료 선반</h2><p class="stsum">${Object.entries(m).map(([k,n])=>`<span>${stIcon(k,22)}${ITN[k]} <b>${n}</b></span>`).join('')||'<span>비었다</span>'}</p>
    <p class="nobuy">상한 재료는 등불로 비춰야 보인다. 포자 버섯은 요리를 망친다.</p>
    <div class="slots">${SHELF_POS.map((_,i)=>{const u=G.shelf[i];if(!u)return `<button class="slot empty" disabled>빈 칸</button>`;const k=u.k==='spore'&&!u.seen?'mush':u.k;return `<button class="slot ${u.k==='spore'&&u.seen?'spore':''}" data-pick="${i}">${stIcon(k,40)}<b>${ITN[k]}</b>${u.k==='spore'&&u.seen?'<small>빼 둘 것</small>':'<small>집는다</small>'}</button>`;}).join('')}</div>
    ${G.shelf.length>6?`<p class="nobuy">창고에 재료 ${G.shelf.length-6}개 더 (빈 칸이 나면 올라온다)</p>`:''}
    <div class="strow">${P.held&&ITEM[P.held]&&ITEM[P.held].kind==='ing'?`<button data-put>들고 있는 ${ITN[P.held]} 올려놓기</button>`:''}<button data-shine ${P.oil<2?'disabled':''}>등불로 비춰 본다 <small>기름 2</small></button></div>`;},
  bind:el=>{el.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{pick(+b.dataset.pick);renderStation();});const p=el.querySelector('[data-put]');if(p)p.onclick=()=>{putBack();renderStation();};
   el.querySelector('[data-shine]').onclick=()=>{if(P.oil<2)return;P.oil-=2;let f=0;G.shelf.slice(0,6).forEach((u,i)=>{if(revealShelf(i))f++;});tutEvent('shine');sub('등불',f?`갓 아래에 초록 가루— 포자 버섯 ${f}개를 가려냈다.`:'멀쩡하다.',1);renderBelt();renderStation();};}},
 pot:{name:'가마솥',pos:[3.5,1.6,2.4],r:2.6,
  card:()=>{const S=POT;return S.state==='empty'?'비었다':S.state==='fill'?`${ITN[S.ing[0]]} — 하나 더`:S.state==='cook'?`끓는 중 ${Math.round(potProgress()*100)}%`:S.state==='ready'?`${ITN[S.spore?'fail':S.dish]} 완성 — 떠낼 것!`:'넘쳤다';},
  panel:()=>{const S=POT,pr=potProgress();const have=invAll();if(P.held)have[P.held==='mush_s'?'mush':P.held]=(have[P.held==='mush_s'?'mush':P.held]||0)+1;
   const st=S.state==='empty'?'비어 있다':S.state==='fill'?'재료를 하나 더 넣는다':S.state==='cook'?`끓는 중 — ${ITN[S.dish]||'?'}`:S.state==='ready'?(S.spore?'포자가 번졌다':`${ITN[S.dish]} 완성`):'넘쳤다';
   return `<div class="potGrid"><section><h2>솥 안</h2><div class="ingRow">${[0,1].map(i=>S.ing[i]?`<span class="ing">${stIcon(S.ing[i],34)}${ITN[S.ing[i]]}</span>`:'<span class="ing empty">—</span>').join('')}</div>
     <div class="stState ${S.state}">${st}</div>${S.state==='cook'||S.state==='ready'?`<div class="bar ${S.state}"><i style="width:${Math.round(pr*100)}%"></i></div><small>${S.state==='cook'?'끓을 때까지':'넘치기까지'} ${Math.max(0,Math.round(S.state==='cook'?((S.recipe?S.recipe.cook:20)-S.t):((S.recipe?S.recipe.hold:30)-S.t)))}초</small>`:''}
     <div class="strow">${P.held&&ITEM[P.held]&&(ITEM[P.held].kind==='ing'||ITEM[P.held].kind==='oil')&&(S.state==='empty'||S.state==='fill')?`<button data-put>${ITN[P.held]} 넣기</button>`:''}${(S.state==='ready'||S.state==='burnt')&&!P.held?`<button data-ladle>떠내기</button>`:''}${S.state!=='empty'?`<button data-empty class="warn">비우기</button>`:''}</div></section>
    <section><h2>레시피북</h2><div class="rcps">${RECIPES.map(r=>{const ok=k=>(have[k]||0)>0;const out=ITEM[r.out];return `<div class="rcp"><span class="ing ${ok(r.a)?'':'no'}">${stIcon(r.a,26)}${ITN[r.a]}</span> + <span class="ing ${ok(r.b)?'':'no'}">${stIcon(r.b,26)}${ITN[r.b]}</span> → <b>${stIcon(r.out,26)}${out.n}</b><small>${r.note}</small></div>`;}).join('')}</div><p class="nobuy">없는 조합은 실패작. 포자 버섯이 들어가면 무엇이든 망친다.</p></section></div>`;},
  bind:el=>{const q=s=>el.querySelector(s);if(q('[data-put]'))q('[data-put]').onclick=()=>{potHand();renderStation();};if(q('[data-ladle]'))q('[data-ladle]').onclick=()=>{potHand();renderStation();};if(q('[data-empty]'))q('[data-empty]').onclick=()=>{potEmpty();renderStation();};},
  live:true},
 board:{name:'의뢰 게시판',pos:[7.2,1.8,11.8],r:2.8,
  card:()=>G.sent.length?`파티 ${G.sent.length} 미궁에 · 저녁에 돌아온다`:(G.phase==='send'||G.phase==='market')?'오늘 의뢰 3장 — 11시까지':'내일 아침 9시에 보낸다',
  panel:()=>boardPanel(),bind:el=>boardBind(el)},
 desk:{name:'계산대',pos:[6.2,1.1,9.9],r:2.6,
  card:()=>{const w=NPCS.find(n=>n.state==='atdesk');if(w)return `${w.name}이(가) 기다린다`;if(marketOpen())return `장사 — 도라${G.day>=2?'·에녹':''}`;if(G.phase==='noon'||(G.phase==='send'&&G.sent.length))return '오후까지 쉴 수 있다';return `${G.money}G`;},
  panel:()=>deskPanel(),bind:el=>deskBind(el)},
 chest:{name:'창고 궤짝',pos:[.9,.6,6.3],r:2.2,
  card:()=>{const e=Object.entries(G.inv);return e.length?e.map(([k,n])=>`${ITN[k]} ${n}`).join(' · '):'비었다';},
  panel:()=>{const e=Object.entries(G.inv);return `<h2>창고 궤짝</h2><p class="nobuy">요리·물약·기름·전리품. 재료는 부엌 선반에.</p><div class="slots">${e.length?e.map(([k,n])=>`<button class="slot" data-take="${k}" ${P.held?'disabled':''}>${stIcon(k,40)}<b>${ITN[k]}</b><small>×${n} · 꺼낸다</small></button>`).join(''):'<span class="nobuy">비었다</span>'}</div>
    <div class="strow">${P.held?`<button data-put>들고 있는 ${ITN[P.held]} 넣기</button>`:''}</div>
    <h3>등불 기름</h3><div class="oilRow">${Object.keys(OILS).map(k=>`<button class="oilb ${G.oilPick===k?'on':''}" data-oil="${k}" ${k==='oil'||inv(k)?'':'disabled'}>${stIcon(k,26)}${OILS[k].n}${k!=='oil'?` <small>×${inv(k)}</small>`:''}</button>`).join('')}</div><p class="nobuy">오늘 밤 등불에 넣을 기름. 층의 기름은 그 층의 이상을 드러낸다. 밤에 쓰면 한 병이 준다.</p>`;},
  bind:el=>{el.querySelectorAll('[data-take]').forEach(b=>b.onclick=()=>{const k=b.dataset.take;if(P.held)return;addInv(k,-1);P.held=k;renderBelt();sfx('flip');renderStation();});const p=el.querySelector('[data-put]');if(p)p.onclick=()=>{const k=P.held;if(ITEM[k].kind==='ing'){sub('창고','재료는 부엌 선반에.');return;}addInv(k==='mush_s'?'spore':k,1);P.held=null;renderBelt();renderStation();};
   el.querySelectorAll('[data-oil]').forEach(b=>b.onclick=()=>{G.oilPick=b.dataset.oil;sub('등불',`오늘 밤은 ${OILS[G.oilPick].n}.`);renderStation();renderBelt();});}},
 keys:{name:'열쇠판',pos:[23.85,1.9,7.85],r:2.4,
  card:()=>`빈방 ${ROOMS.filter(r=>!occOf(r)&&!ROOMST[r].stain).length} · 얼룩 ${G.stained.length}`,
  panel:()=>`<h2>열쇠판 — 숙박부</h2><div class="roomGrid">${ROOMS.map(r=>{const n=occOf(r);return `<div class="rm ${n?'occ':''} ${ROOMST[r].stain?'stain':''}"><b>${r}호</b><span>${n?n.name:ROOMST[r].stain?'얼룩 (수선 전 못 씀)':'빈방'}</span><i>${DOORS[r].locked?'빗장 ':''}${DOORS[r].lampHung?'등불 ':''}${n&&n.hurt&&!n.cured?'앓음':''}</i></div>`;}).join('')}</div><p class="nobuy">201-202-203은 북쪽, 204-205-206은 남쪽. 마주 보는 방도 옆방처럼 소리가 샌다. 얼룩진 방은 계산대에서 수선한다.</p>`,
  bind:()=>{}},
};
// 게시판
const SEND={parties:[],ready:false};
function boardPanel(){const qs=todayQuests(),open=SRG.openFloors?SRG.openFloors[Math.min(G.day-1,SRG.openFloors.length-1)]:null;const can=(G.phase==='send'||G.phase==='market')&&!G.sent.length;
  if(!SEND.parties.length)SEND.parties=qs.map(q=>({req:q,mem:[],lunch:false,recall:false,on:false}));
  const used=SEND.parties.flatMap(p=>p.mem);
  const roster=REG_IDS.map(id=>{const r=REG[id],s=G.regs[id];const st=s.gone?'사라짐':s.hurt?`앓음 (파견 불가)${inv('heal')?` <button data-cure="${id}">치료약</button>`:''}`:used.includes(id)?'배정됨':'대기';return `<div class="rost ${s.gone||s.hurt?'off':''}"><svg viewBox="0 0 200 240" width="34" height="41">${fig(id)}</svg><div><b>${r.name}</b> <small>${r.role}</small><br><small>B1 ${'●'.repeat(Math.max(0,r.apt.B1+1))}${'○'.repeat(2-Math.max(0,r.apt.B1+1))} B2 ${'●'.repeat(Math.max(0,r.apt.B2+1))}${'○'.repeat(2-Math.max(0,r.apt.B2+1))} · ${st}${s.grudge?` · 원망 ${s.grudge}`:''}</small></div></div>`;}).join('');
  if(G.sent.length)return `<h2>의뢰 게시판 — ${G.day}일째</h2><p class="nobuy">오늘 보낸 파티. 저녁 창구로 돌아온다. 부절 반쪽이 곧 명단이다.</p>${G.sent.map(p=>`<div class="qcard sent"><div class="qh"><span class="fl ${p.req.fl}">${p.req.fl}</span> <b>${p.req.by}</b> 의뢰 — ${p.req.t}</div><div>${p.mem.map(id=>REG[id].name).join(', ')} · 귀환 예감 <b class="om ${p.omen}">${omen(p.risk)[0]}</b>${p.lunch?' · 도시락':''}${p.recall?' · 귀환 물약':''}</div></div>`).join('')}<h3>단골</h3><div class="roster">${roster}</div>`;
  return `<h2>의뢰 게시판 — ${G.day}일째</h2><p class="nobuy">${can?'의뢰를 켜고 사람을 붙인다. 층마다 파티 하나, 한두 명. 11시 전에 보낸다.':G.phase==='noon'||G.phase==='evening'||G.phase==='dinner'||G.night?'보내는 시간이 지났다. 내일 아침 9시.':'아침 9시부터 11시 사이에 보낸다.'}</p>
   <div class="qlist">${SEND.parties.map((p,pi)=>{const q=p.req,closed=open&&!open.includes(q.fl);const r=partyRisk(q,p.mem,p),[ol,oc]=omen(r);
    const slot=si=>{const cur=p.mem[si]||'';return `<select data-p="${pi}" data-s="${si}" ${!p.on||!can?'disabled':''}><option value="">— 비움 —</option>${REG_IDS.filter(id=>canSend(id)&&(id===cur||!used.includes(id))).map(id=>`<option value="${id}" ${id===cur?'selected':''}>${REG[id].name} (${REG[id].role}, ${q.fl} ${['×','△','○'][REG[id].apt[q.fl]+1]})</option>`).join('')}</select>`;};
    return `<div class="qcard ${p.on?'on':''} ${closed?'closed':''}"><label class="qh"><input type="checkbox" data-on="${pi}" ${p.on?'checked':''} ${!can||closed?'disabled':''}><span class="fl ${q.fl}">${q.fl}</span> <b>${q.by}</b> — ${q.t}<small>${q.need?`${ITN[q.need]} ×${q.qty} 납품 → `:'조사 → '}${q.reward}G${q.risky?' · <em>위험</em>':''}${q.enoch?' · <em>실 −2</em>':''}${closed?' · 아직 닫힌 층':''}</small></label>
      ${p.on?`<div class="pty">${slot(0)}${slot(1)}<label><input type="checkbox" data-lunch="${pi}" ${p.lunch?'checked':''} ${inv('lunch')-SEND.parties.filter((x,i)=>x.lunch&&i!==pi).length<=0&&!p.lunch||!can?'disabled':''}> 도시락 <small>(${inv('lunch')})</small></label><label><input type="checkbox" data-recall="${pi}" ${p.recall?'checked':''} ${inv('recall')-SEND.parties.filter((x,i)=>x.recall&&i!==pi).length<=0&&!p.recall||!can?'disabled':''}> 귀환 물약 <small>(${inv('recall')})</small></label><div class="omen ${oc}">귀환 예감: <b>${ol}</b></div></div>`:''}</div>`;}).join('')}</div>
   <div class="strow"><button class="primary" data-go ${!can||!SEND.parties.some(p=>p.on&&p.mem.length)?'disabled':''}>부절을 쪼개 주고 보낸다</button></div>
   <h3>단골</h3><div class="roster">${roster}</div>`;}
function boardBind(el){el.querySelectorAll('[data-cure]').forEach(b=>b.onclick=()=>{const id=b.dataset.cure;if(!inv('heal'))return;addInv('heal',-1);G.regs[id].hurt=null;sub('게시판',`${REG[id].name}에게 치료약을 보냈다. 내일부터 다시 보낼 수 있다.`,1);renderStation();});el.querySelectorAll('[data-on]').forEach(b=>b.onchange=()=>{const p=SEND.parties[+b.dataset.on];p.on=b.checked;if(!p.on)p.mem=[];renderStation();});
  el.querySelectorAll('select[data-p]').forEach(s=>s.onchange=()=>{const p=SEND.parties[+s.dataset.p],si=+s.dataset.s;p.mem[si]=s.value||undefined;p.mem=p.mem.filter(Boolean);renderStation();});
  el.querySelectorAll('[data-lunch]').forEach(b=>b.onchange=()=>{SEND.parties[+b.dataset.lunch].lunch=b.checked;renderStation();});
  el.querySelectorAll('[data-recall]').forEach(b=>b.onchange=()=>{SEND.parties[+b.dataset.recall].recall=b.checked;renderStation();});
  const go=el.querySelector('[data-go]');if(go)go.onclick=()=>{const ps=SEND.parties.filter(p=>p.on&&p.mem.length);dispatch(ps);sfx('wood');tutEvent('send');
    const names=ps.flatMap(p=>p.mem.map(id=>REG[id].name));sub('게시판',`${names.join(', ')}에게 부절 반쪽을 주고 보냈다. 저녁에 돌아온다.`,1);note('보내기',ps.map(p=>`${p.req.fl} ${p.mem.map(id=>REG[id].name).join('·')} (${omen(partyRisk(p.req,p.mem,p))[0]})`).join(' / '));
    ps.forEach(p=>p.mem.forEach(id=>{const n=ACTOR[id];n.visible=true;placeNPC(n,5.8,11.2);n.state='walk';walk(n,[[4.2,11.6],[4,14],[4,17]],m=>{m.visible=false;m.state='gone';});}));
    SEND.parties=[];renderStation();};}
// 계산대
let DESKTAB='trade';
function deskPanel(){const tabs=[['trade','장사'],['book','숙박부'],['time','시간']].map(([k,n])=>`<button class="tab ${DESKTAB===k?'on':''}" data-tab="${k}">${n}</button>`).join('');let body='';
  if(DESKTAB==='trade'){const open=marketOpen(),en=open&&G.day>=2;const have=invAll();const rows=Object.entries(have).filter(([k])=>ITEM[k]&&(ITEM[k].sell||ITEM[k].enoch)).map(([k,n])=>`<div class="trow">${stIcon(k,26)}<b>${ITN[k]}</b><small>×${n}</small>${ITEM[k].sell?`<button data-sell="${k}" ${open?'':'disabled'}>도라 ${ITEM[k].sell}G</button>`:''}${ITEM[k].enoch?`<button class="warn" data-enoch="${k}" ${en?'':'disabled'}>에녹 ${ITEM[k].enoch}G <small>실 −2</small></button>`:''}</div>`).join('');
   const pend=G.pending.filter(q=>q.req.need&&!q.done).map((q,i)=>`<div class="trow"><b>${q.req.by}</b> ${ITN[q.req.need]} ×${q.req.qty} → ${q.req.reward}G${q.req.enoch?' <small class="bad">실 −2</small>':''}<button data-deliver="${i}" ${(have[q.req.need]||0)>=q.req.qty?'':'disabled'}>납품</button></div>`).join('');
   body=`<p class="nobuy">${open?`도라가 있다${G.day>=2?'. 에녹도 (파편을 비싸게 사지만 실이 찢긴다)':''}.`:'장사는 아침 7시~11시. 지금은 아무도 없다.'}</p><h3>판다</h3>${rows||'<p class="nobuy">팔 것이 없다.</p>'}
    <h3>산다</h3><div class="trow">${stIcon('oil',26)}<b>등불 기름</b><button data-buy="oil" ${open&&G.money>=ITEM.oil.price?'':'disabled'}>${ITEM.oil.price}G</button>${stIcon('bread',26)}<b>빵</b><button data-buy="bread" ${open&&G.money>=ITEM.bread.price?'':'disabled'}>${ITEM.bread.price}G</button></div>
    <h3>의뢰 납품</h3>${pend||'<p class="nobuy">납품할 의뢰가 없다.</p>'}
    <h3>수선</h3>${G.stained.length?G.stained.map(r=>`<div class="trow"><b>${r}호 얼룩</b><button data-repair="${r}" ${G.money>=CAMP.fees.repair?'':'disabled'}>${CAMP.fees.repair}G</button></div>`).join(''):'<p class="nobuy">얼룩진 방이 없다.</p>'}`;}
  if(DESKTAB==='book')body=STATIONS.keys.panel();
  if(DESKTAB==='time'){const canSkip=(G.phase==='noon'||((G.phase==='send'||G.phase==='market')&&G.sent.length))&&!NPCS.some(n=>n.state==='atdesk');body=`<p>${G.day}일째 ${hhmm(G.t)}</p><p class="nobuy">${canSkip?'할 일이 없으면 오후까지 쉰다. 4시 반에 창구를 연다.':G.phase==='send'&&!G.sent.length?'먼저 게시판에서 파티를 보낸다.':'지금은 건너뛸 수 없다.'}</p><div class="strow"><button class="primary" data-skip ${canSkip?'':'disabled'}>오후까지 쉰다</button></div>`;}
  return `<h2>계산대</h2><div class="tabs">${tabs}</div>${body}`;}
function deskBind(el){el.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{DESKTAB=b.dataset.tab;renderStation();});
  const take=(k,n=1)=>{if(ITEM[k].kind==='ing'){for(let i=0;i<n;i++){let j=G.shelf.findIndex(u=>u.k===k);if(j<0&&k==='mush')j=G.shelf.findIndex(u=>u.k==='spore'&&!u.seen);if(j>=0)G.shelf.splice(j,1);}refreshShelf();}else addInv(k,-n);};
  el.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{const k=b.dataset.sell;take(k);money(ITEM[k].sell,'도라에게 판매');sub('도라',`"${ITN[k]}? ${ITEM[k].sell}G."`);renderStation();});
  el.querySelectorAll('[data-enoch]').forEach(b=>b.onclick=()=>{const k=b.dataset.enoch;take(k);money(ITEM[k].enoch,'에녹에게 판매');thread(CAMP.thread.enoch,'에녹에게 파편을 넘김');G.log.enoch++;sub('에녹',`"고맙습니다. 아주 귀한 것이지요." 실이 조금 풀리는 느낌.`,1);renderStation();});
  el.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const k=b.dataset.buy;if(G.money<ITEM[k].price)return;money(-ITEM[k].price);addInv(k,1);refreshShelf();sub('도라',`${ITN[k]}을(를) 샀다.`);renderStation();});
  el.querySelectorAll('[data-deliver]').forEach(b=>b.onclick=()=>{const q=G.pending.filter(x=>x.req.need&&!x.done)[+b.dataset.deliver];take(q.req.need,q.req.qty);money(q.req.reward,q.req.by+' 의뢰 보상');q.done=true;G.log.delivered.push(q.req.id);if(q.req.enoch){thread(CAMP.thread.enoch,'에녹 의뢰');G.log.enoch++;}sub(q.req.by,`"고맙다." ${q.req.reward}G를 받았다.`,1);renderStation();});
  el.querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{const r=+b.dataset.repair;if(G.money<CAMP.fees.repair)return;money(-CAMP.fees.repair,'수선');G.stained=G.stained.filter(x=>x!==r);ROOMST[r].stain=false;sub('계산대',`${r}호를 수선했다.`);renderStation();});
  const sk=el.querySelector('[data-skip]');if(sk)sk.onclick=()=>{skipTo(phAt(CAMP.timeline.find(p=>p.id==='evening'))-1);closeStation();};}
function skipTo(dmTarget){const cur=dm();if(dmTarget<=cur)return;$('black').classList.add('on');setTimeout(()=>{G.t+=dmTarget-cur;$('black').classList.remove('on');sub('여관','오후가 지나갔다. 창구를 열 시간이다.');},700);}
// 틀
let STCARD='';
function stationTick(){if(!G.started||G.over||WIN||SEAT){$('stcard').hidden=true;return;}const f=new THREE.Vector3();camera.getWorldDirection(f);let best=null,bd=9;
  Object.entries(STATIONS).forEach(([id,s])=>{const [x,y,z]=s.pos;const dx=x-P.x,dz=z-P.z,d=Math.hypot(dx,dz);if(d>s.r||Math.abs((y>2.9?3:0)-P.y)>1)return;const dot=(f.x*dx+f.z*dz)/(d*Math.hypot(f.x,f.z)+1e-6);if(dot<.45)return;if(d<bd){bd=d;best=id;}});
  const el=$('stcard');if(!best){el.hidden=true;STCARD='';return;}const s=STATIONS[best];MV.set(...s.pos);MV.project(camera);if(MV.z>1){el.hidden=true;return;}
  el.hidden=false;el.style.left=((MV.x+1)/2*innerWidth)+'px';el.style.top=((1-MV.y)/2*innerHeight-70)+'px';const h=`<b>${s.name}</b><span>${josa(s.card())}</span><kbd>E</kbd> 열기`;if(h!==STCARD){STCARD=h;el.innerHTML=h;}G.nearStation=best;}
function openStation(id){if(!STATIONS[id])return;STN=id;WIN='station';G.scale=.5;controls.unlock();document.body.classList.add('station');$('stpanel').hidden=false;$('stcard').hidden=true;renderStation();tip('station');}
function renderStation(){if(!STN)return;const s=STATIONS[STN];const el=$('stpanel');el.innerHTML=`<div class="stHead"><span>${s.name}</span><button id="stClose">닫기 <kbd>ESC</kbd></button></div><div class="stBody">${s.panel()}</div>`;s.bind(el);$('stClose').onclick=closeStation;}
function closeStation(soft){if(!STN)return;STN=null;WIN=null;G.scale=1;document.body.classList.remove('station');$('stpanel').hidden=true;if(soft)softUnlock();else relock();}
let STLIVE=0;function stationLive(dt){if(!STN)return;const s=STATIONS[STN];if(!s.live)return;STLIVE+=dt;if(STLIVE>.5){STLIVE=0;const b=$('stpanel').querySelector('.bar i'),sm=$('stpanel').querySelector('.stState');if(b)b.style.width=Math.round(potProgress()*100)+'%';if(POT.state!==(sm&&sm.className.split(' ')[1]))renderStation();}}

// ───── 33_spots.js ─────
// ───────── 서는 자리(스팟) 이동: 걷지 않고 자리 사이를 옮긴다. 자리에서 마우스로 둘러본다(각도 제한) ─────────
// data/spots.js 가 자리·링크·지도 평면을 준다. ?walk 면 옛 WASD 이동으로 돌아간다.
const SPD=D.spots||null;
const SPOTS={on:!!SPD&&!QF.has('walk'),cur:null,by:{},travel:false,viewFloor:1,navHtml:'',mapHtml:''};
if(SPD)SPD.list.forEach(s=>{SPOTS.by[s.id]=s;});
const spotOf=id=>SPOTS.by[id]||null;
function spotCur(){return SPOTS.cur?SPOTS.by[SPOTS.cur]:null;}
// 인접 그래프에서 hop 수 (BFS)
const linkId=l=>typeof l==='string'?l:l.id;
function spotHops(a,b){if(a===b)return 0;const seen={[a]:0};const q=[a];while(q.length){const c=q.shift();for(const n of (spotOf(c).links||[]).map(linkId)){if(seen[n]!==undefined)continue;seen[n]=seen[c]+1;if(n===b)return seen[n];q.push(n);}}return 99;}
function spotYaw(){return new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ').y;}
function wrapA(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
// 자리 옮기기: 짧게 어두워졌다 밝아진다. 인접이 아니면 hop 수만큼 시간이 든다
function goSpot(id,opt={}){const s=spotOf(id);if(!s||!SPOTS.on)return false;const from=SPOTS.cur;if(from===id&&!opt.instant)return false;
  const hops=from?spotHops(from,id):0;const place=()=>{SPOTS.cur=id;P.x=s.x;P.z=s.z;P.y=s.y;camera.position.set(P.x,P.y+P.eye,P.z);
    const keepYaw=opt.keepYaw&&from;if(!keepYaw)camera.rotation.set(s.pitch||0,s.yaw,0,'YXZ');SPOTS.viewFloor=s.floor;SPOTS.mapHtml='';if(hops>0)spend(SPD.HOP_MIN*hops);sfx('step');if(typeof AR!=='undefined'){AR.cool=Math.max(AR.cool,3);AR.acc=AR.n=AR.t=0;}   // 옮긴 직후 프레임 튐으로 해상도가 내려가지 않게};
  if(opt.instant){place();return true;}
  if(SPOTS.travel)return false;SPOTS.travel=true;const b=$('black');b.style.transition='opacity .22s';b.classList.add('on');
  setTimeout(()=>{place();setTimeout(()=>{b.classList.remove('on');setTimeout(()=>{b.style.transition='';SPOTS.travel=false;},260);},60);},230);return true;}
// 링크를 현재 시선 기준 방향(앞·왼·오른·뒤)으로 나눈다
function spotDirs(){const s=spotCur();if(!s)return {};const yaw=spotYaw();const out={};const fixed=(s.links||[]).filter(l=>typeof l!=='string'&&l.dir);fixed.forEach(l=>{out[l.dir]=l.id;});
  (s.links||[]).forEach(l=>{if(typeof l!=='string'&&l.dir)return;const id=linkId(l);const t=spotOf(id);if(!t)return;let a=wrapA(Math.atan2(-(t.x-s.x),-(t.z-s.z))-yaw);
    const k=Math.abs(a)<.7?'f':Math.abs(a)>2.45?'b':a>0?'l':'r';if(!out[k])out[k]=id;});return out;}
function spotKey(code){if(!SPOTS.on||SPOTS.travel||!spotCur())return false;const m={ArrowUp:'f',KeyW:'f',ArrowDown:'b',KeyS:'b',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r'}[code];if(!m)return false;const d=spotDirs();if(d[m]){goSpot(d[m]);return true;}return false;}
// 매 프레임: 시선 각도 제한, 화살표·지도 갱신
function spotTick(){if(!SPOTS.on||!G.started)return;const s=spotCur();if(!s)return;
  const away=Math.hypot(P.x-s.x,P.z-s.z)>.05;   // 디버그 텔레포트(tp)로 자리를 벗어났으면 각도 제한 없음
  if(!SEAT&&!SPOTS.travel&&!away){const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');const yr=s.yawRange===undefined?1.3:s.yawRange,pr=s.pitchRange===undefined?.62:s.pitchRange;let ch=false;
    if(yr<Math.PI-.01){const rel=wrapA(e.y-s.yaw);const c=Math.max(-yr,Math.min(yr,rel));if(c!==rel){e.y=s.yaw+c;ch=true;}}
    const px=Math.max(-pr,Math.min(pr,e.x));if(px!==e.x){e.x=px;ch=true;}if(ch)camera.quaternion.setFromEuler(e);}
  ray.far=s.reach||4.2;
  // 화살표
  const d=spotDirs();const lab={f:'▲',b:'▼',l:'◀',r:'▶'};const hide=WIN||SEAT||STN||!$('pause').hidden;
  const nh=hide?'':['l','f','r','b'].filter(k=>d[k]).map(k=>`<div class="nav ${k}" data-go="${d[k]}">${k==='r'?'':lab[k]+' '}${spotOf(d[k]).name}${k==='r'?' '+lab[k]:''}${spotOf(d[k]).floor!==s.floor?'<small>'+(spotOf(d[k]).floor===2?'↑ 2층':'↓ 1층')+'</small>':''}</div>`).join('');
  if(nh!==SPOTS.navHtml){SPOTS.navHtml=nh;$('nav').innerHTML=nh;$('nav').querySelectorAll('[data-go]').forEach(b=>b.onmousedown=e=>{e.stopPropagation();goSpot(b.dataset.go);});}
  spotMap();}
// 지도: 현재 층 평면 + 자리. 현재 = 금색, 목표 = 맥동, 나머지 = 클릭해서 이동
const MAPW=228,MAPH=118,MSX=MAPW/24.6,MSZ=MAPH/15.6;
const mx=x=>(x*MSX).toFixed(1),mz=z=>(z*MSZ).toFixed(1);
function objSpot(){const o=G.obj;if(!o||!o.pos)return null;const fl=o.pos[1]>2.9?2:1;let best=null,bd=1e9;SPD.list.forEach(s=>{if(s.floor!==fl)return;const d=Math.hypot(s.x-o.pos[0],s.z-o.pos[2]);if(d<bd){bd=d;best=s.id;}});return best;}
function spotMap(){const s=spotCur();if(!s)return;const fl=SPOTS.viewFloor,tgt=objSpot();const people=NPCS.filter(n=>n.visible&&n.state!=='gone'&&(n.y>1.5?2:1)===fl&&n.x>=0&&n.x<=24&&n.z>=0&&n.z<=12).map(n=>[n.x,n.z]);
  const key=fl+'|'+s.id+'|'+tgt+'|'+people.map(p=>p[0].toFixed(0)+','+p[1].toFixed(0)).join(';');if(key===SPOTS.mapHtml)return;SPOTS.mapHtml=key;
  const plan=(SPD.plan[fl]||[]).map(r=>`<rect x="${mx(r.r[0])}" y="${mz(r.r[1])}" width="${mx(r.r[2]-r.r[0])}" height="${mz(r.r[3]-r.r[1])}" class="rm${r.s?' st':''}${r.o?' out':''}"/>${r.n?`<text x="${mx((r.r[0]+r.r[2])/2)}" y="${(+mz((r.r[1]+r.r[3])/2)+3.5).toFixed(1)}">${r.n}</text>`:''}`).join('');
  const links=[];SPD.list.forEach(a=>(a.links||[]).map(linkId).forEach(b=>{const t=spotOf(b);if(a.id<b&&a.floor===fl&&t.floor===fl)links.push(`<line x1="${mx(a.x)}" y1="${mz(a.z)}" x2="${mx(t.x)}" y2="${mz(t.z)}"/>`);}));
  const dots=SPD.list.filter(x=>x.floor===fl).map(x=>`<g class="sp${x.id===s.id?' cur':''}${x.id===tgt?' tgt':''}" data-go="${x.id}"><circle cx="${mx(x.x)}" cy="${mz(x.z)}" r="${x.id===s.id?5:4}"/><title>${x.name}</title></g>`).join('');
  const ppl=people.map(([x,z])=>`<circle class="npc" cx="${mx(x)}" cy="${mz(z)}" r="2"/>`).join('');
  const stairsUp=fl===1?`<text class="hint" x="${mx(20)}" y="${mz(4.4)}">▲ 2층</text>`:`<text class="hint" x="${mx(20)}" y="${mz(4.4)}">▼ 1층</text>`;
  const html=`<div class="mapHead"><b>${fl}층</b><span>${s.name}</span><button data-fl="1" class="${fl===1?'on':''}">1</button><button data-fl="2" class="${fl===2?'on':''}">2</button></div><svg viewBox="0 0 ${MAPW} ${MAPH}" width="${MAPW}" height="${MAPH}">${plan}<g class="lk">${links}</g>${ppl}${dots}${stairsUp}</svg>`;
  const el=$('map');el.innerHTML=html;el.querySelectorAll('[data-go]').forEach(g=>g.onmousedown=e=>{e.stopPropagation();const id=g.dataset.go;if(id!==SPOTS.cur)goSpot(id);});el.querySelectorAll('[data-fl]').forEach(b=>b.onmousedown=e=>{e.stopPropagation();SPOTS.viewFloor=+b.dataset.fl;SPOTS.mapHtml='';});}

// ───── 40_state.js ─────
// ───────── 게임 상태 (여러 날) ─────────
// 시간: G.t = 1일째 00:00부터 흐른 분. 게임의 하루는 06:00에 시작한다(dm = 그날 06:00부터 흐른 분).
const DAY0=6*60;
const OCC={};const ROOMST={};ROOMS.forEach(r=>ROOMST[r]={stain:false,moss:0});   // 방별 투숙자·상태
const G={t:0,day:1,speed:60/CAMP.HOUR_SEC,scale:1,started:false,over:false,fired:{},phase:'',shake:0,mouse:false,danger:0,
  dinner:false,served:null,lightsOut:false,night:false,morning:false,free:false,tutSlow:false,
  money:CAMP.MONEY0,thread:CAMP.THREAD0,inv:{},shelf:[],regs:{},stained:[],struck:[],rulesKnown:[],oilPick:'oil',
  sent:[],pending:[],cases:[],guestsToday:[],knock3:false,limits:{},
  log:{},days:[]};
function dm(){return ((G.t-DAY0)%1440+1440)%1440;}          // 그날 06:00부터 흐른 분
const atMin=h=>((h*60-DAY0)%1440+1440)%1440;               // 시각(시) → dm
const phAt=ph=>((ph.at-DAY0)%1440+1440)%1440;              // 시간표의 시각(분) → dm
function newLog(){return{admit:[],refuse:[],refusedReal:[],missing:[],spread:0,killed:[],barred:[],fled:[],lured:false,woke:0,late:[],evicted:false,enoch:0,cursed:[],served:null,delivered:[],notes:[]};}
function freshState(){if(SPOTS.on)goSpot(SPD.START,{instant:true});G.t=(CAMP.START.day-1)*1440+CAMP.START.min;G.day=CAMP.START.day;G.fired={};G.money=CAMP.MONEY0;G.thread=CAMP.THREAD0;
  G.inv={};Object.entries(CAMP.INV0).forEach(([k,n])=>{if(ITEM[k].kind==='ing')for(let i=0;i<n;i++)G.shelf.push({k,seen:false});else G.inv[k]=n;});
  G.shelf=CAMP.SHELF0.map(k=>({k,seen:false})).concat(G.shelf);
  G.regs={};REG_IDS.forEach(id=>G.regs[id]={grudge:0,hurt:null,gone:null,cured:false});
  G.stained=[];G.struck=[];G.rulesKnown=RULES.filter(r=>!r.day||r.day<=1).map(r=>r.id);G.oilPick='oil';G.sent=[];G.pending=[];G.cases=[];G.log=newLog();G.days=[];G.limits={...CAMP.LIMITS};
  // 첫날은 점호(dawn) 없이 아침 장사에서 시작한다
  CAMP.timeline.forEach(ph=>{if(phAt(ph)<CAMP.START.min-DAY0)G.fired[G.day+':'+ph.id]=1;});}
// 창고·선반
const inv=k=>G.inv[k]||0;
function addInv(k,n=1){if(ITEM[k]&&ITEM[k].kind==='ing'){for(let i=0;i<n;i++)G.shelf.push({k,seen:false});if(n<0){for(let i=0;i<-n;i++){const j=G.shelf.findIndex(u=>u.k===k);if(j>=0)G.shelf.splice(j,1);}}return;}
  G.inv[k]=(G.inv[k]||0)+n;if(G.inv[k]<=0)delete G.inv[k];}
function shelfCount(k){return G.shelf.filter(u=>u.k===k||(k==='mush'&&u.k==='spore'&&!u.seen)).length;}
function haveIng(k){return G.shelf.some(u=>u.k===k)||(P.held===k);}
const alive=id=>G.regs[id]&&!G.regs[id].gone;
const canSend=id=>alive(id)&&!G.regs[id].hurt;
function thread(d,why){const b=G.thread;G.thread=Math.max(0,Math.min(CAMP.THREAD_MAX,G.thread+d));if(why)G.log.notes.push({t:why,d});if(G.thread!==b)G.threadFlash=d>0?1:-1;}
function money(d,why){G.money+=d;if(d>0)sfx('coin');if(why)G.log.notes.push({t:why,g:d});renderBelt();}
function grudge(id,d=1){if(G.regs[id])G.regs[id].grudge+=d;}
// 저장·이어하기 (아침·소등 때 스냅숏)
const SAVE_KEY='srg3d_save';
function snapshot(tag){const s={tag,at:Date.now(),G:JSON.parse(JSON.stringify({...G,cases:[],threadFlash:0})),P:{oil:P.oil,hp:P.hp,bars:P.bars,heal:P.heal,held:P.held},spot:SPOTS.cur,spot:SPOTS.cur,
  occ:Object.fromEntries(Object.entries(OCC).filter(([r,n])=>n).map(([r,n])=>[r,{uid:n.uid,state:n.state}])),
  rooms:JSON.parse(JSON.stringify(ROOMST)),doors:Object.fromEntries(Object.keys(DOORS).map(k=>[k,{locked:DOORS[k].locked,lamp:!!DOORS[k].lampHung}])),
  cases:G.cases.map(c=>caseToJSON(c))};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch(e){}return s;}
function hasSave(){try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;}}
function loadSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY));}catch(e){return null;}}
function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}

// ───── 41_sim.js ─────
// ───────── 파견·귀환 시뮬레이션 (v5 이식) ─────────
// 파티 위험도: 층 위험 + 위험 의뢰 − 적성 평균 ± 궁합 − 도시락
function partyRisk(req,mem,p){if(!mem.length)return null;let r=FLOOR[req.fl].risk+(req.risky?1:0);r-=mem.reduce((a,id)=>a+(REG[id].apt[req.fl]||0),0)/mem.length;
  if(mem.length===2){const twins=mem.every(id=>REG[id].twin&&mem.includes(REG[id].twin));r+=twins?.5:-.5;}if(p&&p.lunch)r-=1;return r;}
const omen=r=>r===null?['—','none']:r<=0?['좋음','good']:r<=1?['보통','mid']:['불길','bad'];
const todayQuests=()=>QUESTS[Math.min(G.day-1,QUESTS.length-1)];
const todayPlan=()=>CAMP.days[Math.min(G.day-1,CAMP.days.length-1)];
const todayPW=()=>CAMP.passwords[(G.day-1)%CAMP.passwords.length];
const yesterdayPW=()=>CAMP.passwords[(G.day-2+CAMP.passwords.length)%CAMP.passwords.length];
// 출발: 파티마다 결과(전리품·부상)를 미리 정하고 저녁 귀환 줄을 만든다
function dispatch(parties){const out=[];
  parties.forEach(p=>{if(!p.mem.length)return;const r=partyRisk(p.req,p.mem,p);
    if(p.lunch)addInv('lunch',-1);if(p.recall)addInv('recall',-1);
    const loot=[];if(p.req.need)for(let i=0;i<p.req.qty;i++)loot.push(p.req.need);
    const extra=1+(r>=1?1:0);for(let i=0;i<extra;i++)loot.push(rpick(FLOOR[p.req.fl].loot));
    const hurt={};p.mem.forEach(id=>{if(!p.recall&&((REG[id].apt[p.req.fl]||0)<0||r>=2)&&rnd()<.55)hurt[id]=FLOOR[p.req.fl].hurt;});
    p.mem.forEach(id=>{G.regs[id].sentTo=p.req.fl;});
    out.push({req:p.req,mem:p.mem.slice(),risk:r,omen:omen(r)[1],loot,hurt,recall:!!p.recall,lunch:!!p.lunch});});
  G.sent=out;G.pending=G.pending.filter(q=>!q.done&&q.req.need).concat(out.map(x=>({req:x.req,done:false,party:true})));
  G.cases=buildQueue();return out;}
// 저녁 귀환 줄. 가짜는 위험 의뢰(또는 B2, 또는 가장 위험한 파티)의 적성 낮은 사람을 대신한다
function buildQueue(){const plan=todayPlan(),parties=G.sent||[],q=[],fakes=[];
  (plan.fake||[]).forEach(f=>{const fam=ANOM[f.fam];if(!fam){console.warn('없는 계열',f.fam);return;}
    if(fam.guest){fakes.push({f,fam,guest:fam.guest});return;}
    let party=null;
    if(f.from==='risky')party=parties.find(p=>p.req.risky&&!fakes.some(x=>x.party===p));
    if(f.from==='B2')party=parties.find(p=>p.req.fl==='B2'&&!fakes.some(x=>x.party===p));
    if(!party)party=parties.filter(p=>!fakes.some(x=>x.party===p)).sort((a,b)=>b.risk-a.risk)[0];
    if(!party){const idle=REG_IDS.filter(id=>alive(id)&&!parties.some(p=>p.mem.includes(id)));fakes.push({f,fam,uninvited:rpick(idle.length?idle:REG_IDS)});return;}
    const id=party.mem.slice().sort((a,b)=>(REG[a].apt[party.req.fl]||0)-(REG[b].apt[party.req.fl]||0))[0];
    fakes.push({f,fam,id,party});});
  const arr=(kind,extra={})=>{const [a,b]=CAMP.arrive[kind]||CAMP.arrive.mid;return Math.floor(a+rnd()*(b-a))-DAY0;};
  const mk=(id,p,lootKeys,extra)=>({kind:'reg',id,regId:id,look:id,name:REG[id].name,party:p||null,partner:p?p.mem.find(x=>x!==id)||null:null,fl:p?p.req.fl:null,tally:'ok',
    loot:lootKeys.map(k=>({k,spore:k==='mush'&&rnd()<.35,seen:false})),hurt:null,fake:null,o:{},at:arr(p?(p.recall?'recall':p.omen):'mid'),state:'due',...extra});
  parties.forEach(p=>{const lootBy=p.mem.map(()=>[]);p.loot.forEach((k,i)=>lootBy[i%p.mem.length].push(k));
    p.mem.forEach((id,mi)=>{const fk=fakes.find(x=>x.id===id&&x.party===p);
      if(fk){const made=fk.fam.make(REG[id]);const cs=mk(id,p,made.loot,{fake:{fam:fk.f.fam,plan:fk.f.plan||fk.fam.night.plan,shape:made.shape,shoes:made.shoes},o:made.o,look:made.look});q.push(cs);
        if(fk.f.lateReal)q.push(mk(id,p,lootBy[mi],{tally:'none',late:true,at:arr('late')}));}
      else{const cs=mk(id,p,lootBy[mi],{hurt:p.hurt[id]||null});if(cs.hurt)cs.o=cs.hurt==='sand'?{sandEyes:1}:{moss:1};q.push(cs);}});});
  fakes.filter(x=>x.uninvited).forEach(x=>{const made=x.fam.make(REG[x.uninvited]);q.push(mk(x.uninvited,null,made.loot,{fake:{fam:x.f.fam,plan:x.f.plan||x.fam.night.plan,shape:made.shape,shoes:made.shoes},o:made.o,tally:'none',at:arr('bad')}));});
  // 투숙객 (계산대로 온다) — 가짜 순례자는 손님으로 온다
  (plan.guests||[]).forEach(g=>q.push({kind:'guest',id:g,look:GUEST[g].look,name:GUEST[g].name,guest:g,loot:[],o:{},at:CAMP.guestAt-DAY0,state:'due'}));
  fakes.filter(x=>x.guest).forEach(x=>{const made=x.fam.make();q.push({kind:'guest',id:x.guest,look:made.look,name:GUEST[x.guest].name,guest:x.guest,loot:[],o:made.o,fake:{fam:x.f.fam,plan:x.f.plan||x.fam.night.plan,shoes:made.shoes},at:CAMP.guestAt-DAY0+40,state:'due'});});
  if(plan.knock3)q.push({kind:'knock3',name:'???',loot:[],o:{},at:CAMP.knock3At-DAY0,state:'due'});
  q.sort((a,b)=>a.at-b.at);q.forEach((c,i)=>c.cid=G.day*100+i);return q;}
// 창구 대사: 진짜는 단골 대사, 가짜는 계열 훅, 다친 사람은 기침이 섞인다
function caseLines(c){const pw=todayPW();const r=REG[c.regId]||{name:c.name,lines:{}};const L=r.lines||{};
  if(c.fake){const W=ANOM[c.fake.fam].window;const rr={...r,name:c.name,shape:c.fake.shape};const f=x=>typeof x==='function'?x(rr,pw):x;
    return{hi:f(W.hi),ask:f(W.ask),pw:f(W.pw),voice:f(W.voice),tally:c.tally==='none'?'부절이 없다. 오늘 보내지 않은 사람이다.':f(W.tally),lamp:f(W.lamp)};}
  if(c.kind==='guest'){const g=GUEST[c.guest].lines;return{hi:g.hi,ask:g.talk,pw:'"그런 것은 모릅니다."',voice:'평범하다.',tally:'투숙객이다. 부절이 없다.',lamp:'평소 얼굴이다.'};}
  const cough=c.hurt==='moss'?' 콜록, 콜록.':c.hurt==='sand'?' 눈을 자꾸 비빈다.':'';
  return{hi:(L.hi||'"다녀왔어."')+cough,ask:(L.ask||'"별일 없었어."')+(c.hurt==='moss'?' "…포자 밭에 넘어졌어."':c.hurt==='sand'?' "…모래가 눈에 들어갔어."':''),pw:`"${pw.a}."`+(c.regId==='pipi'?' 더듬는다.':''),
    voice:(L.voice||'평소 목소리.')+(c.hurt==='moss'?' 숨소리에 쇳소리가 섞였다.':''),tally:c.tally==='none'?(c.late?'부절이 없다. 귀환 물약으로 먼저 돌아왔다고 한다.':'부절이 없다. 오늘 보내지 않은 사람이다.'):'부절이 딱 맞는다.',
    lamp:c.hurt==='moss'?'목덜미에 초록 가루가 붙어 있다.':c.hurt==='sand'?'눈에 붉은 모래가 돈다.':'평소 얼굴이다.'};}
function caseToJSON(c){const {npc,...rest}=c;return rest;}

// ───── 42_verbs.js ─────
// ───────── 대상별 할 일 목록 ─────────
// {name, verbs:[{k, ic, t, fn, min?, need?}]} — 첫 줄이 기본. need:'lamp'는 등불을 들어야 한다.
const V=(k,ic,t,fn,o={})=>({k,ic,t,fn,...o});
function ACT(it,npc){if(!it)return null;const [k,a]=it.split(':');
 if(k==='pot'){const S=POT,v=[];
   if(S.state==='ready'||S.state==='burnt')v.push(V('ladle','hand',S.state==='ready'?`${ITN[S.spore?'fail':S.dish]}을(를) 떠낸다`:'넘친 스튜를 떠낸다',potHand));
   else if(P.held&&ITEM[P.held]&&(ITEM[P.held].kind==='ing'||ITEM[P.held].kind==='oil'))v.push(V('put','hand',`${ITN[P.held]}을(를) 넣는다`,potHand));
   v.push(V('open','eye','솥을 연다 — 레시피북',()=>openStation('pot')));
   v.push(V('listen','ear','끓는 소리를 듣는다',()=>sub('가마솥',S.state==='empty'||S.state==='fill'?'불 소리뿐.':S.state==='cook'?'아직 덜 끓었다.':S.state==='ready'?'보글보글— 지금 떠내야 한다!':'치이익— 넘치고 있다!',1)));
   return{name:'가마솥',verbs:v};}
 if(k==='shelf'){const u=shelfUnit(+a);if(!u)return null;const nm=u.k==='spore'&&!u.seen?ITN.mush:ITN[u.k];return{name:nm,verbs:[V('pick','hand','집는다',()=>pick(+a)),V('open','eye','선반을 연다 — 재료 현황',()=>openStation('shelf'))]};}
 if(k==='shelfboard')return{name:'재료 선반',verbs:[V('open','eye','선반을 연다 — 재료 현황',()=>openStation('shelf'))].concat(P.held&&ITEM[P.held]&&ITEM[P.held].kind==='ing'?[V('put','hand',`${ITN[P.held]}을(를) 올려놓는다`,putBack)]:[])};
 if(k==='board')return{name:'의뢰 게시판',verbs:[V('open','eye',G.phase==='send'||G.phase==='market'?'게시판을 본다 — 보내기':'게시판을 본다',()=>openStation('board'))]};
 if(k==='chest')return{name:'창고 궤짝',verbs:[V('open','eye','궤짝을 연다 — 창고',()=>openStation('chest'))].concat(P.held?[V('put','hand',`${ITN[P.held]}을(를) 넣는다`,()=>{addInv(P.held,1);sub('창고',`${ITN[P.held]}을(를) 넣었다.`);P.held=null;renderBelt();})]:[])};
 if(k==='keyboard')return{name:'열쇠판',verbs:[V('open','eye','열쇠판을 본다 — 방 배정',()=>openStation('keys'))]};
 if(k==='rulewall')return{name:'수칙집',verbs:[V('open','eye','수칙집을 편다',()=>{PAGE='rule';renderBookWin();})]};
 if(k==='window'){const n=NPCS.find(x=>x.state==='atwin');
   if(n)return{name:'귀환 창구',verbs:[V('sit','eye',`창구에 앉아 ${n.name}을(를) 살핀다`,()=>winSeat(n)),V('listen','ear','바깥 소리를 듣는다',()=>lean(24.5,9.4,()=>sub('창구',`${n.name}의 숨소리. `+(n.hurt==='moss'?'쌕쌕거린다.':''),1)))]};
   const k3=G.cases.find(c=>c.kind==='knock3'&&c.state==='atwin');
   if(k3)return{name:'귀환 창구',verbs:[V('open3','hand','셔터를 올린다',()=>knock3Open()),V('ignore','ear','모른 척한다',()=>{sub('창구','…세 번째 노크가 멎었다. 발소리가 멀어진다.',1);k3.state='gone';})]};
   return{name:'귀환 창구',verbs:[V('listen','ear','바깥 소리를 듣는다',()=>lean(24.5,9.4,()=>sub('창구',G.cases.some(x=>x.state==='queue')?'골목에서 발소리.':'골목이 조용하다.',1)))]};}
 if(k==='desk'){const w=NPCS.find(n=>n.state==='atdesk'),v=[];if(w)v.push(V('key','hand',`${w.name}에게 방 열쇠를 준다`,()=>roomPick(w)));v.push(V('open','eye','계산대를 본다 — 장사·숙박부',()=>openStation('desk')));v.push(V('bell','hand','종을 친다',()=>sfx('bell')));return{name:'계산대',verbs:v};}
 if(k==='table'){const v=[];if(P.held&&ITEM[P.held]&&ITEM[P.held].kind==='dish')v.push(V('serve','hand',`${ITN[P.held]}을(를) 낸다`,serve));
   if(P.lamp)v.push(V('shadow','lamp','벽의 그림자를 본다',()=>sub('식당',NPCS.some(n=>n.state==='sit'&&n.fake)?'그림자들 사이, 한 명의 그림자가 손을 늦게 움직인다.':'그림자들이 고르게 흔들린다.',1)));
   if(!v.length)v.push(V('look','eye','둘러본다',()=>sub('식탁',G.dinner?(G.served?`다들 ${ITN[G.served]}을(를) 먹는다. 관찰 ${G.dinnerObs}번 남음.`:'다들 요리를 기다린다.'):'긴 식탁. 저녁 7시에 다들 모인다.')));return{name:'식탁',verbs:v};}
 if(k==='endwin'){const v=[V('listen','ear','귀를 기울인다',()=>lean(.4,6,()=>sub('복도','바람이 창틀을 흔든다.')))];
   if(P.lamp)v.push(V('shine','lamp','복도 끝을 비춘다',()=>{sfx('eerie');sub('복도 끝',G.night&&fakeOut()?'…누군가 서 있었던 것 같다.':'창밖이 캄캄하다.',1);}));return{name:'복도 끝 창문',verbs:v};}
 if(k==='door'){const d=DOORS[a],r=+a,n=r?occOf(r):null,nm=roomLabel(a);
   const openV=V('open','hand',d.locked?'빗장이 걸려 안 열린다':d.target?'문을 닫는다':'문을 연다',()=>doorE(a));
   if(!r)return{name:nm,verbs:[openV]};
   const barV=V('bar','bar',d.locked?'빗장을 푼다':`빗장을 건다 (남은 ${P.bars})`,()=>barDoor(a));
   const lis=V('listen','ear','문에 귀를 댄다',()=>lean(d.x,d.z,()=>listenDoor(r)),{min:10});
   const kh=V('keyhole','lamp','열쇠 구멍을 들여다본다',()=>keyholeWin(r),{need:'lamp',min:10});
   const kn=V('knock','hand','노크한다',()=>knock(r),{min:2});
   const lampV=V('hang','lamp',d.lampHung?'문의 등불을 내린다':`문에 등불을 건다 (남은 ${G.limits.hangLamp})`,()=>hangLamp(a));
   let v;if(G.morning)v=[V('wake','mouth','"빨리 일어나!"',()=>shout(r)),lis,openV].concat(d.locked?[barV]:[]);
   else if(G.night)v=[lis,kh,kn,barV,lampV,openV];else v=[openV,kn,lis];
   return{name:nm+(n?' — '+n.name:''),verbs:v};}
 if(k==='npc'&&npc){const n=npc,v=[];const co=n.guest&&G.checkout&&n.state==='sleep';
   if(n.state==='atdesk')v.push(V('key','hand','방 열쇠를 준다',()=>roomPick(n)));
   if(n.state==='atwin')v.push(V('sit','eye','창구에 앉아 살핀다',()=>winSeat(n)));
   if(n.uid==='dora'||n.uid==='enoch')v.push(V('trade','hand',`${n.name}과(와) 거래한다`,()=>openStation('desk')));
   if(G.dinner&&n.state==='sit'&&n.room){v.push(V('watch','eye',`지켜본다 (관찰 ${G.dinnerObs||0}번 남음)`,()=>dinnerWatch(n)),V('talk','mouth','말을 건다',()=>dinnerTalk(n)),V('swap','bar',`방을 바꾼다 (남은 ${G.limits.swaps})`,()=>roomPick(n,true)));}
   else if(co)v.push(V('shout','mouth','"너, 이제 그만 꺼져!"',()=>talk(n)),V('push','hand','문밖으로 떠민다',()=>push(n)));
   else v.push(V('talk','mouth','말을 건다',()=>talk(n)));
   if(P.heal&&n.hurt&&!n.cured&&(n.lampSeen||n.mossShown||n.case&&n.case.hurt))v.push(V('heal','heal','치료약을 먹인다',()=>heal(n)));
   if(!(G.dinner&&n.state==='sit'))v.push(V('listen','ear','엿듣는다',()=>lean(n.x,n.z,()=>eavesdrop(n)),{min:5}));
   if(P.lamp)v.push(V('face','lamp','얼굴을 비춘다',()=>{const c=n.case;sub(n.name,c?caseLines(c).lamp:'평소 얼굴이다.',1);if(n.hurt)n.lampSeen=true;}));
   return{name:n.name||'',verbs:v};}
 if(k==='drop'){const d=DROPS[+a];if(!d)return null;return{name:ITN[d.k]||'물건',verbs:[V('pick','hand','집는다',()=>pickDrop(+a))]};}
 return null;}

// ───────── 첫 10분 안내 (헬가) ─────────
const TDONE={};let TUT_OVER=false;
const TUT_POS={helga:()=>[helga.x,1.7,helga.z],shine:()=>[2.9,2.1,.8],cook:()=>P.held?[3.5,1.6,2.4]:[2.9,2.1,.8],send:()=>[7.2,1.8,11.8],guest:()=>[6.2,1.3,9.9]};
const TSTEP=DLG.tutorial.map(s=>({...s,pos:TUT_POS[s.id]||(()=>null),l:{helga:'헬가',shine:'부엌 선반',cook:'부엌',send:'게시판',guest:'계산대'}[s.id]}));
const tutCur=()=>TUT_OVER?null:TSTEP.find(s=>!TDONE[s.id])||null;
function tutEvent(id){if(TUT_OVER||TDONE[id])return;const cur=tutCur();const step=TSTEP.find(s=>s.id===id);TDONE[id]=1;if(id==='cook')TDONE.shine=1;if(id==='send'){TDONE.cook=TDONE.shine=1;G.tutSlow=false;}   // 보낸 뒤엔 손님까지 기다리는 시간이 길어 느린 시계를 푼다
  if(step&&step.say)sub('헬가',step.say,1);
  if(id==='helga'){helga.state='walk';walk(helga,[[4.4,8.2],[3.6,5.8],[3.6,4.3],[5.6,3.2]],m=>{m.state='idle';m.face=-2;});}
  if(cur&&cur.id===id)sfx('coin');if(!tutCur())tutEnd();}
function tutEnd(){if(TUT_OVER)return;TUT_OVER=true;G.tutSlow=false;tip('tutdone',DLG.tips.tutdone);}
// 지금 할 일 (안내가 끝난 뒤에는 단계와 급한 순서)
function OBJ(){const c=tutCur();if(c){if(c.id==='guest'&&!NPCS.some(n=>n.state==='atdesk'))return{t:c.wait||c.t,w:c.w,pos:c.pos(),tut:true,l:c.l};return{t:c.t,w:c.w,pos:c.pos(),tut:true,l:c.l};}
  const w=NPCS.find(n=>n.state==='atwin'),k3=G.cases.find(x=>x.kind==='knock3'&&x.state==='atwin'),desk=NPCS.find(n=>n.state==='atdesk');
  if(k3)return{t:'창구를 세 번 두드리는 소리',w:'수칙 4. 열지 마십시오',pos:[23.6,1.6,9.4],hot:1,l:'창구'};
  if(POT.state==='ready')return{t:`솥을 떠낸다 — ${ITN[POT.spore?'fail':POT.dish]}`,w:'부엌 가마솥. 오래 두면 넘친다',pos:[3.5,1.6,2.4],hot:1,l:'가마솥'};
  if(desk)return{t:`계산대 손님에게 방 열쇠를 준다`,w:'홀 정문 옆 계산대',pos:[6.2,1.3,9.9],hot:1,l:'계산대'};
  if(w)return{t:`창구에 앉아 ${w.name}을(를) 살핀다`,w:'홀 동쪽 벽의 귀환 창구',pos:[23.6,1.6,9.4],hot:1,l:'창구'};
  if(G.dinner&&!G.served&&P.held&&ITEM[P.held]&&ITEM[P.held].kind==='dish')return{t:`식탁에 ${ITN[P.held]}을(를) 낸다`,w:'홀 북쪽 식당',pos:[11.5,1.1,2.5],hot:1,l:'식당'};
  if(G.dinner&&!G.served)return{t:'저녁을 낼 요리가 필요하다',w:inv('stew')||inv('soup')||inv('roast')?'창고 궤짝에 요리가 있다':'가마솥에서 요리를 만든다 (고기+버섯 등)',pos:[3.5,1.6,2.4],hot:1,l:'가마솥'};
  const ph=G.phase;
  if(ph==='market'||ph==='dawn'){const sl=NPCS.filter(n=>n.room&&n.state==='sleep'&&!n.lazy);if(sl.length&&G.morning){const r=sl[0].room;return{t:`점호 — ${r}호를 깨운다 ("빨리 일어나!")`,w:'2층 복도',pos:[DOORS[r].x,4.4,DOORS[r].z],hot:1,l:'2층'};}
    const sick=NPCS.find(n=>n.breakfast&&n.state==='sit'&&n.hurt&&!n.cured);if(sick)return{t:`식당에서 ${sick.name}을(를) 살핀다 — 치료약`,w:'식당. 등불로 얼굴을 비추고 치료약',pos:[sick.x,1.5,sick.z],hot:1,l:'식당'};
    if(G.checkout){const lazy=NPCS.find(n=>n.guest&&n.state==='sleep'&&n.lazy);if(lazy)return{t:'안 나가는 손님을 내쫓는다',w:`${lazy.room}호 — "꺼져!" 뒤 떠민다`,pos:[lazy.x,3.8,lazy.z],hot:1,l:'2층'};}
    if(!G.morning||G.checkout)return{t:'아침 장사 — 계산대',w:'도라에게 팔고, 기름·빵을 사고, 의뢰를 납품한다',pos:[6.2,1.3,9.9],l:'계산대'};
    return{t:'점호가 끝나면 아침 장사',w:'계산대',pos:[6.2,1.3,9.9],l:'계산대'};}
  if(ph==='send'){if(!G.sent.length)return{t:'의뢰 게시판에서 파티를 보낸다',w:'홀 남쪽 벽 게시판. 11시 전에',pos:[7.2,1.8,11.8],hot:1,l:'게시판'};return{t:'보냈다. 요리를 준비하거나 계산대에서 오후까지 쉰다',w:'계산대 — 오후까지 쉰다',pos:[6.2,1.3,9.9],l:'계산대'};}
  if(ph==='noon')return{t:'계산대에서 오후까지 쉰다',w:'또는 요리·기름을 미리 만든다',pos:[6.2,1.3,9.9],l:'계산대'};
  if(ph==='evening'||ph==='dinner'){const due=G.cases.filter(c=>c.state==='due'||c.state==='queue').length;if(due)return{t:`귀환자를 기다린다 (${due}명 남음)`,w:'창구 종이 울리면 홀 동쪽 벽',pos:[23.6,1.6,9.4],l:'창구'};return{t:G.dinner?'식탁을 지켜본다':'저녁 7시에 식당',w:'식당. 앉은 사람을 조준해 지켜본다·말을 건다',pos:[11.5,1.1,2.5],l:'식당'};}
  if(G.night){const f=fakeOut();if(f)return{t:'복도에 무언가 있다 — 등불(F)을 든다',w:'2층 복도',pos:[f.x,1.7+f.y,f.z],hot:1,l:'2층'};
    return{t:'순찰 — 방마다 문에 귀를 대 본다',w:'2층 복도 (계단은 홀 동쪽 안쪽)',pos:P.y>1.5?null:[20,1.5,6],l:'2층'};}
  return{t:'여관을 둘러본다',w:'',pos:null};}
function hint(){const o=OBJ();sub('힌트',o.t+(o.w?' — '+o.w:''));G.markFlash=2;}
// 처음 한 번만 뜨는 안내 카드
const TIPSEEN={},TIPQ=[];let TIPT=0;
function tip(id,html){if(TIPSEEN[id])return;TIPSEEN[id]=1;TIPQ.push(html||DLG.tips[id]||'');}
function tipTick(dt){TIPT-=dt;const el=$('tip');if(TIPT<=0){if(TIPQ.length){el.innerHTML=TIPQ.shift();el.classList.add('show');TIPT=7;sfx('flip');}else el.classList.remove('show');}}

// ───── 43_kitchen.js ─────
// ───────── 부엌: 선반(창고의 재료)과 가마솥(레시피) ─────────
const SHELF_POS=[{x:1.4,y:1.36},{x:2.4,y:1.36},{x:3.4,y:1.36},{x:4.4,y:1.36},{x:1.9,y:2.06},{x:3.0,y:2.06}];
const SHELFV=[];   // 화면의 여섯 칸 {unit, model, hb}
function buildShelf(){SHELF_POS.forEach((s,i)=>{const hb=new THREE.Mesh(new THREE.BoxGeometry(.36,.3,.32),new THREE.MeshBasicMaterial({visible:false}));hb.position.set(s.x,s.y+.13,.38);hb.userData.it='shelf:'+i;scene.add(hb);INTER.push(hb);SHELFV.push({unit:null,model:null,hb,pos:s});});refreshShelf();}
// 선반 칸 = 창고 재료(G.shelf)의 앞 여섯 개
function refreshShelf(){SHELFV.forEach((v,i)=>{const u=G.shelf[i]||null;if(v.unit===u&&v.model)return;v.unit=u;if(v.model){scene.remove(v.model);v.model=null;}
  if(u){const key=u.k==='spore'&&!u.seen?'mush':u.k;const m=itemModel(key==='spore'?'mush':key);m.scale.setScalar(1.3);m.position.set(v.pos.x,v.pos.y,.36);m.rotation.y=(i*1.3)%6;scene.add(m);v.model=m;v.hb.visible=true;
    if(u.k==='spore'&&m.userData.cap){m.userData.cap.material=IM.cap.clone();if(u.seen)m.userData.cap.material.emissive.setHex(0x4a8a18);}}
  else v.hb.visible=false;});}
function shelfUnit(i){return G.shelf[i]||null;}
function pick(i){const u=shelfUnit(i);if(!u)return;if(P.held){sub('손','이미 무언가를 들고 있다. 먼저 내려놓는다.');return;}G.shelf.splice(i,1);P.held=u.k==='spore'?(u.seen?'spore':'mush_s'):u.k;sfx('flip');renderBelt();refreshShelf();}
function putBack(){const k=P.held;if(!k)return;const key=k==='mush_s'?'spore':k;if(!ITEM[key]||ITEM[key].kind!=='ing'){sub('선반','선반에는 재료만 올린다. 요리와 물약은 창고 궤짝에.');return;}
  G.shelf.unshift({k:key,seen:k==='spore'});P.held=null;sfx('flip');renderBelt();refreshShelf();sub('선반',`${ITN[k]}을(를) 선반에 올렸다.`);}
function revealShelf(i){const u=shelfUnit(i);if(!u||u.k!=='spore'||u.seen)return false;u.seen=true;refreshShelf();return true;}
// 가마솥
const POT={state:'empty',ing:[],t:0,spore:false,dish:null,recipe:null};
function findRecipe(a,b){return RECIPES.find(r=>(r.a===a&&r.b===b)||(r.a===b&&r.b===a))||null;}
function potHand(){const S=POT;
  if(S.state==='ready'||S.state==='burnt'){if(P.held){sub('손','손이 비어야 떠낼 수 있다.');return;}const out=S.state==='ready'?(S.spore?'fail':S.dish):'burnt';P.held=out;
    sub('가마솥',out==='burnt'?'탄 스튜다. 낼 수 없다.':out==='fail'?'포자가 번진 솥… 먹일 수 없다.':`${ITN[out]}을(를) 떠냈다.`+(ITEM[out].kind==='dish'?' 식당에 내자.':' 창고 궤짝에 넣거나 들고 다닌다.'),1);
    Object.assign(S,{state:'empty',ing:[],t:0,spore:false,dish:null,recipe:null});renderBelt();return;}
  if(!P.held){sub('가마솥',S.ing.length?`${ITN[S.ing[0]]} — 재료를 하나 더.`:'재료 두 가지를 넣는다. 레시피북은 솥을 열면 있다.');return;}
  if(S.state!=='empty'&&S.state!=='fill'){sub('가마솥','이미 끓고 있다.');return;}
  const k=P.held;if(!ITEM[k]||(ITEM[k].kind!=='ing'&&ITEM[k].kind!=='oil')){sub('가마솥','이건 넣을 수 없다.');return;}
  P.held=null;const key=k==='mush_s'?'spore':k;S.ing.push(key==='spore'?'mush':key);if(key==='spore')S.spore=true;S.state='fill';sfx('bubble');
  if(S.ing.length>=2){const r=findRecipe(S.ing[0],S.ing[1]);S.recipe=r;S.dish=r?r.out:'fail';S.state='cook';S.t=0;tutEvent('cook');
    sub('가마솥',r?`${ITN[r.out]}이(가) 될 조합이다. 끓을 때까지 기다리자.`+(ITEM[r.out].kind==='dish'?' (너무 오래 두면 넘친다)':''):'레시피북에 없는 조합이다. 무언가 이상한 것이 되고 있다.',1);}renderBelt();}
function potEmpty(){const S=POT;if(S.state==='empty'){sub('가마솥','비어 있다.');return;}Object.assign(S,{state:'empty',ing:[],t:0,spore:false,dish:null,recipe:null});sfx('hiss');sub('가마솥','솥을 비웠다.');}
function potTick(dt){const S=POT;const r=S.recipe;const cookT=r?r.cook:20,holdT=r?r.hold:30;
  if(S.state==='cook'){S.t+=dt;if(S.t>cookT){S.state='ready';S.t=0;sfx('bubble');}}
  else if(S.state==='ready'){S.t+=dt;if(Math.random()<dt*1.5)sfx('bubble');if(S.t>holdT){S.state='burnt';sfx('hiss');sub('부엌','치이익— 솥이 넘쳤다!');}}
  potTop.material.color.set(S.state==='empty'?0x3a3a3a:S.state==='burnt'?0x1a1a1a:S.spore?0x7a9a3a:S.dish&&ITEM[S.dish]&&ITEM[S.dish].kind==='oil'?0xc89a3a:S.state==='ready'?0xb0703a:0x8a6a3a);}
const potProgress=()=>{const S=POT,r=S.recipe;if(S.state==='cook')return Math.min(1,S.t/(r?r.cook:20));if(S.state==='ready')return Math.max(0,1-S.t/(r?r.hold:30));return 0;};
// 식탁에 내기: 낼 수 있는 요리 전부
function serve(){const k=P.held;if(!k||!ITEM[k]||ITEM[k].kind!=='dish'){sub('식탁',k==='burnt'||k==='fail'?'이건 못 낸다.':'낼 요리가 없다.');return;}if(!G.dinner){sub('식탁','아직 식사 시간이 아니다. 저녁 7시에 다들 모인다.');return;}
  P.held=null;G.served=k;G.log.served=k;const eaters=NPCS.filter(n=>n.state==='sit'&&n.room);const fee=(ITEM[k].fee||3)*eaters.length;money(fee,'식사비');
  sub('식당',`${ITN[k]}을(를) 냈다. 다들 허겁지겁 먹는다. (식사비 ${fee}G)`,1);G.dinnerObs=(G.limits.obs||4)+(ITEM[k].talk||0);renderBelt();
  CHAIRS.forEach(c=>box(c[0]-.15,.82,(c[1]<2.5?2.2:2.55),c[0]+.15,.9,(c[1]<2.5?2.45:2.8),M('#9a5a3a')));
  eaters.forEach(n=>{if(n.hurt==='moss'&&!n.cured&&ITEM[k].reveal==='moss'){n.mossShown=true;setLook(n,n.look,{...(n.o||{}),moss:1});}});}

// ───── 44_doors.js ─────
// ───────── 문·순찰·점호·전투 ─────────
const roomLabel=a=>+a?`${a}호`:a==='front'?'정문':'옆문';
const occOf=r=>OCC[r]&&OCC[r].state!=='gone'?OCC[r]:null;
const fakeFam=n=>n&&n.fake?ANOM[n.fake.fam]:null;
const nightState=n=>n.out?'out':'in';
function doorE(a){const d=DOORS[a];if(d.locked){sub('문','빗장이 걸려 있다. 빗장부터 푼다.');return;}const open=!d.target;const n=+a?occOf(+a):null;
  if(open&&n&&n.fake&&G.night){if(G.limits.openDoor<=0&&!n.out){sub('문','오늘 밤은 더 열 수 없다.');return;}G.limits.openDoor--;
    if(P.lamp){killFake(n,'등불을 먼저 들이밀자, 그것은 빛에 닿아 재가 되었다.');}else{sub(roomLabel(a),'불 없이 문을 열었다— 무언가 튀어나온다!');startHunt(n);}}
  else if(open&&n&&!n.fake&&G.night&&n.state==='sleep'){if(G.limits.openDoor<=0){sub('문','오늘 밤은 더 열 수 없다.');return;}G.limits.openDoor--;grudge(n.regId||n.uid);sub(roomLabel(a),`${n.name}이(가) 깨어 이쪽을 노려본다. "…뭐야." 진짜다. 원망한다.`,1);n.grudged=true;}
  d.target=open?1:0;d.playerOpen=open;sfx('door');}
function barDoor(a){const d=DOORS[a];if(d.locked){d.locked=false;P.bars++;sfx('wood');sub(roomLabel(a),'빗장을 풀었다.');renderBelt();return;}if(P.bars<=0){sub('빗장','남은 빗장이 없다.');return;}if(d.open>.3){sub('빗장','문을 닫아야 건다.');return;}
  d.locked=true;P.bars--;sfx('wood');const n=+a?occOf(+a):null;if(n&&!n.fake&&n.state==='sleep')n.barredReal=true;sub(roomLabel(a),'빗장을 걸었다.',1);renderBelt();}
function hangLamp(a){const d=DOORS[a];if(d.lampHung){d.lampHung=false;G.limits.hangLamp++;d.lampMesh.visible=false;sub(roomLabel(a),'문의 등불을 내렸다.');return;}
  if(G.limits.hangLamp<=0){sub('등불','걸 등불이 없다.');return;}if(P.oil<10){sub('등불','기름이 모자라 밤새 못 탄다.');return;}G.limits.hangLamp--;P.oil-=10;d.lampHung=true;if(!d.lampMesh){d.lampMesh=hangLantern(d.x+(d.alongX?.55:0),d.y0+2.05,d.z+(RM[+a]&&RM[+a].north?.25:-.25),'door');}d.lampMesh.visible=true;
  sub(roomLabel(a),'문 앞에 등불을 걸었다. 이 방은 바꿔치기당하지 않는다.',1);renderBelt();}
function knock(r){sfx('knock');const n=occOf(r);spend(2);
  if(G.morning){wake(r);return;}
  if(!n){sub(`${r}호`,ROOMST[r].stain?'대답이 없다. 문틈으로 잿빛 얼룩이 보인다.':'대답이 없다. 빈방이다.');return;}
  const F=fakeFam(n);if(F){sub(`${r}호`,F.patrol.knock({...n,name:n.name},nightState(n)),1);return;}
  if(n.guest){sub(`${r}호`,GUEST[n.guest].lines.knock,1);return;}
  const L=REG[n.regId].lines;sub(`${r}호`,L.knock||'"음…?"',1);if(G.night){n.woke=(n.woke||0)+1;if(n.woke>=2){grudge(n.regId);sub(`${r}호`,`${n.name}이(가) 두 번이나 깼다. 원망한다.`);}}}
function listenDoor(r){const n=occOf(r),st=ROOMST[r];spend(10);let t;
  if(!n)t=st.stain?'…조용하다. 아주 작게 사각사각.':'빈방이다. 바람 소리뿐.';
  else{const F=fakeFam(n);if(F)t=F.patrol.listen({...n,name:n.name},nightState(n));
    else if(n.guest)t=GUEST[n.guest].lines.listen;
    else if(n.hurt==='moss'&&!n.cured)t='쌕쌕… 콜록. 숨소리에 쇳소리가 섞였다.';
    else t=REG[n.regId].lines.listen||'고른 숨소리.';}
  if(G.night){ROOMS.forEach(q=>{const f=occOf(q);if(f&&f.fake&&f.out&&f.targetRoom===r)t+=' 벽 너머에서 무언가 긁는 소리가 이쪽으로 온다.';});}
  sub(`${r}호`,t,1);}
function shout(r){const n=occOf(r);sfx('shout');if(G.morning){sub('아리','"빨리 일어나!"');wake(r);return;}sub('아리','"…괜찮아?"');
  if(n&&!n.fake)sub(`${r}호`,n.guest?'"…자요."':'"…응? 괜찮아."',1);else sub(`${r}호`,'대답이 없다.');}
function wake(r){const n=occOf(r);if(!n){sub(`${r}호`,ROOMST[r].stain?'대답이 없다. 문틈으로 잿빛 얼룩이 보인다.':'빈방이다.',1);return;}
  if(n.fake){sfx('scratch');sub(`${r}호`,DOORS[r].locked?'대답 대신 문 안쪽을 긁는 소리. 빗장이 버틴다. 경계청을 불러야겠다.':'"…네." 대답만 하고 나오지 않는다.',1);return;}
  if(n.state!=='sleep'){sub(`${r}호`,'이미 일어났다.');return;}
  if(n.guest){const g=GUEST[n.guest];if(g.lazy){sub(`${r}호`,g.lines.wake,1);n.lazy=true;return;}n.state='idle';DOORS[r].target=1;sub(`${r}호`,g.lines.wake,1);setTimeout(()=>leaveInn(n),900);return;}
  G.log.woke++;n.woke2=true;thread(CAMP.thread.woke,n.name+' 무사히 깸');n.state='idle';DOORS[r].target=1;DOORS[r].playerOpen=true;
  const L=REG[n.regId].lines;const line=n.hurt==='moss'&&!n.cured?'"콜록… 몸이 이상해." 어깨에 이끼가 피어 있다.':n.hurt==='sand'&&!n.cured?'"눈이… 자꾸 붉게 보여."':(L.wake||'"일어났어."');
  sub(`${r}호`,line,1);if(n.hurt==='moss'&&!n.cured){setLook(n,n.look,{moss:1});n.mossShown=true;}
  setTimeout(()=>{n.breakfast=true;goEat(n);},900);}
function leaveInn(n){const c=n.chair!==undefined?CHAIRS[n.chair]:null;if(n.chair!==undefined){delete CH_USED[n.chair];n.chair=undefined;}n.state='walk';
  const from=n.room&&!c?[RM[n.room].inside,RM[n.room].front,[15.5,6],[23.2,6.1],[23.2,8.4]]:(c?[[c[0],c[1]<2.5?1.0:4.2],[11,4.4]]:[]);
  if(n.room){OCC[n.room]=null;n.room=null;}
  walk(n,from.concat([[11,5.8],[7.5,9],[4,11],[4,14]]),m=>{m.visible=false;m.state='gone';m.left=true;});}
function talk(n){n.talkT=1.6;if(n.uid==='helga'&&!TDONE.helga&&!TUT_OVER){tutEvent('helga');return;}
  if(n.guest&&G.checkout&&n.state==='sleep'){sfx('shout');sub('아리','"너, 이제 그만 꺼져!"');n.shouted=true;sub(n.name,GUEST[n.guest].lines.shout||'"…"',1);return;}
  if(G.dinner&&n.state==='sit'&&n.room){dinnerTalk(n);return;}
  const F=fakeFam(n);let t;if(n.uid==='helga')t=STAFF.helga.lines.talk;else if(F)t=F.dinner.talk({...n,name:n.name});else if(n.guest)t=GUEST[n.guest].lines.talk;else t=(REG[n.regId].lines.hi||'"…"');
  sub(n.name,t,1);}
function eavesdrop(n){spend(5);const F=fakeFam(n);let t;if(n.uid==='helga')t=STAFF.helga.lines.listen;else if(F)t=F.patrol.listen({...n,name:n.name},'in');else if(n.guest)t=GUEST[n.guest].lines.listen;else t=REG[n.regId].lines.listen||'…';sub(n.name,t,1);}
function push(n){if(n.guest&&G.checkout&&n.state==='sleep'){n.pushed=(n.pushed||0)+1;sfx('hit');const g=GUEST[n.guest].lines;if(n.pushed<2||!n.shouted){sub(n.name,n.shouted?'"아얏! 가, 간다니까…"':(g.push1||'"으…"')+' (먼저 소리쳐야 하나?)',1);return;}
    n.state='idle';const fee=GUEST[n.guest].fee||6;money(fee,'숙박비');sub(n.name,(g.push2||'"간다!"')+` (숙박비 ${fee}G)`,1);G.log.evicted=true;const r=n.room;DOORS[r].target=1;OCC[r]=null;n.room=null;walk(n,[RM[r].inside,RM[r].front,[15.5,6],[23.2,6.1],[23.2,8.4],[7.5,10],[4,11],[4,14]],m=>{m.visible=false;m.state='gone';});return;}
  sfx('flip');sub(n.name,'"응?"');}
function heal(n){if(!P.heal)return;if(n.fake){P.heal--;sub(n.name,'치료약을 먹였다. …아무 변화가 없다. 약이 안 듣는 사람은 진짜가 아니다.',1);n.healFailed=true;renderBelt();return;}
  P.heal--;n.cured=true;if(n.regId&&G.regs[n.regId])G.regs[n.regId].hurt=null;setLook(n,n.look,n.o0||{});sub(n.name,'치료약을 먹였다. 초록 가루가 가라앉는다.',1);renderBelt();}
// ───────── 그것과 전투 ─────────
let HUNT=null;const fakeOut=()=>NPCS.find(x=>x.fake&&x.out&&x.visible&&x.state!=='gone');
function startHunt(n){if(n.state==='gone')return;HUNT=n;n.state='hunt';n.out=true;const H=fakeFam(n).hunt||{};n.hp=n.hp||H.hp||3;n.cd=0;sfx('eerie');}
function killFake(n,msg){n.state='gone';n.visible=false;G.log.killed.push(n.name);HUNT=null;ash(n.x,n.y+1,n.z);sub('그것',msg||'재가 되어 흩어졌다.',1);G.danger=0;if(n.room&&OCC[n.room]===n)OCC[n.room]=null;thread(CAMP.thread.killed,'그것을 처치');}
function clubSwing(){if(!HUNT)return false;VM.swing=1;const n=HUNT,dx=n.x-P.x,dz=n.z-P.z,d=Math.hypot(dx,dz);const f=new THREE.Vector3();camera.getWorldDirection(f);const dot=(f.x*dx+f.z*dz)/(d*Math.hypot(f.x,f.z)+1e-6);
  sfx('swing');if(d<2.4&&dot>.75){n.hp--;sfx('hit');G.flick=.8;n.x+=dx/d*1.2;n.z+=dz/d*1.2;if(n.hp<=0)killFake(n,'몽둥이에 그것이 무너져 재가 되었다.');else sub('그것',`퍽! (${n.hp})`);}return true;}
function huntTick(dt){const n=HUNT;if(!n)return;const H=fakeFam(n).hunt||{};const dx=P.x-n.x,dz=P.z-n.z,d=Math.hypot(dx,dz);G.danger=Math.max(0,1-d/9);n.face=Math.atan2(dx,dz);
  const f=new THREE.Vector3();camera.getWorldDirection(f);const dot=-(f.x*dx+f.z*dz)/(d*Math.hypot(f.x,f.z)+1e-6);
  if(P.lamp&&P.oil>0&&d<6&&dot>.8&&H.lampWeak!==false){n.x-=dx/d*1.3*dt;n.z-=dz/d*1.3*dt;n.hp-=.45*dt;P.oil=Math.max(0,P.oil-dt*3);if(n.hp<=0)killFake(n,'등불 빛에 밀려나다 그것은 재가 되었다.');}
  else if(d>1.2){const sp=H.speed||1.7;n.x+=dx/d*sp*dt;n.z+=dz/d*sp*dt;}
  n.y=floorY(n.x,n.z,n.y);n.cd-=dt;if(d<1.35&&n.cd<=0){n.cd=1.3;P.hp--;G.hurt=1;G.shake=1;sfx('hurt');sub('아리',P.hp>0?'읏—! (체력 '+P.hp+')':'…눈앞이 캄캄해진다.');if(P.hp<=0)faint();}
  if(Math.random()<dt*3)setLook(n,Math.random()<.5?'void':n.look,n.o);}
function faint(){const n=HUNT;HUNT=null;n.state='wander';$('black').classList.add('on');setTimeout(()=>{G.t=Math.max(G.t,dayStart()+atMin(5)+55);P.hp=1;if(SPOTS.on)goSpot('cor_m',{instant:true});else{P.x=8;P.z=6;P.y=3;}$('black').classList.remove('on');sub('아리','복도 바닥에서 깨어났다. 새벽이다.',1);},2200);}
const ASH=[];function ash(x,y,z){for(let i=0;i<40;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.06),new THREE.MeshBasicMaterial({color:0x6a6a64}));m.position.set(x+(Math.random()-.5)*.5,y+Math.random(),z+(Math.random()-.5)*.5);m.v=new THREE.Vector3((Math.random()-.5)*.8,Math.random()*.5,(Math.random()-.5)*.8);scene.add(m);ASH.push(m);}}
function ashTick(dt){for(let i=ASH.length-1;i>=0;i--){const m=ASH[i];m.v.y-=dt*1.2;m.position.addScaledVector(m.v,dt);if(m.position.y<0){scene.remove(m);ASH.splice(i,1);}}}
function mossDoor(r){const d=DOORS[r];if(d.moss)return;const m=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.35),new THREE.MeshBasicMaterial({color:0x6a8a3a,transparent:true,opacity:.8}));m.rotation.x=-Math.PI/2;m.position.set(d.x,3.02,d.z+(RM[r].north?.3:-.3));scene.add(m);d.moss=m;}
function clearMoss(){Object.values(DOORS).forEach(d=>{if(d.moss){scene.remove(d.moss);d.moss=null;}});}
// 식탁 관찰·증언·방 바꾸기
function dinnerWatch(n){if(!G.served){sub('식탁','먼저 요리를 내자.');return;}if(G.dinnerObs<=0){sub('식탁','더 지켜볼 여유가 없다.');return;}G.dinnerObs--;spend(4);
  const F=fakeFam(n);let t;
  if(F){const D=F.dinner;const parts=[];if(D.eats===false)parts.push('음식에 손을 대지 않는다.');if(D.hand==='late')parts.push('숟가락을 드는 손이 남들보다 반 박자 늦다.');if(D.shadow==='shape')parts.push('벽의 그림자가 사람 모양이 아니다.');if(D.shadow==='late')parts.push('벽의 그림자가 손을 늦게 따라온다.');t=parts[Math.min(n.watched||0,parts.length-1)]||'평범하게 먹는다.';}
  else if(n.guest)t=n.guest==='merchant'?'술을 청해 마신다. 밥은 뒷전.':'조용히 기도하고 조금 먹는다.';
  else{const r=REG[n.regId];t=r.noEat?'먹지 않는다. 원래 먹지 않는다. (카드 메모)':(r.lines.eat||'평범하게 먹는다.');if(n.hurt==='moss'&&!n.cured)t+=' 먹다 말고 기침한다.';}
  n.watched=(n.watched||0)+1;sub(n.name,t,1);}
function dinnerTalk(n){if(!G.served){sub('식탁','먼저 요리를 내자.');return;}if(G.dinnerObs<=0){sub('식탁','더 물어볼 여유가 없다.');return;}G.dinnerObs--;spend(4);
  const F=fakeFam(n);let t;if(F)t=F.dinner.talk({...n,name:n.name});else if(n.guest)t=GUEST[n.guest].lines.talk;else{const r=REG[n.regId];t=r.lines.witness||r.lines.hi;
    // 짝의 증언: 같은 파티였던 사람이 가짜면 눈치챈다
    const c=n.case;if(c&&c.partner){const pc=G.cases.find(x=>x.regId===c.partner&&x.fake);if(pc)t+=` "…근데 ${REG[c.partner].name}, 계단에서 잠깐 안 보였어."`;}}
  sub(n.name,t,1);}
function swapRoom(n,r){if(G.limits.swaps<=0){sub('방','오늘은 더 바꿀 수 없다.');return;}if(OCC[r]&&OCC[r].state!=='gone'){sub('방',`${r}호는 비어 있지 않다.`);return;}if(G.stained.includes(r)){sub('방',`${r}호는 얼룩져서 못 쓴다.`);return;}
  G.limits.swaps--;const old=n.room;if(old&&OCC[old]===n)OCC[old]=null;OCC[r]=n;n.room=r;spend(3);sub(n.name,`${old}호에서 ${r}호로 방을 바꿨다.`,1);note('방',`${n.name}: ${old}호 → ${r}호`);}

// ───── 45_day.js ─────
// ───────── 인물 배우: 단골은 하나씩 고정, 가짜·손님은 그날 만든다 ─────────
const ACTOR={};let helga,dora,enoch;const RETN=[];   // RETN: 오늘 창구에 올 사람들의 배우 (옛 코드 호환)
function spawnAll(){
  helga=makeNPC('helga','helga',{},{name:STAFF.helga.name,outfitId:'helga'});placeNPC(helga,2.4,9.4);helga.face=Math.PI/2;
  dora=makeNPC('dora','dora',{},{name:'잡화상 도라',outfitId:'dora'});dora.visible=false;dora.merchantNPC=true;
  enoch=makeNPC('enoch','enoch',{},{name:'학자 에녹',outfitId:'enoch'});enoch.visible=false;enoch.merchantNPC=true;
  REG_IDS.forEach(id=>{const n=makeNPC(id,id,{},{name:REG[id].name,regId:id,hp:3});n.visible=false;n.o0={};ACTOR[id]=n;});}
function dayStart(){return (G.day-1)*1440+DAY0;}
function resetActor(n){Object.assign(n,{state:'gone',visible:false,room:null,chair:undefined,out:false,targetRoom:null,hurt:null,cured:false,fake:null,case:null,lampSeen:false,mossShown:false,woke:0,woke2:false,breakfast:false,lazy:false,shouted:false,pushed:0,barred:false,healFailed:false,grudged:false,barredReal:false,luring:false,path:[]});n.o=n.o0||{};setLook(n,n.look,n.o);}
function caseNPC(c){if(c.npc)return c.npc;let n;
  if(c.kind==='guest'){const g=GUEST[c.guest];n=makeNPC(c.guest+'_'+c.cid,c.look,c.o||{},{name:g.name,guest:c.guest,outfitId:c.guest,hp:3});}
  else if(c.fake){n=makeNPC(c.regId+'_fake'+c.cid,c.look,c.o||{},{name:c.name,regId:c.regId,outfitId:c.regId,hp:(ANOM[c.fake.fam].hunt||{}).hp||3});n.fake=c.fake;n.o0={};if(c.fake.shoes)setShoes(n,c.fake.shoes);}
  else{n=ACTOR[c.regId];resetActor(n);n.o=c.o||{};n.o0={};setLook(n,n.look,n.o);}
  n.case=c;n.hurt=c.hurt||null;n.cured=false;n.ret=caseLines(c);n.visible=false;n.state='gone';c.npc=n;if(!RETN.includes(n))RETN.push(n);return n;}
// ───────── 창구 대기열 ─────────
const QSPOT=[[24.9,9.4],[26.4,9.4],[27.9,9.4],[29.4,9.4]];
function queueTick(){const waiting=RETN.filter(n=>n.state==='queue'||n.state==='atwin'||(n.state==='walk'&&n.qTarget!==undefined));
  const atwin=RETN.find(n=>n.state==='atwin'||n.qTarget===0);
  RETN.filter(n=>n.state==='queue').forEach(n=>{const idx=waiting.indexOf(n);const slot=atwin&&atwin!==n?Math.min(3,idx):0;if(n.qTarget!==slot){n.qTarget=slot;walk(n,[QSPOT[slot]],m=>{m.state=m.qTarget===0?'atwin':'queue';if(m.qTarget===0){m.face=-Math.PI/2;sfx('bell');sub('창구','딸랑— 누군가 창구 앞에 섰다.');m.waitFrom=G.t;}});n.state='walk';}});}
function arrive(c){c.state='queue';if(c.kind==='knock3'){c.state='atwin';sfx('knock');setTimeout(()=>sfx('knock'),450);setTimeout(()=>sfx('knock'),900);sub('창구','똑. 똑. 똑. — 창구를 세 번 두드리는 소리.',1);setTimeout(()=>{if(c.state==='atwin'){c.state='gone';sub('창구','…발소리가 멀어졌다.');}},40000);return;}
  const n=caseNPC(c);n.visible=true;
  if(c.kind==='guest'){placeNPC(n,4,14);walk(n,[[4,11],[6.2,9.9]],m=>{m.state='atdesk';m.face=Math.PI;sfx('bell');sub('계산대','딸랑— 손님이 계산대에서 기다린다.');m.waitFrom=G.t;});n.state='walk';return;}
  placeNPC(n,33,9.4,0);n.state='queue';n.qTarget=undefined;queueTick();}
function admitRet(n,r){const c=n.case;OCC[r]=n;n.room=r;shutterOpen(false);sfx('stamp');note('창구',`${n.name}에게 ${r}호 열쇠를 건넸다.`);G.log.admit.push(n.uid);if(c)c.state='admitted';
  if(n.guest){tutEvent('guest');const fee=GUEST[n.guest].fee||6;money(fee,'숙박비');n.state='walk';walk(n,[[7.5,10],[23.2,8.4],[23.2,6.1],[15.5,6],RM[r].front,RM[r].inside],m=>{m.state='idle';m.face=RM[r].north?Math.PI:0;});sub(n.name,`"고맙소." 계단으로 올라간다. (숙박비 ${fee}G)`);return;}
  n.state='walk';n.qTarget=undefined;const path=[[25.3,11.2],[23,11.2],[23.2,8.4]];
  if(G.dinner&&!G.lightsOut)walk(n,path.concat(chairRoute(n)),m=>sitDown(m));
  else walk(n,path.concat([[23.2,6.1],[15.5,6],RM[r].front,RM[r].inside]),m=>{m.state='idle';m.face=RM[r].north?Math.PI:0;});
  sub(n.name,'열쇠를 받아 옆문으로 들어온다.');setTimeout(queueTick,400);}
function refuseRet(n){const c=n.case;shutterOpen(false);sfx('stamp');G.log.refuse.push(n.uid);if(c)c.state='refused';note('창구',`${n.name}을(를) 돌려보냈다.`);
  if(!n.fake&&!n.guest){G.log.refusedReal.push(n.regId);grudge(n.regId);}
  sub(n.name,n.fake?'……':'"…밖에서 자라고?"');n.state='walk';n.qTarget=undefined;walk(n,[[29,12],[36,14]],m=>{m.visible=false;m.state='gone';m.outside=true;});setTimeout(queueTick,400);}
let SHUT=0;function shutterOpen(o){SHUT=o?1:0;sfx('shutter');}
function knock3Open(){const c=G.cases.find(x=>x.kind==='knock3'&&x.state==='atwin');if(!c)return;c.state='opened';shutterOpen(true);sfx('eerie');
  setTimeout(()=>redEnd('셔터 너머에 아무도 없었다. 그리고 등 뒤에서 세 번째 노크가 들렸다.<br><b>수칙 4. 창구를 세 번 두드리면 절대 열지 마십시오.</b>'),900);}
// ───────── 식사 자리 ─────────
const CHAIRS=[[9.5,1.5,0],[11.5,1.5,0],[13.5,1.5,0],[9.5,3.5,Math.PI],[11.5,3.5,Math.PI],[13.5,3.5,Math.PI]];const CH_USED={};
function chairRoute(n){const i=CHAIRS.findIndex((c,k)=>!CH_USED[k]);if(i<0)return[[12,6.5]];CH_USED[i]=n.uid;n.chair=i;const c=CHAIRS[i];return[[12,7.4],[11,5.8],[11,4.4],[c[0],c[1]<2.5?1.0:4.2],[c[0],c[1]]];}
function sitDown(n){n.state='sit';n.face=CHAIRS[n.chair][2];}
function goEat(n){if(!n.room||n.state==='gone')return;const r=n.room;walk(n,[RM[r].inside,RM[r].front,[15.5,6],[23.2,6.1],[23.2,8.4]].concat(chairRoute(n)),m=>sitDown(m));}
function goBed(n){if(!n.room||n.state==='gone')return;const r=n.room;const pre=n.state==='sit'?[[CHAIRS[n.chair][0],CHAIRS[n.chair][1]<2.5?1.0:4.2],[11,4.4],[11,5.8],[12,7.4],[23.2,8.4],[23.2,6.1]]:[];if(n.chair!==undefined){delete CH_USED[n.chair];n.chair=undefined;}
  walk(n,pre.concat([[15.5,6],RM[r].front,RM[r].inside,RM[r].bed]),m=>{m.state='sleep';m.face=0;DOORS[r].target=0;});}
// ───────── 하루 단계 ─────────
const PH={};
PH.dawn=()=>{G.morning=true;G.night=false;G.checkout=false;G.lightsOut=false;G.dinner=false;G.served=null;G.phase='dawn';
  helga.visible=true;placeNPC(helga,5.6,3.2);helga.state='idle';helga.face=-2;
  // 밤의 결과 정리 → 창고 변화 → 새 수칙 → 저장 → 아침 장면
  nightResolve();storageMorning();const plan=todayPlan();(plan.newRules||[]).forEach(id=>{if(!G.rulesKnown.includes(id))G.rulesKnown.push(id);});if((plan.newRules||[]).length)tip('rules');
  G.limits={...CAMP.LIMITS};P.bars=CAMP.LIMITS.bars;G.dinnerObs=0;clearMoss();
  sfx('bell');sub('여관',`${G.day}일째 아침 6시. 점호 — 방마다 "빨리 일어나!"`,1);tip('roll');
  if(G.day>CAMP.DAYS){finale();return;}
  snapshot('morning');morningPanel();};
PH.market=()=>{G.phase='market';dora.visible=true;placeNPC(dora,4,14);walk(dora,[[4,11],[5.4,10.2]],m=>{m.state='shop';m.face=Math.PI;});
  if(G.day>=2){enoch.visible=true;placeNPC(enoch,4,14.5);walk(enoch,[[4.5,11.2],[7.2,10.3]],m=>{m.state='shop';m.face=Math.PI;});}
  if(todayPlan().rent){if(G.money>=CAMP.RENT){money(-CAMP.RENT,'운영비');sub('경계청',`주말 운영비 ${CAMP.RENT}G를 냈다.`,1);}else{sub('경계청',`운영비 ${CAMP.RENT}G를 낼 돈이 없다. 오늘 안에 벌지 못하면 폐업이다.`,1);G.rentDue=true;}}
  sub('여관','7시. 아침 장사 — 계산대에 도라가 왔다.'+(G.day>=2?' 학자 에녹도.':''),1);};
PH.send=()=>{G.phase='send';G.checkout=true;tip('checkout');
  NPCS.forEach(n=>{if(n.room&&n.state==='sleep'&&!n.fake&&!n.guest){n.state='idle';n.woke2=true;setTimeout(()=>leaveInn(n),400);}});   // 못 깨운 사람은 스스로 나간다 (실은 안 오른다)
  NPCS.filter(n=>n.breakfast&&n.state==='sit').forEach(leaveInn);
  sub('여관','9시. 체크아웃. 손님들이 떠난다. 11시까지 게시판에서 파티를 보낸다.',1);};
PH.noon=()=>{G.phase='noon';G.morning=false;G.checkout=false;[dora,enoch].forEach(m=>{if(m.visible){m.state='walk';walk(m,[[4,11],[4,14]],x=>{x.visible=false;x.state='gone';});}});
  NPCS.forEach(n=>{if(n.guest&&n.room&&n.state!=='gone'){OCC[n.room]=null;n.room=null;n.visible=false;n.state='gone';}});
  if(!G.sent.length){G.cases=buildQueue();sub('여관','11시. 오늘은 아무도 보내지 않았다. 저녁 창구는 조용할 것이다.',1);}else sub('여관','11시. 파티가 미궁에 있다. 오후까지 쉬거나(계산대) 저녁을 준비한다.',1);tip('noon');};
PH.evening=()=>{G.phase='evening';G.closedWindow=false;RETN.length=0;G.cases.forEach(c=>{if(c.kind!=='knock3')caseNPC(c);});snapshot('evening');sub('여관','4시 반. 창구를 연다. 보낸 사람들이 돌아올 시간이다.',1);};
PH.dinner=()=>{G.phase='dinner';G.dinner=true;sub('헬가','"밥 먹자! 다들 식당으로!"',1);tip('dinner');NPCS.forEach(n=>{if(n.room&&n.state==='idle')goEat(n);});};
PH.lightsOut=()=>{G.phase='lightsOut';G.lightsOut=true;G.night=true;G.dinner=false;sfx('eerie');sub('여관','밤 9시. 등잔이 꺼진다. 이제 복도를 걷는 것은 당신뿐이어야 한다.',1);tip('night');
  NPCS.forEach(n=>{if(n.room&&n.state!=='gone'&&n.state!=='sleep')goBed(n);});
  walk(helga,[[3.6,5.8],[4,11],[4,14]],m=>{m.visible=false;m.state='gone';});
  RETN.filter(n=>['queue','atwin','walk'].includes(n.state)&&n.case&&['queue','due'].includes(n.case.state)).forEach(n=>{n.state='walk';n.case.state='late';walk(n,[[29,12],[36,14]],m=>{m.visible=false;m.state='gone';m.outside=true;});if(!n.fake)G.log.late.push(n.regId||n.uid);});
  G.cases.forEach(c=>{if(c.state==='due')c.state='late';if(c.kind==='knock3'&&c.state==='atwin')c.state='gone';});
  G.limits.bars=CAMP.LIMITS.bars;G.limits.openDoor=CAMP.LIMITS.openDoor;G.limits.hangLamp=CAMP.LIMITS.hangLamp;snapshot('night');};
PH.deep=()=>{G.phase='deep';NPCS.forEach(n=>{if(n.room&&n.state==='sleep'&&n.hurt==='moss'&&!n.cured&&!n.fake){ROOMST[n.room].moss=1;mossDoor(n.room);}});};
PH.predawn=()=>{G.phase='predawn';sub('여관','창밖이 희미하게 밝아 온다.');nightPlansResolve();};
function schedule(){const d0=Math.floor((G.t-DAY0)/1440)+1;if(d0!==G.day)G.day=d0;const m=dm();CAMP.timeline.forEach(ph=>{const key=G.day+':'+ph.id;if(G.fired[key]||m<phAt(ph))return;G.fired[key]=1;if(PH[ph.id])PH[ph.id]();});
  // 귀환자 도착
  if(G.phase==='evening'||G.phase==='dinner'){G.cases.forEach(c=>{if(c.state==='due'&&m>=c.at)arrive(c);});}
  if(G.night)nightTick();
  // 하루가 넘어간다: 다음 날 06:00
  const d=Math.floor((G.t-DAY0)/1440)+1;if(d!==G.day)G.day=d;}
// ───────── 밤: 그것의 계획 ─────────
function neighborsOf(r){const i=ROOMS.indexOf(r);return [ROOMS[i-1],ROOMS[i+1],ROOMS[(i+3)%6]].filter(x=>x!==undefined);}
function nightTick(){const m=dm();
  NPCS.forEach(n=>{if(!n.fake||n.state==='gone'||!n.room)return;const F=ANOM[n.fake.fam],N=F.night;const outAt=atMin((N.outAt||90)/60);
    if(!n.out&&!n.barred&&!n.luring&&n.state==='sleep'&&m>=outAt){
      if(DOORS[n.room].locked){n.barred=true;sfx('scratch');return;}
      const plan=n.fake.plan||N.plan;
      if(plan==='swap'){n.out=true;const cand=neighborsOf(n.room).filter(r=>{const o=occOf(r);return o&&o!==n&&o.state==='sleep'&&!o.fake&&!DOORS[r].lampHung;});n.targetRoom=cand[0]||null;
        DOORS[n.room].target=1;DOORS[n.room].npcHold=2;n.look=n.regId||n.look;tip('fake');
        walk(n,[RM[n.room].front,[8,6],n.targetRoom?RM[n.targetRoom].front:[2,6]],x=>{x.state='scratch';});}
      else if(plan==='flee'){n.out=true;n.state='gone';n.visible=false;n.fled=true;G.log.fled.push(n.name);if(OCC[n.room]===n){OCC[n.room]=null;}sfx('creak');}
      else if(plan==='lure'){n.luring=true;n.lureT=0;}}
    if(n.luring&&n.state==='sleep'){n.lureT=(n.lureT||0)+1/60;if(P.y>1.5&&Math.hypot(P.x-n.x,P.z-n.z)<7&&n.lureT>4){n.lureT=0;sfx('eerie');sub(n.name,'"손님… 문 좀 열어 주십시오. 등불은 끄시고."');}}});
  // 03:00 감염이 옆방으로
  if(m>=atMin(3)&&!G.fired[G.day+':spread']){G.fired[G.day+':spread']=1;NPCS.forEach(n=>{if(!n.room||n.state!=='sleep'||n.hurt!=='moss'||n.cured||n.fake)return;neighborsOf(n.room).forEach(r=>{const o=occOf(r);if(o&&o.state==='sleep'&&!o.fake&&!o.hurt){o.hurt='moss';if(o.regId)G.regs[o.regId].hurt='moss';ROOMST[r].moss=1;mossDoor(r);G.log.spread++;}});});}
  const f=NPCS.find(x=>x.fake&&x.state==='scratch');if(f&&!HUNT){const d=Math.hypot(P.x-f.x,P.z-f.z);if(P.y>1.5&&d<7)startHunt(f);else if(Math.random()<.01)sfx('scratch');}}
function nightPlansResolve(){NPCS.forEach(n=>{if(!n.fake||n.state==='gone')return;
  if(n.state==='scratch'||n.state==='wander'||n.state==='hunt'){const t=n.targetRoom,v=t?occOf(t):null;
    if(v&&v.state==='sleep'&&!DOORS[t].locked&&!DOORS[t].lampHung){OCC[t]=null;v.visible=false;v.state='gone';v.missing=true;G.log.missing.push(v.regId||v.uid);if(v.regId)G.regs[v.regId].gone='missing';ROOMST[t].stain=true;if(!G.stained.includes(t))G.stained.push(t);}
    n.state='gone';n.visible=false;if(n.room&&OCC[n.room]===n)OCC[n.room]=null;HUNT=null;}
  else if(n.luring){n.luring=false;n.state='gone';n.visible=false;if(OCC[n.room]===n)OCC[n.room]=null;G.log.lured=true;}
  else if(n.barred){G.log.barred.push(n.name);}});}
// ───────── 아침: 결과와 창고 ─────────
function nightResolve(){const L=G.log,T=CAMP.thread,R=[];
  L.missing.forEach(id=>{thread(T.missing);const n=NPCS.find(x=>x.uid===id);R.push({k:'bad',t:DLG.morning.missing(n?n.name:nameOf(id))});});
  G.stained.forEach(r=>{if(!L.stainedSeen)R.push({k:'bad',t:DLG.morning.stain(r)});});
  L.fled.forEach(nm=>{thread(-1);R.push({k:'bad',t:DLG.morning.fled(nm)});});
  L.barred.forEach(nm=>{thread(T.barred);R.push({k:'good',t:DLG.morning.barred(nm)});});
  L.killed.forEach(nm=>R.push({k:'good',t:DLG.morning.killed}));
  if(L.lured)R.push({k:'warn',t:'순례자의 방이 비어 있다. 방바닥에 잿빛 발자국.'});
  L.late.forEach(id=>{thread(T.late);grudge(id);R.push({k:'warn',t:DLG.morning.late(nameOf(id))});});
  L.refusedReal.forEach(id=>{thread(T.refusedReal);if(rnd()<.5&&G.regs[id]&&!G.regs[id].hurt)G.regs[id].hurt='moss';R.push({k:'warn',t:DLG.morning.refused(nameOf(id))});});
  if(L.enoch)R.push({k:'bad',t:DLG.morning.enoch});
  NPCS.forEach(n=>{if(n.room&&n.state==='sleep'&&n.hurt&&!n.cured&&!n.fake)R.push({k:'warn',t:DLG.morning.sick(n.name)});});
  NPCS.forEach(n=>{if(n.room&&n.state==='sleep'&&n.fake&&!n.barred)R.push({k:'warn',t:`${n.room}호는 밤새 조용했다. …너무 조용했다.`});});
  // 바꿔치기: 옆방 단골이 사라진 뒤에도 방에 남은 "그것"은 아침에 없다
  G.morningCards=R;G.days.push({day:G.day-1,thread:G.thread,money:G.money,cards:R});
  G.log=newLog();G.stainedSeen=true;}
function storageMorning(){const R=G.morningCards;
  Object.keys(G.inv).forEach(k=>{const it=ITEM[k];if(it.cursed==='leaf'){const n=G.inv[k];delete G.inv[k];addInv('leaf',n);R.push({k:'bad',t:DLG.morning.cursed(it.n)});}else if(it.cursed==='gone'){delete G.inv[k];R.push({k:'bad',t:DLG.morning.gone(it.n)});}});
  const sp=[];G.shelf=G.shelf.filter(u=>{const it=ITEM[u.k];if(it.cursed==='leaf'){sp.push(it.n);return false;}if(it.cursed==='gone'){sp.push(it.n);return false;}return true;});
  if(sp.length)R.push({k:'bad',t:`선반의 ${sp.join(', ')}이(가) 아침에 나뭇잎이 되어 있다.`});
  refreshShelf();}
function morningPanel(){const cards=G.morningCards||[];const html=`<div class="endc"><h2>${G.day}일째 아침</h2>
   <div class="sum"><div><b>${G.thread}</b>경계의 실</div><div><b>${G.money}G</b>돈</div><div><b>${NPCS.filter(n=>n.room&&n.state==='sleep').length}</b>깨울 방</div><div><b>${G.stained.length}</b>얼룩진 방</div></div>
   <ul class="mcards">${cards.length?cards.map(c=>`<li class="${c.k}">${josa(c.t)}</li>`).join(''):'<li class="good">조용한 밤이었다.</li>'}</ul>
   <p class="nobuy">점호로 깨운 사람마다 실이 한 땀 꿰매진다. 9시 체크아웃, 11시까지 파티 보내기.</p><button class="primary" id="mOk">점호를 시작한다</button></div>`;
  openWin('morning',josa(html),0);$('mOk').onclick=()=>{closeWin();relock();};}
// ───────── 붉은 끝과 마지막 결산 ─────────
function redEnd(msg){G.over=true;controls.unlock();const snap=loadSave();
  openWin('red',`<div class="endc red"><h2>붉은 수칙</h2><p>${msg}</p><p class="nobuy">붉은 줄을 어기면 그 저녁 처음부터다.</p><button class="primary" id="redRetry">${snap&&snap.tag?'그 '+({morning:'아침',evening:'저녁',night:'밤'}[snap.tag]||'때')+'부터 다시':'처음부터'}</button></div>`,0);
  $('redRetry').onclick=()=>{location.reload();};}
function finale(){G.over=true;controls.unlock();const lost=REG_IDS.filter(id=>G.regs[id].gone);const rentFail=G.rentDue&&G.money<0;
  const h=`<div class="endc"><h2>${CAMP.DAYS}일이 지났다 — 결산</h2>
   <div class="sum"><div><b>${G.thread}/${CAMP.THREAD_MAX}</b>경계의 실</div><div><b>${G.money}G</b>돈</div><div><b>${lost.length}</b>사라진 단골</div><div><b>${G.stained.length}</b>얼룩진 방</div><div><b>${REG_IDS.filter(id=>G.regs[id].grudge>0).length}</b>원망하는 단골</div></div>
   <ul>${G.days.map(d=>`<li><b>${d.day}일째</b> 실 ${d.thread} · ${d.money}G — ${d.cards.filter(c=>c.k!=='good').slice(0,2).map(c=>c.t).join(' / ')||'조용한 밤'}</li>`).join('')}${lost.map(id=>`<li><b>${nameOf(id)}</b>: ${G.regs[id].gone==='missing'?'방에서 사라졌다. 벽에 잿빛 얼룩. 다시 보낼 수 없다.':'길드를 떠났다.'}</li>`).join('')}</ul>
   <p class="nobuy">${G.thread<=0?'실이 다 풀렸다. 여관이 미궁에 먹힌다.':G.thread>=CAMP.THREAD_MAX?'실이 팽팽하다. 마그다가 좋아했을 것이다.':'실은 아직 버틴다.'} 느낌(조작·시간 흐름·밤의 분위기)이 어땠는지 알려 주세요.</p>
   <button class="primary" onclick="localStorage.removeItem('${SAVE_KEY}');location.reload()">처음부터</button></div>`;
  openWin('end',josa(h),0);clearSave();}
// ───────── 이어하기: 스냅숏에서 세상을 다시 세운다 ─────────
function restoreFrom(snap){try{if(!snap||!snap.G)return false;
  Object.keys(snap.G).forEach(k=>{G[k]=snap.G[k];});G.started=false;G.over=false;G.cases=[];G.scale=1;G.force=false;G.threadFlash=0;
  Object.assign(P,snap.P||{});P.lamp=false;if(SPOTS.on)goSpot(snap.spot&&SPOTS.by[snap.spot]?snap.spot:SPD.START,{instant:true});
  Object.keys(ROOMST).forEach(r=>Object.assign(ROOMST[r],(snap.rooms||{})[r]||{}));
  Object.entries(snap.doors||{}).forEach(([k,d])=>{if(DOORS[k]){DOORS[k].locked=!!d.locked;DOORS[k].target=0;}});
  ROOMS.forEach(r=>{OCC[r]=null;});NPCS.forEach(n=>{if(n.uid==='helga'||n.merchantNPC)return;resetActor(n);});RETN.length=0;Object.keys(CH_USED).forEach(k=>delete CH_USED[k]);
  G.cases=(snap.cases||[]).map(c=>({...c}));
  G.cases.forEach(c=>{if(c.kind==='knock3')return;const n=caseNPC(c);const ent=Object.entries(snap.occ||{}).find(([r,o])=>o.uid===n.uid);
    if(ent){const r=+ent[0];OCC[r]=n;n.room=r;n.visible=true;const st=ent[1].state;if(st==='sleep'){placeNPC(n,RM[r].bed[0],RM[r].bed[1],3);n.state='sleep';n.face=0;}else{placeNPC(n,RM[r].inside[0],RM[r].inside[1],3);n.state='idle';}}
    else if(c.state==='due'||c.state==='queue'){c.state='due';}});
  helga.visible=!G.night;placeNPC(helga,5.6,3.2);helga.state='idle';helga.face=-2;
  if(snap.tag==='morning')setTimeout(morningPanel,300);
  refreshShelf();renderBelt();return true;}catch(e){console.error('restore',e);return false;}}

// ───── 50_mood.js ─────
// ───────── 시간대 분위기 ─────────
const C3=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),Math.max(0,Math.min(1,t)));
function tod(){const h=((G.t/60)%24+24)%24;
  const night=(h>=21||h<5)?1:(h>=19&&h<21)?(h-19)/2:(h>=5&&h<6.5)?1-(h-5)/1.5:0;
  const dusk=(h>=16.5&&h<21)?Math.sin((h-16.5)/4.5*Math.PI):0;
  const dawn=(h>=4.5&&h<7.5)?Math.sin((h-4.5)/3*Math.PI):0;return{h,night,dusk,dawn};}
let FT=0;
function atmosphere(dt){const {h,night,dusk,dawn}=tod();FT+=dt;
  const day=1-night;
  const el=Math.sin(((h-6)/14)*Math.PI);sun.intensity=Math.max(0,day*(1-dusk*.45)*1.3*Math.min(1,Math.max(0,(el-.05)/.2)));sun.color.copy(C3(0xfff2dc,0xff9a55,dusk));
  const ang=((h-6)/14)*Math.PI;sun.position.set(12+30*Math.cos(ang),30*Math.max(.3,Math.sin(ang)),28);SHT-=dt;if(sun.intensity>.01&&(SHT<=0||(G.doorMoving&&SHT<1.2))){SHT=1.5;renderer.shadowMap.needsUpdate=true;}G.doorMoving=false;
  hemi.intensity=.1+day*.7;scene.environmentIntensity=.1+day*.5;FACADE.emissiveIntensity=night*1.3+dusk*.35;hemi.color.copy(C3(C3(0xdfe8ff,0xffc890,dusk),0x2a3450,night));hemi.groundColor.copy(C3(0x3a2a1c,0x0a0808,night));
  const sky=C3(C3(0x9fc4e0,0xd9824a,dusk),C3(0x070a12,0x8a98b0,dawn*.7),night*.95+dawn*.05);scene.background=sky;
  scene.fog=scene.fog||new THREE.FogExp2(0x000000,.02);scene.fog.color.copy(C3(sky,0x05060a,night*.8));scene.fog.density=.012+night*.075+G.danger*.03;
  const lampOn=(h>=16.8||h<9.5)&&!G.lightsOut,lampCol=(OILS[G.oilPick]||OILS.oil).color;lantern.color.setHex(lampCol);const fl=k=>.85+.15*Math.sin(FT*9+k*3)*Math.sin(FT*4.3+k);
  LIGHTS.hearth.l.intensity=(G.lightsOut?.25:LIGHTS.hearth.base)*fl(1);LIGHTS.hearth2.l.intensity=(G.lightsOut?.45:LIGHTS.hearth2.base)*fl(2);
  ['dine','counter','cor0','cor1','hallc'].forEach((k,i)=>LIGHTS[k].l.intensity=lampOn?LIGHTS[k].base*fl(i+3):0);
  ['dine','hall','cor','room'].forEach(k=>setFlames(k,lampOn));setFlames('hearth',true,G.lightsOut?.4:1);setFlames('hearth2',true,G.lightsOut?.5:1);setFlames('alley',h>=18||h<6.2);
  LIGHTS.alley.l.intensity=(h>=18||h<6.2)?LIGHTS.alley.base*fl(7):0;
  endWin.material.color.copy(C3(C3(0x9fc4e0,0x0c1422,night),0x8a9ab8,dawn));
  LIGHTS.moon.l.intensity=(night*.9+dawn*1.1)*(1+.08*Math.sin(FT*.7));LIGHTS.moon.l.color.copy(C3(0x8fa4cc,0xc8d4e8,dawn));
  const lit=P.lamp&&P.oil>0&&G.started,belt=!lit&&P.oil>0&&G.started&&night>.5;
  lantern.distance=lit?9:3.2;lantern.intensity=lit?Math.min(1,P.oil/15)*(1.9+Math.sin(FT*11)*.12+(G.mouse?.6:0)):belt?.55+Math.sin(FT*7)*.05:0;
  NPCS.filter(x=>x.fake).forEach(fk=>dollGlow(fk,fk.out&&fk.state!=='gone'?(.16+.08*Math.sin(FT*2.3))*night:0));
  if(lit&&!G.over)P.oil=Math.max(0,P.oil-dt*G.scale*.35);if(P.lamp&&P.oil<=0&&G.started){setLamp(false);sub('등불','기름이 다 떨어졌다.');}
  G.flick=Math.max(0,(G.flick||0)-dt*2.5);G.hurt=Math.max(0,(G.hurt||0)-dt*1.2);G.shake=Math.max(0,G.shake-dt*2);
  const randFlick=night>.6&&Math.random()<dt*.15?.5:0;
  const U=mood.uniforms;U.uTime.value=FT;U.uNight.value=night;U.uDusk.value=dusk*.8;U.uDawn.value=dawn;U.uDanger.value=G.danger;U.uFlick.value=Math.max(G.flick,randFlick);U.uHurt.value=G.hurt;
  shutter.position.y=1.6+SHUT_Y;SHUT_Y+=(SHUT*1.25-SHUT_Y)*Math.min(1,dt*5);
  fire1.material.color.setHSL(.05,1,.2+.06*Math.sin(FT*13));fire2.material.color.setHSL(.05,1,(G.lightsOut?.12:.2)+.06*Math.sin(FT*11));}
let SHUT_Y=0,SHT=0;

// ───────── 소리 (합성) ─────────
let AC=null,MASTER=null,LP=null,AMB=null,NB=null;
function audioInit(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();LP=AC.createBiquadFilter();LP.type='lowpass';LP.frequency.value=18000;MASTER=AC.createGain();MASTER.gain.value=+($('setVol').value||.9);LP.connect(MASTER);MASTER.connect(AC.destination);
  NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=NB.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b=(b+.02*w)/1.02;d[i]=w*.5+b*3;}
  const loop=(type,f,q)=>{const s=AC.createBufferSource();s.buffer=NB;s.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(LP);s.start();return{g,fl};};
  AMB={town:loop('lowpass',380,.6),wind:loop('bandpass',420,1.4),fire:loop('bandpass',1400,.5)};loadSfx();}catch(e){AC=null;}}
function tone(type,f,a,dur,st=0,f2){if(!AC)return;const t0=AC.currentTime+st,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+dur);g.gain.setValueAtTime(a,t0);g.gain.exponentialRampToValueAtTime(.0005,t0+dur);o.connect(g);g.connect(LP);o.start(t0);o.stop(t0+dur+.03);}
function noise(dur,type,f,a,st=0,q=.7){if(!AC)return;const t0=AC.currentTime+st,s=AC.createBufferSource();s.buffer=NB;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain();g.gain.setValueAtTime(a,t0);g.gain.exponentialRampToValueAtTime(.0005,t0+dur);s.connect(fl);fl.connect(g);g.connect(LP);s.start(t0,Math.random());s.stop(t0+dur+.03);}
function sfx(k){if(!AC)return;if(ASSETS.sfx[k]&&playSfxFile(k,{step:.35,flip:.5,coin:.6}[k]||.7))return;
  if(k==='step'){noise(.08,'lowpass',P.y>.5&&P.y<2.5?700:520,.35);}
  else if(k==='knock'){tone('sine',130,.6,.14);tone('sine',120,.6,.14,.2);}
  else if(k==='door'){tone('sawtooth',160,.05,.5,0,95);noise(.4,'bandpass',500,.1);}
  else if(k==='bell'){tone('triangle',1760,.18,1.1);tone('sine',2640,.07,.8);}
  else if(k==='stamp'){tone('square',90,.25,.12);}
  else if(k==='wood'){tone('square',150,.14,.07);noise(.1,'lowpass',600,.3);tone('square',110,.12,.08,.09);}
  else if(k==='shutter'){noise(.45,'lowpass',900,.25);}
  else if(k==='bubble'){for(let i=0;i<4;i++)tone('sine',280+Math.random()*380,.06,.12,i*.09);}
  else if(k==='hiss'){noise(1.2,'highpass',3000,.25);}
  else if(k==='eerie'){tone('sine',220,.12,1.8);tone('sine',233,.12,1.8);}
  else if(k==='scratch'){for(let i=0;i<5;i++)noise(.07,'bandpass',2600,.18,i*.12,3);}
  else if(k==='swing'){noise(.18,'bandpass',900,.25,0,1.5);}
  else if(k==='hit'){tone('sine',90,.7,.18);noise(.12,'lowpass',400,.4);}
  else if(k==='hurt'){tone('sine',70,.8,.35);noise(.3,'lowpass',300,.5);}
  else if(k==='coin'){tone('triangle',1320,.12,.2);}
  else if(k==='flip'){tone('triangle',900,.05,.06);}
  else if(k==='shout'){tone('sawtooth',210,.08,.25,0,180);}
  else if(k==='cough'){noise(.15,'bandpass',900,.4,0,2);noise(.12,'bandpass',800,.3,.25,2);}
  else if(k==='heart'){tone('sine',55,.8,.12);tone('sine',50,.6,.14,.18);}
  else if(k==='chirp'){const f=2400+Math.random()*1500;tone('sine',f,.03,.12,0,f*1.3);tone('sine',f*1.1,.025,.1,.15,f*.9);}
  else if(k==='cricket'){for(let i=0;i<3;i++)tone('square',4300,.012,.03,i*.05);}
  else if(k==='creak'){tone('sawtooth',120+Math.random()*60,.035,.7,0,80);}
  else if(k==='farstep'){for(let i=0;i<3;i++)noise(.07,'lowpass',320,.12,i*.5);}}
let HB=0;
function ambience(dt){if(!AC||!AMB)return;const {night,dusk}=tod();const out=P.x>23.5||P.z>12;
  AMB.town.g.gain.value=(1-night)*(1-dusk*.6)*(out?.08:.035);AMB.wind.g.gain.value=night*(.05+.04*Math.sin(FT*.3));AMB.wind.fl.frequency.value=360+120*Math.sin(FT*.21);
  const dh=Math.min(Math.hypot(P.x-.6,P.z-9.5),Math.hypot(P.x-3.5,P.z-2.4));AMB.fire.g.gain.value=P.y<1.5?Math.max(0,.05-dh*.006):0;
  if(Math.random()<dt*.5*(1-night-dusk*.5))sfx('chirp');
  if(Math.random()<dt*1.2*Math.max(dusk,night*.6)*(night>.95?.4:1))sfx('cricket');
  if(night>.7&&Math.random()<dt*.06)sfx('creak');if(night>.8&&Math.random()<dt*.025)sfx('farstep');
  LP.frequency.value=Math.max(500,18000-G.danger*15500-(LEAN?15000:0));
  if(G.danger>.15){HB-=dt;if(HB<=0){HB=1.1-G.danger*.6;sfx('heart');}}
  NPCS.forEach(n=>{if(n.hurt==='moss'&&!n.cured&&n.visible&&Math.random()<dt*.08&&Math.hypot(P.x-n.x,P.z-n.z)<9)sfx('cough');});}

// ───────── HUD ─────────
let HT=0;
function hudTick(dt){HT-=dt;SUBT-=dt;if(SUBT<=0)$('sub').classList.remove('show');tipTick(dt);stationLive(dt);
  if(HT>0)return;HT=.15;const {h}=tod();
  const ph=CAMP.timeline.slice().reverse().find(p=>G.fired[G.day+':'+p.id]);
  const spd=G.speed/(60/CAMP.HOUR_SEC);$('clock').innerHTML=`<small>${G.day}일째</small><b>${hhmm(G.t)}</b><span>${ph?ph.label:''}${Math.abs(spd-1)>.01?` <em>×${spd.toFixed(0)}</em>`:''}</span>`;
  const tf=G.threadFlash||0;if(tf)G.threadFlash=0;
  $('stats').innerHTML=`<span class="thr ${tf>0?'up':tf<0?'down':''}" title="경계의 실">${'┃'.repeat(Math.max(0,Math.round(G.thread/CAMP.THREAD_MAX*10)))}<i>${'┃'.repeat(10-Math.max(0,Math.round(G.thread/CAMP.THREAD_MAX*10)))}</i> ${G.thread}</span><span class="hp">${'●'.repeat(Math.max(0,P.hp))}${'○'.repeat(Math.max(0,3-P.hp))}</span><span>${G.money}G</span>`;
  const og=$('belt').querySelector('.og i');if(og)og.style.width=P.oil+'%';
  const o=OBJ();G.obj=o;const oh=`<small>${o.tut?'헬가의 안내':'지금 할 일'}</small><b class="${o.hot?'hot':''}">${josa(o.t)}</b><span>${josa(o.w||'')}</span>`;if($('obj').dataset.h!==oh){$('obj').dataset.h=oh;$('obj').innerHTML=oh;}
  const td=[];
  if(POT.state==='burnt')td.push(['hot','솥이 넘쳤다 (부엌)']);else if(POT.state==='cook')td.push(['','솥이 끓는 중…']);else if(POT.state==='ready')td.push(['hot','솥 — 떠낼 것']);
  const dk=NPCS.find(n=>n.state==='atdesk');if(dk)td.push(['hot','계산대에 손님']);
  const w=NPCS.find(n=>n.state==='atwin');if(w)td.push(['hot',`창구에 ${w.name}`]);const q=NPCS.filter(n=>n.state==='queue').length;if(q)td.push(['',`골목에 ${q}명 대기`]);
  if(G.dinner&&!G.served)td.push([P.held&&ITEM[P.held]&&ITEM[P.held].kind==='dish'?'hot':'','식당에 요리 내기']);
  if(G.dinner&&G.served)td.push(['',`식탁 관찰 ${G.dinnerObs}번 · 방 바꾸기 ${G.limits.swaps}번`]);
  if(G.morning){const left=NPCS.filter(n=>n.room&&n.state==='sleep').length;if(left)td.push([left?'hot':'',`점호 — 깨울 방 ${left}곳`]);}
  if(G.night)td.push(['',`빗장 ${P.bars} · 등불 걸기 ${G.limits.hangLamp} · 문 열기 ${G.limits.openDoor}`]);
  $('todo').innerHTML=td.filter(x=>!o.t.includes(x[1].slice(0,4))).slice(0,4).map(([c,t])=>`<li class="${c}">${josa(t)}</li>`).join('');}
// 목표 표시: 금색 고리 (화면 밖이면 가장자리 화살표)
const MV=new THREE.Vector3();
function markTick(dt){const o=G.obj,m=$('mark'),ed=$('edges');G.markFlash=Math.max(0,(G.markFlash||0)-dt);
  if(!o||!o.pos||WIN||!G.started||G.over){m.hidden=true;ed.innerHTML='';return;}
  MV.set(o.pos[0],o.pos[1],o.pos[2]);const dist=Math.hypot(o.pos[0]-P.x,o.pos[2]-P.z);MV.project(camera);
  const on=MV.z<1&&Math.abs(MV.x)<.92&&Math.abs(MV.y)<.9,tf=o.pos[1]>2.9?2:1,pf=P.y>1.5?2:1,lab=o.l||o.w.split(/[—.(]/)[0].trim();
  if(tf!==pf){m.hidden=true;const eh=`<div class="edge b">${tf>pf?'↑ 위층':'↓ 아래층'} — ${lab}</div>`;if(ed.dataset.h!==eh){ed.dataset.h=eh;ed.innerHTML=eh;}return;}
  if(on){if(dist<2.6||Math.hypot(MV.x*innerWidth,MV.y*innerHeight)<70){m.hidden=true;}else{m.hidden=false;m.style.left=((MV.x+1)/2*innerWidth)+'px';m.style.top=((1-MV.y)/2*innerHeight)+'px';m.querySelector('i').textContent=Math.round(dist)+'m';m.classList.toggle('flash',G.markFlash>0);}ed.innerHTML='';}
  else{m.hidden=true;const f=new THREE.Vector3();camera.getWorldDirection(f);let a=Math.atan2(o.pos[0]-P.x,o.pos[2]-P.z)-Math.atan2(f.x,f.z);while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;
    const L=a>0,back=Math.abs(a)>2.4;const eh=`<div class="edge ${back?'b':L?'l':'r'}">${back?'↓ 뒤쪽':L?'◀':''} ${lab} ${!back&&!L?'▶':''}</div>`;if(ed.dataset.h!==eh){ed.dataset.h=eh;ed.innerHTML=eh;}}}
// 대기 손님 인내심
function patience(){const w=NPCS.find(n=>n.state==='atwin');if(w&&!WIN){const wt=G.t-w.waitFrom;if(wt>60&&!w.knocked){w.knocked=1;sfx('knock');sfx('knock');sub(w.name,'창구를 두드린다. "저기요!"');}if(wt>150){refuseRet(w);w.gaveUp=true;if(w.case)w.case.state='late';sub('창구',`${w.name}은(는) 기다리다 지쳐 돌아갔다.`,1);}}
  const d=NPCS.find(n=>n.state==='atdesk');if(TUT_OVER&&d&&G.t-d.waitFrom>120){d.state='walk';walk(d,[[4,11],[4,14]],m=>{m.visible=false;m.state='gone';});if(d.case)d.case.state='gone';sub('계산대',`기다리던 ${d.name}이(가) 가 버렸다.`,1);}}

// ───────── 시작·루프 ─────────
spawnAll();buildShelf();renderBelt();resize();assetsInit();
let last=performance.now(),PRE=0;
// 처음 보는 재질이 화면에 들어올 때마다 셰이더를 컴파일하느라 0.3~0.5초씩 멈췄다 → 시작 화면에서 전부 미리 컴파일
function precompile(){const t0=performance.now();try{const vis=NPCS.map(n=>[n,n.g.visible]);NPCS.forEach(n=>n.g.visible=true);DUST.visible=true;
  renderer.setRenderTarget(composer.readBuffer);renderer.compile(scene,camera);renderer.setRenderTarget(null);vis.forEach(([n,v])=>n.g.visible=v);DUST.visible=!!SEAT;}catch(e){console.warn('precompile',e);}
  G.preMs=Math.round(performance.now()-t0);const b=$('startBtn');b.disabled=false;b.textContent='처음부터';$('contBtn').disabled=false;}
// 자동 해상도: 1초 평균 프레임이 느리면 내부 해상도를 낮추고, 여유가 생기면 되돌린다 (가장 낮을 때는 접촉 그림자 끔)
const AR={acc:0,n:0,t:0,cool:0};
function autoRes(dt){if(!G.started||QF.has('fixres'))return;AR.acc+=dt;AR.n++;AR.t+=dt;AR.cool-=dt;if(AR.t<1)return;const avg=AR.acc/AR.n*1000;AR.acc=AR.n=AR.t=0;G.fps=Math.round(1000/avg);
  if(avg>19&&PIX<2.4){PIX=Math.min(2.4,PIX+.25);AR.cool=6;resize();}else if(avg<17.5&&PIX>BASEPIX&&AR.cool<=0){PIX=Math.max(BASEPIX,PIX-.1);AR.cool=2;resize();}
  mood.uniforms.uAO.value=PIX>=2.2?0:1;}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(PRE<3){PRE++;if(PRE===2)precompile();}autoRes((now-(loop.lt||now))/1000);loop.lt=now;
  const run=G.started&&!G.over&&(RUNNING()||WIN||G.force);const gdt=run?dt*G.scale:0;
  if(run)G.t+=gdt*G.speed*(G.tutSlow?.5:1);
  movePlayer(dt);vmTick(dt,!!P.moving&&!SEAT);updateNPCs(run?gdt*(G.npcMul||1):0);updateDoors(dt);potTick(gdt*(G.npcMul||1));
  if(run){schedule();queueTick();patience();if(!SPOTS.travel)huntTick(gdt);}stationTick();
  ashTick(dt);atmosphere(dt);ambience(dt);aim();hudTick(dt);markTick(dt);
  // 떠도는 가짜 근처는 위험
  if(!HUNT){const f=fakeOut();G.danger=f&&P.y>1.5?Math.max(0,1-Math.hypot(P.x-f.x,P.z-f.z)/10)*.7:Math.max(0,G.danger-dt);}
  renderFrame();}
requestAnimationFrame(loop);
$('startBtn').disabled=true;$('startBtn').textContent='여관을 준비하는 중…';
function beginGame(cont){$('start').hidden=true;audioInit();if(AC&&AC.state==='suspended')AC.resume();
  const snap=cont?loadSave():null;if(snap&&restoreFrom(snap)){G.started=true;relock();sub('여관',`${G.day}일째 ${({morning:'아침',evening:'저녁',night:'밤'})[snap.tag]||''}부터 이어서.`,1);return;}
  freshState();G.started=true;relock();G.tutSlow=true;sub('헬가','"아리! 이리 와 봐."');}
$('startBtn').onclick=()=>beginGame(false);$('contBtn').onclick=()=>beginGame(true);
if(hasSave()){const sv=loadSave();$('contBtn').hidden=false;$('contBtn').textContent=`이어하기 — ${sv.G.day}일째 ${({morning:'아침',evening:'저녁',night:'밤'})[sv.tag]||''}`;}
window.__g={G,P,NPCS,RETN,OCC,DOORS,POT,ACTOR,STATIONS,SEND,REG,ITEM,setTime:m=>{G.t=m;},setDM:m=>{G.t=dayStart()+m;},dm,tp:(x,z,y=0)=>{P.x=x;P.z=z;P.y=y;},look:(yaw,pitch=0)=>{camera.rotation.set(pitch,yaw,0,'YXZ');},
  start:(cont)=>{$('start').hidden=true;const snap=cont?loadSave():null;if(snap&&restoreFrom(snap)){G.started=true;return;}freshState();G.started=true;G.tutSlow=true;},
  admit:(uid,r)=>{const n=NPCS.find(x=>x.uid===uid);admitRet(n,r);},refuse:uid=>{const n=NPCS.find(x=>x.uid===uid);refuseRet(n);},
  doit:(it,k,uid)=>{const n=uid?NPCS.find(x=>x.uid===uid):null;const i=ACT(it,n);const a=i&&i.verbs.find(v=>v.k===k);if(a){if(a.need==='lamp'&&!P.lamp)return 'need-lamp';a.fn();return a.t;}return null;},
  verbs:(it,uid)=>{const n=uid?NPCS.find(x=>x.uid===uid):null;const i=ACT(it,n);return i?i.verbs.map(v=>v.k):null;},lamp:on=>setLamp(on),tut:()=>({cur:(tutCur()||{}).id||null,over:TUT_OVER}),endTut:()=>tutEnd(),obj:()=>OBJ().t,shelf:()=>G.shelf,reveal:()=>{if(AIM)lampReveal(AIM);},
  restore:snap=>restoreFrom(snap),snapshot:tag=>snapshot(tag),
  spot:()=>SPOTS.cur,go:(id,inst)=>goSpot(id,{instant:!!inst}),dirs:()=>spotDirs(),SPOTS:SPD?SPD.list:[],
  helga:()=>helga,close:()=>closeWin(),leave:()=>closeSeat(),win:()=>WIN,stn:()=>STN,open:id=>openStation(id),closeStn:()=>closeStation(),yaw:()=>+new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ').y.toFixed(3),
  act:(it,k)=>{const i=ACT(it,null);const a=i&&i.verbs.find(v=>v.k===k);if(a){a.fn();return a.t;}return null;},click:()=>doVerb(),drops:()=>DROPS.filter(Boolean).map(d=>d.k),vm:()=>VM.key,vlist:()=>VLIST.map(v=>v.k),aim:()=>AIM,
  send:(plan)=>{const qs=todayQuests();const ps=plan.map(([qi,mem,opt])=>({req:qs[qi],mem,lunch:!!(opt&&opt.lunch),recall:!!(opt&&opt.recall),on:true}));dispatch(ps);tutEvent('send');return G.cases.map(c=>({cid:c.cid,kind:c.kind,id:c.regId||c.guest||c.kind,fake:c.fake&&c.fake.fam,at:c.at,hurt:c.hurt,loot:c.loot.map(x=>x.k)}));},
  cases:()=>G.cases.map(c=>({cid:c.cid,kind:c.kind,id:c.regId||c.guest||c.kind,name:c.name,fake:c.fake&&c.fake.fam,at:c.at,state:c.state,npc:c.npc&&c.npc.uid,lootN:c.loot?c.loot.length:0,hurt:c.hurt})),
  startHunt:()=>{const f=NPCS.find(x=>x.fake&&x.state!=='gone');if(f)startHunt(f);},club:clubSwing,mood:mood.uniforms,renderer,scene,camera,snapshot,loadSave,clearSave,MC,ASSETS,inv:()=>({...G.inv}),phase:()=>G.phase};
