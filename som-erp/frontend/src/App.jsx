import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PrintMaster from './pages/PrintMaster'
import Inward from './pages/Inward'
import Outward from './pages/Outward'
import RecipeDB from './pages/RecipeDB'
import Indent from './pages/Indent'
import Stock from './pages/Stock'
import Ledger from './pages/Ledger'
import Import from './pages/Import'
import SFG from './pages/SFG'
import Masters from './pages/Masters'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/stock" replace />} />
        <Route path="/print-master" element={<PrintMaster />} />
        <Route path="/inward" element={<Inward />} />
        <Route path="/outward" element={<Outward />} />
        <Route path="/recipe" element={<RecipeDB />} />
        <Route path="/indent" element={<Indent />} />
        <Route path="/sfg" element={<SFG />} />
        <Route path="/masters" element={<Masters />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </Layout>
  )
}
