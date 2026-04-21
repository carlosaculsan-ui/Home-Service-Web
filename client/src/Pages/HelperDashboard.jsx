import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import gcashLogo from '../Assets/GCash_logo.png'
import mayaLogo  from '../Assets/Maya_logo.png'
import {
  LogOut, Briefcase, Wallet, Menu, X,
  CheckCircle2, Clock, User,
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'jobs',     label: 'My Jobs',    icon: Briefcase },
  { key: 'earnings', label: 'Earnings',   icon: Wallet    },
  { key: 'wallet',   label: 'E-Wallet',   icon: Wallet    },
  { key: 'profile',  label: 'My Profile', icon: User      },
]

const MOCK_JOBS = [
  { id: 1, service: 'Deep Cleaning',  tasker: 'Danica Flores', address: 'Brgy. 172, Camarin, Caloocan',  date: 'May 3, 2025',   time: '9:00 AM',  status: 'upcoming',  earn: 300 },
  { id: 2, service: 'Aircon Cleaning',tasker: 'Cj Cerbito',    address: 'Novaliches, Quezon City',       date: 'Apr 28, 2025',  time: '10:00 AM', status: 'completed', earn: 300 },
  { id: 3, service: 'General Repair', tasker: 'Hina Chono',    address: 'Fairview, Quezon City',         date: 'Apr 20, 2025',  time: '8:00 AM',  status: 'completed', earn: 600 },
  { id: 4, service: 'Deep Cleaning',  tasker: 'Danica Flores', address: 'Brgy. 172, Camarin, Caloocan',  date: 'Apr 15, 2025',  time: '1:00 PM',  status: 'completed', earn: 300 },
  { id: 5, service: 'Electrical',     tasker: 'Joanna Montanez',address: 'Tandang Sora, Quezon City',   date: 'Apr 10, 2025',  time: '2:00 PM',  status: 'completed', earn: 600 },
]

const MOCK_EARNINGS = [
  { month: 'April 2025',    jobs: 4, total: 1800 },
  { month: 'March 2025',    jobs: 4, total: 1500 },
  { month: 'February 2025', jobs: 2, total: 600  },
]

const MOCK_TRANSACTIONS = [
  { id: 1, description: 'Job completed — Deep Cleaning',   type: 'credit', amount: 300,  created_at: '2025-04-28T10:00:00Z' },
  { id: 2, description: 'Job completed — General Repair',  type: 'credit', amount: 600,  created_at: '2025-04-20T08:00:00Z' },
  { id: 3, description: 'Cashout via GCash — 09XX-XXX-4567', type: 'debit', amount: 500, created_at: '2025-04-18T14:00:00Z' },
  { id: 4, description: 'Job completed — Deep Cleaning',   type: 'credit', amount: 300,  created_at: '2025-04-15T13:00:00Z' },
]

