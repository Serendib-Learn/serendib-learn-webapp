"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage, useAction, useQuery } from "@/lib/hooks";
import { formatDateTime, lkr, money } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Alert, Card, Loading, Spinner } from "@/components/ui/primitives";
import type { BundleDetail, PaymentsConfig, PublicProfile } from "@/lib/types";

/** How long to keep asking after the customer comes back from the hosted page. */
const POLL_MS = 2500;
const POLL_TRIES = 24;

export default function BundleCheckoutPage() {
  return (
    <Suspense fallback={<Loading label="Opening checkout" />}>
      <BundleCheckout />
    </Suspense>
  );
}

/**
 * Paying for a bundle: every lesson listed, one total, one card payment
 * (server/src/lib/bundles.ts). After Payments.lk sends the customer back, the
 * page asks the API to check the payment until it is confirmed.
 */
function BundleCheckout() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const returned = params.get("status") === "returned";
  const cancelledAtCheckout = params.get("status") === "cancelled";

  const { user } = useAuth();
  const detail = useQuery(() => api.bundles.get(id), [id]);
  const config = useQuery(() => api.payments.config(), []);
  const people = useQuery(() => api.users.directory(), []);

  const [polled, setPolled] = useState<BundleDetail | null>(null);
  const [pollingDone, setPollingDone] = useState(false);
  useEffect(() => {
    if (!returned) return;
    let tries = 0;
    let stopped = false;
    const check = async () => {
      if (stopped) return;
      try {
        const latest = await api.bundles.get(id);
        setPolled(latest);
        if (latest.bundle.status !== "awaiting_payment") {
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

  if (!user || detail.loading || config.loading) return <Loading label="Opening checkout" />;
  if (detail.error || !detail.data) {
    return (
      <>
        <PageHeader title="Checkout" />
        <Alert>{detail.error ?? "That bundle could not be found."}</Alert>
      </>
    );
  }

  const current = polled ?? detail.data;
  const { bundle } = current;
  const peopleById = new Map((people.data ?? []).map((person) => [person.id, person]));

  return (
    <>
      <PageHeader title={bundle.status === "confirmed" ? "You're booked" : "Checkout"}>
        {bundle.status === "confirmed"
          ? `Payment received. All ${bundle.size} lessons are in your calendar, each with its meeting link.`
          : `Your ${bundle.size} lessons, paid for together. Check them, then pay securely by card.`}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {bundle.status === "confirmed" ? (
            <Card className="space-y-3 p-6">
              <p className="text-sm text-ink-600">
                We have emailed you a receipt. You can move or cancel any lesson up to 6 hours before it starts and keep
                it.
              </p>
              <ButtonLink href="/portal/calendar">Go to my calendar</ButtonLink>
            </Card>
          ) : bundle.status === "cancelled" ? (
            <Alert>
              {bundle.cancelReason ?? "This bundle was cancelled."} Nothing was charged. Pick your lessons again from the{" "}
              <Link href="/portal/calendar" className="underline">
                calendar
              </Link>{" "}
              whenever you are ready.
            </Alert>
          ) : returned && !pollingDone ? (
            <Card className="flex items-center gap-3 p-6 text-sm text-ink-600">
              <Spinner /> Confirming your payment with the bank…
            </Card>
          ) : (
            <>
              {returned ? (
                <Alert tone="saffron">
                  We have not had confirmation of that payment yet. If you completed it, it will show here shortly and you
                  will get a receipt by email. There is no need to pay again.
                </Alert>
              ) : null}
              {cancelledAtCheckout ? (
                <Alert tone="saffron">Payment was cancelled. Your hours are held for a little while: pay below to keep them.</Alert>
              ) : null}
              <PayPanel bundleId={bundle.id} totalLkr={bundle.priceLkr} config={config.data} />
            </>
          )}
        </div>

        <Summary detail={current} people={peopleById} config={config.data} />
      </div>
    </>
  );
}

function PayPanel({ bundleId, totalLkr, config }: { bundleId: string; totalLkr: number; config?: PaymentsConfig }) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demoPay = useAction(() => api.bundles.pay(bundleId));
  const cancel = useAction(() => api.bundles.cancel(bundleId));
  const { confirm, dialog } = useConfirm();

  return (
    <Card className="p-6">
      {config?.enabled ? (
        <>
          <p className="text-sm leading-relaxed text-ink-600">
            You will be taken to our payment partner, Payments.lk, to pay by card. We never see your card number. Card
            payments are taken in Sri Lankan rupees; your bank converts from your own currency.
          </p>
          {config.mode === "test" ? (
            <Alert tone="saffron" className="mt-4">
              Sandbox mode: use a test card from the Payments.lk sandbox. Nothing real is charged.
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
                const { url } = await api.bundles.startCheckout(bundleId);
                window.location.assign(url);
              } catch (failure) {
                setError(errorMessage(failure));
                setRedirecting(false);
              }
            }}
          >
            {redirecting ? "Opening secure checkout…" : `Pay ${lkr(totalLkr)} by card`}
          </Button>
        </>
      ) : (
        <>
          <Alert tone="saffron">
            Card payments are not switched on yet, so this is a demo checkout. No card details are collected and nothing is
            charged.
          </Alert>
          {demoPay.error ? <Alert className="mt-4">{demoPay.error}</Alert> : null}
          <Button className="mt-5 w-full" disabled={demoPay.pending} onClick={() => void demoPay.run()}>
            {demoPay.pending ? "Processing…" : `Pay ${lkr(totalLkr)} (demo)`}
          </Button>
        </>
      )}

      <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-400">
        By paying you agree to our{" "}
        <Link href="/terms" className="underline hover:text-ink-600">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/refunds" className="underline hover:text-ink-600">
          Cancellation and Refund Policy
        </Link>
        : move or cancel any lesson up to 6 hours before and you keep it.
      </p>

      {cancel.error ? <Alert className="mt-3">{cancel.error}</Alert> : null}
      <Button
        variant="danger-ghost"
        size="sm"
        className="mt-3 w-full"
        disabled={cancel.pending || redirecting}
        onClick={async () => {
          const yes = await confirm({
            title: "Let these lessons go?",
            message: "Every hour in this bundle is released for other students. Nothing has been charged.",
            confirmLabel: "Release the hours",
          });
          if (yes && (await cancel.run())) router.push("/portal/calendar");
        }}
      >
        Cancel and release the hours
      </Button>
      {dialog}
    </Card>
  );
}

function Summary({
  detail,
  people,
  config,
}: {
  detail: BundleDetail;
  people: Map<string, PublicProfile>;
  config?: PaymentsConfig;
}) {
  const { bundle, bookings } = detail;
  return (
    <Card className="h-fit p-6">
      <p className="font-medium text-ink-800">{bundle.size} lessons</p>
      <ul className="mt-3 space-y-2 text-sm">
        {bookings.map((booking) => (
          <li key={booking.id} className="flex justify-between gap-3">
            <span className="text-ink-700">{formatDateTime(booking.startsAt)}</span>
            <span className="text-right text-ink-400">{people.get(booking.tutorId)?.name ?? "Tutor"}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between gap-4 border-t border-ink-900/10 pt-3 font-medium">
        <span className="text-ink-700">Total</span>
        <span className="text-right text-ink-900">
          {lkr(bundle.priceLkr)}
          {config?.usdToLkr ? (
            <span className="block text-xs font-normal text-ink-400">
              about {money(bundle.priceLkr / config.usdToLkr)}; your bank converts it
            </span>
          ) : null}
        </span>
      </div>
    </Card>
  );
}
