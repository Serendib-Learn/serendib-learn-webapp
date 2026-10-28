"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { HOLIDAY_CATEGORY_LABEL as CATEGORY_LABEL } from "@/lib/content";
import type { Holiday } from "@/lib/types";

const CATEGORY_DOT: Record<Holiday["category"], string> = {
  poya: "bg-sage",
  national: "bg-amber-spice",
  hindu: "bg-[#D4537E]",
  muslim: "bg-[#378ADD]",
  christian: "bg-[#639922]",
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

/**
 * The original site's Sri Lankan holidays list: what is coming up, or the
 * whole year. The holidays come from the database (admins keep them up to
 * date in the content editor); the calendar page passes them in.
 */
export function HolidaysPanel({ holidays }: { holidays: Holiday[] }) {
  const [showAll, setShowAll] = useState(false);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const year = today.slice(0, 4);
  const list = showAll
    ? holidays.filter((holiday) => holiday.date.startsWith(year))
    : holidays.filter((holiday) => holiday.date >= today).slice(0, 5);

  return (
    <div className="rounded-xl border border-forest/10 bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-[15px] text-forest">
          <Sparkles className="h-4 w-4 text-amber-spice" strokeWidth={1.75} />
          Sri Lankan holidays
        </p>
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="text-xs whitespace-nowrap text-amber-spice hover:underline"
        >
          {showAll ? "Show upcoming" : "Show full year"}
        </button>
      </div>
      <p className="mb-4 text-xs text-earth/55">
        {showAll ? `All of ${year}, gazetted public holidays.` : "What's coming up next."}
      </p>

      {list.length === 0 ? (
        <p className="text-xs text-earth/50">That is everything we have so far — next year&apos;s dates are added once they are gazetted.</p>
      ) : (
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {list.map((holiday) => (
            <div key={holiday.id} className="flex gap-3 border-b border-forest/8 pb-3 last:border-0 last:pb-0">
              <div className="flex w-14 shrink-0 flex-col items-center pt-0.5">
                <span className={`mb-1 h-2 w-2 rounded-full ${CATEGORY_DOT[holiday.category]}`} />
                <span className="text-center text-[10px] leading-tight text-earth/50">{formatDate(holiday.date)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-forest">{holiday.name}</p>
                <p className="mb-1 text-[10px] text-earth/45">{CATEGORY_LABEL[holiday.category]}</p>
                <p className="text-xs leading-relaxed text-earth/75">{holiday.funFact}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
