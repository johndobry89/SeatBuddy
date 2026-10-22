import { describe, expect, it } from 'vitest';
import {
  additionalDueSchema,
  categoryEligibility,
  categoryFromLabel,
  findSeatPairs,
  PAIR_TTL_MS,
  zeroExtraPolicy,
  type FictionalSeat,
  type FictionalSeatMap,
} from '../../src/core/seat-policy';
import {
  createSeatMap,
  type PairScenario,
} from '../../src/fixtures/seat-map-data';
const now = 100_000;
function seats(map: FictionalSeatMap): FictionalSeat[] {
  return map.rows.flatMap((row) =>
    row.cells.flatMap((cell) => (cell.kind === 'SEAT' ? [cell.seat] : [])),
  );
}
function fixture(scenario: PairScenario = 'mixed') {
  return createSeatMap(scenario, now);
}
function run(scenario: PairScenario = 'mixed') {
  const f = fixture(scenario);
  return findSeatPairs(f.map, f.request);
}
describe('BR-001..012 ZERO EXTRA deterministic fictional policy', () => {
  it('BR-001 has immutable no-extra policy and rejects paid overrides instead of falling back', () => {
    expect(zeroExtraPolicy).toEqual({ enabled: true, ultraLux: 'EXCLUDED' });
    expect(Object.isFrozen(zeroExtraPolicy)).toBe(true);
    const f = fixture('surcharge');
    expect(
      findSeatPairs(f.map, {
        ...f.request,
        allowPaid: true,
      } as typeof f.request).pairs,
    ).toEqual([]);
    expect(run('surcharge')).toMatchObject({
      status: 'NO_KNOWN_CANDIDATES',
      pairs: [],
      reasons: expect.arrayContaining(['EXTRA_PAYMENT']),
    });
  });
  it.each(['Ultra Lux', 'ULTRA_LUX', ' ultra   lux '])(
    'BR-002 excludes canonical category from label %s even at a fabricated zero fee',
    (label) => {
      expect(categoryFromLabel(label)).toBe('ULTRA_LUX');
      expect(run('ultra')).toMatchObject({
        status: 'NO_KNOWN_CANDIDATES',
        pairs: [],
        reasons: expect.arrayContaining(['ULTRA_LUX_EXCLUDED']),
      });
    },
  );
  it('BR-002 never infers eligibility/category from blue pixels or an arbitrary unknown label', () => {
    expect(categoryFromLabel('blue')).toBe('UNKNOWN');
    expect(categoryFromLabel('Lux VIP')).toBe('UNKNOWN');
    expect(categoryFromLabel(null)).toBe('UNKNOWN');
    expect(run('unknown-category')).toMatchObject({
      status: 'UNKNOWN',
      pairs: [],
      reasons: expect.arrayContaining(['CATEGORY_UNKNOWN']),
    });
    const f = fixture();
    seats(f.map).forEach((seat) => {
      seat.category = 'ULTRA_LUX';
      seat.colorHint = 'RED';
    });
    expect(findSeatPairs(f.map, f.request).pairs).toEqual([]);
  });
  it.each(['LUX', 'SAVER_LUX', 'SUPER_SAVER_LUX'] as const)(
    'BR-003 %s is only a candidate category, and requires independently zero costs',
    (category) => {
      expect(categoryEligibility(category)).toBe('CANDIDATE');
      const f = fixture();
      seats(f.map).forEach((seat) => {
        seat.category = category;
        seat.colorHint = 'UNKNOWN';
      });
      expect(findSeatPairs(f.map, f.request).pairs).toHaveLength(1);
      seats(f.map).forEach((seat) => {
        seat.additionalDue = { A: { kind: 'UNKNOWN' }, B: { kind: 'UNKNOWN' } };
      });
      expect(findSeatPairs(f.map, f.request)).toMatchObject({
        status: 'UNKNOWN',
        pairs: [],
      });
    },
  );
  it('BR-004 never treats accessible/companion places as generic overflow, but supports an explicit fictional route', () => {
    const f = fixture('accessible');
    expect(findSeatPairs(f.map, f.request).reasons).toContain(
      'ACCESSIBILITY_REVIEW',
    );
    expect(
      findSeatPairs(f.map, {
        ...f.request,
        accessibility: { A: true, B: true },
      }).pairs,
    ).toHaveLength(1);
    const unknown = fixture('accessibility-unknown');
    expect(
      findSeatPairs(unknown.map, {
        ...unknown.request,
        accessibility: { A: true, B: true },
      }),
    ).toMatchObject({ status: 'UNKNOWN', pairs: [] });
  });
  it.each(['aisle', 'gap', 'occupied', 'wrong-row'] as const)(
    'BR-005 rejects %s despite plausible seat numbering',
    (scenario) => {
      expect(run(scenario).pairs).toEqual([]);
    },
  );
  it.each(['reversed', 'skipped'] as const)(
    'BR-005 uses actual fixture geometry with %s numbering',
    (scenario) => {
      expect(run(scenario).pairs).toHaveLength(1);
      expect(run(scenario).pairs[0]!.evidence).toBe('FICTIONAL_GEOMETRY');
    },
  );
  it('BR-005 does not cross physical rows even with consecutive labels and a common hall', () => {
    const f = fixture();
    const [a, b] = seats(f.map);
    f.map.rows = [
      {
        id: 'physical-f',
        label: 'F',
        centerColumn: null,
        aisleAfter: [],
        cells: [{ kind: 'SEAT', column: 0, seat: a! }],
      },
      {
        id: 'physical-g',
        label: 'G',
        centerColumn: null,
        aisleAfter: [],
        cells: [{ kind: 'SEAT', column: 1, seat: { ...b!, rowLabel: 'G' } }],
      },
    ];
    expect(findSeatPairs(f.map, f.request).pairs).toEqual([]);
  });
  it('BR-006 considers each A/B due independently and can reverse assignment without sharing either check', () => {
    const f = fixture();
    const [a, b] = seats(f.map);
    if (a!.additionalDue.A.kind !== 'UNKNOWN') a!.additionalDue.A.cents = 100;
    if (b!.additionalDue.B.kind !== 'UNKNOWN') b!.additionalDue.B.cents = 100;
    expect(findSeatPairs(f.map, f.request).pairs[0]).toMatchObject({
      A: { id: b!.id },
      B: { id: a!.id },
    });
    for (const seat of seats(f.map))
      if (seat.additionalDue.B.kind !== 'UNKNOWN')
        seat.additionalDue.B.role = 'A';
    expect(findSeatPairs(f.map, f.request)).toMatchObject({
      status: 'UNKNOWN',
      pairs: [],
    });
  });
  it.each(['role', 'consent', 'passValidity'] as const)(
    'BR-006/009 refuses missing independent B %s evidence',
    (field) => {
      const f = fixture();
      if (field === 'role') f.map.contexts.B.role = 'A';
      else f.map.contexts.B[field] = 'UNKNOWN';
      expect(findSeatPairs(f.map, f.request)).toMatchObject({
        status: 'UNKNOWN',
        pairs: [],
        reasons: expect.arrayContaining(['CONTEXT_UNKNOWN']),
      });
    },
  );
  it.each(['stale', 'changed', 'mismatch'] as const)(
    'BR-007 rejects %s snapshot/context',
    (scenario) => {
      expect(run(scenario)).toMatchObject({ status: 'UNKNOWN', pairs: [] });
    },
  );
  it('BR-007 expires fee evidence independently of map age and rejects future/old revision', () => {
    for (const mode of ['age', 'future', 'revision']) {
      const f = fixture();
      for (const seat of seats(f.map))
        for (const fee of Object.values(seat.additionalDue))
          if (fee.kind !== 'UNKNOWN') {
            if (mode === 'age') fee.observedAt = now - PAIR_TTL_MS;
            if (mode === 'future') fee.observedAt = now + 1;
            if (mode === 'revision') fee.revision = 2;
          }
      expect(findSeatPairs(f.map, f.request).pairs).toEqual([]);
    }
  });
  it('BR-007 never reuses a valid result after a map changes or a request clock goes backward', () => {
    const f = fixture();
    expect(findSeatPairs(f.map, f.request).pairs).toHaveLength(1);
    f.map.revision++;
    expect(findSeatPairs(f.map, f.request).reasons).toEqual(['STALE_DATA']);
    f.map.revision--;
    expect(
      findSeatPairs(f.map, { ...f.request, now: now - 1 }).reasons,
    ).toEqual(['STALE_DATA']);
  });
  it('BR-008 never substitutes zero legend price or a partial mid-flow zero for additional due', () => {
    const f = fixture('unknown-fee');
    seats(f.map).forEach((seat) => {
      seat.legendPrice = { source: 'FICTIONAL_LEGEND', cents: 0 };
    });
    expect(findSeatPairs(f.map, f.request)).toMatchObject({
      status: 'UNKNOWN',
      pairs: [],
    });
    expect(run('partial-fee')).toMatchObject({
      status: 'UNKNOWN',
      pairs: [],
      reasons: expect.arrayContaining(['FEE_UNKNOWN']),
    });
    expect(
      additionalDueSchema.safeParse({ source: 'FICTIONAL_LEGEND', cents: 0 })
        .success,
    ).toBe(false);
  });
  it('BR-008 can accept fictitious zero additional due despite a nonzero regular ticket legend', () => {
    const f = fixture();
    expect(seats(f.map)[0]!.legendPrice!.cents).toBeGreaterThan(0);
    const result = findSeatPairs(f.map, f.request);
    expect(result.pairs[0]!.cost).toBe('FICTIONAL_ZERO_EXTRA');
    expect(JSON.stringify(result)).not.toContain('CONFIRMED');
  });
  it.each(['UNKNOWN', 'PARTIAL'] as const)(
    'BR-009 unknown map coverage %s cannot prove no suitable seats or a pair',
    (coverage) => {
      const f = fixture();
      f.map.coverage = coverage;
      expect(findSeatPairs(f.map, f.request)).toMatchObject({
        status: 'UNKNOWN',
        pairs: [],
      });
    },
  );
  it('BR-009 marks unknown availability and unknown geometry without interpreting them as free/empty', () => {
    const f = fixture();
    seats(f.map).forEach((seat) => {
      seat.availability = 'UNKNOWN';
    });
    expect(findSeatPairs(f.map, f.request)).toMatchObject({
      status: 'UNKNOWN',
      pairs: [],
    });
    f.map.geometry = 'UNKNOWN';
    expect(findSeatPairs(f.map, f.request).reasons).toEqual([
      'GEOMETRY_UNKNOWN',
    ]);
  });
  it('BR-010/011 rejects live/screenshot/account/checkout inputs and does not mutate the fictional source or options', () => {
    const f = fixture();
    const before = structuredClone(f);
    const result = findSeatPairs(f.map, f.request);
    expect(f).toEqual(before);
    for (const extra of [
      { source: 'LIVE_VERIFIED' },
      { cookies: 'fictional' },
      { countdown: 42 },
      { confirmation: 'CONFIRMED' },
      { screenshot: 'not-an-image' },
    ])
      expect(findSeatPairs({ ...f.map, ...extra }, f.request)).toMatchObject({
        status: 'UNKNOWN',
        pairs: [],
      });
    expect(JSON.stringify(result)).not.toMatch(
      /LIVE_VERIFIED|CONFIRMED|reservation|token|cookie/,
    );
  });
  it('rejects duplicate topology/IDs/labels and oversized or cyclic malformed data instead of guessing a map', () => {
    const f = fixture();
    const first = f.map.rows[0]!.cells[0]!;
    f.map.rows[0]!.cells.push(structuredClone(first));
    expect(findSeatPairs(f.map, f.request).reasons).toEqual(['INVALID_DATA']);
    const cycle: { ref?: unknown } = {};
    cycle.ref = cycle;
    expect(findSeatPairs(cycle, f.request).status).toBe('UNKNOWN');
    expect(findSeatPairs('x'.repeat(65_537), f.request).status).toBe('UNKNOWN');
  });
  it('ranks only already eligible physical pairs, preferring same category then explicit fixture center', () => {
    const f = fixture('lux');
    expect(findSeatPairs(f.map, f.request).pairs[0]).toMatchObject({
      A: { label: 'F11' },
      B: { label: 'F12' },
      centerDistance: 0,
    });
    seats(f.map)[2]!.category = 'SAVER_LUX';
    seats(f.map)[3]!.category = 'SUPER_SAVER_LUX';
    expect(findSeatPairs(f.map, f.request).pairs[0]).toMatchObject({
      A: { label: 'F10' },
      B: { label: 'F11' },
    });
  });
  it('invariant: all category/fee combinations exclude Ultra Lux and paid role assignments before any ranking', () => {
    for (const category of [
      'LUX',
      'SAVER_LUX',
      'SUPER_SAVER_LUX',
      'ULTRA_LUX',
      'UNKNOWN',
    ] as const)
      for (const cents of [0, 1, 250]) {
        const f = fixture('lux');
        for (const seat of seats(f.map)) {
          seat.category = category;
          for (const fee of Object.values(seat.additionalDue))
            if (fee.kind !== 'UNKNOWN') fee.cents = cents;
        }
        const result = findSeatPairs(f.map, f.request);
        if (category === 'ULTRA_LUX' || category === 'UNKNOWN' || cents > 0)
          expect(result.pairs).toHaveLength(0);
        else expect(result.pairs.length).toBeGreaterThan(0);
        for (const pair of result.pairs) {
          expect([pair.A.category, pair.B.category]).not.toContain('ULTRA_LUX');
          expect(pair.cost).toBe('FICTIONAL_ZERO_EXTRA');
        }
      }
  });
});

