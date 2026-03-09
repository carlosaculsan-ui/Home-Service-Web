import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'

function BecomeATasker() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()

  const [checkingApplication, setCheckingApplication] = useState(true)
  const [existingApplication, setExistingApplication] = useState(null)

  useEffect(() => {
    async function checkExisting() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCheckingApplication(false)
        return
      }
      const { data } = await supabase
        .from('taskers')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle()
      setExistingApplication(data ?? null)
      setCheckingApplication(false)
    }
    checkExisting()
  }, [])
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    phone: '',
    email: '',
    serviceArea: '',
    address: '',
    age: '',
    gender: '',
    postalCode: '',
    birthday: '',
    category: '',
    availWeekdays: false,
    availWeekends: false,
    availAnytime: false,
    workMorning: false,
    workAfternoon: false,
    workEvening: false,
    travelDistance: '',
    serviceRole: '',
    experience: '',
    idType: '',
    frontImage: null,
    backImage: null,
    nbiClearance: null,
    policeClearance: null,
    barangayClearance: null,
    certificateTraining: null,
    skillAssessment: null,
    workExperience: null,
    optional1: null,
    optional2: null,
    optional3: null,
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

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('taskers').insert({
      user_id: user.id,
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      role: formData.serviceRole,
      bio: formData.experience,
      service_area: formData.serviceArea,
      status: 'pending',
      is_available: false,
      rating: 0,
      reviews_count: 0,
      hourly_rate: 0,
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
    } else {
      setSubmitted(true)
    }
  }

  const steps = [
    { label: 'Personal Information', icon: '👤' },
    { label: 'Valid Identification', icon: '🪪' },
    { label: 'Background Verification', icon: '🛡️' },
    { label: 'Certifications & Training', icon: '🎓' },
    { label: 'Review & Submit', icon: '🔍' },
  ]

  const statusScreens = {
    pending: {
      icon: '⏳',
      heading: 'Application Under Review',
      message: 'Your application has been submitted. We will review it and contact you within 3-5 business days.',
    },
    approved: {
      icon: '✅',
      heading: 'Application Approved!',
      message: 'Welcome to Vortex Elite! You can now access your Tasker Dashboard.',
    },
    rejected: {
      icon: '❌',
      heading: 'Application Not Approved',
      message: 'Unfortunately your application was not approved. Please contact us for more information.',
    },
  }

  if (checkingApplication) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundImage: `url(${backgroundImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (existingApplication) {
    const screen = statusScreens[existingApplication.status] ?? statusScreens.pending
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundImage: `url(${backgroundImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <span className="text-6xl mb-4 block">{screen.icon}</span>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">{screen.heading}</h2>
          <p className="text-gray-500 text-sm mb-6">{screen.message}</p>
          {existingApplication.status === 'approved' && (
            <Link
              to="/tasker-dashboard"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Go to Tasker Dashboard
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >

      {/* Panels Container */}
      <div className="relative z-10 flex gap-6 w-full max-w-6xl items-stretch">
        {/* Left Sidebar Panel */}
        <div className="w-1/3 bg-white rounded-2xl shadow-lg p-8 h-[600px] max-h-[600px]">
          <div className="flex flex-col h-full">
            {steps.map((s, i) => (
              <div key={i} className={`flex flex-col ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex items-center gap-3">
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
                {i < steps.length - 1 && (
                  <div className="ml-[15px] flex-1">
                    <div
                      className={`w-0.5 h-full transition-colors ${
                        step > i + 1 ? 'bg-[#312e81]' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="w-2/3 bg-white rounded-2xl shadow-lg p-8 h-[600px] max-h-[600px] overflow-y-auto">
          {step === 1 && (
            <>
              {/* Brand header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🏠</span>
                <span className="text-sm font-bold text-orange-500 tracking-wide">Vortex Elite</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-3">Information Details</h2>

              {/* Row 1: Name fields */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Firstname"
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                />
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  placeholder="Middle"
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Lastname"
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                />
                <input
                  type="text"
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleChange}
                  placeholder="Jr."
                  className="w-14 border border-gray-300 rounded-md p-2 text-sm"
                />
              </div>

              {/* Row 2: Phone + Service Area */}
              <div className="flex gap-2 mb-3">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value)) handleChange(e)
                  }}
                  placeholder="Phone"
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    name="serviceArea"
                    value={formData.serviceArea}
                    onChange={handleChange}
                    placeholder="Select Your Home Or Main Service Area..."
                    className="w-full border border-gray-300 rounded-md p-2 pr-8 text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                </div>
              </div>

              {/* Row 3: Email + Map side by side */}
              <div className="flex gap-2 mb-3">
                {/* Left column: Email, Age, Gender, Postal Code */}
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className="border border-gray-300 rounded-md p-2 text-sm"
                  />
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Age"
                    className="w-24 border border-gray-300 rounded-md p-2 text-sm"
                  />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.gender === 'Male'}
                        onChange={() => setFormData(prev => ({ ...prev, gender: prev.gender === 'Male' ? '' : 'Male' }))}
                        className="accent-orange-500"
                      />
                      Male
                    </label>
                    <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.gender === 'Female'}
                        onChange={() => setFormData(prev => ({ ...prev, gender: prev.gender === 'Female' ? '' : 'Female' }))}
                        className="accent-orange-500"
                      />
                      Female
                    </label>
                  </div>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="Postal Code"
                    className="border border-gray-300 rounded-md p-2 text-sm"
                  />
                </div>
                {/* Right column: Map placeholder */}
                <div className="flex-1 bg-gray-200 rounded-md flex items-center justify-center min-h-[130px]">
                  <span className="text-gray-500 text-sm">Map Placeholder</span>
                </div>
              </div>

              {/* Availability Section */}
              <div className="mb-3">
                <p className="font-bold text-gray-800 text-sm mb-2">Availability Section</p>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.availWeekdays}
                      onChange={() => setFormData(prev => ({ ...prev, availWeekdays: !prev.availWeekdays }))}
                      className="accent-orange-500"
                    />
                    Weekdays
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.availWeekends}
                      onChange={() => setFormData(prev => ({ ...prev, availWeekends: !prev.availWeekends }))}
                      className="accent-orange-500"
                    />
                    Weekends
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.availAnytime}
                      onChange={() => setFormData(prev => ({ ...prev, availAnytime: !prev.availAnytime }))}
                      className="accent-orange-500"
                    />
                    Anytime
                  </label>
                </div>
                <p className="font-bold text-gray-800 text-sm text-center mb-1">Working Hours</p>
                <div className="flex flex-col gap-1 mb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.workMorning}
                      onChange={() => setFormData(prev => ({ ...prev, workMorning: !prev.workMorning }))}
                      className="accent-orange-500"
                    />
                    Morning (6:00 AM – 12:00 PM)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.workAfternoon}
                      onChange={() => setFormData(prev => ({ ...prev, workAfternoon: !prev.workAfternoon }))}
                      className="accent-orange-500"
                    />
                    Afternoon (12:00 PM – 6:00 PM)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.workEvening}
                      onChange={() => setFormData(prev => ({ ...prev, workEvening: !prev.workEvening }))}
                      className="accent-orange-500"
                    />
                    Evening (6:00 PM – 10:00 PM)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Travel Distance:</label>
                  <select
                    name="travelDistance"
                    value={formData.travelDistance}
                    onChange={handleChange}
                    className="border border-gray-300 rounded-md p-1.5 text-sm"
                  >
                    <option value="">Select...</option>
                    <option>1km</option>
                    <option>5km</option>
                    <option>10km</option>
                    <option>20km</option>
                    <option>50km+</option>
                  </select>
                </div>
              </div>

              {/* Service Role */}
              <div className="mb-3">
                <p className="font-bold text-gray-800 text-sm mb-2">Select Your Service Role</p>
                <select
                  name="serviceRole"
                  value={formData.serviceRole}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
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

              {/* Experience */}
              <div className="mb-4">
                <p className="font-bold text-gray-800 text-sm mb-2">Any Experience</p>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="Any 5 Years Or Experience..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm resize-none"
                />
              </div>

              <div className="flex justify-between">
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

          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Valid Identification
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  ID Type
                </label>
                <select
                  name="idType"
                  value={formData.idType}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="">Select ID Type</option>
                  <option>Passport</option>
                  <option>Driver's License</option>
                  <option>SSS ID</option>
                  <option>PhilHealth ID</option>
                  <option>Postal ID</option>
                  <option>Voter's ID</option>
                  <option>National ID</option>
                </select>
              </div>
              <div className="flex space-x-4 mb-8">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Front
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 p-8 text-center cursor-pointer"
                    onClick={() => document.getElementById('front-upload').click()}
                  >
                    {formData.frontImage ? (
                      <img
                        src={URL.createObjectURL(formData.frontImage)}
                        alt="Front"
                        className="max-w-full max-h-32 mx-auto"
                      />
                    ) : (
                      <>
<p className="mt-2 text-gray-500">Upload Front</p>
                      </>
                    )}
                  </div>
                  <input
                    id="front-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        frontImage: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Back
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 p-8 text-center cursor-pointer"
                    onClick={() => document.getElementById('back-upload').click()}
                  >
                    {formData.backImage ? (
                      <img
                        src={URL.createObjectURL(formData.backImage)}
                        alt="Back"
                        className="max-w-full max-h-32 mx-auto"
                      />
                    ) : (
                      <>
<p className="mt-2 text-gray-500">Upload Back</p>
                      </>
                    )}
                  </div>
                  <input
                    id="back-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        backImage: e.target.files[0],
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={handleBack}
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

          {step === 3 && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Background Verification
              </h2>
              <div className="flex flex-col space-y-3 mb-4">
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[100px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('nbi-upload').click()}
                  >
                    {formData.nbiClearance ? (
                      <img
                        src={URL.createObjectURL(formData.nbiClearance)}
                        alt="NBI Clearance"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
<p className="mt-2 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">NBI Clearance</p>
                      </>
                    )}
                  </div>
                  <input
                    id="nbi-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        nbiClearance: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[100px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('police-upload').click()}
                  >
                    {formData.policeClearance ? (
                      <img
                        src={URL.createObjectURL(formData.policeClearance)}
                        alt="Police Clearance"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
<p className="mt-2 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Police Clearance</p>
                      </>
                    )}
                  </div>
                  <input
                    id="police-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        policeClearance: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[100px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('barangay-upload').click()}
                  >
                    {formData.barangayClearance ? (
                      <img
                        src={URL.createObjectURL(formData.barangayClearance)}
                        alt="Barangay Clearance"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
<p className="mt-2 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Barangay Clearance</p>
                      </>
                    )}
                  </div>
                  <input
                    id="barangay-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        barangayClearance: e.target.files[0],
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={handleBack}
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

          {step === 4 && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Certifications & Training
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[120px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('cert-training-upload').click()}
                  >
                    {formData.certificateTraining ? (
                      <img
                        src={URL.createObjectURL(formData.certificateTraining)}
                        alt="Certificate of Training"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
  <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Certificate of Training</p>
                      </>
                    )}
                  </div>
                  <input
                    id="cert-training-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        certificateTraining: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[120px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('skill-assessment-upload').click()}
                  >
                    {formData.skillAssessment ? (
                      <img
                        src={URL.createObjectURL(formData.skillAssessment)}
                        alt="Skill Assessment"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
  <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Skill Assessment</p>
                      </>
                    )}
                  </div>
                  <input
                    id="skill-assessment-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        skillAssessment: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[120px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('work-experience-upload').click()}
                  >
                    {formData.workExperience ? (
                      <img
                        src={URL.createObjectURL(formData.workExperience)}
                        alt="Work Experience"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
  <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Work Experience</p>
                      </>
                    )}
                  </div>
                  <input
                    id="work-experience-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        workExperience: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[120px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('optional1-upload').click()}
                  >
                    {formData.optional1 ? (
                      <img
                        src={URL.createObjectURL(formData.optional1)}
                        alt="Optional"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
  <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Optional</p>
                      </>
                    )}
                  </div>
                  <input
                    id="optional1-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        optional1: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[120px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('optional2-upload').click()}
                  >
                    {formData.optional2 ? (
                      <img
                        src={URL.createObjectURL(formData.optional2)}
                        alt="Optional"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
  <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Optional</p>
                      </>
                    )}
                  </div>
                  <input
                    id="optional2-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        optional2: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 h-[120px] flex flex-col items-center justify-center text-center cursor-pointer"
                    onClick={() => document.getElementById('optional3-upload').click()}
                  >
                    {formData.optional3 ? (
                      <img
                        src={URL.createObjectURL(formData.optional3)}
                        alt="Optional"
                        className="max-w-full max-h-24 mx-auto"
                      />
                    ) : (
                      <>
  <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Optional</p>
                      </>
                    )}
                  </div>
                  <input
                    id="optional3-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        optional3: e.target.files[0],
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={handleBack}
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

          {step === 5 && (
            submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-6xl mb-4">✅</span>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Application Submitted!
                </h2>
                <p className="text-gray-600 mb-6">
                  We will review your application and contact you within 3-5 business days.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-orange-500 text-white rounded-md"
                >
                  Go Back to Home
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Review & Submit
                </h2>
                <div className="max-h-96 overflow-y-auto space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500">First Name:</span>
                        <p className="font-bold text-gray-900">{formData.firstName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Name:</span>
                        <p className="font-bold text-gray-900">{formData.lastName || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Phone Number:</span>
                        <p className="font-bold text-gray-900">{formData.phone || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Address:</span>
                        <p className="font-bold text-gray-900">{formData.address || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Birthday:</span>
                        <p className="font-bold text-gray-900">{formData.birthday || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gender:</span>
                        <p className="font-bold text-gray-900">{formData.gender || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Service Category:</span>
                        <p className="font-bold text-gray-900">{formData.category || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Valid Identification
                    </h3>
                    <p className="text-gray-500 mb-2">ID Type: <span className="font-bold text-gray-900">{formData.idType || 'N/A'}</span></p>
                    <div className="flex space-x-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Front</p>
                        {formData.frontImage ? (
                          <img
                            src={URL.createObjectURL(formData.frontImage)}
                            alt="Front"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Back</p>
                        {formData.backImage ? (
                          <img
                            src={URL.createObjectURL(formData.backImage)}
                            alt="Back"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Background Verification
                    </h3>
                    <div className="flex space-x-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">NBI Clearance</p>
                        {formData.nbiClearance ? (
                          <img
                            src={URL.createObjectURL(formData.nbiClearance)}
                            alt="NBI Clearance"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Police Clearance</p>
                        {formData.policeClearance ? (
                          <img
                            src={URL.createObjectURL(formData.policeClearance)}
                            alt="Police Clearance"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Barangay Clearance</p>
                        {formData.barangayClearance ? (
                          <img
                            src={URL.createObjectURL(formData.barangayClearance)}
                            alt="Barangay Clearance"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Certifications & Training
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        {formData.certificateTraining ? (
                          <img
                            src={URL.createObjectURL(formData.certificateTraining)}
                            alt="Certificate of Training"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        {formData.skillAssessment ? (
                          <img
                            src={URL.createObjectURL(formData.skillAssessment)}
                            alt="Skill Assessment"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        {formData.workExperience ? (
                          <img
                            src={URL.createObjectURL(formData.workExperience)}
                            alt="Work Experience"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        {formData.optional1 ? (
                          <img
                            src={URL.createObjectURL(formData.optional1)}
                            alt="Optional"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        {formData.optional2 ? (
                          <img
                            src={URL.createObjectURL(formData.optional2)}
                            alt="Optional"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        {formData.optional3 ? (
                          <img
                            src={URL.createObjectURL(formData.optional3)}
                            alt="Optional"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 bg-gray-300 rounded-md"
                  >
                    Back
                  </button>
                  {submitError && (
                    <p className="text-sm text-red-500 self-center">{submitError}</p>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default BecomeATasker
