import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeToggle } from './components/ThemeToggle'
import { AdegaPage } from './pages/AdegaPage'
import { DespensaPage } from './pages/DespensaPage'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/adega" element={<AdegaPage />} />
        <Route path="/despensa/*" element={<DespensaPage />} />
        <Route path="*" element={<Navigate to="/adega" replace />} />
      </Routes>
    </>
  )
}

export default App
