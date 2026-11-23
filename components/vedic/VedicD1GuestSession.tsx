"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { VedicD1FreeReading } from "@/lib/vedic/vedic-d1-reading-contract";

type VedicD1GuestDraft = {
  name: string;
  calendar: "jalali" | "gregorian";
  birthDate: string;
  birthTime: string;
  cityQuery: string;
  cityId: string;
  occurrence: "" | "earlier" | "later";
};

export type VedicD1LocalPreview = {
  writerRulesVersion:string;
  chapters:readonly {id:string;title:string;paragraphsFa:readonly string[]}[];
};

export type VedicD1GuestResult = {
  localPreview?:VedicD1LocalPreview | null;
  name: string;
  reading: VedicD1FreeReading;
  draft: VedicD1GuestDraft;
};

type ContextValue = {
  result: VedicD1GuestResult | null;
  setResult: Dispatch<SetStateAction<VedicD1GuestResult | null>>;
};

const GuestSessionContext = createContext<ContextValue | null>(null);

/** In-memory only. No query parameters, browser storage, cookie or server-side persistence. */
export function VedicD1GuestSessionProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<VedicD1GuestResult | null>(null);
  return (
    <GuestSessionContext.Provider value={{ result, setResult }}>
      {children}
    </GuestSessionContext.Provider>
  );
}

export function useVedicD1GuestSession(): ContextValue {
  const value = useContext(GuestSessionContext);
  if (!value) throw new Error("VEDIC_D1_GUEST_SESSION_PROVIDER_MISSING");
  return value;
}
