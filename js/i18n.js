// 日本語・英語（ブラウザの言語で自動。設定で切り替えも可）
const TEXT = {
  ja: {
    title: '焚き火から王国へ',
    moveHint: '画面のどこでも ドラッグで移動',
    full: '満杯！',
    m_chop: '木に近づいて 木材を集めよう',
    m_carry: '建設マスの上に立って 素材を入れよう',
    m_need: '{b}の修理に {list}',
    m_left: 'あと{n}',
    m_done: 'ここまで完成！ つづきは次の区切りで',
    repairOf: '{b}を修理',
    fell: '倒れてしまった…',
    dropped: '素材を{n}個 落とした',
    droppedNone: '焚き火で目がさめた',
    repaired: '{b}を修理した！',
    newTile: '新しい建設マスが現れた！',
    settings: '設定', sound: '効果音', on: 'オン', off: 'オフ', language: '言語 / Language',
    reset: 'データを消して最初から', resetAsk: '本当に消しますか？ 元に戻せません。', yes: '消す', cancel: 'やめる', close: '閉じる',
    quality: '画質', qAuto: '自動調整中',
    b_house: '家', b_sawmill: '製材所', b_stonework: '石工場', b_shop: 'お店', b_smithy: '鍛冶屋',
    m_wood: '木材', m_stone: '石', m_jelly: 'スライムゼリー',
  },
  en: {
    title: 'Campfire to Kingdom',
    moveHint: 'Drag anywhere to move',
    full: 'Full!',
    m_chop: 'Walk up to a tree to gather wood',
    m_carry: 'Stand on the build tile to drop in materials',
    m_need: '{b} repair needs {list}',
    m_left: '{n} more',
    m_done: 'All done for now! More in the next update',
    repairOf: 'Repair {b}',
    fell: 'You fainted…',
    dropped: 'Dropped {n} materials',
    droppedNone: 'You woke up by the campfire',
    repaired: '{b} repaired!',
    newTile: 'A new build tile appeared!',
    settings: 'Settings', sound: 'Sound', on: 'On', off: 'Off', language: 'Language / 言語',
    reset: 'Erase data and restart', resetAsk: 'Really erase? This cannot be undone.', yes: 'Erase', cancel: 'Cancel', close: 'Close',
    quality: 'Graphics', qAuto: 'auto-adjusting',
    b_house: 'House', b_sawmill: 'Sawmill', b_stonework: 'Stoneworks', b_shop: 'Shop', b_smithy: 'Smithy',
    m_wood: 'Wood', m_stone: 'Stone', m_jelly: 'Slime Jelly',
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
