import { useState } from 'react'

function BecomeATasker() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    birthday: '',
    gender: '',
    category: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, 5))
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const steps = [
    { label: 'Personal Information', icon: '👤' },
    { label: 'Valid Identification', icon: '🪪' },
    { label: 'Background Verification', icon: '🛡️' },
    { label: 'Certifications & Training', icon: '🎓' },
    { label: 'Review & Submit', icon: '🔍' },
  ]

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{
        background:
          'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #ea580c 70%, #f97316 100%)',
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute w-72 h-72 rounded-full opacity-30 blur-3xl"
        style={{ background: '#f97316', top: '10%', left: '15%' }}
      ></div>
      <div
        className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: '#4f46e5', bottom: '10%', right: '10%' }}
      ></div>

      {/* Card container */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-2xl flex overflow-hidden shadow-lg">
        {/* Sidebar */}
        <div className="w-1/3 bg-white p-8 relative">
          <div className="absolute left-4 top-12 bottom-12 w-px bg-gray-300"></div>
          <div className="flex flex-col space-y-10">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${{
                    true: 'bg-blue-800 text-white',
                    false: 'border-2 border-gray-300 text-gray-400',
                  }[step === i + 1]}`}
                >
                  {s.icon}
                </div>
                <span
                  className={`${
                    step === i + 1
                      ? 'font-bold text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right content area */}
        <div className="w-2/3 p-8">
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Personal Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Birthday
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="">Select...</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Service Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="">Select...</option>
                    <option>Cleaning</option>
                    <option>Plumbing</option>
                    <option>Electrical</option>
                    <option>Carpentry</option>
                    <option>Painting</option>
                    <option>Aircon Cleaning</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={step === 1}
                  className="px-4 py-2 bg-gray-300 rounded-md"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md"
                >
                  Proceed
                </button>
              </div>
            </>
          )}

          {step > 1 && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>Step {step} content goes here.</p>
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-300 rounded-md"
                >
                  Back
                </button>
                {step < 5 && (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md"
                  >
                    Proceed
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BecomeATasker
