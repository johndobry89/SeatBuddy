import type { Sender } from './message-router';

/** Chrome metadata, never a UI-supplied window/incognito flag or spanning process flag. */
export async function isNormalDocument(sender: Sender): Promise<boolean> {
  if (!sender.documentId || typeof chrome.runtime.getContexts !== 'function')
    return false;
  try {
    const contexts = await chrome.runtime.getContexts({
      documentIds: [sender.documentId],
    });
    if (contexts.length !== 1) return false;
    const context = contexts[0]!;
    if (
      context.documentId !== sender.documentId ||
      context.documentUrl !== sender.url ||
      context.incognito !== false ||
      context.frameId !== 0 ||
      context.windowId < 0 ||
      !['POPUP', 'SIDE_PANEL', 'TAB'].includes(context.contextType)
    )
      return false;
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
