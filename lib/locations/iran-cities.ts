export type IranCity = {
  id: string;
  faName: string;
  enName: string;
  provinceFaName: string;
  latitude: number;
  longitude: number;
  timezone: "Asia/Tehran";
};

export const IRAN_CITY_OPTIONS = [
  { id: "tehran", faName: "تهران", enName: "Tehran", provinceFaName: "تهران", latitude: 35.6892, longitude: 51.389, timezone: "Asia/Tehran" },
  { id: "mashhad", faName: "مشهد", enName: "Mashhad", provinceFaName: "خراسان رضوی", latitude: 36.2605, longitude: 59.6168, timezone: "Asia/Tehran" },
  { id: "isfahan", faName: "اصفهان", enName: "Isfahan", provinceFaName: "اصفهان", latitude: 32.6539, longitude: 51.666, timezone: "Asia/Tehran" },
  { id: "shiraz", faName: "شیراز", enName: "Shiraz", provinceFaName: "فارس", latitude: 29.5918, longitude: 52.5837, timezone: "Asia/Tehran" },
  { id: "tabriz", faName: "تبریز", enName: "Tabriz", provinceFaName: "آذربایجان شرقی", latitude: 38.0962, longitude: 46.2738, timezone: "Asia/Tehran" },
  { id: "karaj", faName: "کرج", enName: "Karaj", provinceFaName: "البرز", latitude: 35.8400, longitude: 50.9391, timezone: "Asia/Tehran" },
  { id: "qom", faName: "قم", enName: "Qom", provinceFaName: "قم", latitude: 34.6416, longitude: 50.8746, timezone: "Asia/Tehran" },
  { id: "ahvaz", faName: "اهواز", enName: "Ahvaz", provinceFaName: "خوزستان", latitude: 31.3183, longitude: 48.6706, timezone: "Asia/Tehran" },
  { id: "kermanshah", faName: "کرمانشاه", enName: "Kermanshah", provinceFaName: "کرمانشاه", latitude: 34.3142, longitude: 47.0650, timezone: "Asia/Tehran" },
  { id: "urmia", faName: "ارومیه", enName: "Urmia", provinceFaName: "آذربایجان غربی", latitude: 37.5527, longitude: 45.0761, timezone: "Asia/Tehran" },
  { id: "rasht", faName: "رشت", enName: "Rasht", provinceFaName: "گیلان", latitude: 37.2808, longitude: 49.5832, timezone: "Asia/Tehran" },
  { id: "zahedan", faName: "زاهدان", enName: "Zahedan", provinceFaName: "سیستان و بلوچستان", latitude: 29.4963, longitude: 60.8629, timezone: "Asia/Tehran" },
  { id: "hamedan", faName: "همدان", enName: "Hamedan", provinceFaName: "همدان", latitude: 34.7989, longitude: 48.5150, timezone: "Asia/Tehran" },
  { id: "kerman", faName: "کرمان", enName: "Kerman", provinceFaName: "کرمان", latitude: 30.2839, longitude: 57.0834, timezone: "Asia/Tehran" },
  { id: "yazd", faName: "یزد", enName: "Yazd", provinceFaName: "یزد", latitude: 31.8974, longitude: 54.3569, timezone: "Asia/Tehran" },
  { id: "ardabil", faName: "اردبیل", enName: "Ardabil", provinceFaName: "اردبیل", latitude: 38.2498, longitude: 48.2933, timezone: "Asia/Tehran" },
  { id: "bandar-abbas", faName: "بندرعباس", enName: "Bandar Abbas", provinceFaName: "هرمزگان", latitude: 27.1832, longitude: 56.2666, timezone: "Asia/Tehran" },
  { id: "arak", faName: "اراک", enName: "Arak", provinceFaName: "مرکزی", latitude: 34.0954, longitude: 49.7013, timezone: "Asia/Tehran" },
  { id: "qazvin", faName: "قزوین", enName: "Qazvin", provinceFaName: "قزوین", latitude: 36.2688, longitude: 50.0041, timezone: "Asia/Tehran" },
  { id: "sari", faName: "ساری", enName: "Sari", provinceFaName: "مازندران", latitude: 36.5659, longitude: 53.0586, timezone: "Asia/Tehran" },
  { id: "gorgan", faName: "گرگان", enName: "Gorgan", provinceFaName: "گلستان", latitude: 36.8456, longitude: 54.4393, timezone: "Asia/Tehran" },
  { id: "sanandaj", faName: "سنندج", enName: "Sanandaj", provinceFaName: "کردستان", latitude: 35.3219, longitude: 46.9862, timezone: "Asia/Tehran" },
  { id: "khorramabad", faName: "خرم‌آباد", enName: "Khorramabad", provinceFaName: "لرستان", latitude: 33.4878, longitude: 48.3558, timezone: "Asia/Tehran" },
  { id: "bushehr", faName: "بوشهر", enName: "Bushehr", provinceFaName: "بوشهر", latitude: 28.9234, longitude: 50.8203, timezone: "Asia/Tehran" },
  { id: "zanjan", faName: "زنجان", enName: "Zanjan", provinceFaName: "زنجان", latitude: 36.6736, longitude: 48.4787, timezone: "Asia/Tehran" },
  { id: "birjand", faName: "بیرجند", enName: "Birjand", provinceFaName: "خراسان جنوبی", latitude: 32.8649, longitude: 59.2262, timezone: "Asia/Tehran" },
  { id: "ilam", faName: "ایلام", enName: "Ilam", provinceFaName: "ایلام", latitude: 33.6374, longitude: 46.4227, timezone: "Asia/Tehran" },
  { id: "yasuj", faName: "یاسوج", enName: "Yasuj", provinceFaName: "کهگیلویه و بویراحمد", latitude: 30.6682, longitude: 51.5876, timezone: "Asia/Tehran" },
  { id: "semnan", faName: "سمنان", enName: "Semnan", provinceFaName: "سمنان", latitude: 35.5769, longitude: 53.3931, timezone: "Asia/Tehran" },
  { id: "shahrekord", faName: "شهرکرد", enName: "Shahrekord", provinceFaName: "چهارمحال و بختیاری", latitude: 32.3256, longitude: 50.8644, timezone: "Asia/Tehran" },
  { id: "bojnord", faName: "بجنورد", enName: "Bojnord", provinceFaName: "خراسان شمالی", latitude: 37.4750, longitude: 57.3333, timezone: "Asia/Tehran" },
  { id: "kashan", faName: "کاشان", enName: "Kashan", provinceFaName: "اصفهان", latitude: 33.9850, longitude: 51.4090, timezone: "Asia/Tehran" },
  { id: "neyshabur", faName: "نیشابور", enName: "Neyshabur", provinceFaName: "خراسان رضوی", latitude: 36.2141, longitude: 58.7958, timezone: "Asia/Tehran" },
  { id: "dezful", faName: "دزفول", enName: "Dezful", provinceFaName: "خوزستان", latitude: 32.3831, longitude: 48.4236, timezone: "Asia/Tehran" },
  { id: "abadan", faName: "آبادان", enName: "Abadan", provinceFaName: "خوزستان", latitude: 30.3473, longitude: 48.2934, timezone: "Asia/Tehran" },
  { id: "kish", faName: "کیش", enName: "Kish", provinceFaName: "هرمزگان", latitude: 26.5325, longitude: 53.9736, timezone: "Asia/Tehran" },
  { id: "qeshm", faName: "قشم", enName: "Qeshm", provinceFaName: "هرمزگان", latitude: 26.9581, longitude: 56.2719, timezone: "Asia/Tehran" },
] as const satisfies readonly IranCity[];

export function normalizeCitySearch(value: string) {
  return value.trim().toLocaleLowerCase("fa-IR");
}

export function findIranCityByName(value: string) {
  const normalizedValue = normalizeCitySearch(value);

  return IRAN_CITY_OPTIONS.find((city) => {
    return (
      normalizeCitySearch(city.faName) === normalizedValue ||
      city.id === normalizedValue ||
      city.enName.toLocaleLowerCase("en-US") === normalizedValue
    );
  });
}

export function filterIranCities(value: string) {
  const normalizedValue = normalizeCitySearch(value);

  if (!normalizedValue) {
    return IRAN_CITY_OPTIONS;
  }

  return IRAN_CITY_OPTIONS.filter((city) => {
    return (
      normalizeCitySearch(city.faName).includes(normalizedValue) ||
      normalizeCitySearch(city.provinceFaName).includes(normalizedValue) ||
      city.enName.toLocaleLowerCase("en-US").includes(normalizedValue)
    );
  });
}
