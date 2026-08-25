import Link from "next/link";
import type { ReactNode } from "react";

import {
  getFinalEditorialPage,
  type FinalEditorialBlock,
  type FinalEditorialPageKey,
  type FinalEditorialSection,
} from "@/lib/public-content/final-editorial-content";

import styles from "./final-editorial.module.css";

const ACTION_DESTINATIONS: Array<[RegExp, string]> = [
  [/مدیریت و حذف/, "/reports"],
  [/حریم خصوصی/, "/privacy"],
  [/درخواست|نسخه کامل‌تر/, "/order"],
  [/پلن|قیمت|هزینه|گزینه‌های گزارش/, "/pricing"],
  [/رابطه|دو چارت/, "/compare"],
  [/آسمان|سیارات/, "/sky"],
  [/ویکی|آموزش/, "/wiki"],
  [/نمونه گزارش/, "#report-showcase"],
  [/داخل گزارش|ساختار گزارش|آشنایی با گزارش/, "/product"],
  [/گزارش|چارت/, "/chart"],
];

function destinationFor(text: string) {
  return ACTION_DESTINATIONS.find(([pattern]) => pattern.test(text))?.[1] ?? "/";
}

function hasUnresolvedPlaceholder(text: string) {
  return /\[[A-Z0-9_]+(?:_REQUIRED)?\]/.test(text);
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function Block({ block }: { block: FinalEditorialBlock }) {
  if ("text" in block && hasUnresolvedPlaceholder(block.text)) return null;
  if (block.type === "eyebrow") return <span className={styles.eyebrow}><InlineText text={block.text} /></span>;
  if (block.type === "h1") return <h1 className={styles.title}><InlineText text={block.text} /></h1>;
  if (block.type === "h2") return <h2 className={styles.heading}><InlineText text={block.text} /></h2>;
  if (block.type === "subheading") return <h3 className={styles.subheading}><InlineText text={block.text} /></h3>;
  if (block.type === "paragraph") return <p className={styles.paragraph}><InlineText text={block.text} /></p>;
  if (block.type === "note") return <p className={styles.note}><InlineText text={block.text} /></p>;
  if (block.type === "fact") return <p className={styles.fact}><InlineText text={block.text} /></p>;
  if (block.type === "list") {
    const List = block.ordered ? "ol" : "ul";
    return <List className={styles.list}>{block.items.filter((item) => !hasUnresolvedPlaceholder(item)).map((item) => <li key={item}><InlineText text={item} /></li>)}</List>;
  }
  return null;
}

export function FinalEditorialSectionView({
  section,
  slot,
  hideActions = false,
  slotOnly = false,
}: {
  section: FinalEditorialSection;
  slot?: ReactNode;
  hideActions?: boolean;
  slotOnly?: boolean;
}) {
  const actions = section.blocks.filter((block): block is Extract<FinalEditorialBlock, { type: "action" }> => block.type === "action" && !hasUnresolvedPlaceholder(block.text));
  const content = section.blocks.filter((block) => block.type !== "action");
  return (
    <section className={styles.section} id={section.id} data-final-editorial-section={section.id} data-slot-only={slotOnly ? "true" : undefined}>
      {slotOnly ? null : content.map((block, index) => <Block block={block} key={`${block.type}-${index}`} />)}
      {!slotOnly && !hideActions && actions.length ? <div className={styles.actions}>{actions.map((action) => <Link className={styles.action} href={destinationFor(action.text)} key={action.text}>{action.text}</Link>)}</div> : null}
      {slot ? <div className={styles.slot}>{slot}</div> : null}
    </section>
  );
}

export function FinalEditorialPage({
  pageKey,
  slots = {},
  omitSections = [],
  omitActionSections = [],
  includeSections = [],
  slotOnlySections = [],
}: {
  pageKey: FinalEditorialPageKey;
  slots?: Record<string, ReactNode>;
  omitSections?: string[];
  omitActionSections?: string[];
  includeSections?: string[];
  slotOnlySections?: string[];
}) {
  const page = getFinalEditorialPage(pageKey);
  const sections = page.sections.filter((section) =>
    !omitSections.includes(section.id) &&
    (!includeSections.length || includeSections.includes(section.id))
  );
  return (
    <main className={styles.page} data-final-editorial-page={pageKey}>
      {sections.map((section) => (
        <FinalEditorialSectionView
          key={section.id}
          section={section}
          slot={slots[section.id]}
          hideActions={omitActionSections.includes(section.id)}
          slotOnly={slotOnlySections.includes(section.id)}
        />
      ))}
    </main>
  );
}
