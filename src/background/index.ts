import { invalidateManualTab } from '../core/manual-assistant';
import { Coordinator } from './coordinator';
import { routeMessage, isPanelSender } from './message-router';
import { panelCommandSchema } from '../privacy/protocol';
import type { BrowserContext } from '../core/manual-assistant';
import { invalidateTab } from './session-registry';

const coordinator = new Coordinator(); // Deliberately memory-only; worker restart means UNKNOWN.
chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    chrome.extension
      .isAllowedIncognitoAccess()
      .then(async (allowed) => {
        const parsed = panelCommandSchema.safeParse(message);
        let contexts: BrowserContext[] | undefined;
        if (
          isPanelSender(sender, chrome.runtime.id) &&
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
  invalidateTab(coordinator.sessions, tabId);
  invalidateManualTab(coordinator.manual, tabId, 'CLOSED');
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading' || change.url !== undefined) {
    invalidateTab(coordinator.sessions, tabId);
    invalidateManualTab(coordinator.manual, tabId);
  }
});
chrome.tabs.onAttached.addListener((tabId) => {
  invalidateTab(coordinator.sessions, tabId);
  invalidateManualTab(coordinator.manual, tabId);
});
chrome.tabs.onReplaced.addListener((_addedTabId, removedTabId) => {
  invalidateTab(coordinator.sessions, removedTabId);
  invalidateManualTab(coordinator.manual, removedTabId);
});
chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
