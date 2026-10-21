import { ref } from 'vue';
import { popupReplySchema } from '../privacy/protocol';
import { sendRuntime } from '../chrome/messaging';
import type { BuddyMutation, BuddyView } from '../core/buddies';

export function useBuddies() {
  const state = ref<BuddyView | null>(null);
  const error = ref('');
  const notice = ref('');
  const busy = ref(false);
  async function load(
    message: BuddyMutation | { type: 'BUDDY_READ' } = { type: 'BUDDY_READ' },
  ) {
    if (busy.value) return;
    busy.value = true;
    try {
      const result = popupReplySchema.parse(await sendRuntime(message));
      if (!result.ok) {
        error.value = result.error;
        // Refresh only. Never retry the mutation on stale/new-worker state.
        if (result.code === 'STALE_BUDDY') {
          const current = popupReplySchema.parse(
            await sendRuntime({ type: 'BUDDY_READ' }),
          );
          state.value = current.ok ? current.buddy : null;
        }
        return;
      }
      if (state.value && state.value.generation !== result.buddy.generation)
        notice.value =
          'Opnieuw gestart: tijdelijke buddy’s en voortgang zijn vervallen. Kies bewust opnieuw.';
      state.value = result.buddy;
      if (message.type !== 'BUDDY_READ') error.value = '';
    } catch {
      state.value = null;
      error.value =
        'Browserverbinding niet beschikbaar. Heropen of herlaad SeatBuddies; er wordt niets automatisch herhaald. De handmatige assistent blijft een aparte route.';
    } finally {
      busy.value = false;
    }
  }
  return { state, error, notice, busy, load };
}
