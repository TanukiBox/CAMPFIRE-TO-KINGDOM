// 焚き火から王国へ — 全体のつなぎ込みと毎フレームの処理
import * as THREE from './lib/three.module.min.js';
import { renderer, scene, camera, resize, placeCamera, perfTick, perfReset, perf, quality, Blobs, params } from './gfx.js';
import { CHAPTERS, MATERIALS, UPGRADES, TOOLS, JOBS, SHOP, PLAYER } from './data.js';
import { S, stat, loadState, resetState, rankScore, rankOf } from './state.js';
import { World } from './world.js';
import { Resources } from './resources.js';
import { Items } from './items.js';
import { Coins } from './coins.js';
import { Enemies } from './enemies.js';
import { Player } from './player.js';
import { Builds } from './build.js';
import { Stations } from './stations.js';
import { Workers } from './workers.js';
import { Missions } from './missions.js';
import { Rig } from './rig.js';
import { villagerParts } from './models.js';
import { burst, ring, shake, shakeState, floatText, updateFx } from './fx.js';
import { sfx, unlock, setSound, soundOn } from './audio.js';
import { readMove, onFirstTouch, input } from './input.js';
import { hud } from './hud.js';
import { ui } from './ui.js';
import { t, setLang, i18n, fmtTime } from './i18n.js';
import { iconImg } from './icons.js';
import { loadSave, writeSave, eraseSave } from './save.js';

const $ = id => document.getElementById(id);
const DEBUG = params.get('debug') === '1';
const SLOT = DEBUG ? 'debug' : 'main';
const GAME_URL = 'https://tanukibox.github.io/CAMPFIRE-TO-KINGDOM/';
const ch = CHAPTERS[1];

// ---- セーブの読み込みと設定 ----
const save = loadSave(SLOT) || {};
const hasSave = save.v === 2;
const settings = { sound: true, lang: null, ...(save.settings || {}) };
setLang(settings.lang || i18n.lang);
setSound(settings.sound);
if (hasSave) loadState(save.state);
// ミッションが増えても続きから遊べるように、ミッションは名前で覚えておく
if (S.missionId) { const i = ch.missions.findIndex(m => m.id === S.missionId); if (i >= 0) S.mission = i; }

// ---- 世界をつくる ----
resize();
const world = new World(ch);
world.setOwned(S.lands);
const resources = new Resources(ch, world);
const player = new Player();
const items = new Items();
items.addCarrier(player);
const coins = new Coins();
const enemies = new Enemies(ch, world);
const builds = new Builds(ch, world);
if (hasSave) builds.load(save.builds);
const stations = new Stations(ch, builds, items, coins);
const workers = new Workers(world, builds, resources, stations, items);
const missions = new Missions(ch.missions);
world.decorate([...builds.areas(), { x0: ch.burn[0] - 1, x1: ch.burn[0] + 1, z0: ch.burn[1] - 1, z1: ch.burn[1] + 1 }]);
const blobs = new Blobs(520);
const people = new Rig(villagerParts(), 160);
if (S.bossDead && enemies.boss) enemies.boss.alive = false;

player.pos.set(ch.start[0], 0, ch.start[1]);
if (hasSave && typeof save.px === 'number') { player.pos.set(save.px, 0, save.pz); world.resolve(player.pos, 0.36); }
player.applyStats();
if (hasSave && save.hp > 0) player.hp = Math.min(player.maxHp, save.hp);
player.animate(0);
if (hasSave) (save.bag || []).forEach(k => { if (MATERIALS[k] && player.bag.length < player.cap) items.put(player, k); });
workers.sync(player, true);

// ---- 計算する値 ----
const rankNow = () => rankOf(rankScore(builds.population(), builds.buildingsDone()));
const chapterName = () => t(S.cleared[1] ? ch.name.after : ch.name.before);
function lushNow() {
  if (S.cleared[1]) return 1;
  const total = builds.sites.filter(s => s.def.model).length;
  return Math.min(0.95, 0.1 + 0.7 * builds.buildingsDone() / total + 0.05 * (S.lands.length - 1));
}
world.setLush(lushNow());

function unlockThing(key, toastKey) {
  if (S.unlocked[key]) return;
  S.unlocked[key] = true;
  hud.gates(S.unlocked, true);
  if (toastKey) { hud.toast(`✨ ${t(toastKey)}`, 'good'); sfx.unlock(); }
  if (key === 'upgrade' || key === 'hire') hud.newDot(key === 'upgrade' ? 'btnUpgrade' : 'btnHire', true);
}

function addCoins(n, x, y, z) {
  S.coins += n; S.earned += n;
  missions.event('earn', null, n);
  sfx.coin();
  unlockThing('coins');
  if (x !== undefined) floatText('+' + n, x, y, z, 'coin');
}

