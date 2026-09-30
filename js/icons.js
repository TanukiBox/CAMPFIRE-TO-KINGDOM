// 画面表示用の小さな絵（コードで描く）
import { WEAPONS, ARMORS, ENEMY_TYPES } from './data.js';
const cache = new Map();

const DRAW = {
  wood(g) {
    g.fillStyle = '#a86c3c'; round(g, 6, 18, 34, 20, 6); g.fill();
    g.strokeStyle = '#8a5530'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(12, 24); g.lineTo(30, 24); g.moveTo(14, 32); g.lineTo(34, 32); g.stroke();
    g.fillStyle = '#f2cf93'; g.beginPath(); g.ellipse(38, 28, 8, 10, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c99a5c'; g.beginPath(); g.ellipse(38, 28, 4, 5, 0, 0, Math.PI * 2); g.stroke();
  },
  stone(g) {
    g.fillStyle = '#8f949c';
    poly(g, [[8, 32], [14, 14], [30, 8], [42, 16], [42, 34], [26, 40]]); g.fill();
    g.fillStyle = '#b9bdc4';
    poly(g, [[14, 14], [30, 8], [42, 16], [26, 22]]); g.fill();
    g.fillStyle = '#a4a9b0';
    poly(g, [[8, 32], [14, 14], [26, 22], [26, 40]]); g.fill();
  },
  jelly(g) {
    g.fillStyle = '#5fc44e'; g.beginPath(); g.ellipse(24, 29, 17, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#86e36f'; g.beginPath(); g.ellipse(24, 27, 15, 11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(17, 22, 5, 3, -0.5, 0, Math.PI * 2); g.fill();
  },
  bag(g) {
    g.fillStyle = '#8d5a33'; round(g, 10, 12, 28, 30, 7); g.fill();
    g.fillStyle = '#b07344'; round(g, 13, 22, 22, 14, 4); g.fill();
    g.strokeStyle = '#6e4426'; g.lineWidth = 3; g.beginPath(); g.arc(24, 13, 7, Math.PI, 0); g.stroke();
  },
  plank(g) {
    g.fillStyle = '#c9975a'; poly(g, [[4, 30], [36, 14], [44, 20], [12, 36]]); g.fill();
    g.fillStyle = '#f0cf98'; poly(g, [[4, 24], [36, 8], [44, 14], [12, 30]]); g.fill();
    g.fillStyle = '#e0b87c'; poly(g, [[4, 24], [12, 30], [12, 36], [4, 30]]); g.fill();
    g.strokeStyle = '#d4a86c'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(12, 24); g.lineTo(34, 13); g.stroke();
  },
  block(g) {
    g.fillStyle = '#f0ede6'; poly(g, [[8, 16], [24, 8], [40, 16], [24, 24]]); g.fill();
    g.fillStyle = '#cfcac0'; poly(g, [[8, 16], [24, 24], [24, 42], [8, 34]]); g.fill();
    g.fillStyle = '#b3ada2'; poly(g, [[24, 24], [40, 16], [40, 34], [24, 42]]); g.fill();
  },
  coin(g) {
    g.fillStyle = '#d99a1e'; g.beginPath(); g.ellipse(24, 26, 17, 17, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffcf3a'; g.beginPath(); g.ellipse(24, 24, 16, 16, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e8a91e'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(24, 24, 10, 10, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(17, 17, 4, 2.5, -0.7, 0, Math.PI * 2); g.fill();
  },
  people(g) {
    g.fillStyle = '#f28b50'; round(g, 5, 26, 18, 16, 6); g.fill();
    g.fillStyle = '#5fb3e8'; round(g, 25, 24, 18, 18, 6); g.fill();
    g.fillStyle = '#ffd7b0'; g.beginPath(); g.arc(14, 18, 7, 0, Math.PI * 2); g.arc(34, 15, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a4a2a'; g.fillRect(7, 10, 14, 5); g.fillRect(26, 6, 16, 5);
  },
  crown(g) {
    g.fillStyle = '#ffcf3a'; poly(g, [[6, 36], [6, 14], [16, 24], [24, 8], [32, 24], [42, 14], [42, 36]]); g.fill();
    g.fillStyle = '#e8a91e'; g.fillRect(6, 32, 36, 6);
    g.fillStyle = '#ef4f5f'; g.beginPath(); g.arc(24, 28, 3.5, 0, Math.PI * 2); g.fill();
  },
  hammer(g) {
    g.fillStyle = '#b07a44'; poly(g, [[12, 42], [30, 16], [34, 19], [16, 45]]); g.fill();
    g.fillStyle = '#7d828a'; poly(g, [[22, 10], [38, 6], [42, 20], [26, 24]]); g.fill();
    g.fillStyle = '#a4a9b0'; poly(g, [[22, 10], [38, 6], [39, 10], [23, 14]]); g.fill();
  },
  boot(g) {
    g.fillStyle = '#e24b4b'; poly(g, [[14, 8], [28, 8], [28, 28], [42, 32], [42, 40], [10, 40], [12, 26]]); g.fill();
    g.fillStyle = '#fff'; g.fillRect(13, 12, 16, 4);
    g.fillStyle = '#8a2a2a'; g.fillRect(10, 37, 32, 4);
  },
  sword(g) {
    g.fillStyle = '#e8edf3'; poly(g, [[34, 6], [40, 8], [20, 30], [16, 27]]); g.fill();
    g.fillStyle = '#f5c542'; poly(g, [[10, 24], [14, 20], [26, 32], [22, 36]]); g.fill();
    g.fillStyle = '#6b3f22'; poly(g, [[16, 32], [19, 35], [10, 44], [7, 41]]); g.fill();
  },
  axe(g) {
    g.fillStyle = '#b07a44'; poly(g, [[10, 42], [30, 12], [34, 15], [14, 45]]); g.fill();
    g.fillStyle = '#c9ced6'; poly(g, [[26, 8], [42, 12], [38, 26], [30, 20]]); g.fill();
  },
  pick(g) {
    g.fillStyle = '#b07a44'; poly(g, [[12, 42], [28, 16], [32, 19], [16, 45]]); g.fill();
    g.fillStyle = '#9aa0a8'; g.beginPath(); g.moveTo(8, 18); g.quadraticCurveTo(28, 2, 44, 20); g.lineTo(40, 22); g.quadraticCurveTo(28, 10, 12, 21); g.closePath(); g.fill();
  },
  ore(g) {
    g.fillStyle = '#6e625c'; poly(g, [[8, 32], [14, 14], [30, 8], [42, 16], [42, 34], [26, 40]]); g.fill();
    g.fillStyle = '#857870'; poly(g, [[14, 14], [30, 8], [42, 16], [26, 22]]); g.fill();
    g.fillStyle = '#e0823c'; poly(g, [[18, 26], [24, 22], [28, 28], [22, 32]]); g.fill(); poly(g, [[32, 16], [36, 14], [37, 20]]); g.fill();
  },
  fur(g) {
    g.fillStyle = '#c9a27a'; round(g, 6, 14, 36, 22, 9); g.fill();
    g.fillStyle = '#e0c29c'; round(g, 10, 18, 28, 8, 4); g.fill();
    g.fillStyle = '#a8805a'; for (const x of [12, 20, 28, 36]) { g.beginPath(); g.arc(x, 36, 3, 0, Math.PI); g.fill(); }
  },
  herb(g) {
    g.fillStyle = '#4fae45'; g.beginPath(); g.ellipse(17, 24, 7, 15, -0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5fbf4f'; g.beginPath(); g.ellipse(31, 24, 7, 15, 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c98a4b'; g.fillRect(22, 30, 4, 14);
    g.fillStyle = '#ff8fd0'; g.beginPath(); g.arc(24, 12, 5, 0, Math.PI * 2); g.fill();
  },
  medicine(g) {
    g.fillStyle = '#e8506a'; round(g, 12, 20, 24, 22, 8); g.fill();
    g.fillStyle = '#f4f4f4'; g.fillRect(19, 12, 10, 9);
    g.fillStyle = '#a8713e'; g.fillRect(18, 7, 12, 6);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(18, 27, 3, 5, 0, 0, Math.PI * 2); g.fill();
  },
  gold(g) {
    g.fillStyle = '#e0a82e'; poly(g, [[8, 32], [14, 16], [28, 10], [40, 18], [40, 34], [24, 40]]); g.fill();
    g.fillStyle = '#f5c542'; poly(g, [[14, 16], [28, 10], [40, 18], [24, 24]]); g.fill();
    g.fillStyle = '#fff2b0'; poly(g, [[20, 16], [26, 13], [28, 17]]); g.fill();
  },
  horn(g) {
    g.fillStyle = '#f0e6cc'; g.beginPath(); g.moveTo(8, 38); g.quadraticCurveTo(14, 10, 40, 8); g.quadraticCurveTo(24, 18, 20, 40); g.closePath(); g.fill();
    g.fillStyle = '#8a3a2a'; g.beginPath(); g.moveTo(32, 10); g.quadraticCurveTo(36, 9, 40, 8); g.quadraticCurveTo(35, 12, 33, 15); g.closePath(); g.fill();
    g.strokeStyle = '#d8c8a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(12, 32); g.lineTo(18, 34); g.moveTo(15, 24); g.lineTo(21, 27); g.stroke();
  },
  scale(g) {
    g.fillStyle = '#c0453a'; poly(g, [[24, 6], [40, 16], [40, 32], [24, 42], [8, 32], [8, 16]]); g.fill();
    g.fillStyle = '#ff8a5a'; poly(g, [[24, 6], [40, 16], [24, 22], [8, 16]]); g.fill();
    g.strokeStyle = '#8a2a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 22); g.lineTo(24, 42); g.stroke();
  },
  mushcap(g) { g.fillStyle = '#f6e7cc'; g.fillRect(19, 26, 10, 14); g.fillStyle = '#e8514a'; g.beginPath(); g.ellipse(24, 26, 17, 12, 0, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; for (const [x, y] of [[16, 20], [28, 17], [33, 23]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } },
  honey(g) { g.fillStyle = '#f0a830'; round(g, 11, 16, 26, 26, 7); g.fill(); g.fillStyle = '#c98a4b'; g.fillRect(10, 10, 28, 7); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(15, 22, 4, 12); },
  meat(g) { g.fillStyle = '#f6efe0'; g.fillRect(28, 26, 14, 5); g.beginPath(); g.arc(42, 25, 3.5, 0, 7); g.arc(42, 32, 3.5, 0, 7); g.fill(); g.fillStyle = '#b0503a'; g.beginPath(); g.ellipse(20, 26, 13, 10, -0.3, 0, 7); g.fill(); g.fillStyle = '#d07a5a'; g.beginPath(); g.ellipse(17, 23, 5, 3, -0.3, 0, 7); g.fill(); },
  cloth(g) { g.fillStyle = '#8a9a5a'; poly(g, [[6, 16], [40, 12], [42, 34], [8, 38]]); g.fill(); g.fillStyle = '#6f7a48'; poly(g, [[14, 18], [26, 17], [24, 30], [12, 30]]); g.fill(); },
  bone(g) { g.fillStyle = '#f2efe6'; g.save(); g.translate(24, 24); g.rotate(-0.6); g.fillRect(-14, -3, 28, 6); for (const x of [-15, 15]) { g.beginPath(); g.arc(x, -4, 5, 0, 7); g.arc(x, 4, 5, 0, 7); g.fill(); } g.restore(); },
  crabmeat(g) { g.fillStyle = '#fff2ea'; round(g, 8, 16, 32, 18, 5); g.fill(); g.fillStyle = '#ff8a6a'; round(g, 8, 16, 32, 8, 4); g.fill(); },
  tail(g) { g.fillStyle = '#e8603a'; g.beginPath(); g.moveTo(6, 30); g.quadraticCurveTo(24, 8, 44, 16); g.quadraticCurveTo(26, 22, 10, 38); g.closePath(); g.fill(); g.fillStyle = '#ffc04a'; for (const [x, y] of [[16, 26], [26, 19], [36, 16]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); } },
  firestone(g) { g.fillStyle = '#ff5a2a'; poly(g, [[24, 4], [38, 22], [24, 44], [10, 22]]); g.fill(); g.fillStyle = '#ffb03a'; poly(g, [[24, 4], [38, 22], [24, 26], [10, 22]]); g.fill(); g.fillStyle = '#fff2b0'; poly(g, [[22, 12], [26, 12], [24, 20]]); g.fill(); },
  dessert(g) { plateI(g); g.fillStyle = '#86e36f'; g.beginPath(); g.ellipse(24, 28, 11, 11, 0, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(20, 22, 3, 2, -0.5, 0, 7); g.fill(); },
  sautee(g) { plateI(g); g.fillStyle = '#b07a44'; g.fillRect(14, 22, 8, 7); g.fillStyle = '#e8514a'; g.fillRect(24, 20, 8, 8); g.fillStyle = '#5fbf4f'; g.fillRect(20, 27, 6, 5); },
  steak(g) { plateI(g); g.fillStyle = '#8a3a22'; round(g, 12, 19, 22, 12, 5); g.fill(); g.fillStyle = '#5fbf4f'; g.beginPath(); g.arc(35, 27, 3.5, 0, 7); g.fill(); },
  soup(g) { g.fillStyle = '#f4f1ea'; g.beginPath(); g.moveTo(6, 22); g.lineTo(42, 22); g.quadraticCurveTo(40, 42, 24, 42); g.quadraticCurveTo(8, 42, 6, 22); g.fill(); g.fillStyle = '#d9a05a'; g.beginPath(); g.ellipse(24, 22, 17, 5, 0, 0, 7); g.fill(); },
  honeyjelly(g) { plateI(g); g.fillStyle = '#f0a830'; round(g, 15, 14, 18, 17, 5); g.fill(); g.fillStyle = '#e24b4b'; g.beginPath(); g.arc(24, 12, 3.5, 0, 7); g.fill(); },
  stew(g) { g.fillStyle = '#8a5a35'; g.beginPath(); g.moveTo(6, 22); g.lineTo(42, 22); g.quadraticCurveTo(40, 42, 24, 42); g.quadraticCurveTo(8, 42, 6, 22); g.fill(); g.fillStyle = '#9a4a2a'; g.beginPath(); g.ellipse(24, 22, 17, 5, 0, 0, 7); g.fill(); g.fillStyle = '#f2efe6'; g.fillRect(28, 12, 4, 10); },
  crabpot(g) { g.fillStyle = '#3c3f46'; round(g, 8, 18, 32, 22, 6); g.fill(); g.fillStyle = '#ff7a5a'; g.beginPath(); g.ellipse(24, 19, 15, 5, 0, 0, 7); g.fill(); g.fillStyle = '#fff2ea'; g.fillRect(18, 16, 5, 3); },
  skewer(g) { g.strokeStyle = '#c98a4b'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, 40); g.lineTo(42, 8); g.stroke(); g.fillStyle = '#e8603a'; for (const [x, y] of [[16, 31], [24, 24], [32, 17]]) g.fillRect(x - 5, y - 5, 10, 10); },
  feast(g) { g.fillStyle = '#f5c542'; g.beginPath(); g.ellipse(24, 32, 20, 8, 0, 0, 7); g.fill(); g.fillStyle = '#8a3a22'; g.beginPath(); g.arc(18, 24, 8, 0, 7); g.fill(); g.fillStyle = '#ff8a6a'; g.fillRect(26, 20, 11, 8); g.fillStyle = '#f0a830'; g.beginPath(); g.arc(31, 16, 5, 0, 7); g.fill(); },
  box(g) {
    g.fillStyle = '#a8452f'; poly(g, [[6, 18], [24, 10], [42, 18], [24, 26]]); g.fill();
    g.fillStyle = '#c98a4b'; poly(g, [[6, 18], [24, 26], [24, 44], [6, 36]]); g.fill();
    g.fillStyle = '#b07344'; poly(g, [[24, 26], [42, 18], [42, 36], [24, 44]]); g.fill();
    g.strokeStyle = '#7a4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 27); g.lineTo(24, 35); g.lineTo(42, 27); g.stroke();
  },
  chest(g) {
    g.fillStyle = '#8a5a33'; round(g, 6, 20, 36, 22, 4); g.fill();
    g.fillStyle = '#b07344'; g.beginPath(); g.moveTo(6, 22); g.quadraticCurveTo(24, 4, 42, 22); g.closePath(); g.fill();
    g.fillStyle = '#ffcf3a'; g.fillRect(6, 20, 36, 4); g.fillRect(21, 10, 6, 32);
    g.fillStyle = '#e8a91e'; round(g, 19, 24, 10, 9, 2); g.fill();
  },
  starchest(g) {
    g.fillStyle = '#4a3a7a'; round(g, 6, 20, 36, 22, 4); g.fill();
    g.fillStyle = '#6a55b0'; g.beginPath(); g.moveTo(6, 22); g.quadraticCurveTo(24, 4, 42, 22); g.closePath(); g.fill();
    g.fillStyle = '#ffe066'; g.fillRect(6, 20, 36, 4); g.fillRect(21, 10, 6, 32);
    g.fillStyle = '#fff6b0'; star(g, 24, 30, 6, 3);
  },
  star(g) { g.fillStyle = '#ffd84a'; star(g, 24, 25, 19, 8); g.fillStyle = '#fff4b8'; star(g, 20, 21, 6, 2.5); },
  tower(g) {
    g.fillStyle = '#7a7290'; g.fillRect(14, 12, 20, 32);
    g.fillStyle = '#8e86a0'; for (const x of [12, 20, 28]) g.fillRect(x, 6, 7, 8);
    g.fillStyle = '#3a3350'; round(g, 20, 30, 8, 14, 3); g.fill();
    g.fillStyle = '#ffcf3a'; g.fillRect(22, 18, 4, 5);
  },
  heart(g) {
    g.fillStyle = '#ef4f5f';
    g.beginPath(); g.moveTo(24, 40);
    g.bezierCurveTo(4, 26, 8, 8, 24, 16); g.bezierCurveTo(40, 8, 44, 26, 24, 40); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(16, 18, 4, 3, -0.6, 0, Math.PI * 2); g.fill();
  },
};

function plateI(g) { g.fillStyle = '#e9e4da'; g.beginPath(); g.ellipse(24, 32, 19, 7, 0, 0, 7); g.fill(); g.fillStyle = '#fbf8f2'; g.beginPath(); g.ellipse(24, 31, 16, 5.5, 0, 0, 7); g.fill(); }
function round(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function star(g, cx, cy, R, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } g.closePath(); g.fill(); }
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }

// ---- 装備・モンスター・図鑑の絵 ----
const hex = c => '#' + c.toString(16).padStart(6, '0');
function shade(c, k) {
  const r = Math.min(255, Math.round((c >> 16 & 255) * k)), g = Math.min(255, Math.round((c >> 8 & 255) * k)), b = Math.min(255, Math.round((c & 255) * k));
  return `rgb(${r},${g},${b})`;
}
function drawWeapon(g, w) {
  const L = 8 + (w.len - 1) * 30;
  if (w.glow) { g.fillStyle = hex(w.color) + '55'; g.beginPath(); g.arc(28, 20, 16, 0, 7); g.fill(); }
  g.fillStyle = hex(w.color); poly(g, [[36 + L * 0.1, 4], [42 + L * 0.1, 6], [20, 30], [16, 27]]); g.fill();
  g.fillStyle = shade(w.color, 0.75); poly(g, [[39 + L * 0.1, 5], [42 + L * 0.1, 6], [20, 30], [18, 28.5]]); g.fill();
  g.fillStyle = w.id === 'dragon' ? '#e24b4b' : '#f5c542'; poly(g, [[10, 24], [14, 20], [26, 32], [22, 36]]); g.fill();
  g.fillStyle = '#6b3f22'; poly(g, [[16, 32], [19, 35], [10, 44], [7, 41]]); g.fill();
}
function drawArmor(g, a) {
  g.fillStyle = shade(a.color, 0.8); round(g, 8, 10, 32, 30, 8); g.fill();
  g.fillStyle = hex(a.color); poly(g, [[12, 12], [20, 8], [24, 14], [28, 8], [36, 12], [36, 38], [12, 38]]); g.fill();
  g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(15, 16, 5, 16);
  g.fillStyle = shade(a.color, 0.65); g.fillRect(12, 30, 24, 4);
  if (a.id === 'cloth') { g.fillStyle = '#f5e6c8'; g.fillRect(22, 14, 4, 16); }
}
function eyes(g, x, y, gap, r = 2.6) {
  g.fillStyle = '#2b1d14';
  g.beginPath(); g.arc(x - gap, y, r, 0, 7); g.arc(x + gap, y, r, 0, 7); g.fill();
}
function drawMonster(g, type, def) {
  const c = hex(def.color), d = shade(def.color, 0.75), l = shade(def.color, 1.25);
  switch (def.rig) {
    case 'slime': case 'boss':
      g.fillStyle = d; g.beginPath(); g.ellipse(24, 32, 19, 13, 0, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.moveTo(5, 34); g.quadraticCurveTo(8, 8, 24, 8); g.quadraticCurveTo(40, 8, 43, 34); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(16, 17, 4, 2.5, -0.6, 0, 7); g.fill();
      eyes(g, 24, 25, 6);
      if (def.rig === 'boss') { g.fillStyle = '#ffcf3a'; poly(g, [[14, 10], [14, 2], [19, 6], [24, 0], [29, 6], [34, 2], [34, 10]]); g.fill(); }
      break;
    case 'mushroom':
      g.fillStyle = '#f2e6cf'; round(g, 16, 22, 16, 20, 5); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(24, 22, 20, 13, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#fff'; for (const [x, y] of [[15, 16], [26, 12], [33, 18]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
      eyes(g, 24, 30, 4, 2);
      break;
    case 'wolf': case 'boar': case 'lizard':
      g.fillStyle = d; for (const x of [12, 18, 30, 36]) g.fillRect(x, 30, 4, 12);
      g.fillStyle = c; g.beginPath(); g.ellipse(24, 28, 16, 9, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(39, 20, 8, 7, 0, 0, 7); g.fill();
      if (def.rig === 'wolf') { poly(g, [[35, 14], [37, 5], [41, 13]]); g.fill(); g.fillStyle = l; poly(g, [[8, 26], [2, 16], [10, 22]]); g.fill(); }
      if (def.rig === 'boar') { g.fillStyle = '#f2efe6'; poly(g, [[44, 24], [47, 17], [45, 26]]); g.fill(); g.fillStyle = d; g.fillRect(24, 18, 12, 3); }
      if (def.rig === 'lizard') { g.fillStyle = c; poly(g, [[9, 26], [1, 36], [12, 31]]); g.fill(); g.fillStyle = '#ffc04a'; for (const x of [18, 24, 30]) { g.beginPath(); g.arc(x, 24, 2, 0, 7); g.fill(); } }
      g.fillStyle = '#2b1d14'; g.beginPath(); g.arc(41, 18, 2, 0, 7); g.fill();
      break;
    case 'crab':
      g.fillStyle = d; for (const x of [10, 16, 30, 36]) g.fillRect(x, 30, 3, 10);
      g.fillStyle = c; g.beginPath(); g.ellipse(24, 28, 16, 10, 0, Math.PI, 0); g.fill(); g.fillRect(8, 27, 32, 5);
      g.beginPath(); g.arc(7, 18, 6, 0, 7); g.arc(41, 18, 6, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(19, 16, 3.5, 0, 7); g.arc(29, 16, 3.5, 0, 7); g.fill();
      eyes(g, 24, 16, 5, 1.8);
      break;
    case 'bee':
      g.fillStyle = 'rgba(220,240,255,.9)'; g.beginPath(); g.ellipse(18, 12, 8, 6, -0.5, 0, 7); g.ellipse(30, 12, 8, 6, 0.5, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(24, 28, 15, 11, 0, 0, 7); g.fill();
      g.fillStyle = '#3a2a1a'; g.fillRect(18, 18, 4, 20); g.fillRect(27, 18, 4, 20);
      eyes(g, 36, 25, 0, 2.2);
      break;
    case 'drake': case 'dragon':
      g.fillStyle = d; poly(g, [[20, 22], [2, 6], [8, 24]]); g.fill(); poly(g, [[28, 22], [46, 6], [40, 24]]); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(24, 30, 12, 11, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(24, 15, 8, 7, 0, 0, 7); g.fill();
      g.fillStyle = '#f2efe6'; poly(g, [[18, 10], [16, 3], [21, 8]]); g.fill(); poly(g, [[30, 10], [32, 3], [27, 8]]); g.fill();
      g.fillStyle = l; g.beginPath(); g.ellipse(24, 33, 6, 6, 0, 0, 7); g.fill();
      eyes(g, 24, 15, 3.5, 1.8);
      break;
    case 'wisp':
      g.fillStyle = shade(def.color, 0.9); g.beginPath(); g.moveTo(24, 2); g.quadraticCurveTo(44, 24, 36, 38); g.quadraticCurveTo(24, 48, 12, 38); g.quadraticCurveTo(4, 24, 24, 2); g.fill();
      g.fillStyle = '#ffe07a'; g.beginPath(); g.ellipse(24, 32, 9, 10, 0, 0, 7); g.fill();
      eyes(g, 24, 30, 4, 2);
      break;
    default: {
      // 人の形（ゴブリン・トロル・がいこつ・岩の巨人）
      const golem = def.rig === 'golem';
      g.fillStyle = d; g.fillRect(15, 34, 6, 10); g.fillRect(27, 34, 6, 10);
      g.fillStyle = c;
      if (golem) { g.fillRect(8, 18, 32, 20); g.fillRect(2, 20, 8, 16); g.fillRect(38, 20, 8, 16); g.fillRect(16, 6, 16, 13); }
      else { round(g, 12, 22, 24, 16, 5); g.fill(); g.beginPath(); g.arc(24, 14, 10, 0, 7); g.fill(); }
      if (def.rig === 'goblin' || def.rig === 'chief') { poly(g, [[14, 12], [4, 8], [15, 17]]); g.fill(); poly(g, [[34, 12], [44, 8], [33, 17]]); g.fill(); }
      if (def.rig === 'chief') { g.fillStyle = '#ffcf3a'; poly(g, [[16, 6], [16, 0], [20, 3], [24, -1], [28, 3], [32, 0], [32, 6]]); g.fill(); }
      if (def.rig === 'troll') { g.fillStyle = '#f2efe6'; poly(g, [[16, 7], [12, -1], [19, 5]]); g.fill(); poly(g, [[32, 7], [36, -1], [29, 5]]); g.fill(); }
      if (def.rig === 'skeleton') { g.fillStyle = '#9a948a'; for (const y of [25, 29, 33]) g.fillRect(16, y, 16, 1.5); }
      eyes(g, 24, golem ? 12 : 14, 4, def.rig === 'skeleton' ? 3 : 2.2);
    }
  }
}
function drawBook(g) {
  g.fillStyle = '#8a5a33'; round(g, 8, 6, 32, 38, 5); g.fill();
  g.fillStyle = '#f5ecd8'; g.fillRect(12, 9, 26, 32);
  g.fillStyle = '#b0773f'; round(g, 8, 6, 28, 38, 5); g.fill();
  g.fillStyle = '#ffcf3a'; g.beginPath(); g.arc(22, 22, 7, 0, 7); g.fill();
  g.fillStyle = '#e8742c'; g.beginPath(); g.arc(22, 22, 3.5, 0, 7); g.fill();
  g.fillStyle = '#6b3f22'; g.fillRect(12, 34, 20, 3);
}
function drawSpecial(g, kind) {
  if (kind === 'book') { drawBook(g); return true; }
  if (kind.startsWith('w_')) { const w = WEAPONS.find(x => x.id === kind.slice(2)); if (w) { drawWeapon(g, w); return true; } }
  if (kind.startsWith('a_')) { const a = ARMORS.find(x => x.id === kind.slice(2)); if (a) { drawArmor(g, a); return true; } }
  if (kind.startsWith('m_')) {
    const sil = kind.endsWith('_sil'), type = kind.slice(2, sil ? -4 : undefined), def = ENEMY_TYPES[type];
    if (!def) return false;
    drawMonster(g, type, def);
    // まだ出会っていないモンスターは影だけ
    if (sil) { g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(90,74,62,.45)'; g.fillRect(0, 0, 48, 48); g.globalCompositeOperation = 'source-over'; }
    return true;
  }
  return false;
}

export function icon(kind) {
  if (!cache.has(kind)) {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d');
    if (!drawSpecial(g, kind)) (DRAW[kind] || DRAW.stone)(g);
    cache.set(kind, c.toDataURL());
  }
  return cache.get(kind);
}

export function iconImg(kind, cls = 'ico') {
  return `<img class="${cls}" src="${icon(kind)}" alt="">`;
}
