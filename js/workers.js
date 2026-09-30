// 住民：家が建つと増える。雇うと木こり・鉱夫・運び手・店番として実際に歩いて働く
import * as THREE from './lib/three.module.min.js';
import { JOBS, NODE_TYPES, JOB_UP, STORAGE } from './data.js';
import { S } from './state.js';
import { burst } from './fx.js';
import { sfx } from './audio.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const IDLE = [0xf2c48b, 0xc9b5e8, 0xa8d8c8, 0xf0b8b8, 0xd8d0a0];
const ang = [0, 0, 0, 0, 0, 0, 0, 0];
const SPEED = 3.0;

export class Workers {
  constructor(world, builds, resources, stations, items, enemies) {
    Object.assign(this, { world, builds, resources, stations, items, enemies });
    this.list = [];
  }

  // 人口に合わせて住民を増やし、雇った仕事を割り当てる
  sync(player, silent) {
    const pop = this.builds.population();
    const houses = this.builds.sites.filter(s => s.done && s.def.pop);
    while (this.list.length < pop) {
      const i = this.list.length, h = houses[Math.min(houses.length - 1, Math.floor(i / 2))].def;
      const w = {
        id: 'w' + i, x: h.tile[0] + (i % 2 ? 0.5 : -0.5), z: h.tile[1], yaw: 0, walk: 0, moving: 0, job: null, state: 'idle', t: Math.random() * 3,
        tx: 0, tz: 0, target: null, swing: 0, actT: 0, idleColor: new THREE.Color(IDLE[i % IDLE.length]), color: new THREE.Color(),
        cap: 0, anchor: new THREE.Vector3(), lag: new THREE.Vector3(),
      };
      w.tx = w.x; w.tz = w.z;
      this.items.addCarrier(w);
      this.list.push(w);
      if (!silent) burst(w.x, 0.8, w.z, { n: 12, colors: [0xffffff, 0xffe066], speed: 2, up: 3, size: 0.1, life: 0.6 });
    }
    this.list.forEach((w, i) => {
      const job = S.hired[i] || null;
      if (w.job !== job) { w.job = job; w.state = 'idle'; w.target = null; this.resources.release(w); }
      w.cap = job && JOBS[job].carry ? JOBS[job].carry + this.lv(job) * JOB_UP.carry : 0;
      w.color.set(job ? JOBS[job].color : w.idleColor);
    });
  }

  free() { return this.list.length - S.hired.length; }
  // 仕事のレベル（0 = Lv1）と倍率
  lv(job) { return S.jobLv[job] || 0; }
  walkMul(w) { return w.job ? 1 + this.lv(w.job) * JOB_UP.walk : 0.6; }
  workMul(w) { return w.job ? 1 + this.lv(w.job) * JOB_UP.work : 1; }
  // 強化したら運べる数などを付け直す
  refresh() { for (const w of this.list) w.cap = w.job && JOBS[w.job].carry ? JOBS[w.job].carry + this.lv(w.job) * JOB_UP.carry : 0; }
  keeper() { return this.list.find(w => w.job === 'keeper') || null; }

  goTo(w, x, z, dt, r = 0.15) {
    const d = Math.hypot(x - w.x, z - w.z);
    if (d < r) { w.moving = 0; return true; }
    // 建物がじゃまなら、角を回って進む
    const wp = this.world.detour(w.x, w.z, x, z);
    if (wp) { x = wp.x; z = wp.z; }
    const dx = x - w.x, dz = z - w.z, dd = Math.hypot(dx, dz) || 1;
    const sp = Math.min(dd, SPEED * this.walkMul(w) * dt);
    w.x += dx / dd * sp; w.z += dz / dd * sp;
    w.yaw = Math.atan2(dx, dz); w.walk += dt * 10; w.moving = 1;
    return false;
  }

  update(dt, player, hooks) {
    for (const [i, w] of this.list.entries()) {
      w.moving = 0;
      if (this.party) { this.cheer(w, i, dt); continue; }
      const job = w.job;
      if (job && JOBS[job].node) this.gatherer(w, dt, player, hooks, JOBS[job].node, JOBS[job].to);
      else if (job === 'carrier') this.carrier(w, dt, player, hooks);
      else if (job === 'keeper') this.keeperJob(w, dt);
      else if (job === 'soldier') this.soldier(w, dt, player, hooks);
      else this.idle(w, dt);
      if (job !== 'keeper') this.world.resolve(w, 0.3);
      // 背中の位置
      w.anchor.set(w.x - Math.sin(w.yaw) * 0.35, 0.75, w.z - Math.cos(w.yaw) * 0.35);
      w.lag.set(Math.sin(w.yaw) * SPEED * w.moving, 0, Math.cos(w.yaw) * SPEED * w.moving);
    }
  }