// ---- できごと ----
let fullT = 0, fullSfx = 0, dirty = false, clearT = -1;

player.hooks = {
  onSwap() { sfx.swap(); },
  onHit(kind, target) {
    const px = player.pos.x, pz = player.pos.z;
    if (kind === 'enemy') {
      unlockThing('hp');
      const dmg = stat.dmg();
      const killed = enemies.hit(target, dmg, px, pz);
      sfx.slash(); shake(0.12);
      const hy = 0.55 * target.def.size + (target.hopY || 0);
      burst(target.x, hy, target.z, { n: 7, colors: [0xffffff, 0xfff3a0], speed: 5, up: 1.5, size: 0.09, life: 0.25, g: 0, floor: false });
      burst(target.x, hy, target.z, { n: 5, color: target.color.getHex(), speed: 2.5, up: 4, size: 0.12, life: 0.5 });
      floatText(String(dmg), target.x, hy + 0.7, target.z, 'dmg');
      if (killed) onKill(target);
    } else {
      const n = resources.hit(target, px, pz, stat.power(target.def.tool));
      const dir = { x: target.dx, z: target.dz };
      if (target.type === 'tree') {
        sfx.chop();
        burst(target.x, 1.9 * target.scl, target.z, { n: 6, colors: [0x6cc24a, 0x8ed86a, 0x4fa83d], speed: 1.6, up: 1, size: 0.14, life: 0.9, g: 3, spread: 1 });
        burst(target.x - dir.x * 0.3, 0.6, target.z - dir.z * 0.3, { n: 4, colors: [0xe0b07a, 0xb57b4a], speed: 2.5, up: 3, size: 0.09, life: 0.5, dir: { x: -dir.x, z: -dir.z } });
        if (target.state === 'fall') setTimeout(() => {
          burst(target.x + dir.x * 1.6, 0.6, target.z + dir.z * 1.6, { n: 14, colors: [0x6cc24a, 0x8ed86a, 0x4fa83d], speed: 3, up: 3, size: 0.18, life: 0.8, spread: 1.2 });
          burst(target.x, 0.4, target.z, { n: 8, colors: [0xf5e6c8, 0xe8d5b0], speed: 2, up: 1.5, size: 0.25, life: 0.6, g: 1, grow: 0.5 });
          sfx.pop();
        }, 520);
      } else {
        sfx.rock();
        burst(target.x - dir.x * 0.4, 0.6, target.z - dir.z * 0.4, { n: 6, colors: [0x9ea3aa, 0xc4c8ce, 0x7d828a], speed: 3, up: 3.5, size: 0.12, life: 0.6, dir: { x: -dir.x, z: -dir.z } });
        burst(target.x - dir.x * 0.5, 0.7, target.z - dir.z * 0.5, { n: 4, colors: [0xfff3a0, 0xffffff], speed: 4, up: 2, size: 0.06, life: 0.25, g: 0, floor: false });
        if (target.state === 'break') burst(target.x, 0.4, target.z, { n: 14, colors: [0x9ea3aa, 0xc4c8ce, 0xf5e6c8], speed: 3.5, up: 4, size: 0.2, life: 0.8 });
      }
      shake(target.state === 'ok' ? 0.06 : 0.15);
      popDrops(target.def.drop, n, target.x, target.z, 0.9);
    }
  },
  onHurt(n) {
    unlockThing('hp');
    sfx.hurt(); shake(0.25); hud.hurt();
    floatText('-' + n, player.pos.x, 1.6, player.pos.z, 'hurt');
  },
  onDown() {
    sfx.down(); shake(0.35);
    const n = items.dropHalf(player);
    enemies.resetBoss();
    hud.bossBar(null, null);
    setTimeout(() => hud.fade(true), 700);
    setTimeout(() => {
      player.respawn(ch.start[0], ch.start[1]);
      camTarget.copy(player.pos);
      hud.fade(false);
      burst(player.pos.x, 0.6, player.pos.z, { n: 16, colors: [0xffe066, 0xff9a3a, 0xffffff], speed: 2.5, up: 4, size: 0.12, life: 0.8 });
      ring(player.pos.x, player.pos.z, 0xffe7a0, 2, 0.5);
      hud.toast(`${t('fell')}<br><b>${n ? t('dropped', { n }) : t('droppedNone')}</b>`, 'bad');
      dirty = true;
    }, 1250);
  },
};

