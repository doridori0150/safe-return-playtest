// 무사귀환 — 층 데이터
// risk: 기본 위험도, loot: 그 층에서 나오는 전리품, anomaly: 그 층의 이상 계열(anomalies.js), oil: 그 층의 이상을 드러내는 기름
// 층을 더하려면 항목 하나 + anomalies.js에 계열 하나 + recipes.js에 기름 레시피 하나.
window.SRG=window.SRG||{};
SRG.floors={
 B1:{name:'B1 이끼 정원',short:'B1',risk:0,loot:['moss','mush','meat','honey'],anomaly:'mimic',oil:'oil_moss',hurt:'moss',
  blurb:'10년간 웃자란 본래의 미궁. 이끼쥐 떼와 포자.',
  keyhole:{sky:'moon'}},
 B2:{name:'B2 붉은 달의 황야',short:'B2',risk:1,loot:['sand','shell','meat','flower'],anomaly:'shadow',oil:'oil_red',hurt:'sand',
  blurb:'두 개의 달이 뜨는 사막. 붉은 달이 뜨면 그림자가 일어나 걷는다.',
  keyhole:{sky:'redmoon'}},
};
SRG.floorOrder=['B1','B2'];
