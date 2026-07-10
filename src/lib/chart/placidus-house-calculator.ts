export const PLACIDUS_HOUSE_CALCULATOR_VERSION = "0.1.284b" as const;

export const PLACIDUS_HOUSE_CALCULATOR_METHOD =
  "local-placidus-semi-arc-root-solver" as const;

export const PLACIDUS_POLAR_LIMIT_POLICY =
  "unavailable-no-silent-fallback" as const;

const FULL_CIRCLE_DEGREES = 360;
const HALF_CIRCLE_DEGREES = 180;
const RIGHT_ANGLE_DEGREES = 90;
const ROOT_TOLERANCE_DEGREES = 1e-10;
const ROOT_RESIDUAL_TOLERANCE_DEGREES = 1e-8;
const MAX_ROOT_ITERATIONS = 96;
const BRACKET_SEGMENTS = 96;
const DOMAIN_TOLERANCE = 1e-12;

export type PlacidusHouseCalculatorInput = {
  localSiderealTimeDegrees: number;
  latitudeDegrees: number;
  obliquityDegrees: number;
};

export type PlacidusHouseCalculatorUtcInput = {
  utcDate: Date;
  latitudeDegrees: number;
  longitudeDegrees: number;
};

export type PlacidusHouseCalculatorFailureReason =
  | "polar-circle"
  | "non-convergence";

export type PlacidusHouseCalculatorCalculatedResult = {
  status: "calculated";
  version: typeof PLACIDUS_HOUSE_CALCULATOR_VERSION;
  method: typeof PLACIDUS_HOUSE_CALCULATOR_METHOD;
  polarLimitPolicy: typeof PLACIDUS_POLAR_LIMIT_POLICY;
  localSiderealTimeDegrees: number;
  latitudeDegrees: number;
  obliquityDegrees: number;
  polarLimitLatitudeDegrees: number;
  ascendantLongitude: number;
  midheavenLongitude: number;
  cuspLongitudes: number[];
  maxResidualDegrees: number;
  totalIterations: number;
};

export type PlacidusHouseCalculatorUnavailableResult = {
  status: "unavailable";
  version: typeof PLACIDUS_HOUSE_CALCULATOR_VERSION;
  method: typeof PLACIDUS_HOUSE_CALCULATOR_METHOD;
  polarLimitPolicy: typeof PLACIDUS_POLAR_LIMIT_POLICY;
  reason: PlacidusHouseCalculatorFailureReason;
  localSiderealTimeDegrees: number;
  latitudeDegrees: number;
  obliquityDegrees: number;
  polarLimitLatitudeDegrees: number;
  ascendantLongitude: number | null;
  midheavenLongitude: number | null;
  cuspLongitudes: null;
  maxResidualDegrees: null;
  totalIterations: number;
};

export type PlacidusHouseCalculatorResult =
  | PlacidusHouseCalculatorCalculatedResult
  | PlacidusHouseCalculatorUnavailableResult;

type EclipticEquatorialPosition = {
  rightAscensionDegrees: number;
  declinationDegrees: number;
};

type SemiArcs = {
  semiDiurnalArcDegrees: number;
  semiNocturnalArcDegrees: number;
};

type RootResult = {
  longitude: number;
  residualDegrees: number;
  iterations: number;
};

type IntermediateHouse = 2 | 3 | 11 | 12;

export function calculatePlacidusHouseCuspsFromUtc(
  input: PlacidusHouseCalculatorUtcInput,
): PlacidusHouseCalculatorResult {
  assertValidUtcDate(input.utcDate);
  assertFiniteInRange(
    input.longitudeDegrees,
    -180,
    180,
    "longitudeDegrees",
  );

  const localSiderealTimeDegrees = normalizeDegrees(
    calculateGreenwichMeanSiderealTimeDegrees(input.utcDate) +
      input.longitudeDegrees,
  );
  const obliquityDegrees = calculateMeanObliquityDegrees(input.utcDate);

  return calculatePlacidusHouseCusps({
    localSiderealTimeDegrees,
    latitudeDegrees: input.latitudeDegrees,
    obliquityDegrees,
  });
}

