import type { Sender } from './message-router';
import { hasUiNonce } from '../chrome/ui-document';

/** Chrome metadata, never a UI-supplied window/incognito flag or spanning process flag. */
export async function isNormalDocument(sender: Sender): Promise<boolean> {
  if (!sender.url || typeof chrome.runtime.getContexts !== 'function')
    return false;
  try {
    if (!sender.documentId && (!hasUiNonce(sender.url) || sender.tab))
      return false;
    const filter = sender.documentId
      ? { documentIds: [sender.documentId] }
      : { documentUrls: [sender.url] };
    const contexts = await chrome.runtime.getContexts(filter);
    if (contexts.length !== 1) return false;
    const context = contexts[0]!;
    if (
      (sender.documentId && context.documentId !== sender.documentId) ||
      context.documentUrl !== sender.url ||
      context.incognito !== false ||
      context.frameId !== 0 ||
      !['POPUP', 'SIDE_PANEL', 'TAB'].includes(context.contextType)
    )
      return false;
    if (!sender.documentId || context.windowId < 0) {
      if (
        !hasUiNonce(sender.url) ||
        !context.documentId ||
        context.contextType !==
          (sender.url.split('#')[0]?.endsWith('/popup.html')
            ? 'POPUP'
            : 'SIDE_PANEL') ||
        sender.tab
      )
        return false;
      // Chrome 154 reports native POPUP windowId=-1 and no sender documentId.
      // With spanning access enabled the native view cannot prove its window:
      // deny rather than trusting a process flag or UI-supplied window hint.
      if (await chrome.extension.isAllowedIncognitoAccess()) return false;
      const current = await chrome.runtime.getContexts({
        documentUrls: [sender.url],
      });
      return (
        current.length === 1 &&
        current[0]?.documentId === context.documentId &&
        current[0]?.incognito === false
      );
    }
    const window = await chrome.windows.get(context.windowId);
    return (
      window.id === context.windowId &&
      window.incognito === false &&
      (!sender.tab ||
        (!sender.tab.incognito && sender.tab.windowId === context.windowId))
    );
  } catch {
    return false;
  }
}
