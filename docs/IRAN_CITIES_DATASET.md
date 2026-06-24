# Iran Cities Dataset

Source file: user-provided `iran-cities.json`.

## Summary

- Imported cities: 897
- Fields preserved: sourceId, faName, provinceFaName, latitude, longitude
- Added app id format: `iran-<sourceId>`
- Added default timezone: `Asia/Tehran`
- Trimmed whitespace and normalized Arabic Yeh/Kaf variants.
- Corrected clearly swapped latitude/longitude rows: 665

## Product note

This file is a product foundation piece for the real chart engine.

The current frontend can keep using browser storage, but the report payload now has enough location metadata to migrate later into a database-backed account model without redesigning the birth input from scratch.