export function calculatePlacidusHouseCusps(
  input: PlacidusHouseCalculatorInput,
): PlacidusHouseCalculatorResult {
  assertFinite(input.localSiderealTimeDegrees, "localSiderealTimeDegrees");
  assertFiniteInRange(input.latitudeDegrees, -90, 90, "latitudeDegrees");
  assertFiniteInRange(input.obliquityDegrees, 0, 45, "obliquityDegrees");

  if (input.obliquityDegrees === 0) {
    throw new RangeError("obliquityDegrees must be greater than zero.");
  }

  const localSiderealTimeDegrees = normalizeDegrees(
    input.localSiderealTimeDegrees,
  );
  const latitudeDegrees = input.latitudeDegrees;
  const obliquityDegrees = input.obliquityDegrees;
  const polarLimitLatitudeDegrees =
    RIGHT_ANGLE_DEGREES - obliquityDegrees;

  if (Math.abs(latitudeDegrees) >= polarLimitLatitudeDegrees) {
    return buildUnavailableResult({
      reason: "polar-circle",
      localSiderealTimeDegrees,
      latitudeDegrees,
      obliquityDegrees,
      polarLimitLatitudeDegrees,
      ascendantLongitude: null,
      midheavenLongitude: null,
      totalIterations: 0,
    });
  }

  const midheavenLongitude = calculateMidheavenLongitude(
    localSiderealTimeDegrees,
    obliquityDegrees,
  );
  const ascendantLongitude = calculateAscendantLongitude(
    localSiderealTimeDegrees,
    latitudeDegrees,
    obliquityDegrees,
  );
  const ascendantAfterMidheaven =
    midheavenLongitude +
    normalizeDegrees(ascendantLongitude - midheavenLongitude);
  const imumCoeliAfterMidheaven =
    midheavenLongitude + HALF_CIRCLE_DEGREES;
  const firstQuadrantSpan = ascendantAfterMidheaven - midheavenLongitude;

  if (
    firstQuadrantSpan <= 0 ||
    firstQuadrantSpan >= HALF_CIRCLE_DEGREES
  ) {
    return buildUnavailableResult({
      reason: "non-convergence",
      localSiderealTimeDegrees,
      latitudeDegrees,
      obliquityDegrees,
      polarLimitLatitudeDegrees,
      ascendantLongitude,
      midheavenLongitude,
      totalIterations: 0,
    });
  }

  const house11 = solveIntermediateHouse({
    house: 11,
    lowerLongitude: midheavenLongitude,
    upperLongitude: ascendantAfterMidheaven,
    localSiderealTimeDegrees,
    latitudeDegrees,
    obliquityDegrees,
  });
  const house12 = house11
    ? solveIntermediateHouse({
        house: 12,
        lowerLongitude: unwrapAfter(
          house11.longitude,
          midheavenLongitude,
        ),
        upperLongitude: ascendantAfterMidheaven,
        localSiderealTimeDegrees,
        latitudeDegrees,
        obliquityDegrees,
      })
    : null;
  const house2 = solveIntermediateHouse({
    house: 2,
    lowerLongitude: ascendantAfterMidheaven,
    upperLongitude: imumCoeliAfterMidheaven,
    localSiderealTimeDegrees,
    latitudeDegrees,
    obliquityDegrees,
  });
  const house3 = house2
    ? solveIntermediateHouse({
        house: 3,
        lowerLongitude: unwrapAfter(
          house2.longitude,
          ascendantAfterMidheaven,
        ),
        upperLongitude: imumCoeliAfterMidheaven,
        localSiderealTimeDegrees,
        latitudeDegrees,
        obliquityDegrees,
      })
    : null;

  const roots = [house11, house12, house2, house3];
  const totalIterations = roots.reduce(
    (sum, root) => sum + (root?.iterations ?? 0),
    0,
  );

  if (roots.some((root) => root === null)) {
    return buildUnavailableResult({
      reason: "non-convergence",
      localSiderealTimeDegrees,
      latitudeDegrees,
      obliquityDegrees,
      polarLimitLatitudeDegrees,
      ascendantLongitude,
      midheavenLongitude,
      totalIterations,
    });
  }

  const resolvedHouse11 = house11 as RootResult;
  const resolvedHouse12 = house12 as RootResult;
  const resolvedHouse2 = house2 as RootResult;
  const resolvedHouse3 = house3 as RootResult;
  const cuspLongitudes = [
    ascendantLongitude,
    resolvedHouse2.longitude,
    resolvedHouse3.longitude,
    normalizeDegrees(midheavenLongitude + HALF_CIRCLE_DEGREES),
    normalizeDegrees(resolvedHouse11.longitude + HALF_CIRCLE_DEGREES),
    normalizeDegrees(resolvedHouse12.longitude + HALF_CIRCLE_DEGREES),
    normalizeDegrees(ascendantLongitude + HALF_CIRCLE_DEGREES),
    normalizeDegrees(resolvedHouse2.longitude + HALF_CIRCLE_DEGREES),
    normalizeDegrees(resolvedHouse3.longitude + HALF_CIRCLE_DEGREES),
    midheavenLongitude,
    resolvedHouse11.longitude,
    resolvedHouse12.longitude,
  ];
  const maxResidualDegrees = Math.max(
    resolvedHouse11.residualDegrees,
    resolvedHouse12.residualDegrees,
    resolvedHouse2.residualDegrees,
    resolvedHouse3.residualDegrees,
  );

  if (
    !hasCompleteZodiacCycle(cuspLongitudes) ||
    maxResidualDegrees > ROOT_RESIDUAL_TOLERANCE_DEGREES
  ) {
    return buildUnavailableResult({
      reason: "non-convergence",
      localSiderealTimeDegrees,
      latitudeDegrees,
      obliquityDegrees,
      polarLimitLatitudeDegrees,
      ascendantLongitude,
      midheavenLongitude,
      totalIterations,
    });
  }

  return {
    status: "calculated",
    version: PLACIDUS_HOUSE_CALCULATOR_VERSION,
    method: PLACIDUS_HOUSE_CALCULATOR_METHOD,
    polarLimitPolicy: PLACIDUS_POLAR_LIMIT_POLICY,
    localSiderealTimeDegrees,
    latitudeDegrees,
    obliquityDegrees,
    polarLimitLatitudeDegrees,
    ascendantLongitude,
    midheavenLongitude,
    cuspLongitudes,
    maxResidualDegrees,
    totalIterations,
  };
}

