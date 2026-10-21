import type {
  StorageArea,
  StoragePort,
} from '../../src/background/retained-data';

export class MemoryArea implements StorageArea {
  values: Record<string, unknown> = {};
  calls: string[] = [];
  protected = false;
  async setAccessLevel({ accessLevel }: { accessLevel: 'TRUSTED_CONTEXTS' }) {
    if (accessLevel !== 'TRUSTED_CONTEXTS') throw new Error('Unsafe access');
    this.protected = true;
    this.calls.push('protect');
  }
  async get(key: string) {
    if (!this.protected) throw new Error('Read before access restriction');
    this.calls.push('get');
    return structuredClone({ [key]: this.values[key] });
  }
  async set(items: Record<string, unknown>) {
    if (!this.protected) throw new Error('Write before access restriction');
    this.calls.push('set');
    Object.assign(this.values, structuredClone(items));
  }
  async remove(key: string) {
    if (!this.protected) throw new Error('Delete before access restriction');
    this.calls.push('remove');
    delete this.values[key];
  }
}
export function memoryStorage(): StoragePort & {
  local: MemoryArea;
  session: MemoryArea;
} {
  return { local: new MemoryArea(), session: new MemoryArea() };
}
