# Data sources and licences

| Dataset | Files | Use | Licence / terms | Notes |
|---|---|---|---|---|
| Open-Meteo Previous Runs API, `*_previous_day1` hourly, lat 24.433 lon 54.651, 1 Jun–30 Sep 2022–2026 | `cache/openmeteo_prev_day1_YYYY.csv` | Day-ahead forecast (HIST-FCST): estimated WBGT, evaluation, demo replay | CC BY 4.0 (data); free API for non-commercial use. Attribution: "Weather data by Open-Meteo.com" | 2022–2023 contain only air temperature (other variables null) and are excluded from WBGT work |
| Iowa Environmental Mesonet ASOS archive, station OMAA (Abu Dhabi Intl), 1 Jun–1 Oct 2022–2026 | `cache/iem_omaa_YYYY.csv` | Observed T, RH, wind (REAL-OBS) for the evaluation reference | Public archive; cite Iowa Environmental Mesonet, Iowa State University | One request per year, ≥ 10 s apart; on-the-hour reports used |
| thermofeel 2.3.0 test vectors | `../backend/tests/golden/thermofeel/` | T-REF-01 golden test | Apache-2.0 (ECMWF) | Copied verbatim |
| NIOSH 2016-106 text | `../docs/sources/niosh-2016-106.txt` | Policy citations | US government work, public domain | |
| Demo Site A | `scenarios/demo-site-a.json` | Synthetic worksite (SIM-SITE) | Our work, MIT | No real crews, persons or locations |
| Scenario selection | `scenarios/s-auh-1.json` | Output of `backend/eval/select_scenario.py` | Our work, MIT | Rule in doc 09 §4 |

Every fetch is recorded in `cache/manifest.json` (URL, retrieval time, SHA-256, row count). Refetch with `make data`.
