// 焚き火から王国へ — 全体のつなぎ込みと毎フレームの処理
import * as THREE from './lib/three.module.min.js';
import { renderer, scene, camera, resize, placeCamera, perfTick, perfReset, perf, quality, Blobs, params, setDay } from './gfx.js';
import { CHAPTERS, MATERIALS, UPGRADES, TOOLS, JOBS, SHOP, PLAYER, FACILITY, JOB_UP, STORAGE, INGREDIENTS, WEAPONS, ARMORS, LEVEL, REQUESTS, chapterData, LAST_CHAPTER } from './data.js';
import { initMusic, play as playMusic, setMusic } from './music.js';
import { S, stat, loadState, resetState, rankScore, rankOf, weaponOf, armorOf } from './state.js';
import { Requests } from './requests.js';
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

// ---- セーブの読み込みと設定 ----
const save = loadSave(SLOT) || {};
const hasSave = save.v === 2;
const settings = { sound: true, music: true, vibrate: true, lang: null, ...(save.settings || {}) };
setLang(settings.lang || i18n.lang);
setSound(settings.sound);
setMusic(settings.music);
initMusic();
playMusic('title');
// スマホの振動
const vib = p => { if (settings.vibrate && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(p); } catch (e) { /* なし */ } };
const chapterTrack = () => 'ch' + Math.min(S.ch, 4);
if (hasSave) loadState(save.state);
// 前の章をクリアしていて次の章があれば、次の章から
if (S.cleared[S.ch] && CHAPTERS[S.ch + 1]) { S.ch++; S.mission = 0; S.mp = 0; S.missionId = null; }
const ch = chapterData(S.ch);
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
const stations = new Stations(ch, builds, items, coins, world);
// 食堂になる前のセーブ：お店に並んでいた板・石材・ゼリーは倉庫へ
for (const k of ['plank', 'block', 'jelly']) if (S.shop.stock[k]) { S.storage[k] = (S.storage[k] || 0) + S.shop.stock[k]; delete S.shop.stock[k]; }
const workers = new Workers(world, builds, resources, stations, items, enemies);
const missions = new Missions(ch.missions);
const requests = new Requests(ch, builds, stations);
world.addTown(ch.towns);
world.decorate([...builds.areas(), ...roadAreas(ch.towns)]);
const blobs = new Blobs(520);
const people = new Rig(villagerParts(), 160);
for (const b of enemies.bosses) if (S.bosses[b.type]) b.alive = false;

player.pos.set(ch.start[0], 0, ch.start[1]);
if (hasSave && typeof save.px === 'number') { player.pos.set(save.px, 0, save.pz); world.resolve(player.pos, 0.36); }
player.applyStats();
if (S.cleared[LAST_CHAPTER]) player.m.crown.visible = true;
if (hasSave && save.hp > 0) player.hp = Math.min(player.maxHp, save.hp);
player.animate(0);
if (hasSave) (save.bag || []).forEach(k => { if (MATERIALS[k] && player.bag.length < player.cap) items.put(player, k); });
workers.sync(player, true);

