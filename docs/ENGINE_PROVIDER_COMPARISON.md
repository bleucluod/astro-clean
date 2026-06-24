# Engine Provider Comparison

## Option A — Astronomy Engine + Halleus astrology layer

Best for MVP.

Pros:

- JavaScript-friendly.
- Deployable with the current app shape.
- Lower licensing friction for early implementation.
- Lets Halleus control interpretation, safety, and report structure.

Cons:

- Need to build astrology-specific layer.
- House system and aspects need separate implementation.
- Requires QA fixtures.

## Option B — Swiss Ephemeris commercial path

Best for future professional-grade precision.

Pros:

- Strong precision reputation.
- Long-term astrology-grade path.
- Suitable when Halleus becomes more serious commercially.

Cons:

- Licensing must be resolved first.
- Deployment wrappers add complexity.
- Not ideal for first MVP path.

## Option C — External astrology API

Fastest but most dependent.

Pros:

- Quick outputs.
- Less calculation code.
- Could include houses/aspects.

Cons:

- Vendor lock-in.
- Pricing/rate limits.
- Privacy and reliability considerations.
