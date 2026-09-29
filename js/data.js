// ゲームの数値と配置。章ごとの素材・資源・敵・建物はここにまとめる（調整はこのファイルで）

// 主人公の基本の強さ（強化は区切り2で追加）
export const PLAYER = {
  hp: 10,
  speed: 4.4,          // 1秒に進む距離
  bagCap: 10,          // 背中に積める数
  dmg: 1,              // 剣の攻撃力
  regenDelay: 4,       // 攻撃を受けてから回復が始まるまでの秒数
  regenPerSec: 0.8,
  swing: { axe: 0.5, pick: 0.55, sword: 0.42 }, // 1振りの秒数
  reachEnemy: 1.5,
};

// 素材。h = 背中に積んだときの1個の高さ
export const MATERIALS = {
  wood:  { color: 0xc98a4b, h: 0.21 },
  stone: { color: 0xa7abb2, h: 0.25 },
  jelly: { color: 0x86e36f, h: 0.23 },
};

// 切ったり割ったりできる資源。hits 回たたくと倒れ、1回ごとに1個＋倒れたとき bonus 個出る
export const NODE_TYPES = {
  tree: { tool: 'axe',  hits: 3, drop: 'wood',  bonus: 1, respawn: 20, reach: 1.35, collide: 0.35 },
  rock: { tool: 'pick', hits: 4, drop: 'stone', bonus: 1, respawn: 26, reach: 1.6,  collide: 0.62 },
};

// 敵
export const ENEMY_TYPES = {
  slime: {
    rig: 'slime', hp: 3, speed: 1.2, chase: 2.3, dmg: 1,
    aggro: 4.5,     // この距離に入ると追いかけてくる
    leash: 9,       // すみかからこれ以上は追ってこない
    atkRange: 0.95, atkCd: 1.4,
    drop: { jelly: 2 }, respawn: 15,
    color: 0x8be36a, size: 1, radius: 0.42,
  },
};

const T = (x, z) => ({ type: 'tree', x, z });
const R = (x, z) => ({ type: 'rock', x, z });

// 章ごとの配置。x は右、z は手前（画面の下）
export const CHAPTERS = {
  1: {
    fence: { x0: -17, x1: 17, z0: -17, z1: 13 },
    campfire: [0, 0],
    start: [0, 2.2],
    nodes: [
      T(-8.5, -3.2), T(-9.2, -6.6), T(-7.4, -9.6), T(-11.2, -4.4), T(-12.6, -8.2), T(-10.4, -11.8),
      T(-14.2, -5.2), T(-14.8, -10.6), T(-13.2, -14.2), T(-9.0, -14.8), T(-5.6, -14.0), T(-15.2, -1.2),
      T(-6.4, -11.4), T(-15.4, 6.2), T(-12.2, 9.4),
      R(9.2, -9.0), R(11.6, -6.6), R(12.8, -11.0), R(9.6, -13.4), R(14.4, -14.4), R(15.0, -8.0),
      R(6.8, -14.2), R(12.2, -15.4),
    ],
    spawns: [
      { type: 'slime', x: 10, z: 7.5, r: 4, n: 5 },
    ],
    // 建物。上から順に建設マスが現れる。repair = 壊れた状態で置いてあり、素材で修理する
    builds: [
      { id: 'house',     model: 'house',     x: -5,  z: -5,  w: 3.4, d: 3.0, tile: [-5, -2.0],  cost: { wood: 8 },                      repair: true },
      { id: 'sawmill',   model: 'sawmill',   x: -11, z: 2,   w: 3.6, d: 3.0, tile: [-11, 4.8], cost: { wood: 12, stone: 4 },           repair: true },
      { id: 'stonework', model: 'stonework', x: 6,   z: -5,  w: 3.4, d: 3.0, tile: [6, -2.0],  cost: { stone: 12, wood: 6 },           repair: true },
      { id: 'shop',      model: 'shop',      x: -1,  z: -10, w: 3.4, d: 2.6, tile: [-1, -7.3], cost: { wood: 14, stone: 8, jelly: 4 }, repair: true },
      { id: 'smithy',    model: 'smithy',    x: -5,  z: 6,   w: 3.4, d: 3.0, tile: [-5, 8.8],  cost: { stone: 16, wood: 10, jelly: 6 }, repair: true },
    ],
  },
};
