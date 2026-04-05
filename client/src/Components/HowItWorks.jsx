import { useEffect } from 'react'
import { Search, CalendarCheck, CircleCheckBig } from 'lucide-react'

const steps = [
  {
    step: "01",
    icon: <Search size={40} className="text-orange-500" />,
    title: "Search a Service",
    description: "Browse through our wide range of home services and find exactly what you need."
  },
  {
    step: "02",
    icon: <CalendarCheck size={40} className="text-orange-500" />,
    title: "Book a Professional",
    description: "Pick a trusted professional, choose your schedule, and confirm your booking."
  },
  {
    step: "03",
    icon: <CircleCheckBig size={40} className="text-orange-500" />,
    title: "Get it Done",
    description: "Your professional arrives on time and gets the job done. Easy and stress-free!"
  },
]

function HowItWorks() {
  useEffect(() => {
    const cards = document.querySelectorAll('.step-card')
    const delays = [0, 250, 500]
    let visibleCount = 0

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target
            const index = Array.from(cards).indexOf(el)
            el.style.transitionDelay = `${delays[index] ?? 0}ms`
            el.classList.add('visible')
            visibleCount++
            if (visibleCount >= cards.length) observer.disconnect()
          }
        })
      },
      { threshold: 0.2 }
    )

    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="py-16 px-8 bg-white">
      <style>{`
        .step-card {
          opacity: 0;
          transform: translateY(60px);
          transition: opacity 1.2s ease, transform 1.2s ease;
        }
        .step-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
        How It Works
      </h2>
      <p className="text-center text-gray-500 mb-12">
        Get your home services done in 3 easy steps
      </p>

      <div className="flex flex-col md:flex-row justify-center gap-8 max-w-5xl mx-auto">
        {steps.map((item, index) => (
          <div key={index} className="step-card flex-1 text-center p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-orange-500 font-extrabold text-lg mb-2">{item.step}</div>
            <div className="flex justify-center mb-4">{item.icon}</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
            <p className="text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>

    </div>
  )
}

export default HowItWorks
