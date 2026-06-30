import postgres from "postgres";

export type EnsureBetaPersistenceUserInput = {
  databaseUrl: string;
  userId: string;
};

function normalizeRequiredValue(value: string, label: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${label} is required for beta persistence user bootstrap.`);
  }

  return normalizedValue;
}

export async function ensureBetaPersistenceUser({
  databaseUrl,
  userId,
}: EnsureBetaPersistenceUserInput) {
  const normalizedDatabaseUrl = normalizeRequiredValue(databaseUrl, "databaseUrl");
  const normalizedUserId = normalizeRequiredValue(userId, "userId");
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
        null,
        'Beta Persistence User',
        'beta',
        'active',
        'personal',
        now(),
        now()
      )
      on conflict (id) do update set
        updated_at = excluded.updated_at
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
