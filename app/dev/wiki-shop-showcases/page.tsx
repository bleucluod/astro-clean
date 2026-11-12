import { notFound } from "next/navigation";
import { WikiShopShowcaseDevWorkspace } from "./WikiShopShowcaseDevWorkspace";
import "./dev-preview.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "پیش‌نمایش آزمایشی ویترین ویکی | هالیوس",
  robots: { index: false, follow: false },
};

export default function WikiShopShowcaseDevPreview() {
  // This sample is available only in the local Next.js development server.
  if (process.env.NODE_ENV !== "development") notFound();
  return <WikiShopShowcaseDevWorkspace />;
}
