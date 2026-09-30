// ゲームの数値と配置。章ごとの素材・資源・敵・建物・ミッションはここにまとめる（調整はこのファイルで）

// 主人公の基本の強さ（強化で変わるものは UPGRADES / TOOLS）
export const PLAYER = {
  regenDelay: 4,       // 攻撃を受けてから回復が始まるまでの秒数
  regenPerSec: 0.8,
  reachEnemy: 1.5,
  jellyHeal: 3,        // ゼリー1個で回復するHP（HPがこれだけ減ると背中のゼリーを自動で食べる）
  jellyCd: 1.5,        // 続けて食べるまでの秒数
  medicineHeal: 10,    // 薬1個で回復するHP（HPがこれだけ減ると薬を飲む）
};

// 施設の強化（Lv1〜5）。cap = 置ける量の倍率、speed = 作る速さの倍率、costs[今のレベル] = 次のレベルへの値段（素材は背中と倉庫から）
export const FACILITY = {
  cap: [1, 1.7, 2.5, 3.5, 5],
  speed: [1, 1.4, 1.9, 2.5, 3.2],
  costs: [{ coin: 150, plank: 20 }, { coin: 600, block: 30, ore: 10 }, { coin: 2000, block: 60, gold: 10 }, { coin: 5000, gold: 30, scale: 10 }],
};
// 住民の仕事の強化（Lv1〜5）。1レベルごとに 運べる数+2・歩く速さ+12%・作業の速さ+25%・兵士の攻撃力+35%
export const JOB_UP = { costs: [100, 400, 1200, 3000], carry: 2, walk: 0.12, work: 0.25, dmg: 0.35 };

// 倉庫に預けられる数（預けた素材は建設マス・加工場・お店・鍛冶屋で自動で使われる）
export const STORAGE = { cap: 200 };

// 強化（コインだけ）。values[レベル] が効果、costs[レベル] が次のレベルへの値段
export const UPGRADES = {
  bag:   { values: [10, 15, 20, 26, 32, 40, 50, 60, 75, 90, 110, 130], costs: [30, 70, 140, 240, 380, 600, 900, 1400, 2000, 3000, 4500] },   // 背中の積載量
  speed: { values: [4.4, 4.8, 5.2, 5.6, 6.0, 6.4, 6.8, 7.2, 7.6, 8.0], costs: [40, 110, 220, 400, 650, 1000, 1500, 2200, 3200] },             // 移動速度
};

// 主人公のレベル：モンスターを倒す・建物を建てる・ミッションで経験値。レベルが上がるとHPと攻撃力が上がる
export const LEVEL = { hpPer: 3, atkPer: 0.05, build: 15, missionMul: 0.5, need: lv => Math.floor(20 * Math.pow(lv, 1.6)) };

// 鍛冶屋で作る装備（素材は背中と倉庫から）。作ると自動でいちばん強いものを身につける
export const WEAPONS = [
  { id: 'rusty',   atk: 1,  cost: null, color: 0xb9b0a0, len: 1.0 },
  { id: 'stone',   atk: 3,  cost: { block: 4, jelly: 4, coin: 40 }, color: 0xa8adb5, len: 1.05 },
  { id: 'iron',    atk: 6,  cost: { ore: 10, fur: 4, coin: 150 }, color: 0xdfe5ec, len: 1.1 },
  { id: 'cleaver', atk: 9,  cost: { ore: 12, cloth: 8, coin: 300 }, color: 0x9aa4b0, len: 1.2 },
  { id: 'bone',    atk: 14, cost: { bone: 12, ore: 10, coin: 600 }, color: 0xf2efe6, len: 1.25 },
  { id: 'gold',    atk: 20, cost: { gold: 16, horn: 6, coin: 1200 }, color: 0xffd34d, len: 1.3 },
  { id: 'flame',   atk: 28, cost: { firestone: 8, tail: 8, gold: 10, coin: 2500 }, color: 0xff7a2a, len: 1.35, glow: true },
  { id: 'dragon',  atk: 40, cost: { scale: 20, firestone: 10, gold: 20, coin: 5000 }, color: 0xb04ad0, len: 1.45, glow: true },
];
export const ARMORS = [
  { id: 'cloth',  def: 0, hp: 0,  cost: null, color: 0x4f86d9 },
  { id: 'jelly',  def: 1, hp: 4,  cost: { jelly: 10, mushcap: 4, coin: 60 }, color: 0x86e36f },
  { id: 'fur',    def: 2, hp: 10, cost: { fur: 10, cloth: 6, coin: 200 }, color: 0xc9a27a },
  { id: 'bone',   def: 4, hp: 18, cost: { bone: 14, horn: 4, coin: 700 }, color: 0xf2efe6 },
  { id: 'gold',   def: 6, hp: 28, cost: { gold: 20, bone: 8, coin: 1500 }, color: 0xffd34d },
  { id: 'dragon', def: 9, hp: 45, cost: { scale: 24, firestone: 8, coin: 4000 }, color: 0xb04ad0 },
];

// 住民の依頼：ときどき住民が「○○がほしい」「○○を倒して」とたのむ。かなえるとコインと経験値
export const REQUESTS = { every: [50, 90], max: 2, names: { ja: ['ミナ', 'ソラ', 'ハル', 'リク', 'ユイ', 'カイ', 'ノア', 'メイ', 'タロ', 'ヒナ'], en: ['Mina', 'Sora', 'Hal', 'Rik', 'Yui', 'Kai', 'Noa', 'May', 'Taro', 'Hina'] } };

// 鍛冶屋での強化（素材＋コイン）。素材は背中から使う
export const TOOLS = {
  axe:   { values: [1, 2, 3, 4, 5, 6], swing: [0.5, 0.42, 0.36, 0.32, 0.28, 0.26], costs: [{ plank: 5, coin: 40 }, { block: 6, coin: 120 }, { ore: 8, coin: 300 }, { gold: 8, coin: 900 }, { scale: 6, coin: 2500 }] },
  pick:  { values: [1, 2, 3, 4, 5, 6], swing: [0.55, 0.46, 0.4, 0.34, 0.3, 0.28], costs: [{ plank: 5, coin: 50 }, { block: 6, coin: 140 }, { ore: 8, coin: 300 }, { gold: 8, coin: 900 }, { scale: 6, coin: 2500 }] },
};

