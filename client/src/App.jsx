import { Routes, Route } from 'react-router-dom'
import Navbar from './Components/Navbar'
import Hero from './Components/Hero'
import Services from './Components/Services'
import TaskerShowcase from './Components/TaskerShowcase'
import WhyChooseUs from './Components/WhyChooseUs'
import VideoSection from './Components/VideoSection'
import Pricing from './Components/Pricing'
import HowItWorks from './Components/HowItWorks'
import Reviews from './Components/Reviews'
import Footer from './Components/Footer'
import Chatbot from './Components/Chatbot'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import BecomeATasker from './pages/BecomeATasker'
import Booking from './pages/Booking'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import ProtectedRoute from './Components/ProtectedRoute'
import AdminRoute from './Components/AdminRoute'
import TaskerRoute from './Components/TaskerRoute'
import TaskerDashboard from './pages/TaskerDashboard'

function Home() {
  return (
    <>
      <Navbar />
      <div id="home"><Hero /></div>
      <div id="services"><Services /></div>
      <TaskerShowcase />
      <div id="about"><WhyChooseUs /></div>
      <VideoSection />
      <Pricing />
      <div id="how-it-works"><HowItWorks /></div>
      <Reviews />
      <Footer />
      <Chatbot />
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/become-a-tasker" element={<ProtectedRoute><BecomeATasker /></ProtectedRoute>} />
      <Route path="/booking/:service" element={<Booking />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="/tasker-dashboard" element={<TaskerRoute><TaskerDashboard /></TaskerRoute>} />
    </Routes>
  )
}

export default App
