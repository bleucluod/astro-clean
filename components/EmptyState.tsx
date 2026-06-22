import Link from "next/link";

type EmptyStateProps = {
  badge: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function EmptyState({
  badge,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: EmptyStateProps) {
  return (
    <section className="empty-state card">
      <span className="badge">{badge}</span>

      <h1>{title}</h1>

      <p>{description}</p>

      <div className="actions">
        <Link className="button" href={actionHref}>
          {actionLabel}
        </Link>

        {secondaryHref && secondaryLabel ? (
          <Link className="button secondary" href={secondaryHref}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
