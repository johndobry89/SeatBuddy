import { describe, expect, it } from 'vitest';
import { Coordinator } from '../../src/background/coordinator';
import {
  emptyManual,
  applyManual,
  preflightIssue,
} from '../../src/core/manual-assistant';
import { routeMessage } from '../../src/background/message-router';
import { nextMovieNightStep } from '../../src/core/movie-night';
import { diagnosticText, selfCheck } from '../../src/privacy/diagnostics';
import {
  savedDraftSchema,
  savedRosterSchema,
} from '../../src/core/retained-data';
import { panelCommandSchema } from '../../src/privacy/protocol';
import { pairScreening } from '../../src/fixtures/seat-map-data';
const now = 100_000;
function prepared() {
  const c = new Coordinator();
  c.manualCommand(
    { type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false },
    now,
    [],
    false,
  );
  c.manualCommand(
    {
      type: 'PLAN',
      plan: { ...pairScreening },
      initialSeats: {
        A: { row: 'F', number: '10' },
        B: { row: 'F', number: '11' },
      },
    },
    now,
    [],
    false,
  );
  return c;
}
describe('BR-006/009/011/012 manual policy benefit remains self-report only', () => {
  it('keeps category optional in solo and treats omitted category as UNKNOWN without claiming zero fee', () => {
    const state = emptyManual();
    expect(
      applyManual(
        state,
        {
          type: 'PLAN',
          plan: { ...pairScreening },
          initialSeats: { A: { row: 'F', number: '10' } },
        },
        now,
      ),
    ).toBeNull();
    expect(state.tracks.A.category).toBe('UNKNOWN');
    expect(preflightIssue(state)).toBeNull();
  });
  it('blocks a known Ultra Lux review and acknowledgement at the authoritative core, even with a forged local review', () => {
    const c = prepared();
    c.manualCommand(
      {
        type: 'MANUAL_DETAILS',
        role: 'B',
        showtime: { ...pairScreening },
        seat: { row: 'F', number: '11' },
        category: 'ULTRA_LUX',
      },
      now,
      [],
      false,
    );
    expect(preflightIssue(c.manual)).toContain('Ultra Lux');
    expect(nextMovieNightStep(c.manual).code).toBe('ULTRA_LUX_EXCLUDED');
    expect(
      c.manualCommand({ type: 'REVIEW_PLAN' }, now, [], false),
    ).not.toBeNull();
    c.manual.review = { at: now };
    expect(
      c.manualCommand(
        { type: 'ACKNOWLEDGE', role: 'B', step: 'ACCOUNT' },
        now,
        [],
        false,
      ),
    ).toContain('Ultra Lux');
  });
  it('changing only B category clears B/review but preserves A checks, and B reset clears the category', () => {
    const c = prepared();
    c.manualCommand({ type: 'REVIEW_PLAN' }, now, [], false);
    c.manualCommand(
      { type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' },
      now,
      [],
      false,
    );
    const A = structuredClone(c.manual.tracks.A);
    expect(
      c.manualCommand(
        {
          type: 'MANUAL_DETAILS',
          role: 'B',
          showtime: { ...pairScreening },
          seat: { row: 'F', number: '11' },
          category: 'SAVER_LUX',
        },
        now,
        [],
        false,
      ),
    ).toBeNull();
    expect(c.manual.review).toBeNull();
    expect(c.manual.tracks.A).toEqual(A);
    expect(c.manual.tracks.B.category).toBe('SAVER_LUX');
    c.manualCommand({ type: 'RESET_TRACK', role: 'B' }, now, [], false);
    expect(c.manual.tracks.B.category).toBe('UNKNOWN');
    expect(c.manual.tracks.A).toEqual(A);
  });
  it('retains no category after worker/reset/new film or B buddy replacement, preserving independent A', () => {
    const c = prepared();
    c.manualCommand(
      {
        type: 'MANUAL_DETAILS',
        role: 'A',
        showtime: { ...pairScreening },
        seat: { row: 'F', number: '10' },
        category: 'LUX',
      },
      now,
      [],
      false,
    );
    c.manualCommand(
      {
        type: 'MANUAL_DETAILS',
        role: 'B',
        showtime: { ...pairScreening },
        seat: { row: 'F', number: '11' },
        category: 'SAVER_LUX',
      },
      now,
      [],
      false,
    );
    c.buddyCommand({
      type: 'BUDDY_MUTATE',
      generation: c.generation,
      revision: c.buddy.revision,
      resetB: true,
      action: { kind: 'DEMO' },
    });
    const buddy = c.buddy.roster[0]!;
    c.buddyCommand({
      type: 'BUDDY_MUTATE',
      generation: c.generation,
      revision: c.buddy.revision,
      resetB: true,
      action: { kind: 'SELECT', id: buddy.id },
    });
    expect(c.manual.tracks.B.category).toBe('UNKNOWN');
    expect(c.manual.tracks.A.category).toBe('LUX');
    expect(new Coordinator().manual.tracks.A.category).toBe('UNKNOWN');
    c.manualCommand(
      {
        type: 'PLAN',
        plan: { ...pairScreening, movie: 'Fictieve volgende film' },
      },
      now,
      [],
      false,
    );
    expect(c.manual.tracks.A.category).toBe('UNKNOWN');
    c.reset();
    expect(c.manual.tracks.A.category).toBe('UNKNOWN');
  });
  it('reuses generation/revision/B-epoch guards for category details; no mutation retry or external evidence', () => {
    const c = prepared(),
      sender = {
        id: 'fictional',
        url: 'chrome-extension://fictional/sidepanel.html',
        frameId: 0,
      };
    const command = {
      type: 'WORKFLOW',
      generation: c.generation,
      revision: c.manual.revision,
      buddyEpoch: c.buddyEpoch,
      command: {
        type: 'MANUAL_DETAILS',
        role: 'B',
        showtime: { ...pairScreening },
        seat: { row: 'F', number: '11' },
        category: 'LUX',
      },
    };
    expect(routeMessage(c, command, sender, 'fictional', false, now).ok).toBe(
      true,
    );
    expect(routeMessage(c, command, sender, 'fictional', false, now).ok).toBe(
      false,
    );
    expect(c.snapshot(now, false).evidence.B).toEqual({
      manual: 'MANUAL_SELF_REPORT',
      context: 'UNKNOWN',
      simulation: 'UNKNOWN',
    });
  });
  it('BR-012 schema and clipboard allowlists reject category, price, pass and payment persistence/leaks', () => {
    const c = prepared();
    c.manualCommand(
      {
        type: 'MANUAL_DETAILS',
        role: 'B',
        showtime: { ...pairScreening },
        seat: { row: 'F', number: '11' },
        category: 'SUPER_SAVER_LUX',
      },
      now,
      [],
      false,
    );
    const text = diagnosticText(selfCheck(c.snapshot(now, false), false));
    expect(text).not.toContain('SUPER_SAVER_LUX');
    expect(
      savedDraftSchema.safeParse({
        version: 1,
        createdAt: now,
        plan: { ...pairScreening, category: 'LUX' },
      }).success,
    ).toBe(false);
    expect(
      savedRosterSchema.safeParse({ version: 1, roster: [], category: 'LUX' })
        .success,
    ).toBe(false);
    for (const extra of [
      { additionalDue: 0 },
      { passNumber: 'fictional' },
      { payment: 'fictional' },
    ])
      expect(
        panelCommandSchema.safeParse({
          type: 'MANUAL_DETAILS',
          role: 'A',
          showtime: { ...pairScreening },
          seat: { row: 'F', number: '10' },
          category: 'LUX',
          ...extra,
        }).success,
      ).toBe(false);
  });
});
