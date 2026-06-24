# Chart Engine Provider Decision

## Current state

Halleus now uses a fixture chart engine for product flow validation.

## Not production yet

Fixture placements are deterministic preview data. They are not real astronomical calculations.

## Remaining decision

Before production astrology calculations, choose one strategy:

1. Local JavaScript calculation library.
2. Swiss Ephemeris wrapper.
3. External astrology API provider.
4. Custom calculation pipeline.

This decision should be made with current maintenance, pricing, accuracy, timezone, and deployment constraints in mind.
