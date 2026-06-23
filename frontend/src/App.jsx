import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/context.jsx'
import AppRoutes from './routes/routes.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
