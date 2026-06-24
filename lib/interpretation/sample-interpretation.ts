import { getInterpretationDriver } from "@/lib/interpretation/interpretation-factory";
import type { InterpretationInput } from "@/types/interpretation";

export const SAMPLE_INTERPRETATION_INPUT: InterpretationInput = {
  locale: "fa-IR",
  chartInput: {
    name: "Preview User",
    birthDate: "1992-03-21",
    birthTime: "12:00",
    birthCity: "Tehran",
    birthCountry: "Iran",
    birthLatitude: 35.6892,
    birthLongitude: 51.389,
    birthTimezone: "Asia/Tehran",
  },
  placements: [
    { body: "sun", sign: "Aries", house: 10, degree: 1 },
    { body: "moon", sign: "Cancer", house: 1, degree: 14 },
    { body: "ascendant", sign: "Leo", house: 1, degree: 2 },
    { body: "venus", sign: "Taurus", house: 11, degree: 8 },
    { body: "mars", sign: "Gemini", house: 12, degree: 18 },
    { body: "jupiter", sign: "Virgo", house: 2, degree: 5 },
    { body: "saturn", sign: "Aquarius", house: 7, degree: 20 },
  ],
};

export async function getSampleInterpretationPreview() {
  const driver = getInterpretationDriver();

  return driver.compose(SAMPLE_INTERPRETATION_INPUT);
}
