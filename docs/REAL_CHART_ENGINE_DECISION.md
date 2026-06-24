# Halleus Real Chart Engine Decision

## Decision

For the next implementation step, Halleus should use:

```text
Astronomy Engine + Halleus astrology layer
```

## Why

This keeps the MVP deployable and avoids locking the product into a license-heavy or vendor-dependent path too early.

## Current product state

Halleus already has:

- chart engine driver boundary
- fixture engine
- report metadata path
- report output V3
- quality and interpretation layers

## Selected MVP path

1. Add a real astronomy adapter.
2. Calculate Sun, Moon, and planet positions for fixtures.
3. Convert ecliptic longitude into zodiac signs.
4. Keep house system and aspects as explicit follow-up decisions.
5. Keep fixture engine as fallback.

## Not selected yet

Swiss Ephemeris remains a strong future option, but it should not be integrated into proprietary/commercial product code until the licensing strategy is resolved.

External APIs remain possible, but they add vendor dependency, cost, and privacy complexity.
