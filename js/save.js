// 自動セーブ（localStorage）
const KEY = 'campfire-to-kingdom-save-v1';

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
}
export function writeSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 保存できない環境 */ }
}
export function eraseSave(keepSettings) {
  try {
    localStorage.removeItem(KEY);
    if (keepSettings) localStorage.setItem(KEY, JSON.stringify({ settings: keepSettings }));
  } catch (e) { /* 保存できない環境 */ }
}
