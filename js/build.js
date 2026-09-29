// 建設マス：上に立つと背中の素材が1個ずつ飛んでいき、そろうと建物が直る（建つ）
import * as THREE from './lib/three.module.min.js';
import { scene, bake } from './gfx.js';
import { BUILDINGS, tileModel } from './models.js';
import { burst, ring, shake } from './fx.js';
import { sfx } from './audio.js';

const HALF = 1.25; // マスの半分の大きさ
const DEPOSIT_EVERY = 0.07;

export class Builds {
  constructor(ch, world) {
    this.sites = ch.builds.map(def => {
      const make = (b) => { const g = bake(BUILDINGS[def.model](b)); g.position.set(def.x, 0, def.z); scene.add(g); return g; };
      const site = { def, paid: {}, inflight: {}, done: false, broken: def.repair ? make(true) : null, fixed: make(false), anim: -1 };
      site.fixed.visible = false;
      world.boxes.push({ x0: def.x - def.w / 2, x1: def.x + def.w / 2, z0: def.z - def.d / 2, z1: def.z + def.d / 2, off: () => !site.done && !site.broken });
      return site;
    });
    this.tile = tileModel();
    scene.add(this.tile.group);
    this.tileAnim = 0;
    this.depT = 0;
    this.onTile = false;
    this.nextDelay = 0;
    this.count = 0;
    this.refreshTile();
  }

  // 建設マスがある場所（草を生やさない所）
  areas() {
    const a = [];
    for (const s of this.sites) {
      const d = s.def;
      a.push({ x0: d.x - d.w / 2, x1: d.x + d.w / 2, z0: d.z - d.d / 2, z1: d.z + d.d / 2 });
      a.push({ x0: d.tile[0] - HALF, x1: d.tile[0] + HALF, z0: d.tile[1] - HALF, z1: d.tile[1] + HALF });
    }
    return a;
  }

  current() { return this.nextDelay > 0 ? null : this.sites.find(s => !s.done) || null; }
  need(site, kind) { return (site.def.cost[kind] || 0) - (site.paid[kind] || 0); }
  left(site, kind) { return this.need(site, kind) - (site.inflight[kind] || 0); }
  isComplete(site) { return Object.keys(site.def.cost).every(k => this.need(site, k) <= 0); }

  load(data) {
    if (!data) return;
    for (const s of this.sites) {
      const d = data[s.def.id];
      if (!d) continue;
      s.paid = { ...d.paid };
      if (d.done) this.finish(s, true);
    }
    this.refreshTile();
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
    site.fixed.visible = true;
    if (!instant) site.anim = 0;
  }

  refreshTile() {
    const s = this.current();
    this.tile.group.visible = !!s;
    if (s) { this.tile.group.position.set(s.def.tile[0], 0, s.def.tile[1]); this.tileAnim = 0; }
  }

  update(dt, time, player, items, hooks) {
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
    if (this.nextDelay > 0) {
      this.nextDelay -= dt;
      if (this.nextDelay <= 0) { this.refreshTile(); if (this.current()) { sfx.appear(); hooks.onNewTile(this.current()); ring(this.tile.group.position.x, this.tile.group.position.z, 0xfff3c4, 2.5); } }
    }

    const site = this.current();
    const tg = this.tile.group;
    if (!site) { this.onTile = false; return; }
    this.tileAnim = Math.min(1, this.tileAnim + dt * 3);
    const pop = this.tileAnim < 1 ? 0.2 + 0.8 * (1 + 2.2 * Math.pow(this.tileAnim - 1, 3) + 1.2 * Math.pow(this.tileAnim - 1, 2)) : 1;
    tg.scale.set(pop, 1, pop);
    this.tile.ham.position.y = 0.5 + Math.sin(time * 3) * 0.12;
    this.tile.ham.rotation.y = time * 1.5;

    const tx = site.def.tile[0], tz = site.def.tile[1];
    this.onTile = player.alive && Math.abs(player.pos.x - tx) < HALF && Math.abs(player.pos.z - tz) < HALF;
    this.tile.inner.material.opacity = this.onTile ? 0.55 + Math.sin(time * 10) * 0.15 : 0.3 + Math.sin(time * 3) * 0.08;
    if (!this.onTile) { this.depT = 0; return; }

    this.depT -= dt;
    while (this.depT <= 0) {
      this.depT += DEPOSIT_EVERY;
      const it = items.takeFromBag(k => this.left(site, k) > 0);
      if (!it) { this.depT = 0; break; }
      const kind = it.kind;
      site.inflight[kind] = (site.inflight[kind] || 0) + 1;
      items.flyTo(it, tx + (Math.random() - 0.5) * 0.6, 0.25, tz + (Math.random() - 0.5) * 0.6, 0.32, () => {
        site.inflight[kind]--;
        site.paid[kind] = (site.paid[kind] || 0) + 1;
        this.count++;
        sfx.deposit(this.count);
        burst(tx, 0.3, tz, { n: 3, color: 0xfff1c8, speed: 1.5, up: 2, size: 0.1, life: 0.35 });
        hooks.onPaid(site);
        if (!site.done && this.isComplete(site)) this.complete(site, hooks);
      });
    }
  }

  complete(site, hooks) {
    this.finish(site, false);
    const d = site.def;
    burst(d.x, 1, d.z, { n: 30, colors: [0xf5e6c8, 0xe8d5b0, 0xffffff], speed: 4, up: 3, size: 0.3, life: 0.8, g: 3, spread: d.w * 0.7, grow: 0.6 });
    burst(d.x, 2.5, d.z, { n: 40, colors: [0xff6b6b, 0xffd93d, 0x6bcBff, 0x7ee06a, 0xff9ff3], speed: 5, up: 7, size: 0.13, life: 1.4, g: 9 });
    ring(d.x, d.z, 0xffffff, 5, 0.6);
    shake(0.35);
    sfx.build();
    this.nextDelay = 0.9;
    this.tile.group.visible = false;
    this.onTile = false;
    hooks.onBuilt(site);
  }
}
