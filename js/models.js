// 模型づくり：箱・円柱・球などを組み合わせて、キャラ・建物・木・岩・素材を作る
import * as THREE from './lib/three.module.min.js';
import { mat, glow, mergeGeos } from './gfx.js';

export const C = {
  wood: 0xb57b4a, woodD: 0x8a5a35, woodL: 0xdcab70, cream: 0xfff0d2, roof: 0xe8674f,
  stone: 0xcfc9bd, stoneD: 0x9f998f, slate: 0x6f86a6, glass: 0xa9def2, dark: 0x4a3b33,
  brick: 0xc0685a, green: 0x6aa84f, iron: 0x5a5e68, gold: 0xf5c542,
  // 壊れた建物はくすんだ色
  wallB: 0xb3a38c, woodB: 0x8c7862, roofB: 0x9d7a6a, stoneB: 0xa8a197,
};

// ---- 基本の形 ----
const BOX = new THREE.BoxGeometry(1, 1, 1);
const cylCache = new Map();
function cylGeo(rt, rb, seg) {
  const k = rt + ':' + rb + ':' + seg;
  if (!cylCache.has(k)) cylCache.set(k, new THREE.CylinderGeometry(rt, rb, 1, seg));
  return cylCache.get(k);
}
// 三角屋根（棟は左右方向、幅1・奥行き1・高さ1）
export const PRISM = (() => {
  const L = -0.5, Rr = 0.5;
  const v = [
    L, 0, 0.5, L, 1, 0, L, 0, -0.5,
    Rr, 0, 0.5, Rr, 0, -0.5, Rr, 1, 0,
    L, 0, 0.5, Rr, 0, 0.5, Rr, 1, 0, L, 0, 0.5, Rr, 1, 0, L, 1, 0,
    Rr, 0, -0.5, L, 0, -0.5, L, 1, 0, Rr, 0, -0.5, L, 1, 0, Rr, 1, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
})();
const DODECA = new THREE.DodecahedronGeometry(0.5, 0);

function add(p, geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, material) {
  const m = new THREE.Mesh(geo, material || mat(color));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  p.add(m);
  return m;
}
export const box = (p, w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) => add(p, BOX, c, x, y, z, w, h, d, rx, ry, rz);
const cyl = (p, r, h, c, x, y, z, rx = 0, ry = 0, rz = 0, seg = 8, rb = r) => add(p, cylGeo(1, rb / r, seg), c, x, y, z, r, h, r, rx, ry, rz);
const roof = (p, w, h, d, c, x, y, z, ry = 0) => add(p, PRISM, c, x, y, z, w, h, d, 0, ry, 0);
const rockM = (p, r, c, x, y, z, ry = 0) => add(p, DODECA, c, x, y, z, r * 2, r * 1.5, r * 1.8, 0, ry, 0);
const lit = (p, w, h, d, c, x, y, z) => add(p, BOX, c, x, y, z, w, h, d, 0, 0, 0, glow(c));

// ---- 建物（b = 壊れた状態） ----
function house(b) {
  const g = new THREE.Group();
  box(g, 3.4, 0.24, 3.0, b ? C.stoneB : C.stone, 0, 0.12, 0);
  if (!b) {
    box(g, 3.0, 1.7, 2.6, C.cream, 0, 1.09, 0);
    for (const [x, z] of [[-1.5, 1.3], [1.5, 1.3], [-1.5, -1.3], [1.5, -1.3]]) box(g, 0.22, 1.74, 0.22, C.woodD, x, 1.09, z);
    box(g, 3.1, 0.16, 2.7, C.woodD, 0, 1.96, 0);
    roof(g, 3.7, 1.35, 3.3, C.roof, 0, 2.02, 0);
    box(g, 3.74, 0.1, 0.16, 0xc9503c, 0, 3.36, 0);
    box(g, 0.74, 1.14, 0.08, 0x9b6238, 0.6, 0.81, 1.31);
    box(g, 0.1, 0.1, 0.06, C.gold, 0.85, 0.82, 1.37);
    box(g, 0.66, 0.66, 0.08, C.woodD, -0.7, 1.2, 1.31);
    box(g, 0.5, 0.5, 0.1, C.glass, -0.7, 1.2, 1.32);
    box(g, 0.7, 0.16, 0.22, C.wood, -0.7, 0.84, 1.42);
    box(g, 0.14, 0.14, 0.14, 0xff7a8a, -0.92, 0.98, 1.42);
    box(g, 0.14, 0.14, 0.14, 0xffd34d, -0.7, 0.98, 1.42);
    box(g, 0.14, 0.14, 0.14, 0xff7a8a, -0.48, 0.98, 1.42);
    box(g, 0.4, 1.0, 0.4, C.brick, 0.95, 2.75, -0.55);
    box(g, 0.48, 0.12, 0.48, 0x9c4f44, 0.95, 3.26, -0.55);
  } else {
    box(g, 3.0, 0.9, 0.2, C.wallB, 0, 0.69, -1.2);
    box(g, 0.2, 1.3, 2.6, C.wallB, -1.4, 0.89, 0);
    box(g, 0.2, 0.6, 1.4, C.wallB, 1.4, 0.54, -0.6);
    box(g, 1.1, 0.7, 0.2, C.wallB, -0.9, 0.59, 1.2);
    box(g, 0.22, 1.74, 0.22, C.woodB, -1.5, 1.09, 1.3);
    box(g, 0.22, 1.74, 0.22, C.woodB, -1.5, 1.09, -1.3);
    box(g, 0.22, 1.6, 0.22, C.woodB, 1.25, 0.95, 1.05, 0, 0, -0.55);
    box(g, 2.4, 0.08, 0.5, C.roofB, -0.35, 1.25, -0.4, 0.35, 0.15, 0.22);
    box(g, 1.6, 0.08, 0.45, C.roofB, 0.3, 0.55, 0.6, -0.2, -0.4, 0.3);
    for (const [x, z, s] of [[0.6, 0.2, 0.3], [0.9, -0.3, 0.22], [-0.2, 0.6, 0.25], [1.9, 1.2, 0.28]]) rockM(g, s, C.stoneD, x, 0.3, z, x * 3);
  }
  return g;
}

function sawmill(b) {
  const g = new THREE.Group();
  box(g, 3.6, 0.22, 3.0, b ? C.woodB : C.woodL, 0, 0.11, 0);
  if (!b) {
    for (const [x, z] of [[-1.6, 1.3], [1.6, 1.3], [-1.6, -1.3], [1.6, -1.3]]) box(g, 0.2, 1.9, 0.2, C.woodD, x, 1.17, z);
    roof(g, 4.0, 1.0, 3.5, C.green, 0, 2.1, 0);
    box(g, 4.04, 0.08, 0.14, 0x4f8a3a, 0, 3.12, 0);
    box(g, 1.7, 0.7, 0.8, C.wood, 0.4, 0.57, 0.2);
    cyl(g, 0.48, 0.05, 0xdfe3e8, 0.4, 1.02, 0.2, Math.PI / 2, 0, 0, 12);
    cyl(g, 0.12, 0.08, C.iron, 0.4, 1.02, 0.2, Math.PI / 2, 0, 0, 8);
    cyl(g, 0.17, 1.5, C.wood, 0.4, 1.1, -0.15, 0, 0, Math.PI / 2, 7);
    for (const [y, z] of [[0.38, 0.9], [0.38, 1.24], [0.66, 1.07]]) cyl(g, 0.16, 1.3, C.wood, -1.0, y, z, 0, 0, Math.PI / 2, 7);
    for (let i = 0; i < 4; i++) box(g, 1.1, 0.08, 0.5, C.woodL, 1.1, 0.26 + i * 0.09, -0.9);
    box(g, 1.2, 0.5, 0.12, C.woodD, -0.9, 2.5, 1.6);
  } else {
    box(g, 0.2, 1.9, 0.2, C.woodB, -1.6, 1.17, 1.3);
    box(g, 0.2, 1.4, 0.2, C.woodB, 1.6, 0.92, -1.3);
    box(g, 0.2, 1.9, 0.2, C.woodB, 0.6, 0.32, 1.0, 0, 0.5, Math.PI / 2);
    box(g, 2.2, 0.08, 1.6, 0x6f8a60, -0.6, 1.1, -0.6, 0.3, 0.1, 0.45);
    box(g, 1.2, 0.5, 0.8, C.woodB, 0.3, 0.45, 0.1, 0, 0.3, 0.12);
    cyl(g, 0.46, 0.05, 0x9a6a4a, -0.4, 0.26, 0.9, 0, 0.4, 0, 12);
    cyl(g, 0.16, 1.3, C.woodB, 1.1, 0.33, 0.7, 0, 0.8, Math.PI / 2, 7);
    cyl(g, 0.16, 1.2, C.woodB, -1.2, 0.33, -0.4, 0, -0.5, Math.PI / 2, 7);
  }
  return g;
}

function stonework(b) {
  const g = new THREE.Group();
  box(g, 3.4, 0.24, 3.0, b ? C.stoneB : C.stoneD, 0, 0.12, 0);
  if (!b) {
    box(g, 3.0, 1.5, 2.4, C.stone, 0, 0.99, -0.1);
    for (const [x, y] of [[-1.1, 0.6], [-0.2, 1.1], [0.9, 0.5], [1.2, 1.4], [-1.3, 1.5], [0.3, 1.55]]) box(g, 0.5, 0.28, 0.06, C.stoneD, x, y, 1.12);
    roof(g, 3.4, 1.05, 2.9, C.slate, 0, 1.74, -0.1);
    box(g, 0.8, 1.1, 0.08, C.dark, 0.7, 0.79, 1.12);
    box(g, 0.96, 0.14, 0.12, C.stoneD, 0.7, 1.4, 1.13);
    box(g, 0.5, 0.4, 0.08, C.glass, -0.7, 1.15, 1.12);
    for (const [x, y, z] of [[-1.2, 0.42, 1.55], [-0.72, 0.42, 1.55], [-0.96, 0.78, 1.55]]) box(g, 0.44, 0.36, 0.44, 0xe2ddd3, x, y, z);
    box(g, 0.8, 0.5, 0.5, C.woodD, 1.55, 0.49, 1.0, 0, -0.3, 0);
  } else {
    box(g, 3.0, 0.8, 0.3, C.stoneB, 0, 0.64, -1.2);
    box(g, 0.3, 1.2, 2.0, C.stoneB, -1.35, 0.84, -0.3);
    box(g, 0.3, 0.5, 1.2, C.stoneB, 1.35, 0.49, -0.7);
    box(g, 0.9, 0.5, 0.3, C.stoneB, -0.9, 0.49, 1.0);
    for (const [x, z, s] of [[0.4, 0.4, 0.34], [0.9, 0.9, 0.26], [-0.3, 0.2, 0.28], [1.6, 1.3, 0.3], [0.1, 1.2, 0.22], [-1.7, 1.3, 0.24]]) rockM(g, s, C.stoneB, x, 0.34, z, x * 2);
    box(g, 1.8, 0.08, 0.5, 0x5f6c7c, 0.2, 0.9, -0.6, 0.4, 0.2, -0.3);
  }
  return g;
}

function shop(b) {
  const g = new THREE.Group();
  box(g, 3.4, 0.2, 2.6, b ? C.woodB : C.woodL, 0, 0.1, 0);
  const red = b ? 0xa56a62 : 0xf05a4a, white = b ? 0xcfc4b6 : 0xfff6ea;
  if (!b) {
    box(g, 2.6, 0.8, 0.6, C.wood, 0, 0.6, 0.75);
    box(g, 2.8, 0.1, 0.78, C.woodL, 0, 1.05, 0.75);
    box(g, 2.8, 1.5, 0.4, C.woodD, 0, 0.95, -0.95);
    for (let i = 0; i < 3; i++) box(g, 2.7, 0.06, 0.42, C.woodL, 0, 0.5 + i * 0.45, -0.72);
    for (const [x, z] of [[-1.55, 1.1], [1.55, 1.1], [-1.55, -1.1], [1.55, -1.1]]) box(g, 0.16, 2.3, 0.16, C.woodD, x, 1.25, z);
    for (let i = 0; i < 6; i++) box(g, 0.56, 0.08, 2.7, i % 2 ? white : red, -1.4 + i * 0.56, 2.45, 0.05, -0.2, 0, 0);
    for (let i = 0; i < 6; i++) box(g, 0.56, 0.28, 0.06, i % 2 ? red : white, -1.4 + i * 0.56, 2.08, 1.42);
    box(g, 1.4, 0.5, 0.1, C.woodD, 0, 2.95, -1.0);
    cyl(g, 0.17, 0.06, C.gold, 0, 2.95, -0.93, Math.PI / 2, 0, 0, 10);
  } else {
    box(g, 1.2, 0.7, 0.6, C.woodB, -0.7, 0.55, 0.75, 0, 0, 0.1);
    box(g, 1.0, 0.4, 0.6, C.woodB, 0.9, 0.3, 0.8, 0, 0.3, -0.2);
    box(g, 2.8, 1.2, 0.4, C.woodB, 0, 0.8, -0.95);
    box(g, 0.16, 2.3, 0.16, C.woodB, -1.55, 1.25, -1.1);
    box(g, 0.16, 2.1, 0.16, C.woodB, 1.3, 0.95, 0.9, 0, 0, -0.6);
    box(g, 0.16, 2.3, 0.16, C.woodB, 1.55, 1.25, -1.1);
    for (let i = 0; i < 4; i++) box(g, 0.56, 0.08, 2.4, i % 2 ? white : red, -1.1 + i * 0.56, 1.35 - i * 0.18, 0.1, -0.7, 0, 0.2);
  }
  return g;
}

function smithy(b) {
  const g = new THREE.Group();
  box(g, 3.4, 0.24, 3.0, b ? C.stoneB : C.stoneD, 0, 0.12, 0);
  if (!b) {
    box(g, 3.0, 1.8, 1.3, 0x9a7466, 0, 1.14, -0.75);
    box(g, 0.2, 1.8, 2.6, 0x9a7466, -1.4, 1.14, 0);
    box(g, 0.2, 1.9, 0.2, C.woodD, 1.45, 1.14, 1.35);
    roof(g, 3.5, 0.95, 3.2, 0x5b5f6b, 0, 2.04, 0);
    box(g, 0.55, 1.8, 0.55, C.brick, 1.0, 2.7, -0.9);
    box(g, 0.65, 0.12, 0.65, 0x8a4a40, 1.0, 3.6, -0.9);
    box(g, 1.0, 0.6, 0.8, C.stoneD, 0.8, 0.54, 0.1);
    lit(g, 0.72, 0.06, 0.52, 0xff9a3a, 0.8, 0.86, 0.1);
    lit(g, 0.4, 0.05, 0.3, 0xffe066, 0.8, 0.9, 0.1);
    box(g, 0.34, 0.4, 0.3, 0x3c3f46, -0.5, 0.44, 0.75);
    box(g, 0.7, 0.18, 0.34, 0x3c3f46, -0.45, 0.72, 0.75);
    box(g, 0.2, 0.1, 0.2, 0x3c3f46, -0.9, 0.72, 0.75);
    cyl(g, 0.28, 0.6, C.wood, -1.0, 0.54, 1.2, 0, 0, 0, 8);
    lit(g, 0.46, 0.04, 0.46, 0x7fc6e8, -1.0, 0.85, 1.2);
  } else {
    box(g, 3.0, 1.1, 0.3, 0x8c7a72, 0, 0.79, -1.2);
    box(g, 0.3, 1.4, 1.8, 0x8c7a72, -1.35, 0.94, -0.4);
    box(g, 0.55, 0.8, 0.55, 0x9a6a60, 1.0, 0.64, -0.9);
    box(g, 1.0, 0.5, 0.8, C.stoneB, 0.8, 0.49, 0.2);
    box(g, 0.34, 0.4, 0.3, 0x5a5c62, -0.5, 0.2, 0.75, 0, 0, Math.PI / 2);
    box(g, 0.7, 0.18, 0.34, 0x5a5c62, -0.2, 0.33, 1.1, 0, 0.6, 0.3);
    box(g, 2.0, 0.08, 0.6, 0x6a6d74, -0.3, 1.0, -0.5, 0.2, 0.2, 0.5);
    for (const [x, z, s] of [[1.5, 1.2, 0.28], [0.2, 0.3, 0.22], [-1.6, 1.3, 0.26]]) rockM(g, s, C.stoneB, x, 0.3, z, x);
  }
  return g;
}

function storage() {
  const g = new THREE.Group(), red = 0xc8553d, white = 0xfff6ea;
  box(g, 3.6, 0.24, 3.0, C.stoneD, 0, 0.12, 0);
  box(g, 3.2, 1.8, 2.6, red, 0, 1.14, 0);
  box(g, 3.24, 0.12, 2.64, white, 0, 2.04, 0);
  for (const x of [-1.6, 1.6]) box(g, 0.14, 1.8, 2.64, white, x, 1.14, 0);
  roof(g, 3.8, 1.3, 3.2, 0x7a4a36, 0, 2.08, 0);
  box(g, 1.3, 1.4, 0.08, 0x8a3a2a, 0, 0.94, 1.31);
  box(g, 0.1, 1.8, 0.06, white, 0, 0.94, 1.36, 0, 0, 0.75);
  box(g, 0.1, 1.8, 0.06, white, 0, 0.94, 1.36, 0, 0, -0.75);
  box(g, 1.44, 0.12, 0.1, white, 0, 1.68, 1.34);
  box(g, 0.5, 0.5, 0.5, C.wood, 1.35, 0.49, 1.7, 0, 0.3, 0);
  box(g, 0.4, 0.4, 0.4, C.woodL, 1.3, 0.94, 1.7, 0, -0.2, 0);
  cyl(g, 0.25, 0.6, C.woodD, -1.4, 0.54, 1.7, 0, 0, 0, 8);
  box(g, 0.7, 0.35, 0.7, 0xe8c85a, -2.1, 0.41, 0.6, 0, 0.4, 0);
  return g;
}



// ---- 焚き火 ----
export function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    rockM(g, 0.17, i % 2 ? 0x9d9a94 : 0xb4b0a8, Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62, a);
  }
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    const m = cyl(g, 0.09, 0.9, C.woodD, Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15, 0, -a, 1.1, 6);
    m.rotation.order = 'YXZ';
  }
  const flames = [];
  const cone = new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0);
  for (const [c, r, h, x, z] of [[0xff7a2a, 0.34, 0.9, 0, 0], [0xffb23a, 0.24, 0.75, 0.08, 0.05], [0xffe46a, 0.14, 0.55, -0.04, 0.02]]) {
    const f = new THREE.Mesh(cone, glow(c));
    f.position.set(x, 0.18, z); f.scale.set(r * 2, h, r * 2);
    f.userData.base = { r, h };
    g.add(f); flames.push(f);
  }
  return { group: g, flames };
}

