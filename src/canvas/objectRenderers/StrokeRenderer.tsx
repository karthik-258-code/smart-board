import type { StrokeObject } from '../../domain/model'

function pathFor(stroke: StrokeObject): string {
  const [first, ...rest] = stroke.points
  if (rest.length === 1) return `M ${first.x} ${first.y} L ${rest[0].x} ${rest[0].y}`
  const commands = [`M ${first.x} ${first.y}`]
  for (let index = 0; index < rest.length - 1; index += 1) {
    const point = rest[index]
    const next = rest[index + 1]
    const middle = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }
    commands.push(`Q ${point.x} ${point.y} ${middle.x} ${middle.y}`)
  }
  const last = rest[rest.length - 1]
  commands.push(`L ${last.x} ${last.y}`)
  return commands.join(' ')
}

export function StrokeRenderer({ object }: { object: StrokeObject }) {
  return <path className="board-stroke" d={pathFor(object)} />
}
