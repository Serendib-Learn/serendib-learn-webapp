import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMimeMessage, renderEmail } from "./email-template.ts";

test("a code email shows the code large, in its own box, and previews it", () => {
  const { html, text } = renderEmail({
    kind: "verification",
    code: "500215",
    subject: "Confirm your email — your code is 500215",
    body: "Welcome.\n\nEnter this code:\n\n500215\n\nIgnore this if it wasn't you.",
  });
  assert.match(html, /Your code<\/div>/);
  assert.match(html, /font-size:40px[^>]*>500215</);
  // The heading drops the code from the subject; the inbox preview carries it.
  assert.match(html, /<h1[^>]*>Confirm your email<\/h1>/);
  assert.match(html, /display:none[^>]*>Your code is 500215</);
  assert.match(text, /^Welcome\./);
  assert.match(text, /500215/);
});

test("links become buttons with sensible names", () => {
  const { html } = renderEmail({
    kind: "notification",
    subject: "Lesson moved",
    body: [
      "Join on Google Meet: https://meet.google.com/abc-defg-hij",
      "Your calendar: https://example.com/portal/calendar",
      "Nothing changes about the price or the meeting link: https://meet.google.com/abc-defg-hij",
      "https://example.com/portal/reset-password?token=t",
    ].join("\n\n"),
  });
  assert.match(html, />Join on Google Meet<\/a>/);
  assert.match(html, />Open your calendar<\/a>/);
  assert.match(html, />Nothing changes about the price or the meeting link\.<\/p>/);
  assert.match(html, />Choose your password<\/a>/);
  assert.doesNotMatch(html, />Your calendar<\/a>/);
});

test("short multi-line blocks become a details panel; everything is escaped", () => {
  const { html } = renderEmail({
    kind: "receipt",
    subject: "Receipt <b>",
    body: "Payment received.\n\nTue 27 Oct, 9:00\n60 minutes with <script>alert(1)</script>",
  });
  assert.match(html, /border-left:3px solid #C9873A/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<h1[^>]*>Receipt &lt;b&gt;<\/h1>/);
});

test("the Gmail message carries a text and an HTML part, both readable", () => {
  const raw = buildMimeMessage({
    to: "learner@yahoo.com",
    subject: "Hello",
    encodedSubject: "Hello",
    text: "Plain — with a dash",
    html: "<p>Branded — with a dash</p>",
  });
  assert.match(raw, /^To: learner@yahoo\.com\r\n/);
  assert.match(raw, /Content-Type: multipart\/alternative; boundary="(serendib-[^"]+)"/);
  const parts = raw.split(/--serendib-[^\r\n-]+/).filter((part) => part.includes("Content-Type: text/"));
  assert.equal(parts.length, 2);
  const decode = (part: string) => Buffer.from(part.split("\r\n\r\n")[1].replace(/\r\n/g, ""), "base64").toString("utf8");
  assert.equal(decode(parts[0]), "Plain — with a dash");
  assert.equal(decode(parts[1]), "<p>Branded — with a dash</p>");
});
