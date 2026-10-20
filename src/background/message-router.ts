import { Coordinator } from './coordinator';
import { bindSession, invalidateTab } from './session-registry';
import {
  boundedPayload,
  fixtureCommandSchema,
  panelCommandSchema,
} from '../privacy/protocol';
import type { Binding } from '../core/types';

export interface Sender {
  id?: string | undefined;
  url?: string | undefined;
  frameId?: number | undefined;
  documentId?: string | undefined;
  tab?:
    | { id?: number | undefined; windowId: number; incognito: boolean }
    | undefined;
}
export function routeMessage(
  coordinator: Coordinator,
  raw: unknown,
  sender: Sender,
  extensionId: string,
  allowed: boolean,
  now: number,
) {
  const reject = () => ({
    ok: false as const,
    error: 'Bericht geweigerd. Koppel en observeer de fictieve tab opnieuw.',
  });
  if (sender.id !== extensionId) return reject();
  const base = `chrome-extension://${extensionId}/`;
  if (
    sender.url === `${base}sidepanel.html` &&
    (sender.frameId === undefined || sender.frameId === 0)
  ) {
    if (!boundedPayload(raw)) return reject();
    const result = panelCommandSchema.safeParse(raw);
    if (!result.success) return reject();
    if (
      result.data.type === 'DEMO_STEP' &&
      !coordinator.advanceDemo(result.data.role, now)
    )
      return reject();
    if (result.data.type === 'RESET') coordinator.reset();
    if (result.data.type === 'DEMO')
      coordinator.demo(result.data.scenario, now);
    return { ok: true as const, state: coordinator.snapshot(now, allowed) };
  }
  if (
    sender.url !== `${base}fixture.html` ||
    sender.frameId !== 0 ||
    !sender.documentId ||
    sender.tab?.id === undefined
  )
    return reject();
  const binding: Binding = {
    tabId: sender.tab.id,
    windowId: sender.tab.windowId,
    incognito: sender.tab.incognito,
    documentId: sender.documentId,
  };
  if (!boundedPayload(raw)) {
    invalidateTab(coordinator.sessions, binding.tabId);
    return reject();
  }
  const result = fixtureCommandSchema.safeParse(raw);
  if (!result.success) {
    invalidateTab(coordinator.sessions, binding.tabId);
    return reject();
  }
  if (binding.incognito && !allowed) {
    invalidateTab(coordinator.sessions, binding.tabId);
    return reject();
  }
  if (result.data.type === 'BIND') {
    if (coordinator.mode !== 'FIXTURE') {
      coordinator.reset();
      coordinator.mode = 'FIXTURE';
    }
    if (!bindSession(coordinator.sessions, result.data.role, binding, allowed))
      return reject();
  } else if (!coordinator.observe(binding, result.data.observation, now))
    return reject();
  // Fixture tabs receive no other session's metadata or observations.
  return { ok: true as const };
}
