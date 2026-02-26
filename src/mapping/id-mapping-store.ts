/**
 * In-memory store for old ID → new UUID mappings.
 * Used when tables change PK type (INT→UUID, BIGINT→UUID).
 */
export class IdMappingStore {
  private store = new Map<string, Map<string, string>>();

  set(table: string, oldId: string | number, newId: string): void {
    if (!this.store.has(table)) {
      this.store.set(table, new Map());
    }
    this.store.get(table)!.set(String(oldId), newId);
  }

  get(table: string, oldId: string | number): string | undefined {
    return this.store.get(table)?.get(String(oldId));
  }

  getOrThrow(table: string, oldId: string | number): string {
    const newId = this.get(table, oldId);
    if (!newId) {
      throw new Error(`ID mapping not found: table=${table}, oldId=${oldId}`);
    }
    return newId;
  }

  has(table: string, oldId: string | number): boolean {
    return this.store.get(table)?.has(String(oldId)) ?? false;
  }

  size(table: string): number {
    return this.store.get(table)?.size ?? 0;
  }

  tables(): string[] {
    return Array.from(this.store.keys());
  }

  summary(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [table, map] of this.store) {
      result[table] = map.size;
    }
    return result;
  }
}
