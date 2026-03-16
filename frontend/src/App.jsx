import { Navigate, Route, Routes } from 'react-router-dom'
import ClientePage from './pages/ClientePage'
import CozinhaPage from './pages/CozinhaPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/cliente" replace />} />
      <Route path="/cliente" element={<ClientePage />} />
      <Route path="/cozinha" element={<CozinhaPage />} />
      <Route path="*" element={<Navigate to="/cliente" replace />} />
    </Routes>
  )
}

export default App