// 素材。h = 背中に積んだときの1個の高さ、price = お店で売れる値段（ないものは売らない）
export const MATERIALS = {
  wood:  { color: 0xc98a4b, h: 0.21 },
  stone: { color: 0xa7abb2, h: 0.25 },
  jelly: { color: 0x86e36f, h: 0.23, price: 2 },
  plank: { color: 0xecc78e, h: 0.12, price: 2 },
  block: { color: 0xdedad2, h: 0.27, price: 3 },
  // 第2章
  ore:      { color: 0xffffff, h: 0.25, price: 8 },    // 鉄鉱石（色は形の方で付ける）
  fur:      { color: 0xc9a27a, h: 0.14, price: 10 },   // 毛皮
  herb:     { color: 0xffffff, h: 0.22, price: 3 },    // 薬草
  medicine: { color: 0xffffff, h: 0.3, price: 18 },    // 薬
  // 第3章
  gold: { color: 0xffffff, h: 0.24, price: 25 },       // 金鉱石
  horn: { color: 0xffffff, h: 0.2, price: 20 },        // 魔物の角
  // 第4章
  scale: { color: 0xffffff, h: 0.12, price: 40 },      // 竜のうろこ
  // モンスターの素材（料理や装備に使う）
  mushcap:   { color: 0xffffff, h: 0.2, price: 3 },    // きのこの傘
  honey:     { color: 0xffffff, h: 0.22, price: 5 },   // はちみつ
  meat:      { color: 0xffffff, h: 0.18, price: 6 },   // けものの肉
  cloth:     { color: 0xffffff, h: 0.1, price: 4 },    // ぼろ布
  bone:      { color: 0xffffff, h: 0.16, price: 6 },   // 骨
  crabmeat:  { color: 0xffffff, h: 0.2, price: 10 },   // カニの身
  tail:      { color: 0xffffff, h: 0.18, price: 12 },  // トカゲのしっぽ
  firestone: { color: 0xffffff, h: 0.2, price: 15 },   // 火の石
  // 料理（食堂で作って売る）
  dessert:    { color: 0xffffff, h: 0.16, price: 6, dish: true },    // ゼリーのデザート
  sautee:     { color: 0xffffff, h: 0.16, price: 9, dish: true },    // きのこのソテー
  steak:      { color: 0xffffff, h: 0.16, price: 18, dish: true },   // 焼き肉
  soup:       { color: 0xffffff, h: 0.2, price: 22, dish: true },    // きのこスープ
  honeyjelly: { color: 0xffffff, h: 0.18, price: 24, dish: true },   // はちみつゼリー
  stew:       { color: 0xffffff, h: 0.2, price: 34, dish: true },    // 骨だしシチュー
  crabpot:    { color: 0xffffff, h: 0.22, price: 48, dish: true },   // カニ鍋
  skewer:     { color: 0xffffff, h: 0.2, price: 55, dish: true },    // トカゲの串焼き
  feast:      { color: 0xffffff, h: 0.26, price: 130, dish: true },  // 王様のごちそう
};

// 料理のレシピ。食堂は、材料がそろっている中で いちばん高い料理を作る
export const RECIPES = [
  { id: 'feast', need: { meat: 1, honey: 1, crabmeat: 1 } },
  { id: 'skewer', need: { tail: 1 } },
  { id: 'crabpot', need: { crabmeat: 1, mushcap: 1 } },
  { id: 'stew', need: { bone: 1, meat: 1 } },
  { id: 'honeyjelly', need: { jelly: 1, honey: 1 } },
  { id: 'soup', need: { mushcap: 1, herb: 1 } },
  { id: 'steak', need: { meat: 1 } },
  { id: 'sautee', need: { mushcap: 1 } },
  { id: 'dessert', need: { jelly: 1 } },
];
export const INGREDIENTS = [...new Set(RECIPES.flatMap(r => Object.keys(r.need)))];
export const DISHES = RECIPES.map(r => r.id);
// 食堂の厨房：1皿を作る秒数・材料ごとに置ける数（施設の強化で増える）
export const KITCHEN = { time: 2.2, inCap: 20, outCap: 30 };

// 切ったり割ったりできる資源。hits 回ぶんたたくと倒れ、たたいた分だけ素材が出て、倒れたとき bonus 個おまけ
export const NODE_TYPES = {
  tree: { tool: 'axe',  hits: 3, drop: 'wood',  bonus: 1, respawn: 20, reach: 1.35, collide: 0.35 },
  rock: { tool: 'pick', hits: 4, drop: 'stone', bonus: 1, respawn: 26, reach: 1.6,  collide: 0.62 },
  ironrock: { tool: 'pick', hits: 5, drop: 'ore', bonus: 1, respawn: 32, reach: 1.6, collide: 0.62 },
  herb: { tool: 'hand', hits: 2, drop: 'herb', bonus: 1, respawn: 18, reach: 1.1, collide: 0 },
  goldrock: { tool: 'pick', hits: 6, drop: 'gold', bonus: 1, respawn: 40, reach: 1.6, collide: 0.62 },
};

