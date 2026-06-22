import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = {
  title: "پروفایل کاربر | Astro Clean",
  description:
    "پروفایل ساده کاربر در Astro Clean برای نام، بیوگرافی و حالت حریم خصوصی در نسخه MVP.",
};

export default function ProfilePage() {
  return <ProfileForm />;
}
