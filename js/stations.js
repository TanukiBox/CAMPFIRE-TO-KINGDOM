// 建物の働き：加工場（入口に素材→時間で加工品が出口に積もる）・鉱山（自動で鉱石が出る）・お店と市場（客が並んで買い、コインが積もる）
// 宿屋（旅人が毛皮の毛布で泊まってコインを払う）・鍛冶屋の台・倉庫・焚き火にくべるマス
import * as THREE from './lib/three.module.min.js';
import { scene, bake } from './gfx.js';
import { tileModel, shipModel, facilityDecor } from './models.js';
import { MATERIALS, SHOP, STORAGE, INN, HARBOR, FACILITY, KITCHEN, RECIPES, INGREDIENTS, DISHES } from './data.js';
import { S } from './state.js';
import { pileSpot } from './items.js';
import { burst, floatText } from './fx.js';
import { sfx } from './audio.js';

const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const SHIRTS = [0xf28b50, 0x5fb3e8, 0xe86a8a, 0x8bd16a, 0xf5c542, 0xa98bf0, 0x6fd6c4];
const TRAVELERS = [0x8a6a4a, 0x5a7a9a, 0x9a5a5a, 0x6a8a5a];
const ang = [0, 0, 0, 0, 0, 0, 0, 0];
const near = (a, x, z, h) => Math.abs(a.x - x) < h && Math.abs(a.z - z) < h;
const PRICED = Object.keys(MATERIALS).filter(k => MATERIALS[k].price);
const CH1_SELL = ['plank', 'block', 'jelly'];
// 遠くから飛ぶときは少し長く
const flyDur = (it, to) => 0.3 + Math.min(0.5, Math.hypot(it.p.x - to.x, it.p.z - to.z) * 0.025);
const place = (tile, x, z, y = 0) => { tile.group.position.set(x, y, z); scene.add(tile.group); return tile; };

export class Stations {
  constructor(ch, builds, items, coins, world) {
    this.items = items; this.coins = coins; this.world = world;
    this.proc = []; this.shops = []; this.shop = null; this.anvil = null; this.storage = null; this.inn = null;
    this.gate = ch.gate;
    for (const site of builds.sites) {
      const d = site.def, at = o => ({ x: d.x + o[0], z: d.z + o[1] });
      if (d.process) {
        const p = d.process, inPos = at(p.input), outPos = at(p.output);
        const from = Array.isArray(p.from) ? p.from : [p.from];
        this.proc.push({
          id: d.id, site, def: p, from, to: p.to, inPos, outPos, inflight: 0, depT: 0, pickT: 0,
          tile: place(tileModel({ size: 1.7, mark: 'none', plate: 0xdcefff, border: 0x5f86b0 }), inPos.x, inPos.z),
          outTile: place(tileModel({ size: 1.5, mark: 'none', plate: 0xe9dcc4, border: 0xa98a64 }), outPos.x, outPos.z, -0.02),
        });
      }
      if (d.gen) {
        const outPos = at(d.gen.output);
        this.proc.push({ id: d.id, site, def: d.gen, gen: true, from: [], to: d.gen.to, outPos, pickT: 0,
          outTile: place(tileModel({ size: 1.5, mark: 'none', plate: 0xe9dcc4, border: 0xa98a64 }), outPos.x, outPos.z, -0.02) });
      }
      if (d.shop) {
        const s = d.shop, stock = at(s.stock);
        const sh = {
          id: d.id, site, stock, coinPos: at(s.coins), queue: at(s.queue),
          counter: { x: d.x + s.counter[0], y: s.counter[1], z: d.z + s.counter[2] },
          sells: s.all ? PRICED : s.kitchen ? DISHES : CH1_SELL, mult: s.mult || 1, kitchen: !!s.kitchen, cap: s.cap || SHOP.stockCap, every: s.every || SHOP.every, keeperOk: s.keeper !== false,
          customers: [], spawnT: 2, serveT: 0, depT: 0, collectT: 0, keeperT: 0, inflight: 0, waiting: null, ship: s.ship ? { phase: 'away', t: HARBOR.first, sold: 0, money: 0, buyT: 0, x: 0 } : null,
          tile: place(tileModel({ size: 1.7, mark: 'none', plate: 0xfff1c2, border: 0xd99a1e }), stock.x, stock.z),
        };
        if (sh.ship) {
          // 船は沖から来て、桟橋の先に着く
          sh.ship.mesh = bake(shipModel());
          sh.ship.mesh.visible = false;
          scene.add(sh.ship.mesh);
          sh.ship.dock = { x: d.x + 3.4, z: d.z + 8.4 };
        }
        this.shops.push(sh);
        if (!this.shop) this.shop = sh;
        if (s.kitchen) {
          // 食堂の厨房：お店の黄色いマスにモンスターの素材を入れると料理になり、カウンターに並ぶ
          this.kitchen = { id: 'kitchen', kitchen: true, site, def: KITCHEN, from: INGREDIENTS, to: 'dessert', inPos: stock, tile: sh.tile, shop: sh, inflight: 0, depT: 0, cooking: 0 };
          this.proc.push(this.kitchen);
        }
      }
      if (d.inn) {
        const fur = at(d.inn.fur);
        this.inn = { site, furPos: fur, coinPos: at(d.inn.coins), door: at(d.inn.door), guests: [], spawnT: 3, depT: 0, collectT: 0, waiting: null,
          tile: place(tileModel({ size: 1.7, mark: 'none', plate: 0xf1e2cf, border: 0x8a6a4a }), fur.x, fur.z) };
      }
      if (d.anvil) {
        const pos = at(d.anvil);
        this.anvil = { site, pos, inside: false, tile: place(tileModel({ size: 2.0, mark: 'anvil', plate: 0xe8e1d8, border: 0x5a5e68 }), pos.x, pos.z) };
      }
      if (d.storage) {
        const pos = at(d.storage);
        this.storage = { id: 'storage', site, pos, door: { x: d.x, z: d.z + d.d / 2 + 0.2 }, depT: 0, inflight: 0,
          tile: place(tileModel({ size: 1.8, mark: 'none', plate: 0xf3d9d2, border: 0xa8452f }), pos.x, pos.z) };
      }
    }
    // 焚き火にくべるマス（最初からある）

  }

