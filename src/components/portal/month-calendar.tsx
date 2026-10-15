"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { HOLIDAYS_2026 } from "@/data/holidays";
import { cn } from "@/lib/cn";

/** A local-date key, yyyy-mm-dd — not toISOString, which would shift across midnight in UTC. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const HOLIDAY_BY_DATE = new Map(HOLIDAYS_2026.map((holiday) => [holiday.date, holiday]));

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthMatrix(year: number, month: number) {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export interface DayMarks {
  open?: boolean;
  booked?: boolean;
}

/** The original site's month calendar: open, booked and holiday dots under each day. */
export function MonthCalendar({
  cursor,
  selected,
  todayISO,
  marks,
  onSelect,
  onPrev,
  onNext,
  onToday,
}: {
  cursor: Date;
  selected: string;
  todayISO: string;
  marks: Record<string, DayMarks>;
  onSelect: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const cells = monthMatrix(cursor.getFullYear(), cursor.getMonth());

  return (
    <div className="rounded-xl border border-forest/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm text-forest">
          {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPrev}
            className="flex h-6 w-6 items-center justify-center rounded-full text-earth/50 hover:bg-mist"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex h-6 w-6 items-center justify-center rounded-full text-earth/50 hover:bg-mist"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-earth/40">
        {WEEKDAY_LABELS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={`blank-${index}`} />;
          const iso = toISODate(date);
          const mark = marks[iso] ?? {};
          const holiday = HOLIDAY_BY_DATE.get(iso);
          const isToday = iso === todayISO;
          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={isSelected}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-full text-xs transition-colors",
                isSelected
                  ? "bg-forest text-cream"
                  : isToday
                    ? "bg-mist font-semibold text-forest"
                    : "text-earth hover:bg-mist/60",
              )}
            >
              <span className={holiday && !isSelected ? "font-semibold text-amber-spice" : ""}>
                {date.getDate()}
              </span>
              <span className="mt-0.5 flex h-1 gap-0.5">
                {mark.open ? (
                  <span className={cn("h-1 w-1 rounded-full", isSelected ? "bg-cream" : "bg-fern")} />
                ) : null}
                {mark.booked ? (
                  <span className={cn("h-1 w-1 rounded-full", isSelected ? "bg-cream" : "bg-earth/35")} />
                ) : null}
                {holiday ? (
                  <span className={cn("h-1 w-1 rounded-full", isSelected ? "bg-cream" : "bg-amber-spice")} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-forest/8 pt-3 text-[10px] text-earth/50">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-fern" /> Open
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-earth/35" /> Booked
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-spice" /> Holiday
          </span>
        </div>
        <button type="button" onClick={onToday} className="mt-1 self-start text-amber-spice hover:underline">
          Jump to today
        </button>
      </div>
    </div>
  );
}
