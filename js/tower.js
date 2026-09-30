// 試練の塔：地図から離れた場所にある丸い闘技場。階ごとにモンスターの群れ、5階ごとにぬしが出る
import * as THREE from './lib/three.module.min.js';
import { scene, mat, glow } from './gfx.js';

export const ARENA = { x: 400, z: 400, r: 10.5 };

export class TowerArena {
  constructor() { this.group = null; this.flames = []; }

  build() {
    if (this.group) return;
    const g = this.group = new THREE.Group();
    g.position.set(ARENA.x, 0, ARENA.z);
    // 下の暗い地面と、石の床
    const under = new THREE.Mesh(new THREE.CircleGeometry(70, 24).rotateX(-Math.PI / 2), mat(0x3a3350));
    under.position.y = -0.6; under.receiveShadow = true; g.add(under);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(12.2, 12.8, 0.8, 10).translate(0, -0.4, 0), mat(0x8e86a0, { flatShading: true }));
    floor.receiveShadow = true; g.add(floor);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.04, 10).translate(0, 0.02, 0), mat(0x7a7290));
    inner.receiveShadow = true; g.add(inner);
    const mark = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.6, 5).rotateX(-Math.PI / 2), glow(0xb58ae0));
    mark.position.y = 0.05; g.add(mark);
    this.mark = mark;
    // 柱とたいまつ
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, x = Math.cos(a) * 11.8, z = Math.sin(a) * 11.8;
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.4, 0.9).translate(0, 1.7, 0), mat(0x6e6684, { flatShading: true }));
      col.position.set(x, 0, z); col.rotation.y = -a; col.castShadow = true; g.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), mat(0x5a5470));
      cap.position.set(x, 3.5, z); cap.rotation.y = -a; g.add(cap);
      const f = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), glow(0xff9a3a));
      f.position.set(x, 3.95, z); g.add(f); this.flames.push(f);
    }
    // 空に浮かぶ星
    const stars = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.18, 0), glow(0xfff2b0), 60);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 30;
      stars.setMatrixAt(i, m.makeTranslation(Math.cos(a) * r, 2 + Math.random() * 12, Math.sin(a) * r));
    }
    g.add(stars);
    scene.add(g);
  }

  update(t) {
    if (!this.group) return;
    this.flames.forEach((f, i) => { const k = 1 + Math.sin(t * 9 + i) * 0.2; f.scale.set(k, k * 1.3, k); f.rotation.y = t * 2 + i; });
    this.mark.rotation.y = t * 0.3;
  }
}