// ---- 建設マス・加工場の入口・土地を買うマス ----
// mark: hammer（建てる）/ coin（土地を買う）/ anvil（鍛冶屋）/ none
export function tileModel(o = {}) {
  const size = o.size ?? 2.5, g = new THREE.Group();
  const plate = box(g, size, 0.06, size, o.plate ?? 0xf6e4b8, 0, 0.03, 0);
  plate.receiveShadow = true;
  const c = o.border ?? 0x8a5f3a, L = size * 0.28, t = 0.12, e = size / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(g, L, 0.08, t, c, sx * (e - L / 2), 0.07, sz * e);
    box(g, t, 0.08, L, c, sx * e, 0.07, sz * (e - L / 2));
  }
  const inner = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
  inner.scale.set(size - 0.4, 0.02, size - 0.4); inner.position.y = 0.07;
  g.add(inner);
  const mark = new THREE.Group();
  if (o.mark === 'coin') {
    cyl(mark, 0.3, 0.08, C.gold, 0, 0.55, 0, Math.PI / 2, 0, 0, 12);
    box(mark, 0.08, 0.3, 0.1, 0xd99a1e, 0, 0.55, 0);
  } else if (o.mark === 'anvil') {
    box(mark, 0.3, 0.2, 0.22, 0x3c3f46, 0, 0.35, 0);
    box(mark, 0.56, 0.14, 0.26, 0x3c3f46, 0, 0.52, 0);
    box(mark, 0.1, 0.4, 0.1, C.wood, 0.15, 0.8, 0, 0, 0, 0.6);
    box(mark, 0.26, 0.14, 0.14, C.iron, 0.28, 0.98, 0, 0, 0, 0.6);
  } else if (o.mark !== 'none') {
    box(mark, 0.1, 0.6, 0.1, C.wood, 0, 0.3, 0);
    box(mark, 0.42, 0.18, 0.18, C.iron, 0, 0.62, 0);
    mark.rotation.z = 0.5;
  }
  g.add(mark);
  return { group: g, inner, mark };
}

