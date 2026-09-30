// メニュー画面：タイトル・強化・鍛冶屋・住民・章クリア・留守の売上・設定
import { t, fmtTime } from './i18n.js';
import { iconImg } from './icons.js';
import { S, stat, weaponOf, armorOf, weaponInst, baseOf, wPower, fxOf } from './state.js';
import { UPGRADES, TOOLS, JOBS, FACILITY, JOB_UP, STORAGE, WEAPONS, ARMORS, ENEMY_TYPES, MATERIALS, DISHES, CHAPTERS, LEVEL, RARITY, ALCHEMY, CHEST } from './data.js';

const $ = id => document.getElementById(id);
const coinTag = n => `<span class="cost-coin">${iconImg('coin')}${n}</span>`;
// 武器1本の表示（名前・レア度・攻撃・効果）
const game_alcCost = (g, w) => g.alchemyCost(w);
const wAtk = w => Math.round(baseOf(w).atk * (1 + w.p * ALCHEMY.plusAtk) * (1 + fxOf(w, 'atk') / 100) * 10) / 10;
const wName = w => `<span style="color:${RARITY[w.r].color}">${t('w_' + w.b)}${w.p ? ` +${w.p}` : ''}</span>`;
const wInfo = w => `${w.r ? `<span class="rar" style="background:${RARITY[w.r].color}">${t('rar_' + RARITY[w.r].id)}</span>` : ''}${t('atk')} ${wAtk(w)}${w.fx.length ? '　' + w.fx.map(([k, v]) => t('fx_' + k, { v })).join('・') : ''}`;

