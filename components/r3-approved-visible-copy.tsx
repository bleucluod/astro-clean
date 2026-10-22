import Link from "next/link";
import approvedExtra from "@/lib/r3-approved-visible-additions.generated.json";
import styles from "./r3-approved-visible-copy.module.css";

type ApprovedPage = keyof typeof approvedExtra;

function renderEditorialInline(content: string) {
  return content
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/halleus\.ir\/[^)]+\))/g)
    .map((part, index) => {
      const link = /^\[([^\]]+)\]\(https:\/\/halleus\.ir(\/[^)]+)\)$/.exec(part);
      if (link) return <Link href={link[2]} key={index}>{link[1]}</Link>;
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
}

export function R3ApprovedVisibleCopy({ page }: { page: ApprovedPage }) {
  const sections = approvedExtra[page];
  if (!sections.length) return null;

  return (
    <div className={styles.container} data-r3-approved-visible-copy={page}>
      {sections.map((section) => (
        <section className={styles.section} key={section.title}>
          <h2>{section.title}</h2>
          {section.paras.map((paragraph) => (
            <p key={paragraph}>{renderEditorialInline(paragraph)}</p>
          ))}
          {section.subsections.map((subsection) => (
            <div className={styles.subsection} key={subsection.title}>
              <h3>{subsection.title}</h3>
              {subsection.paras.map((paragraph) => (
                <p key={paragraph}>{renderEditorialInline(paragraph)}</p>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