// ---- 主人公 ----
const SKIN = 0xffd7b0, TUNIC = 0x4f86d9, PANTS = 0x6b4f3a, HAIR = 0x6b3f22;
const own = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
export function playerModel() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const shoe = own(0x4a3426);
  const legL = new THREE.Group(); legL.position.set(-0.13, 0.34, 0); body.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.13, 0.34, 0); body.add(legR);
  for (const l of [legL, legR]) { box(l, 0.18, 0.3, 0.2, PANTS, 0, -0.16, 0); add(l, BOX, 0, 0, -0.29, 0.03, 0.2, 0.1, 0.26, 0, 0, 0, shoe); }
  box(body, 0.58, 0.46, 0.4, TUNIC, 0, 0.58, 0);
  box(body, 0.6, 0.08, 0.42, 0x8a5a2e, 0, 0.4, 0);
  box(body, 0.12, 0.1, 0.05, C.gold, 0, 0.4, 0.22);
  // よろい（HPを強化すると現れる）
  const armorMat = own(0xc9ced6);
  const armor = new THREE.Group(); body.add(armor);
  add(armor, BOX, 0, -0.34, 0.8, 0, 0.2, 0.1, 0.44, 0, 0, 0.25, armorMat);
  add(armor, BOX, 0, 0.34, 0.8, 0, 0.2, 0.1, 0.44, 0, 0, -0.25, armorMat);
  add(armor, BOX, 0, 0, 0.62, 0.205, 0.4, 0.3, 0.04, 0, 0, 0, armorMat);
  armor.visible = false;
  const head = new THREE.Group(); head.position.set(0, 0.8, 0); body.add(head);
  box(head, 0.6, 0.52, 0.54, SKIN, 0, 0.27, 0);
  box(head, 0.08, 0.13, 0.03, 0x2b2233, -0.13, 0.28, 0.275);
  box(head, 0.08, 0.13, 0.03, 0x2b2233, 0.13, 0.28, 0.275);
  box(head, 0.1, 0.05, 0.02, 0xff9f9f, -0.21, 0.17, 0.275);
  box(head, 0.1, 0.05, 0.02, 0xff9f9f, 0.21, 0.17, 0.275);
  box(head, 0.64, 0.18, 0.58, HAIR, 0, 0.56, -0.01);
  box(head, 0.64, 0.3, 0.14, HAIR, 0, 0.4, -0.23);
  box(head, 0.22, 0.1, 0.1, HAIR, 0.12, 0.46, 0.25);
  box(head, 0.66, 0.08, 0.6, 0xe24b4b, 0, 0.48, 0);
  box(head, 0.12, 0.2, 0.06, 0xe24b4b, -0.18, 0.4, -0.3, 0.3, 0, 0.2);
  const armL = new THREE.Group(); armL.position.set(-0.36, 0.76, 0); body.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.36, 0.76, 0); body.add(armR);
  for (const a of [armL, armR]) { box(a, 0.15, 0.3, 0.17, TUNIC, 0, -0.14, 0); box(a, 0.14, 0.13, 0.15, SKIN, 0, -0.34, 0); }
  // 背負子（ここに素材が積まれる。積載量を強化すると大きくなる）
  const pack = new THREE.Group(); pack.position.set(0, 0.2, -0.36); body.add(pack);
  const packMat = own(0x8d5a33);
  add(pack, BOX, 0, 0, 0.4, 0.09, 0.46, 0.5, 0.12, 0, 0, 0, packMat);
  box(pack, 0.08, 0.9, 0.08, 0x6e4426, -0.2, 0.42, 0);
  box(pack, 0.08, 0.9, 0.08, 0x6e4426, 0.2, 0.42, 0);
  box(pack, 0.56, 0.06, 0.34, 0x6e4426, 0, 0, -0.06);
  const anchor = new THREE.Object3D(); anchor.position.set(0, 0.25, -0.45); body.add(anchor);
  // 道具（刃の色は鍛冶屋のレベルで変わる）
  const hand = new THREE.Group(); hand.position.set(0, -0.36, 0.02); hand.rotation.x = -1.2; armR.add(hand);
  const tools = { axe: new THREE.Group(), pick: new THREE.Group(), sword: new THREE.Group() };
  const toolMat = { axe: own(0xc9ced6), pick: own(0x9aa0a8), sword: own(0xe8edf3) };
  box(tools.axe, 0.07, 0.72, 0.07, C.wood, 0, -0.26, 0);
  add(tools.axe, BOX, 0, 0, -0.52, 0.14, 0.06, 0.26, 0.3, 0, 0, 0, toolMat.axe);
  add(tools.axe, BOX, 0, 0, -0.52, 0.3, 0.07, 0.3, 0.06, 0, 0, 0, toolMat.axe);
  box(tools.pick, 0.07, 0.72, 0.07, C.wood, 0, -0.26, 0);
  add(tools.pick, BOX, 0, 0, -0.56, 0.02, 0.08, 0.1, 0.62, 0.18, 0, 0, toolMat.pick);
  add(tools.pick, BOX, 0, 0, -0.62, 0.36, 0.06, 0.08, 0.14, 0.5, 0, 0, toolMat.pick);
  box(tools.sword, 0.08, 0.2, 0.08, 0x6b3f22, 0, -0.04, 0);
  box(tools.sword, 0.3, 0.06, 0.1, C.gold, 0, -0.16, 0);
  add(tools.sword, BOX, 0, 0, -0.52, 0, 0.05, 0.66, 0.14, 0, 0, 0, toolMat.sword);
  for (const k in tools) { tools[k].visible = false; hand.add(tools[k]); }
  root.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return { root, body, head, legL, legR, armL, armR, tools, toolMat, anchor, shoe, armor, armorMat, pack, packMat };
}
// 強化レベルごとの色
export const LEVEL_COLORS = {
  blade: [0xc9ced6, 0x8fd3ff, 0xffd34d, 0xff8fe0],
  shoe: [0x4a3426, 0xe24b4b, 0x3a8fe0, 0xf5c542],
  armor: [0xc9ced6, 0xc9ced6, 0x8fd3ff, 0xffd34d],
  pack: [0x8d5a33, 0x9c6a3a, 0xb07a40, 0xc98a4b, 0xd89a52, 0xe8b060],
};

