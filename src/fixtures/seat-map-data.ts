import type {
  FictionalSeat,
  FictionalSeatMap,
  PairRequest,
  SeatCategory,
} from '../core/seat-policy';

export const pairScenarioLabels = {
  lux: 'Aangrenzend Lux',
  mixed: 'Saver Lux naast Super Saver Lux',
  ultra: 'Alleen Ultra Lux, zelfs met fictief €0',
  aisle: 'F10/F11 met gangpad',
  gap: 'Onderbreking in de rij',
  occupied: 'Bezet tussen twee plaatsen',
  accessible: 'Toegankelijke DEMO-route',
  'accessibility-unknown': 'Toegankelijkheidsvoorwaarden onbekend',
  'unknown-category': 'Blauwe kleur, categorie onbekend',
  'unknown-fee': 'Bijbetaling onbekend',
  surcharge: 'Niet-blauwe categorieën met bijbetaling',
  mismatch: 'Andere voorstelling voor B',
  stale: 'Verlopen kaart',
  changed: 'Kaartversie gewijzigd',
  reversed: 'Omgekeerde nummering',
  skipped: 'Nummer 13 overgeslagen, fysiek buren',
  'wrong-row': 'Verkeerd rijlabel',
  'partial-fee': '€0 halverwege, latere kosten onbekend',
} as const;
export type PairScenario = keyof typeof pairScenarioLabels;
export const pairScreening = Object.freeze({
  movie: 'De maan van papier',
  cinema: 'Fictief Filmhuis',
  date: '2030-04-12',
  time: '19:30',
  hall: 'Zaal 2',
});
export function createSeatMap(
  scenario: PairScenario,
  now: number,
): { map: FictionalSeatMap; request: PairRequest } {
  function seat(index: number, category: SeatCategory = 'LUX'): FictionalSeat {
    return {
      id: `fiction-${index}`,
      label: `F${10 + index}`,
      rowLabel: 'F',
      category,
      colorHint:
        category === 'ULTRA_LUX'
          ? 'BLUE'
          : category === 'SAVER_LUX'
            ? 'GREEN'
            : category === 'SUPER_SAVER_LUX'
              ? 'RED'
              : 'BLACK',
      designation: 'STANDARD',
      availability: 'AVAILABLE',
      legendPrice: { source: 'FICTIONAL_LEGEND', cents: 1500 },
      additionalDue: {
        A: {
          kind: 'POST_PASS_ADDITIONAL_DUE',
          source: 'FICTIONAL_POST_PASS',
          role: 'A',
          seatId: `fiction-${index}`,
          screening: { ...pairScreening },
          cents: 0,
          currency: 'EUR',
          coverage: 'ALL_CURRENT_CHARGES',
          observedAt: now,
          revision: 1,
        },
        B: {
          kind: 'POST_PASS_ADDITIONAL_DUE',
          source: 'FICTIONAL_POST_PASS',
          role: 'B',
          seatId: `fiction-${index}`,
          screening: { ...pairScreening },
          cents: 0,
          currency: 'EUR',
          coverage: 'ALL_CURRENT_CHARGES',
          observedAt: now,
          revision: 1,
        },
      },
    };
  }
  const seats = Array.from({ length: scenario === 'lux' ? 4 : 2 }, (_, index) =>
    seat(index),
  );
  const map: FictionalSeatMap = {
    source: 'FICTIONAL_SEATMAP',
    observedAt: now,
    revision: 1,
    screening: { ...pairScreening },
    geometry: 'FICTIONAL_GEOMETRY',
    coverage: 'COMPLETE_FICTION',
    contexts: {
      A: {
        role: 'A',
        source: 'FICTIONAL_SEATMAP',
        screening: { ...pairScreening },
        revision: 1,
        consent: 'KNOWN_FICTION',
        passValidity: 'KNOWN_FICTION',
        accessibilityConditions: 'KNOWN_FICTION',
      },
      B: {
        role: 'B',
        source: 'FICTIONAL_SEATMAP',
        screening: { ...pairScreening },
        revision: 1,
        consent: 'KNOWN_FICTION',
        passValidity: 'KNOWN_FICTION',
        accessibilityConditions: 'KNOWN_FICTION',
      },
    },
    rows: [
      {
        id: 'physical-row-f',
        label: 'F',
        centerColumn: (seats.length - 1) / 2,
        aisleAfter: [],
        cells: seats.map((value, column) => ({
          kind: 'SEAT',
          column,
          seat: value,
        })),
      },
    ],
  };
  const request: PairRequest = {
    now,
    screening: { ...pairScreening },
    revision: 1,
    accessibility: { A: false, B: false },
  };
  const row = map.rows[0]!;
  const first = seats[0]!,
    second = seats[1]!;
  if (scenario === 'mixed') {
    first.category = 'SAVER_LUX';
    first.colorHint = 'GREEN';
    second.category = 'SUPER_SAVER_LUX';
    second.colorHint = 'RED';
  }
  if (scenario === 'ultra')
    for (const value of seats) {
      value.category = 'ULTRA_LUX';
      value.colorHint = 'BLUE';
    }
  if (scenario === 'aisle') row.aisleAfter = [0];
  if (scenario === 'gap' || scenario === 'occupied') {
    row.cells = [
      { kind: 'SEAT', column: 0, seat: first },
      scenario === 'gap'
        ? { kind: 'GAP', column: 1 }
        : {
            kind: 'SEAT',
            column: 1,
            seat: { ...seat(2), availability: 'OCCUPIED' },
          },
      { kind: 'SEAT', column: 2, seat: second },
    ];
  }
  if (scenario === 'accessible' || scenario === 'accessibility-unknown') {
    first.designation = 'ACCESSIBLE';
    second.designation = 'COMPANION';
    if (scenario === 'accessibility-unknown')
      map.contexts.A.accessibilityConditions = 'UNKNOWN';
  }
  if (scenario === 'unknown-category') {
    first.category = 'UNKNOWN';
    first.colorHint = 'BLUE';
  }
  if (scenario === 'unknown-fee')
    for (const value of seats)
      value.additionalDue = { A: { kind: 'UNKNOWN' }, B: { kind: 'UNKNOWN' } };
  if (scenario === 'surcharge')
    for (const [index, value] of seats.entries()) {
      value.category = index ? 'SUPER_SAVER_LUX' : 'SAVER_LUX';
      value.colorHint = index ? 'RED' : 'GREEN';
      for (const fee of Object.values(value.additionalDue))
        if (fee.kind !== 'UNKNOWN') fee.cents = 250;
    }
  if (scenario === 'mismatch') map.contexts.B.screening.time = '21:00';
  if (scenario === 'stale') map.observedAt = now - 30_000;
  if (scenario === 'changed') map.revision = 2; // Request/role/fee stamps still refer to the discarded version.
  if (scenario === 'reversed') {
    first.label = 'F11';
    second.label = 'F10';
  }
  if (scenario === 'skipped') {
    first.label = 'F12';
    second.label = 'F14';
  }
  if (scenario === 'wrong-row') second.rowLabel = 'G';
  if (scenario === 'partial-fee')
    for (const value of seats)
      for (const fee of Object.values(value.additionalDue))
        if (fee.kind !== 'UNKNOWN') fee.coverage = 'PARTIAL';
  return { map, request };
}
