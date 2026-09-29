// 焚き火から王国へ — 全体のつなぎ込みと毎フレームの処理
import * as THREE from './lib/three.module.min.js';
import { renderer, scene, camera, resize, placeCamera, perfTick, perfReset, perf, quality, Blobs, params } from './gfx.js';
import { CHAPTERS, MATERIALS } from './data.js';
import { World } from './world.js';
import { Resources } from './resources.js';
import { Items } from './items.js';
import { Enemies } from './enemies.js';
import { Player } from './player.js';
import { Builds } from './build.js';
import { Rig } from './rig.js';
import { villagerParts } from './models.js';
import { burst, ring, shake, shakeState, floatText, updateFx } from './fx.js';
import { sfx, unlock, setSound, soundOn } from './audio.js';
import { readMove, onFirstTouch, input } from './input.js';
import { hud } from './hud.js';
import { t, setLang, i18n } from './i18n.js';
import { iconImg } from './icons.js';
import { loadSave, writeSave, eraseSave } from './save.js';
import { PLAYER } from './data.js';

const $ = id => document.getElementById(id);
const CH = 1;
const ch = CHAPTERS[CH];

// ---- セーブの読み込みと設定 ----
const save = loadSave() || {};
const settings = { sound: true, lang: null, ...(save.settings || {}) };
if (settings.lang) setLang(settings.lang); else setLang(i18n.lang);
setSound(settings.sound);

// ---- 世界をつくる ----
resize();
const world = new World(ch);
const resources = new Resources(ch, world);
const player = new Player();
const items = new Items(PLAYER.bagCap);
const enemies = new Enemies(ch, world);
const builds = new Builds(ch, world);
world.decorate(builds.areas());
const blobs = new Blobs(420);

let playTime = save.time || 0;
let gathered = !!save.gathered;
builds.load(save.builds);
player.pos.set(ch.start[0], 0, ch.start[1]);
if (typeof save.px === 'number') { player.pos.set(save.px, 0, save.pz); world.resolve(player.pos, 0.36); }
if (typeof save.hp === 'number' && save.hp > 0) player.hp = Math.min(player.maxHp, save.hp);
player.animate(0);
(save.bag || []).forEach(k => { if (MATERIALS[k]) items.addToBag(k, player); });

// ---- 負荷確認用：?stress=150 で住民とスライムをたくさん歩かせる ----
const stressN = Math.min(400, parseInt(params.get('stress') || '0', 10) || 0);
let villagers = null;
if (stressN > 0) {
  const f = ch.fence, zone = { x: (f.x0 + f.x1) / 2, z: (f.z0 + f.z1) / 2, r: 12 };
  for (let i = 0; i < Math.floor(stressN / 2); i++) enemies.spawn('slime', zone, { passive: true, color: new THREE.Color().setHSL(Math.random(), 0.6, 0.6).getHex() });
  villagers = makeVillagers(stressN - Math.floor(stressN / 2), zone);
}
const showFps = stressN > 0 || params.has('fps');
// 動作確認用（?debug=1 のときだけ）。章選び・素材大量スタートは区切り2で追加
if (params.get('debug') === '1') window.ctk = { player, items, builds, resources, enemies, world };

// ---- できごと ----
let fullT = 0, fullSfx = 0;

