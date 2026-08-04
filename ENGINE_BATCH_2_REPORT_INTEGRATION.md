# Engine Batch 2

Engine Batch 2 connects the first standalone engine scaffold to report generation.

## What changed

- `lib/astrology/rule-engine.ts` now converts the existing `MockChart` into `EngineChartInput`.
- Report interpretations now come from `generateEngineResult()`.
- Report safety notes now come from the engine result.
- `createMockReport()` now saves engine-generated content into the existing `AstrologyReport` shape.

## Current limitation

The chart itself is still mock-generated. Engine v0 interprets existing mock chart points but does not calculate a real astronomical chart yet.

## Next steps

1. Render engine insight structure on report detail pages.
2. Add richer report sections by category.
3. Add engine test fixtures.
4. Later replace mock chart generation with real chart calculation.
