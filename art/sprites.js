/* Mockups/art/sprites.js
 * 좌표 원점: 좌상단. '.' = 투명.
 * L/R은 인물 자신의 좌우.
 * left = 화면 왼쪽을 보는 왼쪽 옆모습.
 */
(function (root) {
  'use strict';

  const PAL = {
    k: '#382c2b', // 윤곽
    s: '#dca47c', // 피부
    d: '#b87961', // 피부 음영
    h: '#e3ddd1', // 백발
    j: '#a6a4a3', // 백발 음영
    c: '#665342', // 옷
    v: '#443c36', // 옷 음영
    a: '#9b6950', // 가죽 장식 / 흉터
    e: '#8a9099', // 눈
    g: '#cda65f', // 금
    l: '#faf0dc', // 흰자 / 눈빛
    b: '#795745', // 장화 / 가죽
    t: '#514037', // 장화 음영
    w: '#ba9871', // 닳은 가죽
    m: '#975d52'  // 입
  };

  const DATA = {
    bor: {
      height: 1.35,
      feat: {
        scarV: { side: 'L' },
        beardKnots: 3,
        earring: { side: 'R' }
      },
      build: buildBor
    }
  };

  const canvas = (w, h) =>
    Array.from({ length: h }, () => Array(w).fill('.'));

  const rows = b => b.map(r => r.join(''));

  function dot(b, x, y, c) {
    if (y >= 0 && y < b.length && x >= 0 && x < b[0].length) {
      b[y][x] = c;
    }
  }

  function rect(b, x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        dot(b, xx, yy, c);
      }
    }
  }

  // '.'는 아래 레이어를 보존한다.
  function stamp(b, art, x, y) {
    art.forEach((r, yy) => {
      [...r].forEach((c, xx) => {
        if (c !== '.') dot(b, x + xx, y + yy, c);
      });
    });
  }

  function line(b, x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    for (;;) {
      dot(b, x0, y0, c);
      if (x0 === x1 && y0 === y1) break;

      const e = 2 * err;
      if (e >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // 정수 좌표 폴리곤: 안티앨리어싱 없는 채색과 1px 윤곽선.
  function poly(b, p, fill, edge = 'k') {
    const lo = Math.min(...p.map(q => q[1]));
    const hi = Math.max(...p.map(q => q[1]));

    for (let y = lo; y <= hi; y++) {
      const hits = [];
      const scan = y + 0.5;

      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [x1, y1] = p[j];
        const [x2, y2] = p[i];

        if (
          (y1 <= scan && y2 > scan) ||
          (y2 <= scan && y1 > scan)
        ) {
          hits.push(x1 + (scan - y1) * (x2 - x1) / (y2 - y1));
        }
      }

      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2) {
        for (let x = Math.ceil(hits[i]); x < hits[i + 1]; x++) {
          dot(b, x, y, fill);
        }
      }
    }

    if (edge) {
      for (let i = 0; i < p.length; i++) {
        const a = p[i];
        const z = p[(i + 1) % p.length];
        line(b, a[0], a[1], z[0], z[1], edge);
      }
    }
  }

  const shifted = (p, x, y) =>
    p.map(([xx, yy]) => [xx + x, yy + y]);

  // 피부 머리 부분은 약 15px. 늘어진 수염은 별도 레이어.
  // 좌우 옆모습은 각각 작성하여 광원과 얼굴 형태도 따로 유지한다.
  const HEAD = {
    front: [
      '........kkkkkkkk........',
      '.....kkksssssssskkk.....',
      '....kssssssssssssssk....',
      '...kssssssssssssssssk...',
      '...ksssssssssssssssdk...',
      '..kssssssssssssssssddk..',
      '.kkshhhsssssssshhhsdkk.',
      'kssshhhhsssssshhhhsdssk',
      'ksdssssssssssssssssddsk',
      '.ksksleksssssskelksdsk.',
      '..ksseeksssssskeesddk..',
      '..ksssssssssddssssdk...',
      '...kssssssssdssdddk...',
      '...khhsssddddsshhjk...',
      '...khhhhssssshhhhjk...',
      '....khhhhhhhhhhhjk....',
      '.....khhhhhhhhhjk.....'
    ],

    back: [
      '........kkkkkkkk........',
      '.....kkksssssssskkk.....',
      '....kssssssssssssssk....',
      '...kssssssssssssssssk...',
      '...ksssssssssssssssdk...',
      '..kssssssssssssssssddk..',
      '.kkssssssssssssssssddkk.',
      'kssshssssssssssssshdssk',
      'ksdshhssssssssssshhddsk',
      '.ksshhssssssssssshhddk.',
      '..khhhhsssssssshhhjdk..',
      '..khhhhhhhhhhhhhhhjjk..',
      '...khhhhhhhhhhhhhjjk...',
      '...khhhhhhhhhhhhjjjk...',
      '....kjjjjjjjjjjjjjk....',
      '.....kkkkkkkkkkkkk.....'
    ],

    left: [
      '.........kkkkkkkk.......',
      '......kkksssssssskk.....',
      '.....ksssssssssssssk....',
      '....kssssssssssssssdk...',
      '....ksssssssssssssddk...',
      '...kssssssssssssssddk...',
      '...khhhhssssssssssddk...',
      '...khhhhssssskksssddk...',
      '..kslekssssskssksdddk...',
      '..kseekssssskdsksdddk...',
      '.kssssssssssksdkhjjdk...',
      'kssssddsssssskkhhjjdk...',
      'ksssdddssssssshhhjjk....',
      '.kkssssssshhhhhhhjjk....',
      '..khhhhhhhhhhhhhhjk.....',
      '...khhhhhhhhhhhhjk......',
      '....khhhhhhhhhjjk.......'
    ],

    right: [
      '.......kkkkkkkk.........',
      '.....kksssssssskkk......',
      '....ksssssssssssssk.....',
      '...ksssssssssssssssk....',
      '...ksssssssssssssssk....',
      '...kssssssssssssssssk...',
      '...ksssssssssssshhhsk...',
      '...ksssskkssssshhhhsk...',
      '...kssskssks ssskelsk...',
      '...kssskdsks ssskeesk...',
      '...khhsksdkssssssssssk..',
      '...khhhkksssssssddssssk.',
      '....khhhssssssssdddsssk.',
      '....khhhhhhhsssssssskk..',
      '.....khhhhhhhhhhhhhk....',
      '......khhhhhhhhhhhk.....',
      '.......kjjhhhhhhhk......'
    ].map(r => r.replace(/ /g, 's'))
  };

  const BEARD = {
    front: [
      '..khhhhhh..hhhhhhk..',
      '.khhhhhhhhhhhhhhhjk.',
      'khhhhhhhkkkkhhhhhhjk',
      'khhhhhhhhhhhhhhhhhjk',
      '.khhhhhhhhhhhhhhhjk.',
      '.khhhhhhhhhhhhhhjjk.',
      '..khhhhhhhhhhhhjjk..',
      '..khhhhhhhhhhhjjjk..',
      '...khhhhhhhhhjjjk...',
      '....khhhhhhhjjjk....',
      '.....khhhhhjjjk.....',
      '......kkkkkkkk......'
    ],

    left: [
      '..khhhhhhhhhhhk.',
      '.khhhhkhhhhhhhjk',
      'khhhhhhhhhhhhhjk',
      'khhhhhhhhhhhhjjk',
      '.khhhhhhhhhhjjk.',
      '.khhhhhhhhhjjjk.',
      '..khhhhhhhjjjk..',
      '..khhhhhhjjjk...',
      '...khhhhjjjk....',
      '....kkkkkkk.....'
    ],

    right: [
      '.khhhhhhhhhhhk..',
      'kjhhhhhhhkhhhhk.',
      'kjhhhhhhhhhhhhhk',
      'kjjhhhhhhhhhhhhk',
      '.kjhhhhhhhhhhhk.',
      '.kjjhhhhhhhhhhk.',
      '..kjhhhhhhhhhk..',
      '...kjhhhhhhhhk..',
      '....kjhhhhhhk...',
      '.....kkkkkkk....'
    ]
  };

  const BOOT = {
    front: [
      '.kkkkkkk..',
      '.kbbbbtk..',
      '.kwbbbtk..',
      '.kbbbbtk..',
      'kkbbbbbkk.',
      'kbbwbbtttk',
      'kwwbbbtttk',
      'kttttttttk',
      '.kkkkkkkk.'
    ],

    back: [
      '.kkkkkkk..',
      '.ktbbbbk..',
      '.ktbbbbk..',
      '.ktbbwbk..',
      '.kttbbbkk.',
      'kttbbbbbbk',
      'kttbbbwbwk',
      'kttttttttk',
      '.kkkkkkkk.'
    ],

    left: [
      '....kkkkkk',
      '....kbbbbk',
      '....kwbbtk',
      '...kkbbbtk',
      '.kkbbbbbtk',
      'kwwbbbbttk',
      'kwbbbbtttk',
      'kttttttttk',
      '.kkkkkkkk.'
    ],

    right: [
      'kkkkkk....',
      'kbbbbk....',
      'kbbbwk....',
      'kbbbbkk...',
      'ktbbbbbkk.',
      'kttbbbbwwk',
      'kttbbbbbwk',
      'kttttttttk',
      '.kkkkkkkk.'
    ]
  };

  const RING = [
    '.gg.',
    'g..g',
    'g..g',
    '.gg.'
  ];

  const KNOT = [
    '.hh.',
    'hjjh',
    'jhhj',
    'gggg',
    '.hh.',
    '.hj.'
  ];

  // 머리 기준 y=0. 실제 프레임의 머리 y는 2+bob.
  // 보이지 않는 신체 쪽의 특징에는 좌표를 제공하지 않는다.
  const MARK = {
    front: {
      scar: { L: [28, 7], R: [18, 7] },
      ear: { L: [33, 10], R: [10, 10] },
      knots: {
        1: [[22, 24]],
        2: [[18, 22], [26, 22]],
        3: [[16, 21], [22, 24], [28, 21]]
      }
    },

    back: {
      scar: {},
      ear: { L: [10, 10], R: [33, 10] },
      knots: {}
    },

    left: {
      scar: { L: [16, 6] },
      ear: { L: [23, 11] },
      knots: {
        1: [[16, 22]],
        2: [[13, 21], [19, 22]],
        3: [[11, 20], [16, 22], [21, 20]]
      }
    },

    right: {
      scar: { R: [31, 6] },
      ear: { R: [20, 11] },
      knots: {
        1: [[28, 22]],
        2: [[25, 22], [31, 21]],
        3: [[23, 20], [28, 22], [33, 20]]
      }
    }
  };

  function resolveFeatures(base, o) {
    const out = {};

    for (const key of ['scarV', 'earring']) {
      const v = o[key] === undefined ? base[key] : o[key];

      out[key] = v === null || v === false
        ? null
        : {
            ...base[key],
            ...(v && typeof v === 'object' ? v : {})
          };

      if (out[key] && !['L', 'R'].includes(out[key].side)) {
        throw new RangeError(key + '.side must be L or R');
      }
    }

    const n = o.beardKnots === undefined
      ? base.beardKnots
      : o.beardKnots;

    if (!Number.isInteger(n) || n < 0 || n > 3) {
      throw new RangeError('beardKnots must be an integer from 0 to 3');
    }

    out.beardKnots = n;
    return out;
  }

  function marks(b, dir, f, headY, breath) {
    const map = MARK[dir];

    const scar = f.scarV && map.scar[f.scarV.side];
    if (scar) {
      const [x, y] = scar;

      // 눈동자는 보존하고 위아래로 이어지는 오래된 흉터.
      for (const dy of [0, 1, 4, 5, 6]) {
        dot(b, x, headY + y + dy, 'd');
      }
    }

    const ear = f.earring && map.ear[f.earring.side];
    if (ear) {
      stamp(b, RING, ear[0], headY + ear[1]);
    }

    for (const [x, y] of map.knots[f.beardKnots] || []) {
      stamp(b, KNOT, x, headY + y + breath);
    }
  }

  function torso(b, dir, y) {
    const front = dir === 'front';
    const back = dir === 'back';
    const side = !front && !back;

    const p = side
      ? [
          [18, 21], [29, 21], [34, 26], [35, 43],
          [32, 48], [15, 48], [12, 43], [13, 28]
        ]
      : [
          [17, 21], [30, 21], [36, 25], [38, 43],
          [35, 48], [12, 48], [9, 43], [11, 25]
        ];

    poly(b, shifted(p, 0, y), 'c');

    if (side) {
      poly(b, shifted([
        [28, 24], [33, 27], [34, 43], [31, 47], [27, 47]
      ], 0, y), 'v', null);
    } else {
      poly(b, shifted([
        [30, 24], [35, 26], [37, 43], [34, 47], [29, 47]
      ], 0, y), 'v', null);
    }

    if (back) {
      line(b, 15, 26 + y, 32, 41 + y, 'b');
      line(b, 15, 27 + y, 32, 42 + y, 'a');

      rect(b, 18, 35 + y, 10, 7, 'v');
      rect(b, 19, 36 + y, 8, 5, 'c');
      dot(b, 20, 36 + y, 'a');
      dot(b, 25, 36 + y, 'a');
    } else {
      line(b, side ? 17 : 13, 25 + y, side ? 30 : 33, 40 + y, 'b');
      line(b, side ? 18 : 14, 25 + y, side ? 31 : 34, 40 + y, 'a');
    }

    rect(b, side ? 14 : 11, 42 + y, side ? 20 : 26, 3, 't');

    if (front) {
      rect(b, 22, 42 + y, 5, 3, 'g');
      rect(b, 23, 43 + y, 3, 1, 't');
      rect(b, 29, 36 + y, 6, 5, 't');
      rect(b, 29, 36 + y, 6, 2, 'b');
    }

    if (dir === 'right') {
      rect(b, 27, 36 + y, 5, 5, 't');
      rect(b, 27, 36 + y, 5, 2, 'b');
    }

    line(b, side ? 17 : 14, 46 + y, side ? 24 : 20, 46 + y, 'a');
  }

  function arm(b, x, y, swing) {
    poly(b, [
      [x, 25 + y],
      [x + 5, 24 + y],
      [x + 7, 30 + y + swing],
      [x + 6, 37 + y + swing],
      [x + 1, 38 + y + swing],
      [x - 1, 32 + y + swing]
    ], 'c');

    rect(b, x + 4, 29 + y + swing, 2, 8, 'v');

    poly(b, [
      [x + 1, 37 + y + swing],
      [x + 6, 37 + y + swing],
      [x + 6, 41 + y + swing],
      [x + 4, 43 + y + swing],
      [x + 1, 42 + y + swing]
    ], 's');

    line(b, x + 5, 39 + y + swing, x + 5, 41 + y + swing, 'd');
  }

  function leg(b, dir, hip, foot, lift) {
    poly(b, [
      [hip, 45],
      [hip + 7, 45],
      [foot + 7, 57 + lift],
      [foot + 1, 57 + lift]
    ], 'v');

    line(b, hip + 2, 48, foot + 3, 55 + lift, 'c');
    stamp(b, BOOT[dir], foot, 55 + lift);
  }

  function frame(dir, kind, index, f) {
    const b = canvas(48, 64);
    const walking = kind === 'walk';
    const phase = walking ? index : 0;
    const bob = walking ? -(phase % 2) : 0;
    const breath = kind === 'idle' ? -index : 0;
    const bodyY = bob + breath;
    const headY = 2 + bob;
    const stride = walking ? [1, 0, -1, 0][phase] : 0;
    const side = dir === 'left' || dir === 'right';

    // 遊脚だけを上げ、接地脚の最下行は常に63に置く。
    const liftA = walking && phase === 1 ? -2 : 0;
    const liftB = walking && phase === 3 ? -2 : 0;

    if (side) {
      const sign = dir === 'left' ? -1 : 1;

      leg(b, dir, 20, 17 - sign * stride * 5, liftA);
      arm(b, 18 - stride * 2, bodyY, -stride);

      leg(b, dir, 22, 21 + sign * stride * 5, liftB);
      torso(b, dir, bodyY);
      arm(b, 23 + stride * 2, bodyY, stride);
    } else {
      leg(b, dir, 15, 14 + stride, liftA);
      leg(b, dir, 26, 25 - stride, liftB);

      arm(b, 5 - stride, bodyY, stride * 2);
      arm(b, 35 - stride, bodyY, -stride * 2);
      torso(b, dir, bodyY);
    }

    // 뒷모습에서도 머리와 옷깃이 끊기지 않는 목.
    rect(b, 20, headY + 13, 9, 10, 's');
    rect(b, 26, headY + 15, 3, 8, 'd');

    stamp(b, HEAD[dir], 12, headY);

    if (dir !== 'back') {
      const bx = dir === 'front' ? 14 : dir === 'left' ? 12 : 20;
      stamp(b, BEARD[dir], bx, headY + 14 + breath);

      if (dir === 'front') {
        // 닫힌 입과 작은 열린 입.
        rect(b, 22, headY + 16 + breath, 4, 1, 'k');

        if (kind === 'talk' && index === 1) {
          rect(b, 22, headY + 17, 4, 2, 'k');
          rect(b, 23, headY + 18, 2, 1, 'm');

          rect(b, 16, headY + 5, 4, 1, 'h');
          rect(b, 28, headY + 5, 4, 1, 'h');
        }
      }
    }

    // 특징은 기본 프레임 완성 후 추가한다.
    marks(b, dir, f, headY, breath);
    return rows(b);
  }

  // 초상화 특징 좌표는 96×112 캔버스의 절대 좌표.
  const PORTRAIT_MARK = {
    scar: { L: [61, 31], R: [33, 31] },
    ear: { L: [79, 48], R: [10, 48] },
    knots: {
      1: [[43, 88]],
      2: [[33, 86], [53, 86]],
      3: [[27, 84], [43, 88], [59, 84]]
    }
  };

  // 작은 스프라이트를 확대하지 않고 독립적으로 그린 흉상.
  function portrait(f) {
    const b = canvas(96, 112);

    poly(b, [
      [28, 72], [66, 72], [82, 82], [89, 94],
      [93, 111], [2, 111], [6, 94], [13, 82]
    ], 'c');

    poly(b, [
      [69, 80], [82, 84], [88, 97], [91, 111], [69, 111]
    ], 'v', null);

    poly(b, [
      [22, 83], [29, 80], [69, 110], [57, 111]
    ], 'b');
    line(b, 24, 84, 59, 109, 'a');

    poly(b, [
      [34, 62], [60, 62], [65, 80], [47, 94], [30, 80]
    ], 's');

    poly(b, [
      [61, 70], [63, 81], [48, 93], [48, 80]
    ], 'd', null);

    // 귀.
    poly(b, [
      [13, 36], [8, 38], [7, 48], [10, 57], [19, 59], [23, 46]
    ], 's');
    poly(b, [
      [81, 36], [87, 38], [88, 48], [85, 57], [76, 59], [72, 46]
    ], 's');
    line(b, 12, 42, 14, 51, 'd');
    line(b, 83, 42, 81, 51, 'd');

    // 넓고 둥근 대머리와 한 단계 피부 음영.
    poly(b, [
      [34, 5], [59, 5], [69, 9], [75, 16], [78, 27],
      [77, 49], [70, 62], [59, 71], [37, 71], [24, 62],
      [18, 49], [17, 27], [20, 16], [27, 9]
    ], 's');

    poly(b, [
      [68, 13], [74, 19], [76, 30], [75, 48], [68, 61],
      [57, 69], [53, 65], [66, 51], [69, 35]
    ], 'd', null);

    // 백발 옆머리. 정수리는 대머리로 남긴다.
    poly(b, [
      [20, 27], [25, 23], [24, 44], [20, 51], [18, 44]
    ], 'h', null);
    poly(b, [
      [72, 24], [76, 28], [77, 44], [72, 51], [70, 42]
    ], 'h', null);

    // 완만한 백발 눈썹.
    poly(b, [
      [25, 31], [30, 28], [40, 29], [42, 33], [31, 32], [25, 34]
    ], 'h', null);
    poly(b, [
      [53, 29], [63, 28], [69, 31], [69, 34], [61, 32], [53, 33]
    ], 'h', null);

    // 회색 눈동자, 따뜻한 흰자, 작은 눈빛.
    for (const x of [26, 54]) {
      poly(b, [
        [x, 38], [x + 3, 35], [x + 11, 35], [x + 14, 38],
        [x + 12, 42], [x + 3, 43], [x, 41]
      ], 'l', null);

      line(b, x, 37, x + 3, 35, 'k');
      line(b, x + 3, 35, x + 11, 35, 'k');

      rect(b, x + 5, 36, 6, 7, 'e');
      rect(b, x + 7, 37, 2, 5, 'k');
      dot(b, x + 6, 36, 'l');
    }

    // 코에는 검은 외곽선 대신 피부 음영만 사용.
    poly(b, [
      [45, 40], [43, 46], [39, 50], [42, 54],
      [52, 54], [55, 50], [51, 44]
    ], 'd', null);
    rect(b, 44, 48, 6, 3, 's');

    // 큰 수염 덩어리와 한 단계 음영.
    poly(b, [
      [20, 49], [28, 57], [38, 57], [47, 61], [58, 57],
      [68, 57], [76, 49], [74, 67], [66, 81], [57, 91],
      [47, 96], [36, 92], [26, 82], [20, 67]
    ], 'h');

    poly(b, [
      [68, 58], [74, 54], [72, 68], [64, 81], [54, 91],
      [47, 94], [43, 89], [55, 80], [64, 68]
    ], 'j', null);

    poly(b, [
      [27, 56], [36, 52], [45, 55], [48, 57], [52, 55],
      [61, 52], [68, 56], [64, 63], [55, 62],
      [48, 60], [40, 62], [30, 64]
    ], 'h', null);

    line(b, 41, 64, 45, 65, 'k');
    line(b, 45, 65, 52, 65, 'k');
    line(b, 52, 65, 55, 63, 'k');

    line(b, 29, 69, 34, 75, 'j');
    line(b, 63, 68, 58, 75, 'j');

    // 초상화에도 동일한 특징 덮어쓰기 적용.
    if (f.scarV) {
      const [x, y] = PORTRAIT_MARK.scar[f.scarV.side];
      line(b, x, y, x + 1, y + 3, 'a');
      line(b, x + 1, y + 4, x, y + 9, 'a');
      line(b, x, y + 12, x + 1, y + 20, 'a');
    }

    if (f.earring) {
      const [x, y] = PORTRAIT_MARK.ear[f.earring.side];
      const ring = [
        '..ggg..',
        '.gllgg.',
        'gg...gg',
        'gg...gg',
        'gg...gg',
        '.gg.gg.',
        '..ggg..'
      ];
      stamp(b, ring, x, y);
    }

    const braid = [
      '..hhhh..',
      '.hhhhhh.',
      'hhjjhhhh',
      'jhhhhjjh',
      'hhjjhhhh',
      'jhhhhjjh',
      '.hhhhhh.',
      '.gggggg.',
      '.gwwwwg.',
      '..hhhh..',
      '..hjjh..',
      '.hh..hh.'
    ];

    for (const [x, y] of PORTRAIT_MARK.knots[f.beardKnots] || []) {
      stamp(b, braid, x, y);
    }

    return {
      w: 96,
      h: 112,
      pal: { ...PAL },
      rows: rows(b)
    };
  }

  function buildBor(f) {
    const anims = {};

    for (const dir of ['front', 'back', 'left', 'right']) {
      anims[dir] = {
        idle: [0, 1].map(i => frame(dir, 'idle', i, f)),
        walk: [0, 1, 2, 3].map(i => frame(dir, 'walk', i, f))
      };

      if (dir === 'front') {
        anims[dir].talk = [0, 1].map(i => frame(dir, 'talk', i, f));
      }
    }

    return {
      w: 48,
      h: 64,
      pal: { ...PAL },
      anims,
      portrait: portrait(f)
    };
  }

  function get(id, o = {}) {
    if (!Object.prototype.hasOwnProperty.call(DATA, id)) {
      throw new RangeError('Unknown sprite: ' + id);
    }

    const def = DATA[id];
    return def.build(resolveFeatures(def.feat, o || {}));
  }

  root.SPRITE_ART = { DATA, get };
})(typeof window !== 'undefined' ? window : globalThis);
