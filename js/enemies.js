// 敵：すみかの中をうろうろし、近づくと追いかけてくる。倒すと素材を落とし、しばらくして戻ってくる
import * as THREE from './lib/three.module.min.js';
import { Rig } from './rig.js';
import { slimeParts } from './models.js';
import { ENEMY_TYPES } from './data.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _w = new THREE.Color(0xffffff);
const UP = new THREE.Vector3(0, 1, 0);

export class Enemies {
  constructor(ch, world, cap = 200) {
    this.world = world;
    this.list = [];
    this.rigs = { slime: new Rig(slimeParts(), cap) };
    for (const z of ch.spawns) for (let i = 0; i < z.n; i++) this.spawn(z.type, z);
  }

  spawn(type, zone, opts = {}) {
    const def = ENEMY_TYPES[type];
    const e = {
      type, def, zone, hp: def.hp, alive: true, state: 'spawn', t: Math.random() * 0.3,
      x: 0, z: 0, yaw: Math.random() * 6.28, tx: 0, tz: 0, wait: Math.random() * 2, hop: Math.random(), cd: 0,
      kx: 0, kz: 0, flash: 0, color: new THREE.Color(opts.color ?? def.color).offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.08),
      passive: !!opts.passive, respawnT: 0, pos: new THREE.Vector3(),
    };
    this.place(e);
    this.list.push(e);
    return e;
  }
  place(e) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * e.zone.r;
    e.x = e.zone.x + Math.cos(a) * r; e.z = e.zone.z + Math.sin(a) * r;
    e.tx = e.x; e.tz = e.z;
    const p = { x: e.x, z: e.z }; this.world.resolve(p, e.def.radius); e.x = p.x; e.z = p.z;
  }

  nearest(x, z, range) {
    let best = null, bd = range;
    for (const e of this.list) {
      if (!e.alive || e.state === 'spawn') continue;
      const d = Math.hypot(e.x - x, e.z - z) - e.def.radius * e.def.size;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // 攻撃を受ける。倒れたら true
  hit(e, dmg, fx, fz) {
    if (!e.alive) return false;
    e.hp -= dmg;
    e.flash = 0.14;
    const dx = e.x - fx, dz = e.z - fz, d = Math.hypot(dx, dz) || 1;
    e.kx = dx / d * 6; e.kz = dz / d * 6;
    e.cd = Math.max(e.cd, 0.5);
    if (e.hp <= 0) { e.alive = false; e.respawnT = e.def.respawn; return true; }
    return false;
  }

  update(dt, player) {
    const list = this.list, P = player.pos;
    for (const e of list) {
      const def = e.def;
      if (!e.alive) {
        e.respawnT -= dt;
        if (e.respawnT <= 0) { e.alive = true; e.hp = def.hp; e.state = 'spawn'; e.t = 0; this.place(e); }
        continue;
      }
      e.flash = Math.max(0, e.flash - dt);
      e.cd = Math.max(0, e.cd - dt);
      if (e.state === 'spawn') { e.t += dt; if (e.t >= 0.5) e.state = 'idle'; continue; }

      const dxp = P.x - e.x, dzp = P.z - e.z, dp = Math.hypot(dxp, dzp);
      const homeD = Math.hypot(P.x - e.zone.x, P.z - e.zone.z);
      const chase = !e.passive && player.alive && dp < def.aggro && homeD < e.zone.r + def.leash;
      let speed = 0, tx, tz;
      if (chase) {
        tx = P.x; tz = P.z; speed = dp > def.atkRange * 0.8 ? def.chase : 0;
        if (dp < def.atkRange && e.cd <= 0) { player.damage(def.dmg, e.x, e.z); e.cd = def.atkCd; e.hop = 0.25; }
      } else {
        e.wait -= dt;
        if (e.wait <= 0) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * e.zone.r;
          e.tx = e.zone.x + Math.cos(a) * r; e.tz = e.zone.z + Math.sin(a) * r;
          e.wait = 2 + Math.random() * 3;
        }
        tx = e.tx; tz = e.tz;
        if (Math.hypot(tx - e.x, tz - e.z) > 0.3) speed = def.speed;
      }
      // ぴょんぴょん跳ねながら進む
      if (speed > 0 || e.hopY > 0.01) e.hop += dt * (chase ? 2.2 : 1.6);
      const ph = e.hop % 1;
      e.hopY = speed > 0 || ph > 0.05 ? Math.max(0, Math.sin(ph * Math.PI)) * 0.38 : 0;
      if (speed > 0) {
        const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
        const move = speed * dt * (e.hopY > 0.02 ? 1.6 : 0.2);
        e.x += dx / d * move; e.z += dz / d * move;
        const want = Math.atan2(dx, dz);
        let da = want - e.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
        e.yaw += da * Math.min(1, dt * 8);
      }
      if (e.kx || e.kz) {
        e.x += e.kx * dt; e.z += e.kz * dt;
        const k = Math.pow(0.001, dt); e.kx *= k; e.kz *= k;
        if (Math.abs(e.kx) + Math.abs(e.kz) < 0.05) e.kx = e.kz = 0;
      }
      this.world.resolve(e, def.radius);
    }
    // 重なりすぎないように
    for (let i = 0; i < list.length; i++) {
      const a = list[i]; if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]; if (!b.alive) continue;
        const dx = b.x - a.x, dz = b.z - a.z, rr = (a.def.radius + b.def.radius) * 0.9, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), push = (rr - d) * 0.5; a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push; }
      }
    }
  }

  render(blobs) {
    for (const k in this.rigs) this.rigs[k].begin();
    for (const e of this.list) {
      if (!e.alive) continue;
      const def = e.def, rig = this.rigs[def.rig];
      let sx = 1, sy = 1;
      const y = e.hopY || 0;
      if (e.state === 'spawn') { const k = Math.min(1, e.t / 0.5); sx = sy = k * (1.3 - 0.3 * k); }
      else if (y > 0.02) { sy = 1.12; sx = 0.92; }
      else { const ph = (e.hop % 1); sy = 0.86 + ph * 0.1; sx = 1.08 - ph * 0.06; }
      if (e.flash > 0) { sx *= 1.15; sy *= 0.85; }
      const sz = def.size;
      _q.setFromAxisAngle(UP, e.yaw);
      _m.compose(_p.set(e.x, y, e.z), _q, _s.set(sx * sz, sy * sz, sx * sz));
      rig.push(_m, null, e.flash > 0 ? _w : e.color);
      blobs.push(e.x, e.z, 0.45 * sz * (1 - y * 0.8));
    }
    for (const k in this.rigs) this.rigs[k].end();
  }
}
