import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import TrailDetail from './pages/TrailDetail'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trail/:trailId" element={<TrailDetail />} />
      </Routes>
    </Router>
  )
}

export default App

