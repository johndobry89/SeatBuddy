import { observationSchema, type Observation } from '../core/types';

// Only used by our packaged fictional fixture, never injected into external pages.
// The visible heading is deliberately NOT a confirmation signal.
export function readFictionalFixture(
  root: ParentNode,
  now: number,
): Observation | null {
  const nodes = root.querySelectorAll(
    'script[type="application/json"][data-seatmates-fixture="v1"]',
  );
  if (nodes.length !== 1) return null;
  const text = nodes[0]?.textContent ?? '';
  if (text.length > 2048) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    const result = observationSchema.safeParse(parsed);
    return result.success ? { ...result.data, observedAt: now } : null;
  } catch {
    return null;
  }
}