  st(p) {
    const s = S.stations[p.id] || (S.stations[p.id] = { in: 0, out: 0, t: 0 });
    if (p.from.length > 1 && !s.ink) s.ink = {};
    return s;
  }
  get(id) { return this.proc.find(p => p.id === id); }
  // 施設のレベル（0 = Lv1）と、それで決まる置ける量・速さ
  lv(p) { return S.fac[p.id] || 0; }
  inCap(p) { return Math.round(p.def.inCap * FACILITY.cap[this.lv(p)]); }
  outCap(p) { return Math.round(p.def.outCap * FACILITY.cap[this.lv(p)]); }
  speed(p) { return FACILITY.speed[this.lv(p)]; }
  // レベルに合わせて飾りを付け直す
  refreshDecor(p) {
    const lv = this.lv(p), d = p.site.def;
    if (p.decorLv === lv) return;
    if (p.decor) scene.remove(p.decor);
    p.decorLv = lv; p.decor = null;
    if (lv > 0 && p.site.done) {
      p.decor = bake(facilityDecor(lv, d.w, d.d, [0xc0453a, 0x3f6fb0, 0x4fae45, 0xf5a623][d.id.length % 4]));
      p.decor.position.set(d.x, 0, d.z);
      scene.add(p.decor);
    }
  }
  inCount(p, kind) { const s = this.st(p); return p.from.length > 1 ? (s.ink[kind] || 0) : s.in; }
  shopState(sh) { return sh.id === 'shop' ? S.shop : S[sh.id]; }
  stockTotal(sh = this.shop) { const st = this.shopState(sh); return sh.sells.reduce((n, k) => n + (st.stock[k] || 0), 0); }
  price(sh, kind) { return Math.round(MATERIALS[kind].price * sh.mult); }

  // ---- 倉庫 ----
  storageReady() { return !!(this.storage && this.storage.site.done); }
  storageCount(kind) { return this.storageReady() ? (S.storage[kind] || 0) : 0; }
  storageTotal() { return Object.values(S.storage).reduce((a, b) => a + b, 0); }
  storageLv() { return S.fac.storage || 0; }
  storageCap() { return STORAGE.cap[this.storageLv()]; }
  storageRoom() { return this.storageReady() ? this.storageCap() - this.storageTotal() - this.storage.inflight : 0; }
  // 運び手が倉庫へしまう（扉へ飛んでいく）
  storeOne(c) {
    if (this.storageRoom() <= 0) return false;
    const it = this.items.take(c, () => true);
    if (!it) return false;
    const st = this.storage, kind = it.kind;
    st.inflight++;
    this.items.flyTo(it, st.door.x, 0.6, st.door.z, 0.3, () => { st.inflight--; S.storage[kind] = (S.storage[kind] || 0) + 1; });
    return true;
  }
  // 倉庫から条件に合う素材を1つ出す（倉庫の扉から飛んでいく素材を返す）
  fromStorage(pred) {
    if (!this.storageReady()) return null;
    const kind = Object.keys(S.storage).find(k => S.storage[k] > 0 && pred(k));
    if (!kind) return null;
    S.storage[kind]--;
    const d = this.storage.door;
    return this.items.make(kind, d.x, 1.0, d.z);
  }
  // 背中の素材を n 個使う。足りない分は倉庫から
  useMaterial(c, kind, n) {
    const inBag = Math.min(n, this.items.count(c, kind));
    this.items.consume(c, kind, inBag);
    if (n > inBag) S.storage[kind] = Math.max(0, (S.storage[kind] || 0) - (n - inBag));
  }
  // 背中から（主人公なら倉庫からも）1つ取り出す
  grab(c, player, pred) { return this.items.take(c, pred) || (c === player ? this.fromStorage(pred) : null); }

