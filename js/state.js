// 進み具合（セーブされる値）と、そこから計算する値
import { UPGRADES, TOOLS, RANK, LEVEL, WEAPONS, ARMORS, PLAYER, ALCHEMY } from './data.js';
// 持っている武器は1本ずつ { u: 番号, b: 元の武器, p: 錬金の+, r: レア度, fx: [[効果, 値], ...] }
export function newWeapon(b, r = 0, fx = []) {
  const w = { u: (S.uid = (S.uid || 0) + 1), b, p: 0, r, fx };
  S.weapons.push(w);
  return w;
}
export function ensureWeapons() {
  if (!Array.isArray(S.weapons)) S.weapons = [];
  if (!S.weapons.length) {
    // 以前のセーブ：作った武器を1本ずつにする
    for (const w of WEAPONS) if (w.id === 'rusty' || S.gear[w.id] || w.id === S.weapon) newWeapon(w.id);
    const cur = S.weapons.find(w => w.b === S.weapon) || S.weapons[0];
    S.wu = cur.u;
  }
  if (!S.weapons.some(w => w.u === S.wu)) S.wu = S.weapons[0].u;
}
export const weaponInst = () => S.weapons.find(w => w.u === S.wu) || S.weapons[0] || { u: 0, b: 'rusty', p: 0, r: 0, fx: [] };
export const baseOf = w => WEAPONS.find(x => x.id === w.b) || WEAPONS[0];
export const weaponOf = () => baseOf(weaponInst());
export const fxOf = (w, k) => w.fx.reduce((a, [kk, v]) => a + (kk === k ? v : 0), 0);
export const fx = k => fxOf(weaponInst(), k);
// 武器の強さ（並べる・いちばん強いのを選ぶのに使う）
export function wPower(w) {
  const atk = baseOf(w).atk * (1 + w.p * ALCHEMY.plusAtk) * (1 + fxOf(w, 'atk') / 100);
  return atk * (1 + (fxOf(w, 'crit') / 100) * 0.8 + fxOf(w, 'cdmg') / 400 + fxOf(w, 'spd') / 150 + fxOf(w, 'steal') / 30);
}
export const armorOf = () => ARMORS.find(a => a.id === S.armor) || ARMORS[0];

export const S = {
  ch: 1,
  coins: 0, earned: 0,
  up: { bag: 0, speed: 0, hp: 0 },
  tool: { sword: 0, axe: 0, pick: 0 },
  hired: [],                 // 雇った順の仕事名
  lands: ['home'],
  mission: 0, mp: 0,         // 今のミッションと進み具合
  missionId: null,
  unlocked: {},
  stations: {},              // 加工場の { in, out, t }
  shop: { stock: { plank: 0, block: 0, jelly: 0 }, coins: 0 },
  storage: {},               // 倉庫の中身
  market: { stock: {}, coins: 0 },
  bigmarket: { stock: {}, coins: 0 },
  port: { stock: {}, coins: 0 },
  inn: { fur: 0, coins: 0 },
  bosses: {},                // 倒したぬし
  fac: {},                   // 施設のレベル（0 = Lv1）
  jobLv: {},                 // 仕事ごとのレベル（0 = Lv1）
  level: 1, xp: 0,           // 主人公のレベルと経験値
  weapon: 'rusty', armor: 'cloth', gear: {},   // 身につけている装備と、作った装備
  book: { mon: {}, mat: {}, dish: {} },          // 図鑑
  requests: [],              // 住民の依頼
  weapons: [], wu: 0, uid: 0, // 持っている武器と、身につけている武器
  chest: { normal: 0, star: 0 },  // 宝箱
  bossAt: {},                // ぬしを倒した時刻（復活まで）
  tower: { best: 0 },        // 試練の塔
  day: 0.1,                  // 1日のうちの時刻（0〜1）
  cleared: {},
  bossDead: false,
  time: 0,
  lastSeen: 0,
  stats: { sold: 0, kills: 0 },
};

