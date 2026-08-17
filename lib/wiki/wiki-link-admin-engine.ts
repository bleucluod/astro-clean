// HALLEUS_BATCH4_R6_VALID_DISTINCT_CONTEXTUAL_QUOTA
// HALLEUS_BATCH4_R20B13_UNBOUNDED_CORE_LINKS
import type {
  WikiLinkArticleInput,
  WikiLinkEdge,
  WikiLinkFinding,
  WikiLinkScanResult,
  WikiLinkScanRules,
  WikiLinkSuggestionBuildResult,
} from "@/lib/wiki/wiki-link-admin-types";

const ARTICLE_LINK_RE =
  /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]/g;
const CORE_LINK_RE =
  /\[\[page:(\/(?:chart|compare|sky|wiki)?)(?:\|([^\]\r\n]+))\]\]/g;// HALLEUS_BATCH4_R20_MIN3_NO_HARD_MAX_RULES


// HALLEUS_WIKI_OUTGOING_MIN_OPTIONAL
export const DEFAULT_WIKI_LINK_SCAN_RULES: WikiLinkScanRules = {
  outgoingMin: 0,
  outgoingMax: 0,
  // HALLEUS_WIKI_INCOMING_MIN_OPTIONAL_TARGET3
  incomingMin: 0,
  incomingTarget: 3,
  incomingMax: 0,
  breadcrumbRequired: true,
  categoryLinkMax: 1,
  coreMax: 0,
  coreRoutes: ["/", "/chart", "/compare", "/sky", "/wiki"],
  anchorMinChars: 3,
  anchorMaxChars: 120,
  oneWordCoreAllowlist: ["هالیوس"],
  excludedStableIds: [],
  prohibitSelf: true,
  prohibitDuplicate: true,
  prohibitUnpublishedTargets: true,
};

function normalizedWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function markerPlacement(text: string, offset: number) {
  const before = text.slice(0, offset);
  const blockIndex = before.split(/\n\s*\n/).length - 1;
  return `body-block:${blockIndex}`;
}

function collectBodyLinks(article: WikiLinkArticleInput) {
  const links: WikiLinkEdge[] = [];
  for (const match of article.bodyMarkdown.matchAll(ARTICLE_LINK_RE)) {
    const target = match[1];
    const anchor = (match[2] ?? target).trim();
    links.push({
      sourceStableId: article.stableId,
      targetStableId: target,
      href: `/wiki/${target}`,
      anchor,
      kind: "article",
      placement: markerPlacement(article.bodyMarkdown, match.index ?? 0),
    });
  }
  for (const match of article.bodyMarkdown.matchAll(CORE_LINK_RE)) {
    const href = match[1] || "/";
    links.push({
      sourceStableId: article.stableId,
      targetStableId: null,
      href,
      anchor: (match[2] ?? "").trim(),
      kind: "core",
      placement: markerPlacement(article.bodyMarkdown, match.index ?? 0),
    });
  }
  return links;
}

// HALLEUS_BATCH4_R7_TARGET_CLASSIFICATION_ORDER
function isCurrentlyPublishedArticle(article: WikiLinkArticleInput, nowMs: number) {
  const publishedAtMs = article.publishedAt ? Date.parse(article.publishedAt) : Number.NaN;
  return (
    article.status === "published" &&
    Number.isFinite(publishedAtMs) &&
    publishedAtMs <= nowMs &&
    !article.deletedAt
  );
}

function isCurrentPublicArticle(article: WikiLinkArticleInput, nowMs: number) {
  return article.indexable && isCurrentlyPublishedArticle(article, nowMs);
}

function collectNonBodyLinks(article: WikiLinkArticleInput): WikiLinkEdge[] {
  const links: WikiLinkEdge[] = [];
  for (const link of article.contextLinks) {
    const kind: WikiLinkEdge["kind"] = link.href.startsWith("/wiki/category/")
      ? "category"
      : "context";
    links.push({
      sourceStableId: article.stableId,
      targetStableId: null,
      href: link.href,
      anchor: link.label,
      kind,
      placement: "context-links",
    });
  }
  if (article.callToAction) {
    links.push({
      sourceStableId: article.stableId,
      targetStableId: null,
      href: article.callToAction.href,
      anchor: article.callToAction.label,
      kind: "cta",
      placement: "call-to-action",
    });
  }
  for (const stableId of article.relatedArticleIds) {
    links.push({
      sourceStableId: article.stableId,
      targetStableId: stableId,
      href: `/wiki/${stableId}`,
      anchor: stableId,
      kind: "related",
      placement: "related",
    });
  }
  links.push({
    sourceStableId: article.stableId,
    targetStableId: null,
    href: `/wiki/category/${article.categoryId}`,
    anchor: article.categoryId,
    kind: "breadcrumb",
    placement: "breadcrumb",
  });
  return links;
}

