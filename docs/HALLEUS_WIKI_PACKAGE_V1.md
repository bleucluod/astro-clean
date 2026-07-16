# Halleus Wiki Package v1

The Admin Wiki importer accepts one deterministic archive shape:

```text
halleus-wiki-package-*.zip
├── manifest.json
├── articles/
│   └── stable-article.md
└── assets/
    └── illustration.webp
```

`manifest.json` owns article metadata. Editors never have to re-enter title,
slug, category, related article IDs, or scheduling dates after upload.

```json
{
  "schema_version": 1,
  "package_id": "cluster-birth-chart-001",
  "articles": [
    {
      "article_id": "birth-chart-example",
      "version": 1,
      "file": "articles/birth-chart-example.md",
      "title": "عنوان فارسی مقاله",
      "short_title": "عنوان کوتاه",
      "slug": "birth-chart-example",
      "seo_title": "عنوان سئوی مقاله | ویکی هالیوس",
      "meta_description": "توضیح متای طبیعی و فارسی.",
      "category": "foundations",
      "tags": ["چارت تولد"],
      "summary": "خلاصهٔ مقاله.",
      "reading_minutes": 6,
      "publication_priority": 100,
      "content_cluster": "birth-chart",
      "article_role": "pillar",
      "related_article_ids": [],
      "indexable": true
    }
  ],
  "assets": [
    {
      "path": "assets/illustration.webp",
      "alt": "توضیح دقیق و فارسی تصویر"
    }
  ]
}
```

Markdown v1 supports paragraphs, H2 headings, `-` bullets, declared images,
and stable internal links:

```md
مقدمهٔ مقاله.

## نکات کلیدی

- نکتهٔ نخست
- نکتهٔ دوم

## بخش اصلی

متن و پیوند پایدار به [[article:another-stable-id]].

![توضیح تصویر](../assets/illustration.webp)
```

Raw HTML, executable files, undeclared files, path traversal, encrypted ZIP,
ZIP64, unsafe compression ratios, missing dependencies, duplicate IDs/slugs,
and unsupported image signatures are rejected. Article-level Markdown or
dependency failures are quarantined without discarding unrelated valid items.

Published rows are never silently overwritten. A newer package version creates
a separate draft/revision and is published only by an explicit or scheduled
publisher action. Slug changes create permanent redirects.
