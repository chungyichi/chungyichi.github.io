// Lunar New Year (春節, lunar day 1) as Gregorian dates in Asia/Taipei, 2026-2030. The only date the site needs: the `lunar` season's window
// ({ around: "cny", daysBefore, daysAfter } in site.config.mjs, resolved by src/season-core.mjs). A year outside the table has no such window.
// Sources: https://en.wikipedia.org/wiki/Chinese_New_Year ; Taiwan DGPA 2026 calendar.
// Warning: Node/ICU `Intl` Chinese calendar gives 2027-02-07 and 2030-02-02 (the new moon is within minutes of midnight); Wikipedia and calendar sites
// say 2027-02-06 and 2030-02-03, and the table uses those. Do not generate the table from ICU.
export const LUNAR_TABLE = {
  cny: { 2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03' },
};
