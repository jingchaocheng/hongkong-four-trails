import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import TrailDetail from './pages/TrailDetail'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

function App() {
  return (
    <Router basename={basename || undefined}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trail/:trailId" element={<TrailDetail />} />
      </Routes>
    </Router>
  )
}

export default App

