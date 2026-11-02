import { Router } from "express";
import { z } from "zod";
import { db } from "../db/database.ts";
import {
  bundleDetail,
  confirmBundle,
  createBundle,
  releaseBundle,
  syncBundlePayment,
} from "../lib/bundles.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { checkoutForBundle, paymentsEnabled } from "../lib/payments.ts";
import { requireAuth, requireUser } from "../lib/sessions.ts";
import { parseBody } from "../lib/validate.ts";
import type { LessonBundle, User } from "../../../shared/types.ts";

/**
 * Bundles of 5 or 10 lessons (lib/bundles.ts): booked together, paid for
 * with one checkout. The student who booked it, or an administrator.
 */
export const bundlesRouter = Router();

const bundleSchema = z.object({
  lessons: z
    .array(
      z.object({
        tutorId: z.string({ error: "Which tutor?" }).min(1),
        startsAt: z.string({ error: "Which time?" }).min(1),
        language: z.enum(["sinhala", "tamil"], { error: "Sinhala or Tamil?" }),
        focus: z.string().trim().max(200).default(""),
      }),
      { error: "Pick the lessons for your bundle." },
    )
    .max(20, "That is more lessons than a bundle holds."),
});

async function load(id: string, actor: User): Promise<LessonBundle> {
  const bundle = await db().bundles.findById(id);
  if (!bundle) throw notFound("That bundle has gone.");
  if (bundle.studentId !== actor.id && actor.role !== "admin") throw forbidden("That bundle is not yours.");
  return bundle;
}

bundlesRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const { lessons } = parseBody(bundleSchema, request.body ?? {});
    const bundle = await createBundle(actor, lessons);
    response.status(201).json(await bundleDetail(bundle));
  }),
);

/** The bundle and its lessons, brought up to date from Payments.lk first (the checkout page polls this). */
bundlesRouter.get(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    const bundle = await load(pathParam(request, "id"), requireUser(request));
    response.json(await bundleDetail(await syncBundlePayment(bundle)));
  }),
);

/** Starts (or resumes) the one card payment for the whole bundle. */
bundlesRouter.post(
  "/:id/checkout",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const bundle = await load(pathParam(request, "id"), actor);
    if (!paymentsEnabled()) throw new ApiError("Card payments are not switched on.", 409, "payments_disabled");
    if (bundle.status !== "awaiting_payment") throw new ApiError("That bundle is not waiting for payment.");

    const student = await db().users.findById(bundle.studentId);
    if (!student) throw notFound("That student's account has gone.");
    const payment = await checkoutForBundle(bundle, student);
    await db().bundles.updateOne({ id: bundle.id }, { payment });
    response.json({ url: payment.checkoutUrl });
  }),
);

/**
 * Confirms a bundle without taking a card: the demo checkout while
 * Payments.lk is off, or an administrator recording a payment taken some
 * other way.
 */
bundlesRouter.post(
  "/:id/pay",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const bundle = await load(pathParam(request, "id"), actor);
    if (paymentsEnabled() && actor.role !== "admin") {
      throw new ApiError("Pay through the card checkout.", 409, "use_checkout");
    }
    if (bundle.status === "confirmed") {
      response.json(await bundleDetail(bundle));
      return;
    }
    if (bundle.status !== "awaiting_payment") throw new ApiError("That bundle is not waiting for payment.");
    response.json(await bundleDetail(await confirmBundle(bundle)));
  }),
);

/** Lets an unpaid bundle go, freeing all its hours. Paid lessons are cancelled one by one, under the refund policy. */
bundlesRouter.post(
  "/:id/cancel",
  requireAuth,
  wrap(async (request, response) => {
    const bundle = await load(pathParam(request, "id"), requireUser(request));
    if (bundle.status === "confirmed") {
      throw new ApiError("These lessons are paid for. Cancel or move them one at a time from your calendar.");
    }
    await releaseBundle(bundle, "Cancelled before payment.");
    response.json(await bundleDetail((await db().bundles.findById(bundle.id)) ?? bundle));
  }),
);
