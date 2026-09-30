// 効果音（すべてコードで作る）
let ac = null, out = null, nbuf = null, on = true;

export function setSound(v) { on = !!v; }
export function soundOn() { return on; }

export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    out = ac.createGain();
    out.gain.value = 0.5;
    out.connect(ac.destination);
    nbuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
}
const ready = () => on && ac && ac.state === 'running';

function env(g, t, a, d, v) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function tone(f, d, { type = 'sine', v = 0.2, to = 0, at = 0, a = 0.005 } = {}) {
  if (!ready()) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d);
  const g = ac.createGain();
  env(g, t, a, d, v);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + a + d + 0.05);
}
function noise(d, { v = 0.2, type = 'bandpass', f = 1000, q = 1, to = 0, at = 0, a = 0.003 } = {}) {
  if (!ready()) return;
  const t = ac.currentTime + at;
  const s = ac.createBufferSource();
  s.buffer = nbuf;
  const fl = ac.createBiquadFilter();
  fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + a + d);
  const g = ac.createGain();
  env(g, t, a, d, v);
  s.connect(fl).connect(g).connect(out);
  s.start(t, Math.random() * 0.3); s.stop(t + a + d + 0.05);
}

let lastPick = 0;
export const sfx = {
  chop() { noise(0.08, { v: 0.4, type: 'lowpass', f: 1100 }); tone(150, 0.12, { type: 'triangle', v: 0.4, to: 75 }); },
  rock() { tone(1500, 0.12, { type: 'triangle', v: 0.14, to: 1250 }); tone(2300, 0.07, { v: 0.07 }); noise(0.06, { v: 0.25, type: 'highpass', f: 2600 }); tone(110, 0.08, { type: 'triangle', v: 0.25, to: 70 }); },
  slash() { noise(0.12, { v: 0.3, type: 'bandpass', f: 2400, q: 0.9, to: 700 }); tone(260, 0.1, { type: 'triangle', v: 0.18, to: 130 }); },
  kill() { tone(700, 0.2, { v: 0.16, to: 180 }); noise(0.15, { v: 0.2, type: 'lowpass', f: 1400 }); tone(1046, 0.1, { type: 'triangle', v: 0.08, at: 0.12 }); },
  pickup(i) {
    const now = performance.now(); if (now - lastPick < 35) return; lastPick = now;
    const f = 520 * Math.pow(2, Math.min(i, 30) / 24);
    tone(f, 0.07, { type: 'triangle', v: 0.12, to: f * 1.35 });
  },
  deposit(i) { const f = 330 * Math.pow(2, (i % 16) / 16); tone(f, 0.06, { type: 'square', v: 0.05, to: f * 1.1 }); tone(f * 2, 0.04, { v: 0.05 }); },
  build() {
    noise(0.4, { v: 0.25, type: 'lowpass', f: 500 });
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', v: 0.18, at: 0.08 + i * 0.09 }));
    tone(1568, 0.4, { v: 0.08, at: 0.45 });
  },
  hurt() { tone(240, 0.16, { type: 'square', v: 0.1, to: 120 }); noise(0.08, { v: 0.15, type: 'lowpass', f: 800 }); },
  down() { [440, 349, 262, 196].forEach((f, i) => tone(f, 0.25, { type: 'triangle', v: 0.16, at: i * 0.14 })); },
  full() { tone(200, 0.1, { type: 'square', v: 0.06 }); tone(160, 0.12, { type: 'square', v: 0.06, at: 0.1 }); },
  pop() { tone(620, 0.12, { v: 0.16, to: 1240 }); },
  swap() { tone(1200, 0.03, { type: 'square', v: 0.03 }); },
  appear() { [784, 988, 1175].forEach((f, i) => tone(f, 0.12, { type: 'triangle', v: 0.1, at: i * 0.07 })); },
  chopSoft() { noise(0.06, { v: 0.12, type: 'lowpass', f: 1000 }); tone(150, 0.08, { type: 'triangle', v: 0.12, to: 80 }); },
  rockSoft() { tone(1500, 0.08, { type: 'triangle', v: 0.05, to: 1250 }); noise(0.04, { v: 0.08, type: 'highpass', f: 2600 }); },
  coin() {
    const now = performance.now(); if (now - lastCoin < 45) return; lastCoin = now;
    tone(1319, 0.06, { type: 'square', v: 0.045 }); tone(1976, 0.12, { type: 'square', v: 0.04, at: 0.05 });
  },
  eat() { tone(420, 0.08, { v: 0.14, to: 700 }); tone(700, 0.1, { type: 'triangle', v: 0.1, to: 1000, at: 0.08 }); },
  burn() { noise(0.18, { v: 0.14, type: 'bandpass', f: 900, q: 0.7, to: 2400 }); },
  horn() { tone(196, 0.9, { type: 'sawtooth', v: 0.06, a: 0.08 }); tone(147, 0.9, { type: 'triangle', v: 0.08, a: 0.08 }); },
  clang() { tone(1300, 0.06, { type: 'square', v: 0.025, to: 900 }); },
  sell() { tone(988, 0.07, { type: 'triangle', v: 0.1 }); tone(1319, 0.12, { type: 'triangle', v: 0.1, at: 0.07 }); },
  mission() { [659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { type: 'triangle', v: 0.13, at: i * 0.08 })); },
  unlock() { [523, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', v: 0.14, at: i * 0.12 })); tone(1568, 0.5, { v: 0.08, at: 0.36 }); },
  upgrade() { tone(440, 0.1, { type: 'square', v: 0.06, to: 880 }); [880, 1109, 1319].forEach((f, i) => tone(f, 0.14, { type: 'triangle', v: 0.12, at: 0.1 + i * 0.06 })); },
  anvil() { tone(1800, 0.25, { type: 'triangle', v: 0.12, to: 1700 }); tone(2700, 0.2, { v: 0.06 }); noise(0.05, { v: 0.2, type: 'highpass', f: 3000 }); },
  roar() { tone(90, 0.7, { type: 'sawtooth', v: 0.12, to: 60 }); noise(0.6, { v: 0.15, type: 'lowpass', f: 500, to: 200 }); },
  slam() { tone(70, 0.4, { type: 'triangle', v: 0.4, to: 35 }); noise(0.35, { v: 0.35, type: 'lowpass', f: 700, to: 150 }); },
  fanfare() {
    const seq = [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [988, 0.75], [1047, 0.9], [1319, 1.05]];
    seq.forEach(([f, at]) => { tone(f, 0.28, { type: 'triangle', v: 0.16, at }); tone(f / 2, 0.28, { type: 'sine', v: 0.08, at }); });
  },
};
let lastCoin = 0;