  idle(w, dt) {
    w.t -= dt;
    if (w.t <= 0) {
      const f = this.world.fire, a = Math.random() * 6.28, r = 3.5 + Math.random() * 4;
      w.tx = f.x + Math.cos(a) * r; w.tz = f.z + Math.sin(a) * r; w.t = 3 + Math.random() * 4;
    }
    this.goTo(w, w.tx, w.tz, dt);
  }

  // 木こり・鉱夫：資源をたたいて背中に積み、加工場の入口へ運ぶ
  gatherer(w, dt, player, hooks, type, stationId) {
    const st = this.stations.get(stationId);
    if (!st || !st.site.done) return this.idle(w, dt);
    if (w.state === 'deliver' || w.bag.length >= w.cap) {
      w.state = 'deliver';
      if (this.goTo(w, st.inPos.x, st.inPos.z, dt, 0.7)) {
        w.actT -= dt;
        if (w.actT <= 0) { w.actT = 0.12; if (!this.stations.feedOne(st, w, player, hooks) && w.bag.every(it => it.state === 'bag')) { if (!w.bag.length) w.state = 'gather'; } }
      }
      return;
    }
    if (!w.target || w.target.state !== 'ok') { w.target = this.resources.claimNearest(type, w.x, w.z, w); w.swing = 0; }
    const n = w.target;
    if (!n) { if (w.bag.length) w.state = 'deliver'; else this.idle(w, dt); return; }
    const reach = n.def.reach - 0.1;
    const dx = n.x - w.x, dz = n.z - w.z, d = Math.hypot(dx, dz);
    if (d > reach) { this.goTo(w, n.x - dx / d * (reach - 0.2), n.z - dz / d * (reach - 0.2), dt); w.swing = 0; return; }
    w.yaw = Math.atan2(dx, dz);
    w.swing += dt * this.workMul(w);
    if (w.swing >= 0.95) {
      w.swing = 0;
      const got = this.resources.hit(n, w.x, w.z, 1);
      const drop = NODE_TYPES[n.type].drop;
      for (let i = 0; i < got; i++) this.items.give(w, drop, n.x, 0.9, n.z);
      const close = Math.hypot(player.pos.x - w.x, player.pos.z - w.z) < 9;
      if (type === 'tree') { burst(n.x, 1.8 * n.scl, n.z, { n: 3, colors: [0x6cc24a, 0x8ed86a], speed: 1.4, up: 1, size: 0.12, life: 0.7, g: 3, spread: 1 }); if (close) sfx.chopSoft(); }
      else if (type === 'herb') burst(n.x, 0.5, n.z, { n: 4, colors: [0x5fbf4f, 0xff8fd0], speed: 1.5, up: 2, size: 0.08, life: 0.5 });
      else { burst(n.x, 0.6, n.z, { n: 3, colors: [0x9ea3aa, 0xc4c8ce], speed: 2.5, up: 3, size: 0.1, life: 0.5 }); if (close) sfx.rockSoft(); }
      if (n.state !== 'ok') w.target = null;
    }
  }

