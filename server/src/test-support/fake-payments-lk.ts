import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * A stand-in for api.payments.lk, just enough for the booking flow: create a
 * checkout, read it back, and — from the test — pay it or let it expire. The
 * real SDK talks to it through PAYMENTS_LK_API_BASE (http is allowed on
 * localhost), so the code under test is the code that ships.
 */

interface FakeCheckout {
  object: "checkout";
  id: string;
  mode: "test";
  status: "open" | "completed" | "expired";
  url: string;
  expiresAt: string;
  payment: Record<string, unknown> & { id: string; status: string; amountCents: number };
}

export const WEBHOOK_SECRET = "whsec_test_fake";

export async function startFakePaymentsLk() {
  const checkouts = new Map<string, FakeCheckout>();
  const requests: { method: string; path: string; body: unknown; idempotencyKey?: string }[] = [];

  const server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      const body = raw ? JSON.parse(raw) : undefined;
      const path = request.url ?? "";
      requests.push({
        method: request.method ?? "",
        path,
        body,
        idempotencyKey: request.headers["idempotency-key"] as string | undefined,
      });
      response.setHeader("content-type", "application/json");

      if (request.headers.authorization !== "Bearer sk_test_fake") {
        response.statusCode = 401;
        response.end(JSON.stringify({ code: "unauthorized", message: "Bad key", docUrl: "", traceId: "t" }));
        return;
      }

      if (request.method === "POST" && path === "/v1/checkouts") {
        const id = `chk_${randomBytes(12).toString("hex")}`;
        const checkout: FakeCheckout = {
          object: "checkout",
          id,
          mode: "test",
          status: "open",
          url: `https://payments.lk/checkout/${id}`,
          expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          payment: {
            object: "payment",
            id: `pay_${randomBytes(12).toString("hex")}`,
            mode: "test",
            status: "requires_payment_method",
            amountCents: body.amountCents,
            currency: "LKR",
            description: body.description,
            reference: body.reference ?? null,
            customer: body.customer ?? null,
            card: null,
            failureMessage: null,
            checkoutId: id,
          },
        };
        checkouts.set(id, checkout);
        response.statusCode = 201;
        response.end(JSON.stringify(checkout));
        return;
      }

      const match = path.match(/^\/v1\/checkouts\/([^/?]+)$/);
      if (request.method === "GET" && match && checkouts.has(match[1])) {
        response.end(JSON.stringify(checkouts.get(match[1])));
        return;
      }

      response.statusCode = 404;
      response.end(JSON.stringify({ code: "not_found", message: "No such thing", docUrl: "", traceId: "t" }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  /** The customer pays on the hosted page. Returns the payment.succeeded event body. */
  function pay(checkoutId: string, amountCents?: number) {
    const checkout = checkouts.get(checkoutId);
    if (!checkout) throw new Error(`no checkout ${checkoutId}`);
    checkout.status = "completed";
    checkout.payment = {
      ...checkout.payment,
      status: "succeeded",
      amountCents: amountCents ?? checkout.payment.amountCents,
      card: { scheme: "VISA", last4: "4242" },
    };
    return {
      id: `evt_${randomBytes(12).toString("hex")}`,
      object: "event",
      type: "payment.succeeded",
      mode: "test",
      created: new Date().toISOString(),
      data: checkout.payment,
    };
  }

  /** The checkout runs out of time. Returns the checkout.expired event body. */
  function expire(checkoutId: string) {
    const checkout = checkouts.get(checkoutId);
    if (!checkout) throw new Error(`no checkout ${checkoutId}`);
    checkout.status = "expired";
    checkout.payment.status = "canceled";
    return {
      id: `evt_${randomBytes(12).toString("hex")}`,
      object: "event",
      type: "checkout.expired",
      mode: "test",
      created: new Date().toISOString(),
      data: { object: "checkout", id: checkoutId, paymentId: checkout.payment.id },
    };
  }

  /** Signs a body the way Payments.lk does: t=<seconds>,v1=<HMAC-SHA256 of "t.body">. */
  function sign(body: string, secret = WEBHOOK_SECRET, at = Math.floor(Date.now() / 1000)) {
    const v1 = createHmac("sha256", secret).update(`${at}.${body}`).digest("hex");
    return `t=${at},v1=${v1}`;
  }

  return {
    apiBase: `http://localhost:${port}`,
    checkouts,
    requests,
    pay,
    expire,
    sign,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
