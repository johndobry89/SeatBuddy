import { invalidateManualTab } from '../core/manual-assistant';
import { Coordinator } from './coordinator';
import { routeMessage, isPanelSender, isPopupSender } from './message-router';
import { isNormalDocument } from './normal-context';
import { RetainedData } from './retained-data';
import {
  panelCommandSchema,
  popupCommandSchema,
  fixtureCommandSchema,
  boundedPayload,
} from '../privacy/protocol';
import type { BrowserContext } from '../core/manual-assistant';
import { invalidateTab } from './session-registry';

const coordinator = new Coordinator(); // Deliberately memory-only; worker restart means UNKNOWN.
const retained = new RetainedData(
  coordinator,
  chrome.storage?.local && chrome.storage?.session ? chrome.storage : undefined,
);
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
    const trustedPage = privileged || isPopupSender(sender, chrome.runtime.id);
    const validCommand =
      boundedPayload(message) &&
      (privileged
        ? parsed?.success === true
        : isPopupSender(sender, chrome.runtime.id)
          ? popupCommandSchema.safeParse(message).success
          : fixtureCommandSchema.safeParse(message).success);
    if (!validCommand) {
      sendResponse(
        routeMessage(
          coordinator,
          message,
          sender,
          chrome.runtime.id,
          false,
          Date.now(),
        ),
      );
      return true;
    }
    let receivedEpoch = resetEpoch;
    const receivedBuddyEpoch = coordinator.buddyEpoch;
    const protectsB = Boolean(
      privileged && parsed?.success && parsed.data.type === 'B_COMMAND',
    );
    const obsolete = () =>
      receivedEpoch !== resetEpoch ||
      (protectsB && receivedBuddyEpoch !== coordinator.buddyEpoch);
    const rejectObsolete = () => {
      sendResponse({
        ok: false,
        ...(protectsB ? { code: 'STALE_BUDDY' } : {}),
        error:
          'Opdracht vervallen na wissen. Controleer de actuele toestand opnieuw.',
      });
    };
    Promise.resolve()
      .then(async () => {
        if (trustedPage && !(await isNormalDocument(sender)))
          throw new Error('Normal context required');
        // Once Chrome authenticates the normal document, establish the barrier
        // before any consent/storage await. Incognito/unknown senders cannot reset it.
        if (obsolete()) return null;
        if (privileged && parsed?.success && parsed.data.type === 'RESET') {
          resetEpoch++;
          receivedEpoch = resetEpoch;
          coordinator.reset();
        }
        return chrome.extension.isAllowedIncognitoAccess();
      })
      .then(async (allowed) => {
        if (allowed === null || obsolete()) {
          rejectObsolete();
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
        if (obsolete()) {
          rejectObsolete();
          return;
        }
        const route = (raw: unknown) =>
          routeMessage(
            coordinator,
            raw,
            sender,
            chrome.runtime.id,
            allowed,
            Date.now(),
            contexts,
          );
        const validPageCommand = privileged
          ? parsed?.success === true
          : boundedPayload(message) &&
            popupCommandSchema.safeParse(message).success;
        if (trustedPage && validPageCommand)
          sendResponse(
            await retained.execute(
              message,
              Date.now(),
              allowed,
              () =>
                privileged && parsed?.success && parsed.data.type === 'RESET'
                  ? {
                      ok: true as const,
                      state: coordinator.snapshot(Date.now(), allowed),
                    }
                  : route(message),
              () => route({ type: privileged ? 'GET_STATE' : 'BUDDY_READ' }),
              obsolete,
            ),
          );
        else sendResponse(route(message));
      })
      .catch(() =>
        sendResponse({
          ok: false,
          code: 'BROWSER_UNAVAILABLE',
          error:
            'Normaal Chrome-venster of browsertoestemming niet aantoonbaar beschikbaar. Gebruik een normaal venster; handmatig plannen zonder gedeelde opslag blijft mogelijk.',
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
