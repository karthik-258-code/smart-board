export type HistoryControlsProps = {
  cursor: number
  total: number
  playing: boolean
  onTogglePlayback: () => void
  onUndo: () => void
  onRedo: () => void
  onPrevious: () => void
  onNext: () => void
  onRestart: () => void
}

export function HistoryControls(_props: HistoryControlsProps) {
  const { cursor, total, playing, onTogglePlayback, onUndo, onRedo, onPrevious, onNext, onRestart } = _props
  return (
    <nav className="history-controls" aria-label="Timeline controls">
      <button type="button" aria-label="Undo" disabled={cursor === 0} onClick={onUndo}>Undo</button>
      <button type="button" aria-label="Redo" disabled={cursor === total} onClick={onRedo}>Redo</button>
      <span className="timeline-step" aria-live="polite">Step {cursor} of {total}</span>
      <button
        className="playback-control"
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        aria-pressed={playing}
        disabled={!playing && (total === 0 || cursor >= total)}
        onClick={onTogglePlayback}
      >{playing ? 'Pause' : 'Play'}</button>
      <button type="button" aria-label="Previous step" disabled={cursor === 0} onClick={onPrevious}>Previous</button>
      <button type="button" aria-label="Next step" disabled={cursor === total} onClick={onNext}>Next</button>
      <button type="button" aria-label="Restart" disabled={cursor === 0} onClick={onRestart}>Restart</button>
    </nav>
  )
}
