export const LILITH_REFERENCE_FIXTURE_VERSION = "v0.1.370" as const;
export const LILITH_REFERENCE_FIXTURE_SOURCE =
  "swiss-ephemeris-2.10.03-offline-osculating-apogee" as const;
export const LILITH_REFERENCE_FIXTURE_BODY = "osculating-lunar-apogee" as const;
export const LILITH_REFERENCE_FIXTURE_FRAME = "geocentric-tropical-ecliptic-of-date" as const;
export const LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY =
  "reference-values-only-no-swiss-runtime-dependency" as const;
export const LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES = 0.25 as const;

export type LilithReferenceFixture = {
  isoDate: string;
  referenceLongitude: number;
};

// Generated offline with Swiss Ephemeris 2.10.03, the osculating lunar apogee,
// Moshier ephemeris and tropical geocentric longitude. These fixed values are
// test evidence only; Swiss Ephemeris is not imported or executed by Halleus.
export const LILITH_REFERENCE_FIXTURES = [
  { isoDate: "1988-01-01T00:00:00.000Z", referenceLongitude: 121.033193510 },
  { isoDate: "1990-01-01T00:00:00.000Z", referenceLongitude: 227.351408999 },
  { isoDate: "1992-02-29T12:00:00.000Z", referenceLongitude: 299.765673655 },
  { isoDate: "1995-06-15T12:00:00.000Z", referenceLongitude: 75.039202806 },
  { isoDate: "1999-08-11T11:03:00.000Z", referenceLongitude: 265.857199177 },
  { isoDate: "2000-01-01T00:00:00.000Z", referenceLongitude: 252.212593339 },
  { isoDate: "2001-09-11T12:00:00.000Z", referenceLongitude: 352.953930296 },
  { isoDate: "2005-03-20T18:30:00.000Z", referenceLongitude: 112.273556994 },
  { isoDate: "2010-07-11T09:15:00.000Z", referenceLongitude: 317.462596005 },
  { isoDate: "2012-12-21T11:11:00.000Z", referenceLongitude: 59.954628865 },
  { isoDate: "2016-02-29T06:00:00.000Z", referenceLongitude: 206.915873591 },
  { isoDate: "2020-12-21T10:00:00.000Z", referenceLongitude: 34.755603338 },
  { isoDate: "2024-04-08T18:18:00.000Z", referenceLongitude: 182.250731452 },
  { isoDate: "2026-07-08T00:00:00.000Z", referenceLongitude: 284.978510094 },
  { isoDate: "2030-01-01T00:00:00.000Z", referenceLongitude: 68.945541137 },
  { isoDate: "2035-06-01T00:00:00.000Z", referenceLongitude: 272.885804829 },
] as const satisfies readonly LilithReferenceFixture[];