function onKill(e) {
  const def = e.def;
  sfx.kill(); shake(def.boss ? 0.6 : 0.2);
  const y = 0.4 * def.size;
  burst(e.x, y, e.z, { n: def.boss ? 60 : 18, color: e.color.getHex(), speed: def.boss ? 7 : 4, up: 5, size: def.boss ? 0.3 : 0.16, life: 0.9 });
  ring(e.x, e.z, 0xffffff, def.boss ? 6 : 1.6, 0.4);
  if (!e.minion) for (const k in def.drop) popDrops(k, def.drop[k], e.x, e.z, 0.5 + y);
  missions.event('kill', e.type);
  S.stats.kills++;
  if (def.boss) {
    S.bossDead = true;
    hud.bossBar(null, null);
    for (let i = enemies.list.length - 1; i >= 0; i--) if (enemies.list[i].minion) { const m = enemies.list[i]; burst(m.x, 0.4, m.z, { n: 10, color: m.color.getHex(), speed: 3, up: 4, size: 0.14, life: 0.6 }); enemies.list.splice(i, 1); }
    saveNow();
  }
}

function popDrops(kind, n, x, z, y) {
  const base = Math.atan2(player.pos.z - z, player.pos.x - x);
  for (let i = 0; i < n; i++) {
    const a = base + (Math.random() - 0.5) * 1.8, sp = 1.4 + Math.random() * 1.3;
    items.pop(kind, x, y, z, Math.cos(a) * sp, 4.5 + Math.random() * 2, Math.sin(a) * sp);
  }
}

const itemHooks = {
  onPick(it, n) { sfx.pickup(n); unlockThing('bag'); missions.event('gather', it.kind); dirty = true; },
  onStack(it) { burst(it.p.x, it.p.y, it.p.z, { n: 2, color: 0xffffff, speed: 1, up: 1, size: 0.06, life: 0.2, g: 0, floor: false }); },
  onFull() { fullT = 1.2; fullHint(); },
  clamp(p) { world.resolve(p, 0.15); },
};

const buildHooks = {
  onPaid() { dirty = true; },
  onBuilt(site) {
    const d = site.def;
    if (d.type === 'land') {
      S.lands.push(d.land);
      world.setOwned(S.lands);
      hud.toast(`🚩 ${t('landOpen', { l: t('l_' + d.land) })}`, 'good');
      sfx.fanfare();
    } else {
      hud.toast(`🔨 ${t(d.type === 'repair' ? 'repaired' : 'built', { b: t('b_' + d.model) })}`, 'good');
      if (d.pop) { const before = workers.list.length; workers.sync(player); const n = workers.list.length - before; if (n) setTimeout(() => hud.toast(`${iconImg('people')} ${t('newPeople', { n })}`), 900); }
    }
    world.setLush(lushNow());
    saveNow();
  },
  onNewTile() { hud.toast(t('newTile')); },
  fromStorage: pred => stations.fromStorage(pred),
};

const stationHooks = {
  onFeed(kind) { missions.event('feed', kind); dirty = true; },
  onTake(kind) { missions.event('take', kind); unlockThing('bag'); dirty = true; },
  onStock() { missions.event('stock'); dirty = true; },
  onMake(kind) { missions.event('make', kind); },
  onFull() { fullT = 1.2; fullHint(); },
  onAnvil() { openSmithy(); },
  neededKinds,
  onBurn() { world.fireBoost = Math.min(1.5, world.fireBoost + 0.35); sfx.burn(); dirty = true; },
  onBurnNone() { hud.toast(t('burnNone')); },
  onStorageFull() { if (!storageFullT) { storageFullT = 3; hud.toast(t('storageFull'), 'bad'); } },
  keeper: () => workers.keeper(),
  onCoin(n, auto) {
    const k = workers.keeper();
    if (auto && k) addCoins(n, k.x, 2, k.z); else addCoins(n);
    dirty = true;
  },
  onSell() { dirty = true; },
};

// ぬし
const warn = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.35, depthWrite: false }));
warn.visible = false; warn.renderOrder = 2; scene.add(warn);
const bossHooks = {
  onBossStart(e) { sfx.roar(); shake(0.4); hud.toast(`⚠ ${t('bossAppear')}`, 'bad'); },
  onBossEnd() { hud.bossBar(null, null); },
  onBossLeap(e) { warn.visible = true; warn.position.set(e.lx, 0.06, e.lz); warn.userData.t = 0; warn.userData.r = e.def.slamR; },
  onBossSlam(e) {
    warn.visible = false;
    sfx.slam(); shake(0.55);
    ring(e.x, e.z, 0xe2c38f, e.def.slamR * 1.2, 0.5);
    burst(e.x, 0.3, e.z, { n: 24, colors: [0xe2c38f, 0xc9a877, 0x8be36a], speed: 6, up: 3, size: 0.2, life: 0.7 });
  },
  onBossCall(e) {
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * 6.28, x = e.x + Math.cos(a) * 2.5, z = e.z + Math.sin(a) * 2.5;
      const m = enemies.spawn('slime', { x, z, r: 1 }, { minion: true, x, z });
      burst(x, 0.4, z, { n: 8, color: 0x8be36a, speed: 2, up: 3, size: 0.12, life: 0.5 });
      m.cd = 1;
    }
  },
};

