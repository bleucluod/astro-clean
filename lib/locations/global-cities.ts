export type GlobalCityOption = {
  id: string;
  faName: string;
  regionFaName: string;
  countryFaName: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  aliases: readonly string[];
};

// Curated, not ranked. Coverage focuses on major Persian/Dari/Tajik population
// centers and common Iranian/Persian-speaking migration destinations.
// Inclusion evidence was reviewed from official census/statistical sources where
// city-level data is available (including Statistics Canada, ABS and ONS) and
// corroborating migration statistics for destination countries. Coordinates are
// city-center references; every timezone is an IANA zone and is guard-validated.
export const GLOBAL_CITY_OPTIONS: readonly GlobalCityOption[] = [
  { id: "af-kabul", faName: "کابل", regionFaName: "کابل", countryFaName: "افغانستان", countryCode: "AF", latitude: 34.5553, longitude: 69.2075, timezone: "Asia/Kabul", aliases: ["Kabul", "کابول"] },
  { id: "af-herat", faName: "هرات", regionFaName: "هرات", countryFaName: "افغانستان", countryCode: "AF", latitude: 34.3529, longitude: 62.204, timezone: "Asia/Kabul", aliases: ["Herat"] },
  { id: "af-mazar-i-sharif", faName: "مزار شریف", regionFaName: "بلخ", countryFaName: "افغانستان", countryCode: "AF", latitude: 36.7069, longitude: 67.1122, timezone: "Asia/Kabul", aliases: ["Mazar-i-Sharif", "Mazar e Sharif", "مزارشریف"] },
  { id: "af-bamyan", faName: "بامیان", regionFaName: "بامیان", countryFaName: "افغانستان", countryCode: "AF", latitude: 34.8216, longitude: 67.8273, timezone: "Asia/Kabul", aliases: ["Bamyan", "Bamiyan"] },
  { id: "tj-dushanbe", faName: "دوشنبه", regionFaName: "ناحیه‌های تابع جمهوری", countryFaName: "تاجیکستان", countryCode: "TJ", latitude: 38.5598, longitude: 68.787, timezone: "Asia/Dushanbe", aliases: ["Dushanbe"] },
  { id: "tj-khujand", faName: "خجند", regionFaName: "سغد", countryFaName: "تاجیکستان", countryCode: "TJ", latitude: 40.2833, longitude: 69.6222, timezone: "Asia/Dushanbe", aliases: ["Khujand", "Khojand"] },
  { id: "ca-toronto", faName: "تورنتو", regionFaName: "انتاریو", countryFaName: "کانادا", countryCode: "CA", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto", aliases: ["Toronto", "Toronto GTA", "GTA"] },
  { id: "ca-vancouver", faName: "ونکوور", regionFaName: "بریتیش کلمبیا", countryFaName: "کانادا", countryCode: "CA", latitude: 49.2827, longitude: -123.1207, timezone: "America/Vancouver", aliases: ["Vancouver"] },
  { id: "ca-montreal", faName: "مونترال", regionFaName: "کبک", countryFaName: "کانادا", countryCode: "CA", latitude: 45.5017, longitude: -73.5673, timezone: "America/Toronto", aliases: ["Montreal", "Montréal"] },
  { id: "us-los-angeles", faName: "لس‌آنجلس", regionFaName: "کالیفرنیا", countryFaName: "ایالات متحده", countryCode: "US", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles", aliases: ["Los Angeles", "لس آنجلس", "LA"] },
  { id: "us-san-francisco", faName: "سان‌فرانسیسکو", regionFaName: "کالیفرنیا", countryFaName: "ایالات متحده", countryCode: "US", latitude: 37.7749, longitude: -122.4194, timezone: "America/Los_Angeles", aliases: ["San Francisco", "سان فرانسیسکو", "Bay Area"] },
  { id: "us-new-york", faName: "نیویورک", regionFaName: "نیویورک", countryFaName: "ایالات متحده", countryCode: "US", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", aliases: ["New York", "New York City", "NYC", "نیویورک سیتی"] },
  { id: "us-washington-dc", faName: "واشینگتن دی‌سی", regionFaName: "ناحیه کلمبیا", countryFaName: "ایالات متحده", countryCode: "US", latitude: 38.9072, longitude: -77.0369, timezone: "America/New_York", aliases: ["Washington DC", "Washington D.C.", "واشنگتن دی سی", "واشینگتن"] },
  { id: "gb-london", faName: "لندن", regionFaName: "انگلستان", countryFaName: "بریتانیا", countryCode: "GB", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", aliases: ["London"] },
  { id: "de-berlin", faName: "برلین", regionFaName: "برلین", countryFaName: "آلمان", countryCode: "DE", latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin", aliases: ["Berlin"] },
  { id: "de-hamburg", faName: "هامبورگ", regionFaName: "هامبورگ", countryFaName: "آلمان", countryCode: "DE", latitude: 53.5511, longitude: 9.9937, timezone: "Europe/Berlin", aliases: ["Hamburg"] },
  { id: "de-frankfurt", faName: "فرانکفورت", regionFaName: "هسن", countryFaName: "آلمان", countryCode: "DE", latitude: 50.1109, longitude: 8.6821, timezone: "Europe/Berlin", aliases: ["Frankfurt", "Frankfurt am Main"] },
  { id: "se-stockholm", faName: "استکهلم", regionFaName: "استکهلم", countryFaName: "سوئد", countryCode: "SE", latitude: 59.3293, longitude: 18.0686, timezone: "Europe/Stockholm", aliases: ["Stockholm"] },
  { id: "se-gothenburg", faName: "گوتنبرگ", regionFaName: "وسترا یوتالاند", countryFaName: "سوئد", countryCode: "SE", latitude: 57.7089, longitude: 11.9746, timezone: "Europe/Stockholm", aliases: ["Gothenburg", "Göteborg", "یوتبری"] },
  { id: "fr-paris", faName: "پاریس", regionFaName: "ایل-دو-فرانس", countryFaName: "فرانسه", countryCode: "FR", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris", aliases: ["Paris"] },
  { id: "at-vienna", faName: "وین", regionFaName: "وین", countryFaName: "اتریش", countryCode: "AT", latitude: 48.2082, longitude: 16.3738, timezone: "Europe/Vienna", aliases: ["Vienna", "Wien"] },
  { id: "nl-amsterdam", faName: "آمستردام", regionFaName: "هلند شمالی", countryFaName: "هلند", countryCode: "NL", latitude: 52.3676, longitude: 4.9041, timezone: "Europe/Amsterdam", aliases: ["Amsterdam"] },
  { id: "nl-rotterdam", faName: "روتردام", regionFaName: "هلند جنوبی", countryFaName: "هلند", countryCode: "NL", latitude: 51.9244, longitude: 4.4777, timezone: "Europe/Amsterdam", aliases: ["Rotterdam"] },
  { id: "no-oslo", faName: "اسلو", regionFaName: "اسلو", countryFaName: "نروژ", countryCode: "NO", latitude: 59.9139, longitude: 10.7522, timezone: "Europe/Oslo", aliases: ["Oslo"] },
  { id: "dk-copenhagen", faName: "کپنهاگ", regionFaName: "منطقه پایتخت", countryFaName: "دانمارک", countryCode: "DK", latitude: 55.6761, longitude: 12.5683, timezone: "Europe/Copenhagen", aliases: ["Copenhagen", "København"] },
  { id: "tr-istanbul", faName: "استانبول", regionFaName: "استانبول", countryFaName: "ترکیه", countryCode: "TR", latitude: 41.0082, longitude: 28.9784, timezone: "Europe/Istanbul", aliases: ["Istanbul", "İstanbul"] },
  { id: "tr-ankara", faName: "آنکارا", regionFaName: "آنکارا", countryFaName: "ترکیه", countryCode: "TR", latitude: 39.9334, longitude: 32.8597, timezone: "Europe/Istanbul", aliases: ["Ankara"] },
  { id: "ae-dubai", faName: "دبی", regionFaName: "دبی", countryFaName: "امارات متحده عربی", countryCode: "AE", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai", aliases: ["Dubai"] },
  { id: "ae-abu-dhabi", faName: "ابوظبی", regionFaName: "ابوظبی", countryFaName: "امارات متحده عربی", countryCode: "AE", latitude: 24.4539, longitude: 54.3773, timezone: "Asia/Dubai", aliases: ["Abu Dhabi", "ابو ظبی"] },
  { id: "au-sydney", faName: "سیدنی", regionFaName: "نیو ساوت ولز", countryFaName: "استرالیا", countryCode: "AU", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney", aliases: ["Sydney"] },
  { id: "au-melbourne", faName: "ملبورن", regionFaName: "ویکتوریا", countryFaName: "استرالیا", countryCode: "AU", latitude: -37.8136, longitude: 144.9631, timezone: "Australia/Melbourne", aliases: ["Melbourne"] },
];