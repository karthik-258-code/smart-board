import type { HashTableObject } from '../../domain/model'
import { hashBucketForKey } from '../../domain/hashTable'

export function HashTableRenderer({ object }: { object: HashTableObject }) {
  const rowHeight = 34
  const width = 360
  return <g className="hash-table-object">
    <text className="hash-table-title" x="0" y="-10">HASH TABLE · {object.bucketCount} BUCKETS</text>
    {Array.from({ length: object.bucketCount }, (_, bucket) => {
      const entries = object.entries.filter((entry) => hashBucketForKey(entry.key, object.bucketCount) === bucket)
      return <g className="hash-bucket" data-bucket={bucket} key={bucket} transform={`translate(0 ${bucket * rowHeight})`}>
        <rect width={width} height={rowHeight - 3} rx="5" />
        <text className="hash-bucket-index" x="8" y="20">{bucket}</text>
        <text className="hash-bucket-entries" x="42" y="20">{entries.length ? entries.map((entry) => `${entry.key}: ${String(entry.value)}`).join(' · ') : '∅'}</text>
      </g>
    })}
  </g>
}
