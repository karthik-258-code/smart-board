import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Algorithm workspace</p>
          <h1>Smart Board</h1>
        </div>
        <button className="add-object-button" type="button" disabled>
          Add object
        </button>
      </header>

      <section className="board-placeholder" role="region" aria-label="Board canvas">
        <p>Your explanation will take shape here.</p>
      </section>
    </main>
  )
}

export default App
