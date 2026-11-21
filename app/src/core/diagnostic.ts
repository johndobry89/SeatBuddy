import type { CheckResult } from './compare';
import type { Discovery } from './seats';
import { SHOWING_FIELDS, type Observation } from './types';

export const APP_VERSION = '0.12.0-experimental';

/**
 * A report the owner can paste to a developer when a live read fails. Codes
 * and counts only: never titles, cinema, seat numbers, URLs, page text,
 * account, ticket or payment data.
 */
export interface DiagnosticInput {
  phase: 'SEARCH' | 'CHECK';
  failure?: string;
  observation?: Observation;
  discovery?: Discovery;
  check?: CheckResult;
}

export function formatDiagnostic(input: DiagnosticInput): string {
  const { observation, discovery, check } = input;
  const lines = [
    `SeatBuddies Next ${APP_VERSION} · foutrapport`,
    `Fase: ${input.phase === 'SEARCH' ? 'stoelen zoeken' : 'stoelen controleren'}`,
    `Browser: ${input.failure ?? 'OK'}`,
  ];
  if (observation) {
    lines.push(
      `Pagina: ${observation.status}`,
      `Voorstelling gelezen: ${SHOWING_FIELDS.map((f) => `${f} ${observation.showing[f] === undefined ? 'nee' : 'ja'}`).join(', ')}`,
    );
    const map = observation.map;
    if (map) {
      const seats = map.rows.flat();
      const count = (test: (s: (typeof seats)[number]) => boolean) => seats.filter(test).length;
      lines.push(
        `Stoelkaart: ${map.status} · schema ${map.scheme ?? 'onbekend'} · rijen ${map.rows.length} · stoelen ${seats.length} · schermkop ${map.screen ? 'ja' : 'nee'}`,
        `Stoelen: vrij ${count((s) => s.state === 'available')} · bezet ${count((s) => s.state === 'unavailable')} · geselecteerd ${count((s) => s.state === 'picked')} · onbekend ${count((s) => s.state === 'unknown')}`,
        `Soort: vrij zonder soort ${count((s) => s.state === 'available' && s.category === null)} · Ultra Lux ${count((s) => s.category === 'Ultra Lux')} · speciaal ${count((s) => s.special)} · zonder layout ${count((s) => s.rect === null)}`,
        `Randen: gat ${count((s) => s.after === 'GAP')} · gemarkeerd ${count((s) => s.after === 'MARKED' || s.before === 'MARKED')}`,
      );
    } else lines.push('Stoelkaart: niet gelezen');
  }
  if (discovery)
    lines.push(`Paren: ${discovery.pairs.length} · volgorde ${discovery.mode} · overgeslagen door buffer ${discovery.bufferRejected}`);
  if (check) lines.push(`Controle: ${check.kind}${'reason' in check ? `:${check.reason}` : ''}${check.kind === 'OTHER_SHOWING' ? `:${check.differences.join('+')}` : ''}`);
  lines.push('Bevat geen filmtitel, bioscoop, stoelnummers, account-, ticket- of betaalgegevens.');
  return lines.join('\n');
}
