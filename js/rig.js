// たくさん出るキャラ（敵・住民・客）を部品ごとにまとめて描く仕組み
import * as THREE from './lib/three.module.min.js';
import { scene, mat } from './gfx.js';

const _o = new THREE.Matrix4(), _l = new THREE.Matrix4();

export class Rig {
  // parts: [{ geo, color | tint:true, pivot:[x,y,z] }]  pivot があれば、その点を中心に前後へ振れる（手足）
  constructor(parts, cap) {
    this.parts = parts.map(p => {
      const m = new THREE.InstancedMesh(p.geo, mat(p.tint ? 0xffffff : p.color), cap);
      m.frustumCulled = false; m.count = 0;
      if (p.tint) m.setColorAt(0, new THREE.Color());
      scene.add(m);
      return { mesh: m, tint: !!p.tint, pivot: p.pivot || null, axis: p.axis || 'x' };
    });
    this.cap = cap; this.n = 0;
  }
  begin() { this.n = 0; }
  // root: 位置・向き・大きさ。angles: 部品ごとの振れ角。color: tint 部品の色
  push(root, angles, color) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    for (let k = 0; k < this.parts.length; k++) {
      const p = this.parts[k];
      const a = angles ? angles[k] : 0;
      if (a && p.pivot) {
        const [px, py, pz] = p.pivot, c = Math.cos(a), s = Math.sin(a);
        if (p.axis === 'z') {
          // 羽ばたき（前後の軸まわり）
          _l.makeRotationZ(a);
          _l.elements[12] = px - (px * c - py * s);
          _l.elements[13] = py - (px * s + py * c);
        } else {
          _l.makeRotationX(a);
          _l.elements[13] = py - (py * c - pz * s);
          _l.elements[14] = pz - (py * s + pz * c);
        }
        _o.multiplyMatrices(root, _l);
        p.mesh.setMatrixAt(i, _o);
      } else p.mesh.setMatrixAt(i, root);
      if (p.tint) p.mesh.setColorAt(i, color);
    }
  }
  end() {
    for (const p of this.parts) {
      p.mesh.count = this.n;
      p.mesh.instanceMatrix.needsUpdate = true;
      if (p.tint && p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true;
    }
  }
}
