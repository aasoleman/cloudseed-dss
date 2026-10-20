# Prototype Documentation Report / تقرير توثيق النموذج الأولي

**Title / العنوان:** CloudSeed DSS — Physics-Informed Reinforcement-Learning Decision Support for Cloud Seeding Evaluation
**Project / المشروع:** Hybrid Intelligent Predictive Models Associated to Efficient Evaluation of Cloud Seeding's Impact — grant UJ-24-SUTU-20746, University of Jeddah
**Principal investigator / الباحث الرئيس:** Dr. Ala Abdulsalam Alarood
**Related publication / البحث المرتبط:** Alarood et al., "A Physics-Informed Reinforcement Learning Framework for Predictive Evaluation of Cloud Seeding Effectiveness", *Expert Systems*, 2026; 43:e70365, https://doi.org/10.1111/exsy.70365
**Version / الإصدار:** 1.0 (research prototype / نموذج أولي بحثي)

---

## 1. Research problem / مشكلة البحث

**EN.** Cloud seeding is used in arid regions to enhance rainfall, but its effect is small relative to natural variability, and evaluation is usually statistical and post-event. Purely data-driven models ignore aerosol–cloud–precipitation physics and give no guidance on *when* seeding is worth its cost. The prototype demonstrates a reproducible, physics-aware pipeline that (a) detects and quantifies seeding-related change against a control region and (b) recommends seeding decisions state by state.

**AR.** يُستخدم تلقيح السحب في المناطق الجافة لزيادة الأمطار، لكن أثره صغير مقارنة بالتباين الطبيعي، وتقييمه عادةً إحصائي وبعد وقوع الحدث. والنماذج المعتمدة على البيانات وحدها تتجاهل فيزياء الهباء والسحب والهطول ولا تُرشد إلى وقت التلقيح الذي يستحق كلفته. يعرض النموذج الأولي مساراً قابلاً للتكرار وواعياً بالفيزياء: (أ) يكشف ويقدّر التغير المرتبط بالتلقيح مقابل منطقة ضبط، و(ب) يوصي بقرار التلقيح لكل حالة جوية.

## 2. Objectives / الأهداف

1. Quantify seeding-related precipitation change with target/control regression and non-parametric change-point tests. / تقدير التغير المرتبط بالتلقيح.
2. Embed aerosol–cloud–precipitation physics in learning. / دمج الفيزياء في التعلم.
3. Compare against a data-only baseline and simple policies with transparent metrics. / مقارنة شفافة مع خط أساس وسياسات بسيطة.
4. Provide an interactive what-if tool for planners. / أداة تفاعلية «ماذا لو».

## 3. System design / تصميم النظام

| Stage | Method | Code (`core.js`) |
|---|---|---|
| Data | 7 stations, 2000–2025 daily, shared synoptic weather + station climate; simulated seeding of one station from 2012 on favourable days | `genData`, `parseCSV` |
| Derived variables | Humidity: Magnus formula with dew point ≈ Tmin − 1 °C. Cloud density: 0.6·sunshine deficit + 0.4·pressure deficit/3, month baselines and min-max scaling from training days only | `derive` |
| Target-Control Regression | OLS of monthly target on control precipitation, residuals, piecewise fit around the change point | `tcr` |
| Change point | CUSUM of residuals, maximum absolute value; Welch t on pre/post residual means | `tcr` |
| Trend test | Mann-Kendall S, Var(S)=n(n−1)(2n+5)/18, Z with continuity correction, two-sided p (no tie correction) | `mannKendall` |
| Physics prior | φ(A,C,W)=α·A^β·(C+0.02)^γ·exp(δ·W), parameters fitted by Adam on the training period | `fitPhi` |
| Network | 1 hidden layer, 16 tanh units, Adam (lr 0.003, batch 64); loss = MSE + λ·mean(P_pred−φ)² | `trainMLP` |
| Baseline | GBDT-lite: 300 depth-1 boosting rounds, learning rate 0.1, 24 quantile bins | `trainGBDT` |
| Bellman agent | Tabular Q-learning, 75 states (5 humidity × 5 cloud × 3 wind quantile bins), ε-greedy, γ configurable; Q(s,a) ← r + γ·max Q(s′,a′) | `qlearn` |
| Reward | R = α·ΔP − β·E − cost·1[Seed], α=1, β=0.2, cost=0.8 mm-equivalent; E = |P_pred − P_obs| | `RL`, `qlearn` |
| Physics-initialised agent | Q(Seed) initialised from an approximate analytic prior ψ(H,C,W); compared with zero initialisation | `qlearn` |

