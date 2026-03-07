import { Routes, Route } from 'react-router-dom'
import Navbar from './Components/Navbar'
import Hero from './Components/Hero'
import Services from './Components/Services'
import TaskerShowcase from './Components/TaskerShowcase'
import WhyChooseUs from './Components/WhyChooseUs'
import VideoSection from './Components/VideoSection'
import Pricing from './Components/Pricing'
import HowItWorks from './Components/HowItWorks'
import AIFeatures from './Components/AIFeatures'
import Reviews from './Components/Reviews'
import Footer from './Components/Footer'
import Chatbot from './Components/Chatbot'
import Login from './pages/Login'
import Signup from './pages/Signup'

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
      <AIFeatures />
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
    </Routes>
  )
}

export default App
