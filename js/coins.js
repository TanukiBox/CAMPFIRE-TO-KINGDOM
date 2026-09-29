// コイン：お店に積もる・主人公へ飛ぶ・土地のマスへ飛ぶ
import * as THREE from './lib/three.module.min.js';
import { scene } from './gfx.js';
import { coinGeo } from './models.js';

const CAP = 500;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

export class Coins {
  constructor() {
    this.mesh = new THREE.InstancedMesh(coinGeo, new THREE.MeshLambertMaterial({ color: 0xffcf3a, emissive: 0x6a4a00, flatShading: true }), CAP);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    this.fly = [];
    this.n = 0;
  }

  // (fx,fy,fz) から to() が返す場所へ飛ぶ。to は毎フレーム呼ばれる（動く相手を追える）
  send(fx, fy, fz, to, dur, onArrive, arc = 1.2) {
    if (this.fly.length > 200) { onArrive && onArrive(); return; }
    this.fly.push({ f: new THREE.Vector3(fx, fy, fz), to, t: 0, dur, onArrive, arc, spin: Math.random() * 6 });
  }

  // 山積みを描く（n 枚。10枚で1列、最大 cols 列）
  pile(n, x, z, max = 60) {
    const show = Math.min(n, max);
    for (let i = 0; i < show; i++) {
      const col = Math.floor(i / 10), k = i % 10;
      const cx = x + ((col % 3) - 1) * 0.3, cz = z + (Math.floor(col / 3) - 0.5) * 0.3;
      this.draw(cx + Math.sin(i * 2.3) * 0.02, 0.05 + k * 0.055, cz + Math.cos(i * 1.7) * 0.02, i * 0.7, 0);
    }
  }

  draw(x, y, z, yaw, tilt) {
    if (this.n >= CAP) return;
    _q.setFromEuler(_e.set(tilt, yaw, 0));
    _m.compose(_p.set(x, y, z), _q, _s);
    this.mesh.setMatrixAt(this.n++, _m);
  }

  update(dt) {
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const c = this.fly[i];
      c.t += dt / c.dur;
      const k = Math.min(1, c.t);
      const to = c.to();
      _p.lerpVectors(c.f, to, k * k * (3 - 2 * k));
      _p.y += Math.sin(Math.PI * k) * c.arc;
      c.spin += dt * 14;
      this.draw(_p.x, _p.y, _p.z, c.spin, Math.PI / 2);
      if (k >= 1) { this.fly.splice(i, 1); c.onArrive && c.onArrive(); }
    }
  }

  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.n = 0;
  }
}
