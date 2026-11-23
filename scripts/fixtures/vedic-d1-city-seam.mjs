/** Representative canonical Halleus city-directory signatures, NOT its full database. */
const cities = new Map([
  ['af-kabul', { id:'af-kabul', faName:'کابل', regionFaName:'کابل', countryFaName:'افغانستان', countryCode:'AF', latitude:34.5553, longitude:69.2075, timezone:'Asia/Kabul', aliases:['Kabul'] }],
  ['us-new-york', { id:'us-new-york', faName:'نیویورک', regionFaName:'نیویورک', countryFaName:'ایالات متحده', countryCode:'US', latitude:40.7128, longitude:-74.006, timezone:'America/New_York', aliases:['NYC'] }],
  ['iran-tehran-test', { id:'iran-tehran-test', faName:'تهران', regionFaName:'تهران', countryFaName:'ایران', countryCode:'IR', latitude:35.6892, longitude:51.389, timezone:'Asia/Tehran', aliases:[] }],
]);
export function findHalleusCityById(id) {return cities.get(id.trim()) ?? null;}
export function getHalleusCityDisplayName(city) {
  return city.countryCode === 'IR' ? (city.faName === city.regionFaName ? city.faName : `${city.faName}، ${city.regionFaName}`) : `${city.faName}، ${city.countryFaName}`;
}
