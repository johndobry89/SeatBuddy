import { describe, expect, test } from 'vitest';
import { ageMinutes, formatProposal, HELP_LINE, parseProposal, shareableLabel, type Proposal } from '../src/core/message';

const proposal: Proposal = {
  showing: { movie: 'Ebenezer', cinema: 'Vue Enschede', date: '2026-11-22', time: '18:40', hall: 'Zaal 6' },
  row: 1,
  sender: 9,
  receiver: 10,
  categories: ['Lux', 'Lux'],
  readAt: '12:47',
};
const text = formatProposal(proposal);

describe('share message v2', () => {
  test('is a readable chat message that round-trips exactly', () => {
    expect(text).toBe(
      'SeatBuddies-voorstel: Ebenezer | Vue Enschede | 22-11-2026 18:40 | Zaal 6 | rij 1 | stoel 9 (verzender) + 10 (ontvanger) | Lux + Lux | gelezen 12:47\n' +
        HELP_LINE,
    );
    expect(parseProposal(text)).toEqual(proposal);
  });

  test('survives what chat apps do to text (audit F2)', () => {
    const nbsp = String.fromCodePoint(0xa0);
    const zwsp = String.fromCodePoint(0x200b);
    const variants = [
      text + '\n',
      '  ' + text,
      text.replace(/\n/g, '\r\n'),
      `[12:50, 21-11-2026] Sam: ${text}`,
      text.replace(/ \| /g, `${nbsp}|${nbsp}`),
      text.replace('Ebenezer', `${zwsp}Ebenezer`),
      text.split('\n')[0]!, // help line dropped
      text.replace('stoel 9', 'Stoel 9').replace('Lux + Lux', 'lux + lux'),
    ];
    for (const variant of variants) expect(parseProposal(variant)).toEqual(proposal);
  });

  test('allows legitimate titles that the old keyword list refused (audit F1)', () => {
    for (const movie of ['The Secret Garden', 'Wild Card', 'Lupin', 'The Order', 'Session 9', "Cookie's Fortune", 'Spin', 'Border']) {
      expect(shareableLabel(movie)).toBe(true);
      expect(parseProposal(formatProposal({ ...proposal, showing: { ...proposal.showing, movie } })).showing.movie).toBe(movie);
    }
  });

  test('refuses links, e-mail, long numbers, tokens, markup and separators', () => {
    for (const bad of ['https://evil.example', 'www.example.nl', 'a@b.nl', 'Pas 1234567', 'x'.repeat(30), '<b>Film</b>', 'A | B', ' Film', '']) {
      expect(shareableLabel(bad)).toBe(false);
      expect(() => formatProposal({ ...proposal, showing: { ...proposal.showing, movie: bad } })).toThrow();
    }
  });

  test('changed or incomplete content stops, whatever the formatting', () => {
    const bad = [
      'hallo',
      text.replace('stoel 9 (verzender) + 10', 'stoel 9 (verzender) + 12'),
      text.replace(' | gelezen 12:47', ''),
      text.replace('Lux + Lux', 'Lux + Platinum'),
      text.replace('22-11-2026', '31-02-2026'),
      text.replace('18:40', '25:40'),
      text.replace('Zaal 6', 'Room 6'),
      text.replace('rij 1', 'rij 0'),
      text.replace('Ebenezer', 'Ebenezer | extra'),
      `${text}\n${text}`,
      'x'.repeat(2001),
    ];
    for (const variant of bad) expect(() => parseProposal(variant)).toThrow();
  });

  test('age is advisory and only same-day', () => {
    const at = (h: number, m: number) => new Date(2026, 10, 21, h, m).getTime();
    expect(ageMinutes('12:47', at(12, 59))).toBe(12);
    expect(ageMinutes('12:47', at(12, 40))).toBeNull();
    expect(ageMinutes('bad', at(12, 40))).toBeNull();
  });
});
