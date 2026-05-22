/**
 * Given a day-of-week (0=Sun … 6=Sat), returns the nearest upcoming date
 * (YYYY-MM-DD, local timezone) that falls on that day.
 *
 * - If today IS that day → returns today.
 * - If that day is still ahead this week → returns it within the current week.
 * - If that day has already passed this week → returns next week's occurrence.
 */
export function getNextDateForDayOfWeek(targetDay: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  const diff = (targetDay - todayDay + 7) % 7;
  const target = new Date(today);
  target.setDate(today.getDate() + diff);

  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
