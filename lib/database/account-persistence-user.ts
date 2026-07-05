import postgres from "postgres";

export type EnsureAccountPersistenceUserInput = {
  databaseUrl: string;
  userId: string;
  email?: string;
  displayName?: string;
  provider?: "email" | "phone";
};

function normalizeRequiredValue(value: string, label: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${label} is required for account persistence user bootstrap.`);
  }

  return normalizedValue;
}

function normalizeOptionalValue(value?: string) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

export async function ensureAccountPersistenceUser({
  databaseUrl,
  userId,
  email,
  displayName,
  provider = "email",
}: EnsureAccountPersistenceUserInput) {
  const normalizedDatabaseUrl = normalizeRequiredValue(databaseUrl, "databaseUrl");
  const normalizedUserId = normalizeRequiredValue(userId, "userId");
  const normalizedEmail = normalizeOptionalValue(email);
  const normalizedDisplayName = normalizeOptionalValue(displayName);
  const normalizedProvider = provider === "phone" ? "phone" : "email";
  const sql = postgres(normalizedDatabaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });

  try {
    await sql`
      insert into halleus_users (
        id,
        email,
        display_name,
        provider,
        status,
        plan,
        created_at,
        updated_at
      )
      values (
        ${normalizedUserId},
        ${normalizedEmail},
        ${normalizedDisplayName},
        ${normalizedProvider},
        'active',
        'personal',
        now(),
        now()
      )
      on conflict (id) do update set
        email = coalesce(excluded.email, halleus_users.email),
        display_name = coalesce(excluded.display_name, halleus_users.display_name),
        provider = excluded.provider,
        status = 'active',
        updated_at = excluded.updated_at
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
