import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import TrailDetail from './pages/TrailDetail'
import { trackBaiduPageview } from './utils/baiduTongji'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    const path = `${basename}${location.pathname}${location.search}` || '/'
    trackBaiduPageview(path)
  }, [location])

  return null
}

function App() {
  return (
    <Router basename={basename || undefined}>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trail/:trailId" element={<TrailDetail />} />
      </Routes>
    </Router>
  )
}

export default App

