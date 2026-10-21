import { expect } from 'vitest';
import type { Coordinator } from '../../src/background/coordinator';
import {
  applyManual,
  type ManualCommand,
  type ManualState,
} from '../../src/core/manual-assistant';
export function workflow(c: Coordinator, command: ManualCommand) {
  return {
    type: 'WORKFLOW' as const,
    generation: c.generation,
    revision: c.manual.revision,
    buddyEpoch: c.buddyEpoch,
    command,
  };
}
/** Explicit fictional preflight setup for legacy two-person scenarios. */
export function review(state: ManualState, now: number, allowed = true) {
  expect(
    applyManual(state, { type: 'REVIEW_PLAN' }, now, [], allowed),
  ).toBeNull();
}
export function seats(state: ManualState, now: number) {
  for (const role of ['A', 'B'] as const)
    expect(
      applyManual(
        state,
        {
          type: 'MANUAL_DETAILS',
          role,
          showtime: state.plan!,
          seat: { row: 'F', number: role === 'A' ? '10' : '11' },
        },
        now,
        [],
        true,
      ),
    ).toBeNull();
}
