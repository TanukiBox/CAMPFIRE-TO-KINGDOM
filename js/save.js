// 自動セーブ（localStorage）。?debug=1 のときは別の場所に保存して、本物のセーブを汚さない
const KEYS = { main: 'campfire-to-kingdom-save-v1', debug: 'campfire-to-kingdom-debug-v1' };

export function loadSave(slot = 'main') {
  try { return JSON.parse(localStorage.getItem(KEYS[slot])) || null; } catch (e) { return null; }
}
export function writeSave(data, slot = 'main') {
  try { localStorage.setItem(KEYS[slot], JSON.stringify(data)); } catch (e) { /* 保存できない環境 */ }
}
export function eraseSave(keepSettings, slot = 'main') {
  try {
    localStorage.removeItem(KEYS[slot]);
    if (keepSettings) localStorage.setItem(KEYS[slot], JSON.stringify({ settings: keepSettings }));
  } catch (e) { /* 保存できない環境 */ }
}
