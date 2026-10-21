import { invalidateManualTab } from '../core/manual-assistant';
import { Coordinator } from './coordinator';
import { routeMessage, isPanelSender } from './message-router';
import { panelCommandSchema, boundedPayload } from '../privacy/protocol';
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
    const parsed = boundedPayload(message)
      ? panelCommandSchema.safeParse(message)
      : null;
    const privileged = isPanelSender(sender, chrome.runtime.id);
    // Establish a synchronous barrier before any asynchronous Chrome call.
    // Only a validated panel RESET can cancel earlier in-flight commands.
    if (privileged && parsed?.success && parsed.data.type === 'RESET') {
      resetEpoch++;
      coordinator.reset();
    }
    const receivedEpoch = resetEpoch;
    const receivedBuddyEpoch = coordinator.buddyEpoch;
    const protectsB =
      privileged && parsed?.success && parsed.data.type === 'B_COMMAND';
    const obsolete = () => {
      if (
        receivedEpoch === resetEpoch &&
        (!protectsB || receivedBuddyEpoch === coordinator.buddyEpoch)
      )
        return false;
      sendResponse({
        ok: false,
        ...(protectsB ? { code: 'STALE_BUDDY' } : {}),
        error:
          'Opdracht vervallen na wissen. Controleer de actuele toestand opnieuw.',
      });
      return true;
    };
    chrome.extension
      .isAllowedIncognitoAccess()
      .then(async (allowed) => {
        if (obsolete()) return;
        // The authenticated RESET already ran synchronously. Do not erase new
        // work again if another panel acted while Chrome resolved consent.
        if (privileged && parsed?.success && parsed.data.type === 'RESET') {
          sendResponse({
            ok: true,
            state: coordinator.snapshot(Date.now(), allowed),
          });
          return;
        }
        let contexts: BrowserContext[] | undefined;
        const panelCommand = parsed?.success
          ? parsed.data.type === 'B_COMMAND'
            ? parsed.data.command
            : parsed.data
          : null;
        if (
          privileged &&
          panelCommand &&
          ['GET_CONTEXTS', 'BIND_CONTEXT'].includes(panelCommand.type)
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
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});
