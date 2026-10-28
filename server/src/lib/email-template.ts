import { config } from "../config.ts";
import type { MailKind } from "../../../shared/types.ts";

/**
 * Turns one of the API's plain-text emails into a branded HTML email — the
 * website's palette, Georgia headings, a forest header with the flower mark
 * — and keeps the plain text alongside it for mail apps that want it.
 *
 * Every email is still *written* as plain text (lib/mail.ts's `deliver`), so
 * the demo inbox, the tests and the text part all read the same. The layout
 * comes from a few conventions in that text:
 *
 *   - paragraphs are separated by a blank line;
 *   - a paragraph that is just the message's `code` becomes the big code box;
 *   - "Label: https://…" on its own becomes a button labelled "Label";
 *   - a link on its own becomes a button named after where it goes;
 *   - a paragraph of several short lines (when, how long, focus) becomes a
 *     details panel; any other link is an inline link.
 *
 * Built with tables and inline styles, which is what Gmail, Outlook and
 * Apple Mail all render the same way.
 */

const colour = {
  forest: "#1B4332",
  fern: "#2D6A4F",
  sage: "#95C4AA",
  amber: "#C9873A",
  cream: "#F7F3ED",
  earth: "#2C2416",
  mist: "#EBF4EF",
  muted: "#776A4D",
  line: "#E6DED0",
};

const serif = "Georgia, 'Times New Roman', serif";
const sans = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export interface RenderableEmail {
  subject: string;
  body: string;
  kind: MailKind;
  code?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const URL_PATTERN = /https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?]/g;

/** Escapes text and turns any links in it into (escaped) anchors. */
function linkify(text: string): string {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    out += escapeHtml(text.slice(last, match.index));
    const url = escapeHtml(match[0]);
    // A friendly name where we know the place; the address itself otherwise.
    const known = labelFor(match[0]);
    const shown = known === "Open the link" ? url : escapeHtml(known.charAt(0).toLowerCase() + known.slice(1));
    out += `<a href="${url}" style="color:${colour.fern};text-decoration:underline;word-break:break-word;">${shown}</a>`;
    last = (match.index ?? 0) + match[0].length;
  }
  return out + escapeHtml(text.slice(last));
}

/** A friendly button name for a bare link, from where it goes. */
function labelFor(url: string): string {
  if (/meet\.google\.com/.test(url)) return "Join on Google Meet";
  if (/reset-password/.test(url)) return "Choose your password";
  if (/\/portal\/login/.test(url)) return "Log in";
  if (/\/portal\/calendar/.test(url)) return "Open your calendar";
  if (/\/portal\/checkout/.test(url)) return "Finish your booking";
  if (/\/portal\/admin/.test(url)) return "Open the admin area";
  if (/\/portal\/learning-hub/.test(url)) return "Open your learning hub";
  if (/\/portal/.test(url)) return "Open the portal";
  return "Open the link";
}

