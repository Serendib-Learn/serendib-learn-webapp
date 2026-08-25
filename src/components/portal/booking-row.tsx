"use client";

import { Badge, type Tone } from "@/components/ui/primitives";
import { formatDateTime, isPast, money } from "@/lib/format";
import type { Booking, BookingStatus } from "@/lib/types";

const statusTone: Record<BookingStatus, Tone> = {
  awaiting_payment: "saffron",
  confirmed: "jade",
  completed: "neutral",
  cancelled: "clay",
};

const statusLabel: Record<BookingStatus, string> = {
  awaiting_payment: "Payment due",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function BookingRow({
  booking,
  counterpart,
  actions,
}: {
  booking: Booking;
  /** The other party, when we know their name. */
  counterpart?: { name: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-white p-5 ring-1 ring-ink-900/8">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[booking.status]}>{statusLabel[booking.status]}</Badge>
          <Badge tone={booking.language === "sinhala" ? "jade" : "clay"}>
            {booking.language === "sinhala" ? "Sinhala" : "Tamil"}
          </Badge>
          {isPast(booking.startsAt) && booking.status === "confirmed" ? (
            <Badge tone="ocean">Awaiting write-up</Badge>
          ) : null}
        </div>

        <p className="mt-2.5 font-display text-lg leading-snug text-ink-900">{booking.focus}</p>
        <p className="mt-1 text-sm text-ink-500">
          {formatDateTime(booking.startsAt)} · {booking.durationMins} min
          {counterpart ? ` · with ${counterpart.name}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-sm font-medium text-ink-700">{money(booking.priceUsd)}</span>
        {actions}
      </div>
    </div>
  );
}
