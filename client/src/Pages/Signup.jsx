import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import signupImage from '../Assets/SignupImage.jpg'
import backgroundImg from '../Assets/Background.jpg'

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      if (!rememberMe) {
        await supabase.auth.signOut()
      }
      alert('Check your email for confirmation')
      navigate('/login')
    }
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) setError(error.message)
  }

  return (
    <>
    {showTermsModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }}>

          {/* Modal header */}
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-extrabold text-gray-900">Terms and Conditions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Hanap.ph — Effective Date: January 1, 2025</p>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-6 py-5 text-sm text-gray-700 space-y-5 flex-1 leading-relaxed">

            <section>
              <h3 className="font-bold text-gray-900 mb-1">1. Acceptance of Terms</h3>
              <p>By creating an account or using the Hanap.ph platform (the "Platform"), you agree to be bound by these Terms and Conditions ("Terms") and all applicable laws and regulations of the Republic of the Philippines. If you do not agree to these Terms, you must not access or use the Platform. Hanap.ph reserves the right to modify these Terms at any time. Continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">2. Service Description</h3>
              <p>Hanap.ph is an online marketplace that connects customers ("Customers") with independent home service providers ("Taskers") for various household services including but not limited to cleaning, carpentry, plumbing, electrical work, aircon servicing, and other related services. Hanap.ph acts solely as an intermediary platform and is not a direct service provider. The actual services are rendered by independent Taskers who are not employees, agents, or contractors of Hanap.ph.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">3. Account Registration</h3>
              <p>You must be at least 18 years old to register an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must notify Hanap.ph immediately of any unauthorized use of your account. Hanap.ph reserves the right to suspend or terminate accounts that violate these Terms.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">4. Booking and Payment Policies</h3>
              <p>Bookings are confirmed upon receipt of full payment through the Platform's accepted payment methods. Service rates are set by individual Taskers and displayed on their profiles. Hanap.ph charges a platform fee of 30% of the total booking value, which is deducted from the Tasker's payout. Customers are required to pay the full service fee prior to service commencement. All transactions are processed in Philippine Peso (PHP). Hanap.ph uses third-party payment processors and does not store credit card information on its servers. Prices are inclusive of applicable taxes unless otherwise stated.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">5. Refund Policy</h3>
              <p>Customers may request a full refund if a booking is cancelled before the Tasker has been dispatched. Once a Tasker has been assigned and is on the way to the service location, cancellations may be subject to a cancellation fee equivalent to 20% of the total booking value. Refunds for unsatisfactory service must be raised within 24 hours of service completion and are subject to review by Hanap.ph. Approved refunds will be credited to the Customer's Hanap.ph e-wallet within 3–5 business days. Refunds to the original payment method may take 7–14 business days depending on the payment provider. Hanap.ph reserves the right to deny refund requests that do not meet the eligibility criteria.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">6. User Responsibilities</h3>
              <p>As a Customer, you agree to: (a) provide accurate service location and task descriptions; (b) ensure a safe and accessible environment for the Tasker; (c) not request services that are illegal, hazardous, or outside the scope of the Platform; (d) treat Taskers with respect and courtesy; (e) not attempt to circumvent the Platform by engaging Taskers directly for future services discovered through Hanap.ph; and (f) comply with all applicable Philippine laws and regulations in connection with your use of the Platform.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">7. Tasker Responsibilities</h3>
              <p>Taskers registered on the Platform agree to: (a) provide accurate professional information, credentials, and service capabilities; (b) fulfill accepted bookings promptly and with professional quality; (c) maintain appropriate licenses or permits required by Philippine law for their respective trade; (d) carry their own tools, materials, and equipment unless otherwise agreed with the Customer; (e) not solicit Customers outside of the Platform for services facilitated through Hanap.ph; and (f) comply with all applicable laws including but not limited to the Labor Code of the Philippines and relevant local ordinances.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">8. Privacy Policy Summary</h3>
              <p>Hanap.ph collects personal information including your name, email address, mobile number, and location data for the purposes of account management, service delivery, and platform improvement. Your information may be shared with Taskers solely for the purpose of completing your booked service. Hanap.ph does not sell your personal data to third parties. Location data is collected during active bookings to enable navigation and real-time tracking features. By using the Platform, you consent to the collection and processing of your personal data in accordance with the Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012. You may request access to, correction of, or deletion of your personal data by contacting our support team.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">9. Prohibited Conduct</h3>
              <p>The following conduct is strictly prohibited on the Platform: (a) posting false, misleading, or fraudulent information; (b) harassing, threatening, or discriminating against other users or Taskers; (c) attempting to hack, disrupt, or interfere with the Platform's systems or infrastructure; (d) using the Platform for money laundering or any other illegal financial activity; (e) creating multiple accounts to circumvent suspensions or bans; (f) posting or transmitting offensive, obscene, or defamatory content in reviews or messages; and (g) engaging in any conduct that violates the rights of other users, Taskers, or third parties. Violations may result in immediate account suspension and referral to appropriate Philippine law enforcement authorities.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">10. Limitation of Liability</h3>
              <p>Hanap.ph provides the Platform on an "as is" and "as available" basis. To the maximum extent permitted by applicable Philippine law, Hanap.ph shall not be liable for: (a) any indirect, incidental, special, or consequential damages arising from your use of the Platform; (b) the quality, safety, legality, or fitness for purpose of any service performed by a Tasker; (c) property damage or personal injury occurring during or after a service engagement; (d) any technical failures, service interruptions, or data loss; or (e) losses resulting from unauthorized access to your account. Hanap.ph's total liability to you for any claim shall not exceed the total fees paid by you for the specific booking giving rise to the claim.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">11. Intellectual Property</h3>
              <p>All content on the Hanap.ph Platform, including but not limited to logos, trademarks, design, text, graphics, and software, is the exclusive property of Hanap.ph and is protected under applicable intellectual property laws of the Philippines. You may not reproduce, distribute, modify, or create derivative works from any Platform content without prior written consent from Hanap.ph.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">12. Dispute Resolution</h3>
              <p>In the event of a dispute between a Customer and a Tasker, Hanap.ph may, at its discretion, facilitate mediation between the parties. However, Hanap.ph is not obligated to resolve disputes and its decision in any mediation is non-binding. Any unresolved disputes arising from the use of the Platform shall be submitted to the appropriate courts or alternative dispute resolution bodies in Caloocan City, Metro Manila, Philippines.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">13. Governing Law</h3>
              <p>These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines, including but not limited to the Civil Code of the Philippines, the Electronic Commerce Act (Republic Act No. 8792), the Consumer Act of the Philippines (Republic Act No. 7394), and the Data Privacy Act of 2012 (Republic Act No. 10173). Any legal action or proceeding relating to your access to, or use of, the Platform shall be instituted in a court of competent jurisdiction in Caloocan City, Metro Manila.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-1">14. Contact Information</h3>
              <p>If you have questions or concerns about these Terms and Conditions, please contact us at: Hanap.ph Support, St. Clare College of Caloocan, Zabarte Road, Camarin, Caloocan City, Metro Manila, Philippines. Email: support@hanap.ph. Operating Hours: Monday to Sunday, 7:00 AM – 5:00 PM.</p>
            </section>

          </div>

          {/* Modal footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex gap-3">
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setAgreedToTerms(true); setShowTermsModal(false) }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              I Agree
            </button>
          </div>

        </div>
      </div>
    )}
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden flex"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Left - Form */}
        <div className="w-full md:w-1/2 p-10">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-white">Sign Up</h1>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white text-sm"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
              />
              <span className="text-gray-300 text-sm">Remember Me</span>
            </label>

            {/* Terms and Conditions */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={() => { if (!agreedToTerms) setShowTermsModal(true) else setAgreedToTerms(false) }}
                className="w-4 h-4 mt-0.5 rounded accent-orange-500 cursor-pointer flex-shrink-0"
              />
              <span className="text-gray-300 text-sm">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-orange-300 underline hover:text-orange-200 font-semibold"
                >
                  Terms and Conditions
                </button>
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={loading || !agreedToTerms}
              className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold text-lg disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing up...' : 'Create Account'}
            </button>

            {error && <p className="text-red-300 text-sm">{error}</p>}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 text-gray-300">or sign up with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignup}
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-3 transition-colors text-white hover:bg-white/20"
              style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)' }}
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
              Continue with Google
            </button>
          </div>

          <p className="text-center text-gray-300 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-300 font-semibold hover:text-orange-200">Log In</Link>
          </p>
        </div>

        {/* Right - Image */}
        <div className="hidden md:block w-1/2">
          <img
            src={signupImage}
            alt="Signup"
            className="w-full h-full object-cover"
          />
        </div>

      </div>
    </div>
    </>
  )
}

export default Signup