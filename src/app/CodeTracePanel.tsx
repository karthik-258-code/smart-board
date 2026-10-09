import type { ExampleCodeTrace } from '../examples/codeTraces'

export function CodeTracePanel({ trace, currentLine }: { trace: ExampleCodeTrace; currentLine?: number }) {
  const title = trace.exampleId.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
  return <section className="code-trace-panel" role="region" aria-label="Example source code">
    <div className="code-trace-heading">
      <div><h2>{title}</h2><span>{trace.language} · mapped to replay steps</span></div>
      <span className="code-trace-status">{currentLine ? `Line ${currentLine}` : 'No mapped line at this step'}</span>
    </div>
    <ol className="code-trace-lines" aria-label={`${title} source lines`}>
      {trace.lines.map((line, index) => {
        const lineNumber = index + 1
        const active = lineNumber === currentLine
        return <li className={active ? 'code-line code-line-current' : 'code-line'} aria-current={active ? 'step' : undefined} key={lineNumber}>
          <span className="code-line-number" aria-hidden="true">{lineNumber}</span><code>{line || ' '}</code>
        </li>
      })}
    </ol>
  </section>
}
