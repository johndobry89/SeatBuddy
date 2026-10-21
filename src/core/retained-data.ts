import { z } from 'zod';
import { nicknameSchema } from './buddies';
import { planningSchema } from './manual-assistant';

export const ROSTER_KEY = 'seatbuddies.roster.v1';
export const DRAFT_KEY = 'seatbuddies.draft.v1';
export const DRAFT_TTL_MS = 4 * 60 * 60_000;
// No selected account, demo flags, roles, proof, seats or browser metadata.
export const savedRosterSchema = z
  .strictObject({
    version: z.literal(1),
    roster: z
      .array(z.strictObject({ id: z.uuid(), nickname: nicknameSchema }))
      .max(12),
  })
  .refine(
    ({ roster }) =>
      new Set(roster.map((buddy) => buddy.id)).size === roster.length &&
      new Set(roster.map((buddy) => buddy.nickname.toLocaleLowerCase('nl-NL')))
        .size === roster.length,
  );
export const draftPlanSchema = planningSchema.refine(
  (plan) =>
    [plan.movie, plan.cinema, plan.hall].every(
      (label) =>
        label === null || !/[@\p{Cc}\p{Cf}]|https?:|www\.|\d{5}/u.test(label),
    ),
  'Alleen korte filmgegevens; geen links, accountgegevens of pasnummers.',
);
export const savedDraftSchema = z.strictObject({
  version: z.literal(1),
  createdAt: z.number().int().nonnegative(),
  plan: draftPlanSchema,
});
const gate = { generation: z.uuid(), revision: z.number().int().nonnegative() };
export const rememberCommandSchema = z.strictObject({
  type: z.literal('REMEMBER_BUDDIES'),
  ...gate,
  enabled: z.boolean(),
});
export const draftCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('DRAFT_SAVE'),
    ...gate,
    plan: draftPlanSchema,
  }),
  z.strictObject({ type: z.literal('DRAFT_RESTORE'), ...gate }),
  z.strictObject({ type: z.literal('DRAFT_DELETE'), ...gate }),
]);
export type RememberCommand = z.infer<typeof rememberCommandSchema>;
export function freshDraft(value: unknown, now: number) {
  const parsed = savedDraftSchema.safeParse(value);
  return parsed.success &&
    parsed.data.createdAt <= now &&
    now - parsed.data.createdAt < DRAFT_TTL_MS
    ? parsed.data
    : null;
}
export function boundedRecord(value: unknown) {
  try {
    return JSON.stringify(value).length <= 4096;
  } catch {
    return false;
  }
}
