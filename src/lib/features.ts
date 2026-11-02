/**
 * Switches for parts of the site that exist in the code but are not live yet.
 *
 * Games: every page under `src/app/(public)/games/` and every component under
 * `src/components/games/` is still here and still builds. While this is false,
 * `src/app/(public)/games/layout.tsx` turns all of those routes into a 404 and
 * the links to them are commented out — search the codebase for `GAMES-HIDDEN`
 * to find each one. To bring the games back: set this to true and uncomment
 * every `GAMES-HIDDEN` block.
 */
export const features = {
  games: false,
  /**
   * Messages: the portal's direct messages between students, tutors and
   * practice partners. Off because lessons are arranged on WhatsApp. The
   * page, its API and its data are intact; search `MESSAGES-HIDDEN` for each
   * place it is switched off.
   */
  messages: false,
  /**
   * After-lesson feedback: the "How was your lesson?" banner for students and
   * the write-up prompt for tutors (with their reminder emails, switched off
   * on the API in lib/reminders.ts). Off: the owners decided against asking
   * after every lesson. Students and tutors can send feedback any time from
   * the calendar instead. Search `FEEDBACK-HIDDEN`.
   */
  lessonFeedback: false,
} as const;
