import { Coordinator } from './coordinator';
import { routeMessage } from './message-router';
import { invalidateTab } from './session-registry';

const coordinator = new Coordinator(); // Deliberately memory-only; worker restart means UNKNOWN.
chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    chrome.extension
      .isAllowedIncognitoAccess()
      .then((allowed) => {
        sendResponse(
          routeMessage(
            coordinator,
            message,
            sender,
            chrome.runtime.id,
            allowed,
            Date.now(),
          ),
        );
      })
      .catch(() =>
        sendResponse({
          ok: false,
          error:
            'Browsertoestemming niet beschikbaar. Gebruik de handmatige checklist.',
        }),
      );
    return true;
  },
);
chrome.tabs.onRemoved.addListener((tabId) =>
  invalidateTab(coordinator.sessions, tabId),
);
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading' || change.url !== undefined)
    invalidateTab(coordinator.sessions, tabId);
});
chrome.tabs.onAttached.addListener((tabId) =>
  invalidateTab(coordinator.sessions, tabId),
);
chrome.tabs.onReplaced.addListener((_addedTabId, removedTabId) =>
  invalidateTab(coordinator.sessions, removedTabId),
);
chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