export function calculateJulianDayUtc(utcDate: Date): number {
  assertValidUtcDate(utcDate);

  return utcDate.getTime() / 86_400_000 + 2_440_587.5;
}

export function calculateGreenwichMeanSiderealTimeDegrees(
  utcDate: Date,
): number {
  const julianDay = calculateJulianDayUtc(utcDate);
  const daysSinceJ2000 = julianDay - 2_451_545.0;
  const centuriesSinceJ2000 = daysSinceJ2000 / 36_525;

  return normalizeDegrees(
    280.46061837 +
      360.98564736629 * daysSinceJ2000 +
      0.000387933 * centuriesSinceJ2000 ** 2 -
      centuriesSinceJ2000 ** 3 / 38_710_000,
  );
}

export function calculateMeanObliquityDegrees(utcDate: Date): number {
  const julianDay = calculateJulianDayUtc(utcDate);
  const centuriesSinceJ2000 = (julianDay - 2_451_545.0) / 36_525;

  return (
    23.439291 -
    0.0130042 * centuriesSinceJ2000 -
    1.64e-7 * centuriesSinceJ2000 ** 2 +
    5.04e-7 * centuriesSinceJ2000 ** 3
  );
}

function solveIntermediateHouse({
  house,
  lowerLongitude,
  upperLongitude,
  localSiderealTimeDegrees,
  latitudeDegrees,
  obliquityDegrees,
}: {
  house: IntermediateHouse;
  lowerLongitude: number;
  upperLongitude: number;
  localSiderealTimeDegrees: number;
  latitudeDegrees: number;
  obliquityDegrees: number;
}): RootResult | null {
  const residual = (longitude: number): number | null => {
    const position = eclipticToEquatorial(longitude, obliquityDegrees);
    const semiArcs = calculateSemiArcs(
      latitudeDegrees,
      position.declinationDegrees,
    );

    if (!semiArcs) {
      return null;
    }

    const targetRightAscensionDistance =
      getTargetRightAscensionDistance(house, semiArcs);
    const actualRightAscensionDistance = normalizeDegrees(
      position.rightAscensionDegrees - localSiderealTimeDegrees,
    );

    return signedAngularDifference(
      actualRightAscensionDistance,
      targetRightAscensionDistance,
    );
  };
  const bracket = findRootBracket(
    residual,
    lowerLongitude,
    upperLongitude,
  );

  if (!bracket) {
    return null;
  }

  let { lower, upper, lowerResidual, upperResidual } = bracket;

  if (Math.abs(lowerResidual) <= ROOT_TOLERANCE_DEGREES) {
    return {
      longitude: normalizeDegrees(lower),
      residualDegrees: Math.abs(lowerResidual),
      iterations: 0,
    };
  }

  if (Math.abs(upperResidual) <= ROOT_TOLERANCE_DEGREES) {
    return {
      longitude: normalizeDegrees(upper),
      residualDegrees: Math.abs(upperResidual),
      iterations: 0,
    };
  }

  for (let iteration = 1; iteration <= MAX_ROOT_ITERATIONS; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    const midpointResidual = residual(midpoint);

    if (midpointResidual === null) {
      return null;
    }

    if (
      Math.abs(midpointResidual) <= ROOT_TOLERANCE_DEGREES ||
      upper - lower <= ROOT_TOLERANCE_DEGREES
    ) {
      return {
        longitude: normalizeDegrees(midpoint),
        residualDegrees: Math.abs(midpointResidual),
        iterations: iteration,
      };
    }

    if (lowerResidual * midpointResidual <= 0) {
      upper = midpoint;
      upperResidual = midpointResidual;
    } else {
      lower = midpoint;
      lowerResidual = midpointResidual;
    }
  }

  const midpoint = (lower + upper) / 2;
  const midpointResidual = residual(midpoint);

  if (midpointResidual === null) {
    return null;
  }

  return {
    longitude: normalizeDegrees(midpoint),
    residualDegrees: Math.abs(midpointResidual),
    iterations: MAX_ROOT_ITERATIONS,
  };
}

