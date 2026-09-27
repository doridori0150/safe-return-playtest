// 무사귀환 — 의뢰 풀 (날마다 열린 층에서 3장을 뽑는다: 위험 의뢰 1장 보장, 에녹 의뢰는 enochFrom 일째부터)
// by: 의뢰인, fl: 층, need/qty: 납품 물건, reward: 보상, risky: 위험 의뢰(가짜가 이 파티를 노린다), enoch: 넘기면 경계의 실 −2
// 의뢰를 더하려면 층 배열에 한 줄을 더한다.
window.SRG=window.SRG||{};
SRG.quests={
 B1:[
  {id:'b1a',by:'도라',fl:'B1',need:'moss',qty:2,reward:12,t:'빛나는 이끼 두 줌. 등잔 심지로 쓴단다.'},
  {id:'b1b',by:'헬가',fl:'B1',need:'meat',qty:1,reward:6,t:'이끼쥐 고기 한 덩이. 오늘 저녁 스튜 거리.'},
  {id:'b1c',by:'경계청',fl:'B1',need:null,qty:0,reward:15,risky:1,t:'B1 동쪽 굴 조사. "굴 안에서 누가 이름을 부른다"는 신고가 들어왔다.'},
  {id:'b1d',by:'헬가',fl:'B1',need:'mush',qty:2,reward:8,t:'정원 버섯 두 개. 포자 핀 건 빼고.'},
  {id:'b1e',by:'도라',fl:'B1',need:'honey',qty:1,reward:10,t:'정원 꿀 한 병.'},
  {id:'b1f',by:'경계청',fl:'B1',need:null,qty:0,reward:14,risky:1,t:'B1 서쪽 우물 조사. 우물 속에서 발소리가 올라온다고 한다.'},
 ],
 B2:[
  {id:'b2a',by:'경계청',fl:'B2',need:'sand',qty:1,reward:15,risky:1,t:'붉은 모래 표본 한 줌. 붉은 달이 뜨기 전에.'},
  {id:'b2b',by:'도라',fl:'B2',need:'shell',qty:1,reward:14,t:'전갈 껍질. 방패 장인이 찾는다.'},
  {id:'b2c',by:'경계청',fl:'B2',need:null,qty:0,reward:18,risky:1,t:'붉은 달이 뜨기 전 황야 순찰.'},
  {id:'b2d',by:'에녹',fl:'B2',need:'sand',qty:2,reward:30,enoch:1,t:'붉은 모래 두 줌. 연구용입니다. (넘기면 경계의 실이 찢긴다)'},
  {id:'b2e',by:'도라',fl:'B2',need:'flower',qty:1,reward:12,t:'붉은 달맞이꽃 한 송이. 치료약 재료.'},
  {id:'b2f',by:'경계청',fl:'B2',need:null,qty:0,reward:20,risky:1,t:'황야 끝 관측소에서 붉은 달을 기록한다. 달을 오래 보지 말 것.'},
 ],
};
SRG.questRule={perDay:3,enochFrom:5};
SRG.openFloors=[['B1'],['B1','B2'],['B1','B2']];
