import {
  emptyManual,
  applyManual,
  expireManual,
  type ManualCommand,
  type BrowserContext,
} from '../core/manual-assistant';
import {
  emptySessions,
  fresh,
  roles,
  type Binding,
  type Mode,
  type Observation,
  type Scenario,
  type Role,
} from '../core/types';
import { matchShowtimes } from '../core/showtime-matcher';
import { adjacent } from '../core/seats';
import { scenarioObservations } from '../fixtures/data';
import { boundRole } from './session-registry';
import { roleEvidence } from '../core/evidence';
import { emptyRetention } from '../core/retention-status';
import {
  applyBuddy,
  changesSelectedBuddy,
  emptyBuddies,
  type BuddyMutation,
} from '../core/buddies';

export class Coordinator {
  readonly generation: string = crypto.randomUUID();
  sessions = emptySessions();
  manual = emptyManual();
  contextChoices: BrowserContext[] = [];
  mode: Mode = 'MANUAL';
  buddy = emptyBuddies();
  resetVersion = 0;
  buddyEpoch = 0;
  retention = emptyRetention();
  buddyView() {
    return structuredClone({
      ...this.buddy,
      generation: this.generation,
      retention: this.retention,
    });
  }
  buddyCommand(command: BuddyMutation) {
    if (
      command.generation !== this.generation ||
      command.revision !== this.buddy.revision
    )
      return {
        ok: false as const,
        code: 'STALE_BUDDY' as const,
        error:
          'Buddygegevens zijn gewijzigd of opnieuw gestart. Vernieuw de lijst en kies bewust opnieuw.',
      };
    const affectsB = changesSelectedBuddy(this.buddy, command.action);
    if (affectsB && !command.resetB)
      return {
        ok: false as const,
        code: 'BUDDY_REVIEW' as const,
        error:
          'Bevestig eerst dat B opnieuw moet controleren. A blijft ongewijzigd.',
      };
    const error = applyBuddy(this.buddy, command.action);
    if (error) return { ok: false as const, error };
    if (affectsB) {
      this.buddyEpoch++;
      this.manual.tracks.B = emptyManual().tracks.B;
      this.manual.tracks.B.problem = 'BUDDY_CHANGED';
      this.sessions.B = emptySessions().B;
    }
    return { ok: true as const };
  }
  reset(): void {
    this.buddyEpoch++;
    this.resetVersion++;
    this.buddy = emptyBuddies(this.buddy.revision + 1);
    this.sessions = emptySessions();
    this.mode = 'MANUAL';
    this.manual = emptyManual();
    this.contextChoices = [];
  }
  manualCommand(
    command: ManualCommand,
    now: number,
    contexts: BrowserContext[],
    allowed: boolean,
  ) {
    const error = applyManual(this.manual, command, now, contexts, allowed);
    if (!error) {
      this.mode = 'MANUAL';
      this.sessions = emptySessions();
    }
    return error;
  }
  demo(scenario: Scenario, now: number): void {
    this.sessions = emptySessions();
    this.mode = 'DEMO';
    const observations = scenarioObservations(scenario, now);
    for (const role of roles)
      this.sessions[role] = {
        role,
        binding: null,
        observation: observations[role],
        lastObservedAt: observations[role].observedAt,
        evidence: 'SIMULATION',
      };
  }
  advanceDemo(role: Role, now: number): boolean {
    const observation = this.sessions[role].observation;
    if (this.mode !== 'DEMO' || !fresh(observation, now)) return false;
    if (
      observation.status !== 'SELECTED' &&
      observation.status !== 'REVIEW_REQUIRED'
    )
      return false;
    observation.status =
      observation.status === 'SELECTED'
        ? 'REVIEW_REQUIRED'
        : 'SIMULATED_COMPLETE';
    observation.observedAt = now;
    this.sessions[role].lastObservedAt = now;
    return true;
  }
  observe(binding: Binding, observation: Observation, now: number): boolean {
    const role = boundRole(this.sessions, binding);
    if (this.mode !== 'FIXTURE' || !role) return false;
    const session = this.sessions[role];
    if (
      !fresh(observation, now) ||
      (session.lastObservedAt !== null &&
        observation.observedAt <= session.lastObservedAt)
    ) {
      session.observation = null;
      session.evidence = 'UNKNOWN';
      return false;
    }
    session.observation = structuredClone(observation);
    session.lastObservedAt = observation.observedAt;
    session.evidence = 'SIMULATION';
    return true;
  }
  snapshot(
    now: number,
    incognitoAllowed: boolean,
    contexts: BrowserContext[] = this.contextChoices,
  ) {
    expireManual(this.manual, now, incognitoAllowed);
    if (!incognitoAllowed)
      this.contextChoices = this.contextChoices.filter(
        (context) => !context.incognito,
      );
    if (!incognitoAllowed && this.mode === 'FIXTURE')
      this.sessions.B = emptySessions().B;
    for (const role of roles)
      if (!fresh(this.sessions[role].observation, now)) {
        this.sessions[role].observation = null;
        this.sessions[role].evidence = 'UNKNOWN';
      }
    const A = this.sessions.A.observation;
    const B = this.sessions.B.observation;
    const match = matchShowtimes(A?.showtime ?? null, B?.showtime ?? null);
    const adjacency =
      match === 'MATCH' &&
      A?.seat?.hall === A?.showtime.hall &&
      B?.seat?.hall === B?.showtime.hall
        ? adjacent(A?.seat ?? null, B?.seat ?? null)
        : 'UNKNOWN';
    const nextStep =
      this.mode === 'MANUAL'
        ? 'Volg de handmatige checklist per persoon; er is geen live detectie.'
        : !A || !B
          ? 'Observeer beide fictieve sessies opnieuw; ontbrekende of verlopen status is UNKNOWN.'
          : match !== 'MATCH'
            ? 'Stop en vergelijk bioscoop, film, datum, tijd en zaal per persoon.'
            : A.status === 'FAILED' || B.status === 'FAILED'
              ? 'Partiële simulatie: controleer A en B apart. Er wordt niets herhaald of teruggedraaid.'
              : adjacency !== 'MOCK_ADJACENT'
                ? 'Controleer stoelen en gangpad handmatig; aangrenzendheid is niet aangetoond.'
                : 'Vergelijk A en B afzonderlijk. Dit is alleen een simulatie, geen reservering of seat hold.';
    return structuredClone({
      generation: this.generation,
      resetVersion: this.resetVersion,
      buddyEpoch: this.buddyEpoch,
      buddy: this.buddy,
      retention: this.retention,
      evidence: {
        A: roleEvidence(this.manual, this.sessions, 'A'),
        B: roleEvidence(this.manual, this.sessions, 'B'),
      },
      manual: this.manual,
      contexts: contexts.filter(
        (context) => !context.incognito || incognitoAllowed,
      ),
      mode: this.mode,
      sessions: this.sessions,
      match,
      adjacency,
      nextStep,
      incognitoAllowed,
    });
  }
}
export type Snapshot = ReturnType<Coordinator['snapshot']>;
