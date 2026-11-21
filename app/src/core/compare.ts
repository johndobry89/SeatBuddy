import type { Proposal } from './message';
import { evaluate, locate, type Rejection } from './seats';
import { SHOWING_FIELDS, type Observation, type ShowingField } from './types';

/**
 * B's verdict comes only from B's own, current page read. The proposal says
 * which seats to look at; it is never evidence itself. No outcome is a
 * reservation: the best outcome is "free right now, book it yourself".
 */
export type CheckResult =
  | { kind: 'FREE'; row: number; mine: number; theirs: number }
  | { kind: 'PARTNER_SEAT_TAKEN'; row: number; mine: number; theirs: number }
  | { kind: 'MINE_TAKEN'; row: number; mine: number }
  | { kind: 'PARTNER_SEAT_SELECTED_BY_YOU'; row: number; theirs: number }
  | { kind: 'MINE_ALREADY_SELECTED'; row: number; mine: number }
  | { kind: 'OTHER_SHOWING'; differences: ShowingField[] }
  | { kind: 'UNSAFE'; reason: Rejection | 'CATEGORY_CHANGED' }
  | { kind: 'UNKNOWN'; reason: 'PAGE' | 'MAP' | 'SEAT_NOT_FOUND' | 'SEAT_STATE' };

const comparable = (field: ShowingField, value: string) =>
  field === 'date' || field === 'time'
    ? value
    : value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('nl-NL');

export function checkProposal(
  proposal: Proposal,
  observation: Observation,
): CheckResult {
  // Only a complete, unambiguous showing can be compared.
  if (observation.status !== 'OK') {
    return { kind: 'UNKNOWN', reason: 'PAGE' };
  }
  const differences = SHOWING_FIELDS.filter((field) => {
    const seen = observation.showing[field];
    return (
      seen === undefined ||
      comparable(field, seen) !== comparable(field, proposal.showing[field])
    );
  });
  if (differences.length) return { kind: 'OTHER_SHOWING', differences };
  const map = observation.map;
  if (!map || map.status !== 'OK') return { kind: 'UNKNOWN', reason: 'MAP' };

  const mineAt = locate(map, proposal.row, proposal.receiver);
  const theirsAt = locate(map, proposal.row, proposal.sender);
  if (!mineAt || !theirsAt) return { kind: 'UNKNOWN', reason: 'SEAT_NOT_FOUND' };
  const mine = map.rows[mineAt.rowIndex]![mineAt.index]!;
  const theirs = map.rows[theirsAt.rowIndex]![theirsAt.index]!;
  if (mine.state === 'unknown' || theirs.state === 'unknown')
    return { kind: 'UNKNOWN', reason: 'SEAT_STATE' };
  const row = proposal.row;
  if (mine.state === 'unavailable')
    return { kind: 'MINE_TAKEN', row, mine: proposal.receiver };
  // A selected seat shows no category icon, so it cannot be re-verified.
  if (mine.state === 'picked')
    return { kind: 'MINE_ALREADY_SELECTED', row, mine: proposal.receiver };
  if (theirs.state === 'picked')
    return { kind: 'PARTNER_SEAT_SELECTED_BY_YOU', row, theirs: proposal.sender };

  // Same physical predicate as A's discovery, in DOM order.
  const mineFirst = mineAt.rowIndex === theirsAt.rowIndex && mineAt.index + 1 === theirsAt.index;
  const theirsFirst = mineAt.rowIndex === theirsAt.rowIndex && theirsAt.index + 1 === mineAt.index;
  if (!mineFirst && !theirsFirst) return { kind: 'UNSAFE', reason: 'NOT_ADJACENT' };
  const first = mineFirst ? mineAt : theirsAt;
  const partnerTaken = theirs.state === 'unavailable';
  const result = evaluate(map, first, {
    require: partnerTaken ? (mineFirst ? 'FIRST_ONLY' : 'SECOND_ONLY') : 'BOTH',
  });
  if (!result.ok) return { kind: 'UNSAFE', reason: result.reason };

  const expected = {
    [proposal.sender]: proposal.categories[0],
    [proposal.receiver]: proposal.categories[1],
  };
  if (
    mine.category !== expected[proposal.receiver] ||
    (!partnerTaken && theirs.category !== expected[proposal.sender])
  )
    return { kind: 'UNSAFE', reason: 'CATEGORY_CHANGED' };

  return partnerTaken
    ? { kind: 'PARTNER_SEAT_TAKEN', row, mine: proposal.receiver, theirs: proposal.sender }
    : { kind: 'FREE', row, mine: proposal.receiver, theirs: proposal.sender };
}
