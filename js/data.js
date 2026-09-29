// ゲームの数値と配置。章ごとの素材・資源・敵・建物・ミッションはここにまとめる（調整はこのファイルで）

// 主人公の基本の強さ（強化で変わるものは UPGRADES / TOOLS）
export const PLAYER = {
  regenDelay: 4,       // 攻撃を受けてから回復が始まるまでの秒数
  regenPerSec: 0.8,
  reachEnemy: 1.5,
  jellyHeal: 3,        // ゼリー1個で回復するHP（HPがこれだけ減ると背中のゼリーを自動で食べる）
  jellyCd: 1.5,        // 続けて食べるまでの秒数
};

// 倉庫に預けられる数（預けた素材は建設マス・加工場・お店・鍛冶屋で自動で使われる）
export const STORAGE = { cap: 200 };

// 強化（コインだけ）。values[レベル] が効果、costs[レベル] が次のレベルへの値段
export const UPGRADES = {
  bag:   { values: [10, 15, 20, 26, 32, 40], costs: [30, 70, 140, 240, 380] },   // 背中の積載量
  speed: { values: [4.4, 4.8, 5.2, 5.6], costs: [40, 110, 220] },               // 移動速度
  hp:    { values: [10, 14, 18, 24], costs: [40, 110, 230] },                   // HP
};

// 鍛冶屋での強化（素材＋コイン）。素材は背中から使う
export const TOOLS = {
  sword: { values: [1, 2, 3, 5], swing: [0.42, 0.4, 0.38, 0.36], costs: [{ block: 3, coin: 40 }, { block: 6, jelly: 4, coin: 100 }, { block: 10, jelly: 8, coin: 220 }] },
  axe:   { values: [1, 2, 3],    swing: [0.5, 0.42, 0.36],       costs: [{ plank: 5, coin: 40 }, { block: 6, coin: 120 }] },
  pick:  { values: [1, 2, 3],    swing: [0.55, 0.46, 0.4],       costs: [{ plank: 5, coin: 50 }, { block: 6, coin: 140 }] },
};

// 素材。h = 背中に積んだときの1個の高さ、price = お店で売れる値段（ないものは売らない）
export const MATERIALS = {
  wood:  { color: 0xc98a4b, h: 0.21 },
  stone: { color: 0xa7abb2, h: 0.25 },
  jelly: { color: 0x86e36f, h: 0.23, price: 2 },
  plank: { color: 0xecc78e, h: 0.12, price: 4 },
  block: { color: 0xdedad2, h: 0.27, price: 6 },
};

// 切ったり割ったりできる資源。hits 回ぶんたたくと倒れ、たたいた分だけ素材が出て、倒れたとき bonus 個おまけ
export const NODE_TYPES = {
  tree: { tool: 'axe',  hits: 3, drop: 'wood',  bonus: 1, respawn: 20, reach: 1.35, collide: 0.35 },
  rock: { tool: 'pick', hits: 4, drop: 'stone', bonus: 1, respawn: 26, reach: 1.6,  collide: 0.62 },
};

// 敵。move: hop = 跳ねる / walk = 歩く
export const ENEMY_TYPES = {
  slime: {
    rig: 'slime', move: 'hop', hp: 3, speed: 1.2, chase: 2.3, dmg: 1,
    aggro: 4.5, leash: 9, atkRange: 0.95, atkCd: 1.4,
    drop: { jelly: 2 }, respawn: 15, color: 0x8be36a, size: 1, radius: 0.42,
  },
  mushroom: {
    rig: 'mushroom', move: 'walk', hp: 6, speed: 1.0, chase: 2.6, dmg: 2,
    aggro: 5, leash: 9, atkRange: 1.0, atkCd: 1.3,
    drop: { jelly: 3 }, respawn: 20, color: 0xe8514a, size: 1, radius: 0.45,
  },
  bigslime: {
    rig: 'boss', move: 'boss', hp: 90, speed: 1.2, chase: 1.8, dmg: 2, slamDmg: 3, slamR: 2.6,
    aggro: 11, leash: 99, atkRange: 1.7, atkCd: 1.2,
    drop: { jelly: 12 }, respawn: 0, color: 0x6fd65a, size: 2.8, radius: 0.42, boss: true,
  },
};

