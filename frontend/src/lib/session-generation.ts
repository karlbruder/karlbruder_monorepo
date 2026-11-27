let generation = 0;

export function currentSessionGeneration() {
  return generation;
}

export function advanceSessionGeneration() {
  generation += 1;
}

export function assertSessionGeneration(expected: number) {
  if (expected !== generation) throw new DOMException("Session changed", "AbortError");
}
