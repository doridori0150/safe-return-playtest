// 무사귀환 — 물건 데이터
// kind: ing 재료 / dish 요리 / pot 물약 / oil 기름 / junk 쓸모없음
// buy: 창구 매입가(제값), sell: 도라 되팔기 값, enoch: 에녹 매입가(실이 찢김), helga: 헬가가 사는 값
// icon: ui_icons.js(UI_ART.item) 또는 inn_art.js(INN_ART.item)의 키. model: 3D 모델 키(p2c_items / assets)
// spoil: 하루 지나면 상함, cursed: 아침에 변하는 것('leaf' 나뭇잎이 됨 / 'gone' 사라짐), taint: 요리에 넣으면 포자
window.SRG=window.SRG||{};
SRG.items={
 moss:{n:'빛나는 이끼',kind:'ing',buy:2,sell:3,enoch:6,icon:'moss',model:'moss',glow:true},
 mush:{n:'정원 버섯',kind:'ing',buy:1,sell:2,helga:2,icon:'mush',model:'mush',spoil:1},
 spore:{n:'포자 버섯',kind:'ing',buy:1,sell:0,icon:'spore',model:'spore',taint:true,hidden:'mush'},   // hidden: 감정 전에는 이 물건으로 보인다
 mush_s:{n:'정원 버섯',kind:'ing',buy:1,sell:2,icon:'mush',model:'mush',hiddenSpore:true},   // 감정 전의 포자 버섯 (손에 들었을 때)
 meat:{n:'고기',kind:'ing',buy:2,sell:3,helga:2,icon:'meat',model:'meat',spoil:1},
 honey:{n:'정원 꿀',kind:'ing',buy:3,sell:4,icon:'honey',model:'honey'},
 flower:{n:'붉은 달맞이꽃',kind:'ing',buy:3,sell:4,enoch:8,icon:'flower',model:'flower'},
 shell:{n:'전갈 껍질',kind:'ing',buy:5,sell:8,icon:'shell',model:'shell'},
 sand:{n:'붉은 모래',kind:'ing',buy:6,sell:0,enoch:20,icon:'sand',model:'sand',forbidden:true},
 bread:{n:'빵',kind:'ing',buy:2,sell:1,icon:'bread',model:'bread',price:2},
 oil:{n:'등불 기름',kind:'oil',sell:3,icon:'oil',model:'oil',price:6,tint:'none'},
 soup:{n:'이끼 버섯 수프',kind:'dish',sell:6,talk:1,icon:'soup',model:'stew',fee:3,reveal:'moss'},   // reveal: 먹은 감염자의 포자가 빛난다
 stew:{n:'던전 스튜',kind:'dish',sell:8,talk:2,icon:'stew',model:'stew',fee:4},
 roast:{n:'고기 구이',kind:'dish',sell:7,talk:1,icon:'stew',model:'stew',fee:4},
 lunch:{n:'도시락',kind:'pot',sell:5,icon:'lunch',model:'bread'},
 heal:{n:'치료약',kind:'pot',sell:10,icon:'heal',model:'oil'},
 recall:{n:'귀환 물약',kind:'pot',sell:10,icon:'recall',model:'oil'},
 oil_moss:{n:'이끼 기름',kind:'oil',sell:8,icon:'oil_moss',model:'oil',tint:'moss'},
 oil_red:{n:'붉은 기름',kind:'oil',sell:8,icon:'oil_red',model:'oil',tint:'red'},
 fail:{n:'실패작',kind:'junk',sell:0,icon:'fail',model:'burnt'},
 burnt:{n:'탄 스튜',kind:'junk',sell:0,icon:'fail',model:'burnt'},
 leaf:{n:'나뭇잎',kind:'junk',sell:0,icon:'leaf',model:'moss'},
 coin:{n:'반짝이는 금화',kind:'ing',buy:10,sell:0,icon:'coin',model:'coin',cursed:'leaf',lure:true},
 shadow:{n:'그림자 조각',kind:'ing',buy:7,sell:0,icon:'shadow',model:'sand',cursed:'gone',lure:true},
};
SRG.oils={oil:{n:'평범한 기름',tint:'none',color:0xffc27a},oil_moss:{n:'이끼 기름',tint:'moss',color:0xb8e08a},oil_red:{n:'붉은 기름',tint:'red',color:0xff8a5a}};