  // ---- 運び手（主人公・住民）とのやりとり。1個動かせたら true ----
  feedOne(p, c, player, hooks) {
    const st = this.st(p);
    const room = k => this.inCount(p, k) + (p.inflightK && p.inflightK[k] || 0) < this.inCap(p);
    const it = this.grab(c, player, k => p.from.includes(k) && room(k));
    if (!it) return false;
    const kind = it.kind;
    p.inflightK = p.inflightK || {};
    p.inflightK[kind] = (p.inflightK[kind] || 0) + 1;
    this.items.flyTo(it, p.inPos.x + (Math.random() - 0.5) * 0.5, 0.3, p.inPos.z + (Math.random() - 0.5) * 0.5, flyDur(it, p.inPos), () => {
      p.inflightK[kind]--;
      if (p.from.length > 1) st.ink[kind] = (st.ink[kind] || 0) + 1; else st.in++;
      if (c === player) { sfx.deposit(this.inCount(p, kind)); hooks.onFeed(kind); }
    });
    return true;
  }
  takeOne(p, c, player, hooks) {
    const st = this.st(p);
    if (st.out <= 0 || c.bag.length >= c.cap) return false;
    st.out--;
    pileSpot(st.out, p.to, p.outPos.x, p.outPos.z, _v);
    this.items.give(c, p.to, _v.x, _v.y, _v.z);
    if (c === player) { sfx.pickup(c.bag.length); hooks.onTake(p.to); }
    return true;
  }
  stockOne(sh, c, player, hooks) {
    const state = this.shopState(sh);
    if (this.stockTotal(sh) + sh.inflight >= sh.cap) return false;
    const it = this.grab(c, player, k => sh.sells.includes(k));
    if (!it) return false;
    const kind = it.kind;
    sh.inflight++;
    this.counterSpot(sh, this.stockTotal(sh) + sh.inflight - 1, kind, _v);
    this.items.flyTo(it, _v.x, _v.y, _v.z, flyDur(it, _v), () => {
      sh.inflight--; state.stock[kind] = (state.stock[kind] || 0) + 1;
      if (c === player) { sfx.deposit(this.stockTotal(sh)); hooks.onStock(sh.id); }
    });
    return true;
  }

  // カウンターの上の i 番目の商品の場所
  counterSpot(sh, i, kind, out) {
    const c = sh.counter, wide = sh.id === 'shop' ? 6 : sh.ship ? 5 : 10, show = i % (wide * 4);
    const layer = Math.floor(show / (wide * 2)), row = Math.floor(show / wide) % 2, col = show % wide;
    out.x = c.x - (wide - 1) * 0.21 + col * 0.42;
    out.z = c.z + (row - 0.5) * 0.3;
    out.y = c.y + MATERIALS[kind].h * 0.5 + layer * 0.16;
    return out;
  }

