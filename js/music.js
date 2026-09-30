// BGM：のんびりしたファンタジー風の曲をコードで作って鳴らす（ハープ・笛・やわらかい和音・ベース）
// 曲ごとに「速さ・調・和音の進み方・楽器の使い方」を決め、メロディは決まった種から毎回同じものを作る
import { onAudioReady, noiseBuffer } from './audio.js';

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
const ROMAN = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
const hz = n => 440 * Math.pow(2, (n - 69) / 12);

export const TRACKS = {
  title:  { bpm: 72,  root: 65, scale: MAJOR, prog: ['I', 'V', 'vi', 'IV'], seed: 3, harp: 'arp', flute: 0.8, bass: 'half', pad: 1, perc: 0 },
  ch1:    { bpm: 84,  root: 65, scale: MAJOR, prog: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'ii', 'V'], seed: 11, harp: 'arp', flute: 1, bass: 'half', pad: 1, perc: 0 },
  ch2:    { bpm: 96,  root: 67, scale: MAJOR, prog: ['I', 'IV', 'V', 'vi', 'I', 'IV', 'ii', 'V'], seed: 21, harp: 'strum', flute: 1, bass: 'walk', pad: 0.9, perc: 1 },
  ch3:    { bpm: 100, root: 62, scale: MAJOR, prog: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], seed: 31, harp: 'arp', flute: 1, bass: 'march', pad: 1, perc: 1 },
  ch4:    { bpm: 80,  root: 70, scale: MAJOR, prog: ['I', 'IV', 'vi', 'V', 'I', 'IV', 'V', 'I'], seed: 41, harp: 'arp', flute: 1, bass: 'half', pad: 1.2, perc: 0, horn: true },
  boss:   { bpm: 132, root: 62, scale: MINOR, prog: ['i', 'VI', 'VII', 'i', 'i', 'iv', 'v', 'i'], seed: 51, harp: 'ostinato', flute: 0.7, bass: 'drive', pad: 0.8, perc: 2 },
  ending: { bpm: 70,  root: 60, scale: MAJOR, prog: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], seed: 61, harp: 'arp', flute: 1, bass: 'half', pad: 1.3, perc: 0, horn: true },
};

