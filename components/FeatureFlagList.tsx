import { featureFlags } from "@/lib/config/feature-flags";

export function FeatureFlagList() {
  return (
    <div className="grid">
      {featureFlags.map((flag) => (
        <article className="card flag-card" key={flag.key}>
          <div>
            <span className="badge">{flag.phase}</span>
            <h2>{flag.title}</h2>
            <p>{flag.description}</p>
          </div>

          <span className={flag.enabled ? "status enabled" : "status disabled"}>
            {flag.enabled ? "فعال" : "غیرفعال"}
          </span>
        </article>
      ))}
    </div>
  );
}