player.hooks = {
  onSwap() { sfx.swap(); },
  onHit(kind, target) {
    const px = player.pos.x, pz = player.pos.z;
    if (kind === 'enemy') {
      const killed = enemies.hit(target, player.dmg, px, pz);
      sfx.slash(); shake(0.12);
      burst(target.x, 0.55, target.z, { n: 7, colors: [0xffffff, 0xfff3a0], speed: 5, up: 1.5, size: 0.09, life: 0.25, g: 0, floor: false });
      burst(target.x, 0.45, target.z, { n: 5, color: target.color.getHex(), speed: 2.5, up: 4, size: 0.12, life: 0.5 });
      floatText(String(player.dmg), target.x, 1.2, target.z, 'dmg');
      if (killed) {
        sfx.kill(); shake(0.2);
        burst(target.x, 0.4, target.z, { n: 18, color: target.color.getHex(), speed: 4, up: 5, size: 0.16, life: 0.7 });
        ring(target.x, target.z, 0xffffff, 1.6, 0.35);
        for (const k in target.def.drop) popDrops(k, target.def.drop[k], target.x, target.z, 0.5);
      }
    } else {
      const n = resources.hit(target, px, pz);
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
    sfx.hurt(); shake(0.25); hud.hurt();
    floatText('-' + n, player.pos.x, 1.6, player.pos.z, 'hurt');
  },
  onDown() {
    sfx.down(); shake(0.35);
    const x = player.pos.x, z = player.pos.z;
    const n = items.dropHalf(x, z);
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

function popDrops(kind, n, x, z, y) {
  const base = Math.atan2(player.pos.z - z, player.pos.x - x);
  for (let i = 0; i < n; i++) {
    const a = base + (Math.random() - 0.5) * 1.8, sp = 1.4 + Math.random() * 1.3;
    items.pop(kind, x, y, z, Math.cos(a) * sp, 4.5 + Math.random() * 2, Math.sin(a) * sp);
  }
}

const itemHooks = {
  onPick(it, n) { sfx.pickup(n); gathered = true; dirty = true; },
  onStack(it) { burst(it.p.x, it.p.y, it.p.z, { n: 2, color: 0xffffff, speed: 1, up: 1, size: 0.06, life: 0.2, g: 0, floor: false }); },
  onFull() { fullT = 1.2; },
  clamp(p) { world.resolve(p, 0.15); },
};

const buildHooks = {
  onPaid() { dirty = true; },
  onBuilt(site) {
    dirty = true;
    hud.toast(`🔨 ${t('repaired', { b: t('b_' + site.def.model) })}`, 'good');
    saveNow();
  },
  onNewTile() { hud.toast(t('newTile')); },
};

// ---- 次にやること ----
function missionHtml() {
  const s = builds.current();
  if (!s) return builds.nextDelay > 0 ? null : `⭐ ${t('m_done')}`;
  const needK = Object.keys(s.def.cost).filter(k => builds.left(s, k) > 0);
  if (!gathered) return `${iconImg('wood')} ${t('m_chop')}`;
  if (items.bag.some(it => needK.includes(it.kind))) return `🔨 ${t('m_carry')}`;
  const list = needK.map(k => `${iconImg(k)}${t('m_left', { n: builds.left(s, k) })}`).join(' ');
  return list ? t('m_need', { b: t('b_' + s.def.model), list }) : `🔨 ${t('m_carry')}`;
}

// ---- セーブ ----
let dirty = false;
function saveNow() {
  writeSave({
    v: 1, ch: CH, time: Math.round(playTime), gathered,
    builds: builds.toSave(),
    bag: items.bag.map(it => it.kind),
    hp: Math.round(player.hp * 10) / 10, px: Math.round(player.pos.x * 100) / 100, pz: Math.round(player.pos.z * 100) / 100,
    settings,
  });
  dirty = false;
}
setInterval(() => saveNow(), 5000);
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); perfReset(); });

// ---- 設定 ----
hud.init();
hud.texts();
function syncSettingsUi() {
  document.querySelectorAll('[data-sound]').forEach(b => b.classList.toggle('on', (b.dataset.sound === '1') === soundOn()));
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === i18n.lang));
  $('qInfo').textContent = `${t('quality')}: ×${quality.ratio} ${quality.shadows ? '☀' : ''} ${quality.auto ? '(' + t('qAuto') + ')' : ''}`;
}
$('btnGear').addEventListener('click', () => { unlock(); syncSettingsUi(); $('resetAsk').hidden = true; $('settings').hidden = false; });
$('btnClose').addEventListener('click', () => { $('settings').hidden = true; });
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
  window.removeEventListener('pagehide', saveNow);
  eraseSave(settings);
  location.reload();
});
onFirstTouch(unlock);
window.addEventListener('resize', resize);

