export type SaveState = 'new' | 'saved' | 'preserved' | 'error'

export function SaveStatus({
  status,
  problem,
  recoveryNeeded,
  onKeepSavedData,
  onStartNewBoard,
}: {
  status: SaveState
  problem: string | null
  recoveryNeeded: boolean
  onKeepSavedData: () => void
  onStartNewBoard: () => void
}) {
  if (recoveryNeeded) {
    return (
      <div className="save-recovery" role="alert">
        <span>Saved board could not be read. Its original data is preserved.</span>
        <div>
          <button type="button" onClick={onKeepSavedData}>Keep saved data</button>
          <button type="button" onClick={onStartNewBoard}>Start new board</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`save-status save-status-${status}`} aria-live="polite">
      <span>{status === 'saved' ? 'Saved on this device' : status === 'preserved' ? 'Saved data kept for this session' : status === 'error' ? problem ?? 'Could not save this board' : 'Not saved yet'}</span>
      {status === 'preserved' && <button type="button" onClick={onStartNewBoard}>Start new board</button>}
      {status === 'error' && <button type="button" onClick={onStartNewBoard}>Try a new board</button>}
    </div>
  )
}
