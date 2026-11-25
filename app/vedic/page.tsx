import type { Metadata } from "next";
import {isVedicD1StorageReady,isVedicD1CheckoutReady} from "@/lib/vedic/vedic-d1-payment-config";
export const dynamic="force-dynamic";
import { VedicD1Screen } from "@/components/vedic/VedicD1Screen";
import { VedicD1GuestSessionProvider } from "@/components/vedic/VedicD1GuestSession";

export const metadata: Metadata = {
  title: "چارت تولد ودیک | هالیوس",
  description: "محاسبهٔ چارت تولد ودیک با مبنای لاهیری و اطلاعات واقعی تولد.",
  robots: { index: false, follow: false },
};

export default function VedicPage() {
  return <VedicD1GuestSessionProvider><VedicD1Screen storageEnabled={isVedicD1StorageReady()} checkoutEnabled={isVedicD1CheckoutReady()} /></VedicD1GuestSessionProvider>;
}