// ---- 素材の形（背中に積む・地面に落ちる） ----
export function itemGeo(kind) {
  if (kind === 'wood') {
    const g = new THREE.CylinderGeometry(0.12, 0.12, 0.56, 7);
    const n = g.attributes.position.count, torso = 8 * 2;
    const col = new Float32Array(n * 3);
    const bark = new THREE.Color(0xa86c3c), cut = new THREE.Color(0xf2cf93);
    for (let i = 0; i < n; i++) (i < torso ? bark : cut).toArray(col, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.rotateZ(Math.PI / 2);
    return g;
  }
  if (kind === 'stone') return new THREE.DodecahedronGeometry(0.16, 0).scale(1.05, 0.82, 0.95);
  if (kind === 'jelly') return new THREE.IcosahedronGeometry(0.15, 1).scale(1.12, 0.82, 1.12);
  if (kind === 'plank') return new THREE.BoxGeometry(0.56, 0.11, 0.24);
  if (kind === 'block') return new THREE.BoxGeometry(0.3, 0.26, 0.3);
  return itemGeo2(kind) || itemGeo3(kind) || new THREE.BoxGeometry(0.25, 0.25, 0.25);
}
export const coinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 10);

// ---- 木・岩（インスタンス用。根元が原点） ----
export const treeGeos = {
  trunk: new THREE.CylinderGeometry(0.14, 0.22, 1.1, 6).translate(0, 0.55, 0),
  round: mergeGeos([
    new THREE.IcosahedronGeometry(0.85, 0).translate(0, 1.7, 0),
    new THREE.IcosahedronGeometry(0.55, 0).translate(0.35, 2.25, 0.1),
  ]),
  pine: mergeGeos([
    new THREE.ConeGeometry(0.95, 1.2, 7).translate(0, 1.35, 0),
    new THREE.ConeGeometry(0.72, 1.0, 7).translate(0, 1.95, 0),
    new THREE.ConeGeometry(0.45, 0.8, 7).translate(0, 2.5, 0),
  ]),
  stump: new THREE.CylinderGeometry(0.2, 0.25, 0.3, 6).translate(0, 0.15, 0),
};
export const rockGeo = new THREE.DodecahedronGeometry(0.72, 0).scale(1, 0.72, 0.9).translate(0, 0.38, 0);

// ---- 敵・住民（インスタンス用の部品） ----
export function slimeParts() {
  const body = new THREE.IcosahedronGeometry(0.45, 1).scale(1, 0.82, 1).translate(0, 0.37, 0);
  const whites = mergeGeos([
    new THREE.SphereGeometry(0.1, 8, 6).translate(-0.15, 0.46, 0.34),
    new THREE.SphereGeometry(0.1, 8, 6).translate(0.15, 0.46, 0.34),
    new THREE.BoxGeometry(0.12, 0.05, 0.1).translate(-0.17, 0.68, 0.1),
  ]);
  const pupils = mergeGeos([
    new THREE.SphereGeometry(0.055, 6, 4).translate(-0.15, 0.46, 0.425),
    new THREE.SphereGeometry(0.055, 6, 4).translate(0.15, 0.46, 0.425),
  ]);
  return [
    { geo: body, tint: true },
    { geo: whites, color: 0xffffff },
    { geo: pupils, color: 0x2b2233 },
  ];
}

export function villagerParts() {
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  return [
    { geo: B(0.16, 0.3, 0.18, -0.11, 0.15, 0), color: 0x5a6b8c, pivot: [-0.11, 0.3, 0] },
    { geo: B(0.16, 0.3, 0.18, 0.11, 0.15, 0), color: 0x5a6b8c, pivot: [0.11, 0.3, 0] },
    { geo: B(0.46, 0.42, 0.32, 0, 0.51, 0), tint: true },
    { geo: B(0.46, 0.42, 0.42, 0, 0.93, 0), color: SKIN },
    { geo: mergeGeos([B(0.07, 0.11, 0.02, -0.1, 0.95, 0.215), B(0.07, 0.11, 0.02, 0.1, 0.95, 0.215)]), color: 0x2b2233 },
    { geo: B(0.5, 0.14, 0.46, 0, 1.16, 0), color: 0x7a4a2a },
    { geo: B(0.12, 0.34, 0.14, -0.3, 0.55, 0), color: SKIN, pivot: [-0.3, 0.7, 0] },
    { geo: B(0.12, 0.34, 0.14, 0.3, 0.55, 0), color: SKIN, pivot: [0.3, 0.7, 0] },
  ];
}

