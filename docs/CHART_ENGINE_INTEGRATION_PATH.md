# Halleus Chart Engine Integration Path

This milestone connects generated reports to the chart engine path.

## What changed

- Added fixture chart engine.
- Switched chart engine factory to fixture engine.
- Added chart engine report metadata.
- Added report engine metadata attachment.
- Patched report write service to attach engine metadata before saving.
- Added visible chart engine report badge.
- Added chart engine integration checker.

## Why this matters

The app now has a real flow path:

Chart form -> chart engine driver -> report metadata -> storage -> report detail.

The current placements are still fixture data, but the product architecture is ready for a real calculation provider.
