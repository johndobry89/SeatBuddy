import { describe, expect, test } from 'vitest';
import { discover } from '../src/core/seats';
import { domMap, domRow, domSeat, hero, icon, legend, page, read, screenTitle } from './helpers';

const row = (n: number, count: number, extra: Record<number, object> = {}) =>
  domRow(n, Array.from({ length: count }, (_, i) => domSeat(n, { number: i + 1, ...extra[i + 1] })).join(''));

describe('showing', () => {
  test('a complete booking hero is read; Quick Ticket or a second hero is ambiguous', () => {
    const obs = read(page([row(1, 2)]));
    expect(obs.status).toBe('OK');
    expect(obs.showing).toEqual({ movie: 'Demo Film', cinema: 'Vue Teststad', date: '2030-11-22', time: '18:40', hall: 'Zaal 6' });
    expect(read(page([row(1, 2)], '<div class="quick-book" role="complementary">x</div>')).status).toBe('AMBIGUOUS');
    expect(read(hero() + hero()).status).toBe('AMBIGUOUS');
    expect(read('<main>Geen voorstelling</main>').status).toBe('NO_SHOWING');
  });

  test('strict showtime: visible date/time must agree with the machine-readable stamp', () => {
    expect(read(hero({ dateText: 'za 22 nov' }) + screenTitle() + legend() + domMap([row(1, 2)])).status).toBe('INCOMPLETE');
    expect(read(hero({ time: '18:45' }) + screenTitle() + legend() + domMap([row(1, 2)])).status).toBe('INCOMPLETE');
    expect(read(hero({ datetime: '2030-02-30T18:40:00' })).status).toBe('INCOMPLETE');
    // Hall heading above the map must match the hero's hall.
    expect(read(hero() + screenTitle('Zaal 7') + legend() + domMap([row(1, 2)])).status).toBe('INCOMPLETE');
  });

  test('only vuecinemas.nl, only the top frame, never protected pages', () => {
    expect(read(page([row(1, 2)]), 'https://vuecinemas.example/kopen').status).toBe('NOT_VUE');
    expect(read(page([row(1, 2)]), undefined, undefined, false).status).toBe('NOT_VUE');
    expect(read(page([row(1, 2)]), 'https://www.vuecinemas.nl/checkout/123').status).toBe('PROTECTED');
    expect(read(page([row(1, 2)], '<form><input type="password"></form>')).status).toBe('PROTECTED');
    expect(read(page([row(1, 2)], '<div role="dialog">Cookies</div>')).status).toBe('PROTECTED');
    // A hidden dialog does not block.
    expect(read(page([row(1, 2)], '<div role="dialog" hidden>Cookies</div>')).status).toBe('OK');
  });

  test('a title that cannot be shared safely makes the showing incomplete, not a crash', () => {
    expect(read(hero({ movie: 'Film 12345678' }) + screenTitle() + legend() + domMap([row(1, 2)])).status).toBe('INCOMPLETE');
  });
});

