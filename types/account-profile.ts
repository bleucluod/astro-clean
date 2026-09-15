export type AccountProfileSnapshot = {
  birthDate: string | null;
  residenceCity: string | null;
  residenceCountry: string | null;
  residenceCityId: string | null;
  residenceLatitude: number | null;
  residenceLongitude: number | null;
  residenceTimezone: string | null;
  profileUpdatedAt: string | null;
};

export type AccountProfileResidenceInput = {
  city: string;
  country: string;
  cityId: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type AccountProfileUpdateInput = {
  birthDate?: string;
  residence?: AccountProfileResidenceInput;
};