// 画面の表示：HP・背中の数・次にやること・お知らせ・建設マスの札・設定
import { t } from './i18n.js';
import { icon, iconImg } from './icons.js';
import { toScreen, view } from './gfx.js';

const $ = id => document.getElementById(id);
const _sp = { x: 0, y: 0, on: false };

export const hud = {
  init() {
    $('hpIco').src = icon('heart');
    $('bagIco').src = icon('bag');
    this.last = {};
  },

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
    const el = $('bagPill');
    el.classList.toggle('full', n >= cap);
    if (up) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  },

  mission(html) {
    if (this.last.mission === html) return;
    this.last.mission = html;
    const el = $('mission');
    $('missionText').innerHTML = html;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  },

  toast(html, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = html;
    $('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2200);
    setTimeout(() => el.remove(), 2700);
  },

  // 建設マスの札。画面の外なら端に矢印つきで出す
  tileLabel(site, builds, wx, wz) {
    const el = $('tileLabel');
    if (!site) { el.hidden = true; return; }
    el.hidden = false;
    const key = site.def.id + JSON.stringify(site.paid) + JSON.stringify(site.inflight) + t('title');
    if (this.last.tile !== key) {
      this.last.tile = key;
      const chips = Object.keys(site.def.cost).map(k => {
        const n = Math.max(0, builds.need(site, k));
        return `<span class="chip${n === 0 ? ' ok' : ''}">${iconImg(k)}<b>${n === 0 ? '✓' : n}</b></span>`;
      }).join('');
      el.innerHTML = `<div class="tl-name">${t('repairOf', { b: t('b_' + site.def.model) })}</div><div class="tl-chips">${chips}</div><i class="tl-arrow"></i>`;
    }
    toScreen(wx, 0.3, wz, _sp);
    const m = 56, top = 130;
    let x = _sp.x, y = _sp.y;
    const off = !_sp.on || x < m || x > view.w - m || y < top || y > view.h - 40;
    el.classList.toggle('edge', off);
    if (off) {
      const cx = view.w / 2, cy = view.h / 2;
      let dx = x - cx, dy = y - cy;
      if (_sp.behind) { dx = -dx; dy = -dy; }
      const sx = (view.w / 2 - m) / Math.abs(dx || 1e-3), sy = ((dy < 0 ? cy - top : view.h - cy - 60)) / Math.abs(dy || 1e-3);
      const s = Math.min(sx, sy);
      x = cx + dx * s; y = cy + dy * s;
      el.style.setProperty('--ang', Math.atan2(dy, dx) + 'rad');
    }
    el.style.transform = `translate(${x}px,${y}px)`;
  },

  fullBubble(show, wx, wy, wz) {
    const el = $('fullBubble');
    if (!show) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = t('full');
    toScreen(wx, wy, wz, _sp);
    el.style.transform = `translate(${_sp.x}px,${_sp.y}px)`;
  },

  moveHint(show) { $('moveHint').classList.toggle('gone', !show); },
  hurt() { const el = $('vignette'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); },
  fade(on) { $('fade').classList.toggle('on', on); },
  fps(text) { const el = $('fps'); el.hidden = !text; if (text) el.textContent = text; },

  texts() {
    $('moveHint').querySelector('span').textContent = t('moveHint');
    $('setTitle').textContent = t('settings');
    $('lblSound').textContent = t('sound');
    $('sOn').textContent = t('on'); $('sOff').textContent = t('off');
    $('lblLang').textContent = t('language');
    $('btnReset').textContent = t('reset');
    $('resetMsg').textContent = t('resetAsk');
    $('btnResetYes').textContent = t('yes'); $('btnResetNo').textContent = t('cancel');
    $('btnClose').textContent = t('close');
    this.last = {};
  },
};
