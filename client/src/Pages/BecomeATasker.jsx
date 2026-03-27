import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'
import LocationMap from '../Components/LocationMap'
import { User, CreditCard as IdCard, ShieldCheck, GraduationCap, Search, Hourglass, CheckCircle2, XCircle, Home, MapPin, Trash2, Eye, Star } from 'lucide-react'

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
    area: '',
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
    hourlyRate: '',
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const validateStep1 = () => {
    const newErrors = {}
    const firstName = formData.firstName?.trim() ?? ''
    if (!firstName || firstName.length < 2 || !/^[a-zA-Z\s]+$/.test(firstName)) {
      newErrors.name = 'Please enter a valid full name'
    }
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return
      if (formData.phone && !validatePhone(formData.phone)) {
        setPhoneError('Please enter a valid Philippine phone number (e.g. 09171234567 or +639171234567)')
        return
      }
      setPhoneError('')
    }
    setStep((prev) => Math.min(prev + 1, 5))
  }

  const handleBack = () => {
    if (step === 1) navigate('/')
    else setStep((prev) => prev - 1)
  }

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [errors, setErrors] = useState({})

  const PH_PHONE_RE = /^(09|\+639)\d{9}$/
  const validatePhone = (val) => PH_PHONE_RE.test(val.trim())

  const handleDetectLocation = () => {
    setDetectingLocation(true)
    setLocationError('')
    const onSuccess = async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        )
        const json = await res.json()
        setFormData((prev) => ({ ...prev, serviceArea: json.display_name }))
      } catch {
        setLocationError('Could not fetch address. Please enter it manually.')
      } finally {
        setDetectingLocation(false)
      }
    }
    const onError = async () => {
      try {
        const res = await fetch(
          `http://api.ipstack.com/check?access_key=${import.meta.env.VITE_IPSTACK_API_KEY}`
        )
        const json = await res.json()
        const addr = [json.city, json.region_name, json.country_name].filter(Boolean).join(', ')
        setFormData((prev) => ({ ...prev, serviceArea: addr }))
      } catch {
        setLocationError('Could not detect location. Please enter it manually.')
      } finally {
        setDetectingLocation(false)
      }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError)
    } else {
      onError()
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    setUploadProgress('')
    const { data: { user } } = await supabase.auth.getUser()

    const { data: existing } = await supabase
      .from('taskers')
      .select('id')
      .eq('email', formData.email)
      .maybeSingle()
    if (existing) {
      setSubmitError('An application with this email already exists. Please contact us if you need help.')
      setSubmitting(false)
      return
    }

    // Upload files to Supabase Storage
    const fileFields = [
      { key: 'frontImage',          urlKey: 'front_image_url' },
      { key: 'backImage',           urlKey: 'back_image_url' },
      { key: 'nbiClearance',        urlKey: 'nbi_clearance_url' },
      { key: 'policeClearance',     urlKey: 'police_clearance_url' },
      { key: 'barangayClearance',   urlKey: 'barangay_clearance_url' },
      { key: 'certificateTraining', urlKey: 'certificate_training_url' },
      { key: 'skillAssessment',     urlKey: 'skill_assessment_url' },
      { key: 'workExperience',      urlKey: 'work_experience_url' },
    ]

    const filesToUpload = fileFields.filter(({ key }) => formData[key])
    const uploadedUrls = {}

    for (let i = 0; i < filesToUpload.length; i++) {
      const { key, urlKey } = filesToUpload[i]
      setUploadProgress(`Uploading documents... (${i + 1}/${filesToUpload.length})`)
      const file = formData[key]
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${key}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('tasker-files')
        .upload(path, file, { upsert: true })
      if (uploadError) {
        setSubmitError(`Failed to upload ${key}: ${uploadError.message}`)
        setSubmitting(false)
        setUploadProgress('')
        return
      }
      const { data: publicData } = supabase.storage.from('tasker-files').getPublicUrl(path)
      uploadedUrls[urlKey] = publicData.publicUrl
    }

    setUploadProgress('Saving application...')

    const availabilityArr = [
      formData.availWeekdays && 'Weekdays',
      formData.availWeekends && 'Weekends',
      formData.availAnytime && 'Anytime',
    ].filter(Boolean)

    const workingHoursArr = [
      formData.workMorning && 'Morning',
      formData.workAfternoon && 'Afternoon',
      formData.workEvening && 'Evening',
    ].filter(Boolean)

    const insertData = {
      user_id: user.id,
      name: `${formData.firstName || ''} ${formData.middleName || ''} ${formData.lastName || ''} ${formData.suffix || ''}`.trim(),
      middle_name: formData.middleName || null,
      suffix: formData.suffix || null,
      email: formData.email,
      phone: formData.phone,
      age: formData.age || null,
      gender: formData.gender || null,
      address: formData.serviceArea || null,
      postal_code: formData.postalCode || null,
      role: formData.serviceRole,
      bio: formData.experience,
      service_area: formData.area || null,
      availability: availabilityArr.length > 0 ? availabilityArr : null,
      working_hours: workingHoursArr.length > 0 ? workingHoursArr : null,
      status: 'pending',
      is_available: false,
      rating: 0,
      reviews_count: 0,
      hourly_rate: parseFloat(formData.hourlyRate) || 0,
      ...uploadedUrls,
    }
    console.log('INSERT DATA:', JSON.stringify(insertData))
    const { error } = await supabase.from('taskers').insert(insertData)
    setSubmitting(false)
    setUploadProgress('')
    if (error) {
      setSubmitError(error.message)
    } else {
      setSubmitted(true)
    }
  }

  const steps = [
    { label: 'Personal Information', icon: <User size={16} /> },
    { label: 'Valid Identification', icon: <IdCard size={16} /> },
    { label: 'Background Verification', icon: <ShieldCheck size={16} /> },
    { label: 'Certifications & Training', icon: <GraduationCap size={16} /> },
    { label: 'Review & Submit', icon: <Search size={16} /> },
  ]

  const statusScreens = {
    pending: {
      icon: <Hourglass size={64} className="text-orange-400 mx-auto mb-4" />,
      heading: 'Application Under Review',
      message: 'Your application has been submitted. We will review it and contact you within 3-5 business days.',
    },
    approved: {
      icon: <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />,
      heading: 'Application Approved!',
      message: 'Welcome to hanap.ph! You can now access your Tasker Dashboard.',
    },
    rejected: {
      icon: <XCircle size={64} className="text-red-400 mx-auto mb-4" />,
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
          <div className="flex justify-center">{screen.icon}</div>
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
      <div className="relative z-10 flex flex-col md:flex-row gap-6 w-full max-w-6xl items-stretch overflow-hidden">

        {/* Mobile Step Indicator */}
        <div className="md:hidden bg-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3">
          <span className="text-xl">{steps[step - 1].icon}</span>
          <div>
            <p className="text-xs text-gray-400 font-medium">Step {step} of {steps.length}</p>
            <p className="text-sm font-bold text-gray-800">{steps[step - 1].label}</p>
          </div>
          <div className="ml-auto flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i < step ? 'bg-blue-800' : 'bg-gray-200'}`}
                style={{ width: i === step - 1 ? '20px' : '8px' }}
              />
            ))}
          </div>
        </div>

        {/* Left Sidebar Panel */}
        <div className="hidden md:block w-1/3 bg-white rounded-2xl shadow-lg p-8 h-[600px] max-h-[600px]">
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
        <div className="w-full md:w-2/3 bg-white rounded-2xl shadow-lg p-5 md:p-8 h-[600px] max-h-[600px] overflow-y-auto">
          {step === 1 && (
            <>
              {/* Brand header */}
              <div className="flex items-center gap-2 mb-3">
                <Home size={16} className="text-orange-500" />
                <span className="text-sm font-bold text-orange-500 tracking-wide">hanap.ph</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-3">Information Details</h2>

              {/* Row 1: Name fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-1">
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, name: undefined })) }}
                  placeholder="Firstname"
                  className={`w-full border rounded-md p-2 text-sm ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                />
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  placeholder="Middle"
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Lastname"
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                />
                <input
                  type="text"
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleChange}
                  placeholder="Jr."
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs mb-2">{errors.name}</p>}

              {/* Row 2: Phone + Service Area */}
              <div className="grid grid-cols-1 md:flex md:flex-row gap-2 mb-3">
                <div className="flex-1 flex flex-col">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      handleChange(e)
                      setPhoneError('')
                    }}
                    onKeyPress={(e) => { if (!/[0-9+]/.test(e.key)) e.preventDefault() }}
                    onBlur={() => {
                      if (formData.phone && !validatePhone(formData.phone))
                        setPhoneError('Please enter a valid Philippine phone number (e.g. 09171234567 or +639171234567)')
                      else
                        setPhoneError('')
                    }}
                    placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                    className={`w-full border rounded-md p-2 text-sm ${phoneError ? 'border-red-400' : formData.phone && validatePhone(formData.phone) ? 'border-green-400' : 'border-gray-300'}`}
                  />
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="relative">
                    <input
                      type="text"
                      name="serviceArea"
                      value={formData.serviceArea}
                      onChange={handleChange}
                      placeholder="Select Your Home Or Main Service Area..."
                      className="w-full border border-gray-300 rounded-md p-2 pr-8 text-sm"
                    />
                    <Search size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 disabled:opacity-50 cursor-pointer mt-1"
                  >
                    {detectingLocation ? (
                      <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : <MapPin size={13} />}
                    {detectingLocation ? 'Detecting...' : 'Detect my location'}
                  </button>
                  {locationError && (
                    <p className="text-red-500 text-xs mt-1">{locationError}</p>
                  )}
                  {/* Map — mobile only, stacked below the address input */}
                  <div className="md:hidden w-full h-48 mt-2">
                    {formData.serviceArea.length > 5
                      ? <LocationMap address={formData.serviceArea} />
                      : <div className="bg-gray-200 rounded-md flex items-center justify-center h-full"><span className="text-gray-500 text-sm">Map Placeholder</span></div>
                    }
                  </div>
                </div>
              </div>

              {/* Row 3: Email + Map side by side */}
              <div className="flex flex-col md:flex-row gap-2 mb-3">
                {/* Left column: Email, Age, Gender, Postal Code */}
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, email: undefined })) }}
                    placeholder="Email"
                    className={`w-full border rounded-md p-2 text-sm ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Age"
                    className="w-full md:w-24 border border-gray-300 rounded-md p-2 text-sm"
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
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  />
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  >
                    <option value="">-- Select Area --</option>
                    <option value="Manila">Manila</option>
                    <option value="Quezon City">Quezon City</option>
                    <option value="Caloocan">Caloocan</option>
                    <option value="Las Piñas">Las Piñas</option>
                    <option value="Makati">Makati</option>
                    <option value="Malabon">Malabon</option>
                    <option value="Mandaluyong">Mandaluyong</option>
                    <option value="Marikina">Marikina</option>
                    <option value="Muntinlupa">Muntinlupa</option>
                    <option value="Navotas">Navotas</option>
                    <option value="Parañaque">Parañaque</option>
                    <option value="Pasay">Pasay</option>
                    <option value="Pasig">Pasig</option>
                    <option value="Pateros">Pateros</option>
                    <option value="San Juan">San Juan</option>
                    <option value="Taguig">Taguig</option>
                    <option value="Valenzuela">Valenzuela</option>
                  </select>
                </div>
                {/* Right column: Map — desktop only */}
                <div className="hidden md:block md:flex-1 md:min-h-[130px]">
                  {formData.serviceArea.length > 5
                    ? <LocationMap address={formData.serviceArea} />
                    : <div className="bg-gray-200 rounded-md flex items-center justify-center h-full min-h-[130px]"><span className="text-gray-500 text-sm">Map Placeholder</span></div>
                  }
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
                <p className="font-bold text-gray-800 text-sm mb-1">Working Hours</p>
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
                <CheckCircle2 size={64} className="text-green-500 mb-4" />
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
                        <p className="font-bold text-gray-900">{formData.firstName || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Middle Name:</span>
                        <p className="font-bold text-gray-900">{formData.middleName || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Name:</span>
                        <p className="font-bold text-gray-900">{formData.lastName || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Suffix:</span>
                        <p className="font-bold text-gray-900">{formData.suffix || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Age:</span>
                        <p className="font-bold text-gray-900">{formData.age || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gender:</span>
                        <p className="font-bold text-gray-900">{formData.gender || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <p className="font-bold text-gray-900">{formData.phone || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <p className="font-bold text-gray-900">{formData.email || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Service Area:</span>
                        <p className="font-bold text-gray-900">{formData.area || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Address:</span>
                        <p className="font-bold text-gray-900">{formData.serviceArea || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Postal Code:</span>
                        <p className="font-bold text-gray-900">{formData.postalCode || '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Service Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500">Service Role:</span>
                        <p className="font-bold text-gray-900">{formData.serviceRole || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Experience:</span>
                        <p className="font-bold text-gray-900">{formData.experience || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Working Hours:</span>
                        <p className="font-bold text-gray-900">
                          {[
                            formData.workMorning && 'Morning',
                            formData.workAfternoon && 'Afternoon',
                            formData.workEvening && 'Evening',
                          ].filter(Boolean).join(', ') || '—'}
                        </p>
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
                    {submitting ? (uploadProgress || 'Submitting...') : 'Submit Application'}
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
