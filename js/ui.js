// メニュー画面：タイトル・強化・鍛冶屋・住民・章クリア・留守の売上・設定
import { t, fmtTime } from './i18n.js';
import { iconImg } from './icons.js';
import { S, stat, weaponOf, armorOf } from './state.js';
import { UPGRADES, TOOLS, JOBS, FACILITY, JOB_UP, WEAPONS, ARMORS, ENEMY_TYPES, MATERIALS, DISHES, CHAPTERS, LEVEL } from './data.js';

const $ = id => document.getElementById(id);
const coinTag = n => `<span class="cost-coin">${iconImg('coin')}${n}</span>`;

export const ui = {
  open: null,
  game: null,

  init(game) {
    this.game = game;
    $('sheetModal').addEventListener('pointerdown', e => {
      if (e.target.id === 'sheetModal' && ['upgrade', 'smithy', 'hire', 'book'].includes(this.open)) this.close();
    });
    $('sheet').addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      const [act, arg] = b.dataset.act.split(':');
      if (act === 'close') this.close();
      else if (act === 'up') { game.buyUpgrade(arg); this.render(); }
      else if (act === 'tool') { game.buyTool(arg); this.render(); }
      else if (act === 'hire') { game.hire(arg); this.render(); }
      else if (act === 'tab') { this.data = { ...(this.data || {}), tab: arg }; this.render(); }
      else if (act === 'fac') { game.buyFacility(arg); this.render(); }
      else if (act === 'jobup') { game.buyJob(arg); this.render(); }
      else if (act === 'craft') { const [k, id] = arg.split('.'); game.craft(k, id); this.render(); }
      else if (act === 'equip') { const [k, id] = arg.split('.'); game.equip(k, id); this.render(); }
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

  // 素材とコインの値段の表示。買えるかどうかも返す
  costView(c) {
    const g = this.game;
    let ok = S.coins >= (c.coin || 0);
    const mats = Object.keys(c).filter(m => m !== 'coin').map(m => {
      const have = g.bagCount(m), enough = have >= c[m];
      if (!enough) ok = false;
      return `<span class="cost-mat${enough ? '' : ' short'}">${iconImg(m)}${have}/${c[m]}</span>`;
    }).join('');
    return { ok, mats };
  },

  r_upgrade(d = {}) {
    const tab = d.tab || 'self';
    const tabs = `<div class="tabs"><button class="${tab === 'self' ? 'on' : ''}" data-act="tab:self">${t('tabSelf')}</button><button class="${tab === 'fac' ? 'on' : ''}" data-act="tab:fac">${t('tabFac')}</button></div>`;
    if (tab === 'fac') {
      const list = this.game.facilities();
      const rows = list.length ? list.map(f => {
        const max = f.lv >= FACILITY.costs.length;
        const cap = n => Math.round(n * FACILITY.cap[f.lv]), capN = n => Math.round(n * FACILITY.cap[f.lv + 1]);
        const eff = `${t('facCap')} ${cap(f.cap)}${max ? '' : ` → <b>${capN(f.cap)}</b>`}　${t('facSpeed')} ×${FACILITY.speed[f.lv]}${max ? '' : ` → <b>×${FACILITY.speed[f.lv + 1]}</b>`}`;
        let btn = `<button class="buy" disabled>${t('max')}</button>`, mats = '';
        if (!max) { const cv = this.costView(FACILITY.costs[f.lv]); mats = cv.mats; btn = `<button class="buy" data-act="fac:${f.id}" ${cv.ok ? '' : 'disabled'}>${coinTag(FACILITY.costs[f.lv].coin)}</button>`; }
        return `<div class="row"><div class="row-ico">${iconImg(f.icon)}</div><div class="row-main"><b>${f.name} <span class="cnt">${t('lv', { n: f.lv + 1 })}</span></b><small>${eff}</small><div class="costs">${mats}</div></div>${btn}</div>`;
      }).join('') : `<p class="sub">${t('facNone')}</p>`;
      return `<h2>${iconImg('hammer')} ${t('upTitle')}</h2>${tabs}<p class="sub">${t('facDesc')}</p>${rows}<button class="close" data-act="close">${t('close')}</button>`;
    }
    const rows = Object.keys(UPGRADES).map(k => {
      const u = UPGRADES[k], lv = S.up[k], max = lv >= u.costs.length;
      const cur = u.values[lv], next = max ? '' : ` → <b>${u.values[lv + 1]}</b>`;
      const cost = max ? 0 : u.costs[lv];
      const btn = max ? `<button class="buy" disabled>${t('max')}</button>` : `<button class="buy" data-act="up:${k}" ${S.coins < cost ? 'disabled' : ''}>${coinTag(cost)}</button>`;
      return `<div class="row"><div class="row-ico">${iconImg({ bag: 'bag', speed: 'boot', hp: 'heart' }[k])}</div><div class="row-main"><b>${t('up_' + k)}</b><small>${t('lv', { n: lv + 1 })}　${cur}${next}</small></div>${btn}</div>`;
    }).join('');
    return `<h2>${iconImg('hammer')} ${t('upTitle')}</h2>${tabs}<p class="sub">${t('upDesc')}</p>${rows}<button class="close" data-act="close">${t('close')}</button>`;
  },

  // 鍛冶屋：武器・防具を作る、道具を強くする
  r_smithy(d = {}) {
    const g = this.game, tab = d.tab || 'w';
    const tabs = `<div class="tabs">${['w', 'a', 'tool'].map(k => `<button class="${tab === k ? 'on' : ''}" data-act="tab:${k}">${t('smTab_' + k)}</button>`).join('')}</div>`;
    const me = `<p class="book-sum">${t('lvShort', { n: S.level })}　⚔ ${stat.dmg()}　🛡 ${stat.def()}　❤ ${stat.maxHp()}</p>`;
    if (tab === 'w' || tab === 'a') {
      const list = tab === 'w' ? WEAPONS : ARMORS, cur = tab === 'w' ? weaponOf() : armorOf();
      const rows = list.map(it => {
        const key = tab === 'w' ? it.id : 'a_' + it.id, have = !it.cost || S.gear[key], on = it === cur;
        const eff = tab === 'w' ? `${t('atk')} ${it.atk}` : `${t('def')} ${it.def}　❤+${it.hp}`;
        let btn, mats = '';
        if (on) btn = `<button class="buy eq" disabled>${t('equipped')}</button>`;
        else if (have) btn = `<button class="buy eq" data-act="equip:${tab}.${it.id}">${t('equip')}</button>`;
        else { const cv = this.costView(it.cost); mats = cv.mats; btn = `<button class="buy" data-act="craft:${tab}.${it.id}" ${cv.ok ? '' : 'disabled'}>${coinTag(it.cost.coin)}</button>`; }
        return `<div class="row${on ? ' on' : ''}"><div class="row-ico">${iconImg((tab === 'w' ? 'w_' : 'a_') + it.id)}</div><div class="row-main"><b>${t((tab === 'w' ? 'w_' : 'a_') + it.id)}</b><small class="stat">${eff}</small><div class="costs">${mats}</div></div>${btn}</div>`;
      }).join('');
      return `<h2>${t('smithTitle')}</h2>${tabs}${me}<p class="sub">${t('smithDesc_' + tab)}</p>${rows}<button class="close" data-act="close">${t('close')}</button>`;
    }
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
    return `<h2>${t('smithTitle')}</h2>${tabs}<p class="sub">${t('smithDesc')}</p>${rows}<button class="close" data-act="close">${t('close')}</button>`;
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
      // 仕事の強化（雇っている仕事だけ）
      const lv = S.jobLv[k] || 0, jmax = lv >= JOB_UP.costs.length;
      const up = !n ? '' : jmax ? `<button class="buy up" disabled>${t('lv', { n: lv + 1 })} ${t('max')}</button>` : `<button class="buy up" data-act="jobup:${k}" ${S.coins >= JOB_UP.costs[lv] ? '' : 'disabled'}>⬆${t('lv', { n: lv + 2 })} ${coinTag(JOB_UP.costs[lv])}</button>`;
      return `<div class="row"><div class="row-ico job" style="--c:#${j.color.toString(16).padStart(6, '0')}"></div><div class="row-main"><b>${t('job_' + k)} <span class="cnt">${n ? t('hiredN', { n }) + '・' + t('lv', { n: lv + 1 }) : ''}</span></b><small>${why || t('jd_' + k)}</small></div><div class="btns">${btn}${up}</div></div>`;
    }).join('');
    const note = free <= 0 ? `<p class="warn">${t('noFree')}</p>` : '';
    return `<h2>${iconImg('people')} ${t('hireTitle')}</h2><p class="sub">${t('hireInfo', { p: pop, w: S.hired.length, f: free })}<br>${t('jobUpDesc')}</p>${note}${rows}<button class="close" data-act="close">${t('close')}</button>`;
  },

  // 図鑑：モンスター・素材・料理。まだ出会っていないものは影だけ
  r_book(d = {}) {
    const tab = d.tab || 'mon';
    const tabs = `<div class="tabs">${['mon', 'mat', 'dish'].map(k => `<button class="${tab === k ? 'on' : ''}" data-act="tab:${k}">${t('bkTab_' + k)}</button>`).join('')}</div>`;
    let keys, cards;
    if (tab === 'mon') {
      // 章の順に並べる
      const order = [];
      for (const c of Object.keys(CHAPTERS)) for (const z of CHAPTERS[c].spawns || []) if (!order.includes(z.type)) order.push(z.type);
      for (const k of Object.keys(ENEMY_TYPES)) if (!order.includes(k)) order.push(k);
      keys = order;
      cards = keys.map(k => {
        const n = S.book.mon[k] || 0, def = ENEMY_TYPES[k];
        if (!n) return `<div class="book-card unk">${iconImg('m_' + k + '_sil')}<b>？？？</b><small>${def.boss ? t('bkBoss') : ''}</small></div>`;
        const drops = Object.keys(def.drop).map(m => iconImg(m, 'ico mini')).join('');
        return `<div class="book-card${def.boss ? ' boss' : ''}">${iconImg('m_' + k)}<b>${t('e_' + k)}</b><small>${t('bkKills', { n })}</small><small>${drops}</small></div>`;
      }).join('');
    } else {
      keys = tab === 'mat' ? Object.keys(MATERIALS).filter(k => !MATERIALS[k].dish) : DISHES;
      const src = tab === 'mat' ? S.book.mat : S.book.dish;
      cards = keys.map(k => {
        if (!src[k]) return `<div class="book-card unk"><span style="filter:brightness(0) opacity(.25)">${iconImg(k)}</span><b>？？？</b></div>`;
        const price = MATERIALS[k].price;
        return `<div class="book-card">${iconImg(k)}<b>${t('m_' + k)}</b><small>${tab === 'dish' ? t('bkCooked', { n: src[k] }) : ''}${price ? ` ${iconImg('coin', 'ico mini')}${price}` : ''}</small></div>`;
      }).join('');
    }
    const found = keys.filter(k => (tab === 'mon' ? S.book.mon : tab === 'mat' ? S.book.mat : S.book.dish)[k]).length;
    return `<h2>${iconImg('book')} ${t('bookTitle')}</h2>${tabs}<p class="book-sum">${t('bkFound', { n: found, m: keys.length })}</p><div class="book-grid">${cards}</div><button class="close" data-act="close">${t('close')}</button>`;
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
