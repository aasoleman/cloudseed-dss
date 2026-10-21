/* CloudSeed DSS UI */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const f = (x, d = 2) => (x == null || isNaN(x)) ? '–' : (+x).toFixed(d);
let D, R = null, lang = 'en', charts = {};
const TABS = [['overview', 'Overview', 'نظرة عامة'], ['setup', 'Data & Setup', 'البيانات والإعداد'], ['feat', 'Feature Engineering', 'هندسة الميزات'], ['model', 'PIB-RL Model', 'نموذج PIB-RL'],
  ['res', 'Results', 'النتائج'], ['dss', 'Decision Support', 'دعم القرار'], ['review', 'Review Mapping', 'مطابقة معايير التحكيم']];
const AR = {
  title: 'CloudSeed DSS — نظام دعم قرار لتلقيح السحب بالتعلم المعزز المعتمد على الفيزياء',
  ribbon: '<b>نموذج أولي بحثي</b> · بيانات اصطناعية ما لم يُرفع CSV · غير مخصص للاستخدام التشغيلي',
  h_demo: 'ابدأ من هنا: عرض تجريبي موجّه',
  p_demo: 'بنقرة واحدة تُولَّد البيانات الاصطناعية ويُشغَّل المسار كاملاً (نحو 10–60 ثانية) ثم تُفتح النتائج. بعدها يمكنك تصفح التبويبات ولوحة القرار التفاعلية.',
  demo: '▶ تشغيل العرض التجريبي',
  author: '<span class="lb">إعداد</span><span class="nm">د. علاء عبدالسلام العرود</span><span class="af">جامعة جدة</span>',
  sub: 'نموذج أولي بحثي لإطار R-PIBRL · النماذج التنبؤية الذكية الهجينة لتقييم تأثير تلقيح السحب',
  print: 'طباعة / PDF', run: '▶ تشغيل المسار', h_prob: 'مشكلة البحث',
  p_prob: 'تعتمد المناطق الجافة مثل الإمارات والسعودية على تلقيح السحب لزيادة الأمطار، لكن إثبات فعاليته وتوقيته صعب: فالإشارة صغيرة أمام التباين الطبيعي، والنماذج المعتمدة على البيانات فقط تتجاهل فيزياء الغلاف الجوي. يعرض هذا النموذج الأولي مساراً متكاملاً لدعم القرار: (1) كشف التغير المرتبط بالتلقيح في الأمطار مقارنة بمنطقة ضبط، (2) تعلّم الهطول بنماذج مقيّدة فيزيائياً، (3) التوصية بالوقت الذي يستحق فيه التلقيح كلفته.',
  f1: '7 محطات، يومياً 2000–2025 (بنية Meteostat)', f2: 'انحدار الهدف-الضبط، CUSUM، نقطة تغير Mann-Kendall', f3: 'معرفة فيزيائية مسبقة لتفاعل الهباء والسحب والهطول φ(A,C,W)', f4: 'Q-learning بقرارين تلقيح / عدم تلقيح مع تهيئة فيزيائية', f5: 'وحدة "ماذا لو" بتوصية ومستوى ثقة',
  h_obj: 'الأهداف', o1: 'تقدير التغير المرتبط بالتلقيح في الهطول بالانحدار بين منطقتي الهدف والضبط واختبارات نقطة التغير اللامعلمية.',
  o2: 'دمج فيزياء الهباء–السحب–الهطول في التعلم (خسارة فيزيائية + وكيل Bellman مهيأ فيزيائياً).', o3: 'المقارنة مع GBDT يعتمد على البيانات فقط وسياسات القاعدة التجريبية بمقاييس شفافة.', o4: 'توفير أداة تفاعلية "ماذا لو" لمخططي العمليات.',
  h_nat: 'الأولوية الوطنية', p_nat: 'الأمن المائي أولوية وطنية (رؤية 2030 والاستراتيجية الوطنية للمياه 2030). برامج تحفيز الأمطار نشطة في المنطقة، والتقييم المبني على الأدلة والتوقيت الأفضل يقللان العمليات المهدرة ويعززان الدليل العلمي.',
  p_warn: '<b>النطاق:</b> هذا نموذج أولي بحثي يعمل على <b>بيانات اصطناعية تشبه الإمارات</b> (أو ملف CSV ترفعه). وهو ليس نظاماً تشغيلياً للتنبؤ أو التلقيح.',
  h_data: 'البيانات', l_seed: 'بذرة العشوائية', l_enh: 'أثر التلقيح المحاكى في الأيام الملائمة (%)', regen: 'إعادة توليد البيانات', upl: 'رفع CSV (تجريبي)',
  csvhelp: 'أعمدة CSV: <bdi dir="ltr">station, date, tavg, tmin, tmax, prcp, wdir, wspd, pres, tsun</bdi> (اختياري: <bdi dir="ltr">aod</bdi>). محطتان على الأقل.', l_lam: 'وزن الفيزياء λ:', l_gam: 'معامل الخصم γ:',
  h_set: 'إعدادات التجربة', l_t: 'محطة الهدف (الملقَّحة)', l_c: 'محطة الضبط (غير الملقَّحة)', l_ep: 'دورات الشبكة', l_rl: 'دورات Q-learning',
  l_eng: 'استخدام الميزات المهندسة (بواقي الهدف-الضبط، مؤشر النظام، CUSUM)', l_fair: 'إعطاء GBDT نفس الميزات المشتقة/المهندسة (مقارنة عادلة)',
  h_prev: 'معاينة البيانات (محطة الهدف)', needrun: 'شغّل المسار أولاً.', h_dss: 'وحدة القرار "ماذا لو"',
  dsshelp: 'حدد الحالة الجوية الحالية. تقدّر الشبكة المدرَّبة الهطول، ويقارن وكيل Bellman بين التلقيح وعدمه. تعتمد الثقة على تكرار حالات مشابهة في التدريب.',
  h_rq: 'جواب سؤال نموذج التحكيم: ما مشكلة البحث التي سيحلها النموذج الأولي؟',
  p_rq: 'يوفر طريقة قابلة للتكرار وواعية بالفيزياء لـ (أ) كشف وتقدير التغير في الأمطار المرتبط بالتلقيح مقابل منطقة ضبط، و(ب) تحديد الحالات التي يُتوقع أن يفيد فيها التلقيح بدلاً من القواعد الثابتة أو التقييم الإحصائي بعد الحدث فقط.',
  h_map: 'مطابقة معايير نموذج تحكيم النماذج الأولية', h_lim: 'القيود وخارطة الطريق (مذكورة بصراحة)',
  disc: 'نموذج أولي بحثي · بيانات اصطناعية ما لم يُرفع CSV · غير مخصص للاستخدام التشغيلي.'
};
$$('[data-i]').forEach(e => e.dataset.en = e.innerHTML);
const L = (en, ar) => lang === 'ar' ? ar : en;

