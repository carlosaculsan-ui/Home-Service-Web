function Pricing() {
  const plans = [
    {
      name: "Weekly",
      subtitle: "Best For Homes That Need Frequent Maintenance",
      price: "₱1,200",
      period: "Weekly",
      features: [
        "General Cleaning",
        "Basic Electrical Check",
        "Minor Plumbing Fix",
        "Appliance Checking",
        "Trash Removal"
      ]
    },
    {
      name: "Monthly",
      subtitle: "Best For Regular Home Maintenance",
      price: "₱3,500",
      period: "Month",
      features: [
        "Aircon Cleaning/Maintenance",
        "Pest Control (Basic Treatment)",
        "Electrical Repair",
        "Plumbing Services",
        "Appliance Repair"
      ]
    },
    {
      name: "Annual",
      subtitle: "Best For Long-Term Home Care",
      price: "₱30,000",
      period: "Year",
      features: [
        "Up To 24 Service Visits Per Year",
        "Free Quarterly Deep Cleaning",
        "Free Aircon Maintenance (2x Per Year)",
        "Priority Booking",
        "15% Discount On Extra Services"
      ]
    }
  ]

  return (
    <div className="bg-gray-50 py-16 px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Tagline */}
        <h2 className="text-4xl font-bold text-center mb-12">
          <span className="text-gray-900">Affordable Care For Every </span>
          <span className="text-orange-500">Home.</span>
        </h2>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow"
            >
              {/* Plan Name */}
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-orange-500">{plan.name}</span>
                <span className="text-gray-900"> Plan</span>
              </h3>

              {/* Subtitle */}
              <p className="text-gray-600 text-sm mb-6">
                {plan.subtitle}
              </p>

              {/* Price */}
              <div className="mb-6">
                <p className="text-3xl font-bold text-gray-900">
                  {plan.price}
                </p>
                <p className="text-gray-600 text-sm">
                  per {plan.period}
                </p>
              </div>

              {/* Get Started Button */}
              <button className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors mb-8">
                Get Started
              </button>

              {/* Features List */}
              <div className="space-y-3">
                <p className="text-gray-900 font-semibold text-sm">What's Included:</p>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-orange-500 font-bold">•</span>
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Pricing
