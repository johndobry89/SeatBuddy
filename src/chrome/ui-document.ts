/** Bind a native UI message's browser-authenticated URL to one live document.
 * Chrome native views may omit MessageSender.documentId and windowId. This is
 * not a client assertion about a window/account and never enters storage.
 */
export async function stampUiDocument(): Promise<boolean> {
  if (location.protocol !== 'chrome-extension:' || hasUiNonce(location.href))
    return true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const tab = await Promise.race([
      chrome.tabs.getCurrent(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('UI context timeout')), 4000);
      }),
    ]);
    if (tab?.id !== undefined) return true; // Real tabs already have authenticated document/window metadata.
    // A real navigation is required: Chrome's native MessageSender source URL
    // does not follow history.replaceState/hash updates in an existing script.
    location.replace(`${location.pathname}?sb_doc=${crypto.randomUUID()}`);
    return false;
  } catch {
    return true;
  } finally {
    // Render the app; unproven shared access still fails closed in the worker.
    clearTimeout(timer);
  }
}
export function hasUiNonce(url: string) {
  return /\?sb_doc=[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    url,
  );
}
