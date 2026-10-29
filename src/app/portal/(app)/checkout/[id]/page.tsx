"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { photoUrlFor } from "@/lib/api/public";
import { useAuth } from "@/lib/auth";
import { errorMessage, useAction, useQuery } from "@/lib/hooks";
import { formatLongDate, formatTime, money, rupees } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Alert, Avatar, Card, Loading, Spinner } from "@/components/ui/primitives";
import type { Booking, PaymentsConfig, PublicProfile } from "@/lib/types";

/** How long to keep asking after the customer comes back from the hosted page. */
const POLL_MS = 2500;
const POLL_TRIES = 24;

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Loading label="Opening checkout" />}>
      <Checkout />
    </Suspense>
  );
}

function Checkout() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const returned = params.get("status") === "returned";
  const cancelledAtCheckout = params.get("status") === "cancelled";

  const { user } = useAuth();
  const booking = useQuery(() => api.bookings.get(id), [id]);
  const config = useQuery(() => api.payments.config(), []);
  const people = useQuery(() => api.users.directory(), []);

  // After the hosted page sends the customer back, ask the API to check the
  // payment with Payments.lk until it is confirmed (or we give up and say so).
  const [polled, setPolled] = useState<Booking | null>(null);
  const [pollingDone, setPollingDone] = useState(false);
  useEffect(() => {
    if (!returned) return;
    let tries = 0;
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      try {
        const latest = await api.bookings.paymentStatus(id);
        setPolled(latest);
        if (latest.status !== "awaiting_payment") {
          setPollingDone(true);
          return;
        }
      } catch {
        // Keep trying; a blip should not end the wait.
      }
      tries += 1;
      if (tries >= POLL_TRIES) setPollingDone(true);
      else setTimeout(check, POLL_MS);
    };
    void check();
    return () => {
      stopped = true;
    };
  }, [id, returned]);

  if (!user || booking.loading || config.loading) return <Loading label="Opening checkout" />;
  if (booking.error || !booking.data) {
    return (
      <>
        <PageHeader title="Checkout" />
        <Alert>{booking.error ?? "That booking could not be found."}</Alert>
      </>
    );
  }

  const current = polled ?? booking.data;
  const tutor = (people.data ?? []).find((person) => person.id === current.tutorId);

  return (
    <>
      <PageHeader title={current.status === "confirmed" ? "You're booked" : "Checkout"}>
        {current.status === "confirmed"
          ? current.creditId
            ? "Booked with your free lesson — nothing to pay. Your meeting link is below and in your calendar."
            : "Payment received. Your meeting link is below and in your calendar."
          : "Check the details, then pay securely by card."}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {current.status === "confirmed" || current.status === "completed" ? (
            <Confirmed booking={current} />
          ) : current.status === "cancelled" ? (
            <Alert>
              {current.cancelReason ?? "This booking was cancelled."} Book another time from the{" "}
              calendar whenever you are ready.
            </Alert>
          ) : returned && !pollingDone ? (
            <Card className="flex items-center gap-3 p-6 text-sm text-ink-600">
              <Spinner /> Confirming your payment with the bank…
            </Card>
          ) : (
            <>
              {returned && pollingDone ? (
                <Alert tone="saffron">
                  We have not had confirmation of that payment yet. If you completed it, it
                  will show here shortly and you will get a receipt by email — there is no need
                  to pay again.
                </Alert>
              ) : null}
              {cancelledAtCheckout ? (
                <Alert tone="saffron">
                  Payment was cancelled. The slot is held for you for a little while — pay
                  below to keep it.
                </Alert>
              ) : null}
              {current.payment?.failureMessage ? (
                <Alert>Your last attempt was declined: {current.payment.failureMessage}</Alert>
              ) : null}
              <PayPanel booking={current} config={config.data} />
            </>
          )}
        </div>

        <Summary booking={current} tutor={tutor} config={config.data} />
      </div>
    </>
  );
}

function amountFor(booking: Booking, config?: PaymentsConfig) {
  if (booking.payment) return booking.payment.amountCents;
  if (config?.enabled) return Math.round(booking.priceUsd * config.usdToLkr) * 100;
  return null;
}

