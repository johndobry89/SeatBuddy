import { resultSchema } from './vue-page-reader';

export const experimentVersion = '0.11.4-experimental';
const sources = {
  VISIBLE_MAIN_METADATA: 'Zichtbare metadata',
  VISIBLE_QUICK_TICKET: 'Quick Ticket',
  VISIBLE_BOOKING_HERO: 'Booking Hero',
};
const labels = {
  movie: 'Film',
  cinema: 'Bioscoop',
  date: 'Datum',
  time: 'Tijd',
  hall: 'Zaal',
};
const refusal = () =>
  new Error('Rapport niet beschikbaar: gegevens niet veilig of geldig.');

/** Only validated observation fields and enums, never DOM, storage or browser URLs. */
export function formatReadReport(raw: unknown): string {
  const parsed = resultSchema.safeParse(raw);
  if (!parsed.success || parsed.data.reason === 'PROTECTED_PAGE')
    throw refusal();
  const result = parsed.data;
  for (const field of Object.values(result.fields)) {
    if (
      field.value &&
      (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]|@|[<>\\]|(?:[a-z][a-z0-9+.-]*:\/\/)|(?:https?|ftp|file|data|blob|javascript|chrome-extension):|www\.|(?:\b[a-z0-9-]+\.)+[a-z]{2,24}\b|(?:^|\s)\/[a-z0-9]/iu.test(
        field.value,
      ) ||
        /(?:token|secret|password|wachtwoord|movie\s*pass|pasnummer|username|gebruikersnaam|credential|login|account|order|booking|session|cookie|bearer|pin|card|kaartnummer|email|e-mail)(?:\b|[_:=])/i.test(
          field.value,
        ) ||
        /[A-Za-z0-9_-]{24,}|\d{7}/.test(field.value))
    )
      throw refusal();
  }
  const time = new Date(result.observedAt);
  if (!Number.isFinite(time.getTime())) throw refusal();
  const lines = [
    `SeatBuddies ${experimentVersion}`,
    `Waargenomen (lokale tijd): ${time.toLocaleString('nl-NL', { hour12: false })}`,
    `Bron: ${sources[result.screenScope]}`,
    ...Object.entries(labels).map(
      ([key, label]) =>
        `${label}: ${result.fields[key as keyof typeof labels].value ?? 'ONBEKEND'}`,
    ),
  ];
  const seats = result.seats;
  lines.push(`Schematype: ${seats?.scheme ?? 'UNKNOWN'}`);
  if (seats?.counts) {
    const c = seats.counts;
    lines.push(
      `Stoelen: ${c.available} beschikbaar; ${c.unavailable} niet beschikbaar; ${c.picked} geselecteerd; ${c.unknown} onbekend`,
      `Categorie onbekend onder beschikbare stoelen: ${c.categoryUnknownAvailable}`,
      `Ultra Lux herkend onder beschikbare stoelen: ${c.ultraLuxAvailable} (geen bewijs van afwezigheid)`,
    );
  } else
    lines.push(
      'Stoeltellingen: ONBEKEND',
      'Categorie onbekend onder beschikbare stoelen: ONBEKEND',
      'Ultra Lux herkend: ONBEKEND',
    );
  lines.push(
    `Categorie-evidence: ${seats?.categoryEvidence ?? 'UNKNOWN'}; diagnose: ${seats?.diagnostic ?? 'UNKNOWN'}`,
  );
  if (seats?.pairs.length)
    for (const pair of seats.pairs) {
      lines.push(
        `Mogelijk naast elkaar: rij ${pair.row}, ${pair.seats.join(' + ')} (${pair.categories.join(' / ')}); controleer op Vue`,
      );
    }
  else lines.push('GEEN BETROUWBAAR PAAR');
  lines.push(
    'Momentopname; wijzigingen vereisen opnieuw lezen. Geen ticket geboekt/gegarandeerd.',
    'Movie Pass-bijbetaling niet gecontroleerd; bijbetaling per account controleren.',
  );
  const report = lines.join('\n');
  if (report.length > 3000) throw refusal();
  return report;
}
