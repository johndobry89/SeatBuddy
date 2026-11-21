import { ALL_CATEGORIES, type Category, type Showing } from './types';

/**
 * The share message is meant for people first: it reads like a normal chat
 * message and still works without the extension. The receiving extension only
 * uses it as a pointer; B's own live page read decides every outcome. That is
 * why the format may be tolerant to chat formatting while the content is
 * strict.
 */

export const MARKER = 'SeatBuddies-voorstel:';
export const HELP_LINE =
  'Open dezelfde voorstelling op Vue, klik op SeatBuddies → "Gekozen stoelen controleren" en plak dit hele bericht.';

export interface Proposal {
  showing: Showing;
  row: number;
  /** Seat of the person who sent the message. */
  sender: number;
  /** Seat for the person who receives the message. */
  receiver: number;
  categories: [Category, Category];
  /** Local clock time of the sender's page read, for an age hint only. */
  readAt: string;
}

export class MessageError extends Error {
  override readonly name = 'MessageError';
}

/** Structural checks only: no URLs, e-mail, long digit runs, markup or controls. */
export function shareableLabel(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= 120 &&
    value === value.trim() &&
    !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}|<>@\\]/u.test(value) &&
    !/:\/\/|www\.|\d{7}|[A-Za-z0-9_-]{24,}/i.test(value)
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
export const clockTime = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const HALL = /^Zaal [1-9]\d{0,2}(?: [A-Za-z0-9+ ]{1,30})?$/;

function displayDate(iso: string) {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new MessageError('Ongeldige datum.');
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function formatProposal(proposal: Proposal): string {
  const { showing, row, sender, receiver, categories, readAt } = proposal;
  if (
    !shareableLabel(showing.movie) ||
    !shareableLabel(showing.cinema) ||
    !HALL.test(showing.hall) ||
    !TIME.test(showing.time) ||
    !TIME.test(readAt) ||
    !validSeats(row, sender, receiver) ||
    !categories.every((c) => ALL_CATEGORIES.includes(c))
  )
    throw new MessageError('Deze voorstelling kan niet veilig worden gedeeld.');
  const line = [
    `${MARKER} ${showing.movie}`,
    showing.cinema,
    `${displayDate(showing.date)} ${showing.time}`,
    showing.hall,
    `rij ${row}`,
    `stoel ${sender} (verzender) + ${receiver} (ontvanger)`,
    `${categories[0]} + ${categories[1]}`,
    `gelezen ${readAt}`,
  ].join(' | ');
  return `${line}\n${HELP_LINE}`;
}

function validSeats(row: number, sender: number, receiver: number) {
  return (
    [row, sender, receiver].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 999,
    ) && Math.abs(sender - receiver) === 1
  );
}

/** Builds a character class from code points (keeps invisible characters out of the source). */
const charClass = (ranges: [number, number][]) =>
  new RegExp(
    `[${ranges.map(([a, b]) => (a === b ? String.fromCodePoint(a) : `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`)).join('')}]`,
    'gu',
  );
const LINE_SEPARATORS = charClass([[0x2028, 0x2029]]);
const INVISIBLE = charClass([[0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2060], [0xfeff, 0xfeff]]);
const SPACES = charClass([[0x00a0, 0x00a0], [0x2000, 0x200a], [0x202f, 0x202f], [0x3000, 0x3000]]);

/** Undo what chat apps typically do: CRLF, NBSP, zero-width and bidi marks. */
function normalise(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(LINE_SEPARATORS, '\n')
    .replace(INVISIBLE, '')
    .replace(SPACES, ' ');
}

export function parseProposal(input: string): Proposal {
  if (typeof input !== 'string' || input.length > 2000)
    throw new MessageError('Bericht te lang of ongeldig.');
  const text = normalise(input);
  const start = text.toLowerCase().indexOf(MARKER.toLowerCase());
  if (start < 0)
    throw new MessageError(
      'Geen SeatBuddies-voorstel gevonden. Plak het hele bericht van je partner.',
    );
  if (text.toLowerCase().indexOf(MARKER.toLowerCase(), start + 1) >= 0)
    throw new MessageError('Meerdere voorstellen geplakt. Plak er precies één.');
  const line = text.slice(start + MARKER.length).split('\n')[0]!;
  const parts = line.split('|').map((part) => part.trim().replace(/ +/g, ' '));
  if (parts.length !== 8)
    throw new MessageError('Het voorstel is onvolledig of gewijzigd.');
  const [movie, cinema, when, hall, rowPart, seatPart, categoryPart, readPart] =
    parts as [string, string, string, string, string, string, string, string];
  const date = /^(\d{2})-(\d{2})-(\d{4}) ((?:[01]\d|2[0-3]):[0-5]\d)$/.exec(when);
  const row = /^rij ([1-9]\d{0,2})$/i.exec(rowPart);
  const seats =
    /^stoel ([1-9]\d{0,2}) \(verzender\) \+ ([1-9]\d{0,2}) \(ontvanger\)$/i.exec(
      seatPart,
    );
  const cats = categoryPart.split(' + ');
  const read = /^gelezen ((?:[01]\d|2[0-3]):[0-5]\d)$/i.exec(readPart);
  const categories = cats.map((name) =>
    ALL_CATEGORIES.find((c) => c.toLowerCase() === name.toLowerCase()),
  );
  if (
    !shareableLabel(movie) ||
    !shareableLabel(cinema) ||
    !HALL.test(hall) ||
    !date ||
    !validCalendarDate(+date[3]!, +date[2]!, +date[1]!) ||
    !row ||
    !seats ||
    !read ||
    categories.length !== 2 ||
    categories.some((c) => c === undefined)
  )
    throw new MessageError('Het voorstel is onvolledig of gewijzigd.');
  const sender = Number(seats[1]);
  const receiver = Number(seats[2]);
  if (!validSeats(Number(row[1]), sender, receiver))
    throw new MessageError('Deze stoelnummers liggen niet naast elkaar.');
  return {
    showing: {
      movie,
      cinema,
      date: `${date[3]}-${date[2]}-${date[1]}`,
      time: date[4]!,
      hall,
    },
    row: Number(row[1]),
    sender,
    receiver,
    categories: categories as [Category, Category],
    readAt: read[1]!,
  };
}

function validCalendarDate(year: number, month: number, day: number) {
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 2000 &&
    year <= 2100 &&
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/** Minutes since the sender's read, or null when it cannot be told. Advisory only. */
export function ageMinutes(readAt: string, now: number): number | null {
  const m = TIME.exec(readAt) ? readAt.split(':').map(Number) : null;
  if (!m) return null;
  const d = new Date(now);
  const nowMinutes = d.getHours() * 60 + d.getMinutes();
  const age = nowMinutes - (m[0]! * 60 + m[1]!);
  // Same day only; a negative or very old value is not interpretable.
  return age >= 0 && age <= 12 * 60 ? age : null;
}

export { HALL as HALL_PATTERN, TIME as TIME_PATTERN, ISO_DATE as ISO_DATE_PATTERN };
