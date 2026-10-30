import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import { wallClock, weekdayOf } from "../lib/time.ts";
import type { Slot } from "../../../shared/types.ts";

/**
 * A tutor's published hours are wall-clock times where the tutor is. On
 * Cloud Run the server runs in UTC, so "Monday 18:00" must not come out as
 * 18:00 UTC (23:30 in Sri Lanka). Run with TZ=UTC to see it as production does.
 */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

async function mondayEvenings(email: string, timezone: string) {
  const tutor = await signedUpUser(harness, "tutor", email);
  const updated = await tutor.client.patch(`/users/${tutor.user.id}`, { timezone });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  const rule = await tutor.client.post("/availability", { weekday: 1, start: "18:00", end: "21:00" });
  assert.equal(rule.status, 201, JSON.stringify(rule.body));
  const { body } = await harness.client().get(`/availability/slots?tutorId=${tutor.user.id}&days=15`);
  return body as Slot[];
}

for (const timezone of ["Asia/Colombo", "Europe/London", "America/Toronto"]) {
  test(`open hours: Monday 18:00–21:00 for a tutor in ${timezone} is 6, 7 and 8 pm there`, async () => {
    const slots = await mondayEvenings(`hours-${timezone.replace("/", "-").toLowerCase()}@example.com`, timezone);
    assert.ok(slots.length >= 3, "at least one whole Monday evening in the next two weeks");

    for (const slot of slots) {
      const clock = wallClock(new Date(slot.startsAt), timezone);
      assert.equal(weekdayOf(clock.year, clock.month, clock.day), 1, `${slot.startsAt} is a Monday in ${timezone}`);
      assert.ok([18, 19, 20].includes(clock.hour) && clock.minute === 0, `${slot.startsAt} starts on the hour, 18–20, in ${timezone}`);
    }
  });
}
