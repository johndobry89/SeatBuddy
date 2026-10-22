import { getCurrentScope, onScopeDispose, ref } from 'vue';
import { popupReplySchema, type PopupCommand } from '../privacy/protocol';
import { sendRuntime } from '../chrome/messaging';
import type { BuddyView } from '../core/buddies';

export function useBuddies() {
  const state = ref<BuddyView | null>(null);
  const error = ref('');
  const notice = ref('');
  const busy = ref(false);
  let operation = 0;
  let reading = false;
  let active = true;
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false;
      operation++;
    });
  async function load(message: PopupCommand = { type: 'BUDDY_READ' }) {
    const read = message.type === 'BUDDY_READ';
    if (!active || busy.value || (read && reading)) return;
    const current = ++operation;
    if (read) reading = true;
    else busy.value = true;
    try {
      const result = popupReplySchema.parse(await sendRuntime(message));
      if (!active || current !== operation) return;
      if (!result.ok) {
        error.value = result.error;
        if (result.code === 'BROWSER_UNAVAILABLE') state.value = null;
        // Refresh only. Never retry the mutation on stale/new-worker state.
        if (result.code === 'STALE_BUDDY') {
          const latest = popupReplySchema.parse(
            await sendRuntime({ type: 'BUDDY_READ' }),
          );
          if (!active || current !== operation) return;
          state.value = latest.ok ? latest.buddy : null;
        }
        return;
      }
      if (state.value && state.value.generation !== result.buddy.generation)
        notice.value =
          'Opnieuw gestart: tijdelijke buddy’s en alle voortgang zijn vervallen. Alleen bewust onthouden bijnamen kunnen terugkomen. Kies bewust opnieuw.';
      state.value = result.buddy;
      if (message.type !== 'BUDDY_READ') error.value = '';
    } catch {
      if (!active || current !== operation) return;
      state.value = null;
      error.value =
        'Browserverbinding niet beschikbaar. Heropen of herlaad SeatBuddies; er wordt niets automatisch herhaald. De handmatige assistent blijft een aparte route.';
    } finally {
      if (active) {
        if (read) reading = false;
        else busy.value = false;
      }
    }
  }
  return { state, error, notice, busy, load };
}
