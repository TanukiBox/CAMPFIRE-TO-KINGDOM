// 地面・土地と柵・焚き火・草花と、ぶつかり判定
import * as THREE from './lib/three.module.min.js';
import { scene, mat } from './gfx.js';
import { campfire, lampModel } from './models.js';
import { bake } from './gfx.js';

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
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const EDGE = 0.45;

// 廃村のくすんだ色 → 発展した鮮やかな色
const DULL = [new THREE.Color(0xc2c585), new THREE.Color(0xb0b777)];
const LUSH = [new THREE.Color(0x93d36b), new THREE.Color(0x7fc45e)];
const VIVID = [new THREE.Color(0x86d95e), new THREE.Color(0x6fcb4f)];
const WILD = new THREE.Color(0x8fae6a), OUTER = new THREE.Color(0x76b85a), DIRT = new THREE.Color(0xe2c38f);

export class World {
  constructor(ch) {
    this.ch = ch;
    this.lands = ch.lands;
    const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
    for (const l of this.lands) { b.x0 = Math.min(b.x0, l.rect.x0); b.x1 = Math.max(b.x1, l.rect.x1); b.z0 = Math.min(b.z0, l.rect.z0); b.z1 = Math.max(b.z1, l.rect.z1); }
    this.bounds = b;
    this.home = this.lands[0].rect;
    this.owned = new Set(['home']);
    this.circles = [];
    this.boxes = [];
    this.lush = 0;
    this.chapter = ch.n || 1;
    this.fireBoost = 0;
    this.makeGround();
    const cf = campfire();
    cf.group.position.set(ch.campfire[0], 0, ch.campfire[1]);
    scene.add(cf.group);
    this.flames = cf.flames;
    this.fire = cf.group.position;
    this.circles.push({ x: ch.campfire[0], z: ch.campfire[1], r: 0.75 });
    this.makeGlow();
    this.setOwned(['home']);
  }

  landOf(x, z) {
    for (const l of this.lands) if (inRect(l.rect, x, z)) return l.id;
    return null;
  }
  land(id) { return this.lands.find(l => l.id === id); }
  isOwned(id) { return this.owned.has(id); }

  // 柵の外側ほど高くなる地面
  heightAt(x, z) {
    const f = this.bounds;
    const d = Math.max(f.x0 - x, x - f.x1, f.z0 - z, z - f.z1, 0);
    if (d < 2.5) return 0;
    return Math.min((d - 2.5) * 0.28, 4) * (0.75 + 0.35 * noise2(x * 1.7, z * 1.7));
  }

