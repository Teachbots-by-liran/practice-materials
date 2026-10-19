// Dates are local calendar days as "YYYY-MM-DD" strings, so a review "due tomorrow"
// means the student's tomorrow, not 24 hours from now.

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parse(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parse(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/** The Israeli school week starts on Sunday. */
export function weekStart(key: string): string {
  return addDays(key, -parse(key).getDay());
}

/** Days left in the week, including today (Sunday = 7 … Saturday = 1). */
export function daysLeftInWeek(key: string): number {
  return 7 - parse(key).getDay();
}
