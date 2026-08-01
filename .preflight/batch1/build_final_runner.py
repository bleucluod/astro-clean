from __future__ import annotations

import argparse
import base64
import hashlib
import json
import lzma
import re
from pathlib import Path

ORIGINAL_SHA = "98aa792830e8453c3f5ece02d666a009b7dc5f64a711db890bda76e19730bc99"
FINAL_SHA = "36b67b60b6daa4c784bdc7837348c900eb65fd455c73dd049940bb1ac4b379c6"
RUNNER_NAME = "Apply-Halleus-Public-Reports-Activation-Batch1-20260801.ps1"


def encode(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def decode(value: str) -> str:
    return base64.b64decode(value).decode("utf-8")


def indent(value: str, count: int) -> str:
    prefix = " " * count
    return "\n".join(prefix + line if line else line for line in value.split("\n"))


def set_operation(payload: dict, path: str, index: int, *, old: str | None = None, new: str | None = None) -> None:
    operation = payload["replacements"][path][index - 1]
    if old is not None:
        operation["old"] = encode(old)
    if new is not None:
        operation["new"] = encode(new)


def indent_operation(payload: dict, path: str, index: int, count: int) -> None:
    operation = payload["replacements"][path][index - 1]
    set_operation(payload, path, index, old=indent(decode(operation["old"]), count), new=indent(decode(operation["new"]), count))


def build_payload(payload: dict) -> dict:
    set_operation(payload, "app/dashboard/page.tsx", 2, old='<Link className="button secondary" href="/reports">\n            گزارش‌های من\n          </Link>', new='<Link className="button secondary" href="/dashboard/reports">\n  گزارش‌های من\n</Link>')
    old_message = 'return "گزارش ساخته شد، اما ذخیره حساب یا لینک noindex کامل نشد. نسخه private همین دستگاه باز می‌شود.";'
    new_message = 'return "گزارش ساخته شد، اما ذخیره آنلاین کامل نشد. نسخه خصوصی همین دستگاه باز می‌شود.";'
    set_operation(payload, "components/ChartForm.tsx", 2, old=f"if (!normalizedMessage) {{\n  {old_message}\n}}", new=f"if (!normalizedMessage) {{\n  {new_message}\n}}")
    indent_operation(payload, "components/ChartForm.tsx", 2, 2)
    set_operation(payload, "components/ChartForm.tsx", 3, old=f"    {old_message}\n}}", new=f"    {new_message}\n}}")
    for index, count in ((4, 6), (5, 6), (6, 4)):
        indent_operation(payload, "components/ChartForm.tsx", index, count)
    indent_operation(payload, "lib/storage/account-report-save-client.ts", 1, 6)
    indent_operation(payload, "lib/storage/report-records.ts", 1, 2)
    set_operation(payload, "app/api/reports/account/route.ts", 2, old="  listOwnedReportSummaries,\n  mutateOwnedReportPublication,\n  revokeOwnedReportSharing,", new="  listOwnedReportSummaries,\n  mutateOwnedReportIdentityConsent,\n  mutateOwnedReportPublication,\n  revokeOwnedReportSharing,")
    indent_operation(payload, "app/api/reports/account/route.ts", 6, 6)
    indent_operation(payload, "app/api/reports/account/route.ts", 7, 4)
    indent_operation(payload, "app/api/admin/reports/route.ts", 3, 4)
    for index, count in ((7, 8), (9, 2), (10, 2), (11, 10), (12, 10), (13, 10)):
        indent_operation(payload, "components/ReportDetail.tsx", index, count)
    indent_operation(payload, "config/halleus-check-impact.json", 1, 4)
    return payload


def reconstruct(root: Path) -> bytes:
    parts = [*(root / f"runner.correct{index:02d}.b64" for index in range(1, 7)), *(root / f"runner.part{index:02d}.b64" for index in range(3, 7))]
    expected_lengths = [5000, 5000, 5000, 5000, 5000, 5000, 11000, 11000, 10032, 10032]
    actual_lengths = [len(path.read_text(encoding="utf-8").strip()) for path in parts]
    if actual_lengths != expected_lengths:
        raise SystemExit(f"RUNNER_PART_LENGTH_MISMATCH={actual_lengths}")
    encoded = "".join(path.read_text(encoding="utf-8").strip() for path in parts)
    if len(encoded) != 72064:
        raise SystemExit(f"RUNNER_BASE64_LENGTH={len(encoded)}")
    original = lzma.decompress(base64.b64decode(encoded))
    if hashlib.sha256(original).hexdigest() != ORIGINAL_SHA:
        raise SystemExit("ORIGINAL_RUNNER_SHA_MISMATCH")
    corrected = original
    for before, after in ((b'    "scripts/check-report-publication-mutation.mjs",\n)', b'    "scripts/check-report-publication-mutation.mjs"\n)'), (b'    "scripts/check-public-report-activation.mjs",\n)', b'    "scripts/check-public-report-activation.mjs"\n)')):
        if corrected.count(before) != 1:
            raise SystemExit(f"RUNNER_SYNTAX_PATCH_ANCHOR_COUNT={before!r}:{corrected.count(before)}")
        corrected = corrected.replace(before, after, 1)
    text = corrected.decode("utf-8-sig")
    match = re.search(r'^\$PayloadBase64 = "([^"]+)"$', text, re.M)
    if match is None:
        raise SystemExit("PAYLOAD_LINE_MISSING")
    payload = build_payload(json.loads(base64.b64decode(match.group(1)).decode("utf-8")))
    payload_base64 = base64.b64encode(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).decode("ascii")
    text = text[:match.start(1)] + payload_base64 + text[match.end(1):]
    final = b"\xef\xbb\xbf" + text.encode("utf-8")
    actual_sha = hashlib.sha256(final).hexdigest()
    if actual_sha != FINAL_SHA:
        raise SystemExit(f"FINAL_RUNNER_SHA_MISMATCH={actual_sha}")
    return final


def audit(runner: Path, target: Path) -> None:
    text = runner.read_text(encoding="utf-8-sig")
    match = re.search(r'^\$PayloadBase64 = "([^"]+)"$', text, re.M)
    if match is None:
        raise SystemExit("PAYLOAD_LINE_MISSING")
    payload = json.loads(base64.b64decode(match.group(1)).decode("utf-8"))
    failures: list[str] = []
    for relative_path, operations in payload["replacements"].items():
        path = target / relative_path
        if not path.is_file():
            failures.append(f"TARGET_MISSING={relative_path}")
            continue
        content = path.read_text(encoding="utf-8")
        for index, operation in enumerate(operations, 1):
            old = decode(operation["old"])
            new = decode(operation["new"])
            count = content.count(old)
            if count != 1:
                failures.append(f"ANCHOR_COUNT={relative_path}#{index}:{count}\nOLD_B64={encode(old)}\nNEW_B64={encode(new)}")
                continue
            content = content.replace(old, new, 1)
    if failures:
        print("\n".join(failures).encode("ascii", "backslashreplace").decode("ascii"))
        raise SystemExit("TRANSFORMATION_ANCHOR_AUDIT_FAILED")
    print("TRANSFORMATION_ANCHOR_AUDIT=PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--target", type=Path)
    args = parser.parse_args()
    args.output.write_bytes(reconstruct(args.root))
    if args.target is not None:
        audit(args.output, args.target)
    print(f"RUNNER_SHA256={FINAL_SHA}")


if __name__ == "__main__":
    main()
