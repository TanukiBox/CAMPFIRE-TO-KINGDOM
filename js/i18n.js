// 日本語・英語（ブラウザの言語で自動。設定で切り替えも可）
const TEXT = {
  ja: {
    title: '焚き火から王国へ', subtitle: 'CAMPFIRE TO KINGDOM',
    moveHint: '画面のどこでも ドラッグで移動',
    full: '満杯！',
    rank: 'ランク{n}', pop: '人口',
    ch1_before: '廃村', ch1_after: '村', ch1_title: '第1章　廃村から村へ',
    btnUpgrade: '強化', btnHire: '住民',
    // ミッション
    m_gather: '木に近づいて 木材を集めよう',
    m_house: '建設マスに木材を運んで 家を修理しよう',
    m_sawmill: '製材所を修理しよう（石は岩を割って集める）',
    m_feed: '製材所の青いマスに 木材を入れよう',
    m_planks: '製材所の出口から 板を受け取ろう',
    m_shop: '板と石で お店を修理しよう',
    m_stock: 'お店の黄色いマスで 板を並べよう',
    m_coins: '売れたコインを受け取ろう',
    m_upgrade: '「強化」ボタンで 自分を強くしよう',
    m_stonework: '石工場を修理しよう',
    m_blocks: '石工場で 石材を作ろう',
    m_smithy: '鍛冶屋を修理しよう（ゼリーはスライムから）',
    m_tool: '鍛冶屋の台に立って 道具を強化しよう',
    m_house2: '新しい家を建てよう',
    m_hire: '「住民」ボタンで 住民を雇おう',
    m_buy_east: 'コインで 東の草原を買おう',
    m_mush: 'キノコのモンスターを倒そう',
    m_house3: '3軒目の家を建てよう',
    m_hire3: '住民を3人 雇おう',
    m_buy_north: 'コインで 北の森を買おう',
    m_rank: '王国ランクを{n}にしよう',
    m_buy_swamp: 'コインで スライムの沼を買おう',
    m_boss: '沼のぬし 大スライムを倒そう',
    m_free: '自由に村を育てよう（第2章は準備中）',
    missionDone: 'ミッション達成！',
    unlock_upgrade: '「強化」が使えるようになった！',
    unlock_hire: '「住民」が使えるようになった！',
    unlock_gear: '設定が使えるようになった',
    // 建物・土地
    repairOf: '{b}を修理', buildOf: '{b}を建てる', buyLand: '{l}を買う',
    repaired: '{b}を修理した！', built: '{b}が建った！', landOpen: '{l}を手に入れた！',
    newTile: '新しい建設マスが現れた！', newPeople: '住民が{n}人ふえた！',
    b_house: '家', b_sawmill: '製材所', b_stonework: '石工場', b_shop: 'お店', b_smithy: '鍛冶屋',
    l_east: '東の草原', l_north: '北の森', l_swamp: 'スライムの沼',
    s_in: '入れる', s_out: '出口', s_stock: '並べる', s_shopFull: 'いっぱい',
    m_wood: '木材', m_stone: '石', m_jelly: 'スライムゼリー', m_plank: '板', m_block: '石材', coin: 'コイン',
    // 倒れた
    fell: '倒れてしまった…', dropped: '素材を{n}個 落とした', droppedNone: '焚き火で目がさめた',
    // ぬし
    boss_bigslime: '沼のぬし 大スライム', bossAppear: '沼のぬしが現れた！',
    // 強化
    upTitle: '強化', up_bag: '背中の積載量', up_speed: '移動速度', up_hp: 'HP',
    upDesc: 'コインで自分を強くする。鍛冶屋では道具を強化できる',
    buy: '強化', max: 'MAX', lv: 'Lv{n}',
    smithTitle: '鍛冶屋', smithDesc: '素材（背中から使う）とコインで道具を強化する',
    tool_sword: '剣', tool_axe: '斧', tool_pick: 'つるはし',
    eff_sword: '攻撃力', eff_axe: '伐採の速さ', eff_pick: '採掘の速さ',
    upgraded: '{x}を強化した！',
    // 住民
    hireTitle: '住民', hireInfo: '住民 {p}人（働いている {w}人・手があいている {f}人）',
    job_lumber: '木こり', job_miner: '鉱夫', job_carrier: '運び手', job_keeper: '店番',
    jd_lumber: '木を切って 製材所に運ぶ', jd_miner: '岩を割って 石工場に運ぶ', jd_carrier: '板や石材を お店に並べる', jd_keeper: '売るのが速くなり コインを集めてくれる',
    hire: '雇う', needB: '{b}が必要', noFree: '手があいている住民がいません。家を建てよう', hiredN: '{n}人', hired: '{j}を雇った！',
    // タイトル
    start: 'はじめる', cont: 'つづきから', debugTitle: 'デバッグ：章を選ぶ（素材・コイン大量）', chN: '第{n}章',
    // 章クリア
    clearTitle: '第1章 クリア！', clearSub: '焚き火しかない廃村が「村」になった！',
    statRank: '王国ランク', statPop: '人口', statTime: 'プレイ時間',
    share: 'シェアする', keepPlaying: 'つづける', nextSoon: '第2章は準備中です。このまま村を育てられます',
    shareText: '焚き火しかない廃村を「村」に育てた！ 王国ランク{r}・人口{p}人・プレイ時間{t} #焚き火から王国へ',
    // 留守
    awayTitle: 'おかえり！', awayTime: '{t}のあいだ 留守にしていました', awaySold: '留守の間の売上',
    awayItems: '{n}個 売れた', awayCapped: '（売れるのは最大8時間ぶん）', ok: 'OK',
    tMin: '{m}分', tHm: '{h}時間{m}分',
    // 設定
    settings: '設定', sound: '効果音', on: 'オン', off: 'オフ', language: '言語 / Language',
    reset: 'データを消して最初から', resetAsk: '本当に消しますか？ 元に戻せません。', yes: '消す', cancel: 'やめる', close: '閉じる',
    quality: '画質', qAuto: '自動調整中', debugAway: 'テスト：1時間留守にしたことにする',
  },
  en: {
    title: 'Campfire to Kingdom', subtitle: '焚き火から王国へ',
    moveHint: 'Drag anywhere to move',
    full: 'Full!',
    rank: 'Rank {n}', pop: 'Pop.',
    ch1_before: 'Ruins', ch1_after: 'Village', ch1_title: 'Chapter 1 — From Ruins to Village',
    btnUpgrade: 'Upgrade', btnHire: 'People',
    m_gather: 'Walk up to a tree to gather wood',
    m_house: 'Bring wood to the build tile and repair the house',
    m_sawmill: 'Repair the sawmill (break rocks for stone)',
    m_feed: 'Put wood on the sawmill’s blue tile',
    m_planks: 'Pick up planks at the sawmill exit',
    m_shop: 'Repair the shop with planks and stone',
    m_stock: 'Stand on the shop’s yellow tile to stock planks',
    m_coins: 'Collect the coins from sales',
    m_upgrade: 'Use “Upgrade” to get stronger',
    m_stonework: 'Repair the stoneworks',
    m_blocks: 'Make stone blocks at the stoneworks',
    m_smithy: 'Repair the smithy (slimes drop jelly)',
    m_tool: 'Stand on the smithy’s anvil to upgrade a tool',
    m_house2: 'Build a new house',
    m_hire: 'Use “People” to hire a villager',
    m_buy_east: 'Buy the East Meadow with coins',
    m_mush: 'Defeat mushroom monsters',
    m_house3: 'Build a third house',
    m_hire3: 'Hire 3 villagers',
    m_buy_north: 'Buy the North Woods with coins',
    m_rank: 'Reach kingdom rank {n}',
    m_buy_swamp: 'Buy the Slime Swamp with coins',
    m_boss: 'Defeat the swamp boss, Big Slime',
    m_free: 'Keep growing your village (Chapter 2 coming soon)',
    missionDone: 'Mission complete!',
    unlock_upgrade: '“Upgrade” unlocked!',
    unlock_hire: '“People” unlocked!',
    unlock_gear: 'Settings unlocked',
    repairOf: 'Repair {b}', buildOf: 'Build {b}', buyLand: 'Buy {l}',
    repaired: '{b} repaired!', built: '{b} built!', landOpen: '{l} is yours!',
    newTile: 'A new build tile appeared!', newPeople: '{n} new villagers!',
    b_house: 'House', b_sawmill: 'Sawmill', b_stonework: 'Stoneworks', b_shop: 'Shop', b_smithy: 'Smithy',
    l_east: 'East Meadow', l_north: 'North Woods', l_swamp: 'Slime Swamp',
    s_in: 'In', s_out: 'Out', s_stock: 'Stock', s_shopFull: 'Full',
    m_wood: 'Wood', m_stone: 'Stone', m_jelly: 'Slime Jelly', m_plank: 'Plank', m_block: 'Stone Block', coin: 'Coins',
    fell: 'You fainted…', dropped: 'Dropped {n} materials', droppedNone: 'You woke up by the campfire',
    boss_bigslime: 'Swamp Boss: Big Slime', bossAppear: 'The swamp boss appears!',
    upTitle: 'Upgrade', up_bag: 'Carry limit', up_speed: 'Move speed', up_hp: 'HP',
    upDesc: 'Spend coins to get stronger. Tools are upgraded at the smithy',
    buy: 'Upgrade', max: 'MAX', lv: 'Lv{n}',
    smithTitle: 'Smithy', smithDesc: 'Upgrade tools with materials (from your back) and coins',
    tool_sword: 'Sword', tool_axe: 'Axe', tool_pick: 'Pickaxe',
    eff_sword: 'Attack', eff_axe: 'Chopping speed', eff_pick: 'Mining speed',
    upgraded: '{x} upgraded!',
    hireTitle: 'People', hireInfo: '{p} villagers ({w} working, {f} free)',
    job_lumber: 'Lumberjack', job_miner: 'Miner', job_carrier: 'Carrier', job_keeper: 'Shopkeeper',
    jd_lumber: 'Chops trees, brings wood to the sawmill', jd_miner: 'Breaks rocks, brings stone to the stoneworks', jd_carrier: 'Stocks planks and blocks at the shop', jd_keeper: 'Sells faster and collects coins for you',
    hire: 'Hire', needB: 'Needs {b}', noFree: 'No free villagers. Build a house!', hiredN: '×{n}', hired: 'Hired a {j}!',
    start: 'Start', cont: 'Continue', debugTitle: 'Debug: pick a chapter (lots of materials & coins)', chN: 'Chapter {n}',
    clearTitle: 'Chapter 1 Clear!', clearSub: 'The ruins with only a campfire became a village!',
    statRank: 'Kingdom rank', statPop: 'Population', statTime: 'Play time',
    share: 'Share', keepPlaying: 'Keep playing', nextSoon: 'Chapter 2 is coming soon. You can keep growing your village',
    shareText: 'I grew a ruined campsite into a village! Kingdom rank {r}, population {p}, play time {t} #CampfireToKingdom',
    awayTitle: 'Welcome back!', awayTime: 'You were away for {t}', awaySold: 'Sales while you were away',
    awayItems: '{n} items sold', awayCapped: '(up to 8 hours of sales)', ok: 'OK',
    tMin: '{m} min', tHm: '{h} h {m} min',
    settings: 'Settings', sound: 'Sound', on: 'On', off: 'Off', language: 'Language / 言語',
    reset: 'Erase data and restart', resetAsk: 'Really erase? This cannot be undone.', yes: 'Erase', cancel: 'Cancel', close: 'Close',
    quality: 'Graphics', qAuto: 'auto-adjusting', debugAway: 'Test: pretend 1 hour away',
  },
};

export const i18n = { lang: (navigator.language || 'en').toLowerCase().startsWith('ja') ? 'ja' : 'en' };

export function setLang(l) {
  if (TEXT[l]) i18n.lang = l;
  document.documentElement.lang = i18n.lang;
  document.title = i18n.lang === 'ja' ? '焚き火から王国へ / CAMPFIRE TO KINGDOM' : 'CAMPFIRE TO KINGDOM / 焚き火から王国へ';
}

export function t(key, vars) {
  let s = TEXT[i18n.lang][key] ?? TEXT.ja[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k]);
  return s;
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  return h ? t('tHm', { h, m: m % 60 }) : t('tMin', { m: Math.max(1, m) });
}
