import type { WikiEditorialMobileCard } from "@/lib/wiki/wiki-editorial-cta";
import { WikiEditorialMobileCta } from "./WikiEditorialMobileCta";

type Props = {
  articleBodyId: string;
  href: string;
  inlineCtaId: string;
  mobileCard: WikiEditorialMobileCard | null;
};

// HALLEUS_WIKI_CTA_COORDINATOR_SSR_RUNTIME_V18
export function WikiArticleCtaCoordinator({
  articleBodyId,
  href,
  mobileCard,
}: Props) {
  if (!mobileCard) return null;

  return (
    <WikiEditorialMobileCta
      articleBodyId={articleBodyId}
      endCtaReached={false}
      href={href}
      mobileCard={mobileCard}
    />
  );
}