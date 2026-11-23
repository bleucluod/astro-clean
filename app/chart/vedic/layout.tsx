import type { ReactNode } from "react";
import { VedicD1GuestSessionProvider } from "@/components/vedic/VedicD1GuestSession";

/** Persists the ephemeral guest result across client-side navigation to /result. */
export default function VedicLayout({ children }: { children: ReactNode }) {
  return <VedicD1GuestSessionProvider>{children}</VedicD1GuestSessionProvider>;
}
