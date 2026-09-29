// 建物の働き：加工場（入口に素材→時間で加工品が出口に積もる）・お店（客が並んで買い、コインが積もる）・鍛冶屋の台
import * as THREE from './lib/three.module.min.js';
import { scene } from './gfx.js';
import { tileModel } from './models.js';
import { MATERIALS, SHOP, STORAGE } from './data.js';
import { S } from './state.js';
import { pileSpot } from './items.js';
import { burst, floatText } from './fx.js';
import { sfx } from './audio.js';

const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const SHIRTS = [0xf28b50, 0x5fb3e8, 0xe86a8a, 0x8bd16a, 0xf5c542, 0xa98bf0, 0x6fd6c4];
const ang = [0, 0, 0, 0, 0, 0, 0, 0];
const near = (a, x, z, h) => Math.abs(a.x - x) < h && Math.abs(a.z - z) < h;
const SELL = Object.keys(MATERIALS).filter(k => MATERIALS[k].price);
// 遠くから飛ぶときは少し長く
const flyDur = (it, to) => 0.3 + Math.min(0.5, Math.hypot(it.p.x - to.x, it.p.z - to.z) * 0.025);

export class Stations {
  constructor(ch, builds, items, coins) {
    this.items = items; this.coins = coins;
    this.proc = []; this.shop = null; this.anvil = null;
    this.gate = ch.gate;
    for (const site of builds.sites) {
      const d = site.def;
      if (d.process) {
        const p = d.process;
        const tile = tileModel({ size: 1.7, mark: 'none', plate: 0xdcefff, border: 0x5f86b0 });
        const inPos = { x: d.x + p.input[0], z: d.z + p.input[1] }, outPos = { x: d.x + p.output[0], z: d.z + p.output[1] };
        tile.group.position.set(inPos.x, 0, inPos.z);
        scene.add(tile.group);
        const outTile = tileModel({ size: 1.5, mark: 'none', plate: 0xe9dcc4, border: 0xa98a64 });
        outTile.group.position.set(outPos.x, -0.02, outPos.z);
        scene.add(outTile.group);
        this.proc.push({ id: d.id, site, def: p, from: p.from, to: p.to, inPos, outPos, tile, outTile, inflight: 0, depT: 0, pickT: 0, puff: 0 });
      }
      if (d.shop) {
        const s = d.shop;
        const tile = tileModel({ size: 1.7, mark: 'none', plate: 0xfff1c2, border: 0xd99a1e });
        const stock = { x: d.x + s.stock[0], z: d.z + s.stock[1] };
        tile.group.position.set(stock.x, 0, stock.z);
        scene.add(tile.group);
        this.shop = {
          site, tile, stock, coinPos: { x: d.x + s.coins[0], z: d.z + s.coins[1] }, queue: { x: d.x + s.queue[0], z: d.z + s.queue[1] },
          counter: { x: d.x + s.counter[0], y: s.counter[1], z: d.z + s.counter[2] },
          customers: [], spawnT: 2, serveT: 0, depT: 0, collectT: 0, keeperT: 0, inflight: 0,
        };
      }
      if (d.anvil) {
        const tile = tileModel({ size: 2.0, mark: 'anvil', plate: 0xe8e1d8, border: 0x5a5e68 });
        const pos = { x: d.x + d.anvil[0], z: d.z + d.anvil[1] };
        tile.group.position.set(pos.x, 0, pos.z);
        scene.add(tile.group);
        this.anvil = { site, tile, pos, inside: false };
      }
      if (d.storage) {
        const tile = tileModel({ size: 1.8, mark: 'none', plate: 0xf3d9d2, border: 0xa8452f });
        const pos = { x: d.x + d.storage[0], z: d.z + d.storage[1] };
        tile.group.position.set(pos.x, 0, pos.z);
        scene.add(tile.group);
        this.storage = { site, tile, pos, door: { x: d.x, z: d.z + d.d / 2 + 0.2 }, depT: 0, inflight: 0 };
      }
    }
    // 焚き火にくべるマス（最初からある）
    const bt = tileModel({ size: 1.5, mark: 'none', plate: 0xffd9b0, border: 0xd9642a });
    bt.group.position.set(ch.burn[0], 0, ch.burn[1]);
    scene.add(bt.group);
    this.burn = { tile: bt, pos: { x: ch.burn[0], z: ch.burn[1] }, fire: { x: ch.campfire[0], z: ch.campfire[1] }, hold: 0, depT: 0, told: false };
  }

  // ---- 倉庫 ----
  storageReady() { return !!(this.storage && this.storage.site.done); }
  storageCount(kind) { return this.storageReady() ? (S.storage[kind] || 0) : 0; }
  storageTotal() { return Object.values(S.storage).reduce((a, b) => a + b, 0); }
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

