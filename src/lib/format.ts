export const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} at ${formatTime(iso)}`;
}

export function formatClock(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function relativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return "just now";

  const format = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
    new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
      Math.round(diffMs > 0 ? value : -value),
      unit,
    );

  if (abs < hour) return format(abs / minute, "minute");
  if (abs < day) return format(abs / hour, "hour");
  if (abs < 30 * day) return format(abs / day, "day");
  return formatDate(iso);
}

export function money(amountUsd: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/** Groups items under a "Mon 4 Aug" style key, preserving order. */
export function groupByDay<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const label = formatLongDate(key(item));
    const bucket = groups.get(label);
    if (bucket) bucket.push(item);
    else groups.set(label, [item]);
  }
  return Array.from(groups, ([label, entries]) => ({ label, entries }));
}
