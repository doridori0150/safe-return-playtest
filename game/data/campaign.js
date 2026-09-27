// 무사귀환 — 캠페인: 하루 시간표·로스터·날짜별 계획
// 시간은 분 단위(하루 = 1440). 1 게임 시간 = HOUR_SEC 현실 초.
// 하루의 단계는 정해진 시각에 한 번씩 발화한다. 엔진의 phases 표에 같은 id의 처리기가 있어야 한다.
// 목표: 마지막 날 저녁 식탁에 단골 전원이 제 얼굴로 앉아 있게 한다. 경계의 실이 0이면 여관이 먹힌다.
window.SRG=window.SRG||{};
SRG.campaign={
 HOUR_SEC:36,          // 1시간 = 36초 → 하루 24시간 ≈ 14분 (낮은 건너뛴다)
 DAYS:10,              // 결산까지의 날 수
 START:{day:1,min:7*60},   // 첫날 07:00 아침 준비에서 시작
 THREAD0:10,THREAD_MAX:20, // 경계의 실 시작·최대
 MONEY0:30,
 INV0:{oil:1,bread:2,lunch:1,moss:1,mush:1,honey:1,meat:1},   // 창고 초기 재고 (부엌 선반의 재료는 따로)
 SHELF0:['meat','mush','spore','moss','meat','mush'],  // 부엌 선반 여섯 칸 (포자 버섯 하나가 섞여 있다)
 LIMITS:{obs:4,swaps:2,bars:2,hangLamp:1,openDoor:1,checks:3},
 // 하루 단계 (시각 순). market 07:00~09:00 은 아침 준비(요구에 답하고 챙겨 준다). send 09:00 에 파티가 무조건 나간다.
 // noon.skipTo: 남는 사람이 없으면 그 시각으로 건너뛴다
 timeline:[
  {id:'dawn',at:6*60,label:'점호'},
  {id:'market',at:7*60,label:'아침 준비'},
  {id:'send',at:9*60,label:'출발'},
  {id:'noon',at:11*60,label:'낮',skipTo:16*60+30},
  {id:'evening',at:16*60+30,label:'창구'},
  {id:'dinner',at:19*60,label:'저녁 식당'},
  {id:'lightsOut',at:21*60,label:'소등·순찰'},
  {id:'deep',at:24*60,label:'깊은 밤'},
  {id:'predawn',at:5*60,label:'새벽'},
 ],
 // 로스터: 그날 아침에 합류하는 단골과 에피소드(story.js episodes)
 roster:[
  {day:1,ids:['bor','pipi','ren'],ep:'ep1'},
  {day:4,ids:['sere','mumy'],ep:'ep2'},
  {day:7,ids:['dudu','lulu'],ep:'ep3'},
 ],
 // 그 밖의 아침 에피소드 (day → story.js episodes 키)
 episodes:{4:'moon4'},
 // 귀환 시각: 예감에 따라 창구에 오는 시각(분)의 범위. recall: 귀환 물약을 챙긴 파티는 이르게 온다
 arrive:{good:[17*60,18*60],mid:[17*60+30,19*60],bad:[18*60,20*60],recall:[16*60+40,17*60+20],late:[20*60,20*60+40]},
 guestAt:17*60+50,     // 투숙객이 계산대에 오는 시각
 knock3At:20*60+30,    // 세 번 노크가 오는 시각 (계획에 있을 때)
 windowClose:21*60,    // 창구 마감: 남은 사람은 밖에서 밤을 샌다
 // 날짜별 계획. fake: 그 밤의 "그것"들. from: 어느 파티를 노리나(risky 의뢰 / B2 파티 / 없으면 가장 위험한 파티, 파티가 없으면 초대받지 않은 자)
 // plan: swap 옆방 바꿔치기 / flee 새벽 전 도주(실 찢김) / lure 문 열게 부르기 / latent 첫 밤은 조용히, 다음 날 남아서 요구하고 둘째 밤에 then 을 실행
 // soft: 달이 차기 전 — 바꿔치기가 새벽을 넘기지 못한다(사람을 잃지 않는다). lateReal: 진짜가 늦게 따로 온다
 days:[
  {soft:true,fake:[{fam:'mimic',from:'risky',plan:'swap'}],guests:['merchant'],knock3:true,newRules:[]},
  {soft:true,fake:[{fam:'shadow',from:'B2',plan:'flee',lateReal:true}],guests:['pilgrim'],newRules:['k9','f9']},
  {soft:true,fake:[{fam:'mimic',from:'risky',plan:'swap'},{fam:'lure',plan:'lure'}],guests:['merchant'],newRules:['f5']},
  {fake:[{fam:'mimic',from:'risky',plan:'latent',then:'swap'}],guests:[],newRules:[]},
  {fake:[{fam:'shadow',from:'B2',plan:'flee'}],guests:['merchant'],newRules:[]},
  {fake:[{fam:'shadow',from:'B2',plan:'latent',then:'flee'}],guests:['pilgrim'],knock3:true,newRules:[]},
  {fake:[{fam:'mimic',from:'risky',plan:'latent',then:'swap'}],guests:['merchant'],newRules:[]},
  {fake:[{fam:'lure',plan:'lure'},{fam:'mimic',from:'risky',plan:'swap'}],guests:[],newRules:[]},
  {fake:[{fam:'shadow',from:'B2',plan:'latent',then:'flee'},{fam:'mimic',from:'risky',plan:'latent',then:'swap'}],guests:['merchant'],newRules:[]},
  {fake:[{fam:'mimic',from:'risky',plan:'latent',then:'swap'},{fam:'lure',plan:'lure'}],guests:['pilgrim'],knock3:true,newRules:[]},
 ],
 // 오늘의 암구호 (날짜순, 모자라면 되풀이). 가짜는 어제 것을 대거나 늦게 답한다
 passwords:[{q:'등불은?',a:'꺼지지 않는다'},{q:'이끼는?',a:'밟지 않는다'},{q:'달은?',a:'보지 않는다'},{q:'문은?',a:'세 번이면 열지 않는다'},{q:'이름은?',a:'부르지 않는다'}],
 // 경계의 실 증감. fizzle: 달이 차기 전 실패한 가짜 / expelFake: 잠복한 가짜를 낮에 내보냄
 thread:{woke:1,missing:-3,stain:-1,enoch:-2,killed:1,barred:1,refusedReal:-1,late:-1,fizzle:-1,expelFake:1},
 // 원망 사다리: harder 요구가 까다로워짐 / stay 그날 안 나감 / leave 길드를 떠남
 grudge:{harder:1,stay:2,leave:3},
 // 돈
 fees:{room:4,dinnerBase:3,repair:8,guestMeal:4},
};