  // drawOnly = メニューを開いている間（描くだけ）
  update(dt, time, player, hooks, drawOnly = false) {
    for (const p of this.proc) {
      if (p.kitchen) { this.updateKitchen(p, dt, time, hooks, drawOnly); continue; }
      const done = p.site.done;
      if (p.tile) p.tile.group.visible = done;
      p.outTile.group.visible = done;
      if (!done) continue;
      const st = this.st(p);
      this.refreshDecor(p);
      // Lv4 からは煙突の煙、Lv5 はときどき金色にきらめく
      const lvl = this.lv(p);
      if (lvl >= 3 && !drawOnly) {
        p.smokeT = (p.smokeT || 0) - dt;
        if (p.smokeT <= 0) {
          p.smokeT = 0.6;
          const d = p.site.def;
          burst(d.x + d.w / 2 - 0.6, 3.4, d.z - d.d / 2 + 0.7, { n: 1, colors: [0xe8e4dc, 0xd0cac0], speed: 0.2, up: 0.8, size: 0.3, life: 2.2, g: -0.3, floor: false, grow: 1.4, spread: 0.1 });
          if (lvl >= 4 && Math.random() < 0.3) burst(d.x, 2.6, d.z + d.d / 2, { n: 2, colors: [0xffe066, 0xfff6c0], speed: 0.8, up: 1, size: 0.07, life: 0.8, g: 0, floor: false, spread: 1.4 });
        }
      }
      if (p.gen) {
        // 鉱山：時間で鉱石が出てくる
        if (st.out < this.outCap(p)) {
          st.t += dt * this.speed(p);
          if (st.t >= p.def.every) { st.t = 0; st.out++; hooks.onMake(p.to); burst(p.outPos.x, 0.6, p.outPos.z, { n: 3, colors: [0x7d7069, 0xe0823c], speed: 1.2, up: 2, size: 0.1, life: 0.4 }); }
        }
      } else {
        const ready = p.from.every(k => this.inCount(p, k) > 0);
        if (ready && st.out < this.outCap(p)) {
          st.t += dt * this.speed(p);
          if (st.t >= p.def.time) {
            st.t = 0; st.out++;
            if (p.from.length > 1) for (const k of p.from) st.ink[k]--; else st.in--;
            hooks.onMake(p.to);
            burst(p.site.def.x, 1.2, p.site.def.z, { n: 3, colors: [MATERIALS[p.to].color === 0xffffff ? 0xe8506a : MATERIALS[p.to].color, 0xffffff], speed: 1.2, up: 2, size: 0.1, life: 0.5 });
          }
        }
        p.tile.inner.material.opacity = 0.3 + (ready ? Math.sin(time * 6) * 0.1 : 0);
        if (!drawOnly && player.alive && near(player.pos, p.inPos.x, p.inPos.z, 0.95)) {
          p.depT -= dt;
          while (p.depT <= 0) { p.depT += 0.07; if (!this.feedOne(p, player, player, hooks)) { p.depT = 0; break; } }
        } else p.depT = 0;
        // 入口の山（材料ごとに並べる）
        p.from.forEach((k, j) => {
          const ox = p.from.length > 1 ? (j - 0.5) * 0.75 : 0;
          for (let i = 0; i < Math.min(this.inCount(p, k), p.from.length > 1 ? 6 : 12); i++) { pileSpot(i, k, p.inPos.x + ox, p.inPos.z, _v); if (p.from.length > 1) _v.x = p.inPos.x + ox + ((i % 2) - 0.5) * 0.3; this.items.draw(k, _v.x, _v.y, _v.z, 0); }
        });
      }
      if (!drawOnly && player.alive && Math.hypot(player.pos.x - p.outPos.x, player.pos.z - p.outPos.z) < 1.3) {
        p.pickT -= dt;
        while (p.pickT <= 0) {
          p.pickT += 0.08;
          if (!this.takeOne(p, player, player, hooks)) { if (st.out > 0 && player.bag.length >= player.cap) hooks.onFull(); p.pickT = 0; break; }
        }
      } else p.pickT = 0;
      for (let i = 0; i < Math.min(st.out, 40); i++) { pileSpot(i, p.to, p.outPos.x, p.outPos.z, _v); this.items.draw(p.to, _v.x, _v.y, _v.z, 0); }
    }
    // 鍛冶屋の台
    if (this.anvil) {
      const a = this.anvil, done = a.site.done;
      a.tile.group.visible = done;
      if (done && !drawOnly) {
        a.tile.mark.position.y = 0.1 + Math.sin(time * 3) * 0.06;
        const inside = player.alive && near(player.pos, a.pos.x, a.pos.z, 1.0);
        if (inside && !a.inside) hooks.onAnvil();
        a.inside = inside;
      }
    }
    if (!drawOnly) this.updateStorage(dt, time, player, hooks);
    for (const sh of this.shops) this.updateShop(sh, dt, time, player, hooks, drawOnly);
    this.updateInn(dt, time, player, hooks, drawOnly);
  }

  // 厨房が今ほしい材料（倉庫にあって、厨房に空きがあるもの）
  kitchenWants(c = null) {
    const k = this.kitchen;
    if (!k || !k.site.done || !this.storageReady()) return null;
    // m と組み合わせる材料が（厨房と倉庫に）あと何個あるか。その数までしか運ばない
    const have = x => this.inCount(k, x) + (S.storage[x] || 0);
    const pairs = m => Math.max(0, ...RECIPES.filter(r => r.need[m]).map(r => Math.min(Infinity, ...Object.keys(r.need).filter(x => x !== m).map(have))));
    return INGREDIENTS.find(m => {
      if (!(S.storage[m] > 0)) return false;
      const n = this.inCount(k, m) + (c ? this.items.count(c, m) : 0);
      return n < this.inCap(k) && n < pairs(m);
    }) || null;
  }
  // 材料がそろっている中で いちばん高い料理
  recipeFor(k) { return RECIPES.find(r => Object.keys(r.need).every(m => this.inCount(k, m) >= r.need[m])) || null; }