function finding(
  code: WikiLinkFinding["code"],
  severity: WikiLinkFinding["severity"],
  sourceStableId: string,
  targetStableId: string | null,
  details: Record<string, unknown>,
): WikiLinkFinding {
  return { code, severity, sourceStableId, targetStableId, details };
}

export function scanWikiInternalLinks(
  inputArticles: WikiLinkArticleInput[],
  rules: WikiLinkScanRules = DEFAULT_WIKI_LINK_SCAN_RULES,
): WikiLinkScanResult {
  const allById = new Map(inputArticles.map((article) => [article.stableId, article]));
  const scanNow = Date.now();
  const liveArticles = inputArticles.filter((article) => isCurrentPublicArticle(article, scanNow));
  const liveTargetIds = new Set(liveArticles.map((article) => article.stableId));
  const excluded = new Set(rules.excludedStableIds);
  const managed = liveArticles.filter((article) => !excluded.has(article.stableId));
  const classifiedLinks = managed.flatMap((article) => [
    ...collectBodyLinks(article),
    ...collectNonBodyLinks(article),
  ]);
  const contextualArticleEdges = classifiedLinks.filter((edge) => edge.kind === "article");
  const findings: WikiLinkFinding[] = [];

  const outgoingBySource = new Map<string, WikiLinkEdge[]>();
  const incomingByTarget = new Map<string, WikiLinkEdge[]>();
  for (const edge of contextualArticleEdges) {
    const outgoing = outgoingBySource.get(edge.sourceStableId) ?? [];
    outgoing.push(edge);
    outgoingBySource.set(edge.sourceStableId, outgoing);
    if (edge.targetStableId) {
      const incoming = incomingByTarget.get(edge.targetStableId) ?? [];
      incoming.push(edge);
      incomingByTarget.set(edge.targetStableId, incoming);
    }
  }

  for (const article of managed) {
    const outgoing = outgoingBySource.get(article.stableId) ?? [];
    const incoming = incomingByTarget.get(article.stableId) ?? [];
    const outgoingCount = new Set(
      outgoing
        .map((edge) => edge.targetStableId)
        .filter(
          (target): target is string =>
            typeof target === "string" && target !== article.stableId && liveTargetIds.has(target),
        ),
    ).size;
    const incomingCount = new Set(incoming.map((edge) => edge.sourceStableId)).size;
    const core = classifiedLinks.filter(
      (edge) => edge.sourceStableId === article.stableId && edge.kind === "core",
    );
    const category = classifiedLinks.filter(
      (edge) =>
        edge.sourceStableId === article.stableId &&
        edge.kind === "category" &&
        edge.href.startsWith("/wiki/category/"),
    );
    const breadcrumb = classifiedLinks.find(
      (edge) => edge.sourceStableId === article.stableId && edge.kind === "breadcrumb",
    );

    if (outgoingCount < rules.outgoingMin) {
      findings.push(
        finding("OUTGOING_UNDER_MIN", "error", article.stableId, null, {
          actual: outgoingCount,
          minimum: rules.outgoingMin,
        }),
      );
    }
    if (rules.outgoingMax > 0 && outgoingCount > rules.outgoingMax) {
      findings.push(
        finding("OUTGOING_OVER_MAX", "error", article.stableId, null, {
          actual: outgoingCount,
          maximum: rules.outgoingMax,
        }),
      );
    }
    if (incomingCount < rules.incomingMin) {
      findings.push(
        finding("INCOMING_UNDER_MIN", "error", article.stableId, null, {
          actual: incomingCount,
          minimum: rules.incomingMin,
        }),
      );
    } else if (incomingCount < rules.incomingTarget) {
      findings.push(
        finding("INCOMING_UNDER_TARGET", "warning", article.stableId, null, {
          actual: incomingCount,
          target: rules.incomingTarget,
        }),
      );
    }
    if (rules.incomingMax > 0 && incomingCount > rules.incomingMax) {
      findings.push(
        finding("INCOMING_OVER_MAX", "warning", article.stableId, null, {
          actual: incomingCount,
          maximum: rules.incomingMax,
        }),
      );
    }

    if (core.length === 0) {
      findings.push(finding("MISSING_CORE_LINK", "error", article.stableId, null, {}));
    } else if (rules.coreMax > 0 && core.length > rules.coreMax) {
      findings.push(
        finding("MULTIPLE_CORE_LINKS", "error", article.stableId, null, {
          actual: core.length,
          maximum: rules.coreMax,
        }),
      );
    }
    for (const edge of core) {
      if (!rules.coreRoutes.includes(edge.href)) {
        findings.push(
          finding("INVALID_CORE_ROUTE", "error", article.stableId, null, { href: edge.href }),
        );
      }
      const oneWord = normalizedWords(edge.anchor).length === 1;
      const allowed =
        edge.href === "/" && rules.oneWordCoreAllowlist.includes(edge.anchor.trim());
      if (oneWord && !allowed) {
        findings.push(
          finding("ONE_WORD_CORE_ANCHOR", "error", article.stableId, null, {
            anchor: edge.anchor,
            href: edge.href,
          }),
        );
      }
    }

    if (
      rules.breadcrumbRequired &&
      (!breadcrumb || !article.categoryId || breadcrumb.href !== `/wiki/category/${article.categoryId}`)
    ) {
      findings.push(
        finding("BREADCRUMB_ISSUE", "error", article.stableId, null, {
          categoryId: article.categoryId,
        }),
      );
    }

    if (category.length > rules.categoryLinkMax) {
      findings.push(
        finding("CATEGORY_LINK_OVER_MAX", "warning", article.stableId, null, {
          actual: category.length,
          maximum: rules.categoryLinkMax,
        }),
      );
    }

    const pairCounts = new Map<string, number>();
    for (const edge of outgoing) {
      const targetId = edge.targetStableId ?? "";
      pairCounts.set(targetId, (pairCounts.get(targetId) ?? 0) + 1);

      if (rules.prohibitSelf && targetId === article.stableId) {
        findings.push(
          finding("SELF_LINK", "error", article.stableId, targetId, { anchor: edge.anchor }),
        );
      }

      const target = allById.get(targetId);
      if (!target) {
        findings.push(
          finding("MISSING_TARGET", "error", article.stableId, targetId, { anchor: edge.anchor }),
        );
      } else if (
        rules.prohibitUnpublishedTargets &&
        !isCurrentlyPublishedArticle(target, scanNow)
      ) {
        findings.push(
          finding("UNPUBLISHED_TARGET", "error", article.stableId, targetId, {
            status: target.status,
            publishedAt: target.publishedAt,
          }),
        );
      } else if (rules.prohibitUnpublishedTargets && !target.indexable) {
        findings.push(
          finding("NOINDEX_TARGET", "error", article.stableId, targetId, {}),
        );
      }

      if (normalizedWords(edge.anchor).length === 1) {
        findings.push(
          finding("ONE_WORD_ARTICLE_ANCHOR", "error", article.stableId, targetId, {
            anchor: edge.anchor,
          }),
        );
      }
      if (
        edge.anchor.trim().length < rules.anchorMinChars ||
        edge.anchor.trim().length > rules.anchorMaxChars
      ) {
        findings.push(
          finding("ANCHOR_OUT_OF_BOUNDS", "warning", article.stableId, targetId, {
            anchor: edge.anchor,
            length: edge.anchor.trim().length,
          }),
        );
      }
    }

    if (rules.prohibitDuplicate) {
      for (const [targetId, count] of pairCounts) {
        if (targetId && count > 1) {
          findings.push(
            finding("DUPLICATE_EDGE", "error", article.stableId, targetId, { count }),
          );
        }
      }
    }

    const articleAnchors = new Set(outgoing.map((edge) => edge.anchor.trim()));
    for (const edge of core) {
      if (articleAnchors.has(edge.anchor.trim())) {
        findings.push(
          finding("ARTICLE_CORE_ANCHOR_COLLISION", "error", article.stableId, null, {
            anchor: edge.anchor,
          }),
        );
      }
    }
  }

  const findingCountBySource = new Map<string, number>();
  for (const item of findings) {
    findingCountBySource.set(
      item.sourceStableId,
      (findingCountBySource.get(item.sourceStableId) ?? 0) + 1,
    );
  }

  const articles = managed.map((article) => {
    const outgoing = outgoingBySource.get(article.stableId) ?? [];
    const incoming = incomingByTarget.get(article.stableId) ?? [];
    const categoryLinks = classifiedLinks.filter(
      (edge) =>
        edge.sourceStableId === article.stableId &&
        edge.kind === "category" &&
        edge.href.startsWith("/wiki/category/"),
    ).length;
    const core = classifiedLinks.filter(
      (edge) => edge.sourceStableId === article.stableId && edge.kind === "core",
    );
    const findingCount = findingCountBySource.get(article.stableId) ?? 0;
    const summaryIncomingCount = new Set(
      incoming.map((edge) => edge.sourceStableId),
    ).size;
    const summaryOutgoingCount = new Set(
      outgoing
        .map((edge) => edge.targetStableId)
        .filter(
          (target): target is string =>
            typeof target === "string" && target !== article.stableId && liveTargetIds.has(target),
        ),
    ).size;

    return {
      stableId: article.stableId,
      slug: article.slug,
      title: article.title,
      categoryId: article.categoryId,
      status: article.status,
      indexable: article.indexable,
      incoming: summaryIncomingCount,
      outgoing: summaryOutgoingCount,
      categoryLinks,
      coreDestination: core.length > 0 ? core.map((edge) => edge.href).sort()[0] : null,
      breadcrumbOk: Boolean(article.categoryId),
      findingCount,
      compliant: findingCount === 0,
    };
  });

  const findingSources = (codes: WikiLinkFinding["code"][]) =>
    new Set(findings.filter((item) => codes.includes(item.code)).map((item) => item.sourceStableId))
      .size;

  return {
    contextualArticleEdges,
    classifiedLinks,
    findings,
    articles,
    kpis: {
      liveArticleCount: liveArticles.length,
      managedArticleCount: managed.length,
      fullyCompliant: articles.filter((article) => article.compliant).length,
      underInlinked: articles.filter((article) => article.incoming < rules.incomingTarget).length,
      outgoingOutsideRange: articles.filter(
        (article) =>
          article.outgoing < rules.outgoingMin || (rules.outgoingMax > 0 && article.outgoing > rules.outgoingMax),
      ).length,
      missingCoreLink: findingSources(["MISSING_CORE_LINK", "MULTIPLE_CORE_LINKS"]),
      breadcrumbIssue: findingSources(["BREADCRUMB_ISSUE"]),
      internalTargetIssue: findingSources([
        "MISSING_TARGET",
        "UNPUBLISHED_TARGET",
        "NOINDEX_TARGET",
      ]),
      oneWordViolation: findingSources([
        "ONE_WORD_ARTICLE_ANCHOR",
        "ONE_WORD_CORE_ANCHOR",
      ]),
      anchorCollision: findingSources(["ARTICLE_CORE_ANCHOR_COLLISION"]),
      selfLink: findingSources(["SELF_LINK"]),
      duplicate: findingSources(["DUPLICATE_EDGE"]),
      overOrUnderlinked: findingSources([
        "OUTGOING_UNDER_MIN",
        "OUTGOING_OVER_MAX",
        "INCOMING_UNDER_MIN",
        "INCOMING_UNDER_TARGET",
        "INCOMING_OVER_MAX",
      ]),
    },
  };
}

