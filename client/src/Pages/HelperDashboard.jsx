import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import gcashLogo from '../Assets/GCash_logo.png'
import mayaLogo  from '../Assets/Maya_logo.png'
import {
  LogOut, Briefcase, Wallet, Menu, X,
  CheckCircle2, Clock, User, Bell, Home,
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'jobs',          label: 'My Jobs',       icon: Briefcase },
  { key: 'earnings',      label: 'Earnings',      icon: Wallet    },
  { key: 'wallet',        label: 'E-Wallet',      icon: Wallet    },
  { key: 'notifications', label: 'Notifications', icon: Bell      },
  { key: 'profile',       label: 'My Profile',    icon: User      },
]

function timeAgo(dateString) {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

const MOCK_JOBS = [
  { id: 1, service: 'Deep Cleaning',  tasker: 'Danica Flores',   address: 'Brgy. 172, Camarin, Caloocan', date: 'May 3, 2025',  time: '9:00 AM',  status: 'upcoming',  earn: 300 },
  { id: 2, service: 'Aircon Cleaning',tasker: 'Cj Cerbito',      address: 'Novaliches, Quezon City',      date: 'Apr 28, 2025', time: '10:00 AM', status: 'completed', earn: 300 },
  { id: 3, service: 'General Repair', tasker: 'Hina Chono',      address: 'Fairview, Quezon City',        date: 'Apr 20, 2025', time: '8:00 AM',  status: 'completed', earn: 600 },
  { id: 4, service: 'Deep Cleaning',  tasker: 'Danica Flores',   address: 'Brgy. 172, Camarin, Caloocan', date: 'Apr 15, 2025', time: '1:00 PM',  status: 'completed', earn: 300 },
  { id: 5, service: 'Electrical',     tasker: 'Joanna Montanez', address: 'Tandang Sora, Quezon City',    date: 'Apr 10, 2025', time: '2:00 PM',  status: 'completed', earn: 600 },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function HelperSidebar({ tab, setTab, helperName, helperEmail, userId, onLogout, onClose, unreadNotifCount = 0, setNotifications, setUnreadNotifCount, setNotifTabOpen }) {
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
            onClick={async () => {
              setTab(key); onClose?.()
              if (key === 'notifications') {
                setUnreadNotifCount(0)
                await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                setNotifTabOpen(true)
              } else {
                setNotifTabOpen(false)
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              tab === key ? 'bg-white text-orange-600' : 'text-white hover:bg-orange-600'
            }`}
          >
            <Icon size={17} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {key === 'notifications' && unreadNotifCount > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom user info */}
      <div className="px-3 pt-4 pb-6 border-t border-orange-400">
        {(helperName || helperEmail) && (
          <div className="px-4 mb-2">
            {helperName && <p className="text-white font-semibold text-sm truncate">{helperName}</p>}
            {helperEmail && <p className="text-orange-200 text-xs truncate">{helperEmail}</p>}
          </div>
        )}
        <Link
          to="/"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/80 hover:bg-orange-600 hover:text-white transition-colors"
        >
          <Home size={17} className="flex-shrink-0" />
          Back to Home
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-200 hover:bg-orange-600 hover:text-white transition-colors text-left"
        >
          <LogOut size={17} className="flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>

    </div>
  )
}

// ─── Helper E-Wallet ──────────────────────────────────────────────────────────

function HelperEWallet({ userId }) {
  const [balance, setBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [cashoutOpen, setCashoutOpen] = useState(false)
  const [cashoutScreen, setCashoutScreen] = useState(1)
  const [cashoutMethod, setCashoutMethod] = useState('')
  const [cashoutNumber, setCashoutNumber] = useState('')
  const [cashoutName, setCashoutName] = useState('')
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [cashoutErrors, setCashoutErrors] = useState({})
  const [cashoutApiError, setCashoutApiError] = useState('')
  const [cashoutRef, setCashoutRef] = useState('')
  const [cashoutTimestamp, setCashoutTimestamp] = useState('')
  const [cashoutFinalAmount, setCashoutFinalAmount] = useState(0)
  const [txnFilter, setTxnFilter] = useState('all')

  useEffect(() => {
    if (!userId) return
    async function fetchWallet() {
      setLoading(true)
      const [{ data: profile }, { data: txns }] = await Promise.all([
        supabase.from('profiles').select('wallet_balance').eq('id', userId).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      ])
      setBalance(Number(profile?.wallet_balance) || 0)
      setTransactions(txns ?? [])
      setLoading(false)
    }
    fetchWallet()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`helper-wallet-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` },
        async () => {
          const [{ data: profile }, { data: txns }] = await Promise.all([
            supabase.from('profiles').select('wallet_balance').eq('id', userId).single(),
            supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
          ])
          setBalance(Number(profile?.wallet_balance) || 0)
          setTransactions(txns ?? [])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const formatAmount = (n) => Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formatDate = (d) => new Date(d).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

  function openCashout() {
    setCashoutScreen(1); setCashoutMethod(''); setCashoutNumber(''); setCashoutName('')
    setCashoutAmount(''); setCashoutErrors({}); setCashoutApiError(''); setCashoutOpen(true)
  }
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
    else if (amt < 80) errors.amount = 'Minimum cashout amount is ₱80.'
    else if (amt > balance) errors.amount = 'Amount exceeds your available balance.'
    if (Object.keys(errors).length > 0) { setCashoutErrors(errors); return }
    setCashoutErrors({}); setCashoutApiError('')
    setCashoutFinalAmount(amt)
    const ref = String(Math.floor(Math.random() * 900000000000) + 100000000000)
    const ts = new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    setCashoutRef(ref); setCashoutTimestamp(ts); setCashoutScreen(2)
    await new Promise(r => setTimeout(r, 2500))
    const methodLabel = cashoutMethod === 'gcash' ? 'GCash' : 'Maya'
    const maskedNumber = `09XX-XXX-${cashoutNumber.slice(-4)}`
    const { error: rpcError } = await supabase.rpc('increment_wallet_balance', { target_user_id: userId, increment_amount: -amt })
    if (rpcError) { setCashoutApiError('Failed to process cashout. Please try again.'); setCashoutScreen(1); return }
    const { error: txnError } = await supabase.from('wallet_transactions').insert({
      user_id: userId, booking_id: null, amount: amt, type: 'debit',
      description: `Cashout via ${methodLabel} — ${maskedNumber}`,
      created_at: new Date().toISOString(),
    })
    if (txnError) {
      setCashoutApiError('Cashout sent but transaction log failed. Contact support if your history is missing.')
    }
    setBalance(prev => prev - amt)
    setTransactions(prev => [{
      id: `co-${Date.now()}`, user_id: userId, booking_id: null, amount: amt, type: 'debit',
      description: `Cashout via ${methodLabel} — ${maskedNumber}`,
      created_at: new Date().toISOString(),
    }, ...prev])
    setCashoutScreen(3)
  }

  const maskedDisplay = cashoutNumber.length >= 4 ? `09XX-XXX-${cashoutNumber.slice(-4)}` : cashoutNumber || '—'

  return (
    <div>
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 mb-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-white" />
            <p className="text-white font-semibold text-base">Hanap.ph Wallet Balance</p>
          </div>
          <button
            onClick={openCashout}
            disabled={loading || balance === null || balance < 80}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/30 transition-colors"
          >Withdraw</button>
        </div>
        {loading ? (
          <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin my-1" />
        ) : (
          <p className="text-white text-4xl font-bold tracking-tight">₱{formatAmount(balance)}</p>
        )}
        <p className="text-orange-100 text-sm mt-2">Your earnings from completed jobs</p>
        {!loading && balance !== null && balance < 80 && (
          <p className="text-orange-200 text-xs mt-1">Minimum ₱80 balance required to withdraw</p>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-base font-bold text-gray-800">Transaction History</h3>
          <div className="flex gap-2">
            {['all', 'credit', 'debit'].map(f => (
              <button
                key={f}
                onClick={() => setTxnFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${txnFilter === f ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'}`}
              >{f === 'all' ? 'All' : f === 'credit' ? 'Credits' : 'Debits'}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No wallet activity yet. Your earnings will appear here.</p>
          </div>
        ) : (() => {
          const filtered = txnFilter === 'all' ? transactions : transactions.filter(t => t.type === txnFilter)
          return filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No {txnFilter === 'credit' ? 'credit' : 'debit'} transactions found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(txn => (
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
          )
        })()}
      </div>

      {/* Cashout Modal */}
      {cashoutOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={cashoutScreen !== 2 ? closeCashout : undefined}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>

            {cashoutScreen === 1 && (
              <>
                <button onClick={closeCashout} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-lg font-bold">✕</button>
                <h3 className="text-lg font-bold text-gray-800 mb-5">Cash Out</h3>

                {cashoutApiError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                    {cashoutApiError}
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Select Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setCashoutMethod('gcash'); setCashoutErrors(p => ({ ...p, method: undefined })) }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${cashoutMethod === 'gcash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-green-300'}`}
                    >
                      <img src={gcashLogo} alt="GCash" className="h-5 w-auto" />
                    </button>
                    <button
                      onClick={() => { setCashoutMethod('maya'); setCashoutErrors(p => ({ ...p, method: undefined })) }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${cashoutMethod === 'maya' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-purple-300'}`}
                    >
                      <img src={mayaLogo} alt="Maya" className="h-5 w-auto" />
                    </button>
                  </div>
                  {cashoutErrors.method && <p className="text-red-500 text-xs mt-1">{cashoutErrors.method}</p>}
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {cashoutMethod === 'maya' ? 'Maya Number' : 'GCash Number'}
                  </label>
                  <input
                    type="tel"
                    value={cashoutNumber}
                    onChange={e => { setCashoutNumber(e.target.value.replace(/\D/g, '').slice(0, 11)); setCashoutErrors(p => ({ ...p, number: undefined })) }}
                    placeholder="09XX XXX XXXX"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${cashoutErrors.number ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {cashoutErrors.number && <p className="text-red-500 text-xs mt-1">{cashoutErrors.number}</p>}
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={cashoutName}
                    onChange={e => { setCashoutName(e.target.value); setCashoutErrors(p => ({ ...p, name: undefined })) }}
                    placeholder="Enter account name"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${cashoutErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {cashoutErrors.name && <p className="text-red-500 text-xs mt-1">{cashoutErrors.name}</p>}
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount to Cash Out</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
                    <input
                      type="number"
                      min="80"
                      max={balance ?? 0}
                      value={cashoutAmount}
                      onChange={e => { setCashoutAmount(e.target.value); setCashoutErrors(p => ({ ...p, amount: undefined })) }}
                      placeholder="Enter amount"
                      className={`w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${cashoutErrors.amount ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Available balance: ₱{formatAmount(balance ?? 0)} · Min ₱80</p>
                  {cashoutErrors.amount && <p className="text-red-500 text-xs mt-1">{cashoutErrors.amount}</p>}
                </div>

                <div className="flex gap-3">
                  <button onClick={closeCashout} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={handleCashoutProceed} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors">Proceed</button>
                </div>
              </>
            )}

            {cashoutScreen === 2 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-base font-bold text-gray-800 mb-1">Processing your cashout...</p>
                <p className="text-sm text-gray-400">Please wait, do not close this window.</p>
              </div>
            )}

            {cashoutScreen === 3 && (
              <>
                <div className="flex flex-col items-center text-center mb-5">
                  <CheckCircle2 className="w-14 h-14 text-green-500 mb-3" />
                  <h3 className="text-lg font-bold text-gray-800">Cashout Successful!</h3>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm mb-5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Sent</span>
                    <span className="font-bold text-gray-800">₱{formatAmount(cashoutFinalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">To</span>
                    <span className="font-semibold text-gray-800">
                      {cashoutMethod === 'gcash' ? 'GCash' : 'Maya'} · {maskedDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-semibold text-gray-800">{cashoutName}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2.5">
                    <span className="text-gray-500">Remaining Balance</span>
                    <span className="font-bold text-orange-600">₱{formatAmount(balance ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reference No.</span>
                    <span className="font-mono text-xs text-gray-700">{cashoutRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date &amp; Time</span>
                    <span className="text-gray-700 text-xs text-right">{cashoutTimestamp}</span>
                  </div>
                </div>

                {cashoutApiError && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{cashoutApiError}</p>
                )}

                <button onClick={() => setCashoutOpen(false)} className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors">Done</button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper Profile ───────────────────────────────────────────────────────────

function InfoField({ label, value, wide = false }) {
  return (
    <div className={wide ? 'col-span-2 w-full' : 'w-full'}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || 'Not provided'}</p>
    </div>
  )
}

function HelperProfile({ userId, helperName, helperEmail }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [helperId, setHelperId] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [pwResetSent, setPwResetSent] = useState(false)
  const [pwResetLoading, setPwResetLoading] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function fetchProfile() {
      const [{ data: prof }, { data: app }, { data: helperRow }] = await Promise.all([
        supabase.from('profiles').select('phone').eq('id', userId).maybeSingle(),
        supabase.from('helper_applications').select('age, address, emergency_contact_name, emergency_contact_phone').eq('user_id', userId).maybeSingle(),
        supabase.from('helpers').select('id, profile_photo').eq('user_id', userId).maybeSingle(),
      ])
      setProfile({ phone: prof?.phone ?? '', ...(app ?? {}) })
      setPhone(prof?.phone ?? '')
      setHelperId(helperRow?.id ?? null)
      setPhotoUrl(helperRow?.profile_photo ?? null)
      setLoading(false)
    }
    fetchProfile()
  }, [userId])

  async function handlePasswordReset() {
    setPwResetLoading(true)
    await supabase.auth.resetPasswordForEmail(helperEmail, { redirectTo: `${window.location.origin}/reset-password` })
    setPwResetLoading(false)
    setPwResetSent(true)
    setTimeout(() => setPwResetSent(false), 20000)
  }

  async function handleSave() {
    if (phone.trim() && !/^09\d{9}$/.test(phone.trim())) {
      showToast('Phone must be a valid PH number (e.g. 09171234567).', 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ phone: phone.trim() || null }).eq('id', userId)
    setSaving(false)
    if (error) { showToast('Failed to update profile.', 'error'); return }
    setProfile(prev => ({ ...prev, phone: phone.trim() }))
    setEditing(false)
    showToast('Profile updated successfully!')
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `profile-photos/${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('helper-files').upload(path, file, { upsert: true })
    if (uploadError) {
      setPhotoUploading(false)
      showToast('Photo upload failed. Please try again.', 'error')
      return
    }
    const { data: urlData } = supabase.storage.from('helper-files').getPublicUrl(path)
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
    if (helperId) await supabase.from('helpers').update({ profile_photo: publicUrl }).eq('id', helperId)
    setPhotoUrl(publicUrl)
    setPhotoUploading(false)
    showToast('Profile photo updated!')
  }

  async function handleRemovePhoto() {
    if (helperId) await supabase.from('helpers').update({ profile_photo: null }).eq('id', helperId)
    setPhotoUrl(null)
    showToast('Profile photo removed')
  }

  async function handleDeactivate() {
    setDeactivateError('')
    setDeactivating(true)
    if (helperId) await supabase.from('helpers').update({ is_active: false }).eq('id', helperId)
    await supabase.from('profiles').update({ is_archived: true }).eq('id', userId)
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) return (
    <div className="flex justify-center mt-20">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300'

  return (
    <div className="space-y-6">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center text-center gap-3">
        <div className="relative">
          {photoUrl ? (
            <img src={photoUrl} alt={helperName} className="w-28 h-28 rounded-full object-cover border-4 border-orange-100" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-3xl font-bold text-orange-400">{helperName?.charAt(0)?.toUpperCase() ?? '?'}</span>
            </div>
          )}
          {photoUrl && !photoUploading && (
            <button
              onClick={handleRemovePhoto}
              className="absolute top-1 right-1 w-[22px] h-[22px] rounded-full bg-red-500 border-2 border-white flex items-center justify-center cursor-pointer"
              title="Remove photo"
            >
              <span className="text-white text-[0.65rem] font-bold leading-none">✕</span>
            </button>
          )}
          {photoUploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <label className={`cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
          photoUploading
            ? 'opacity-50 pointer-events-none border-gray-200 text-gray-400'
            : 'border-orange-400 text-orange-500 hover:bg-orange-50'
        }`}>
          {photoUploading ? 'Uploading…' : 'Upload Photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
        </label>
        <div>
          <h3 className="text-2xl font-extrabold text-gray-800">{helperName || '—'}</h3>
          <span className="inline-block mt-1.5 bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">Helper</span>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Personal Information</h4>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs font-semibold text-orange-500 border border-orange-300 px-3 py-1 rounded-lg hover:bg-orange-50 transition-colors">Edit</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Full Name" value={helperName} />
          <InfoField label="Email" value={helperEmail} />

          <div className="w-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
            {editing ? (
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09XXXXXXXXX" maxLength={11} className={inputCls} />
            ) : (
              <p className="text-sm text-gray-800 font-medium">{profile?.phone || 'Not provided'}</p>
            )}
          </div>

          {profile?.age && <InfoField label="Age" value={profile.age} />}
          {profile?.address && <InfoField label="Address" value={profile.address} wide />}
          {profile?.emergency_contact_name && (
            <div className="w-full">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Emergency Contact</p>
              <p className="text-sm text-gray-800 font-medium">{profile.emergency_contact_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{profile.emergency_contact_phone}</p>
            </div>
          )}
        </div>
        {editing && (
          <div className="flex gap-2 mt-5 justify-end">
            <button onClick={() => { setPhone(profile?.phone ?? ''); setEditing(false) }} className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="text-sm px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Change Password</h4>
        <p className="text-xs text-gray-400 mb-4">We'll send a password reset link to <span className="text-gray-500 font-medium">{helperEmail}</span>.</p>
        <button
          onClick={handlePasswordReset}
          disabled={pwResetSent || pwResetLoading}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-orange-300 text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pwResetSent ? 'Reset email sent!' : pwResetLoading ? 'Sending…' : 'Send Reset Email'}
        </button>
        {pwResetSent && (
          <p className="text-xs text-green-600 mt-3">Check your email inbox and click the link to set a new password.</p>
        )}
      </div>

      {/* Deactivate Account */}
      <div className="border border-gray-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Deactivate Account</p>
        <p className="text-xs text-gray-400 mb-4">Once deactivated, you will be logged out and your account will be disabled.</p>
        <button
          onClick={() => { setDeactivateError(''); setShowDeactivateModal(true) }}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Deactivate Account
        </button>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-gray-800">Deactivate Account?</h3>
            <p className="text-sm text-gray-500">Your account will be deactivated and you will be logged out immediately. This action cannot be undone from the app.</p>
            {deactivateError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deactivateError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowDeactivateModal(false); setDeactivateError('') }}
                disabled={deactivating}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {deactivating ? 'Deactivating…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function HelperDashboard() {
  const [tab, setTab] = useState('jobs')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userId, setUserId] = useState(null)
  const [helperName, setHelperName] = useState('')
  const [helperEmail, setHelperEmail] = useState('')
  const [assignedTaskers, setAssignedTaskers] = useState([])
  const [expandedMonths, setExpandedMonths] = useState({})
  const [notifications, setNotifications] = useState([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [notifTabOpen, setNotifTabOpen] = useState(false)

  useEffect(() => {
    async function loadHelper() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setHelperEmail(user.email)
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setHelperName(profile?.full_name || '')
      const { data: helperRow } = await supabase.from('helpers').select('id').eq('user_id', user.id).maybeSingle()
      if (helperRow) {
        const { data: assignments } = await supabase
          .from('tasker_helpers')
          .select('slot, taskers(id, name, phone, profile_photo, role)')
          .eq('helper_id', helperRow.id)
        setAssignedTaskers(assignments ?? [])
      }
    }
    loadHelper()
  }, [])

  useEffect(() => {
    if (!userId) return
    async function fetchNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      setNotifications(data ?? [])
      if (!notifTabOpen) {
        setUnreadNotifCount(data?.filter(n => !n.is_read).length ?? 0)
      }
    }
    fetchNotifications()
    const channel = supabase
      .channel(`helper-notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async () => {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30)
          setNotifications(data ?? [])
          if (!notifTabOpen) {
            setUnreadNotifCount(data?.filter(n => !n.is_read).length ?? 0)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, notifTabOpen])

  async function markOneNotifRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadNotifCount(c => Math.max(0, c - 1))
  }

  async function deleteNotif(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => {
      const target = prev.find(n => n.id === id)
      if (target && !target.is_read) setUnreadNotifCount(c => Math.max(0, c - 1))
      return prev.filter(n => n.id !== id)
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const completedJobs = MOCK_JOBS.filter(j => j.status === 'completed')
  const upcomingJobs  = MOCK_JOBS.filter(j => j.status === 'upcoming')
  const totalEarned   = completedJobs.reduce((s, j) => s + j.earn, 0)

  function groupByMonth(jobs) {
    const groups = {}
    jobs.forEach(job => {
      const key = new Date(job.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (!groups[key]) groups[key] = []
      groups[key].push(job)
    })
    return groups
  }

  const jobsByMonth = groupByMonth(MOCK_JOBS)
  const earningsByMonth = groupByMonth(completedJobs)
  const now = new Date()
  const thisMonthKey = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const thisMonthTotal = (earningsByMonth[thisMonthKey] ?? []).reduce((s, j) => s + j.earn, 0)

  function toggleMonth(key) {
    setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* Desktop sidebar */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-30 overflow-y-auto">
        <HelperSidebar tab={tab} setTab={setTab} helperName={helperName} helperEmail={helperEmail} userId={userId} onLogout={handleLogout} unreadNotifCount={unreadNotifCount} setNotifications={setNotifications} setUnreadNotifCount={setUnreadNotifCount} setNotifTabOpen={setNotifTabOpen} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-screen z-40 overflow-y-auto md:hidden">
            <HelperSidebar tab={tab} setTab={setTab} helperName={helperName} helperEmail={helperEmail} userId={userId} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} unreadNotifCount={unreadNotifCount} setNotifications={setNotifications} setUnreadNotifCount={setUnreadNotifCount} setNotifTabOpen={setNotifTabOpen} />
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
          <button
            onClick={() => { setTab('notifications'); setUnreadNotifCount(0); setNotifTabOpen(true); supabase.from('notifications').update({ is_read: true }).eq('user_id', userId) }}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>
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
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Assigned Tasker{assignedTaskers.length > 1 ? 's' : ''}</p>
                {assignedTaskers.length === 0 ? (
                  <p className="text-sm text-gray-400">No tasker assigned yet.</p>
                ) : (
                  <div className="space-y-4">
                    {assignedTaskers.map((a, i) => (
                      <div key={i} className="flex items-center gap-4">
                        {a.taskers?.profile_photo ? (
                          <img src={a.taskers.profile_photo} alt={a.taskers.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                            {a.taskers?.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-base">{a.taskers?.name ?? '—'}</p>
                          <p className="text-sm text-gray-500">Slot {a.slot}{a.taskers?.role ? ` · ${a.taskers.role}` : ''}</p>
                          {a.taskers?.phone && <p className="text-sm text-gray-400">{a.taskers.phone}</p>}
                        </div>
                        <span className="text-xs bg-green-100 text-green-600 font-semibold px-3 py-1 rounded-full flex-shrink-0">Active</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Jobs Completed', value: completedJobs.length,                          color: 'text-green-600'  },
                  { label: 'Upcoming Jobs',  value: upcomingJobs.length,                           color: 'text-blue-600'   },
                  { label: 'Total Earned',   value: `₱${totalEarned.toLocaleString()}`,            color: 'text-orange-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Job cards grouped by month */}
              <div className="space-y-6">
                {Object.entries(jobsByMonth).map(([month, jobs]) => (
                  <div key={month}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{month}</p>
                    <div className="space-y-3">
                      {jobs.map(job => (
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

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { emoji: '💵', label: 'Total Earned',   value: `₱${totalEarned.toLocaleString()}` },
                  { emoji: '📅', label: 'This Month',     value: `₱${thisMonthTotal.toLocaleString()}` },
                  { emoji: '✅', label: 'Completed Jobs', value: completedJobs.length },
                ].map(({ emoji, label, value }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-lg">{emoji}</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                      <p className="text-2xl font-extrabold text-orange-500 mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Monthly Breakdown */}
              <div className="space-y-3">
                {Object.entries(earningsByMonth).map(([month, jobs]) => {
                  const monthTotal = jobs.reduce((s, j) => s + j.earn, 0)
                  const isOpen = expandedMonths[month] ?? false
                  return (
                    <div key={month} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button
                        onClick={() => toggleMonth(month)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-800">{month}</span>
                          <span className="text-xs text-gray-400">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-orange-500">₱{monthTotal.toLocaleString()}</span>
                          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                          {jobs.map(job => (
                            <div key={job.id} className="flex items-center justify-between px-5 py-3 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{job.service}</p>
                                <p className="text-xs text-gray-400">{job.date} at {job.time} · {job.address}</p>
                              </div>
                              <p className="font-bold text-orange-500 text-sm flex-shrink-0">₱{job.earn.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {Object.keys(earningsByMonth).length === 0 && (
                  <p className="text-center text-gray-400 mt-10">No earnings yet.</p>
                )}
              </div>
            </>
          )}

          {/* E-Wallet Tab */}
          {tab === 'wallet' && (
            <>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">E-Wallet</h1>
                <p className="text-gray-400 text-sm mt-1">Your Hanap.ph wallet balance and transactions.</p>
              </div>
              <HelperEWallet userId={userId} />
            </>
          )}

          {/* Notifications Tab */}
          {tab === 'notifications' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
                {notifications.some(n => !n.is_read) && (
                  <button
                    onClick={async () => {
                      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
                      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                      setUnreadNotifCount(0)
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-16">
                  <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No notifications yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.is_read) markOneNotifRead(n.id) }}
                      className={`w-full text-left rounded-2xl px-4 py-4 border transition-colors cursor-pointer ${
                        n.is_read ? 'bg-white border-gray-100 hover:bg-gray-50' : 'bg-orange-50 border-orange-100 hover:bg-orange-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm leading-snug">{n.title}</p>
                          {n.message && (
                            <p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{n.message}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                          <button
                            onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors text-xs font-bold leading-none"
                            title="Dismiss"
                          >✕</button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Profile Tab */}
          {tab === 'profile' && (
            <>
              <h2 className="text-xl font-bold text-gray-800">Profile Management</h2>
              <HelperProfile userId={userId} helperName={helperName} helperEmail={helperEmail} />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default HelperDashboard