export function mushroomParts() {
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const cap = new THREE.SphereGeometry(0.52, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1).translate(0, 0.62, 0);
  const dots = mergeGeos([
    new THREE.SphereGeometry(0.09, 6, 4).translate(0.2, 0.92, 0.18),
    new THREE.SphereGeometry(0.07, 6, 4).translate(-0.25, 0.86, 0.2),
    new THREE.SphereGeometry(0.08, 6, 4).translate(0.05, 1.0, -0.2),
    new THREE.SphereGeometry(0.07, 6, 4).translate(-0.18, 0.92, -0.25),
    new THREE.SphereGeometry(0.06, 6, 4).translate(0.36, 0.78, -0.12),
  ]);
  return [
    { geo: B(0.14, 0.14, 0.2, -0.12, 0.07, 0.02), color: 0x8a5a3a, pivot: [-0.12, 0.2, 0] },
    { geo: B(0.14, 0.14, 0.2, 0.12, 0.07, 0.02), color: 0x8a5a3a, pivot: [0.12, 0.2, 0] },
    { geo: new THREE.CylinderGeometry(0.24, 0.3, 0.5, 8).translate(0, 0.38, 0), color: 0xf6e7cc },
    { geo: cap, tint: true },
    { geo: dots, color: 0xfff8ee },
    { geo: mergeGeos([B(0.07, 0.12, 0.03, -0.09, 0.44, 0.27), B(0.07, 0.12, 0.03, 0.09, 0.44, 0.27), B(0.14, 0.03, 0.03, 0, 0.36, 0.27)]), color: 0x2b2233 },
  ];
}

export function bossParts() {
  const parts = slimeParts();
  parts.push({ geo: mergeGeos([
    new THREE.CylinderGeometry(0.2, 0.22, 0.12, 8).translate(0, 0.74, 0),
    new THREE.ConeGeometry(0.05, 0.12, 4).translate(0.14, 0.86, 0),
    new THREE.ConeGeometry(0.05, 0.12, 4).translate(-0.14, 0.86, 0),
    new THREE.ConeGeometry(0.05, 0.14, 4).translate(0, 0.87, 0.15),
    new THREE.ConeGeometry(0.05, 0.12, 4).translate(0, 0.86, -0.15),
  ]), color: 0xffd34d });
  return parts;
}

// ---- 第2章の建物 ----
function mine() {
  const g = new THREE.Group();
  box(g, 4.0, 0.24, 3.0, C.stoneD, 0, 0.12, 0);
  // 岩山と入口
  rockM(g, 1.3, 0x8f8a84, -0.9, 0.9, -0.5, 0.4);
  rockM(g, 1.1, 0x9c978f, 1.0, 0.8, -0.6, 1.2);
  rockM(g, 0.9, 0x86817b, 0, 1.6, -0.9, 2.1);
  box(g, 1.5, 1.5, 0.3, 0x2e2622, 0, 0.9, 0.55);
  box(g, 0.2, 1.7, 0.24, C.woodD, -0.8, 0.97, 0.7);
  box(g, 0.2, 1.7, 0.24, C.woodD, 0.8, 0.97, 0.7);
  box(g, 1.9, 0.22, 0.28, C.woodD, 0, 1.86, 0.7);
  box(g, 1.3, 0.34, 0.1, C.woodL, 0, 2.2, 0.78);
  // レールとトロッコ
  for (const x of [-0.3, 0.3]) box(g, 0.06, 0.05, 1.6, 0x6b6f78, x, 0.27, 1.4);
  for (let i = 0; i < 4; i++) box(g, 0.9, 0.05, 0.12, C.wood, 0, 0.25, 0.8 + i * 0.4);
  box(g, 0.8, 0.45, 0.6, 0x6b6f78, 0, 0.55, 1.6);
  for (const [x, z] of [[-0.25, 1.45], [0.2, 1.7], [0, 1.55]]) rockM(g, 0.14, 0x7d6e66, x, 0.82, z, x * 9);
  box(g, 0.14, 0.14, 0.14, 0xe0823c, 0.12, 0.88, 1.5);
  // ランタン
  lit(g, 0.14, 0.2, 0.14, 0xffd36a, 0.95, 1.55, 0.95);
  return g;
}

function pharmacy() {
  const g = new THREE.Group();
  box(g, 3.2, 0.22, 2.8, C.stone, 0, 0.11, 0);
  box(g, 2.8, 1.6, 2.2, 0xf4efe2, 0, 1.02, -0.1);
  for (const [x, z] of [[-1.4, 1.0], [1.4, 1.0], [-1.4, -1.2], [1.4, -1.2]]) box(g, 0.18, 1.62, 0.18, 0x6b8f5a, x, 1.03, z);
  roof(g, 3.3, 1.05, 2.9, 0x5fa86a, 0, 1.82, -0.1);
  box(g, 0.7, 1.05, 0.08, 0x6b8f5a, -0.7, 0.75, 1.02);
  box(g, 1.0, 0.7, 0.08, C.glass, 0.6, 1.1, 1.02);
  // 棚の薬びん
  for (let i = 0; i < 4; i++) {
    cyl(g, 0.08, 0.2, [0xe86a8a, 0x6fc3e8, 0xf5c542, 0x9b6fd6][i], 0.25 + i * 0.22, 0.94, 1.04, 0, 0, 0, 6);
  }
  // 看板（緑の十字）
  box(g, 0.7, 0.7, 0.08, 0xffffff, 0, 2.35, 1.0);
  box(g, 0.5, 0.14, 0.1, 0x4fae45, 0, 2.35, 1.03);
  box(g, 0.14, 0.5, 0.1, 0x4fae45, 0, 2.35, 1.03);
  // 薬草の鉢
  for (const x of [-1.25, 1.25]) { cyl(g, 0.22, 0.3, 0xb86a3a, x, 0.37, 1.35, 0, 0, 0, 7); add(g, new THREE.IcosahedronGeometry(0.25, 0), 0, x, 0.65, 1.35, 1, 1, 1, 0, 0, 0, mat(0x5fbf4f)); }
  return g;
}

function inn() {
  const g = new THREE.Group();
  box(g, 3.6, 0.24, 3.0, C.stone, 0, 0.12, 0);
  box(g, 3.2, 1.4, 2.6, 0xf0dcb8, 0, 0.94, 0);
  box(g, 3.4, 0.16, 2.8, C.woodD, 0, 1.7, 0);
  box(g, 3.2, 1.2, 2.6, 0xe9c9a0, 0, 2.36, 0);
  for (const [x, z] of [[-1.6, 1.3], [1.6, 1.3], [-1.6, -1.3], [1.6, -1.3]]) box(g, 0.2, 2.8, 0.2, C.woodD, x, 1.54, z);
  roof(g, 3.7, 1.3, 3.2, 0x4f7fc9, 0, 2.96, 0);
  box(g, 0.9, 1.15, 0.08, 0x8a5a35, 0, 0.82, 1.31);
  for (const x of [-1.0, 1.0]) { box(g, 0.55, 0.5, 0.08, C.glass, x, 1.05, 1.31); box(g, 0.55, 0.5, 0.08, C.glass, x, 2.4, 1.31); }
  box(g, 0.55, 0.5, 0.08, C.glass, 0, 2.4, 1.31);
  // 看板（ベッド）
  box(g, 0.08, 0.08, 0.7, C.woodD, 1.3, 2.0, 1.65);
  box(g, 0.7, 0.5, 0.08, C.woodL, 1.3, 1.7, 2.0);
  box(g, 0.44, 0.1, 0.1, 0x4f7fc9, 1.3, 1.62, 2.05);
  box(g, 0.14, 0.12, 0.1, 0xffffff, 1.14, 1.72, 2.05);
  lit(g, 0.16, 0.22, 0.16, 0xffd36a, -0.7, 1.45, 1.4);
  return g;
}

