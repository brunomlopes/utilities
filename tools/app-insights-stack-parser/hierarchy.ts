import type { ExceptionDetails } from "./parse";

export function exceptionLabel(item: ExceptionDetails, index: number): string {
  return `Exception ${index + 1} (id: ${item.id} → outerId: ${item.outerId})`;
}

/** Resolve parent links independently of input order, without recursive traversal. */
export function exceptionDepths(items: ExceptionDetails[]): number[] {
  const indices = new Map<string, number>();
  const duplicates = new Set<string>();
  items.forEach((item, index) => {
    const id = String(item.id);
    if (indices.has(id)) duplicates.add(id);
    indices.set(id, index);
  });
  const parents = items.map((item) => {
    const outerId = String(item.outerId);
    return outerId === "0" || duplicates.has(outerId) ? undefined : indices.get(outerId);
  });
  const depths: (number | undefined)[] = items.map(() => undefined);
  items.forEach((_, start) => {
    if (depths[start] !== undefined) return;
    const path: number[] = [];
    const positions = new Map<number, number>();
    let current: number | undefined = start;
    while (current !== undefined && depths[current] === undefined && !positions.has(current)) {
      positions.set(current, path.length);
      path.push(current);
      current = parents[current];
    }
    if (current !== undefined && positions.has(current)) {
      // Cyclic links cannot establish a nesting level; treat cycle members as roots.
      for (const index of path.slice(positions.get(current))) depths[index] = 0;
    }
    for (let position = path.length - 1; position >= 0; position -= 1) {
      const index = path[position];
      if (depths[index] !== undefined) continue;
      const parent = parents[index];
      depths[index] = parent === undefined ? 0 : (depths[parent] ?? -1) + 1;
    }
  });
  return depths as number[];
}
