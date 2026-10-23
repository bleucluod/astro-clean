#!/usr/bin/env python3
"""Read-only eight-page live parity check against the frozen private R3 C00 MDs."""
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

BASE = "https://halleus.ir"
MANIFEST = Path(__file__).with_name("r3-c00-approved-manifest.json")
BLOCK = {"p", "h1", "h2", "h3", "li", "div", "section", "article", "header", "footer", "summary", "br"}
SKIP = {"script", "style", "noscript", "template", "svg"}

def clean(value):
    value = html.unescape(str(value)).replace("\u200e", "").replace("\u200f", "")
    return re.sub(r"\s+", " ", value).strip()

def heading_key(value):
    return re.sub(r"^\d+\s*[.)]\s*", "", clean(value))

class PageHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.hidden_tags = []
        self.visible = []
        self.open_blocks = []
        self.blocks = {k: [] for k in ("p", "h1", "h2", "h3", "summary", "a")}
        self.metadata = {"title": "", "description": "", "canonical": ""}
        self.in_title = False
        self.title_parts = []
        self.found_main = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "main":
            self.depth += 1
            self.found_main = True
        if tag == "title":
            self.in_title = True
        if tag == "meta" and attrs.get("name", "").lower() == "description":
            self.metadata["description"] = attrs.get("content", "")
        if tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.metadata["canonical"] = attrs.get("href", "")
        if self.depth and (tag in SKIP or "hidden" in attrs or attrs.get("aria-hidden") == "true"):
            self.hidden_tags.append(tag)
        if self.depth and not self.hidden_tags:
            if tag in BLOCK:
                self.visible.append(" ")
            if tag in self.blocks:
                self.open_blocks.append({"tag": tag, "parts": [], "href": attrs.get("href", "")})

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
            self.metadata["title"] = clean("".join(self.title_parts))
        if self.depth and not self.hidden_tags:
            for index in range(len(self.open_blocks)-1, -1, -1):
                record = self.open_blocks[index]
                if record["tag"] == tag:
                    label = clean("".join(record["parts"]))
                    if label:
                        self.blocks[tag].append((label, record["href"]))
                    self.open_blocks.pop(index)
                    break
            if tag in BLOCK:
                self.visible.append(" ")
        if self.hidden_tags and self.hidden_tags[-1] == tag:
            self.hidden_tags.pop()
        if tag == "main":
            self.depth = max(0, self.depth-1)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)
        if self.depth and not self.hidden_tags:
            self.visible.append(data)
            for record in self.open_blocks:
                record["parts"].append(data)

    def content(self):
        return clean("".join(self.visible))

def fetch_page(path):
    request = Request(BASE + path, headers={"User-Agent": "Halleus-R3-C00-ReadOnlyQA/1.0", "Accept": "text/html"})
    with urlopen(request, timeout=25) as response:
        return response.status, response.read(8000000).decode("utf-8", "replace")

def check_page(page):
    path = page["url"]
    failures, warnings = [], []
    counts = {"paragraphs": 0, "headings": 0, "links": 0}
    try:
        status, markup = fetch_page(path)
        if status != 200:
            failures.append("HTTP_" + str(status))
            return path, failures, warnings, counts
        parsed = PageHTML()
        parsed.feed(markup)
    except Exception as exc:
        failures.append("FETCH_ERROR " + type(exc).__name__ + " " + str(exc)[:130])
        return path, failures, warnings, counts
    visible = parsed.content()
    if not parsed.found_main or not visible:
        failures.append("MAIN_NOT_VISIBLE")
        return path, failures, warnings, counts
    for field in ("title", "description"):
        expected, actual = clean(page[field]), clean(parsed.metadata.get(field, ""))
        if expected != actual:
            failures.append("META_" + field.upper() + " expected=" + repr(expected[:75]) + " actual=" + repr(actual[:75]))
    canonical = urlsplit(parsed.metadata.get("canonical", "")).path or "/"
    if canonical.rstrip("/") != page["canonical"].rstrip("/"):
        failures.append("CANONICAL expected=" + page["canonical"] + " actual=" + canonical)
    for forbidden in page.get("forbidden_visible", []):
        if clean(forbidden) in visible:
            failures.append("LEGACY_COPY_STILL_VISIBLE " + forbidden)
    if clean(page["h1"]) not in [entry[0] for entry in parsed.blocks["h1"]]:
        failures.append("H1_NOT_EXACT " + page["h1"][:80])
    blocked_sky = path == "/sky" and 'data-r3-approved-inline="sky"' not in markup
    if blocked_sky:
        failures.append("BLOCKED_SKY_DATA: ready-state article not rendered for this date")
    for heading in page["headings"]:
        if blocked_sky:
            break
        text = clean(heading["text"])
        counts["headings"] += 1
        if heading_key(text) in [heading_key(entry[0]) for entry in parsed.blocks["h"+str(heading["level"])]]:
            continue
        if heading_key(text) in visible:
            warnings.append("NON_SEMANTIC_HEADING " + text[:70])
        else:
            failures.append("MISSING_HEADING " + text[:100])
    for label in page.get("labels", []):
        if clean(label).rstrip(":") not in visible:
            failures.append("MISSING_APPROVED_LABEL " + label)
    rendered_paragraphs = [entry[0] for entry in parsed.blocks["p"]]
    for paragraph in page["paragraphs"]:
        if blocked_sky:
            break
        text = clean(paragraph)
        counts["paragraphs"] += 1
        if any(text in candidate for candidate in rendered_paragraphs):
            continue
        if text in visible:
            warnings.append("VISIBLE_OUTSIDE_PARAGRAPH " + text[:70])
        else:
            failures.append("MISSING_APPROVED_COPY " + text[:100])
    clickable = {(clean(anchor), urlsplit(href).path or "/") for anchor, href in parsed.blocks["a"]}
    for link in page["links"]:
        if blocked_sky:
            break
        counts["links"] += 1
        if (clean(link["anchor"]), link["href"]) not in clickable:
            failures.append("MISSING_CLICKABLE_LINK " + link["anchor"] + " -> " + link["href"])
    return path, failures, warnings, counts

def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["contract"] == "HALLEUS_R3_C00_EIGHT_PAGE_APPROVED_COPY_AUDIT_20261023"
    assert len(manifest["pages"]) == 8
    results = [check_page(page) for page in manifest["pages"]]
    for path, errors, warnings, checks in results:
        state = "FAIL" if errors else "PASS"
        print(state + " | " + path + " | paragraphs=" + str(checks["paragraphs"]) +
              " headings=" + str(checks["headings"]) + " links=" + str(checks["links"]) +
              " errors=" + str(len(errors)) + " warnings=" + str(len(warnings)))
        for error in errors:
            print("  FAIL | " + error)
        for warning in warnings[:15]:
            print("  WARN | " + warning)
    passed = sum(not errors for _, errors, _, _ in results)
    print("HALLEUS_R3_C00_LIVE_PARITY=" + str(passed) + "/8 | ALL_EIGHT_PAGES_CHECKED")
    return 0 if passed == 8 else 1

if __name__ == "__main__":
    sys.exit(main())
