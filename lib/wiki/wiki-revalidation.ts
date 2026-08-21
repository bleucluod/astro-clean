import { revalidatePath, revalidateTag } from "next/cache";

import {
  blockStaleWikiSnapshotServing,
  WIKI_PUBLIC_SNAPSHOT_CACHE_TAG,
} from "@/lib/wiki/wiki-cache";

type WikiPublicRevalidationOptions = {
  cachePolicy?: "stale-while-revalidate" | "expire-now";
};

export function revalidateWikiPublicPaths(
  slugs: string[] = [],
  options: WikiPublicRevalidationOptions = {},
) {
  if (options.cachePolicy === "expire-now") {
    blockStaleWikiSnapshotServing();
    revalidateTag(WIKI_PUBLIC_SNAPSHOT_CACHE_TAG, { expire: 0 });
  } else {
    revalidateTag(WIKI_PUBLIC_SNAPSHOT_CACHE_TAG, "max");
  }
  revalidatePath("/", "layout");
  revalidatePath("/wiki", "page");
  revalidatePath("/wiki/[slug]", "page");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs.filter(Boolean))) {
    revalidatePath(`/wiki/${slug}`, "page");
  }
}
