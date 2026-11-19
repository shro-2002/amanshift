# AmanShift — two-minute demonstration script

Record at 1440×900 in a fresh browser profile (no cached service worker). Open the live demo once before recording to wake the free Render instance (first load after idle can take about a minute). Every on-screen number below comes from the running scenario or `eval/out`; if the live state differs on the day, say what the screen shows.

## Before recording
1. Open `https://amanshift.onrender.com/tour` and press **Start the shift** once, then **Restart** so the session is clean.
2. Open a second tab at `/worker` (390×844 device emulation for the phone shot).
3. Close notifications; hide the bookmarks bar.

## Sequence

| Time | Screen and action | Voice-over |
|---|---|---|
| 0:00–0:10 | Website `/` hero, slow scroll to the product preview | "Every worker deserves to return home safely. Heat warnings tell supervisors to rest crews in cool areas. But what if the cooling cabin is broken?" |
| 0:10–0:28 | `/tour` → **Start the shift**. Hold on the protection briefing, metrics and site plan | "AmanShift combines yesterday's day-ahead forecast for Abu Dhabi with each crew's workload, clothing and acclimatization, and with the shade, cooling and water actually confirmed on site. It applies NIOSH limits, Abu Dhabi's Thermal Work Limit rules and the midday break, and gives one protective action per crew." |
| 0:28–0:48 | **Next chapter → Report the outage**. Point at the briefing headline, then **Next chapter → Inspect the outage** (drawer) | "The central cooled rest cabin fails. The briefing updates at once: fourteen workers in two crews now have no rest area within walking distance. The old plan is marked as previous and not in effect — it can't be mistaken for a current instruction." |
| 0:48–1:05 | **Next chapter → Generate revised plan**, then **Next chapter → Re-submit previous arrangement** | "The planner reassigns what it can and stops what it cannot protect — and says so. A separately implemented policy checker re-checks every plan. When we try to keep the old schedule, it is rejected, with the rules it breaks." |
| 1:05–1:22 | **Next chapter → Disconnect the network**; switch to the worker tab, tap **العربية**, then **বাংলা** | "The network drops. Each worker sees one instruction, pictograms first, in their language — and it only ever gets stricter, until it holds work if devices stay offline." |
| 1:22–1:45 | **Open technical validation**; scroll forecast skill and property tests | "We test that fail-safe property on nineteen thousand generated cases with zero failures, and score day-ahead warnings against real airport observations from a held-out summer: 99 percent of work-rest hours detected, with an under-warning rate of 3.7 percent." |
| 1:45–2:00 | Website privacy section, then the GitHub repository | "No names, no tracking, no biometrics, no disciplinary use. AmanShift is decision support, not a medical device — validated in simulation and against historical weather, and ready for a field pilot." |

## Wording guardrails
- Say "decision intelligence" or "decision support"; never "AI-powered", "safe to work", "cleared" or "authorized".
- Say "estimated" heat stress; never "measured WBGT".
- Do not claim prevented illnesses, clinical validation, customers or partners.
- Numbers to quote (from `eval/out/report.md`, clean 2026 holdout, primary profile): POD 99.0 %, FAR 7.5 %, under-warning 3.7 %; property tests 19,000 cases, 0 failures; checker mutation kill rate 100 %, 0 safety-critical survivors.
