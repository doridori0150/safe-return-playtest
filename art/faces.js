/* Mockups/art/faces.js
 * 투명 얼굴 오버레이. 래퍼: <svg viewBox="0 0 1024 1024" ...>
 * 좌표 = 원본 텍스처 픽셀. 신체 왼쪽 L = UV 오른쪽.
 * 합성 순서: 엔진에서 피부색 합성 → 이 오버레이 source-over.
 * 눈알/눈썹은 별도 메시. sleep 시 엔진에서 눈알을 숨긴다.
 * props(id, o)는 가짜 특징까지 반영한 새 배열을 반환한다.
 */
(function (root) {
  'use strict';

  const K = '#382c2b';
  const GOLD = '#c9a45a';
  const OWN = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const DATA = {
    bor: {
      head: 'male',
      skin: '#dca47c',
      shade: '#b87961',
      hair: '#e3ddd1',
      hairShade: '#a6a4a3',
      eye: '#8a9099',
      lip: '#ae7567',
      feat: {
        scarV: { side: 'L' },
        beardKnots: 3,
        earring: { side: 'R', type: 'ring' }
      },
      featText: [
        '왼눈 세로 흉터', '수염 매듭 셋',
        '오른쪽 귀 금고리', '회색 눈'
      ],
      props: [
        { kind: 'ring', where: 'earR', color: GOLD, r: .012, tube: .002 }
      ]
    }
  };

  // 확인된 얼굴 UV 앵커 유지.
  // 귀 섬의 좌우 신체 대응은 추정하지 않는다. 귀걸이는 Head 로컬 앵커 사용.
  const UV = {
    centerX: 192,
    eyeR: { x: 139, y: 171 },
    eyeL: { x: 245, y: 171 },
    mouth: { x: 192, y: 271 },
    chinY: 340,
    earIslands: [
      { x: 240, y: 326, width: 126, height: 204 },
      { x: 368, y: 287, width: 127, height: 191 }
    ]
  };

  const esc = v => String(v).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[ch]));

  const path = (d, fill = 'none', opacity = 1,
    stroke = 'none', width = 0) =>
    `<path d="${esc(d)}" fill="${esc(fill)}" opacity="${opacity}"` +
    ` stroke="${esc(stroke)}" stroke-width="${width}"/>`;

  const line = (d, color, width = 1, opacity = 1) =>
    path(d, 'none', opacity, color, width);

  const ellipse = (x, y, rx, ry, fill, opacity = 1,
    stroke = 'none', width = 0) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"` +
    ` fill="${esc(fill)}" opacity="${opacity}"` +
    ` stroke="${esc(stroke)}" stroke-width="${width}"/>`;

  const group = (s, transform = '') =>
    `<g${transform ? ` transform="${esc(transform)}"` : ''}>${s}</g>`;

  const feature = (key, s) =>
    s ? `<g data-feature="${esc(key)}">${s}</g>` : '';

  const object = v => v !== null && typeof v === 'object' &&
    !Array.isArray(v);

  const side = v => v && v.side === 'R' ? 'R' : 'L';
  const eye = v => UV[side(v) === 'L' ? 'eyeL' : 'eyeR'];
  const mirror = s => group(s, 'translate(384 0) scale(-1 1)');
  const pair = s => s + mirror(s);

  function character(id) {
    if (!OWN(DATA, id)) throw new RangeError('알 수 없는 얼굴: ' + id);
    return DATA[id];
  }

  function mergeFeatures(base, changes) {
    const out = { ...base };
    if (!object(changes)) return out;
    Object.keys(changes).forEach(key => {
      if (key === '__proto__' || key === 'constructor' ||
          key === 'prototype') return;
      out[key] = object(base[key]) && object(changes[key])
        ? { ...base[key], ...changes[key] }
        : changes[key];
    });
    return out;
  }

  function knotCount(value) {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(6, Math.floor(value))) : 0;
  }

  function shading(c) {
    // 기존 shade만 사용. 볼 24%, 이마 20%의 넓은 색면.
    const forehead = path(
      'M110 94 Q150 84 192 88 Q234 84 274 94 ' +
      'L267 133 Q233 140 192 135 Q151 140 117 133Z',
      c.shade, .20
    );
    const cheek = path(
      'M80 195 Q105 201 133 205 L158 215 ' +
      'L150 233 Q129 241 107 231 L84 217Z',
      c.shade, .24
    );
    const lid = path(
      'M101 158 Q138 145 173 160 L167 169 ' +
      'Q137 158 106 170Z', c.shade, .14
    ) + path(
      'M103 181 Q138 192 171 180 L164 193 ' +
      'Q137 202 111 191Z', c.shade, .10
    );
    const nose = path(
      'M176 208 Q168 220 171 232 L181 238 ' +
      'L183 232 Q174 225 180 215Z', c.shade, .16
    );
    return feature('shading', forehead + pair(cheek + lid + nose));
  }

  function ageLines(c, expr) {
    let s = line(
      'M130 117 Q191 111 254 117 ' +
      'M143 128 Q191 123 242 128',
      c.shade, 1.15, .28
    );
    const crow = line(
      'M99 172 L88 168 M100 178 L86 179 M103 185 L93 191',
      c.shade, 1.15, .38
    );
    const bags = line(
      'M110 194 Q139 204 165 194 ' +
      'M115 200 Q138 208 157 202',
      c.shade, 1, .28
    );
    const folds = line(
      'M163 235 Q146 238 140 251 M153 237 Q140 241 136 250',
      c.shade, 1.1, .30
    );
    s += pair(crow + bags + folds);
    if (expr === 'surprise') {
      s += pair(line(
        'M106 152 Q138 141 169 152 M105 189 L96 196',
        c.shade, 1.2, .38
      ));
    }
    return feature('ageLines', s);
  }

  function eyelids(c, expr) {
    if (expr !== 'sleep') return '';
    // 엔진에서 합성한 피부 베이스와 DATA.skin의 색을 맞춘다.
    const lid = path(
      'M99 170 Q112 150 139 152 Q164 153 178 170 ' +
      'Q165 191 139 191 Q112 190 99 170Z', c.skin
    ) + path(
      'M100 172 Q139 183 177 172 Q164 191 139 191 ' +
      'Q114 190 100 172Z', c.shade, .12
    ) + line(
      'M103 172 Q138 182 174 172', c.shade, 1.5, .80
    );
    return feature('sleepLids', pair(lid));
  }

  function mouth(c, expr) {
    if (expr === 'surprise') {
      return feature('mouth',
        ellipse(192, 271, 14, 17, c.lip, .90) +
        ellipse(192, 270, 9, 12, '#67443e', .95) +
        line('M185 284 Q192 287 199 284', c.skin, 1.4, .45)
      );
    }
    if (expr === 'talk') {
      return feature('mouth',
        path(
          'M139 264 Q165 258 182 262 L192 264 L202 262 ' +
          'Q220 258 245 264 Q226 284 192 285 ' +
          'Q157 283 139 264Z', c.lip, .87
        ) +
        path(
          'M145 267 Q192 274 239 267 Q220 278 192 279 ' +
          'Q162 277 145 267Z', '#67443e', .94
        ) +
        line('M163 281 Q192 286 221 281', c.skin, 1.2, .40)
      );
    }
    return feature('mouth',
      path(
        'M138 268 Q165 258 182 264 L192 266 L202 264 ' +
        'Q220 258 246 268 Q219 274 192 273 ' +
        'Q164 274 138 268Z', c.lip, .76
      ) +
      path(
        'M142 270 Q192 278 242 270 Q220 283 192 282 ' +
        'Q165 281 142 270Z', c.lip, .68
      ) +
      line('M141 270 Q192 275 243 270', '#805448', 1.25, .80) +
      line('M166 280 Q192 283 218 280', c.skin, 1.2, .38)
    );
  }

  function beardBase(c) {
    // 볼 아래부터 턱 끝까지 연결된 큰 수염 덩어리.
    // 안쪽 경계는 코와 입을 비우고 기존 입술 좌표를 보존한다.
    const mass = path(
      'M76 210 L90 221 L102 218 L115 231 L127 230 ' +
      'L141 245 L135 261 L137 275 ' +
      'Q156 286 180 289 L192 290 L204 289 ' +
      'Q228 286 247 275 L249 261 L243 245 ' +
      'L257 230 L269 231 L282 218 L294 221 L308 210 ' +
      'L303 245 L291 273 L278 290 L269 304 ' +
      'L252 316 L236 326 L218 337 L205 335 L192 340 ' +
      'L179 335 L166 337 L148 326 L132 316 L115 304 ' +
      'L106 290 L93 273 L81 245Z',
      c.hair
    );

    // 불투명 기본색 + 불투명 그림자색의 2단 셀 음영.
    const cheekShade = path(
      'M79 226 L94 244 L109 251 L116 276 ' +
      'L132 295 L150 309 L141 316 L119 301 ' +
      'L109 284 L96 269 L84 244Z',
      c.hairShade
    );
    const chinShade = path(
      'M132 300 L151 307 L170 304 L192 311 ' +
      'L214 304 L233 307 L252 300 L243 315 ' +
      'L230 324 L216 334 L204 332 L192 337 ' +
      'L180 332 L168 334 L154 324 L141 315Z',
      c.hairShade
    );

    // 가닥은 몇 개만 굵게 넣어 작은 화면에서도 덩어리가 유지되게 한다.
    const strands = pair(line(
      'M99 232 Q104 247 114 257 ' +
      'M122 244 L126 265 ' +
      'M119 283 Q128 295 140 300',
      c.hairShade, 2.3, 1
    ));

    return feature(
      'beardBase',
      mass + pair(cheekShade) + chinShade + strands
    );
  }

  function moustache(c) {
    // 코 아래와 입술 위치를 유지한 두 갈래 콧수염.
    const half = path(
      'M190 249 Q177 242 161 248 Q145 250 133 260 ' +
      'L126 269 Q142 265 153 260 Q173 254 190 254Z',
      c.hair
    ) + line(
      'M183 249 Q157 251 141 260',
      c.hairShade, 1.1, .62
    );
    return feature('moustache', pair(half));
  }

  function scarV(c, value) {
    const a = eye(value);
    // 중심선 폭 7px. 별도 눈알 메시 위를 가로지르지 않게 중앙을 끊는다.
    const mark =
      line(
        'M-3 -34 L0 -23 L-2 -11 ' +
        'M1 10 L-1 23 L3 42',
        '#79483f', 7, 1
      ) +
      line(
        'M-1 -34 L2 -23 L0 -11 ' +
        'M3 10 L1 23 L5 41',
        '#edbea5', 2, 1
      ) +
      line(
        'M-4 -29 L-2 -23 M-2 26 L0 35',
        '#593830', 1.5, .85
      );
    return group(mark, `translate(${a.x} ${a.y})`);
  }

  function beardKnots(c, value) {
    const n = knotCount(value);
    if (!n) return '';

    // 1〜3개는 폭 28px 원크기. 둘일 때는 중심 간격 44px.
    // 기존 4〜6개 입력도 유지하되 턱 UV 안에 들어오도록 축소한다.
    const scale = n <= 3 ? 1 : 3 / n;
    const spacing = n === 2 ? 44 : 34 * scale;
    const y = 292;
    const edge = '#69645d';
    let s = '';

    for (let i = 0; i < n; i++) {
      const x = UV.centerX + (i - (n - 1) / 2) * spacing;

      const braid =
        path(
          'M0 0 C-9 0 -14 6 -14 13 ' +
          'Q-14 20 -9 25 L-8 32 L-10 39 ' +
          'L-4 38 L0 44 L4 38 L10 39 L8 32 L9 25 ' +
          'Q14 20 14 13 C14 6 9 0 0 0Z',
          c.hair, 1, edge, 2
        ) +
        path(
          'M2 2 Q12 5 12 13 Q12 20 7 24 ' +
          'L6 32 L8 37 L3 36 L0 41 L0 29 ' +
          'L4 21 L0 15 L5 9Z',
          c.hairShade
        ) +
        line(
          'M-9 8 L7 16 L-7 24 ' +
          'M9 8 L-7 16 L7 24',
          edge, 2.2, .95
        ) +
        // 幅広の金属バンド。暗い縁と明るい上縁で金輪を明示。
        path(
          'M-13 25 Q0 21 13 25 L13 32 ' +
          'Q0 37 -13 32Z',
          GOLD, 1, '#6c4d29', 2
        ) +
        path(
          'M-12 30 Q0 34 12 30 L12 32 ' +
          'Q0 36 -12 32Z',
          '#98703a'
        ) +
        line(
          'M-10 26 Q0 23.5 10 26',
          '#fff0bd', 2.4, 1
        ) +
        line(
          'M-8 28 L-8 30 M8 28 L8 30',
          '#f5d98f', 1.7, 1
        ) +
        line('M0 36 L0 40', edge, 1.7, .90);

      s += group(
        braid,
        `translate(${x} ${y}) scale(${scale})`
      );
    }
    return s;
  }

  // 후속 인물용 독립 확장 지점. 현재는 보르만 완성.
  function scarX(c, v) { return ''; }
  function mole(c, v) { return ''; }
  function freckles(c, v) { return ''; }
  function toothGap(c, v) { return ''; }
  function browScar(c, v) { return ''; }
  function tusks(c, v) { return ''; }
  function hairDrape(c, v) { return ''; }
  function bandaid(c, v) { return ''; }
  function glassesCrack(c, v) { return ''; }
  function helmetDent(c, v) { return ''; }
  function skullCrack(c, v) { return ''; }
  function hatTilt(c, v) { return ''; }
  function hatPatch(c, v) { return ''; }
  function cowlick(c, v) { return ''; }
  function napeSpot(c, v) { return ''; }

  // 입체 소품은 텍스처에 그리지 않는다.
  function earring(c, v) { return ''; }
  function ribbon(c, v) { return ''; }
  function plume(c, v) { return ''; }
  function circlet(c, v) { return ''; }
  function necklace(c, v) { return ''; }
  function monocle(c, v) { return ''; }

  const DRAW = {
    scarV, scarX, mole, freckles, toothGap, beardKnots,
    browScar, tusks, hairDrape, bandaid, glassesCrack,
    helmetDent, skullCrack, hatTilt, hatPatch, cowlick,
    napeSpot, earring, ribbon, plume, circlet, necklace, monocle
  };

  function props(id, o = {}) {
    const c = character(id);
    const f = mergeFeatures(c.feat, o);
    // 정본 소품 배열을 변경하지 않고 귀걸이만 재계산한다.
    const result = (c.props || [])
      .filter(p => p.where !== 'earL' && p.where !== 'earR')
      .map(p => ({ ...p }));

    if (f.earring) {
      result.push({
        kind: f.earring.type === 'feather' ? 'feather' : 'ring',
        where: side(f.earring) === 'L' ? 'earL' : 'earR',
        color: GOLD,
        r: .012,
        tube: .002
      });
    }
    return result;
  }

  function face(id, o = {}, expr = 'neutral') {
    const c = character(id);
    const f = mergeFeatures(c.feat, o);
    if (!['neutral', 'talk', 'surprise', 'sleep'].includes(expr)) {
      expr = 'neutral';
    }

    let s = shading(c) + ageLines(c, expr) + eyelids(c, expr);
    if (id === 'bor') s += beardBase(c);
    s += mouth(c, expr);
    if (id === 'bor') s += moustache(c);

    Object.keys(DRAW).forEach(key => {
      if (f[key]) s += feature(key, DRAW[key](c, f[key], expr));
    });

    return `<g data-face="${esc(id)}" data-expression="${expr}"` +
      ` stroke="none" stroke-linecap="round" stroke-linejoin="round">` +
      s + '</g>';
  }

  const api = { face, DATA, props, UV };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FACE_ART = api;
})(typeof window !== 'undefined' ? window : null);
