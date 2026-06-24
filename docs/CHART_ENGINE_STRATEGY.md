# Halleus Chart Engine Strategy

## Goal

Replace mock report generation with a deterministic chart engine and interpretation pipeline.

## Candidate calculation strategies

### Library-based

Use an npm library or calculation package and own the result mapping.

Best when control and reproducibility matter.

### External API

Use a third-party astrology API.

Best when speed matters, but it adds provider dependency and cost.

### Hybrid

Use a calculation library for placements and internal modules for interpretation.

Recommended direction for long-term control.

## Required before replacement

- Confirm input timezone handling.
- Confirm city coordinate source.
- Define placement output schema.
- Add test fixtures.
- Add quality review samples.
- Keep spiritual/symbolic disclaimers in report copy.