// ---- メニューから呼ばれること ----
const game = {
  bagCount: k => items.count(player, k) + stations.storageCount(k),
  population: () => workers.list.length,
  freeWorkers: () => workers.free(),
  buildingDone: id => builds.isDone(id),
  buyUpgrade(k) {
    const u = UPGRADES[k], lv = S.up[k];
    if (lv >= u.costs.length || S.coins < u.costs[lv]) return;
    S.coins -= u.costs[lv]; S.up[k]++;
    player.applyStats();
    missions.event('upgrade');
    sfx.upgrade();
    burst(player.pos.x, 1, player.pos.z, { n: 20, colors: [0xffe066, 0xffffff, 0x8fd3ff], speed: 3, up: 5, size: 0.12, life: 0.8 });
    hud.toast(`⬆ ${t('upgraded', { x: t('up_' + k) })}`, 'good');
    hud.newDot('btnUpgrade', false);
    saveNow();
  },
  buyTool(k) {
    const u = TOOLS[k], lv = S.tool[k];
    if (lv >= u.costs.length) return;
    const c = u.costs[lv];
    if (S.coins < c.coin) return;
    for (const m in c) if (m !== 'coin' && game.bagCount(m) < c[m]) return;
    for (const m in c) if (m !== 'coin') stations.useMaterial(player, m, c[m]);
    S.coins -= c.coin; S.tool[k]++;
    player.applyStats();
    missions.event('tool');
    sfx.anvil(); setTimeout(() => sfx.upgrade(), 150);
    const a = stations.anvil.pos;
    burst(a.x, 1, a.z, { n: 24, colors: [0xffb14a, 0xffe066, 0xffffff], speed: 4, up: 5, size: 0.08, life: 0.6 });
    hud.toast(`⚒ ${t('upgraded', { x: t('tool_' + k) })}`, 'good');
    saveNow();
  },
  hire(job) {
    const j = JOBS[job];
    if (workers.free() <= 0 || S.coins < j.cost || !builds.isDone(j.needs)) return;
    if (j.max && S.hired.filter(h => h === job).length >= j.max) return;
    S.coins -= j.cost; S.hired.push(job);
    workers.sync(player);
    const w = workers.list[S.hired.length - 1];
    burst(w.x, 1, w.z, { n: 16, colors: [0xffe066, 0xffffff], speed: 2.5, up: 4, size: 0.1, life: 0.7 });
    sfx.upgrade();
    hud.toast(`${iconImg('people')} ${t('hired', { j: t('job_' + job) })}`, 'good');
    hud.newDot('btnHire', false);
    saveNow();
  },
  afterClear() { hud.toast(t('nextSoon')); },
  onClose() { perfReset(); },
};
ui.init(game);
function openSmithy() { unlock(); ui.show('smithy'); }

// 今の建設マスやミッションで使う素材（これは焚き火で燃やさない）
function neededKinds() {
  const need = new Set();
  for (const site of builds.active()) for (const k in site.def.cost) if (k !== 'coin' && builds.need(site, k) > 0) need.add(k);
  const m = missions.current();
  if (m && m.kind && MATERIALS[m.kind]) need.add(m.kind);
  return need;
}
function fullHint() {
  if (S.unlocked.fullHint) return;
  S.unlocked.fullHint = true;
  hud.toast(`🔥 ${t('fullHint')}`);
}
// ゼリーを食べてHP回復（HPが減ったら背中のゼリーを自動で食べる）
let eatCd = 0, storageFullT = 0;
function eatJelly(dt) {
  eatCd -= dt;
  if (!player.alive || eatCd > 0 || player.hp > player.maxHp - PLAYER.jellyHeal) return;
  const it = items.take(player, k => k === 'jelly');
  if (!it) return;
  items.remove(it);
  eatCd = PLAYER.jellyCd;
  player.hp = Math.min(player.maxHp, player.hp + PLAYER.jellyHeal);
  sfx.eat();
  floatText('+' + PLAYER.jellyHeal, player.pos.x, 1.8, player.pos.z, 'heal');
  burst(player.pos.x, 1.0, player.pos.z, { n: 10, colors: [0x86e36f, 0xc8f5a8, 0xffffff], speed: 1.8, up: 3, size: 0.1, life: 0.6 });
}

