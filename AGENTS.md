# Architecture
- Keep financial data in the existing browser storage for this local-only workflow; backups must include all months and merchant category preferences without introducing a hosted service.
- Centralize spending pace calculations and backup validation in pure library functions so financial rules can be tested independently of presentation.
- Use semantic color tokens and shared goal indicators across financial sections for consistent theming and budget status.