  // 厨房：材料から料理を作り、できた料理はカウンターへ飛んでいく
  updateKitchen(p, dt, time, hooks, drawOnly) {
    const sh = p.shop;
    if (!p.site.done) return;
    const st = this.st(p);
    this.refreshDecor(p);
    const room = this.stockTotal(sh) + sh.inflight < this.outCap(p);
    const r = this.recipeFor(p);
    p.cooking = r && room ? r.id : null;
    if (!drawOnly && r && room) {
      st.t += dt * this.speed(p);
      if (st.t >= p.def.time) {
        st.t = 0;
        for (const m in r.need) st.ink[m] -= r.need[m];
        const d = sh.site.def;
        burst(d.x - 0.8, 1.6, d.z - 0.4, { n: 4, colors: [0xffffff, 0xf0ece4], speed: 0.4, up: 1.2, size: 0.18, life: 1.0, g: -0.5, floor: false, grow: 1 });
        sh.inflight++;
        this.counterSpot(sh, this.stockTotal(sh) + sh.inflight - 1, r.id, _v);
        const it = this.items.make(r.id, p.inPos.x, 0.6, p.inPos.z);
        this.items.flyTo(it, _v.x, _v.y, _v.z, 0.45, () => { sh.inflight--; S.shop.stock[r.id] = (S.shop.stock[r.id] || 0) + 1; sfx.pop(); });
        hooks.onCook(r.id);
      }
    }
    // 厨房のマスの上に材料の山
    let i = 0;
    for (const m of INGREDIENTS) for (let j = 0; j < Math.min(this.inCount(p, m), 4) && i < 16; j++, i++) { pileSpot(i, m, p.inPos.x, p.inPos.z, _v); this.items.draw(m, _v.x, _v.y, _v.z, 0); }
  }

  // 倉庫：マスに立つと背中の素材をぜんぶ預ける
  updateStorage(dt, time, player, hooks) {
    const st = this.storage;
    if (!st) return;
    st.tile.group.visible = st.site.done;
    if (!st.site.done) return;
    this.refreshDecor(st);
    const on = player.alive && near(player.pos, st.pos.x, st.pos.z, 0.95);
    st.tile.inner.material.opacity = on ? 0.55 + Math.sin(time * 10) * 0.15 : 0.3;
    if (!on) { st.depT = 0; return; }
    st.depT -= dt;
    while (st.depT <= 0) {
      st.depT += 0.05;
      if (this.storageTotal() + st.inflight >= this.storageCap()) { hooks.onStorageFull(); st.depT = 0; break; }
      const it = this.items.take(player, () => true);
      if (!it) { st.depT = 0; break; }
      const kind = it.kind;
      st.inflight++;
      this.items.flyTo(it, st.door.x, 0.6, st.door.z, 0.3, () => { st.inflight--; S.storage[kind] = (S.storage[kind] || 0) + 1; sfx.deposit(this.storageTotal()); });
    }
  }

  // 人を門からある場所へ歩かせる。着いたら true
  walk(c, dt, speed = 2.4) {
    const d = Math.hypot(c.tx - c.x, c.tz - c.z);
    c.moving = d > 0.12 ? 1 : 0;
    if (!c.moving) return true;
    // 建物がじゃまなら、角を回って進む
    const wp = this.world ? this.world.steer(c, c.tx, c.tz) : null;
    const gx = wp ? wp.x : c.tx, gz = wp ? wp.z : c.tz;
    const dx = gx - c.x, dz = gz - c.z, dd = Math.hypot(dx, dz) || 1;
    const sp = Math.min(dd, speed * dt);
    c.x += dx / dd * sp; c.z += dz / dd * sp; c.walk += dt * 10;
    c.yaw = Math.atan2(dx, dz);
    return false;
  }