export const ui = {
  open: null,
  game: null,

  init(game) {
    this.game = game;
    $('sheetModal').addEventListener('pointerdown', e => {
      if (e.target.id === 'sheetModal' && ['upgrade', 'smithy', 'hire', 'book', 'store', 'bag', 'adv'].includes(this.open)) this.close();
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
      else if (act === 'dis') { game.dismantle(arg); this.render(); }
      else if (act === 'alc') { const [u, f] = arg.split('.'); game.alchemy(u, f); this.render(); }
      else if (act === 'buyc') { game.buyChest(arg); this.render(); }
      else if (act === 'openc') { const res = game.openChest(arg); this.data = { ...(this.data || {}), result: res }; this.render(); }
      else if (act === 'tower') game.towerEnter(+arg);
      else if (act === 'tnext') game.towerNext();
      else if (act === 'tleave') game.towerLeave();
      else if (act === 'drop') { const [k, n] = arg.split('.'); game.discard(k, n === 'all' ? Infinity : +n); this.render(); }
      else if (act === 'sell') { const [k, n] = arg.split('.'); game.sellStorage(k, n === 'all' ? Infinity : +n); this.render(); }
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
    const x = ['upgrade', 'smithy', 'hire', 'book', 'store', 'bag', 'adv'].includes(this.open) ? `<button class="x-close" data-act="close" aria-label="${t('close')}">×</button>` : '';
    if (f) $('sheet').innerHTML = x + f.call(this, this.data);
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
        if (f.storage) {
          const max = f.lv >= STORAGE.costs.length;
          const eff = `${t('facCap')} ${STORAGE.cap[f.lv]}${max ? '' : ` → <b>${STORAGE.cap[f.lv + 1]}</b>`}　<small>(${t('nowIn', { n: f.used })})</small>`;
          let btn = `<button class="buy" disabled>${t('max')}</button>`, mats = '';
          if (!max) { const cv = this.costView(STORAGE.costs[f.lv]); mats = cv.mats; btn = `<button class="buy" data-act="fac:storage" ${cv.ok ? '' : 'disabled'}>${coinTag(STORAGE.costs[f.lv].coin)}</button>`; }
          return `<div class="row"><div class="row-ico">${iconImg('box')}</div><div class="row-main"><b>${f.name} <span class="cnt">${t('lv', { n: f.lv + 1 })}</span></b><small>${eff}</small><div class="costs">${mats}</div></div>${btn}</div>`;
        }
        const max = f.lv >= FACILITY.costs.length;
        const cap = n => Math.round(n * FACILITY.cap[f.lv]), capN = n => Math.round(n * FACILITY.cap[f.lv + 1]);
        const eff = `${t('facCap')} ${cap(f.cap)}${max ? '' : ` → <b>${capN(f.cap)}</b>`}　${t('facSpeed')} ×${FACILITY.speed[f.lv]}${max ? '' : ` → <b>×${FACILITY.speed[f.lv + 1]}</b>`}`;
        let btn = `<button class="buy" disabled>${t('max')}</button>`, mats = '';
        if (!max) { const cv = this.costView(FACILITY.costs[f.lv]); mats = cv.mats; btn = `<button class="buy" data-act="fac:${f.id}" ${cv.ok ? '' : 'disabled'}>${coinTag(FACILITY.costs[f.lv].coin)}</button>`; }
        return `<div class="row"><div class="row-ico">${iconImg(f.icon)}</div><div class="row-main"><b>${f.name} <span class="cnt">${t('lv', { n: f.lv + 1 })}</span></b><small>${eff}</small><div class="costs">${mats}</div></div>${btn}</div>`;
      }).join('') : `<p class="sub">${t('facNone')}</p>`;
      return `<h2>${iconImg('hammer')} ${t('upTitle')}</h2>${tabs}<p class="sub">${t('facDesc')}</p>${rows}`;
    }
    const rows = Object.keys(UPGRADES).map(k => {
      const u = UPGRADES[k], lv = S.up[k], max = lv >= u.costs.length;
      const cur = u.values[lv], next = max ? '' : ` → <b>${u.values[lv + 1]}</b>`;
      const cost = max ? 0 : u.costs[lv];
      const btn = max ? `<button class="buy" disabled>${t('max')}</button>` : `<button class="buy" data-act="up:${k}" ${S.coins < cost ? 'disabled' : ''}>${coinTag(cost)}</button>`;
      return `<div class="row"><div class="row-ico">${iconImg({ bag: 'bag', speed: 'boot', hp: 'heart' }[k])}</div><div class="row-main"><b>${t('up_' + k)}</b><small>${t('lv', { n: lv + 1 })}　${cur}${next}</small></div>${btn}</div>`;
    }).join('');
    return `<h2>${iconImg('hammer')} ${t('upTitle')}</h2>${tabs}<p class="sub">${t('upDesc')}</p>${rows}`;
  },

  // 鍛冶屋：武器・防具を作る、道具を強くする
  r_smithy(d = {}) {
    const g = this.game, tab = d.tab || 'w';
    const tabs = `<div class="tabs">${['w', 'a', 'alc', 'tool'].map(k => `<button class="${tab === k ? 'on' : ''}" data-act="tab:${k}">${t('smTab_' + k)}</button>`).join('')}</div>`;
    const me = `<p class="book-sum">${t('lvShort', { n: S.level })}　⚔ ${stat.dmg()}　🛡 ${stat.def()}　❤ ${stat.maxHp()}</p>`;
    if (tab === 'w') {
      const cur = weaponInst();
      const owned = [...S.weapons].sort((a, b) => wPower(b) - wPower(a)).map(w => {
        const on = w.u === cur.u;
        const btns = on ? `<button class="buy eq" disabled>${t('equipped')}</button>` : `<button class="buy eq" data-act="equip:w.${w.u}">${t('equip')}</button><button class="buy sell drop" data-act="dis:${w.u}">${t('dismantle')}</button>`;
        return `<div class="row${on ? ' on' : ''}"><div class="row-ico">${iconImg('w_' + w.b)}</div><div class="row-main"><b>${wName(w)}</b><small class="stat">${wInfo(w)}</small></div><div class="btns">${btns}</div></div>`;
      }).join('');
      const make = WEAPONS.filter(it => it.cost).map(it => {
        const cv = this.costView(it.cost);
        return `<div class="row"><div class="row-ico">${iconImg('w_' + it.id)}</div><div class="row-main"><b>${t('w_' + it.id)}</b><small class="stat">${t('atk')} ${it.atk}</small><div class="costs">${cv.mats}</div></div><button class="buy" data-act="craft:w.${it.id}" ${cv.ok ? '' : 'disabled'}>${coinTag(it.cost.coin)}</button></div>`;
      }).join('');
      return `<h2>${t('smithTitle')}</h2>${tabs}${me}<h3 class="sec">${t('owned')}</h3>${owned}<h3 class="sec">${t('makeNew')}</h3><p class="sub">${t('smithDesc_w')}</p>${make}`;
    }
    if (tab === 'alc') {
      // 同じ武器が2本以上あるものだけ錬金できる
      const groups = {};
      for (const w of S.weapons) (groups[w.b] = groups[w.b] || []).push(w);
      const cur = weaponInst();
      const blocks = Object.values(groups).filter(g => g.length >= 2).map(g => {
        const target = g.includes(cur) ? cur : [...g].sort((a, b) => b.p - a.p || wPower(b) - wPower(a))[0];
        const head = `<div class="row on"><div class="row-ico">${iconImg('w_' + target.b)}</div><div class="row-main"><small>${t('alcTarget')}</small><b>${wName(target)}</b><small class="stat">${wInfo(target)}</small></div></div>`;
        if (target.p >= ALCHEMY.maxPlus) return head + `<p class="sub">${t('maxPlus')}</p>`;
        const c = game_alcCost(this.game, target);
        const ok = S.coins >= c.coin && this.game.bagCount('star') >= c.star;
        const rows = g.filter(f => f !== target && f.u !== cur.u).map(f => `<div class="row"><div class="row-ico">${iconImg('w_' + f.b)}</div><div class="row-main"><b>${wName(f)}</b><small class="stat">${wInfo(f)}</small><div class="costs"><span class="cost-mat${this.game.bagCount('star') >= c.star ? '' : ' short'}">${iconImg('star')}${this.game.bagCount('star')}/${c.star}</span></div></div><button class="buy" data-act="alc:${target.u}.${f.u}" ${ok ? '' : 'disabled'}>${t('alcDo')} ${coinTag(c.coin)}</button></div>`).join('');
        return head + rows;
      }).join('<hr class="sep">');
      return `<h2>${t('smithTitle')}</h2>${tabs}${me}<p class="sub">${t('smithDesc_alc')}</p>${blocks || `<p class="sub">${t('alcNone')}</p>`}`;
    }
    if (tab === 'a') {
      const list = ARMORS, cur = armorOf();
      const rows = list.map(it => {
        const key = tab === 'w' ? it.id : 'a_' + it.id, have = !it.cost || S.gear[key], on = it === cur;
        const eff = tab === 'w' ? `${t('atk')} ${it.atk}` : `${t('def')} ${it.def}　❤+${it.hp}`;
        let btn, mats = '';
        if (on) btn = `<button class="buy eq" disabled>${t('equipped')}</button>`;
        else if (have) btn = `<button class="buy eq" data-act="equip:${tab}.${it.id}">${t('equip')}</button>`;
        else { const cv = this.costView(it.cost); mats = cv.mats; btn = `<button class="buy" data-act="craft:${tab}.${it.id}" ${cv.ok ? '' : 'disabled'}>${coinTag(it.cost.coin)}</button>`; }
        return `<div class="row${on ? ' on' : ''}"><div class="row-ico">${iconImg((tab === 'w' ? 'w_' : 'a_') + it.id)}</div><div class="row-main"><b>${t((tab === 'w' ? 'w_' : 'a_') + it.id)}</b><small class="stat">${eff}</small><div class="costs">${mats}</div></div>${btn}</div>`;
      }).join('');
      return `<h2>${t('smithTitle')}</h2>${tabs}${me}<p class="sub">${t('smithDesc_' + tab)}</p>${rows}`;
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
    return `<h2>${t('smithTitle')}</h2>${tabs}<p class="sub">${t('smithDesc')}</p>${rows}`;
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
    return `<h2>${iconImg('people')} ${t('hireTitle')}</h2><p class="sub">${t('hireInfo', { p: pop, w: S.hired.length, f: free })}<br>${t('jobUpDesc')}</p>${note}${rows}`;
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
    return `<h2>${iconImg('book')} ${t('bookTitle')}</h2>${tabs}<p class="book-sum">${t('bkFound', { n: found, m: keys.length })}</p><div class="book-grid">${cards}</div>`;
  },

  r_adv(d = {}) {
    const g = this.game, tab = d.tab || 'chest';
    const tabs = `<div class="tabs">${['chest', 'tower'].map(k => `<button class="${tab === k ? 'on' : ''}" data-act="tab:${k}">${t('advTab_' + k)}</button>`).join('')}</div>`;
    if (tab === 'tower') {
      const best = S.tower.best || 0, from = g.towerStart();
      const body = g.towerOpen()
        ? `<p class="book-sum">${t('towerBest', { n: best })}</p><p class="sub">${t('towerDesc')}</p><button class="close" data-act="tower:1">${t('towerFrom', { n: 1 })}</button>${from > 1 ? `<button class="close alt" data-act="tower:${from}">${t('towerFrom', { n: from })}</button>` : ''}`
        : `<p class="sub">${t('towerLocked')}</p>`;
      return `<h2>${iconImg('tower')} ${t('advTitle')}</h2>${tabs}${body}`;
    }
    const r = d.result;
    let res = '';
    if (r) {
      if (r.type === 'coins') res = `<div class="chest-res"><div class="big-ico">${iconImg('coin')}</div><b>${t('resCoins', { n: r.n })}</b></div>`;
      else if (r.type === 'mat') res = `<div class="chest-res"><div class="big-ico">${iconImg(r.k)}</div><b>${t('resMat', { x: t('m_' + r.k), n: r.n })}</b></div>`;
      else {
        const w = S.weapons.find(x => x.u === r.u);
        if (w) res = `<div class="chest-res r${w.r}" style="--rc:${RARITY[w.r].color}"><small>${t('resWeapon')}</small><div class="big-ico">${iconImg('w_' + w.b)}</div><b>${wName(w)}</b><small class="stat">${wInfo(w)}</small>${w.u !== S.wu ? `<button class="buy eq" data-act="equip:w.${w.u}">${t('equip')}${r.better ? ' ⬆' : ''}</button>` : `<small>${t('equipped')}</small>`}</div>`;
      }
    }
    const stars = g.bagCount('star'), price = g.chestPrice();
    const row = (k, ico) => `<div class="row"><div class="row-ico">${iconImg(ico)}</div><div class="row-main"><b>${t(k === 'star' ? 'chestStar' : 'chestN')} <span class="cnt">×${S.chest[k]}</span></b><small>${k === 'star' ? t('starHave', { n: stars }) : t('chestDesc')}</small></div><div class="btns"><button class="buy" data-act="openc:${k}" ${S.chest[k] > 0 ? '' : 'disabled'}>${t('open')}</button>${k === 'star' ? `<button class="buy up" data-act="buyc:star" ${stars >= CHEST.starPrice ? '' : 'disabled'}>${iconImg('star')}${CHEST.starPrice}</button>` : `<button class="buy up" data-act="buyc:normal" ${S.coins >= price ? '' : 'disabled'}>${coinTag(price)}</button>`}</div></div>`;
    return `<h2>${iconImg('chest')} ${t('advTitle')}</h2>${tabs}${res}${row('normal', 'chest')}${row('star', 'starchest')}`;
  },

  // 塔の階をクリアしたとき
  r_tclear(d) {
    return `<div class="clear-burst">🗼</div><h2 class="big">${t('towerClear', { n: d.n })}</h2>
      <div class="stats"><div><small>${t('coin')}</small><b>${iconImg('coin')}${d.coins}</b></div><div><small>EXP</small><b>${d.xp}</b></div><div><small>${t('m_star')}</small><b>${iconImg('star')}${d.stars}</b></div></div>
      ${d.chest ? `<p class="book-sum">${iconImg('starchest')} ${t('chestStar')} +${d.chest}</p>` : ''}
      <button class="close" data-act="tnext">${t('towerNext', { n: d.n + 1 })}</button><button class="close alt" data-act="tleave">${t('towerLeave')}</button>`;
  },

  // 背中の荷物：選んで捨てる
  r_bag() {
    const g = this.game, list = g.bagList(), need = g.neededKinds(), total = list.reduce((a, [, n]) => a + n, 0);
    const rows = list.length ? list.map(([k, n]) => {
      const b = (m, label) => `<button class="buy sell drop" data-act="drop:${k}.${m}" ${m !== 'all' && n < m ? 'disabled' : ''}>${label}</button>`;
      return `<div class="row"><div class="row-ico">${iconImg(k)}</div><div class="row-main"><b>${t('m_' + k)} <span class="cnt">×${n}</span></b>${need.has(k) ? `<small class="need">${t('bagNeed')}</small>` : ''}</div><div class="sell-btns">${b(1, t('sellN', { n: 1 }))}${b(10, t('sellN', { n: 10 }))}${b('all', t('sellAll'))}</div></div>`;
    }).join('') : `<p class="sub">${t('bagEmpty')}</p>`;
    return `<h2>${iconImg('bag')} ${t('bagTitle')}</h2><p class="book-sum">${total} / ${g.bagCap()}</p><p class="sub">${t('bagDesc')}</p>${rows}`;
  },

  // 倉庫：中身を選んで売る
  r_store() {
    const g = this.game, kinds = Object.keys(S.storage).filter(k => S.storage[k] > 0);
    const rows = kinds.length ? kinds.map(k => {
      const n = S.storage[k], p = g.sellPrice(k);
      const b = (m, label) => `<button class="buy sell" data-act="sell:${k}.${m}" ${m !== 'all' && n < m ? 'disabled' : ''}>${label}</button>`;
      return `<div class="row"><div class="row-ico">${iconImg(k)}</div><div class="row-main"><b>${t('m_' + k)} <span class="cnt">×${n}</span></b><small>${t('unitPrice')} ${coinTag(p)}</small></div><div class="sell-btns">${b(1, t('sellN', { n: 1 }))}${b(10, t('sellN', { n: 10 }))}${b('all', `${t('sellAll')}<small>${coinTag(n * p)}</small>`)}</div></div>`;
    }).join('') : `<p class="sub">${t('storeEmpty')}</p>`;
    return `<h2>${iconImg('box')} ${t('storeTitle')}</h2><p class="book-sum">${g.storageTotal()} / ${g.storageCap()}</p><p class="sub">${t('storeDesc')}</p>${rows}`;
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
