import { buildPublicPageMetadata } from "@/lib/config/seo";
import {isVedicD1StorageReady,isVedicD1CheckoutReady} from "@/lib/vedic/vedic-d1-payment-config";
export const dynamic="force-dynamic";
import { VedicD1Screen } from "@/components/vedic/VedicD1Screen";
import { VedicD1GuestSessionProvider } from "@/components/vedic/VedicD1GuestSession";

export const metadata = buildPublicPageMetadata({
  title: "محاسبه چارت تولد ودیک رایگان به فارسی | هالیوس",
  description: "با تاریخ شمسی یا میلادی، ساعت و شهر تولدت چارت ودیک بساز. نقشهٔ راشی D1، نشان ماه و جایگاه سیاره‌ها را به فارسی ببین و در صورت تمایل تفسیر کامل را بخوان.",
  canonical: "/vedic",
});

export default function VedicPage() {
  return <VedicD1GuestSessionProvider><VedicD1Screen storageEnabled={isVedicD1StorageReady()} checkoutEnabled={isVedicD1CheckoutReady()} /></VedicD1GuestSessionProvider>;
}
