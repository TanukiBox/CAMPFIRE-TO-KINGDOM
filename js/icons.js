// 画面表示用の小さな絵（コードで描く）
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
  heart(g) {
    g.fillStyle = '#ef4f5f';
    g.beginPath(); g.moveTo(24, 40);
    g.bezierCurveTo(4, 26, 8, 8, 24, 16); g.bezierCurveTo(40, 8, 44, 26, 24, 40); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(16, 18, 4, 3, -0.6, 0, Math.PI * 2); g.fill();
  },
};

function round(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }

export function icon(kind) {
  if (!cache.has(kind)) {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d');
    (DRAW[kind] || DRAW.stone)(g);
    cache.set(kind, c.toDataURL());
  }
  return cache.get(kind);
}

export function iconImg(kind, cls = 'ico') {
  return `<img class="${cls}" src="${icon(kind)}" alt="">`;
}
