import type { ObservationResult } from './fictional';

// A build-time decision, not a URL/selector/environment-variable toggle.
// Enabling a future production adapter requires reviewed code + G0 evidence +
// a separate minimal manifest change. A sample URL can never open this gate.
export const productionPolicy = Object.freeze({
  enabled: false as const,
  allowedOrigins: Object.freeze([] as string[]),
  confirmation: 'NOT_IMPLEMENTED' as const,
});
export function observeProduction(_root: ParentNode): ObservationResult {
  // Do not even inspect an untrusted DOM while G0 is unresolved.
  void _root;
  return { kind: 'UNAVAILABLE', reason: liveDetection().reason };
}

// G0 has not been performed. No origins, selectors, content scripts or live actions are enabled.
export function liveDetection(): { status: 'UNKNOWN'; reason: string } {
  return {
    status: 'UNKNOWN',
    reason:
      'Live Vue-detectie is uitgeschakeld tot afzonderlijk G0-bewijs beschikbaar is.',
  };
}