function findRootBracket(
  residual: (longitude: number) => number | null,
  lowerLongitude: number,
  upperLongitude: number,
): {
  lower: number;
  upper: number;
  lowerResidual: number;
  upperResidual: number;
} | null {
  let previousLongitude = lowerLongitude;
  let previousResidual = residual(previousLongitude);

  if (previousResidual === null) {
    return null;
  }

  for (let segment = 1; segment <= BRACKET_SEGMENTS; segment += 1) {
    const currentLongitude =
      lowerLongitude +
      ((upperLongitude - lowerLongitude) * segment) / BRACKET_SEGMENTS;
    const currentResidual = residual(currentLongitude);

    if (currentResidual === null) {
      return null;
    }

    if (
      Math.abs(previousResidual) <= ROOT_TOLERANCE_DEGREES ||
      previousResidual * currentResidual <= 0
    ) {
      return {
        lower: previousLongitude,
        upper: currentLongitude,
        lowerResidual: previousResidual,
        upperResidual: currentResidual,
      };
    }

    previousLongitude = currentLongitude;
    previousResidual = currentResidual;
  }

  return null;
}

function calculateAscendantLongitude(
  localSiderealTimeDegrees: number,
  latitudeDegrees: number,
  obliquityDegrees: number,
): number {
  const theta = degreesToRadians(localSiderealTimeDegrees);
  const latitude = degreesToRadians(latitudeDegrees);
  const obliquity = degreesToRadians(obliquityDegrees);

  return normalizeDegrees(
    radiansToDegrees(
      Math.atan2(
        -Math.cos(theta),
        Math.sin(theta) * Math.cos(obliquity) +
          Math.tan(latitude) * Math.sin(obliquity),
      ),
    ) + HALF_CIRCLE_DEGREES,
  );
}

function calculateMidheavenLongitude(
  localSiderealTimeDegrees: number,
  obliquityDegrees: number,
): number {
  const theta = degreesToRadians(localSiderealTimeDegrees);
  const obliquity = degreesToRadians(obliquityDegrees);

  return normalizeDegrees(
    radiansToDegrees(
      Math.atan2(
        Math.sin(theta),
        Math.cos(theta) * Math.cos(obliquity),
      ),
    ),
  );
}

function eclipticToEquatorial(
  longitudeDegrees: number,
  obliquityDegrees: number,
): EclipticEquatorialPosition {
  const longitude = degreesToRadians(normalizeDegrees(longitudeDegrees));
  const obliquity = degreesToRadians(obliquityDegrees);

  return {
    rightAscensionDegrees: normalizeDegrees(
      radiansToDegrees(
        Math.atan2(
          Math.sin(longitude) * Math.cos(obliquity),
          Math.cos(longitude),
        ),
      ),
    ),
    declinationDegrees: radiansToDegrees(
      Math.asin(Math.sin(obliquity) * Math.sin(longitude)),
    ),
  };
}

