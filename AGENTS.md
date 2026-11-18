# Architecture
- Keep financial data in the existing browser storage for this local-only workflow; backups must include all months and merchant category preferences without introducing a hosted service.
- Centralize spending pace calculations and backup validation in pure library functions so financial rules can be tested independently of presentation.
- Use semantic color tokens and shared goal indicators across financial sections for consistent theming and budget status.
- Store cycle metadata and selected cycle in a separate versioned local key; never migrate, delete, or reinterpret legacy monthly records automatically.
- Represent cycles as local civil-date half-open intervals and centralize date navigation and storage validation in pure functions to avoid timezone shifts and overlapping boundaries.
- Until financial modules are explicitly restructured, bridge cycle selection to its start calendar month and label those records as monthly; existing finance rules, imports and copying remain monthly.
- Store per-cycle planning (salary, extra incomes, investment base goal, budget distribution) in its own versioned local key indexed by cycleId, with all formulas centralized in pure library functions; legacy MonthlyData stays untouched.- Backups (v2) include months, merchant categories, cycle state and all cycle plannings, restored atomically via pure functions; v1 backups stay accepted and never clear cycle data.
