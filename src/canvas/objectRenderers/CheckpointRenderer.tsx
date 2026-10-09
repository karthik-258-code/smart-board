import type { CheckpointObject } from '../../domain/model'

export function CheckpointRenderer({ object }: { object: CheckpointObject }) {
  return <g className="checkpoint-card">
    <rect width="210" height="120" rx="12" />
    <text className="checkpoint-kicker" x="14" y="23">PREDICT</text>
    <foreignObject x="14" y="34" width="182" height="72">
      <div className="checkpoint-prompt">{object.prompt || 'Add a practice question'}</div>
    </foreignObject>
  </g>
}
