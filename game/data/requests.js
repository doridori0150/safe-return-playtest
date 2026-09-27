// 무사귀환 — 아침 요구 (출발 전 단골이 청하는 것)
// 요구 하나에 읽기가 둘이다: 진짜라면 이유가 있고, 가짜라면 속셈이 있다. 답은 준다 / 안 준다 / 대신 다른 것.
// kinds: 요구 종류. cost:[재고 키, 수량] 은 들어주면 바로 빠진다('oilP' 는 등불 기름 P.oil, 'money' 는 돈).
//   promise: 물건이 아니라 약속. nobar/nolamp 는 그날 밤 그 방에 빗장·등불을 못 건다. swap 은 요구자를 옆방으로 옮긴다. norecall 은 그 파티의 귀환 물약이 소용없다. openknock 은 겉으로는 아무 일도 없다.
//   alt: "대신" 버튼으로 주는 것(재고 키). 없으면 대신 버튼이 없다.
// base: 인물별 기준선 요구(1~3일 동안 매일 같다). t 는 대사.
// deviant.real: 진짜인데 사정이 있는 요구. why 는 조건(hurt 앓음·악몽 / grudge 원망 / twin 쌍둥이 싸움). give/deny 는 들어줬을 때·거절했을 때의 결과 키(엔진 46_requests.js).
// deviant.fake: 잠복한 가짜(계열별)의 요구. 들어주면 물건은 아침에 나뭇잎이 되고, 약속은 그 밤 계획을 돕는다.
window.SRG=window.SRG||{};
SRG.requests={
 kinds:{
  none:{n:'없음'},
  lunch:{n:'도시락',cost:['lunch',1],alt:'bread'},
  recall:{n:'귀환 물약',cost:['recall',1],alt:'bread'},
  honey:{n:'꿀 한 병',cost:['honey',1],alt:'bread'},
  bread:{n:'빵',cost:['bread',1]},
  lamp:{n:'등불 기름 한 병',cost:['oilP',10],alt:'bar'},
  money:{n:'5G',cost:['money',5]},
  bar:{n:'빗장을 걸어 주기',promise:'bar'},
  nobar:{n:'빗장을 걸지 않기',promise:'nobar'},
  nolamp:{n:'등불을 걸지 않기',promise:'nolamp'},
  swap:{n:'옆방으로 옮기기',promise:'swap'},
  norecall:{n:'물약 없이 가기',promise:'norecall'},
  openknock:{n:'두드리면 열어 주기',promise:'openknock'},
 },
 base:{
  bor:[{k:'none',t:'"됐다. 장화만 있으면 돼."'},{k:'none',t:'"챙길 거 없다. 장화 봐라."'}],
  pipi:[{k:'lunch',t:'"아리, 도, 도시락! 굴 안에서 배고프면 더 무섭단 말이야."'},{k:'lunch',t:'"도시락 하나만… 어제 것도 맛있었어!"'}],
  sere:[{k:'honey',t:'"꿀 한 병만요오~ 목이 마르면 노래가 안 나와요오~"'},{k:'honey',t:'"오늘도 꿀요오~ 목 관리는 음유시인의 생명이에요오~"'}],
  mumy:[{k:'none',t:'……(고개를 젓는다)'},{k:'none',t:'……(끄덕이고는 돌아선다)'}],
  ren:[{k:'recall',t:'"귀환 물약… 꼭요. 없으면 못 가겠어요…"'},{k:'recall',t:'"물약 있죠? 목록 스물세 가지 채우다 늦으면 큰일이라…"'}],
  dudu:[{k:'lunch',t:'"내 도시락 먼저! 루루 건 나중에!"'},{k:'lunch',t:'"루루보다 큰 걸로! 내가 형이니까!"'}],
  lulu:[{k:'lunch',t:'"두두보다 먼저 주세요! 저요 저!"'},{k:'lunch',t:'"두두 것보다 작으면 안 돼요!"'}],
 },
 deviant:{
  real:{
   hurt:[{k:'lamp',why:'hurt',t:'"…어젯밤 꿈이 무서워서. 등불 하나만 두고 자면 안 될까."',give:'calm',deny:'worse'},
         {k:'lamp',why:'hurt',t:'"밤에 누가 벽을 긁는 꿈을 꿨어. 등불… 하나만."',give:'calm',deny:'worse'}],
   grudge:[{k:'lunch',n:2,why:'grudge',t:'"도시락 둘. 어제 일 생각하면 그 정도는 해 줘야지."',give:'appease',deny:'sulk'},
           {k:'recall',why:'grudge',t:'"물약 정도는 챙겨 줘야 하는 거 아냐. 어제처럼 되긴 싫어."',give:'appease',deny:'sulk'}],
   twin:[{k:'lunch',n:2,why:'twin',t:'"쟤 몫도 내가 들고 갈게. 쟤는 어차피 흘려."',give:'twinSulk',deny:'none'}],
  },
  fake:{
   mimic:[{k:'nobar',t:'"오늘 밤은 빗장 걸지 마. 답답해서 잠을 못 자."'},
          {k:'swap',t:'"방을 옆으로 옮겨 줘. 그쪽이 조용할 것 같아."'},
          {k:'lunch',t:'"…도시락. 남들도 받으니까."'}],
   shadow:[{k:'money',t:'"내 몫 돈 미리 줘. 쓸 데가 있다."'},
           {k:'norecall',t:'"물약은 필요 없다. 늦어도 걸어서 온다."'},
           {k:'nolamp',t:'"문에 등불은 걸지 마라. 빛이 새서 잠이 안 온다."'}],
   lure:[{k:'lamp',t:'"등불 하나만 주십시오, 손님. 밤이 너무 어둡습니다."'},
         {k:'openknock',t:'"밤에 제가 두드리면 열어 주십시오, 손님. 부탁드립니다."'}],
  },
 },
};
