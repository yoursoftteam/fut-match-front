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

export function getLocalDateInputValue(dateValue: string): string {
  const date = new Date(dateValue);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getLocalTimeInputValue(dateValue: string): string {
  const date = new Date(dateValue);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function combineLocalDateAndTime(dateValue: string, timeValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0).toISOString();
}

export function formatTimeAmPm(timeValue: string): string {
  const normalized = timeValue.trim();
  const parts = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return normalized;

  const [, hhRaw, mmRaw] = parts;
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return normalized;
  }

  const sampleDate = new Date(2000, 0, 1, hh, mm, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(sampleDate);
}

export function formatLocalTime(dateValue: string): string {
  return formatTimeAmPm(getLocalTimeInputValue(dateValue));
}
