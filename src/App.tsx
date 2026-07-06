import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { AdegaPage } from './pages/AdegaPage'
import { DespensaPage } from './pages/DespensaPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

function PrivatePage({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivatePage><HomePage /></PrivatePage>} />
      <Route path="/adega" element={<PrivatePage><AdegaPage /></PrivatePage>} />
      <Route path="/despensa/*" element={<PrivatePage><DespensaPage /></PrivatePage>} />
      <Route path="*" element={<Navigate to="/adega" replace />} />
    </Routes>
  )
}

export default App
