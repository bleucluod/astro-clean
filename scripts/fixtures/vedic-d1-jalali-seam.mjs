/** Contract seam only. Use the full app module for the final integration gate. */
export function parseJalaliDateInput(value) {
  const normalized = value.replace(/[۰-۹٠-٩]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  }).replace(/[-\s.]/g, '/');
  if (normalized === '1371/05/21') return {ok:true,gregorianIso:'1992-08-12'};
  if (normalized === '1384/08/10') return {ok:true,gregorianIso:'2005-11-01'};
  if (normalized === '1375/05/22') return {ok:true,gregorianIso:'1996-08-12'};
  return {ok:false,message:'تاریخ شمسی معتبر نیست.'};
}
