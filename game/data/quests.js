// 무사귀환 — 의뢰 게시판 (날마다 3장)
// by: 의뢰인, fl: 층, need/qty: 납품 물건, reward: 보상, risky: 위험 의뢰(가짜가 이 파티를 노린다), enoch: 넘기면 경계의 실 −2
// 날을 더하면 배열에 한 줄을 더한다. 날짜가 표보다 길면 마지막 줄을 되풀이한다.
window.SRG=window.SRG||{};
SRG.quests=[
 [{id:'r1a',by:'도라',fl:'B1',need:'moss',qty:2,reward:12,t:'빛나는 이끼 두 줌. 등잔 심지로 쓴단다.'},
  {id:'r1b',by:'헬가',fl:'B1',need:'meat',qty:1,reward:6,t:'이끼쥐 고기 한 덩이. 오늘 저녁 스튜 거리.'},
  {id:'r1c',by:'경계청',fl:'B1',need:null,qty:0,reward:15,risky:1,t:'B1 동쪽 굴 조사. "굴 안에서 누가 이름을 부른다"는 신고가 들어왔다.'}],
 [{id:'r2a',by:'경계청',fl:'B2',need:'sand',qty:1,reward:15,risky:1,t:'붉은 모래 표본 한 줌. 붉은 달이 뜨기 전에.'},
  {id:'r2b',by:'도라',fl:'B2',need:'shell',qty:1,reward:14,t:'전갈 껍질. 방패 장인이 찾는다.'},
  {id:'r2c',by:'헬가',fl:'B1',need:'mush',qty:2,reward:8,t:'정원 버섯 두 개. 포자 핀 건 빼고.'}],
 [{id:'r3a',by:'경계청',fl:'B2',need:null,qty:0,reward:18,risky:1,t:'붉은 달이 뜨기 전 황야 순찰.'},
  {id:'r3b',by:'도라',fl:'B1',need:'honey',qty:1,reward:10,t:'정원 꿀 한 병.'},
  {id:'r3c',by:'에녹',fl:'B2',need:'sand',qty:2,reward:30,enoch:1,t:'붉은 모래 두 줌. 연구용입니다. (넘기면 경계의 실이 찢긴다)'}],
];
SRG.openFloors=[['B1'],['B1','B2'],['B1','B2']];
