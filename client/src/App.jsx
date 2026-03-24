import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './supabase'
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
import Login from './Pages/Login'
import Signup from './Pages/Signup'
import ForgotPassword from './Pages/ForgotPassword'
import ResetPassword from './Pages/ResetPassword'
import BecomeATasker from './Pages/BecomeATasker'
import BecomeATaskerLanding from './Pages/BecomeATaskerLanding'
import Booking from './Pages/Booking'
import Dashboard from './Pages/Dashboard'
import Admin from './Pages/Admin'
import ProtectedRoute from './Components/ProtectedRoute'
import AdminRoute from './Components/AdminRoute'
import TaskerRoute from './Components/TaskerRoute'
import TaskerDashboard from './Pages/TaskerDashboard'
import TaskerLogin from './Pages/TaskerLogin'

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
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setProfile(null); return }
    supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
      .then(({ data }) => setProfile(data))
  }, [user])

  useEffect(() => {
    if (!user || profile?.role !== 'tasker') return

    let channel
    try {
      channel = supabase.channel('online-taskers', {
        config: { presence: { key: user.id } }
      })
      channel
        .on('presence', { event: 'sync' }, () => {})
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              name: profile?.full_name || user.email?.split('@')[0] || 'Tasker',
              online_at: new Date().toISOString()
            })
            await supabase
              .from('profiles')
              .update({ last_time_in: new Date().toISOString(), last_time_out: null })
              .eq('id', user.id)
          }
        })
    } catch (err) {
      console.error('Presence error:', err)
    }

    return () => {
      if (channel) {
        supabase
          .from('profiles')
          .update({ last_time_out: new Date().toISOString() })
          .eq('id', user.id)
          .then(() => {})
        supabase.removeChannel(channel)
      }
    }
  }, [user, profile])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/become-a-tasker" element={<BecomeATaskerLanding />} />
      <Route path="/become-a-tasker/apply" element={<ProtectedRoute><BecomeATasker /></ProtectedRoute>} />
      <Route path="/booking/:service" element={<Booking />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="/tasker" element={<TaskerLogin />} />
      <Route path="/tasker-dashboard" element={<TaskerRoute><TaskerDashboard /></TaskerRoute>} />
    </Routes>
  )
}

export default App
