/* 무사귀환 여관 그림. 기본색 + 그림자 한 톤 + 작은 하이라이트를 쓴다.
 * 모든 좌표는 각 그림의 viewBox 기준이다. DOM·난수·외부 자원에 의존하지 않는다.
 * item만 완성된 SVG이며 나머지 그림 함수는 SVG 안쪽 마크업을 반환한다.
 * 기본값: 203호, 불 꺼짐, 신발 없음, 등불을 든 복도, 빈 침대·책상, 정상 거울,
 * 촛불 켜짐, 3인 빈 식탁. 잘못된 선택값은 해당 기본값으로 돌아간다. */
(function (root) {
  'use strict';
  const K='#382c2b', GOLD='#c9a267', PAPER='#dfcba4';
  const obj=v=>v && typeof v==='object' && !Array.isArray(v)?v:{};
  const num=(v,d,lo,hi)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d;
  const pick=(v,a,d)=>a.includes(v)?v:d;
  const bool=(v,d=false)=>typeof v==='boolean'?v:d;
  const hex=(v,d)=>typeof v==='string'&&/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(v)?v:d;
  const p=(d,f='none',sw=2.3,c=K)=>`<path d="${d}" fill="${f}" stroke="${c}" stroke-width="${sw}"/>`;
  const r=(x,y,w,h,f,rx=2,sw=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" stroke="${K}" stroke-width="${sw}"/>`;
  const e=(x,y,rx,ry,f,sw=0)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" stroke="${K}" stroke-width="${sw}"/>`;
  const g=(s,t='')=>`<g${t?` transform="${t}"`:''} stroke-linecap="round" stroke-linejoin="round">${s}</g>`;
  const alpha=(s,a)=>`<g opacity="${a}">${s}</g>`;
  const glint=(x,y,s=1)=>p(`M${x} ${y-4*s} Q${x} ${y} ${x+3*s} ${y} Q${x} ${y} ${x} ${y+4*s} Q${x} ${y} ${x-3*s} ${y} Q${x} ${y} ${x} ${y-4*s}Z`,'#ffefc5',0);
  const text=(n,x,y,size=20)=>`<text x="${x}" y="${y}" fill="${K}" stroke="none" font-family="Georgia,serif" font-size="${size}" font-weight="bold" text-anchor="middle">${n}</text>`;
  const roomNo=v=>Math.floor(num(v,203,0,9999));
  const shoesKeys=['worn_boots','new_boots','elf_boots','small_boots','twin_boots','greaves','wizard_shoes','sandals','merchant','none'];

  // 인물 좌표는 왼쪽 위 위치이며, scale은 기존 200×240 흉상에 곱하는 배율이다.
  const freezeMap=m=>Object.freeze(Object.fromEntries(Object.entries(m).map(([k,v])=>[k,Object.freeze(v)])));
  const DOOR_SPOTS=freezeMap({plate:{x:110,y:132,w:140,h:42},keyhole:{x:259,y:320,r:13},ear:{x:113,y:207,w:109,h:144},gap:{x:68,y:464,w:224,h:14},knock:{x:208,y:265,w:35,h:46},shoes:{x:75,y:482,w:213,h:70}});
  const ROOM_FIG=freezeMap({sitting:{x:80,y:132,scale:.53},wall:{x:170,y:73,scale:.64},desk:{x:268,y:110,scale:.57}});
  function SEATS(n=3) {
    n=Math.floor(num(n,3,1,6));
    const scale=Math.min(1.18,5.4/n),step=Math.min(260,1080/n);
    return Array.from({length:n},(_,i)=>({x:600+(i-(n-1)/2)*step-100*scale,y:345-200*scale,scale}));
  }
  // 작은 빛도 윤곽을 흐리지 않고 반투명 색면으로 표현한다.
  function lantern(x,y,s=1) {
    return g(alpha(e(0,25,45,57,'#efb75b'),.09)+alpha(e(0,25,29,38,'#ffd18a'),.11)
      +p('M-7 2 V-7 C-7 -20 7 -20 7 -7 V2','none',2.5,GOLD)
      +p('M-15 8 L-11 0 H11 L15 8 L18 39 L10 47 H-10 L-18 39Z','#6c6253')
      +p('M-11 12 H11 L13 35 L7 40 H-7 L-13 35Z','#e8aa51',1.6)
      +p('M0 14 H10 L12 34 L6 39 H0Z','#b87740',0)
      +p('M-5 34 Q-9 27 0 19 Q0 26 5 29 Q9 36 0 37Z','#fff0b8',0)
      +p('M-15 8 H15 M-16 38 H16 M-9 9 L-7 38 M9 9 L7 38','none',2.4)
      +p('M-9 4 H7 M-12 14 L-11 24','none',1.8,'#ead09b'),`translate(${x} ${y}) scale(${s})`);
  }
  function candle(x,y,s=1,on=true) {
    return g(e(0,6,17,5,'#665145',2)+e(0,3,12,3,GOLD,1.4)+r(-5,-24,10,27,'#e0c99c',2,1.6)
      +p('M1 -22 H5 V1 L1 3Z','#aa8c68',0)+p('M-5 -23 Q-1 -19 -1 -12 Q-1 -9 1 -11 V-22','none',2,'#f3deae')
      +p('M0 -24 V-29','none',1.5)
      +(on?alpha(e(0,-33,25,32,'#f1b567'),.09)+p('M0 -46 Q-11 -32 0 -28 Q9 -30 0 -46Z','#e9a04b',1)+p('M0 -39 Q-5 -30 0 -29 Q4 -31 0 -39Z','#fff0b9',0):''),`translate(${x} ${y}) scale(${s})`);
  }
  function mildew(x,y,s=1) {
    return g(alpha(p('M-43 4 Q-54 -8 -36 -11 Q-41 -23 -24 -21 Q-23 -38 -9 -27 Q6 -42 13 -23 Q32 -30 31 -13 Q52 -16 47 1 Q34 13 13 8 Q0 19 -15 8 Q-35 18 -43 4Z','#888a7d',0),.58)
      +alpha(p('M-29 -1 Q-32 -17 -14 -14 Q-6 -28 5 -14 Q27 -19 24 -2 Q12 9 -2 1 Q-16 11 -29 -1Z','#565f59',0),.7)
      +[-35,-22,-4,18,37].map((v,i)=>e(v,(i%2)*13-9,1.7,1.2,'#afb09a')).join(''),`translate(${x} ${y}) scale(${s})`);
  }
  // 닳은 장화와 새 장화는 외곽선과 기본 가죽색이 완전히 같다.
  function boot(kind) {
    const worn=kind==='worn_boots',metal=kind==='greaves',elf=kind==='elf_boots';
    if(kind==='sandals') return e(0,0,14,6,'#b09267',2)+p('M-14 0 Q0 10 14 0 V4 Q0 13 -14 4Z','#71513d',1.5)+p('M-10 -2 L4 4 M-4 -5 L10 1 M-5 6 L0 -6','none',4,'#96663f')+p('M-8 -1 L4 3','none',1,'#dbba7c');
    if(kind==='wizard_shoes') return p('M-11 -16 L5 -19 L9 -5 Q12 1 22 -8 Q25 5 12 9 H-12 Q-18 6 -13 0Z','#68607c')+p('M4 -17 L8 -3 Q15 5 22 -4 Q20 7 11 8 H-4Z','#464052',0)+p('M-9 -12 L4 -14 M-7 -5 l8 -2','none',1.6,'#b5a0b3')+e(22,-7,2,2,GOLD,1);
    if(kind==='merchant') return p('M-13 -9 Q-5 -14 4 -9 L10 -1 Q23 0 23 8 Q10 13 -15 9 L-16 1Z','#966347')+p('M6 -7 L10 0 Q23 1 22 8 Q10 12 -14 9 L-14 5 H8Z','#644633',0)+r(-6,-9,11,10,GOLD,1,1.4)+r(-3,-7,5,5,'#654333',0,1)+p('M12 2 l5 1','none',2,'#d1a372');
    const shape=elf?'M-9 -46 L8 -48 L6 -9 Q9 -3 21 -3 L25 4 Q15 11 -11 9 Q-16 6 -12 -4Z':'M-15 -40 L12 -40 L11 -8 Q19 -5 24 2 L25 9 Q5 15 -17 9 L-17 -4Z';
    let s=p(shape,metal?'#858992':elf?'#798064':'#94654a',2.3)
      +p(elf?'M3 -43 L8 -45 L5 -8 Q15 0 23 2 L21 7 L0 8Z':'M5 -35 H11 V-8 Q23 -4 24 5 L21 9 H-3 L1 -5Z',metal?'#535b68':elf?'#4b584c':'#614737',0)
      +p(elf?'M-11 6 Q7 10 24 4 L24 9 Q4 15 -12 10Z':'M-17 5 Q2 11 25 5 V11 Q6 17 -17 11Z','#494139',1.8)
      +p(elf?'M-10 -46 L0 -38 L8 -48':'M-16 -40 Q-1 -34 13 -40 L13 -33 Q-3 -27 -16 -33Z',metal?'#aeb7bb':elf?'#a3aa7c':'#bc9163',1.7);
    if(metal) s+=p('M-9 -29 L0 -32 L7 -26 L5 -8 L0 0 L-8 -7Z','#aeb7bb',1.4)+p('M-11 -4 L15 -1 M-12 2 L20 5','none',1.7)+p('M-6 -24 L-5 -11','none',2,'#e0ddd0')+e(-10,-30,1.5,1.5,GOLD)+e(8,-30,1.5,1.5,GOLD);
    else s+=p(elf?'M-4 -31 l7 -2 M-5 -23 l7 -2 M-6 -15 l7 -2':'M-8 -25 L6 -21 M-8 -17 L5 -13','none',1.5,'#c3a371');
    if(worn) s+=p('M-16 -22 L-5 -24 L-3 -6 L-15 -5Z','#b58b61',1.4)+p('M-15 -19 l3 -1 M-14 -13 l3 -1 M-8 -22 v3 M-6 -9 l-3 1','none',1.2)
      +p('M12 -1 l5 -2 l-2 4 l6 -1 l-3 5 l-8 -1Z','#d4b78b',1.2)+p('M-12 7 l3 -2 l5 3 l4 -1 l3 5 H-12Z','#726347',0)
      +p('M-14 -35 l3 2 M-4 -36 l2 4 M17 5 l4 -1','none',1.5,'#e0c7a1');
    else if(kind==='new_boots') s+=p('M-11 -29 V-9 M13 0 Q17 0 20 4','none',2.5,'#e5bd86')+glint(18,-4,.75);
    else s+=p('M-7 -32 L-8 -23','none',1.6,metal?'#e2dfce':'#c4c79c');
    return s;
  }
  function shoes(kind) {
    if(kind==='none') return '';
    const pair=(type,x,y,scale,ribbon)=>g(e(1,11,44,8,'#332d2c')+g(boot(type),'translate(-21 -2) rotate(-7)')+g(boot(type),'translate(22 2) rotate(8)')
      +(ribbon?[-21,22].map(x=>g(p('M0 0 Q-16 -13 -13 -1 Q-10 4 0 0 Q14 -12 14 0 Q10 6 0 0Z',ribbon,1.4)+e(0,0,2,2,GOLD,1),`translate(${x} -26)`)).join(''):''),`translate(${x} ${y}) scale(${scale})`);
    if(kind==='twin_boots') return pair('small_boots',129,527,.63,'#5382c4')+pair('small_boots',228,529,.63,'#d77b9a');
    return pair(kind,179,525,kind==='small_boots'?.69:kind==='elf_boots'?1.08:1);
  }
  // 변하지 않는 신발과 문 본체는 한 번만 조립해 순찰 중 문자열 할당을 줄인다.
  const SHOES=Object.fromEntries(shoesKeys.map(k=>[k,shoes(k)]));
  function doorBase() {
    let s=r(0,0,360,480,'#64616a',0,0)+r(0,0,360,18,'#82756e',0,0)+p('M0 18 H360','none',2);
    s+=p('M15 70 l18 -7 l5 13 M328 149 l19 6 l-8 15 M18 330 l17 -10 M323 395 l23 8','none',1.5,'#77717a');
    s+=r(0,430,360,49,'#55463f',0,0)+p('M0 430 H360','none',2)+p('M0 436 H360 M0 468 H360','none',3,'#9a7a5a')+r(0,479,360,81,'#665248',0,0);
    // 복도에 translate(420 80)으로 얹으면 마루 원근선과 걸레받이가 이어진다.
    for(let x=-500;x<=1700;x+=140) {
      const a=600+(x-600)*.55-420,b=a+(x-(a+420))*81/141,dx=b-a;
      let lo=0,hi=1;
      if(dx===0) {if(a<0||a>360)continue;} else {lo=Math.max(0,Math.min(-a/dx,(360-a)/dx));hi=Math.min(1,Math.max(-a/dx,(360-a)/dx));}
      if(lo<=hi)s+=p(`M${a+dx*lo} ${479+81*lo} L${a+dx*hi} ${479+81*hi}`,'none',2);
    }
    s+=p('M0 502 H360 M0 540 H360','none',2)+p('M11 519 l84 1 M251 498 l60 1 M195 554 l59 -1 M25 539 l33 -1','none',1.3,'#927256');
    s+=r(43,25,274,454,'#413c3b',3,3)+r(49,29,262,446,'#80644e',3,3)+r(63,47,234,426,'#493b33',1,3)
      +p('M50 30 H309 L295 48 H64 V473 H50Z','#a27e59',0)+p('M300 53 H311 V473 H299Z','#5b4639',0)
      +r(69,53,222,412,'#856246',1,3)+p('M245 54 H290 V464 H245Z','#624936',0);
    [111,155,200,245].forEach((x,i)=>{s+=p(`M${x} 54 V465`,'none',2)+p(`M${x+7} 190 Q${x+2} 260 ${x+8} 324 T${x+7} 438`,'none',1.2,i===3?'#806047':'#a07a53');});
    s+=p('M78 64 V243 M163 183 Q170 224 163 251 M213 345 Q227 389 214 435','none',1.7,'#b18b5e')
      +e(136,351,7,19,'#614936',1.3)+p('M136 339 Q130 350 136 362 Q141 351 136 345','none',1.1,'#b08a5d')
      +e(224,209,5,12,'#624936',1)+p('M222 198 Q211 210 224 228','none',1.2,'#aa8055');
    s+=r(74,399,157,25,'#9c7451',2,2)+p('M81 403 H222 M88 415 l45 1','none',1.2,'#c29b68');
    [82,222].forEach(x=>s+=e(x,411,2.5,2.5,'#534b45',1));
    [112,367].forEach(y=>{s+=r(58,y,52,14,'#565956',2,1.8)+p(`M61 ${y+3} H105`,'none',1.4,'#999182')+e(100,y+7,2,2,GOLD,1);});
    s+=p('M117 78 H243 L249 85 V114 L242 120 H118 L111 114 V85Z',GOLD,2.5)+p('M118 110 H242 L239 116 H121Z','#967342',0)
      +p('M122 82 H235','none',2,'#f0d197')+e(119,98,2.3,2.3,'#786348',1)+e(241,98,2.3,2.3,'#786348',1);
    s+=p('M110 134 L248 131 L250 173 L113 174Z','#806344',1.8)+p('M114 136 L245 134 L246 169 L118 171 L114 163Z',PAPER,1.5)+p('M235 134 L245 134 L246 146Z','#b9a37e',0)+e(120,141,1.8,1.8,GOLD,1)+e(239,140,1.8,1.8,GOLD,1);
    s+=r(248,258,22,78,'#a27f4c',8,1.8)+e(259,277,10,10,'#d4af71',2)+p('M253 276 Q273 269 279 280 Q284 291 260 291','none',6)+p('M254 274 Q272 270 276 278','none',2.5,'#e3c18a');
    s+=e(259,317,4.6,5,'#27272b')+p('M257 319 L254 328 H264 L261 319Z','#27272b',0);
    s+=r(68,464,224,12,'#262a31',0,0);
    return s;
  }
  const DOOR_BASE=doorBase();
  function door(o) {
    o=obj(o);const light=pick(o.light,['off','on','flicker'],'off'),feet=pick(o.feet,[0,1,2],0),kind=pick(o.shoes,shoesKeys,'none'),mark=pick(o.shoeMark,['none','wet','redsand','mud'],'none');
    let s=DOOR_BASE+text(roomNo(o.no),180,106,24);
    if(light!=='off') {
      let glow=alpha(p('M70 472 H290 L322 503 Q185 527 38 503Z','#dda956',0),.22)+r(70,467,220,7,'#e5b567',0,0)+p('M74 473 H287','none',1.3,'#ffe0a1');
      for(let i=0;i<feet;i++) {const cx=feet===1?176:130+i*101;glow+=p(`M${cx-24} 467 h15 l5 7 h-24Z M${cx+8} 467 h15 l4 7 h-25Z`,'#2b2b31',0)+alpha(p(`M${cx-23} 474 h20 l-6 30 l-25 -4Z M${cx+3} 474 h22 l12 26 l-24 4Z`,'#302e32',0),.78);}
      s+=light==='flicker'?`<g data-light="flicker">${glow}<animate attributeName="opacity" values="1;.55;.85;.45;1" dur="2.9s" repeatCount="indefinite"/></g>`:glow;
    }
    if(bool(o.stain)) s+=mildew(208,482,1.13)+mildew(150,486,.48);
    if(mark==='wet') s+=alpha(e(147,537,59,9,'#879098')+e(222,528,36,7,'#879098'),.45)+p('M99 538 l24 2 M201 532 l21 -1','none',1.4,'#b0b6b0');
    if(mark==='mud') s+=p('M96 533 l12 -9 l31 5 l24 -4 l8 13 l-30 7 l-35 -2Z M191 537 l8 -15 l27 2 l16 13 l-13 9Z','#514835',1);
    if(mark==='redsand') for(let i=0;i<24;i++) s+=e(91+(i*43)%174,514+(i*13)%35,1.5+i%3*.6,1.1,'#bb6649');
    s+=SHOES[kind];
    if(bool(o.lock)) s+=r(46,228,24,32,'#696a65',2,2)+r(287,228,27,32,'#696a65',2,2)+r(52,237,259,15,'#7b807b',2,2.5)+p('M59 239 H302','none',2,'#bec2ab')+r(211,228,13,35,'#515857',2,2)+e(58,233,2,2,GOLD,1)+e(299,233,2,2,GOLD,1);
    if(bool(o.lamp)) s+=lantern(276,310,.75);
    const scratch=pick(o.scratch,[0,1,2],0);
    if(scratch) {let marks='';for(let i=0;i<(scratch===2?6:3);i++) marks+=p(`M5 ${259+i*8} Q19 ${250+i*9} 38 ${238+i*9}`,'none',scratch===2?2:1.5,'#383638')+p(`M8 ${261+i*8} Q23 ${250+i*9} 35 ${242+i*9}`,'none',.8,'#aaa091');s+=g(marks,o.scratchSide==='L'?'':'translate(360 0) scale(-1 1)');}
    s+=alpha(r(0,0,360,560,'#111724',0,0),num(o.dark,0,0,1)*.96);
    return g(s);
  }

  function corridor(o) {
    o=obj(o);const dawn=num(o.dawn,0,0,1),lampOn=bool(o.lampOn,true);
    let s=r(0,0,1200,700,'#464852',0,0)+r(0,74,1200,478,'#64616a',0,0)
      +p('M0 0 H1200 L1010 77 H188Z','#383b46',0)+p('M0 75 H1200 V98 H0Z','#82756e',2);
    for(let x=36;x<1200;x+=80) s+=p(`M${x} 101 V515`,'none',1,'#77707a')+p(`M${x} 188 l-6 9 l6 9 l6 -9Z M${x} 378 l-6 9 l6 9 l6 -9Z`,'none',1,'#79717a');
    s+=p('M0 510 H1200 V559 H0Z','#55463f',2)+p('M0 516 H1200 M0 548 H1200','none',3,'#9a7a5a')+p('M0 560 H1200 V700 H0Z','#665248',0);
    for(let x=-500;x<=1700;x+=140) s+=p(`M${600+(x-600)*.55} 559 L${x} 700`,'none',2);
    [582,620,675].forEach(y=>s+=p(`M0 ${y} H1200`,'none',2));
    for(let i=0;i<15;i++) {const x=22+i*83;s+=p(`M${x} ${593+(i%3)*35} l38 2 m-24 3 l49 1`,'none',1.1,'#927256');}
    // 중앙 420~780에는 문을 그리지 않아 독립된 방문 그림을 얹을 수 있다.
    function sideDoor(no,right) {
      if(typeof no!=='number'||!Number.isFinite(no)) return '';
      const inner=r(0,0,185,421,'#453b37',2,3)+r(13,13,160,397,'#76573f',1,3)+p('M22 18 V400 M69 18 V405 M120 18 V403 M167 18 V399','none',2)
        +r(45,47,95,37,GOLD,3,2)+text(roomNo(no),92,73,24)+r(42,98,101,31,PAPER,1,1.5)+r(137,236,16,48,'#9a7d50',5,2)+e(145,247,7,7,GOLD,2)
        +p('M16 411 H171','none',3,'#b28a50')+p('M30 308 Q36 333 30 355 M100 159 Q90 179 101 200','none',1.4,'#a68058');
      return g(inner,right?'matrix(1.1 -.24 0 1 1050 110)':'matrix(1.1 .24 0 1 -63 66)');
    }
    s+=sideDoor(o.leftNo,false)+sideDoor(o.rightNo,true);
    s+=g(r(1105,185,74,184,'#363941',2,3)+r(1113,193,58,168,'#23364b',1,2)+alpha(r(1113,193,58,168,'#b2c1c6',0,0),dawn)
      +p('M1113 315 L1141 302 L1171 312 V361 H1113Z','#3f4c5b',0)+p('M1141 194 V360 M1113 268 H1171','none',5,'#786e64')+p('M1104 367 H1181 L1187 375 H1100Z','#968570',2),'translate(-170 0)');
    s+=alpha(p('M945 374 L1008 374 L888 558 H785Z','#9baeb8',0),dawn*.13);
    [352,848].forEach(x=>s+=r(x-9,184,18,73,'#48484a',5,2)+p(`M${x} 226 q-25 5 -24 -15`,'none',5)+lantern(x-24,205,.9));
    s+=p('M390 488 l13 -12 l9 9 M801 118 l20 -9 l13 15 M291 442 l15 -7 l-1 15','none',1.7,'#46424a');
    if(lampOn) s+=alpha(p('M449 440 Q600 340 751 440 L874 700 H326Z','#e8a957',0),.075);
    else s+=alpha(r(0,0,1200,700,'#101725',0,0),.66);
    return g(s);
  }

  function room(o) {
    o=obj(o);const bed=pick(o.bed,['lump','empty','two','sitting'],'empty'),desk=pick(o.desk,['list','empty','food'],'empty'),mirror=pick(o.mirror,['normal','wrong','none'],'normal'),tint=pick(o.tint,['none','moss','red'],'none'),lit=bool(o.candle,true);
    let s=r(0,0,400,300,'#6d6564',0,0)+p('M0 0 H400 V26 H0Z','#4b4240',0)+p('M0 209 H400 V300 H0Z','#655046',0)+p('M0 210 H400 M0 247 H400 M0 288 H400 M65 210 L18 300 M172 210 L152 300 M280 210 L294 300 M363 210 L399 300','none',2)
      +p('M0 197 H400 V213 H0Z','#493e3b',2)+p('M0 199 H400','none',1.5,'#9f8265');
    s+=r(40,35,105,109,'#443f40',2,3)+r(48,43,89,92,'#34465b',1,2)+p('M48 112 L74 97 L96 109 L117 99 L137 112 V135 H48Z','#25374a',0)+e(118,62,9,9,'#abb6b3')+p('M93 44 V135 M48 87 H137','none',4,'#897963')
      +p('M34 34 Q49 52 39 136 L61 144 Q55 94 63 34Z','#6c6d78',2)+p('M128 34 Q142 83 128 138 L151 141 Q142 82 153 34Z','#555a68',2)+p('M40 138 H152 L158 148 H35Z','#9a7a5d',2);
    s+=p('M0 29 H400 M184 31 V191 M394 27 V208','none',6,'#514740')+p('M181 40 V181','none',1.4,'#a18a71');
    if(mirror!=='none') {
      s+=r(211,44,60,96,'#8d7256',16,3)+r(219,52,44,79,'#7a8991',12,2)+p('M224 109 H257 V126 H224Z','#566774',0)+p('M221 57 L249 53 L221 94Z','#a3afb0',0)+p('M227 56 L253 54','none',1.5,'#d7d4bf');
      if(mirror==='wrong') s+=alpha(e(243,83,8,12,'#424b53')+p('M236 92 Q243 90 250 95 L255 122 H229Z','#424b53',0),.85);
      else s+=p('M222 107 L250 105 L258 120 H222Z','#77747a',1.2)+p('M225 112 H250','none',1.2,'#9e9a95');
    }
    if(bool(o.grayStain)) s+=mildew(180,169,.77)+mildew(387,184,.55);
    s+=e(128,268,110,14,'#443b39')+r(23,150,23,125,'#6f503b',4,2.6)+r(27,147,156,36,'#896647',4,2.6)+p('M37 154 H172 M37 163 H172','none',1.5,'#b38c5e')
      +p('M40 177 L170 171 L224 244 L58 261Z','#a9a18b',2.5)+p('M58 242 L224 230 V254 L57 273Z','#786e60',2.5);
    s+=p('M46 181 Q62 171 100 178 L113 197 Q81 210 51 201Z','#ded0ad',2)+p('M61 196 Q88 202 108 193 L112 199 Q83 209 53 201Z','#a89a80',0);
    if(bed==='lump'||bed==='two') {
      const lump=(x,y,k)=>g(p('M0 8 Q2 -10 18 -9 Q30 -28 48 -15 Q68 -6 87 37 L-4 42Z','#6f7b79',2.2)+p('M20 -8 Q46 -25 58 2 L85 34 L69 38 Q48 0 20 -8Z','#4d5d60',0)+p('M0 11 Q5 1 15 2 M33 -9 Q44 -12 50 -4','none',2,'#a4ad98'),`translate(${x} ${y}) scale(${k})`);
      s+=lump(78,202,bed==='two'?.83:1.15);if(bed==='two')s+=lump(139,195,.82);
    } else s+=p('M75 207 L177 187 L219 243 L63 257Z','#6f7b79',2)+p('M114 210 L181 204 L219 243 L168 247Z','#4d5d60',0)+p(bed==='sitting'?'M91 238 Q121 250 145 235 M109 241 l-9 10':'M85 217 L157 203 M85 224 L113 220','none',2,'#a4ad98');
    s+=p('M57 256 L225 240 V261 L57 280Z','#8e6849',2.5)+p('M68 262 L212 249','none',2,'#b18a5f')+r(55,250,14,47,'#694c3c',3,2.5)+r(214,237,14,43,'#694c3c',3,2.5)+e(62,251,8,5,'#a17a54',2)+e(221,238,8,5,'#a17a54',2);
    s+=r(279,192,9,74,'#574337',1,2)+r(375,192,9,74,'#574337',1,2)+p('M266 168 L377 166 L393 194 H263Z','#a27b53',2.5)+r(263,194,130,14,'#72513d',1,2)+r(282,209,44,19,'#805e45',1,2)+e(305,219,3,2,GOLD,1)+p('M273 174 L328 173','none',1.4,'#d1a875');
    if(desk==='list') s+=p('M278 173 L313 173 L325 189 L286 190Z',PAPER,1.3)+p('M286 177 h20 M289 181 h15 M291 185 h18','none',1,'#79634f')+e(340,183,5,3,'#303439',1)+p('M335 184 L350 168 Q360 163 357 173 L337 185Z','#b4b5a8',1);
    if(desk==='food') s+=e(308,186,26,5,'#bfa782',1.5)+p('M287 183 Q286 171 300 170 Q314 169 324 181 L318 187 L310 182 L306 187Z','#c59b5d',1.6)+p('M292 177 l5 -3 M304 175 l5 1','none',1.4,'#f3d399')+e(329,188,2,1,'#d1ad6b');
    s+=candle(366,178,.77,lit)+r(324,248,41,11,'#856044',2,2)+p('M331 259 l-3 33 M359 259 l4 30','none',5,'#614b3b');
    if(!lit) s+=alpha(r(0,0,400,300,'#151f30',0,0),.45);
    if(tint!=='none') s+=alpha(r(0,0,400,300,tint==='moss'?'#a3c973':'#c9644f',0,0),.18);
    return g(s);
  }
  function eye(color) {
    color=hex(color,'#a99b66');
    return g(r(0,0,400,300,'#34343b',0,0)+p('M0 82 Q78 26 194 43 Q311 35 400 105 V229 Q296 285 190 262 Q67 278 0 221Z','#81766b',0)
      +p('M0 168 Q84 63 195 79 Q317 58 400 165 Q322 240 203 225 Q77 247 0 168Z','#565451',0)
      +p('M20 161 Q106 91 194 104 Q300 88 380 161 Q294 217 201 207 Q94 222 20 161Z','#c9c6ad',3)
      +e(202,154,48,52,color,2.5)+p('M205 103 Q253 108 250 157 Q246 203 208 206 Q227 176 221 146Z','#565641',0)
      +e(202,155,21,38,'#25282d')+e(188,132,7,5,'#e4dfc4')+e(213,178,2,3,'#c4c8ae')
      +p('M17 161 Q104 86 194 101 Q299 85 384 162','none',7)+p('M36 187 Q114 236 200 223 M242 222 Q320 222 373 183','none',3,'#625e56')
      +p('M53 114 Q115 67 177 77 M251 79 Q320 79 359 112','none',3,'#a2957e')
      +alpha(p('M0 0 H400 V74 Q303 30 203 51 Q78 37 0 105Z M0 223 Q106 289 210 265 Q321 282 400 224 V300 H0Z','#1c232e',0),.65));
  }

  function tableBack(o) {
    o=obj(o);
    let s=r(0,0,1200,520,'#897c6b',0,0)+r(0,0,1200,38,'#584638',0,0)+p('M0 39 H1200','none',3,'#b99a6c')
      +r(24,38,28,482,'#654d3b',1,2)+r(1148,38,28,482,'#654d3b',1,2)+p('M33 47 V312 M1156 50 V300','none',2,'#a78459')
      +p('M77 85 l35 -9 l10 13 M408 72 l16 9 l-3 23 M777 82 l29 -9 M1084 229 l22 -10 l14 8','none',1.6,'#6e655c');
    s+=r(63,102,287,14,'#916e4a',2,2)+p('M74 117 V138 L100 117 M310 117 L337 140 V117','none',6,'#604937');
    [95,139,180].forEach((x,i)=>s+=p(`M${x} 72 v27 q15 7 28 0 V72Z`,['#9a856c','#727970','#ad9272'][i],2)+e(x+14,72,14,4,'#c1ad8d',1.5)+p(`M${x+7} 78 v16`,'none',1.5,'#d7bd91'));
    s+=g(p('M0 0 V-30','none',4)+p('M-25 0 Q0 -12 25 0 L21 34 Q0 44 -21 34Z','#6a706a',2.5)+p('M6 -1 H23 L19 32 Q10 39 0 37Z','#494e4e',0)+p('M-17 5 V23','none',2,'#aeb2a0'),'translate(948 92)')
      +g(p('M0 0 V-30','none',4)+e(0,20,28,27,'#98764f',2.5)+e(1,21,18,18,'#604e3c',1.5)+p('M-19 8 Q-10 -1 -2 0','none',2,'#d0ac76'),'translate(1052 82)')
      +r(878,52,222,11,'#644d3b',2,2);
    [386,811].forEach(x=>s+=r(x-9,134,18,53,'#5a4d41',3,2)+p(`M${x} 166 l-23 12 h46`,'none',4,'#66503b')+candle(x,175,1.2,true));
    s+=p('M56 290 H1144 V348 H56Z','#766454',0)+p('M61 291 H1138','none',2,'#a58a65');
    return g(s);
  }
  function plateFood(dish,empty) {
    let s=e(0,5,57,18,'#4c3d34')+e(0,0,57,17,'#c4ae87',2.3)+e(0,-1,45,11,'#88775d',1.4);
    if(empty||dish==='none') return s+e(0,-2,42,9,'#d8c49d')+(empty?p('M-12 -2 l5 1 M12 2 l3 -1','none',1.3,'#947c54'):'');
    if(dish==='bread') return s+p('M-33 -3 Q-38 -26 -10 -27 Q21 -32 35 -5 Q25 8 -15 8Z','#c49350',2)+p('M10 -26 Q29 -18 35 -5 Q21 8 -11 7 L-11 1 Q14 1 10 -26Z','#946439',0)+p('M-23 -10 l8 -10 M-6 -7 l8 -12 M11 -5 l7 -10','none',3,'#edce8e');
    s+=p('M-40 -4 Q-36 22 0 24 Q36 22 40 -4Z','#857363',2.2)+p('M0 1 H38 Q32 22 0 24Z','#564c46',0)+e(0,-4,40,12,'#dfc6a0',2)+e(0,-4,34,8,dish==='soup'?'#8a9a55':'#a7653b');
    s+=dish==='soup'?p('M-18 -4 Q-12 -16 -5 -5Z M7 -2 Q13 -14 20 -3Z','#d6c498',1)+p('M-7 0 l8 -3 M-20 -1 l4 3','none',2,'#576b42'):p('M-20 -7 l11 -1 l3 7 l-11 2Z M6 -7 l11 1 l-2 7 l-9 -1Z','#d0a368',1)+e(24,-2,4,2,'#71804c');
    return s+p('M-29 6 Q-24 14 -17 14','none',2,'#bda88a');
  }
  function tableFront(o) {
    o=obj(o);const seats=SEATS(o.seats),dish=pick(o.dish,['none','soup','stew','bread'],'none'),eaten=Array.isArray(o.eaten)?o.eaten:[];
    let s=p('M39 345 H1161 L1200 455 H0Z','#a17a51',3)+p('M0 455 H1200 V512 Q600 529 0 512Z','#72513c',3)+p('M0 459 H1200','none',4,'#c39a63')
      +p('M25 378 H1175 M11 418 H1189 M169 345 L145 378 M482 378 L475 418 M883 418 L902 455 M1071 345 L1088 378','none',2)
      +p('M83 363 l163 1 M583 357 l209 2 M83 433 l185 3 M743 441 l170 -2 M1015 400 l134 1','none',1.5,'#c6a16e')
      +p('M183 477 Q240 469 301 480 Q246 490 215 482 M815 493 Q840 483 874 492 M89 496 l45 -1 M1099 479 l39 1','none',1.5,'#a27d51');
    seats.forEach((v,i)=>{const cx=v.x+100*v.scale;s+=g(plateFood(dish,eaten[i]===true),`translate(${cx} 392)`)+g(p('M0 -12 V24','none',3,'#afa68d')+e(0,-15,5,8,'#c4bda8',1.4)+p('M-2 -18 v5','none',1,'#f0dec0'),`translate(${cx+72} 385) rotate(12)`)+g(p('M-12 -14 H11 V13 Q0 19 -12 13Z','#897455',2)+p('M11 -9 Q26 -12 23 3 Q21 12 11 9','none',3)+e(0,-14,12,4,'#b39b6e',1.7)+e(0,-14,8,2,'#493a30')+p('M-7 -7 V8','none',1.5,'#d2b884'),`translate(${cx-68} 364)`);});
    return g(s);
  }
  const table=o=>tableBack(o)+tableFront(o);
  function cauldron(o) {
    o=obj(o);const color=hex(o.color,'#869950');
    let s=e(151,276,132,16,'#463e39')+p('M29 211 L48 191 H248 L271 212 V280 H29Z','#8d8170',2.7)+p('M31 246 H269 V280 H31Z','#625e58',0)
      +p('M30 214 H270 M30 245 H270 M77 215 V244 M166 215 V244 M226 245 V278 M114 246 V279','none',2.2)+p('M39 218 h28 M177 218 h37 M37 249 h59','none',2,'#b3a58b')
      +p('M95 275 V232 Q150 193 205 232 V275Z','#343137',2.5)+p('M117 274 Q100 249 132 225 Q126 247 146 241 Q155 225 162 221 Q156 245 179 242 Q198 265 181 275Z','#c8773e',1.5)+p('M136 275 Q121 261 141 246 Q139 258 150 256 Q162 246 169 239 Q164 259 180 272Z','#edb661',0)
      +p('M107 278 L188 262 M113 262 L185 278','none',8,'#654937')
      +p('M79 191 L72 218 M220 191 L228 218','none',11,'#42474b')
      +p('M67 109 Q16 92 27 143 Q33 168 64 153 M232 110 Q281 93 274 143 Q268 167 237 155','none',10,'#464b4e')
      +p('M61 110 Q43 205 104 224 Q151 241 204 221 Q251 196 238 110Z','#657073',3)+p('M178 115 H237 Q251 196 202 222 Q171 236 134 229 Q192 207 178 115Z','#424c54',0)
      +p('M78 146 Q67 181 95 203','none',6,'#a1a79a')+p('M108 216 l17 4','none',2,'#929b91')+e(150,111,91,32,'#8e9790',3)+e(150,111,79,23,color,2)
      +p('M73 113 Q88 132 150 134 Q211 134 228 113','none',3,'#c1c0a1')+e(80,151,4,4,GOLD,1)+e(221,151,4,4,GOLD,1);
    if(bool(o.bubbling)) s+=e(121,107,9,5,'#cccf99',1.4)+e(174,118,6,4,'#cccf99',1.3)+e(184,97,10,6,'#cccf99',1.4)+e(159,90,4,4,'#e3deb3',1)
      +alpha(p('M107 83 C77 62 122 55 105 28 M151 75 C129 58 169 47 153 18 M191 78 C177 62 207 56 193 38','none',6,'#c0c1ab'),.48);
    if(bool(o.fail)) s+=alpha(p('M133 113 Q99 95 117 76 Q82 65 103 45 Q83 21 109 12 Q129 4 139 29 Q173 10 184 30 Q213 31 201 52 Q225 71 194 85 Q205 105 169 112Z','#282b32',0),.9)+p('M132 78 Q114 70 125 60 Q109 49 124 41 M170 60 Q183 47 174 39','none',3,'#42454a');
    return g(s);
  }

  // 작은 물품은 최초 로드 때 조립한다. 호출 시에는 SVG 외곽만 감싼다.
  function bottle(color,shade,type) {
    let s=p('M22 9 H38 V23 Q48 28 48 41 Q49 53 31 54 Q12 54 12 42 Q12 29 22 23Z','#b5bcb0',2.2)+p('M32 25 Q45 28 45 41 Q46 51 31 51 Q17 51 15 43 V35 Q27 39 43 33Z',color,1.2)
      +p('M35 27 Q46 32 45 44 Q43 51 29 51 L29 47 Q39 45 36 34Z',shade,0)+r(22,7,16,10,'#a78151',2,1.7)+p('M25 10 v4 M31 9 v5','none',1,'#6b523c')+p('M22 22 H38','none',2,GOLD)+p('M18 32 L17 41 M23 25 l-3 3','none',2.2,'#f2ebc9');
    if(type==='recall') s+=r(25,36,12,13,'#d5c797',2,1.2)+p('M28 36 v-2 q3 -5 6 0 v2 M28 40 h6 v6 h-6Z','none',1.2)+glint(33,42,.5)+glint(21,31,.5)+glint(41,29,.65);
    else if(type==='heal') s+=r(23,35,16,13,PAPER,2,1.2)+p('M31 37 V46 M27 41 H35','none',2.5,'#719153');
    else s+=p('M30 35 Q21 43 30 47 Q40 43 30 35Z',type==='oil_red'?'#ebac70':type==='oil_moss'?'#d3e79a':'#edd08d',1.3);
    if(type==='oil_moss'||type==='oil_red') s+=glint(7,29,.7)+glint(51,44,.6);
    return s;
  }
  const ITEMS={
    bread:p('M7 37 Q3 18 25 14 Q48 9 54 33 Q59 49 32 51 Q12 52 7 37Z','#c49959',2.3)+p('M36 15 Q53 18 54 35 Q54 49 32 50 Q14 52 8 39 Q36 47 36 15Z','#94673e',0)+p('M14 30 l8 -10 M26 31 l8 -12 M39 34 l6 -10','none',3,'#f0d7a1')+e(20,41,1,1,'#e8c485')+e(29,44,1.2,1,'#e8c485'),
    oil:bottle('#c9a45c','#947142','oil'),
    soup:g(plateFood('soup',false),'translate(30 32) scale(.48 .65)'),
    stew:g(plateFood('stew',false),'translate(30 32) scale(.48 .65)'),
    lunch:p('M8 30 Q11 23 22 23 L39 23 Q51 28 53 44 L46 52 H14 L6 43Z','#8c9b7a',2.2)+p('M33 25 Q50 30 51 44 L44 50 H27 L34 35Z','#5e705c',0)+p('M9 31 L28 40 L49 29 M29 40 V49','none',1.8)+p('M26 27 Q8 24 16 12 Q27 14 29 24 Q31 8 43 12 Q45 23 31 27Z','#adbc92',2)+e(29,27,5,4,'#d1c194',1.5)+p('M15 34 l6 3 M18 18 l5 3','none',2,'#d9d2ab'),
    heal:bottle('#a1bd71','#688b52','heal'),
    recall:bottle('#78a4bf','#4b6a97','recall'),
    oil_moss:bottle('#a6cb71','#6f934f','oil_moss'),
    oil_red:bottle('#c46e51','#8d4b44','oil_red'),
    fail:e(30,50,26,5,'#948675',1.5)+p('M8 43 L12 31 L18 31 L18 23 L29 18 L37 25 L43 22 L51 34 L49 46 L35 50 L18 48Z','#4b4747',2.2)+p('M30 22 L37 28 L43 25 L49 36 L46 44 L32 48 L28 37Z','#30343a',0)+p('M14 38 l6 -3 l5 8 M30 27 l3 5 l8 2','none',1.5,'#8d7a64')+alpha(p('M24 17 Q14 12 23 5 M38 20 Q47 12 38 7','none',2,'#7e7d74'),.65),
    spore_mark:p('M25 31 Q28 41 23 50 Q30 55 37 49 Q32 40 35 31Z','#d5caa2',2)+p('M31 33 L35 33 Q32 44 36 49 L30 51Z','#9b9f7b',0)+p('M6 29 Q11 8 29 9 Q49 6 55 29 Q39 40 6 29Z','#8b9c62',2.3)+p('M34 10 Q50 11 55 29 Q39 36 20 33 Q42 27 34 10Z','#586f4e',0)+e(30,31,24,6,'#c3c897',1.5)+p('M13 30 l6 4 M24 29 l2 6 M35 29 l-2 6 M46 29 l-5 5','none',1.2,'#6c8753')+e(20,19,4,2,'#d6d5a1')+e(33,16,2,1.5,'#d6d5a1')+[ [11,40],[18,46],[9,50],[44,40],[50,46],[42,52] ].map(([x,y])=>e(x,y,1.6,2,'#aaca78',.5)).join('')
  };
  function item(k,w=52) {
    if(typeof k!=='string'||!Object.prototype.hasOwnProperty.call(ITEMS,k)) return null;
    w=typeof w==='number'&&Number.isFinite(w)&&w>0?w:52;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="${w}" height="${w}" aria-hidden="true">${g(ITEMS[k])}</svg>`;
  }
  const KEYS=Object.freeze({item:Object.freeze(Object.keys(ITEMS)),shoes:Object.freeze(shoesKeys)});
  const api=Object.freeze({door,corridor,room,eye,table,tableBack,tableFront,cauldron,item,DOOR_SPOTS,ROOM_FIG,SEATS,KEYS});
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.INN_ART=api;
})(typeof window!=='undefined'?window:null);
