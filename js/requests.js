// 住民の依頼：家の前に住民が立って「○○がほしい」「○○を倒して」「○○を食べたい」とたのむ。
// かなえたら住民のところへ行くと、コインと経験値がもらえる
import * as THREE from './lib/three.module.min.js';
import { REQUESTS, ENEMY_TYPES, MATERIALS, DISHES } from './data.js';
import { S } from './state.js';

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
const ang = new Float32Array(8);
const _c = new THREE.Color();
const COLORS = [0xf28b50, 0x5fb3e8, 0xe86fa8, 0x7ccf5a, 0xb58ae0, 0xf2c14e];
// 章ごとのお礼の大きさ（コイン・経験値）
const PAY = { 1: [25, 20], 2: [90, 60], 3: [220, 140], 4: [480, 260] };

export class Requests {
  constructor(ch, builds, stations) {
    this.ch = ch; this.builds = builds; this.stations = stations;
    this.timer = 12;
    this.wave = 0;
    // 依頼を出せる材料・モンスター（この章の狩り場にいるもの）
    this.monsters = [...new Set(ch.spawns.map(z => z.type).filter(t => !ENEMY_TYPES[t].boss))];
  }

  // 依頼が出せるようになる：家が2軒できてから（2章からは最初から）
  ready() { return S.ch >= 2 || this.builds.isDone('house2'); }

  // 住民が立つ場所（完成した家の玄関の横）
  spots() {
    return this.builds.sites.filter(s => s.done && s.def.model === 'house').map(s => ({ id: s.def.id, x: s.def.x + 1.35, z: s.def.z + s.def.d / 2 + 0.55 }));
  }

  pick() {
    const spots = this.spots().filter(p => !S.requests.some(r => r.at === p.id));
    if (!spots.length) return null;
    const at = spots[Math.floor(Math.random() * spots.length)];
    const types = [];
    const mats = Object.keys(S.book.mat).filter(k => MATERIALS[k] && !MATERIALS[k].dish && k !== 'stone' && k !== 'wood');
    if (mats.length) types.push('mat');
    if (this.monsters.length) types.push('hunt', 'hunt');
    const dishes = Object.keys(S.book.dish).filter(k => DISHES.includes(k));
    if (dishes.length && this.stations.kitchen && this.stations.kitchen.site.done) types.push('cook');
    if (!types.length) return null;
    const type = types[Math.floor(Math.random() * types.length)];
    const c = S.ch, [coin, xp] = PAY[Math.min(c, 4)];
    let kind, n, mul = 1;
    if (type === 'mat') { kind = mats[Math.floor(Math.random() * mats.length)]; n = 4 + Math.floor(Math.random() * 3) * 2 + c * 2; mul = 1; }
    else if (type === 'hunt') { kind = this.monsters[Math.floor(Math.random() * this.monsters.length)]; n = 3 + Math.floor(Math.random() * 3); mul = 1.2 + ENEMY_TYPES[kind].xp / 30; }
    else { kind = dishes[Math.floor(Math.random() * dishes.length)]; n = 2 + Math.floor(Math.random() * 2); mul = 1.3; }
    const used = new Set(S.requests.map(r => r.who));
    let who = Math.floor(Math.random() * REQUESTS.names.ja.length);
    while (used.has(who)) who = (who + 1) % REQUESTS.names.ja.length;
    return { at: at.id, who, type, kind, n, p: 0, coin: Math.round(coin * mul / 5) * 5, xp: Math.round(xp * mul), color: COLORS[who % COLORS.length], t: 0 };
  }

  spotOf(r) { return this.spots().find(p => p.id === r.at); }

  // 依頼が達成できているか
  isReady(r, bagCount) { return r.type === 'mat' ? bagCount(r.kind) >= r.n : r.p >= r.n; }
  progress(r, bagCount) { return Math.min(r.n, r.type === 'mat' ? bagCount(r.kind) : r.p); }

  // できごと（倒した・作った）
  event(type, kind) {
    for (const r of S.requests) if (r.type === type && r.kind === kind && r.p < r.n) r.p++;
  }

  update(dt, player, bagCount, onDone, onNew) {
    for (const r of S.requests) r.t += dt;
    if (!this.ready()) return;
    if (S.requests.length < REQUESTS.max) {
      this.timer -= dt;
      if (this.timer <= 0) {
        const [a, b] = REQUESTS.every;
        this.timer = a + Math.random() * (b - a);
        const r = this.pick();
        if (r) { S.requests.push(r); onNew(r); }
      }
    }
    // 住民のそばに行くと、かなえた依頼を渡す
    for (let i = S.requests.length - 1; i >= 0; i--) {
      const r = S.requests[i], p = this.spotOf(r);
      if (!p) { S.requests.splice(i, 1); continue; }
      if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 1.7 && player.alive && this.isReady(r, bagCount)) {
        S.requests.splice(i, 1);
        onDone(r, p);
      }
    }
  }

  // 依頼中の住民を描く（ときどき手をふる）
  render(rig, blobs, player, time) {
    for (const r of S.requests) {
      const p = this.spotOf(r);
      if (!p) continue;
      const yaw = Math.atan2(player.pos.x - p.x, player.pos.z - p.z);
      ang.fill(0);
      const wave = Math.sin(time * 2 + r.who) > 0.3;
      if (wave) { ang[7] = -2.6 + Math.sin(time * 12) * 0.35; }
      _m.compose(_v.set(p.x, Math.abs(Math.sin(time * 3 + r.who)) * 0.04, p.z), _q.setFromAxisAngle(UP, yaw), _s);
      rig.push(_m, ang, _c.setHex(r.color));
      blobs.push(p.x, p.z, 0.35);
    }
  }
  count() { return S.requests.length; }
}
