// 木と岩：切る・割る・倒れる・一定時間で元に戻る。同じ形はまとめて描く
import * as THREE from './lib/three.module.min.js';
import { scene, mat, Blobs, quality } from './gfx.js';
import { treeGeos, rockGeo, ironRockGeo, herbGeo } from './models.js';
import { NODE_TYPES } from './data.js';
import { rand } from './world.js';

const LEAF_ROUND = [0x6cc24a, 0x5fb345, 0x7fd05a, 0x58ab3f];
const LEAF_PINE = [0x3f9a5a, 0x4aa866, 0x378d52];
const ROCK = [0xa9adb3, 0xb8bbc0, 0x9ea3aa];
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _ax = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const easeOutBack = k => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);

export class Resources {
  constructor(ch, world) {
    const r = rand(11);
    this.nodes = ch.nodes.map((n, i) => ({
      ...n, def: NODE_TYPES[n.type], id: i, hp: NODE_TYPES[n.type].hits, state: 'ok', t: 0,
      rot: r() * Math.PI * 2, scl: 0.9 + r() * 0.3, pine: r() < 0.35, wob: 0, dx: 0, dz: 1, respawnT: 0,
      land: world.landOf(n.x, n.z), claim: null,
    }));
    this.world = world;
    // 柵の外の飾りの木と岩
    const f = world.bounds, decor = [];
    for (let i = 0; i < 1400 && decor.length < 230; i++) {
      const x = f.x0 - 22 + r() * (f.x1 - f.x0 + 44), z = f.z0 - 22 + r() * (f.z1 - f.z0 + 38);
      const out = Math.max(f.x0 - x, x - f.x1, f.z0 - z, z - f.z1);
      if (out < 1.6) continue;
      if (z > f.z1 && z < f.z1 + 18) continue; // 手前（画面の下）はカメラをふさぐので置かない
      decor.push({ type: r() < 0.12 ? 'rock' : 'tree', x, z, y: world.heightAt(x, z), rot: r() * Math.PI * 2, scl: 0.9 + r() * 0.5, pine: r() < 0.5 });
    }
    const trees = this.nodes.filter(n => n.type === 'tree');
    const dTrees = decor.filter(d => d.type === 'tree'), dRocks = decor.filter(d => d.type === 'rock');
    const nt = trees.length + dTrees.length;
    // 岩・鉄の岩・薬草は種類ごとに1つの形でまとめて描く
    const SOLID = { rock: rockGeo, ironrock: ironRockGeo, herb: herbGeo };
    const solidNodes = {};
    for (const k in SOLID) solidNodes[k] = this.nodes.filter(n => n.type === k);

    const mk = (geo, color, n) => {
      const m = new THREE.InstancedMesh(geo, mat(color), n);
      m.castShadow = true; m.receiveShadow = false; scene.add(m);
      return m;
    };
    this.trunk = mk(treeGeos.trunk, 0x9a6a42, nt);
    this.round = mk(treeGeos.round, 0xffffff, nt);
    this.pineM = mk(treeGeos.pine, 0xffffff, nt);
    this.stump = mk(treeGeos.stump, 0xb98556, Math.max(1, trees.length));
    this.solid = {};
    for (const k in SOLID) {
      const n = solidNodes[k].length + (k === 'rock' ? dRocks.length : 0);
      const m = new THREE.InstancedMesh(SOLID[k], SOLID[k].attributes.color ? mat(0xffffff, { vertexColors: true }) : mat(0xffffff), Math.max(1, n));
      m.castShadow = k !== 'herb'; scene.add(m);
      this.solid[k] = m;
      solidNodes[k].forEach((nd, i) => { nd.slot = i; });
    }
    this.rock = this.solid.rock;
    this.meshes = [this.trunk, this.round, this.pineM, this.stump, ...Object.values(this.solid)];
    this.shadows = new Blobs(nt + this.nodes.length + dRocks.length);

    trees.forEach((n, i) => { n.slot = i; n.stumpSlot = i; });
    let ti = trees.length, ri = solidNodes.rock.length;
    for (const d of dTrees) { d.slot = ti++; this.placeTree(d, 1, 0); }
    for (const d of dRocks) { d.slot = ri++; this.placeRock(d, 1, 0); }
    this.decor = decor;
    for (const n of this.nodes) {
      if (n.type === 'tree') { this.placeTree(n, 1, 0); this.stump.setMatrixAt(n.stumpSlot, ZERO); }
      else this.placeRock(n, 1, 0);
      if (n.def.collide > 0) world.circles.push({ x: n.x, z: n.z, r: n.def.collide, off: () => n.type !== 'tree' && n.state === 'gone' });
    }
    this.colorAll();
    for (const m of this.meshes) { m.computeBoundingSphere(); m.frustumCulled = false; }
    this.flush();
    this.shadowsDirty = true;
  }

  colorAll() {
    const all = [...this.nodes, ...this.decor];
    for (const n of all) {
      const k = (n.rot * 1000) | 0;
      if (n.type === 'tree') {
        const pal = n.pine ? LEAF_PINE : LEAF_ROUND;
        _c.setHex(pal[k % pal.length]);
        (n.pine ? this.pineM : this.round).setColorAt(n.slot, _c);
        (n.pine ? this.round : this.pineM).setColorAt(n.slot, _c);
      } else if (n.type === 'rock') {
        this.rock.setColorAt(n.slot, _c.setHex(ROCK[k % ROCK.length]));
      } else {
        this.solid[n.type].setColorAt(n.slot, _c.setScalar(0.88 + (k % 7) * 0.02));
      }
    }
  }

