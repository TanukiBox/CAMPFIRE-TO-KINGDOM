// 操作：画面のどこでも指を置いた所がスティックの中心になる。PCはWASD/矢印キーとマウスのドラッグ
const app = document.getElementById('app');
const joy = document.getElementById('joy');
const knob = document.getElementById('joyKnob');
const R = 52;

let pid = null, ox = 0, oy = 0, jx = 0, jy = 0;
const keys = new Set();
const listeners = [];
export const input = { moved: false };
export function onFirstTouch(fn) { listeners.push(fn); }
function first() { while (listeners.length) listeners.shift()(); }

app.addEventListener('pointerdown', e => {
  if (e.target.closest('button, a, .modal, .hud-btn')) return;
  first();
  if (pid !== null) return;
  pid = e.pointerId; ox = e.clientX; oy = e.clientY; jx = jy = 0;
  joy.style.transform = `translate(${ox}px,${oy}px)`;
  knob.style.transform = 'translate(0px,0px)';
  joy.hidden = false;
  try { app.setPointerCapture(pid); } catch (err) { /* なし */ }
  e.preventDefault();
});
app.addEventListener('pointermove', e => {
  if (e.pointerId !== pid) return;
  let dx = e.clientX - ox, dy = e.clientY - oy;
  const d = Math.hypot(dx, dy);
  if (d > R) {
    // 指が遠くへ行ったら、スティックの中心もついていく
    ox += dx * (1 - R / d); oy += dy * (1 - R / d);
    dx = e.clientX - ox; dy = e.clientY - oy;
    joy.style.transform = `translate(${ox}px,${oy}px)`;
  }
  jx = dx / R; jy = dy / R;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
});
function end(e) {
  if (e.pointerId !== pid) return;
  pid = null; jx = jy = 0; joy.hidden = true;
}
app.addEventListener('pointerup', end);
app.addEventListener('pointercancel', end);
app.addEventListener('lostpointercapture', end);

const KEYMAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
window.addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  first();
  keys.add(k); e.preventDefault();
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
window.addEventListener('blur', () => { keys.clear(); pid = null; jx = jy = 0; joy.hidden = true; });

// x = 右、z = 画面の下。長さは0〜1
export function readMove(out) {
  let x = jx, z = jy;
  if (keys.size) {
    x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
    z = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
  }
  let m = Math.hypot(x, z);
  if (m < 0.15) { out.x = 0; out.z = 0; out.m = 0; return out; }
  const k = Math.min(1, m) / m;
  out.x = x * k; out.z = z * k; out.m = Math.min(1, m);
  input.moved = true;
  return out;
}