// 敵。move: hop = 跳ねる / walk = 歩く
export const ENEMY_TYPES = {
  slime: {
    rig: 'slime', move: 'hop', hp: 3, speed: 1.2, chase: 2.3, dmg: 1,
    aggro: 4.5, leash: 9, atkRange: 0.95, atkCd: 1.4,
    drop: { jelly: 2 }, respawn: 15, color: 0x8be36a, size: 1, radius: 0.42, xp: 2,
  },
  mushroom: {
    rig: 'mushroom', move: 'walk', hp: 6, speed: 1.0, chase: 2.6, dmg: 2,
    aggro: 5, leash: 9, atkRange: 1.0, atkCd: 1.3,
    drop: { mushcap: 2 }, respawn: 20, color: 0xe8514a, size: 1, radius: 0.45, xp: 4,
  },
  bigslime: {
    rig: 'boss', move: 'boss', hp: 90, speed: 1.2, chase: 1.8, dmg: 2, slamDmg: 3, slamR: 2.6,
    aggro: 11, leash: 99, atkRange: 1.7, atkCd: 1.2,
    drop: { jelly: 12, honey: 4 }, xp: 60, respawn: 0, color: 0x6fd65a, size: 2.8, radius: 0.42, boss: true, attacks: ['leap'], minion: 'slime',
  },
  // 第2章
  wolf: {
    rig: 'wolf', move: 'walk', hp: 8, speed: 1.6, chase: 3.6, dmg: 2,
    aggro: 6, leash: 10, atkRange: 1.05, atkCd: 1.1,
    drop: { fur: 2 }, respawn: 18, color: 0x8d929c, size: 1, radius: 0.5, xp: 6,
  },
  goblin: {
    rig: 'goblin', move: 'walk', hp: 14, speed: 1.2, chase: 2.7, dmg: 3,
    aggro: 6, leash: 9, atkRange: 1.1, atkCd: 1.4,
    drop: { cloth: 2 }, coins: 8, respawn: 22, color: 0x74c24e, size: 1, radius: 0.45, xp: 10,
  },
  goblinchief: {
    rig: 'chief', move: 'boss', hp: 260, speed: 1.2, chase: 2.1, dmg: 3, slamDmg: 5, slamR: 3.0, dashDmg: 4,
    aggro: 12, leash: 99, atkRange: 1.5, atkCd: 1.2,
    drop: { ore: 10, fur: 6, cloth: 6 }, coins: 150, xp: 150, respawn: 0, color: 0x5aa83e, size: 2.0, radius: 0.5, boss: true, attacks: ['dash', 'leap'], minion: 'goblin',
  },
  // 第3章
  troll: {
    rig: 'troll', move: 'walk', hp: 45, speed: 0.9, chase: 2.2, dmg: 5,
    aggro: 5.5, leash: 9, atkRange: 1.5, atkCd: 1.8,
    drop: { horn: 1, gold: 1 }, coins: 15, respawn: 26, color: 0x8a9a7a, size: 1.6, radius: 0.45, xp: 20,
  },
  skeleton: {
    rig: 'skeleton', move: 'walk', hp: 25, speed: 1.3, chase: 3.0, dmg: 4,
    aggro: 6.5, leash: 10, atkRange: 1.2, atkCd: 1.1,
    drop: { bone: 2 }, coins: 12, respawn: 20, color: 0xf2efe6, size: 1.05, radius: 0.42, xp: 14,
  },
  golem: {
    rig: 'golem', move: 'boss', hp: 700, speed: 1.0, chase: 1.4, dmg: 5, slamDmg: 7, slamR: 3.5, rockDmg: 5,
    aggro: 13, leash: 99, atkRange: 2.0, atkCd: 1.6,
    drop: { gold: 12, horn: 8, bone: 6 }, coins: 400, xp: 300, respawn: 0, color: 0x8f8a84, size: 3.0, radius: 0.5, boss: true, attacks: ['throw', 'leap'], minion: 'skeleton',
  },
  // 第4章
  lizard: {
    rig: 'lizard', move: 'walk', hp: 60, speed: 1.4, chase: 3.2, dmg: 6,
    aggro: 6, leash: 10, atkRange: 1.3, atkCd: 1.2,
    drop: { tail: 2 }, coins: 20, respawn: 22, color: 0xe8603a, size: 1.2, radius: 0.5, xp: 24,
  },
  drake: {
    rig: 'drake', move: 'walk', fly: 1.2, hp: 90, speed: 1.3, chase: 3.0, dmg: 7,
    aggro: 7, leash: 10, atkRange: 1.4, atkCd: 1.4,
    drop: { scale: 2 }, coins: 40, respawn: 28, color: 0x7a5ad9, size: 1.3, radius: 0.5, xp: 32,
  },
  // 新しいモンスター（狩り場にいる）
  bee: {
    rig: 'bee', move: 'walk', fly: 0.9, hp: 5, speed: 1.6, chase: 3.2, dmg: 1,
    aggro: 5, leash: 9, atkRange: 0.9, atkCd: 1.2,
    drop: { honey: 1 }, respawn: 14, color: 0xf5c542, size: 0.8, radius: 0.35, xp: 3,
  },
  boar: {
    rig: 'boar', move: 'walk', hp: 22, speed: 1.3, chase: 4.0, dmg: 3,
    aggro: 6, leash: 10, atkRange: 1.1, atkCd: 1.6,
    drop: { meat: 2 }, respawn: 20, color: 0x8a5a3a, size: 1.1, radius: 0.5, xp: 8,
  },
  crab: {
    rig: 'crab', move: 'walk', hp: 50, speed: 1.0, chase: 2.2, dmg: 5,
    aggro: 5, leash: 9, atkRange: 1.2, atkCd: 1.5,
    drop: { crabmeat: 2 }, coins: 10, respawn: 22, color: 0xe8603a, size: 1.1, radius: 0.5, xp: 16,
  },
  wisp: {
    rig: 'wisp', move: 'walk', fly: 1.4, hp: 70, speed: 1.5, chase: 3.4, dmg: 7,
    aggro: 7, leash: 10, atkRange: 1.3, atkCd: 1.3,
    drop: { firestone: 1 }, coins: 25, respawn: 24, color: 0xff8a2a, size: 1.0, radius: 0.45, xp: 28,
  },
  dragon: {
    rig: 'dragon', move: 'boss', fly: 2.0, hp: 1600, speed: 1.2, chase: 1.8, dmg: 6, slamDmg: 9, slamR: 3.8, rockDmg: 6, breathDmg: 5,
    aggro: 14, leash: 99, atkRange: 2.4, atkCd: 1.4,
    drop: { scale: 24, gold: 10, firestone: 6 }, coins: 1000, xp: 600, respawn: 0, color: 0xc0453a, size: 3.2, radius: 0.5, boss: true, attacks: ['breath', 'throw', 'leap'], minion: 'drake', fire: true,
  },
};

