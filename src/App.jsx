import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import Layout from './components/Layout'
import Home from './pages/Home'
import Examples from './pages/Examples'
import Definitions from './pages/Definitions'
import TransitionProb from './pages/TransitionProb'
import MoreExamples from './pages/MoreExamples'
import Exercises from './pages/Exercises'
import FirstStep from './pages/FirstStep'
import Branching from './pages/Branching'
import RegularMC from './pages/RegularMC'
import Classification from './pages/Classification'

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="examples" element={<Examples />} />
        <Route path="definitions" element={<Definitions />} />
        <Route path="transition" element={<TransitionProb />} />
        <Route path="more-examples" element={<MoreExamples />} />
        <Route path="first-step" element={<FirstStep />} />
        <Route path="branching" element={<Branching />} />
        <Route path="regular-mc" element={<RegularMC />} />
        <Route path="classification" element={<Classification />} />
        <Route path="exercises" element={<Exercises />} />
      </Route>
    </Routes>
    </>
  )
}
