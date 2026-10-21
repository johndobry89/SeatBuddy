import type { Coordinator } from './coordinator';
import {
  ROSTER_KEY,
  DRAFT_KEY,
  DRAFT_TTL_MS,
  savedRosterSchema,
  freshDraft,
  boundedRecord,
  rememberCommandSchema,
  draftCommandSchema,
} from '../core/retained-data';

export interface StorageArea {
  setAccessLevel(options: { accessLevel: 'TRUSTED_CONTEXTS' }): Promise<void>;
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}
export interface StoragePort {
  local: StorageArea;
  session: StorageArea;
}
type CoreReply = { ok: boolean; error?: string };
const failed = (error: string) => ({
  ok: false as const,
  code: 'STORAGE_FAILURE' as const,
  error,
});

/** One worker owns these keys. All hydration and writes share one bounded queue. */
export class RetainedData {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = 0;
  private loaded = false;
  private consent: boolean | null = null;
  private sessionProtected = false;
  constructor(
    private readonly c: Coordinator,
    private readonly port?: StoragePort,
  ) {}

  private async load(
    now: number,
    restoreRoster: boolean,
    obsolete: () => boolean,
  ) {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.port) return;
    try {
      await this.port.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
      const value = (await this.port.local.get(ROSTER_KEY))[ROSTER_KEY];
      this.c.retention.available = true;
      if (value !== undefined) {
        const parsed = boundedRecord(value)
          ? savedRosterSchema.safeParse(value)
          : null;
        if (parsed?.success) {
          if (restoreRoster && !obsolete())
            this.c.buddy = {
              roster: parsed.data.roster.map((buddy) => ({
                ...buddy,
                demo: false,
              })),
              selectedId: null,
              revision: this.c.buddy.revision + 1,
            };
          // A stored nickname is never a selected/account context or prior proof.
          this.c.retention.mode = 'REMEMBERED';
          this.c.retention.notice =
            'Bijnamen lokaal onthouden. Kies opnieuw een buddy; A/B-controles zijn niet hersteld.';
        } else {
          await this.port.local.remove(ROSTER_KEY);
          this.c.retention.notice =
            'Ongeldige opgeslagen lijst verwijderd. Buddy’s blijven tijdelijk.';
        }
      } else
        this.c.retention.notice =
          'Tijdelijke modus. Onthouden staat uit; er wordt geen lijst opgeslagen.';
    } catch {
      this.c.retention.available = false;
      this.c.retention.mode = 'UNAVAILABLE';
      this.c.retention.notice =
        'Opgeslagen bijnamen niet toegankelijk. Onthouden/verwijderen niet bevestigd; gebruik tijdelijke buddy’s. Verwijderen van de extensie wist lokale opslag.';
    }
    try {
      await this.port.session.setAccessLevel({
        accessLevel: 'TRUSTED_CONTEXTS',
      });
      this.sessionProtected = true;
      this.c.retention.draftSupported = true;
      await this.readDraft(now);
    } catch {
      this.c.retention.draftSupported = false;
      this.c.retention.draftExpiresAt = null;
    }
  }
  private async readDraft(now: number) {
    const value = (await this.port!.session.get(DRAFT_KEY))[DRAFT_KEY];
    const draft = boundedRecord(value) ? freshDraft(value, now) : null;
    if (value !== undefined && !draft)
      await this.port!.session.remove(DRAFT_KEY);
    this.c.retention.draftExpiresAt = draft
      ? draft.createdAt + DRAFT_TTL_MS
      : null;
    return draft;
  }
  private async deleteDraft() {
    if (this.port) {
      if (!this.sessionProtected) {
        await this.port.session.setAccessLevel({
          accessLevel: 'TRUSTED_CONTEXTS',
        });
        this.sessionProtected = true;
      }
      await this.port.session.remove(DRAFT_KEY);
    }
    this.c.retention.draftExpiresAt = null;
  }
  private async forget() {
    if (!this.c.retention.available) throw new Error('Storage unavailable');
    await this.port!.local.remove(ROSTER_KEY);
    this.c.retention.mode = 'TEMPORARY';
    await this.deleteDraft();
    this.c.retention.notice =
      'Opgeslagen buddies en concept verwijderd. Huidige bijnamen zijn alleen tijdelijk.';
  }
  private async writeRoster() {
    const record = savedRosterSchema.parse({
      version: 1,
      roster: this.c.buddy.roster
        .filter((buddy) => !buddy.demo)
        .map(({ id, nickname }) => ({ id, nickname })),
    });
    await this.port!.local.set({ [ROSTER_KEY]: record });
  }
  execute<T extends CoreReply>(
    raw: unknown,
    now: number,
    allowed: boolean,
    core: () => T,
    read: () => T,
    obsolete: () => boolean,
  ): Promise<
    | T
    | ReturnType<typeof failed>
    | { ok: false; code: 'STALE_BUDDY'; error: string }
    | (T & {
        restoredDraft: NonNullable<ReturnType<typeof freshDraft>>['plan'];
      })
  > {
    if (this.pending >= 32)
      return Promise.resolve(
        failed(
          'Te veel opdrachten. Wacht en vernieuw bewust; er wordt niets herhaald.',
        ),
      );
    this.pending++;
    const operation = this.tail
      .then(async () => {
        const isReset =
          typeof raw === 'object' &&
          raw !== null &&
          'type' in raw &&
          raw.type === 'RESET';
        await this.load(now, !isReset, obsolete);
        const stale = () => ({
          ok: false as const,
          code: 'STALE_BUDDY' as const,
          error:
            'Opdracht vervallen. Vernieuw de actuele toestand en kies bewust opnieuw.',
        });
        if (obsolete()) return stale();
        if (this.consent !== null && this.consent !== allowed)
          await this.deleteDraft();
        this.consent = allowed;
        const remember = rememberCommandSchema.safeParse(raw);
        const draft = draftCommandSchema.safeParse(raw);
        if (
          this.c.retention.mode === 'REMEMBERED' &&
          typeof raw === 'object' &&
          raw &&
          'action' in raw &&
          typeof raw.action === 'object' &&
          raw.action &&
          'kind' in raw.action &&
          raw.action.kind === 'DEMO'
        )
          return failed(
            'Zet onthouden uit voordat je de tijdelijke DEMO-lijst laadt.',
          );
        const gated = remember.success
          ? remember.data
          : draft.success
            ? draft.data
            : null;
        if (
          gated &&
          (gated.generation !== this.c.generation ||
            (gated.revision !== this.c.buddy.revision &&
              !(remember.success && !remember.data.enabled)))
        )
          return stale();
        if (remember.success) {
          if (!this.c.retention.available)
            return failed(this.c.retention.notice);
          if (remember.data.enabled) {
            if (this.c.buddy.roster.some((buddy) => buddy.demo))
              return failed(
                'DEMO-buddies blijven tijdelijk. Voeg zelf een fictieve bijnaam toe om onthouden te testen.',
              );
            await this.writeRoster();
            this.c.retention.mode = 'REMEMBERED';
            this.c.retention.notice =
              'Alleen bijnamen op dit apparaat onthouden. Chrome-opslag is niet standaard versleuteld; geen accounts of controles opgeslagen.';
          } else await this.forget();
          this.c.buddy.revision++;
        }
        let restoredDraft:
          NonNullable<ReturnType<typeof freshDraft>>['plan'] | undefined;
        if (draft.success) {
          if (!this.c.retention.draftSupported)
            return failed(
              'Tijdelijk concept niet beschikbaar. Handmatig plannen blijft werken.',
            );
          if (draft.data.type === 'DRAFT_SAVE') {
            await this.port!.session.set({
              [DRAFT_KEY]: {
                version: 1,
                createdAt: now,
                plan: draft.data.plan,
              },
            });
            this.c.retention.draftExpiresAt = now + DRAFT_TTL_MS;
          } else if (draft.data.type === 'DRAFT_DELETE')
            await this.deleteDraft();
          else {
            const value = await this.readDraft(now);
            if (!value)
              return failed(
                'Concept ontbreekt of is verlopen. Vul het filmplan opnieuw in.',
              );
            restoredDraft = value.plan;
          }
          this.c.buddy.revision++;
        } else if (
          this.c.retention.draftExpiresAt !== null &&
          this.c.retention.draftExpiresAt <= now
        )
          await this.deleteDraft();
        if (obsolete()) return stale();
        const result = core();
        if (result.ok && typeof raw === 'object' && raw && 'type' in raw) {
          if (raw.type === 'RESET') {
            if (this.c.retention.available) await this.forget();
            else {
              await this.deleteDraft();
              if (this.c.retention.mode === 'UNAVAILABLE')
                return failed(this.c.retention.notice);
            }
          } else if (
            raw.type === 'BUDDY_MUTATE' &&
            this.c.retention.mode === 'REMEMBERED'
          ) {
            if (this.c.buddy.roster.length) await this.writeRoster();
            else await this.forget();
          }
        }
        if (obsolete()) return stale();
        // Read replies after storage effects, never return a pre-write snapshot.
        const reply = result.ok ? read() : result;
        return restoredDraft ? { ...reply, restoredDraft } : reply;
      })
      .catch(async () => {
        try {
          if (!this.c.retention.available)
            throw new Error('Deletion cannot be verified');
          await this.forget();
          this.c.retention.notice =
            'Opslaan mislukt; opgeslagen buddies/concept verwijderd. Wijzigingen zijn alleen tijdelijk. Controleer de actuele lijst.';
        } catch {
          this.c.retention.mode = 'UNAVAILABLE';
          this.c.retention.available = false;
          this.c.retention.notice =
            'Opslagactie mislukt; verwijderen niet bevestigd. Verwijder de extensie om lokale gegevens te wissen. Handmatige modus blijft bruikbaar.';
        }
        return failed(this.c.retention.notice);
      })
      .finally(() => {
        this.pending--;
      });
    this.tail = operation.then(() => undefined);
    return operation;
  }
}
