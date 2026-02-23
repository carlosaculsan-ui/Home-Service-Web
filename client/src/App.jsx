import { Routes, Route } from 'react-router-dom'
import Navbar from './Components/Navbar'
import Hero from './Components/Hero'
import Services from './Components/Services'
import HowItWorks from './Components/HowItWorks'
import AIFeatures from './Components/AIFeatures'
import Reviews from './Components/Reviews'
import Footer from './Components/Footer'
import Chatbot from './Components/Chatbot'
import Login from './Pages/Login'

function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <AIFeatures />
      <Reviews />
      <Footer />
      <Chatbot />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  )
}

export default App
