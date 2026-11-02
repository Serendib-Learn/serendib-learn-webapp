import { Router } from "express";
import { z } from "zod";
import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { notifyAdmins } from "../lib/accounts.ts";
import { logAudit } from "../lib/audit.ts";
import { notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { newId, normaliseEmail, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { helpQuestionLimiter } from "../lib/rate-limit.ts";
import { requireAdmin, requireUser } from "../lib/sessions.ts";
import { requireTurnstile } from "../lib/turnstile.ts";
import { parseBody } from "../lib/validate.ts";
import type { HelpKind, HelpQuestion } from "../../../shared/types.ts";

/**
 * The help widget's "Ask us": a question the guided topics did not answer,
 * from anyone, signed in or not. Admins read them in Admin → Questions and
 * reply; the reply is emailed to the address the person gave.
 */
export const helpRouter = Router();

const questionSchema = z
  .object({
    kind: z.enum(["question", "feedback", "intro_call"]).default("question"),
    name: z
      .string({ error: "We need your name." })
      .trim()
      .min(1, "We need your name.")
      .max(100, "Keep your name under 100 characters."),
    email: z
      .string({ error: "We need an email address to reply to." })
      .trim()
      .pipe(z.email({ error: "That email address doesn't look right." })),
    question: z.string().trim().max(3000, "Keep it under 3000 characters.").default(""),
    phone: z.string().trim().max(40, "That number looks too long.").optional(),
    goodTimes: z.string().trim().max(300, "Keep the times under 300 characters.").optional(),
    page: z.string().max(200).optional(),
    turnstileToken: z.string().optional(),
  })
  // A question or feedback needs a few words; an intro call needs a way to arrange it.
  .superRefine((input, context) => {
    if (input.kind !== "intro_call" && input.question.length < 10) {
      context.addIssue({
        code: "custom",
        path: ["question"],
        message: "Tell us a little more, at least 10 characters.",
      });
    }
    if (input.kind === "intro_call" && !input.phone) {
      context.addIssue({ code: "custom", path: ["phone"], message: "Add a WhatsApp or phone number so we can arrange the call." });
    }
  });

/** How each kind reads in emails. */
const kindWords: Record<HelpKind, { ack: string; ackBody: string; admin: string; reply: string }> = {
  question: {
    ack: "We've got your question",
    ackBody: "Someone from the team will reply to this address, usually within a day.",
    admin: "Help question",
    reply: "Re: your question to Serendib Learn",
  },
  feedback: {
    ack: "Thanks for your feedback",
    ackBody: "Someone from the team reads every message, and will reply here if there is anything to follow up.",
    admin: "Feedback",
    reply: "Re: your feedback to Serendib Learn",
  },
  intro_call: {
    ack: "We've got your intro call request",
    ackBody: "Someone from the team will be in touch on WhatsApp or by email, usually within a day, to set a time. The call is free and there is nothing to pay.",
    admin: "Intro call request",
    reply: "Your free intro call with Serendib Learn",
  },
};

const replySchema = z.object({
  body: z
    .string({ error: "Write a reply." })
    .trim()
    .min(1, "Write a reply.")
    .max(5000, "Keep the reply under 5000 characters."),
});

helpRouter.post(
  "/questions",
  helpQuestionLimiter,
  wrap(async (request, response) => {
    const input = parseBody(questionSchema, request.body ?? {});
    // A session already shows there's a person here; visitors pass the CAPTCHA (when it's on).
    if (!request.user) await requireTurnstile(input.turnstileToken, request.ip);

    const question: HelpQuestion = {
      id: newId("hq"),
      kind: input.kind,
      name: input.name,
      email: normaliseEmail(input.email),
      question: input.question,
      phone: input.phone || undefined,
      goodTimes: input.goodTimes || undefined,
      page: input.page?.startsWith("/") ? input.page : undefined,
      userId: request.user?.id,
      status: "open",
      replies: [],
      createdAt: nowIso(),
    };
    const created = await db().helpQuestions.insertOne(question);

    const words = kindWords[input.kind];
    const details = [
      created.phone ? `WhatsApp / phone: ${created.phone}` : "",
      created.goodTimes ? `Good times: ${created.goodTimes}` : "",
      created.question,
    ]
      .filter(Boolean)
      .join("\n");
    await deliver({
      to: created.email,
      subject: words.ack,
      body: `Thanks ${created.name}. ${words.ackBody}${details ? `\n\nYou sent:\n${details}` : ""}`,
      kind: "notification",
    });
    await notifyAdmins(
      `${words.admin} from ${created.name}`,
      `${created.name} (${created.email})${created.page ? `, on ${created.page}` : ""}:\n\n${details}\n\nReply: ${config.appUrl}/portal/admin?tab=questions`,
    );

    response.status(201).json(created);
  }),
);

helpRouter.get(
  "/questions",
  requireAdmin,
  wrap(async (_request, response) => {
    response.json(
      await db().helpQuestions.find(
        {},
        { sort: (a, b) => b.createdAt.localeCompare(a.createdAt), limit: 300 },
      ),
    );
  }),
);

helpRouter.post(
  "/questions/:id/reply",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const { body } = parseBody(replySchema, request.body ?? {});
    const question = await db().helpQuestions.findById(pathParam(request, "id"));
    if (!question) throw notFound("No such question.");

    const updated = await db().helpQuestions.updateOne(
      { id: question.id },
      {
        status: "answered",
        replies: [...question.replies, { body, byId: actor.id, byName: actor.name, sentAt: nowIso() }],
      },
    );

    await deliver({
      to: question.email,
      subject: kindWords[question.kind ?? "question"].reply,
      body: `Hi ${question.name},\n\n${body}\n\nThanks,\n${actor.name}${question.question ? `\n\nYou wrote:\n${question.question}` : ""}`,
      kind: "notification",
    });
    await logAudit(actor, "help_replied", question.name, question.email);
    response.json(updated);
  }),
);

/** Marks a question dealt with without replying (sorted by phone, say). */
helpRouter.post(
  "/questions/:id/close",
  requireAdmin,
  wrap(async (request, response) => {
    const updated = await db().helpQuestions.updateOne(
      { id: pathParam(request, "id") },
      { status: "answered" },
    );
    if (!updated) throw notFound("No such question.");
    response.json(updated);
  }),
);

/** Spam, mostly. */
helpRouter.delete(
  "/questions/:id",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const question = await db().helpQuestions.findById(pathParam(request, "id"));
    if (!question) throw notFound("No such question.");
    await db().helpQuestions.deleteOne({ id: question.id });
    await logAudit(actor, "help_deleted", question.name, question.email);
    response.status(204).end();
  }),
);