// ---- ミッション ----
function missionTick() {
  const ctx = { builds, rank: rankNow() };
  const done = missions.check(ctx);
  if (done) {
    sfx.mission();
    if (done.reward) {
      S.coins += done.reward; S.earned += done.reward; unlockThing('coins');
      hud.toast(`⭐ ${t('missionDone')} ${iconImg('coin')}+${done.reward}`, 'good');
    } else hud.toast(`⭐ ${t('missionDone')}`, 'good');
    for (const u of done.unlock || []) unlockThing(u, u === 'gear' ? null : 'unlock_' + u);
    if (done.id === 'house') unlockThing('hp');
    if (done.type === 'boss') clearT = 2.5;
    dirty = true;
  }
  const m = missions.current();
  if (!m) { hud.mission(`🌟 ${t('m_free')}`, null, 0); return; }
  if (m.type === 'upgrade') hud.newDot('btnUpgrade', true);
  if (m.type === 'hire') hud.newDot('btnHire', true);
  hud.mission(t('m_' + m.id, { n: m.n }), missions.progress(m, ctx), m.reward);
}

// ミッションの目的地（画面の外なら端に矢印）
function missionTarget() {
  const m = missions.current();
  if (!m) return null;
  const P = player.pos;
  // 背中が満杯で、今使う素材がないときは、くべるマスへ案内
  if (player.bag.length >= player.cap) {
    const need = neededKinds();
    if (!player.bag.some(it => need.has(it.kind))) return { x: ch.burn[0], z: ch.burn[1] };
  }
  switch (m.type) {
    case 'gather': {
      if (player.bag.length) return null;
      let best = null, bd = Infinity;
      for (const n of resources.nodes) if (n.type === 'tree' && n.state === 'ok' && world.isOwned(n.land)) { const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < bd) { bd = d; best = n; } }
      return best && bd > 2 ? { x: best.x, z: best.z, y: 2.8 } : null;
    }
    case 'feed': { const s = stations.get('sawmill'); return { x: s.inPos.x, z: s.inPos.z }; }
    case 'take': { const s = stations.get('sawmill'); return { x: s.outPos.x, z: s.outPos.z }; }
    case 'make': { const s = stations.get('stonework'); return { x: s.inPos.x, z: s.inPos.z }; }
    case 'stock': return { x: stations.shop.stock.x, z: stations.shop.stock.z };
    case 'earn': return S.shop.coins > 0 ? { x: stations.shop.coinPos.x, z: stations.shop.coinPos.z } : { x: stations.shop.stock.x, z: stations.shop.stock.z };
    case 'tool': return { x: stations.anvil.pos.x, z: stations.anvil.pos.z };
    case 'kill': { const z = ch.spawns.find(s => s.type === m.kind); return z ? { x: z.x, z: z.z, y: 1.5 } : null; }
    case 'boss': { const b = enemies.boss; return b && b.alive ? { x: b.x, z: b.z, y: 4 } : null; }
    default: return null;
  }
}

// ---- 章クリア ----
function chapterClear() {
  S.cleared[1] = true;
  world.setLush(1);
  sfx.fanfare();
  for (let i = 0; i < 6; i++) setTimeout(() => {
    const x = player.pos.x + (Math.random() - 0.5) * 12, z = player.pos.z - 2 - Math.random() * 8;
    burst(x, 5 + Math.random() * 2, z, { n: 40, colors: [0xff6b6b, 0xffd93d, 0x6bcbff, 0x7ee06a, 0xff9ff3, 0xffffff], speed: 6, up: 2, size: 0.14, life: 1.6, g: 4, floor: false });
    sfx.pop();
  }, i * 350);
  for (const s of builds.sites) if (s.done && s.fixed) s.anim = 0;
  shake(0.4);
  saveNow();
  const rank = rankNow(), pop = workers.list.length, time = S.time;
  const text = t('shareText', { r: rank, p: pop, t: fmtTime(time) });
  setTimeout(() => ui.show('clear', {
    rank, pop, time,
    shareUrl: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(GAME_URL),
  }), 2200);
}

// ---- 留守の間の売上 ----
function awayReport() {
  const now = Date.now();
  if (!S.lastSeen || now - S.lastSeen < 60 * 1000) return null;
  return offlineSales((now - S.lastSeen) / 1000);
}
function offlineSales(sec) {
  const n = j => S.hired.filter(h => h === j).length;
  const gather = 0.1 * (n('lumber') * (builds.isDone('sawmill') ? 1 : 0) + n('miner') * (builds.isDone('stonework') ? 1 : 0));
  const stock = stations.proc.reduce((a, p) => a + (p.site.done ? stations.st(p).out : 0), 0);
  const rate = n('carrier') ? Math.min(gather + stock / Math.max(sec, 1), n('carrier') * 0.25) : 0;
  const r = stations.offline(sec, { rate, price: 5 });
  if (!r || r.money <= 0) return null;
  S.coins += r.money; S.earned += r.money;
  return { ...r, capped: sec > SHOP.offlineMax };
}

