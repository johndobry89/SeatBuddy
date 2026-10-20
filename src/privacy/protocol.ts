import { z } from 'zod';
import { observationSchema, roleSchema, scenarioSchema } from '../core/types';

// Strict schemas reject extra fields (including claimed tab IDs, credentials and live evidence).
export const panelCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('GET_STATE') }),
  z.strictObject({ type: z.literal('RESET') }),
  z.strictObject({ type: z.literal('DEMO_STEP'), role: roleSchema }),
  z.strictObject({ type: z.literal('DEMO'), scenario: scenarioSchema }),
]);
export const fixtureCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('BIND'), role: roleSchema }),
  z.strictObject({
    type: z.literal('OBSERVE'),
    observation: observationSchema,
  }),
]);
export type PanelCommand = z.infer<typeof panelCommandSchema>;
export type FixtureCommand = z.infer<typeof fixtureCommandSchema>;
export function boundedPayload(value: unknown): boolean {
  try {
    return JSON.stringify(value).length <= 2048;
  } catch {
    return false;
  }
}

const bindingSchema = z.strictObject({
  tabId: z.number().int(),
  windowId: z.number().int(),
  incognito: z.boolean(),
  documentId: z.string(),
});
const sessionSchema = z.strictObject({
  role: roleSchema,
  binding: bindingSchema.nullable(),
  observation: observationSchema.nullable(),
  lastObservedAt: z.number().int().nonnegative().nullable(),
  evidence: z.enum(['NONE', 'SIMULATION']),
});
export const snapshotSchema = z.strictObject({
  mode: z.enum(['MANUAL', 'DEMO', 'FIXTURE']),
  sessions: z.strictObject({ A: sessionSchema, B: sessionSchema }),
  match: z.enum(['MATCH', 'MISMATCH', 'UNKNOWN']),
  adjacency: z.enum(['MOCK_ADJACENT', 'NOT_ADJACENT', 'UNKNOWN']),
  nextStep: z.string(),
  incognitoAllowed: z.boolean(),
});
export const panelReplySchema = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true), state: snapshotSchema }),
  z.strictObject({ ok: z.literal(false), error: z.string() }),
]);
export const fixtureReplySchema = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true) }),
  z.strictObject({ ok: z.literal(false), error: z.string() }),
]);
