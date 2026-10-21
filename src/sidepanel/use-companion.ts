import { ref } from 'vue';
import { sendRuntime } from '../chrome/messaging';
import { Coordinator, type Snapshot } from '../background/coordinator';
import { panelReplySchema, type PanelCommand } from '../privacy/protocol';
import { manualCommandSchema } from '../core/manual-assistant';

async function send(message: PanelCommand) {
  return panelReplySchema.parse(await sendRuntime(message));
}
export function useCompanion() {
  const snapshot = ref<Snapshot | null>(null);
  const offline = ref(false);
  const error = ref('');
  const busy = ref(false);
  const lifecycleNotice = ref('');
  const local = new Coordinator();
  function disconnect() {
    offline.value = true;
    local.reset();
    snapshot.value = local.snapshot(Date.now(), false);
    lifecycleNotice.value = '';
    error.value =
      'Browserverbinding niet beschikbaar. Status UNKNOWN; eerdere voortgang is vervallen. De assistent werkt nu alleen tijdelijk in dit paneel.';
  }
  // A deliberate user action discards both local and worker drafts. No failed
  // PLAN/ACKNOWLEDGE is queued, merged or replayed after a transport failure.
  async function reconnect() {
    if (busy.value || !offline.value) return false;
    busy.value = true;
    try {
      const reply = await send({ type: 'RESET' });
      if (!reply.ok) throw new Error('Unavailable');
      local.reset();
      snapshot.value = reply.state;
      offline.value = false;
      error.value = '';
      lifecycleNotice.value =
        'Browserverbinding hersteld. Tijdelijke gegevens zijn gewist; vul het filmplan opnieuw in en controleer A en B zelf.';
      return true;
    } catch {
      // Keep the user's local draft if a reconnect attempt is unsuccessful.
      error.value =
        'Opnieuw verbinden is niet gelukt. Je kunt lokaal verder; heropen of herlaad de extensie via chrome://extensions.';
      return false;
    } finally {
      busy.value = false;
    }
  }
  async function command(message: PanelCommand) {
    if (busy.value) return false;
    busy.value = true;
    try {
      if (offline.value) {
        const parsed = manualCommandSchema.safeParse(message);
        if (parsed.success) {
          const problem = local.manualCommand(
            parsed.data,
            Date.now(),
            [],
            false,
          );
          if (problem) {
            error.value = problem;
            return false;
          }
        } else if (message.type === 'RESET') local.reset();
        else if (!['GET_STATE', 'MANUAL_MODE'].includes(message.type)) {
          error.value =
            'Deze browserfunctie is niet beschikbaar. De handmatige assistent werkt wel.';
          return false;
        }
        snapshot.value = local.snapshot(Date.now(), false);
        error.value = '';
        return true;
      }
      const reply = await send(message);
      if (!reply.ok) {
        if (reply.code === 'BROWSER_UNAVAILABLE') throw new Error(reply.error);
        error.value = reply.error;
        return false;
      }
      if (
        snapshot.value &&
        snapshot.value.generation !== reply.state.generation
      )
        lifecycleNotice.value =
          'Chrome-coördinator opnieuw gestart. Eerdere voortgang en koppelingen zijn vervallen; controleer je filmplan en A/B-stappen opnieuw. Er is niets automatisch uitgevoerd.';
      snapshot.value = reply.state;
      if (message.type === 'PLAN' || message.type === 'RESET')
        lifecycleNotice.value = '';
      if (message.type !== 'GET_STATE') error.value = '';
      return true;
    } catch {
      disconnect();
      return false;
    } finally {
      busy.value = false;
    }
  }
  return {
    snapshot,
    offline,
    error,
    busy,
    lifecycleNotice,
    command,
    reconnect,
  };
}
