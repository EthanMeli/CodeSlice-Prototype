/* Current selection logic - Picks 5 files at random */

export function pickRandom<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) {
    return [...arr];
  }
  const picked: T[] = [];
  const used = new Set<number>();
  while (picked.length < count) {
    const i = Math.floor(Math.random() * arr.length);
    if (!used.has(i)) {
      used.add(i);
      picked.push(arr[i]);
    }
  }
  return picked;
}