function button(label: string, url: string): string {
  const safeUrl = escapeHtml(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;">
  <tr><td style="border-radius:6px;background:${colour.amber};">
    <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${sans};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

function codeBox(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 24px;">
  <tr><td align="center" style="background:${colour.mist};border:1px solid ${colour.sage};border-radius:10px;padding:22px 12px;">
    <div style="font-family:${sans};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${colour.fern};margin-bottom:8px;">Your code</div>
    <div style="font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:40px;line-height:1.1;font-weight:700;letter-spacing:10px;color:${colour.forest};">${escapeHtml(code)}</div>
  </td></tr>
</table>`;
}

function detailsPanel(lines: string[]): string {
  const rows = lines.map((line) => `<div style="margin:3px 0;">${linkify(line)}</div>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
  <tr><td style="background:${colour.cream};border-left:3px solid ${colour.amber};border-radius:6px;padding:14px 16px;font-family:${sans};font-size:15px;line-height:1.55;color:${colour.earth};">${rows}</td></tr>
</table>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-family:${sans};font-size:16px;line-height:1.65;color:${colour.earth};">${linkify(text).replace(/\n/g, "<br>")}</p>`;
}

/** The heading: the subject, without a code repeated at the end of it. */
function headingFor(message: RenderableEmail): string {
  return message.subject.replace(/\s*—\s*your code is\s*\S+$/i, "").trim();
}

function blockFor(block: string, message: RenderableEmail): string {
  const text = block.trim();
  if (message.code && text === message.code) return codeBox(message.code);

  // "Join on Google Meet: https://…" — a short action phrase names its button;
  // "Your calendar: https://…" gets a clearer name; a whole sentence falls
  // through to "sentence, then button" below.
  const labelled = text.match(/^([^\n:]{2,60}):\s+(https?:\/\/\S+)$/);
  if (labelled && labelled[1].trim().split(/\s+/).length <= 5) {
    const label = labelled[1].trim();
    const isAction = /^(join|open|approve|review|choose|pay|book|log|see|view|confirm|set|reset|start|finish|reply)\b/i.test(label);
    return button(isAction ? label : labelFor(labelled[2]), labelled[2]);
  }
  if (/^https?:\/\/\S+$/.test(text)) return button(labelFor(text), text);

  // A sentence that ends by pointing at a link: the sentence, then a button.
  const trailing = text.match(/^([^\n]+?):?\s+(https?:\/\/\S+)$/);
  if (trailing && !trailing[1].match(URL_PATTERN)) {
    const lead = trailing[1].replace(/[\s:—-]+$/, "");
    return paragraph(`${lead}.`.replace(/([.!?])\.$/, "$1")) + button(labelFor(trailing[2]), trailing[2]);
  }

  const lines = text.split("\n");
  if (lines.length >= 2 && lines.every((line) => line.length <= 90)) return detailsPanel(lines);
  return paragraph(text);
}

/** A preview line for the inbox list: the code, or the first sentence. */
function preheaderFor(message: RenderableEmail, blocks: string[]): string {
  if (message.code) return `Your code is ${message.code}`;
  const first = blocks.find((block) => !/^https?:\/\//.test(block.trim())) ?? "";
  return first.replace(/\s+/g, " ").slice(0, 140);
}

export function renderEmail(message: RenderableEmail): { html: string; text: string } {
  const blocks = message.body.split(/\n{2,}/).filter((block) => block.trim());
  const heading = headingFor(message);
  const site = config.appUrl.replace(/\/$/, "");
  const icon = `${site}/brand/email-icon.png`;
  const content = blocks.map((block) => blockFor(block, message)).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(message.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${colour.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheaderFor(message, blocks))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${colour.cream};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="background:${colour.forest};border-radius:12px 12px 0 0;padding:22px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;"><img src="${icon}" width="36" height="36" alt="" style="display:block;border-radius:8px;border:0;"></td>
          <td style="vertical-align:middle;padding-left:12px;font-family:${serif};font-size:20px;color:${colour.cream};">serendib.learn</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid ${colour.line};border-top:0;border-radius:0 0 12px 12px;padding:32px 28px 26px;">
        <h1 style="margin:0 0 20px;font-family:${serif};font-size:25px;line-height:1.3;font-weight:400;color:${colour.forest};">${escapeHtml(heading)}</h1>
        ${content}
        <p style="margin:26px 0 0;font-family:${sans};font-size:15px;line-height:1.6;color:${colour.earth};">With warmth,<br><span style="font-family:${serif};color:${colour.forest};">The Serendib Learn team</span></p>
      </td></tr>
      <tr><td align="center" style="padding:22px 16px 8px;font-family:${sans};font-size:12px;line-height:1.7;color:${colour.muted};">
        <span style="font-family:${serif};font-style:italic;color:${colour.fern};">Keeping languages alive.</span><br>
        Questions? Just reply, or write to <a href="mailto:serendib.learn@gmail.com" style="color:${colour.fern};">serendib.learn@gmail.com</a><br>
        <a href="${escapeHtml(site)}" style="color:${colour.muted};">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = `${message.body}\n\n— The Serendib Learn team\nQuestions? Reply, or write to serendib.learn@gmail.com\n${site}`;
  return { html, text };
}

/**
 * A complete RFC 2822 message with a plain-text and an HTML part, for the
 * Gmail API's `raw` field. Both parts are base64, so any language and any
 * line length travels safely.
 */
export function buildMimeMessage(input: { to: string; subject: string; text: string; html: string; encodedSubject: string }): string {
  const boundary = `serendib-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const part = (type: string, content: string) =>
    [
      `--${boundary}`,
      `Content-Type: ${type}; charset=utf-8`,
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(content, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n"),
    ].join("\r\n");

  return [
    `To: ${input.to}`,
    `Subject: ${input.encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    part("text/plain", input.text),
    part("text/html", input.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}
