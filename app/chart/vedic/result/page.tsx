import { redirect } from "next/navigation";

// Guest results exist only in memory at /vedic; old deep links reopen the form.
export default function LegacyVedicResultPage() {
  redirect("/vedic");
}