  // 積もったコインを主人公が受け取る
  collect(pos, state, player, hooks, holder, dt) {
    if (player.alive && state.coins > 0 && Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z) < 1.6) {
      holder.collectT -= dt;
      while (holder.collectT <= 0 && state.coins > 0) {
        holder.collectT += 0.03;
        const n = Math.min(state.coins, Math.max(1, Math.ceil(state.coins / 25)));
        state.coins -= n;
        this.coins.send(pos.x, 0.4, pos.z, () => ({ x: player.pos.x, y: 1.2, z: player.pos.z }), 0.3, () => hooks.onCoin(n), 0.9);
      }
    } else holder.collectT = 0;
  }
  payTo(fx, fz, pos, money, state) {
    const pieces = Math.min(6, money);
    for (let k = 0; k < pieces; k++) {
      const part = k === pieces - 1 ? money - Math.floor(money / pieces) * (pieces - 1) : Math.floor(money / pieces);
      this.coins.send(fx, 1.1, fz, () => ({ x: pos.x, y: 0.3, z: pos.z }), 0.4 + k * 0.05, () => { state.coins += part; }, 1.0);
    }
  }

  updateShop(sh, dt, time, player, hooks, drawOnly) {
    sh.tile.group.visible = sh.site.done;
    if (!sh.site.done) return;
    const state = this.shopState(sh);
    if (!drawOnly) {
      // 主人公が商品を並べる（食堂は厨房へ材料を入れる）
      if (player.alive && near(player.pos, sh.stock.x, sh.stock.z, 0.95)) {
        sh.depT -= dt;
        while (sh.depT <= 0) { sh.depT += 0.07; if (!(sh.kitchen ? this.feedOne(this.kitchen, player, player, hooks) : this.stockOne(sh, player, player, hooks))) { sh.depT = 0; break; } }
      } else sh.depT = 0;
      if (sh.ship) this.updateShip(sh, dt, time, hooks);
      // 客が来る
      const keeper = sh.keeperOk && !sh.ship ? hooks.keeper() : null;
      sh.spawnT -= dt;
      if (!sh.ship && sh.spawnT <= 0 && sh.customers.length < SHOP.queue) {
        sh.spawnT = (keeper ? SHOP.everyKeeper / hooks.keeperBoost() : sh.every) * (0.75 + Math.random() * 0.5);
        const g = this.gate;
        sh.customers.push({ x: g.x + (Math.random() - 0.5) * 1.5, z: g.z + 4, yaw: Math.PI, walk: 0, moving: 0, state: 'come', color: new THREE.Color(SHIRTS[(Math.random() * SHIRTS.length) | 0]), want: SHOP.buy[0] + Math.floor(Math.random() * (SHOP.buy[1] - SHOP.buy[0] + 1)) });
      }
      const queue = sh.customers.filter(c => c.state !== 'leave');
      queue.forEach((c, i) => { c.tx = sh.queue.x; c.tz = sh.queue.z + i * 0.95; });
      sh.waiting = null;
      const front = queue[0];
      if (front && Math.hypot(front.x - front.tx, front.z - front.tz) < 0.15) {
        if (this.stockTotal(sh) > 0) {
          sh.serveT += dt * (keeper ? 1.6 * hooks.keeperBoost() : 1);
          if (sh.serveT >= SHOP.serve) { sh.serveT = 0; this.sell(sh, front, hooks); }
        } else sh.waiting = front;
      }
      for (let i = sh.customers.length - 1; i >= 0; i--) {
        const c = sh.customers[i];
        if (c.state === 'leave') { c.tx = this.gate.x + (c.x < this.gate.x ? -0.5 : 0.5); c.tz = this.gate.z + 5; }
        const arrived = this.walk(c, dt);
        if (arrived && c.state !== 'leave') c.yaw = Math.PI; // お店の方を向く
        if (c.state === 'leave' && Math.hypot(c.tx - c.x, c.tz - c.z) < 0.3) sh.customers.splice(i, 1);
      }
      this.collect(sh.coinPos, state, player, hooks, sh, dt);
      // 店番がいれば、たまったコインを自動で集める
      if (keeper && state.coins > 0) {
        sh.keeperT += dt;
        if (sh.keeperT > 2.5) {
          sh.keeperT = 0;
          const n = state.coins; state.coins = 0;
          this.coins.send(sh.coinPos.x, 0.4, sh.coinPos.z, () => ({ x: keeper.x, y: 1.2, z: keeper.z }), 0.4, () => hooks.onCoin(n, true), 0.8);
        }
      }
    }
    // 描く
    let i = 0;
    const max = sh.id === 'shop' ? 24 : 40;
    for (const k of sh.sells) for (let j = 0; j < (state.stock[k] || 0) && i < max; j++, i++) { this.counterSpot(sh, i, k, _v); this.items.draw(k, _v.x, _v.y, _v.z, 0); }
    this.coins.pile(state.coins, sh.coinPos.x, sh.coinPos.z);
  }

  // 船：沖で待つ → 入港 → 船着き場の商品をまとめて買う → 出港
  updateShip(sh, dt, time, hooks) {
    const sp = sh.ship, m = sp.mesh, dock = sp.dock, far = 46;
    m.visible = sp.phase !== 'away';
    sp.t -= dt;
    if (sp.phase === 'away') {
      if (sp.t <= 0) { sp.phase = 'arrive'; sp.t = HARBOR.sail; sp.sold = 0; sp.money = 0; hooks.onShipArrive(); }
    } else if (sp.phase === 'arrive') {
      const k = 1 - Math.max(0, sp.t) / HARBOR.sail;
      sp.x = dock.x + far * Math.pow(1 - k, 2);
      if (sp.t <= 0) { sp.phase = 'dock'; sp.t = HARBOR.stay; sp.x = dock.x; }
    } else if (sp.phase === 'dock') {
      const state = this.shopState(sh);
      sp.buyT -= dt;
      while (sp.buyT <= 0 && sp.sold < HARBOR.buy) {
        sp.buyT += 0.1;
        const avail = sh.sells.filter(k => (state.stock[k] || 0) > 0);
        if (!avail.length) { sp.buyT = 0; break; }
        const kind = avail[(Math.random() * avail.length) | 0];
        state.stock[kind]--;
        this.counterSpot(sh, this.stockTotal(sh), kind, _v);
        const it = this.items.make(kind, _v.x, _v.y, _v.z);
        this.items.flyTo(it, dock.x + (Math.random() - 0.5) * 2, 1.4, dock.z, 0.45, null);
        sp.sold++; sp.money += this.price(sh, kind);
        if (sp.sold % 4 === 0) sfx.sell();
      }
      if (sp.t <= 0) {
        if (sp.sold) {
          this.payTo(dock.x, dock.z, sh.coinPos, sp.money, this.shopState(sh));
          floatText('+' + sp.money, dock.x, 3, dock.z, 'coin');
          S.stats.sold += sp.sold;
          hooks.onShip(sp.sold, sp.money);
        }
        sp.phase = 'leave'; sp.t = HARBOR.sail;
      }
    } else if (sp.phase === 'leave') {
      const k = 1 - Math.max(0, sp.t) / HARBOR.sail;
      sp.x = dock.x + far * k * k;
      if (sp.t <= 0) { sp.phase = 'away'; sp.t = HARBOR.every; }
    }
    m.position.set(sp.x, -0.25 + Math.sin(time * 1.4) * 0.08, dock.z);
    m.rotation.z = Math.sin(time * 1.1) * 0.03;
    m.rotation.x = Math.sin(time * 0.9) * 0.02;
  }

  sell(sh, c, hooks) {
    const state = this.shopState(sh);
    let n = 0, money = 0;
    for (let k = 0; k < c.want; k++) {
      const avail = sh.sells.filter(s => (state.stock[s] || 0) > 0);
      if (!avail.length) break;
      const kind = avail[(Math.random() * avail.length) | 0];
      state.stock[kind]--; n++; money += this.price(sh, kind);
    }
    if (!n) return;
    c.state = 'leave';
    S.stats.sold += n;
    this.payTo(c.x, c.z, sh.coinPos, money, state);
    floatText('+' + money, c.x, 1.9, c.z, 'coin');
    sfx.sell();
    hooks.onSell(n, money);
  }

  // 宿屋：旅人が門から来て、毛皮の毛布があれば泊まってコインを払う
  updateInn(dt, time, player, hooks, drawOnly) {
    const inn = this.inn;
    if (!inn) return;
    inn.tile.group.visible = inn.site.done;
    if (!inn.site.done) return;
    if (!drawOnly) {
      if (player.alive && near(player.pos, inn.furPos.x, inn.furPos.z, 0.95)) {
        inn.depT -= dt;
        while (inn.depT <= 0) {
          inn.depT += 0.07;
          if (S.inn.fur + (inn.inflight || 0) >= INN.furCap) { inn.depT = 0; break; }
          const it = this.grab(player, player, k => k === 'fur');
          if (!it) { inn.depT = 0; break; }
          inn.inflight = (inn.inflight || 0) + 1;
          this.items.flyTo(it, inn.furPos.x, 0.3, inn.furPos.z, flyDur(it, inn.furPos), () => { inn.inflight--; S.inn.fur++; sfx.deposit(S.inn.fur); hooks.onFeed('fur'); });
        }
      } else inn.depT = 0;
      inn.spawnT -= dt;
      if (inn.spawnT <= 0 && inn.guests.length < INN.guests) {
        inn.spawnT = INN.every * (0.8 + Math.random() * 0.4);
        const g = this.gate;
        inn.guests.push({ x: g.x + (Math.random() - 0.5) * 1.5, z: g.z + 4, yaw: Math.PI, walk: 0, moving: 0, state: 'come', t: 0, color: new THREE.Color(TRAVELERS[(Math.random() * TRAVELERS.length) | 0]) });
      }
      const line = inn.guests.filter(c => c.state === 'come');
      line.forEach((c, i) => { c.tx = inn.door.x + i * 0.85; c.tz = inn.door.z + 0.8 + (i ? 0.3 : 0); });
      inn.waiting = null;
      for (let i = inn.guests.length - 1; i >= 0; i--) {
        const c = inn.guests[i];
        if (c.state === 'come') {
          const arrived = this.walk(c, dt);
          if (arrived && c === line[0]) {
            if (S.inn.fur > 0) { S.inn.fur--; c.state = 'stay'; c.t = INN.stay; burst(inn.door.x, 1, inn.door.z, { n: 6, colors: [0xffffff, 0xffe7a0], speed: 1, up: 2, size: 0.08, life: 0.5 }); }
            else { inn.waiting = c; c.yaw = Math.PI; }
          }
        } else if (c.state === 'stay') {
          c.t -= dt;
          if (c.t <= 0) {
            c.state = 'leave'; c.x = inn.door.x; c.z = inn.door.z + 0.6;
            this.payTo(c.x, c.z, inn.coinPos, INN.pay, S.inn);
            floatText('+' + INN.pay, c.x, 1.9, c.z, 'coin');
            sfx.sell();
            hooks.onGuest();
          }
        } else {
          c.tx = this.gate.x; c.tz = this.gate.z + 5;
          this.walk(c, dt);
          if (Math.hypot(c.tx - c.x, c.tz - c.z) < 0.3) inn.guests.splice(i, 1);
        }
      }
      this.collect(inn.coinPos, S.inn, player, hooks, inn, dt);
    }
    for (let i = 0; i < Math.min(S.inn.fur, 12); i++) { pileSpot(i, 'fur', inn.furPos.x, inn.furPos.z, _v); this.items.draw('fur', _v.x, _v.y, _v.z, 0); }
    this.coins.pile(S.inn.coins, inn.coinPos.x, inn.coinPos.z);
  }

  renderPeople(rig, blobs) {
    const people = [];
    for (const sh of this.shops) if (sh.site.done) people.push(...sh.customers);
    if (this.inn && this.inn.site.done) people.push(...this.inn.guests.filter(g => g.state !== 'stay'));
    for (const c of people) {
      const s = Math.sin(c.walk) * 0.7 * c.moving;
      ang[0] = s; ang[1] = -s; ang[6] = -s; ang[7] = s;
      _m.compose(_v.set(c.x, Math.abs(Math.cos(c.walk)) * 0.06 * c.moving, c.z), _q.setFromAxisAngle(UP, c.yaw), _s);
      rig.push(_m, ang, c.color);
      blobs.push(c.x, c.z, 0.35);
    }
  }
  peopleCount() {
    let n = 0;
    for (const sh of this.shops) if (sh.site.done) n += sh.customers.length;
    if (this.inn && this.inn.site.done) n += this.inn.guests.length;
    return n;
  }

  // 留守の間の売上（最大8時間）。refill = 住民が補充する速さ（個/秒）と1個の値段
  offline(sec, refill) {
    sec = Math.min(sec, SHOP.offlineMax);
    let sold = 0, money = 0;
    const open = this.shops.filter(sh => sh.site.done);
    open.forEach((sh, idx) => {
      const state = this.shopState(sh);
      const keeper = sh.keeperOk && S.hired.includes('keeper');
      const rate = sh.ship ? HARBOR.buy / HARBOR.every : (SHOP.buy[0] + SHOP.buy[1]) / 2 / (keeper ? SHOP.everyKeeper : sh.every);
      const extra = idx === open.length - 1 ? refill.rate * sec : 0;   // 補充は一番新しいお店へ
      const n = Math.floor(Math.min(rate * sec, this.stockTotal(sh) + extra));
      let left = n;
      for (const k of sh.sells) { const m = Math.min(left, state.stock[k] || 0); state.stock[k] = (state.stock[k] || 0) - m; left -= m; money += m * this.price(sh, k); }
      money += left * Math.round(refill.price * sh.mult);
      sold += n;
    });
    if (this.inn && this.inn.site.done) {
      const guests = Math.floor(Math.min(S.inn.fur, sec / INN.every));
      S.inn.fur -= guests; sold += guests; money += guests * INN.pay;
    }
    if (!open.length && !(this.inn && this.inn.site.done)) return null;
    S.stats.sold += sold;
    return { sec, sold, money };
  }
}
