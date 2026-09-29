// 素材：地面に落ちる → 背中に1個ずつ積み上がる → 建設マスへ飛んでいく
import * as THREE from './lib/three.module.min.js';
import { scene, mat } from './gfx.js';
import { itemGeo } from './models.js';
import { MATERIALS } from './data.js';

const CAP = 500;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color(), _t = new THREE.Vector3();

export class Items {
  constructor(cap) {
    this.cap = cap;
    this.all = [];
    this.bag = [];
    this.meshes = {};
    for (const k in MATERIALS) {
      const m = new THREE.InstancedMesh(itemGeo(k), k === 'wood' ? mat(0xffffff, { vertexColors: true }) : mat(MATERIALS[k].color), CAP);
      m.frustumCulled = false; m.count = 0;
      m.setColorAt(0, _c.setHex(0xffffff));
      scene.add(m);
      this.meshes[k] = m;
    }
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

  // セーブから背中に戻す
  addToBag(kind, player) {
    const it = this.make(kind, player.pos.x, 1, player.pos.z);
    it.state = 'bag';
    this.bag.push(it);
  }

  get full() { return this.bag.length >= this.cap; }

  remove(it) {
    const i = this.all.indexOf(it);
    if (i >= 0) { this.all[i] = this.all[this.all.length - 1]; this.all.pop(); }
  }

  // 背中の一番上から、条件に合う素材を1つ取り出す
  takeFromBag(pred) {
    for (let i = this.bag.length - 1; i >= 0; i--) {
      const it = this.bag[i];
      if (it.state === 'bag' && pred(it.kind)) { this.bag.splice(i, 1); return it; }
    }
    return null;
  }

  flyTo(it, x, y, z, dur, onArrive) {
    it.state = 'fly'; it.t = 0; it.dur = dur;
    it.from.copy(it.p); it.to = new THREE.Vector3(x, y, z); it.onArrive = onArrive;
  }

  // 倒れたとき：背中の上半分を地面にばらまく
  dropHalf(x, z) {
    const n = Math.floor(this.bag.length / 2);
    for (let i = 0; i < n; i++) {
      const it = this.bag.pop();
      it.state = 'ground'; it.age = 0; it.keep = true;
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
      it.v.set(Math.cos(a) * sp, 4 + Math.random() * 3, Math.sin(a) * sp);
      it.spin = (Math.random() - 0.5) * 10;
    }
    return n;
  }

  // 背中の i 番目の位置
  stackPos(i, h, player, out) {
    const a = player.anchor;
    const lag = player.lag;
    const bend = Math.pow(h, 1.5);
    out.set(a.x - lag.x * bend * 0.04, a.y + h, a.z - lag.z * bend * 0.04);
    return out;
  }

  update(dt, player, time, hooks) {
    // 背中
    let h = 0;
    for (let i = 0; i < this.bag.length; i++) {
      const it = this.bag[i];
      const ih = MATERIALS[it.kind].h;
      this.stackPos(i, h + ih * 0.5, player, _t);
      _t.x += Math.sin(time * 2.2 + i * 0.4) * 0.006 * h;
      if (it.state === 'toBag') {
        it.t += dt / 0.3;
        const k = Math.min(1, it.t), e = 1 - (1 - k) * (1 - k);
        it.p.lerpVectors(it.from, _t, e);
        it.p.y += Math.sin(Math.PI * k) * 1.1;
        if (k >= 1) { it.state = 'bag'; hooks.onStack && hooks.onStack(it); }
      } else if (it.state === 'bag') {
        it.p.lerp(_t, Math.min(1, dt * 28));
      }
      it.yaw = player.yaw + (i % 2 ? 0.18 : -0.18);
      h += ih;
    }
    this.stackTop = h;

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
        // 拾う
        if (it.age > 0.3 && player.alive) {
          const dx = it.p.x - player.pos.x, dz = it.p.z - player.pos.z;
          if (dx * dx + dz * dz < 1.8 * 1.8) {
            if (this.bag.length < this.cap) {
              it.state = 'toBag'; it.t = 0; it.from.copy(it.p);
              this.bag.push(it);
              hooks.onPick && hooks.onPick(it, this.bag.length);
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
      const m = this.meshes[it.kind];
      const n = cnt[it.kind]++;
      if (n >= CAP) continue;
      let y = it.p.y;
      if (it.state === 'ground' && it.v.y === 0) y += 0.04 + Math.sin(time * 3 + it.yaw * 5) * 0.04;
      _q.setFromEuler(_e.set(0, it.yaw, it.state === 'ground' ? 0.2 : 0));
      let sc = 1;
      if (it.state === 'ground' && !it.keep && it.age > 85) sc = (Math.sin(it.age * 20) > 0) ? 1 : 0.001;
      _m.compose(_t.set(it.p.x, y, it.p.z), _q, _s.set(sc, sc, sc));
      m.setMatrixAt(n, _m);
      m.setColorAt(n, _c.setScalar(it.tint));
    }
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
