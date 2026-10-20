import { ref } from 'vue';
import { Coordinator, type Snapshot } from '../background/coordinator';
import { panelReplySchema, type PanelCommand } from '../privacy/protocol';
import { manualCommandSchema } from '../core/manual-assistant';

export function useCompanion() {
  const snapshot = ref<Snapshot | null>(null);
  const offline = ref(false);
  const error = ref('');
  const busy = ref(false);
  const local = new Coordinator();
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
      const raw: unknown = await chrome.runtime.sendMessage(message);
      const reply = panelReplySchema.parse(raw);
      if (!reply.ok) {
        if (reply.code === 'BROWSER_UNAVAILABLE') throw new Error(reply.error);
        error.value = reply.error;
        return false;
      }
      snapshot.value = reply.state;
      if (message.type !== 'GET_STATE') error.value = '';
      return true;
    } catch {
      offline.value = true;
      local.reset();
      snapshot.value = local.snapshot(Date.now(), false);
      error.value =
        'Browserverbinding niet beschikbaar. Status UNKNOWN; eerdere voortgang is vervallen. De assistent werkt nu alleen tijdelijk in dit paneel.';
      return false;
    } finally {
      busy.value = false;
    }
  }
  return { snapshot, offline, error, busy, command };
}
