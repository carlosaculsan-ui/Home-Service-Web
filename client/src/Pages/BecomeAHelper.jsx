import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../Components/Navbar'
import Footer from '../Components/Footer'
import { CheckCircle2, Upload, X, Hourglass, XCircle, Calendar, Loader2 } from 'lucide-react'

const PH_PHONE_RE = /^(09|\+639)\d{9}$/
const NAME_REGEX = /^[a-zA-ZñÑ\s.\-]+$/

function FileUploadField({ label, required, file, onChange, onClear, accept, hint }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {file ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
          <button type="button" onClick={onClear} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
          <Upload size={20} className="text-gray-400" />
          <span className="text-sm text-gray-500">Click to upload</span>
          <span className="text-xs text-gray-400">PDF, JPG, PNG — max 5MB</span>
          <input type="file" accept={accept} className="hidden" onChange={onChange} />
        </label>
      )}
    </div>
  )
}

function BecomeAHelper() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    age: '',
    emergencyName: '',
    emergencyPhone: '',
    govId: null,
    nbiClearance: null,
    agreed: false,
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [checkingApp, setCheckingApp] = useState(true)
  const [existingApp, setExistingApp] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCheckingApp(false); return }
      setCurrentUser(user)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const role = profile?.role ?? 'customer'
      setUserRole(role)
      if (role === 'customer') {
        const { data: app } = await supabase.from('helper_applications').select('status').eq('user_id', user.id).maybeSingle()
        setExistingApp(app ?? null)
      }
      setCheckingApp(false)
    }
    checkAccess()
  }, [])

  const statusScreens = {
    pending: {
      icon: <Hourglass size={64} className="text-orange-400 mx-auto mb-4" />,
      heading: 'Application Under Review',
      message: 'Your application has been submitted. We will review your documents and get back to you within 1–3 business days.',
    },
    interview_scheduled: {
      icon: <Calendar size={64} className="text-blue-400 mx-auto mb-4" />,
      heading: 'Interview Scheduled',
      message: 'You have passed the initial screening! Check your email for details about your scheduled interview.',
    },
    approved: {
      icon: <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />,
      heading: 'Application Approved!',
      message: 'Welcome to hanap.ph! You are now an approved Helper and can access your Helper Dashboard.',
    },
    rejected: {
      icon: <XCircle size={64} className="text-red-400 mx-auto mb-4" />,
      heading: 'Application Not Approved',
      message: 'Unfortunately your application was not approved at this time. You are welcome to reapply.',
    },
  }

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.fullName.trim() || !NAME_REGEX.test(form.fullName.trim()))
      e.fullName = 'Enter a valid full name (letters only)'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = 'Enter a valid email address'
    if (!PH_PHONE_RE.test(form.phone.trim()))
      e.phone = 'Enter a valid PH number (e.g. 09XXXXXXXXX)'
    if (!form.address.trim() || form.address.trim().length < 10)
      e.address = 'Please enter your complete address'
    const age = Number(form.age)
    if (!form.age || isNaN(age) || age < 18 || age > 60)
      e.age = 'Age must be between 18 and 60'
    if (!form.emergencyName.trim() || !NAME_REGEX.test(form.emergencyName.trim()))
      e.emergencyName = 'Enter a valid emergency contact name'
    if (!PH_PHONE_RE.test(form.emergencyPhone.trim()))
      e.emergencyPhone = 'Enter a valid PH number'
    if (!form.govId)
      e.govId = 'Government-issued ID is required'
    if (!form.nbiClearance)
      e.nbiClearance = 'NBI Clearance is required'
    if (!form.agreed)
      e.agreed = 'You must agree to the terms before submitting'
    return e
  }

  const uploadFile = async (file, path) => {
    const ext = file.name.split('.').pop().toLowerCase()
    const allowed = ['pdf', 'jpg', 'jpeg', 'png']
    if (!allowed.includes(ext)) throw new Error(`Invalid file type: ${file.name}`)
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} exceeds 5MB limit`)
    const fullPath = `${path}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('helper-files').upload(fullPath, file, { upsert: true })
    if (error) throw new Error(error.message)
    return supabase.storage.from('helper-files').getPublicUrl(fullPath).data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSubmitting(true)
    setSubmitError('')

    try {
      const { data: existing } = await supabase
        .from('helper_applications')
        .select('id')
        .or(`phone.eq.${form.phone.trim()},email.eq.${form.email.trim()}`)
        .maybeSingle()
      if (existing) {
        setSubmitError('An application with this email or phone number already exists.')
        setSubmitting(false)
        return
      }

      setUploadProgress('Uploading Government ID...')
      const govIdUrl = await uploadFile(form.govId, `gov-id/${form.phone.trim()}`)

      setUploadProgress('Uploading NBI Clearance...')
      const nbiUrl = await uploadFile(form.nbiClearance, `nbi/${form.phone.trim()}`)

      setUploadProgress('Saving application...')
      const { error: insertError } = await supabase.from('helper_applications').insert({
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        age: Number(form.age),
        emergency_contact_name: form.emergencyName.trim(),
        emergency_contact_phone: form.emergencyPhone.trim(),
        gov_id_url: govIdUrl,
        nbi_clearance_url: nbiUrl,
        status: 'pending',
        user_id: currentUser?.id ?? null,
      })
      if (insertError) throw new Error(insertError.message)

      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
      setUploadProgress('')
    }
  }

  if (checkingApp) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 size={36} className="text-orange-500 animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  if (userRole === 'tasker' || userRole === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <XCircle size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Access Restricted</h1>
          <p className="text-gray-500 max-w-md mb-8">
            You are already registered as a {userRole === 'admin' ? 'platform administrator' : 'Tasker'} and cannot apply as a Helper.
          </p>
          <Link to="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-colors">
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  if (existingApp) {
    const screen = statusScreens[existingApp.status] ?? statusScreens.pending
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full">
            {screen.icon}
            <h2 className="text-2xl font-bold text-gray-800 mb-3">{screen.heading}</h2>
            <p className="text-gray-500 text-sm mb-6">{screen.message}</p>
            {existingApp.status === 'approved' && (
              <Link
                to="/helper-dashboard"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                Go to Helper Dashboard
              </Link>
            )}
            {existingApp.status === 'rejected' && (
              <button
                onClick={async () => {
                  await supabase.from('helper_applications').delete().eq('user_id', currentUser.id)
                  setExistingApp(null)
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                Reapply
              </button>
            )}
            {(existingApp.status === 'pending' || existingApp.status === 'interview_scheduled') && (
              <Link to="/" className="block text-orange-500 hover:text-orange-600 font-medium text-sm mt-4">
                Back to Home
              </Link>
            )}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">Application Submitted!</h1>
          <p className="text-gray-500 max-w-md mb-2">
            Thank you for applying as a Helper on hanap.ph. Our team will review your documents and get back to you within <strong>1–3 business days</strong>.
          </p>
          <p className="text-gray-400 text-sm mb-8">We'll reach out to you via the phone number you provided.</p>
          <Link to="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-colors">
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-2">Join the Team</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Become a Helper</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
            Helpers assist Taskers on jobs assigned by hanap.ph. Earn ₱300–₱600 per job while building your experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">

          {/* Personal Info */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Personal Information</h2>
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Juan dela Cruz"
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 ${errors.fullName ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  placeholder="juan@email.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Age <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    placeholder="18"
                    min={18}
                    max={60}
                    value={form.age}
                    onChange={e => set('age', e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 ${errors.age ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Home Address <span className="text-red-500">*</span></label>
                <textarea
                  rows={2}
                  placeholder="House No., Street, Barangay, City, Province"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none ${errors.address ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>

            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Emergency Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Maria dela Cruz"
                  value={form.emergencyName}
                  onChange={e => set('emergencyName', e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 ${errors.emergencyName ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.emergencyName && <p className="text-xs text-red-500 mt-1">{errors.emergencyName}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  placeholder="09XXXXXXXXX"
                  value={form.emergencyPhone}
                  onChange={e => set('emergencyPhone', e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 ${errors.emergencyPhone ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.emergencyPhone && <p className="text-xs text-red-500 mt-1">{errors.emergencyPhone}</p>}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Documents</h2>
            <div className="space-y-4">
              <FileUploadField
                label="Government-Issued ID"
                required
                file={form.govId}
                accept=".pdf,.jpg,.jpeg,.png"
                hint="Accepted: UMID, SSS, PhilHealth, Passport, Driver's License, Voter's ID"
                onChange={e => set('govId', e.target.files[0] ?? null)}
                onClear={() => set('govId', null)}
              />
              {errors.govId && <p className="text-xs text-red-500 -mt-2">{errors.govId}</p>}

              <FileUploadField
                label="NBI Clearance"
                required
                file={form.nbiClearance}
                accept=".pdf,.jpg,.jpeg,.png"
                hint="Must be valid and issued within the last 6 months"
                onChange={e => set('nbiClearance', e.target.files[0] ?? null)}
                onClear={() => set('nbiClearance', null)}
              />
              {errors.nbiClearance && <p className="text-xs text-red-500 -mt-2">{errors.nbiClearance}</p>}
            </div>
          </div>

          {/* Waiver */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <label className="flex gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={e => set('agreed', e.target.checked)}
                className="mt-0.5 accent-orange-500 w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                I understand that as a Helper, I will be assigned by hanap.ph to assist Taskers on jobs inside customer homes. I agree to the platform's{' '}
                <Link to="/terms" className="text-orange-500 hover:underline">Terms of Service</Link> and code of conduct, and confirm that all information and documents I have provided are genuine.
              </span>
            </label>
            {errors.agreed && <p className="text-xs text-red-500 mt-2 ml-7">{errors.agreed}</p>}
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-base"
          >
            {submitting ? (uploadProgress || 'Submitting...') : 'Submit Application'}
          </button>

        </form>
      </div>

      <Footer />
    </div>
  )
}

export default BecomeAHelper