export function resetState() {
  const fresh = {
    ch: 1, coins: 0, earned: 0, up: { bag: 0, speed: 0, hp: 0 }, tool: { axe: 0, pick: 0 }, hired: [], lands: ['home'],
    mission: 0, mp: 0, unlocked: {}, stations: {}, shop: { stock: { plank: 0, block: 0, jelly: 0 }, coins: 0 }, storage: {}, market: { stock: {}, coins: 0 }, bigmarket: { stock: {}, coins: 0 }, port: { stock: {}, coins: 0 }, inn: { fur: 0, coins: 0 }, bosses: {}, fac: {}, jobLv: {}, level: 1, xp: 0, weapon: 'rusty', armor: 'cloth', gear: {}, book: { mon: {}, mat: {}, dish: {} }, requests: [], weapons: [], wu: 0, uid: 0, chest: { normal: 0, star: 0 }, bossAt: {}, tower: { best: 0 }, day: 0.1, cleared: {}, bossDead: false,
    time: 0, lastSeen: 0, stats: { sold: 0, kills: 0 },
  };
  for (const k in S) delete S[k];
  Object.assign(S, fresh);
}

export function loadState(d) {
  if (!d) return;
  for (const k in S) {
    if (d[k] === undefined) continue;
    if (S[k] && typeof S[k] === 'object' && !Array.isArray(S[k])) S[k] = { ...S[k], ...d[k] };
    else S[k] = d[k];
  }
  S.shop.stock = { plank: 0, block: 0, jelly: 0, ...(d.shop && d.shop.stock) };
  S.market.stock = { ...(d.market && d.market.stock) };
  S.bigmarket.stock = { ...(d.bigmarket && d.bigmarket.stock) };
  S.port.stock = { ...(d.port && d.port.stock) };
  if (S.bossDead) S.bosses.bigslime = true;   // 区切り2のセーブ
  S.book = { mon: {}, mat: {}, dish: {}, ...(d.book || {}) };
  // 以前の「剣の強化」「HPの強化」は、同じくらいの装備に置き換える
  if (d.weapon === undefined) {
    const sw = (d.tool && d.tool.sword) || 0, hp = (d.up && d.up.hp) || 0;
    const wmap = ['rusty', 'stone', 'stone', 'iron', 'cleaver', 'bone', 'gold', 'gold', 'flame', 'dragon'];
    const amap = ['cloth', 'jelly', 'jelly', 'fur', 'fur', 'bone', 'gold', 'gold', 'gold', 'dragon'];
    S.weapon = wmap[Math.min(sw, wmap.length - 1)]; S.armor = amap[Math.min(hp, amap.length - 1)];
    S.gear[S.weapon] = true; S.gear['a_' + S.armor] = true;
  }
  S.chest = { normal: 0, star: 0, ...(d.chest || {}) };
  ensureWeapons();
}

export const stat = {
  cap: () => UPGRADES.bag.values[S.up.bag],
  speed: () => UPGRADES.speed.values[S.up.speed],
  maxHp: () => 10 + (S.level - 1) * LEVEL.hpPer + armorOf().hp,
  dmg: () => { const w = weaponInst(); return Math.round(baseOf(w).atk * (1 + w.p * ALCHEMY.plusAtk) * (1 + fx('atk') / 100) * (1 + (S.level - 1) * LEVEL.atkPer) * 10) / 10; },
  crit: () => PLAYER.crit + fx('crit') / 100,
  critMul: () => PLAYER.critMul + fx('cdmg') / 100,
  steal: () => fx('steal') / 100,
  dropBonus: () => PLAYER.dropBonus + fx('drop') / 100,
  xpMul: () => 1 + fx('xp') / 100,
  def: () => armorOf().def,
  power: tool => TOOLS[tool] ? TOOLS[tool].values[S.tool[tool]] : 1,
  swing: tool => tool === 'sword' ? (0.42 - WEAPONS.indexOf(weaponOf()) * 0.022) / (1 + fx('spd') / 100) : TOOLS[tool] ? TOOLS[tool].swing[S.tool[tool]] : 0.35,
};

export function rankScore(pop, buildings) {
  return pop * RANK.pop + buildings * RANK.building + Math.floor(S.earned / RANK.coinDiv);
}
export function rankOf(score) {
  let r = 0;
  while (r < RANK.steps.length && score >= RANK.steps[r]) r++;
  return r;
}
