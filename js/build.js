// 建設マス：上に立つと背中の素材（土地ならコイン）が1個ずつ飛んでいき、そろうと建物が直る・建つ・土地が開く
import { scene, bake } from './gfx.js';
import { BUILDINGS, tileModel } from './models.js';
import { burst, ring, shake } from './fx.js';
import { sfx } from './audio.js';
import { S } from './state.js';

const HALF = 1.25; // マスの半分の大きさ
const DEPOSIT_EVERY = 0.07;

export class Builds {
  constructor(ch, world) {
    this.missions = ch.missions;
    this.sites = ch.builds.map(def => {
      const site = { def, paid: {}, inflight: {}, done: false, broken: null, fixed: null, anim: -1, tile: null, tileAnim: 0, depT: 0, on: false };
      if (def.model) {
        const make = (b) => { const g = bake(BUILDINGS[def.model](b)); g.position.set(def.x, 0, def.z); scene.add(g); return g; };
        if (def.type === 'repair') site.broken = make(true);
        site.fixed = make(false);
        site.fixed.visible = false;
        world.boxes.push({ x0: def.x - def.w / 2, x1: def.x + def.w / 2, z0: def.z - def.d / 2, z1: def.z + def.d / 2, off: () => !site.done && !site.broken });
      }
      site.appearAt = Math.max(0, this.missions.findIndex(m => m.id === def.appear));
      return site;
    });
    this.count = 0;
    this.started = false;
  }

  get(id) { return this.sites.find(s => s.def.id === id); }
  visible(s) { return !s.done && S.mission >= s.appearAt; }
  active() { return this.sites.filter(s => this.visible(s)); }
  need(site, kind) { return (site.def.cost[kind] || 0) - (site.paid[kind] || 0); }
  left(site, kind) { return this.need(site, kind) - (site.inflight[kind] || 0); }
  isComplete(site) { return Object.keys(site.def.cost).every(k => this.need(site, k) <= 0); }
  isDone(id) { const s = this.get(id); return !!(s && s.done); }
  buildingsDone() { return this.sites.filter(s => s.done && s.def.model).length; }
  population() { return this.sites.reduce((n, s) => n + (s.done && s.def.pop ? s.def.pop : 0), 0); }

  // 建物と建設マスがある場所（草を生やさない所）
  areas() {
    const a = [];
    for (const s of this.sites) {
      const d = s.def;
      if (d.model) a.push({ x0: d.x - d.w / 2, x1: d.x + d.w / 2, z0: d.z - d.d / 2, z1: d.z + d.d / 2 });
      a.push({ x0: d.tile[0] - HALF, x1: d.tile[0] + HALF, z0: d.tile[1] - HALF, z1: d.tile[1] + HALF });
      for (const k of ['process', 'shop']) if (d[k]) for (const p of ['input', 'output', 'stock', 'coins', 'queue']) if (d[k][p]) {
        const x = d.x + d[k][p][0], z = d.z + d[k][p][1];
        a.push({ x0: x - 1, x1: x + 1, z0: z - 1, z1: z + 1 });
      }
    }
    return a;
  }

  load(data) {
    if (!data) return;
    for (const s of this.sites) {
      const d = data[s.def.id];
      if (!d) continue;
      s.paid = { ...d.paid };
      if (d.done) this.finish(s, true);
    }
  }
  toSave() {
    const o = {};
    // 飛んでいる途中の素材も、届いたものとして記録する
    for (const s of this.sites) {
      const paid = { ...s.paid };
      for (const k in s.inflight) paid[k] = (paid[k] || 0) + s.inflight[k];
      o[s.def.id] = { paid, done: s.done };
    }
    return o;
  }

  finish(site, instant) {
    site.done = true;
    if (site.broken) site.broken.visible = false;
    if (site.fixed) site.fixed.visible = true;
    if (site.tile) { scene.remove(site.tile.group); site.tile = null; }
    if (!instant && site.fixed) site.anim = 0;
  }

  makeTile(site) {
    const t = tileModel({ mark: site.def.type === 'land' ? 'coin' : 'hammer', plate: site.def.type === 'land' ? 0xfff1c2 : 0xf6e4b8 });
    t.group.position.set(site.def.tile[0], 0, site.def.tile[1]);
    scene.add(t.group);
    site.tile = t; site.tileAnim = 0;
  }

