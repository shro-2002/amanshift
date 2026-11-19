# AmanShift (provisional name)

**Protection must never weaken when information disappears.**

> **Planning stage.** The application has not been built yet. This repository currently holds the frozen specification for an entry to Challenge 07 (Climate-Resilient Worker Health) of the Future Health Digital Innovation Challenge 2026.

AmanShift will be a crew-level heat-protection decision-support system for outdoor workers in Abu Dhabi. It combines day-ahead weather forecasts, onsite WBGT/TWL meter readings, crew workload, clothing and acclimatization, and the actual availability of shade, cooled rest and water. It recommends graded, multilingual actions. When forecasts go stale, cooling fails or the network drops, its recommendations can only become stricter, and an independent rule checker rejects unsafe plans. It collects no personal, biometric or location data, and it is decision support, not clinical diagnosis or authorization to work.

## Planned subsystems
1. Crew Risk Engine (estimated/measured WBGT, NIOSH limits, Abu Dhabi rules)
2. Protection Coverage Graph (crews ↔ shade, cooled rest, water)
3. Fail-Safe Decision Kernel, intervention planner and independent rule checker
4. Offline Protection Interface (supervisor command center, worker cards in en/ar/hi/ur/bn)

## Documentation
| Doc | Content |
|---|---|
| [AGENTS.md](AGENTS.md) | Binding instructions for coding agents |
| [STATUS.md](STATUS.md) | Verified facts, decisions, blockers |
| [00 Charter](docs/00-PROJECT-CHARTER.md) | Vision, scope, success criteria, GO/NO-GO |
| [01 PRD](docs/01-PRODUCT-REQUIREMENTS.md) | Users, requirements, stories, official-outcome mapping |
| [02 Science & safety](docs/02-SCIENTIFIC-MODEL-AND-SAFETY.md) | Methods, rules, fail-safe invariant |
| [03 Architecture](docs/03-SYSTEM-ARCHITECTURE.md) | Components, API, data, ADRs |
| [04 UI/UX](docs/04-UI-UX-AND-VISUAL-DESIGN.md) | Visual system, screens, wireframes |
| [05 Decision engine](docs/05-DECISION-ENGINE-SPECIFICATION.md) | Algorithms, checker rules, worked examples |
| [06 Validation](docs/06-VALIDATION-AND-TESTING.md) | Evaluation and test plan |
| [07 Responsible design](docs/07-RESPONSIBLE-DESIGN-AND-THREAT-MODEL.md) | Governance, privacy, threat model |
| [08 Implementation plan](docs/08-IMPLEMENTATION-PLAN.md) | Milestones, tasks, scope cuts |
| [09 Deliverable & demo](docs/09-FINAL-DELIVERABLE-AND-DEMO.md) | Judging moment, video, Q&A |
| [10 Traceability](docs/10-TRACEABILITY-AND-RELEASE-CHECKLIST.md) | Requirement → evidence matrix, release gates |
| [11 Audit](docs/11-PRE-IMPLEMENTATION-AUDIT.md) | Five-perspective pre-implementation review |

## Data sources (planned)
Open-Meteo Forecast and Previous Runs APIs (CC BY 4.0), Iowa Environmental Mesonet OMAA METAR archive, thermofeel (Apache-2.0), pvlib (BSD-3). The demo worksite is synthetic.
