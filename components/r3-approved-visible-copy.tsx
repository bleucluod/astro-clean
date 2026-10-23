import Link from "next/link";
import approvedExtra from "@/lib/r3-approved-visible-additions.generated.json";
import styles from "./r3-approved-visible-copy.module.css";

type ApprovedPage = keyof typeof approvedExtra;

const editorialToken = /(\*\*\[[^\]]+\]\(https:\/\/halleus\.ir\/[^)]+\)\*\*|\[[^\]]+\]\(https:\/\/halleus\.ir\/[^)]+\)|\*\*[^*]+\*\*)/g;
function renderEditorialInline(content: string) {
  return content.split(editorialToken).map((part,index) => {
    const strongLink = /^\*\*\[([^\]]+)\]\(https:\/\/halleus\.ir(\/[^)]+)\)\*\*$/.exec(part);
    if (strongLink) return <strong key={index}><Link href={strongLink[2]}>{strongLink[1]}</Link></strong>;
    const link = /^\[([^\]]+)\]\(https:\/\/halleus\.ir(\/[^)]+)\)$/.exec(part);
    if (link) return <Link href={link[2]} key={index}>{link[1]}</Link>;
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={index}>{bold[1]}</strong>;
    return part;
  });
}

function renderApprovedParagraph(paragraph: string, key: string) {
  if (paragraph.startsWith("- ")) {
    return <ul key={key}>{paragraph.split("\n").map((line, index) => (
      <li key={`${key}-${index}`}>{renderEditorialInline(line.replace(/^- /, ""))}</li>
    ))}</ul>;
  }
  return <p key={key}>{renderEditorialInline(paragraph)}</p>;
}

export function R3ApprovedInlineParagraphs({page,sectionTitle}: {page: ApprovedPage; sectionTitle: string}) {
  const block = approvedExtra[page].find((item) => item.title === sectionTitle);
  if (!block) return null;
  return (
    <div className={styles.inline} data-r3-approved-inline={page}>
      {block.paras.map((paragraph, index) => renderApprovedParagraph(paragraph, `main-${index}`))}
      {block.subsections.map((subsection, index) => (
        <div className={styles.subsection} key={`${index}-${subsection.title}`}>
          {page !== "home" ? <h3>{subsection.title}</h3> : null}
          {subsection.paras.map((paragraph, index) => renderApprovedParagraph(paragraph, `${subsection.title}-${index}`))}
        </div>
      ))}
    </div>
  );
}
