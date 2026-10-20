import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFictionalFixture } from '../../src/content/fixture-observer';
import { fictionalObservation } from '../../src/fixtures/data';
const now = 100_000;
function document(html: string) {
  return new JSDOM(html).window.document;
}
function fixture(value: unknown) {
  return `<script type="application/json" data-seatmates-fixture="v1">${JSON.stringify(value)}</script>`;
}
describe('fixture observer fails closed', () => {
  it('reads only the explicit fictional schema, regardless of misleading heading', () => {
    const doc = document(
      '<h1>CONFIRMED! Payment successful!</h1>' +
        fixture(fictionalObservation('A', now)),
    );
    expect(readFictionalFixture(doc, now)?.status).toBe('SELECTED');
  });
  it.each([
    '<h1>CONFIRMED</h1>',
    '<canvas>F10 F11</canvas>',
    '<script data-seatmates-fixture="v1">{broken</script>',
  ])('rejects absent or broken schema', (html) =>
    expect(readFictionalFixture(document(html), now)).toBeNull(),
  );
  it('rejects ambiguous duplicate records, forbidden fields and fake confirmation', () => {
    const valid = fixture(fictionalObservation('A', now));
    expect(readFictionalFixture(document(valid + valid), now)).toBeNull();
    expect(
      readFictionalFixture(
        document(
          fixture({ ...fictionalObservation('A', now), status: 'CONFIRMED' }),
        ),
        now,
      ),
    ).toBeNull();
    expect(
      readFictionalFixture(
        document(
          fixture({ ...fictionalObservation('A', now), password: 'fictional' }),
        ),
        now,
      ),
    ).toBeNull();
  });
});
