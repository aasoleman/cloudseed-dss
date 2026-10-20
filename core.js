/* CloudSeed-DSS core: synthetic data, Target-Control Regression, CUSUM, Mann-Kendall,
   Koren-Feingold physics prior, physics-informed MLP, GBDT-lite baseline, Bellman Q-learning.
   No DOM access, so it can be tested in Node. */
const Core = (function () {
  const sigm = x => 1 / (1 + Math.exp(-x));
  const clip = (x, a, b) => Math.max(a, Math.min(b, x));
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  function normCdf(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);

  /* ------------------------------------------------------------------ data */
  const STATIONS = [
    { n: 'Abu Dhabi', ar: 'أبوظبي', dT: 1.0, ro: 0.75 }, { n: 'Dubai', ar: 'دبي', dT: 0.8, ro: 0.95 },
    { n: 'Sharjah', ar: 'الشارقة', dT: 0.5, ro: 1.0 }, { n: 'Ajman', ar: 'عجمان', dT: 0.4, ro: 1.0 },
    { n: 'Umm Al Quwain', ar: 'أم القيوين', dT: 0.3, ro: 1.0 }, { n: 'Ras Al Khaimah', ar: 'رأس الخيمة', dT: -0.3, ro: 1.3 },
    { n: 'Fujairah', ar: 'الفجيرة', dT: -0.5, ro: 1.5 }];
  const SEEDED = 1, SEED_YEAR = 2012;

  function genData(opts = {}) {
    const seed = opts.seed || 7, enh = opts.enh == null ? 0.25 : opts.enh;
    const r = rng(seed), start = Date.UTC(2000, 0, 1), nDays = Math.round((Date.UTC(2025, 11, 31) - start) / 864e5) + 1;
    const date = [], rows = STATIONS.map(() => []);
    let z = 0;
    for (let d = 0; d < nDays; d++) {
      const dt = new Date(start + d * 864e5), y = dt.getUTCFullYear(), mo = dt.getUTCMonth();
      const doy = Math.floor((dt - Date.UTC(y, 0, 0)) / 864e5);
      date.push([y, mo, doy]);
      z = 0.8 * z + 0.6 * gauss(r);
      const w = 0.5 + 0.5 * Math.cos(2 * Math.PI * (doy - 20) / 365), season = Math.sin(2 * Math.PI * (doy - 110) / 365);
      const u = r(), e = -Math.log(r()); // shared synoptic occurrence & intensity
      STATIONS.forEach((s, i) => {
        const c = sigm(1.5 * z + 0.35 * gauss(r) - 0.5 + 1.2 * (w - 0.5));
        const hl = clip(0.3 + 0.55 * c + 0.07 * gauss(r), 0.05, 1);
        const tavg = 27 + 9 * season + s.dT - 1.5 * c + 0.7 * gauss(r);
        const tmin = tavg - 5.5 + 0.6 * gauss(r), tmax = tavg + 5.5 + 0.6 * gauss(r);
        const pres = 1008 + 7 * w - 5 * (c - 0.4) + 1.2 * gauss(r);
        const tsun = Math.max(0, (10.5 + 2 * season) * (1 - 0.75 * Math.pow(c, 1.5)) + 0.5 * gauss(r));
        const wspd = Math.abs(9 + 7 * c + 2.5 * gauss(r)), wdir = ((90 + 70 * gauss(r)) % 360 + 360) % 360;
        const aod = clip(0.22 + 0.18 * (1 - w) + 0.07 * gauss(r), 0.05, 0.9);
        const p = 0.004 + 0.32 * w * c * c;
        let prcp = 0;
        if (u < p * s.ro) {
          prcp = e * (3 + 9 * c) * Math.exp(0.2 * gauss(r));
          if (i === SEEDED && y >= SEED_YEAR && c > 0.5) prcp *= 1 + enh;
        }
        rows[i].push({ tavg, tmin, tmax, prcp: +prcp.toFixed(2), wdir, wspd, pres, tsun, aod, c, hl });
      });
    }
    return { synthetic: true, names: STATIONS.map(s => s.n), namesAr: STATIONS.map(s => s.ar), rows, date, nDays, seededIdx: SEEDED, seedYear: SEED_YEAR, enh };
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/), head = lines.shift().split(',').map(s => s.trim().toLowerCase());
    const ix = k => head.indexOf(k), need = ['date', 'prcp', 'tavg'];
    for (const k of need) if (ix(k) < 0) throw new Error('Missing column: ' + k);
    const g = {};
    lines.forEach(l => {
      const c = l.split(','), st = ix('station') >= 0 ? c[ix('station')].trim() : 'Station 1';
      (g[st] = g[st] || []).push(c);
    });
    const names = Object.keys(g);
    if (names.length < 2) throw new Error('Need at least two stations (column "station")');
    const num = (c, k, def) => { const v = ix(k) >= 0 ? parseFloat(c[ix(k)]) : NaN; return isNaN(v) ? def : v; };
    const maps = names.map(n => { const m = new Map(); g[n].forEach(c => m.set(c[ix('date')].trim().slice(0, 10), c)); return m; });
    const dates = [...maps[0].keys()].sort();
    const date = dates.map(s => { const dt = new Date(s + 'T00:00:00Z'); return [dt.getUTCFullYear(), dt.getUTCMonth(), Math.floor((dt - Date.UTC(dt.getUTCFullYear(), 0, 0)) / 864e5)]; });
    const rows = maps.map(m => { let last = null; return dates.map(ds => {
      const c = m.get(ds); let o;
      if (c) { const L = k => last ? last[k] : undefined, tavg = num(c, 'tavg', L('tavg') ?? 27);   // gaps carry the last known value
        o = { tavg, tmin: num(c, 'tmin', tavg - 5), tmax: num(c, 'tmax', tavg + 5), prcp: num(c, 'prcp', 0), wdir: num(c, 'wdir', L('wdir') ?? 90), wspd: num(c, 'wspd', L('wspd') ?? 10),
          pres: num(c, 'pres', L('pres') ?? 1012), tsun: num(c, 'tsun', L('tsun') ?? 8), aod: num(c, 'aod', 0.3) }; }
      else o = Object.assign({}, last); last = o; return o; }); });
    return { synthetic: false, names, namesAr: names, rows, date, nDays: dates.length, seededIdx: -1 };
  }

  /* ------------------------------------------- derived humidity & cloud density */
  function derive(D, nTrain) {
    D.rows.forEach(st => {
      const mT = Array(12).fill(0), mP = Array(12).fill(0), cnt = Array(12).fill(0);
      for (let d = 0; d < nTrain; d++) { const m = D.date[d][1]; mT[m] += st[d].tsun; mP[m] += st[d].pres; cnt[m]++; }
      for (let m = 0; m < 12; m++) { mT[m] /= cnt[m] || 1; mP[m] /= cnt[m] || 1; }
      const sdP = Math.sqrt(mean(st.slice(0, nTrain).map(r => (r.pres - mP[0]) ** 2))) || 3;
      let lo = Infinity, hi = -Infinity;
      st.forEach((r, d) => {
        const m = D.date[d][1], Td = r.tmin - 1;                     // dew point from temperature records only
        r.Hmd = clip(100 * Math.exp(17.625 * Td / (243.04 + Td)) / Math.exp(17.625 * r.tavg / (243.04 + r.tavg)), 5, 100); // Magnus
        const sunDef = (mT[m] - r.tsun) / (mT[m] || 1), presDef = (mP[m] - r.pres) / sdP;
        r._c = 0.6 * sunDef + 0.4 * presDef / 3;
        if (d < nTrain) { lo = Math.min(lo, r._c); hi = Math.max(hi, r._c); }
      });
      st.forEach(r => { r.Cden = clip((r._c - lo) / (hi - lo || 1), 0, 1); });
    });
  }

  /* ------------------------- Target-Control Regression + CUSUM + Mann-Kendall */
  function monthly(D, i) {
    const n = (D.date[D.nDays - 1][0] - D.date[0][0] + 1) * 12, out = new Float64Array(n), y0 = D.date[0][0];
    D.rows[i].forEach((r, d) => { out[(D.date[d][0] - y0) * 12 + D.date[d][1]] += r.prcp; });
    return out;
  }
  function mannKendall(x) {
    const n = x.length; let S = 0;
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) S += Math.sign(x[j] - x[i]);
    const V = n * (n - 1) * (2 * n + 5) / 18, Z = S === 0 ? 0 : (S - Math.sign(S)) / Math.sqrt(V);
    return { S, Var: V, Z, p: 2 * (1 - normCdf(Math.abs(Z))) };
  }
  function ols(x, y) {
    const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    const b = sxx ? sxy / sxx : 0, a = my - b * mx; return { alpha: a, beta: b, r2: syy ? sxy * sxy / (sxx * syy) : 0 };
  }
  function tcr(D, ti, ci) {
    const t = monthly(D, ti), c = monthly(D, ci), fit = ols(c, t), n = t.length;
    const resid = Array.from(t, (v, m) => v - (fit.alpha + fit.beta * c[m])), mu = mean(resid);
    const cusum = []; let acc = 0, best = 0, cp = 0;
    resid.forEach((e, m) => { acc += e - mu; cusum.push(acc); if (Math.abs(acc) > best) { best = Math.abs(acc); cp = m; } });
    const pre = resid.slice(0, cp + 1), post = resid.slice(cp + 1);
    const s = x => Math.sqrt(mean(x.map(v => (v - mean(x)) ** 2)));
    const sp = Math.sqrt((s(pre) ** 2 / pre.length) + (s(post) ** 2 / (post.length || 1)));
    const tstat = (mean(post) - mean(pre)) / (sp || 1);
    const y0 = D.date[0][0];
    return { target: t, control: c, ...fit, resid, cusum, cp, cpLabel: (y0 + Math.floor(cp / 12)) + '-' + String(cp % 12 + 1).padStart(2, '0'),
      shift: mean(post) - mean(pre), shiftT: tstat, pctShift: 100 * (mean(post) - mean(pre)) / (mean(Array.from(t).slice(0, cp + 1)) || 1),
      segPre: ols(Array.from(c).slice(0, cp + 1), Array.from(t).slice(0, cp + 1)), segPost: ols(Array.from(c).slice(cp + 1), Array.from(t).slice(cp + 1)),
      mk: mannKendall(resid), n, y0 };
  }

  /* ------------------------------------------------------------ dataset */
  const BASE = ['Tavg', 'Prcp(t-1)', 'Wspd', 'sin Wdir', 'cos Wdir', 'Pres', 'Hmd', 'Cden', 'AOD', 'sin doy', 'cos doy'];
  const ENG = ['Ctrl Prcp', 'TC residual', 'Regime', 'CUSUM(t-1)'];
  function buildDataset(D, ti, ci, T, cfg) {
    const useEng = cfg.eng, st = D.rows[ti], ct = D.rows[ci], y0 = T.y0, N = D.nDays - 1;
    const i1 = Math.floor(N * 0.7), i2 = Math.floor(N * 0.85);
    const names = BASE.concat(useEng ? ENG : []), nf = names.length, X = new Float64Array(N * nf), y = new Float64Array(N);
    const raw = [], A = new Float64Array(N), C = new Float64Array(N), W = new Float64Array(N), H = new Float64Array(N), S = new Float64Array(N), L = [];
    const dtrue = new Float64Array(N), hasLatent = D.synthetic;
    const rawNames = ['Tavg', 'Tmin', 'Tmax', 'Prcp(t-1)', 'Wspd', 'Wdir', 'Pres', 'Tsun', 'doy'].concat(cfg.fair ? ['Hmd', 'Cden', 'AOD'].concat(useEng ? ENG : []) : []);
    const rawX = new Float64Array(N * rawNames.length);
    for (let t = 0; t < N; t++) {
      const r = st[t], pv = st[Math.max(t - 1, 0)], [yr, mo, doy] = D.date[t], m = (yr - y0) * 12 + mo, ang = 2 * Math.PI * r.wdir / 360, da = 2 * Math.PI * doy / 365;
      const ctrl = ct[Math.max(t - 1, 0)].prcp, res = pv.prcp - T.beta * ctrl, reg = m > T.cp ? 1 : 0, cu = m > 0 ? T.cusum[m - 1] / 100 : 0;
      const f = [r.tavg, pv.prcp, r.wspd, Math.sin(ang), Math.cos(ang), r.pres, r.Hmd, r.Cden, r.aod, Math.sin(da), Math.cos(da)];
      const e = [ctrl, res, reg, cu];
      (useEng ? f.concat(e) : f).forEach((v, k) => X[t * nf + k] = v);
      const rr = [r.tavg, r.tmin, r.tmax, pv.prcp, r.wspd, r.wdir, r.pres, r.tsun, doy].concat(cfg.fair ? [r.Hmd, r.Cden, r.aod].concat(useEng ? e : []) : []);
      rr.forEach((v, k) => rawX[t * rawNames.length + k] = v);
      y[t] = r.prcp; A[t] = r.aod; C[t] = r.Cden; W[t] = r.wspd / 20; H[t] = r.Hmd;
      const cl = hasLatent ? r.c : r.Cden, hl = hasLatent ? r.hl : r.Hmd / 100;
      dtrue[t] = deltaTrue(cl, hl, r.wspd);
    }
    // standardise on training rows
    const mu = new Float64Array(nf), sd = new Float64Array(nf);
    for (let k = 0; k < nf; k++) { let s = 0, q = 0; for (let t = 0; t < i1; t++) { const v = X[t * nf + k]; s += v; q += v * v; } mu[k] = s / i1; sd[k] = Math.sqrt(Math.max(q / i1 - mu[k] ** 2, 1e-9)); }
    const Xn = new Float64Array(N * nf);
    for (let t = 0; t < N; t++) for (let k = 0; k < nf; k++) Xn[t * nf + k] = (X[t * nf + k] - mu[k]) / sd[k];
    return { N, nf, names, X: Xn, Xraw: X, mu, sd, y, i1, i2, A, C, W, H, rawX, rawNames, nraw: rawNames.length, dtrue, wspd: Array.from({ length: N }, (_, t) => st[t].wspd), useEng };
  }
  const deltaTrue = (c, hl, w) => 4.0 * sigm((c - 0.55) / 0.07) * sigm((hl - 0.6) / 0.08) * Math.exp(-w / 25); // hidden simulator truth
  const psiPrior = (H, C, w) => 3.0 * sigm((C - 0.5) / 0.1) * sigm((H - 60) / 10) * Math.exp(-w / 30);         // physics prior (approximate)

  /* -------------------------------------------- Koren-Feingold style phi(A,C,W) */
  const phiF = (p, A, C, W) => p.a * Math.pow(Math.max(A, 1e-3), p.b) * Math.pow(C + 0.02, p.g) * Math.exp(p.d * W);
  function fitPhi(ds) {
    let th = [Math.log(1.5), 0.3, 2, 0.5], m = [0, 0, 0, 0], v = [0, 0, 0, 0];
    const P = t => ({ a: Math.exp(t[0]), b: t[1], g: t[2], d: t[3] }), idx = [];
    for (let t = 0; t < ds.i1; t += 2) idx.push(t);
    const loss = t => { const p = P(t); let s = 0; for (const i of idx) s += (phiF(p, ds.A[i], ds.C[i], ds.W[i]) - ds.y[i]) ** 2; return s / idx.length; };
    for (let it = 1; it <= 120; it++) {
      const g = th.map((_, k) => { const a = th.slice(), b = th.slice(); a[k] += 1e-3; b[k] -= 1e-3; return (loss(a) - loss(b)) / 2e-3; });
      th = th.map((x, k) => { m[k] = 0.9 * m[k] + 0.1 * g[k]; v[k] = 0.999 * v[k] + 0.001 * g[k] ** 2; return clip(x - 0.05 * (m[k] / (1 - 0.9 ** it)) / (Math.sqrt(v[k] / (1 - 0.999 ** it)) + 1e-8), -6, 6); });
    }
    const p = P(th); p.mse = loss(th); return p;
  }

  /* ---------------------------------------------------- Physics-informed MLP */
  function newMLP(d, h, seed) {
    const r = rng(seed), o = { d, h, W1: new Float64Array(h * d), b1: new Float64Array(h), W2: new Float64Array(h), b2: 0.3 };
    for (let i = 0; i < h * d; i++) o.W1[i] = gauss(r) * Math.sqrt(1 / d);
    for (let i = 0; i < h; i++) o.W2[i] = gauss(r) * 0.3;
    return o;
  }
  function mlpPredict(M, x, off, buf) {
    const { d, h } = M; let p = M.b2;
    for (let j = 0; j < h; j++) { let s = M.b1[j]; for (let k = 0; k < d; k++) s += M.W1[j * d + k] * x[off + k]; const a = Math.tanh(s); if (buf) buf[j] = a; p += M.W2[j] * a; }
    return p;
  }
  async function trainMLP(ds, cfg, phi, onEpoch) {
    const M = newMLP(ds.nf, 16, cfg.seed || 3), r = rng(11), { d, h } = M, B = 64, lr = 0.003;
    const params = [M.W1, M.b1, M.W2, new Float64Array([M.b2])], mA = params.map(p => new Float64Array(p.length)), vA = params.map(p => new Float64Array(p.length));
    const hid = new Float64Array(h), idx = Array.from({ length: ds.i1 }, (_, i) => i), hist = []; let step = 0;
    const phiV = new Float64Array(ds.N); for (let t = 0; t < ds.N; t++) phiV[t] = phiF(phi, ds.A[t], ds.C[t], ds.W[t]);
    for (let ep = 0; ep < cfg.epochs; ep++) {
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      let ld = 0, lp = 0;
      for (let s0 = 0; s0 < idx.length; s0 += B) {
        const gr = params.map(p => new Float64Array(p.length)), nb = Math.min(B, idx.length - s0);
        for (let b = 0; b < nb; b++) {
          const t = idx[s0 + b], p = mlpPredict(M, ds.X, t * d, hid), dp = 2 * (p - ds.y[t]) + 2 * cfg.lambda * (p - phiV[t]);
          ld += (p - ds.y[t]) ** 2; lp += (p - phiV[t]) ** 2; gr[3][0] += dp;
          for (let j = 0; j < h; j++) { gr[2][j] += dp * hid[j]; const dh = dp * M.W2[j] * (1 - hid[j] * hid[j]); gr[1][j] += dh; for (let k = 0; k < d; k++) gr[0][j * d + k] += dh * ds.X[t * d + k]; }
        }
        step++;
        params.forEach((p, q) => { for (let i = 0; i < p.length; i++) { const g = gr[q][i] / nb; mA[q][i] = 0.9 * mA[q][i] + 0.1 * g; vA[q][i] = 0.999 * vA[q][i] + 0.001 * g * g;
          p[i] -= lr * (mA[q][i] / (1 - 0.9 ** step)) / (Math.sqrt(vA[q][i] / (1 - 0.999 ** step)) + 1e-8); } });
        M.b2 = params[3][0];
      }
      const pv = predictRange(M, ds, ds.i1, ds.i2);
      hist.push({ ep: ep + 1, data: ld / ds.i1, phys: lp / ds.i1, valRmse: rmse(pv, ds.y, ds.i1, ds.i2) });
      if (onEpoch) await onEpoch(ep + 1, cfg.epochs, hist[hist.length - 1]);
    }
    M.hist = hist; M.phiV = phiV; return M;
  }
  function predictRange(M, ds, a, b) { const o = new Float64Array(b - a); for (let t = a; t < b; t++) o[t - a] = Math.max(0, mlpPredict(M, ds.X, t * ds.nf)); return o; }

  /* ------------------------------------------------------- GBDT-lite baseline */
  function trainGBDT(ds, rounds = 300, lr = 0.1, nb = 24) {
    const { N, nraw: F, rawX, y, i1 } = ds, edges = [], bins = new Uint8Array(N * F);
    for (let f = 0; f < F; f++) {
      const col = []; for (let t = 0; t < i1; t++) col.push(rawX[t * F + f]); col.sort((a, b) => a - b);
      const e = []; for (let q = 1; q < nb; q++) { const v = col[Math.floor(q * col.length / nb)]; if (!e.length || v > e[e.length - 1]) e.push(v); } edges.push(e);
      for (let t = 0; t < N; t++) { const v = rawX[t * F + f]; let b = 0; while (b < e.length && v > e[b]) b++; bins[t * F + f] = b; }
    }
    let base = 0; for (let t = 0; t < i1; t++) base += y[t]; base /= i1;
    const res = new Float64Array(i1), stumps = []; for (let t = 0; t < i1; t++) res[t] = y[t] - base;
    for (let k = 0; k < rounds; k++) {
      let best = { g: -1 };
      for (let f = 0; f < F; f++) {
        const nbin = edges[f].length + 1, s = new Float64Array(nbin), c = new Float64Array(nbin);
        for (let t = 0; t < i1; t++) { const b = bins[t * F + f]; s[b] += res[t]; c[b]++; }
        let sl = 0, cl = 0, st = 0, ct = 0; for (let b = 0; b < nbin; b++) { st += s[b]; ct += c[b]; }
        for (let b = 0; b < nbin - 1; b++) { sl += s[b]; cl += c[b]; const sr = st - sl, cr = ct - cl; if (cl < 20 || cr < 20) continue;
          const g = sl * sl / cl + sr * sr / cr; if (g > best.g) best = { g, f, b, l: sl / cl, r: sr / cr }; }
      }
      if (best.g < 0) break;
      stumps.push(best);
      for (let t = 0; t < i1; t++) res[t] -= lr * (bins[t * F + best.f] <= best.b ? best.l : best.r);
    }
    const pred = (a, b) => { const o = new Float64Array(b - a); for (let t = a; t < b; t++) { let p = base; for (const s of stumps) p += lr * (bins[t * F + s.f] <= s.b ? s.l : s.r); o[t - a] = Math.max(0, p); } return o; };
    return { predict: pred, nStumps: stumps.length };
  }

  /* ---------------------------------------------------------------- metrics */
  function rmse(p, y, a, b) { let s = 0; for (let t = a; t < b; t++) s += (p[t - a] - y[t]) ** 2; return Math.sqrt(s / (b - a)); }
  function evalPred(pv, pt, y, i1, i2, N) {
    const yv = Array.from(y.slice(i1, i2)), yt = Array.from(y.slice(i2, N)), my = mean(yt);
    const mae = pt.reduce((s, v, i) => s + Math.abs(v - yt[i]), 0) / pt.length;
    const r2 = 1 - pt.reduce((s, v, i) => s + (v - yt[i]) ** 2, 0) / yt.reduce((s, v) => s + (v - my) ** 2, 0);
    const conf = (p, yy, tau) => { let tp = 0, fp = 0, tn = 0, fn = 0; p.forEach((v, i) => { const pos = v >= tau, wet = yy[i] >= 1; if (pos && wet) tp++; else if (pos) fp++; else if (wet) fn++; else tn++; }); return { tp, fp, tn, fn }; };
    let bestTau = 0.5, bestJ = -1; for (let tau = 0.1; tau <= 5; tau += 0.1) { const c = conf(pv, yv, tau), j = c.tp / (c.tp + c.fn || 1) + c.tn / (c.tn + c.fp || 1) - 1; if (j > bestJ) { bestJ = j; bestTau = tau; } }
    const c = conf(pt, yt, bestTau);
    return { rmse: rmse(pt, y.slice(i2, N), 0, pt.length), mae, r2, tau: bestTau, acc: (c.tp + c.tn) / pt.length, fpr: c.fp / (c.fp + c.tn || 1), tpr: c.tp / (c.tp + c.fn || 1), conf: c };
  }

  /* ------------------------------------------------ Bellman Q-learning (PIB-RL) */
  const RL = { alpha: 1, beta: 0.2, cost: 0.8 };
  function quantEdges(v, k) { const s = Array.from(v).sort((a, b) => a - b), e = []; for (let q = 1; q < k; q++) e.push(s[Math.floor(q * s.length / k)]); return e; }
  const binOf = (v, e) => { let b = 0; while (b < e.length && v > e[b]) b++; return b; };
  function makeStates(D, ti, ds) {
    const st = D.rows[ti], tr = st.slice(0, ds.i1);
    const eh = quantEdges(tr.map(r => r.Hmd), 5), ec = quantEdges(tr.map(r => r.Cden), 5), ew = quantEdges(tr.map(r => r.wspd), 3);
    const sIdx = new Int16Array(ds.N + 1), cell = Array.from({ length: 75 }, () => ({ h: 0, c: 0, w: 0, n: 0 }));
    for (let t = 0; t <= ds.N; t++) {
      const r = st[t], s = (binOf(r.Hmd, eh) * 5 + binOf(r.Cden, ec)) * 3 + binOf(r.wspd, ew); sIdx[t] = s;
      if (t < ds.i1) { const q = cell[s]; q.h += r.Hmd; q.c += r.Cden; q.w += r.wspd; q.n++; }
    }
    cell.forEach(q => { if (q.n) { q.h /= q.n; q.c /= q.n; q.w /= q.n; } });
    return { eh, ec, ew, sIdx, cell };
  }
  const stateOf = (S, H, C, w) => (binOf(H, S.eh) * 5 + binOf(C, S.ec)) * 3 + binOf(w, S.ew);
  function qlearn(ds, S, Ppred, cfg, physInit) {
    const r = rng(cfg.seed || 5), gamma = cfg.gamma, Q = new Float64Array(150), n = new Float64Array(150), curve = [];
    let eBar = 0; for (let t = 0; t < ds.i1; t++) eBar += Math.abs(Ppred[t] - ds.y[t]); eBar /= ds.i1;
    if (physInit) S.cell.forEach((q, s) => { if (!q.n) return; Q[s * 2] = -RL.beta * eBar; Q[s * 2 + 1] = -RL.beta * eBar + RL.alpha * psiPrior(q.h, q.c, q.w) - RL.cost; n[s * 2] = n[s * 2 + 1] = 4; });
    const val = () => policyValue(ds, S, Q, ds.i1, ds.i2).value;
    curve.push(val());
    for (let ep = 0; ep < cfg.rlEpochs; ep++) {
      const eps = Math.max(0.05, 0.3 * 0.75 ** ep);
      for (let t = 0; t < ds.i1; t++) {
        const s = S.sIdx[t], a = r() < eps ? (r() < 0.5 ? 0 : 1) : (Q[s * 2 + 1] > Q[s * 2] ? 1 : 0);
        const E = Math.abs(Ppred[t] - ds.y[t]);
        const rew = (a ? RL.alpha * ds.dtrue[t] * (0.6 + 0.8 * r()) - RL.cost : 0) - RL.beta * E;
        const s2 = S.sIdx[t + 1], tgt = rew + gamma * Math.max(Q[s2 * 2], Q[s2 * 2 + 1]), k = s * 2 + a;
        n[k]++; Q[k] += Math.max(0.02, 1 / Math.pow(n[k], 0.7)) * (tgt - Q[k]);
      }
      curve.push(val());
    }
    return { Q, n, curve };
  }
  function policyValue(ds, S, Q, a, b, fixed) {
    let v = 0, seeds = 0, bad = 0, orc = 0;
    for (let t = a; t < b; t++) {
      const s = S.sIdx[t], act = fixed ? fixed(t) : (Q[s * 2 + 1] > Q[s * 2] ? 1 : 0), g = RL.alpha * ds.dtrue[t] - RL.cost;
      if (act) { v += g; seeds++; if (g < 0) bad++; } orc += Math.max(0, g);
    }
    const n = b - a; return { value: v / n, seedRate: seeds / n, falseSeed: seeds ? bad / seeds : 0, oracle: orc / n };
  }
  function comparePolicies(ds, S, D, ti, Qcold, Qphys) {
    const a = ds.i2, b = ds.N, st = D.rows[ti], out = [];
    const add = (name, res) => out.push({ name, ...res });
    add('Never seed', policyValue(ds, S, null, a, b, () => 0));
    add('Always seed', policyValue(ds, S, null, a, b, () => 1));
    add('Rule of thumb (Cden>0.6, Hmd>60)', policyValue(ds, S, null, a, b, t => (st[t].Cden > 0.6 && st[t].Hmd > 60) ? 1 : 0));
    add('Q-learning (no physics)', policyValue(ds, S, Qcold, a, b));
    add('PIB-RL (physics + Bellman)', policyValue(ds, S, Qphys, a, b));
    const orc = out[0].oracle; out.forEach(o => { o.pctOracle = orc > 0 ? 100 * o.value / orc : 0; });
    out.push({ name: 'Oracle (upper bound)', value: orc, seedRate: NaN, falseSeed: 0, oracle: orc, pctOracle: 100 });
    return out;
  }

  /* ----------------------------------------------------------- full pipeline */
  async function runPipeline(D, ti, ci, cfg, cb = {}) {
    const t0 = Date.now(), log = cb.log || (() => {}), nTrain = Math.floor((D.nDays - 1) * 0.7);
    log('Deriving humidity & cloud density (train-only statistics)'); derive(D, nTrain);
    log('Target-Control Regression, CUSUM, Mann-Kendall'); const T = tcr(D, ti, ci);
    log('Building dataset (70/15/15 chronological split)'); const ds = buildDataset(D, ti, ci, T, cfg);
    log('Physics pre-training: fitting Koren-Feingold phi(A,C,W)'); const phi = fitPhi(ds);
    log('Training physics-informed network'); const M = await trainMLP(ds, cfg, phi, cb.epoch);
    const tp = performance.now();
    const pv = predictRange(M, ds, ds.i1, ds.i2), pt = predictRange(M, ds, ds.i2, ds.N), pa = predictRange(M, ds, 0, ds.N), tPred = performance.now() - tp;
    const mPI = evalPred(pv, pt, ds.y, ds.i1, ds.i2, ds.N); mPI.ms = tPred;
    log('Training GBDT-lite baseline'); const G = trainGBDT(ds); const tg = performance.now();
    const gv = G.predict(ds.i1, ds.i2), gt = G.predict(ds.i2, ds.N); const mG = evalPred(gv, gt, ds.y, ds.i1, ds.i2, ds.N); mG.ms = performance.now() - tg;
    log('Bellman Q-learning (cold start vs physics prior)'); const S = makeStates(D, ti, ds);
    const cold = qlearn(ds, S, pa, cfg, false), phys = qlearn(ds, S, pa, cfg, true);
    const pol = comparePolicies(ds, S, D, ti, cold.Q, phys.Q);
    return { T, ds, phi, M, mPI, mG, G, S, cold, phys, pol, pt: Array.from(pt), gt: Array.from(gt), yt: Array.from(ds.y.slice(ds.i2, ds.N)), ms: Date.now() - t0 };
  }

  return { STATIONS, genData, parseCSV, derive, tcr, mannKendall, buildDataset, fitPhi, phiF, trainMLP, predictRange, mlpPredict, trainGBDT, evalPred, makeStates, stateOf, qlearn,
    policyValue, comparePolicies, runPipeline, monthly, psiPrior, deltaTrue, RL, BASE, ENG, sigm, clip, mean };
})();
if (typeof module !== 'undefined') module.exports = Core;