/* ---------- navigation ---------- */
$('#nav').innerHTML = TABS.map(([k]) => `<button data-k="${k}"></button>`).join('');
function labelNav() { $$('#nav button').forEach((b, i) => b.textContent = lang === 'ar' ? TABS[i][2] : TABS[i][1]); }
function go(k) { $$('section').forEach(s => s.classList.toggle('on', s.id === 's-' + k)); $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.k === k)); window.scrollTo(0, 0); }
$('#nav').onclick = e => { if (e.target.dataset.k) go(e.target.dataset.k); };
$('#lang').onclick = () => {
  lang = lang === 'en' ? 'ar' : 'en'; document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $('#lang').textContent = lang === 'ar' ? 'English' : 'العربية';
  $$('[data-i]').forEach(e => e.innerHTML = lang === 'ar' && AR[e.dataset.i] ? AR[e.dataset.i] : e.dataset.en);
  labelNav(); renderReview(); if (R) { renderAll(); }
};
labelNav(); go('overview');

/* ---------- charts ---------- */
function chart(id, type, data, opts = {}) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($('#' + id), { type, data, options: Object.assign({ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom' } } }, opts) });
}
const COL = { a: '#0b5c8e', b: '#0e8a8a', c: '#c0392b', d: '#b7791f', g: '#8896a5' };

/* ---------- data ---------- */
function loadData(d) {
  D = d; R = null; Core.derive(D, Math.floor((D.nDays - 1) * 0.7));
  const opts = D.names.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  $('#sel-t').innerHTML = opts; $('#sel-c').innerHTML = opts;
  $('#sel-t').value = D.seededIdx >= 0 ? D.seededIdx : 0; $('#sel-c').value = D.names.length > 5 ? 5 : 1;
  ['feat', 'model', 'res'].forEach(k => { $('#' + k).innerHTML = ''; $('#' + k + '-empty').style.display = 'block'; });
  renderData(); renderDSS();
}
function renderData() {
  const ti = +$('#sel-t').value, ci = +$('#sel-c').value, st = D.rows[ti], yrs = D.nDays / 365.25;
  const tot = st.reduce((s, r) => s + r.prcp, 0), wet = st.filter(r => r.prcp >= 1).length;
  $('#dstat').innerHTML = `<div class="grid g4" style="margin-top:8px"><div class="kpi"><b>${D.names.length}</b><span>stations</span></div><div class="kpi"><b>${D.nDays.toLocaleString()}</b><span>days / station</span></div>
    <div class="kpi"><b>${f(tot / yrs, 0)} mm</b><span>mean annual precip (target)</span></div><div class="kpi"><b>${f(wet / yrs, 1)}</b><span>wet days / year</span></div></div>
    <p style="font-size:12.5px;color:var(--mut)">${D.synthetic ? `Synthetic data: shared synoptic weather, station-specific climate; a ${f($('#c-enh').value, 0)}% rainfall enhancement is built into <b>${D.names[D.seededIdx]}</b> on favourable days from ${D.seedYear} so detection can be validated against known ground truth.` : 'User-supplied data (no ground truth for seeding effect).'}</p>`;
  const cols = ['tavg', 'tmin', 'tmax', 'prcp', 'wspd', 'wdir', 'pres', 'tsun', 'Hmd', 'Cden'];
  $('#dprev').innerHTML = `<table><tr><th>date</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>` + [0, 1, 2, 3, 4, 5, 6, 7].map(d => `<tr><td>${D.date[d][0]}-${String(D.date[d][1] + 1).padStart(2, '0')}-${String(new Date(Date.UTC(2000, 0, 1) + d * 864e5).getUTCDate()).padStart(2, '0')}</td>${cols.map(c => `<td class="n">${f(st[d][c], c === 'Cden' ? 2 : 1)}</td>`).join('')}</tr>`).join('') + '</table>';
  const mt = Core.monthly(D, ti), mc = Core.monthly(D, ci), y0 = D.date[0][0], lab = Array.from(mt, (_, m) => (y0 + Math.floor(m / 12)) + '-' + String(m % 12 + 1).padStart(2, '0'));
  chart('ch-month', 'line', { labels: lab, datasets: [{ label: 'Target: ' + D.names[ti], data: Array.from(mt), borderColor: COL.a, borderWidth: 1.3, pointRadius: 0 }, { label: 'Control: ' + D.names[ci], data: Array.from(mc), borderColor: COL.g, borderWidth: 1.3, pointRadius: 0 }] },
    { scales: { x: { ticks: { maxTicksLimit: 14 } }, y: { title: { display: true, text: 'Monthly precipitation (mm)' } } } });
}

/* ---------- run ---------- */
function cfgNow() { return { eng: $('#c-eng').checked, fair: $('#c-fair').checked, lambda: +$('#c-lam').value, gamma: +$('#c-gam').value, epochs: +$('#c-ep').value, rlEpochs: +$('#c-rl').value, seed: 3 }; }
let after = 'feat';
async function run() {
  const ti = +$('#sel-t').value, ci = +$('#sel-c').value;
  if (ti === ci) { alert('Target and control must differ.'); return; }
  $('#ov').style.display = 'flex'; $('#log').innerHTML = ''; $('#ov-b').style.width = '3%'; $('#runBtn').disabled = $('#runTop').disabled = true;
  await new Promise(r => setTimeout(r, 30));
  try {
    R = await Core.runPipeline(D, ti, ci, cfgNow(), {
      log: m => { $('#log').innerHTML += m + '<br>'; $('#log').scrollTop = 1e6; },
      epoch: async (e, n) => { $('#ov-b').style.width = (10 + 70 * e / n) + '%'; await new Promise(r => setTimeout(r, 0)); }
    });
    R.ti = ti; R.ci = ci; R.cfg = cfgNow(); $('#ov-b').style.width = '100%';
    renderAll(); go(after); after = 'feat';
  } catch (e) { console.error(e); alert('Pipeline error: ' + e.message); }
  $('#ov').style.display = 'none'; $('#runBtn').disabled = $('#runTop').disabled = false;
}
$('#runBtn').onclick = $('#runTop').onclick = run;
$('#demo').onclick = () => { after = 'res'; run(); };
$('#regen').onclick = () => loadData(Core.genData({ seed: +$('#c-seed').value || 7, enh: (+$('#c-enh').value || 0) / 100 }));
$('#csv').onchange = async e => { try { loadData(Core.parseCSV(await e.target.files[0].text())); } catch (x) { alert(x.message); } };
$('#sel-t').onchange = $('#sel-c').onchange = renderData;
$('#c-lam').oninput = e => $('#v-lam').textContent = (+e.target.value).toFixed(2); $('#c-gam').oninput = e => $('#v-gam').textContent = (+e.target.value).toFixed(2);

/* ---------- results rendering ---------- */
const kpi = (v, l) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`;
function renderAll() { renderFeat(); renderModel(); renderResults(); renderDSS(); renderReview(); }
function renderFeat() {
  const T = R.T, true_ = D.synthetic && R.ti === D.seededIdx;
  $('#feat-empty').style.display = 'none';
  $('#feat').innerHTML = `<div class="grid g4">${kpi(f(T.r2, 3), L('Target-Control R²', 'R² الهدف-الضبط'))}${kpi(f(T.beta, 3), L('slope β', 'الميل β'))}${kpi(T.cpLabel, L('CUSUM change point', 'نقطة تغير CUSUM'))}${kpi(f(T.pctShift, 1) + '%', L('mean shift after change point', 'تغير المتوسط بعد نقطة التغير'))}
    ${kpi(f(T.shiftT, 2), L('Welch t of residual shift', 'اختبار Welch لإزاحة البواقي'))}${kpi(f(T.mk.S, 0), 'Mann-Kendall S')}${kpi(f(T.mk.Z, 2), 'Mann-Kendall Z')}${kpi(T.mk.p < 0.001 ? '<0.001' : f(T.mk.p, 3), L('MK p-value', 'قيمة p لـ MK'))}</div>
    <div class="info" style="margin-top:14px">${true_ ? `<b>Validation against ground truth:</b> a ${f(D.enh * 100, 0)}% enhancement was built in from ${D.seedYear}-01 on favourable days. CUSUM located the change at <b>${T.cpLabel}</b> and Mann-Kendall on the residuals ${T.mk.p < 0.05 ? 'detects a significant monotonic trend (p ' + (T.mk.p < 0.001 ? '< 0.001' : '= ' + f(T.mk.p, 3)) + ')' : 'does not reach significance'}.` : 'Residual = target − (α + β·control). A positive, significant shift after the change point is consistent with enhancement, but is not proof of causation (see limitations).'}</div>
    <div class="grid g2"><div class="card"><h2>Target vs control (monthly precipitation)</h2><div class="ch"><canvas id="ch-sc"></canvas></div></div>
    <div class="card"><h2>CUSUM of regression residuals</h2><div class="ch"><canvas id="ch-cu"></canvas></div></div></div>
    <div class="card"><h2>Piecewise regression</h2><table><tr><th>Segment</th><th>α</th><th>β</th><th>R²</th><th>Mean residual (mm/month)</th></tr>
    <tr><td>Before ${T.cpLabel}</td><td class="n">${f(T.segPre.alpha)}</td><td class="n">${f(T.segPre.beta, 3)}</td><td class="n">${f(T.segPre.r2, 3)}</td><td class="n">${f(Core.mean(T.resid.slice(0, T.cp + 1)))}</td></tr>
    <tr><td>After</td><td class="n">${f(T.segPost.alpha)}</td><td class="n">${f(T.segPost.beta, 3)}</td><td class="n">${f(T.segPost.r2, 3)}</td><td class="n">${f(Core.mean(T.resid.slice(T.cp + 1)))}</td></tr></table></div>`;
  const xs = Array.from(T.control), mx = Math.max(...xs);
  chart('ch-sc', 'scatter', { datasets: [{ label: 'months', data: xs.map((x, i) => ({ x, y: T.target[i] })), backgroundColor: 'rgba(11,92,142,.45)', pointRadius: 3 },
    { label: 'fit', type: 'line', data: [{ x: 0, y: T.alpha }, { x: mx, y: T.alpha + T.beta * mx }], borderColor: COL.c, pointRadius: 0 }] },
    { scales: { x: { title: { display: true, text: 'Control (mm)' } }, y: { title: { display: true, text: 'Target (mm)' } } } });
  const lab = T.cusum.map((_, m) => (T.y0 + Math.floor(m / 12)) + '-' + String(m % 12 + 1).padStart(2, '0'));
  chart('ch-cu', 'line', { labels: lab, datasets: [{ label: 'CUSUM', data: T.cusum, borderColor: COL.a, pointRadius: 0, borderWidth: 1.6 },
    { label: 'change point', data: T.cusum.map((v, m) => m === T.cp ? v : null), showLine: false, pointRadius: 8, backgroundColor: COL.c, borderColor: COL.c }] }, { scales: { x: { ticks: { maxTicksLimit: 12 } } } });
}
function heat() {
  const S = R.S, Q = R.phys.Q, n = R.phys.n, w = +($('#hw') ? $('#hw').value : 1), rows = [];
  const lb = (e, i, u) => i === 0 ? `≤${f(e[0], u)}` : i === e.length ? `>${f(e[e.length - 1], u)}` : `${f(e[i - 1], u)}–${f(e[i], u)}`;
  for (let h = 4; h >= 0; h--) {
    let r = `<tr><th>Hmd ${lb(S.eh, h, 0)}%</th>`;
    for (let c = 0; c < 5; c++) {
      const s = (h * 5 + c) * 3 + w, d = Q[s * 2 + 1] - Q[s * 2], seen = S.cell[s].n > 0;
      const bg = !seen ? '#eceff2' : d > 0 ? `rgba(27,138,75,${Math.min(.85, .15 + d / 3)})` : `rgba(192,57,43,${Math.min(.7, .1 + -d / 3)})`;
      r += `<td style="background:${bg}">${seen ? f(d, 2) : '–'}</td>`;
    } rows.push(r + '</tr>');
  }
  return `<table class="heat">${rows.join('')}<tr><th></th>${[0, 1, 2, 3, 4].map(c => `<th>Cden ${lb(S.ec, c, 2)}</th>`).join('')}</tr></table>`;
}
function renderModel() {
  $('#model-empty').style.display = 'none';
  const p = R.phi, M = R.M;
  $('#model').innerHTML = `<div class="grid g2"><div class="card"><h2>Stage 1 · Physics pre-training</h2>
    <p>Koren-Feingold style prior fitted on the training period: <b>φ(A,C,W) = α·A<sup>β</sup>·C<sup>γ</sup>·exp(δ·W)</b></p>
    <table><tr><th>α</th><th>β (aerosol)</th><th>γ (cloud)</th><th>δ (wind)</th><th>prior MSE</th></tr><tr><td class="n">${f(p.a, 3)}</td><td class="n">${f(p.b, 3)}</td><td class="n">${f(p.g, 3)}</td><td class="n">${f(p.d, 3)}</td><td class="n">${f(p.mse, 2)}</td></tr></table>
    <p style="font-size:12.5px;color:var(--mut)">Total loss = MSE(P<sub>obs</sub>, P<sub>pred</sub>) + λ·mean(P<sub>pred</sub> − φ)², λ = ${f(R.cfg.lambda, 2)}. Aerosol A is an AOD proxy (synthetic or uploaded; constant 0.3 if absent).</p>
    <div class="ch"><canvas id="ch-loss"></canvas></div></div>
    <div class="card"><h2>Stage 2 · Bellman fine-tuning</h2>
    <p>State = (humidity bin, cloud-density bin, wind bin); actions Seed / NoSeed; reward R = α·ΔP − β·E − cost·1[Seed]; Q(s,a) ← r + γ·max Q(s′,a′), γ = ${f(R.cfg.gamma, 2)}.</p>
    <div class="ch"><canvas id="ch-q"></canvas></div></div></div>
    <div class="card"><h2>Learned policy · Q(Seed) − Q(NoSeed)</h2>
    <label>Wind class</label><select id="hw" style="max-width:240px"><option value="0">Light</option><option value="1" selected>Moderate</option><option value="2">Strong</option></select>
    <div id="heat" style="margin-top:8px;overflow:auto">${heat()}</div>
    <p style="font-size:12.5px;color:var(--mut)">Green = seeding expected to pay off (net of cost). Grey = state never seen in training.</p></div>`;
  $('#hw').onchange = () => $('#heat').innerHTML = heat();
  chart('ch-loss', 'line', { labels: M.hist.map(h => h.ep), datasets: [{ label: 'data loss (train MSE)', data: M.hist.map(h => h.data), borderColor: COL.a, pointRadius: 0 }, { label: 'physics loss', data: M.hist.map(h => h.phys), borderColor: COL.b, pointRadius: 0 }, { label: 'validation RMSE', data: M.hist.map(h => h.valRmse), borderColor: COL.d, pointRadius: 0 }] }, { scales: { x: { title: { display: true, text: 'epoch' } } } });
  chart('ch-q', 'line', { labels: R.cold.curve.map((_, i) => i), datasets: [{ label: 'Q-learning, no physics', data: R.cold.curve, borderColor: COL.g, pointRadius: 2 }, { label: 'PIB-RL (physics-initialised)', data: R.phys.curve, borderColor: COL.b, pointRadius: 2 }] },
    { scales: { x: { title: { display: true, text: 'training epoch (0 = before training)' } }, y: { title: { display: true, text: 'validation value (mm-equivalent / day)' } } } });
}
function renderResults() {
  $('#res-empty').style.display = 'none';
  const a = R.mPI, b = R.mG, pol = R.pol;
  const row = (n, m) => `<tr><td>${n}</td><td class="n">${f(m.rmse, 3)}</td><td class="n">${f(m.mae, 3)}</td><td class="n">${f(m.r2, 3)}</td><td class="n">${f(m.acc * 100, 1)}%</td><td class="n">${f(m.fpr * 100, 1)}%</td><td class="n">${f(m.tpr * 100, 1)}%</td><td class="n">${f(m.ms, 1)}</td></tr>`;
  $('#res').innerHTML = `<div class="card"><h2>Rainfall estimation · held-out test period (last 15% of days)</h2>
    <table><tr><th>Model</th><th>RMSE (mm)</th><th>MAE (mm)</th><th>R²</th><th>Wet-day accuracy</th><th>False-positive rate</th><th>Recall</th><th>Predict ms</th></tr>${row('R-PIBRL network (physics-informed)', a)}${row('GBDT-lite baseline (depth-1 boosting)', b)}</table>
    <div class="note">Daily rainfall is a rare event, so R² is low for every model and RMSE barely separates them. Wet-day (≥1 mm) detection uses a threshold chosen on the validation period (Youden index), then applied unchanged to the test period. Results come from one seed; they are indicative, not a significance claim.</div>
    <div class="grid g2"><div class="ch"><canvas id="ch-cls"></canvas></div><div class="ch"><canvas id="ch-pol"></canvas></div></div></div>
    <div class="card"><h2>Seeding decision policies · test period</h2>
    <table><tr><th>Policy</th><th>Net value (mm-eq/day)</th><th>% of oracle</th><th>Seeding rate</th><th>False-seed rate</th></tr>${pol.map(p => `<tr><td>${p.name}</td><td class="n">${f(p.value, 3)}</td><td class="n">${f(p.pctOracle, 0)}%</td><td class="n">${isNaN(p.seedRate) ? '–' : f(p.seedRate * 100, 1) + '%'}</td><td class="n">${isNaN(p.seedRate) ? '–' : f(p.falseSeed * 100, 1) + '%'}</td></tr>`).join('')}</table>
    <div class="note">Net value = α·ΔP − cost on days the policy seeds, evaluated against the simulator's hidden enhancement function (the agent never sees it). False-seed = seeded when net value was negative. In this simulator the action does not alter next-day weather, so γ matters little here; it is kept for fidelity to the Bellman formulation and for future operational data.</div></div>`;
  chart('ch-cls', 'bar', { labels: ['Accuracy', 'False-positive rate', 'Recall'], datasets: [{ label: 'R-PIBRL', data: [a.acc, a.fpr, a.tpr].map(x => x * 100), backgroundColor: COL.b }, { label: 'GBDT-lite', data: [b.acc, b.fpr, b.tpr].map(x => x * 100), backgroundColor: COL.g }] }, { scales: { y: { title: { display: true, text: '%' }, beginAtZero: true } } });
  chart('ch-pol', 'bar', { labels: pol.map(p => p.name.split(' (')[0]), datasets: [{ label: 'Net value (mm-eq/day)', data: pol.map(p => p.value), backgroundColor: pol.map(p => p.value < 0 ? COL.c : p.name.startsWith('PIB') ? COL.b : COL.g) }] }, { plugins: { legend: { display: false } } });
}

/* ---------- decision support ---------- */
const SL = [['tavg', 'Tavg °C', 10, 45, 1, 24], ['hmd', 'Humidity %', 10, 100, 1, 65], ['cden', 'Cloud density', 0, 1, 0.01, 0.6], ['wspd', 'Wind km/h', 0, 40, 1, 12], ['pres', 'Pressure hPa', 995, 1025, 0.5, 1008], ['aod', 'Aerosol (AOD)', 0.05, 0.9, 0.01, 0.3], ['prev', 'Rain yesterday mm', 0, 30, 0.5, 0], ['mon', 'Month', 1, 12, 1, 1]];
function renderDSS() {
  if (!$('#dss-in').children.length) {
    $('#dss-in').innerHTML = SL.map(([k, n, a, b, s, v]) => `<div><label>${n}: <b id="o-${k}">${v}</b></label><input type="range" id="d-${k}" min="${a}" max="${b}" step="${s}" value="${v}"></div>`).join('');
    SL.forEach(([k]) => $('#d-' + k).oninput = e => { $('#o-' + k).textContent = e.target.value; renderDSS(); });
  }
  if (!R) { $('#dss-out').innerHTML = '<div class="info">Run the pipeline first.</div>'; return; }
  const v = k => +$('#d-' + k).value, ds = R.ds, doy = (v('mon') - 0.5) * 30.4, da = 2 * Math.PI * doy / 365;
  const raw = [v('tavg'), v('prev'), v('wspd'), 1, 0, v('pres'), v('hmd'), v('cden'), v('aod'), Math.sin(da), Math.cos(da)];
  if (ds.useEng) raw.push(v('prev'), 0, 1, R.T.cusum[R.T.cusum.length - 1] / 100);
  const x = new Float64Array(ds.nf); raw.forEach((q, k) => x[k] = (q - ds.mu[k]) / ds.sd[k]);
  const pNat = Math.max(0, Core.mlpPredict(R.M, x, 0)), ph = Core.phiF(R.phi, v('aod'), v('cden'), v('wspd') / 20);
  const s = Core.stateOf(R.S, v('hmd'), v('cden'), v('wspd')), Q = R.phys.Q, n = R.phys.n, dq = Q[s * 2 + 1] - Q[s * 2], dP = (dq + Core.RL.cost) / Core.RL.alpha, seen = n[s * 2] + n[s * 2 + 1];
  const conf = seen > 400 ? 'High' : seen > 80 ? 'Medium' : 'Low';
  $('#dss-out').innerHTML = `<div class="rec ${dq > 0 ? 's' : 'n'}">${dq > 0 ? L('☁ SEED', '☁ يُنصح بالتلقيح') : L('⛔ NO SEED', '⛔ لا تلقيح')}</div>
    <div class="grid g4" style="margin-top:12px">${kpi(f(dq, 2), 'Q(Seed) − Q(NoSeed)')}${kpi(f(Math.max(dP, 0), 2) + ' mm', L('expected enhancement ΔP', 'الزيادة المتوقعة ΔP'))}${kpi(f(pNat, 2) + ' mm', L('natural rain estimate', 'تقدير المطر الطبيعي'))}${kpi(f(ph, 2) + ' mm', L('physics prior φ', 'المعرفة الفيزيائية φ'))}</div>
    <p style="margin-top:10px">Confidence: <span class="badge" style="background:${conf === 'High' ? '#e3f5ea' : conf === 'Medium' ? '#fff3d6' : '#fde4e1'}">${conf}</span> <span style="color:var(--mut);font-size:12.5px">(${seen} similar training days; seeding cost = ${Core.RL.cost} mm-eq)</span></p>
    <div class="note">Decision aid for research use only. A <b>Low</b> confidence rating means the state was rarely observed; do not rely on the recommendation.</div>`;
}

/* ---------- review mapping ---------- */
function renderReview() {
  const rows = [
    ['The research topic is consistent with national priorities', 'يتوافق موضوع البحث مع الأولويات الوطنية', 'Overview · Water security (Vision 2030, National Water Strategy 2030)', 'Regional rain-enhancement programmes; motivation and scope stated.'],
    ['Research objectives are clearly stated', 'وضوح أهداف البحث', 'Overview · Objectives', 'Four measurable objectives, each tied to a pipeline stage and a result table.'],
    ['The theory behind the prototype is scientifically sound', 'النظرية الأساسية سليمة علمياً', 'Feature Engineering · PIB-RL Model', 'Target-control design, CUSUM and Mann-Kendall (non-parametric); Koren-Feingold aerosol–cloud prior; Bellman equation. Detection is validated against a known built-in effect.'],
    ['Adequacy of the literature review', 'كفاية المسح الأدبي', 'Published paper (Expert Systems 2026), Sections 1–2', 'Covers seeding evaluation, ML weather prediction, PINNs and the research gap.'],
    ['The prototype will achieve the research objectives', 'عمل النموذج الأولي سيحقق الأهداف', 'Results', 'End-to-end run with held-out test metrics, baselines and policy comparison.'],
    ['Industrial applicability', 'إمكانية التطبيق على المستوى الصناعي', 'Decision Support · CSV upload', 'What-if console and station-data upload; roadmap: radar/satellite inputs and operational data integration.'],
    ['Steps for creating the prototype are clear and logical', 'وضوح ومنطقية الخطوات العملية', 'Overview flow · Data & Setup', 'Five numbered stages; every setting is exposed and the run log is shown.'],
    ['Contribution to solving the research problem', 'مدى المساهمة في حل مشكلة البحث', 'Results · Policy table', 'Quantifies change vs control and compares seeding policies on net value and false-seed rate.'],
    ['Practical feasibility', 'الجدوى العملية', 'Whole prototype', 'Runs in a browser in about a minute on a laptop; no GPU or server.'],
    ['Current relevance', 'الاهتمام بالموضوع حالياً', 'Overview', 'Active topic: physics-informed ML and AI for weather modification.']];
  $('#map').innerHTML = `<tr><th>${L('Criterion', 'المعيار')}</th><th>${L('Where in the prototype', 'موضعه في النموذج')}</th><th>${L('Evidence', 'الدليل')}</th></tr>` + rows.map(r => `<tr><td>${lang === 'ar' ? r[1] : r[0]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('');
  $('#lim').innerHTML = ['Synthetic data by default: station weather archives contain no seeding-event records, so seeding labels and the effect size are simulated. Real validation needs operator logs.',
    'Aerosol concentration is a proxy (synthetic/constant); real validation needs AOD from satellite or ground sensors.',
    'Humidity and cloud density are approximations (Magnus formula, sunshine and pressure deficit), as in the paper.',
    'Daily rainfall is rarely predictable from surface variables; the value of the system lies in change detection and decision support, not in point forecasts.',
    'Q-learning uses a discretised state and assumes the action does not change next-day weather; the continuous Bellman network from the paper is future work.',
    'Change-point detection indicates association, not causation; operational claims require randomised or well-controlled experiments.'].map(x => `<li>${x}</li>`).join('');
}

loadData(Core.genData({ seed: 7, enh: 0.25 }));
renderReview();
