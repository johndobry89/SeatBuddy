import type { Observation } from '../core/types';
import { validateObservation } from './validate';

/**
 * One deliberate read of the active tab, after the user clicked inside the
 * action popup (activeTab grant). No retries: a failed read is reported and the
 * user decides whether to read again. Nothing is stored or sent anywhere.
 */
export type ReadFailure =
  | 'NOT_VUE_TAB'
  | 'INCOGNITO'
  | 'TAB_LOADING'
  | 'TAB_CHANGED'
  | 'NO_ACCESS'
  | 'TIMEOUT'
  | 'INVALID';

export class ReadError extends Error {
  override readonly name = 'ReadError';
  constructor(readonly reason: ReadFailure) {
    super(reason);
  }
}

const ORIGINS = ['https://www.vuecinemas.nl', 'https://vuecinemas.nl'];
const TIMEOUT_MS = 5000;

type Chrome = Pick<typeof chrome, 'tabs' | 'scripting'>;

function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ReadError('TIMEOUT')), TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

const originOf = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
};

async function activeTab(api: Chrome) {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function readActiveTab(api: Chrome = chrome, now = () => Date.now()): Promise<Observation> {
  try {
    return await withTimeout(read(api, now));
  } catch (error) {
    if (error instanceof ReadError) throw error;
    // Never surface raw browser errors: they can contain URLs.
    throw new ReadError('NO_ACCESS');
  }
}

async function read(api: Chrome, now: () => number): Promise<Observation> {
  const tab = await activeTab(api);
  if (!tab || tab.id === undefined) throw new ReadError('NOT_VUE_TAB');
  if (tab.incognito) throw new ReadError('INCOGNITO');
  // Without a grant Chrome hides the URL; that also means "not readable".
  if (!ORIGINS.includes(originOf(tab.url) ?? '')) throw new ReadError('NOT_VUE_TAB');
  if (tab.status !== 'complete' || tab.pendingUrl) throw new ReadError('TAB_LOADING');

  const target = { tabId: tab.id, frameIds: [0] };
  const setup = await api.scripting.executeScript({ target, files: ['reader.js'], world: 'ISOLATED' });
  const results = await api.scripting.executeScript({
    target,
    world: 'ISOLATED',
    func: () =>
      (globalThis as { __seatbuddiesObserve?: () => unknown }).__seatbuddiesObserve?.() ?? null,
  });
  const after = await activeTab(api);
  const first = setup[0];
  const second = results[0];
  if (
    setup.length !== 1 ||
    results.length !== 1 ||
    first?.frameId !== 0 ||
    second?.frameId !== 0 ||
    !first.documentId ||
    first.documentId !== second.documentId ||
    after?.id !== tab.id ||
    after?.url !== tab.url
  )
    throw new ReadError('TAB_CHANGED');
  try {
    return validateObservation(second.result, now());
  } catch {
    throw new ReadError('INVALID');
  }
}