  // tilt = 傾き（ラジアン）、s = 大きさの倍率
  placeTree(n, s, tilt) {
    _q.setFromAxisAngle(UP, n.rot);
    if (tilt) { _ax.set(n.dz, 0, -n.dx).normalize(); _q2.setFromAxisAngle(_ax, tilt); _q.premultiply(_q2); }
    const sc = n.scl * s;
    _m.compose(_p.set(n.x, n.y || 0, n.z), _q, _s.set(sc, sc, sc));
    this.trunk.setMatrixAt(n.slot, s > 0 ? _m : ZERO);
    (n.pine ? this.pineM : this.round).setMatrixAt(n.slot, s > 0 ? _m : ZERO);
    (n.pine ? this.round : this.pineM).setMatrixAt(n.slot, ZERO);
  }
  placeRock(n, s, wob) {
    _q.setFromAxisAngle(UP, n.rot + wob * 0.2);
    const sc = n.scl * s;
    _m.compose(_p.set(n.x + wob * 0.06 * n.dx, n.y || 0, n.z + wob * 0.06 * n.dz), _q, _s.set(sc * (1 + wob * 0.1), sc * (1 - wob * 0.12), sc * (1 + wob * 0.1)));
    this.solid[n.type].setMatrixAt(n.slot, s > 0 ? _m : ZERO);
  }
  flush() {
    for (const m of this.meshes) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  // 手の届く一番近い資源（買った土地のものだけ）
  nearest(x, z) {
    let best = null, bd = Infinity;
    for (const n of this.nodes) {
      if (n.state !== 'ok' || !this.world.isOwned(n.land)) continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d < n.def.reach + 0.35 && d < bd) { bd = d; best = n; }
    }
    return best;
  }

  // 住民用：他の住民が狙っていない一番近い資源
  claimNearest(type, x, z, who) {
    let best = null, bd = Infinity;
    for (const n of this.nodes) {
      if (n.type !== type || n.state !== 'ok' || !this.world.isOwned(n.land)) continue;
      if (n.claim && n.claim !== who) continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d < bd) { bd = d; best = n; }
    }
    if (best) best.claim = who;
    return best;
  }
  release(who) { for (const n of this.nodes) if (n.claim === who) n.claim = null; }

  // たたく。出てくる素材の数を返す
  hit(n, fx, fz, power = 1) {
    if (n.state !== 'ok') return 0;
    const dx = n.x - fx, dz = n.z - fz, d = Math.hypot(dx, dz) || 1;
    n.dx = dx / d; n.dz = dz / d;
    let drops = Math.min(power, n.hp);
    n.hp -= power;
    n.wob = 1;
    if (n.hp <= 0) {
      n.claim = null;
      drops += n.def.bonus;
      n.state = n.type === 'tree' ? 'fall' : 'break';
      n.t = 0;
    }
    return drops;
  }

  update(dt) {
    let dirty = false;
    for (const n of this.nodes) {
      if (n.state === 'ok') {
        if (n.wob > 0) {
          n.wob = Math.max(0, n.wob - dt * 2.6);
          if (n.type === 'tree') this.placeTree(n, 1, Math.sin(n.wob * 26) * 0.12 * n.wob);
          else this.placeRock(n, 1, Math.sin(n.wob * 30) * n.wob);
          dirty = true;
        }
      } else if (n.state === 'fall') {
        n.t += dt;
        const k = Math.min(1, n.t / 0.6);
        this.placeTree(n, k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1, k * k * 1.5);
        if (k >= 1) { n.state = 'gone'; n.respawnT = n.def.respawn; this.placeTree(n, 0, 0); this.stumpAt(n, true); this.shadowsDirty = true; n.fell = true; }
        dirty = true;
      } else if (n.state === 'break') {
        n.t += dt;
        const k = Math.min(1, n.t / 0.18);
        this.placeRock(n, 1 - k, 0);
        if (k >= 1) { n.state = 'gone'; n.respawnT = n.def.respawn; this.shadowsDirty = true; }
        dirty = true;
      } else if (n.state === 'gone') {
        n.respawnT -= dt;
        if (n.respawnT <= 0) { n.state = 'grow'; n.t = 0; n.hp = n.def.hits; if (n.type === 'tree') this.stumpAt(n, false); this.shadowsDirty = true; }
      } else if (n.state === 'grow') {
        n.t += dt;
        const k = Math.min(1, n.t / 0.7);
        const s = Math.max(0.01, easeOutBack(k));
        if (n.type === 'tree') this.placeTree(n, s, 0); else this.placeRock(n, s, 0);
        if (k >= 1) n.state = 'ok';
        dirty = true;
      }
    }
    if (dirty) this.flush();
    this.shadows.mesh.visible = !quality.shadows;
    if (this.shadowsDirty && !quality.shadows) this.drawShadows();
  }

  stumpAt(n, show) {
    if (show) this.stump.setMatrixAt(n.stumpSlot, _m.compose(_p.set(n.x, 0, n.z), _q.setFromAxisAngle(UP, n.rot), _s.set(n.scl, n.scl, n.scl)));
    else this.stump.setMatrixAt(n.stumpSlot, ZERO);
  }

  // 影の設定を切っているとき用の丸い影
  drawShadows() {
    this.shadowsDirty = false;
    const b = this.shadows;
    b.begin();
    for (const n of this.nodes) {
      if (n.type === 'tree') b.push(n.x, n.z, n.state === 'gone' ? 0.35 : 1.0 * n.scl);
      else if (n.state !== 'gone') b.push(n.x, n.z, (n.type === 'herb' ? 0.45 : 0.8) * n.scl);
    }
    for (const d of this.decor) b.push(d.x, d.z, (d.type === 'tree' ? 1.0 : 0.8) * d.scl, d.y + 0.03);
    b.end();
  }
}
