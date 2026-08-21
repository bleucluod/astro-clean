export const WIKI_PUBLIC_SNAPSHOT_CACHE_TAG = "halleus-wiki-public-snapshot-v1";

const wikiCacheRuntime = globalThis as typeof globalThis & {
  __halleusStaleWikiSnapshotServingAllowed?: boolean;
};

function staleWikiSnapshotServingAllowed() {
  return wikiCacheRuntime.__halleusStaleWikiSnapshotServingAllowed !== false;
}

export function blockStaleWikiSnapshotServing() {
  wikiCacheRuntime.__halleusStaleWikiSnapshotServingAllowed = false;
}

export function allowStaleWikiSnapshotServing() {
  wikiCacheRuntime.__halleusStaleWikiSnapshotServingAllowed = true;
}

export function canServeStaleWikiSnapshot() {
  return staleWikiSnapshotServingAllowed();
}
