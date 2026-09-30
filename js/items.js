// 素材：地面に落ちる → 背中に1個ずつ積み上がる → 建設マスや加工場へ飛んでいく
// 背中に積めるもの（主人公・住民）を「運び手」と呼ぶ。運び手は { bag, cap, anchor, lag, yaw } を持つ
import * as THREE from './lib/three.module.min.js';
import { scene, mat } from './gfx.js';
import { itemGeo } from './models.js';
import { MATERIALS } from './data.js';

const CAP = 700;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color(), _t = new THREE.Vector3();

export class Items {
  constructor() {
    this.all = [];
    this.carriers = [];
    this.extras = [];
    this.meshes = {};
    for (const k in MATERIALS) {
      const geo = itemGeo(k);
      const m = new THREE.InstancedMesh(geo, geo.attributes.color ? mat(0xffffff, { vertexColors: true }) : mat(MATERIALS[k].color), CAP);
      m.frustumCulled = false; m.count = 0;
      m.setColorAt(0, _c.setHex(0xffffff));
      m.castShadow = false;
      scene.add(m);
      this.meshes[k] = m;
    }
  }

  addCarrier(c) { c.bag = c.bag || []; this.carriers.push(c); }
  removeCarrier(c) {
    const i = this.carriers.indexOf(c);
    if (i >= 0) this.carriers.splice(i, 1);
    for (const it of c.bag) this.remove(it);
    c.bag.length = 0;
  }

  make(kind, x, y, z) {
    const it = { kind, p: new THREE.Vector3(x, y, z), v: new THREE.Vector3(), from: new THREE.Vector3(), state: 'ground', age: 0, t: 0, yaw: Math.random() * 6.28, spin: 0, tint: 0.9 + Math.random() * 0.1, keep: false };
    this.all.push(it);
    return it;
  }

  // 資源から飛び出す
  pop(kind, x, y, z, vx, vy, vz) {
    const it = this.make(kind, x, y, z);
    it.v.set(vx, vy, vz);
    it.spin = (Math.random() - 0.5) * 10;
    return it;
  }

  // (x,y,z) から運び手の背中へ飛ばす。いっぱいなら false
  give(c, kind, x, y, z) {
    if (c.bag.length >= c.cap) return false;
    const it = this.make(kind, x, y, z);
    it.state = 'toBag'; it.t = 0; it.from.copy(it.p);
    c.bag.push(it);
    return true;
  }
  // セーブから背中に戻す
  put(c, kind) {
    const it = this.make(kind, c.anchor.x, c.anchor.y, c.anchor.z);
    it.state = 'bag';
    c.bag.push(it);
  }

  remove(it) {
    const i = this.all.indexOf(it);
    if (i >= 0) { this.all[i] = this.all[this.all.length - 1]; this.all.pop(); }
  }

  count(c, kind) { let n = 0; for (const it of c.bag) if (it.kind === kind) n++; return n; }

  // 背中の一番上から、条件に合う素材を1つ取り出す
  take(c, pred) {
    for (let i = c.bag.length - 1; i >= 0; i--) {
      const it = c.bag[i];
      if (it.state === 'bag' && pred(it.kind)) { c.bag.splice(i, 1); return it; }
    }
    return null;
  }
  // 背中から n 個消す（鍛冶屋で使う）
  consume(c, kind, n) {
    for (let i = c.bag.length - 1; i >= 0 && n > 0; i--) {
      if (c.bag[i].kind === kind) { this.remove(c.bag[i]); c.bag.splice(i, 1); n--; }
    }
  }

  flyTo(it, x, y, z, dur, onArrive) {
    it.state = 'fly'; it.t = 0; it.dur = dur;
    it.from.copy(it.p); it.to = new THREE.Vector3(x, y, z); it.onArrive = onArrive;
  }

  // 倒れたとき：背中の上半分を地面にばらまく
  dropHalf(c) {
    const n = Math.floor(c.bag.length / 2);
    for (let i = 0; i < n; i++) {
      const it = c.bag.pop();
      it.state = 'ground'; it.age = 0; it.keep = true;
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
      it.v.set(Math.cos(a) * sp, 4 + Math.random() * 3, Math.sin(a) * sp);
      it.spin = (Math.random() - 0.5) * 10;
    }
    return n;
  }

  // 加工場やお店の山など、動かない物を描く
  draw(kind, x, y, z, yaw = 0) { this.extras.push(kind, x, y, z, yaw); }

