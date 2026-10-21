import { roles, type Binding, type Role, type Sessions } from '../core/types';

export function bindSession(
  sessions: Sessions,
  role: Role,
  binding: Binding,
  allowed: boolean,
): boolean {
  if (
    (role === 'B' && (!allowed || !binding.incognito)) ||
    (role === 'A' && binding.incognito)
  )
    return false;
  const other = role === 'A' ? 'B' : 'A';
  if (sessions[other].binding?.tabId === binding.tabId) return false;
  sessions[role] = {
    role,
    binding: { ...binding },
    observation: null,
    lastObservedAt: null,
    evidence: 'UNKNOWN',
  };
  return true;
}
export function boundRole(sessions: Sessions, binding: Binding): Role | null {
  return (
    roles.find((role) => {
      const current = sessions[role].binding;
      return (
        current &&
        current.tabId === binding.tabId &&
        current.windowId === binding.windowId &&
        current.incognito === binding.incognito &&
        current.documentId === binding.documentId
      );
    }) ?? null
  );
}
export function invalidateTab(sessions: Sessions, tabId: number): void {
  for (const role of roles)
    if (sessions[role].binding?.tabId === tabId) {
      sessions[role] = {
        role,
        binding: null,
        observation: null,
        lastObservedAt: null,
        evidence: 'UNKNOWN',
      };
    }
}
