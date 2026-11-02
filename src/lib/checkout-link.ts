import type { Booking } from "@/lib/types";

/** Where to pay for a booking: its own checkout, or its bundle's (one payment for every lesson in it). */
export function checkoutHref(booking: Booking): string {
  return booking.bundleId ? `/portal/checkout/bundle/${booking.bundleId}` : `/portal/checkout/${booking.id}`;
}