function paragraphBlocks(bodyMarkdown: string) {
  return bodyMarkdown
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(
      (block) =>
        Boolean(block) &&
        !block.startsWith("#") &&
        !block.startsWith("- ") &&
        !block.startsWith("!["),
    );
}

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function oneWord(value: string) {
  return normalizedWords(value).length === 1;
}

export function buildNaturalWikiLinkSuggestions(
  inputArticles: WikiLinkArticleInput[],
  scan: WikiLinkScanResult,
  rules: WikiLinkScanRules = DEFAULT_WIKI_LINK_SCAN_RULES,
): WikiLinkSuggestionBuildResult {
  const allById = new Map(inputArticles.map((article) => [article.stableId, article]));
  const summaryById = new Map(scan.articles.map((article) => [article.stableId, article]));
  const managedIds = new Set(scan.articles.map((article) => article.stableId));
  const existingPairs = new Set(
    scan.contextualArticleEdges
      .filter((edge) => edge.targetStableId)
      .map((edge) => `${edge.sourceStableId}->${edge.targetStableId}`),
  );
  const suggestions: WikiLinkSuggestionBuildResult["suggestions"] = [];
  const suggestedPairs = new Set<string>();
  const sourcesNeedingHelp = new Set(
    scan.articles
      .filter((article) => article.outgoing < rules.outgoingMin)
      .map((article) => article.stableId),
  );
  const targetsNeedingHelp = new Set(
    scan.articles
      .filter((article) => article.incoming < rules.incomingTarget)
      .map((article) => article.stableId),
  );
  const noNatural = new Set<string>();

  const targetOrder = [...targetsNeedingHelp].sort((left, right) => {
    const a = summaryById.get(left)?.incoming ?? 0;
    const b = summaryById.get(right)?.incoming ?? 0;
    return a - b || left.localeCompare(right, "en");
  });

  for (const sourceId of managedIds) {
    const source = allById.get(sourceId);
    const summary = summaryById.get(sourceId);
    if (
      !source ||
      !summary ||
      (rules.outgoingMax > 0 && summary.outgoing >= rules.outgoingMax)
    ) continue;
    const needsOutgoing = sourcesNeedingHelp.has(sourceId);
    let createdForSource = 0;

    for (const targetId of targetOrder) {
      if (targetId === sourceId) continue;
      const target = allById.get(targetId);
      if (!target || !managedIds.has(targetId)) continue;
      const pair = `${sourceId}->${targetId}`;
      if (existingPairs.has(pair) || suggestedPairs.has(pair)) continue;

      const candidateAnchors = [target.shortTitle, target.title]
        .map((item) => item.trim())
        .filter(
          (item, index, items) =>
            Boolean(item) &&
            items.indexOf(item) === index &&
            !oneWord(item) &&
            item.length >= rules.anchorMinChars &&
            item.length <= rules.anchorMaxChars,
        );

      let match:
        | { paragraph: string; anchor: string; proposed: string; blockIndex: number }
        | null = null;
      const blocks = paragraphBlocks(source.bodyMarkdown);
      for (let blockIndex = 0; blockIndex < blocks.length && !match; blockIndex += 1) {
        const paragraph = blocks[blockIndex];
        if (paragraph.includes("[[article:")) {
          continue;
        }
        for (const anchor of candidateAnchors) {
          const expression = new RegExp(escaped(anchor));
          if (!expression.test(paragraph)) continue;
          const proposed = paragraph.replace(
            expression,
            `[[article:${targetId}|${anchor}]]`,
          );
          match = { paragraph, anchor, proposed, blockIndex };
          break;
        }
      }

      if (!match) continue;
      suggestions.push({
        sourceStableId: sourceId,
        targetStableId: targetId,
        sourceContentVersion: source.contentVersion,
        currentAnchor: match.anchor,
        proposedAnchor: match.anchor,
        currentParagraph: match.paragraph,
        proposedParagraph: match.proposed,
        placement: `body-block:${match.blockIndex}`,
        reason: needsOutgoing
          ? "OUTGOING_AND_INCOMING_NATURAL_MATCH"
          : "INCOMING_NATURAL_MATCH",
        confidence: match.anchor === target.title ? 1 : 0.95,
      });
      suggestedPairs.add(pair);
      createdForSource += 1;
      if (
        summary.outgoing + createdForSource >= rules.outgoingMin &&
        needsOutgoing
      ) {
        break;
      }
      if (!needsOutgoing && createdForSource >= 1) {
        break;
      }
    }

    if (needsOutgoing && createdForSource === 0) {
      noNatural.add(sourceId);
    }
  }

  for (const targetId of targetsNeedingHelp) {
    const hasIncomingSuggestion = suggestions.some(
      (suggestion) => suggestion.targetStableId === targetId,
    );
    if (!hasIncomingSuggestion) {
      noNatural.add(targetId);
    }
  }

  return {
    suggestions,
    noNaturalPlacementStableIds: [...noNatural].sort(),
  };
}

