/**
 * Server-side birth input entry for Vedic D1.
 *
 * Reuses the existing Halleus Jalali parser and canonical city directory.
 * Never imports the Western report builder, accepts arbitrary coordinates,
 * trusts a client timezone, or substitutes a demo city/time.
 *
 * This is staged as an overlay: the production app owns ../date/jalali and
 * ../locations/cities. It must be type-checked against those real modules
 * during final integration; the private overlay does not vendor either one.
 */
import { parseJalaliDateInput } from '../date/jalali';
import { findHalleusCityById, getHalleusCityDisplayName } from '../locations/cities';
import {
  validateVedicD1BirthRequest,
  type VedicD1City,
  type VedicD1InputResult,
} from './vedic-d1-contract.js';

export function parseHalleusVedicD1Birth(value: unknown): VedicD1InputResult {
  return validateVedicD1BirthRequest(value, {
    parseJalali: parseJalaliDateInput,
    findCityById(cityId): VedicD1City | null {
      const city = findHalleusCityById(cityId);
      if (!city) return null;
      return {
        id: city.id,
        name: getHalleusCityDisplayName(city),
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone,
      };
    },
  });
}
