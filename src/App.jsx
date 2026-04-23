import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'

// Lazy-load heavy pages — each becomes a separate chunk
const Examples = lazy(() => import('./pages/Examples'))
const Definitions = lazy(() => import('./pages/Definitions'))
const TransitionProb = lazy(() => import('./pages/TransitionProb'))
const MoreExamples = lazy(() => import('./pages/MoreExamples'))
const Exercises = lazy(() => import('./pages/Exercises'))
const FirstStep = lazy(() => import('./pages/FirstStep'))
const Branching = lazy(() => import('./pages/Branching'))
const RegularMC = lazy(() => import('./pages/RegularMC'))
const Classification = lazy(() => import('./pages/Classification'))
const PoissonProcess = lazy(() => import('./pages/PoissonProcess'))
const PureBirth = lazy(() => import('./pages/PureBirth'))
const BirthDeath = lazy(() => import('./pages/BirthDeath'))
const RenewalBasics = lazy(() => import('./pages/RenewalBasics'))
const RenewalAsymptotic = lazy(() => import('./pages/RenewalAsymptotic'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const QuestionListPage = lazy(() => import('./pages/QuestionListPage'))
const QuestionPage = lazy(() => import('./pages/QuestionPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))

function PageLoader() {
  return <div className="text-slate-400 mt-8 text-center">Loading...</div>
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Suspense fallback={<PageLoader />}>
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
          <Route path="poisson-process" element={<PoissonProcess />} />
          <Route path="pure-birth" element={<PureBirth />} />
          <Route path="birth-death" element={<BirthDeath />} />
          <Route path="renewal-basics" element={<RenewalBasics />} />
          <Route path="renewal-asymptotic" element={<RenewalAsymptotic />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="questions" element={<ProtectedRoute><QuestionListPage /></ProtectedRoute>} />
          <Route path="question/:id" element={<ProtectedRoute><QuestionPage /></ProtectedRoute>} />
          <Route path="progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
    </>
  )
}
