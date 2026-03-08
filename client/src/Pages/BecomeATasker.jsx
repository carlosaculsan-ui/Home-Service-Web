import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function BecomeATasker() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    birthday: '',
    gender: '',
    category: '',
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
    optional4: null,
    optional5: null,
    optional6: null,
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

  const handleSubmit = () => {
    setSubmitted(true)
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

      {/* Panels Container */}
      <div className="relative z-10 flex gap-6 w-full max-w-6xl items-stretch">
        {/* Left Sidebar Panel */}
        <div className="w-1/3 bg-white rounded-2xl shadow-lg p-8 min-h-[600px]">
          <div className="absolute left-4 top-12 bottom-12 w-px bg-gray-300"></div>
          <div className="flex flex-col h-full justify-between">
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

        {/* Right Content Panel */}
        <div className="w-2/3 bg-white rounded-2xl shadow-lg p-8 min-h-[600px] overflow-y-auto">
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
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer"
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
                        <span className="text-4xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer"
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
                        <span className="text-4xl">📸</span>
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
              <div className="flex flex-col space-y-4 mb-8">
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-6 text-center cursor-pointer"
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
                        <span className="text-3xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-6 text-center cursor-pointer"
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
                        <span className="text-3xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-6 text-center cursor-pointer"
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
                        <span className="text-3xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('cert-training-upload').click()}
                  >
                    {formData.certificateTraining ? (
                      <img
                        src={URL.createObjectURL(formData.certificateTraining)}
                        alt="Certificate of Training"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('skill-assessment-upload').click()}
                  >
                    {formData.skillAssessment ? (
                      <img
                        src={URL.createObjectURL(formData.skillAssessment)}
                        alt="Skill Assessment"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('work-experience-upload').click()}
                  >
                    {formData.workExperience ? (
                      <img
                        src={URL.createObjectURL(formData.workExperience)}
                        alt="Work Experience"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('optional1-upload').click()}
                  >
                    {formData.optional1 ? (
                      <img
                        src={URL.createObjectURL(formData.optional1)}
                        alt="Optional"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('optional2-upload').click()}
                  >
                    {formData.optional2 ? (
                      <img
                        src={URL.createObjectURL(formData.optional2)}
                        alt="Optional"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
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
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('optional3-upload').click()}
                  >
                    {formData.optional3 ? (
                      <img
                        src={URL.createObjectURL(formData.optional3)}
                        alt="Optional"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
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
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('optional4-upload').click()}
                  >
                    {formData.optional4 ? (
                      <img
                        src={URL.createObjectURL(formData.optional4)}
                        alt="Optional"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
                        <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Optional</p>
                      </>
                    )}
                  </div>
                  <input
                    id="optional4-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        optional4: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('optional5-upload').click()}
                  >
                    {formData.optional5 ? (
                      <img
                        src={URL.createObjectURL(formData.optional5)}
                        alt="Optional"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
                        <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Optional</p>
                      </>
                    )}
                  </div>
                  <input
                    id="optional5-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        optional5: e.target.files[0],
                      }))
                    }
                  />
                </div>
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center cursor-pointer"
                    onClick={() => document.getElementById('optional6-upload').click()}
                  >
                    {formData.optional6 ? (
                      <img
                        src={URL.createObjectURL(formData.optional6)}
                        alt="Optional"
                        className="max-w-full max-h-20 mx-auto"
                      />
                    ) : (
                      <>
                        <span className="text-2xl">📸</span>
                        <p className="mt-1 text-gray-500 text-sm">Upload Here</p>
                        <p className="text-xs text-gray-400">Optional</p>
                      </>
                    )}
                  </div>
                  <input
                    id="optional6-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        optional6: e.target.files[0],
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
                      <div>
                        {formData.optional4 ? (
                          <img
                            src={URL.createObjectURL(formData.optional4)}
                            alt="Optional"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        {formData.optional5 ? (
                          <img
                            src={URL.createObjectURL(formData.optional5)}
                            alt="Optional"
                            className="w-20 h-20 object-cover border rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 border rounded"></div>
                        )}
                      </div>
                      <div>
                        {formData.optional6 ? (
                          <img
                            src={URL.createObjectURL(formData.optional6)}
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
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md"
                  >
                    Submit Application
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
