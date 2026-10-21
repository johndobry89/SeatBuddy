import { onMounted, ref } from 'vue';

/** Resolve the window before the click; open() itself runs in the user gesture. */
export function usePanelLauncher() {
  const ready = ref(false);
  const error = ref('');
  const opened = ref(false);
  let windowId: number | undefined;
  onMounted(async () => {
    try {
      const current = await chrome.windows.getCurrent();
      if (
        current.id === undefined ||
        typeof chrome.sidePanel?.open !== 'function'
      )
        throw new Error('Unavailable');
      windowId = current.id;
      ready.value = true;
    } catch {
      error.value =
        'Zijpaneel niet beschikbaar. Gebruik Chrome 116+ in een normaal, toegestaan venster. Open SeatBuddies via het Chrome-zijpaneelmenu of herlaad de extensie.';
    }
  });
  async function open() {
    error.value = '';
    opened.value = false;
    if (windowId === undefined || !ready.value) {
      error.value =
        'Open de boekingsassistent via het Chrome-zijpaneelmenu in een normaal venster; controleer browserondersteuning en beleid.';
      return;
    }
    try {
      // Do not await messaging, tab queries or window lookup before this call.
      await chrome.sidePanel.open({ windowId });
      opened.value = true;
    } catch {
      error.value =
        'Chrome kon het zijpaneel niet openen. Probeer het Chrome-zijpaneelmenu in een normaal venster of herlaad SeatBuddies. Je gegevens worden niet automatisch herhaald.';
    }
  }
  return { ready, error, opened, open };
}
