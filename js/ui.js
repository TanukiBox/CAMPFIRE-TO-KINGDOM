// メニュー画面：タイトル・強化・鍛冶屋・住民・章クリア・留守の売上・設定
import { t, fmtTime } from './i18n.js';
import { iconImg } from './icons.js';
import { S } from './state.js';
import { UPGRADES, TOOLS, JOBS } from './data.js';

const $ = id => document.getElementById(id);
const coinTag = n => `<span class="cost-coin">${iconImg('coin')}${n}</span>`;

export const ui = {
  open: null,
  game: null,

  init(game) {
    this.game = game;
    $('sheetModal').addEventListener('pointerdown', e => {
      if (e.target.id === 'sheetModal' && ['upgrade', 'smithy', 'hire'].includes(this.open)) this.close();
    });
    $('sheet').addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      const [act, arg] = b.dataset.act.split(':');
      if (act === 'close') this.close();
      else if (act === 'up') { game.buyUpgrade(arg); this.render(); }
      else if (act === 'tool') { game.buyTool(arg); this.render(); }
      else if (act === 'hire') { game.hire(arg); this.render(); }
      else if (act === 'keep') { this.close(); game.afterClear(); }
    });
  },

  blocking() { return !!this.open; },

  show(name, data) {
    this.open = name; this.data = data;
    $('sheetModal').hidden = false;
    $('sheet').className = 'sheet sheet-' + name;
    this.render();
  },
  close() {
    const was = this.open;
    this.open = null;
    $('sheetModal').hidden = true;
    if (was && this.game.onClose) this.game.onClose(was);
  },

  render() {
    const f = this['r_' + this.open];
    if (f) $('sheet').innerHTML = f.call(this, this.data);
  },

  r_upgrade() {
    const rows = Object.keys(UPGRADES).map(k => {
      const u = UPGRADES[k], lv = S.up[k], max = lv >= u.costs.length;
      const cur = u.values[lv], next = max ? '' : ` → <b>${u.values[lv + 1]}</b>`;
      const cost = max ? 0 : u.costs[lv];
      const btn = max ? `<button class="buy" disabled>${t('max')}</button>` : `<button class="buy" data-act="up:${k}" ${S.coins < cost ? 'disabled' : ''}>${coinTag(cost)}</button>`;
      return `<div class="row"><div class="row-ico">${iconImg({ bag: 'bag', speed: 'boot', hp: 'heart' }[k])}</div><div class="row-main"><b>${t('up_' + k)}</b><small>${t('lv', { n: lv + 1 })}　${cur}${next}</small></div>${btn}</div>`;
    }).join('');
    return `<h2>${iconImg('hammer')} ${t('upTitle')}</h2><p class="sub">${t('upDesc')}</p>${rows}<button class="close" data-act="close">${t('close')}</button>`;
  },

  r_smithy() {
    const g = this.game;
    const rows = Object.keys(TOOLS).map(k => {
      const u = TOOLS[k], lv = S.tool[k], max = lv >= u.costs.length;
      const cur = u.values[lv], next = max ? '' : ` → <b>${u.values[lv + 1]}</b>`;
      let btn = `<button class="buy" disabled>${t('max')}</button>`, costs = '';
      if (!max) {
        const c = u.costs[lv];
        let ok = S.coins >= c.coin;
        costs = Object.keys(c).filter(m => m !== 'coin').map(m => {
          const have = g.bagCount(m), enough = have >= c[m];
          if (!enough) ok = false;
          return `<span class="cost-mat${enough ? '' : ' short'}">${iconImg(m)}${have}/${c[m]}</span>`;
        }).join('');
        btn = `<button class="buy" data-act="tool:${k}" ${ok ? '' : 'disabled'}>${coinTag(c.coin)}</button>`;
      }
      return `<div class="row"><div class="row-ico">${iconImg(k)}</div><div class="row-main"><b>${t('tool_' + k)}</b><small>${t('eff_' + k)} ${t('lv', { n: lv + 1 })}　${cur}${next}</small><div class="costs">${costs}</div></div>${btn}</div>`;
    }).join('');
    return `<h2>${t('smithTitle')}</h2><p class="sub">${t('smithDesc')}</p>${rows}<button class="close" data-act="close">${t('close')}</button>`;
  },

  r_hire() {
    const g = this.game, pop = g.population(), free = g.freeWorkers();
    const rows = Object.keys(JOBS).map(k => {
      const j = JOBS[k], n = S.hired.filter(h => h === k).length;
      const built = g.buildingDone(j.needs);
      let why = '';
      if (!built) why = t('needB', { b: t('b_' + j.needs) });
      const full = j.max && n >= j.max;
      const ok = built && free > 0 && S.coins >= j.cost && !full;
      const btn = full ? `<button class="buy" disabled>${t('max')}</button>` : `<button class="buy" data-act="hire:${k}" ${ok ? '' : 'disabled'}>${coinTag(j.cost)}</button>`;
      return `<div class="row"><div class="row-ico job" style="--c:#${j.color.toString(16).padStart(6, '0')}"></div><div class="row-main"><b>${t('job_' + k)} <span class="cnt">${n ? t('hiredN', { n }) : ''}</span></b><small>${why || t('jd_' + k)}</small></div>${btn}</div>`;
    }).join('');
    const note = free <= 0 ? `<p class="warn">${t('noFree')}</p>` : '';
    return `<h2>${iconImg('people')} ${t('hireTitle')}</h2><p class="sub">${t('hireInfo', { p: pop, w: S.hired.length, f: free })}</p>${note}${rows}<button class="close" data-act="close">${t('close')}</button>`;
  },

  r_clear(d) {
    return `<div class="clear-burst">🎉</div><h2 class="big">${t('clearTitle_' + d.n)}</h2><p class="sub">${t('clearSub_' + d.n)}</p>
      <div class="stats">
        <div><small>${t('statRank')}</small><b>${iconImg('crown')}${d.rank}</b></div>
        <div><small>${t('statPop')}</small><b>${iconImg('people')}${d.pop}</b></div>
        <div><small>${t('statTime')}</small><b>${fmtTime(d.time)}</b></div>
      </div>
      <a class="share-x" href="${d.shareUrl}" target="_blank" rel="noopener">𝕏 ${t('share')}</a>
      ${d.next ? '' : `<p class="sub small">${t('nextSoon_' + d.n)}</p>`}
      <button class="close" data-act="keep">${d.next ? t('toChapter', { n: d.n + 1 }) : t('keepPlaying')}</button>`;
  },

  r_away(d) {
    return `<h2>${t('awayTitle')}</h2><p class="sub">${t('awayTime', { t: fmtTime(d.sec) })}</p>
      <div class="away-box"><small>${t('awaySold')}</small><b>${iconImg('coin')}+${d.money.toLocaleString()}</b><span>${t('awayItems', { n: d.sold })}</span></div>
      ${d.capped ? `<p class="sub small">${t('awayCapped')}</p>` : ''}
      <button class="close" data-act="close">${t('ok')}</button>`;
  },

  // ---- タイトル ----
  showTitle(hasSave, debug, onStart, last = 1) {
    this.open = 'title';
    const el = $('title');
    el.hidden = false;
    $('titleLogo').textContent = t('title');
    $('titleSub').textContent = t('subtitle');
    $('btnStart').textContent = hasSave ? t('cont') : t('start');
    $('btnStart').onclick = () => { el.hidden = true; this.open = null; onStart(null); };
    const box = $('debugBox');
    box.hidden = !debug;
    if (debug) {
      box.innerHTML = `<p>${t('debugTitle')}</p><div class="seg">` + [1, 2, 3, 4].map(n => `<button type="button" data-ch="${n}" ${n > last ? 'disabled' : ''}>${t('chN', { n })}</button>`).join('') + '</div>';
      box.querySelectorAll('button[data-ch]').forEach(b => b.onclick = () => { el.hidden = true; this.open = null; onStart(+b.dataset.ch); });
    }
  },
};
