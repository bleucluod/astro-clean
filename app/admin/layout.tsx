import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";

export const metadata: Metadata = {
  title: "پنل مدیریت | Halleus",
  description: "پنل خصوصی مدیریت هالیوس.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <div className="halleus-admin-root">{children}</div>;
}