function market() {
  const g = new THREE.Group();
  box(g, 5.0, 0.2, 2.6, C.woodL, 0, 0.1, 0);
  const awn = [[0xf05a4a, 0xfff6ea], [0x4f9ad9, 0xfff6ea], [0xf5c542, 0xfff6ea]];
  for (let s = 0; s < 3; s++) {
    const cx = -1.6 + s * 1.6;
    box(g, 1.45, 0.75, 0.6, C.wood, cx, 0.57, 0.8);
    box(g, 1.55, 0.1, 0.72, C.woodL, cx, 0.98, 0.8);
    box(g, 1.45, 1.3, 0.35, C.woodD, cx, 0.85, -0.95);
    for (const x of [cx - 0.72, cx + 0.72]) box(g, 0.12, 2.1, 0.12, C.woodD, x, 1.15, 1.05);
    for (let i = 0; i < 4; i++) box(g, 0.38, 0.07, 2.3, awn[s][i % 2], cx - 0.57 + i * 0.38, 2.18, 0.1, -0.22, 0, 0);
  }
  box(g, 1.8, 0.5, 0.1, C.woodD, 0, 2.75, -1.0);
  cyl(g, 0.17, 0.06, C.gold, -0.4, 2.75, -0.93, Math.PI / 2, 0, 0, 10);
  cyl(g, 0.17, 0.06, C.gold, 0.4, 2.75, -0.93, Math.PI / 2, 0, 0, 10);
  // 旗
  for (const x of [-2.4, 2.4]) { box(g, 0.08, 3.0, 0.08, C.woodD, x, 1.5, -1.1); box(g, 0.5, 0.35, 0.04, x < 0 ? 0xf05a4a : 0x4f9ad9, x + 0.28, 2.75, -1.1); }
  return g;
}

// 街灯（第2章から町に立つ）
export function lampModel() {
  const g = new THREE.Group();
  cyl(g, 0.07, 2.2, 0x3c3f46, 0, 1.1, 0, 0, 0, 0, 6);
  box(g, 0.3, 0.08, 0.3, 0x3c3f46, 0, 2.22, 0);
  lit(g, 0.22, 0.28, 0.22, 0xffe7a0, 0, 2.4, 0);
  box(g, 0.34, 0.06, 0.34, 0x3c3f46, 0, 2.57, 0);
  box(g, 0.3, 0.08, 0.3, 0x3c3f46, 0, 0.04, 0);
  return g;
}

// ---- 第2章の素材・資源 ----
function faceColors(geo, pick) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let f = 0; f < n / 3; f++) { c.setHex(pick(f)); for (let v = 0; v < 3; v++) c.toArray(col, (f * 3 + v) * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
export function oreGeo(r = 0.16) {
  return faceColors(new THREE.DodecahedronGeometry(r, 0).scale(1.05, 0.85, 0.95), f => [3, 7, 10].includes(f % 12) ? 0xe0823c : (f % 2 ? 0x6e625c : 0x7d7069));
}
export const ironRockGeo = faceColors(new THREE.DodecahedronGeometry(0.72, 0).scale(1, 0.75, 0.9).translate(0, 0.38, 0), f => [2, 5, 9, 14, 20, 27, 31].includes(f) ? 0xe0823c : (f % 3 ? 0x77706b : 0x868079));
export const herbGeo = (() => {
  const parts = [];
  for (const [x, z, r, y] of [[0, 0, 0.32, 0.3], [0.28, 0.12, 0.24, 0.24], [-0.25, 0.1, 0.25, 0.24], [0.05, -0.25, 0.22, 0.22]]) parts.push(faceColors(new THREE.IcosahedronGeometry(r, 0).translate(x, y, z), () => 0x4fae45));
  for (const [x, z] of [[0.1, 0.2], [-0.2, -0.1], [0.3, -0.1]]) parts.push(faceColors(new THREE.IcosahedronGeometry(0.07, 0).translate(x, 0.52, z), () => 0xff8fd0));
  return mergeGeos(parts);
})();
function itemGeo2(kind) {
  if (kind === 'ore') return oreGeo();
  if (kind === 'fur') return faceColors(new THREE.BoxGeometry(0.46, 0.12, 0.32), f => (f % 4 < 2 ? 0xc9a27a : 0xe0c29c));
  if (kind === 'herb') return mergeGeos([
    faceColors(new THREE.ConeGeometry(0.07, 0.3, 5).translate(-0.06, 0, 0).rotateZ(0.3), () => 0x4fae45),
    faceColors(new THREE.ConeGeometry(0.07, 0.3, 5).translate(0.06, 0, 0).rotateZ(-0.3), () => 0x5fbf4f),
    faceColors(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6).translate(0, -0.12, 0), () => 0xc98a4b),
    faceColors(new THREE.IcosahedronGeometry(0.05, 0).translate(0, 0.14, 0), () => 0xff8fd0),
  ]);
  if (kind === 'medicine') return mergeGeos([
    faceColors(new THREE.CylinderGeometry(0.12, 0.13, 0.2, 8).translate(0, -0.04, 0), () => 0xe8506a),
    faceColors(new THREE.CylinderGeometry(0.05, 0.08, 0.08, 8).translate(0, 0.1, 0), () => 0xf4f4f4),
    faceColors(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 6).translate(0, 0.16, 0), () => 0xa8713e),
  ]);
  return null;
}

// ---- 第2章の敵 ----
export function wolfParts() {
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const leg = (x, z) => ({ geo: B(0.13, 0.36, 0.14, x, 0.18, z), tint: true, pivot: [x, 0.36, z] });
  return [
    leg(-0.14, 0.32), leg(0.14, 0.32), leg(-0.14, -0.32), leg(0.14, -0.32),
    { geo: B(0.42, 0.4, 0.95, 0, 0.56, 0), tint: true },
    { geo: mergeGeos([B(0.38, 0.34, 0.38, 0, 0.82, 0.56), B(0.12, 0.16, 0.08, -0.12, 1.04, 0.5), B(0.12, 0.16, 0.08, 0.12, 1.04, 0.5), B(0.12, 0.12, 0.45, 0, 0.72, -0.62).rotateX(0)]), tint: true },
    { geo: B(0.2, 0.16, 0.24, 0, 0.74, 0.84), color: 0xd9d4cc },
    { geo: mergeGeos([B(0.07, 0.07, 0.02, -0.1, 0.9, 0.755), B(0.07, 0.07, 0.02, 0.1, 0.9, 0.755), B(0.08, 0.06, 0.04, 0, 0.8, 0.97)]), color: 0x1e1a1a },
  ];
}
function goblinBase(club, extra) {
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  return [
    { geo: B(0.15, 0.28, 0.17, -0.11, 0.14, 0), color: 0x5a4632, pivot: [-0.11, 0.28, 0] },
    { geo: B(0.15, 0.28, 0.17, 0.11, 0.14, 0), color: 0x5a4632, pivot: [0.11, 0.28, 0] },
    { geo: B(0.44, 0.4, 0.3, 0, 0.47, 0), color: 0x8a6a3a },
    { geo: mergeGeos([B(0.46, 0.4, 0.42, 0, 0.88, 0), new THREE.ConeGeometry(0.08, 0.34, 4).rotateZ(Math.PI / 2).translate(-0.36, 0.95, 0), new THREE.ConeGeometry(0.08, 0.34, 4).rotateZ(-Math.PI / 2).translate(0.36, 0.95, 0), B(0.1, 0.12, 0.1, 0, 0.84, 0.24)]), tint: true },
    { geo: mergeGeos([B(0.09, 0.07, 0.02, -0.1, 0.94, 0.215), B(0.09, 0.07, 0.02, 0.1, 0.94, 0.215)]), color: 0xffd23a },
    { geo: B(0.12, 0.32, 0.14, -0.29, 0.5, 0), tint: true, pivot: [-0.29, 0.66, 0] },
    { geo: mergeGeos([B(0.12, 0.32, 0.14, 0.29, 0.5, 0), club]), tint: true, pivot: [0.29, 0.66, 0] },
    ...extra,
  ];
}
export function goblinParts() {
  const club = new THREE.CylinderGeometry(0.09, 0.05, 0.6, 6).rotateX(Math.PI / 2).translate(0.29, 0.36, 0.3);
  return goblinBase(club, []);
}
export function chiefParts() {
  const club = mergeGeos([new THREE.CylinderGeometry(0.13, 0.06, 0.8, 6).rotateX(Math.PI / 2).translate(0.29, 0.34, 0.4), new THREE.DodecahedronGeometry(0.16, 0).translate(0.29, 0.34, 0.78)]);
  const helm = mergeGeos([
    new THREE.CylinderGeometry(0.27, 0.27, 0.16, 8).translate(0, 1.14, 0),
    new THREE.ConeGeometry(0.06, 0.28, 5).rotateZ(0.6).translate(-0.26, 1.3, 0),
    new THREE.ConeGeometry(0.06, 0.28, 5).rotateZ(-0.6).translate(0.26, 1.3, 0),
  ]);
  return goblinBase(club, [{ geo: helm, color: 0xb0a48a }, { geo: new THREE.BoxGeometry(0.5, 0.12, 0.34).translate(0, 0.72, 0), color: 0xc9a27a }]);
}