// 住民の仕事。node → to = その資源を集めて、その加工場へ運ぶ
export const JOBS = {
  lumber:    { cost: 50,  needs: 'sawmill',   color: 0x4f9a4a, carry: 6, node: 'tree', to: 'sawmill' },
  miner:     { cost: 60,  needs: 'stonework', color: 0xe0a93b, carry: 6, node: 'rock', to: 'stonework' },
  carrier:   { cost: 80,  needs: 'shop',      color: 0x5f8fd9, carry: 8 },
  keeper:    { cost: 100, needs: 'shop',      color: 0xe86a8a, max: 1 },
  herbalist: { cost: 150, needs: 'pharmacy',  color: 0x9b6fd6, carry: 6, node: 'herb', to: 'pharmacy' },
  soldier:   { cost: 250, needs: 'barracks',  color: 0x6b7fa8, dmg: 4, every: 0.8 },
};

// 港：船が来て、船着き場の商品をまとめて買っていく
export const HARBOR = { every: 50, first: 8, sail: 7, stay: 12, buy: 80, mult: 1.3 };

// 宿屋：旅人が毛皮の毛布を1枚使って泊まり、コインを払う
export const INN = { every: 8, stay: 6, pay: 15, guests: 4, furCap: 20 };

// お店
export const SHOP = {
  every: 4.5,        // 客が来る間かく（秒）
  everyKeeper: 3.0,  // 店番がいるとき
  serve: 0.9,        // 1人に売る時間
  queue: 6,          // 並べる人数
  buy: [1, 3],       // 1人が買う数
  stockCap: 40,      // カウンターに並べられる数
  offlineMax: 8 * 3600,
};

// 王国ランク（人口・建物の数・稼いだコインから計算）
export const RANK = { pop: 15, building: 20, coinDiv: 10, steps: [0, 30, 80, 150, 240, 350, 480, 640, 830, 1050, 1300, 1600, 2000, 2500, 3100, 3800, 4600, 5500, 6500, 7700, 9000, 10500, 12000] };

