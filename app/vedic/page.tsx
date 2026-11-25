import type { Metadata } from "next";
import { VedicD1Screen } from "@/components/vedic/VedicD1Screen";
import { VedicD1GuestSessionProvider } from "@/components/vedic/VedicD1GuestSession";

export const metadata: Metadata = {
  title: "چارت تولد ودیک | هالیوس",
  description: "محاسبهٔ چارت تولد ودیک با مبنای لاهیری و اطلاعات واقعی تولد.",
  robots: { index: false, follow: false },
};

export default function VedicPage() {
  return <VedicD1GuestSessionProvider><VedicD1Screen /></VedicD1GuestSessionProvider>;
}