// ---- 第3章の建物 ----
function harbor() {
  const g = new THREE.Group();
  box(g, 4.4, 0.24, 3.2, C.stone, 0, 0.12, 0);
  box(g, 4.0, 2.0, 2.8, 0x9fb3c8, 0, 1.24, -0.1);
  roof(g, 4.4, 1.2, 3.2, 0x3f6f9f, 0, 2.24, -0.1);
  box(g, 1.6, 1.5, 0.08, 0x6b4f3a, -0.6, 0.99, 1.31);
  box(g, 0.6, 0.5, 0.08, C.glass, 1.2, 1.4, 1.31);
  // 錨の看板
  box(g, 0.08, 0.5, 0.06, 0x3c3f46, 1.2, 2.6, 1.3); box(g, 0.34, 0.06, 0.06, 0x3c3f46, 1.2, 2.45, 1.3); box(g, 0.4, 0.06, 0.06, 0x3c3f46, 1.2, 2.33, 1.3);
  // 桟橋
  for (let i = 0; i < 12; i++) box(g, 2.2, 0.1, 0.36, i % 2 ? C.wood : C.woodL, 0, 0.26, 1.9 + i * 0.4);
  for (const x of [-1.0, 1.0]) for (let i = 0; i < 4; i++) cyl(g, 0.1, 1.4, C.woodD, x, -0.4, 2.2 + i * 1.4, 0, 0, 0, 6);
  // クレーン
  box(g, 0.2, 2.6, 0.2, C.woodD, 1.5, 1.3, 3.0);
  box(g, 1.8, 0.16, 0.16, C.woodD, 0.75, 2.55, 3.0);
  box(g, 0.04, 0.8, 0.04, 0x3c3f46, 0.1, 2.1, 3.0);
  box(g, 0.4, 0.3, 0.3, C.wood, 0.1, 1.6, 3.0);
  // たる
  cyl(g, 0.24, 0.5, C.wood, -1.7, 0.49, 1.6, 0, 0, 0, 8);
  cyl(g, 0.24, 0.5, C.wood, -1.7, 0.99, 1.6, 0, 0, 0, 8);
  return g;
}

function barracks() {
  const g = new THREE.Group();
  box(g, 4.0, 0.24, 3.0, C.stoneD, 0, 0.12, 0);
  box(g, 3.6, 1.8, 2.4, 0xb9b3a8, 0, 1.14, -0.2);
  for (let i = 0; i < 7; i++) box(g, 0.34, 0.28, 0.5, 0xb9b3a8, -1.6 + i * 0.53, 2.18, -0.2);
  roof(g, 2.4, 0.9, 2.0, 0xc0453a, 0, 2.05, -0.3);
  box(g, 1.0, 1.3, 0.08, 0x5a3a2a, 0, 0.9, 1.01);
  box(g, 1.14, 0.14, 0.12, C.stoneD, 0, 1.6, 1.02);
  // 旗
  box(g, 0.08, 1.6, 0.08, C.woodD, 1.5, 2.9, -0.8);
  box(g, 0.6, 0.4, 0.04, 0xc0453a, 1.82, 3.45, -0.8);
  // 訓練用の人形と槍立て
  box(g, 0.1, 1.2, 0.1, C.woodD, -1.3, 0.84, 1.4);
  box(g, 0.6, 0.1, 0.1, C.woodD, -1.3, 1.1, 1.4);
  add(g, new THREE.IcosahedronGeometry(0.2, 0), 0, -1.3, 1.5, 1.4, 1, 1, 1, 0, 0, 0, mat(0xe8d4a0));
  box(g, 0.34, 0.4, 0.2, 0xe8d4a0, -1.3, 1.0, 1.4);
  box(g, 0.9, 0.08, 0.2, C.woodD, 1.2, 0.5, 1.4);
  for (let i = 0; i < 3; i++) { box(g, 0.05, 1.5, 0.05, C.wood, 0.9 + i * 0.3, 0.95, 1.4); box(g, 0.1, 0.2, 0.05, C.iron, 0.9 + i * 0.3, 1.75, 1.4); }
  return g;
}

function bigmarket() {
  const g = new THREE.Group();
  box(g, 6.4, 0.2, 3.0, C.stone, 0, 0.1, 0);
  const awn = [[0xf05a4a, 0xfff6ea], [0x4f9ad9, 0xfff6ea], [0xf5c542, 0xfff6ea], [0x5fbf4f, 0xfff6ea]];
  for (let s = 0; s < 4; s++) {
    const cx = -2.4 + s * 1.6;
    box(g, 1.45, 0.75, 0.6, C.wood, cx, 0.57, 0.85);
    box(g, 1.55, 0.1, 0.72, C.woodL, cx, 0.98, 0.85);
    box(g, 1.45, 1.4, 0.35, C.woodD, cx, 0.9, -1.1);
    for (const x of [cx - 0.72, cx + 0.72]) box(g, 0.12, 2.2, 0.12, C.woodD, x, 1.2, 1.1);
    for (let i = 0; i < 4; i++) box(g, 0.38, 0.07, 2.5, awn[s][i % 2], cx - 0.57 + i * 0.38, 2.28, 0.1, -0.22, 0, 0);
  }
  // 真ん中の大きな天幕
  add(g, new THREE.ConeGeometry(1.4, 1.4, 8), 0, 0, 3.4, -0.3, 1, 1, 1, 0, 0, 0, mat(0xe8674f));
  box(g, 0.1, 1.2, 0.1, C.woodD, 0, 2.6, -0.3);
  box(g, 0.5, 0.3, 0.04, C.gold, 0.28, 4.25, -0.3);
  box(g, 2.6, 0.6, 0.12, C.woodD, 0, 2.95, 0.7);
  for (const x of [-0.7, 0, 0.7]) cyl(g, 0.2, 0.06, C.gold, x, 2.95, 0.78, Math.PI / 2, 0, 0, 10);
  return g;
}

function wall() {
  const g = new THREE.Group();
  const S = 0xc9c2b4, D = 0xa8a195;
  const seg = (x0, x1) => {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    box(g, w, 2.0, 0.9, S, cx, 1.0, 0);
    box(g, w, 0.14, 1.0, D, cx, 2.05, 0);
    for (let x = x0 + 0.4; x < x1 - 0.2; x += 1.1) box(g, 0.55, 0.4, 0.9, S, x, 2.32, 0);
    for (let x = x0 + 1.5; x < x1 - 0.5; x += 3.1) box(g, 0.7, 0.35, 0.06, D, x, 1.1, 0.46);
  };
  seg(-17, -5.4); seg(-0.6, 17);
  for (const x of [-17, -6, 0, 17]) {
    cyl(g, 0.95, 3.2, S, x, 1.6, 0, 0, 0, 0, 10);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(g, 0.34, 0.36, 0.34, S, x + Math.cos(a) * 0.82, 3.35, Math.sin(a) * 0.82); }
    add(g, new THREE.ConeGeometry(1.05, 1.3, 10), 0, x, 4.1, 0, 1, 1, 1, 0, 0, 0, mat(0x4f6fa8));
  }
  // 門の上のアーチと旗
  box(g, 5.0, 0.6, 1.0, S, -3, 3.0, 0);
  for (let x = -5; x <= -1; x += 1) box(g, 0.5, 0.4, 1.0, S, x, 3.5, 0);
  for (const x of [-4.3, -1.7]) { box(g, 0.7, 1.2, 0.05, 0xc0453a, x, 2.1, 0.53); box(g, 0.3, 0.3, 0.06, C.gold, x, 2.3, 0.56); }
  return g;
}

