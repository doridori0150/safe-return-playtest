// 무사귀환 — 서는 자리(스팟). 플레이어는 걷지 않고 자리 사이를 옮겨 다닌다. 자리에서 마우스로 둘러본다(각도 제한).
// x,z,y: 서는 좌표 / yaw: 기본 시선(rad; 0=북(-z), π/2=서(-x), -π/2=동(+x), π=남(+z)) / yawRange: 좌우 회전 한계(±rad, Math.PI 면 자유)
// pitchRange: 상하 한계 / reach: 조준 거리(m) / links: 인접 자리 / floor: 층 / map:[x,z] 지도 표기 좌표(세계 좌표 그대로 쓰면 생략)
// 자리를 더하려면 항목 하나와 links 를 더한다. 이동 비용은 인접 한 칸에 HOP_MIN 게임 분.
window.SRG=window.SRG||{};
SRG.spots={
 HOP_MIN:4,
 START:'hearth',
 list:[
  {id:'hearth', name:'벽난로',  x:4.6,  z:9.9,  y:0, yaw:Math.PI/2,  yawRange:1.4, reach:4.5, floor:1, links:['hall','kitchen']},
  {id:'hall',   name:'홀',     x:6.6,  z:10.4, y:0, yaw:0,          yawRange:Math.PI, reach:5, floor:1, links:['hearth','kitchen','dining','window','stairs','alley']},
  {id:'kitchen',name:'부엌',    x:2.6,  z:3.5,  y:0, yaw:-.12,       yawRange:1.5, reach:4.8, floor:1, links:['hearth','hall','dining']},
  {id:'dining', name:'식당',    x:11.5, z:4.4,  y:0, yaw:0,          yawRange:1.5, reach:4.2, floor:1, links:['kitchen','hall']},
  {id:'window', name:'창구',    x:22.3, z:9.4,  y:0, yaw:-Math.PI/2, yawRange:1.3, reach:3.4, floor:1, links:['hall','stairs']},
  {id:'stairs', name:'계단 아래',x:21.5, z:9.6,  y:0, yaw:2.6,        yawRange:1.4, reach:4.5, floor:1, links:['hall','window','cor_e']},
  {id:'alley',  name:'골목',    x:6.4,  z:14.6, y:0, yaw:0,          yawRange:1.5, reach:4.5, floor:1, links:['hall']},
  {id:'cor_e',  name:'복도 동',  x:13.33,z:6,    y:3, yaw:Math.PI/2,  yawRange:Math.PI, reach:4.2, floor:2, links:['stairs','cor_m']},
  {id:'cor_m',  name:'복도 중',  x:8,    z:6,    y:3, yaw:Math.PI/2,  yawRange:Math.PI, reach:4.2, floor:2, links:['cor_e','cor_w']},
  {id:'cor_w',  name:'복도 서',  x:2.67, z:6,    y:3, yaw:Math.PI/2,  yawRange:Math.PI, reach:4.2, floor:2, links:['cor_m']},
 ],
 // 지도에 그릴 평면(세계 좌표). 층별 사각형과 이름표
 plan:{
  1:[{r:[0,0,7,5],n:'부엌'},{r:[7,0,16,5],n:'식당'},{r:[0,5,16,12],n:'홀'},{r:[16,7,24,12],n:''},{r:[16,5,24,7],n:'계단',s:1},{r:[24,8.4,24.6,10.4],n:'창구',s:1},{r:[0,12,24,15.5],n:'골목',o:1}],
  2:[{r:[0,0,5.33,5],n:'201'},{r:[5.33,0,10.67,5],n:'202'},{r:[10.67,0,16,5],n:'203'},{r:[0,7,5.33,12],n:'204'},{r:[5.33,7,10.67,12],n:'205'},{r:[10.67,7,16,12],n:'206'},{r:[0,5,16,7],n:'복도'},{r:[16,5,24,7],n:'계단',s:1}],
 },
};
