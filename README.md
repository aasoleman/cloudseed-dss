# CloudSeed DSS — R-PIBRL Research Prototype
# نموذج CloudSeed DSS الأولي — إطار R-PIBRL

**EN** — An interactive, browser-based research prototype of the *Regression-based Physics-Informed Bellman Reinforcement Learning (R-PIBRL)* framework for evaluating cloud-seeding effectiveness and supporting seeding decisions. Project: *Hybrid Intelligent Predictive Models Associated to Efficient Evaluation of Cloud Seeding's Impact* (grant UJ-24-SUTU-20746, University of Jeddah).

**AR** — نموذج أولي بحثي تفاعلي يعمل في المتصفح لإطار R-PIBRL (التعلم المعزز لبيلمان المعتمد على الفيزياء والانحدار) لتقييم فعالية تلقيح السحب ودعم قرار التلقيح. المشروع: «النماذج التنبؤية الذكية الهجينة المرتبطة بالتقييم الفعال لتأثير تلقيح السحب» (المنحة UJ-24-SUTU-20746، جامعة جدة).

> **Status / الحالة:** research prototype on **synthetic** UAE-like data (or a CSV you upload). Not an operational forecasting or seeding system.
> نموذج أولي بحثي على **بيانات اصطناعية** تشبه الإمارات (أو ملف CSV ترفعه). ليس نظاماً تشغيلياً للتنبؤ أو التلقيح.

---

## 1. Quick start / التشغيل السريع

Requirements: any modern browser; internet access (Chart.js is loaded from cdnjs). No installation.
المتطلبات: متصفح حديث واتصال بالإنترنت (مكتبة Chart.js تُحمَّل من cdnjs). لا حاجة لتثبيت أي شيء.

**Option A — open the file / الخيار أ:** double-click `index.html`.

**Option B — local server / الخيار ب:**

```bash
python -m http.server 8765
```

then open `http://localhost:8765` from inside this folder. / ثم افتح `http://localhost:8765` من داخل هذا المجلد.

Then: tab **Data & Setup** → **Run pipeline** (about 10–60 s depending on the machine). / ثم: تبويب «البيانات والإعداد» ← «تشغيل المسار».

Use the **العربية / English** button for the interface language and **Print / PDF** to save a copy of the results.

## 2. Files / الملفات

| File | Purpose / الغرض |
|---|---|
| `index.html` | Interface and styles / الواجهة والتنسيق |
| `core.js` | Numerical core, no DOM (testable in Node) / النواة الحسابية |
| `app.js` | UI, charts, bilingual text / الواجهة والرسوم والنصوص |
| `README.md` | This file / هذا الملف |
| `REPORT.md` | Prototype documentation report / تقرير التوثيق |

`core.js` exports its API via `module.exports`, so it can be run in Node (`require('./core.js')`).

## 3. Pipeline / مراحل المسار

1. **Data** — 7 synthetic stations, daily 2000–2025, Meteostat-style fields (`tavg, tmin, tmax, prcp, wdir, wspd, pres, tsun`) plus an aerosol proxy (`aod`).
2. **Feature engineering** — Target-Control Regression on monthly precipitation, CUSUM change point, Mann-Kendall trend test on the residuals; derived humidity (Magnus formula) and cloud density (sunshine and pressure deficit, train-only statistics).
3. **Physics pre-training** — fit φ(A,C,W) = α·A^β·C^γ·exp(δ·W) (Koren-Feingold style) on the training period.
4. **Physics-informed network** — one-hidden-layer network (16 tanh units, Adam), loss = MSE + λ·mean(P_pred − φ)².
5. **Bellman fine-tuning** — tabular Q-learning, state = (humidity, cloud-density, wind) bins, actions Seed/NoSeed, reward R = α·ΔP − β·E − cost; Q initialised from a physics prior, compared with a cold start.
6. **Evaluation** — chronological 70/15/15 split; baseline = GBDT-lite (depth-1 boosting); policies compared against never/always/rule-of-thumb/oracle.
7. **Decision support** — what-if sliders → recommendation, expected enhancement, confidence.

## 4. CSV upload (beta) / رفع CSV (تجريبي)

Header row required; columns (case-insensitive): `station, date, tavg, tmin, tmax, prcp, wdir, wspd, pres, tsun` (optional `aod`). Dates `YYYY-MM-DD`, at least two stations; the first station's dates define the calendar and gaps in other stations are filled by carrying the last value forward. For uploaded data there is no ground-truth seeding effect, and the simulator's reward function uses the observed cloud density and humidity as stand-ins for the hidden state. Missing values (empty cells) in `wdir, wspd, pres, tsun` carry the last known value forward. Tested with a Meteostat-style file (extra `snow`/`wpgt` columns, empty cells, three stations) generated from the simulator; **not yet tested with real Meteostat exports.**

## 5. Known limitations / القيود المعروفة

See `REPORT.md` §8. In short: synthetic data and simulated seeding labels; aerosol is a proxy; daily rain is hard to predict (low R² for all models); policy gains over a simple rule are small; discretised Q-learning (not the continuous Bellman network of the paper).

## 6. Acknowledgement / الشكر

This work was funded by the University of Jeddah, Jeddah, Saudi Arabia, under grant No. (UJ-24-SUTU-20746). The authors, therefore, thank the University of Jeddah for its technical and financial support.