**Prediction task.** Same-day precipitation at the target station from the day's atmospheric state and the previous day's precipitation (the day's own precipitation is never an input). Chronological split 70/15/15 (train/validation/test); inputs are standardised with training statistics.

**Engineered features** (optional): previous-day control precipitation, previous-day target-control residual, regime flag (after change point), previous-month CUSUM level.

## 4. Simulator and ground truth / المحاكي والحقيقة المرجعية

- Rain occurrence and intensity share a regional random draw across stations, so target and control are strongly correlated (monthly R² ≈ 0.76 in the default run).
- Dubai receives a +25 % enhancement (adjustable) on rainy days with high cloud index from 2012-01.
- The seeding decision is evaluated against a **hidden** enhancement function ΔP(c, h, wind) the agent never observes; the physics prior is a deliberately approximate version of it, so fine-tuning matters.
- In this simulator the action does not alter next-day weather; γ is therefore kept for fidelity to the Bellman formulation but has little effect.

## 5. How to run / التشغيل

See `README.md`. Default settings: seed 7, effect 25 %, target Dubai, control Ras Al Khaimah, λ = 0.3, γ = 0.9, 25 network epochs, 15 Q-learning epochs, engineered features on, baseline given the same features.

## 6. Results of the default run / نتائج التشغيل الافتراضي

Single run, seed 7, default settings; numbers are indicative and vary with settings and seeds.

**Change detection** (target = Dubai, control = Ras Al Khaimah)

| Quantity | Value |
|---|---|
| Target-control R² | 0.760 (β = 0.830) |
| CUSUM change point | 2014-01 (built-in effect starts 2012-01) |
| Mean residual shift | +22.4 % of pre-change mean; Welch t = 2.72 |
| Mann-Kendall | S = 6005, Z = 3.26, p ≈ 0.001 |

The change is detected with the correct direction and significance but placed about two years late.

**Rainfall estimation, test period (last 15 % of days)**

| Model | RMSE (mm) | MAE (mm) | R² | Wet-day accuracy | False-positive rate | Recall |
|---|---|---|---|---|---|---|
| R-PIBRL network | 2.920 | 0.841 | 0.023 | 82.7 % | 16.0 % | 50.9 % |
| GBDT-lite | 2.901 | 0.716 | 0.035 | 70.1 % | 29.6 % | 63.6 % |

Wet day = ≥ 1 mm; the decision threshold is chosen on the validation period (Youden index) and applied unchanged to the test period. Daily rainfall is a rare event, so R² is low for every model and RMSE does not separate them. The higher accuracy and lower false-positive rate of the physics-informed network come with lower recall (a different operating point), and the baseline has lower MAE; neither model dominates.

**Seeding policies, test period** (net value in mm-equivalent per day)

| Policy | Net value | % of oracle | Seeding rate | False-seed rate |
|---|---|---|---|---|
| Never seed | 0.000 | 0 % | 0 % | – |
| Always seed | −0.305 | −145 % | 100 % | 72.8 % |
| Rule of thumb (Cden>0.6, Hmd>60) | 0.167 | 79 % | 19.3 % | 5.1 % |
| Q-learning, no physics | 0.168 | 80 % | 27.4 % | 18.5 % |
| PIB-RL (physics + Bellman) | 0.168 | 80 % | 25.8 % | 15.8 % |
| Oracle | 0.210 | 100 % | – | – |

Learned policies match the simple rule on value and seed more often (higher false-seed rate). The measurable benefit of the physics prior is faster learning: validation value is about 0.18 before any training versus 0 for the cold start, and both converge to about 0.20 within a few epochs.

## 7. Mapping to the Prototype Review Form / مطابقة نموذج التحكيم

| Criterion / المعيار | Evidence / الدليل |
|---|---|
| National priorities / الأولويات الوطنية | Water security (Vision 2030, National Water Strategy 2030) — Overview tab |
| Clear objectives / وضوح الأهداف | §2; Overview tab |
| Scientifically sound theory / سلامة النظرية | §3: target-control design, CUSUM, Mann-Kendall, Koren-Feingold prior, Bellman equation; detection validated against known built-in effect |
| Literature review / المسح الأدبي | Published paper, Sections 1–2 |
| Achieves objectives / تحقيق الأهداف | §6 results with held-out test metrics and baselines |
| Industrial applicability / التطبيق الصناعي | What-if console, CSV upload; roadmap in §9 |
| Clear and logical steps / وضوح الخطوات | §3; run log in the interface |
| Contribution to the problem / المساهمة | Change detection and policy comparison (§6) |
| Practical feasibility / الجدوى | Runs in a browser in under a minute, no server or GPU |
| Current relevance / الاهتمام الحالي | Physics-informed ML for weather modification |

## 8. Limitations / القيود

1. **Synthetic data.** Station weather archives (e.g. Meteostat) contain no seeding-event records, so seeding labels and effect size are simulated; the prototype shows method behaviour, not real-world efficacy.
2. **Aerosol** is a proxy (synthetic, or constant 0.3 for uploaded data); the physics prior is only as good as that input.
3. **Derived variables** (humidity, cloud density) are approximations.
4. **Rain predictability.** Same-day precipitation is rarely predictable from surface variables; value lies in change detection and decision support.
5. **Policy gain.** In this simulator the learned policy does not beat a simple rule on net value.
6. **Simplified RL.** Discretised states; the action does not influence the next state; the continuous Bellman network of the paper is not reproduced. These results are not a reproduction of the accuracy figures reported in the paper.
7. **Association, not causation.** Change-point detection against a control region does not establish causation.
8. **Single seed**, no confidence intervals; the CSV upload path was tested only with a Meteostat-style file generated from the simulator (not real exports); the Arabic interface was checked visually in the main tabs (static text and key figures are translated; method evidence tables and some chart labels remain in English); charts need internet access (CDN).

## 9. Roadmap / خارطة الطريق

- Replace synthetic data with Meteostat station data and operator seeding logs; add satellite AOD and radar.
- Multi-seed evaluation with confidence intervals; ablations for λ and engineered features (controls already exposed).
- Continuous-state Bellman network (DQN) with action-dependent transitions.
- Offline bundling of Chart.js; automated tests for `core.js`.

## 10. Reproducibility / قابلية التكرار

All randomness is seeded (data seed in the interface; network and Q-learning seeds fixed). `core.js` can be executed in Node with `require('./core.js')`; `Core.runPipeline(Core.genData(), 1, 5, cfg)` reproduces the pipeline without the interface.

## 11. Acknowledgement / الشكر

This work was funded by the University of Jeddah, Jeddah, Saudi Arabia, under grant No. (UJ-24-SUTU-20746). The authors, therefore, thank the University of Jeddah for its technical and financial support.
