import { expect, test } from 'vitest';
import { extract } from '../helpers/vue-page-reader';
import {
  bookingAlpha,
  bookingBeta,
  quickBlank,
  quickSelected,
} from '../fixtures/vue-header';

test('Quick Ticket reads only four selected opener values; no banner, options, inferred year/hall or CTA URL', () => {
  const blank = extract(quickBlank);
  expect(blank.screenScope).toBe('VISIBLE_QUICK_TICKET');
  expect(
    Object.values(blank.fields).every((field) => field.value === null),
  ).toBe(true);
  const selected = extract(quickSelected);
  expect(selected.screenScope).toBe('VISIBLE_QUICK_TICKET');
  expect(
    Object.fromEntries(
      Object.entries(selected.fields).map(([k, v]) => [k, v.value]),
    ),
  ).toEqual({
    movie: 'Demo Alpha',
    cinema: 'Vue Teststad',
    date: 'za 13 apr',
    time: '20:45',
    hall: null,
  });
  expect(JSON.stringify(selected)).not.toMatch(
    /geheim|superhelden|22:15|Zaal 9|NIET LEZEN/,
  );
  expect(
    extract(quickSelected.replace('Vue Teststad', 'Teststad')).fields.cinema
      .value,
  ).toBe('Teststad');
});

test('Quick Ticket partial, hidden, duplicate and invalid choices stay unknown or ambiguous', () => {
  expect(
    extract(quickSelected.replace('Demo Alpha', 'Kies een film of evenement'))
      .fields.movie.status,
  ).toBe('UNKNOWN');
  expect(
    extract(
      quickSelected.replace(
        'data-test="dropdown-opener"',
        'hidden data-test="dropdown-opener"',
      ),
    ).fields.cinema.status,
  ).toBe('UNKNOWN');
  expect(
    extract(
      quickSelected.replace(
        'Demo Alpha</span>',
        'Demo Alpha</span><span class="dropdown-opener__title-value">Demo Beta</span>',
      ),
    ).fields.movie.status,
  ).toBe('AMBIGUOUS');
  for (const [from, to, key] of [
    ['za 13 apr', 'ma 31 feb', 'date'],
    ['20:45', '24:01', 'time'],
  ] as const)
    expect(extract(quickSelected.replace(from, to)).fields[key].status).toBe(
      'UNKNOWN',
    );
  expect(extract(quickSelected + quickSelected).fields.movie.status).toBe(
    'AMBIGUOUS',
  );
});

test('Booking Hero recognises both selector shapes and cross-checks local date/time; checkout remains blocked', () => {
  const alpha = extract(
    bookingAlpha,
    'https://www.vuecinemas.nl/kopen/overzicht/fictief',
  );
  expect(alpha.screenScope).toBe('VISIBLE_BOOKING_HERO');
  expect(
    Object.fromEntries(
      Object.entries(alpha.fields).map(([k, v]) => [k, v.value]),
    ),
  ).toEqual({
    movie: 'Demo Alpha',
    cinema: 'Vue Teststad',
    date: '2030-04-12',
    time: '19:30',
    hall: 'Zaal 2',
  });
  const beta = extract(
    bookingBeta.replace(/<section class="checkout">[\s\S]*?<\/section>/, ''),
  );
  expect(beta.fields.movie.value).toBe('Demo Beta');
  expect(beta.fields.date.value).toBe('2030-04-13');
  expect(beta.fields.time.value).toBe('20:45');
  expect(beta.fields.hall.value).toBe('Zaal 5');
  const blocked = extract(
    bookingBeta,
    'https://www.vuecinemas.nl/kopen/overzicht/fictief',
  );
  expect(blocked.reason).toBe('PROTECTED_PAGE');
  expect(
    Object.values(blocked.fields).every((field) => field.value === null),
  ).toBe(true);
  expect(JSON.stringify(blocked)).not.toMatch(/account|private|fictief/);
});

test('Booking Hero missing/hidden/duplicate, invalid calendar and conflicting time/hall fail closed', () => {
  expect(
    extract(
      bookingAlpha.replace(
        'data-test="booking-hero"',
        'hidden data-test="booking-hero"',
      ),
    ).fields.movie.value,
  ).toBeNull();
  expect(extract(bookingAlpha + bookingAlpha).fields.movie.status).toBe(
    'AMBIGUOUS',
  );
  expect(
    extract(
      bookingAlpha.replace(
        'data-test="booking-hero"',
        'data-test="unsupported"',
      ),
    ).fields.movie.value,
  ).toBeNull();
  expect(
    extract(bookingAlpha.replace('2030-04-12T19:30:00', '2030-02-30T19:30:00'))
      .fields.date.status,
  ).toBe('UNKNOWN');
  expect(
    extract(bookingAlpha.replace('vr 12 apr', 'za 13 apr')).fields.date.status,
  ).toBe('AMBIGUOUS');
  expect(
    extract(bookingAlpha.replace('>19:30<', '>21:30<')).fields.time.status,
  ).toBe('AMBIGUOUS');
  expect(
    extract(
      bookingAlpha.replace(
        'data-test="screen-title">Zaal 2',
        'data-test="screen-title">Zaal 5',
      ),
    ).fields.hall.status,
  ).toBe('AMBIGUOUS');
});

test('simultaneous visible Quick Ticket and Booking Hero never produce a combined showing', () => {
  const result = extract(quickSelected + bookingAlpha);
  expect(result.reason).toBe('AMBIGUOUS_CONTEXT');
  expect(
    Object.values(result.fields).every(
      (field) => field.status === 'AMBIGUOUS' && field.value === null,
    ),
  ).toBe(true);
});
