import { invalidateManualTab } from '../core/manual-assistant';
import { Coordinator } from './coordinator';
import { routeMessage, isPanelSender } from './message-router';
import { panelCommandSchema } from '../privacy/protocol';
import type { BrowserContext } from '../core/manual-assistant';
import { invalidateTab } from './session-registry';

const coordinator = new Coordinator(); // Deliberately memory-only; worker restart means UNKNOWN.
let resetEpoch = 0;
function invalidateContext(
  tabId: number,
  reason: 'NAVIGATED' | 'CLOSED' = 'NAVIGATED',
) {
  invalidateTab(coordinator.sessions, tabId);
  invalidateManualTab(coordinator.manual, tabId, reason);
  coordinator.contextChoices = coordinator.contextChoices.filter(
    (context) => context.tabId !== tabId,
  );
}
chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    const parsed = panelCommandSchema.safeParse(message);
    const privileged = isPanelSender(sender, chrome.runtime.id);
    // Establish a synchronous barrier before any asynchronous Chrome call.
    // Only a validated panel RESET can cancel earlier in-flight commands.
    if (privileged && parsed.success && parsed.data.type === 'RESET') {
      resetEpoch++;
      coordinator.reset();
    }
    const receivedEpoch = resetEpoch;
    const obsolete = () => {
      if (receivedEpoch === resetEpoch) return false;
      sendResponse({
        ok: false,
        error:
          'Opdracht vervallen na wissen. Controleer de actuele toestand opnieuw.',
      });
      return true;
    };
    chrome.extension
      .isAllowedIncognitoAccess()
      .then(async (allowed) => {
        if (obsolete()) return;
        let contexts: BrowserContext[] | undefined;
        if (
          privileged &&
          parsed.success &&
          ['GET_CONTEXTS', 'BIND_CONTEXT'].includes(parsed.data.type)
        ) {
          const tabs = await chrome.tabs.query({ active: true });
          contexts = tabs
            .filter(
              (tab) =>
                tab.id !== undefined &&
                tab.id >= 0 &&
                tab.windowId >= 0 &&
                (!tab.incognito || allowed),
            )
            .slice(0, 100)
            .map((tab) => ({
              tabId: tab.id!,
              windowId: tab.windowId,
              incognito: tab.incognito,
            }));
        }
        if (obsolete()) return;
        sendResponse(
          routeMessage(
            coordinator,
            message,
            sender,
            chrome.runtime.id,
            allowed,
            Date.now(),
            contexts,
          ),
        );
      })
      .catch(() =>
        sendResponse({
          ok: false,
          code: 'BROWSER_UNAVAILABLE',
          error:
            'Browsertoestemming niet beschikbaar. Gebruik de handmatige checklist.',
        }),
      );
    return true;
  },
);
chrome.tabs.onRemoved.addListener((tabId) => {
  invalidateContext(tabId, 'CLOSED');
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading' || change.url !== undefined) {
    invalidateContext(tabId);
  }
});
chrome.tabs.onAttached.addListener((tabId) => {
  invalidateContext(tabId);
});
chrome.tabs.onReplaced.addListener((_addedTabId, removedTabId) => {
  invalidateContext(removedTabId);
});
chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
