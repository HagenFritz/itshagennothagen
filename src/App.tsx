import './App.css'

const links = [
  { label: 'GitHub', href: 'https://github.com/HagenFritz' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/hagenfritz/' },
  { label: 'Email', href: 'mailto:hagenfritz@gmail.com' },
]

function App() {
  return (
    <main>
      <h1>Hagen Fritz</h1>
      <nav>
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </nav>
    </main>
  )
}

export default App