function rnd(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// 音階の段（0=主音）→ 音の高さ
function note(tr, step, oct = 0) {
  const s = tr.scale, o = Math.floor(step / 7), i = ((step % 7) + 7) % 7;
  return tr.root + s[i] + 12 * (o + oct);
}
function chordOf(tr, bar) {
  const r = tr.prog[bar % tr.prog.length];
  return ROMAN[r.toUpperCase()];
}

// メロディを作る：8小節（A A' B A''）。強い拍は和音の音に寄せる
function makeMelody(tr) {
  const r = rnd(tr.seed);
  const RHYTHMS = [[1, 0, 1, 0, 1, 1, 1, 0], [1, 0, 0, 0, 1, 0, 1, 0], [1, 1, 1, 0, 1, 0, 0, 0], [1, 0, 1, 1, 1, 0, 0, 0], [1, 0, 0, 1, 1, 0, 1, 0], [1, 0, 0, 0, 0, 0, 0, 0]];
  const bars = [];
  let pitch = 7;
  const make = (bar, last) => {
    const rh = last ? [1, 0, 0, 0, 0, 0, 0, 0] : RHYTHMS[(r() * (RHYTHMS.length - 1)) | 0];
    const c = chordOf(tr, bar), tones = [c, c + 2, c + 4, c + 7, c + 9];
    const notes = [];
    for (let i = 0; i < 8; i++) {
      if (!rh[i]) { notes.push(null); continue; }
      pitch += Math.round((r() - 0.5) * 3.2);
      pitch = Math.max(4, Math.min(13, pitch));
      if (i % 4 === 0 || last) {
        let best = tones[0], bd = 99;
        for (const tn of tones) for (const o of [0, 7]) { const d = Math.abs(tn + o - pitch); if (d < bd) { bd = d; best = tn + o; } }
        pitch = last ? (c + 7 <= 13 ? c + 7 : c) : best;
      }
      notes.push(pitch);
    }
    return notes;
  };
  // くり返すときは、強い拍の音だけ その小節の和音に合わせ直す
  const resnap = (notes, bar) => {
    const c = chordOf(tr, bar), tones = [c, c + 2, c + 4, c + 7, c + 9];
    return notes.map((n, i) => {
      if (n === null || i % 4 !== 0) return n;
      let best = n, bd = 99;
      for (const tn of tones) { const d = Math.abs(tn - n); if (d < bd) { bd = d; best = tn; } }
      return best;
    });
  };
  const A = [make(0), make(1)], B = [make(4), make(5)];
  bars.push(A[0], A[1], resnap(A[0], 2), make(3), B[0], B[1], resnap(A[0], 6), make(7, true));
  // 各音の長さ（次の音まで）
  const flat = bars.flat(), out = [];
  for (let i = 0; i < flat.length; i++) {
    if (flat[i] === null) { out.push(null); continue; }
    let len = 1; while (i + len < flat.length && flat[i + len] === null && len < 4) len++;
    out.push({ step: flat[i], len });
  }
  return out;
}

let ac = null, bus = null, timer = null, want = null, enabled = true;
const players = [];
const VOL = 0.55;

export function initMusic() {
  onAudioReady(a => {
    ac = a;
    bus = ac.createGain();
    bus.gain.value = enabled ? VOL : 0;
    bus.connect(ac.destination);
    if (!timer) timer = setInterval(tick, 60);
    if (want) { const w = want; want = null; play(w); }
  });
}
export function setMusic(on) {
  enabled = !!on;
  if (bus) bus.gain.setTargetAtTime(enabled ? VOL : 0, ac.currentTime, 0.3);
}
export function currentTrack() { const p = players[players.length - 1]; return p ? p.name : want; }

// 曲を切り替える（前の曲はゆっくり消える）
export function play(name) {
  if (!TRACKS[name]) return;
  if (!ac) { want = name; return; }
  const top = players[players.length - 1];
  if (top && top.name === name && !top.stopAt) return;
  const now = ac.currentTime;
  for (const p of players) if (!p.stopAt) { p.gain.gain.cancelScheduledValues(now); p.gain.gain.setTargetAtTime(0, now, 0.5); p.stopAt = now + 2.5; }
  const tr = TRACKS[name];
  if (!tr.melody) tr.melody = makeMelody(tr);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.setTargetAtTime(1, now + 0.3, 0.6);
  g.connect(bus);
  players.push({ name, tr, gain: g, step: 0, next: now + 0.35, stopAt: 0 });
}

function tick() {
  if (!ac || ac.state !== 'running') return;
  const now = ac.currentTime;
  for (let i = players.length - 1; i >= 0; i--) {
    const p = players[i];
    if (p.stopAt && now > p.stopAt) { p.gain.disconnect(); players.splice(i, 1); continue; }
    const eighth = 30 / p.tr.bpm;
    // 画面が止まっていた後は追いつかせない
    if (p.next < now - 0.5) p.next = now + 0.05;
    while (p.next < now + 0.3) { schedule(p, p.step, p.next, eighth); p.step++; p.next += eighth; }
  }
}

// ---- 楽器 ----
function voice(out, type, f, t, a, d, v, { detune = 0, filter = 0, sustain = 0, rel = 0.2, vib = 0 } = {}) {
  const o = ac.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  let node = o;
  if (vib) {
    const l = ac.createOscillator(), lg = ac.createGain();
    l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * vib, t + 0.25);
    l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + a + d + rel + 0.05);
  }
  if (filter) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filter; node.connect(fl); node = fl; }
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + a);
  if (sustain) { g.gain.setValueAtTime(v, t + a + d); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + rel); }
  else g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  node.connect(g).connect(out);
  o.start(t); o.stop(t + a + d + rel + 0.1);
}
const harp = (out, n, t, v = 0.05) => { voice(out, 'triangle', hz(n), t, 0.005, 1.1, v); voice(out, 'sine', hz(n + 12), t, 0.005, 0.5, v * 0.25); };
const flute = (out, n, t, dur, v) => voice(out, 'sine', hz(n), t, 0.06, Math.max(0.05, dur - 0.1), v, { sustain: 1, rel: 0.18, vib: 0.006, filter: 2600 });
const bass = (out, n, t, dur) => voice(out, 'triangle', hz(n), t, 0.01, Math.max(0.1, dur * 0.9), 0.11, { filter: 500 });
const pad = (out, n, t, dur, v) => { for (const dt of [-5, 5]) voice(out, 'triangle', hz(n), t, 0.45, dur, v, { detune: dt, sustain: 1, rel: 0.6, filter: 900 }); };
const horn = (out, n, t, dur) => voice(out, 'sawtooth', hz(n), t, 0.12, dur, 0.02, { sustain: 1, rel: 0.4, filter: 700 });
function noiseHit(out, t, v, type, f, d) {
  const buf = noiseBuffer(); if (!buf) return;
  const s = ac.createBufferSource(); s.buffer = buf;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
  const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * 0.3); s.stop(t + d + 0.02);
}
const kick = (out, t) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g).connect(out); o.start(t); o.stop(t + 0.22); };

