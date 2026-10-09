export type HeapKind = 'min' | 'max'

export function isHeapOrdered(values: number[], kind: HeapKind): boolean {
  return values.every((value, index) => {
    if (index === 0) return true
    const parent = values[Math.floor((index - 1) / 2)]
    return kind === 'min' ? parent <= value : parent >= value
  })
}

export function pushHeap(values: number[], value: number, kind: HeapKind): number[] {
  const result = [...values, value]
  let index = result.length - 1
  const precedes = (a: number, b: number) => kind === 'min' ? a < b : a > b
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2)
    if (!precedes(result[index], result[parent])) break
    ;[result[index], result[parent]] = [result[parent], result[index]]
    index = parent
  }
  return result
}

export function extractHeapTop(values: number[], kind: HeapKind): number[] {
  if (values.length <= 1) return []
  const result = [...values]
  result[0] = result.pop()!
  let index = 0
  const precedes = (a: number, b: number) => kind === 'min' ? a < b : a > b
  while (true) {
    const left = index * 2 + 1
    const right = left + 1
    let best = index
    if (left < result.length && precedes(result[left], result[best])) best = left
    if (right < result.length && precedes(result[right], result[best])) best = right
    if (best === index) break
    ;[result[index], result[best]] = [result[best], result[index]]
    index = best
  }
  return result
}
