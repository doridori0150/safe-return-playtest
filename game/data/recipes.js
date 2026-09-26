// 무사귀환 — 가마솥 레시피 (재료 두 가지 → 결과)
// 순서는 상관없다. 표에 없는 조합은 '실패작'. 포자 버섯이 들어가면 결과가 무엇이든 포자가 번진다.
// cook: 끓는 데 걸리는 현실 초, hold: 완성 뒤 넘치기까지 초
window.SRG=window.SRG||{};
SRG.recipes=[
 {a:'meat',b:'mush',out:'stew',cook:26,hold:40,note:'저녁 한 끼. 식탁에서 말이 두 번 더 나온다.'},
 {a:'moss',b:'mush',out:'soup',cook:22,hold:40,note:'저녁 한 끼. 먹은 감염자의 포자가 빛에 드러난다.'},
 {a:'meat',b:'meat',out:'roast',cook:24,hold:30,note:'저녁 한 끼. 말이 한 번 더 나온다.'},
 {a:'meat',b:'bread',out:'lunch',cook:12,hold:999,note:'파티에 챙겨 주면 위험이 준다.'},
 {a:'honey',b:'flower',out:'heal',cook:18,hold:999,note:'다친 단골을 치료한다. 약이 안 듣는 사람은 진짜가 아니다.'},
 {a:'moss',b:'honey',out:'recall',cook:18,hold:999,note:'파티에 챙겨 주면 위험할 때 즉시 돌아온다. 대신 이른 시각에, 부절 없이 온다.'},
 {a:'moss',b:'oil',out:'oil_moss',cook:14,hold:999,note:'이 빛 아래 흉내쟁이의 피부는 잿빛으로 보인다.'},
 {a:'sand',b:'oil',out:'oil_red',cook:14,hold:999,note:'이 빛 아래 그림자가 제 모양을 드러낸다.'},
];