// ---- 配置の道具 ----
function rnd(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const T = (x, z) => ({ type: 'tree', x, z });
const R = (x, z) => ({ type: 'rock', x, z });
const I = (x, z) => ({ type: 'ironrock', x, z });
const H = (x, z) => ({ type: 'herb', x, z });
const G = (x, z) => ({ type: 'goldrock', x, z });
// 四角い範囲に間をあけてばらまく（avoid: [x, z, 半径] の場所には置かない）
function scatter(type, x0, x1, z0, z1, n, seed, avoid = []) {
  const r = rnd(seed), out = [];
  for (let i = 0; i < n * 30 && out.length < n; i++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    if (out.some(o => Math.hypot(o.x - x, o.z - z) < 2.4)) continue;
    out.push({ type, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 });
  }
  return out;
}

// 章ごとの配置。x は右、z は手前（画面の下）
export const CHAPTERS = {
  1: {
    name: { before: 'ch1_before', after: 'ch1_after' }, title: 'ch1_title',
    campfire: [0, 0],
    start: [0, 2.2],
    gate: { x: 5.5, z: 13, w: 2.6 },   // 客が入ってくる門
    burn: [2.3, -1.7],                 // いらない素材を焚き火にくべるマス
    lands: [
      { id: 'home',  rect: { x0: -17, x1: 17, z0: -17, z1: 13 } },
      { id: 'east',  rect: { x0: 17, x1: 33, z0: -17, z1: 13 }, hunt: true },
      { id: 'north', rect: { x0: -17, x1: 17, z0: -35, z1: -17 } },
      { id: 'swamp', rect: { x0: 17, x1: 33, z0: -35, z1: -17 }, hunt: true },
    ],
    nodes: [
      // はじめの土地
      T(-8.5, -3.2), T(-9.2, -6.6), T(-7.4, -9.6), T(-11.2, -4.4), T(-12.6, -8.2), T(-10.4, -11.8),
      T(-14.2, -5.2), T(-14.8, -10.6), T(-13.2, -14.2), T(-9.0, -14.8), T(-5.6, -14.0), T(-15.2, -1.2),
      T(-6.4, -11.4), T(-15.4, 6.2), T(-15.5, 11.2),
      R(10.4, -9.4), R(11.6, -6.6), R(12.8, -11.0), R(9.6, -13.4), R(14.4, -14.4), R(15.0, -8.0),
      R(6.8, -14.2), R(12.2, -15.4),
      // 東の草原
      T(19.5, -14), T(22, -12), T(20, -9.5), T(28.5, -15), T(19, -5), T(31, -13), T(30, -9), T(31.5, 11), T(18.8, 11.5),
      R(28, 6), R(30.5, 3.8), R(29.2, 9.6), R(26.4, 11), R(31, 0.4), R(27.5, -10.5),
      // 北の森
      ...scatter('tree', -16, 1, -34, -19, 20, 3, [[-6, -27, 4.5], [-3, -18, 2.5], [-3, -24, 1.8], [-3, -30, 1.8], [-1.5, -33.5, 2.6]]),
      ...scatter('rock', 3, 16, -34, -20, 8, 5, [[9, -27, 4]]),
      // スライムの沼
      T(18.5, -33), T(32, -33.5), T(31.8, -19), T(18.4, -20.5),
    ],
    spawns: [
      { type: 'slime', x: 21.5, z: -3, r: 3, n: 5 },
      { type: 'mushroom', x: 25, z: 4, r: 3, n: 4 },
      { type: 'bee', x: 21.5, z: 8.5, r: 2.5, n: 3 },
      { type: 'slime', x: 21, z: -23, r: 2.5, n: 3 },
      { type: 'bigslime', x: 27, z: -28, r: 3, n: 1 },
    ],
    // 建物と、土地を買うマス。appear のミッションに進むと建設マスが現れる
    //  repair = 壊れた建物を直す / build = 新しく建てる / land = コインで土地を買う
    builds: [
      { id: 'house',     type: 'repair', model: 'house',     x: -5,  z: -5,  w: 3.4, d: 3.0, tile: [-5, -2.0],   cost: { wood: 8 },                       appear: 'gather', pop: 2 },
      { id: 'sawmill',   type: 'repair', model: 'sawmill',   x: -11, z: 1,   w: 3.6, d: 3.0, tile: [-11, 3.8],   cost: { wood: 12, stone: 4 },            appear: 'sawmill',
        process: { from: 'wood', to: 'plank', time: 1.4, inCap: 30, outCap: 40, input: [-1.4, 2.4], output: [1.5, 2.4] } },
      { id: 'shop',      type: 'repair', model: 'shop',      x: 5.5, z: 4,   w: 3.4, d: 2.6, tile: [5.5, 6.6],   cost: { plank: 8, stone: 6 },            appear: 'shop',
        shop: { stock: [-2.9, 1.2], coins: [2.9, 1.4], queue: [0, 2.3], counter: [0, 1.12, 0.75], kitchen: true } },
      { id: 'stonework', type: 'repair', model: 'stonework', x: 6.5, z: -5,  w: 3.4, d: 3.0, tile: [6.5, -2.2],  cost: { stone: 12, plank: 6 },           appear: 'stonework',
        process: { from: 'stone', to: 'block', time: 1.8, inCap: 30, outCap: 40, input: [-1.4, 2.4], output: [1.5, 2.4] } },
      { id: 'smithy',    type: 'repair', model: 'smithy',    x: -5,  z: 6.5, w: 3.4, d: 3.0, tile: [-5, 9.3],    cost: { block: 8, plank: 8, jelly: 6 },  appear: 'smithy',
        anvil: [0, 2.8] },
      { id: 'storage',   type: 'build',  model: 'storage',   x: -1,  z: -9.5, w: 3.6, d: 3.0, tile: [-1, -6.7],  cost: { plank: 10, stone: 10 },          appear: 'storage',
        storage: [0, 2.8] },
      { id: 'house2',    type: 'build',  model: 'house',     x: -11, z: 8.5, w: 3.4, d: 3.0, tile: [-11, 11.3],  cost: { plank: 12, block: 8 },           appear: 'house2', pop: 2 },
      { id: 'house3',    type: 'build',  model: 'house',     x: 12,  z: 8.5, w: 3.4, d: 3.0, tile: [12, 11.2],   cost: { plank: 16, block: 12 },          appear: 'house3', pop: 2 },
      { id: 'north',     type: 'land',   land: 'north',                                       tile: [-3, -15.3],  cost: { coin: 250 },                     appear: 'buy_north' },
      { id: 'house4',    type: 'build',  model: 'house',     x: 9,   z: -27.5, w: 3.4, d: 3.0, tile: [9, -24.7],   cost: { plank: 20, block: 16 },          appear: 'buy_north', pop: 2 },
    ],
    boss: 'bigslime',
    // ミッション（上から順に1つずつ）。reward = もらえるコイン、unlock = 解放されるもの
    missions: [
      { id: 'gather',    type: 'gather',  kind: 'wood', n: 3, reward: 5 },
      { id: 'house',     type: 'build',   target: 'house', reward: 10, unlock: ['gear', 'rank'] },
      { id: 'sawmill',   type: 'build',   target: 'sawmill', reward: 10 },
      { id: 'feed',      type: 'feed',    kind: 'wood', n: 5, reward: 10 },
      { id: 'planks',    type: 'take',    kind: 'plank', n: 5, reward: 10 },
      { id: 'hunt1',     type: 'kill',    kind: 'slime', n: 3, reward: 15 },
      { id: 'shop',      type: 'build',   target: 'shop', reward: 15 },
      { id: 'cook',      type: 'cook',    n: 3, reward: 10 },
      { id: 'coins',     type: 'earn',    n: 30, reward: 10, unlock: ['upgrade'] },
      { id: 'upgrade',   type: 'upgrade', n: 1, reward: 20 },
      { id: 'storage',   type: 'build',   target: 'storage', reward: 20 },
      { id: 'stonework', type: 'build',   target: 'stonework', reward: 20 },
      { id: 'blocks',    type: 'make',    kind: 'block', n: 5, reward: 20 },
      { id: 'smithy',    type: 'build',   target: 'smithy', reward: 30 },
      { id: 'tool',      type: 'craft',   n: 1, reward: 30 },
      { id: 'house2',    type: 'build',   target: 'house2', reward: 30, unlock: ['hire'] },
      { id: 'hire',      type: 'hire',    n: 1, reward: 30 },
      { id: 'mush',      type: 'kill',    kind: 'mushroom', n: 3, reward: 40 },
      { id: 'bees',      type: 'gather',  kind: 'honey', n: 3, reward: 40 },
      { id: 'cook1b',    type: 'cook',    kind: 'honeyjelly', n: 3, reward: 50 },
      { id: 'house3',    type: 'build',   target: 'house3', reward: 50 },
      { id: 'hire3',     type: 'hire',    n: 3, reward: 50 },
      { id: 'lv1',       type: 'level',   n: 5, reward: 50 },
      { id: 'req1',      type: 'request', n: 1, reward: 50 },
      { id: 'buy_north', type: 'build',   target: 'north', reward: 80 },
      { id: 'rank',      type: 'rank',    n: 5, reward: 80 },
      { id: 'boss',      type: 'boss',    kind: 'bigslime', reward: 0 },
    ],
  },
  2: {
    name: { before: 'ch1_after', after: 'ch2_after' }, title: 'ch2_title',
    lands: [
      { id: 'west',  rect: { x0: -35, x1: -17, z0: -17, z1: 13 } },
      { id: 'herbs', rect: { x0: -35, x1: -17, z0: -35, z1: -17 }, hunt: true },
      { id: 'fort',  rect: { x0: -35, x1: -17, z0: 13, z1: 29 }, hunt: true },
    ],
    nodes: [
      // 鉄の岩山
      I(-32, -15), I(-33, -11), I(-31.5, -7.5), I(-29.5, -15.8), I(-21, -15.6), I(-18.8, -12.5), I(-23.2, -16), I(-19, -7.2),
      T(-33.5, 11.5), T(-18.6, 11.8), T(-33.8, 2.5),
      H(-30, 9.8), H(-33.4, -8.6), H(-18.8, -9.8), H(-24.5, 11.4), H(-33.6, 5.5),
      // 薬草の森
      ...scatter('herb', -34, -19, -34, -19, 16, 7, [[-25, -27, 4.5], [-26, -33.5, 2.6]]),
      ...scatter('tree', -34, -18, -34, -18, 10, 9, [[-25, -27, 4.5], [-26, -18, 2.5], [-26, -33.5, 2.6]]),
      // ゴブリンの砦
      T(-33.5, 27.5), T(-18.5, 27.8), T(-33.6, 15), I(-19, 15.5),
    ],
    spawns: [
      { type: 'wolf', x: -30, z: -22, r: 3, n: 4 },
      { type: 'boar', x: -20.5, z: -21.5, r: 2.5, n: 3 },
      { type: 'goblin', x: -24, z: -28, r: 4, n: 4 },
      { type: 'goblin', x: -22, z: 19, r: 3, n: 3 },
      { type: 'goblinchief', x: -27, z: 23, r: 2, n: 1 },
    ],
    builds: [
      { id: 'west',     type: 'land',  land: 'west',                                            tile: [-15.3, 2.2],   cost: { coin: 400 },                        appear: 'buy_west' },
      { id: 'mine',     type: 'build', model: 'mine',     x: -26,   z: -12, w: 4.0, d: 3.0, tile: [-26, -9.2],   cost: { plank: 20, block: 12, ore: 5 },     appear: 'mine',
        gen: { to: 'ore', every: 4, outCap: 30, output: [2.6, 2.6] } },
      { id: 'inn',      type: 'build', model: 'inn',      x: -21.5, z: 5,   w: 3.6, d: 3.0, tile: [-21.5, 7.8],  cost: { plank: 24, block: 16, fur: 6 },     appear: 'inn',
        inn: { fur: [-2.4, 2.7], coins: [2.4, 2.7], door: [0, 1.7] } },
      { id: 'house5',   type: 'build', model: 'house',    x: -20.5, z: -3,  w: 3.4, d: 3.0, tile: [-20.5, -0.2], cost: { plank: 20, block: 20, ore: 6 },     appear: 'house5', pop: 2 },
      { id: 'pharmacy', type: 'build', model: 'pharmacy', x: 6.5,   z: -11, w: 3.2, d: 2.8, tile: [6.5, -8.2],   cost: { block: 20, ore: 10, herb: 6 },      appear: 'pharmacy',
        process: { from: ['jelly', 'herb'], to: 'medicine', time: 2.5, inCap: 20, outCap: 30, input: [-1.35, 2.9], output: [1.45, 2.9] } },
      { id: 'market',   type: 'build', model: 'market',   x: -29.5, z: 5.5, w: 5.0, d: 2.6, tile: [-29.5, 8.3], cost: { plank: 30, block: 24, ore: 16, fur: 8 }, appear: 'market',
        shop: { stock: [-3.5, 1.5], coins: [3.3, 1.6], queue: [0, 2.6], counter: [0, 1.12, 0.8], all: true, mult: 1.5, cap: 60, every: 2.6, keeper: false } },
      { id: 'house6',   type: 'build', model: 'house',    x: -31,   z: -3,  w: 3.4, d: 3.0, tile: [-31, -0.2],   cost: { plank: 24, block: 24, fur: 4 },     appear: 'house6', pop: 2 },
    ],
    boss: 'goblinchief',
    // 町の飾り（石だたみの道と街灯）。第2章から現れる
    town: {
      roads: [[5.5, 13, 5.5, 6.9], [5.5, 12.2, -29.5, 12.2], [-3.6, 1.2, -8.4, 3.2], [2.8, 2.6, 4.5, 6.2]],
      lamps: [[7, 12], [4, 12], [-2, 12.6], [-8, 12.6], [-14, 12.6], [-20, 12.6], [-26, 11.4], [-2.5, 3.5], [2.5, 3.8], [-33, 9.6]],
    },
    missions: [
      { id: 'buy_west',  type: 'build',  target: 'west', reward: 50 },
      { id: 'ore',       type: 'gather', kind: 'ore', n: 5, reward: 30 },
      { id: 'mine',      type: 'build',  target: 'mine', reward: 50 },
      { id: 'take_ore',  type: 'take',   kind: 'ore', n: 10, reward: 40 },
      { id: 'wolves',    type: 'kill',   kind: 'wolf', n: 3, reward: 40 },
      { id: 'inn',       type: 'build',  target: 'inn', reward: 60 },
      { id: 'fur',       type: 'feed',   kind: 'fur', n: 4, reward: 30 },
      { id: 'guests',    type: 'guest',  n: 3, reward: 60 },
      { id: 'house5',    type: 'build',  target: 'house5', reward: 60 },
      { id: 'herb',      type: 'gather', kind: 'herb', n: 6, reward: 40 },
      { id: 'boars',     type: 'kill',   kind: 'boar', n: 3, reward: 60 },
      { id: 'cook2',     type: 'cook',   kind: 'steak', n: 3, reward: 60 },
      { id: 'pharmacy',  type: 'build',  target: 'pharmacy', reward: 80 },
      { id: 'medicine',  type: 'make',   kind: 'medicine', n: 5, reward: 60 },
      { id: 'market',    type: 'build',  target: 'market', reward: 100 },
      { id: 'mstock',    type: 'stock',  kind: 'market', n: 10, reward: 60 },
      { id: 'herbalist', type: 'hireJob', kind: 'herbalist', n: 1, reward: 80 },
      { id: 'house6',    type: 'build',  target: 'house6', reward: 100 },
      { id: 'tool2',     type: 'craft',  n: 1, reward: 100 },
      { id: 'lv2',       type: 'level',  n: 8, reward: 100 },
      { id: 'goblins',   type: 'kill',   kind: 'goblin', n: 5, reward: 100 },
      { id: 'rank2',     type: 'rank',   n: 8, reward: 150 },
      { id: 'boss2',     type: 'boss',   kind: 'goblinchief', reward: 0 },
    ],
  },
  3: {
    name: { before: 'ch2_after', after: 'ch3_after' }, title: 'ch3_title',
    sea: 30.5,   // これより手前（画面の下）は海
    lands: [
      { id: 'harbor', rect: { x0: -17, x1: 33, z0: 13, z1: 29 } },
      { id: 'ruins',  rect: { x0: 33, x1: 51, z0: -17, z1: 13 }, hunt: true },
      { id: 'gold',   rect: { x0: 33, x1: 51, z0: -35, z1: -17 } },
      { id: 'valley', rect: { x0: 33, x1: 51, z0: 13, z1: 29 }, hunt: true },
    ],
    nodes: [
      // 港の土地
      T(-15.5, 16), T(-14.8, 27.5), T(31.5, 16.5), T(30.8, 27.8), T(26, 15.2),
      // 骸骨の遺跡
      R(35.5, 11.5), R(49.5, -15.5), T(49.8, 11.8), T(35, -15.8), R(49.6, 1),
      // 金の山
      G(36, -33), G(39.5, -30), G(47, -33.5), G(49.5, -28.5), G(35, -22.5), G(48.5, -21.2), G(44, -19), G(37.5, -19.5),
      T(49.5, -34), T(34.8, -28),
      // 巨人の谷
      R(35, 27.5), R(49.5, 27.8), R(49.5, 14.8), T(35, 15),
    ],
    spawns: [
      { type: 'skeleton', x: 45, z: -3, r: 3.5, n: 4 },
      { type: 'troll', x: 44, z: 7, r: 3, n: 3 },
      { type: 'crab', x: 39, z: 25, r: 3, n: 4 },
      { type: 'golem', x: 43, z: 22, r: 2, n: 1 },
    ],
    builds: [
      { id: 'harbor',    type: 'land',  land: 'harbor',                                          tile: [0, 11.1],    cost: { coin: 1500 },                         appear: 'buy_harbor' },
      { id: 'port',      type: 'build', model: 'harbor',   x: 12,   z: 23.6, w: 4.4, d: 3.2, tile: [12, 27.3],  cost: { plank: 40, block: 30, ore: 20 },      appear: 'port',
        shop: { stock: [-3.6, 3.7], coins: [3.7, 3.7], queue: [0, 3.7], counter: [0, 0.35, 5.6], all: true, mult: 1.3, cap: 80, ship: true } },
      { id: 'barracks',  type: 'build', model: 'barracks', x: 29,   z: 20.5, w: 4.0, d: 3.0, tile: [29, 23.3], cost: { block: 40, ore: 30, bone: 6 },       appear: 'barracks' },
      { id: 'house7',    type: 'build', model: 'house',    x: 22,   z: 20,   w: 3.4, d: 3.0, tile: [22, 22.8],   cost: { plank: 30, block: 30, fur: 8, ore: 10 }, appear: 'house7', pop: 2 },
      { id: 'gold',      type: 'land',  land: 'gold',                                            tile: [42, -15.3],  cost: { coin: 2500 },                         appear: 'buy_gold' },
      { id: 'bigmarket', type: 'build', model: 'bigmarket', x: -6,  z: 20.5, w: 6.4, d: 3.0, tile: [-6, 23.4],  cost: { plank: 50, block: 40, gold: 10 },     appear: 'bigmarket',
        shop: { stock: [-4.3, 1.8], coins: [4.2, 1.9], queue: [0, 2.9], counter: [0, 1.12, 0.85], all: true, mult: 2.0, cap: 100, every: 1.8, keeper: false } },
      { id: 'house8',    type: 'build', model: 'house',    x: 42,   z: -25,  w: 3.4, d: 3.0, tile: [42, -22.2],   cost: { block: 40, gold: 6, bone: 4 },        appear: 'house8', pop: 2 },
      { id: 'wall',      type: 'build', model: 'wall',     x: 0,    z: -17.4, w: 34, d: 1.2, tile: [-3, -14.6], cost: { block: 80, ore: 30, gold: 12 },       appear: 'wall',
        colliders: [[-17, -5.2, -0.7, 0.7], [-0.8, 17, -0.7, 0.7]] },
    ],
    boss: 'golem',
    town: {
      roads: [[5.5, 13, 5.5, 21], [5.5, 21, 12, 21], [5.5, 18, -6, 18]],
      lamps: [[7, 17], [4, 20], [8.8, 21.5], [15.2, 21.5], [-1, 19.5], [-10.5, 19.5]],
      flags: [[-17.5, -18.8], [16.5, -18.8], [-12, 24], [0, 24.5], [17.5, 26], [6.5, 25]],
    },
    missions: [
      { id: 'buy_harbor', type: 'build',   target: 'harbor', reward: 100 },
      { id: 'port',       type: 'build',   target: 'port', reward: 150 },
      { id: 'ship',       type: 'ship',    n: 1, reward: 150 },
      { id: 'horns',      type: 'gather',  kind: 'bone', n: 6, reward: 100 },
      { id: 'barracks',   type: 'build',   target: 'barracks', reward: 200 },
      { id: 'soldier',    type: 'hireJob', kind: 'soldier', n: 1, reward: 150 },
      { id: 'house7',     type: 'build',   target: 'house7', reward: 150 },
      { id: 'buy_gold',   type: 'build',   target: 'gold', reward: 200 },
      { id: 'goldore',    type: 'gather',  kind: 'gold', n: 10, reward: 150 },
      { id: 'bigmarket',  type: 'build',   target: 'bigmarket', reward: 250 },
      { id: 'bstock',     type: 'stock',   kind: 'bigmarket', n: 15, reward: 150 },
      { id: 'trolls',     type: 'kill',    kind: 'troll', n: 3, reward: 200 },
      { id: 'crabs',      type: 'kill',    kind: 'crab', n: 3, reward: 200 },
      { id: 'cook3',      type: 'cook',    kind: 'crabpot', n: 3, reward: 250 },
      { id: 'house8',     type: 'build',   target: 'house8', reward: 200 },
      { id: 'wall',       type: 'build',   target: 'wall', reward: 300 },
      { id: 'tool3',      type: 'craft',   n: 1, reward: 200 },
      { id: 'lv3',        type: 'level',   n: 12, reward: 200 },
      { id: 'rank3',      type: 'rank',    n: 12, reward: 300 },
      { id: 'boss3',      type: 'boss',    kind: 'golem', reward: 0 },
    ],
  },
  4: {
    name: { before: 'ch3_after', after: 'ch4_after' }, title: 'ch4_title',
    lands: [
      { id: 'castle',  rect: { x0: -17, x1: 17, z0: -53, z1: -35 } },
      { id: 'volcano', rect: { x0: 17, x1: 51, z0: -53, z1: -35 }, hunt: true },
      { id: 'nest',    rect: { x0: -35, x1: -17, z0: -53, z1: -35 }, hunt: true },
    ],
    nodes: [
      // 城の丘
      T(-15.5, -51.5), T(15.5, -51.5), T(-15.8, -37), T(15.6, -37.2), R(-15.8, -48), R(14.5, -45),
      // 火山の麓
      R(19, -51), R(24, -52), R(33, -50.5), R(48.5, -51.5), R(49.5, -38), R(19.5, -37.5), R(36, -37), G(34, -44), G(49, -45),
      // 竜の巣
      R(-33.5, -51.5), R(-19, -51.8), R(-33.8, -37), R(-18.5, -36.8), G(-33, -44),
    ],
    spawns: [
      { type: 'lizard', x: 25, z: -44, r: 4, n: 4 },
      { type: 'wisp', x: 35, z: -40, r: 3, n: 3 },
      { type: 'drake', x: 44, z: -46, r: 4, n: 3 },
      { type: 'lizard', x: -21, z: -40, r: 2.5, n: 2 },
      { type: 'dragon', x: -26, z: -46, r: 2, n: 1 },
    ],
    builds: [
      { id: 'castle',   type: 'land',  land: 'castle',                                           tile: [0, -33.3],    cost: { coin: 5000 },                            appear: 'buy_castle' },
      // 城：同じ場所の大きな建設マスで、土台→壁→塔→屋根と段階的に建つ
      { id: 'castle1',  type: 'build', model: 'castle1', x: 0, z: -46.5, w: 12, d: 8, tile: [0, -39.8], tileSize: 4, cost: { block: 120, stone: 60 },            appear: 'castle1' },
      { id: 'castle2',  type: 'build', model: 'castle2', x: 0, z: -46.5, w: 12, d: 8, tile: [0, -39.8], tileSize: 4, cost: { block: 150, gold: 20, ore: 40 },   appear: 'castle2', colliders: [] },
      { id: 'plaza',    type: 'build', model: 'plaza',   x: -11.5, z: -42, w: 7, d: 6, tile: [-11.5, -37.8], cost: { block: 80, plank: 60, medicine: 10 },           appear: 'plaza', colliders: [] },
      { id: 'house9',   type: 'build', model: 'house',   x: 10.5, z: -41, w: 3.4, d: 3.0, tile: [10.5, -38.2], cost: { block: 60, plank: 40, scale: 4 },           appear: 'house9', pop: 2 },
      { id: 'castle3',  type: 'build', model: 'castle3', x: 0, z: -46.5, w: 12, d: 8, tile: [0, -39.8], tileSize: 4, cost: { block: 150, gold: 40, scale: 15 },  appear: 'castle3', colliders: [] },
      { id: 'statue',   type: 'build', model: 'statue',  x: -11.5, z: -42.5, w: 1.6, d: 1.6, tile: [-11.5, -38.6], cost: { gold: 50, block: 40, scale: 10 },     appear: 'statue' },
      { id: 'castle4',  type: 'build', model: 'castle4', x: 0, z: -46.5, w: 12, d: 8, tile: [0, -39.8], tileSize: 4, cost: { scale: 30, gold: 40, plank: 80 },   appear: 'castle4', colliders: [] },
    ],
    boss: 'dragon',
    town: {
      roads: [[-3, -17, -3, -31], [-3, -31, 0, -37.5], [-3, -37, -11.5, -37]],
      lamps: [[-4.8, -20], [-1.2, -20], [-4.8, -25], [-1.2, -25], [-4.8, -30], [-1.2, -30], [3, -38], [-7.5, -36]],
      flags: [[-6.8, -40.5], [6.8, -40.5], [-15, -39], [8, -36]],
    },
    missions: [
      { id: 'buy_castle',  type: 'build',  target: 'castle', reward: 300 },
      { id: 'castle1',     type: 'build',  target: 'castle1', reward: 400 },
      { id: 'lizards',     type: 'kill',   kind: 'lizard', n: 5, reward: 300 },
      { id: 'scales',      type: 'gather', kind: 'scale', n: 8, reward: 300 },
      { id: 'castle2',     type: 'build',  target: 'castle2', reward: 500 },
      { id: 'plaza',       type: 'build',  target: 'plaza', reward: 400 },
      { id: 'house9',      type: 'build',  target: 'house9', reward: 300 },
      { id: 'drakes',      type: 'kill',   kind: 'drake', n: 3, reward: 400 },
      { id: 'cook4',       type: 'cook',   kind: 'skewer', n: 3, reward: 400 },
      { id: 'castle3',     type: 'build',  target: 'castle3', reward: 600 },
      { id: 'statue',      type: 'build',  target: 'statue', reward: 500 },
      { id: 'tool4',       type: 'craft',  n: 1, reward: 400 },
      { id: 'lv4',         type: 'level',  n: 16, reward: 400 },
      { id: 'rank4',       type: 'rank',   n: 15, reward: 600 },
      { id: 'boss4',       type: 'boss',   kind: 'dragon', reward: 0 },
      { id: 'castle4',     type: 'build',  target: 'castle4', reward: 0 },
    ],
  },
};

// 1章から n 章までの配置をまとめる（土地・資源・敵・建物は前の章のものも残る）
export function chapterData(n) {
  const base = CHAPTERS[1];
  const out = { ...base, n, lands: [], nodes: [], spawns: [], builds: [], towns: [] };
  for (let c = 1; c <= n && CHAPTERS[c]; c++) {
    const d = CHAPTERS[c];
    out.lands.push(...d.lands);
    out.nodes.push(...d.nodes);
    out.spawns.push(...d.spawns);
    out.builds.push(...d.builds.map(b => ({ ...b, ch: c })));
    if (d.town) out.towns.push(d.town);
    if (d.sea) out.sea = d.sea;
  }
  const cur = CHAPTERS[n];
  out.missions = cur.missions; out.boss = cur.boss; out.name = cur.name; out.title = cur.title;
  return out;
}
export const LAST_CHAPTER = Math.max(...Object.keys(CHAPTERS).map(Number));
