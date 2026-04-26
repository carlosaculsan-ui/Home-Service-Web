import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'
import LocationMap from '../Components/LocationMap'
import { User, CreditCard as IdCard, Search, Hourglass, CheckCircle2, XCircle, Home, MapPin, FileText, Loader2 } from 'lucide-react'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

const NAME_REGEX = /^[a-zA-ZñÑ\s\.\-]*$/

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
    availType: '',
    partTimeShift: '',
    travelDistance: '',
    serviceRole: '',
    hourlyRate: '',
    experience: '',
    resume: null,
    hasValidId: false,
    idType: '',
    hasNbiClearance: false,
    hasBarangayClearance: false,
    hasCertificates: false,
    certificate1: null,
    certificate2: null,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const validateStep1 = () => {
    const newErrors = {}
    const firstName = formData.firstName?.trim() ?? ''
    if (!firstName || firstName.length < 2) {
      newErrors.firstName = 'Please enter a valid name'
    } else if (!NAME_REGEX.test(firstName)) {
      newErrors.firstName = 'Name must contain letters only'
    }
    const lastName = formData.lastName?.trim() ?? ''
    if (!lastName || lastName.length < 2) {
      newErrors.lastName = 'Please enter a valid name'
    } else if (!NAME_REGEX.test(lastName)) {
      newErrors.lastName = 'Name must contain letters only'
    }
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid Philippine phone number (e.g. 09171234567)'
    }
    if (!formData.serviceArea?.trim()) {
      newErrors.serviceArea = 'Please enter your service area or detect your location'
    }
    if (!formData.age || Number(formData.age) < 18 || Number(formData.age) > 70) {
      newErrors.age = 'Age must be between 18 and 70'
    }
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender'
    }
    if (!formData.area) {
      newErrors.area = 'Please select your area/city'
    }
    if (!formData.availType) {
      newErrors.availType = 'Please select your availability'
    }
    if (formData.availType === 'Half Day' && !formData.partTimeShift) {
      newErrors.partTimeShift = 'Please select your shift (AM or PM)'
    }
    if (!formData.serviceRole) {
      newErrors.serviceRole = 'Please select your service role'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNameChange = (e) => {
    const { name, value } = e.target
    if (!NAME_REGEX.test(value)) return
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleNameBlur = (e) => {
    const { name, value } = e.target
    const trimmed = value.trim()
    if (!trimmed || trimmed.length < 2) {
      setErrors((prev) => ({ ...prev, [name]: 'Please enter a valid name' }))
    } else if (!NAME_REGEX.test(trimmed)) {
      setErrors((prev) => ({ ...prev, [name]: 'Name must contain letters only' }))
    }
  }

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) {
        requestAnimationFrame(() => {
          document.querySelector('.border-red-400')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
        return
      }
    }
    if (step === 2) {
      if (resumeAnalyzing) return
      if (!formData.resume) {
        setErrors(prev => ({ ...prev, resume: 'Please upload your Resume / CV before proceeding.' }))
        return
      }
      setErrors(prev => ({ ...prev, resume: undefined }))
    }
    setStep((prev) => Math.min(prev + 1, 3))
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
  const [resumePreviewUrl, setResumePreviewUrl] = useState(null)
  const [resumeAnalyzing, setResumeAnalyzing] = useState(false)
  const [resumeAiError, setResumeAiError] = useState('')
  const [cert1PreviewUrl, setCert1PreviewUrl] = useState(null)
  const [cert2PreviewUrl, setCert2PreviewUrl] = useState(null)

  const isImageFile = (file) => file && /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)

  useEffect(() => {
    if (!formData.resume || !isImageFile(formData.resume)) {
      setResumePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(formData.resume)
    setResumePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [formData.resume])

  useEffect(() => {
    if (!formData.certificate1 || !isImageFile(formData.certificate1)) { setCert1PreviewUrl(null); return }
    const url = URL.createObjectURL(formData.certificate1)
    setCert1PreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [formData.certificate1])

  useEffect(() => {
    if (!formData.certificate2 || !isImageFile(formData.certificate2)) { setCert2PreviewUrl(null); return }
    const url = URL.createObjectURL(formData.certificate2)
    setCert2PreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [formData.certificate2])

  const PH_PHONE_RE = /^(09|\+639)\d{9}$/
  const validatePhone = (val) => PH_PHONE_RE.test(val.trim())

  const handleDetectLocation = () => {
    setDetectingLocation(true)
    setLocationError('')
    const onSuccess = async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await fetch(
          `${import.meta.env.DEV ? '/nominatim' : 'https://nominatim.openstreetmap.org'}/reverse?format=json&lat=${latitude}&lon=${longitude}`
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
      { key: 'resume', urlKey: 'resume_url' },
      ...(formData.certificate1 ? [{ key: 'certificate1', urlKey: 'certificate1_url' }] : []),
      ...(formData.certificate2 ? [{ key: 'certificate2', urlKey: 'certificate2_url' }] : []),
    ]

    const filesToUpload = fileFields.filter(({ key }) => formData[key])
    const uploadedUrls = {}

    for (let i = 0; i < filesToUpload.length; i++) {
      const { key, urlKey } = filesToUpload[i]
      setUploadProgress(`Uploading documents... (${i + 1}/${filesToUpload.length})`)
      const file = formData[key]
      const ext = file.name.split('.').pop().toLowerCase()
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png']
      if (!allowedTypes.includes(ext)) {
        setSubmitError(`Invalid file type for ${key}. Only PDF, JPG, and PNG are allowed.`)
        setSubmitting(false)
        setUploadProgress('')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError(`${key} exceeds the 5MB size limit.`)
        setSubmitting(false)
        setUploadProgress('')
        return
      }
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

    const availabilityValue =
      formData.availType === 'Full Day'
        ? 'Full Day'
        : formData.availType === 'Half Day' && formData.partTimeShift === 'AM'
        ? 'Half Day - AM'
        : formData.availType === 'Half Day' && formData.partTimeShift === 'PM'
        ? 'Half Day - PM'
        : null

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
      availability: availabilityValue,
      status: 'pending',
      is_available: false,
      rating: 0,
      reviews_count: 0,
      hourly_rate: parseFloat(formData.hourlyRate) || 0,
      has_valid_id: formData.hasValidId,
      id_type: formData.hasValidId ? (formData.idType || null) : null,
      has_nbi_clearance: formData.hasNbiClearance,
      has_barangay_clearance: formData.hasBarangayClearance,
      has_certificates: formData.hasCertificates,
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
    { label: 'Personal Information',      icon: <User size={16} /> },
    { label: 'Documents & Identification', icon: <IdCard size={16} /> },
    { label: 'Review & Submit',           icon: <Search size={16} /> },
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
          {existingApplication.status === 'rejected' && (
            <button
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                await supabase.from('taskers').delete().eq('user_id', user.id)
                setExistingApplication(null)
              }}
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Reapply
            </button>
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
                <div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    placeholder="Firstname"
                    className={`w-full border rounded-md p-2 text-sm ${errors.firstName ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleNameChange}
                    placeholder="Middle"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    placeholder="Lastname"
                    className={`w-full border rounded-md p-2 text-sm ${errors.lastName ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleChange}
                    placeholder="Jr."
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Phone + Service Area */}
              <div className="grid grid-cols-1 md:flex md:flex-row gap-2 mb-3">
                <div className="flex-1 flex flex-col">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      handleChange(e)
                      setErrors(prev => ({ ...prev, phone: undefined }))
                    }}
                    onKeyPress={(e) => { if (!/[0-9+]/.test(e.key)) e.preventDefault() }}
                    onBlur={() => {
                      if (!formData.phone?.trim()) setErrors(prev => ({ ...prev, phone: 'Phone number is required' }))
                      else if (!validatePhone(formData.phone)) setErrors(prev => ({ ...prev, phone: 'Please enter a valid Philippine phone number (e.g. 09171234567)' }))
                      else setErrors(prev => ({ ...prev, phone: undefined }))
                    }}
                    placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                    className={`w-full border rounded-md p-2 text-sm ${errors.phone ? 'border-red-400' : formData.phone && validatePhone(formData.phone) ? 'border-green-400' : 'border-gray-300'}`}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="relative">
                    <input
                      type="text"
                      name="serviceArea"
                      value={formData.serviceArea}
                      onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, serviceArea: undefined })) }}
                      placeholder="Select Your Home Or Main Service Area..."
                      className={`w-full border rounded-md p-2 pr-8 text-sm ${errors.serviceArea ? 'border-red-400' : 'border-gray-300'}`}
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
                  {errors.serviceArea && <p className="text-red-500 text-xs mt-1">{errors.serviceArea}</p>}
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
                  <div>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, age: undefined })) }}
                      placeholder="Age"
                      className={`w-full md:w-24 border rounded-md p-2 text-sm ${errors.age ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                  </div>
                  <div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.gender === 'Male'}
                          onChange={() => { setFormData(prev => ({ ...prev, gender: prev.gender === 'Male' ? '' : 'Male' })); setErrors(prev => ({ ...prev, gender: undefined })) }}
                          className="accent-orange-500"
                        />
                        Male
                      </label>
                      <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.gender === 'Female'}
                          onChange={() => { setFormData(prev => ({ ...prev, gender: prev.gender === 'Female' ? '' : 'Female' })); setErrors(prev => ({ ...prev, gender: undefined })) }}
                          className="accent-orange-500"
                        />
                        Female
                      </label>
                    </div>
                    {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                  </div>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="Postal Code"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  />
                  <div>
                  <select
                    value={formData.area}
                    onChange={(e) => { setFormData(prev => ({ ...prev, area: e.target.value })); setErrors(prev => ({ ...prev, area: undefined })) }}
                    className={`w-full border rounded-md p-2 text-sm ${errors.area ? 'border-red-400' : 'border-gray-300'}`}
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
                  {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}
                  </div>
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
                <p className="font-bold text-gray-800 text-sm mb-2">Availability</p>
                <select
                  value={formData.availType}
                  onChange={e => { setFormData(prev => ({ ...prev, availType: e.target.value, partTimeShift: '' })); setErrors(prev => ({ ...prev, availType: undefined, partTimeShift: undefined })) }}
                  className={`w-full border rounded-md p-2 text-sm mb-1 ${errors.availType ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Select availability</option>
                  <option value="Full Day">Full Day</option>
                  <option value="Half Day">Half Day</option>
                </select>
                {errors.availType && <p className="text-red-500 text-xs mb-2">{errors.availType}</p>}
                {formData.availType === 'Half Day' && (
                  <div className="mt-1">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="partTimeShift"
                          value="AM"
                          checked={formData.partTimeShift === 'AM'}
                          onChange={() => { setFormData(prev => ({ ...prev, partTimeShift: 'AM' })); setErrors(prev => ({ ...prev, partTimeShift: undefined })) }}
                          className="accent-orange-500"
                        />
                        AM (7:00 AM - 12:00 PM)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="partTimeShift"
                          value="PM"
                          checked={formData.partTimeShift === 'PM'}
                          onChange={() => { setFormData(prev => ({ ...prev, partTimeShift: 'PM' })); setErrors(prev => ({ ...prev, partTimeShift: undefined })) }}
                          className="accent-orange-500"
                        />
                        PM (1:00 PM - 5:00 PM)
                      </label>
                    </div>
                    {errors.partTimeShift && <p className="text-red-500 text-xs mt-1">{errors.partTimeShift}</p>}
                  </div>
                )}
              </div>

              {/* Service Role */}
              <div className="mb-3">
                <p className="font-bold text-gray-800 text-sm mb-2">Select Your Service Role</p>
                <select
                  name="serviceRole"
                  value={formData.serviceRole}
                  onChange={(e) => { handleChange(e); setErrors(prev => ({ ...prev, serviceRole: undefined })) }}
                  className={`w-full border rounded-md p-2 text-sm ${errors.serviceRole ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Select...</option>
                  <option>Cleaning</option>
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>Carpentry</option>
                  <option>Painting</option>
                  <option>Aircon Cleaning</option>
                </select>
                {errors.serviceRole && <p className="text-red-500 text-xs mt-1">{errors.serviceRole}</p>}
              </div>


              {/* Experience */}
              <div className="mb-4">
                <p className="font-bold text-gray-800 text-sm mb-2">Any Experience <span className="text-gray-400 font-normal">(optional)</span></p>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="Please describe your relevant work experience. Include the type of services you have performed, the number of years you have been working in this field, and any relevant certifications or training."
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
              <div className="flex items-center gap-2 mb-1">
                <Home size={16} className="text-orange-500" />
                <span className="text-sm font-bold text-orange-500 tracking-wide">hanap.ph</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Documents &amp; Identification</h2>

              {/* Resume Upload */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Resume / CV <span className="text-red-400">*</span>
                </p>
                <div
                  onClick={() => document.getElementById('resume-upload').click()}
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                    errors.resume ? 'border-red-400 bg-red-50' : formData.resume ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-orange-300'
                  }`}
                >
                  {formData.resume ? (
                    isImageFile(formData.resume) && resumePreviewUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={resumePreviewUrl}
                          alt="Resume preview"
                          className="max-h-40 max-w-full rounded-md object-contain"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-green-700 truncate max-w-[200px]">{formData.resume.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, resume: null })) }}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >✕</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FileText size={20} className="text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-700 truncate max-w-[220px]">{formData.resume.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, resume: null })) }}
                          className="text-xs text-gray-400 hover:text-red-500 ml-1"
                        >✕</button>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <FileText size={24} className="text-gray-400" />
                      <p className="text-sm text-gray-500 font-medium">Click to upload Resume / CV</p>
                      <p className="text-xs text-gray-400">PDF or image (JPG, PNG)</p>
                    </div>
                  )}
                </div>
                <input
                  id="resume-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0]
                    if (!file) return
                    setResumeAiError('')
                    // PDFs are accepted directly — only images need vision validation
                    if (!isImageFile(file)) {
                      setFormData(prev => ({ ...prev, resume: file }))
                      setErrors(prev => ({ ...prev, resume: undefined }))
                      return
                    }
                    // Read image as base64 for AI check
                    const reader = new FileReader()
                    reader.onload = async (ev) => {
                      const base64 = ev.target.result
                      setResumeAnalyzing(true)
                      try {
                        const res = await groq.chat.completions.create({
                          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                          messages: [{
                            role: 'user',
                            content: [
                              { type: 'image_url', image_url: { url: base64 } },
                              { type: 'text', text: 'Look at this image. Does it appear to be a resume or CV document? It should contain text sections like work experience, education, skills, contact information, or a professional summary. Answer ONLY with a JSON object: { "isResume": true or false, "reason": "short reason" }. No other text.' }
                            ]
                          }]
                        })
                        const raw = res.choices[0].message.content.trim()
                        try {
                          const json = JSON.parse(raw.replace(/```json|```/g, '').trim())
                          if (json.isResume === false) {
                            setResumeAiError(`⚠️ This doesn't look like a Resume or CV. Please upload a document showing your work experience, education, or skills. (${json.reason ?? 'Unrecognized document'})`)
                            e.target.value = ''
                            setResumeAnalyzing(false)
                            return
                          }
                        } catch {
                          // Unparseable response — fail open, accept the file
                        }
                      } catch {
                        // API error — fail open, accept the file
                      }
                      setResumeAnalyzing(false)
                      setFormData(prev => ({ ...prev, resume: file }))
                      setErrors(prev => ({ ...prev, resume: undefined }))
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                {resumeAnalyzing && (
                  <p className="flex items-center gap-1.5 text-xs text-orange-500 mt-1">
                    <Loader2 size={13} className="animate-spin" /> Checking document with AI...
                  </p>
                )}
                {resumeAiError && <p className="text-red-500 text-xs mt-1">{resumeAiError}</p>}
                {errors.resume && !resumeAiError && <p className="text-red-500 text-xs mt-1">{errors.resume}</p>}
              </div>

              {/* Document Availability Checkboxes */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Which of the following documents do you have available for the in-person interview?
                </p>
                <p className="text-xs text-gray-400 mb-3">Select all that apply — these are not required to proceed.</p>

                <div className="space-y-3">
                  {/* Valid ID */}
                  <div>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-orange-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.hasValidId}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasValidId: e.target.checked, idType: e.target.checked ? prev.idType : '' }))}
                        className="accent-orange-500 w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-sm font-medium text-gray-700">I have a Valid ID</span>
                    </label>
                    {formData.hasValidId && (
                      <div className="mt-1.5 ml-7">
                        <select
                          value={formData.idType}
                          onChange={(e) => setFormData(prev => ({ ...prev, idType: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        >
                          <option value="">— Select ID Type —</option>
                          <option>PhilSys (National ID)</option>
                          <option>UMID</option>
                          <option>Driver's License</option>
                          <option>Passport</option>
                          <option>SSS ID</option>
                          <option>PhilHealth ID</option>
                          <option>Voter's ID</option>
                          <option>Postal ID</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* NBI Clearance */}
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-orange-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.hasNbiClearance}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasNbiClearance: e.target.checked }))}
                      className="accent-orange-500 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-gray-700">I have an NBI Clearance</span>
                  </label>

                  {/* Barangay Clearance */}
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-orange-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.hasBarangayClearance}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasBarangayClearance: e.target.checked }))}
                      className="accent-orange-500 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-gray-700">I have a Barangay Clearance</span>
                  </label>

                  {/* Certificates and Training */}
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-orange-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.hasCertificates}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasCertificates: e.target.checked }))}
                      className="accent-orange-500 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-gray-700">I have Certificates and/or Training documents <span className="text-gray-400 font-normal">(optional)</span></span>
                  </label>

                  {formData.hasCertificates && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {[
                        { key: 'certificate1', id: 'cert1-upload', previewUrl: cert1PreviewUrl, label: 'Certificate / Document 1' },
                        { key: 'certificate2', id: 'cert2-upload', previewUrl: cert2PreviewUrl, label: 'Certificate / Document 2' },
                      ].map(({ key, id, previewUrl, label }) => (
                        <div key={key}>
                          <div
                            onClick={() => document.getElementById(id).click()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${formData[key] ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-orange-300'}`}
                          >
                            {formData[key] ? (
                              previewUrl ? (
                                <div className="flex flex-col items-center gap-2">
                                  <img src={previewUrl} alt={label} className="max-h-28 max-w-full rounded-md object-contain" />
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-green-700 truncate max-w-[120px]">{formData[key].name}</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, [key]: null })) }} className="text-xs text-gray-400 hover:text-red-500">✕</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <FileText size={18} className="text-green-500 flex-shrink-0" />
                                  <span className="text-xs font-medium text-green-700 truncate max-w-[110px]">{formData[key].name}</span>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, [key]: null })) }} className="text-xs text-gray-400 hover:text-red-500">✕</button>
                                </div>
                              )
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <FileText size={22} className="text-gray-400" />
                                <p className="text-xs text-gray-500 font-medium">{label}</p>
                                <p className="text-xs text-gray-400">PDF or image (JPG, PNG)</p>
                              </div>
                            )}
                          </div>
                          <input
                            id={id}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (!file) return
                              const ext = file.name.split('.').pop().toLowerCase()
                              if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
                                alert('Only JPG, PNG, or PDF files are allowed.')
                                e.target.value = ''
                                return
                              }
                              setFormData(prev => ({ ...prev, [key]: file }))
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info note */}
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                  <p className="text-xs text-blue-600 leading-relaxed">
                    These documents will be verified during your in-person interview. Please ensure you bring all checked documents.
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-2">
                <button onClick={handleBack} className="px-4 py-2 bg-gray-300 rounded-md">Back</button>
                <button onClick={handleNext} className="px-4 py-2 bg-orange-500 text-white rounded-md">Proceed</button>
              </div>
            </>
          )}



          {step === 3 && (
            submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={64} className="text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
                <p className="text-gray-600 mb-6">We will review your application and contact you within 3-5 business days.</p>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-orange-500 text-white rounded-md">
                  Go Back to Home
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Review &amp; Submit</h2>
                <div className="max-h-[420px] overflow-y-auto space-y-5 pr-1">

                  {/* Personal Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><span className="text-gray-400">First Name</span><p className="font-semibold text-gray-800">{formData.firstName || '—'}</p></div>
                      <div><span className="text-gray-400">Middle Name</span><p className="font-semibold text-gray-800">{formData.middleName || '—'}</p></div>
                      <div><span className="text-gray-400">Last Name</span><p className="font-semibold text-gray-800">{formData.lastName || '—'}</p></div>
                      <div><span className="text-gray-400">Suffix</span><p className="font-semibold text-gray-800">{formData.suffix || '—'}</p></div>
                      <div><span className="text-gray-400">Age</span><p className="font-semibold text-gray-800">{formData.age || '—'}</p></div>
                      <div><span className="text-gray-400">Gender</span><p className="font-semibold text-gray-800">{formData.gender || '—'}</p></div>
                      <div><span className="text-gray-400">Phone</span><p className="font-semibold text-gray-800">{formData.phone || '—'}</p></div>
                      <div><span className="text-gray-400">Email</span><p className="font-semibold text-gray-800 break-all">{formData.email || '—'}</p></div>
                      <div className="col-span-2"><span className="text-gray-400">Service Area</span><p className="font-semibold text-gray-800">{formData.area || '—'}</p></div>
                      <div className="col-span-2"><span className="text-gray-400">Address</span><p className="font-semibold text-gray-800">{formData.serviceArea || '—'}</p></div>
                      <div><span className="text-gray-400">Postal Code</span><p className="font-semibold text-gray-800">{formData.postalCode || '—'}</p></div>
                    </div>
                  </div>

                  {/* Service Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Service Information</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><span className="text-gray-400">Service Role</span><p className="font-semibold text-gray-800">{formData.serviceRole || '—'}</p></div>
                      <div><span className="text-gray-400">Availability</span><p className="font-semibold text-gray-800">
                        {formData.availType === 'Full Day' ? 'Full Day' : formData.availType === 'Half Day' && formData.partTimeShift ? `Half Day - ${formData.partTimeShift}` : '—'}
                      </p></div>
                      {formData.experience && <div className="col-span-2"><span className="text-gray-400">Experience</span><p className="font-semibold text-gray-800">{formData.experience}</p></div>}
                    </div>
                  </div>

                  {/* Resume */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Resume / CV</h3>
                    {formData.resume ? (
                      isImageFile(formData.resume) && resumePreviewUrl ? (
                        <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                          <img
                            src={resumePreviewUrl}
                            alt="Resume preview"
                            className="max-h-48 max-w-full rounded object-contain mb-1"
                          />
                          <p className="text-xs text-green-700 font-medium truncate">{formData.resume.name}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                          <FileText size={16} className="text-green-500 flex-shrink-0" />
                          <span className="text-green-700 font-medium truncate">{formData.resume.name}</span>
                        </div>
                      )
                    ) : (
                      <p className="text-sm text-red-400">No resume uploaded</p>
                    )}
                  </div>

                  {/* Documents for Interview */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents for Interview</h3>
                    <div className="space-y-1.5 text-sm">
                      {formData.hasValidId && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                          <span className="text-gray-700 font-medium">Valid ID{formData.idType ? ` — ${formData.idType}` : ''}</span>
                        </div>
                      )}
                      {formData.hasNbiClearance && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                          <span className="text-gray-700 font-medium">NBI Clearance</span>
                        </div>
                      )}
                      {formData.hasBarangayClearance && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                          <span className="text-gray-700 font-medium">Barangay Clearance</span>
                        </div>
                      )}
                      {formData.hasCertificates && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                          <span className="text-gray-700 font-medium">Certificates &amp; Training documents</span>
                        </div>
                      )}
                      {!formData.hasValidId && !formData.hasNbiClearance && !formData.hasBarangayClearance && !formData.hasCertificates && (
                        <p className="text-gray-400 text-xs">No documents selected</p>
                      )}
                    </div>
                  </div>

                </div>

                <div className="mt-4 flex justify-between items-center">
                  <button onClick={handleBack} className="px-4 py-2 bg-gray-300 rounded-md">Back</button>
                  {submitError && <p className="text-sm text-red-500 text-center flex-1 px-2">{submitError}</p>}
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
