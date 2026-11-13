"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { WikiArticleBody } from "@/components/wiki/WikiArticleRender";
import { WikiShopShowcaseCard } from "@/components/wiki/WikiShopShowcaseCard";
import { wikiShowcaseSectionAnchor } from "@/lib/wiki/wiki-showcase-anchor";
import type { WikiArticleSection } from "@/lib/wiki/wiki-content";
import type { PublicWikiShopShowcase } from "@/lib/wiki/wiki-shop-showcase";
import wikiStyles from "@/app/wiki/wiki.module.css";
import styles from "./wiki-shop-showcase.module.css";

type Product = { id: string; name: string; description: string; url: string;
  image: string | null; orderable: boolean };
type SectionRef = { index: number; title: string; anchor: string };
type Showcase = {
  id: string; articleId: string; productId: string; afterSectionIndex: number;
  sectionTitle: string; sectionAnchor: string; articleVersion: number;
  title: string; description: string; buttonLabel: string;
  enabled: boolean; expectedRevision: number; updatedAt: string;
  position: number | null; blocked: string | null; disabled: boolean;
  needsReview: boolean; active: boolean;
};
type ArticleRow = {
  articleId: string; stableId: string; slug: string; title: string; categoryId: string;
  publicationStatus: string; isPublic: boolean; updatedAt: string;
  articleVersion: number; sections: SectionRef[];
  showcase: Showcase | null; showcases: Showcase[]; hasShowcase: boolean; active: boolean;
  blocked: string | null; needsReview: boolean; hasPending: boolean;
  hasRejected: boolean; hasSkipped?: boolean; lastExportedAt: string | null;
};
type Proposal = {
  id: string; articleId: string; articleVersion: number;
  productId: string; afterSectionIndex: number; sectionAnchor: string;
  sectionTitle: string; title: string; description: string; buttonLabel: string;
  status: string; reason: string; sourceBatchId: string; createdAt: string;
};
type Draft = {
  articleId: string; articleVersion: number; productId: string;
  afterSectionIndex: number; sectionTitle: string; sectionAnchor: string;
  title: string; description: string; buttonLabel: string;
  expectedRevision: number; showcaseId?: string; proposalId?: string; enabled: boolean;
};
type ArticleDetail = {
  articleId: string; title: string; intro: string; summary: string;
  sections: WikiArticleSection[]; articleVersion: number;
};
type MetricRow = { showcaseId: string; productId: string; impressions: number; clicks: number };
type MetricsDashboard = {
  ok: boolean; ready: boolean; window: "7" | "30" | "all";
  summary: { impressions: number; clicks: number };
  metrics: MetricRow[];
};
type Dashboard = {
  articles: ArticleRow[]; products: Product[]; proposals: Proposal[];
  productCounts: Array<{ productId: string; active: number; configured: number }>;
  counts: { total: number; missing: number; has: number; active: number;
    disabled: number; pending: number; review: number };
};
const EMPTY: Dashboard = { articles: [], products: [], proposals: [], productCounts: [],
  counts: { total: 0, missing: 0, has: 0, active: 0, disabled: 0, pending: 0, review: 0 } };
const LIMIT = 18;
const PROPOSAL_LIMIT = 8;
const demoSections: WikiArticleSection[] = [
  { title: "ماه در روز تولد چه شکلی است؟", paragraphs: [
    "هر تاریخ، شکل خاصی از ماه را در آسمان دارد. از هلال تا ماه کامل، سهم روشن آن در طول ماه تغییر می‌کند.",
    "دیدن ماهِ روز تولد گاهی خاطره‌ای را زنده می‌کند که مدت‌ها از آن گذشته است.",
  ] },
  { title: "چرا شکل ماه هر روز تغییر می‌کند؟", paragraphs: [
    "ماه به دور زمین می‌گردد و ما از زاویه‌های متفاوتی بخش روشن سطح آن را می‌بینیم.",
    "به همین دلیل تصویر ماه در دو تاریخ نزدیک هم می‌تواند متفاوت باشد.",
  ] },
  { title: "چطور تاریخ دلخواه را انتخاب کنیم؟", paragraphs: [
    "برای انتخاب یک روز خاص، می‌شود تاریخ تولد، سالگرد یا لحظه‌ای را در نظر گرفت که هنوز برایمان معنا دارد.",
    "هالیوس شکل ماه همان روز را محاسبه می‌کند و از آن تصویری شخصی می‌سازد.",
  ] },
  { title: "جمع‌بندی", paragraphs: [
    "ماه هر روز چهرهٔ خودش را دارد. گاهی همان چهره یادآور روزی می‌شود که دوست داریم نگهش داریم.",
  ] },
];
const demoDetail: ArticleDetail = {
  articleId: "11111111-1111-4111-8111-111111111111",
  title: "ماه در روز تولد چه شکلی است؟", intro: "ماه هر روز چهرهٔ خودش را دارد.",
  summary: "", articleVersion: 1, sections: demoSections,
};
const demoProduct: Product = {
  id: "p01", name: "ماه آن روز", description: "تابلو ماه در تاریخ دلخواه",
  url: "/shop/moon-phase-print", image: "/shop-preview/p01/full-both.webp", orderable: true,
};
function demoDashboard(): Dashboard {
  const ref: SectionRef[] = demoSections.map((section, index) => ({
    index, title: section.title, anchor: wikiShowcaseSectionAnchor(section),
  }));
  const main: ArticleRow = {
    articleId: demoDetail.articleId, stableId: "demo-moon", slug: "demo-moon",
    title: demoDetail.title, categoryId: "moon", publicationStatus: "published",
    isPublic: true, updatedAt: new Date().toISOString(), articleVersion: 1,
    sections: ref, showcase: null, showcases: [], hasShowcase: false, active: false,
    blocked: null, needsReview: false, hasPending: true, hasRejected: false, lastExportedAt: null,
  };
  const second: ArticleRow = {
    ...main, articleId: "22222222-2222-4222-8222-222222222222",
    stableId: "demo-sky", slug: "demo-sky", title: "آسمان تولد",
    hasPending: false,
  };
  return {
    articles: [main, second], productCounts: [{ productId: 'p01', active: 0, configured: 0 }],
    products: [demoProduct, {
      id: "p02", name: "آسمان تولد", description: "تابلوی آسمان تولد",
      url: "/shop/birth-sky-map", image: "/shop-preview/p02/05-raha-parsa-30x45-wall.webp", orderable: false,
    }],
    proposals: [{
      id: "33333333-3333-4333-8333-333333333333", articleId: main.articleId,
      articleVersion: 1, productId: "p01", afterSectionIndex: 1,
      sectionTitle: demoSections[1].title, sectionAnchor: ref[1].anchor,
      title: "ماه آن روز؛ یادگاری یک تاریخ خاص",
      description: "شکل ماه در روزی که برای تو عزیز است، در تابلویی شخصی و ماندگار.",
      buttonLabel: "دیدن تابلو ماه آن روز", status: "pending", reason: "",
      sourceBatchId: "demo", createdAt: new Date().toISOString(),
    }],
    counts: { total: 2, missing: 2, has: 0, active: 0, disabled: 0, pending: 1, review: 0 },
  };
}
const formatCount = (n: number) => n.toLocaleString("fa-IR");
const formatCtr = (clicks: number, impressions: number) => impressions
  ? (100 * clicks / impressions).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + "٪"
  : "—";

function validPosition(row: ArticleRow, draft: Draft): SectionRef | undefined {
  return row.sections.find((section) => section.index === draft.afterSectionIndex &&
    section.title === draft.sectionTitle && section.anchor === draft.sectionAnchor &&
    section.index < row.sections.length - 1 &&
    (row.sections.length < 4 || section.index > 0));
}
function draftFor(row: ArticleRow, productId: string,
  proposal?: Proposal, existing?: Showcase | null): Draft {
  const selected = existing === undefined ?
    (proposal ? null : row.showcases[0] ?? row.showcase) : existing;
  const occupied = new Set(row.showcases.filter((s) => s.id !== selected?.id)
    .map((s) => s.afterSectionIndex));
  const first = row.sections.find((section) =>
    section.index < row.sections.length - 1 &&
    (row.sections.length < 4 || section.index > 0) &&
    !occupied.has(section.index));
  const from = proposal ?? selected;
  const matching = row.sections.find((section) => section.anchor === from?.sectionAnchor &&
    section.index < row.sections.length - 1) ??
    row.sections.find((section) => section.title === from?.sectionTitle &&
      section.index < row.sections.length - 1);
  const chosen = from ? matching : first;
  return {
    articleId: row.articleId, articleVersion: proposal?.articleVersion ?? row.articleVersion,
    productId: from?.productId ?? productId,
    afterSectionIndex: chosen?.index ?? -1,
    sectionTitle: chosen?.title ?? "", sectionAnchor: chosen?.anchor ?? "",
    title: from?.title ?? "", description: from?.description ?? "",
    buttonLabel: from?.buttonLabel ?? "دیدن محصول",
    expectedRevision: selected?.expectedRevision ?? 0,
    ...(selected ? { showcaseId: selected.id } : {}),
    ...(proposal ? { proposalId: proposal.id } : {}),
    enabled: true,
  };
}

