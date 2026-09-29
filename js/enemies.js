// 敵：すみかの中をうろうろし、近づくと追いかけてくる。倒すと素材を落とし、しばらくして戻ってくる
// ぬし（大スライム）は跳び上がって押しつぶす攻撃と、子分を呼ぶ攻撃をする
import * as THREE from './lib/three.module.min.js';
import { Rig } from './rig.js';
import { slimeParts, mushroomParts, bossParts } from './models.js';
import { ENEMY_TYPES } from './data.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _w = new THREE.Color(0xffffff);
const UP = new THREE.Vector3(0, 1, 0);
const ang = [0, 0, 0, 0, 0, 0, 0];

export class Enemies {
  constructor(ch, world, cap = 220) {
    this.world = world;
    this.list = [];
    this.rigs = { slime: new Rig(slimeParts(), cap), mushroom: new Rig(mushroomParts(), 60), boss: new Rig(bossParts(), 2) };
    this.boss = null;
    for (const z of ch.spawns) for (let i = 0; i < z.n; i++) this.spawn(z.type, z);
  }

  spawn(type, zone, opts = {}) {
    const def = ENEMY_TYPES[type];
    const land = this.world.landOf(zone.x, zone.z);
    const rect = land ? this.world.land(land).rect : this.world.home;
    const e = {
      type, def, zone, land, area: this.world.insetRects([rect]), rect,
      hp: def.hp, alive: true, state: 'spawn', t: Math.random() * 0.3,
      x: 0, z: 0, yaw: Math.random() * 6.28, tx: 0, tz: 0, wait: Math.random() * 2, hop: Math.random(), hopY: 0, walk: 0, cd: 0,
      kx: 0, kz: 0, flash: 0, color: new THREE.Color(opts.color ?? def.color).offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.08),
      passive: !!opts.passive, minion: !!opts.minion, respawnT: 0, r: def.radius * def.size,
    };
    if (opts.x !== undefined) { e.x = opts.x; e.z = opts.z; e.tx = e.x; e.tz = e.z; } else this.place(e);
    if (def.boss) { this.boss = e; e.phase = 'idle'; e.pt = 0; e.cycles = 0; e.fight = false; }
    this.list.push(e);
    return e;
  }
  place(e) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * e.zone.r;
    e.x = e.zone.x + Math.cos(a) * r; e.z = e.zone.z + Math.sin(a) * r;
    e.tx = e.x; e.tz = e.z;
    this.world.resolve(e, e.r, e.area);
  }

  nearest(x, z, range) {
    let best = null, bd = range;
    for (const e of this.list) {
      if (!e.alive || e.state === 'spawn' || !this.world.isOwned(e.land)) continue;
      const d = Math.hypot(e.x - x, e.z - z) - e.r;
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
    const kb = e.def.boss ? 0.6 : 6;
    e.kx = dx / d * kb; e.kz = dz / d * kb;
    if (!e.def.boss) e.cd = Math.max(e.cd, 0.5);
    if (e.hp <= 0) {
      e.alive = false; e.respawnT = e.def.respawn;
      if (e.minion) this.list.splice(this.list.indexOf(e), 1);
      return true;
    }
    return false;
  }

  // 主人公が倒れたら、ぬしは元気に戻る
  resetBoss() {
    const b = this.boss;
    if (!b || !b.alive) return;
    b.hp = b.def.hp; b.phase = 'idle'; b.fight = false; b.x = b.zone.x; b.z = b.zone.z; b.hopY = 0;
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].minion) this.list.splice(i, 1);
  }

  update(dt, player, hooks) {
    const list = this.list, P = player.pos;
    const playerLand = this.world.landOf(P.x, P.z);
    for (const e of list) {
      const def = e.def;
      if (!e.alive) {
        if (def.boss || e.minion) continue;
        e.respawnT -= dt;
        if (e.respawnT <= 0) { e.alive = true; e.hp = def.hp; e.state = 'spawn'; e.t = 0; this.place(e); }
        continue;
      }
      e.flash = Math.max(0, e.flash - dt);
      e.cd = Math.max(0, e.cd - dt);
      if (e.state === 'spawn') { e.t += dt; if (e.t >= 0.5) e.state = 'idle'; continue; }
      if (def.boss) { this.updateBoss(e, dt, player, playerLand, hooks); continue; }

      const dxp = P.x - e.x, dzp = P.z - e.z, dp = Math.hypot(dxp, dzp);
      const homeD = Math.hypot(P.x - e.zone.x, P.z - e.zone.z);
      const chase = !e.passive && player.alive && playerLand === e.land && dp < def.aggro && homeD < e.zone.r + def.leash;
      let speed = 0, tx, tz;
      if (chase) {
        tx = P.x; tz = P.z; speed = dp > def.atkRange * 0.8 ? def.chase : 0;
        if (dp < def.atkRange + e.r * 0.3 && e.cd <= 0) { player.damage(def.dmg, e.x, e.z); e.cd = def.atkCd; e.hop = 0.25; e.lunge = 0.2; }
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
      this.move(e, dt, speed, tx, tz, chase);
      this.world.resolve(e, e.r, e.area);
    }
    // 重なりすぎないように
    for (let i = 0; i < list.length; i++) {
      const a = list[i]; if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]; if (!b.alive) continue;
        const dx = b.x - a.x, dz = b.z - a.z, rr = (a.r + b.r) * 0.9, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = (rr - d) * 0.5;
          const wa = a.def.boss ? 0 : 1, wb = b.def.boss ? 0 : 1;
          a.x -= dx / d * push * wa * (wb ? 1 : 2); a.z -= dz / d * push * wa * (wb ? 1 : 2);
          b.x += dx / d * push * wb * (wa ? 1 : 2); b.z += dz / d * push * wb * (wa ? 1 : 2);
        }
      }
    }
  }

  move(e, dt, speed, tx, tz, chase) {
    const def = e.def;
    if (def.move === 'walk') {
      e.hopY = 0;
      if (speed > 0) {
        const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
        e.x += dx / d * speed * dt; e.z += dz / d * speed * dt;
        e.walk += dt * (chase ? 13 : 9);
        this.face(e, dx, dz, dt);
      } else e.walk *= 0.9;
    } else {
      // ぴょんぴょん跳ねながら進む
      if (speed > 0 || e.hopY > 0.01) e.hop += dt * (chase ? 2.2 : 1.6);
      const ph = e.hop % 1;
      e.hopY = speed > 0 || ph > 0.05 ? Math.max(0, Math.sin(ph * Math.PI)) * 0.38 * (def.size > 1 ? 1.6 : 1) : 0;
      if (speed > 0) {
        const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
        const mv = speed * dt * (e.hopY > 0.02 ? 1.6 : 0.2);
        e.x += dx / d * mv; e.z += dz / d * mv;
        this.face(e, dx, dz, dt);
      }
    }
    if (e.kx || e.kz) {
      e.x += e.kx * dt; e.z += e.kz * dt;
      const k = Math.pow(0.001, dt); e.kx *= k; e.kz *= k;
      if (Math.abs(e.kx) + Math.abs(e.kz) < 0.05) e.kx = e.kz = 0;
    }
  }
  face(e, dx, dz, dt) {
    let da = Math.atan2(dx, dz) - e.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
    e.yaw += da * Math.min(1, dt * 8);
  }

  // ぬし：追いかける → ため → 跳び上がって押しつぶす → 休む（ときどき子分を呼ぶ）
  updateBoss(e, dt, player, playerLand, hooks) {
    const P = player.pos, def = e.def;
    const inside = player.alive && playerLand === e.land && this.world.isOwned(e.land);
    const dp = Math.hypot(P.x - e.x, P.z - e.z);
    if (!e.fight) {
      if (inside && dp < def.aggro) { e.fight = true; e.phase = 'chase'; e.pt = 0; hooks.onBossStart(e); }
      else { this.move(e, dt, 0, e.x, e.z, false); return; }
    }
    if (!inside) { e.fight = false; e.phase = 'idle'; hooks.onBossEnd(e); return; }
    e.pt += dt;
    if (e.phase === 'chase') {
      this.move(e, dt, def.chase, P.x, P.z, true);
      if (dp < def.atkRange + e.r * 0.5 && e.cd <= 0) { player.damage(def.dmg, e.x, e.z); e.cd = def.atkCd; }
      if (e.pt > 3.2) { e.phase = 'charge'; e.pt = 0; e.hopY = 0; }
    } else if (e.phase === 'charge') {
      this.face(e, P.x - e.x, P.z - e.z, dt);
      if (e.pt > 0.7) {
        e.phase = 'leap'; e.pt = 0;
        e.fx = e.x; e.fz = e.z; e.lx = P.x; e.lz = P.z;
        hooks.onBossLeap(e);
      }
    } else if (e.phase === 'leap') {
      const k = Math.min(1, e.pt / 1.0);
      e.x = e.fx + (e.lx - e.fx) * k; e.z = e.fz + (e.lz - e.fz) * k;
      e.hopY = Math.sin(k * Math.PI) * 4.5;
      if (k >= 1) {
        e.hopY = 0; e.phase = 'rest'; e.pt = 0; e.cycles++;
        const hitP = Math.hypot(P.x - e.x, P.z - e.z) < def.slamR;
        hooks.onBossSlam(e, hitP);
        if (hitP) player.damage(def.slamDmg, e.x, e.z);
        if (e.cycles % 2 === 0) hooks.onBossCall(e);
      }
    } else if (e.phase === 'rest') {
      if (e.pt > 1.4) { e.phase = 'chase'; e.pt = 0; }
    }
    this.world.resolve(e, e.r, e.area);
  }

  render(blobs) {
    for (const k in this.rigs) this.rigs[k].begin();
    for (const e of this.list) {
      if (!e.alive) continue;
      const def = e.def, rig = this.rigs[def.rig];
      let sx = 1, sy = 1;
      const y = e.hopY || 0;
      if (e.state === 'spawn') { const k = Math.min(1, e.t / 0.5); sx = sy = k * (1.3 - 0.3 * k); }
      else if (def.move === 'walk') { sy = 1 + Math.sin(e.walk * 2) * 0.04; }
      else if (e.phase === 'charge') { const k = Math.min(1, e.pt / 0.7); sy = 1 - 0.3 * k; sx = 1 + 0.2 * k; }
      else if (y > 0.02) { sy = 1.12; sx = 0.92; }
      else { const ph = (e.hop % 1); sy = 0.86 + ph * 0.1; sx = 1.08 - ph * 0.06; }
      if (e.flash > 0) { sx *= 1.15; sy *= 0.85; }
      const sz = def.size;
      _q.setFromAxisAngle(UP, e.yaw);
      _m.compose(_p.set(e.x, y, e.z), _q, _s.set(sx * sz, sy * sz, sx * sz));
      if (def.move === 'walk') {
        const w = Math.sin(e.walk) * 0.6;
        ang[0] = w; ang[1] = -w;
        rig.push(_m, ang, e.flash > 0 ? _w : e.color);
      } else rig.push(_m, null, e.flash > 0 ? _w : e.color);
      blobs.push(e.x, e.z, 0.45 * sz * Math.max(0.3, 1 - y * 0.25));
    }
    for (const k in this.rigs) this.rigs[k].end();
  }
}