// ---- セーブ ----
function saveNow() {
  S.lastSeen = Date.now();
  S.missionId = (missions.current() || {}).id || 'done';
  writeSave({
    v: 2, state: S,
    builds: builds.toSave(),
    bag: player.bag.map(it => it.kind),
    hp: Math.round(player.hp * 10) / 10, px: Math.round(player.pos.x * 100) / 100, pz: Math.round(player.pos.z * 100) / 100,
    settings,
  }, SLOT);
  dirty = false;
}
let started = false;
setInterval(() => { if (started) saveNow(); }, 5000);
window.addEventListener('pagehide', () => { if (started) saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && started) saveNow(); perfReset(); });

// ---- 設定 ----
hud.init();
hud.texts();
function settingsTexts() {
  $('setTitle').textContent = t('settings');
  $('lblSound').textContent = t('sound');
  $('sOn').textContent = t('on'); $('sOff').textContent = t('off');
  $('lblLang').textContent = t('language');
  $('btnReset').textContent = t('reset');
  $('resetMsg').textContent = t('resetAsk');
  $('btnResetYes').textContent = t('yes'); $('btnResetNo').textContent = t('cancel');
  $('btnClose').textContent = t('close');
  $('btnAway').textContent = t('debugAway');
  $('btnAway').hidden = !DEBUG;
}
function syncSettingsUi() {
  settingsTexts();
  document.querySelectorAll('[data-sound]').forEach(b => b.classList.toggle('on', (b.dataset.sound === '1') === soundOn()));
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === i18n.lang));
  $('qInfo').textContent = `${t('quality')}: ×${quality.ratio} ${quality.shadows ? '☀' : ''} ${quality.auto ? '(' + t('qAuto') + ')' : ''}`;
}
const settingsOpen = () => !$('settings').hidden;
$('btnGear').addEventListener('click', () => { unlock(); syncSettingsUi(); $('resetAsk').hidden = true; $('settings').hidden = false; });
$('btnClose').addEventListener('click', () => { $('settings').hidden = true; perfReset(); });
$('settings').addEventListener('pointerdown', e => { if (e.target.id === 'settings') $('settings').hidden = true; });
document.querySelectorAll('[data-sound]').forEach(b => b.addEventListener('click', () => {
  settings.sound = b.dataset.sound === '1'; setSound(settings.sound); unlock(); sfx.pop(); syncSettingsUi(); saveNow();
}));
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
  settings.lang = b.dataset.lang; setLang(settings.lang); hud.texts(); syncSettingsUi(); saveNow();
}));
$('btnReset').addEventListener('click', () => { $('resetAsk').hidden = false; });
$('btnResetNo').addEventListener('click', () => { $('resetAsk').hidden = true; });
$('btnResetYes').addEventListener('click', () => {
  started = false;
  eraseSave(settings, SLOT);
  location.reload();
});
$('btnAway').addEventListener('click', () => {
  $('settings').hidden = true;
  const r = offlineSales(3600);
  if (r) ui.show('away', r);
});
$('btnUpgrade').addEventListener('click', () => { unlock(); hud.newDot('btnUpgrade', false); ui.show('upgrade'); });
$('btnHire').addEventListener('click', () => { unlock(); hud.newDot('btnHire', false); ui.show('hire'); });
onFirstTouch(unlock);
window.addEventListener('resize', resize);
hud.gates(S.unlocked, false);

// ---- はじめる ----
function begin() {
  unlock();
  started = true;
  $('mission').hidden = false;
  const r = awayReport();
  if (r) ui.show('away', r);
  else if (S.mission === 0) hud.toast(`🔥 ${t('ch1_title')}`);
  saveNow();
}
if (sessionStorage.getItem('ctk-autostart')) { sessionStorage.removeItem('ctk-autostart'); begin(); }
else ui.showTitle(hasSave, DEBUG, debugCh => { if (debugCh) debugStart(debugCh); else begin(); });

// デバッグ：素材とコインを大量に持って章の最初から（デバッグ用のセーブを作り直して読み込み直す）
function debugStart() {
  resetState();
  S.coins = 99999;
  S.up.bag = UPGRADES.bag.costs.length;
  S.unlocked = { bag: true, hp: true, coins: true };
  S.lastSeen = Date.now();
  const kinds = Object.keys(MATERIALS), cap = UPGRADES.bag.values[S.up.bag];
  writeSave({ v: 2, state: S, builds: {}, bag: Array.from({ length: cap - 10 }, (_, i) => kinds[i % kinds.length]), hp: 99, settings }, SLOT);
  sessionStorage.setItem('ctk-autostart', '1');
  location.reload();
}

