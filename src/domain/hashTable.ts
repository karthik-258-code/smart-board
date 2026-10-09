export function hashBucketForKey(key: string, bucketCount: number): number {
  let hash = 0
  for (const character of key) hash = (hash + character.codePointAt(0)!) % bucketCount
  return hash
}
