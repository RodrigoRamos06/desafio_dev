import { Navigate, Route, Routes } from 'react-router-dom'
import ClientePage from './pages/ClientePage'
import CozinhaPage from './pages/CozinhaPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/cliente" replace />} />
      <Route
        path="/cliente"
        element={
          <div className="cliente-shell">
            <ClientePage />
          </div>
        }
      />
      <Route
        path="/cozinha"
        element={
          <div className="cozinha-shell">
            <CozinhaPage />
          </div>
        }
      />
      <Route path="*" element={<Navigate to="/cliente" replace />} />
    </Routes>
  )
}

export default App