  // 運び手：加工場・鉱山の出口の物を倉庫へ。倉庫に一定より多くたまった物は市場・港へ運んで売る。
  // 食堂の材料が倉庫にあれば、それをいちばん先に厨房へ運ぶ
  carrier(w, dt, player, hooks) {
    const S_ = this.stations, sto = S_.storageReady() ? S_.storage : null, kit = S_.kitchen;
    const open = S_.shops.filter(sh => sh.site.done && !sh.kitchen);
    const act = (t, f) => { w.actT -= dt; if (w.actT <= 0) { w.actT = t / this.workMul(w); f(); } };
    // 厨房へ
    if (w.state === 'kdeliver' || w.state === 'kfetch' || (!w.bag.length && S_.kitchenWants())) {
      if (w.state !== 'kdeliver') {
        w.state = 'kfetch';
        if (this.goTo(w, sto.pos.x, sto.pos.z, dt, 0.8)) act(0.08, () => {
          const m = S_.kitchenWants();
          if (m && w.bag.length < w.cap) { S.storage[m]--; this.items.give(w, m, sto.door.x, 1, sto.door.z); }
          else w.state = w.bag.length ? 'kdeliver' : 'idle';
        });
        return;
      }
      if (this.goTo(w, kit.inPos.x, kit.inPos.z, dt, 0.7)) act(0.1, () => {
        if (!S_.feedOne(kit, w, player, hooks) && w.bag.every(it => it.state === 'bag')) w.state = w.bag.length ? 'kdeliver' : 'idle';
      });
      return;
    }
    // 倉庫の余りを市場・港へ（倉庫で積む → お店へ）
    if (w.state === 'sfetch') {
      if (!sto) { w.state = 'idle'; return; }
      if (this.goTo(w, sto.pos.x, sto.pos.z, dt, 0.8)) act(0.08, () => {
        const k = w.fetchKind;
        if (w.bag.length < w.cap && (S.storage[k] || 0) > STORAGE.keep) { S.storage[k]--; this.items.give(w, k, sto.door.x, 1, sto.door.z); }
        else w.state = w.bag.length ? 'toshop' : 'idle';
      });
      return;
    }
    // 背中の物を届ける
    if (w.bag.length && w.state !== 'load') {
      // 倉庫がいっぱい・倉庫がないときはお店へ
      if (w.state !== 'toshop' && (!sto || S_.storageRoom() <= 0) && open.some(sh => w.bag.some(it => sh.sells.includes(it.kind)))) w.state = 'toshop';
      if (w.state === 'toshop') {
        if (!w.dest || !w.dest.site.done || !w.bag.some(it => w.dest.sells.includes(it.kind))) {
          const cands = open.filter(sh => w.bag.some(it => sh.sells.includes(it.kind)));
          cands.sort((a, b) => S_.stockTotal(a) / a.cap - S_.stockTotal(b) / b.cap);
          w.dest = cands[0] || null;
        }
        const sh = w.dest;
        if (!sh) { w.state = sto ? 'tosto' : 'idle'; if (!sto) this.idle(w, dt); return; }
        if (this.goTo(w, sh.stock.x, sh.stock.z, dt, 0.6)) act(0.1, () => {
          if (!S_.stockOne(sh, w, player, hooks)) { w.dest = null; if (!w.bag.length) w.state = 'idle'; else if (S_.stockTotal(sh) + sh.inflight >= sh.cap) w.state = sto ? 'tosto' : 'toshop'; }
        });
        return;
      }
      w.state = 'tosto';
      if (!sto) { this.idle(w, dt); return; }
      if (this.goTo(w, sto.pos.x, sto.pos.z, dt, 0.8)) act(0.08, () => {
        if (!S_.storeOne(w) && w.bag.every(it => it.state === 'bag')) { if (!w.bag.length) { w.state = 'idle'; w.sellTurn = true; } }
      });
      return;
    }
    // 倉庫の余りを売りに行く（倉庫へ運んだ次は、余りがあれば売りに行く番）
    const surplus = () => sto && Object.keys(S.storage).find(k => S.storage[k] > STORAGE.keep && open.some(sh => sh.sells.includes(k) && S_.stockTotal(sh) + sh.inflight < sh.cap));
    if (w.sellTurn && w.state !== 'load') {
      w.sellTurn = false;
      const k = surplus();
      if (k) { w.state = 'sfetch'; w.fetchKind = k; return; }
    }
    // 加工場・鉱山の出口から積む（倉庫があれば全部、なければお店で売っている物だけ）
    const can = p => p.site.done && !p.kitchen && (sto ? S_.storageRoom() > 0 : open.some(sh => sh.sells.includes(p.to)));
    if (w.state !== 'load' || !w.src || !can(w.src) || S_.st(w.src).out <= 0) {
      let best = null, most = 0;
      for (const p of S_.proc) { if (!can(p)) continue; const o = S_.st(p).out; if (o > most) { most = o; best = p; } }
      w.src = best; w.state = best ? 'load' : 'idle';
    }
    if (w.state === 'load') {
      if (this.goTo(w, w.src.outPos.x, w.src.outPos.z, dt, 0.9)) act(0.1, () => {
        if (w.bag.length >= w.cap || !S_.takeOne(w.src, w, player, hooks)) w.state = w.bag.length ? (sto ? 'tosto' : 'toshop') : 'idle';
      });
      return;
    }
    // 出口に何もなければ、倉庫の余りを売りに行く
    const k = surplus();
    if (k) { w.state = 'sfetch'; w.fetchKind = k; return; }
    const home = sto ? sto.pos : open.length ? open[0].stock : null;
    if (home) this.goTo(w, home.x - 1.2, home.z + 1.2, dt, 0.4); else this.idle(w, dt);
  }

