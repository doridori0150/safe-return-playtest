// 무사귀환 — 장면(서는 자리). v3: 게임은 장면 10개로 이뤄진다. 카메라는 장면에 못 박히고(좁은 좌우 패닝), 인물은 걷지 않고 장면의 자리(슬롯)에 나타난다.
// list 항목: id, name, x/z/y(카메라), yaw(기본 시선; 0=북(-z), π/2=서(-x), -π/2=동(+x), π=남(+z)), pitch, yawRange(±rad; Math.PI 면 자유), pitchRange,
//   reach(조준 거리), floor, links([{id,dir:'l'|'r'|'f'|'b'}] 고정 방향), hot(이 장면에서 조준하는 대상 it 목록: 검증용), slots(이 장면의 인물 자리 이름)
// slots 표: 이름 → [x, z, face(rad), y]. face 는 인물이 보는 방향(0=남(+z)·카메라가 남쪽에 있으면 0, π=북(-z), π/2=동(+x), -π/2=서(-x)). 엔진은 걷기 목적지 대신 이 자리로 인물을 옮긴다.
// 장면을 더하려면 항목 하나·links·(필요하면) slots 를 더한다. 이동 비용은 인접 한 칸에 HOP_MIN 게임 분.
window.SRG=window.SRG||{};
SRG.spots={
 HOP_MIN:4,
 START:'hearth',
 list:[
  {id:'hearth', name:'벽난로', x:4.6,  z:9.9,  y:0, yaw:Math.PI/2, pitch:0,   yawRange:.7,  pitchRange:.35, reach:4.5, floor:1, links:[{id:'desk',dir:'r'}], hot:['npc:helga'], slots:['helga_start']},
  {id:'desk',   name:'계산대', x:6.2,  z:10.9, y:0, yaw:0,         pitch:-.1, yawRange:.65, pitchRange:.35, reach:4.6, floor:1, links:[{id:'hearth',dir:'l'},{id:'board',dir:'r'},{id:'pot',dir:'f'},{id:'window',dir:'b'}], hot:['desk','npc:dora','npc:guest'], slots:['guest','dora','enoch']},
  {id:'board',  name:'게시판', x:7.2,  z:10.2, y:0, yaw:Math.PI,   pitch:.05, yawRange:1.15,  pitchRange:.35, reach:3.2, floor:1, links:[{id:'desk',dir:'l'},{id:'dining',dir:'r'}], hot:['board','rulewall'], slots:[]},
  {id:'shelf',  name:'선반',   x:2.6,  z:2.8,  y:0, yaw:0,         pitch:.05, yawRange:.7,  pitchRange:.4,  reach:4.2, floor:1, links:[{id:'pot',dir:'r'},{id:'desk',dir:'b'}], hot:['shelf:0','shelf:5','shelfboard'], slots:[]},
  {id:'pot',    name:'가마솥', x:4.9,  z:3.6,  y:0, yaw:.86,       pitch:-.22,yawRange:1.0, pitchRange:.45, reach:3.4, floor:1, links:[{id:'shelf',dir:'l'},{id:'dining',dir:'r'},{id:'desk',dir:'b'}], hot:['pot','npc:helga'], slots:['helga_kitchen']},
  {id:'dining', name:'식당',   x:11.5, z:5.2,  y:0, yaw:0,         pitch:-.1, yawRange:.75, pitchRange:.35, reach:4.6, floor:1, links:[{id:'pot',dir:'l'},{id:'window',dir:'r'},{id:'board',dir:'b'}], hot:['table'], slots:['chair0','chair1','chair2','chair3','chair4','chair5']},
  {id:'window', name:'창구',   x:22.3, z:9.4,  y:0, yaw:-Math.PI/2,pitch:0,   yawRange:.7,  pitchRange:.35, reach:3.4, floor:1, links:[{id:'dining',dir:'l'},{id:'desk',dir:'b'},{id:'cor_e',dir:'r'}], hot:['window','keyboard'], slots:['queue0','queue1','queue2','queue3']},
  {id:'cor_e',  name:'복도 동',x:13.33,z:6,    y:3, yaw:Math.PI/2, pitch:0,   yawRange:Math.PI, pitchRange:.35, reach:4.2, floor:2, links:[{id:'cor_m',dir:'l'},{id:'window',dir:'b'}], hot:['door:203','door:206'], slots:['front203','front206']},
  {id:'cor_m',  name:'복도 중',x:8,    z:6,    y:3, yaw:Math.PI/2, pitch:0,   yawRange:Math.PI, pitchRange:.35, reach:4.2, floor:2, links:[{id:'cor_w',dir:'l'},{id:'cor_e',dir:'r'}], hot:['door:202','door:205'], slots:['front202','front205']},
  {id:'cor_w',  name:'복도 서',x:2.67, z:6,    y:3, yaw:Math.PI/2, pitch:0,   yawRange:Math.PI, pitchRange:1.25, reach:5.2, floor:2, links:[{id:'cor_m',dir:'r'}], hot:['door:201','door:204','chest','endwin'], slots:['front201','front204']},
 ],
 slots:{
  helga_start:[2.4,9.4,Math.PI/2],
  helga_kitchen:[5.2,1.9,0],
  guest:[6.7,8.05,0], dora:[5.3,8.05,0], enoch:[7.9,8.05,0],
  chair0:[9.5,1.5,0],chair1:[11.5,1.5,0],chair2:[13.5,1.5,0],chair3:[9.5,3.5,Math.PI],chair4:[11.5,3.5,Math.PI],chair5:[13.5,3.5,Math.PI],
  queue0:[24.9,9.4,-Math.PI/2],queue1:[26.4,9.4,-Math.PI/2],queue2:[27.9,9.4,-Math.PI/2],queue3:[29.4,9.4,-Math.PI/2],
  front201:[2.67,6,Math.PI,3],front202:[8,6,Math.PI,3],front203:[13.33,6,Math.PI,3],front204:[2.67,6,0,3],front205:[8,6,0,3],front206:[13.33,6,0,3],
 },
 // 지도에 그릴 평면(세계 좌표). 층별 사각형과 이름표
 plan:{
  1:[{r:[0,0,7,5],n:'부엌'},{r:[7,0,16,5],n:'식당'},{r:[0,5,16,12],n:'홀'},{r:[16,7,24,12],n:''},{r:[16,5,24,7],n:'계단',s:1},{r:[24,8.4,24.6,10.4],n:'',s:1}],
  2:[{r:[0,0,5.33,5],n:'201'},{r:[5.33,0,10.67,5],n:'202'},{r:[10.67,0,16,5],n:'203'},{r:[0,7,5.33,12],n:'204'},{r:[5.33,7,10.67,12],n:'205'},{r:[10.67,7,16,12],n:'206'},{r:[0,5,16,7],n:'복도'},{r:[16,5,24,7],n:'계단',s:1}],
 },
};