// ---- 住民（負荷確認用。区切り2で本物の住民にする） ----
function makeVillagers(n, zone) {
  const rig = new Rig(villagerParts(), n);
  const shirts = [0xf28b50, 0x5fb3e8, 0xe86a8a, 0x8bd16a, 0xf5c542, 0xa98bf0];
  const list = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * zone.r;
    list.push({ x: zone.x + Math.cos(a) * r, z: zone.z + Math.sin(a) * r, tx: 0, tz: 0, wait: Math.random() * 2, yaw: a, walk: Math.random() * 6, moving: 0, color: new THREE.Color(shirts[i % shirts.length]) });
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
  const angles = new Array(8).fill(0);
  return {
    list,
    update(dt) {
      for (const v of list) {
        v.wait -= dt;
        if (v.wait <= 0) {
          const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * zone.r;
          v.tx = zone.x + Math.cos(a) * r; v.tz = zone.z + Math.sin(a) * r; v.wait = 3 + Math.random() * 4;
        }
        const dx = v.tx - v.x, dz = v.tz - v.z, d = Math.hypot(dx, dz);
        v.moving = d > 0.3 ? 1 : 0;
        if (v.moving) { v.x += dx / d * 2.2 * dt; v.z += dz / d * 2.2 * dt; v.yaw = Math.atan2(dx, dz); v.walk += dt * 10; }
        world.resolve(v, 0.3);
      }
    },
    render(b) {
      rig.begin();
      for (const v of list) {
        const s = Math.sin(v.walk) * 0.7 * v.moving;
        angles[0] = s; angles[1] = -s; angles[6] = -s; angles[7] = s;
        _m.compose(_p.set(v.x, Math.abs(Math.cos(v.walk)) * 0.06 * v.moving, v.z), _q.setFromAxisAngle(UP, v.yaw), _s);
        rig.push(_m, angles, v.color);
        b.push(v.x, v.z, 0.35);
      }
      rig.end();
    },
  };
}

// ---- 毎フレーム ----
const move = { x: 0, z: 0, m: 0 };
const camTarget = player.pos.clone();
let last = performance.now(), time = 0, missionT = 0, fpsT = 0;
hud.moveHint(true);

function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now;
  const dt = Math.min(Math.max(raw, 0), 1 / 20);
  time += dt; playTime += dt;
  perfTick(raw);

  readMove(move);
  player.update(dt, { move, world, resources, enemies, items });
  enemies.update(dt, player);
  if (villagers) villagers.update(dt);
  resources.update(dt);
  items.update(dt, player, time, itemHooks);
  builds.update(dt, time, player, items, buildHooks);
  world.update(time);
  updateFx(dt);

  // まとめて描く物
  blobs.begin();
  if (player.alive || player.m.body.rotation.z < 1.5) blobs.push(player.pos.x, player.pos.z, 0.5);
  enemies.render(blobs);
  if (villagers) villagers.render(blobs);
  items.groundShadows(blobs);
  blobs.end();
  items.render(time);

  // カメラは主人公を追いかける（回転なし）
  const ck = Math.min(1, dt * 7);
  camTarget.x += (player.pos.x - camTarget.x) * ck;
  camTarget.z += (player.pos.z - camTarget.z) * ck;
  placeCamera(camTarget, shakeState.x, shakeState.y);
  renderer.render(scene, camera);

  // 画面の表示
  if (player.fullNear) fullT = Math.max(fullT, 0.3);
  if (fullT > 0) {
    fullT -= dt;
    fullSfx -= dt;
    if (fullSfx <= 0) { sfx.full(); fullSfx = 1.6; }
  } else fullSfx = 0;
  hud.hp(player.hp, player.maxHp);
  hud.bag(items.bag.length, items.cap);
  const site = builds.current();
  hud.tileLabel(site, builds, site ? site.def.tile[0] : 0, site ? site.def.tile[1] : 0);
  hud.fullBubble(fullT > 0 && player.alive, player.anchor.x, player.anchor.y + (items.stackTop || 0) + 0.5, player.anchor.z);
  hud.moveHint(!input.moved);
  missionT -= dt;
  if (missionT <= 0) { missionT = 0.25; const m = missionHtml(); if (m) hud.mission(m); }
  if (showFps) {
    fpsT -= dt;
    if (fpsT <= 0) {
      fpsT = 0.5;
      const n = enemies.list.filter(e => e.alive).length + (villagers ? villagers.list.length : 0);
      hud.fps(`${perf.fps.toFixed(0)} fps ・ ×${quality.ratio} ・ ${quality.shadows ? 'shadow' : 'no shadow'} ・ ${n} chars ・ ${renderer.info.render.calls} calls`);
    }
  }
}
requestAnimationFrame(frame);
