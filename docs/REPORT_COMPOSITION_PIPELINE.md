# Halleus Report Composition Pipeline

## Intended flow

1. User enters birth data.
2. Location/city data resolves coordinates and timezone.
3. Chart engine generates placements.
4. Interpretation driver composes sections.
5. Quality checker reviews text.
6. Report record is saved through the repository.
7. User sees report detail and archive.

## Rule

Do not connect production report composition until chart engine fixtures and quality checks pass.
