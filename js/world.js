// 地面・土地と柵・焚き火・草花と、ぶつかり判定
import * as THREE from './lib/three.module.min.js';
import { scene, mat } from './gfx.js';
import { campfire, lampModel, flagModel } from './models.js';
import { bake } from './gfx.js';
import { Nav } from './nav.js';

export function rand(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand01 = v => { const s = Math.sin(v * 12.9898) * 43758.5453; return s - Math.floor(s); };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const noise2 = (x, z) => Math.sin(x * 0.31 + Math.sin(z * 0.17) * 2) * 0.5 + Math.sin(z * 0.27 - x * 0.13) * 0.5;
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const EDGE = 0.45;

// 廃村のくすんだ色 → 発展した鮮やかな色
const DULL = [new THREE.Color(0xc2c585), new THREE.Color(0xb0b777)];
const LUSH = [new THREE.Color(0x93d36b), new THREE.Color(0x7fc45e)];
const VIVID = [new THREE.Color(0x86d95e), new THREE.Color(0x6fcb4f)];
const SAND = new THREE.Color(0xf0dca8), WET = new THREE.Color(0xc9b27c);
const BRIGHT = [new THREE.Color(0x7fde5a), new THREE.Color(0x62cf48)];
const ROYALG = [new THREE.Color(0x9be060), new THREE.Color(0x7fd24f)];
const HUNT = new THREE.Color(0x6f9a4e);
// 狩り場の地面：森・沼・土・遺跡・岩場・火山灰・竜の巣。spot = まだらの色、crack = 溶岩のひび（明るく光る）
const C = h => new THREE.Color(h);
const GROUNDS = {
  forest: { a: C(0x5e8a44), b: C(0x4c7639), spot: C(0x7a5a38), spotK: 0.5, grass: true, edge: [0x3f6a35, 0x4f7d3c, 0x7d7a70], bush: true },
  swamp:  { a: C(0x66713f), b: C(0x535f37), spot: C(0x3f6668), spotK: 0.35, grass: true, edge: [0x4b5a33, 0x5d6b3a, 0x6f6a5a], bush: true },
  dirt:   { a: C(0xbd9c6c), b: C(0xa8875b), spot: C(0x8f9656), spotK: 0.62, pebble: 0x9a7a55, edge: [0x9a7a55, 0x8a6a48, 0x7d7a70] },
  ruins:  { a: C(0xaaa69b), b: C(0x969287), spot: C(0x7f9a5e), spotK: 0.55, pebble: 0xb8b4aa, edge: [0xb8b4aa, 0x9a968c, 0x8a867c] },
  rock:   { a: C(0x9e917f), b: C(0x897c6a), spot: C(0xc9b88f), spotK: 0.55, pebble: 0x8a8378, edge: [0x8a8378, 0x7a7266, 0x9e917f] },
  ash:    { a: C(0x57504c), b: C(0x443e3b), crack: C(0xff7a2a), pebble: 0x3a3432, hot: true, edge: [0x3a3432, 0x4a4240, 0x2e2826] },
  nest:   { a: C(0x70493f), b: C(0x5a3a33), crack: C(0xe0542a), pebble: 0x4a302a, hot: true, edge: [0x4a302a, 0x5a3a33, 0x3a2622] },
};
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
    this.sea = ch.sea || null;
    this.fireBoost = 0;
    this.makeGround();
    if (this.sea) this.makeSea();
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
    if (this.extra && inRect(this.extra.rect, x, z)) return this.extra.id;
    return null;
  }
  land(id) { return this.lands.find(l => l.id === id) || (this.extra && this.extra.id === id ? this.extra : undefined); }
  // 塔の中にいる間は、闘技場の中だけ歩ける
  setExtra(l) { this.extra = l; this.extraInset = l ? this.insetRects([l.rect]) : null; }
  playerArea() { return this.extraInset || this.ownedInset; }
  // 土地の外で、いちばん近い狩り場の地面（R より遠ければ null）
  outerGround(x, z, R = 10) {
    let near = null, nd = R;
    for (const l of this.lands) {
      if (!l.hunt || !l.ground) continue;
      const Q = l.rect, d = Math.hypot(Math.max(Q.x0 - x, 0, x - Q.x1), Math.max(Q.z0 - z, 0, z - Q.z1));
      if (d < nd) { nd = d; near = GROUNDS[l.ground]; }
    }
    return near;
  }
  groundAt(x, z) { const id = this.landOf(x, z), l = id && this.land(id); return l && l.hunt && l.ground ? GROUNDS[l.ground] : null; }
  isOwned(id) { return this.owned.has(id); }

  // 柵の外側ほど高くなる地面
  heightAt(x, z) {
    // 海（第3章から）：岸から先は下がっていく
    if (this.sea && z > this.sea - 1) return -1.8 * Math.min(1, (z - this.sea + 1) / 2.5);
    const f = this.bounds;
    const d = Math.max(f.x0 - x, x - f.x1, f.z0 - z, z - f.z1, 0);
    if (d < 2.5) return 0;
    return Math.min((d - 2.5) * 0.28, 4) * (0.75 + 0.35 * noise2(x * 1.7, z * 1.7));
  }

  makeGround() {
    const b = this.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const g = new THREE.PlaneGeometry(150, 150, 100, 100).rotateX(-Math.PI / 2).translate(cx, 0, cz);
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
    const [fx, fz] = this.ch.campfire, a = new THREE.Color(), bb = new THREE.Color(), c = new THREE.Color(), tc = new THREE.Color();
    // 第1章：くすんだ色→鮮やか、第2章から：鮮やか→もっと鮮やか
    const pal = [DULL, LUSH, VIVID, BRIGHT, ROYALG], c0 = Math.min(this.chapter, 4);
    const from = pal[c0 - 1], to = pal[c0];
    a.copy(from[0]).lerp(to[0], this.lush); bb.copy(from[1]).lerp(to[1], this.lush);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i);
      c.copy(a).lerp(bb, noise2(x, z) * 0.5 + 0.5);
      const id = this.landOf(x, z), gr = this.groundAt(x, z);
      if (gr) {
        // 狩り場はその土地らしい地面に
        const n = noise2(x * 1.9, z * 1.9);
        c.copy(gr.a).lerp(gr.b, noise2(x, z) * 0.5 + 0.5);
        if (gr.spot && n > gr.spotK) c.lerp(gr.spot, Math.min(1, (n - gr.spotK) * 4));
        if (gr.crack && Math.abs(noise2(x * 0.7 + 3, z * 0.7 - 2)) < 0.025) c.lerp(gr.crack, 0.85);
      } else if (id && !this.owned.has(id)) c.lerp(this.isHunt(id) ? HUNT : WILD, this.isHunt(id) ? 0.4 : 0.55);
      if (!gr && h > 0) c.lerp(OUTER, Math.min(1, h / 2));
      if (!id) {
        // 土地の外：近くの狩り場の地面の色に寄せる（狩り場のまわりが緑にならないように）
        let near = null, nd = 14;
        for (const l of this.lands) {
          if (!l.hunt || !l.ground) continue;
          const R = l.rect, dx = Math.max(R.x0 - x, 0, x - R.x1), dz = Math.max(R.z0 - z, 0, z - R.z1), d = Math.hypot(dx, dz);
          if (d < nd) { nd = d; near = GROUNDS[l.ground]; }
        }
        if (near) { tc.copy(near.a).lerp(near.b, noise2(x * 1.3, z * 1.3) * 0.5 + 0.5).multiplyScalar(0.88); c.lerp(tc, Math.min(1, (14 - nd) / 6)); }
      }
      const dc = Math.hypot(x - fx, z - fz);
      if (dc < 4.2) c.lerp(DIRT, clamp((4.2 - dc) / 1.4, 0, 1));
      if (this.sea && z > this.sea - 2.5) c.copy(h < -0.4 ? WET : SAND);
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

  // 土地を買ったら柵を立て直す。歩けるのは「買った土地（領地）」と「狩り場」
  setOwned(list) {
    this.owned = new Set(list);
    this.walkRects = this.lands.filter(l => this.owned.has(l.id) || l.hunt).map(l => l.rect);
    this.ownedInset = this.insetRects(this.walkRects);
    this.makeFence();
    this.paintGround();
  }
  kind(l) { return !l ? 'none' : this.owned.has(l.id) ? 'own' : l.hunt ? 'hunt' : 'wild'; }
  isWalk(id) { const l = this.land(id); return !!l && (this.owned.has(id) || !!l.hunt); }
  isHunt(id) { const l = this.land(id); return !!(l && l.hunt); }

  // 他の歩ける土地とつながっていない辺だけ内側に寄せる
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

  // 柵：領地どうしの間にはなし。領地と狩り場（狩り場どうし）の間は、まん中に門がある柵
  makeFence() {
    if (this.fenceMeshes) for (const m of this.fenceMeshes) { scene.remove(m); if (m.dispose) m.dispose(); }
    const posts = [], rails = [], gate = this.ch.gate, arches = [], edges = [];
    this.fenceBoxes = []; this.gates = [];
    const GATE = 1.7;
    const neighbor = (l, x, z) => this.lands.find(o => o !== l && inRect(o.rect, x, z));
    const side = (l, ax, az, bx, bz, ox, oz) => {
      const nb = neighbor(l, (ax + bx) / 2 + ox, (az + bz) / 2 + oz);
      const kl = this.kind(l), kn = this.kind(nb);
      if (kl === 'own' && kn === 'own') return;
      if (kl === 'hunt' && kn === 'hunt') return;
      if (nb && this.lands.indexOf(nb) < this.lands.indexOf(l)) return;   // 同じ辺は1回だけ描く
      // 狩り場と、柵のない外（まだ買っていない土地・土地の外）の境目は、岩や茂みを並べる
      if ((kl === 'hunt' && kn !== 'own') || (kn === 'hunt' && kl !== 'own')) {
        const hl = kl === 'hunt' ? l : nb, gr = GROUNDS[hl.ground] || GROUNDS.rock;
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / 0.9));
        // 外向き（狩り場の外側）へ少しずらして置く
        const hx = (hl.rect.x0 + hl.rect.x1) / 2, hz = (hl.rect.z0 + hl.rect.z1) / 2, mx0 = (ax + bx) / 2, mz0 = (az + bz) / 2;
        let ox = mx0 - hx, oz = mz0 - hz;
        if (Math.abs(bx - ax) > Math.abs(bz - az)) ox = 0; else oz = 0;
        const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
        for (let i = 0; i <= n; i++) {
          const k = i / n, x = ax + (bx - ax) * k, z = az + (bz - az) * k, rr = rand01(x * 3.1 + z * 1.7);
          const out = 0.35 + rand01(x + z * 2.3) * 0.7;
          edges.push([x + ox * out, z + oz * out, 0.7 + rr * 0.9, rr * 6, gr.edge[(rr * 3) | 0], gr.bush && rand01(x * 1.3 - z) < 0.55]);
        }
        return;
      }
      const walkL = kl !== 'wild', walkN = kn === 'own' || kn === 'hunt';
      const hasGate = walkL && walkN;
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.7));
      const ux = (bx - ax) / len, uz = (bz - az) / len, cx = (ax + bx) / 2, cz = (az + bz) / 2;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        const inGate = hasGate && Math.hypot(mx - cx, mz - cz) < GATE;
        if (!inGate) posts.push([x0, z0]);
        if (inGate) continue;
        if (gate && l.id === 'home' && Math.abs(mz - gate.z) < 0.1 && Math.abs(mx - gate.x) < gate.w / 2) continue; // 客の門
        rails.push([mx, mz, Math.hypot(x1 - x0, z1 - z0), Math.atan2(-(z1 - z0), x1 - x0)]);
      }
      posts.push([bx, bz]);
      if (hasGate) {
        // 門の両側の柵は通れない
        const g0 = { x: cx - ux * GATE, z: cz - uz * GATE }, g1 = { x: cx + ux * GATE, z: cz + uz * GATE };
        const wall = (px, pz, qx, qz) => this.fenceBoxes.push({ x0: Math.min(px, qx) - 0.12, x1: Math.max(px, qx) + 0.12, z0: Math.min(pz, qz) - 0.12, z1: Math.max(pz, qz) + 0.12 });
        wall(ax, az, g0.x, g0.z); wall(g1.x, g1.z, bx, bz);
        arches.push([g0, g1, Math.atan2(-(bz - az), bx - ax)]);
        const hunt = kl === 'hunt' ? l : kn === 'hunt' ? nb : null;
        this.gates.push({ x: cx, z: cz, hunt: hunt ? hunt.id : null, own: kl === 'own' ? l.id : kn === 'own' ? nb.id : null });
      }
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
    // 狩り場の境目の岩と茂み
    const rocks = edges.filter(e => !e[5]), bushes = edges.filter(e => e[5]), cc = new THREE.Color();
    const inst = (list, geo, sy) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, mat(0xffffff), list.length);
      list.forEach(([x, z, sc, a, col], i) => {
        q.setFromAxisAngle(up, a);
        im.setMatrixAt(i, m.compose(p.set(x, this.heightAt(x, z), z), q, s.set(sc, sc * sy, sc)));
        im.setColorAt(i, cc.setHex(col));
      });
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); this.fenceMeshes.push(im);
    };
    inst(rocks, new THREE.DodecahedronGeometry(0.55, 0).translate(0, 0.3, 0), 0.85);
    inst(bushes, new THREE.IcosahedronGeometry(0.6, 0).translate(0, 0.45, 0), 1.0);
    // 門のアーチ（狩り場へ出る門は赤い旗）
    for (const [g0, g1, a] of arches) {
      const g = new THREE.Group();
      const post = (x, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.1, 0.28), mat(0x8a5f3a)); b.position.set(x, 1.05, z); g.add(b); };
      post(g0.x, g0.z); post(g1.x, g1.z);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(GATE * 2 + 0.5, 0.22, 0.3), mat(0x8a5f3a));
      beam.position.set((g0.x + g1.x) / 2, 2.1, (g0.z + g1.z) / 2); beam.rotation.y = a; g.add(beam);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.05), mat(0xc0453a));
      flag.position.set((g0.x + g1.x) / 2, 1.72, (g0.z + g1.z) / 2); flag.rotation.y = a; g.add(flag);
      scene.add(g); this.fenceMeshes.push(g);
    }
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
      if (inAvoid(x, z) || (this.sea && z > this.sea - 2.5)) continue;
      const gr = this.groundAt(x, z) || (!this.landOf(x, z) && this.outerGround(x, z, 9));
      if (gr && !gr.grass) continue;
      grass.push([x, z, 0.7 + r() * 0.6, r() * 6]);
      if (!gr && r() < 0.3) flowers.push([x + 0.3, z + 0.2, r()]);
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
    // 草のない狩り場には小石（火山と竜の巣は ときどき赤く光る石）
    const pebbles = [];
    for (const l of this.lands) {
      const gr = l.hunt && l.ground && GROUNDS[l.ground];
      if (!gr || !gr.pebble) continue;
      const R = l.rect, n = Math.round((R.x1 - R.x0) * (R.z1 - R.z0) / 5);
      for (let i = 0; i < n; i++) {
        const x = R.x0 + 0.5 + r() * (R.x1 - R.x0 - 1), z = R.z0 + 0.5 + r() * (R.z1 - R.z0 - 1);
        if (inAvoid(x, z)) continue;
        pebbles.push([x, z, 0.5 + r() * 1.1, r() * 6, gr.hot && r() < 0.18 ? 0xff6a2a : gr.pebble]);
      }
    }
    if (pebbles.length) {
      const pm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0).translate(0, 0.06, 0), mat(0xffffff), pebbles.length);
      const pc = new THREE.Color();
      pebbles.forEach(([x, z, sc, a, col], i) => {
        q.setFromAxisAngle(up, a);
        pm.setMatrixAt(i, m.compose(p.set(x, this.heightAt(x, z), z), q, s.set(sc, sc * 0.6, sc)));
        pm.setColorAt(i, pc.setHex(col));
      });
      pm.receiveShadow = true; pm.computeBoundingSphere(); scene.add(pm);
    }
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
      if (town.flags) for (const [x, z] of town.flags) { const g = bake(flagModel()); g.position.set(x, 0, z); g.rotation.y = -0.3; scene.add(g); this.circles.push({ x, z, r: 0.12 }); }
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

  makeSea() {
    const b = this.bounds, cx = (b.x0 + b.x1) / 2;
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(300, 120).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x4fbfe8, transparent: true, opacity: 0.82 }));
    this.water.position.set(cx, -0.32, this.sea + 58);
    scene.add(this.water);
    // 波打ちぎわの白い線
    this.foam = new THREE.Mesh(new THREE.PlaneGeometry(300, 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    this.foam.position.set(cx, -0.3, this.sea - 1.05 + 0.9);
    scene.add(this.foam);
  }

  // 夜：窓に明かりがともり、焚き火が明るく見える
  setNight(n) {
    if (Math.abs((this.nightK ?? -1) - n) < 0.01) return;
    this.nightK = n;
    const glass = mat(0xa9def2);
    glass.emissive.setRGB(1.0 * n * 0.85, 0.75 * n * 0.85, 0.35 * n * 0.85);
    this.glowBoost = 1 + n * 1.2;
    this.glow.scale.setScalar(1 + n * 0.6);
  }

  update(t, dt = 0) {
    this.t = t;
    if (this.water) { this.water.position.y = -0.32 + Math.sin(t * 0.8) * 0.04; this.foam.material.opacity = 0.45 + Math.sin(t * 1.3) * 0.2; this.foam.position.z = this.sea - 0.15 + Math.sin(t * 0.8) * 0.12; }
    this.fireBoost = Math.max(0, this.fireBoost - dt * 1.5);
    const boost = 1 + this.fireBoost * 0.9;
    this.flames.forEach((f, i) => {
      const b = f.userData.base;
      const k = (1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 17 + i * 2) * 0.06) * boost;
      f.scale.set(b.r * 2 * (2 - k) * 0.9 + b.r * 0.2, b.h * k, b.r * 2 * (2 - k) * 0.9 + b.r * 0.2);
      f.rotation.y = t * (1 + i);
    });
    this.glow.material.opacity = Math.min(1, (0.6 + Math.sin(t * 8) * 0.08) * (this.glowBoost || 1));
  }

  // 住民やお客が (x,z) へ向かうときの次の中継点（まっすぐ行けるなら null）。道は A* で探して覚えておく
  steer(a, x, z) {
    if (!this.nav) this.nav = new Nav(this);
    const nav = this.nav, t = this.t || 0;
    nav.refresh();
    if (Math.hypot(x - a.x, z - a.z) < 1.0 || nav.los(a.x, a.z, x, z)) { a._path = null; return null; }
    let P = a._path;
    const moved = P && Math.hypot(P.tx - x, P.tz - z) > 0.6;
    if (!P || P.sig !== nav.sig || (moved && t - P.at > 0.4) || t - P.at > 4) {
      P = a._path = { tx: x, tz: z, at: t, sig: nav.sig, pts: nav.path(a.x, a.z, x, z) || [], i: 0 };
    }
    const pts = P.pts;
    while (P.i < pts.length - 1 && Math.hypot(pts[P.i].x - a.x, pts[P.i].z - a.z) < 0.35) P.i++;
    if (P.i < pts.length - 1 && nav.los(a.x, a.z, pts[P.i + 1].x, pts[P.i + 1].z)) P.i++;
    return pts[P.i] || null;
  }

  // (fx,fz)→(tx,tz) のまっすぐな道が建物をふさいでいたら、建物の角を回る中継点を返す（ふさいでいなければ null）
  detour(fx, fz, tx, tz, m = 0.7) {
    let hit = null, best = Infinity;
    for (const b of [...this.boxes, ...this.fenceBoxes]) {
      if (b.off && b.off()) continue;
      // 行き先や今いる所が建物のすぐそば（中）なら、その建物はよけない（戸口や店番の場所）
      const inside = (x, z) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
      if (inside(tx, tz)) continue;
      const t = segBox(fx, fz, tx, tz, b.x0 - 0.2, b.x1 + 0.2, b.z0 - 0.2, b.z1 + 0.2);
      if (t !== null && t < best) { best = t; hit = b; }
    }
    if (!hit) return null;
    const x0 = hit.x0 - m, x1 = hit.x1 + m, z0 = hit.z0 - m, z1 = hit.z1 + m;
    const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    const blocked = (ax, az, bx, bz) => segBox(ax, az, bx, bz, hit.x0 + 0.05, hit.x1 - 0.05, hit.z0 + 0.05, hit.z1 - 0.05) !== null;
    // 角から目的地までの残りの道のり（ふさがっていれば、となりの角を回る）
    const rest = (i) => {
      const [cx, cz] = corners[i];
      if (!blocked(cx, cz, tx, tz)) return Math.hypot(tx - cx, tz - cz);
      let r = Infinity;
      for (const k of [(i + 1) % 4, (i + 3) % 4]) {
        const [nx, nz] = corners[k];
        if (!blocked(nx, nz, tx, tz)) r = Math.min(r, Math.hypot(nx - cx, nz - cz) + Math.hypot(tx - nx, tz - nz));
      }
      return r === Infinity ? 1000 : r;
    };
    let wp = null, cost = Infinity;
    corners.forEach(([cx, cz], i) => {
      // 今いる角は使わない。今いる所から見えている角だけ使う
      if (Math.hypot(cx - fx, cz - fz) < 0.35 || blocked(fx, fz, cx, cz)) return;
      const c = Math.hypot(cx - fx, cz - fz) + rest(i);
      if (c < cost) { cost = c; wp = { x: cx, z: cz }; }
    });
    return wp;
  }

  // 丸い物と四角い物からはみ出さないように押し戻し、歩ける土地の中に収める
  // area: 歩ける四角の一覧（insetRects 済み）。null なら収めない
  resolve(p, r, area = this.ownedInset) {
    for (const c of this.circles) {
      if (c.off && c.off()) continue;
      const dx = p.x - c.x, dz = p.z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-8) { const d = Math.sqrt(d2); p.x = c.x + dx / d * rr; p.z = c.z + dz / d * rr; }
    }
    for (const b of this.boxes.concat(this.fenceBoxes)) {
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

// 線分と四角が交わるなら、線分の始点からの割合（0〜1）を返す
function segBox(ax, az, bx, bz, x0, x1, z0, z1) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return t0;
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
