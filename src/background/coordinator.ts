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

export class Coordinator {
  sessions = emptySessions();
  mode: Mode = 'MANUAL';
  reset(): void {
    this.sessions = emptySessions();
    this.mode = 'MANUAL';
  }
  demo(scenario: Scenario, now: number): void {
    this.reset();
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
      session.evidence = 'NONE';
      return false;
    }
    session.observation = structuredClone(observation);
    session.lastObservedAt = observation.observedAt;
    session.evidence = 'SIMULATION';
    return true;
  }
  snapshot(now: number, incognitoAllowed: boolean) {
    if (!incognitoAllowed && this.mode === 'FIXTURE')
      this.sessions.B = emptySessions().B;
    for (const role of roles)
      if (!fresh(this.sessions[role].observation, now)) {
        this.sessions[role].observation = null;
        this.sessions[role].evidence = 'NONE';
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