// ---- 計算する値 ----
const rankNow = () => rankOf(rankScore(builds.population(), builds.buildingsDone()));
const chapterName = () => t(S.cleared[S.ch] ? ch.name.after : ch.name.before);
// 今の章の建物がどれだけ建ったかで、地面の色が鮮やかになる
function lushNow() {
  if (S.cleared[S.ch]) return 1;
  const mine = builds.sites.filter(s => s.def.model && s.def.ch === S.ch);
  const lands = ch.builds.filter(b => b.type === 'land' && b.ch === S.ch);
  const done = mine.filter(s => s.done).length, owned = lands.filter(b => S.lands.includes(b.land)).length;
  return Math.min(0.95, 0.1 + 0.7 * done / Math.max(1, mine.length) + 0.15 * owned / Math.max(1, lands.length));
}
// 道の上には草を生やさない
function roadAreas(towns) {
  const a = [];
  for (const tw of towns) for (const [x0, z0, x1, z1] of tw.roads) a.push({ x0: Math.min(x0, x1) - 1, x1: Math.max(x0, x1) + 1, z0: Math.min(z0, z1) - 1, z1: Math.max(z0, z1) + 1 });
  return a;
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

// 経験値：たまるとレベルが上がり、HPと攻撃力が増える
function gainXp(n, x, z) {
  n = Math.round(n);
  if (n <= 0) return;
  S.xp += n;
  if (x !== undefined) floatText(`+${n} EXP`, x, 2.4, z, 'xp');
  let up = 0;
  while (S.xp >= LEVEL.need(S.level)) { S.xp -= LEVEL.need(S.level); S.level++; up++; }
  if (!up) return;
  player.applyStats();
  player.hp = player.maxHp;
  sfx.unlock(); setTimeout(() => sfx.upgrade(), 180);
  const P = player.pos;
  burst(P.x, 1.2, P.z, { n: 36, colors: [0xffe066, 0xffffff, 0x8fd3ff, 0xff9ff3], speed: 4, up: 6, size: 0.13, life: 1.0 });
  ring(P.x, P.z, 0xffe7a0, 3, 0.5);
  vib(60);
  hud.toast(`🌟 ${t('levelUp', { n: S.level, h: player.maxHp, a: stat.dmg() })}`, 'good');
  hud.levelBump();
  dirty = true;
}
const reqName = r => REQUESTS.names[i18n.lang === 'ja' ? 'ja' : 'en'][r.who];
function requestDone(r, p) {
  if (r.type === 'mat') stations.useMaterial(player, r.kind, r.n);
  const pieces = Math.min(6, Math.max(2, Math.round(r.coin / 20)));
  for (let i = 0; i < pieces; i++) {
    const part = i === pieces - 1 ? r.coin - Math.floor(r.coin / pieces) * (pieces - 1) : Math.floor(r.coin / pieces);
    coins.send(p.x, 1.4, p.z, () => ({ x: player.pos.x, y: 1.2, z: player.pos.z }), 0.35 + i * 0.06, () => addCoins(part), 1.6);
  }
  gainXp(r.xp);
  burst(p.x, 1.6, p.z, { n: 24, colors: [0xffe066, 0xff9ff3, 0xffffff], speed: 3, up: 4, size: 0.12, life: 0.8 });
  sfx.mission();
  hud.toast(`🎁 ${t('reqDone', { who: reqName(r) })} ${iconImg('coin')}+${r.coin}`, 'good');
  S.stats.requests = (S.stats.requests || 0) + 1;
  missions.event('request');
  saveNow();
}
function requestNew(r) {
  hud.toast(`❗ ${t('reqNew', { who: reqName(r) })}`);
  sfx.pop();
}

// ---- できごと ----
let fullT = 0, fullSfx = 0, dirty = false, clearT = -1;

player.hooks = {
  onSwap() { sfx.swap(); },
  onHit(kind, target) {
    const px = player.pos.x, pz = player.pos.z;
    if (kind === 'enemy') {
      unlockThing('hp');
      // 会心の一撃（ときどき2倍・大きく吹っ飛ぶ）
      const crit = Math.random() < PLAYER.crit;
      const dmg = Math.round(stat.dmg() * (crit ? PLAYER.critMul : 1) * 10) / 10;
      const killed = enemies.hit(target, dmg, px, pz, crit ? 1.8 : 1);
      const hy = 0.55 * target.def.size + (target.hopY || 0);
      if (crit) {
        sfx.crit(); shake(0.32); hitStop = Math.max(hitStop, 0.12); vib(25);
        burst(target.x, hy, target.z, { n: 16, colors: [0xffffff, 0xffe066, 0xffb14a], speed: 7, up: 2, size: 0.12, life: 0.35, g: 0, floor: false });
        ring(target.x, target.z, 0xffe066, 1.6 * target.def.size, 0.3);
        floatText(`${dmg}!`, target.x, hy + 0.8, target.z, 'crit');
      } else {
        sfx.slash(); sfx.thud(); shake(0.14); hitStop = Math.max(hitStop, 0.055);
        floatText(String(dmg), target.x, hy + 0.7, target.z, 'dmg');
      }
      burst(target.x, hy, target.z, { n: 9, colors: [0xffffff, 0xfff3a0], speed: 5.5, up: 1.5, size: 0.1, life: 0.25, g: 0, floor: false });
      burst(target.x, hy, target.z, { n: 6, color: target.color.getHex(), speed: 2.8, up: 4, size: 0.13, life: 0.5 });
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
    vib(30);
    unlockThing('hp');
    sfx.hurt(); shake(0.25); hud.hurt();
    floatText('-' + n, player.pos.x, 1.6, player.pos.z, 'hurt');
  },
  onDown() {
    sfx.down(); shake(0.35);
    const n = items.dropHalf(player);
    enemies.resetBoss();
    hud.bossBar(null, null);
    warn.visible = false; warnLine.visible = false;
    enemies.clearRocks(); for (const w of warnPool) w.visible = false;
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

// 続けて倒すとつながる（音が上がり、経験値が少し増える）
let chain = 0, chainT = 0, hitStop = 0;
function onKill(e, byWorker = false) {
  const def = e.def;
  sfx.kill(); shake(def.boss ? 0.6 : 0.24);
  if (!byWorker) {
    hitStop = Math.max(hitStop, def.boss ? 0.35 : 0.09);
    chain = chainT > 0 ? chain + 1 : 1; chainT = 4;
    if (chain >= 2) { sfx.chain(chain); floatText(t('chain', { n: chain }), player.pos.x, 2.6, player.pos.z, 'chain'); }
  }
  const y = 0.4 * def.size;
  burst(e.x, y, e.z, { n: def.boss ? 60 : 18, color: e.color.getHex(), speed: def.boss ? 7 : 4, up: 5, size: def.boss ? 0.3 : 0.16, life: 0.9 });
  ring(e.x, e.z, 0xffffff, def.boss ? 6 : 1.6, 0.4);
  if (!e.minion) {
    // 兵士が倒した分は、倉庫があれば倉庫へ直接しまう
    const total = Object.values(S.storage).reduce((a, b) => a + b, 0);
    if (byWorker && stations.storageReady() && total < stations.storageCap()) {
      for (const k in def.drop) { S.storage[k] = (S.storage[k] || 0) + def.drop[k]; S.book.mat[k] = 1; }
      floatText('📦', e.x, 1.4, e.z, 'coin');
    } else for (const k in def.drop) popDrops(k, def.drop[k] + (!def.boss && Math.random() < PLAYER.dropBonus ? 1 : 0), e.x, e.z, 0.5 + y);
  }
  if (!e.minion && def.coins) {
    const pieces = Math.min(8, def.coins);
    for (let i = 0; i < pieces; i++) {
      const part = i === pieces - 1 ? def.coins - Math.floor(def.coins / pieces) * (pieces - 1) : Math.floor(def.coins / pieces);
      coins.send(e.x, 1, e.z, () => ({ x: player.pos.x, y: 1.2, z: player.pos.z }), 0.45 + i * 0.05, () => addCoins(part), 1.6);
    }
    floatText('+' + def.coins, e.x, 1.8 * def.size, e.z, 'coin');
  }
  missions.event('kill', e.type);
  requests.event('hunt', e.type);
  S.stats.kills++;
  // 図鑑と経験値（兵士が倒した分は少し）
  S.book.mon[e.type] = (S.book.mon[e.type] || 0) + 1;
  unlockThing('book', 'unlock_book');
  gainXp(def.xp * (e.minion ? 0.5 : byWorker ? 0.3 : 1) * (byWorker ? 1 : 1 + Math.min(0.5, (chain - 1) * 0.1)), e.x, e.z);
  if (def.boss) {
    S.bosses[e.type] = true;
    playMusic(chapterTrack());
    vib([60, 40, 120]);
    if (e.type === 'bigslime') S.bossDead = true;
    hud.bossBar(null, null);
    for (let i = enemies.list.length - 1; i >= 0; i--) if (enemies.list[i].minion) { const m = enemies.list[i]; burst(m.x, 0.4, m.z, { n: 10, color: m.color.getHex(), speed: 3, up: 4, size: 0.14, life: 0.6 }); enemies.list.splice(i, 1); }
    saveNow();
  }
}

// 背中がいっぱいのとき、モンスターの素材などと入れかえて捨てる素材
const COMMON = ['wood', 'stone'];

function popDrops(kind, n, x, z, y) {
  const base = Math.atan2(player.pos.z - z, player.pos.x - x);
  for (let i = 0; i < n; i++) {
    const a = base + (Math.random() - 0.5) * 1.8, sp = 1.4 + Math.random() * 1.3;
    items.pop(kind, x, y, z, Math.cos(a) * sp, 4.5 + Math.random() * 2, Math.sin(a) * sp);
  }
}

const itemHooks = {
  onPick(it, n) { S.book.mat[it.kind] = 1; sfx.pickup(n); unlockThing('bag'); missions.event('gather', it.kind); dirty = true; },
  onStack(it) { burst(it.p.x, it.p.y, it.p.z, { n: 2, color: 0xffffff, speed: 1, up: 1, size: 0.06, life: 0.2, g: 0, floor: false }); },
  onFull() { fullT = 1.2; fullHint(); },
  makeRoom(kind) {
    if (COMMON.includes(kind)) return false;
    const need = neededKinds();
    const it = items.take(player, k => COMMON.includes(k) && !need.has(k)) || items.take(player, k => COMMON.includes(k));
    if (!it) return false;
    items.remove(it);
    burst(player.anchor.x, player.anchor.y + 0.4, player.anchor.z, { n: 6, color: MATERIALS[it.kind].color, speed: 2, up: 3, size: 0.1, life: 0.4 });
    if (!S.unlocked.swapHint) { S.unlocked.swapHint = true; hud.toast(t('swapHint')); }
    return true;
  },
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
      if (d.storage) setTimeout(() => unlockThing('store', 'unlock_store'), 1200);
      if (d.pop) { const before = workers.list.length; workers.sync(player); const n = workers.list.length - before; if (n) setTimeout(() => hud.toast(`${iconImg('people')} ${t('newPeople', { n })}`), 900); }
    }
    gainXp(LEVEL.build, d.tile[0], d.tile[1]);
    world.setLush(lushNow());
    saveNow();
  },
  onNewTile() { hud.toast(t('newTile')); },
  fromStorage: pred => stations.fromStorage(pred),
};

const stationHooks = {
  onFeed(kind) { missions.event('feed', kind); dirty = true; },
  onTake(kind) { S.book.mat[kind] = 1; missions.event('take', kind); unlockThing('bag'); dirty = true; },
  onStock(shopId) { missions.event('stock', shopId); dirty = true; },
  onGuest() { missions.event('guest'); dirty = true; },
  onMake(kind) { missions.event('make', kind); },
  onFull() { fullT = 1.2; fullHint(); },
  onAnvil() { openSmithy(); },
  neededKinds,
  onStorageFull() { if (!storageFullT) { storageFullT = 3; hud.toast(t('storageFull'), 'bad'); } },
  keeper: () => workers.keeper(),
  keeperBoost: () => 1 + (S.jobLv.keeper || 0) * JOB_UP.work,
  onCoin(n, auto) {
    const k = workers.keeper();
    if (auto && k) addCoins(n, k.x, 2, k.z); else addCoins(n);
    dirty = true;
  },
  onSell() { dirty = true; },
  onCook(dish) { missions.event('cook', dish); requests.event('cook', dish); S.book.dish[dish] = (S.book.dish[dish] || 0) + 1; dirty = true; },
  onShipArrive() { hud.toast(`⛵ ${t('shipCome')}`); sfx.horn(); },
  onShip(n, money) { missions.event('ship'); hud.toast(`⛵ ${t('shipSold', { n, m: money })}`, 'good'); dirty = true; },
  onSoldierHit(e, killed, w) {
    const hy = 0.55 * e.def.size;
    burst(e.x, hy, e.z, { n: 5, colors: [0xffffff, 0xcfd8e8], speed: 4, up: 1.5, size: 0.08, life: 0.25, g: 0, floor: false });
    if (Math.hypot(w.x - player.pos.x, w.z - player.pos.z) < 12) sfx.clang();
    if (killed) onKill(e, true);
  },
};

// ぬし
const warn = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.35, depthWrite: false }));
warn.visible = false; warn.renderOrder = 2; scene.add(warn);
const warnLine = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 6.6).rotateX(-Math.PI / 2), warn.material);
warnLine.visible = false; warnLine.renderOrder = 2; scene.add(warnLine);
const warnPool = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(warn.geometry, warn.material); m.scale.setScalar(1.5); m.visible = false; m.renderOrder = 2; scene.add(m); return m; });
const bossHooks = {
  onBossStart(e) {
    // ぬしの登場：カメラが寄って名前が出る
    sfx.roar(); shake(0.4); vib([80, 40, 80]);
    bossIntro = { e, t: 0 };
    $('bossIntro').hidden = false;
    $('bossIntroName').textContent = t('boss_' + e.type);
    $('bossIntroSub').textContent = t('bossAppear');
    playMusic('boss');
  },
  onBossEnd() { hud.bossBar(null, null); playMusic(chapterTrack()); },
  onBossLeap(e) { warn.visible = true; warn.position.set(e.lx, 0.06, e.lz); warn.userData.t = 0; warn.userData.r = e.def.slamR; },
  onBossDashWarn(e) {
    warnLine.visible = true; warnLine.userData.t = 0;
    warnLine.position.set(e.x + e.ddx * 3.3, 0.07, e.z + e.ddz * 3.3);
    warnLine.rotation.y = Math.atan2(e.ddx, e.ddz);
    sfx.roar();
  },
  onBossDash() { warnLine.visible = false; sfx.slash(); shake(0.3); },
  onBossBreathWarn(e) {
    warnLine.visible = true; warnLine.userData.t = 0; warnLine.scale.x = 1.75;
    warnLine.position.set(e.x + e.ddx * 4.6, 0.07, e.z + e.ddz * 4.6);
    warnLine.rotation.y = Math.atan2(e.ddx, e.ddz);
    sfx.roar();
  },
  onBossBreath() { warnLine.visible = false; warnLine.scale.x = 1; sfx.fire(); shake(0.25); },
  onBreathTick(e) {
    for (let i = 0; i < 3; i++) {
      const k = 0.5 + Math.random() * 8;
      burst(e.x + e.ddx * k, 0.6 + (e.hopY || 0) * (1 - k / 9), e.z + e.ddz * k, { n: 1, colors: [0xff7a2a, 0xffc04a, 0xffe46a, 0xff4a2a], speed: 1.2, up: 2, size: 0.35, life: 0.45, g: -3, floor: false, spread: 1.2, grow: 0.8 });
    }
  },
  onBossThrow(e, targets) {
    sfx.roar();
    targets.forEach((tg, i) => { const w = warnPool[i]; w.visible = true; w.position.set(tg.x, 0.06, tg.z); w.userData.t = 0; w.userData.life = 1.1 + i * 0.15; });
  },
  onRockLand(r, hit) {
    sfx.slam(); shake(0.3);
    burst(r.tx, 0.3, r.tz, { n: 14, colors: [0x8f8a84, 0xb4b0a8, 0xe2c38f], speed: 4, up: 3, size: 0.18, life: 0.6 });
    ring(r.tx, r.tz, 0xe2c38f, 1.8, 0.4);
    if (hit) player.damage(r.dmg, r.tx, r.tz);
    if (r.fire) burst(r.tx, 0.4, r.tz, { n: 10, colors: [0xff7a2a, 0xffc04a, 0xffe46a], speed: 3, up: 4, size: 0.14, life: 0.5 });
  },
  onBossSlam(e) {
    warn.visible = false;
    sfx.slam(); shake(0.55);
    ring(e.x, e.z, 0xe2c38f, e.def.slamR * 1.2, 0.5);
    burst(e.x, 0.3, e.z, { n: 24, colors: [0xe2c38f, 0xc9a877, 0x8be36a], speed: 6, up: 3, size: 0.2, life: 0.7 });
  },
  onBossCall(e) {
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * 6.28, x = e.x + Math.cos(a) * 2.5, z = e.z + Math.sin(a) * 2.5;
      const m = enemies.spawn(e.def.minion, { x, z, r: 1 }, { minion: true, x, z });
      burst(x, 0.4, z, { n: 8, color: m.color.getHex(), speed: 2, up: 3, size: 0.12, life: 0.5 });
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
  // 施設の強化
  facilities: () => [...(stations.storageReady() ? [{ id: 'storage', storage: true, name: t('b_storage'), icon: 'box', lv: stations.storageLv(), cap: stations.storageCap(), used: stations.storageTotal() }] : []),
    ...stations.proc.filter(p => p.site.done).map(p => ({ id: p.id, name: t('b_' + p.site.def.model), icon: p.to, lv: stations.lv(p), cap: p.def.inCap || p.def.outCap }))],
  buyFacility(id) {
    if (id === 'storage') return game.buyStorage();
    const p = stations.get(id), lv = stations.lv(p);
    if (lv >= FACILITY.costs.length) return;
    const c = FACILITY.costs[lv];
    if (S.coins < c.coin) return;
    for (const m in c) if (m !== 'coin' && game.bagCount(m) < c[m]) return;
    for (const m in c) if (m !== 'coin') stations.useMaterial(player, m, c[m]);
    S.coins -= c.coin; S.fac[id] = lv + 1;
    const d = p.site.def;
    burst(d.x, 2, d.z, { n: 30, colors: [0xffe066, 0xffffff, 0x8fd3ff], speed: 4, up: 5, size: 0.14, life: 0.9 });
    ring(d.x, d.z, 0xffe7a0, 4, 0.5); shake(0.25); vib(40);
    p.site.anim = 0;
    sfx.build();
    missions.event('facility');
    hud.toast(`🏗 ${t('facUp', { b: t('b_' + d.model), n: lv + 2 })}`, 'good');
    saveNow();
  },
  // 背中の中身（種類ごとの数）と、捨てる
  bagList() {
    const m = new Map();
    for (const it of player.bag) if (it.state === 'bag') m.set(it.kind, (m.get(it.kind) || 0) + 1);
    return [...m.entries()];
  },
  neededKinds: () => neededKinds(),
  bagCap: () => player.cap,
  discard(k, n) {
    let left = n;
    for (let i = player.bag.length - 1; i >= 0 && left > 0; i--) {
      const it = player.bag[i];
      if (it.kind !== k || it.state !== 'bag') continue;
      player.bag.splice(i, 1); items.remove(it); left--;
    }
    if (left === n) return;
    sfx.pop();
    burst(player.anchor.x, player.anchor.y + 0.4, player.anchor.z, { n: 10, color: MATERIALS[k].color, colors: [MATERIALS[k].color, 0xffffff], speed: 2.5, up: 3, size: 0.12, life: 0.5 });
    dirty = true;
  },
  // 倉庫の中身を売る（値段は素材の値段。市場より安い）
  sellPrice: k => (MATERIALS[k] && MATERIALS[k].price) || STORAGE.sellMin,
  storageTotal: () => stations.storageTotal(),
  storageCap: () => stations.storageCap(),
  sellStorage(k, n) {
    n = Math.min(n, S.storage[k] || 0);
    if (!stations.storageReady() || n <= 0) return;
    S.storage[k] -= n;
    if (!S.storage[k]) delete S.storage[k];
    const money = n * game.sellPrice(k);
    addCoins(money);
    S.stats.sold += n;
    const d = stations.storage.door;
    burst(d.x, 1.2, d.z, { n: 12, colors: [0xffd84a, 0xffffff], speed: 2.5, up: 4, size: 0.1, life: 0.6 });
    hud.toast(`${iconImg(k)} ${t('soldN', { x: t('m_' + k), n })} ${iconImg('coin')}+${money}`, 'good');
    dirty = true;
  },
  // 倉庫の強化（預けられる数が増える）
  buyStorage() {
    const lv = stations.storageLv();
    if (!stations.storageReady() || lv >= STORAGE.costs.length) return;
    const c = STORAGE.costs[lv];
    if (S.coins < c.coin) return;
    for (const m in c) if (m !== 'coin' && game.bagCount(m) < c[m]) return;
    for (const m in c) if (m !== 'coin') stations.useMaterial(player, m, c[m]);
    S.coins -= c.coin; S.fac.storage = lv + 1;
    const site = stations.storage.site, d = site.def;
    burst(d.x, 2, d.z, { n: 30, colors: [0xffe066, 0xffffff, 0x8fd3ff], speed: 4, up: 5, size: 0.14, life: 0.9 });
    ring(d.x, d.z, 0xffe7a0, 4, 0.5); shake(0.25); vib(40);
    site.anim = 0;
    sfx.build();
    missions.event('facility');
    hud.toast(`🏗 ${t('storageUp', { n: lv + 2, c: stations.storageCap() })}`, 'good');
    saveNow();
  },
  // 住民の仕事の強化
  buyJob(job) {
    const lv = S.jobLv[job] || 0;
    if (lv >= JOB_UP.costs.length || S.coins < JOB_UP.costs[lv]) return;
    S.coins -= JOB_UP.costs[lv]; S.jobLv[job] = lv + 1;
    workers.refresh();
    for (const w of workers.list) if (w.job === job) burst(w.x, 1, w.z, { n: 10, colors: [0xffe066, 0xffffff], speed: 2, up: 3, size: 0.08, life: 0.6 });
    sfx.upgrade();
    missions.event('jobup');
    hud.toast(`⬆ ${t('jobUp', { j: t('job_' + job), n: lv + 2 })}`, 'good');
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
    missions.event('craft');
    sfx.anvil(); setTimeout(() => sfx.upgrade(), 150);
    const a = stations.anvil.pos;
    burst(a.x, 1, a.z, { n: 24, colors: [0xffb14a, 0xffe066, 0xffffff], speed: 4, up: 5, size: 0.08, life: 0.6 });
    hud.toast(`⚒ ${t('upgraded', { x: t('tool_' + k) })}`, 'good');
    saveNow();
  },
  // 鍛冶屋で装備を作る（作ったら強いほうを自動で身につける）
  craft(kind, id) {
    const list = kind === 'w' ? WEAPONS : ARMORS, g = list.find(x => x.id === id), key = kind === 'w' ? id : 'a_' + id;
    if (!g || !g.cost || S.gear[key]) return;
    const c = g.cost;
    if (S.coins < c.coin) return;
    for (const m in c) if (m !== 'coin' && game.bagCount(m) < c[m]) return;
    for (const m in c) if (m !== 'coin') stations.useMaterial(player, m, c[m]);
    S.coins -= c.coin; S.gear[key] = true;
    if (kind === 'w' && list.indexOf(g) > list.indexOf(weaponOf())) S.weapon = id;
    if (kind === 'a' && list.indexOf(g) > list.indexOf(armorOf())) S.armor = id;
    player.applyStats();
    missions.event('craft');
    sfx.anvil(); setTimeout(() => sfx.upgrade(), 150);
    const a = stations.anvil.pos;
    burst(a.x, 1, a.z, { n: 30, colors: [0xffb14a, 0xffe066, 0xffffff, g.color], speed: 4, up: 5, size: 0.09, life: 0.7 });
    vib(40);
    hud.toast(`⚒ ${t('crafted', { x: t((kind === 'w' ? 'w_' : 'a_') + id) })}`, 'good');
    saveNow();
  },
  // 作った装備から選んで身につける
  equip(kind, id) {
    const list = kind === 'w' ? WEAPONS : ARMORS, g = list.find(x => x.id === id);
    if (!g || (g.cost && !S.gear[kind === 'w' ? id : 'a_' + id])) return;
    if (kind === 'w') S.weapon = id; else S.armor = id;
    player.applyStats();
    player.hp = Math.min(player.hp, player.maxHp);
    sfx.swap();
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
  afterClear() {
    if (!CHAPTERS[S.ch + 1]) { hud.toast(t('nextSoon_' + S.ch)); return; }
    // 次の章へ（世界を作り直すために読み込み直す）
    S.ch++; S.mission = 0; S.mp = 0; S.missionId = null;
    saveNow(); started = false;
    hud.fade(true);
    sessionStorage.setItem('ctk-autostart', '1');
    setTimeout(() => location.reload(), 600);
  },
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
  for (const r of S.requests) if (r.type === 'mat') need.add(r.kind);
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
  // 大きく減っていれば薬、そうでなければゼリー
  const big = player.hp <= player.maxHp - PLAYER.medicineHeal;
  let it = big ? items.take(player, k => k === 'medicine') : null;
  const heal = it ? PLAYER.medicineHeal : PLAYER.jellyHeal;
  it = it || items.take(player, k => k === 'jelly');
  if (!it) return;
  items.remove(it);
  eatCd = PLAYER.jellyCd;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  sfx.eat();
  floatText('+' + heal, player.pos.x, 1.8, player.pos.z, 'heal');
  burst(player.pos.x, 1.0, player.pos.z, { n: 10, colors: [0x86e36f, 0xc8f5a8, 0xffffff], speed: 1.8, up: 3, size: 0.1, life: 0.6 });
}

// ---- ミッション ----
function missionTick() {
  const ctx = { builds, rank: rankNow(), allCrafted: allCrafted() };
  for (const it of player.bag) S.book.mat[it.kind] = 1;
  const done = missions.check(ctx);
  if (done) {
    sfx.mission();
    gainXp(Math.max(5, done.reward * LEVEL.missionMul));
    if (done.reward) {
      S.coins += done.reward; S.earned += done.reward; unlockThing('coins');
      hud.toast(`⭐ ${t('missionDone')} ${iconImg('coin')}+${done.reward}`, 'good');
    } else hud.toast(`⭐ ${t('missionDone')}`, 'good');
    for (const u of done.unlock || []) unlockThing(u, u === 'gear' ? null : 'unlock_' + u);
    if (done.id === 'house') unlockThing('hp');
    // 章の最後のミッションが終わったら、章クリア（最後の章ならエンディング）
    if (!missions.current()) { if (S.ch >= LAST_CHAPTER) setTimeout(startEnding, 1200); else clearT = 2.5; }
    dirty = true;
  }
  const m = missions.current();
  if (!m) { hud.mission(`🌟 ${t(S.ch >= LAST_CHAPTER ? 'm_free_end' : 'm_free')}`, null, 0); return; }
  if (m.type === 'upgrade') hud.newDot('btnUpgrade', true);
  if (m.type === 'hire' || m.type === 'hireJob') hud.newDot('btnHire', true);
  hud.mission(t('m_' + m.id, { n: m.n }), missions.progress(m, ctx), m.reward);
}

function allCrafted() {
  return WEAPONS.every(w => !w.cost || S.gear[w.id]) && ARMORS.every(a => !a.cost || S.gear['a_' + a.id]) && Object.keys(TOOLS).every(k => S.tool[k] >= TOOLS[k].costs.length);
}

// ミッションの目的地（画面の外なら端に矢印）
function missionTarget() {
  const m = missions.current();
  if (!m) return null;
  const P = player.pos;
  // 背中が満杯で、今使う素材がないときは、くべるマスへ案内
  switch (m.type) {
    case 'gather': {
      const hunt = { horn: ['troll'], scale: ['drake'], fur: ['wolf'], honey: ['bee'], mushcap: ['mushroom'], meat: ['boar'], bone: ['skeleton'], cloth: ['goblin'], crabmeat: ['crab'], tail: ['lizard'], firestone: ['wisp'], jelly: ['slime'] }[m.kind];
      if (hunt) { let best = null, bd = Infinity; for (const z of ch.spawns) if (hunt.includes(z.type) && world.isWalk(world.landOf(z.x, z.z))) { const d = Math.hypot(z.x - P.x, z.z - P.z); if (d < bd) { bd = d; best = z; } } return best && bd > 4 ? { x: best.x, z: best.z, y: 1.5 } : null; }
      const type = { wood: 'tree', ore: 'ironrock', herb: 'herb', stone: 'rock', gold: 'goldrock' }[m.kind] || 'tree';
      if (items.count(player, m.kind) >= m.n - S.mp && player.bag.length) return null;
      let best = null, bd = Infinity;
      for (const n of resources.nodes) if (n.type === type && n.state === 'ok' && world.isWalk(n.land) && !((type === 'tree' || type === 'rock') && world.isHunt(n.land))) { const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < bd) { bd = d; best = n; } }
      return best && bd > 2 ? { x: best.x, z: best.z, y: type === 'tree' ? 2.8 : 1.6 } : null;
    }
    case 'feed': {
      if (m.kind === 'fur') return stations.inn ? { x: stations.inn.furPos.x, z: stations.inn.furPos.z } : null;
      const s = stations.proc.find(p => p.from.includes(m.kind)); return s ? { x: s.inPos.x, z: s.inPos.z } : null;
    }
    case 'take': { const s = stations.proc.find(p => p.to === m.kind); return s ? { x: s.outPos.x, z: s.outPos.z } : null; }
    case 'make': { const s = stations.proc.find(p => p.to === m.kind); return s ? (s.gen ? { x: s.outPos.x, z: s.outPos.z } : { x: s.inPos.x, z: s.inPos.z }) : null; }
    case 'stock': { const sh = stations.shops.find(x => x.id === (m.kind || 'shop')); return sh ? { x: sh.stock.x, z: sh.stock.z } : null; }
    case 'cook': { const k = stations.kitchen; return k && k.site.done ? { x: k.inPos.x, z: k.inPos.z } : null; }
    case 'ship': { const sh = stations.shops.find(x => x.ship); return sh ? { x: sh.stock.x, z: sh.stock.z } : null; }
    case 'guest': {
      const inn = stations.inn;
      if (!inn) return null;
      if (S.inn.coins > 0) return { x: inn.coinPos.x, z: inn.coinPos.z };
      return { x: inn.furPos.x, z: inn.furPos.z };
    }
    case 'earn': return S.shop.coins > 0 ? { x: stations.shop.coinPos.x, z: stations.shop.coinPos.z } : { x: stations.shop.stock.x, z: stations.shop.stock.z };
    case 'tool': case 'craft': return stations.anvil ? { x: stations.anvil.pos.x, z: stations.anvil.pos.z } : null;
    case 'request': {
      let best = null, bd = Infinity;
      for (const r of S.requests) { const p = requests.spotOf(r); if (p) { const d = Math.hypot(p.x - P.x, p.z - P.z) - (requests.isReady(r, game.bagCount) ? 100 : 0); if (d < bd) { bd = d; best = p; } } }
      return best && Math.hypot(best.x - P.x, best.z - P.z) > 2 ? { x: best.x, z: best.z, y: 2.6 } : null;
    }
    case 'kill': {
      let best = null, bd = Infinity;
      for (const z of ch.spawns) if (z.type === m.kind && world.isWalk(world.landOf(z.x, z.z))) { const d = Math.hypot(z.x - P.x, z.z - P.z); if (d < bd) { bd = d; best = z; } }
      return best && bd > 4 ? { x: best.x, z: best.z, y: 1.5 } : null;
    }
    case 'boss': { const b = enemies.bossOf(m.kind); return b && b.alive ? { x: b.x, z: b.z, y: 2 + b.def.size * 0.8 } : null; }
    default: return null;
  }
}

// ---- 章クリア ----
function chapterClear() {
  const n = S.ch;
  S.cleared[n] = true;
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
  const text = t('shareText_' + n, { r: rank, p: pop, t: fmtTime(time) });
  setTimeout(() => ui.show('clear', {
    rank, pop, time, n, next: !!CHAPTERS[n + 1],
    shareUrl: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(GAME_URL),
  }), 2200);
}

// ---- エンディング：城が完成 → 戴冠式 → スタッフロール → おしまい ----
let ending = null, bossIntro = null, lastLand = null;
function startEnding() {
  if (ending) return;
  S.cleared[S.ch] = true;
  world.setLush(1);
  saveNow();
  ending = { t: 0, fw: 0, crowned: false, rolled: false };
  playMusic('ending');
  document.getElementById('app').classList.add('ending');
  player.pos.set(0, 0, -37.6); player.yaw = 0; player.invul = 9999; player.hp = player.maxHp;
  camTarget.set(0, 0, -39);
  workers.party = { x: 0, z: -37.6 };
  sfx.fanfare();
  $('coronation').hidden = false;
  $('corTitle').textContent = t('corTitle');
  $('corSub').textContent = t('corSub');
}
function updateEnding(dt) {
  const e = ending;
  e.t += dt;
  player.invul = 9999;
  // 花火
  e.fw -= dt;
  if (e.fw <= 0 && e.t < 12) {
    e.fw = 0.45;
    const x = (Math.random() - 0.5) * 16, z = -46 + (Math.random() - 0.5) * 6;
    burst(x, 9 + Math.random() * 4, z, { n: 36, colors: [0xff6b6b, 0xffd93d, 0x6bcbff, 0x7ee06a, 0xff9ff3, 0xffffff], speed: 6, up: 2, size: 0.16, life: 1.6, g: 3, floor: false });
    sfx.pop();
  }
  if (!e.crowned && e.t > 2.2) {
    e.crowned = true;
    player.m.crown.visible = true;
    burst(player.pos.x, 2.2, player.pos.z, { n: 30, colors: [0xffe066, 0xffffff, 0xffd34d], speed: 3, up: 4, size: 0.1, life: 1.0 });
    ring(player.pos.x, player.pos.z, 0xffe7a0, 3, 0.6);
    sfx.unlock();
  }
  if (!e.rolled && e.t > 8) { e.rolled = true; $('coronation').hidden = true; showCredits(); }
}
function showCredits() {
  const rank = rankNow(), pop = workers.list.length;
  const lines = [
    ['big', t('title')], ['sub', t('subtitle')], ['gap'],
    ['h', t('crStaff')], ['p', 'Tanuki Box'], ['gap'],
    ['h', t('crCast')], ['p', t('crCast1')], ['p', t('crCast2')], ['p', t('crCast3')], ['p', t('crCast4')], ['gap'],
    ['h', t('crTech')], ['p', 'three.js (MIT License)'], ['p', 'M PLUS Rounded 1c'], ['gap'],
    ['h', t('crYours')], ['p', `${t('statRank')}　${rank}`], ['p', `${t('statPop')}　${pop}`], ['p', `${t('statTime')}　${fmtTime(S.time)}`],
    ['p', t('crSold', { n: S.stats.sold.toLocaleString() })], ['p', t('crKills', { n: S.stats.kills.toLocaleString() })], ['gap'],
    ['big', t('crThanks')],
  ];
  $('creditsRoll').innerHTML = lines.map(([k, v]) => k === 'gap' ? '<div class="cr-gap"></div>' : `<div class="cr-${k}">${v}</div>`).join('');
  $('credits').hidden = false;
  $('btnSkip').textContent = t('crSkip');
  const roll = $('creditsRoll');
  roll.classList.remove('rolling'); void roll.offsetWidth; roll.classList.add('rolling');
  const done = () => { roll.removeEventListener('animationend', done); showEndCard(); };
  roll.addEventListener('animationend', done);
  $('btnSkip').onclick = done;
}
function showEndCard() {
  $('credits').hidden = true;
  const rank = rankNow(), pop = workers.list.length;
  const text = t('shareText_end', { r: rank, p: pop, t: fmtTime(S.time) });
  $('endcard').hidden = false;
  $('endTitle').textContent = t('endTitle');
  $('endSub').textContent = t('endSub');
  $('endStats').innerHTML = `<div><small>${t('statRank')}</small><b>${iconImg('crown')}${rank}</b></div><div><small>${t('statPop')}</small><b>${iconImg('people')}${pop}</b></div><div><small>${t('statTime')}</small><b>${fmtTime(S.time)}</b></div>`;
  $('endShare').textContent = '𝕏 ' + t('share');
  $('endShare').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(GAME_URL);
  $('endKeep').textContent = t('keepPlaying');
  $('endKeep').onclick = () => {
    $('endcard').hidden = true;
    playMusic(chapterTrack());
    document.getElementById('app').classList.remove('ending');
    workers.party = null; player.invul = 1;
    ending = null;
    hud.toast(`👑 ${t('endFree')}`);
    saveNow();
  };
}

// ---- 留守の間の売上 ----
function awayReport() {
  const now = Date.now();
  if (!S.lastSeen || now - S.lastSeen < 60 * 1000) return null;
  return offlineSales((now - S.lastSeen) / 1000);
}
function offlineSales(sec) {
  const n = j => S.hired.filter(h => h === j).length;
  const gather = 0.1 * Object.keys(JOBS).filter(j => JOBS[j].node).reduce((a, j) => a + n(j) * (builds.isDone(JOBS[j].to) ? 1 : 0), 0);
  const stock = stations.proc.reduce((a, p) => a + (p.site.done ? stations.st(p).out : 0), 0);
  const rate = n('carrier') ? Math.min(gather + stock / Math.max(sec, 1), n('carrier') * 0.25) : 0;
  const r = stations.offline(sec, { rate, price: S.ch >= 2 ? 8 : 5 });
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
  $('lblMusic').textContent = t('music'); $('mOn').textContent = t('on'); $('mOff').textContent = t('off');
  $('lblVib').textContent = t('vibrate'); $('vOn').textContent = t('on'); $('vOff').textContent = t('off');
  $('sOn').textContent = t('on'); $('sOff').textContent = t('off');
  $('lblLang').textContent = t('language');
  $('btnReset').textContent = t('reset');
  $('resetMsg').textContent = t('resetAsk');
  $('btnResetYes').textContent = t('yes'); $('btnResetNo').textContent = t('cancel');
  $('btnClose').setAttribute('aria-label', t('close'));
  $('btnAway').textContent = t('debugAway');
  $('btnAway').hidden = !DEBUG;
}
function syncSettingsUi() {
  settingsTexts();
  document.querySelectorAll('[data-sound]').forEach(b => b.classList.toggle('on', (b.dataset.sound === '1') === soundOn()));
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === i18n.lang));
  document.querySelectorAll('[data-music]').forEach(b => b.classList.toggle('on', (b.dataset.music === '1') === settings.music));
  document.querySelectorAll('[data-vib]').forEach(b => b.classList.toggle('on', (b.dataset.vib === '1') === settings.vibrate));
  $('qInfo').textContent = `${t('quality')}: ×${quality.ratio} ${quality.shadows ? '☀' : ''} ${quality.auto ? '(' + t('qAuto') + ')' : ''}`;
}
const settingsOpen = () => !$('settings').hidden;
$('btnGear').addEventListener('click', () => { unlock(); syncSettingsUi(); $('resetAsk').hidden = true; $('settings').hidden = false; });
$('btnClose').addEventListener('click', () => { $('settings').hidden = true; perfReset(); });
$('settings').addEventListener('pointerdown', e => { if (e.target.id === 'settings') $('settings').hidden = true; });
document.querySelectorAll('[data-sound]').forEach(b => b.addEventListener('click', () => {
  settings.sound = b.dataset.sound === '1'; setSound(settings.sound); unlock(); sfx.pop(); syncSettingsUi(); saveNow();
}));
document.querySelectorAll('[data-music]').forEach(b => b.addEventListener('click', () => {
  settings.music = b.dataset.music === '1'; setMusic(settings.music); unlock(); syncSettingsUi(); saveNow();
}));
document.querySelectorAll('[data-vib]').forEach(b => b.addEventListener('click', () => {
  settings.vibrate = b.dataset.vib === '1'; syncSettingsUi(); vib(40); saveNow();
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
$('bagPill').addEventListener('click', () => { if (!started || ending) return; unlock(); ui.show('bag'); });
$('btnStore').addEventListener('click', () => { unlock(); hud.newDot('btnStore', false); ui.show('store'); });
$('btnBook').addEventListener('click', () => { unlock(); hud.newDot('btnBook', false); ui.show('book'); });
onFirstTouch(unlock);
window.addEventListener('resize', resize);
if (S.stats.kills > 0) S.unlocked.book = true;
if (stations.storageReady()) S.unlocked.store = true;
hud.gates(S.unlocked, false);

// ---- はじめる ----
function begin() {
  unlock();
  started = true;
  playMusic(chapterTrack());
  $('mission').hidden = false;
  const r = awayReport();
  if (r) ui.show('away', r);
  else if (S.mission === 0) hud.toast(`🔥 ${t(ch.title)}`);
  saveNow();
}
if (sessionStorage.getItem('ctk-autostart')) { sessionStorage.removeItem('ctk-autostart'); begin(); }
else ui.showTitle(hasSave, DEBUG, debugCh => { if (debugCh) debugStart(debugCh); else begin(); }, LAST_CHAPTER);

// デバッグ：素材とコインを大量に持って章の最初から（デバッグ用のセーブを作り直して読み込み直す）
function debugStart(n) {
  resetState();
  S.ch = n;
  S.coins = 99999;
  S.up.bag = UPGRADES.bag.costs.length;
  S.unlocked = { bag: true, hp: true, coins: true, book: true };
  S.lastSeen = Date.now();
  // 前の章まではぜんぶ終わった状態にする
  const done = {};
  for (let c = 1; c < n; c++) {
    const d = CHAPTERS[c];
    for (const b of d.builds) { done[b.id] = { paid: {}, done: true }; if (b.type === 'land') S.lands.push(b.land); }
    S.bosses[d.boss] = true; S.cleared[c] = true;
    for (const m of d.missions) for (const u of m.unlock || []) S.unlocked[u] = true;
  }
  const gear = (w, a) => { S.weapon = w; S.armor = a; S.gear[w] = true; S.gear['a_' + a] = true; };
  if (n >= 2) { S.bossDead = true; S.hired = ['lumber', 'miner', 'carrier', 'keeper']; S.up.speed = 2; S.tool = { axe: 2, pick: 2 }; S.level = 6; gear('stone', 'jelly'); }
  if (n >= 3) { S.hired.push('herbalist', 'carrier'); S.up.speed = 4; S.tool = { axe: 3, pick: 3 }; S.level = 10; gear('cleaver', 'fur'); }
  if (n >= 4) { S.hired.push('soldier', 'soldier', 'carrier'); S.up.speed = 6; S.tool = { axe: 4, pick: 4 }; S.level = 14; gear('bone', 'bone'); }
  const later = { 2: ['ore', 'fur', 'herb', 'medicine', 'meat', 'cloth'], 3: ['gold', 'horn', 'bone', 'crabmeat'], 4: ['scale', 'tail', 'firestone'] };
  const kinds = Object.keys(MATERIALS).filter(k => !MATERIALS[k].dish && !Object.keys(later).some(c => +c > n && later[c].includes(k))), cap = UPGRADES.bag.values[S.up.bag];
  for (const k of kinds) S.book.mat[k] = 1;
  writeSave({ v: 2, state: S, builds: done, bag: Array.from({ length: cap - 10 }, (_, i) => kinds[i % kinds.length]), hp: 99, settings }, SLOT);
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
// 動作確認用：ctk.step(秒) で画面を描かずに時間を進められる
if (DEBUG) window.ctk = { S, player, requests, gainXp: n => gainXp(n), game, items, builds, resources, enemies, world, stations, workers, missions, startEnding: () => startEnding(), step: sec => { for (let i = 0; i < sec * 30; i++) tick(1 / 30, false); } };

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
  tick(raw, true);
}

// 1コマぶんの処理。show = 画面に描く（デバッグの早送りでは描かない）
function tick(raw, show) {
  const paused = !started || ui.blocking() || settingsOpen();
  let dt = paused ? 0 : Math.min(Math.max(raw, 0), 1 / 20);
  if (hitStop > 0 && !paused) { hitStop -= Math.max(raw, 0); dt *= 0.06; }
  if (!paused) chainT = Math.max(0, chainT - dt);
  const fdt = Math.min(Math.max(raw, 0), 1 / 20);
  time += fdt;
  if (!paused) S.time += dt;
  perfTick(raw);
  // 朝・昼・夕焼け・夜（8分でひとまわり）
  if (!paused) S.day = (S.day + dt / 480) % 1;
  // 狩り場に入った・領地に戻った
  const here = world.landOf(player.pos.x, player.pos.z);
  if (started && here !== lastLand) {
    const wasHunt = lastLand && world.isHunt(lastLand), isHunt = here && world.isHunt(here);
    if (isHunt && !wasHunt) hud.toast(`⚔ ${t('enterHunt', { l: t('l_' + here) })}`, 'bad');
    else if (!isHunt && wasHunt) hud.toast(`🏠 ${t('backHome')}`);
    lastLand = here;
  }
  const night = setDay(S.day);
  world.setNight(night);
  // ぬしの登場演出
  if (bossIntro) { bossIntro.t += fdt; if (bossIntro.t > 2.2) { bossIntro = null; $('bossIntro').hidden = true; } }

  if (paused || ending) { move.x = move.z = move.m = 0; } else readMove(move);
  if (ending) updateEnding(fdt);
  if (!paused) {
    player.update(dt, { move, world, resources, enemies });
    enemies.update(dt, player, bossHooks);
    enemies.updateRocks(dt, player, bossHooks);
    for (const w of warnPool) if (w.visible) { w.userData.t += dt; if (w.userData.t > w.userData.life) w.visible = false; }
    workers.update(dt, player, stationHooks);
    resources.update(dt);
    items.update(dt, player, time, itemHooks);
    builds.update(dt, time, player, items, coins, buildHooks);
    stations.update(dt, time, player, stationHooks);
    if (started && !ending) requests.update(dt, player, game.bagCount, requestDone, requestNew);
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
  requests.render(people, blobs, player, time);
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
  // エンディング中は城の方を、ぬしの登場中はぬしを見る
  const fx = ending ? 0 : bossIntro ? bossIntro.e.x : player.pos.x, fz = ending ? -41.5 : bossIntro ? bossIntro.e.z : player.pos.z;
  camTarget.x += (fx - camTarget.x) * ck * (ending ? 0.3 : 1);
  camTarget.z += (fz - camTarget.z) * ck * (ending ? 0.3 : 1);
  placeCamera(camTarget, shakeState.x, shakeState.y, bossIntro ? 0.72 : 1);
  if (show) renderer.render(scene, camera);

  // 画面の表示
  if (player.fullNear) fullT = Math.max(fullT, 0.3);
  if (fullT > 0) { fullT -= fdt; fullSfx -= fdt; if (fullSfx <= 0 && !paused) { sfx.full(); fullSfx = 1.6; } } else fullSfx = 0;
  hud.hp(player.hp, player.maxHp);
  hud.bag(player.bag.length, player.cap);
  hud.coins(S.coins);
  hud.level(S.level, S.xp / LEVEL.need(S.level));
  hud.rank(rankNow(), chapterName(), workers.list.length);
  for (const boss of enemies.bosses) if (boss.alive && boss.fight) hud.bossBar(t('boss_' + boss.type), boss.hp / boss.def.hp);
  drawLabels();
  hud.moveHint(started && !input.moved);
  missionT -= fdt;
  if (missionT <= 0 && started) { missionT = 0.2; missionTick(); }
  if (showFps) {
    fpsT -= fdt;
    if (fpsT <= 0) {
      fpsT = 0.5;
      const n = enemies.list.filter(e => e.alive).length + workers.list.length + stations.peopleCount() + (crowd ? crowd.length : 0);
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
      if (!p.site.done || p.kitchen) continue;
      const st = stations.st(p);
      if (!p.gen && close(p.inPos.x, p.inPos.z)) hud.label('in-' + p.id, p.from.map(k => `${iconImg(k)}<b>${stations.inCount(p, k)}</b>`).join(' ') + `<small>/${stations.inCap(p)}</small>`, p.inPos.x, 1.1, p.inPos.z, 'st-label');
      if (close(p.outPos.x, p.outPos.z) && st.out > 0) hud.label('out-' + p.id, `${iconImg(p.to)}<b>${st.out}</b>`, p.outPos.x, 1.3, p.outPos.z, 'st-label out');
    }
    for (const sh of stations.shops) {
      if (!sh.site.done) continue;
      if (!sh.kitchen && close(sh.stock.x, sh.stock.z)) {
        const icons = sh.sells.length > 3 ? `${iconImg('coin')}×${sh.mult}` : sh.sells.map(k => iconImg(k)).join('');
        hud.label('stock-' + sh.id, `${icons}<b>${stations.stockTotal(sh)}</b><small>/${sh.cap}</small>`, sh.stock.x, 1.1, sh.stock.z, 'st-label shop');
      }
      if (sh.waiting) hud.label('wait-' + sh.id, '…', sh.waiting.x, 2.1, sh.waiting.z, 'bubble');
      if (sh.ship && close(sh.stock.x, sh.stock.z)) {
        const sp = sh.ship;
        const txt = sp.phase === 'away' ? t('shipIn', { s: Math.ceil(sp.t) }) : sp.phase === 'dock' ? t('shipDock') : t('shipSail');
        hud.label('ship-' + sh.id, `⛵ ${txt}`, sh.stock.x, 2.0, sh.stock.z, 'st-label burn');
      }
    }
    const inn = stations.inn;
    if (inn && inn.site.done) {
      if (close(inn.furPos.x, inn.furPos.z)) hud.label('inn', `${iconImg('fur')}<b>${S.inn.fur}</b><small>/20</small>`, inn.furPos.x, 1.1, inn.furPos.z, 'st-label');
      if (inn.waiting) hud.label('wait-inn', '…', inn.waiting.x, 2.1, inn.waiting.z, 'bubble');
    }
    // 戦っているモンスターのHP
    for (const e of enemies.list) {
      if (!e.alive || e.def.boss || e.state === 'spawn' || !(e.hpShow > 0 || e.chasing)) continue;
      if (Math.hypot(e.x - P.x, e.z - P.z) > 14) continue;
      const k = Math.max(0, e.hp / e.def.hp), pct = Math.round(k * 20) * 5;
      hud.label('ehp-' + e.id, `<b style="width:${pct}%"></b>`, e.x, (e.hopY || 0) + 1.2 * e.def.size + 0.2, e.z, 'ehp' + (k > 0.6 ? ' hi' : k > 0.3 ? ' mid' : ''));
    }
    // 狩り場への門
    for (const g of world.gates) if (g.hunt && close(g.x, g.z)) hud.label('gate-' + g.x + g.z, `⚔ ${t('l_' + g.hunt)}`, g.x, 2.6, g.z, 'fac-label hunt');
    // 厨房（料理中の料理と、材料）
    const kit = stations.kitchen;
    if (kit && kit.site.done && close(kit.inPos.x, kit.inPos.z)) {
      const have = INGREDIENTS.filter(m => stations.inCount(kit, m) > 0).map(m => `${iconImg(m)}<b>${stations.inCount(kit, m)}</b>`).join(' ');
      hud.label('kitchen', `🍳 ${kit.cooking ? iconImg(kit.cooking) : ''} ${have || t('kitchenEmpty')}`, kit.inPos.x, 1.1, kit.inPos.z, 'st-label shop');
    }
    // 施設のレベル
    const sd = stations.storageReady() && stations.storage.site.def;
    if (sd && stations.storageLv() > 0 && close(sd.x, sd.z)) hud.label('fac-storage', t('lv', { n: stations.storageLv() + 1 }), sd.x, 3.9, sd.z, 'fac-label');
    for (const p of stations.proc) if (p.site.done && stations.lv(p) > 0 && close(p.site.def.x, p.site.def.z)) hud.label('fac-' + p.id, t('lv', { n: stations.lv(p) + 1 }), p.site.def.x, 3.9, p.site.def.z, 'fac-label');
    // 住民の依頼（かなえたら ✓）
    for (const r of S.requests) {
      const p = requests.spotOf(r);
      if (!p) continue;
      const ready = requests.isReady(r, game.bagCount);
      const ico = r.type === 'hunt' ? 'm_' + r.kind : r.kind;
      const verb = ready ? '✓' : r.type === 'hunt' ? '⚔' : r.type === 'cook' ? '🍳' : '!';
      hud.label('req-' + r.at, `<i>${verb}</i>${iconImg(ico)}<b>${requests.progress(r, game.bagCount)}/${r.n}</b>`, p.x, 2.35, p.z, 'req' + (ready ? ' ready' : ''), ready);
    }
    // くべるマス・倉庫
    const sto = stations.storage;
    if (sto && sto.site.done && close(sto.pos.x, sto.pos.z)) {
      const chips = Object.keys(S.storage).filter(k => S.storage[k] > 0).map(k => `${iconImg(k)}<b>${S.storage[k]}</b>`).join(' ');
      hud.label('store', `${t('s_store')} <small>${stations.storageTotal()}/${stations.storageCap()}</small> ${chips}`, sto.pos.x, 1.1, sto.pos.z, 'st-label store');
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