  makeGround() {
    const b = this.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const g = new THREE.PlaneGeometry(150, 150, 60, 60).rotateX(-Math.PI / 2).translate(cx, 0, cz);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.heightAt(pos.getX(i), pos.getZ(i)));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    g.computeVertexNormals();
    this.ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    this.ground.receiveShadow = true;
    scene.add(this.ground);
  }

  // 地面の色（発展度 lush と、買った土地かどうかで変わる）
  paintGround() {
    const g = this.ground.geometry, pos = g.attributes.position, col = g.attributes.color;
    const [fx, fz] = this.ch.campfire, a = new THREE.Color(), bb = new THREE.Color(), c = new THREE.Color();
    // 第1章：くすんだ色→鮮やか、第2章から：鮮やか→もっと鮮やか
    const from = this.chapter >= 2 ? LUSH : DULL, to = this.chapter >= 2 ? VIVID : LUSH;
    a.copy(from[0]).lerp(to[0], this.lush); bb.copy(from[1]).lerp(to[1], this.lush);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i);
      c.copy(a).lerp(bb, noise2(x, z) * 0.5 + 0.5);
      const id = this.landOf(x, z);
      if (id && !this.owned.has(id)) c.lerp(WILD, 0.55);
      if (h > 0) c.lerp(OUTER, Math.min(1, h / 2));
      const dc = Math.hypot(x - fx, z - fz);
      if (dc < 4.2) c.lerp(DIRT, clamp((4.2 - dc) / 1.4, 0, 1));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    if (this.flowers) this.flowers.count = Math.floor(this.flowerMax * (0.2 + 0.8 * this.lush));
  }
  setLush(k) {
    k = clamp(k, 0, 1);
    if (Math.abs(k - this.lush) < 0.001 && this.painted) return;
    this.lush = k; this.painted = true;
    this.paintGround();
  }

  // 土地を買ったら柵を立て直す
  setOwned(list) {
    this.owned = new Set(list);
    this.ownedRects = this.lands.filter(l => this.owned.has(l.id)).map(l => l.rect);
    this.ownedInset = this.insetRects(this.ownedRects);
    this.makeFence();
    this.paintGround();
  }

  // 他の買った土地とつながっていない辺だけ内側に寄せる
  insetRects(rects) {
    return rects.map(r => {
      const open = (x, z) => rects.some(o => o !== r && inRect(o, x, z));
      const mx = (r.x0 + r.x1) / 2, mz = (r.z0 + r.z1) / 2;
      return {
        x0: r.x0 + (open(r.x0 - 0.2, mz) ? -0.01 : EDGE), x1: r.x1 - (open(r.x1 + 0.2, mz) ? -0.01 : EDGE),
        z0: r.z0 + (open(mx, r.z0 - 0.2) ? -0.01 : EDGE), z1: r.z1 - (open(mx, r.z1 + 0.2) ? -0.01 : EDGE),
      };
    });
  }

  makeFence() {
    if (this.fenceMeshes) for (const m of this.fenceMeshes) { scene.remove(m); m.dispose(); }
    const posts = [], rails = [], gate = this.ch.gate;
    const neighbor = (l, x, z) => this.lands.find(o => o !== l && inRect(o.rect, x, z));
    const side = (l, ax, az, bx, bz, ox, oz) => {
      const nb = neighbor(l, (ax + bx) / 2 + ox, (az + bz) / 2 + oz);
      const mine = this.owned.has(l.id);
      if (nb) {
        const theirs = this.owned.has(nb.id);
        if (mine && theirs) return;
        if (!mine && theirs) return;                     // 買った側から描く
        if (!mine && !theirs && this.lands.indexOf(nb) < this.lands.indexOf(l)) return;
      }
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.7));
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        posts.push([x0, z0]);
        if (gate && l.id === 'home' && Math.abs(mz - gate.z) < 0.1 && Math.abs(mx - gate.x) < gate.w / 2) continue; // 門
        rails.push([mx, mz, Math.hypot(x1 - x0, z1 - z0), Math.atan2(-(z1 - z0), x1 - x0)]);
      }
      posts.push([bx, bz]);
    };
    for (const l of this.lands) {
      const r = l.rect;
      side(l, r.x0, r.z0, r.x1, r.z0, 0, -0.3);
      side(l, r.x1, r.z0, r.x1, r.z1, 0.3, 0);
      side(l, r.x1, r.z1, r.x0, r.z1, 0, 0.3);
      side(l, r.x0, r.z1, r.x0, r.z0, -0.3, 0);
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3();
    const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.95, 0.18).translate(0, 0.47, 0), mat(0xa7713f), Math.max(1, posts.length));
    posts.forEach(([x, z], i) => postMesh.setMatrixAt(i, m.makeTranslation(x, 0, z)));
    postMesh.count = posts.length;
    const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.1, 0.07), mat(0xc58f58), Math.max(1, rails.length * 2));
    rails.forEach(([x, z, len, a], i) => {
      q.setFromAxisAngle(up, a);
      railMesh.setMatrixAt(i * 2, m.compose(p.set(x, 0.38, z), q, s.set(len, 1, 1)));
      railMesh.setMatrixAt(i * 2 + 1, m.compose(p.set(x, 0.72, z), q, s.set(len, 1, 1)));
    });
    railMesh.count = rails.length * 2;
    for (const im of [postMesh, railMesh]) { im.castShadow = true; im.computeBoundingSphere(); scene.add(im); }
    this.fenceMeshes = [postMesh, railMesh];
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
    const r = rand(7), f = this.bounds;
    const inAvoid = (x, z) => avoid.some(a => x > a.x0 - 0.3 && x < a.x1 + 0.3 && z > a.z0 - 0.3 && z < a.z1 + 0.3) || Math.hypot(x - this.fire.x, z - this.fire.z) < 3.5;
    const grass = [], flowers = [];
    for (let i = 0; i < 1600 && grass.length < 460; i++) {
      const x = f.x0 - 8 + r() * (f.x1 - f.x0 + 16), z = f.z0 - 8 + r() * (f.z1 - f.z0 + 16);
      if (inAvoid(x, z)) continue;
      grass.push([x, z, 0.7 + r() * 0.6, r() * 6]);
      if (r() < 0.3) flowers.push([x + 0.3, z + 0.2, r()]);
    }
    const gm = new THREE.InstancedMesh(tuftGeo(), mat(0x6fb34c), grass.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    grass.forEach(([x, z, sc, a], i) => {
      q.setFromAxisAngle(up, a);
      gm.setMatrixAt(i, m.compose(p.set(x, this.heightAt(x, z), z), q, s.set(sc, sc, sc)));
    });
    // 花は発展するほど増える（先頭から順に見せる）
    const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0).translate(0, 0.22, 0), mat(0xffffff), Math.max(1, flowers.length));
    const cols = [0xff8fa3, 0xffe066, 0xffffff, 0xb18cff, 0xff9f5a], c = new THREE.Color();
    flowers.forEach(([x, z, k], i) => {
      fm.setMatrixAt(i, m.makeTranslation(x, this.heightAt(x, z), z));
      fm.setColorAt(i, c.setHex(cols[(k * cols.length) | 0]));
    });
    for (const im of [gm, fm]) { im.computeBoundingSphere(); scene.add(im); }
    this.flowers = fm; this.flowerMax = flowers.length;
    this.paintGround();
  }

  // 町の飾り：石だたみの道と街灯（第2章から）
  addTown(towns) {
    const tiles = [], lamps = [];
    for (const town of towns) {
      for (const [x0, z0, x1, z1] of town.roads) {
        const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.75));
        for (let i = 0; i <= n; i++) {
          const k = i / n, x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k;
          for (const o of [-0.45, 0.45]) {
            const ox = -(z1 - z0) / len * o, oz = (x1 - x0) / len * o;
            tiles.push([x + ox + (Math.random() - 0.5) * 0.1, z + oz + (Math.random() - 0.5) * 0.1, Math.random()]);
          }
        }
      }
      lamps.push(...town.lamps);
    }
    if (!tiles.length) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    const road = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.05, 0.62), mat(0xffffff), tiles.length);
    tiles.forEach(([x, z, r], i) => {
      road.setMatrixAt(i, m.compose(p.set(x, 0.025, z), q.setFromAxisAngle(up, (r - 0.5) * 0.3), s.set(1, 1, 1)));
      road.setColorAt(i, c.setHex([0xd9cfbd, 0xcfc4b0, 0xe3dac8][(r * 3) | 0]));
    });
    road.receiveShadow = true; road.computeBoundingSphere(); scene.add(road);
    for (const [x, z] of lamps) { const g = bake(lampModel()); g.position.set(x, 0, z); scene.add(g); this.circles.push({ x, z, r: 0.15 }); }
  }

  update(t, dt = 0) {
    this.fireBoost = Math.max(0, this.fireBoost - dt * 1.5);
    const boost = 1 + this.fireBoost * 0.9;
    this.flames.forEach((f, i) => {
      const b = f.userData.base;
      const k = (1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 17 + i * 2) * 0.06) * boost;
      f.scale.set(b.r * 2 * (2 - k) * 0.9 + b.r * 0.2, b.h * k, b.r * 2 * (2 - k) * 0.9 + b.r * 0.2);
      f.rotation.y = t * (1 + i);
    });
    this.glow.material.opacity = 0.6 + Math.sin(t * 8) * 0.08;
  }

  // 丸い物と四角い物からはみ出さないように押し戻し、歩ける土地の中に収める
  // area: 歩ける四角の一覧（insetRects 済み）。null なら収めない
  resolve(p, r, area = this.ownedInset) {
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
    if (!area) return;
    for (const a of area) if (inRect(a, p.x, p.z)) return;
    let bx = p.x, bz = p.z, bd = Infinity;
    for (const a of area) {
      const x = clamp(p.x, a.x0, a.x1), z = clamp(p.z, a.z0, a.z1), d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (d < bd) { bd = d; bx = x; bz = z; }
    }
    p.x = bx; p.z = bz;
  }
}

// 草は3本の葉を1株にまとめる
function tuftGeo() {
  const cone = new THREE.ConeGeometry(0.09, 0.34, 4).translate(0, 0.17, 0);
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
