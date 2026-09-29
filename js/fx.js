// 演出：飛び散る粒・広がる輪・画面の揺れ・浮かぶ文字
import * as THREE from './lib/three.module.min.js';
import { scene, toScreen } from './gfx.js';

// ---- 粒（インスタンスで一度に描く） ----
const MAX = 600;
const pmesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), MAX);
pmesh.frustumCulled = false;
pmesh.count = 0;
pmesh.setColorAt(0, new THREE.Color());
scene.add(pmesh);
const parts = [];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

export function burst(x, y, z, o = {}) {
  const n = o.n ?? 8, colors = o.colors || [o.color ?? 0xffffff];
  for (let i = 0; i < n && parts.length < MAX; i++) {
    const a = Math.random() * Math.PI * 2, sp = (o.speed ?? 3) * (0.5 + Math.random() * 0.7);
    let dx = Math.cos(a), dz = Math.sin(a);
    if (o.dir) { dx = dx * 0.6 + o.dir.x; dz = dz * 0.6 + o.dir.z; }
    parts.push({
      x: x + (Math.random() - 0.5) * (o.spread ?? 0.3), y: y + (Math.random() - 0.5) * (o.spreadY ?? 0.2), z: z + (Math.random() - 0.5) * (o.spread ?? 0.3),
      vx: dx * sp, vy: (o.up ?? 3) * (0.6 + Math.random() * 0.8), vz: dz * sp,
      g: o.g ?? 12, drag: o.drag ?? 0, life: 0, max: (o.life ?? 0.6) * (0.7 + Math.random() * 0.6),
      size: (o.size ?? 0.14) * (0.7 + Math.random() * 0.6), rx: Math.random() * 6, ry: Math.random() * 6, spin: (Math.random() - 0.5) * 14,
      color: colors[(Math.random() * colors.length) | 0], floor: o.floor ?? true, grow: o.grow ?? 0,
    });
  }
}

// ---- 輪 ----
const ringGeo = new THREE.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2);
const rings = [];
export function ring(x, z, color = 0xffffff, size = 3, life = 0.5) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
  m.position.set(x, 0.08, z);
  m.renderOrder = 2;
  scene.add(m);
  rings.push({ m, t: 0, life, size });
}

// ---- 画面の揺れ ----
export const shakeState = { amt: 0, x: 0, y: 0 };
export function shake(a) { shakeState.amt = Math.min(0.6, Math.max(shakeState.amt, a)); }

// ---- 浮かぶ文字 ----
const layer = document.getElementById('labels');
const floats = [];
const _sp = { x: 0, y: 0, on: false };
export function floatText(text, x, y, z, cls = '') {
  const el = document.createElement('div');
  el.className = 'float ' + cls;
  el.textContent = text;
  layer.appendChild(el);
  floats.push({ el, x, y, z, t: 0, life: 0.9 });
}

export function updateFx(dt) {
  // 粒
  let n = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    p.vy -= p.g * dt;
    if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vz *= d; p.vy *= p.g ? 1 : d; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.floor && p.y < p.size * 0.5) { p.y = p.size * 0.5; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
    p.rx += p.spin * dt; p.ry += p.spin * 0.7 * dt;
  }
  for (const p of parts) {
    const k = p.life / p.max;
    const s = p.size * (p.grow ? (1 + p.grow * k) * (1 - k * k) : (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3));
    _q.setFromEuler(_e.set(p.rx, p.ry, 0));
    _m.compose(_p.set(p.x, p.y, p.z), _q, _s.set(s, s, s));
    pmesh.setMatrixAt(n, _m);
    pmesh.setColorAt(n, _c.setHex(p.color));
    n++;
  }
  pmesh.count = n;
  pmesh.instanceMatrix.needsUpdate = true;
  if (pmesh.instanceColor) pmesh.instanceColor.needsUpdate = true;

  // 輪
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.t += dt;
    const k = r.t / r.life;
    if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); continue; }
    const s = 0.3 + r.size * (1 - (1 - k) * (1 - k));
    r.m.scale.set(s, 1, s);
    r.m.material.opacity = 0.8 * (1 - k);
  }

  // 揺れ
  const s = shakeState;
  if (s.amt > 0.001) {
    s.x = (Math.random() - 0.5) * s.amt; s.y = (Math.random() - 0.5) * s.amt;
    s.amt *= Math.pow(0.0015, dt);
  } else { s.amt = 0; s.x = 0; s.y = 0; }

  // 文字
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    if (f.t >= f.life) { f.el.remove(); floats.splice(i, 1); continue; }
    toScreen(f.x, f.y + f.t * 1.2, f.z, _sp);
    const k = f.t / f.life;
    f.el.style.transform = `translate(${_sp.x}px,${_sp.y}px) translate(-50%,-50%) scale(${k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - (k - 0.15) * 0.2})`;
    f.el.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
  }
}
