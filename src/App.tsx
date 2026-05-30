import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import BankDetailPage from './pages/BankDetailPage'
import ImportPage from './pages/ImportPage'
import PracticeConfigPage from './pages/PracticeConfigPage'
import PracticeSessionPage from './pages/PracticeSessionPage'
import WrongBookPage from './pages/WrongBookPage'
import ResultPage from './pages/ResultPage'
// import HistoryPage from './pages/HistoryPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/bank/:id" element={<BankDetailPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/practice/:bankId" element={<PracticeConfigPage />} />
        <Route path="/practice/:bankId/session" element={<PracticeSessionPage />} />
        <Route path="/wrongbook/:bankId" element={<WrongBookPage />} />
        <Route path="/result/:sessionId" element={<ResultPage />} />
        {/* <Route path="/history" element={<HistoryPage />} /> */}
      </Route>
    </Routes>
  )
}

export default App
