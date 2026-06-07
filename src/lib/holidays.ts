/** Pure: returns true if the given ISO date string is in the holiday set. */
export function isHolidayPure(isoDate: string, holidayDates: Set<string>): boolean {
  return holidayDates.has(isoDate);
}

/** Pure: returns holiday name from a pre-loaded map, or null. */
export function getHolidayNamePure(
  isoDate: string,
  holidayMap: Map<string, string>,
): string | null {
  return holidayMap.get(isoDate) ?? null;
}
