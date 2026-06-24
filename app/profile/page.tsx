import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = {
  title: "پروفایل کاربر | Halleus",
  description:
    "پروفایل ساده کاربر در Halleus برای نام، بیوگرافی و حالت حریم خصوصی در نسخه MVP.",
};

export default function ProfilePage() {
  return <ProfileForm />;
}
