import { Users, BadgeCheck, TrendingUp } from 'lucide-react'

function WhyChooseUs() {
  const features = [
    {
      icon: <Users size={32} className="text-white" />,
      title: "Skilled Professionals",
      description: "100+ trained professionals delivering reliable, high-quality service across all offerings."
    },
    {
      icon: <BadgeCheck size={32} className="text-white" />,
      title: "Quality Work",
      description: "Tasks are completed with precision, care, and consistency, ensuring top-notch service every time."
    },
    {
      icon: <TrendingUp size={32} className="text-white" />,
      title: "Empowering Filipinos",
      description: "We help Filipinos grow their careers by providing training, mentorship, and real-world experience across our services."
    }
  ]

  return (
    <div className="bg-white py-16 px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <h2 className="text-4xl font-bold mb-12">
          <span className="text-gray-900">Introduction To </span>
          <span className="text-orange-500">Best Services</span>
          <span className="text-gray-900"> Provider.</span>
        </h2>

        {/* Feature Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="border border-gray-300 rounded-lg p-8 text-center hover:shadow-lg transition-shadow"
            >
              {/* Circular Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
                  {feature.icon}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WhyChooseUs