  update(dt, time, player, items, coins, hooks) {
    // 建った建物のポンという動き
    for (const s of this.sites) {
      if (s.anim < 0) continue;
      s.anim += dt;
      const k = Math.min(1, s.anim / 0.7);
      const e = k < 0.5 ? 0.05 + 1.15 * (k / 0.5) * (2 - k / 0.5) : 1.2 - 0.2 * Math.sin((k - 0.5) / 0.5 * Math.PI / 2);
      const y = Math.min(1.2, e), xz = 1 + (1 - y) * 0.35;
      s.fixed.scale.set(xz, y, xz);
      if (k >= 1) { s.anim = -1; s.fixed.scale.set(1, 1, 1); }
    }

    for (const site of this.sites) {
      if (!this.visible(site)) { site.on = false; continue; }
      if (!site.tile) {
        this.makeTile(site);
        if (this.started) { sfx.appear(); ring(site.def.tile[0], site.def.tile[1], 0xfff3c4, 2.5); hooks.onNewTile(site); }
        else site.tileAnim = 1;
      }
      const tile = site.tile, tg = tile.group;
      site.tileAnim = Math.min(1, site.tileAnim + dt * 3);
      const ta = site.tileAnim;
      const pop = ta < 1 ? 0.2 + 0.8 * (1 + 2.2 * Math.pow(ta - 1, 3) + 1.2 * Math.pow(ta - 1, 2)) : 1;
      tg.scale.set(pop, 1, pop);
      tile.mark.position.y = 0.5 + Math.sin(time * 3) * 0.12;
      tile.mark.rotation.y = time * 1.5;

      const [tx, tz] = site.def.tile;
      site.on = player.alive && Math.abs(player.pos.x - tx) < HALF && Math.abs(player.pos.z - tz) < HALF;
      tile.inner.material.opacity = site.on ? 0.55 + Math.sin(time * 10) * 0.15 : 0.3 + Math.sin(time * 3) * 0.08;
      if (!site.on) { site.depT = 0; continue; }

      site.depT -= dt;
      while (site.depT <= 0) {
        site.depT += DEPOSIT_EVERY;
        if (!this.depositOne(site, player, items, coins, hooks)) { site.depT = 0; break; }
      }
    }
    this.started = true;
  }

  depositOne(site, player, items, coins, hooks) {
    const [tx, tz] = site.def.tile;
    const arrive = (kind, n) => {
      site.inflight[kind] -= n;
      site.paid[kind] = (site.paid[kind] || 0) + n;
      this.count++;
      sfx.deposit(this.count);
      burst(tx, 0.3, tz, { n: 3, color: kind === 'coin' ? 0xffe066 : 0xfff1c8, speed: 1.5, up: 2, size: 0.1, life: 0.35 });
      hooks.onPaid(site);
      if (!site.done && this.isComplete(site)) this.complete(site, hooks);
    };
    // コインで払う
    if (site.def.cost.coin) {
      const left = this.left(site, 'coin');
      const n = Math.min(left, S.coins, Math.max(1, Math.ceil(site.def.cost.coin / 30)));
      if (n <= 0) return false;
      S.coins -= n;
      site.inflight.coin = (site.inflight.coin || 0) + n;
      coins.send(player.pos.x, 1.3, player.pos.z, () => ({ x: tx, y: 0.3, z: tz }), 0.35, () => arrive('coin', n));
      return true;
    }
    // 背中から。なければ倉庫から
    const pred = k => this.left(site, k) > 0;
    const it = items.take(player, pred) || (hooks.fromStorage ? hooks.fromStorage(pred) : null);
    if (!it) return false;
    const kind = it.kind;
    site.inflight[kind] = (site.inflight[kind] || 0) + 1;
    const dur = 0.32 + Math.min(0.5, Math.hypot(it.p.x - tx, it.p.z - tz) * 0.025);
    items.flyTo(it, tx + (Math.random() - 0.5) * 0.6, 0.25, tz + (Math.random() - 0.5) * 0.6, dur, () => arrive(kind, 1));
    return true;
  }

  complete(site, hooks) {
    this.finish(site, false);
    const d = site.def;
    const x = d.model ? d.x : d.tile[0], z = d.model ? d.z : d.tile[1], w = d.w || 3;
    burst(x, 1, z, { n: 30, colors: [0xf5e6c8, 0xe8d5b0, 0xffffff], speed: 4, up: 3, size: 0.3, life: 0.8, g: 3, spread: w * 0.7, grow: 0.6 });
    burst(x, 2.5, z, { n: 40, colors: [0xff6b6b, 0xffd93d, 0x6bcbff, 0x7ee06a, 0xff9ff3], speed: 5, up: 7, size: 0.13, life: 1.4, g: 9 });
    ring(x, z, 0xffffff, 5, 0.6);
    shake(0.35);
    sfx.build();
    hooks.onBuilt(site);
  }
}