describe('seat map', () => {
  test('reads states, categories and DOM borders', () => {
    const map = read(page([row(1, 3, { 3: { state: 'unavailable' } })])).map!;
    expect(map.status).toBe('OK');
    expect(map.scheme).toBe('LUX_4');
    expect(map.rows[0]!.map((s) => [s.number, s.state, s.category, s.before, s.after])).toEqual([
      [1, 'available', 'Lux', 'END', 'SEAT'],
      [2, 'available', 'Lux', 'SEAT', 'SEAT'],
      [3, 'unavailable', null, 'SEAT', 'END'],
    ]);
  });

  test('misleading or changed DOM stops: duplicates, contradictions, foreign buttons', () => {
    const dup = domRow(1, domSeat(1, { number: 1 }) + domSeat(1, { number: 1, column: 2 }));
    expect(read(page([dup])).map!.status).toBe('INCONSISTENT');
    const twoRows = domRow(1, domSeat(1, { number: 1 })) + domRow(1, domSeat(1, { number: 2 }).replace('seat-1-2', 'seat-x'));
    expect(read(page([twoRows])).map!.status).toBe('INCONSISTENT');
    const mixed = domRow(1, domSeat(1, { number: 1 }) + domSeat(2, { number: 1, column: 2 }));
    expect(read(page([mixed])).map!.status).toBe('INCONSISTENT');
    // Label says available but the control is disabled: state unknown.
    const lying = domRow(1, domSeat(1, { number: 1 }).replace('<button', '<button disabled') + domSeat(1, { number: 2 }));
    expect(read(page([lying])).map!.rows[0]![0]!.state).toBe('unknown');
    expect(read(page([row(1, 2)]) + domMap([row(2, 2)])).map!.status).toBe('INCONSISTENT');
  });

  test('a half-rendered or hidden map is not read (audit F8 is reported, not loosened)', () => {
    const fading = domRow(1, domSeat(1, { number: 1 }).replace('style="', 'style="opacity:0;') + domSeat(1, { number: 2 }));
    expect(read(page([fading])).map!.status).toBe('NOT_VISIBLE');
    expect(read(hero() + screenTitle() + legend()).map!.status).toBe('NO_MAP');
  });

  test('legend: missing entries, shared icons or unknown seat icons give no categories', () => {
    const partial = hero() + screenTitle() + legend().replace(/<button[^]*?Ultra Lux stoelen<\/span><\/button>/, '') + domMap([row(1, 2)]);
    expect(read(partial).map!.status).toBe('LEGEND_UNKNOWN');
    const shared = hero() + screenTitle() + legend((k) => icon(k === 'ultra' ? 'lux' : k)) + domMap([row(1, 2)]);
    expect(read(shared).map!.status).toBe('LEGEND_UNKNOWN');
    const strange = page([row(1, 2, { 2: { category: 'wheelchair-icon' } })]);
    expect(read(strange).map!.rows[0]![1]!.category).toBeNull();
    const external = hero() + screenTitle() + legend((k) => `https://cdn.example/${k}.png`) + domMap([row(1, 2)]);
    expect(read(external).map!.status).toBe('LEGEND_UNKNOWN');
  });

  test('wheelchair markers: class, marked element or text next to a pair stop it (audit F5)', () => {
    const marked = domRow(1, domSeat(1, { number: 1 }) + domSeat(1, { number: 2 }) + '<span class="seats__space"><img src="x"></span>' + domSeat(1, { number: 3, column: 4 }) + domSeat(1, { number: 4, column: 5 }));
    expect(discover(read(page([marked])).map!).pairs).toEqual([]);
    const spacer = marked.replace('<span class="seats__space"><img src="x"></span>', '<span class="seats__space"></span>');
    expect(discover(read(page([spacer])).map!).pairs.map((p) => p.seats.join('+'))).toEqual(['1+2', '3+4']);
    const labelled = marked.replace('<span class="seats__space"><img src="x"></span>', '<span class="seats__wheelchair"></span>');
    expect(discover(read(page([labelled])).map!).pairs).toEqual([]);
    const special = row(1, 3, { 1: { className: 'seats__seat--wheelchair' } });
    expect(discover(read(page([special])).map!).pairs).toEqual([]);
  });

  test('end to end: rear row first with a proven screen, page order without one', () => {
    const rows = [row(1, 6), row(8, 6)];
    const ranked = discover(read(page(rows)).map!);
    expect(ranked.mode).toBe('SCREEN');
    expect(ranked.pairs[0]).toMatchObject({ row: 8, seats: [3, 4] });
    const noScreen = discover(read(hero() + legend() + domMap(rows)).map!);
    expect(noScreen.mode).toBe('PAGE_ORDER');
    expect(noScreen.pairs.map((p) => `${p.row}:${p.seats.join('+')}`)).toEqual(['1:1+2', '1:3+4', '1:5+6']);
  });

  test('never reads form values (privacy trap)', () => {
    expect(() => read(page([row(1, 2)], '<input type="text" value="secret">'))).not.toThrow();
  });
});
