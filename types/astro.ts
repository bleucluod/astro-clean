import type { EngineResult } from "@/lib/astro-engine";

﻿export type ZodiacKey =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type ZodiacSign = {
  key: ZodiacKey;
  faName: string;
  enName: string;
  element: "آتش" | "زمین" | "هوا" | "آب";
  quality: "کاردینال" | "ثابت" | "متغیر";
};

export type BirthInput = {
  name?: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthCountry: string;
};

export type MockChart = {
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign: ZodiacSign;
};

export type AstrologyReport = {
  id: string;
  createdAt: string;
  input: BirthInput;
  chart: MockChart;
  summary: string;
  interpretations: string[];
  safetyNote: string;
  engineResult?: EngineResult;
};
