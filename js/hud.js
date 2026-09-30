// 画面の表示：HP・背中の数・コイン・王国ランク・ミッション・お知らせ・3Dの上に出す札
import { t } from './i18n.js';
import { icon } from './icons.js';
import { toScreen, view } from './gfx.js';

const $ = id => document.getElementById(id);
const _sp = { x: 0, y: 0, on: false, behind: false };
const bump = el => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

// 解放されるまで隠しておく表示
const GATED = { hpPill: 'hp', bagPill: 'bag', coinPill: 'coins', rankRow: 'rank', btnGear: 'gear', btnUpgrade: 'upgrade', btnHire: 'hire', btnBook: 'book', btnStore: 'store', btnAdv: 'adv' };

export const hud = {
  last: {},
  labels: new Map(),

  init() {
    $('hpIco').src = icon('heart');
    $('bagIco').src = icon('bag');
    $('coinIco').src = icon('coin');
    $('rankIco').src = icon('crown');
    $('popIco').src = icon('people');
    $('upIco').src = icon('hammer');
    $('hireIco').src = icon('people');
    $('bookIco').src = icon('book');
    $('storeIco').src = icon('box');
    $('advIco').src = icon('chest');
    this.shown = {};
  },

  // 解放されたものを出す（初めて出るときはポンと出る）
  gates(unlocked, animate) {
    for (const id in GATED) {
      const on = !!unlocked[GATED[id]];
      const el = $(id);
      if (on === !!this.shown[id]) continue;
      this.shown[id] = on;
      el.hidden = !on;
      if (on && animate) { el.classList.remove('pop-in'); void el.offsetWidth; el.classList.add('pop-in'); }
    }
  },
  newDot(id, on) { $(id).classList.toggle('has-new', on); },

  hp(hp, max) {
    const v = Math.ceil(hp);
    if (this.last.hp === v && this.last.max === max) return;
    this.last.hp = v; this.last.max = max;
    $('hpFill').style.width = (hp / max * 100) + '%';
    $('hpNum').textContent = v;
    $('hpPill').classList.toggle('low', hp / max <= 0.3);
  },

  bag(n, cap) {
    const k = n + '/' + cap;
    if (this.last.bag === k) return;
    const up = this.last.bagN !== undefined && n > this.last.bagN;
    this.last.bag = k; this.last.bagN = n;
    $('bagNum').textContent = k;
    $('bagPill').classList.toggle('full', n >= cap);
    if (up) bump($('bagPill'));
  },

  coins(n) {
    if (this.last.coins === n) return;
    const up = this.last.coins !== undefined && n > this.last.coins;
    this.last.coins = n;
    $('coinNum').textContent = n.toLocaleString();
    if (up) bump($('coinPill'));
  },

  // 主人公のレベルと経験値のバー
  level(lv, frac) {
    const k = lv + ':' + Math.floor(frac * 50);
    if (this.last.lv === k) return;
    this.last.lv = k;
    $('lvNum').textContent = t('lvShort', { n: lv });
    $('xpFill').style.width = Math.min(100, frac * 100) + '%';
  },
  levelBump() { bump($('lvPill')); $('lvPill').classList.remove('shine'); void $('lvPill').offsetWidth; $('lvPill').classList.add('shine'); },

  rank(rank, name, pop) {
    const k = rank + name + pop;
    if (this.last.rank === k) return;
    const up = this.last.rankN !== undefined && rank > this.last.rankN;
    this.last.rank = k; this.last.rankN = rank;
    $('rankText').textContent = `${t('rank', { n: rank })}・${name}`;
    $('popNum').textContent = pop;
    if (up) bump($('rankRow'));
  },

  mission(text, prog, reward) {
    const html = `<span class="m-text">${text}</span>` + (prog ? `<span class="m-prog">${prog.p}/${prog.n}</span>` : '') + (reward ? `<span class="m-reward"><img class="ico" src="${icon('coin')}" alt="">+${reward}</span>` : '');
    if (this.last.mission === html) return;
    this.last.mission = html;
    const el = $('mission');
    $('missionText').innerHTML = html;
    if (!this.last.missionText || this.last.missionText !== text) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    this.last.missionText = text;
  },

  toast(html, kind = '') {
    const box = $('toasts');
    while (box.children.length > 3) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = html;
    box.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2300);
    setTimeout(() => el.remove(), 2800);
  },

  bossBar(name, frac) {
    const el = $('bossBar');
    if (frac === null) { el.hidden = true; return; }
    el.hidden = false;
    $('bossName').textContent = name;
    $('bossFill').style.width = Math.max(0, frac * 100) + '%';
  },

  // ---- 3Dの上に出す札 ----
  labelsBegin() { this.used = new Set(); },
  // edge = 画面の外なら端に矢印つきで出す
  label(key, html, wx, wy, wz, cls = '', edge = false) {
    let L = this.labels.get(key);
    if (!L) {
      const el = document.createElement('div');
      el.className = 'wlabel ' + cls;
      $('labels').appendChild(el);
      L = { el, html: null };
      this.labels.set(key, L);
    }
    this.used.add(key);
    if (L.html !== html) { L.html = html; L.el.innerHTML = html + (edge ? '<i class="tl-arrow"></i>' : ''); }
    toScreen(wx, wy, wz, _sp);
    let x = _sp.x, y = _sp.y;
    const m = 56, top = 150;
    const off = !_sp.on || x < m || x > view.w - m || y < top || y > view.h - 40;
    if (off && !edge) { L.el.style.visibility = 'hidden'; return; }
    L.el.style.visibility = '';
    L.el.classList.toggle('edge', off);
    if (off) {
      const cx = view.w / 2, cy = view.h / 2;
      let dx = x - cx, dy = y - cy;
      if (_sp.behind) { dx = -dx; dy = -dy; }
      const sx = (view.w / 2 - m) / Math.abs(dx || 1e-3), sy = (dy < 0 ? cy - top : view.h - cy - 70) / Math.abs(dy || 1e-3);
      const s = Math.min(sx, sy);
      x = cx + dx * s; y = cy + dy * s;
      L.el.style.setProperty('--ang', Math.atan2(dy, dx) + 'rad');
    }
    L.el.style.transform = `translate(${x}px,${y}px)`;
  },
  labelsEnd() {
    for (const [k, L] of this.labels) if (!this.used.has(k)) { L.el.remove(); this.labels.delete(k); }
  },

  moveHint(show) { $('moveHint').classList.toggle('gone', !show); },
  hurt() { const el = $('vignette'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); },
  fade(on) { $('fade').classList.toggle('on', on); },
  fps(text) { const el = $('fps'); el.hidden = !text; if (text) el.textContent = text; },

  texts() {
    $('moveHint').querySelector('span').textContent = t('moveHint');
    $('upLbl').textContent = t('btnUpgrade');
    $('hireLbl').textContent = t('btnHire');
    $('bookLbl').textContent = t('btnBook');
    $('storeLbl').textContent = t('btnStore');
    $('advLbl').textContent = t('btnAdv');
    this.last = {};
  },
};
