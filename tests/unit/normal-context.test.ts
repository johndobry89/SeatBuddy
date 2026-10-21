import { afterEach, expect, it, vi } from 'vitest';
import { isNormalDocument } from '../../src/background/normal-context';
const url =
  'chrome-extension://scope-test/popup.html?sb_doc=1e21a3f0-4e37-45bd-98b2-d8c91af8ae3d';
const native = {
  documentId: 'live-chrome-document',
  documentUrl: url,
  frameId: 0,
  contextType: 'POPUP',
  windowId: -1,
  incognito: false,
};
function chromeApi() {
  const api = {
    runtime: { getContexts: vi.fn().mockResolvedValue([native]) },
    extension: { isAllowedIncognitoAccess: vi.fn().mockResolvedValue(false) },
    windows: { get: vi.fn() },
  };
  vi.stubGlobal('chrome', api);
  return api;
}
afterEach(() => vi.unstubAllGlobals());
it('accepts only a unique live nonce-bound native popup while Chrome forbids all incognito extension access', async () => {
  const api = chromeApi();
  expect(await isNormalDocument({ url, id: 'scope-test' })).toBe(true);
  expect(api.runtime.getContexts).toHaveBeenCalledTimes(2);
  expect(api.windows.get).not.toHaveBeenCalled();
  api.extension.isAllowedIncognitoAccess.mockResolvedValue(true);
  expect(await isNormalDocument({ url, id: 'scope-test' })).toBe(false);
});
it('rejects missing/forged/ambiguous native metadata, stale documents and incognito even when the spanning process flag would be false', async () => {
  const api = chromeApi();
  expect(
    await isNormalDocument({ url: url.split('?')[0]!, id: 'scope-test' }),
  ).toBe(false);
  for (const contexts of [
    [],
    [native, native],
    [{ ...native, incognito: true }],
    [{ ...native, contextType: 'TAB' }],
    [{ ...native, documentUrl: url + '-changed' }],
  ]) {
    api.runtime.getContexts.mockResolvedValue(contexts);
    expect(await isNormalDocument({ url, id: 'scope-test' })).toBe(false);
  }
  api.runtime.getContexts
    .mockResolvedValueOnce([native])
    .mockResolvedValueOnce([]);
  expect(await isNormalDocument({ url, id: 'scope-test' })).toBe(false);
});
