/** Shared read-only placement vocabulary. Safe to import in client bundles. */
export const SHOWCASE_SURFACE_SLOTS = {
  natal: [
    { id: "after-summary", label: "پس از معرفی چارت", percent: 22 },
    { id: "after-report", label: "پس از گزارش کامل", percent: 68 },
    { id: "after-sky", label: "پس از آسمان و تو", percent: 84 },
  ],
  synastry: [
    { id: "after-patterns", label: "پس از الگوهای رابطه", percent: 25 },
    { id: "after-chapters", label: "پس از فصل‌های رابطه", percent: 67 },
    { id: "after-growth", label: "پس از گفت‌وگوی مشترک", percent: 83 },
  ],
  sky: [
    { id: "after-moon", label: "پس از وضعیت ماه", percent: 27 },
    { id: "after-aspects", label: "پس از زاویه‌های روز", percent: 68 },
    { id: "after-timeline", label: "پس از رویدادهای روز", percent: 82 },
  ],
} as const;
export type ShowcaseSurface = keyof typeof SHOWCASE_SURFACE_SLOTS;
export const SHOWCASE_SURFACES: ShowcaseSurface[] = ["natal", "synastry", "sky"];
export const SHOWCASE_SURFACE_LABELS: Record<ShowcaseSurface, string> = {
  natal: "گزارش تولد", synastry: "گزارش سینستری", sky: "آسمان امروز",
};
export type SurfaceOffer = {
  id: string; surface: ShowcaseSurface; slot: string; productId: string;
  title: string; description: string; buttonLabel: string;
  url: string; image: string; imageAlt: string;
};
export type SurfacePlacement = Omit<SurfaceOffer,"url"|"image"|"imageAlt"> & {
  enabled: boolean; expectedRevision: number;
};
export type SurfaceProposal = Omit<SurfacePlacement,"enabled"|"expectedRevision"> & {
  batchId: string; status: string;
};
export function isShowcaseSurface(value: unknown): value is ShowcaseSurface {
  return typeof value === "string" && SHOWCASE_SURFACES.includes(value as ShowcaseSurface);
}
export function isShowcaseSlot(surface: ShowcaseSurface, slot: unknown): slot is string {
  return typeof slot === "string" && SHOWCASE_SURFACE_SLOTS[surface].some(s => s.id === slot);
}