export type ShowcaseWorkspaceSection = "overview" | "manage" | "ai" | "metrics";
export function WikiShopShowcasePanel({ token, canWrite, demo = false,
  activeSection = "manage", onSectionChange = () => {} }: {
  token: string; canWrite: boolean; demo?: boolean;
  activeSection?: ShowcaseWorkspaceSection;
  onSectionChange?: (section: ShowcaseWorkspaceSection) => void;
}) {
  const [data, setData] = useState<Dashboard>(demo ? demoDashboard() : EMPTY);
  const store = useRef<Dashboard>(demo ? demoDashboard() : EMPTY);
  const [query, setQuery] = useState("");
  const [aiSearch, setAiSearch] = useState("");
  const [aiPage, setAiPage] = useState(0);
  const [status, setStatus] = useState("all");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const moreFiltersId = useId();
  const [category, setCategory] = useState("all");
  const [publication, setPublication] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [sort, setSort] = useState("title");
  const [page, setPage] = useState(0);
  const [proposalPage, setProposalPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>(demo ? ["p01"] : []);
  const [productMinimums, setProductMinimums] = useState<Record<string, number>>({});
  const [checkedProposals, setCheckedProposals] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, Draft>>({});
  const [focusedId, setFocusedId] = useState<string>(demo ? demoDetail.articleId : "");
  const [detail, setDetail] = useState<ArticleDetail | null>(demo ? demoDetail : null);
  const editorPanelRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<Draft | null>(() => {
    if (!demo) return null;
    const sample = demoDashboard();
    return draftFor(sample.articles[0], "p01", sample.proposals[0]);
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [metricWindow, setMetricWindow] = useState<"7" | "30" | "all">("7");
  const [metricSort, setMetricSort] = useState<"clicks" | "ctr" | "impressions">("clicks");
  const [metricDirection, setMetricDirection] = useState<"desc" | "asc">("desc");
  const [metricProduct, setMetricProduct] = useState("all");
  const [metricPage, setMetricPage] = useState(0);
  const [metricData, setMetricData] = useState<MetricsDashboard | null>(null);
  const [metricError, setMetricError] = useState("");
  const [metricBusy, setMetricBusy] = useState(false);
  const [copyFile, setCopyFile] = useState<File | null>(null);
  const [copyPreview, setCopyPreview] = useState<{ matchedCount: number; changedCount: number; alreadyAppliedCount: number } | null>(null);
  const articleMap = useMemo(() => new Map(data.articles.map((a) => [a.articleId, a])), [data.articles]);
  const productMap = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products]);
  const measuredById = useMemo(() => {
    const result = new Map<string, { impressions: number; clicks: number }>();
    for (const m of metricData?.metrics ?? []) {
      const previous = result.get(m.showcaseId) ?? { impressions: 0, clicks: 0 };
      result.set(m.showcaseId, {
        impressions: previous.impressions + m.impressions,
        clicks: previous.clicks + m.clicks,
      });
    }
    return result;
  }, [metricData]);
  const totalActiveShowcases = useMemo(() => data.articles.reduce(
    (sum, a) => sum + a.showcases.filter((s) => s.active).length, 0),
    [data.articles]);
  const aiCandidates = useMemo(() => {
    const q = aiSearch.toLocaleLowerCase("fa").trim();
    return data.articles.filter((a) => a.isPublic &&
      (!q || [a.title, a.slug, a.stableId].some((t) => t.toLocaleLowerCase("fa").includes(q))));
  }, [data.articles, aiSearch]);
  const performanceRows = useMemo(() => data.articles.flatMap((article) =>
    article.showcases.filter((s) => metricProduct === "all" || s.productId === metricProduct)
      .map((s) => {
        const metric = measuredById.get(s.id) ?? { impressions: 0, clicks: 0 };
        return { showcaseId: s.id, articleId: article.articleId,
          articleTitle: article.title, slug: article.slug,
          productId: s.productId, cardTitle: s.title, ...metric,
          ctr: metric.impressions ? metric.clicks / metric.impressions : 0 };
      }))
    .sort((a, b) => {
      const left = a[metricSort], right = b[metricSort];
      return (metricDirection === "desc" ? right - left : left - right) ||
        a.articleTitle.localeCompare(b.articleTitle, "fa");
    }), [data.articles, metricProduct, measuredById, metricSort, metricDirection]);

  const jsonRequest = useCallback(async <T,>(body: unknown): Promise<T> => {
    const response = await fetch("/api/admin/wiki/shop-showcases", {
      method: "POST", cache: "no-store",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const parsed = await response.json() as { ok: boolean; error?: string };
    if (!response.ok || !parsed.ok) throw new Error(parsed.error ?? "درخواست انجام نشد");
    return parsed as unknown as T;
  }, [token]);

  const refresh = useCallback(async () => {
    if (demo) { setData({ ...store.current }); return; }
    const response = await fetch("/api/admin/wiki/shop-showcases", {
      headers: { authorization: "Bearer " + token }, cache: "no-store",
    });
    const body = await response.json() as Dashboard & { ok: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "دریافت مقاله‌ها انجام نشد");
    setData(body);
    setProposalPage(0);
    setProductIds((old) => old.length ? old :
      body.products.filter((p) => p.orderable).map((p) => p.id));
  }, [token, demo]);
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, [refresh]);

  const refreshMetrics = useCallback(async () => {
    if (demo) return;
    setMetricBusy(true);
    try {
      const response = await fetch("/api/admin/wiki/shop-showcases?mode=metrics&window=" +
        metricWindow, { cache: "no-store", headers: { authorization: "Bearer " + token } });
      const body = await response.json() as MetricsDashboard & { error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "آمار ویترین‌ها دریافت نشد");
      setMetricData(body);
      setMetricError("");
      setMetricPage(0);
    } catch (cause) {
      setMetricError(cause instanceof Error ? cause.message : "خطای دریافت آمار");
    } finally {
      setMetricBusy(false);
    }
  }, [demo, token, metricWindow]);
  useEffect(() => {
    if (activeSection !== "overview" && activeSection !== "metrics") return;
    void refreshMetrics();
  }, [activeSection, refreshMetrics]);

  useEffect(() => {
    if (activeSection !== "manage") return;
    if (!focusedId) { setDetail(null); return; }
    if (demo) { setDetail({ ...demoDetail, articleId: focusedId,
      title: data.articles.find((a) => a.articleId === focusedId)?.title ?? demoDetail.title }); return; }
    let active = true;
    setDetail(null);
    void (async () => {
      try {
        const response = await fetch("/api/admin/wiki/shop-showcases?mode=article&articleId=" +
          encodeURIComponent(focusedId), {
          headers: { authorization: "Bearer " + token }, cache: "no-store",
        });
        const body = await response.json() as { ok: boolean; article?: ArticleDetail; error?: string };
        if (!response.ok || !body.ok || !body.article) throw new Error(body.error ?? "متن مقاله پیدا نشد");
        if (active) setDetail(body.article);
      } catch (cause) { if (active) setError(String(cause)); }
    })();
    return () => { active = false; };
  }, [focusedId, token, demo, data.articles, activeSection]);

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase("fa").trim();
    const rows = data.articles.filter((a) => {
      if (q && ![a.title, a.slug, a.articleId, a.stableId]
        .some((text) => text.toLocaleLowerCase("fa").includes(q))) return false;
      if (category !== "all" && a.categoryId !== category) return false;
      if (publication !== "all" && a.publicationStatus !== publication) return false;
      if (productFilter !== "all" && !a.showcases.some((s) => s.productId === productFilter)) return false;
      if (status === "missing" && a.hasShowcase) return false;
      if (status === "has" && !a.hasShowcase) return false;
      if (status === "active" && !a.active) return false;
      if (status === "disabled" && !a.showcases.some((s) => s.disabled)) return false;
      if (status === "pending" && !a.hasPending) return false;
      if (status === "rejected" && !a.hasRejected) return false;
      if (status === "review" && !a.needsReview) return false;
      if (status === "blocked" && !(a.hasShowcase && a.blocked)) return false;
      if (status === "free" && !a.sections.some((s) =>
        s.index < a.sections.length - 1 && (a.sections.length < 4 || s.index > 0) &&
        !a.showcases.some((card) => card.afterSectionIndex === s.index))) return false;
      return true;
    });
    rows.sort((a, b) => sort === "recent"
      ? b.updatedAt.localeCompare(a.updatedAt)
      : sort === "status"
        ? Number(b.hasShowcase) - Number(a.hasShowcase) || a.title.localeCompare(b.title, "fa")
        : a.title.localeCompare(b.title, "fa"));
    return rows;
  }, [data.articles, query, status, category, publication, productFilter, sort]);

  const visibleRows = filtered.slice(page * LIMIT, (page + 1) * LIMIT);
  const pageCount = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const categories = [...new Set(data.articles.map((a) => a.categoryId))].sort();
  const filteredIds = filtered.map((a) => a.articleId);
  const pending = data.proposals.filter((p) => p.status === "pending");
  const pendingPageCount = Math.max(1, Math.ceil(pending.length / PROPOSAL_LIMIT));
  const currentProposalPage = Math.min(proposalPage, pendingPageCount - 1);
  const visiblePending = pending.slice(currentProposalPage * PROPOSAL_LIMIT,
    (currentProposalPage + 1) * PROPOSAL_LIMIT);
  const rejected = data.proposals.filter((p) => p.status === "rejected");
  const focusRow = articleMap.get(focusedId);
  const currentProduct = draft ? productMap.get(draft.productId) : null;
  const positionValid = draft && focusRow ? validPosition(focusRow, draft) : null;
  const previewOffer: PublicWikiShopShowcase | null = draft && positionValid &&
    currentProduct?.image && currentProduct.orderable &&
    draft.title.trim() && draft.description.trim() && draft.buttonLabel.trim() ? {
      id: draft.showcaseId ?? "preview",
       productId: draft.productId as PublicWikiShopShowcase["productId"],
      afterSectionIndex: draft.afterSectionIndex, sectionTitle: draft.sectionTitle,
      title: draft.title, description: draft.description, buttonLabel: draft.buttonLabel,
      url: currentProduct.url, image: currentProduct.image,
      imageAlt: currentProduct.name,
    } : null;

  const focusedDraftKey = draft?.showcaseId ?? draft?.proposalId ?? null;
  useEffect(() => {
    if (activeSection !== "manage" || !focusedDraftKey) return;
    if (!window.matchMedia("(max-width: 1100px)").matches) return;
    window.requestAnimationFrame(() => editorPanelRef.current?.scrollIntoView({ block: "start" }));
  }, [activeSection, focusedDraftKey]);

  function revealEditorOnMobile() {
    if (window.matchMedia("(max-width: 1100px)").matches) {
      window.requestAnimationFrame(() => editorPanelRef.current?.scrollIntoView({ block: "start" }));
    }
  }
  function focusArticle(row: ArticleRow, suggestion?: Proposal, existing?: Showcase | null) {
    setFocusedId(row.articleId);
    setDraft(draftFor(row, data.products.find((p) => p.orderable)?.id ?? "p01", suggestion, existing));
    revealEditorOnMobile();
  }
  function focusProposal(proposal: Proposal) {
    const row = articleMap.get(proposal.articleId);
    if (!row) return;
    setFocusedId(row.articleId);
    setDraft(edits[proposal.id] ?? draftFor(row, proposal.productId, proposal));
    onSectionChange("manage");
    revealEditorOnMobile();
  }
  function updateDraft(change: Partial<Draft>) {
    if (!draft) return;
    const next = { ...draft, ...change };
    setDraft(next);
    if (next.proposalId) setEdits((previous) => ({
      ...previous, [next.proposalId as string]: next,
    }));
    setNotice("");
  }
  const previewOffers: PublicWikiShopShowcase[] = (focusRow?.showcases ?? [])
    .filter((card) => card.enabled && card.id !== draft?.showcaseId)
    .flatMap((card) => {
      const product = productMap.get(card.productId);
      return product?.orderable && product.image && card.position !== null ? [{
        id: card.id, productId: card.productId as PublicWikiShopShowcase["productId"],
        afterSectionIndex: card.position, sectionTitle: focusRow?.sections[card.position]?.title ?? card.sectionTitle,
        title: card.title, description: card.description, buttonLabel: card.buttonLabel,
        url: product.url, image: product.image, imageAlt: product.name,
      }] : [];
    });
  if (previewOffer) previewOffers.push(previewOffer);
  const selectedPublish = checkedProposals.map((id) => data.proposals.find((p) => p.id === id))
    .filter((p): p is Proposal => Boolean(p));
  function itemForProposal(p: Proposal): Draft | null {
    const row = articleMap.get(p.articleId);
    if (!row) return null;
    return edits[p.id] ?? draftFor(row, p.productId, p);
  }
  const eligibleProposal = (p: Proposal) => {
    const row = articleMap.get(p.articleId), item = itemForProposal(p);
    return Boolean(row && item && row.isPublic && productMap.get(item.productId)?.orderable &&
      item.articleVersion === row.articleVersion && validPosition(row, item) &&
      item.title.trim() && item.description.trim() && item.buttonLabel.trim() &&
      !row.showcases.some((s) => s.afterSectionIndex === item.afterSectionIndex));
  };

  async function operation(task: () => Promise<void>) {
    setLoading(true); setError(""); setNotice("");
    try { await task(); } catch (cause) {
      setError(cause instanceof Error ? cause.message : "درخواست انجام نشد");
    } finally { setLoading(false); }
  }
  function updateDemoPublish(items: Draft[], enabled: boolean) {
    const storeData = store.current;
    const nextArticles = storeData.articles.map((a) => {
      const ours = items.filter((item) => item.articleId === a.articleId);
      if (!ours.length) return a;
      const cards = [...a.showcases];
      for (const item of ours) {
        const index = cards.findIndex((card) => card.id === item.showcaseId);
        const card: Showcase = {
          ...item, id: item.showcaseId ?? crypto.randomUUID(), enabled,
          expectedRevision: item.expectedRevision + 1,
          updatedAt: new Date().toISOString(), position: item.afterSectionIndex,
          active: enabled, needsReview: false, blocked: null, disabled: !enabled,
        };
        if (index === -1) cards.push(card);
        else cards[index] = card;
      }
      return { ...a, showcases: cards, showcase: cards[0] ?? null,
        hasShowcase: cards.length > 0, active: cards.some((c) => c.active),
        hasPending: false, needsReview: false, blocked: null };
    });
    const nextProposals = storeData.proposals.map((p) =>
      items.some((i) => i.proposalId === p.id) ? { ...p, status: "published" } : p);
    store.current = { ...storeData, articles: nextArticles, proposals: nextProposals,
      productCounts: storeData.products.map((p) => ({
        productId: p.id,
        active: nextArticles.reduce((n, a) =>
          n + a.showcases.filter((c) => c.productId === p.id && c.active).length, 0),
        configured: nextArticles.reduce((n, a) =>
          n + a.showcases.filter((c) => c.productId === p.id).length, 0),
      })),
      counts: {
        total: nextArticles.length, missing: nextArticles.filter((a) => !a.hasShowcase).length,
        has: nextArticles.filter((a) => a.hasShowcase).length,
        active: nextArticles.filter((a) => a.active).length,
        disabled: nextArticles.filter((a) => a.showcases.some((s) => s.disabled)).length,
        pending: nextProposals.filter((p) => p.status === "pending").length,
        review: 0,
      } };
    setData({ ...store.current });
  }
  async function publishSelected() {
    const items = selectedPublish.map(itemForProposal).filter((item): item is Draft => Boolean(item));
    if (!items.length || selectedPublish.some((p) => !eligibleProposal(p))) {
      setError("پیشنهادهای انتخاب‌شده رو بررسی کن؛ محصول، نسخه یا جایگاه بعضی‌ها معتبر نیست."); return;
    }
    if (!window.confirm(`تأیید و انتشار ${formatCount(items.length)} ویترین انجام بشه؟`)) return;
    await operation(async () => {
      if (demo) {
        updateDemoPublish(items, true);
        setCheckedProposals([]);
        setNotice(`${formatCount(items.length)} ویترین منتشر شد.`);
        return;
      }
      const published: string[] = [], failures: string[] = [];
      for (let index = 0; index < selectedPublish.length; index += 50) {
        const group = selectedPublish.slice(index, index + 50);
        try {
          await jsonRequest({ action: "publish", items: group.map((proposal) => ({
            ...itemForProposal(proposal), enabled: true,
          })) });
          published.push(...group.map((proposal) => proposal.id));
        } catch (cause) {
          failures.push(cause instanceof Error ? cause.message : "خطای انتشار");
        }
      }
      await refresh();
      setCheckedProposals((old) => old.filter((id) => !published.includes(id)));
      if (!failures.length) setDraft(null);
      setNotice(`${formatCount(published.length)} ویترین منتشر شد.`);
      if (failures.length) setError(`${formatCount(failures.length)} دسته ناموفق: ${failures.join("؛ ")}`);
    });
  }
  async function publishManual() {
    if (!draft || !focusRow || !focusRow.isPublic || !currentProduct?.orderable ||
      !positionValid || !draft.title.trim() || !draft.description.trim() ||
      !draft.buttonLabel.trim() || draft.articleVersion !== focusRow.articleVersion ||
      focusRow.showcases.some((s) => s.afterSectionIndex === draft.afterSectionIndex &&
        s.id !== draft.showcaseId)) {
      setError("مقاله، محصول، محل نمایش و متن رو بررسی کن."); return;
    }
    if (!window.confirm("این ویترین تأیید و منتشر بشه؟")) return;
    await operation(async () => {
      if (demo) updateDemoPublish([draft], true);
      else { await jsonRequest({ action: "publish", items: [{ ...draft, enabled: true }] }); await refresh(); }
      setNotice("ویترین منتشر شد.");
    });
  }
  async function rejectChecked() {
    if (!checkedProposals.length ||
      !window.confirm(`رد ${formatCount(checkedProposals.length)} پیشنهاد انجام بشه؟`)) return;
    await operation(async () => {
      if (demo) {
        store.current.proposals = store.current.proposals.map((p) =>
          checkedProposals.includes(p.id) ? { ...p, status: "rejected" } : p);
        setData({ ...store.current });
        setCheckedProposals([]);
        setNotice("پیشنهادها رد شدند.");
        return;
      }
      const rejectedIds: string[] = [], failures: string[] = [];
      for (let index = 0; index < checkedProposals.length; index += 50) {
        const ids = checkedProposals.slice(index, index + 50);
        try {
          await jsonRequest({ action: "reject", proposalIds: ids });
          rejectedIds.push(...ids);
        } catch (cause) {
          failures.push(cause instanceof Error ? cause.message : "خطای رد پیشنهاد");
        }
      }
      await refresh();
      setCheckedProposals((old) => old.filter((id) => !rejectedIds.includes(id)));
      if (!failures.length) setDraft(null);
      setNotice(`${formatCount(rejectedIds.length)} پیشنهاد رد شد.`);
      if (failures.length) setError(`${formatCount(failures.length)} دسته ناموفق: ${failures.join("؛ ")}`);
    });
  }
  async function reopenProposal(id: string) {
    await operation(async () => {
      if (demo) {
        store.current.proposals = store.current.proposals.map((p) =>
          p.id === id ? { ...p, status: "pending" } : p);
        setData({ ...store.current });
      } else {
        await jsonRequest({ action: "reopen", proposalIds: [id] });
        await refresh();
      }
      setNotice("پیشنهاد به صف بررسی برگشت.");
    });
  }
  async function toggleArticles(enabled: boolean, ids: string[], showcaseId?: string) {
    const items: Draft[] = [];
    for (const id of ids) {
      const row = articleMap.get(id);
      if (!row) continue;
      for (const existing of row.showcases.filter((s) => !showcaseId || s.id === showcaseId)) {
        const section = existing.position === null ? undefined :
          row.sections.find((s) => s.index === existing.position);
        if (enabled && (!row.isPublic || !productMap.get(existing.productId)?.orderable ||
          !section || section.index >= row.sections.length - 1 ||
          (row.sections.length >= 4 && section.index === 0))) {
          setError("برخی ویترین‌ها مانع نمایش دارن؛ اون‌ها رو جداگانه بررسی کن."); return;
        }
        items.push({
          articleId: id, showcaseId: existing.id,
          articleVersion: enabled ? row.articleVersion : existing.articleVersion,
          productId: existing.productId,
          afterSectionIndex: enabled ? (section?.index ?? 0) : existing.afterSectionIndex,
          sectionTitle: enabled ? (section?.title ?? existing.sectionTitle) : existing.sectionTitle,
          sectionAnchor: existing.sectionAnchor,
          title: existing.title, description: existing.description, buttonLabel: existing.buttonLabel,
          expectedRevision: existing.expectedRevision, enabled,
        });
      }
    }
    if (!items.length) { setError("هیچ ویترین ثبت‌شده‌ای انتخاب نشده."); return; }
    if (!window.confirm(`${enabled ? "فعال‌کردن" : "غیرفعال‌کردن"} ${formatCount(items.length)} ویترین انجام بشه؟`)) return;
    await operation(async () => {
      if (demo) {
        updateDemoPublish(items, enabled);
        setNotice(`${formatCount(items.length)} ویترین تغییر کرد.`);
        return;
      }
      let changed = 0;
      const failures: string[] = [];
      for (let index = 0; index < items.length; index += 50) {
        const batch = items.slice(index, index + 50);
        try {
          await jsonRequest({ action: "toggle", items: batch });
          changed += batch.length;
        } catch (cause) {
          failures.push(cause instanceof Error ? cause.message : "خطای تغییر وضعیت");
        }
      }
      await refresh();
      setNotice(`${formatCount(changed)} ویترین ${enabled ? "فعال" : "غیرفعال"} شد.`);
      if (failures.length) setError(`${formatCount(failures.length)} دسته ناموفق: ${failures.join("؛ ")}`);
    });
  }
  async function exportSelected() {
    if (!selected.length || !productIds.length) { setError("مقاله و محصول انتخاب کن."); return; }
    if (demo) { setNotice("دریافت ZIP واقعی از پنل ادمین متصل به ویکی انجام می‌شه."); return; }
    await operation(async () => {
      const estimate = await jsonRequest<{ ok: true; estimatedBytes: number; articleCount: number }>({
        action: "estimate", articleIds: selected,
      });
      const approxMb = (estimate.estimatedBytes / 1_000_000).toLocaleString("fa-IR", {
        maximumFractionDigits: 1,
      });
      if (!window.confirm(`متن ${formatCount(estimate.articleCount)} مقاله حدود ${approxMb} مگابایت است. یک ZIP برای AI دانلود شود؟`)) return;
      const response = await fetch("/api/admin/wiki/shop-showcases", {
        method: "POST", cache: "no-store",
        headers: { authorization: "Bearer " + token, "content-type": "application/json" },
        body: JSON.stringify({ action: "export_zip", articleIds: selected, productIds,
          productMinimums: Object.fromEntries(productIds.map((id) => [id, productMinimums[id] ?? 0])) }),
      });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error ?? "ساخت ZIP ناموفق بود");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const fileName = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1];
      anchor.download = fileName ?? "halleus-wiki-showcases-ai.zip";
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
      await refresh();
      setNotice("یک فایل ZIP برای AI دریافت شد.");
    });
  }
  async function importFile(file: File | null) {
    if (!file) return;
    if (demo) { setNotice("ورود فایل واقعی در پنل ادمین فعال است."); return; }
    await operation(async () => {
      if (file.size > 8_000_000) throw new Error("فایل بزرگ‌تر از ۸ مگابایت است");
      let result: { accepted: number; errors: Array<{ index: number; error: string }> };
      if (file.name.toLowerCase().endsWith(".zip")) {
        const fd = new FormData(); fd.append("file", file);
        const response = await fetch("/api/admin/wiki/shop-showcases", {
          method: "POST", headers: { authorization: "Bearer " + token },
          body: fd,
        });
        const body = await response.json() as { ok: boolean; error?: string;
          accepted: number; errors: Array<{ index: number; error: string }> };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "فایل وارد نشد");
        result = body;
      } else throw new Error("فقط فایل ZIP پیشنهادهای AI قابل ورود است");
      await refresh();
      setNotice(`${formatCount(result.accepted)} پیشنهاد وارد شد.` +
        (result.errors.length ? ` ${formatCount(result.errors.length)} خطا: ` +
          result.errors.slice(0, 8).map((e) => `ردیف ${formatCount(e.index + 1)}: ${e.error}`).join("؛ ") : ""));
    });
  }

  async function requestCopyUpdate(file: File, copyMode: "preview" | "apply") {
    const form = new FormData();
    form.append("file", file);
    form.append("copyMode", copyMode);
    const response = await fetch("/api/admin/wiki/shop-showcases", {
      method: "POST", cache: "no-store",
      headers: { authorization: "Bearer " + token }, body: form,
    });
    const body = await response.json() as { ok: boolean; error?: string;
      matchedCount: number; changedCount: number; alreadyAppliedCount: number };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "بررسی بستهٔ اصلاح متن ناموفق بود");
    return body;
  }
  async function previewCopyUpdate(file: File | null) {
    if (!file || demo) return;
    setCopyFile(null); setCopyPreview(null);
    await operation(async () => {
      if (!file.name.toLowerCase().endsWith(".zip") || file.size > 8_000_000) {
        throw new Error("برای اصلاح متن فقط فایل ZIP تا ۸ مگابایت مجاز است");
      }
      const result = await requestCopyUpdate(file, "preview");
      setCopyFile(file);
      setCopyPreview(result);
      setNotice(`${formatCount(result.matchedCount)} ویترین با بستهٔ اصلاح متن تطبیق داشت؛ هنوز تغییری ذخیره نشده.`);
    });
  }
  async function applyCopyUpdate() {
    if (!copyFile || !copyPreview || demo) return;
    if (!window.confirm(`متن ${formatCount(copyPreview.changedCount)} ویترین منتشرشده جایگزین بشه؟ محصول، جایگاه و وضعیت انتشار ثابت می‌مونن.`)) return;
    await operation(async () => {
      const result = await requestCopyUpdate(copyFile, "apply");
      await refresh();
      setCopyFile(null); setCopyPreview(null);
      setNotice(`متن ${formatCount(result.changedCount)} ویترین به‌روزرسانی شد؛ ${formatCount(result.alreadyAppliedCount)} مورد قبلاً اعمال شده بود.`);
    });
  }

  const help = (
    <div className={styles.helpBox}>
      <button type="button" className={styles.helpButton} aria-label="راهنمای ویترین"
        aria-expanded={helpOpen} aria-controls={helpId}
        onClick={() => setHelpOpen((open) => !open)}>؟</button>
      {helpOpen ? <div className={styles.helpWindow} id={helpId} role="region" aria-label="راهنمای ویترین">
        <div className={styles.helpHeading}><strong>راهنمای ویترین</strong>
          <button type="button" onClick={() => setHelpOpen(false)}>بستن ×</button></div>
        <p>در «مدیریت» ویترین‌ها رو ویرایش کن، در «بسته‌ها و AI» مقاله‌ها و محصولات رو انتخاب کن و ZIP بگیر، و نتیجه رو در «آمار» ببین.</p>
        <p>یک ZIP به AI بده و خروجی AI رو هم در یک ZIP شامل proposals.json تحویل بگیر؛ پیشنهادها رو بازبینی کن و فقط موارد دلخواهت رو تیک بزن.</p>
        <p>هر مقاله می‌تونه چند ویترین در بخش‌های متفاوت داشته باشه؛ هر کارت مستقل ویرایش و خاموش یا روشن می‌شه. «تأیید و انتشار» یعنی ویترین همان لحظه فعال می‌شه. بعداً می‌تونی هر ویترین رو دستی یا گروهی خاموش و روشن کنی.</p>
        <p>اگر مقاله تغییر کنه، جایگاه قبلی تا جایی که هنوز قابل شناسایی باشه حفظ می‌شه و برای بازبینی علامت می‌خوره.</p>
        {demo ? <p>اینجا داده‌ها نمونه‌اند و چیزی روی سایت ذخیره نمی‌شه.</p> : null}
      </div> : null}
    </div>
  );

  return <section className={styles.manager} dir="rtl" data-demo={demo ? "true" : undefined}>
    <header className={styles.header}>
      <div className={styles.headerTitle}><span className={styles.workspaceLabel}>ویترین‌ها / {activeSection === "overview" ? "نمای کلی" : activeSection === "manage" ? "مدیریت" : activeSection === "ai" ? "بسته‌ها و AI" : "آمار"}</span>{demo ? <small>نمونه</small> : null}{help}</div>
      <button type="button" onClick={() => {
        void refresh().catch((cause) => setError(String(cause)));
        if (activeSection === "overview" || activeSection === "metrics") void refreshMetrics();
      }} disabled={loading || metricBusy}>تازه‌سازی</button>
    </header>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {notice ? <p role="status" className={styles.success}>{notice}</p> : null}
    {activeSection === "overview" ? <>
    <div className={styles.stats} aria-label="وضعیت ویترین‌ها">
      <span>کل مقاله‌ها <b>{formatCount(data.counts.total)}</b></span>
      <span>بدون ویترین <b>{formatCount(data.counts.missing)}</b></span>
      <span>منتظر بررسی <b>{formatCount(data.counts.pending)}</b></span>
      <details className={styles.moreStats}>
        <summary>آمار بیشتر</summary>
        <div>
          <span>دارای ویترین <b>{formatCount(data.counts.has)}</b></span>
          <span>فعال <b>{formatCount(data.counts.active)}</b></span>
          <span>نیازمند بازبینی <b>{formatCount(data.counts.review)}</b></span>
        </div>
      </details>
    </div>
    </> : null}
    {activeSection === "overview" ? <section className={styles.overviewWorkspace} aria-label="نمای کلی ویترین‌ها">
      <div className={styles.overviewIntro}>
        <div><span className={styles.overviewKicker}>از مقاله تا محصول</span>
          <h3>ویترین‌های مرتبط، در یک نگاه</h3>
          <p>وضعیت انتشار، پیشنهادهای منتظر بررسی و نتیجهٔ کلیک روی ویترین‌ها؛ هر ابزار در بخش خودش.</p>
        </div>
        <button type="button" disabled={loading || metricBusy}
          onClick={() => { void refresh().catch((e) => setError(String(e))); void refreshMetrics(); }}>
          تازه‌سازی نمای کلی
        </button>
      </div>
      <div className={styles.overviewNumbers}>
        <div><span>ویترین فعال</span><strong>{formatCount(totalActiveShowcases)}</strong>
          <small>در {formatCount(data.counts.active)} مقاله</small></div>
        <div><span>نمایش ویترین · {metricWindow === "7" ? "۷ روز اخیر" :
          metricWindow === "30" ? "۳۰ روز اخیر" : "کل دوره"}</span><strong>{metricData?.ready
          ? formatCount(metricData.summary.impressions) : "—"}</strong>
          <small>نمایش‌های ثبت‌شده، نه کاربران یکتا</small></div>
        <div><span>کلیک روی ویترین · {metricWindow === "7" ? "۷ روز اخیر" :
          metricWindow === "30" ? "۳۰ روز اخیر" : "کل دوره"}</span><strong>{metricData?.ready
          ? formatCount(metricData.summary.clicks) : "—"}</strong>
          <small>CTR: {metricData?.ready
            ? formatCtr(metricData.summary.clicks, metricData.summary.impressions) : "—"}</small></div>
      </div>
      {metricError ? <p role="alert" className={styles.error}>{metricError}</p> : null}
      <div className={styles.overviewShortcuts}>
        <button type="button" onClick={() => onSectionChange("manage")}>
          <strong>مدیریت ویترین‌ها</strong><span>ساخت، ویرایش و خاموش/روشن‌کردن هر جایگاه</span>
          <span aria-hidden="true">←</span></button>
        <button type="button" onClick={() => onSectionChange("ai")}>
          <strong>بسته‌ها و پیشنهادهای AI</strong><span>انتخاب مقاله، ZIP، بازبینی و انتشار پیشنهادها</span>
          <span aria-hidden="true">←</span></button>
        <button type="button" onClick={() => onSectionChange("metrics")}>
          <strong>آمار و عملکرد</strong><span>مقایسهٔ ویترین‌ها، محصولات، کلیک و CTR</span>
          <span aria-hidden="true">←</span></button>
      </div>
      <section className={styles.overviewAttention}>
        <h4>نیازمند رسیدگی</h4>
        <div>
          <button type="button" onClick={() => onSectionChange("ai")}>
            <span>پیشنهادهای در انتظار تصمیم</span><b>{formatCount(data.counts.pending)}</b></button>
          <button type="button" onClick={() => { setStatus("review"); setPage(0); onSectionChange("manage"); }}>
            <span>مقاله‌های دارای ویترین نیازمند بازبینی</span><b>{formatCount(data.counts.review)}</b></button>
          <button type="button" onClick={() => { setStatus("missing"); setPage(0); onSectionChange("manage"); }}>
            <span>مقاله‌های بدون ویترین</span><b>{formatCount(data.counts.missing)}</b></button>
        </div>
      </section>
      <section className={styles.overviewProducts}>
        <h4>پوشش محصولات</h4>
        <div>{data.products.map((product) => {
          const count = data.productCounts.find((item) => item.productId === product.id);
          return <button type="button" key={product.id}
            onClick={() => { setProductFilter(product.id); setPage(0); onSectionChange("manage"); }}>
            <strong>{product.name}</strong>
            <span>{formatCount(count?.active ?? 0)} فعال از {formatCount(count?.configured ?? 0)} جایگاه</span>
          </button>;
        })}</div>
      </section>
    </section> : null}
    {activeSection === "ai" ? <section className={styles.aiWorkspace} aria-label="بسته‌ها و پیشنهادهای AI">
      <div className={styles.sectionIntro}>
        <h3>بسته‌ها و پیشنهادهای AI</h3>
        <p>انتخاب مقاله و محصولات، دریافت بسته، ورود پیشنهادهای AI، بازبینی گروهی و اصلاح متن ویترین‌های منتشرشده.</p>
      </div>
      <div className={styles.aiLayout}>
        <div className={styles.aiLeft}>
      <section className={styles.aiArticlePicker} aria-label="انتخاب مقاله‌ها برای بستهٔ AI">
        <div className={styles.aiPickerHeading}>
          <h3>مقاله‌های بسته</h3>
          <span>{formatCount(selected.length)} انتخاب‌شده</span>
        </div>
        <p className={styles.hint}>از بین مقاله‌های منتشرشده انتخاب کن؛ این انتخاب برای خروجی ZIP استفاده می‌شه.</p>
        <label>جست‌وجوی مقاله
          <input value={aiSearch} placeholder="عنوان یا شناسهٔ مقاله"
            onChange={(event) => { setAiSearch(event.target.value); setAiPage(0); }} />
        </label>
        <div className={styles.aiPickerActions}>
          <button type="button" onClick={() => setSelected((old) =>
            [...new Set([...old, ...aiCandidates.map((a) => a.articleId)])])}>
            انتخاب همهٔ نتایج ({formatCount(aiCandidates.length)})
          </button>
          <button type="button" disabled={!selected.length} onClick={() => setSelected([])}>پاک‌کردن انتخاب</button>
        </div>
        <div className={styles.aiPickerList}>
          {aiCandidates.slice(aiPage * 12, (aiPage + 1) * 12).map((a) =>
            <label key={a.articleId}>
              <input type="checkbox" checked={selected.includes(a.articleId)}
                onChange={(event) => setSelected((old) => event.target.checked ?
                  [...new Set([...old, a.articleId])] : old.filter((id) => id !== a.articleId))} />
              <span>{a.title}</span><small>{formatCount(a.showcases.length)} ویترین</small>
            </label>)}
          {!aiCandidates.length ? <p className={styles.empty}>مقاله‌ای با این جست‌وجو پیدا نشد.</p> : null}
        </div>
        <div className={styles.pagination}>
          <button type="button" disabled={aiPage <= 0} onClick={() => setAiPage((v) => v - 1)}>قبلی</button>
          <span>{formatCount(aiPage + 1)} / {formatCount(Math.max(1, Math.ceil(aiCandidates.length / 12)))}</span>
          <button type="button" disabled={(aiPage + 1) * 12 >= aiCandidates.length}
            onClick={() => setAiPage((v) => v + 1)}>بعدی</button>
        </div>
      </section>
        </div>
        <div className={styles.aiTools}>
        <div className={styles.zipArea}>
          <h3>بستهٔ AI</h3>
          <p className={styles.hint}>هدف هر محصول راهنمای پیشنهادهای AI است، نه سهمیهٔ اجباری یا انتشار خودکار. عدد صفر یعنی بدون حداقل.</p>
          <p>{formatCount(selected.length)} مقالهٔ انتخاب‌شده؛ همه در یک ZIP همراه با راهنمای AI و یک شناسهٔ بسته قرار می‌گیرن.</p>
          <div className={styles.rowActions}>
            <button type="button" onClick={() => setProductIds(data.products.map((p) => p.id))}>
              انتخاب همهٔ محصولات
            </button>
            <button type="button" onClick={() => setProductIds([])}>لغو انتخاب محصولات</button>
          </div>
          <div className={styles.productChecks}>{data.products.map((p) => {
            const active = data.productCounts.find((c) => c.productId === p.id)?.active ?? 0;
            return <label key={p.id}>
              <input type="checkbox" checked={productIds.includes(p.id)}
                onChange={(e) => setProductIds((old) => e.target.checked
                  ? [...old, p.id] : old.filter((id) => id !== p.id))} />
              {p.name}{!p.orderable ? " (فروش بسته)" : ""}
              <small>ویترین فعال: {formatCount(active)} · هدف: {formatCount(productMinimums[p.id] ?? 0)}</small>
              {productIds.includes(p.id) ? <span>هدف تعداد ویترین فعال برای این محصول
                <input type="number" min={0} max={500} step={1}
                  disabled={!p.orderable}
                  value={productMinimums[p.id] ?? 0}
                  onChange={(e) => setProductMinimums((old) => ({
                    ...old, [p.id]: Math.max(0, Math.min(500, Math.floor(Number(e.target.value) || 0))),
                  }))} />
              </span> : null}
            </label>;
          })}</div>
          <button type="button" disabled={!canWrite || loading || !selected.length || !productIds.length}
            onClick={() => void exportSelected()}>دریافت ZIP برای AI</button>
        </div>
        <div className={styles.importArea}>
          <h3>پیشنهادهای AI</h3>
          <label className={styles.upload}>ورود یک ZIP پیشنهادهای AI
            <input type="file" accept=".zip,application/zip"
              disabled={!canWrite || loading}
              onChange={(event) => { void importFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
          </label>
          <div className={styles.importArea}>
            <h3>متن ویترین‌های منتشرشده</h3>
            <p className={styles.hint}>فقط برای اصلاح عنوان، توضیح و متن دکمهٔ ویترین‌های موجود؛ هیچ ویترین تازه‌ای ساخته نمی‌شود.</p>
            <label className={styles.upload}>انتخاب ZIP اصلاح متن
              <input type="file" accept=".zip,application/zip"
                disabled={!canWrite || loading}
                onChange={(event) => { void previewCopyUpdate(event.target.files?.[0] ?? null); event.target.value = ""; }} />
            </label>
            {copyPreview ? <div className={styles.rowActions}>
              <p>{formatCount(copyPreview.matchedCount)} تطبیق · {formatCount(copyPreview.changedCount)} نیازمند تغییر · {formatCount(copyPreview.alreadyAppliedCount)} قبلاً اعمال‌شده</p>
              <button type="button" disabled={!canWrite || loading || !copyFile}
                onClick={() => void applyCopyUpdate()}>تأیید و جایگزینی متن</button>
            </div> : null}
          </div>
          <div className={styles.pendingBar}>
            <span>{formatCount(pending.length)} منتظر تصمیم</span>
            <button type="button" onClick={() => setCheckedProposals(pending.map((p) => p.id))}>انتخاب همه</button>
            <button type="button" onClick={() => setCheckedProposals([])}>لغو</button>
          </div>
          {visiblePending.map((p) => {
            const a = articleMap.get(p.articleId);
            return <div className={styles.proposalRow} key={p.id}>
              <input type="checkbox" aria-label={"تأیید " + (a?.title ?? p.articleId)}
                checked={checkedProposals.includes(p.id)}
                onChange={(event) => setCheckedProposals((old) => event.target.checked
                  ? [...old, p.id] : old.filter((id) => id !== p.id))} />
              <div><strong>{a?.title ?? p.articleId}</strong>
                <small>{productMap.get(p.productId)?.name ?? p.productId} · {p.sectionTitle}</small>
                {!eligibleProposal(p) ? <small className={styles.invalid}>نیازمند بررسی نسخه، جایگاه یا فروش محصول</small> : null}
              </div>
              <button type="button" onClick={() => focusProposal(p)}>بازبینی</button>
            </div>;
          })}
          {!pending.length ? <p className={styles.empty}>پیشنهاد منتظر تصمیمی نیست.</p> : null}
          {pendingPageCount > 1 ? <div className={styles.pagination}>
            <button type="button" disabled={currentProposalPage <= 0}
              onClick={() => setProposalPage((value) => Math.max(0, value - 1))}>قبلی</button>
            <span>پیشنهادها: {formatCount(currentProposalPage + 1)} / {formatCount(pendingPageCount)}</span>
            <button type="button" disabled={currentProposalPage + 1 >= pendingPageCount}
              onClick={() => setProposalPage((value) => Math.min(value + 1, pendingPageCount - 1))}>بعدی</button>
          </div> : null}
          {rejected.length ? <details className={styles.reviewHistory}>
            <summary>پیشنهادهای ردشده ({formatCount(rejected.length)})</summary>
            {rejected.map((p) => <div className={styles.proposalRow} key={p.id}>
              <div><strong>{articleMap.get(p.articleId)?.title ?? p.articleId}</strong>
                <small>{p.title}</small></div>
              <button type="button" onClick={() => focusProposal(p)}>دیدن</button>
              {canWrite ? <button type="button" disabled={loading} onClick={() => void reopenProposal(p.id)}>
                بازگشت به بررسی
              </button> : null}
            </div>)}
          </details> : null}
          {canWrite ? <div className={styles.publishActions}>
            <button type="button" disabled={!checkedProposals.length || loading}
              onClick={() => void publishSelected()}>تأیید و انتشار {formatCount(checkedProposals.length)} ویترین</button>
            <button type="button" disabled={!checkedProposals.length || loading}
              onClick={() => void rejectChecked()}>رد انتخاب‌شده‌ها</button>
          </div> : null}
        </div>

        </div>
      </div>
    </section> : null}
{activeSection === "metrics" ? <>
    <section className={styles.metricsSection} aria-label="آمار عملکرد ویترین‌ها">
      <div className={styles.metricsHeading}>
        <div>
          <h3>عملکرد ویترین‌های ویکی</h3>
          <p>شمارش از زمان فعال‌شدن این قابلیت شروع می‌شه؛ نمایش‌ها و کلیک‌ها تعداد رویدادن، نه تعداد کاربران یکتا.</p>
        </div>
        <button type="button" disabled={metricBusy} onClick={() => void refreshMetrics()}>{metricBusy ? "در حال بروزرسانی…" : "تازه‌سازی آمار"}</button>
        <label>بازهٔ آماری
          <select value={metricWindow} onChange={(event) => setMetricWindow(event.target.value as "7" | "30" | "all")}>
            <option value="7">۷ روز اخیر</option>
            <option value="30">۳۰ روز اخیر</option>
            <option value="all">کل دوره</option>
          </select>
        </label>
      </div>
      {metricError ? <p className={styles.error} role="alert">{metricError}</p> : null}
      {!demo && !metricData ? <p className={styles.hint}>در حال خواندن آمار...</p> : null}
      {demo ? <p className={styles.hint}>آمار فقط از سایت واقعی جمع می‌شه؛ پیش‌نمایش مدیریتی شمرده نمی‌شه.</p>
        : metricData && !metricData.ready ? <p className={styles.warning}>
          جدول آمار هنوز فعال نشده؛ ابتدا migration شمارهٔ ۰۰۳۹ باید با تأیید مدیر روی دیتابیس اجرا بشه.
        </p> : metricData?.ready ? <>
          <div className={styles.metricTotals}>
            <span>نمایش واقعی <b>{formatCount(metricData.summary.impressions)}</b></span>
            <span>کلیک روی ویترین <b>{formatCount(metricData.summary.clicks)}</b></span>
            <span>نرخ کلیک <b>{formatCtr(metricData.summary.clicks, metricData.summary.impressions)}</b></span>
          </div>
          <div className={styles.metricProducts}>
            {data.products.filter((p) => p.id === "p01" || p.id === "p02").map((product) => {
              const values = (metricData.metrics ?? []).filter((r) => r.productId === product.id);
              const impressions = values.reduce((sum, m) => sum + m.impressions, 0);
              const clicks = values.reduce((sum, m) => sum + m.clicks, 0);
              return <span key={product.id}><strong>{product.name}</strong>
                {formatCount(impressions)} نمایش · {formatCount(clicks)} کلیک · {formatCtr(clicks, impressions)}</span>;
            })}
          </div>
          <div className={styles.metricFilters}>
            <label>محصول
              <select value={metricProduct} onChange={(event) => { setMetricProduct(event.target.value); setMetricPage(0); }}>
                <option value="all">همهٔ محصولات</option>
                {data.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>مرتب‌سازی
              <select value={metricSort} onChange={(event) => { setMetricSort(event.target.value as "clicks" | "ctr" | "impressions"); setMetricPage(0); }}>
                <option value="clicks">تعداد کلیک</option>
                <option value="ctr">نرخ کلیک</option>
                <option value="impressions">تعداد نمایش</option>
              </select>
            </label>
            <label>ترتیب
              <select value={metricDirection} onChange={(event) => { setMetricDirection(event.target.value as "desc" | "asc"); setMetricPage(0); }}>
                <option value="desc">بیشترین اول</option>
                <option value="asc">کمترین اول</option>
              </select>
            </label>
          </div>
          <div className={styles.metricTableScroll}>
            <table className={styles.metricTable}>
              <thead><tr><th>مقاله / ویترین</th><th>محصول</th><th>نمایش</th><th>کلیک</th><th>CTR</th></tr></thead>
              <tbody>
                {performanceRows.slice(metricPage * 20, (metricPage + 1) * 20).map((row) => (
                  <tr key={row.showcaseId}>
                    <td><button type="button" className={styles.metricArticleLink}
                      onClick={() => {
                        const article = articleMap.get(row.articleId);
                        const card = article?.showcases.find((s) => s.id === row.showcaseId);
                        if (article && card) { focusArticle(article, undefined, card); onSectionChange("manage"); }
                      }}>{row.articleTitle}</button><small>{row.cardTitle}</small></td>
                    <td>{productMap.get(row.productId)?.name ?? row.productId}</td>
                    <td>{formatCount(row.impressions)}</td><td>{formatCount(row.clicks)}</td>
                    <td>{formatCtr(row.clicks, row.impressions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button type="button" disabled={metricPage === 0} onClick={() => setMetricPage((n) => n - 1)}>قبلی</button>
            <span>{formatCount(metricPage + 1)} / {formatCount(Math.max(1, Math.ceil(performanceRows.length / 20)))}</span>
            <button type="button" disabled={(metricPage + 1) * 20 >= performanceRows.length} onClick={() => setMetricPage((n) => n + 1)}>بعدی</button>
          </div>
        </> : null}
    </section>
</> : null}
    {activeSection === "manage" ? <>
    <div className={styles.sectionIntro}>
      <h3>مدیریت ویترین‌ها</h3>
      <p>مقاله رو پیدا کن، جایگاه هر ویترین رو انتخاب کن و در کنار پیش‌نمایش واقعی ویرایشش کن.</p>
    </div>
    <div className={styles.primaryFilters}>
      <label>جست‌وجوی مقاله <input value={query} placeholder="نام مقاله یا شناسه"
        onChange={(e) => { setQuery(e.target.value); setPage(0); }} /></label>
      <label>وضعیت ویترین <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
        {[
          ["all", "همهٔ مقاله‌ها"], ["missing", "ویترین ندارد / باید ساخته شود"],
          ["has", "ویترین دارد"], ["active", "ویترین فعال"], ["disabled", "ویترین غیرفعال"],
          ["pending", "پیشنهاد در انتظار تصمیم"], ["rejected", "پیشنهاد ردشده"],
          ["review", "پیشنهاد بازبینی"], ["blocked", "مانع نمایش"],
           ["free", "بخش آزاد برای ویترین جدید"],
        ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="button" className={styles.moreFiltersButton}
        aria-controls={moreFiltersId} aria-expanded={moreFiltersOpen}
        onClick={() => setMoreFiltersOpen((open) => !open)}>
        {moreFiltersOpen ? "بستن فیلترها" : "فیلترهای بیشتر"}
        {[category !== "all", publication !== "all", productFilter !== "all", sort !== "title"]
          .filter(Boolean).length ? " •" : ""}
      </button>
    </div>
    <div className={styles.filters} id={moreFiltersId} hidden={!moreFiltersOpen}>
      <label>موضوع <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
        <option value="all">همهٔ موضوع‌ها</option>
        {categories.map((value) => <option value={value} key={value}>{value}</option>)}
      </select></label>
      <label>انتشار مقاله <select value={publication} onChange={(e) => { setPublication(e.target.value); setPage(0); }}>
        <option value="all">همه</option>
        {["published", "draft", "scheduled", "archived"].map((value) =>
          <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label>محصول متصل <select value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setPage(0); }}>
        <option value="all">همه</option>
        {data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select></label>
      <label>مرتب‌سازی <select value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="title">عنوان</option><option value="recent">آخرین ویرایش</option>
        <option value="status">وضعیت ویترین</option>
      </select></label>
    </div>
    <div className={styles.bulkBar}>
      <strong>{formatCount(selected.length)} انتخاب‌شده از {formatCount(filtered.length)} نتیجه</strong>
      <button type="button" onClick={() => setSelected((old) => [...new Set([...old, ...filteredIds])])}>
        انتخاب نتایج فیلترشده
      </button>
      <button type="button" disabled={!selected.length} onClick={() => setSelected([])}>پاک‌کردن انتخاب</button>
      {canWrite ? <details className={styles.bulkMore}>
        <summary>مدیریت گروهی</summary>
        <div>
          <button type="button" disabled={!selected.length || loading}
            onClick={() => void toggleArticles(false, selected)}>خاموش‌کردن انتخاب‌شده‌ها</button>
          <button type="button" disabled={!selected.length || loading}
            onClick={() => void toggleArticles(true, selected)}>روشن‌کردن انتخاب‌شده‌ها</button>
        </div>
      </details> : null}
    </div>
    <div className={styles.columns}>
      <div className={styles.listColumn}>
        <div className={styles.articleList}>
          <div className={styles.sectionHeading}>
            <h3>مقاله‌ها</h3><span>{formatCount(filtered.length)} نتیجه</span>
          </div>
          {visibleRows.map((a) => <article key={a.articleId} className={styles.articleRow}
            data-focused={focusedId === a.articleId ? "true" : undefined}>
            <input type="checkbox" aria-label={"انتخاب " + a.title}
              checked={selected.includes(a.articleId)}
              onChange={(e) => setSelected((old) => e.target.checked
                ? [...old.filter((x) => x !== a.articleId), a.articleId]
                : old.filter((x) => x !== a.articleId))} />
            <div className={styles.articleRowBody}>
              <strong>{a.title}</strong><small>{a.categoryId} · {a.publicationStatus}</small>
              <div className={styles.rowMeta}>
                <span>{a.hasShowcase ? `${formatCount(a.showcases.length)} ویترین دارد` : "باید ساخته شود"}</span>
                {a.active ? <span>فعال</span> : null}
                {a.showcases.some((s) => s.disabled) ? <span>غیرفعال</span> : null}
                {a.hasPending ? <span>پیشنهاد AI</span> : null}
                {a.hasRejected ? <span>پیشنهاد ردشده</span> : null}
                {a.hasSkipped ? <span>AI: مورد مرتبطی پیدا نکرد</span> : null}
                {a.needsReview ? <span>پیشنهاد بازبینی</span> : null}
                {a.blocked && a.hasShowcase ? <span>{a.blocked}</span> : null}
                {a.lastExportedAt ? <span>قبلاً در بسته بوده</span> : null}
              </div>
              <div className={styles.rowActions}>
                <button type="button" disabled={!a.sections.some((s) =>
                  s.index < a.sections.length - 1 && (a.sections.length < 4 || s.index > 0) &&
                  !a.showcases.some((card) => card.afterSectionIndex === s.index))}
                  onClick={() => focusArticle(a, undefined, null)}>افزودن ویترین</button>
                {a.isPublic ? <a href={a.slug.startsWith("demo") ? "#showcase-article-preview" : "/wiki/" + a.slug}
                  target={a.slug.startsWith("demo") ? undefined : "_blank"}
                  rel={a.slug.startsWith("demo") ? undefined : "noreferrer"}>مقاله</a> : null}
              </div>
              {a.showcases.map((card) => <div className={styles.showcaseEntry} key={card.id}>
                <small>{productMap.get(card.productId)?.name ?? card.productId} · پس از «{card.sectionTitle}» · {card.enabled ? "روشن" : "خاموش"}</small>
                <div className={styles.rowActions}>
                  <button type="button" onClick={() => focusArticle(a, undefined, card)}>ویرایش این ویترین</button>
                  {canWrite ? <button type="button" disabled={loading}
                    onClick={() => void toggleArticles(!card.enabled, [a.articleId], card.id)}>
                    {card.enabled ? "خاموش" : "روشن"}
                  </button> : null}
                </div>
              </div>)}
            </div>
          </article>)}
          {!visibleRows.length ? <p className={styles.empty}>مقاله‌ای با این فیلتر پیدا نشد.</p> : null}
        </div>
        <div className={styles.pagination}>
          <button type="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>قبلی</button>
          <span>صفحهٔ {formatCount(page + 1)} از {formatCount(pageCount)}</span>
          <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>بعدی</button>
        </div>


      </div>

      <div className={styles.editorColumn} id="showcase-article-preview" ref={editorPanelRef}>
        <section className={styles.quickPreview} aria-label="پیش‌نمایش زندهٔ کارت">
          <div className={styles.previewTitle}>
            <h3>کارت ویترین</h3>
            {focusRow ? <small>{focusRow.title}</small> : null}
          </div>
          {previewOffer ? <div className={styles.cardStage}>
            <WikiShopShowcaseCard offer={previewOffer} />
          </div> : <p className={styles.empty}>
            {draft && !currentProduct?.orderable ? "فروش این محصول فعلاً بسته است." :
              "یک پیشنهاد یا مقاله رو انتخاب کن تا کارت رو ببینی."}
          </p>}
        </section>
        <section className={styles.editor}>
          <h3>{draft?.showcaseId ? "ویرایش ویترین انتخاب‌شده" : "ساخت ویترین جدید"}</h3>
          {draft && focusRow ? <>
            <div className={styles.editorFields}>
              <label>مقاله <strong>{focusRow.title}</strong></label>
              <label>محصول <select value={draft.productId} onChange={(e) => updateDraft({ productId: e.target.value })}>
                {data.products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.orderable ? "" : " · فروش بسته"}</option>)}
              </select></label>
              <label>بعد از کدام بخش؟ <select value={draft.afterSectionIndex} onChange={(e) => {
                const next = focusRow.sections.find((s) => s.index === Number(e.target.value));
                if (next) updateDraft({ afterSectionIndex: next.index, sectionTitle: next.title,
                  sectionAnchor: next.anchor, articleVersion: focusRow.articleVersion });
              }}>
                {draft.afterSectionIndex < 0 ? <option value={-1} disabled>جایگاه قبلی پیدا نشد؛ انتخاب کن</option> : null}
                {focusRow.sections.filter((s) => s.index < focusRow.sections.length - 1 &&
                   (focusRow.sections.length < 4 || s.index > 0) &&
                   !focusRow.showcases.some((card) => card.id !== draft.showcaseId &&
                     card.afterSectionIndex === s.index))
                  .map((s) => <option key={s.index} value={s.index}>{s.title}</option>)}
              </select></label>
              <label>عنوان کارت <input value={draft.title} maxLength={160}
                onChange={(e) => updateDraft({ title: e.target.value })} /></label>
              <label>متن معرفی <textarea value={draft.description} maxLength={500} rows={3}
                onChange={(e) => updateDraft({ description: e.target.value })} /></label>
              <label>متن دکمه <input value={draft.buttonLabel} maxLength={80}
                onChange={(e) => updateDraft({ buttonLabel: e.target.value })} /></label>
            </div>
            {draft.articleVersion !== focusRow.articleVersion ? <p className={styles.warning}>
              مقاله بعد از پیشنهاد AI ویرایش شده. جایگاه رو دوباره انتخاب کن.</p> : null}
            {!currentProduct?.orderable ? <p className={styles.warning}>فروش این محصول فعلاً بسته است.</p> : null}
            {canWrite && !draft.proposalId ? <button type="button" disabled={loading}
              onClick={() => void publishManual()}>تأیید و انتشار همین ویترین</button> : null}
            {draft.proposalId ? <div className={styles.proposalReturn}>
              <p className={styles.hint}>تغییرهای این پیشنهاد ذخیرهٔ موقت شدن؛ برای انتشار یا رد آن به فهرست AI برگرد.</p>
              <button type="button" onClick={() => onSectionChange("ai")}>بازگشت به پیشنهادهای AI</button>
            </div> : null}
          </> : <p className={styles.empty}>یک مقاله یا پیشنهاد رو از فهرست انتخاب کن.</p>}
        </section>
        <details className={styles.fullArticle}>
          <summary>نمای کامل مقاله و محل قرارگیری کارت</summary>
          <section className={styles.previewPane}>
          <div className={styles.previewTitle}><h3>نمای مقاله</h3>
            {demo ? <small>نمونه</small> : null}</div>
          {detail ? <div className={styles.articleCanvas}>
            <div className={wikiStyles.page} style={{ paddingTop: 0, width: "100%" }}>
              <article className={styles.articleContent}>
                <header className={styles.articleHeading}>
                  <small>ویکی هالیوس</small><h2>{detail.title}</h2>
                  {detail.intro ? <p>{detail.intro}</p> : null}
                </header>
                <WikiArticleBody sections={detail.sections}
                  sources={[]} contextLinks={[]} targets={{}} showcase={previewOffers} />
              </article>
            </div>
          </div> : <p className={styles.empty}>مقاله‌ای رو انتخاب کن تا اینجا ببینیش.</p>}
          </section>
        </details>
      </div>
    </div>
    </> : null}
  </section>;
}
