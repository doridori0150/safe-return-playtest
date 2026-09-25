/* 무사귀환 흉상 파츠. 좌우는 정면의 관찰자 기준이며, 반환값에 svg 태그는 없다.
 * 특징은 부분 병합하고 원본을 수정하지 않는다. 뒷모습은 신체 좌우를 보존한다.
 * 색면과 경로만 사용하므로 외부 자원, 필터, 그라디언트, 전역 SVG 식별자가 없다. */
(function (root) {
  'use strict';
  const K = '#382c2b', GOLD = '#cda65f', BONE = '#eee1bb';
  const DATA = {
    bor: { name:'보르', race:'드워프 · 노장', small:true, skin:'#dca47c', shade:'#b87961', hair:'#e3ddd1', hairShade:'#a6a4a3', cloth:'#665342', dark:'#443c36', accent:'#9b6950', eye:'#8a9099', style:'bald', item:'lantern', side:'R',
      feat:{scarV:{side:'L'},beardKnots:3,earring:{side:'R',type:'ring'}}, featText:['왼눈 세로 흉터','수염 매듭 셋','오른쪽 귀 금고리','회색 눈'] },
    pipi: { name:'피피', race:'하플링 · 궁수', small:true, skin:'#f3d2b0', shade:'#d4a082', hair:'#805137', hairShade:'#543c30', cloth:'#667746', dark:'#3d513c', accent:'#c6a168', eye:'#7a4a2a', style:'curly', item:'bow', side:'R',
      feat:{scarX:{side:'R'},earring:{side:'L',type:'feather'},toothGap:true,freckles:3}, featText:['오른뺨 X자 흉터','왼쪽 귀 깃털','앞니 하나 빠짐','주근깨 양 볼 셋씩'] },
    helga: { name:'헬가', race:'오크 · 전사', skin:'#92ad69', shade:'#658252', hair:'#a44435', hairShade:'#723832', cloth:'#986347', dark:'#60453a', accent:'#ccb484', eye:'#d9a030', style:'topknot', item:'pan', side:'L',
      feat:{tusks:true,browScar:{side:'L'},necklace:'bone'}, featText:['송곳니 둘','왼눈썹이 끊긴 흉터','뼈 목걸이','호박색 눈'] },
    sere: { name:'세레나데', race:'엘프 · 음유시인', skin:'#f6dcc6', shade:'#d9b4ad', hair:'#e1dfeb', hairShade:'#a6a0bb', cloth:'#79608c', dark:'#504360', accent:'#c8bfd9', eye:'#8a5ec9', style:'long', item:'lute', side:'R',
      feat:{hairDrape:{side:'L'},mole:{side:'R',pos:'underEye'},circlet:true}, featText:['왼쪽으로 늘어뜨린 머리','오른눈 밑 점','이마의 은 서클릿','보라색 눈'] },
    mumy: { name:'무명', race:'해골 · 기사', skin:'#eee1bb', shade:'#b2a890', hair:'#666b73', hairShade:'#424751', cloth:'#747b82', dark:'#484d58', accent:'#a9b7bc', eye:'#8fe3ff', style:'skull', item:'shield', side:'L',
      feat:{helmetDent:{side:'L'},plume:{side:'R',color:'#a8322a'},skullCrack:{side:'R'}}, featText:['투구 왼쪽 찌그러짐','오른쪽 붉은 깃털','이마 오른쪽 금','푸른 눈빛'] },
    ren: { name:'렌', race:'인간 · 마법사', skin:'#f1d0b0', shade:'#c89b87', hair:'#3f7676', hairShade:'#2f5059', cloth:'#515b80', dark:'#353b5d', accent:'#b9a16e', eye:'#2f8f8a', style:'bob', item:'staff', side:'R', glasses:true,
      feat:{glassesCrack:{side:'L'},hatTilt:'L',hatPatch:'star'}, featText:['왼쪽 안경알 금','왼쪽으로 기운 모자','모자의 별 패치','청록색 눈'] },
    dudu: { name:'두두', race:'드워프 · 쌍둥이 견습 형', small:true, skin:'#e8b58e', shade:'#c88c6a', hair:'#d7823c', hairShade:'#9d532f', cloth:'#83734d', dark:'#514b38', accent:'#bd9f62', eye:'#3f6fd8', style:'braids', item:'axe', side:'R',
      feat:{ribbon:{side:'L',color:'#3f6fd8'},bandaid:'nose',freckles:2}, featText:['왼쪽 파란 리본','코의 반창고','주근깨 양 볼 둘씩','파란 눈'] },
    lulu: { name:'루루', race:'드워프 · 쌍둥이 견습 동생', small:true, skin:'#e8b58e', shade:'#c88c6a', hair:'#d7823c', hairShade:'#9d532f', cloth:'#83734d', dark:'#514b38', accent:'#bd9f62', eye:'#4f9a4a', style:'braids', item:'axe', side:'R',
      feat:{ribbon:{side:'R',color:'#e0609a'},mole:{side:'L',pos:'cheek'},cowlick:true}, featText:['오른쪽 분홍 리본','왼뺨 점','앞머리 삐침','초록 눈'] },
    dora: { name:'도라', race:'아침 손님 · 상인', skin:'#e8c3a0', shade:'#c4937a', hair:'#cecad0', hairShade:'#969199', cloth:'#956d49', dark:'#614e3d', accent:'#cfb686', eye:'#66544b', style:'topknot', item:'purse', side:'R', glasses:true,
      feat:{earring:{side:'L',type:'ring'}}, featText:['높이 묶은 은빛 머리','왼쪽 귀 금고리','둥근 안경','동전 주머니'] },
    kane: { name:'케인', race:'왕립 경계청 · 감찰관', skin:'#e0b896', shade:'#bb8973', hair:'#424047', hairShade:'#302f39', cloth:'#45536c', dark:'#303a51', accent:'#c4ab78', eye:'#655b53', style:'short', item:'book', side:'L',
      feat:{monocle:{side:'R'}}, featText:['오른쪽 외알 안경','왕립 경계청 제복','왼손 공문철과 관인'] },
    enoch: { name:'에녹', race:'떠돌이 학자', skin:'#e9cdb0', shade:'#c19d88', hair:'#a6a7ad', hairShade:'#757782', cloth:'#777975', dark:'#4f5654', accent:'#b7ae92', eye:'#706d64', style:'long', item:'box', side:'R', glasses:true,
      feat:{hairDrape:{side:'R'},napeSpot:true}, featText:['잿빛 여행 로브','둥근 안경','오른손 표본 상자','목덜미의 회색 반점'] },
    void: { name:'세 번 노크', race:'명부에 없는 것', skin:'#d9d3c1', shade:'#aaa59b', hair:'#4d4548', hairShade:'#37313b', cloth:'#4a4348', dark:'#302c35', accent:'#979180', eye:'#b75544', style:'void', item:'none', side:'L',
      feat:{}, featText:['세 번의 노크','지나치게 긴 목','비대칭으로 찢어진 웃음'] },
    hood: { name:'두건 쓴 방문자', race:'흉터 있는 노년의 여성 전사', skin:'#c39a80', shade:'#886b64', hair:'#d2ced0', hairShade:'#969099', cloth:'#565348', dark:'#343833', accent:'#989781', eye:'#b8b3a0', style:'hood', item:'spear', side:'R',
      feat:{scarV:{side:'L'}}, featText:['짧은 은발과 깊은 두건','왼쪽 얼굴의 오래된 흉터','오른손의 등불 창','낡은 어깨 갑옷'] }
  };
  // 문자열 속성값을 이스케이프한다. 임의 색상 입력이 마크업으로 해석되지 않는다.
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const p = (d, fill='none', sw=2.7, stroke=K) => `<path d="${d}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${sw}"/>`;
  const e = (x,y,rx,ry,fill,sw=0,stroke=K) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${sw}"/>`;
  const r = (x,y,w,h,fill,rx=2,sw=2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${esc(fill)}" stroke="${K}" stroke-width="${sw}"/>`;
  const g = (s,transform='') => `<g${transform?` transform="${transform}"`:''}>${s}</g>`;
  const feature = (key,s) => `<g data-feature="${key}">${s}</g>`;
  const sx = (side,l=72,rgt=128) => side==='L'?l:rgt;
  const flip = s => g(s,'translate(200 0) scale(-1 1)');
  const count = (v,max) => Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
  const obj = v => v && typeof v==='object' && !Array.isArray(v);
  function features(base, change) {
    const out={...base};
    if(obj(change)) Object.keys(change).forEach(k => {
      if(k==='__proto__'||k==='constructor'||k==='prototype') return;
      out[k]=obj(change[k])&&obj(base[k])?{...base[k],...change[k]}:change[k];
    });
    return out;
  }
  function ears(c) {
    let d='M61 103 C43 94 45 127 62 130 L68 115Z';
    if(c.style==='long' && c===DATA.sere) d='M64 102 L24 82 Q33 116 62 129 L70 114Z';
    if(c===DATA.pipi) d='M63 105 L44 90 Q38 112 61 129 L70 115Z';
    if(c===DATA.helga) d='M60 105 L32 100 Q34 123 63 131 L69 115Z';
    const left=p(d,c.skin)+p('M55 107 Q50 110 58 120','none',1.5,c.shade);
    return left+flip(left);
  }
  function body(c,back) {
    const wide=c===DATA.helga||c===DATA.bor||c.style==='braids';
    const l=wide?16:28, rr=200-l;
    let s=p(`M${l} 242 L${l+3} 203 Q${l+5} 176 79 165 L121 165 Q${rr-5} 176 ${rr-3} 203 L${rr} 242Z`,c.cloth);
    s+=p(`M121 167 Q${rr-5} 179 ${rr-3} 203 L${rr} 242 H122 L132 202Z`,c.dark,0);
    s+=p(`M${l+4} 226 L${l+9} 199 L${l+24} 183 L${l+15} 220Z`,c.accent,0);
    if(back) {
      s+=p('M66 176 Q101 194 136 176 L148 235 Q100 225 53 236Z',c.cloth);
      s+=p('M70 189 L63 225 M102 189 L105 230 M133 190 L139 226','none',1.7,c.dark);
      s+=p('M48 177 L146 230 L137 241 L40 188Z','#745342',2);
      s+=r(128,218,17,14,GOLD,1,1.5)+p('M131 222 L141 227','none',1.5);
      s+=p('M57 220 L80 219 L82 235 L57 236Z',c.dark,1.4)+p('M60 220 v4 M67 220 v4 M75 220 v4 M79 229 h-4','none',1,c.accent);
      if(c===DATA.pipi) s+=p('M33 198 L49 145 L69 152 L52 215Z','#795644')+p('M51 150 L63 114 M58 153 L74 121','none',2.5)+p('M60 124 l-3 -12 l9 -5 l-2 14 M72 132 l-3 -12 l10 -5 l-3 14',BONE,1.5);
      return s;
    }
    s+=p('M79 163 L100 181 L121 163 L128 188 L101 214 L72 187Z',c.dark);
    s+=p('M80 164 L98 179 L86 198 L61 177Z',c.cloth)+p('M120 163 L102 180 L112 196 L139 180Z',c.cloth);
    s+=p('M44 187 L129 240 H151 L56 179Z','#795745',2.4);
    s+=g(r(69,203,22,16,GOLD,1,1.8)+r(73,207,14,8,'#795745',0,1)+p('M80 205 v12','none',1.6),'rotate(31 80 211)');
    s+=p('M46 215 L40 237 M154 209 L162 237 M108 213 L116 235','none',1.7,c.dark);
    s+=r(115,217,30,29,'#735541',4,2)+p('M114 219 Q130 232 146 219 L144 214 H117Z','#987552',2)+e(130,223,2,2,GOLD);
    s+=p('M27 229 l6 2 M28 234 l5 1 M144 186 l6 2','none',1.1,c.accent);
    if(c===DATA.helga) {
      s+=p('M118 164 Q151 161 172 187 L166 204 L129 193Z','#787b73')+p('M124 171 Q147 170 167 188 L165 195 L132 186Z','#a4a89a',0);
      s+=p('M127 188 L167 200','none',2)+[136,151,164].map((x,i)=>e(x,188+i*3,2.1,2.1,GOLD,1)).join('');
      s+=p('M81 199 L116 205 L127 240 H72Z','#c5b58e',2)+p('M81 223 L112 222 L115 239 H80Z','#a89572',1.5);
      s+=p('M86 226 l4 1 M102 226 l4 1','none',1,c.dark);
    }
    if(c.style==='skull') {
      s+=p('M74 169 L99 181 L128 169 L146 208 L125 238 H76 L56 208Z',c.cloth)+p('M102 184 L128 174 L140 207 L120 231 H101Z',c.dark,0);
      s+=p('M100 185 V234 M69 207 L95 215 M107 216 L134 205','none',2,c.accent);
      s+=p('M21 190 Q36 164 67 174 L73 196 L29 210Z',c.cloth)+p('M129 174 Q162 164 179 190 L173 207 L128 196Z',c.cloth);
      s+=p('M28 188 Q47 175 62 181 M136 179 Q158 176 170 188','none',3,c.accent);
      s+=p('M140 188 l9 -3 l-2 9','none',1.6);
    }
    if(c===DATA.kane) {
      s+=p('M80 164 L98 182 L94 197 L76 179Z',c.dark)+p('M120 164 L102 183 L106 197 L124 179Z',c.dark);
      s+=p('M101 197 V240','none',2,c.accent)+[206,220,234].map(y=>e(109,y,2.5,2.5,GOLD,1)).join('');
      s+=p('M135 181 l19 5 l-2 11 l-18 -5Z',GOLD,1.5)+p('M138 185 l12 4 M137 189 l12 4','none',1,c.dark);
    }
    if(c===DATA.ren) s+=p('M52 193 L70 191 L72 218 L53 219Z',BONE,1.4)+p('M57 198 h9 M57 203 h7 M57 208 h10','none',1.2,c.dark);
    if(c===DATA.dora) s+=p('M76 180 L124 180 L141 240 H60Z','#cfbc98',2)+p('M79 218 H120 V240 H77Z','#a18b6c',1.7)+p('M85 222 v5 M95 222 v5 M105 222 v5','none',1,BONE);
    return s;
  }
  function neck(c,f,o,back) {
    let s=p(c===DATA.bor?'M79 144 L75 169 Q101 190 137 169 L126 140Z':'M84 145 L83 169 Q100 181 117 168 L115 143Z',c.skin)+p('M87 148 L115 146 L114 160 L100 169 L85 162Z',c.shade,0);
    if(c.style==='skull') s=p('M93 146 H108 V171 L102 177 L93 169Z',BONE)+p('M94 156 h13 M94 163 h13 M94 169 h13','none',2,c.shade);
    if(back && f.napeSpot) s+=feature('napeSpot',p('M107 153 q8 -5 8 2 l-1 7 l-8 -2Z','#99938b',0));
    // 보르도 수염 아래 노출된 목 하단에서 봉합선을 확인할 수 있다.
    if(o.stitch) s+=feature('stitch',c===DATA.bor&&!back?p('M128 160 Q136 167 132 177 M127 164 l5 1 M129 170 l5 -1 M129 175 l4 -1','none',.95,'#795a54'):p('M91 169 Q102 173 113 168','none',.85,'#795a54')+p('M94 168 l-1 4 M99 169 v4 M104 169 l1 4 M109 168 l2 4','none',1,'#795a54'));
    return s;
  }
  function eyePair(c,f,o) {
    if(o.blank) return feature('blank', [82,118].map(x=>p(`M${x-9} 105 h18`,'none',2)+e(x,110,2.5,3,K)).join(''));
    const col=o.sandEyes?'#c34837':o.eye||f.eye||c.eye;
    let s='';
    for(const x of [82,118]) {
      const tough=c===DATA.bor||c===DATA.helga||c===DATA.kane;
      const y=tough?106:104;
      s+=p(`M${x-11} 110 Q${x-3} ${y-5} ${x+10} ${y+2} Q${x+11} 117 ${x+1} 118 Q${x-8} 118 ${x-11} 110Z`,'#faf0dc',1.6);
      s+=e(x+1,110,5.4,tough?5.5:6.4,col)+e(x+1,110,o.pupil==='slit'?1.05:2.1,o.pupil==='slit'?5:3.6,K);
      s+=e(x+2.7,107,1.35,1.5,'#fff6e4');
      s+=p(`M${x-12} 109 Q${x-3} ${y-5} ${x+10} ${y+2}`,'none',2.8)+p(`M${x-8} 120 l7 1`,'none',1,c.shade);
    }
    if(o.sandEyes) s+=feature('sandEyes',[76,87,112,125].map((x,i)=>e(x,122+i%2*3,1.15,1.55,'#b94c34')).join(''));
    return feature('eyes',s);
  }
  function brows(c,f) {
    const color=c===DATA.bor?c.hair:c.hairShade, width=c===DATA.bor?5:3;
    let s='';
    for(const side of ['L','R']) {
      const x=sx(side,82,118), broken=f.browScar&&f.browScar.side===side;
      s+=p(broken?`M${x-10} 97 l6 -2 M${x+1} 95 l9 2`:`M${x-10} 97 Q${x} 92 ${x+10} 97`,'none',width,color);
      if(broken) s+=feature('browScar',p(`M${x-1} 91 l-3 11`,'none',1.4,'#d4c191'));
    }
    return s;
  }
  function faceMarks(c,f) {
    let s='';
    if(f.freckles) {
      let dots='';
      for(let i=0;i<count(f.freckles,8);i++) for(const side of [-1,1]) dots+=e(100+side*(19+(i%3)*5),125+Math.floor(i/3)*5+(i%2)*3,1.15,1.25,'#9c674d');
      s+=feature('freckles',dots);
    }
    if(f.scarV) { const x=sx(f.scarV.side,80,120); s+=feature('scarV',p(`M${x-1} 89 l3 11 l-2 12 l2 16`,'none',2,'#a36b5b')+p(`M${x+2} 90 l2 9 M${x+3} 116 v9`,'none',.85,'#f0c1a0')); }
    if(f.scarX) { const x=sx(f.scarX.side,67,133); s+=feature('scarX',p(`M${x-4} 125 l8 12 M${x+4} 126 l-8 10`,'none',1.8,'#a26954')); }
    if(f.mole) s+=feature('mole',e(sx(f.mole.side,f.mole.pos==='underEye'?80:69,f.mole.pos==='underEye'?120:131),f.mole.pos==='underEye'?122:133,1.55,1.65,'#684938'));
    if(f.bandaid) { const x=f.bandaid==='nose'?100:72,y=f.bandaid==='nose'?127:131; s+=feature('bandaid',r(x-12,y-4,24,8,'#e3c58e',2,1)+r(x-4,y-3,8,6,'#c8a873',1,0)+[x-8,x+8].map(v=>e(v,y,0.8,0.8,'#937655')).join('')); }
    return s;
  }
  function glasses(c,f) {
    let s='';
    const sides=c.glasses?['L','R']:f.monocle?[f.monocle.side]:[];
    sides.forEach(side=>{const x=sx(side,82,118);s+=e(x,111,13,13,'none',1.9,'#675b49')+p(`M${x-7} 103 l3 -2`,'none',1.3,'#fff4dc');
      if(f.glassesCrack && f.glassesCrack.side===side) s+=feature('glassesCrack',p(`M${x-5} 99 l4 7 l-3 5 l5 6 l-1 7 M${x-4} 110 l-6 1`,'none',.95,'#554744'));
    });
    if(c.glasses) s+=p('M95 109 Q100 106 105 109 M59 107 l10 2 M131 109 l10 -2','none',1.8,'#675b49');
    if(f.monocle) { const x=sx(f.monocle.side,68,132);s+=p(`M${x} 116 Q${x+6} 143 ${x+3} 165`,'none',1.2,GOLD); }
    return s;
  }
  function face(c,f,o) {
    let shape='M60 97 Q58 67 98 63 Q141 62 141 102 L136 130 Q124 152 101 158 Q77 155 64 133Z';
    if(c===DATA.helga) shape='M55 97 Q56 66 99 64 Q142 62 146 98 L146 128 L132 151 Q101 167 68 150 L55 129Z';
    if(c===DATA.sere||c===DATA.enoch||c===DATA.kane) shape='M64 98 Q61 62 101 63 Q140 66 138 99 L132 132 Q123 150 101 161 Q78 149 69 131Z';
    let s=p(shape,c.skin)+p('M126 78 Q144 89 135 126 Q126 147 101 158 L106 146 Q127 132 125 110Z',c.shade,0);
    s+=p('M71 115 Q68 131 81 139 L74 126Z',c.shade,0);
    s+=brows(c,f)+eyePair(c,f,o);
    const nose=c===DATA.bor?'M99 113 L90 127 Q96 135 109 130 L105 123':'M100 117 l-3 12 l7 2';
    s+=p(nose,c===DATA.bor?c.shade:'none',1.5,'#996e5c')+p('M98 124 l3 -1','none',1.3,'#ffe3c1');
    if(o.blank) s+=p('M89 142 H111','none',2);
    else if(c===DATA.pipi) {
      s+=p('M84 138 Q100 143 117 136 Q113 152 100 151 Q88 150 84 138Z','#754139',1.6);
      s+=p('M87 140 Q101 144 114 138 L112 144 Q99 148 90 144Z','#fff1d2',0);
      if(f.toothGap) s+=feature('toothGap',p('M99 142 L104 142 L104 147 L99 147Z','#754139',0));
    } else if(c===DATA.helga) s+=p('M80 139 Q101 150 125 137 Q115 155 97 153Z','#69483b',1.8)+p('M87 143 Q103 148 119 140','none',2,BONE);
    else if(c===DATA.kane) s+=p('M90 143 Q103 140 113 143','none',1.8)+p('M96 148 h10','none',1,c.shade);
    else if(c===DATA.enoch) s+=p('M90 140 Q101 146 113 140','none',1.5)+p('M94 148 h10 M85 135 l-3 8 M116 135 l3 8','none',1,c.shade);
    else s+=p('M89 141 Q99 147 111 139','none',1.8)+p('M95 150 l8 1','none',1,c.shade);
    if(f.tusks) s+=feature('tusks',p('M82 146 Q84 137 82 132 Q93 137 91 148Z M113 149 Q111 136 120 131 Q118 139 122 144Z',BONE,1.6));
    if(c===DATA.dora||c===DATA.enoch||c===DATA.bor) s+=p('M67 116 l-3 2 M134 117 l4 2 M79 132 l-4 7 M120 133 l5 8','none',1.1,'#996e5c');
    return s+faceMarks(c,f)+glasses(c,f);
  }
  function braid(c,x,y) {
    let s=p(`M${x-7} ${y-6} Q${x-13} ${y+20} ${x-5} ${y+58} L${x+4} ${y+65} Q${x+12} ${y+33} ${x+7} ${y-6}Z`,c.hair);
    for(let i=0;i<5;i++) s+=p(`M${x-7} ${y+i*11} q12 -1 14 9 l-8 6 l-12 -10Z`,i%2?c.hair:c.hairShade,1.2);
    return s+p(`M${x-5} ${y+62} l-3 12 l9 -4 l6 4 l-4 -13Z`,c.hair,1.7)+r(x-6,y+58,13,5,GOLD,1,1.3);
  }
  function hairBack(c,f,back) {
    if(c.style==='skull'||c.style==='void'||c.style==='hood') return '';
    if(c.style==='bald') return back?p('M60 104 Q57 66 101 64 Q143 66 142 111 L136 141 Q98 172 63 137Z',c.skin)+p('M60 112 Q68 143 100 141 Q133 141 142 111 L139 145 Q100 170 62 145Z',c.hair)+p('M73 143 Q100 158 130 143','none',2,c.hairShade):'';
    if(c.style==='long'&&back&&f.hairDrape) {
      // 한쪽으로 모은 긴 머리는 목덜미를 드러내며, 앞뒤에서 같은 쪽에 남는다.
      let long=p('M55 109 Q49 61 95 58 Q148 54 146 105 L142 142 Q130 153 118 150 L86 146 Q76 182 90 216 L72 229 Q45 196 55 109Z',c.hair);
      long+=p('M123 67 Q148 86 142 142 L118 150 L109 144 Q137 117 123 67Z',c.hairShade,0)+p('M63 131 Q56 185 74 215 L88 214 Q77 185 86 146Z',c.hairShade,0);
      long+=p('M75 75 Q60 104 66 130 M96 69 Q113 106 89 137 M120 81 Q131 113 119 135 M65 151 Q63 185 76 207','none',1.8,c.hairShade);
      return f.hairDrape.side==='L'?long:flip(long);
    }
    let s=p('M55 112 Q49 62 94 58 Q147 54 146 105 L144 146 L126 159 L66 151Z',c.hair);
    s+=p('M123 66 Q151 89 143 146 L126 156 L126 108Z',c.hairShade,0);
    if(c.style==='braids') s+=braid(c,58,131)+braid(c,141,131);
    if(c.style==='bob') s+=p('M55 101 L52 144 L65 157 L74 150 L66 111Z M136 106 L148 146 L132 156 L125 148Z',c.hair)+p('M60 121 l1 23 M136 124 l4 17','none',1.7,c.hairShade);
    if(back) {
      s+=p('M72 85 Q64 116 76 137 M94 72 Q85 102 93 141 M114 75 Q130 97 124 143','none',1.8,c.hairShade);
      if(c.style==='curly') s+=curls(c,true);
      if(c.style==='topknot') s+=bun(c);
    }
    return s;
  }
  function curls(c,back) {
    // 여러 원 대신 서로 맞물린 곱슬 덩어리로 실루엣과 음영을 만든다.
    const clusters=back?[[66,92],[88,75],[113,79],[133,99],[70,119],[96,109],[124,128],[96,142]]:[[61,91],[71,74],[92,66],[115,68],[133,81],[138,101]];
    return clusters.map(([x,y],i)=>g(p('M-11 3 Q-18 -7 -8 -12 Q-1 -19 8 -11 Q18 -10 12 1 Q16 12 3 13 Q-9 17 -11 3Z',c.hair,2.2)+p('M-10 6 Q-2 14 9 6 L12 1 Q16 12 3 13 Q-8 16 -10 6Z',c.hairShade,0)+p('M-7 -3 Q-5 -10 3 -7','none',1.4,'#ac7850'),`translate(${x} ${y}) rotate(${i%2?15:-12})`)).join('');
  }
  function bun(c) {
    const right=c===DATA.dora;
    let s=p('M58 70 Q46 59 53 44 Q62 32 80 44 Q94 51 84 69Z',c.hair)+p('M58 47 Q55 60 68 66 L80 65 Q84 47 72 43Z',c.hairShade,0)+p('M59 50 Q60 43 67 44 M70 47 Q82 51 77 60','none',1.6,c.hair);
    s+=p('M56 67 L84 63 L86 70 L59 75Z',GOLD,1.7)+p('M46 55 L93 43','none',3,'#6b5039');
    return right?flip(s):s;
  }
  function hairFront(c,f) {
    let s='';
    if(c.style==='bald') return p('M59 103 Q57 91 69 83 L67 112 L59 124Z M140 104 Q143 91 131 83 L134 113 L142 124Z',c.hair,2.2)+p('M82 75 Q95 69 109 74','none',2.2,'#f0c8a5');
    if(c.style==='skull'||c.style==='void'||c.style==='hood') return '';
    s+=p('M56 106 Q50 68 80 61 Q126 45 144 81 L143 112 L133 95 L121 84 L125 97 Q104 95 87 78 Q82 96 59 101Z',c.hair);
    s+=p('M94 61 Q128 53 144 81 L143 110 L130 90 L118 78 L121 91 Q106 86 94 61Z',c.hairShade,0);
    s+=p('M61 89 Q64 71 79 68 M87 65 Q103 63 117 71','none',2,c===DATA.pipi?'#ad7b53':c.accent);
    s+=p('M87 78 Q100 89 111 90 M128 69 Q136 80 138 91','none',1.5,c.hairShade);
    if(c.style==='curly') s+=curls(c,false)+p('M81 80 Q70 91 80 99 Q93 103 98 89 Q101 80 94 77','none',2,c.hairShade);
    if(c.style==='topknot') s+=bun(c);
    if(f.cowlick) s+=feature('cowlick',p('M94 63 Q86 46 96 39 Q93 51 103 54 Q110 46 119 48 L110 63Z',c.hair,2.2));
    if(f.hairDrape) {
      let drape=p('M60 96 Q45 129 56 177 Q64 206 76 212 L88 202 Q68 160 77 114Z',c.hair)+p('M60 115 Q57 165 79 204 L87 202 Q68 155 77 114Z',c.hairShade,0)+p('M60 136 Q60 170 74 191','none',1.8,c.hair);
      s+=feature('hairDrape',f.hairDrape.side==='L'?drape:flip(drape));
    }
    return s;
  }
  function jewelry(c,f,back) {
    let s='';
    if(f.earring) {
      const x=sx(f.earring.side,53,147);
      let part=e(x,122,2,2,GOLD,1);
      if(f.earring.type==='feather') part+=p(`M${x} 125 Q${x-12} 129 ${x-7} 149 Q${x+8} 144 ${x+3} 128Z`,'#eee0ba',1.5)+p(`M${x+1} 126 l-7 20 M${x-6} 135 l5 1`,'none',1,'#897659');
      else part+=e(x,129,5,7,'none',2.5,GOLD)+p(`M${x-3} 126 l1 -2`,'none',1.2,'#f8dca0');
      s+=feature('earring',part);
    }
    if(f.ribbon) {const x=sx(f.ribbon.side,58,141),y=184; s+=feature('ribbon',p(`M${x} ${y} l-13 -7 l-2 14 l14 -3 l-6 14 l8 -4 l5 -12 l10 5 l1 -15Z`,f.ribbon.color,1.8)+e(x,y+2,3,3,f.ribbon.color,1.3)+p(`M${x-9} ${y} l6 2 M${x+5} ${y+1} l6 -2`,'none',1.2));}
    if(!back && f.circlet) s+=feature('circlet',p('M65 88 Q99 96 136 88','none',3,'#dedce8')+p('M93 92 L100 85 L107 92 L100 101Z','#e9e8ed',1.3)+p('M97 92 L100 89 L103 92 L100 97Z','#8a77ac',.8));
    if(!back && f.necklace) {s+=feature('necklace',p('M74 156 Q76 190 122 179 L131 157','none',2,'#73553c')+(f.necklace==='bone'?[82,97,113].map((x,i)=>g(p('M-3 -8 Q-8 -12 -9 -6 Q-9 -2 -4 -2 L-4 7 Q-9 10 -5 13 Q-1 15 1 10 Q7 13 8 8 Q8 4 3 5 L3 -3 Q8 -5 5 -9 Q2 -11 -3 -8Z',BONE,1.4),`translate(${x} ${i===1?182:178}) rotate(${i===0?-22:20})`)).join(''):e(100,179,7,8,GOLD,1.7)));}
    return s;
  }
  function beard(c,f) {
    if(c!==DATA.bor) return '';
    let s=p('M62 124 L72 139 Q87 135 100 141 Q115 136 129 133 L137 122 L130 150 L117 164 L101 171 L83 165 L67 151Z',c.hair)+p('M116 139 L129 134 L133 131 L129 149 L114 163 L101 170 L94 163Z',c.hairShade,0);
    s+=p('M75 138 Q86 128 100 137 Q114 128 125 137 L117 145 L100 141 L84 147Z',c.hair,2);
    s+=p('M76 148 l10 9 M123 146 l-10 10','none',1.4,c.hairShade);
    const n=count(f.beardKnots,6);
    for(let i=0;i<n;i++) {const x=100+(i-(n-1)/2)*16, y=153+((i===0||i===n-1)?0:4);s+=feature('beardKnots',g(p('M-7 0 Q-12 15 -3 29 L0 34 L7 26 Q11 12 7 0Z',c.hair,1.8)+p('M-7 5 l13 8 l-12 7 l10 6 M6 4 l-12 9','none',1.3,c.hairShade)+r(-6,23,12,5,GOLD,1,1.3)+p('M-3 29 l-2 9 l6 -3 l4 3 l-2 -10Z',c.hair,1.3),`translate(${x} ${y})`));}
    // 낡은 공명석은 금고리와 구분되도록 왼쪽 어깨에 매단다.
    return s+p('M51 132 L48 159','none',1.5,'#846e54')+p('M48 152 l-6 6 l3 9 l8 -1 l3 -10Z','#719a9b',1.8)+p('M46 157 l4 -2','none',1.5,'#bed4ce');
  }
  function wizardHat(c,f,back) {
    const left=f.hatTilt!=='R';
    let s=p('M59 76 Q68 52 65 17 L45 10 Q70 -1 84 22 L123 69Z',c.cloth)+p('M66 17 Q79 22 93 48 L119 68 L92 73 L77 38Z',c.dark,0);
    s+=p('M60 64 Q88 77 127 66 L134 79 Q97 91 56 77Z','#a48b5f',2);
    s+=p('M40 75 Q66 70 96 75 Q133 79 158 69 L161 78 Q102 101 40 84Z',c.cloth)+p('M45 83 Q103 96 156 77','none',2,c.dark);
    if(!back && f.hatPatch) s+=feature('hatPatch',f.hatPatch==='star'?p('M79 39 l4 7 l8 1 l-6 6 l1 8 l-7 -4 l-7 3 l1 -8 l-6 -6 l9 -1Z','#c8aa68',1.2)+p('M72 48 l3 2 M81 44 l1 3 M85 55 l-3 1','none',.8,c.dark):r(71,42,18,16,'#c8aa68',1,1.3)+p('M74 44 v4 M84 44 v4 M74 55 h4','none',1,c.dark));
    return feature('hatTilt',left?s:flip(s));
  }
  function cap(c,back) {
    // 천을 접어 올린 왕립 서기관 모자. 현대식 제모의 돌출 챙은 두지 않는다.
    let s=p('M59 86 Q49 69 67 56 Q83 42 108 51 L128 59 Q140 67 138 86 L121 94 L76 93Z',c.cloth)+p('M108 52 L128 59 Q140 67 138 86 L121 91 L116 70Z',c.dark,0)+p('M61 79 Q98 92 136 79 L134 93 Q100 104 63 93Z',c.cloth)+p('M66 86 Q99 97 132 86','none',1.6,GOLD)+p('M77 57 Q67 65 71 76 M94 55 Q86 66 86 79','none',1.6,c.dark);
    if(!back)s+=p('M114 74 L122 70 L130 74 L128 84 L122 89 L116 84Z',GOLD,1.3)+p('M119 76 h6 M122 75 v9 M118 80 h8','none',1.3,c.dark);
    return s;
  }
  function skull(c,f,o,back) {
    let s=p('M61 97 Q60 61 99 63 Q142 62 141 103 L137 128 L127 137 L123 154 Q100 163 78 153 L74 137 L62 128Z',BONE)+p('M121 75 Q145 91 136 123 L124 133 L122 150 L102 157 L106 145 L119 124Z',c.shade,0);
    if(!back) {
      for(const x of [81,119]) {
        s+=p(`M${x-12} 106 Q${x-3} 99 ${x+11} 106 L${x+10} 120 L${x-4} 124 L${x-13} 117Z`,K,1);
        if(!o.blank)s+=e(x,113,5,6,o.sandEyes?'#c34837':o.eye||f.eye||c.eye)+e(x,113,o.pupil==='slit'?.8:1.7,4,K)+e(x+2,110,1,1,'#f0f6df');
      }
      s+=p('M99 123 l-6 11 l7 -2 l6 2 l-4 -11Z',K,1);
      s+=p('M73 130 l9 3 M126 130 l-9 3','none',1.5,c.shade);
      s+=o.talk&&!o.blank?p('M81 140 Q100 145 119 140 L118 157 Q100 170 82 156Z',K,1.5)+p('M83 156 Q100 166 117 156 L116 164 Q100 174 84 163Z',BONE,1.8):p('M80 144 Q100 149 120 143','none',2.1);
      s+=[87,95,103,111].map(x=>p(`M${x} 140 v${o.talk&&!o.blank?6:10}`,'none',1.2,c.shade)).join('');
      if(f.skullCrack) {const x=sx(f.skullCrack.side,81,119);s+=feature('skullCrack',p(`M${x} 81 l-4 8 l5 5 l-3 7 M${x-4} 89 l-6 -1`,'none',1.15,'#746e62'));}
      if(o.sandEyes)s+=feature('sandEyes',e(81,126,1.5,2,'#b74d37')+e(123,127,1.2,1.8,'#b74d37'));
    }
    let helmet=p(back?'M57 116 Q47 55 101 53 Q151 53 144 117 L135 143 L63 140Z':'M55 108 Q50 56 100 53 Q150 53 146 108 L136 109 L130 83 Q101 71 70 86 L65 111Z',c.cloth);
    helmet+=p('M101 55 Q145 55 146 107 L136 108 L130 82 L116 76Z',c.dark,0)+p('M65 79 Q74 61 99 61','none',3,c.accent)+p('M99 57 L99 72','none',2,c.accent);
    if(f.helmetDent){const x=sx(f.helmetDent.side,63,137);helmet+=feature('helmetDent',p(`M${x-4} 84 l6 4 l-4 7 l6 4`,'none',2.4)+p(`M${x+3} 83 l3 4`,'none',1,c.accent));}
    s+=helmet;
    if(f.plume) {let plume=p('M108 59 Q113 28 143 25 Q166 22 172 46 L155 38 L150 46 L145 39 L132 48 L119 66Z',f.plume.color,2.3)+p('M119 57 Q135 30 159 32','none',1.5,'#dc8b6b')+p('M143 29 l-4 8 M156 30 l-6 7','none',1.2);s+=feature('plume',f.plume.side==='R'?plume:flip(plume));}
    return s;
  }
  function hand(c,x,y,back) {
    const skin=c.style==='skull'?BONE:c.skin;
    let s=p(`M${x-11} ${y+10} L${x-12} ${y-4} Q${x-11} ${y-10} ${x-5} ${y-8} L${x+3} ${y-9} Q${x+10} ${y-8} ${x+10} ${y-2} L${x+8} ${y+9} L${x+1} ${y+15}Z`,skin,2.2);
    s+=p(`M${x+7} ${y-5} L${x+8} ${y+7} L${x} ${y+13} L${x-5} ${y+9}Z`,c.shade,0);
    s+=p(`M${x-10} ${y+3} Q${x-2} ${y-5} ${x+3} ${y-1} L${x+2} ${y+4} L${x-4} ${y+7}`,'none',1.6);
    s+=p(`M${x+2} ${y+6} l5 1 M${x} ${y+10} l5 1`,'none',1.1,'#886a56');
    if(back)s+=p(`M${x-7} ${y-3} l1 4 M${x-3} ${y-5} l1 4`,'none',1.1,c.shade);
    return s+p(`M${x-12} ${y+10} L${x+4} ${y+16} L${x+1} ${y+23} L${x-14} ${y+18}Z`,c.dark,2)+p(`M${x-10} ${y+15} l11 4`,'none',1.5,c.accent);
  }
  function item(c,back) {
    // 소지품은 항상 같은 손. 뒷모습의 좌우 전환은 fig의 바깥 그룹에서 맡는다.
    const x=c.side==='L'?40:160;
    let s='',y=198;
    switch(c.item) {
      case 'bow':
        s=p('M158 121 Q194 172 164 238','none',7,'#75513a')+p('M158 121 Q180 175 164 238','none',2,'#c19a64')+p('M158 121 L164 238','none',1.15,BONE)+p('M165 176 l10 1 M164 181 l11 1 M164 186 l10 1','none',2,c.dark);y=186;break;
      case 'pan':
        s=p('M40 158 V223','none',8,'#76553a')+p('M36 186 h8 M36 192 h8','none',1.3,GOLD)+p('M18 135 Q16 112 38 111 Q64 110 64 136 Q62 157 40 160 Q17 158 18 135Z','#53514e')+e(40,135,17,18,'#393936',1.5)+p('M24 126 Q30 115 42 117','none',2.2,'#9b9d8a')+p('M47 147 l7 -5 M27 134 l1 -7','none',1.3,'#72756b');y=190;break;
      case 'lute':
        s=p('M148 129 L157 126 L167 199 L156 203Z','#946944',2)+p('M145 114 L157 112 L160 135 L149 137Z','#72503c',2)+p('M145 118 h-5 M146 125 h-5 M158 118 h5 M159 125 h5','none',2.5,GOLD)+p('M155 184 Q139 188 136 211 Q133 236 162 239 Q189 237 187 216 Q186 196 168 182Z','#c18a4e')+p('M169 187 Q190 208 183 227 Q177 239 159 236 L163 227 Q181 216 169 187Z','#94633d',0)+e(161,209,8,9,'#624331',1.6)+e(161,209,5,6,K)+p('M153 127 L163 228 M156 127 L166 228','none',.85,BONE)+p('M153 230 l20 -1','none',3,'#6d4834');y=164;break;
      case 'shield':
        s=p('M12 169 L42 159 L72 168 L69 207 Q62 227 43 239 Q19 226 15 204Z','#92998f')+p('M19 173 L42 166 L65 173 L62 205 Q57 220 43 231 Q27 220 23 203Z',c.dark,2)+p('M42 168 V226 L61 204 L64 174Z',c.cloth,0)+p('M24 198 H61 M42 174 V224','none',3,GOLD)+e(42,199,8,9,c.accent,2)+e(42,199,3,4,GOLD,1)+p('M55 171 l-5 13 l6 7','none',1.7)+[24,60].map(xx=>e(xx,177,2,2,GOLD,1)).join('');y=181;break;
      case 'staff':
        s=p('M159 89 L163 242','none',7,'#745740')+p('M159 113 L162 237','none',1.5,'#af956a')+p('M159 103 Q139 89 151 77 Q140 64 159 57 Q179 67 169 80 Q181 93 159 103Z','#806b4b')+p('M157 69 L168 79 L160 94 L150 82Z','#79bdb3',2)+p('M157 70 L158 84 L151 82Z','#c0e1ca',0)+p('M153 116 l12 -2 M154 121 l11 -2 M154 126 l11 -2','none',2,c.accent);y=194;break;
      case 'lantern':
        s=p('M152 199 Q147 183 160 183 Q173 183 168 199','none',3,'#806f52')+p('M145 205 L151 195 H169 L177 204 L174 236 H147Z','#826a46')+r(150,205,21,27,'#edbe69',1,1.5)+p('M157 226 Q151 219 159 211 Q159 218 166 222 Q168 230 160 230Z','#fff1b5',0)+p('M160 204 V233 M148 218 H173','none',2,'#816341')+p('M146 236 H175','none',3);y=180;break;
      case 'axe':
        s=p('M156 144 L163 240','none',7,'#79543b')+p('M153 145 Q175 137 181 155 L187 170 Q174 182 159 177 L160 163Z','#9ca7a6')+p('M180 152 L187 170 Q175 181 163 176 L165 171 Q178 167 180 152Z','#d8ddd0',1)+p('M160 147 L162 165','none',4,c.dark)+p('M157 193 l8 -1 M158 198 l8 -1','none',2,c.accent);y=201;break;
      case 'book':
        s=p('M19 176 L59 173 L63 222 L22 227Z','#75483e')+p('M26 178 L56 177 L58 215 L29 220Z','#e1d1aa',1.5)+p('M24 221 L60 216 L63 221 L24 228Z','#b4a17d',1)+p('M33 185 l17 -2 M34 191 l16 -2 M34 197 l12 -1','none',1.2,'#917853')+p('M53 171 L61 170 L65 208 L57 209Z','#f1dfb4',1.5)+e(54,217,6,7,'#a54d3c',1)+p('M51 213 l5 7 M57 213 l-5 7','none',1,GOLD);y=214;break;
      case 'box':
        s=p('M130 190 L179 188 L187 199 L185 230 L131 231Z','#8f7755')+p('M132 202 H185 V229 H132Z','#655849',1.8)+p('M137 206 H180 V224 H137Z','#b9b5a0',1.3)+p('M151 204 V224 M166 204 V224','none',1.7,'#655849')+p('M141 220 l-1 -8 l6 -3 l3 8Z','#9d6650',1)+p('M157 219 l-3 -8 l6 -3 l3 10Z','#81a194',1)+e(173,216,4,5,'#b58a64',1)+r(153,195,9,9,GOLD,1,1)+p('M136 193 L136 186 Q154 173 174 186 V190','none',3,'#675746');y=223;break;
      case 'purse':
        s=p('M153 186 Q145 176 150 173 Q158 170 162 181 Q169 171 174 177 L167 188 Q186 198 181 221 Q158 234 143 216 Q140 200 153 186Z','#937046')+p('M165 187 Q183 204 178 220 L159 226 L163 211Z','#674f39',0)+p('M150 188 l23 -1 M156 184 l-7 13 M164 185 l9 10','none',2,GOLD)+e(161,209,8,9,GOLD,1.5)+p('M158 205 h6 M161 203 v12 M158 213 h6','none',1.2,'#765735');y=180;break;
      case 'spear':
        s=p('M166 29 L168 243','none',7,'#776449')+p('M163 27 L161 15 L167 3 L173 15 L170 28Z','#aaa999',2)+p('M150 57 L150 35 L164 26 L182 35 V59 L169 68Z','#827957')+p('M154 37 L165 32 L178 37 V56 L168 62 L154 55Z','#d8b66a',1.5)+p('M163 55 Q156 47 165 38 Q162 46 171 47 Q177 54 169 57Z','#fff0b1',0)+p('M165 32 V61 M151 36 H181','none',2,'#7f704e')+p('M164 85 l7 -1 M164 92 l7 -1','none',2,c.accent);y=199;break;
      default:return '';
    }
    // 방패는 손가락이 가장자리를 감싸며, 소지품을 몸과 분리된 원으로 표현하지 않는다.
    return feature('item',s+(c.item==='shield'?hand(c,68,188,back):hand(c,x,y,back)));
  }
  function mushroom(x,y,size) {
    return g(p('M-3 0 L-4 13 Q0 16 4 12 L3 0Z','#e6d9b5',1.7)+p('M-13 1 Q-12 -14 0 -13 Q13 -12 14 1 Q0 7 -13 1Z','#ad4f3d',2)+p('M-11 2 Q0 7 12 2','none',1.3,'#efd3a2')+e(-5,-5,2.6,2,'#f0d9ba')+e(5,-8,2,1.7,'#f0d9ba'),`translate(${x} ${y}) scale(${size/14})`);
  }
  function moss(x,y,size) {
    return g(p('M-20 4 Q-27 -6 -15 -9 Q-15 -18 -5 -11 Q4 -22 11 -10 Q24 -14 24 -2 Q29 8 15 9 L12 18 L5 8 L-1 15 L-7 8 L-15 12Z','#6e8950',1.8)+p('M-12 -5 l-4 4 M-2 -7 l-3 4 M8 -9 l-2 4 M16 -2 l-3 4 M4 2 l-2 4','none',2,'#a7b868'),`translate(${x} ${y}) scale(${size})`);
  }
  function overlays(c,o,back) {
    let s='';
    if(o.mushroom)s+=feature('mushroom',mushroom(79,61,10)+mushroom(117,55,13)+(back?'':mushroom(143,184,8)));
    if(o.moss)s+=feature('moss',moss(50,200,.8)+moss(145,202,.65)+(back?'':moss(63,98,.35)));
    if(back&&o.backMush)s+=feature('backMush',mushroom(77,192,12)+mushroom(122,188,15)+mushroom(110,222,9));
    if(back&&o.backMoss)s+=feature('backMoss',moss(91,199,1)+moss(122,219,.7));
    if(!back&&o.bandage){let b=p('M31 198 L64 204 L61 222 L28 215Z','#dfd9c5',1.8)+p('M31 203 l32 5 M30 209 l31 5','none',1.2,'#ada68f');s+=feature('bandage',c.side==='R'?b:flip(b));}
    if(!back&&o.mud)s+=feature('mud',p('M48 222 q-8 -9 -10 1 l3 11 l17 5 l8 -7 l-5 -10Z M124 228 q-8 -11 -13 -1 l-1 13 h26 l5 -8Z','#66503c',0)+e(72,222,3,4,'#66503c')+e(139,219,4,2,'#66503c'));
    return s;
  }
  function backFace(o) {
    return feature('backFace',p('M77 104 Q84 95 92 104 L91 116 L79 115Z M108 103 Q118 96 125 105 L122 117 L110 115Z','#eee2bf',1.7)+e(85,107,2.6,4,o.eye||'#845247')+e(116,108,2.6,4,o.eye||'#845247')+p('M83 130 Q100 141 120 129 Q107 151 89 140Z','#73423d',1.7)+p('M91 134 l3 6 M102 136 v6 M113 134 l-2 5','none',1.2,BONE));
  }
  function hood(c,f,o,back) {
    let s=body(c,back)+p('M31 242 Q23 190 51 145 L57 97 Q61 54 95 48 Q135 41 144 97 L152 147 Q178 182 178 242Z',c.cloth);
    s+=p('M104 50 Q135 49 144 97 L152 147 L175 210 L178 242 H127 L120 182 L134 134 L123 75Z',c.dark,0);
    if(back)s+=p('M61 97 Q96 122 138 96 L133 141 Q102 170 66 143Z',c.cloth)+p('M69 117 Q87 142 106 147 M99 115 l22 26','none',1.8,c.dark);
    else {
      s+=p('M68 102 Q73 66 100 65 Q128 68 134 105 L126 138 L100 160 L74 139Z','#393633');
      s+=p('M76 107 L125 107 L123 132 Q115 148 99 152 Q85 148 79 135Z',c.skin,1.6)+p('M117 108 L126 107 L122 134 L103 150 L107 138Z',c.shade,0);
      s+=p('M81 108 l11 3 M107 110 l11 -4','none',2.2)+e(87,111,2,1.1,o.eye||c.eye)+e(112,110,2,1.1,o.eye||c.eye);
      s+=p('M98 116 l-4 13 l7 2 M90 140 Q100 137 110 138 M83 125 l3 5 M113 128 l-3 5 M92 145 l9 1','none',1.4,'#78564d');
      s+=faceMarks(c,f)+p('M74 93 l-1 37 l9 -7 l4 -36 l5 9 l5 -22Z',c.hair,1.8)+p('M121 86 l10 18 l-5 18 l-7 -20Z',c.hairShade,1.8);
      s+=p('M70 92 Q91 64 115 76 L128 91 Q101 85 84 108Z',c.dark,0);
      s+=p('M63 142 L89 169 L58 201 L47 189Z',c.dark)+p('M129 139 L105 166 L134 198 L149 180Z',c.dark);
      s+=p('M29 187 Q38 167 62 172 L70 190 L37 204Z','#777b71')+p('M37 181 l20 -3 M39 195 l22 -6','none',2,'#a3a498');
      s+=p('M67 172 L125 237 L139 232 L79 165Z','#735d48',2)+r(95,200,20,16,'#a59a71',1,1.5);
      if(o.stitch)s+=feature('stitch',p('M94 155 l15 -2 M98 152 v5 M103 151 v5 M108 150 v5','none',.9,'#9c8072'));
    }
    s+=p('M54 207 L46 237 M75 213 l-1 25 M143 207 l12 29','none',2,c.dark)+p('M42 229 l8 2 M41 234 l8 2','none',1,c.accent);
    return s+item(c,back)+(back&&o.backFace?backFace(o):'')+overlays(c,o,back);
  }
  function voidFigure(c,o,back) {
    let s=p('M24 242 L33 203 L62 184 L78 182 L77 128 L115 124 L122 184 L157 192 L177 242Z',c.cloth)+p('M78 129 L116 125 L122 185 L103 204 L78 182Z',c.skin)+p('M103 137 L116 125 L122 185 L106 197Z',c.shade,0);
    s+=p('M59 100 Q52 53 94 45 Q137 40 142 87 L136 127 Q126 153 102 159 Q77 150 66 132Z',c.skin)+p('M124 61 Q146 74 136 119 L121 147 L102 158 L111 132 L122 102Z',c.shade,0);
    if(!back) {
      s+=p('M71 85 Q85 75 91 90 L89 110 Q77 120 72 104Z M109 83 Q123 75 129 91 L126 114 Q112 117 110 104Z',K,1.4);
      if(o.eye||o.sandEyes||o.pupil) s+=e(81,99,o.pupil==='slit'?1:2,5,o.sandEyes?'#bd513c':o.eye||'#a5987c')+e(120,99,o.pupil==='slit'?1:2,5,o.sandEyes?'#bd513c':o.eye||'#a5987c');
      s+=p('M98 108 l-5 12 l10 1','none',1.2,'#8f897f');
      s+=o.blank?p('M82 136 H119','none',2):p('M68 121 Q97 143 135 113 Q125 154 99 147 Q80 144 68 121Z','#59403a',2)+p('M75 126 l4 9 M84 132 l3 9 M94 137 v8 M105 136 l-1 9 M117 131 l-2 10 M126 124 l-3 9','none',2,BONE);
    } else s+=p('M86 57 L91 81 L87 109 L95 130 L93 145','none',1.3,'#898075')+(o.backFace?backFace(o):'');
    s+=p('M65 181 L96 207 L65 225 L45 196Z',c.dark)+p('M122 181 L103 206 L132 228 L157 197Z',c.dark)+p('M91 213 L86 242 M109 216 L123 242','none',1.8,c.accent);
    s+=p('M39 239 Q35 218 43 207 L51 203 L57 184 Q60 181 62 186 L60 207 L64 200 Q70 197 69 205 L62 223 L58 240Z',c.skin,2.3)+p('M46 217 l5 18 M54 215 l3 15','none',1.3,c.shade);
    if(o.stitch)s+=feature('stitch',p('M85 174 Q100 181 115 173 M89 172 l-1 6 M97 175 v6 M105 175 l1 6 M112 173 l2 6','none',.95,'#887568'));
    return s+overlays(c,o,back);
  }
  function fig(id,o={},back=false) {
    if(!Object.prototype.hasOwnProperty.call(DATA,id)) throw new RangeError('알 수 없는 캐릭터: '+id);
    o=o||{};
    const c=DATA[id],f=features(c.feat,o.f);
    let s='';
    if(id==='hood')s=hood(c,f,o,back);
    else if(id==='void')s=voidFigure(c,o,back);
    else {
      s=body(c,back)+(back?'':hairBack(c,f,false))+neck(c,f,o,back);
      if(c.style==='skull')s+=skull(c,f,o,back);
      else if(back)s+=ears(c)+hairBack(c,f,true);
      else s+=ears(c)+face(c,f,o)+hairFront(c,f);
      if(id==='ren')s+=wizardHat(c,f,back);
      if(id==='kane')s+=cap(c,back);
      if(!back)s+=beard(c,f);
      s+=jewelry(c,f,back);
      if(back&&o.backFace)s+=backFace(o);
      s+=item(c,back)+overlays(c,o,back);
    }
    if(back)s=flip(s);
    if(c.small)s=g(s,'translate(12 28.8) scale(.88)');
    if(o.mirror)s=flip(s);
    return `<g data-character="${id}" data-view="${back?'back':'front'}" stroke="${K}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${s}</g>`;
  }
  function shadowExtra(o={}) {
    // 채색은 호출자가 담당한다. mirror만 추가 경로에도 적용한다.
    const shapes={
      horns:'M62 83 Q32 67 39 24 Q48 55 79 62 L87 109 L67 109Z M121 64 Q150 54 160 25 Q173 63 139 85 L133 109 L113 109Z',
      tail:'M145 224 Q188 222 187 187 Q187 166 166 177 L170 165 L160 155 L178 155 Q198 159 198 184 Q200 228 158 239Z',
      arm:'M147 186 Q166 166 179 139 L180 119 Q181 112 184 119 L186 132 L188 115 Q191 109 193 116 L192 134 Q200 129 199 138 L190 156 Q184 199 158 220Z'
    };
    let s=shapes[o.shadowShape]?`<path data-shadow-extra="${o.shadowShape}" d="${shapes[o.shadowShape]}"/>`:'';
    return o.mirror&&s?flip(s):s;
  }
  Object.values(DATA).forEach(c=>{c.feat.eye=c.eye;});
  const api={fig,shadowExtra,DATA};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CHAR_ART=api;
})(typeof window!=='undefined'?window:null);
