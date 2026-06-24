type AstronomyBodyMap = Record<string, string>;

type AstronomyEclipticCoordinates = {
  elon: number;
  elat?: number;
};

type AstronomyModule = {
  Body: AstronomyBodyMap;
  GeoVector: (body: string, date: Date, aberration: boolean) => unknown;
  Ecliptic: (vector: unknown) => AstronomyEclipticCoordinates;
  EclipticGeoMoon: (date: Date) => AstronomyEclipticCoordinates;
  SunPosition: (date: Date) => AstronomyEclipticCoordinates;
};

const PACKAGE_NAME = "astronomy-engine";

export async function loadAstronomyEnginePackage(): Promise<AstronomyModule | null> {
  try {
    const astronomyPackage = (await import(PACKAGE_NAME)) as Partial<AstronomyModule>;

    if (
      astronomyPackage.Body &&
      astronomyPackage.GeoVector &&
      astronomyPackage.Ecliptic &&
      astronomyPackage.EclipticGeoMoon &&
      astronomyPackage.SunPosition
    ) {
      return astronomyPackage as AstronomyModule;
    }

    return null;
  } catch {
    return null;
  }
}
