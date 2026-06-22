import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astro Clean | تحلیل نمادین چارت تولد",
  description:
    "Astro Clean یک تجربه فارسی برای ساخت چارت تولد، گزارش‌های شخصی و مسیر آینده آسترولوژی نمادین است.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
