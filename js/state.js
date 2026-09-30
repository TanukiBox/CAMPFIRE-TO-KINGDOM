// 進み具合（セーブされる値）と、そこから計算する値
import { UPGRADES, TOOLS, RANK } from './data.js';

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
  cleared: {},
  bossDead: false,
  time: 0,
  lastSeen: 0,
  stats: { sold: 0, kills: 0 },
};

export function resetState() {
  const fresh = {
    ch: 1, coins: 0, earned: 0, up: { bag: 0, speed: 0, hp: 0 }, tool: { sword: 0, axe: 0, pick: 0 }, hired: [], lands: ['home'],
    mission: 0, mp: 0, unlocked: {}, stations: {}, shop: { stock: { plank: 0, block: 0, jelly: 0 }, coins: 0 }, storage: {}, market: { stock: {}, coins: 0 }, bigmarket: { stock: {}, coins: 0 }, port: { stock: {}, coins: 0 }, inn: { fur: 0, coins: 0 }, bosses: {}, cleared: {}, bossDead: false,
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
}

export const stat = {
  cap: () => UPGRADES.bag.values[S.up.bag],
  speed: () => UPGRADES.speed.values[S.up.speed],
  maxHp: () => UPGRADES.hp.values[S.up.hp],
  dmg: () => TOOLS.sword.values[S.tool.sword],
  power: tool => TOOLS[tool] ? TOOLS[tool].values[S.tool[tool]] : 1,
  swing: tool => TOOLS[tool] ? TOOLS[tool].swing[S.tool[tool]] : 0.35,
};

export function rankScore(pop, buildings) {
  return pop * RANK.pop + buildings * RANK.building + Math.floor(S.earned / RANK.coinDiv);
}
export function rankOf(score) {
  let r = 0;
  while (r < RANK.steps.length && score >= RANK.steps[r]) r++;
  return r;
}