function Summary({
  booking,
  tutor,
  config,
}: {
  booking: Booking;
  tutor?: PublicProfile;
  config?: PaymentsConfig;
}) {
  const lkr = amountFor(booking, config);
  return (
    <Card className="h-fit p-6">
      <div className="flex items-center gap-3">
        <Avatar name={tutor?.name ?? "Tutor"} avatarId={tutor?.avatarId} photoUrl={photoUrlFor(tutor)} />
        <div className="min-w-0">
          <p className="font-medium text-ink-800">{tutor?.name ?? "Your tutor"}</p>
          <p className="text-xs text-ink-400">
            {booking.durationMins} minutes · {booking.language === "tamil" ? "Tamil" : "Sinhala"}
          </p>
        </div>
      </div>
      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-500">When</dt>
          <dd className="text-right text-ink-800">
            {formatLongDate(booking.startsAt)}, {formatTime(booking.startsAt)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-500">Focus</dt>
          <dd className="text-right text-ink-800">{booking.focus}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-ink-900/10 pt-2 font-medium">
          <dt className="text-ink-700">Total</dt>
          <dd className="text-right text-ink-900">
            {booking.creditId ? "Free lesson" : lkr !== null ? rupees(lkr) : money(booking.priceUsd)}
            {lkr !== null && !booking.creditId ? (
              <span className="block text-xs font-normal text-ink-400">
                ≈ {money(booking.priceUsd)}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
      {booking.payment?.card ? (
        <p className="mt-4 text-xs text-ink-400">Paid with {booking.payment.card}</p>
      ) : null}
    </Card>
  );
}

function PayPanel({ booking, config }: { booking: Booking; config?: PaymentsConfig }) {
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demoPay = useAction(() => api.bookings.pay(booking.id));
  const cancel = useAction(() => api.bookings.cancel(booking.id));
  const { confirm, dialog } = useConfirm();
  const lkr = amountFor(booking, config);
  const credits = useQuery(() => api.requests.credits(booking.studentId), [booking.studentId]);
  const bookWithCredit = useAction(() => api.bookings.useCredit(booking.id));
  const freeLessons = credits.data?.available ?? 0;

  return (
    <Card className="p-6">
      {freeLessons > 0 ? (
        <div className="mb-5 rounded-lg border border-fern/25 bg-mist/60 p-4">
          <p className="text-sm text-ink-700">
            You have {freeLessons} free lesson{freeLessons === 1 ? "" : "s"}. Use one for this
            booking and there is nothing to pay.
          </p>
          {bookWithCredit.error ? <Alert className="mt-3">{bookWithCredit.error}</Alert> : null}
          <Button
            variant="forest"
            className="mt-3 w-full"
            disabled={bookWithCredit.pending || redirecting}
            onClick={() => void bookWithCredit.run()}
          >
            {bookWithCredit.pending ? "Booking…" : "Book with a free lesson"}
          </Button>
        </div>
      ) : null}
      {config?.enabled ? (
        <>
          <p className="text-sm leading-relaxed text-ink-600">
            You will be taken to our payment partner, Payments.lk, to pay by card. We never see
            your card number. Card payments are taken in Sri Lankan rupees; your bank converts
            from your own currency.
          </p>
          {config.mode === "test" ? (
            <Alert tone="saffron" className="mt-4">
              Sandbox mode: use a test card from the Payments.lk sandbox. Nothing real is
              charged.
            </Alert>
          ) : null}
          {error ? <Alert className="mt-4">{error}</Alert> : null}
          <Button
            className="mt-5 w-full"
            disabled={redirecting}
            onClick={async () => {
              setError(null);
              setRedirecting(true);
              try {
                const { url } = await api.bookings.startCheckout(booking.id);
                window.location.assign(url);
              } catch (failure) {
                setError(errorMessage(failure));
                setRedirecting(false);
              }
            }}
          >
            {redirecting ? "Opening secure checkout…" : `Pay ${lkr !== null ? rupees(lkr) : ""} by card`}
          </Button>
        </>
      ) : (
        <>
          <Alert tone="saffron">
            Card payments are not switched on yet, so this is a demo checkout. No card details
            are collected and nothing is charged.
          </Alert>
          {demoPay.error ? <Alert className="mt-4">{demoPay.error}</Alert> : null}
          <Button
            className="mt-5 w-full"
            disabled={demoPay.pending}
            onClick={() => void demoPay.run()}
          >
            {demoPay.pending ? "Processing…" : `Pay ${money(booking.priceUsd)} (demo)`}
          </Button>
        </>
      )}

      <Button
        variant="danger-ghost"
        size="sm"
        className="mt-3 w-full"
        disabled={cancel.pending || redirecting}
        onClick={async () => {
          const yes = await confirm({
            title: "Cancel this booking?",
            message: "The hour is released for other students. Nothing has been charged.",
            confirmLabel: "Cancel booking",
          });
          if (yes) void cancel.run();
        }}
      >
        Cancel and release the slot
      </Button>
      {dialog}
    </Card>
  );
}

function Confirmed({ booking }: { booking: Booking }) {
  return (
    <Card className="p-6">
      <Alert tone="jade">
        Booked for {formatLongDate(booking.startsAt)} at {formatTime(booking.startsAt)}. A receipt
        is on its way by email.
      </Alert>
      <div className="mt-5 flex flex-wrap gap-3">
        {booking.meetingUrl ? (
          <a
            href={booking.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-full bg-saffron-500 px-6 text-[0.95rem] font-medium text-white hover:bg-saffron-600"
          >
            Open the meeting link
          </a>
        ) : null}
        <ButtonLink href="/portal/calendar" variant="secondary">
          Back to the calendar
        </ButtonLink>
      </div>
      {!booking.meetingUrl ? (
        <p className="mt-4 text-sm text-ink-500">
          Your tutor will add the meeting link to this booking before the lesson — you will get
          an email when it is there.
        </p>
      ) : null}
    </Card>
  );
}
