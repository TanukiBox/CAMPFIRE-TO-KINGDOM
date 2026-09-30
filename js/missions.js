// ミッション：いつも1つだけ表示し、次にやることを案内する。達成するとコインがもらえ、次へ進む
import { S } from './state.js';

const COUNTED = ['gather', 'feed', 'take', 'stock', 'make', 'kill', 'upgrade', 'tool', 'earn', 'guest'];

export class Missions {
  constructor(list) { this.list = list; }
  current() { return this.list[S.mission] || null; }

  // ゲームの中のできごと（数えるタイプのミッションだけ進む）
  event(type, kind, n = 1) {
    const m = this.current();
    if (m && m.type === type && (!m.kind || m.kind === kind)) S.mp += n;
  }

  progress(m, ctx) {
    if (COUNTED.includes(m.type)) return { p: Math.min(S.mp, m.n), n: m.n };
    if (m.type === 'hire') return { p: Math.min(S.hired.length, m.n), n: m.n };
    if (m.type === 'hireJob') return { p: Math.min(S.hired.filter(h => h === m.kind).length, m.n), n: m.n };
    if (m.type === 'rank') return { p: Math.min(ctx.rank, m.n), n: m.n };
    return null;
  }

  isDone(m, ctx) {
    if (COUNTED.includes(m.type)) return S.mp >= m.n;
    if (m.type === 'build') return ctx.builds.isDone(m.target);
    if (m.type === 'hire') return S.hired.length >= m.n;
    if (m.type === 'hireJob') return S.hired.filter(h => h === m.kind).length >= m.n;
    if (m.type === 'rank') return ctx.rank >= m.n;
    if (m.type === 'boss') return !!S.bosses[m.kind];
    return false;
  }

  // 達成したら次へ進め、達成したミッションを返す
  check(ctx) {
    const m = this.current();
    if (!m || !this.isDone(m, ctx)) return null;
    S.mission++; S.mp = 0;
    return m;
  }
}
