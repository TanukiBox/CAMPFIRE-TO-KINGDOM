// 地面・柵・焚き火・草花と、ぶつかり判定
import * as THREE from './lib/three.module.min.js';
import { scene, mat } from './gfx.js';
import { campfire } from './models.js';

export function rand(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const noise2 = (x, z) => Math.sin(x * 0.31 + Math.sin(z * 0.17) * 2) * 0.5 + Math.sin(z * 0.27 - x * 0.13) * 0.5;

export class World {
  constructor(ch) {
    this.ch = ch;
    this.fence = ch.fence;
    this.circles = [];
    this.boxes = [];
    this.makeGround();
    this.makeFence();
    const cf = campfire();
    cf.group.position.set(ch.campfire[0], 0, ch.campfire[1]);
    scene.add(cf.group);
    this.flames = cf.flames;
    this.fire = cf.group.position;
    this.circles.push({ x: ch.campfire[0], z: ch.campfire[1], r: 0.75 });
    this.makeGlow();
  }

  // 柵の外側ほど高くなる地面
  heightAt(x, z) {
    const f = this.fence;
    const d = Math.max(f.x0 - x, x - f.x1, f.z0 - z, z - f.z1, 0);
    if (d < 2.5) return 0;
    return Math.min((d - 2.5) * 0.28, 4) * (0.75 + 0.35 * noise2(x * 1.7, z * 1.7));
  }

  makeGround() {
    const g = new THREE.PlaneGeometry(130, 130, 52, 52).rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color(0x93d36b), grassB = new THREE.Color(0x7fc45e), dirt = new THREE.Color(0xe2c38f), outer = new THREE.Color(0x76b85a), c = new THREE.Color();
    const [fx, fz] = this.ch.campfire;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = this.heightAt(x, z);
      pos.setY(i, h);
      c.copy(grassA).lerp(grassB, noise2(x, z) * 0.5 + 0.5);
      if (h > 0) c.lerp(outer, Math.min(1, h / 2));
      const dc = Math.hypot(x - fx, z - fz);
      if (dc < 4.2) c.lerp(dirt, clamp((4.2 - dc) / 1.4, 0, 1));
      c.toArray(col, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    ground.receiveShadow = true;
    scene.add(ground);
  }

  makeFence() {
    const f = this.fence;
    const posts = [], rails = [];
    const side = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.7));
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        posts.push([x0, z0]);
        rails.push([(x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0), Math.atan2(-(z1 - z0), x1 - x0)]);
      }
    };
    side(f.x0, f.z0, f.x1, f.z0); side(f.x1, f.z0, f.x1, f.z1); side(f.x1, f.z1, f.x0, f.z1); side(f.x0, f.z1, f.x0, f.z0);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3();
    const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.95, 0.18).translate(0, 0.47, 0), mat(0xa7713f), posts.length);
    posts.forEach(([x, z], i) => postMesh.setMatrixAt(i, m.makeTranslation(x, 0, z)));
    const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.1, 0.07), mat(0xc58f58), rails.length * 2);
    rails.forEach(([x, z, len, a], i) => {
      q.setFromAxisAngle(up, a);
      railMesh.setMatrixAt(i * 2, m.compose(p.set(x, 0.38, z), q, s.set(len, 1, 1)));
      railMesh.setMatrixAt(i * 2 + 1, m.compose(p.set(x, 0.72, z), q, s.set(len, 1, 1)));
    });
    for (const im of [postMesh, railMesh]) { im.castShadow = true; im.computeBoundingSphere(); scene.add(im); }
  }

  makeGlow() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,170,80,0.55)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glow.position.set(this.fire.x, 0.04, this.fire.z);
    this.glow.renderOrder = 1;
    scene.add(this.glow);
  }

  // 草と花。建物やマスの上には生やさない
  decorate(avoid) {
    const r = rand(7), f = this.fence;
    const inAvoid = (x, z) => avoid.some(a => x > a.x0 - 0.3 && x < a.x1 + 0.3 && z > a.z0 - 0.3 && z < a.z1 + 0.3) || Math.hypot(x - this.fire.x, z - this.fire.z) < 3.5;
    const grass = [], flowers = [];
    for (let i = 0; i < 700 && grass.length < 260; i++) {
      const x = f.x0 - 8 + r() * (f.x1 - f.x0 + 16), z = f.z0 - 8 + r() * (f.z1 - f.z0 + 16);
      if (inAvoid(x, z)) continue;
      grass.push([x, z, 0.7 + r() * 0.6, r() * 6]);
      if (r() < 0.25) flowers.push([x + 0.3, z + 0.2, r()]);
    }
    const tuft = new THREE.ConeGeometry(0.09, 0.34, 4).translate(0, 0.17, 0);
    const geo = mergeTufts(tuft);
    const gm = new THREE.InstancedMesh(geo, mat(0x6fb34c), grass.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    grass.forEach(([x, z, sc, a], i) => {
      q.setFromAxisAngle(up, a);
      gm.setMatrixAt(i, m.compose(p.set(x, this.heightAt(x, z), z), q, s.set(sc, sc, sc)));
    });
    const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0).translate(0, 0.22, 0), mat(0xffffff), flowers.length);
    const cols = [0xff8fa3, 0xffe066, 0xffffff, 0xb18cff, 0xff9f5a], c = new THREE.Color();
    flowers.forEach(([x, z, k], i) => {
      fm.setMatrixAt(i, m.makeTranslation(x, this.heightAt(x, z), z));
      fm.setColorAt(i, c.setHex(cols[(k * cols.length) | 0]));
    });
    for (const im of [gm, fm]) { im.computeBoundingSphere(); scene.add(im); }
  }

  update(t) {
    this.flames.forEach((f, i) => {
      const b = f.userData.base;
      const k = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 17 + i * 2) * 0.06;
      f.scale.set(b.r * 2 * (2 - k) * 0.9 + b.r * 0.2, b.h * k, b.r * 2 * (2 - k) * 0.9 + b.r * 0.2);
      f.rotation.y = t * (1 + i);
    });
    this.glow.material.opacity = 0.6 + Math.sin(t * 8) * 0.08;
  }

  // 丸い物と四角い物からはみ出さないように押し戻す
  resolve(p, r) {
    for (const c of this.circles) {
      if (c.off && c.off()) continue;
      const dx = p.x - c.x, dz = p.z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-8) { const d = Math.sqrt(d2); p.x = c.x + dx / d * rr; p.z = c.z + dz / d * rr; }
    }
    for (const b of this.boxes) {
      if (b.off && b.off()) continue;
      const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else {
        const l = p.x - b.x0, rt = b.x1 - p.x, tp = p.z - b.z0, bt = b.z1 - p.z, mn = Math.min(l, rt, tp, bt);
        if (mn === l) p.x = b.x0 - r; else if (mn === rt) p.x = b.x1 + r; else if (mn === tp) p.z = b.z0 - r; else p.z = b.z1 + r;
      }
    }
    const f = this.fence;
    p.x = clamp(p.x, f.x0 + 0.45, f.x1 - 0.45);
    p.z = clamp(p.z, f.z0 + 0.45, f.z1 - 0.45);
  }
}

// 草は3本の葉を1株にまとめる
function mergeTufts(cone) {
  const parts = [];
  for (const [x, z, rz] of [[0, 0, 0], [0.08, 0.03, -0.35], [-0.07, 0.04, 0.35]]) {
    const g = cone.clone(); g.rotateZ(rz); g.translate(x, 0, z); parts.push(g.toNonIndexed());
  }
  let n = 0; parts.forEach(g => n += g.attributes.position.count);
  const pos = new Float32Array(n * 3); let o = 0;
  parts.forEach(g => { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