function calculateSemiArcs(
  latitudeDegrees: number,
  declinationDegrees: number,
): SemiArcs | null {
  const domainValue =
    -Math.tan(degreesToRadians(latitudeDegrees)) *
    Math.tan(degreesToRadians(declinationDegrees));

  if (domainValue < -1 - DOMAIN_TOLERANCE || domainValue > 1 + DOMAIN_TOLERANCE) {
    return null;
  }

  const semiDiurnalArcDegrees = radiansToDegrees(
    Math.acos(clamp(domainValue, -1, 1)),
  );

  return {
    semiDiurnalArcDegrees,
    semiNocturnalArcDegrees:
      HALF_CIRCLE_DEGREES - semiDiurnalArcDegrees,
  };
}

function getTargetRightAscensionDistance(
  house: IntermediateHouse,
  semiArcs: SemiArcs,
): number {
  if (house === 11) {
    return semiArcs.semiDiurnalArcDegrees / 3;
  }

  if (house === 12) {
    return (2 * semiArcs.semiDiurnalArcDegrees) / 3;
  }

  if (house === 2) {
    return (
      HALF_CIRCLE_DEGREES -
      (2 * semiArcs.semiNocturnalArcDegrees) / 3
    );
  }

  return (
    HALF_CIRCLE_DEGREES - semiArcs.semiNocturnalArcDegrees / 3
  );
}

function buildUnavailableResult({
  reason,
  localSiderealTimeDegrees,
  latitudeDegrees,
  obliquityDegrees,
  polarLimitLatitudeDegrees,
  ascendantLongitude,
  midheavenLongitude,
  totalIterations,
}: {
  reason: PlacidusHouseCalculatorFailureReason;
  localSiderealTimeDegrees: number;
  latitudeDegrees: number;
  obliquityDegrees: number;
  polarLimitLatitudeDegrees: number;
  ascendantLongitude: number | null;
  midheavenLongitude: number | null;
  totalIterations: number;
}): PlacidusHouseCalculatorUnavailableResult {
  return {
    status: "unavailable",
    version: PLACIDUS_HOUSE_CALCULATOR_VERSION,
    method: PLACIDUS_HOUSE_CALCULATOR_METHOD,
    polarLimitPolicy: PLACIDUS_POLAR_LIMIT_POLICY,
    reason,
    localSiderealTimeDegrees,
    latitudeDegrees,
    obliquityDegrees,
    polarLimitLatitudeDegrees,
    ascendantLongitude,
    midheavenLongitude,
    cuspLongitudes: null,
    maxResidualDegrees: null,
    totalIterations,
  };
}

function hasCompleteZodiacCycle(cuspLongitudes: readonly number[]): boolean {
  if (cuspLongitudes.length !== 12) {
    return false;
  }

  const totalSpan = cuspLongitudes.reduce((sum, cuspLongitude, index) => {
    const nextCusp = cuspLongitudes[(index + 1) % cuspLongitudes.length];

    return sum + normalizeDegrees(nextCusp - cuspLongitude);
  }, 0);

  return Math.abs(totalSpan - FULL_CIRCLE_DEGREES) <= 1e-7;
}

function unwrapAfter(longitude: number, reference: number): number {
  return reference + normalizeDegrees(longitude - reference);
}

function signedAngularDifference(left: number, right: number): number {
  return (
    normalizeDegrees(left - right + HALF_CIRCLE_DEGREES) -
    HALF_CIRCLE_DEGREES
  );
}

function normalizeDegrees(value: number): number {
  const normalized = value % FULL_CIRCLE_DEGREES;

  return normalized < 0 ? normalized + FULL_CIRCLE_DEGREES : normalized;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / HALF_CIRCLE_DEGREES;
}

function radiansToDegrees(value: number): number {
  return (value * HALF_CIRCLE_DEGREES) / Math.PI;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite. Received: ${value}`);
  }
}

function assertFiniteInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  assertFinite(value, label);

  if (value < minimum || value > maximum) {
    throw new RangeError(
      `${label} must be between ${minimum} and ${maximum}. Received: ${value}`,
    );
  }
}

function assertValidUtcDate(utcDate: Date): void {
  if (!(utcDate instanceof Date) || !Number.isFinite(utcDate.getTime())) {
    throw new TypeError("utcDate must be a valid Date instance.");
  }
}
