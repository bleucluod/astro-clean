# Halleus Astronomy Engine Prototype

This milestone adds an optional Astronomy Engine prototype adapter.

## What changed

- Added zodiac longitude mapping.
- Added optional astronomy-engine package loader.
- Added Astronomy Engine prototype chart driver.
- Switched chart engine factory to the prototype driver.
- Added real engine prototype page.
- Added prototype checker.

## Important

The prototype falls back to the fixture engine if the astronomy-engine package is not installed or cannot load.

To activate the prototype, install the package:

```powershell
pnpm add astronomy-engine@2.1.19
```

## Current limitations

- Houses are placeholders.
- Birth timezone conversion is not production-ready.
- Aspects are not implemented yet.
- This is not final professional-grade astrology calculation.