it('BR-006/008 never accepts a zero-fee observation copied from a different seat', () => {
  const f = fixture();
  const [first, second] = seats(f.map);
  if (second!.additionalDue.A.kind !== 'UNKNOWN')
    second!.additionalDue.A.cents = 250;
  second!.additionalDue.B = structuredClone(first!.additionalDue.B);
  expect(findSeatPairs(f.map, f.request).pairs).toEqual([]);
});
it('BR-008 zero due for a different showing and nonzero partial totals cannot become zero-extra', () => {
  const f = fixture();
  for (const seat of seats(f.map))
    for (const fee of Object.values(seat.additionalDue))
      if (fee.kind !== 'UNKNOWN') fee.screening.time = '21:00';
  expect(findSeatPairs(f.map, f.request)).toMatchObject({
    status: 'UNKNOWN',
    pairs: [],
  });
  const paid = fixture('partial-fee');
  for (const seat of seats(paid.map))
    for (const fee of Object.values(seat.additionalDue))
      if (fee.kind !== 'UNKNOWN') fee.cents = 1;
  expect(findSeatPairs(paid.map, paid.request)).toMatchObject({
    status: 'NO_KNOWN_CANDIDATES',
    reasons: expect.arrayContaining(['EXTRA_PAYMENT']),
    pairs: [],
  });
});
it('BR-008 refuses ambiguous currency/negative/fractional amounts and never parses price text', () => {
  for (const amount of [null, '€0,00', -1, 0.01, Number.NaN]) {
    const f = fixture();
    const fee = seats(f.map)[0]!.additionalDue.A;
    expect(
      additionalDueSchema.safeParse({ ...fee, cents: amount }).success,
    ).toBe(false);
  }
});
