import { useState } from 'react'
import { Link } from 'react-router-dom'
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
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-gray-800 font-medium hover:bg-gray-50 transition-colors"
      >
        <span>{q}</span>
        {open ? <ChevronUp size={18} className="text-orange-500 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-gray-500 text-sm leading-relaxed border-t border-gray-100">
          {a}
        </div>
      )}
    </div>
  )
}

function BecomeATaskerLanding() {
  return (
    <div className="font-sans text-gray-800">

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
        {/* Left: placeholder photo */}
        <div className="bg-gray-200 rounded-2xl flex items-center justify-center min-h-[340px]">
          <span className="text-gray-400 text-sm font-medium">Photo coming soon</span>
        </div>

        {/* Right: copy */}
        <div className="flex flex-col justify-center gap-5">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Earn money<br />your way
          </h1>
          <p className="text-gray-500 text-lg">
            See how much you can earn tasking on Hanap.ph
          </p>
          <Link
            to="/become-a-tasker/apply"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors w-fit"
          >
            Register Now
          </Link>
          <p className="text-sm text-gray-400">
            Already a tasker?{' '}
            <Link to="/tasker" className="text-orange-500 hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </section>

      {/* ── Section 2: Benefits ─────────────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Clock size={32} className="text-orange-500" />,
              title: 'Be your own boss',
              desc: 'Work how, when, and where you want.',
            },
            {
              icon: <Wallet size={32} className="text-orange-500" />,
              title: 'Set your own rates',
              desc: 'You keep what you earn. Get paid securely after every job.',
            },
            {
              icon: <TrendingUp size={32} className="text-orange-500" />,
              title: 'Grow your business',
              desc: 'We connect you with clients in your area.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
                {icon}
              </div>
              <h3 className="text-lg font-bold text-gray-800">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: What is Hanap.ph? ────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left: placeholder photo */}
          <div className="bg-gray-200 rounded-2xl flex items-center justify-center min-h-[280px]">
            <span className="text-gray-400 text-sm font-medium">Photo coming soon</span>
          </div>

          {/* Right: copy */}
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-extrabold text-gray-900">What is Hanap.ph?</h2>
            <p className="text-gray-500 leading-relaxed">
              Hanap.ph is the Philippines' trusted home services platform, connecting skilled workers with homeowners who need help — from cleaning and repairs to errands and more.
            </p>
            <p className="text-gray-500 leading-relaxed">
              We make it simple to find work, build a client base, and grow your income — all from your phone.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Getting Started ──────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">Getting Started</h2>
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
                <h3 className="text-lg font-bold text-gray-800">{step}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: FAQ ──────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">Your questions, answered</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="bg-orange-500 py-14 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-6">Ready to start earning?</h2>
        <Link
          to="/become-a-tasker/apply"
          className="inline-block border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white hover:text-orange-500 transition-colors text-lg"
        >
          Apply Now
        </Link>
      </section>

    </div>
  )
}

export default BecomeATaskerLanding
