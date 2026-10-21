/** Bind a native UI message's browser-authenticated URL to one live document.
 * Chrome native views may omit MessageSender.documentId and windowId. This is
 * not a client assertion about a window/account and never enters storage.
 */
export function stampUiDocument() {
  if (location.protocol === 'chrome-extension:')
    history.replaceState(
      null,
      '',
      `${location.pathname}#sb-doc=${crypto.randomUUID()}`,
    );
}
export function hasUiNonce(url: string) {
  return /#sb-doc=[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    url,
  );
}
