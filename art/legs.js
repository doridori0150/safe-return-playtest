/* 무사귀환 종이 인형 — 다리·신발 파츠 (characters.js와 같은 윤곽 문법: #382c2b 선, 셀 음영)
 * leg(c, shoes, side, back): 한쪽 다리. viewBox 0 0 100 130. 허벅지 위(엉덩이)가 y=0, 발바닥이 y=128.
 * c: CHAR_ART.DATA 항목(cloth/dark/accent/skin). shoes: 신발 키. side: 'L'|'R'. */
(function(root){
  'use strict';
  const K='#382c2b';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const p=(d,fill='none',sw=2.7,stroke=K)=>`<path d="${d}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16);const r=Math.max(0,Math.min(255,((n>>16)&255)*k|0)),g=Math.max(0,Math.min(255,((n>>8)&255)*k|0)),b=Math.max(0,Math.min(255,(n&255)*k|0));return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);};
  // 신발: 발 모양 경로 (발끝이 오른쪽 = 정면 기준 바깥쪽은 호출자가 뒤집는다)
  const SHOES={
    worn_boots:c=>p('M30 86 L70 86 L72 118 Q78 128 60 128 L26 128 Q22 118 30 112Z','#6b4a30')+p('M30 100 h40 M34 112 h10 M52 116 l6 -2','none',1.6,'#3a2616')+p('M62 121 l8 -1','none',1.4,'#a88a5a'),
    new_boots:c=>p('M30 86 L70 86 L72 118 Q78 128 60 128 L26 128 Q22 118 30 112Z','#3a2a1e')+p('M36 92 L64 92','none',1.8,'#7a5a3a')+p('M40 104 l4 14','none',2,'#fff8e6'),
    elf_boots:c=>p('M32 86 L68 86 L70 116 Q90 122 82 128 L28 128 Q24 116 32 110Z','#4a6a3a')+p('M34 96 L66 96 M40 104 l24 -2','none',1.5,'#2f4a2a'),
    small_boots:c=>p('M32 96 L68 96 L70 118 Q76 128 60 128 L28 128 Q24 118 32 114Z','#6b4a30')+p('M34 106 h32','none',1.6,'#3a2616'),
    twin_boots:c=>p('M32 96 L68 96 L70 118 Q76 128 60 128 L28 128 Q24 118 32 114Z','#6b4a30')+p('M34 106 h32','none',1.6,'#3a2616'),
    greaves:c=>p('M28 60 L72 60 L74 118 Q80 128 60 128 L26 128 Q22 118 28 110Z','#9a9ea6')+p('M32 70 h36 M32 84 h36 M32 98 h36','none',1.6,'#5a5e66')+p('M36 66 l6 30','none',1.2,'#e8e8ec'),
    wizard_shoes:c=>p('M32 92 L68 92 L70 116 Q96 118 90 128 L28 128 Q24 116 32 110Z','#3a3a5a')+p('M34 100 h34','none',1.5,'#5a5a7a')+p('M86 124 q6 -8 -2 -10','none',1.6),
    sandals:c=>p('M32 112 L70 112 L72 128 L28 128Z','#8a6a4a')+p('M40 112 l6 -14 l10 14 M34 118 h38','none',1.8,'#5a3a2a')+p('M38 100 L64 100 L68 112 L32 112Z',c.skin||'#e0b896',1.6),
    merchant:c=>p('M30 96 L70 96 L72 118 Q78 128 60 128 L26 128 Q22 118 30 112Z','#2e2a33')+p('M44 104 l14 0','none',2.6,'#cda65f')+p('M48 101 h6 v6 h-6z','none',1.4,'#cda65f'),
    none:c=>p('M34 100 L66 100 L70 128 L28 128Z',c.skin||'#e0b896',2)+p('M40 128 l0 -6 M48 128 v-7 M56 128 v-6','none',1.4),
  };
  function leg(c,shoes,side,back){c=c||{};const cloth=c.dark||c.cloth||'#4a3a2e',hi=shade(cloth,1.18),lo=shade(cloth,.78);
    let s=p('M28 0 L72 0 Q78 40 70 90 L32 90 Q22 40 28 0Z',cloth)+p('M40 6 Q34 40 38 84','none',1.6,hi)+p('M66 10 Q70 46 64 84','none',1.6,lo)+p('M30 88 h42','none',2.2,lo);
    s+=(SHOES[shoes]||SHOES.worn_boots)(c);
    if(side==='L')s=`<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
    return `<g data-leg="${side}" stroke="${K}">${s}</g>`;}
  const api={leg,SHOES:Object.keys(SHOES)};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LEGS_ART=api;
})(typeof window!=='undefined'?window:null);