  st(p) { return S.stations[p.id] || (S.stations[p.id] = { in: 0, out: 0, t: 0 }); }
  get(id) { return this.proc.find(p => p.id === id); }
  stockTotal() { return SELL.reduce((n, k) => n + (S.shop.stock[k] || 0), 0); }

  // ---- 運び手（主人公・住民）とのやりとり。1個動かせたら true ----
  feedOne(p, c, player, hooks) {
    const st = this.st(p);
    if (st.in + p.inflight >= p.def.inCap) return false;
    const it = this.items.take(c, k => k === p.from) || (c === player ? this.fromStorage(k => k === p.from) : null);
    if (!it) return false;
    p.inflight++;
    this.items.flyTo(it, p.inPos.x + (Math.random() - 0.5) * 0.5, 0.3, p.inPos.z + (Math.random() - 0.5) * 0.5, flyDur(it, p.inPos), () => {
      p.inflight--; st.in++;
      if (c === player) { sfx.deposit(st.in); hooks.onFeed(p.from); }
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
  stockOne(c, player, hooks) {
    const sh = this.shop;
    if (this.stockTotal() + sh.inflight >= SHOP.stockCap) return false;
    const it = this.items.take(c, k => !!MATERIALS[k].price) || (c === player ? this.fromStorage(k => !!MATERIALS[k].price) : null);
    if (!it) return false;
    const kind = it.kind;
    sh.inflight++;
    this.counterSpot(this.stockTotal() + sh.inflight - 1, kind, _v);
    this.items.flyTo(it, _v.x, _v.y, _v.z, flyDur(it, _v), () => {
      sh.inflight--; S.shop.stock[kind] = (S.shop.stock[kind] || 0) + 1;
      if (c === player) { sfx.deposit(this.stockTotal()); hooks.onStock(); }
    });
    return true;
  }

  // カウンターの上の i 番目の商品の場所
  counterSpot(i, kind, out) {
    const c = this.shop.counter, show = i % 24;
    const layer = Math.floor(show / 12), row = Math.floor(show / 6) % 2, col = show % 6;
    out.x = c.x - 1.05 + col * 0.42;
    out.z = c.z + (row - 0.5) * 0.3;
    out.y = c.y + MATERIALS[kind].h * 0.5 + layer * 0.16;
    return out;
  }

  // drawOnly = メニューを開いている間（描くだけ）
  update(dt, time, player, hooks, drawOnly = false) {
    // 加工場
    for (const p of this.proc) {
      const done = p.site.done;
      p.tile.group.visible = done; p.outTile.group.visible = done;
      if (!done) continue;
      const st = this.st(p);
      if (st.in > 0 && st.out < p.def.outCap) {
        st.t += dt;
        if (st.t >= p.def.time) {
          st.t = 0; st.in--; st.out++;
          hooks.onMake(p.to);
          burst(p.site.def.x, 1.2, p.site.def.z, { n: 3, colors: p.to === 'plank' ? [0xf2d9a8, 0xe0b07a] : [0xe6e2da, 0xc9c4ba], speed: 1.2, up: 2, size: 0.1, life: 0.5 });
        }
      }
      p.tile.inner.material.opacity = 0.3 + (st.in > 0 ? Math.sin(time * 6) * 0.1 : 0);
      if (player.alive && near(player.pos, p.inPos.x, p.inPos.z, 0.95)) {
        p.depT -= dt;
        while (p.depT <= 0) { p.depT += 0.07; if (!this.feedOne(p, player, player, hooks)) { p.depT = 0; break; } }
      } else p.depT = 0;
      if (player.alive && Math.hypot(player.pos.x - p.outPos.x, player.pos.z - p.outPos.z) < 1.3) {
        p.pickT -= dt;
        while (p.pickT <= 0) {
          p.pickT += 0.08;
          if (!this.takeOne(p, player, player, hooks)) { if (st.out > 0 && player.bag.length >= player.cap) hooks.onFull(); p.pickT = 0; break; }
        }
      } else p.pickT = 0;
      // 山を描く
      for (let i = 0; i < Math.min(st.in, 12); i++) { pileSpot(i, p.from, p.inPos.x, p.inPos.z, _v); this.items.draw(p.from, _v.x, _v.y, _v.z, 0); }
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
    if (!drawOnly) { this.updateBurn(dt, time, player, hooks); this.updateStorage(dt, time, player, hooks); }
    this.updateShop(dt, time, player, hooks);
  }

  // 焚き火にくべる：少し立っていると、今使わない素材から燃やす
  updateBurn(dt, time, player, hooks) {
    const b = this.burn;
    const on = player.alive && near(player.pos, b.pos.x, b.pos.z, 0.8);
    b.tile.inner.material.opacity = on ? 0.35 + Math.min(1, b.hold / 0.6) * 0.4 : 0.25 + Math.sin(time * 3) * 0.06;
    if (!on) { b.hold = 0; b.depT = 0; b.told = false; return; }
    b.hold += dt;
    if (b.hold < 0.6) return;
    const need = hooks.neededKinds();
    b.depT -= dt;
    while (b.depT <= 0) {
      b.depT += 0.06;
      const it = this.items.take(player, k => !need.has(k));
      if (!it) {
        if (!b.told && player.bag.length) { b.told = true; hooks.onBurnNone(); }
        b.depT = 0; break;
      }
      this.items.flyTo(it, b.fire.x, 0.5, b.fire.z, 0.35, () => {
        burst(b.fire.x, 0.7, b.fire.z, { n: 5, colors: [0xff7a2a, 0xffb23a, 0xffe46a, 0x555555], speed: 1.5, up: 4, size: 0.12, life: 0.6, g: -2, floor: false });
        hooks.onBurn();
      });
    }
  }

  // 倉庫：マスに立つと背中の素材をぜんぶ預ける
  updateStorage(dt, time, player, hooks) {
    const st = this.storage;
    if (!st) return;
    st.tile.group.visible = st.site.done;
    if (!st.site.done) return;
    const on = player.alive && near(player.pos, st.pos.x, st.pos.z, 0.95);
    st.tile.inner.material.opacity = on ? 0.55 + Math.sin(time * 10) * 0.15 : 0.3;
    if (!on) { st.depT = 0; return; }
    st.depT -= dt;
    while (st.depT <= 0) {
      st.depT += 0.05;
      if (this.storageTotal() + st.inflight >= STORAGE.cap) { hooks.onStorageFull(); st.depT = 0; break; }
      const it = this.items.take(player, () => true);
      if (!it) { st.depT = 0; break; }
      const kind = it.kind;
      st.inflight++;
      this.items.flyTo(it, st.door.x, 0.6, st.door.z, 0.3, () => { st.inflight--; S.storage[kind] = (S.storage[kind] || 0) + 1; sfx.deposit(this.storageTotal()); });
    }
  }

  updateShop(dt, time, player, hooks) {
    const sh = this.shop;
    if (!sh) return;
    sh.tile.group.visible = sh.site.done;
    if (!sh.site.done) return;
    // 主人公が商品を並べる
    if (player.alive && near(player.pos, sh.stock.x, sh.stock.z, 0.95)) {
      sh.depT -= dt;
      while (sh.depT <= 0) { sh.depT += 0.07; if (!this.stockOne(player, player, hooks)) { sh.depT = 0; break; } }
    } else sh.depT = 0;
    // 客が来る
    const keeper = hooks.keeper();
    sh.spawnT -= dt;
    if (sh.spawnT <= 0 && sh.customers.length < SHOP.queue) {
      sh.spawnT = (keeper ? SHOP.everyKeeper : SHOP.every) * (0.75 + Math.random() * 0.5);
      const g = this.gate;
      sh.customers.push({ x: g.x + (Math.random() - 0.5) * 1.5, z: g.z + 4, yaw: Math.PI, walk: 0, moving: 0, state: 'come', color: new THREE.Color(SHIRTS[(Math.random() * SHIRTS.length) | 0]), want: SHOP.buy[0] + Math.floor(Math.random() * (SHOP.buy[1] - SHOP.buy[0] + 1)) });
    }
    const queue = sh.customers.filter(c => c.state !== 'leave');
    queue.forEach((c, i) => { c.tx = sh.queue.x; c.tz = sh.queue.z + i * 0.95; });
    sh.waiting = null;
    const front = queue[0];
    if (front && Math.hypot(front.x - front.tx, front.z - front.tz) < 0.15) {
      if (this.stockTotal() > 0) {
        sh.serveT += dt * (keeper ? 1.6 : 1);
        if (sh.serveT >= SHOP.serve) { sh.serveT = 0; this.sell(front, hooks); }
      } else sh.waiting = front;
    }
    for (let i = sh.customers.length - 1; i >= 0; i--) {
      const c = sh.customers[i];
      if (c.state === 'leave') { c.tx = this.gate.x + (c.x < this.gate.x ? -0.5 : 0.5); c.tz = this.gate.z + 5; }
      const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
      c.moving = d > 0.12 ? 1 : 0;
      if (c.moving) {
        const sp = Math.min(d, 2.4 * dt);
        c.x += dx / d * sp; c.z += dz / d * sp; c.walk += dt * 10;
        c.yaw = Math.atan2(dx, dz);
      } else if (c.state !== 'leave') c.yaw = Math.PI; // お店の方を向く
      if (c.state === 'leave' && d < 0.3) sh.customers.splice(i, 1);
    }
    // コインを受け取る
    const cp = sh.coinPos;
    if (player.alive && S.shop.coins > 0 && Math.hypot(player.pos.x - cp.x, player.pos.z - cp.z) < 1.6) {
      sh.collectT -= dt;
      while (sh.collectT <= 0 && S.shop.coins > 0) {
        sh.collectT += 0.03;
        const n = Math.min(S.shop.coins, Math.max(1, Math.ceil(S.shop.coins / 25)));
        S.shop.coins -= n;
        this.coins.send(cp.x, 0.4, cp.z, () => ({ x: player.pos.x, y: 1.2, z: player.pos.z }), 0.3, () => hooks.onCoin(n), 0.9);
      }
    } else sh.collectT = 0;
    // 店番がいれば、たまったコインを自動で集める
    if (keeper && S.shop.coins > 0) {
      sh.keeperT += dt;
      if (sh.keeperT > 2.5) {
        sh.keeperT = 0;
        const n = S.shop.coins; S.shop.coins = 0;
        this.coins.send(cp.x, 0.4, cp.z, () => ({ x: keeper.x, y: 1.2, z: keeper.z }), 0.4, () => hooks.onCoin(n, true), 0.8);
      }
    }
    // 描く
    let i = 0;
    for (const k of SELL) for (let j = 0; j < (S.shop.stock[k] || 0) && i < 24; j++, i++) { this.counterSpot(i, k, _v); this.items.draw(k, _v.x, _v.y, _v.z, 0); }
    this.coins.pile(S.shop.coins, cp.x, cp.z);
  }

  sell(c, hooks) {
    let n = 0, money = 0;
    for (let k = 0; k < c.want; k++) {
      const avail = SELL.filter(s => (S.shop.stock[s] || 0) > 0);
      if (!avail.length) break;
      const kind = avail[(Math.random() * avail.length) | 0];
      S.shop.stock[kind]--; n++; money += MATERIALS[kind].price;
    }
    if (!n) return;
    c.state = 'leave';
    S.stats.sold += n;
    const cp = this.shop.coinPos;
    const pieces = Math.min(6, money);
    for (let k = 0; k < pieces; k++) {
      const last = k === pieces - 1, part = last ? money - Math.floor(money / pieces) * (pieces - 1) : Math.floor(money / pieces);
      this.coins.send(c.x, 1.1, c.z, () => ({ x: cp.x, y: 0.3, z: cp.z }), 0.4 + k * 0.05, () => { S.shop.coins += part; }, 1.0);
    }
    floatText('+' + money, c.x, 1.9, c.z, 'coin');
    sfx.sell();
    hooks.onSell(n, money);
  }

  renderPeople(rig, blobs) {
    const sh = this.shop;
    if (!sh || !sh.site.done) return;
    for (const c of sh.customers) {
      const s = Math.sin(c.walk) * 0.7 * c.moving;
      ang[0] = s; ang[1] = -s; ang[6] = -s; ang[7] = s;
      _m.compose(_v.set(c.x, Math.abs(Math.cos(c.walk)) * 0.06 * c.moving, c.z), _q.setFromAxisAngle(UP, c.yaw), _s);
      rig.push(_m, ang, c.color);
      blobs.push(c.x, c.z, 0.35);
    }
  }

  // 留守の間の売上（最大8時間）。rate は住民が補充する速さ（個/秒）
  offline(sec, refill) {
    const sh = this.shop;
    if (!sh || !sh.site.done) return null;
    sec = Math.min(sec, SHOP.offlineMax);
    const keeper = S.hired.includes('keeper');
    const sellRate = (SHOP.buy[0] + SHOP.buy[1]) / 2 / (keeper ? SHOP.everyKeeper : SHOP.every);
    let supply = this.stockTotal() + refill.rate * sec;
    const sold = Math.floor(Math.min(sellRate * sec, supply));
    if (sold <= 0) return { sec, sold: 0, money: 0 };
    // 売れた分をカウンター→補充の順で減らす
    let left = sold, money = 0;
    for (const k of SELL) { const n = Math.min(left, S.shop.stock[k] || 0); S.shop.stock[k] -= n; left -= n; money += n * MATERIALS[k].price; }
    if (left > 0) money += left * refill.price;
    S.stats.sold += sold;
    return { sec, sold, money };
  }
}