function HelperSidebar({ tab, setTab, helperName, helperEmail, onLogout, onClose }) {
  return (
    <div className="w-[260px] min-h-screen bg-orange-500 flex flex-col">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-orange-400">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="md:hidden mr-1 p-1 rounded-lg text-white/70 hover:text-white hover:bg-orange-600 transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          )}
          <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
            <svg className="absolute left-1/2 -translate-x-1/2" style={{ top: 0 }} width="40" height="20" viewBox="0 0 40 20" fill="none">
              <line x1="20" y1="2" x2="1"  y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="20" y1="2" x2="39" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="26" y="4" width="4" height="7" fill="white" rx="0.5" />
            </svg>
            <span className="text-white font-black text-3xl leading-none">h</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Hanap.ph</p>
            <p className="text-orange-200 text-xs">Helper Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); onClose?.() }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              tab === key ? 'bg-white text-orange-600' : 'text-white hover:bg-orange-600'
            }`}
          >
            <Icon size={17} className="flex-shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom user info */}
      <div className="px-3 pt-4 pb-6 border-t border-orange-400">
        {(helperName || helperEmail) && (
          <div className="px-3 py-2 mb-2">
            {helperName && <p className="text-white font-semibold text-sm truncate">{helperName}</p>}
            {helperEmail && <p className="text-orange-200 text-xs truncate">{helperEmail}</p>}
            <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Helper</span>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white hover:bg-orange-600 transition-colors text-left"
        >
          <LogOut size={17} className="flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>

    </div>
  )
}

function HelperDashboard() {
  const [tab, setTab] = useState('jobs')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [helperName, setHelperName] = useState('')
  const [helperEmail, setHelperEmail] = useState('')

  // Wallet
  const MOCK_BALANCE = 700
  const [cashoutOpen, setCashoutOpen] = useState(false)
  const [cashoutScreen, setCashoutScreen] = useState(1)
  const [cashoutMethod, setCashoutMethod] = useState('')
  const [cashoutNumber, setCashoutNumber] = useState('')
  const [cashoutName, setCashoutName] = useState('')
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [cashoutErrors, setCashoutErrors] = useState({})
  const [cashoutRef, setCashoutRef] = useState('')
  const [cashoutTimestamp, setCashoutTimestamp] = useState('')
  const [cashoutFinalAmount, setCashoutFinalAmount] = useState(0)

  const formatAmount = (n) => Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formatDate   = (d) => new Date(d).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

  function openCashout() { setCashoutScreen(1); setCashoutMethod(''); setCashoutNumber(''); setCashoutName(''); setCashoutAmount(''); setCashoutErrors({}); setCashoutOpen(true) }
  function closeCashout() { if (cashoutScreen === 2) return; setCashoutOpen(false) }

  async function handleCashoutProceed() {
    const errors = {}
    if (!cashoutMethod) errors.method = 'Please select a cashout method.'
    const ph = cashoutNumber.trim()
    if (!ph) errors.number = 'Account number is required.'
    else if (!/^09\d{9}$/.test(ph)) errors.number = 'Must be an 11-digit number starting with 09.'
    if (!cashoutName.trim()) errors.name = 'Account name is required.'
    const amt = parseFloat(cashoutAmount)
    if (!cashoutAmount || isNaN(amt)) errors.amount = 'Please enter an amount.'
    else if (amt < 100) errors.amount = 'Minimum cashout amount is ₱100.'
    else if (amt > MOCK_BALANCE) errors.amount = 'Amount exceeds your available balance.'
    if (Object.keys(errors).length > 0) { setCashoutErrors(errors); return }
    setCashoutErrors({})
    setCashoutFinalAmount(amt)
    setCashoutRef(String(Math.floor(Math.random() * 900000000000) + 100000000000))
    setCashoutTimestamp(new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }))
    setCashoutScreen(2)
    await new Promise(r => setTimeout(r, 2500))
    setCashoutScreen(3)
  }

  const maskedDisplay = cashoutNumber.length >= 4 ? `09XX-XXX-${cashoutNumber.slice(-4)}` : cashoutNumber || '—'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setHelperEmail(user.email)
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => setHelperName(data?.full_name || ''))
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const completedJobs = MOCK_JOBS.filter(j => j.status === 'completed')
  const upcomingJobs  = MOCK_JOBS.filter(j => j.status === 'upcoming')
  const totalEarned   = completedJobs.reduce((s, j) => s + j.earn, 0)

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* Desktop sidebar */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-30 overflow-y-auto">
        <HelperSidebar tab={tab} setTab={setTab} helperName={helperName} helperEmail={helperEmail} onLogout={handleLogout} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-screen z-40 overflow-y-auto md:hidden">
            <HelperSidebar tab={tab} setTab={setTab} helperName={helperName} helperEmail={helperEmail} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu size={20} className="text-gray-600" />
          </button>
          <p className="font-bold text-gray-800">Helper Dashboard</p>
          <div className="w-9" />
        </div>

        <div className="flex-1 p-4 md:p-8 space-y-6">

          {/* Jobs Tab */}
          {tab === 'jobs' && (
            <>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">My Jobs</h1>
                <p className="text-gray-400 text-sm mt-1">Your assigned and completed jobs.</p>
              </div>

              {/* Assigned Tasker Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Assigned Tasker</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                    D
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-base">Danica Flores</p>
                    <p className="text-sm text-gray-500">Slot 1 · Cleaning Specialist</p>
                    <p className="text-sm text-gray-400">09171234567</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 font-semibold px-3 py-1 rounded-full flex-shrink-0">Active</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Jobs Completed', value: completedJobs.length, color: 'bg-green-100 text-green-600' },
                  { label: 'Upcoming Jobs',  value: upcomingJobs.length,  color: 'bg-blue-100 text-blue-600'  },
                  { label: 'Total Earned',   value: `₱${totalEarned.toLocaleString()}`, color: 'bg-orange-100 text-orange-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className={`text-2xl font-black ${s.color.split(' ')[1]}`}>{s.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Job cards */}
              <div className="space-y-3">
                {MOCK_JOBS.map(job => (
                  <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${job.status === 'upcoming' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        {job.status === 'upcoming'
                          ? <Clock size={18} className="text-blue-500" />
                          : <CheckCircle2 size={18} className="text-green-500" />
                        }
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{job.service}</p>
                        <p className="text-xs text-gray-500">With <span className="font-medium">{job.tasker}</span> · {job.date} at {job.time}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{job.address}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-800 text-sm">₱{job.earn.toLocaleString()}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${job.status === 'upcoming' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {job.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Earnings Tab */}
          {tab === 'earnings' && (
            <>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Earnings</h1>
                <p className="text-gray-400 text-sm mt-1">Your monthly earnings breakdown.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">Month</th>
                      <th className="px-5 py-3 text-center">Jobs</th>
                      <th className="px-5 py-3 text-right">Total Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {MOCK_EARNINGS.map(e => (
                      <tr key={e.month} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-800">{e.month}</td>
                        <td className="px-5 py-4 text-center text-gray-600">{e.jobs}</td>
                        <td className="px-5 py-4 text-right font-bold text-orange-500">₱{e.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-5 py-3 font-bold text-gray-800">Total</td>
                      <td className="px-5 py-3 text-center font-bold text-gray-700">{MOCK_EARNINGS.reduce((s, e) => s + e.jobs, 0)}</td>
                      <td className="px-5 py-3 text-right font-bold text-orange-500">₱{MOCK_EARNINGS.reduce((s, e) => s + e.total, 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Wallet Tab */}
          {tab === 'wallet' && (
            <>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">E-Wallet</h1>
                <p className="text-gray-400 text-sm mt-1">Your Hanap.ph wallet balance and transactions.</p>
              </div>

              {/* Balance card */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-white" />
                    <p className="text-white font-semibold text-base">Hanap.ph Wallet Balance</p>
                  </div>
                  <button
                    onClick={openCashout}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/30 transition-colors"
                  >
                    Withdraw
                  </button>
                </div>
                <p className="text-white text-4xl font-bold tracking-tight">₱{formatAmount(MOCK_BALANCE)}</p>
                <p className="text-orange-100 text-sm mt-2">Your earnings from completed jobs</p>
              </div>

              {/* Transaction history */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-800">Transaction History</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {MOCK_TRANSACTIONS.map(txn => (
                    <div key={txn.id} className="flex items-center justify-between px-5 py-4 gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-700 leading-snug">{txn.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(txn.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-sm font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                          {txn.type === 'credit' ? '+' : '-'}₱{formatAmount(txn.amount)}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${txn.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {txn.type === 'credit' ? 'Credit' : 'Debit'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cashout modal */}
              {cashoutOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={cashoutScreen !== 2 ? closeCashout : undefined}>
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>

                    {cashoutScreen === 1 && (
                      <>
                        <button onClick={closeCashout} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-lg font-bold">✕</button>
                        <h3 className="text-lg font-bold text-gray-800 mb-5">Cash Out</h3>

                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Method</p>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[{ key: 'gcash', logo: gcashLogo, label: 'GCash' }, { key: 'maya', logo: mayaLogo, label: 'Maya' }].map(m => (
                            <button key={m.key} onClick={() => setCashoutMethod(m.key)}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${cashoutMethod === m.key ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                              <img src={m.logo} alt={m.label} className="h-7 object-contain" />
                              <span className="text-xs font-semibold text-gray-700">{m.label}</span>
                            </button>
                          ))}
                        </div>
                        {cashoutErrors.method && <p className="text-xs text-red-500 mb-3">{cashoutErrors.method}</p>}

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Number</label>
                            <input type="tel" maxLength={11} value={cashoutNumber} onChange={e => setCashoutNumber(e.target.value.replace(/\D/g, ''))}
                              placeholder="09XXXXXXXXX" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                            {cashoutErrors.number && <p className="text-xs text-red-500 mt-1">{cashoutErrors.number}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Name</label>
                            <input type="text" value={cashoutName} onChange={e => setCashoutName(e.target.value)}
                              placeholder="Full name on account" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                            {cashoutErrors.name && <p className="text-xs text-red-500 mt-1">{cashoutErrors.name}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount (₱)</label>
                            <input type="number" value={cashoutAmount} onChange={e => setCashoutAmount(e.target.value)}
                              placeholder="Min. ₱100" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                            {cashoutErrors.amount && <p className="text-xs text-red-500 mt-1">{cashoutErrors.amount}</p>}
                          </div>
                        </div>

                        <button onClick={handleCashoutProceed} className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors">
                          Proceed
                        </button>
                      </>
                    )}

                    {cashoutScreen === 2 && (
                      <div className="flex flex-col items-center py-6 gap-4">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-700 font-semibold">Processing your cashout...</p>
                        <p className="text-sm text-gray-400">Please wait, do not close this window.</p>
                      </div>
                    )}

                    {cashoutScreen === 3 && (
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-1">
                          <CheckCircle2 size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Cashout Successful!</h3>
                        <p className="text-sm text-gray-500">₱{formatAmount(cashoutFinalAmount)} has been sent to {maskedDisplay}.</p>
                        <div className="w-full bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm mt-1">
                          <div className="flex justify-between"><span className="text-gray-400">Reference No.</span><span className="font-semibold text-gray-700">{cashoutRef}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Date & Time</span><span className="font-semibold text-gray-700">{cashoutTimestamp}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-bold text-orange-500">₱{formatAmount(cashoutFinalAmount)}</span></div>
                        </div>
                        <button onClick={() => setCashoutOpen(false)} className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors">Done</button>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </>
          )}

          {/* Profile Tab */}
          {tab === 'profile' && (
            <>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">My Profile</h1>
                <p className="text-gray-400 text-sm mt-1">Your account information.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-2xl">
                  {helperName?.charAt(0)?.toUpperCase() || 'H'}
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Full Name</p>
                  <p className="text-gray-800 font-medium">{helperName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Email</p>
                  <p className="text-gray-800 font-medium">{helperEmail || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Role</p>
                  <span className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">Helper</span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default HelperDashboard
