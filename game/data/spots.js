// 무사귀환 — 구역(장면). v4-2: 1층은 구역 다섯, 2층은 걷는다. 왼쪽 아래 구역 그림을 클릭하거나 숫자 키로 옮긴다(어디서든 한 번에, HOP_MIN 분).
// list 항목: key(숫자 키), id, name, x/z/y(카메라), yaw(기본 시선; 0=북(-z), π/2=서(-x), -π/2=동(+x), π=남(+z)), pitch, yawRange(±rad), pitchRange,
//   reach(조준 거리), hot(이 구역에서 조준하는 대상: 검증용), slots(이 구역의 인물 자리 이름), up:true 면 2층 걷기 진입점
// slots 표: 이름 → [x, z, face(rad), y]. face 는 인물이 보는 방향(0=남(+z), π=북(-z), π/2=동(+x), -π/2=서(-x)).
window.SRG=window.SRG||{};
SRG.spots={
 HOP_MIN:3, UP_MIN:4,
 START:'desk',
 list:[
  {key:'1',id:'kitchen',name:'부엌',  x:3.8, z:2.6, y:0, yaw:Math.PI/2, pitch:-.02, yawRange:.6,  pitchRange:.4, reach:4.2, floor:1, hot:['shelf:0','shelf:5','shelfboard','pot','npc:helga'], slots:['helga_kitchen']},
  {key:'2',id:'desk',   name:'계산대',x:6.2, z:10.9,y:0, yaw:0,         pitch:-.1, yawRange:.95, pitchRange:.35,reach:4.8, floor:1, hot:['desk','npc:dora','npc:guest','npc:join'], slots:['guest','dora','enoch','join0','join1','join2']},
  {key:'3',id:'board',  name:'게시판',x:7.2, z:10.2,y:0, yaw:Math.PI,   pitch:.05, yawRange:1.15,pitchRange:.35,reach:3.2, floor:1, hot:['board','rulewall'], slots:[]},
  {key:'4',id:'dining', name:'식당',  x:11.5,z:5.0, y:0, yaw:0,         pitch:-.08,yawRange:.8,  pitchRange:.35,reach:4.8, floor:1, hot:['table','npc:sit'], slots:['chair0','chair1','chair2','chair3','chair4','chair5']},
  {key:'5',id:'window', name:'창구',  x:22.3,z:9.4, y:0, yaw:-Math.PI/2,pitch:0,   yawRange:.7,  pitchRange:.35,reach:3.4, floor:1, hot:['window','keyboard'], slots:['queue0','queue1','queue2','queue3']},
  {key:'6',id:'up',     name:'2층',   x:15.4,z:6,   y:3, yaw:Math.PI/2, pitch:0,   yawRange:Math.PI,pitchRange:1.3,reach:3.8, floor:2, up:true, hot:[], slots:['front201','front202','front203','front204','front205','front206']},
 ],
 slots:{
  helga_kitchen:[1.4,4.4,-2.2],
  join0:[3.5,8.9,Math.PI/2],join1:[2.7,9.8,Math.PI/2],join2:[4.0,8.1,Math.PI/2],
  guest:[6.7,8.05,0], dora:[5.3,8.05,0], enoch:[7.9,8.05,0],
  chair0:[9,1.5,0],chair1:[10,1.5,0],chair2:[11,1.5,0],chair3:[12,1.5,0],chair4:[13,1.5,0],chair5:[14,1.5,0],
  queue0:[24.9,9.4,-Math.PI/2],queue1:[26.4,9.4,-Math.PI/2],queue2:[27.9,9.4,-Math.PI/2],queue3:[29.4,9.4,-Math.PI/2],
  front201:[2.67,6,Math.PI,3],front202:[8,6,Math.PI,3],front203:[13.33,6,Math.PI,3],front204:[2.67,6,0,3],front205:[8,6,0,3],front206:[13.33,6,0,3],
 },
};
