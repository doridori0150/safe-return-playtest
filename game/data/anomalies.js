// 무사귀환 — 이상 계열 ("그것"의 종류)
// 계열마다: make(단골) 겉모습·전리품 / window 창구 단서 / dinner 식탁 단서 / patrol 문 앞 단서(기름별 열쇠 구멍) / night 밤 계획 / hunt 전투 값
// 새 계열을 넣으려면 항목 하나를 더하고 floors.js의 anomaly에 연결한다. 훅에 없는 값은 엔진이 진짜 단골의 값을 쓴다.
window.SRG=window.SRG||{};
const _n=id=>(SRG.regulars[id]||{}).name||id;
SRG.anomalies={
 mimic:{name:'흉내쟁이',desc:'곰팡이가 사람을 흉내 낸다. 습관을 모른다.',
  make(reg){return{look:reg.id,o:{f:reg.fakeF},loot:['coin'],shoes:reg.fakeShoes||reg.shoes};},
  window:{
   hi:r=>'"다녀왔어요."',
   ask:r=>r.twin?`"잘 다녀왔어요." ${_n(r.twin)} 얘기를 한 마디도 하지 않는다.`:'"잘 다녀왔어요." 늘 하던 얘기가 없다.',
   pw:(r,pw)=>`"………${pw.a}." 대답이 한참 늦다.`,
   voice:r=>'또박또박하다. 카드 메모의 말버릇이 없다.',
   tally:r=>'부절이 딱 맞는다. (부절은 훔칠 수 있다)',
   lamp:r=>'얼굴이… 잠깐 일그러졌다.',
  },
  dinner:{eats:false,hand:'late',hum:false,shadow:'late',talk:r=>'"…네." 짝 얘기에도 반응이 없다.'},
  patrol:{
   knock:(r,st)=>st==='out'?'…대답 대신 문 안쪽을 긁는 소리.':`"…누구세요?" ${r.name}답지 않게 공손하다.`,
   listen:(r,st)=>st==='out'?'아무 소리도 없다. 방이 비어 있는 것처럼.':'숨소리가 없다. 벽 쪽으로 사각사각.',
   keyhole:{oil:'침대는 그대로다. 누군가 벽을 보고 서 있다. 움직이지 않는다.',oil_moss:'벽을 보고 선 사람의 피부가 이끼 빛에 잿빛으로 드러난다. 사람이 아니다.',oil_red:'벽을 보고 서 있다. 그림자는 사람 모양이다.',out:'방이 비어 있다. 문고리에 긁힌 자국.'},
   shoes:'new'},
  night:{plan:'swap',outAt:1*60+30,wanderMin:12},   // 01:30에 방을 나와 옆방 문을 긁는다
  hunt:{hp:3,speed:1.7,lampWeak:true},
 },
 shadow:{name:'걸어 나온 그림자',desc:'붉은 달 아래 일어난 그림자. 사람의 모양을 빌린다.',
  make(reg){const shape=['horns','tail','arm'][Math.floor(Math.random()*3)];return{look:reg.id,o:{shadowShape:shape,blank:1},loot:['shadow'],shoes:reg.shoes,shape};},
  window:{
   hi:r=>'"…늦었군."',
   ask:r=>'"황야는… 조용했다." 붉은 달 얘기를 피한다.',
   pw:(r,pw)=>`"${pw.a}." 정확하다. 목소리가 한 박자 늦게 닿는다.`,
   voice:r=>'목소리가 한 박자 늦게 온다. 입보다 소리가 늦다.',
   tally:r=>'부절이 맞는다.',
   lamp:r=>`등불을 비추자 벽의 그림자가 사람 모양이 아니다 — ${{horns:'뿔',tail:'꼬리',arm:'팔이 하나 더'}[r.shape]||'뿔'}.`,
  },
  dinner:{eats:true,hand:'ok',hum:false,shadow:'shape',talk:r=>'"달이… 두 개였다." 그 말만 되풀이한다.'},
  patrol:{
   knock:(r,st)=>st==='out'?'대답이 없다. 창이 덜컹인다.':'"…" 대답이 옆방 쪽에서 들린다.',
   listen:(r,st)=>st==='out'?'바람 소리. 창이 열려 있다.':'숨소리 대신 모래가 흐르는 소리.',
   keyhole:{oil:'침대에 누워 있다. 창이 조금 열려 있다.',oil_moss:'침대에 누워 있다. 피부는 보통이다.',oil_red:'붉은 빛 아래 벽의 그림자가 제 모양으로 선명하다. 사람의 것이 아니다.',out:'침대가 비어 있다. 창이 활짝 열려 있다.'},
   shoes:'same'},
  night:{plan:'flee',outAt:3*60+30,wanderMin:0},   // 03:30에 창으로 사라져 실을 찢는다
  hunt:{hp:2,speed:2.1,lampWeak:true},
 },
 lure:{name:'문을 열게 하는 것',desc:'두건을 쓴 순례자. 밤에 손님의 이름을 부른다.',guest:'pilgrim',
  make(){return{look:'hood',o:{},loot:[],shoes:'sandals'};},
  window:{hi:r=>'"하룻밤만 묵고 가겠습니다. 손님."',ask:r=>'"…길을 가는 사람입니다, 손님."',pw:(r,pw)=>'"그런 것은 모릅니다, 손님."',voice:r=>'낮고 고르다. 나를 "손님"이라고 부른다.',tally:r=>'부절이 없다. 투숙객이다.',lamp:r=>'두건 아래가 비어 보인다.'},
  dinner:{eats:false,hand:'none',hum:false,shadow:'none',talk:r=>'"손님도 드시지요." 자기는 먹지 않는다.'},
  patrol:{
   knock:(r,st)=>'"손님… 문 좀 열어 주십시오. 등불은 끄시고."',
   listen:(r,st)=>'내 이름을 부르는 소리. 낮고 고르게.',
   keyhole:{oil:'두건이 문 바로 뒤에 서 있다. 이쪽을 보고 있다.',oil_moss:'두건 아래가 잿빛이다.',oil_red:'문 뒤에 그림자가 없다.',out:'방이 비어 있다.'},
   shoes:'none'},
  night:{plan:'lure',outAt:2*60,wanderMin:0},   // 02:00부터 문 안에서 부른다. 등불 없이 열면 위험
  hunt:{hp:3,speed:1.5,lampWeak:true},
 },
};
