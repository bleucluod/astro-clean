import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../admin/admin.css";

export const metadata: Metadata = {
  title: "پنل مدیریت | Halleus",
  description: "پنل خصوصی مدیریت هالیوس.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminiLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <div className="halleus-admin-root">{children}</div>;
}