// ---- 負荷確認用：?stress=150 で住民とスライムをたくさん歩かせる ----
const stressN = Math.min(400, parseInt(params.get('stress') || '0', 10) || 0);
let crowd = null;
if (stressN > 0) {
  const f = ch.lands[0].rect, zone = { x: (f.x0 + f.x1) / 2, z: (f.z0 + f.z1) / 2, r: 12 };
  for (let i = 0; i < Math.floor(stressN / 2); i++) enemies.spawn('slime', zone, { passive: true, color: new THREE.Color().setHSL(Math.random(), 0.6, 0.6).getHex() });
  crowd = [];
  for (let i = 0; i < stressN - Math.floor(stressN / 2); i++) {
    const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * zone.r;
    crowd.push({ x: zone.x + Math.cos(a) * r, z: zone.z + Math.sin(a) * r, tx: 0, tz: 0, wait: 0, yaw: 0, walk: 0, moving: 0, color: new THREE.Color().setHSL(Math.random(), 0.6, 0.6), zone });
  }
}
const showFps = stressN > 0 || params.has('fps');
if (DEBUG) window.ctk = { S, player, items, builds, resources, enemies, world, stations, workers, missions };

// ---- 毎フレーム ----
const move = { x: 0, z: 0, m: 0 };
const camTarget = player.pos.clone();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
const cang = [0, 0, 0, 0, 0, 0, 0, 0];
let last = performance.now(), time = 0, missionT = 0, fpsT = 0;
hud.moveHint(true);

function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now;
  const paused = !started || ui.blocking() || settingsOpen();
  const dt = paused ? 0 : Math.min(Math.max(raw, 0), 1 / 20);
  const fdt = Math.min(Math.max(raw, 0), 1 / 20);
  time += fdt;
  if (!paused) S.time += dt;
  perfTick(raw);

  if (paused) { move.x = move.z = move.m = 0; } else readMove(move);
  if (!paused) {
    player.update(dt, { move, world, resources, enemies });
    enemies.update(dt, player, bossHooks);
    workers.update(dt, player, stationHooks);
    resources.update(dt);
    items.update(dt, player, time, itemHooks);
    builds.update(dt, time, player, items, coins, buildHooks);
    stations.update(dt, time, player, stationHooks);
    if (crowd) for (const v of crowd) {
      v.wait -= dt;
      if (v.wait <= 0) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * v.zone.r; v.tx = v.zone.x + Math.cos(a) * r; v.tz = v.zone.z + Math.sin(a) * r; v.wait = 3 + Math.random() * 4; }
      const dx = v.tx - v.x, dz = v.tz - v.z, d = Math.hypot(dx, dz);
      v.moving = d > 0.3 ? 1 : 0;
      if (v.moving) { v.x += dx / d * 2.2 * dt; v.z += dz / d * 2.2 * dt; v.yaw = Math.atan2(dx, dz); v.walk += dt * 10; }
      world.resolve(v, 0.3);
    }
    if (clearT > 0) { clearT -= dt; if (clearT <= 0) chapterClear(); }
  } else {
    // メニュー中も山やコインは描く
    stations.update(0, time, { pos: { x: 1e9, z: 1e9 }, alive: false, bag: [], cap: 0 }, stationHooks, true);
  }
  if (!paused) eatJelly(dt);
  storageFullT = Math.max(0, storageFullT - fdt);
  coins.update(fdt);
  world.update(time, fdt);
  updateFx(fdt);

  // 予告の円
  if (warn.visible) { warn.userData.t += dt; const k = Math.min(1, warn.userData.t / 1.0); warn.scale.setScalar(warn.userData.r * (0.3 + 0.7 * k)); warn.material.opacity = 0.25 + 0.25 * Math.sin(time * 20); }

  // まとめて描く物
  blobs.begin();
  if (player.alive || player.m.body.rotation.z < 1.5) blobs.push(player.pos.x, player.pos.z, 0.5);
  enemies.render(blobs);
  people.begin();
  workers.render(people, blobs, time);
  stations.renderPeople(people, blobs);
  if (crowd) for (const v of crowd) {
    const s = Math.sin(v.walk) * 0.7 * v.moving;
    cang[0] = s; cang[1] = -s; cang[6] = -s; cang[7] = s;
    _m4.compose(_v.set(v.x, 0, v.z), _q.setFromAxisAngle(UP, v.yaw), _s1);
    people.push(_m4, cang, v.color);
    blobs.push(v.x, v.z, 0.35);
  }
  people.end();
  items.groundShadows(blobs);
  blobs.end();
  items.render(time);
  coins.end();

  // カメラは主人公を追いかける（回転なし）
  const ck = Math.min(1, fdt * 7);
  camTarget.x += (player.pos.x - camTarget.x) * ck;
  camTarget.z += (player.pos.z - camTarget.z) * ck;
  placeCamera(camTarget, shakeState.x, shakeState.y);
  renderer.render(scene, camera);

  // 画面の表示
  if (player.fullNear) fullT = Math.max(fullT, 0.3);
  if (fullT > 0) { fullT -= fdt; fullSfx -= fdt; if (fullSfx <= 0 && !paused) { sfx.full(); fullSfx = 1.6; } } else fullSfx = 0;
  hud.hp(player.hp, player.maxHp);
  hud.bag(player.bag.length, player.cap);
  hud.coins(S.coins);
  hud.rank(rankNow(), chapterName(), workers.list.length);
  const boss = enemies.boss;
  if (boss && boss.alive && boss.fight) hud.bossBar(t('boss_' + boss.type), boss.hp / boss.def.hp);
  drawLabels();
  hud.moveHint(started && !input.moved);
  missionT -= fdt;
  if (missionT <= 0 && started) { missionT = 0.2; missionTick(); }
  if (showFps) {
    fpsT -= fdt;
    if (fpsT <= 0) {
      fpsT = 0.5;
      const n = enemies.list.filter(e => e.alive).length + workers.list.length + (stations.shop ? stations.shop.customers.length : 0) + (crowd ? crowd.length : 0);
      hud.fps(`${perf.fps.toFixed(0)} fps ・ ×${quality.ratio} ・ ${quality.shadows ? 'shadow' : 'no shadow'} ・ ${n} chars ・ ${renderer.info.render.calls} calls`);
    }
  }
}

