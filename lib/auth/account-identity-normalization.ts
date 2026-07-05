export type AccountIdentityMode = "sign-in" | "sign-up";

export type AccountIdentityValidationInput = {
  mode: AccountIdentityMode;
  username: string;
  phone: string;
  password: string;
};

export type AccountIdentityValidationResult =
  | {
      ok: true;
      normalizedUsername: string;
      normalizedPhone: string;
    }
  | {
      ok: false;
      normalizedUsername: string;
      normalizedPhone: string;
      message: string;
    };

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;
const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const USERNAME_BRIDGE_EMAIL_DOMAIN = "auth.halleus.example";

export function normalizeAccountUsername(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function normalizeAccountPhone(value: string) {
  const compactValue = value.trim().replace(/[\s().-]/g, "");

  return compactValue.startsWith("00")
    ? `+${compactValue.slice(2)}`
    : compactValue;
}

export function isValidAccountUsername(value: string) {
  return USERNAME_PATTERN.test(normalizeAccountUsername(value));
}

export function isValidAccountPhone(value: string) {
  return E164_PHONE_PATTERN.test(normalizeAccountPhone(value));
}

export function createSupabaseUsernameBridgeEmail(username: string) {
  const normalizedUsername = normalizeAccountUsername(username);

  return `${normalizedUsername}@${USERNAME_BRIDGE_EMAIL_DOMAIN}`;
}

export function isSupabaseUsernameBridgeEmail(value: string | undefined | null) {
  return Boolean(
    value?.toLowerCase().endsWith(`@${USERNAME_BRIDGE_EMAIL_DOMAIN}`),
  );
}

export function extractUsernameFromSupabaseBridgeEmail(
  value: string | undefined | null,
) {
  if (!isSupabaseUsernameBridgeEmail(value)) {
    return undefined;
  }

  const [username] = value?.split("@") ?? [];

  return username || undefined;
}

export function validateAccountIdentityInput({
  mode,
  username,
  phone,
  password,
}: AccountIdentityValidationInput): AccountIdentityValidationResult {
  const normalizedUsername = normalizeAccountUsername(username);
  const normalizedPhone = normalizeAccountPhone(phone);

  if (!isValidAccountUsername(normalizedUsername)) {
    return {
      ok: false,
      normalizedUsername,
      normalizedPhone,
      message:
        "نام کاربری باید ۳ تا ۳۲ کاراکتر انگلیسی/عددی باشد و می‌تواند خط تیره یا زیرخط داشته باشد.",
    };
  }

  if (mode === "sign-up" && !isValidAccountPhone(normalizedPhone)) {
    return {
      ok: false,
      normalizedUsername,
      normalizedPhone,
      message: "شماره موبایل را با فرمت بین‌المللی وارد کن؛ نمونه: +989121234567.",
    };
  }

  if (password.length < 6) {
    return {
      ok: false,
      normalizedUsername,
      normalizedPhone,
      message: "رمز عبور باید حداقل ۶ کاراکتر باشد.",
    };
  }

  return {
    ok: true,
    normalizedUsername,
    normalizedPhone,
  };
}

export const accountIdentityRules = {
  usernameRule:
    "Username is user-chosen and must not be derived from mobile or email.",
  phoneRule:
    "Mobile phone is collected in E.164 format for customer/contact data, but it is not the username.",
  emailRule: "Email is optional/secondary and must not become the username.",
  supabaseBridgeRule:
    "Supabase Auth uses a deterministic private bridge email derived from username only; this credential is not the user's email.",
};