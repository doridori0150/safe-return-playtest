// 무사귀환 — 인물 데이터 (단골·요리사·손님)
// 그림은 art/characters.js(아스트라)의 id와 같다. 여기에는 게임이 쓰는 값만 둔다.
// 새 인물을 넣으려면 항목 하나를 더한다. 엔진은 이 표에 없는 id를 모른다.
window.SRG=window.SRG||{};
SRG.regulars={
 bor:{name:'보르',race:'드워프 · 전 부길드장',no:'0102',rank:'B',eye:'#8a9099',eyeN:'회색',outfit:'#5a4636',small:1,
  role:'수호',apt:{B1:1,B2:0},shoes:'worn_boots',fakeShoes:'new_boots',fakeF:{earring:{side:'L'}},
  // 3D 몸(assets/models/quaternius_char): 옷 · 머리 파일 · 머리카락 조각. 없으면 종이 인형으로 선다
  rig:{outfit:'Male_Peasant',head:'Superhero_Male_FullBody',hair:['Hair_SimpleParted'],scale:.9},   // 수염은 얼굴 텍스처(art/faces.js)에 그린다
  memo:['무뚝뚝. 장화 자랑.','"서류는 거짓말해도 장화는 안 해."'],
  lines:{hi:'"장화 봐라. 멀쩡하지."',ask:'"장화 닳도록 걸었지. 밑창 봐라."',voice:'쉰 목소리. 무뚝뚝하다.',knock:'"…누구냐. 장화 훔쳐 가면 가만 안 둔다."',listen:'쿨— 쿨—. 규칙적인 코골이.',wake:'"흠. 장화부터 신고."',eat:'천천히, 한 숟갈씩 씹어 먹는다.',witness:'"계단에서 잠깐 뒤처졌다. 그뿐이다."',bye:'"흠."'}},
 pipi:{name:'피피',race:'하플링 · 궁수',no:'0417',rank:'D',eye:'#7a4a2a',eyeN:'갈색',outfit:'#4f7a3a',small:1,
  role:'궁수',apt:{B1:1,B2:-1},shoes:'small_boots',fakeF:{toothGap:false},
  memo:['말이 많다. 겁이 많다.','겁먹으면 말을 더듬는다.'],
  lines:{hi:'"아리! 들어 봐, 오늘 이끼쥐가 글쎄—"',ask:'"이끼 캤지! 그리고 도, 도망쳤지! 그리고 또 도망쳤지!"',voice:'빠르고 높다. 겁먹으면 더듬는다.',knock:'"누, 누구야?!"',listen:'잠꼬대. "도, 도망쳐…"',wake:'"으아, 벌써?"',eat:'허겁지겁 먹는다. 입가에 묻힌다.',witness:'"보, 보르 아저씨랑 갔는데 계단에서 잠깐 안 보였어."',bye:'"고마워 아리! 내일 봐!"'}},
 sere:{name:'세레나데',race:'엘프 · 음유시인',no:'0351',rank:'C',eye:'#8a5ec9',eyeN:'보라색',outfit:'#6b4a8a',
  role:'음유시인',apt:{B1:0,B2:1},shoes:'elf_boots',fakeF:{mole:{side:'L'}},
  memo:['말끝을 늘인다 (~요오~).','음치. 노래를 참지 못한다.'],
  lines:{hi:'"다녀왔어요오~ 한 곡 들으실래요오~?"',ask:'"이끼쥐한테 노래 불러 줬는데요오~ 도망갔어요오~"',voice:'말끝을 늘인다. 음정이 흔들린다.',knock:'"누구세요오~?"',listen:'음 틀린 콧노래.',wake:'"아침이에요오~?"',eat:'먹다 말고 콧노래를 흥얼거린다. 음이 틀렸다.',witness:'"황야에서 달이 두 개였어요오~ 무명 씨는 말이 없었고요오~"',bye:'"감사해요오~"'}},
 mumy:{name:'무명',race:'해골 기사',no:'0009',rank:'C',eye:'#8fe3ff',eyeN:'푸른 불빛',outfit:'#5d6068',
  role:'기사',apt:{B1:0,B2:1},shoes:'greaves',fakeF:{plume:{side:'L'}},silent:true,noEat:true,
  memo:['말을 안 한다. 끄덕임으로 대답.','원래 먹지 않는다. 이름을 잃었다.'],
  lines:{hi:'……(끄덕)',ask:'……(고개를 끄덕인다)',voice:'말이 없다. 갑옷 부딪는 소리뿐.',knock:'(벽을 한 번 두드린다)',listen:'조용하다. 가끔 갑옷이 삐걱인다.',wake:'……(일어나 끄덕인다)',eat:'먹지 않는다. 원래 먹지 않는다.',witness:'……(고개를 젓는다)',bye:'……(끄덕)'}},
 ren:{name:'렌',race:'인간 · 마법사',no:'0288',rank:'B',eye:'#2f8f8a',eyeN:'청록색',outfit:'#34406b',
  role:'마법사',apt:{B1:1,B2:0},shoes:'wizard_shoes',fakeF:{glassesCrack:{side:'R'}},
  memo:['꼼꼼하고 소심. 존댓말.','채집 목록을 늘 들고 다닌다.'],
  lines:{hi:'"귀환 확인 부탁드려요… 시간 맞게 왔죠?"',ask:'"채집 목록 여기 있어요… 스물세 가지요."',voice:'목소리가 떨린다. 꼬박꼬박 존댓말.',knock:'"죄, 죄송해요… 불 끌게요…"',listen:'종이 넘기는 소리.',wake:'"아, 네! 일어났어요!"',eat:'목록을 보며 조금씩 먹는다.',witness:'"피피 씨가 굴 안에서 누가 이름을 불렀대요… 저는 못 들었어요."',bye:'"감사합니다…"'}},
 dudu:{name:'두두',race:'드워프 · 견습 (형)',no:'0520',rank:'E',eye:'#3f6fd8',eyeN:'파란색',outfit:'#6a5a3a',small:1,
  role:'견습',apt:{B1:1,B2:-1},shoes:'small_boots',fakeF:{ribbon:{side:'R'}},twin:'lulu',
  memo:['루루랑 경쟁. 먼저 왔다고 자랑.','쌍둥이. 리본 색으로 구분.'],
  lines:{hi:'"내가 먼저 왔지! 루루는 아직이지?"',ask:'"루루보다 먼저 나왔어! 내가 이겼어!"',voice:'흥분하면 말이 빨라진다.',knock:'"루루야? 내가 먼저 잤다!"',listen:'벽 너머로 루루와 투닥거리는 소리.',wake:'"루루보다 먼저 일어났다!"',eat:'루루 쪽을 흘끔거리며 빨리 먹는다.',witness:'"루루가 굴 앞에서 겁먹었어! 내가 아니라!"',bye:'"이겼다!"'}},
 lulu:{name:'루루',race:'드워프 · 견습 (동생)',no:'0521',rank:'E',eye:'#4f9a4a',eyeN:'초록색',outfit:'#6a5a3a',small:1,
  role:'견습',apt:{B1:1,B2:-1},shoes:'small_boots',fakeF:{mole:{side:'R'}},twin:'dudu',
  memo:['두두랑 경쟁. 먼저 왔다고 자랑.','쌍둥이. 리본 색으로 구분.'],
  lines:{hi:'"두두 왔어? 내가 먼저지?"',ask:'"두두보다 빨리 뛰었어요! 진짜예요!"',voice:'또박또박 우긴다.',knock:'"두두야? 내가 먼저 잤어!"',listen:'벽 너머로 두두와 투닥거리는 소리.',wake:'"두두보다 먼저 일어났어요!"',eat:'두두 쪽을 흘끔거리며 빨리 먹는다.',witness:'"두두가 굴 앞에서 겁먹었어요! 제가 아니라!"',bye:'"두두보다 먼저 들어간다!"'}},
};
// 여관 사람과 손님 (파견하지 않는다)
SRG.staff={
 helga:{name:'헬가',race:'오크 · 요리사',outfit:'#7a4b2c',look:'helga',
  rig:{outfit:'Female_Peasant',head:'Superhero_Female_FullBody',hair:['Hair_Buns'],scale:1.02},
  lines:{hi:'"왔어? 스튜 올려 둬!"',talk:'"스튜 올려 뒀어? 고기랑 버섯! 포자 핀 건 빼고!"',listen:'"냠냠 스튜~" 콧노래.'}},
};
SRG.guests={
 merchant:{name:'행상인 모르트',look:'enoch',outfit:'#6a4a8a',fee:8,lazy:true,
  lines:{hi:'"방 하나 주시오. 비단 팔러 가는 길이오."',talk:'"비단 팔러 가는 길이오. 여긴 밤에 조용하오?"',listen:'"…이 여관 방값이 싸군." 혼잣말.',knock:'"장사 안 해요, 자요!"',keyhole:'술병을 끌어안고 잔다.',wake:'"으… 5분만… 아니 한 시간만…"',shout:'"알았어, 알았어… 머리 울리네…" 그래도 꿈쩍 않는다. 떠밀어야겠다.',push1:'"으… 누가 흔들어…"',push2:'"에잇, 다시는 안 온다!" 투덜대며 나간다.'}},
 pilgrim:{name:'순례자',look:'hood',outfit:'#4a4640',fee:6,
  lines:{hi:'"하룻밤만 묵고 가겠습니다. 손님."',talk:'"등불 길드… 마그다 님이 계시던 곳이지요."',listen:'낮게 기도하는 소리.',knock:'"…예. 자고 있습니다, 손님."',keyhole:'두건을 쓴 채 벽을 보고 앉아 있다.',wake:'"새벽 기도는 마쳤습니다."'}},
};
// 창구 특징 표기 (아스트라 DATA에 featText가 있으면 그것을 쓴다)
SRG.featText={bor:['왼눈 세로 흉터','수염 매듭 셋','오른쪽 귀 금고리'],pipi:['오른뺨 X자 흉터','왼쪽 귀 깃털 귀걸이','앞니 하나 빠짐','주근깨 셋씩'],helga:['송곳니 둘','왼눈썹 흉터','뼈 목걸이'],sere:['왼쪽으로 늘어뜨린 머리','오른눈 밑 점','은 서클릿'],mumy:['투구 왼쪽 찌그러짐','붉은 깃털 오른쪽','이마 오른쪽 금'],ren:['왼쪽 안경알 금','모자 왼쪽으로 기움','모자 별 패치'],dudu:['파란 리본 왼쪽','코 반창고','주근깨 둘씩'],lulu:['분홍 리본 오른쪽','왼뺨 점','앞머리 삐침']};
SRG.featLabel={scarV:'흉터',scarX:'흉터',browScar:'눈썹 흉터',earring:'귀걸이',mole:'점',toothGap:'앞니',freckles:'주근깨',beardKnots:'수염 매듭',necklace:'목걸이',circlet:'서클릿',hairDrape:'머리 방향',glassesCrack:'안경의 금',hatTilt:'모자 기울기',hatPatch:'모자 패치',ribbon:'리본',bandaid:'반창고',cowlick:'앞머리',helmetDent:'투구 찌그러짐',plume:'깃털',skullCrack:'이마의 금',tusks:'송곳니'};
// 신발 이름 (문 앞 신발 = 순찰 단서)
SRG.shoes={worn_boots:'닳은 장화',new_boots:'새 장화',elf_boots:'엘프 가죽신',small_boots:'작은 장화',twin_boots:'작은 장화',greaves:'쇠 정강이받이',wizard_shoes:'뾰족한 신',sandals:'샌들',merchant:'상인 구두',none:'없음'};
