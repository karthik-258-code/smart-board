export function ThemeControl({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      className="theme-control"
      type="button"
      aria-label={dark ? 'Use light theme' : 'Use dark theme'}
      aria-pressed={dark}
      onClick={onToggle}
    >
      <span className="theme-indicator" aria-hidden="true">{dark ? 'Dark' : 'Light'}</span>
      <span>{dark ? 'Use light theme' : 'Use dark theme'}</span>
    </button>
  )
}