function schedule(p, step, t, eighth) {
  const tr = p.tr, out = p.gain;
  const bar = Math.floor(step / 8), pos = step % 8;
  const c = chordOf(tr, bar);
  const barDur = eighth * 8;
  // 和音（小節の頭）
  if (pos === 0) {
    for (const k of [0, 2, 4]) pad(out, note(tr, c + k, -1), t, barDur * 0.95, 0.022 * tr.pad);
    if (tr.horn && bar % 2 === 0) horn(out, note(tr, c + 4, -1), t, barDur * 1.8);
  }
  // ベース
  const root = note(tr, c, -2), fifth = note(tr, c + 4, -2);
  if (tr.bass === 'half') { if (pos === 0) bass(out, root, t, eighth * 4); if (pos === 4) bass(out, fifth, t, eighth * 4); }
  else if (tr.bass === 'walk') { if (pos % 2 === 0) bass(out, note(tr, c + [0, 2, 4, 5][pos / 2], -2), t, eighth * 2); }
  else if (tr.bass === 'march') { if (pos % 2 === 0) bass(out, pos % 4 === 0 ? root : fifth, t, eighth * 1.6); }
  else if (tr.bass === 'drive') bass(out, pos % 4 === 3 ? fifth : root, t, eighth * 0.9);
  // ハープ
  if (tr.harp === 'arp') { const k = [0, 2, 4, 7, 9, 7, 4, 2][pos]; harp(out, note(tr, c + k, 0), t, pos % 2 ? 0.032 : 0.05); }
  else if (tr.harp === 'strum') { if (pos === 0 || pos === 4 || pos === 6) [0, 2, 4, 7].forEach((k, i) => harp(out, note(tr, c + k, 0), t + i * 0.035, 0.035)); }
  else if (tr.harp === 'ostinato') harp(out, note(tr, c + [0, 4, 7, 4][pos % 4], 0), t, 0.04);
  // 笛のメロディ（8小節でひとまわり）
  const m = tr.melody[step % tr.melody.length];
  if (m && tr.flute) flute(out, note(tr, m.step, 1), t, m.len * eighth, 0.055 * tr.flute);
  // 打楽器
  if (tr.perc >= 1 && pos % 2 === 1) noiseHit(out, t, 0.02, 'highpass', 7000, 0.05);
  if (tr.perc >= 2) { if (pos % 4 === 0) kick(out, t); if (pos % 4 === 2) noiseHit(out, t, 0.07, 'bandpass', 1800, 0.12); }
}
export { makeMelody, note };