  update(dt, player, time, hooks) {
    // 背中
    for (const c of this.carriers) {
      let h = 0;
      const a = c.anchor, lag = c.lag;
      for (let i = 0; i < c.bag.length; i++) {
        const it = c.bag[i];
        const ih = MATERIALS[it.kind].h;
        const hc = h + ih * 0.5, bend = Math.pow(hc, 1.5) * 0.04;
        _t.set(a.x - lag.x * bend + Math.sin(time * 2.2 + i * 0.4) * 0.006 * h, a.y + hc, a.z - lag.z * bend);
        if (it.state === 'toBag') {
          it.t += dt / 0.3;
          const k = Math.min(1, it.t), e = 1 - (1 - k) * (1 - k);
          it.p.lerpVectors(it.from, _t, e);
          it.p.y += Math.sin(Math.PI * k) * 1.1;
          if (k >= 1) { it.state = 'bag'; if (c === player && hooks.onStack) hooks.onStack(it); }
        } else if (it.state === 'bag') {
          it.p.lerp(_t, Math.min(1, dt * 28));
        }
        it.yaw = c.yaw + (i % 2 ? 0.18 : -0.18);
        h += ih;
      }
      c.stackTop = h;
    }

    // 地面と飛んでいる物
    for (let i = this.all.length - 1; i >= 0; i--) {
      const it = this.all[i];
      if (it.state === 'ground') {
        it.age += dt;
        const hh = MATERIALS[it.kind].h * 0.5;
        if (it.p.y > hh || it.v.y > 0) {
          it.v.y -= 16 * dt;
          it.p.addScaledVector(it.v, dt);
          it.yaw += it.spin * dt;
          if (it.p.y < hh) {
            it.p.y = hh;
            if (it.v.y < -2) { it.v.y *= -0.35; it.v.x *= 0.6; it.v.z *= 0.6; } else { it.v.set(0, 0, 0); it.spin = 0; }
          }
          hooks.clamp && hooks.clamp(it.p);
        }
        // 主人公が拾う
        if (it.age > 0.3 && player.alive) {
          const dx = it.p.x - player.pos.x, dz = it.p.z - player.pos.z;
          if (dx * dx + dz * dz < 1.8 * 1.8) {
            if (player.bag.length < player.cap) {
              it.state = 'toBag'; it.t = 0; it.from.copy(it.p);
              player.bag.push(it);
              hooks.onPick && hooks.onPick(it, player.bag.length);
            } else hooks.onFull && hooks.onFull();
          }
        }
        if (!it.keep && it.age > 90) { this.remove(it); continue; }
      } else if (it.state === 'fly') {
        it.t += dt / it.dur;
        const k = Math.min(1, it.t);
        it.p.lerpVectors(it.from, it.to, k);
        it.p.y += Math.sin(Math.PI * k) * 1.4;
        it.yaw += dt * 12;
        if (k >= 1) { this.remove(it); it.onArrive && it.onArrive(it); }
      }
    }
  }

  render(time) {
    const cnt = {};
    for (const k in this.meshes) cnt[k] = 0;
    for (const it of this.all) {
      const n = cnt[it.kind]++;
      if (n >= CAP) continue;
      let y = it.p.y;
      if (it.state === 'ground' && it.v.y === 0) y += 0.04 + Math.sin(time * 3 + it.yaw * 5) * 0.04;
      _q.setFromEuler(_e.set(0, it.yaw, it.state === 'ground' ? 0.2 : 0));
      let sc = 1;
      if (it.state === 'ground' && !it.keep && it.age > 85) sc = (Math.sin(it.age * 20) > 0) ? 1 : 0.001;
      _m.compose(_t.set(it.p.x, y, it.p.z), _q, _s.set(sc, sc, sc));
      this.meshes[it.kind].setMatrixAt(n, _m);
      this.meshes[it.kind].setColorAt(n, _c.setScalar(it.tint));
    }
    const ex = this.extras;
    for (let i = 0; i < ex.length; i += 5) {
      const kind = ex[i], n = cnt[kind]++;
      if (n >= CAP) continue;
      _q.setFromEuler(_e.set(0, ex[i + 4], 0));
      _m.compose(_t.set(ex[i + 1], ex[i + 2], ex[i + 3]), _q, _s.set(1, 1, 1));
      this.meshes[kind].setMatrixAt(n, _m);
      this.meshes[kind].setColorAt(n, _c.setScalar(0.96));
    }
    ex.length = 0;
    for (const k in this.meshes) {
      const m = this.meshes[k];
      m.count = Math.min(CAP, cnt[k]);
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  groundShadows(blobs) {
    for (const it of this.all) if (it.state === 'ground') blobs.push(it.p.x, it.p.z, 0.18);
  }
}

// 山積みの i 番目の位置（2×2 で積み上げる）
export function pileSpot(i, kind, x, z, out) {
  const layer = Math.floor(i / 4), k = i % 4;
  const h = MATERIALS[kind].h;
  const w = kind === 'plank' ? 0.3 : 0.34;
  out.x = x + ((k % 2) - 0.5) * (kind === 'plank' ? 0.62 : w);
  out.z = z + (Math.floor(k / 2) - 0.5) * w;
  out.y = 0.08 + h * 0.5 + layer * h;
  return out;
}
