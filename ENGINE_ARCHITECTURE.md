# Astro Clean Engine v0

This folder contains the first rule-engine scaffold for Astro Clean.

## Current scope

Engine v0 does not calculate a real astronomical chart yet. It expects already prepared symbolic chart points:

- sun
- moon
- rising

The current goal is to separate interpretation logic from UI.

## Pipeline

Birth input
â†’ Raw chart data
â†’ Rule engine
â†’ Structured insights
â†’ Presentation layer
â†’ Future AI naturalization

## Safety rule

All generated interpretations must be presented as symbolic, traditional, and reflective. They must not be framed as scientific certainty, deterministic prediction, or medical/legal/financial advice.

## Current files

- `types.ts`: engine data contracts
- `zodiac-knowledge.ts`: symbolic zodiac knowledge base
- `rules.ts`: structured insight generation
- `index.ts`: public exports

## Next steps

1. Connect engine output to report generation.
2. Save structured insights inside reports.
3. Render insights on report detail pages.
4. Add more rule groups for element balance, modality balance, and eventually aspects/houses.
5. Keep raw astrology data separate from presentation text.