// 船（港に来て商品をまとめて買う）。へさきは -x
export function shipModel() {
  const g = new THREE.Group();
  box(g, 5.2, 0.9, 1.9, 0x8a5a35, 0, 0.45, 0);
  box(g, 5.3, 0.14, 2.0, 0xe8e0d0, 0, 0.95, 0);
  add(g, new THREE.ConeGeometry(0.95, 1.3, 4).rotateY(Math.PI / 4).rotateZ(Math.PI / 2), 0, -3.2, 0.55, 0, 1, 0.55, 1, 0, 0, 0, mat(0x8a5a35));
  box(g, 1.2, 0.9, 1.5, 0x6b4f3a, 1.8, 1.4, 0);
  box(g, 0.14, 4.2, 0.14, C.woodD, -0.4, 3.0, 0);
  box(g, 0.1, 2.4, 2.4, 0xfff6ea, -0.2, 3.1, 0, 0, 0.6, 0);
  box(g, 0.06, 0.6, 0.9, 0xc0453a, -0.4, 5.3, 0.45);
  for (let i = 0; i < 3; i++) box(g, 0.5, 0.4, 0.5, C.wood, -1.6 + i * 0.6, 1.25, (i % 2 - 0.5) * 0.6);
  return g;
}

// 町の旗（第3章から）
export function flagModel() {
  const g = new THREE.Group();
  cyl(g, 0.06, 3.0, 0xd8d0c0, 0, 1.5, 0, 0, 0, 0, 6);
  box(g, 0.9, 0.6, 0.04, 0xc0453a, 0.47, 2.6, 0);
  box(g, 0.3, 0.3, 0.05, C.gold, 0.47, 2.6, 0.01);
  return g;
}

// ---- 第3章の素材・資源 ----
export const goldRockGeo = faceColors(new THREE.DodecahedronGeometry(0.72, 0).scale(1, 0.75, 0.9).translate(0, 0.38, 0), f => [1, 4, 7, 11, 15, 19, 23, 26, 30, 34].includes(f) ? 0xf5c542 : (f % 3 ? 0x7d7672 : 0x8c8580));
function itemGeo3(kind) {
  if (kind === 'gold') return faceColors(new THREE.DodecahedronGeometry(0.15, 0).scale(1.1, 0.8, 1), f => (f % 3 ? 0xf5c542 : 0xe0a82e));
  if (kind === 'horn') return mergeGeos([
    faceColors(new THREE.ConeGeometry(0.1, 0.3, 6).rotateZ(Math.PI / 2).translate(-0.1, 0, 0), () => 0xf0e6cc),
    faceColors(new THREE.ConeGeometry(0.07, 0.24, 6).rotateZ(Math.PI / 2 + 0.7).translate(-0.3, 0.07, 0), () => 0x8a3a2a),
  ]);
  return null;
}

// ---- 第3章の敵（部品の並びは ゴブリンと同じ：左足・右足・体・頭・目・左腕・右腕・…） ----
export function trollParts() {
  const club = mergeGeos([new THREE.CylinderGeometry(0.14, 0.07, 0.9, 6).rotateX(Math.PI / 2).translate(0.29, 0.34, 0.45), new THREE.DodecahedronGeometry(0.18, 0).translate(0.29, 0.34, 0.9)]);
  const tusks = mergeGeos([new THREE.ConeGeometry(0.04, 0.14, 4).translate(-0.1, 0.82, 0.23), new THREE.ConeGeometry(0.04, 0.14, 4).translate(0.1, 0.82, 0.23)]);
  return goblinBase(club, [{ geo: tusks, color: 0xf0e6cc }, { geo: new THREE.BoxGeometry(0.5, 0.14, 0.34).translate(0, 0.3, 0), color: 0x6b4f3a }]);
}
export function skeletonParts() {
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  return [
    { geo: B(0.08, 0.3, 0.08, -0.1, 0.15, 0), tint: true, pivot: [-0.1, 0.3, 0] },
    { geo: B(0.08, 0.3, 0.08, 0.1, 0.15, 0), tint: true, pivot: [0.1, 0.3, 0] },
    { geo: mergeGeos([B(0.08, 0.42, 0.08, 0, 0.52, 0), B(0.36, 0.05, 0.22, 0, 0.64, 0), B(0.32, 0.05, 0.2, 0, 0.54, 0), B(0.26, 0.05, 0.18, 0, 0.44, 0), B(0.3, 0.07, 0.16, 0, 0.32, 0)]), tint: true },
    { geo: mergeGeos([B(0.36, 0.32, 0.34, 0, 0.9, 0), B(0.26, 0.1, 0.24, 0, 0.72, 0.03)]), tint: true },
    { geo: mergeGeos([B(0.09, 0.09, 0.02, -0.08, 0.92, 0.175), B(0.09, 0.09, 0.02, 0.08, 0.92, 0.175)]), color: 0x3a1f4a },
    { geo: B(0.07, 0.34, 0.07, -0.24, 0.5, 0), tint: true, pivot: [-0.24, 0.66, 0] },
    { geo: B(0.07, 0.34, 0.07, 0.24, 0.5, 0), tint: true, pivot: [0.24, 0.66, 0] },
    { geo: mergeGeos([B(0.05, 0.05, 0.6, 0.24, 0.34, 0.3), B(0.16, 0.04, 0.05, 0.24, 0.34, 0.02)]), color: 0xb8bec8, pivot: [0.24, 0.66, 0] },
    { geo: new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8).rotateZ(Math.PI / 2).translate(-0.3, 0.45, 0.06), color: 0x8a5a35, pivot: [-0.24, 0.66, 0] },
  ];
}
export function golemParts() {
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const D = (r, x, y, z) => new THREE.DodecahedronGeometry(r, 0).translate(x, y, z);
  return [
    { geo: B(0.26, 0.42, 0.28, -0.17, 0.21, 0), tint: true, pivot: [-0.17, 0.42, 0] },
    { geo: B(0.26, 0.42, 0.28, 0.17, 0.21, 0), tint: true, pivot: [0.17, 0.42, 0] },
    { geo: mergeGeos([D(0.42, 0, 0.72, 0), D(0.3, 0, 0.95, -0.12)]), tint: true },
    { geo: D(0.2, 0, 1.25, 0.12), tint: true },
    { geo: mergeGeos([B(0.08, 0.05, 0.03, -0.07, 1.27, 0.3), B(0.08, 0.05, 0.03, 0.07, 1.27, 0.3)]), color: 0xffb03a },
    { geo: mergeGeos([B(0.2, 0.5, 0.22, -0.48, 0.72, 0), D(0.16, -0.5, 0.42, 0)]), tint: true, pivot: [-0.45, 0.98, 0] },
    { geo: mergeGeos([B(0.2, 0.5, 0.22, 0.48, 0.72, 0), D(0.16, 0.5, 0.42, 0)]), tint: true, pivot: [0.45, 0.98, 0] },
    { geo: mergeGeos([B(0.3, 0.06, 0.24, -0.12, 1.12, -0.05), B(0.2, 0.06, 0.2, 0.18, 1.02, 0.05), B(0.16, 0.05, 0.14, 0, 1.36, 0.02)]), color: 0x6fb34c },
  ];
}

export const BUILDINGS = { house, sawmill, stonework, shop, smithy, storage, mine, pharmacy, inn, market, harbor, barracks, bigmarket, wall };
