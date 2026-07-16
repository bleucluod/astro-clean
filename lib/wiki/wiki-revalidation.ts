import { revalidatePath } from "next/cache";

export function revalidateWikiPublicPaths(slugs: string[] = []) {
  revalidatePath("/wiki", "page");
  revalidatePath("/wiki/[slug]", "page");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs.filter(Boolean))) {
    revalidatePath(`/wiki/${slug}`, "page");
  }
}
