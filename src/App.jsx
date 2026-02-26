import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Examples from './pages/Examples'
import Definitions from './pages/Definitions'
import TransitionProb from './pages/TransitionProb'
import MoreExamples from './pages/MoreExamples'
import Exercises from './pages/Exercises'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="examples" element={<Examples />} />
        <Route path="definitions" element={<Definitions />} />
        <Route path="transition" element={<TransitionProb />} />
        <Route path="more-examples" element={<MoreExamples />} />
        <Route path="exercises" element={<Exercises />} />
      </Route>
    </Routes>
  )
}
