// 住民の道さがし：地面を細かいマス目に分け、建物・柵・岩などをよけた道を A* で探す。
// マス目は建物が建ったり土地を買ったりしたときだけ作り直す
const CELL = 0.5, AGENT = 0.32;
const SQ2 = Math.SQRT2;

export class Nav {
  constructor(world) {
    this.world = world;
    this.sig = '';
  }

  // 建物の完成・土地の購入・岩の復活などで変わったら作り直す
  signature() {
    const w = this.world;
    let n = 0;
    for (const b of w.boxes) if (!(b.off && b.off())) n++;
    let c = 0;
    for (const k of w.circles) if (!(k.off && k.off())) c++;
    return n + ':' + c + ':' + w.fenceBoxes.length + ':' + w.walkRects.length;
  }

  build() {
    const w = this.world, b = w.bounds;
    this.x0 = b.x0 - 1; this.z0 = b.z0 - 1;
    this.nx = Math.ceil((b.x1 - b.x0 + 2) / CELL); this.nz = Math.ceil((b.z1 - b.z0 + 2) / CELL);
    const N = this.nx * this.nz;
    const g = this.grid = new Uint8Array(N).fill(1);   // 1 = 通れない
    // 歩ける土地
    for (const r of w.ownedInset) this.fill(r.x0 + 0.1, r.x1 - 0.1, r.z0 + 0.1, r.z1 - 0.1, 0);
    // 建物・柵
    for (const bx of w.boxes.concat(w.fenceBoxes)) {
      if (bx.off && bx.off()) continue;
      this.fill(bx.x0 - AGENT, bx.x1 + AGENT, bx.z0 - AGENT, bx.z1 + AGENT, 1);
    }
    // 丸い物（岩・木・焚き火・街灯）
    for (const c of w.circles) {
      if (c.off && c.off()) continue;
      const r = c.r + AGENT;
      const i0 = this.ix(c.x - r), i1 = this.ix(c.x + r), j0 = this.iz(c.z - r), j1 = this.iz(c.z + r);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
        const cx = this.x0 + (i + 0.5) * CELL, cz = this.z0 + (j + 0.5) * CELL;
        if ((cx - c.x) ** 2 + (cz - c.z) ** 2 < r * r) g[j * this.nx + i] = 1;
      }
    }
    if (!this.g || this.g.length !== N) { this.g = new Float32Array(N); this.f = new Float32Array(N); this.from = new Int32Array(N); this.seen = new Uint32Array(N); this.closed = new Uint32Array(N); this.heap = new Int32Array(N); this.stamp = 0; }
  }
  fill(x0, x1, z0, z1, v) {
    const i0 = Math.max(0, this.ix(x0)), i1 = Math.min(this.nx - 1, this.ix(x1)), j0 = Math.max(0, this.iz(z0)), j1 = Math.min(this.nz - 1, this.iz(z1));
    for (let j = j0; j <= j1; j++) this.grid.fill(v, j * this.nx + i0, j * this.nx + i1 + 1);
  }
  ix(x) { return Math.floor((x - this.x0) / CELL); }
  iz(z) { return Math.floor((z - this.z0) / CELL); }
  cx(i) { return this.x0 + (i + 0.5) * CELL; }
  cz(j) { return this.z0 + (j + 0.5) * CELL; }
  free(i, j) { return i >= 0 && j >= 0 && i < this.nx && j < this.nz && this.grid[j * this.nx + i] === 0; }

  refresh() {
    const s = this.signature();
    if (s !== this.sig || !this.grid) { this.sig = s; this.build(); }
  }

  // まっすぐ歩いて行けるか（マス目の上をたどって調べる）
  los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (CELL * 0.5));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (!this.free(this.ix(ax + (bx - ax) * t), this.iz(az + (bz - az) * t))) return false;
    }
    return true;
  }

  // いちばん近い通れるマス（目的地が建物のすぐそばのとき）
  nearestFree(i, j, R = 6) {
    if (this.free(i, j)) return [i, j];
    for (let r = 1; r <= R; r++) {
      let best = null, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !this.free(i + di, j + dj)) continue;
        const d = di * di + dj * dj;
        if (d < bd) { bd = d; best = [i + di, j + dj]; }
      }
      if (best) return best;
    }
    return null;
  }

  // (fx,fz) から (tx,tz) への中継点の列。見つからなければ null
  path(fx, fz, tx, tz) {
    this.refresh();
    const s = this.nearestFree(this.ix(fx), this.iz(fz)), e = this.nearestFree(this.ix(tx), this.iz(tz));
    if (!s || !e) return null;
    const nx = this.nx, S = s[1] * nx + s[0], E = e[1] * nx + e[0];
    if (S === E) return [{ x: tx, z: tz }];
    const st = ++this.stamp, G = this.g, F = this.f, from = this.from, seen = this.seen, closed = this.closed, heap = this.heap;
    const ei = e[0], ej = e[1];
    const h = (i, j) => { const dx = Math.abs(i - ei), dz = Math.abs(j - ej); return (dx + dz) + (SQ2 - 2) * Math.min(dx, dz); };
    let hn = 0;
    const push = n => { let k = hn++; heap[k] = n; while (k > 0) { const p = (k - 1) >> 1; if (F[heap[p]] <= F[n]) break; heap[k] = heap[p]; k = p; } heap[k] = n; };
    const pop = () => {
      const top = heap[0], last = heap[--hn];
      let k = 0;
      while (true) { let c = 2 * k + 1; if (c >= hn) break; if (c + 1 < hn && F[heap[c + 1]] < F[heap[c]]) c++; if (F[heap[c]] >= F[last]) break; heap[k] = heap[c]; k = c; }
      heap[k] = last;
      return top;
    };
    G[S] = 0; F[S] = h(s[0], s[1]); seen[S] = st; from[S] = -1; push(S);
    let found = false, budget = 30000;
    while (hn > 0 && budget-- > 0) {
      const n = pop();
      if (closed[n] === st) continue;
      closed[n] = st;
      if (n === E) { found = true; break; }
      const i = n % nx, j = (n / nx) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = i + di, b = j + dj;
        if (!this.free(a, b)) continue;
        // 斜めは角をかすらないときだけ
        if (di && dj && (!this.free(i + di, j) || !this.free(i, j + dj))) continue;
        const m = b * nx + a;
        if (closed[m] === st) continue;
        const ng = G[n] + (di && dj ? SQ2 : 1);
        if (seen[m] === st && ng >= G[m]) continue;
        seen[m] = st; G[m] = ng; F[m] = ng + h(a, b); from[m] = n; push(m);
      }
    }
    if (!found) return null;
    // マスの列 → まっすぐ行ける所は飛ばして、曲がり角だけ残す
    const cells = [];
    for (let n = E; n !== -1; n = from[n]) cells.push(n);
    cells.reverse();
    const pts = cells.map(n => ({ x: this.cx(n % nx), z: this.cz((n / nx) | 0) }));
    pts[pts.length - 1] = { x: tx, z: tz };
    const out = [];
    let cur = { x: fx, z: fz }, k = 0;
    while (k < pts.length - 1) {
      let far = k + 1;
      for (let m = k + 2; m < pts.length; m++) { if (this.los(cur.x, cur.z, pts[m].x, pts[m].z)) far = m; else if (m - far > 6) break; }
      out.push(pts[far]); cur = pts[far]; k = far;
    }
    if (!out.length) out.push({ x: tx, z: tz });
    return out;
  }
}