function drawLabels() {
  hud.labelsBegin();
  if (started) {
    const m = missions.current();
    // 建設マス
    for (const s of builds.active()) {
      const d = s.def;
      const name = d.type === 'land' ? t('buyLand', { l: t('l_' + d.land) }) : t(d.type === 'repair' ? 'repairOf' : 'buildOf', { b: t('b_' + d.model) });
      const chips = Object.keys(d.cost).map(k => {
        const n = Math.max(0, builds.need(s, k));
        return `<span class="chip${n === 0 ? ' ok' : ''}">${iconImg(k === 'coin' ? 'coin' : k)}<b>${n === 0 ? '✓' : n}</b></span>`;
      }).join('');
      const isTarget = m && m.type === 'build' && m.target === d.id;
      hud.label('b-' + d.id, `<div class="tl-name">${name}</div><div class="tl-chips">${chips}</div>`, d.tile[0], 0.3, d.tile[1], 'tile-label' + (isTarget ? ' target' : ''), isTarget);
    }
    // 加工場・お店の札（近くにいるときだけ）
    const P = player.pos, close = (x, z) => Math.hypot(x - P.x, z - P.z) < 9;
    for (const p of stations.proc) {
      if (!p.site.done) continue;
      const st = stations.st(p);
      if (close(p.inPos.x, p.inPos.z)) hud.label('in-' + p.id, `${iconImg(p.from)}<b>${st.in}</b><small>/${p.def.inCap}</small>`, p.inPos.x, 1.1, p.inPos.z, 'st-label');
      if (close(p.outPos.x, p.outPos.z) && st.out > 0) hud.label('out-' + p.id, `${iconImg(p.to)}<b>${st.out}</b>`, p.outPos.x, 1.3, p.outPos.z, 'st-label out');
    }
    const sh = stations.shop;
    if (sh && sh.site.done) {
      if (close(sh.stock.x, sh.stock.z)) {
        const n = stations.stockTotal();
        hud.label('stock', `${iconImg('plank')}${iconImg('block')}${iconImg('jelly')}<b>${n}</b><small>/${SHOP.stockCap}</small>`, sh.stock.x, 1.1, sh.stock.z, 'st-label shop');
      }
      if (sh.waiting) hud.label('wait', '…', sh.waiting.x, 2.1, sh.waiting.z, 'bubble');
    }
    // くべるマス・倉庫
    if (close(ch.burn[0], ch.burn[1])) hud.label('burn', `🔥 ${t('s_burn')}`, ch.burn[0], 0.9, ch.burn[1], 'st-label burn');
    const sto = stations.storage;
    if (sto && sto.site.done && close(sto.pos.x, sto.pos.z)) {
      const chips = Object.keys(S.storage).filter(k => S.storage[k] > 0).map(k => `${iconImg(k)}<b>${S.storage[k]}</b>`).join(' ');
      hud.label('store', `${t('s_store')} ${chips}`, sto.pos.x, 1.1, sto.pos.z, 'st-label store');
    }
    // ミッションの目的地
    const tg = missionTarget();
    if (tg) hud.label('target', '▼', tg.x, tg.y || 1.8, tg.z, 'marker', true);
    // 満杯
    if (fullT > 0 && player.alive) hud.label('full', t('full'), player.anchor.x, player.anchor.y + (player.stackTop || 0) + 0.5, player.anchor.z, 'full-bubble');
  }
  hud.labelsEnd();
}
requestAnimationFrame(frame);
