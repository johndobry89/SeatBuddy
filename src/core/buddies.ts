import { z } from 'zod';
import { retentionStatusSchema } from './retention-status';

export const nicknameSchema = z
  .string()
  .transform((value) => value.normalize('NFKC').trim())
  .pipe(
    z
      .string()
      .min(1)
      .max(24)
      .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._'’-]*$/u)
      .refine(
        (value) => /\p{L}/u.test(value) && !/\d{5}/.test(value),
        'Gebruik een korte bijnaam, geen pasnummer of accountgegevens.',
      ),
  );
export const buddySchema = z.strictObject({
  id: z.uuid(),
  nickname: nicknameSchema,
  demo: z.boolean(),
});
export const buddyStateSchema = z.strictObject({
  roster: z.array(buddySchema).max(12),
  selectedId: z.uuid().nullable(),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
export const buddyActionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('ADD'), nickname: nicknameSchema }),
  z.strictObject({
    kind: z.literal('RENAME'),
    id: z.uuid(),
    nickname: nicknameSchema,
  }),
  z.strictObject({ kind: z.literal('REMOVE'), id: z.uuid() }),
  z.strictObject({ kind: z.literal('SELECT'), id: z.uuid().nullable() }),
  z.strictObject({ kind: z.literal('CLEAR') }),
  z.strictObject({ kind: z.literal('DEMO') }),
]);
export const buddyMutationSchema = z.strictObject({
  type: z.literal('BUDDY_MUTATE'),
  generation: z.uuid(),
  revision: buddyStateSchema.shape.revision,
  resetB: z.boolean(),
  action: buddyActionSchema,
});
export const buddyViewSchema = buddyStateSchema.extend({
  generation: z.uuid(),
  retention: retentionStatusSchema,
});
export type BuddyState = z.infer<typeof buddyStateSchema>;
export type BuddyAction = z.infer<typeof buddyActionSchema>;
export type BuddyMutation = z.infer<typeof buddyMutationSchema>;
export type BuddyView = z.infer<typeof buddyViewSchema>;
export function emptyBuddies(revision = 0): BuddyState {
  return { roster: [], selectedId: null, revision };
}
export function selectedBuddy(state: BuddyState) {
  return state.roster.find((buddy) => buddy.id === state.selectedId) ?? null;
}
export function changesSelectedBuddy(
  state: BuddyState,
  action: BuddyAction,
): boolean {
  if (action.kind === 'SELECT') return action.id !== state.selectedId;
  if (action.kind === 'CLEAR') return state.selectedId !== null;
  if (action.kind === 'REMOVE') return action.id === state.selectedId;
  if (action.kind === 'RENAME')
    return (
      action.id === state.selectedId &&
      action.nickname !== selectedBuddy(state)?.nickname
    );
  return false;
}
/** Called only after sender, generation, revision and deliberate reset checks. */
export function applyBuddy(
  state: BuddyState,
  action: BuddyAction,
): string | null {
  const target =
    'id' in action
      ? state.roster.find((buddy) => buddy.id === action.id)
      : undefined;
  if (['REMOVE', 'RENAME'].includes(action.kind) && !target)
    return 'Deze buddy bestaat niet meer. Vernieuw de lijst.';
  if (action.kind === 'SELECT' && action.id !== null && !target)
    return 'Kies een buddy uit de actuele lijst.';
  if (
    (action.kind === 'ADD' || action.kind === 'RENAME') &&
    state.roster.some(
      (buddy) =>
        buddy.id !== (action.kind === 'RENAME' ? action.id : null) &&
        buddy.nickname.toLocaleLowerCase('nl-NL') ===
          action.nickname.toLocaleLowerCase('nl-NL'),
    )
  )
    return 'Deze bijnaam bestaat al. Kies een andere korte bijnaam.';
  if (action.kind === 'ADD') {
    if (state.roster.length >= 12)
      return 'Maximaal twaalf tijdelijke buddy’s. Verwijder eerst een bijnaam.';
    state.roster.push({
      id: crypto.randomUUID(),
      nickname: action.nickname,
      demo: false,
    });
  } else if (action.kind === 'RENAME' && target) {
    target.nickname = action.nickname;
    target.demo = false;
  } else if (action.kind === 'REMOVE') {
    state.roster = state.roster.filter((buddy) => buddy.id !== action.id);
    if (state.selectedId === action.id) state.selectedId = null;
  } else if (action.kind === 'SELECT') state.selectedId = action.id;
  else if (action.kind === 'CLEAR') {
    state.roster = [];
    state.selectedId = null;
  } else if (action.kind === 'DEMO') {
    if (state.roster.length)
      return 'Wis de lijst eerst als je de fictieve voorbeelden wilt proberen.';
    state.roster = ['Sanne', 'Mark'].map((nickname) => ({
      id: crypto.randomUUID(),
      nickname,
      demo: true,
    }));
  }
  state.revision++;
  return null;
}