// 住民の仕事
export const JOBS = {
  lumber:  { cost: 50,  needs: 'sawmill',   color: 0x4f9a4a, carry: 6 },
  miner:   { cost: 60,  needs: 'stonework', color: 0xe0a93b, carry: 6 },
  carrier: { cost: 80,  needs: 'shop',      color: 0x5f8fd9, carry: 8 },
  keeper:  { cost: 100, needs: 'shop',      color: 0xe86a8a, max: 1 },
};

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
export const RANK = { pop: 15, building: 20, coinDiv: 10, steps: [0, 30, 80, 150, 240, 350, 480, 640, 830, 1050, 1300, 1600, 2000, 2500, 3100, 3800] };

// ---- 配置の道具 ----
function rnd(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const T = (x, z) => ({ type: 'tree', x, z });
const R = (x, z) => ({ type: 'rock', x, z });
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
    name: { before: 'ch1_before', after: 'ch1_after' },
    campfire: [0, 0],
    start: [0, 2.2],
    gate: { x: 5.5, z: 13, w: 2.6 },   // 客が入ってくる門
    burn: [2.3, -1.7],                 // いらない素材を焚き火にくべるマス
    lands: [
      { id: 'home',  rect: { x0: -17, x1: 17, z0: -17, z1: 13 } },
      { id: 'east',  rect: { x0: 17, x1: 33, z0: -17, z1: 13 } },
      { id: 'north', rect: { x0: -17, x1: 17, z0: -35, z1: -17 } },
      { id: 'swamp', rect: { x0: 17, x1: 33, z0: -35, z1: -17 } },
    ],
    nodes: [
      // はじめの土地
      T(-8.5, -3.2), T(-9.2, -6.6), T(-7.4, -9.6), T(-11.2, -4.4), T(-12.6, -8.2), T(-10.4, -11.8),
      T(-14.2, -5.2), T(-14.8, -10.6), T(-13.2, -14.2), T(-9.0, -14.8), T(-5.6, -14.0), T(-15.2, -1.2),
      T(-6.4, -11.4), T(-15.4, 6.2), T(-15.5, 11.2),
      R(9.2, -9.0), R(11.6, -6.6), R(12.8, -11.0), R(9.6, -13.4), R(14.4, -14.4), R(15.0, -8.0),
      R(6.8, -14.2), R(12.2, -15.4),
      // 東の草原
      T(19.5, -14), T(22, -12), T(20, -9.5), T(28.5, -15), T(19, -5), T(31, -13), T(30, -9), T(31.5, 11), T(18.8, 11.5),
      R(28, 6), R(30.5, 3.8), R(29.2, 9.6), R(26.4, 11), R(31, 0.4), R(27.5, -10.5),
      // 北の森
      ...scatter('tree', -16, 1, -34, -19, 20, 3, [[-6, -27, 4.5], [-3, -18, 2.5]]),
      ...scatter('rock', 3, 16, -34, -20, 8, 5, [[9, -27, 4]]),
      // スライムの沼
      T(18.5, -33), T(32, -33.5), T(31.8, -19), T(18.4, -20.5),
    ],
    spawns: [
      { type: 'slime', x: 13, z: -1, r: 2.5, n: 4 },
      { type: 'mushroom', x: 24, z: -1, r: 4.5, n: 4 },
      { type: 'slime', x: 9, z: -27, r: 3, n: 4 },
      { type: 'mushroom', x: -6, z: -27, r: 3.5, n: 3 },
      { type: 'bigslime', x: 25, z: -27, r: 3, n: 1 },
    ],
    // 建物と、土地を買うマス。appear のミッションに進むと建設マスが現れる
    //  repair = 壊れた建物を直す / build = 新しく建てる / land = コインで土地を買う
    builds: [
      { id: 'house',     type: 'repair', model: 'house',     x: -5,  z: -5,  w: 3.4, d: 3.0, tile: [-5, -2.0],   cost: { wood: 8 },                       appear: 'gather', pop: 2 },
      { id: 'sawmill',   type: 'repair', model: 'sawmill',   x: -11, z: 1,   w: 3.6, d: 3.0, tile: [-11, 3.8],   cost: { wood: 12, stone: 4 },            appear: 'sawmill',
        process: { from: 'wood', to: 'plank', time: 1.4, inCap: 30, outCap: 40, input: [-1.4, 2.4], output: [1.5, 2.4] } },
      { id: 'shop',      type: 'repair', model: 'shop',      x: 5.5, z: 4,   w: 3.4, d: 2.6, tile: [5.5, 6.6],   cost: { plank: 8, stone: 6 },            appear: 'shop',
        shop: { stock: [-2.9, 1.2], coins: [2.9, 1.4], queue: [0, 2.3], counter: [0, 1.12, 0.75] } },
      { id: 'stonework', type: 'repair', model: 'stonework', x: 6.5, z: -5,  w: 3.4, d: 3.0, tile: [6.5, -2.2],  cost: { stone: 12, plank: 6 },           appear: 'stonework',
        process: { from: 'stone', to: 'block', time: 1.8, inCap: 30, outCap: 40, input: [-1.4, 2.4], output: [1.5, 2.4] } },
      { id: 'smithy',    type: 'repair', model: 'smithy',    x: -5,  z: 6.5, w: 3.4, d: 3.0, tile: [-5, 9.3],    cost: { block: 8, plank: 8, jelly: 6 },  appear: 'smithy',
        anvil: [0, 2.8] },
      { id: 'storage',   type: 'build',  model: 'storage',   x: -1,  z: -9.5, w: 3.6, d: 3.0, tile: [-1, -6.7],  cost: { plank: 10, stone: 10 },          appear: 'storage',
        storage: [0, 2.8] },
      { id: 'house2',    type: 'build',  model: 'house',     x: -11, z: 8.5, w: 3.4, d: 3.0, tile: [-11, 11.3],  cost: { plank: 12, block: 8 },           appear: 'house2', pop: 2 },
      { id: 'east',      type: 'land',   land: 'east',                                        tile: [15.3, 9],    cost: { coin: 120 },                     appear: 'buy_east' },
      { id: 'house3',    type: 'build',  model: 'house',     x: 12,  z: 8.5, w: 3.4, d: 3.0, tile: [12, 11.2],   cost: { plank: 16, block: 12 },          appear: 'house3', pop: 2 },
      { id: 'north',     type: 'land',   land: 'north',                                       tile: [-3, -15.3],  cost: { coin: 250 },                     appear: 'buy_north' },
      { id: 'house4',    type: 'build',  model: 'house',     x: 22,  z: 8,   w: 3.4, d: 3.0, tile: [22, 10.8],   cost: { plank: 20, block: 16 },          appear: 'buy_north', pop: 2 },
      { id: 'swamp',     type: 'land',   land: 'swamp',                                       tile: [25, -15.3],  cost: { coin: 400 },                     appear: 'buy_swamp' },
    ],
    boss: 'bigslime',
    // ミッション（上から順に1つずつ）。reward = もらえるコイン、unlock = 解放されるもの
    missions: [
      { id: 'gather',    type: 'gather',  kind: 'wood', n: 3, reward: 5 },
      { id: 'house',     type: 'build',   target: 'house', reward: 10, unlock: ['gear', 'rank'] },
      { id: 'sawmill',   type: 'build',   target: 'sawmill', reward: 10 },
      { id: 'feed',      type: 'feed',    kind: 'wood', n: 5, reward: 10 },
      { id: 'planks',    type: 'take',    kind: 'plank', n: 5, reward: 10 },
      { id: 'shop',      type: 'build',   target: 'shop', reward: 15 },
      { id: 'stock',     type: 'stock',   n: 5, reward: 10 },
      { id: 'coins',     type: 'earn',    n: 30, reward: 10, unlock: ['upgrade'] },
      { id: 'upgrade',   type: 'upgrade', n: 1, reward: 20 },
      { id: 'storage',   type: 'build',   target: 'storage', reward: 20 },
      { id: 'stonework', type: 'build',   target: 'stonework', reward: 20 },
      { id: 'blocks',    type: 'make',    kind: 'block', n: 5, reward: 20 },
      { id: 'smithy',    type: 'build',   target: 'smithy', reward: 30 },
      { id: 'tool',      type: 'tool',    n: 1, reward: 30 },
      { id: 'house2',    type: 'build',   target: 'house2', reward: 30, unlock: ['hire'] },
      { id: 'hire',      type: 'hire',    n: 1, reward: 30 },
      { id: 'buy_east',  type: 'build',   target: 'east', reward: 40 },
      { id: 'mush',      type: 'kill',    kind: 'mushroom', n: 3, reward: 40 },
      { id: 'house3',    type: 'build',   target: 'house3', reward: 50 },
      { id: 'hire3',     type: 'hire',    n: 3, reward: 50 },
      { id: 'buy_north', type: 'build',   target: 'north', reward: 80 },
      { id: 'rank',      type: 'rank',    n: 5, reward: 80 },
      { id: 'buy_swamp', type: 'build',   target: 'swamp', reward: 0 },
      { id: 'boss',      type: 'boss',    kind: 'bigslime', reward: 0 },
    ],
  },
};