  // 兵士：主人公の近くの敵を優先して、買った土地の敵を自動で倒す（ぬしは主人公にまかせる）
  soldier(w, dt, player, hooks) {
    const bar = this.builds.get('barracks');
    if (!bar || !bar.done) return this.idle(w, dt);
    const J = JOBS.soldier;
    w.think = (w.think || 0) - dt;
    if (!w.foe || !w.foe.alive || w.foe.state === 'spawn' || w.think <= 0) {
      w.think = 2;
      let best = null, bs = Infinity;
      for (const e of this.enemies.list) {
        if (!e.alive || e.state === 'spawn' || e.def.boss || e.passive || !this.world.isWalk(e.land)) continue;
        const dPlayer = Math.hypot(e.x - player.pos.x, e.z - player.pos.z), dMe = Math.hypot(e.x - w.x, e.z - w.z);
        if (dMe > 35) continue;
        const score = dPlayer < 12 ? dPlayer : 100 + dMe;
        if (score < bs) { bs = score; best = e; }
      }
      if (best !== w.foe) { w.foe = best; w.swing = 0; }
    }
    const e = w.foe;
    if (!e) { this.goTo(w, bar.def.x - 1 + (w.id.length % 3), bar.def.z + 2.6, dt, 0.3); return; }
    const dx = e.x - w.x, dz = e.z - w.z, d = Math.hypot(dx, dz);
    if (d > e.r + 1.0) { this.goTo(w, e.x, e.z, dt * 1.15); w.swing = 0; return; }
    w.yaw = Math.atan2(dx, dz);
    w.swing += dt * this.workMul(w);
    if (w.swing >= J.every) {
      w.swing = 0;
      const killed = this.enemies.hit(e, J.dmg * (1 + this.lv('soldier') * JOB_UP.dmg), w.x, w.z);
      hooks.onSoldierHit(e, killed, w);
      if (killed) w.foe = null;
    }
  }

  // エンディング：城の前に並んで跳びはねる
  cheer(w, i, dt) {
    const p = this.party, row = Math.floor(i / 8), col = i % 8;
    const x = p.x + (col - 3.5) * 1.1, z = p.z + 1.6 + row * 1.1;
    if (this.goTo(w, x, z, dt * 1.4, 0.2)) { w.yaw = Math.PI; w.jump = (w.jump || Math.random() * 6) + dt * 7; }
    w.anchor.set(w.x, 0.75, w.z);
  }

  // 店番：カウンターの後ろに立つ（売る速さが上がり、コインを集めてくれる）
  keeperJob(w, dt) {
    const shop = this.stations.shop;
    if (!shop || !shop.site.done) return this.idle(w, dt);
    const d = shop.site.def;
    if (this.goTo(w, d.x + 0.9, d.z + 0.15, dt, 0.1)) w.yaw = 0;
  }

  render(rig, blobs, time) {
    for (const w of this.list) {
      const s = Math.sin(w.walk) * 0.7 * w.moving;
      ang[0] = s; ang[1] = -s; ang[6] = -s; ang[7] = s;
      if (w.swing > 0) ang[7] = w.swing < 0.6 ? -2.6 * (w.swing / 0.6) : -2.6 + 2.8 * ((w.swing - 0.6) / 0.35);
      if (w.job === 'keeper' && !w.moving) { ang[6] = Math.sin(time * 3) * 0.3; ang[7] = -Math.sin(time * 3) * 0.3; }
      const hop = this.party && !w.moving ? Math.abs(Math.sin(w.jump || 0)) * 0.35 : 0;
      if (hop) { ang[6] = ang[7] = -2.6; }
      _m.compose(_v.set(w.x, Math.abs(Math.cos(w.walk)) * 0.06 * w.moving + hop, w.z), _q.setFromAxisAngle(UP, w.yaw), _s);
      rig.push(_m, ang, w.color);
      blobs.push(w.x, w.z, 0.35);
    }
  }
}
