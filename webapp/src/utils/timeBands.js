/**
 * Time band metadata for period descriptions and partial-hour warnings.
 */
export const TIME_BAND_DETAILS = {
  month: { startHour: 6, endHour: 20, hasPartialStart: true, hasPartialEnd: true },
  earlymorning: { startHour: 6, endHour: 9, hasPartialStart: true, hasPartialEnd: false },
  morning: { startHour: 9, endHour: 12, hasPartialStart: false, hasPartialEnd: false },
  peakthermal: { startHour: 12, endHour: 15, hasPartialStart: false, hasPartialEnd: false },
  afternoon: { startHour: 15, endHour: 18, hasPartialStart: false, hasPartialEnd: false },
  evening: { startHour: 18, endHour: 20, hasPartialStart: false, hasPartialEnd: true },
};

/**
 * Check if a period has potential partial data issues.
 */
export function hasPartialData(periodId) {
  const band = TIME_BAND_DETAILS[periodId];
  return band ? band.hasPartialStart || band.hasPartialEnd : false;
}
