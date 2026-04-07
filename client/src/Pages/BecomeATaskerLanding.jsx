import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../Components/Navbar'
import Footer from '../Components/Footer'
import Chatbot from '../Components/Chatbot'
import Background2 from '../Assets/Background2.jpg'
import Tasker9 from '../Assets/Tasker9.png'
import Tasker10 from '../Assets/Tasker10.png'
import Tasker11 from '../Assets/Tasker11.png'
import {
  Clock, Wallet, TrendingUp,
  UserPlus, ClipboardList, ShieldCheck,
  ChevronDown, ChevronUp,
} from 'lucide-react'

const FAQS = [
  {
    q: "What's required to become a Tasker?",
    a: "You need a valid government-issued ID, a smartphone, and a willingness to provide quality service. Some services may require proof of skills or certifications.",
  },
  {
    q: "Do I need experience to task?",
    a: "Not necessarily. Many tasks can be done without prior professional experience. However, having relevant skills will help you get more bookings and better reviews.",
  },
  {
    q: "How do I get jobs?",
    a: "Once your profile is approved, customers in your area can find and book you through Hanap.ph. You'll receive booking notifications and can manage your schedule from your dashboard.",
  },
  {
    q: "How do I get paid?",
    a: "Payment is processed securely through the platform after each completed job. Funds are transferred directly to your registered account.",
  },
  {
    q: "How long does it take for my registration to be processed?",
    a: "Most applications are reviewed within 1–3 business days. You'll receive an email notification once your application has been approved or if additional information is needed.",
  },
  {
    q: "Where does Hanap.ph operate?",
    a: "Hanap.ph currently operates across major cities and municipalities in the Philippines. We're continuously expanding to new areas — check back soon if your location isn't listed yet.",
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-black font-medium hover:bg-gray-50 transition-colors"
      >
        <span>{q}</span>
        {open ? <ChevronUp size={18} className="text-orange-500 flex-shrink-0" /> : <ChevronDown size={18} className="text-black flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-black text-sm leading-relaxed border-t border-gray-100">
          {a}
        </div>
      )}
    </div>
  )
}

function BecomeATaskerLanding() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-sans text-black" style={{ backgroundImage: `url(${Background2})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' }}>
      <Navbar />

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
        {/* Left: tasker photo */}
        <div className="rounded-2xl overflow-hidden h-64 md:h-[480px]">
          <img
            src={Tasker9}
            alt="Hanap.ph Tasker"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right: copy */}
        <div className="flex flex-col justify-center items-center md:items-start gap-5 text-center md:text-left">
          <h1 className="text-2xl md:text-5xl font-extrabold text-black leading-tight">
            Earn money<br />your way
          </h1>
          <p className="text-black text-lg">
            See how much you can earn tasking on Hanap.ph
          </p>
          <Link
            to="/become-a-tasker/apply"
            className="w-full md:w-auto inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors text-center"
          >
            Apply Now
          </Link>
          <p className="text-sm text-black">
            Already a tasker?{' '}
            <Link to="/tasker" className="text-orange-500 hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </section>

      {/* ── Section 2: Benefits ─────────────────────────────────────────── */}
      <section className="bg-white py-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-black mb-4">
              Flexible work, at your fingertips
            </h2>
            <p className="text-black max-w-md mx-auto">
              Find local jobs that fit your skills and schedule. With Hanap.ph, you have the freedom and support to be your own boss.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: <Clock size={48} className="text-orange-500" />,
                title: 'Be your own boss',
                desc: 'Work how, when, and where you want. Offer services across multiple categories and set a flexible schedule and work area.',
              },
              {
                icon: <Wallet size={48} className="text-orange-500" />,
                title: 'Set your own rates',
                desc: 'You keep 70% of every job you complete, plus tips! Get paid securely and consistently through our platform.',
              },
              {
                icon: <TrendingUp size={48} className="text-orange-500" />,
                title: 'Grow your business',
                desc: 'We connect you with clients in your area, and ways to market yourself — so you can focus on what you do best.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                <div className="w-12 h-12">{icon}</div>
                <h3 className="text-xl font-bold text-black">{title}</h3>
                <p className="text-black leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: What is Hanap.ph? ────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="rounded-2xl overflow-hidden h-[240px] md:h-[340px]">
            <img src={Tasker10} alt="What is Hanap.ph" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-black">What is Hanap.ph?</h2>
            <p className="text-black leading-relaxed">
              Hanap.ph is the Philippines' trusted home services platform, connecting skilled workers with homeowners who need help — from cleaning and repairs to errands and more.
            </p>
            <p className="text-black leading-relaxed">
              We make it simple to find work, build a client base, and grow your income — all from your phone.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Getting Started ──────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-black text-center mb-10">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <UserPlus size={28} className="text-orange-500" />,
                step: '1. Sign up',
                desc: 'Create your account and fill out your application.',
              },
              {
                icon: <ClipboardList size={28} className="text-orange-500" />,
                step: '2. Build your profile',
                desc: 'Select services you want to offer and set your rate.',
              },
              {
                icon: <ShieldCheck size={28} className="text-orange-500" />,
                step: '3. Verify your eligibility',
                desc: 'Our team reviews and approves your application.',
              },
            ].map(({ icon, step, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-black">{step}</h3>
                <p className="text-black text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Left - Quote */}
          <div>
            <span className="text-6xl text-orange-500 font-serif leading-none">"</span>
            <p className="text-2xl font-medium text-gray-800 mt-2 leading-relaxed">
              Dati naghahanap pa ako ng trabaho, ngayon ang trabaho ang humahanap sa akin. Salamat Hanap.ph — nakatulong talaga ito sa pamilya ko.
            </p>
            <p className="text-sm text-gray-500 mt-4">Juan dela Cruz, Quezon City</p>
          </div>

          {/* Right - Image */}
          <div className="rounded-lg h-80 overflow-hidden">
            <img src={Tasker11} alt="Almar" className="w-full h-full object-cover" />
          </div>

        </div>
      </section>

      {/* ── Section 5: FAQ ──────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-black text-center mb-10">Your questions, answered</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="bg-orange-500 py-14 px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-6">Ready to start earning?</h2>
        <Link
          to="/become-a-tasker/apply"
          className="w-full md:w-auto inline-block border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white hover:text-orange-500 transition-colors text-lg"
        >
          Apply Now
        </Link>
      </section>

      <Footer />
      <Chatbot />
    </div>
  )
}

export default BecomeATaskerLanding
