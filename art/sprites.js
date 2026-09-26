/* Mockups/art/sprites.js — Bor, round 2.
 * '.' = transparent. Coordinates start at the top-left.
 * L/R = character's own left/right.
 * Feature coordinates are stamp origins.
 */
(function (root) {
  'use strict';

  const PAL = {
    k: '#382c2b', s: '#dca47c', d: '#b87961', p: '#edbd94',
    h: '#e3ddd1', n: '#c5bfb5', j: '#a6a4a3',
    c: '#665342', v: '#443c36', a: '#9b6950',
    e: '#8a9099', g: '#cda65f', l: '#faf0dc',
    b: '#795745', t: '#514037', w: '#ba9871',
    m: '#b87970', r: '#975d52', q: '#ecc1a1'
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

  function stamp(b, art, x, y) {
    art.forEach((r, yy) => {
      [...r].forEach((c, xx) => {
        if (c !== '.') dot(b, x + xx, y + yy, c);
      });
    });
  }

  function line(b, x, y, x1, y1, c) {
    const dx = Math.abs(x1 - x);
    const sx = x < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y);
    const sy = y < y1 ? 1 : -1;
    let err = dx + dy;

    for (;;) {
      dot(b, x, y, c);
      if (x === x1 && y === y1) break;

      const e = err * 2;
      if (e >= dy) {
        err += dy;
        x += sx;
      }
      if (e <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  function poly(b, points, fill, edge = 'k') {
    const low = Math.min(...points.map(p => p[1]));
    const high = Math.max(...points.map(p => p[1]));

    for (let y = low; y <= high; y++) {
      const hits = [];
      const scan = y + 0.5;

      for (
        let i = 0, j = points.length - 1;
        i < points.length;
        j = i++
      ) {
        const [x1, y1] = points[j];
        const [x2, y2] = points[i];

        if (
          (y1 <= scan && y2 > scan) ||
          (y2 <= scan && y1 > scan)
        ) {
          hits.push(
            x1 + (scan - y1) * (x2 - x1) / (y2 - y1)
          );
        }
      }

      hits.sort((a, z) => a - z);

      for (let i = 0; i + 1 < hits.length; i += 2) {
        for (let x = Math.ceil(hits[i]); x < hits[i + 1]; x++) {
          dot(b, x, y, fill);
        }
      }
    }

    if (edge) {
      points.forEach((p, i) => {
        const z = points[(i + 1) % points.length];
        line(b, p[0], p[1], z[0], z[1], edge);
      });
    }
  }

  const shift = (p, x, y) =>
    p.map(([xx, yy]) => [xx + x, yy + y]);

  const mirror = b => b.map(r => r.slice().reverse());

  const RING = [
    '.ggg.',
    'gl..g',
    'g...g',
    'g...g',
    '.ggg.'
  ];

  const KNOT = [
    '..hhh..',
    '.hnjnh.',
    'hnjhnhj',
    '.hnjnh.',
    'ggglggg',
    '.hjnhj.',
    'hh...hh'
  ];

  const BADGE = [
    '..gg...',
    '.g..g..',
    '.gggg..',
    '.glwg..',
    '.glgg..',
    '.gggg..',
    '..gg...'
  ];

  const HAND = [
    '.kkkkkk.',
    'kpssssdk',
    'ksssssdk',
    'kssdsdsk',
    '.ksdsdsk',
    '.ksdsdk.',
    '..kkkk..'
  ];

  // worn_boots: 14 x 17.
  // Folded cuff, rubbed toe, isolated scratches, solid sole.
  const BOOT = {
    front: [
      '..kkkkkkkkkk..',
      '..kwwbbbbttk..',
      '..kbbbbttttk..',
      '..kkttttttkk..',
      '...kbbbbttk...',
      '...kbwbbttk...',
      '...kbbbbttk...',
      '...kbabbttk...',
      '...kbbbwttk...',
      '..kkbbbbttkk..',
      '.kbbbbbbbbttk.',
      'kwwwbbbbbbtttk',
      'kwwbbbbbbbtttk',
      'kwbbbabbbbtttk',
      'kttttttttttttk',
      'kttttttttttttk',
      '.kkkkkkkkkkkk.'
    ],

    back: [
      '..kkkkkkkkkk..',
      '..kbbbbbbwwk..',
      '..kttttbbbbk..',
      '..kkttttttkk..',
      '...kttbbbbk...',
      '...kttbcbbk...',
      '...kttbcbbk...',
      '...kttbcwbk...',
      '...kttbcbbk...',
      '..kkttbcbbkk..',
      '.kttbbbcbbbbk.',
      'kttbbbbcbbbbbk',
      'kttbbbbcbbwbbk',
      'kttbbbbcbbwwbk',
      'kttttttttttttk',
      'kttttttttttttk',
      '.kkkkkkkkkkkk.'
    ],

    left: [
      '....kkkkkkkkk.',
      '....kwwbbbbtk.',
      '....kbbbbtttk.',
      '....kktttttkk.',
      '.....kbbbbtk..',
      '.....kwbbbtk..',
      '.....kbbbbtk..',
      '....kkbabbtk..',
      '....kbbbbwttk.',
      '..kkbbbbbbttk.',
      '.kbbbbbbbbttk.',
      'kwwwbbbbbbtttk',
      'kwwbbbbbbbtttk',
      'kwbbbabbbbtttk',
      'kttttttttttttk',
      'kttttttttttttk',
      '.kkkkkkkkkkkk.'
    ]
  };

  // Sprite x is absolute; y is relative to headY (normally 2).
  // Knots additionally follow beardDX/beardDY.
  const MARK = {
    front: {
      scar: { L: [46, 13], R: [24, 13] },
      ear: { L: [55, 22], R: [12, 22] },
      knots: {
        1: [[32, 50]],
        2: [[25, 48], [39, 48]],
        3: [[22, 47], [32, 50], [42, 47]]
      }
    },

    back: {
      scar: {},
      ear: { L: [12, 22], R: [55, 22] },
      knots: {}
    },

    left: {
      scar: { L: [25, 13] },
      ear: { L: [40, 23] },
      knots: {
        1: [[24, 49]],
        2: [[20, 47], [30, 49]],
        3: [[16, 45], [24, 49], [32, 46]]
      }
    },

    right: {
      scar: { R: [45, 13] },
      ear: { R: [27, 23] },
      knots: {
        1: [[41, 49]],
        2: [[45, 47], [35, 49]],
        3: [[49, 45], [41, 49], [33, 46]]
      }
    }
  };

  const PORTRAIT_MARK = {
    scar: { L: [94, 54], R: [48, 54] },
    ear: { L: [122, 80], R: [13, 80] },
    knots: {
      1: [[66, 151]],
      2: [[51, 147], [81, 147]],
      3: [[43, 142], [66, 151], [89, 142]]
    }
  };

  function resolveFeatures(base, o) {
    const f = {};

    for (const key of ['scarV', 'earring']) {
      const v = o[key] === undefined ? base[key] : o[key];

      f[key] = v === false || v === null
        ? null
        : {
            ...base[key],
            ...(v && typeof v === 'object' ? v : {})
          };

      if (f[key] && !['L', 'R'].includes(f[key].side)) {
        throw new RangeError(key + '.side must be L or R');
      }
    }

    const n = o.beardKnots === undefined
      ? base.beardKnots
      : o.beardKnots;

    if (!Number.isInteger(n) || n < 0 || n > 3) {
      throw new RangeError(
        'beardKnots must be an integer from 0 to 3'
      );
    }

    f.beardKnots = n;
    return f;
  }

  function scar(b, x, y, large) {
    // Skip the eyelid and iris completely.
    const segments = large
      ? [[0, 8], [24, 32]]
      : [[0, 3], [9, 13]];

    for (const [a, z] of segments) {
      for (let dy = a; dy <= z; dy++) {
        const bend = large
          ? (dy > 23 ? 1 : 0)
          : (dy > 10 ? 1 : 0);

        dot(b, x + bend, y + dy, 'r');
        dot(b, x + bend + 1, y + dy, 'q');
      }
    }
  }

  function marks(b, dir, f, headY, beardDX, beardDY) {
    const m = MARK[dir];

    const s = f.scarV && m.scar[f.scarV.side];
    if (s) scar(b, s[0], headY + s[1], false);

    const e = f.earring && m.ear[f.earring.side];
    if (e) stamp(b, RING, e[0], headY + e[1]);

    for (const [x, y] of m.knots[f.beardKnots] || []) {
      stamp(b, KNOT, x + beardDX, headY + y + beardDY);
    }
  }

  function leg(b, dir, hip, foot, lift) {
    poly(b, [
      [hip, 68],
      [hip + 10, 68],
      [foot + 11, 83 + lift],
      [foot + 3, 83 + lift]
    ], 'v');

    line(b, hip + 3, 72, foot + 5, 80 + lift, 'c');
    stamp(b, BOOT[dir], foot, 79 + lift);
  }

  function arm(b, x, y, swing) {
    poly(b, shift([
      [1, 1],
      [8, 0],
      [11, 7],
      [10, 20 + swing],
      [2, 21 + swing],
      [0, 13 + swing]
    ], x, y), 'c');

    poly(b, shift([
      [8, 4],
      [10, 7],
      [9, 20 + swing],
      [7, 20 + swing]
    ], x, y), 'v', null);

    line(
      b,
      x + 2, y + 11 + swing,
      x + 5, y + 12 + swing,
      'a'
    );
    line(
      b,
      x + 3, y + 15 + swing,
      x + 5, y + 15 + swing,
      'v'
    );

    rect(b, x + 2, y + 20 + swing, 8, 3, 't');
    line(
      b,
      x + 3, y + 20 + swing,
      x + 7, y + 20 + swing,
      'b'
    );

    stamp(b, HAND, x + 2, y + 23 + swing);
  }

  function torso(b, dir, dy, hem) {
    const side = dir === 'left';
    const back = dir === 'back';

    const p = side
      ? [
          [28, 35], [44, 35], [51, 43], [53, 65],
          [49, 73 + hem], [24, 73], [19, 67], [21, 44]
        ]
      : [
          [25, 35], [46, 35], [55, 42], [59, 65],
          [54, 73 + hem], [17, 73 - hem], [12, 65], [16, 42]
        ];

    poly(b, shift(p, 0, dy), 'c');

    poly(b, shift(
      side
        ? [
            [43, 40], [50, 44], [52, 65],
            [48, 71 + hem], [43, 71]
          ]
        : [
            [46, 40], [54, 43], [57, 65],
            [53, 71 + hem], [46, 71]
          ],
      0, dy
    ), 'v', null);

    if (back) {
      line(b, 35, 47 + dy, 35, 62 + dy, 'a');
      rect(b, 26, 52 + dy, 19, 10, 'v');
      rect(b, 27, 53 + dy, 17, 8, 'c');
      line(b, 29, 54 + dy, 42, 54 + dy, 'a');
    } else if (!side) {
      line(b, 37, 52 + dy, 37, 64 + dy, 'v');

      for (const y of [55, 60]) {
        rect(b, 39, y + dy, 2, 2, 'g');
        dot(b, 39, y + dy, 'w');
      }

      line(b, 20, 54 + dy, 19, 63 + dy, 'a');
    }

    // Diagonal leather strap with sparse stitches.
    const sx = side ? 25 : 19;
    const ex = side ? 45 : 50;

    line(b, sx, 42 + dy, ex, 62 + dy, 't');
    line(b, sx, 43 + dy, ex, 63 + dy, 'b');
    line(b, sx, 44 + dy, ex, 64 + dy, 'a');
    dot(b, sx + 5, 47 + dy, 'w');
    dot(b, ex - 4, 61 + dy, 'w');

    rect(b, side ? 21 : 14, 65 + dy, side ? 31 : 44, 5, 't');
    line(
      b,
      side ? 23 : 17, 65 + dy,
      side ? 48 : 54, 65 + dy,
      'b'
    );

    if (!back && !side) {
      rect(b, 32, 65 + dy, 9, 5, 'g');
      rect(b, 34, 66 + dy, 5, 3, 't');
      line(b, 36, 67 + dy, 40, 67 + dy, 'g');

      rect(b, 47, 56 + dy, 8, 8, 't');
      rect(b, 47, 56 + dy, 8, 3, 'b');
      dot(b, 51, 58 + dy, 'g');
    }

    line(
      b,
      side ? 25 : 20, 71 + dy,
      side ? 39 : 30, 71 + dy,
      'a'
    );

    if (!back) {
      rect(b, side ? 40 : 48, 39 + dy, 9, 4, 't');
      if (!side) stamp(b, BADGE, 49, 40 + dy);
    }
  }

  function smallEye(b, x, y) {
    stamp(b, [
      '.kkkkk.',
      'llleell',
      'lllekel',
      '.ddddd.'
    ], x, y);

    dot(b, x + 3, y + 1, 'l');
  }

  function head(b, dir, y) {
    const P = (p, fill, edge = 'k') =>
      poly(b, shift(p, 0, y), fill, edge);

    if (dir === 'left') {
      P([
        [29, 0], [43, 0], [50, 4], [53, 11],
        [52, 27], [47, 33], [29, 34], [20, 28],
        [15, 23], [19, 20], [20, 10], [23, 4]
      ], 's');

      P([
        [47, 5], [51, 11], [50, 25],
        [45, 31], [43, 26], [46, 18]
      ], 'd', null);

      rect(b, 22, y + 13, 9, 2, 'h');
      smallEye(b, 21, y + 17);

      line(b, 19, y + 22, 18, y + 24, 'd');
      rect(b, 25, y + 24, 3, 1, 'm');
      line(b, 29, y + 20, 31, y + 20, 'd');
      line(b, 29, y + 22, 31, y + 22, 'd');

      P([
        [41, 17], [45, 16], [48, 20],
        [47, 27], [43, 29], [40, 25]
      ], 's');

      line(b, 44, y + 20, 43, y + 24, 'd');

      P([
        [48, 27], [51, 23], [50, 32], [42, 35], [38, 32]
      ], 'n', null);

      return;
    }

    // Ears behind the broad, bald head.
    P([
      [16, 18], [12, 20], [12, 26],
      [16, 30], [21, 28], [21, 20]
    ], 's');

    P([
      [55, 18], [59, 20], [59, 26],
      [55, 30], [50, 28], [50, 20]
    ], 's');

    line(b, 15, y + 22, 16, y + 26, 'd');
    line(b, 56, y + 22, 55, y + 26, 'd');

    P([
      [27, 0], [44, 0], [50, 3], [54, 9],
      [55, 21], [52, 29], [44, 35], [27, 35],
      [19, 29], [16, 21], [17, 9], [21, 3]
    ], 's');

    P([
      [49, 5], [53, 10], [54, 22],
      [50, 29], [43, 33], [43, 29], [49, 23]
    ], 'd', null);

    line(b, 25, y + 4, 32, y + 3, 'p');

    if (dir === 'back') {
      P([
        [18, 21], [23, 25], [29, 28], [44, 28],
        [51, 23], [53, 27], [48, 34], [24, 34], [19, 29]
      ], 'h', null);

      P([
        [23, 29], [31, 31], [44, 31],
        [50, 27], [47, 34], [25, 34]
      ], 'n', null);

      line(b, 28, y + 32, 31, y + 33, 'j');
      line(b, 43, y + 31, 45, y + 30, 'j');
      return;
    }

    rect(b, 19, y + 16, 2, 10, 'h');
    rect(b, 51, y + 16, 2, 10, 'n');

    line(b, 23, y + 13, 28, y + 12, 'h');
    rect(b, 23, y + 14, 8, 2, 'h');
    line(b, 42, y + 12, 48, y + 13, 'h');
    rect(b, 41, y + 14, 8, 2, 'h');

    smallEye(b, 23, y + 17);
    smallEye(b, 41, y + 17);

    for (const x of [23, 44]) {
      line(b, x, y + 22, x + 3, y + 22, 'd');
      line(b, x + 1, y + 24, x + 3, y + 24, 'd');
    }

    line(b, 36, y + 20, 36, y + 25, 'd');

    P([
      [34, 24], [38, 24], [40, 28],
      [38, 30], [33, 30], [31, 28]
    ], 'd', null);

    rect(b, 34, y + 27, 4, 2, 'p');
    rect(b, 25, y + 27, 3, 1, 'm');
    rect(b, 44, y + 27, 3, 1, 'm');
  }

  function beard(b, dir, x, y, talking) {
    const P = (p, fill, edge = 'k') =>
      poly(b, shift(p, x, y), fill, edge);

    if (dir === 'left') {
      P([
        [19, 28], [24, 30], [32, 29], [39, 29],
        [46, 27], [44, 38], [37, 47], [28, 52],
        [22, 47], [17, 39], [15, 33]
      ], 'h');

      P([
        [37, 32], [44, 29], [42, 39],
        [35, 47], [28, 50], [26, 46], [33, 39]
      ], 'n', null);

      P([
        [41, 34], [43, 31], [40, 40],
        [34, 47], [29, 49], [34, 42]
      ], 'j', null);

      line(b, 18 + x, 33 + y, 24 + x, 33 + y, 'k');
      line(b, 21 + x, 39 + y, 23 + x, 42 + y, 'n');
      line(b, 29 + x, 36 + y, 28 + x, 40 + y, 'n');
      return;
    }

    P([
      [20, 28], [26, 31], [31, 30], [36, 32],
      [41, 30], [46, 31], [52, 28], [51, 38],
      [47, 45], [42, 50], [36, 54], [29, 51],
      [24, 46], [20, 39]
    ], 'h');

    P([
      [46, 32], [51, 30], [49, 39],
      [44, 47], [36, 52], [32, 49], [40, 42]
    ], 'n', null);

    P([
      [48, 36], [50, 33], [48, 41],
      [42, 49], [37, 52], [40, 47], [45, 41]
    ], 'j', null);

    line(b, 25 + x, 39 + y, 27 + x, 42 + y, 'n');
    line(b, 33 + x, 43 + y, 34 + x, 46 + y, 'n');
    line(b, 43 + x, 36 + y, 42 + x, 39 + y, 'n');

    if (talking) {
      rect(b, 33 + x, 34 + y, 6, 4, 'k');
      rect(b, 34 + x, 37 + y, 4, 1, 'm');
    } else {
      line(b, 32 + x, 35 + y, 38 + x, 35 + y, 'k');
      dot(b, 39 + x, 34 + y, 'k');
    }
  }

  function frame(dir, kind, i, f) {
    let b = canvas(72, 96);

    const walking = kind === 'walk';
    const stride = walking ? [1, 0, -1, 0][i] : 0;
    const bob = walking ? [0, -1, 0, -1][i] : 0;
    const breath = kind === 'idle' ? -i : 0;
    const bodyY = bob + breath;
    const headY = 2 + bob;
    const lag = walking ? [0, 1, 0, -1][i] : 0;
    const beardDY = breath + (walking && i % 2 ? 1 : 0);

    const side = dir === 'left' || dir === 'right';
    const drawDir = side ? 'left' : dir;
    const liftA = walking && i === 1 ? -2 : 0;
    const liftB = walking && i === 3 ? -2 : 0;

    if (side) {
      leg(b, 'left', 29, 28 + stride * 6, liftA);
      arm(b, 29 - stride * 2, 38 + bodyY, -stride);

      leg(b, 'left', 34, 31 - stride * 6, liftB);
      torso(b, 'left', bodyY, lag);
      arm(b, 38 + stride * 2, 38 + bodyY, stride);

      // Badge sits on the visible sleeve, above its occluding layer.
      stamp(b, BADGE, 40 + stride * 2, 42 + bodyY);
    } else {
      leg(b, dir, 23, 20 + stride, liftA);
      leg(b, dir, 39, 38 - stride, liftB);

      arm(b, 6 - stride, 38 + bodyY, stride * 2);
      arm(b, 54 - stride, 38 + bodyY, -stride * 2);
      torso(b, dir, bodyY, lag);
    }

    rect(b, 29, 30 + bodyY, 16, 13, 's');
    head(b, drawDir, headY);

    if (dir !== 'back') {
      beard(
        b,
        drawDir,
        lag,
        headY + beardDY,
        kind === 'talk' && i === 1
      );
    }

    // Mirror the unmarked side pose; identity marks are placed afterward.
    if (dir === 'right') b = mirror(b);

    marks(
      b,
      dir,
      f,
      headY,
      dir === 'right' ? -lag : lag,
      beardDY
    );

    return rows(b);
  }

  // Independently drawn at 144 x 192; not enlarged sprite pixels.
  function portrait(f) {
    const b = canvas(144, 192);

    poly(b, [
      [41, 121], [101, 121], [123, 138], [135, 158],
      [143, 183], [143, 191], [0, 191], [0, 183],
      [9, 158], [20, 138]
    ], 'c');

    poly(b, [
      [104, 130], [123, 140], [135, 161],
      [142, 185], [142, 191], [105, 191]
    ], 'v', null);

    line(b, 25, 155, 19, 185, 'a');
    line(b, 104, 162, 105, 190, 'a');

    for (const y of [173, 185]) {
      rect(b, 86, y, 4, 4, 't');
      rect(b, 87, y, 2, 2, 'g');
    }

    poly(b, [
      [28, 141], [35, 136], [101, 187], [96, 191], [87, 191]
    ], 'b');

    line(b, 31, 143, 91, 189, 'a');

    for (const [x, y] of [[44, 153], [61, 166], [79, 180]]) {
      line(b, x, y, x + 2, y + 1, 'w');
    }

    rect(b, 109, 138, 14, 7, 't');

    stamp(b, [
      '...gggg....',
      '..g....g...',
      '..gggggg...',
      '..gllllg...',
      '..glgwlg...',
      '..glgglg...',
      '..gggggg...',
      '...gggg....'
    ], 111, 141);

    poly(b, [
      [51, 98], [92, 98], [100, 125], [72, 145], [43, 125]
    ], 's');

    poly(b, [
      [87, 106], [98, 125], [73, 143], [69, 130]
    ], 'd', null);

    poly(b, [
      [23, 65], [16, 62], [10, 68], [10, 83],
      [16, 94], [27, 96], [33, 78]
    ], 's');

    poly(b, [
      [120, 65], [127, 62], [133, 68], [133, 83],
      [127, 94], [116, 96], [110, 78]
    ], 's');

    line(b, 17, 71, 20, 85, 'd');
    line(b, 126, 71, 123, 85, 'd');

    poly(b, [
      [51, 8], [90, 8], [106, 16], [115, 28],
      [119, 47], [117, 79], [109, 97], [93, 111],
      [51, 111], [35, 97], [26, 79], [24, 47],
      [28, 28], [38, 16]
    ], 's');

    poly(b, [
      [103, 22], [113, 32], [116, 50], [114, 78],
      [106, 95], [93, 107], [86, 102], [100, 85], [105, 64]
    ], 'd', null);

    line(b, 44, 20, 56, 17, 'p');
    line(b, 57, 17, 67, 17, 'p');

    poly(b, [
      [29, 51], [37, 44], [36, 69], [32, 83], [28, 76]
    ], 'h', null);

    poly(b, [
      [108, 46], [114, 53], [114, 76], [108, 85], [105, 72]
    ], 'n', null);

    poly(b, [
      [37, 58], [44, 53], [56, 54], [62, 59],
      [60, 62], [47, 59], [37, 62]
    ], 'h', null);

    poly(b, [
      [81, 57], [95, 53], [104, 57],
      [107, 62], [96, 59], [82, 62]
    ], 'h', null);

    for (const x of [39, 82]) {
      poly(b, [
        [x, 69], [x + 4, 65], [x + 15, 65],
        [x + 20, 69], [x + 17, 76],
        [x + 4, 77], [x, 74]
      ], 'l', null);

      line(b, x, 68, x + 4, 65, 'k');
      line(b, x + 4, 65, x + 15, 65, 'k');

      rect(b, x + 8, 66, 7, 11, 'e');
      rect(b, x + 11, 68, 2, 8, 'k');
      dot(b, x + 9, 67, 'l');

      line(b, x + 2, 80, x + 11, 81, 'd');
      line(b, x + 4, 84, x + 11, 85, 'd');
    }

    line(b, 73, 69, 73, 84, 'd');

    poly(b, [
      [67, 81], [75, 81], [83, 91],
      [79, 96], [65, 96], [60, 91]
    ], 'd', null);

    rect(b, 67, 89, 9, 4, 'p');
    rect(b, 40, 88, 3, 1, 'm');
    rect(b, 100, 88, 3, 1, 'm');

    poly(b, [
      [28, 82], [39, 93], [54, 92], [71, 99],
      [87, 92], [103, 93], [116, 82], [113, 109],
      [104, 127], [90, 145], [72, 158],
      [55, 149], [40, 133], [30, 111]
    ], 'h');

    poly(b, [
      [100, 98], [113, 88], [110, 111],
      [100, 129], [86, 146], [72, 155],
      [62, 146], [80, 133], [93, 115]
    ], 'n', null);

    poly(b, [
      [107, 103], [111, 96], [107, 116], [96, 133],
      [83, 147], [74, 153], [79, 143], [95, 124]
    ], 'j', null);

    poly(b, [
      [39, 94], [53, 88], [65, 94], [72, 97],
      [79, 94], [91, 88], [103, 94], [98, 104],
      [84, 104], [72, 101], [59, 105], [43, 106]
    ], 'h', null);

    line(b, 62, 110, 67, 112, 'k');
    line(b, 67, 112, 79, 112, 'k');
    line(b, 79, 112, 84, 109, 'k');

    for (const [x, y, xx, yy] of [
      [41, 113, 45, 120],
      [49, 122, 53, 127],
      [64, 133, 67, 139],
      [94, 109, 91, 116],
      [80, 120, 78, 126]
    ]) {
      line(b, x, y, xx, yy, 'n');
    }

    if (f.scarV) {
      const [x, y] = PORTRAIT_MARK.scar[f.scarV.side];
      scar(b, x, y, true);
    }

    if (f.earring) {
      const [x, y] = PORTRAIT_MARK.ear[f.earring.side];

      stamp(b, [
        '..ggggg..',
        '.gllwwgg.',
        'gg.....gg',
        'gl.....gg',
        'gg.....gg',
        '.gg...gg.',
        '..ggggg..'
      ], x, y);
    }

    const braid = [
      '...hhhhh...',
      '..hhnjnhh..',
      '.hhnjjhnhh.',
      '..hnjjhnh..',
      '.hhnjhjjnh.',
      '..hhjnhhh..',
      '.gggglgggg.',
      '.gwwggwwgg.',
      '..hhjnhhh..',
      '...hnjnh...',
      '..hh...hh..',
      '.hh.....hh.'
    ];

    for (const [x, y] of PORTRAIT_MARK.knots[f.beardKnots] || []) {
      stamp(b, braid, x, y);
    }

    return {
      w: 144,
      h: 192,
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
        anims[dir].talk = [0, 1].map(
          i => frame(dir, 'talk', i, f)
        );
      }
    }

    return {
      w: 72,
      h: 96,
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
