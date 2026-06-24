import { createMockInterpretationDriver } from "@/lib/interpretation/mock-interpretation-driver";
import type { InterpretationDriver } from "@/lib/interpretation/interpretation-driver";

export function getInterpretationDriver(): InterpretationDriver {
  return createMockInterpretationDriver();
}
