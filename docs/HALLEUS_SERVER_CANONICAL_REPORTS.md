# Halleus Server-Canonical Reports — Active Contract (2026-09-19)

## Source of truth

New natal reports and new relationship analyses are acknowledged by Halleus server storage before product navigation continues. Browser storage may remain only as legacy recovery input or a non-canonical UI cache; it is not the authoritative report library.

Signed-out users receive a distinct server-owned guest identity protected by an HMAC-signed HttpOnly SameSite cookie. Client-supplied guest ids are never trusted.

Signed-in users use their verified Supabase user id.

## Privacy

New natal reports for both guest and account owners are stored unpublished/noindex by default. Relationship analyses remain private/noindex. Sharing is an explicit account-only action.

## Claim

When a guest signs in or creates an account, reports attached to the signed guest cookie are reassigned to the verified account owner.

Legacy browser natal reports are migrated one record at a time. If the historical shared guest row already exists, exact stored report JSON is required before ownership is transferred. A failed proof is preserved locally for retry and is never guessed.

A legacy private comparison may be claimed only when the submitted stored comparison exactly matches the historical server row. Its referenced natal ids may then be transferred from the historical shared guest owner; missing natal data is never synthesized.

Local natal records are removed only after server ownership plus note/favorite preservation succeeds.

## Unified library

The normal `/reports` product surface is one server-backed library for the current account owner or the current signed guest owner. The old account/device selector is not part of the normal reports page.

## Relationship invariant

Before a newly generated comparison is saved, both selected natal reports must already be server-backed for the current owner. The server save happens before the optional browser cache write.

## Signup CTA

A signed-out reader can read the report first. At roughly the same reading-progress threshold used by the Wiki sticky CTA, a fixed report CTA appears. It deliberately mirrors the Wiki CTA package: dark fixed card, dismiss control, slide/fade entrance/exit, pale primary action, and the rotating `conic-gradient` border light.

Authentication stays on the current report. After a verified session exists, guest reports are claimed into the account and the current report is reloaded in place.

## Responsive report contract

The mobile editorial report experience is canonical. The 760px mobile report rules are promoted to the full report surface so desktop no longer uses a separate semantic/hierarchy branch. Smaller-device geometry rules remain responsive.

## Release boundary

No database schema migration is introduced by this slice. No commit, tag, push, or deploy is performed until explicit release approval.