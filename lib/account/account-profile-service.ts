import { asNullableString, asRecord, getAdminDatabase } from "@/lib/admin/admin-database";
import type { BirthInput } from "@/types/astro";
import type {
  AccountProfileSnapshot,
  AccountProfileUpdateInput,
} from "@/types/account-profile";

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapProfileRow(raw: unknown): AccountProfileSnapshot {
  const row = asRecord(raw);
  return {
    birthDate: asNullableString(row.profile_birth_date),
    residenceCity: asNullableString(row.residence_city),
    residenceCountry: asNullableString(row.residence_country),
    residenceCityId: asNullableString(row.residence_city_id),
    residenceLatitude: asNullableNumber(row.residence_latitude),
    residenceLongitude: asNullableNumber(row.residence_longitude),
    residenceTimezone: asNullableString(row.residence_timezone),
    profileUpdatedAt: asNullableString(row.profile_updated_at),
  };
}

const PROFILE_COLUMNS = `
  profile_birth_date::text as profile_birth_date,
  residence_city,
  residence_country,
  residence_city_id,
  residence_latitude,
  residence_longitude,
  residence_timezone,
  profile_updated_at::text as profile_updated_at
`;

export async function getAccountProfileSnapshot(
  userId: string,
): Promise<AccountProfileSnapshot | null> {
  const sql = getAdminDatabase();
  const rows = await sql.unsafe(
    `select ${PROFILE_COLUMNS} from public.halleus_users where id = $1 limit 1`,
    [userId],
  );
  return rows[0] ? mapProfileRow(rows[0]) : null;
}

export async function initializeAccountProfileFromBirthInput(
  userId: string,
  input: BirthInput,
) {
  const sql = getAdminDatabase();
  const residenceCity = input.currentResidenceCity?.trim() || null;
  const residenceCountry = input.currentResidenceCountry?.trim() || null;
  const residenceCityId = input.currentResidenceCityId?.trim() || null;
  const residenceTimezone = input.currentResidenceTimezone?.trim() || null;
  const hasResidence = Boolean(
    residenceCity &&
      residenceCountry &&
      residenceCityId &&
      residenceTimezone &&
      Number.isFinite(input.currentResidenceLatitude) &&
      Number.isFinite(input.currentResidenceLongitude),
  );

  await sql`
    update public.halleus_users
    set
      profile_birth_date = coalesce(profile_birth_date, ${input.birthDate}::date),
      residence_city = case when residence_city is null and ${hasResidence} then ${residenceCity} else residence_city end,
      residence_country = case when residence_city is null and ${hasResidence} then ${residenceCountry} else residence_country end,
      residence_city_id = case when residence_city is null and ${hasResidence} then ${residenceCityId} else residence_city_id end,
      residence_latitude = case when residence_city is null and ${hasResidence} then ${input.currentResidenceLatitude ?? null} else residence_latitude end,
      residence_longitude = case when residence_city is null and ${hasResidence} then ${input.currentResidenceLongitude ?? null} else residence_longitude end,
      residence_timezone = case when residence_city is null and ${hasResidence} then ${residenceTimezone} else residence_timezone end,
      profile_updated_at = case
        when profile_birth_date is null or (residence_city is null and ${hasResidence}) then now()
        else profile_updated_at
      end,
      updated_at = case
        when profile_birth_date is null or (residence_city is null and ${hasResidence}) then now()
        else updated_at
      end
    where id = ${userId}
      and (profile_birth_date is null or (residence_city is null and ${hasResidence}))
  `;
}

export async function updateAccountProfile(
  userId: string,
  input: AccountProfileUpdateInput,
): Promise<AccountProfileSnapshot | null> {
  const sql = getAdminDatabase();
  const writeBirthDate = typeof input.birthDate === "string";
  const writeResidence = Boolean(input.residence);
  const residence = input.residence ?? null;

  const rows = await sql`
    update public.halleus_users
    set
      profile_birth_date = case when ${writeBirthDate} then ${input.birthDate ?? null}::date else profile_birth_date end,
      residence_city = case when ${writeResidence} then ${residence?.city ?? null} else residence_city end,
      residence_country = case when ${writeResidence} then ${residence?.country ?? null} else residence_country end,
      residence_city_id = case when ${writeResidence} then ${residence?.cityId ?? null} else residence_city_id end,
      residence_latitude = case when ${writeResidence} then ${residence?.latitude ?? null} else residence_latitude end,
      residence_longitude = case when ${writeResidence} then ${residence?.longitude ?? null} else residence_longitude end,
      residence_timezone = case when ${writeResidence} then ${residence?.timezone ?? null} else residence_timezone end,
      profile_updated_at = now(),
      updated_at = now()
    where id = ${userId}
    returning
      profile_birth_date::text as profile_birth_date,
      residence_city,
      residence_country,
      residence_city_id,
      residence_latitude,
      residence_longitude,
      residence_timezone,
      profile_updated_at::text as profile_updated_at
  `;
  return rows[0] ? mapProfileRow(rows[0]) : null;
}