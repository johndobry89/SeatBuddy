import { z } from 'zod';

export const DUO_TTL_MS = 5 * 60_000;
const prefix = 'SeatBuddies duo-plan v1\n';
/** Shared copy boundary: no credentials, URL, token or line injection in labels. */
export function safePublicLabel(value: string): boolean {
  return !(
    /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]|@|[<>\\]|(?:[a-z][a-z0-9+.-]*:\/\/)|(?:https?|ftp|file|data|blob|javascript|chrome-extension):|www\.|(?:\b[a-z0-9-]+\.)+[a-z]{2,24}\b|(?:^|\s)\/[a-z0-9]/iu.test(
      value,
    ) ||
    /(?:token|secret|password|wachtwoord|movie\s*pass|pasnummer|username|gebruikersnaam|credential|login|account|order|booking|session|cookie|bearer|pin|card|kaartnummer|email|e-mail)(?:\b|[_:=])/i.test(
      value,
    ) ||
    /[A-Za-z0-9_-]{24,}|\d{7}/.test(value)
  );
}
const label = z.string().min(1).max(120).refine(safePublicLabel);
export const duoCategorySchema = z.enum([
  'Lux',
  'Saver Lux',
  'Super Saver Lux',
  'Regular',
  'Saver',
  'Super Saver',
]);
const seatNumber = z.number().int().min(1).max(999);
export const duoPlanSchema = z.strictObject({
  version: z.literal(1),
  source: z.literal('OWNER_VISIBLE_PAGE'),
  state: z.literal('NOT_BOOKED'),
  observedAt: z.number().int().positive(),
  showing: z.strictObject({
    movie: label,
    cinema: label,
    date: z.iso.date(),
    time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    hall: z.string().regex(/^Zaal [1-9]\d{0,2}(?: Dolby Cinema)?$/),
  }),
  pair: z
    .strictObject({
      row: seatNumber,
      A: seatNumber,
      B: seatNumber,
      categories: z.tuple([duoCategorySchema, duoCategorySchema]),
    })
    .refine((pair) => Math.abs(pair.A - pair.B) === 1),
});
export type DuoPlan = z.infer<typeof duoPlanSchema>;
export const duoStatusSchema = z.enum([
  'DUO_MATCH_POSSIBLE',
  'MISMATCH_SHOWING',
  'PAIR_UNAVAILABLE',
  'UNKNOWN_STOP',
]);
export type DuoStatus = z.infer<typeof duoStatusSchema>;
export const duoStatusLabels: Record<DuoStatus, string> = {
  DUO_MATCH_POSSIBLE:
    'Mogelijk passend: exact dit paar is nu beschikbaar en naast elkaar. Controleer zelf op Vue.',
  MISMATCH_SHOWING:
    'STOP — voorstelling wijkt af. Vergelijk film, bioscoop, datum, tijd en zaal.',
  PAIR_UNAVAILABLE:
    'STOP — minstens één stoel is niet beschikbaar. Dit zegt niets over een eventuele eerdere eigen aankoop.',
  UNKNOWN_STOP:
    'STOP — plan verlopen, gegevens onduidelijk of paar niet veilig vastgesteld. Vraag een verse overdracht.',
};
export function validateDuoPlan(raw: unknown, now = Date.now()): DuoPlan {
  const plan = duoPlanSchema.parse(raw);
  if (
    !Number.isFinite(now) ||
    now < plan.observedAt ||
    now - plan.observedAt >= DUO_TTL_MS
  )
    throw new Error('STOP — duo-plan verlopen of klok onduidelijk.');
  return plan;
}
export function formatDuoPlan(raw: unknown, now = Date.now()): string {
  const text = prefix + JSON.stringify(validateDuoPlan(raw, now), null, 2);
  if (text.length > 700)
    throw new Error('STOP — duo-plan langer dan 700 tekens.');
  return text;
}
export function parseDuoPlan(text: string, now = Date.now()): DuoPlan {
  if (typeof text !== 'string' || text.length > 700 || !text.startsWith(prefix))
    throw new Error('STOP — ongeldig duo-plan.');
  const plan = validateDuoPlan(JSON.parse(text.slice(prefix.length)), now);
  // Canonical contract also rejects duplicate JSON keys, extra text and hidden fields.
  if (formatDuoPlan(plan, now) !== text)
    throw new Error('STOP — duo-plan gewijzigd of ongeldig.');
  return plan;
}
