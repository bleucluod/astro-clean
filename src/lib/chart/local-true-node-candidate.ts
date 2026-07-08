import * as Astronomy from "astronomy-engine";

export const LOCAL_TRUE_NODE_CANDIDATE_STATUS = "production-local-true-node" as const;
export const LOCAL_TRUE_NODE_CANDIDATE_APPROVAL = "approved-local-engine-output" as const;
export const LOCAL_TRUE_NODE_CANDIDATE_SOURCE = "astronomy-engine-geomoonstate" as const;
export const LOCAL_TRUE_NODE_CANDIDATE_METHOD =
  "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date" as const;

export type LocalTrueNodeCandidateFrame = "j2000-ecliptic" | "ecliptic-of-date";

export type LocalTrueNodeCandidateStateVector = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type LocalTrueNodeCandidate = {
  status: typeof LOCAL_TRUE_NODE_CANDIDATE_STATUS;
  approval: typeof LOCAL_TRUE_NODE_CANDIDATE_APPROVAL;
  source: typeof LOCAL_TRUE_NODE_CANDIDATE_SOURCE;
  method: typeof LOCAL_TRUE_NODE_CANDIDATE_METHOD;
  model: "instantaneous-lunar-orbital-plane-node-vector";
  frame: LocalTrueNodeCandidateFrame;
  northLongitude: number;
  southLongitude: number;
  inclination: number;
  angularMomentumLength: number;
  limitations: readonly string[];
};

export const LOCAL_TRUE_NODE_CANDIDATE_LIMITATIONS = [
  "Local production model for Halleus lunar nodes.",
  "Uses the instantaneous lunar orbital plane from Astronomy Engine GeoMoonState.",
  "No external API or Swiss runtime dependency is used.",
  "Independent offline reference fixtures remain recommended for future hardening.",
] as const;

export const LOCAL_TRUE_NODE_CANDIDATE_REQUIRED_APIS = [
  "GeoMoonState",
  "Rotation_EQJ_ECL",
  "Rotation_EQJ_ECT",
  "RotateState",
] as const;

const astronomyApi = Astronomy as unknown as Record<string, unknown>;

export function getMissingLocalTrueNodeCandidateApis(): string[] {
  return LOCAL_TRUE_NODE_CANDIDATE_REQUIRED_APIS.filter(
    (name) => typeof astronomyApi[name] === "undefined",
  );
}

export function assertLocalTrueNodeCandidateApis(): void {
  const missing = getMissingLocalTrueNodeCandidateApis();
  if (missing.length > 0) {
    throw new Error(`Missing Astronomy Engine APIs for local True Node candidate: ${missing.join(", ")}`);
  }
}

export function normalizeLocalTrueNodeLongitude(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function calculateLocalTrueNodeSouthLongitude(northLongitude: number): number {
  return normalizeLocalTrueNodeLongitude(northLongitude + 180);
}

function radToDeg(radians: number): number {
  return radians * 180 / Math.PI;
}

function cross(
  first: Pick<LocalTrueNodeCandidateStateVector, "x" | "y" | "z">,
  second: Pick<LocalTrueNodeCandidateStateVector, "x" | "y" | "z">,
): { x: number; y: number; z: number } {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function vectorLength(vector: { x: number; y: number; z: number }): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function calculateLocalTrueNodeCandidateFromState(
  state: LocalTrueNodeCandidateStateVector,
  frame: LocalTrueNodeCandidateFrame,
): LocalTrueNodeCandidate {
  const position = { x: state.x, y: state.y, z: state.z };
  const velocity = { x: state.vx, y: state.vy, z: state.vz };
  const angularMomentum = cross(position, velocity);
  const angularMomentumLength = vectorLength(angularMomentum);

  if (!Number.isFinite(angularMomentumLength) || angularMomentumLength <= 0) {
    throw new Error("Invalid lunar angular momentum vector for local True Node candidate.");
  }

  const ascendingNodeVector = {
    x: -angularMomentum.y,
    y: angularMomentum.x,
    z: 0,
  };
  const ascendingNodeLength = Math.hypot(ascendingNodeVector.x, ascendingNodeVector.y);

  if (!Number.isFinite(ascendingNodeLength) || ascendingNodeLength <= 0) {
    throw new Error("Invalid lunar node vector for local True Node candidate.");
  }

  const northLongitude = normalizeLocalTrueNodeLongitude(
    radToDeg(Math.atan2(ascendingNodeVector.y, ascendingNodeVector.x)),
  );
  const southLongitude = calculateLocalTrueNodeSouthLongitude(northLongitude);
  const inclination = radToDeg(
    Math.acos(Math.max(-1, Math.min(1, angularMomentum.z / angularMomentumLength))),
  );

  return {
    status: LOCAL_TRUE_NODE_CANDIDATE_STATUS,
    approval: LOCAL_TRUE_NODE_CANDIDATE_APPROVAL,
    source: LOCAL_TRUE_NODE_CANDIDATE_SOURCE,
    method: LOCAL_TRUE_NODE_CANDIDATE_METHOD,
    model: "instantaneous-lunar-orbital-plane-node-vector",
    frame,
    northLongitude,
    southLongitude,
    inclination,
    angularMomentumLength,
    limitations: LOCAL_TRUE_NODE_CANDIDATE_LIMITATIONS,
  };
}

export function calculateLocalTrueNodeCandidate(
  utcDate: Date,
  frame: LocalTrueNodeCandidateFrame = "ecliptic-of-date",
): LocalTrueNodeCandidate {
  assertLocalTrueNodeCandidateApis();

  const eqjState = Astronomy.GeoMoonState(utcDate);
  const candidateState =
    frame === "j2000-ecliptic"
      ? Astronomy.RotateState(Astronomy.Rotation_EQJ_ECL(), eqjState)
      : Astronomy.RotateState(Astronomy.Rotation_EQJ_ECT(utcDate), eqjState);

  return calculateLocalTrueNodeCandidateFromState(candidateState, frame);
}

export function calculateLocalTrueNodeCandidatePair(utcDate: Date): {
  eclJ2000: LocalTrueNodeCandidate;
  ectOfDate: LocalTrueNodeCandidate;
} {
  return {
    eclJ2000: calculateLocalTrueNodeCandidate(utcDate, "j2000-ecliptic"),
    ectOfDate: calculateLocalTrueNodeCandidate(utcDate, "ecliptic-of-date"),
  };
}
