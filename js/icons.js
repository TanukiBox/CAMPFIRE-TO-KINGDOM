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