function occurrenceCount(text: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  let cursor = 0;
  while (cursor <= text.length) {
    const index = text.indexOf(needle, cursor);
    if (index < 0) break;
    count += 1;
    cursor = index + needle.length;
  }
  return count;
}

export function applyWikiLinkParagraphChange(
  bodyMarkdown: string,
  currentParagraph: string,
  proposedParagraph: string,
) {
  if (currentParagraph === proposedParagraph) {
    throw new Error("WIKI_LINK_NO_CHANGE");
  }
  const count = occurrenceCount(bodyMarkdown, currentParagraph);
  if (count !== 1) {
    throw new Error(
      count === 0
        ? "WIKI_LINK_SOURCE_PARAGRAPH_CHANGED"
        : "WIKI_LINK_SOURCE_PARAGRAPH_AMBIGUOUS",
    );
  }
  return bodyMarkdown.replace(currentParagraph, proposedParagraph);
}

export function rollbackWikiLinkParagraphChange(
  bodyMarkdown: string,
  appliedParagraph: string,
  previousParagraph: string,
) {
  const count = occurrenceCount(bodyMarkdown, appliedParagraph);
  if (count !== 1) {
    throw new Error(
      count === 0
        ? "WIKI_LINK_APPLIED_PARAGRAPH_CHANGED"
        : "WIKI_LINK_APPLIED_PARAGRAPH_AMBIGUOUS",
    );
  }
  return bodyMarkdown.replace(appliedParagraph, previousParagraph);
}
