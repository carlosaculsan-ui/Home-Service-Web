import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import ConfirmModal from '../Components/ConfirmModal'
import { getServiceIcon, ICON_OPTIONS } from '../utils/serviceIcons'
import {
  Bot, Star, Eye, Trash2, AlertTriangle, X,
  LayoutDashboard, Users, UserCheck, ClipboardList,
  CalendarDays, Wrench, Umbrella, LogOut, Menu, CircleDollarSign,
  Wifi, WifiOff, Archive, RotateCcw, MessageSquare, Send,
  TrendingUp, TrendingDown, DollarSign, Calendar, ChevronRight, Megaphone,
  CreditCard, RefreshCw, Search, Smile, Download, Printer,
} from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import GCashLogo from '../Assets/GCash_logo.png'
import MayaLogo from '../Assets/Maya_logo.png'

const TASKER_STATUS_STYLES = {
  pending:              'bg-yellow-100 text-yellow-700',
  interview_scheduled:  'bg-blue-100 text-blue-700',
  approved:             'bg-green-100 text-green-700',
  rejected:             'bg-red-100 text-red-600',
}

const TASKER_STATUS_LABELS = {
  pending:             'Pending Review',
  interview_scheduled: 'Interview Scheduled',
  approved:            'Approved',
  rejected:            'Rejected',
}

const BOOKING_STATUS_STYLES = {
  pending:         'bg-yellow-100 text-yellow-700',
  pending_payment: 'bg-pink-100 text-pink-700',
  confirmed:       'bg-blue-100 text-blue-700',
  accepted:    'bg-yellow-100 text-yellow-700',
  on_the_way:  'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
}

// ─── Tasker Applications Tab ────────────────────────────────────────────────

const DOC_FIELDS = [
  { key: 'resume_url',               label: 'Resume / CV',           required: true  },
  { key: 'front_image_url',          label: 'ID Front' },
  { key: 'back_image_url',           label: 'ID Back' },
  { key: 'nbi_clearance_url',        label: 'NBI Clearance' },
  { key: 'police_clearance_url',     label: 'Police Clearance' },
  { key: 'barangay_clearance_url',   label: 'Barangay Clearance' },
  { key: 'certificate_training_url', label: 'Certificate of Training' },
  { key: 'skill_assessment_url',     label: 'Skill Assessment' },
  { key: 'work_experience_url',      label: 'Work Experience' },
  { key: 'certificate1_url',         label: 'Certificate 1' },
  { key: 'certificate2_url',         label: 'Certificate 2' },
]

const isPdf = (url) => url && url.toLowerCase().includes('.pdf')


function TaskerApplications() {
  const [taskers, setTaskers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDocs, setExpandedDocs] = useState({})
  const [editingRate, setEditingRate] = useState({}) // { [id]: string }
  const [deleteErrors, setDeleteErrors] = useState({}) // { [id]: string }
  const [deleteSuccess, setDeleteSuccess] = useState({}) // { [id]: bool }
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [interviewModal, setInterviewModal] = useState(null)   // { tasker, date }
  const [confirmState, setConfirmState] = useState(null)
  const [applicationSearch, setApplicationSearch] = useState('')
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('all')
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  const todayPlus = (n) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }

  const formatDate = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  async function saveRate(id) {
    const val = parseFloat(editingRate[id])
    if (isNaN(val) || val <= 0) return
    await supabase.from('taskers').update({ hourly_rate: val }).eq('id', id)
    setEditingRate((prev) => { const next = { ...prev }; delete next[id]; return next })
    fetchTaskers()
  }

  async function fetchTaskers() {
    const { data: applicantsData, error: applicantsError } = await supabase
      .from('taskers')
      .select('*')
      .not('status', 'eq', 'approved')
      .order('created_at', { ascending: false })
    setTaskers(applicantsData ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTaskers() }, [])

  async function scheduleInterview(tasker, date) {
    await supabase.from('taskers').update({ status: 'interview_scheduled' }).eq('id', tasker.id)

    const firstName = tasker.name?.split(' ')[0] || 'Applicant'
    const readableDate = formatDate(date)
    await supabase.from('notifications').insert({
      user_id: tasker.user_id,
      title: 'Tasker Application — Interview Scheduled',
      message: `Congratulations, ${firstName}! You've passed the initial screening of your Tasker application. Your Final Interview is scheduled on ${readableDate}. Please visit our office and bring a valid government-issued ID. Check your email for further details. We look forward to meeting you!`,
      is_read: false,
    })

    setInterviewModal(null)
    fetchTaskers()
  }

  async function finalApprove(tasker) {
    await supabase.from('taskers').update({ status: 'approved', is_available: true }).eq('id', tasker.id)
    await supabase.from('profiles').update({ role: 'tasker' }).eq('id', tasker.user_id)

    const firstName = tasker.name?.split(' ')[0] || 'Tasker'
    await supabase.from('notifications').insert({
      user_id: tasker.user_id,
      title: 'Welcome to the Team!',
      message: `Welcome aboard, ${firstName}! You've officially been approved as a Hanap.ph Tasker. Your profile is now live and you can start accepting bookings. We're excited to have you!`,
      is_read: false,
    })

    fetchTaskers()
  }

  async function rejectApplicant(tasker) {
    await supabase.from('taskers').update({ status: 'rejected' }).eq('id', tasker.id)
    await supabase.from('profiles').update({ role: 'customer' }).eq('id', tasker.user_id)
    const firstName = tasker.name?.split(' ')[0] || 'Applicant'
    await supabase.from('notifications').insert({
      user_id: tasker.user_id,
      title: 'Tasker Application Update',
      message: `Hi ${firstName}, thank you for applying to be a Hanap.ph Tasker. After careful review, we regret to inform you that your application was not successful at this time. You're welcome to reapply in the future.`,
      is_read: false,
    })
    fetchTaskers()
  }

  function handleRejectApplicant(tasker) {
    openConfirm(`Reject ${tasker.name || 'this applicant'}? They will be notified.`, () => rejectApplicant(tasker), true)
  }

  function toggleDocs(id) {
    setExpandedDocs((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleDeleteTasker(tasker) {
    openConfirm('Are you sure you want to remove this applicant? This cannot be undone.', async () => {
      try {
        const { error } = await supabase.from('taskers').delete().eq('id', tasker.id)
        if (error) throw error
        setTaskers((prev) => prev.filter((t) => t.id !== tasker.id))
      } catch {
        setDeleteErrors((prev) => ({ ...prev, [tasker.id]: 'Failed to delete. Please try again.' }))
      }
    }, true)
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filteredApplications = taskers.filter((t) => {
    const matchesSearch = !applicationSearch.trim() || t.name?.toLowerCase().includes(applicationSearch.toLowerCase())
    const matchesStatus = applicationStatusFilter === 'all' || t.status === applicationStatusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={applicationSearch}
          onChange={(e) => setApplicationSearch(e.target.value)}
          placeholder="Search by name..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
        />
        <select
          value={applicationStatusFilter}
          onChange={(e) => setApplicationStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="interview_scheduled">Interview Scheduled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filteredApplications.length === 0 && (
        <p className="text-center text-gray-400 mt-16">No applications found.</p>
      )}

      {filteredApplications.map((t) => {
        const docs = DOC_FIELDS.filter(({ key }) => t[key])
        return (
          <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {t.name || '—'}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${TASKER_STATUS_STYLES[t.status] ?? TASKER_STATUS_STYLES.pending}`}>
                  {TASKER_STATUS_LABELS[t.status] ?? t.status}
                </span>
                {t.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setInterviewModal({ tasker: t, date: todayPlus(3) })}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >Approve for Interview</button>
                    <button
                      onClick={() => handleRejectApplicant(t)}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >Reject</button>
                  </>
                )}
                {t.status === 'interview_scheduled' && (
                  <>
                    <button
                      onClick={() => finalApprove(t)}
                      className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >Approve as Tasker</button>
                    <button
                      onClick={() => handleRejectApplicant(t)}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >Reject</button>
                  </>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-3">Personal Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                  <p className="font-medium text-gray-800 break-all">{t.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                  <p className="font-medium text-gray-800">{t.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Age</p>
                  <p className="font-medium text-gray-800">{t.age || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Gender</p>
                  <p className="font-medium text-gray-800">{t.gender || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Service Area</p>
                  <p className="font-medium text-gray-800">{t.service_area || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Postal Code</p>
                  <p className="font-medium text-gray-800">{t.postal_code || '—'}</p>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-gray-400 mb-0.5">Address</p>
                  <p className="font-medium text-gray-800">{t.address || '—'}</p>
                </div>
              </div>
            </div>

            {/* Service Information */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-3">Service Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Service Role</p>
                  <p className="font-medium text-gray-800">{t.role || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Availability</p>
                  <p className="font-medium text-gray-800">{Array.isArray(t.availability) ? t.availability.join(', ') : t.availability || '—'}</p>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-gray-400 mb-0.5">Experience</p>
                  <p className="font-medium text-gray-800">{t.bio || '—'}</p>
                </div>
              </div>
            </div>

            {/* Applied Date */}
            <div className="text-xs text-gray-400 mb-4">
              Applied: {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
            </div>

            <hr className="mb-4" />

            {docs.length > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <button
                  onClick={() => toggleDocs(t.id)}
                  className="text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
                >
                  {expandedDocs[t.id] ? '▲ Hide' : '▼ View'} Documents ({docs.length})
                </button>
                {expandedDocs[t.id] && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {docs.map(({ key, label, required }) => (
                      <div key={key} className="text-center">
                        {isPdf(t[key]) ? (
                          <a
                            href={t[key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-20 h-20 flex flex-col items-center justify-center rounded-lg border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all bg-gray-50 gap-1"
                          >
                            <span className="text-2xl">📄</span>
                            <span className="text-[10px] text-orange-500 font-semibold">Open PDF</span>
                          </a>
                        ) : (
                          <img
                            src={t[key]}
                            alt={label}
                            onClick={() => setLightboxSrc(t[key])}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all cursor-zoom-in"
                          />
                        )}
                        <p className="text-xs text-gray-500 mt-1 w-20 truncate">
                          {label}{required && <span className="text-orange-400"> *</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {deleteErrors[t.id] && (
              <p className="mt-2 text-xs text-red-500 border-t border-gray-100 pt-2">{deleteErrors[t.id]}</p>
            )}
            <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
              <button
                onClick={() => handleDeleteTasker(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-300 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Delete Applicant
              </button>
            </div>
          </div>
        )
      })}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Interview Date Picker Modal */}
      {interviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Schedule Final Interview</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select an interview date for <span className="font-semibold text-gray-700">{interviewModal.tasker.name}</span>.
              Must be 3–7 days from today.
            </p>
            <input
              type="date"
              min={todayPlus(3)}
              max={todayPlus(7)}
              value={interviewModal.date}
              onChange={(e) => setInterviewModal((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 mb-1"
            />
            {interviewModal.date && (
              <p className="text-xs text-orange-500 font-medium mb-4">{formatDate(interviewModal.date)}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setInterviewModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                onClick={() => scheduleInterview(interviewModal.tasker, interviewModal.date)}
                disabled={!interviewModal.date}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >Confirm & Notify</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function HelperApplications() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDocs, setExpandedDocs] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [interviewModal, setInterviewModal] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  const todayPlus = (n) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }

  const formatDate = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  async function fetchApps() {
    const { data } = await supabase
      .from('helper_applications')
      .select('*')
      .not('status', 'eq', 'approved')
      .order('created_at', { ascending: false })
    setApps(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchApps() }, [])

  async function scheduleInterview(app, date) {
    await supabase.from('helper_applications').update({ status: 'interview_scheduled', interview_date: date }).eq('id', app.id)
    const firstName = app.full_name?.split(' ')[0] || 'Applicant'
    const readableDate = formatDate(date)
    if (app.user_id) {
      await supabase.from('notifications').insert({
        user_id: app.user_id,
        title: 'Helper Application — Interview Scheduled',
        message: `Congratulations, ${firstName}! You've passed the initial screening of your Helper application. Your Final Interview is scheduled on ${readableDate}. Please visit our office and bring a valid government-issued ID. Check your email for further details. We look forward to meeting you!`,
        is_read: false,
      })
    }
    setInterviewModal(null)
    fetchApps()
  }

  async function finalApprove(app) {
    await supabase.from('helper_applications').update({ status: 'approved' }).eq('id', app.id)
    if (app.user_id) {
      await supabase.from('profiles').update({ role: 'helper' }).eq('id', app.user_id)
      await supabase.from('helpers').insert({ name: app.full_name, phone: app.phone, user_id: app.user_id, is_active: true })
      const firstName = app.full_name?.split(' ')[0] || 'Helper'
      await supabase.from('notifications').insert({
        user_id: app.user_id,
        title: 'Welcome to the Team!',
        message: `Welcome aboard, ${firstName}! You've officially been approved as a Hanap.ph Helper. We're excited to have you on the team!`,
        is_read: false,
      })
    }
    fetchApps()
  }

  async function rejectApplicant(app) {
    await supabase.from('helper_applications').update({ status: 'rejected' }).eq('id', app.id)
    if (app.user_id) {
      await supabase.from('profiles').update({ role: 'customer' }).eq('id', app.user_id)
      const firstName = app.full_name?.split(' ')[0] || 'Applicant'
      await supabase.from('notifications').insert({
        user_id: app.user_id,
        title: 'Helper Application Update',
        message: `Hi ${firstName}, thank you for applying to be a Hanap.ph Helper. After careful review, we regret to inform you that your application was not successful at this time. You're welcome to reapply in the future.`,
        is_read: false,
      })
    }
    fetchApps()
  }

  function handleReject(app) {
    openConfirm(`Reject ${app.full_name || 'this applicant'}? They will be notified.`, () => rejectApplicant(app), true)
  }

  function handleDelete(app) {
    openConfirm('Are you sure you want to remove this applicant? This cannot be undone.', async () => {
      await supabase.from('helper_applications').delete().eq('id', app.id)
      setApps(prev => prev.filter(a => a.id !== app.id))
    }, true)
  }

  function toggleDocs(id) {
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filtered = apps.filter(a => {
    const matchSearch = !searchText.trim() || a.full_name?.toLowerCase().includes(searchText.toLowerCase())
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search by name..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="interview_scheduled">Interview Scheduled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 mt-16">No helper applications found.</p>
      )}

      {filtered.map(a => (
        <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-gray-800">{a.full_name || '—'}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${TASKER_STATUS_STYLES[a.status] ?? TASKER_STATUS_STYLES.pending}`}>
                {TASKER_STATUS_LABELS[a.status] ?? a.status}
              </span>
              {a.status === 'pending' && (
                <>
                  <button
                    onClick={() => setInterviewModal({ app: a, date: todayPlus(3) })}
                    className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >Approve for Interview</button>
                  <button
                    onClick={() => handleReject(a)}
                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >Reject</button>
                </>
              )}
              {a.status === 'interview_scheduled' && (
                <>
                  <button
                    onClick={() => finalApprove(a)}
                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >Approve as Helper</button>
                  <button
                    onClick={() => handleReject(a)}
                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >Reject</button>
                </>
              )}
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-3">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="font-medium text-gray-800 break-all">{a.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                <p className="font-medium text-gray-800">{a.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Age</p>
                <p className="font-medium text-gray-800">{a.age || '—'}</p>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-gray-400 mb-0.5">Address</p>
                <p className="font-medium text-gray-800">{a.address || '—'}</p>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-3">Emergency Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Name</p>
                <p className="font-medium text-gray-800">{a.emergency_contact_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                <p className="font-medium text-gray-800">{a.emergency_contact_phone || '—'}</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 mb-4">
            Applied: {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
            {a.interview_date && (
              <span className="ml-4 text-blue-500 font-medium">Interview: {formatDate(a.interview_date)}</span>
            )}
          </div>

          <hr className="mb-4" />

          {(a.gov_id_url || a.nbi_clearance_url) && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <button
                onClick={() => toggleDocs(a.id)}
                className="text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                {expandedDocs[a.id] ? '▲ Hide' : '▼ View'} Documents
              </button>
              {expandedDocs[a.id] && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {[{ url: a.gov_id_url, label: 'Gov ID' }, { url: a.nbi_clearance_url, label: 'NBI Clearance' }].filter(d => d.url).map(({ url, label }) => (
                    <div key={label} className="text-center">
                      {isPdf(url) ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="w-20 h-20 flex flex-col items-center justify-center rounded-lg border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all bg-gray-50 gap-1">
                          <span className="text-2xl">📄</span>
                          <span className="text-[10px] text-orange-500 font-semibold">Open PDF</span>
                        </a>
                      ) : (
                        <img src={url} alt={label} onClick={() => setLightboxSrc(url)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all cursor-zoom-in" />
                      )}
                      <p className="text-xs text-gray-500 mt-1 w-20 truncate">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
            <button
              onClick={() => handleDelete(a)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-300 rounded-lg transition-colors"
            >
              <Trash2 size={13} />
              Delete Applicant
            </button>
          </div>
        </div>
      ))}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {interviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Schedule Final Interview</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select an interview date for <span className="font-semibold text-gray-700">{interviewModal.app.full_name}</span>.
              Must be 3–7 days from today.
            </p>
            <input
              type="date"
              min={todayPlus(3)}
              max={todayPlus(7)}
              value={interviewModal.date}
              onChange={e => setInterviewModal(prev => ({ ...prev, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 mb-1"
            />
            {interviewModal.date && (
              <p className="text-xs text-orange-500 font-medium mb-4">{formatDate(interviewModal.date)}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setInterviewModal(null)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={() => scheduleInterview(interviewModal.app, interviewModal.date)}
                disabled={!interviewModal.date}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >Confirm & Notify</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ApplicantsPanel() {
  const [applicantType, setApplicantType] = useState('tasker')
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5 border-b border-gray-200 pb-3">
        <button
          onClick={() => setApplicantType('tasker')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${applicantType === 'tasker' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
        >Tasker Applicants</button>
        <button
          onClick={() => setApplicantType('helper')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${applicantType === 'helper' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
        >Helper Applicants</button>
      </div>
      {applicantType === 'tasker' ? <TaskerApplications /> : <HelperApplications />}
    </div>
  )
}

// ─── Tasker Accounts Tab ─────────────────────────────────────────────────────

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const getAvatarColor = (name) => {
  const colors = ['bg-orange-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400', 'bg-teal-400']
  const index = (name?.charCodeAt(0) || 0) % colors.length
  return colors[index]
}

function SessionHistoryModal({ userId, userName, onClose }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true)
      const start = new Date(year, month, 1).toISOString()
      const end = new Date(year, month + 1, 1).toISOString()
      const { data } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('time_in', start)
        .lt('time_in', end)
        .order('time_in', { ascending: false })
      setSessions(data ?? [])
      setLoading(false)
    }
    fetchSessions()
  }, [userId, year, month])

  function prevMonth() {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    if (next <= new Date()) setCurrentDate(next)
  }

  const monthLabel = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const now = new Date()
  const isCurrentMonth = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear()
  const fmt = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '(still active)'

  function getDuration(s) {
    if (!s.time_out) return '—'
    const mins = Math.floor((new Date(s.time_out) - new Date(s.time_in)) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const totalMins = sessions.reduce((acc, s) => {
    if (!s.time_out) return acc
    return acc + Math.floor((new Date(s.time_out) - new Date(s.time_in)) / 60000)
  }, 0)
  const totalH = Math.floor(totalMins / 60)
  const totalM = totalMins % 60
  const totalLabel = totalH > 0 ? (totalM > 0 ? `${totalH}h ${totalM}m` : `${totalH}h`) : `${totalM}m`

  function handlePrint() {
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Session History — ${userName}</title>
          <style>
            body { font-family: sans-serif; padding: 32px; color: #111; }
            h2 { margin: 0 0 4px; font-size: 18px; }
            .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #eee; color: #888; font-weight: 600; }
            td { padding: 8px; border-bottom: 1px solid #f0f0f0; }
            .total { margin-top: 20px; font-size: 14px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h2>${userName}</h2>
          <p class="sub">Session History — ${monthLabel}</p>
          <table>
            <thead>
              <tr><th>#</th><th>Time In</th><th>Time Out</th><th>Duration</th></tr>
            </thead>
            <tbody>
              ${sessions.map((s, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${fmt(s.time_in)}</td>
                  <td>${fmt(s.time_out)}</td>
                  <td>${getDuration(s)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="total">Total Hours: ${totalLabel}</p>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl relative max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-black text-xl">✕</button>
        <h2 className="text-lg font-bold text-gray-800 mb-0.5">{userName}</h2>
        <p className="text-xs text-gray-500 mb-4">Session History</p>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none">‹</button>
          <span className="text-sm font-semibold text-gray-700">{monthLabel}</span>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none disabled:opacity-30">›</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No sessions recorded for this month.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 text-left font-medium w-8">#</th>
                    <th className="pb-2 text-left font-medium">Time In</th>
                    <th className="pb-2 text-left font-medium">Time Out</th>
                    <th className="pb-2 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map((s, i) => (
                    <tr key={s.id} className="text-gray-600">
                      <td className="py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="py-2.5 text-xs">{fmt(s.time_in)}</td>
                      <td className="py-2.5 text-xs">{fmt(s.time_out)}</td>
                      <td className="py-2.5 text-xs font-medium text-gray-700">{getDuration(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Total: <span className="text-orange-500">{totalLabel}</span></span>
                <button onClick={handlePrint} className="text-xs font-medium text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">Print</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskerAccountsPanel() {
  const [taskers, setTaskers] = useState([])
  const [onlineTaskers, setOnlineTaskers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingRate, setEditingRate] = useState({})
  const [deleteErrors, setDeleteErrors] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [docsModalTasker, setDocsModalTasker] = useState(null)
  const [selectedTasker, setSelectedTasker] = useState(null)
  const [showTaskerModal, setShowTaskerModal] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [showcaseToast, setShowcaseToast] = useState('')
  const [actionError, setActionError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [confirmState, setConfirmState] = useState(null)
  const [historyUser, setHistoryUser] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  async function handleToggleFeature(tasker) {
    const next = !tasker.is_featured
    setTaskers((prev) => prev.map((t) => t.id === tasker.id ? { ...t, is_featured: next } : t))
    await supabase.from('taskers').update({ is_featured: next }).eq('id', tasker.id)
    setShowcaseToast(next ? 'Tasker added to Showcase!' : 'Tasker removed from Showcase!')
    setTimeout(() => setShowcaseToast(''), 3000)
  }

  async function fetchTaskers() {
    const { data } = await supabase
      .from('taskers')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    const rows = data ?? []
    const userIds = rows.map((t) => t.user_id).filter(Boolean)

    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, is_archived, last_time_in, last_time_out')
        .in('id', userIds)
      profileData?.forEach((p) => { profileMap[p.id] = p })
    }

    const enriched = rows.map((t) => {
      const { id: _pid, ...profileRest } = profileMap[t.user_id] ?? {}
      return { ...t, ...profileRest }
    })
    setTaskers(enriched.filter((t) => !profileMap[t.user_id]?.is_archived))
    setLoading(false)
  }

  useEffect(() => { fetchTaskers() }, [])

  useEffect(() => {
    const channel = supabase.channel('online-taskers')
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineTaskers(Object.values(state).flat())
      })
      .on('presence', { event: 'leave' }, async ({ leftPresences }) => {
        for (const p of leftPresences) {
          if (p.user_id) {
            await supabase
              .from('profiles')
              .update({ last_time_out: new Date().toISOString() })
              .eq('id', p.user_id)
          }
        }
        fetchTaskers()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function saveRate(id) {
    const val = parseFloat(editingRate[id])
    if (isNaN(val) || val <= 0) return
    await supabase.from('taskers').update({ hourly_rate: val }).eq('id', id)
    setEditingRate((prev) => { const next = { ...prev }; delete next[id]; return next })
    fetchTaskers()
  }

  function handleArchiveTasker(tasker) {
    openConfirm('Archive this employee?', async () => {
      const profileId = tasker.user_id || tasker.id
      if (!profileId) return
      const { data, error } = await supabase
        .from('profiles').update({ is_archived: true }).eq('id', profileId).select()
      if (error) { setActionError('Failed to archive: ' + error.message); setTimeout(() => setActionError(''), 4000); return }
      if (!data || data.length === 0) { setActionError('Archive failed: tasker not found.'); setTimeout(() => setActionError(''), 4000); return }
      setTaskers((prev) => prev.filter((t) => t.user_id !== profileId))
    })
  }

  async function handleUploadTaskerPhoto(e, tasker) {
    const file = e.target.files[0]
    if (!file) return
    const filePath = `tasker-photos/${tasker.user_id}-${Date.now()}`
    const { error: uploadError } = await supabase.storage
      .from('tasker-files')
      .upload(filePath, file, { upsert: true })
    if (uploadError) { setPhotoError('Upload failed: ' + uploadError.message); return }
    const { data: urlData } = supabase.storage.from('tasker-files').getPublicUrl(filePath)
    const photoUrl = urlData.publicUrl
    const { data: updateData, error } = await supabase
      .from('taskers')
      .update({ profile_photo: photoUrl })
      .eq('user_id', tasker.user_id)
      .select()
    if (error) { setPhotoError('Failed to save photo.'); return }
    if (!updateData || updateData.length === 0) { setPhotoError('Photo uploaded but could not save URL.'); return }
    setTaskers(prev => prev.map(t => t.user_id === tasker.user_id ? { ...t, profile_photo: photoUrl } : t))
    setSelectedTasker(prev => ({ ...prev, profile_photo: photoUrl }))
  }

  function handleRemoveTaskerPhoto(tasker) {
    openConfirm("Remove this tasker's showcase photo?", async () => {
      const { error } = await supabase.from('taskers').update({ profile_photo: null }).eq('user_id', tasker.user_id)
      if (error) { setActionError('Failed to remove photo.'); setTimeout(() => setActionError(''), 4000); return }
      setTaskers(prev => prev.map(t => t.user_id === tasker.user_id ? { ...t, profile_photo: null } : t))
      setSelectedTasker(prev => ({ ...prev, profile_photo: null }))
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const sortedTaskers = [...taskers].sort((a, b) => {
    const aOnline = onlineTaskers.some(o => o.user_id === a.user_id) ? 1 : 0
    const bOnline = onlineTaskers.some(o => o.user_id === b.user_id) ? 1 : 0
    return bOnline - aOnline
  })

  const filteredTaskers = sortedTaskers.filter(t =>
    t.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(employeeSearch.toLowerCase())
  )

  return (
    <>
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
      {/* Showcase Toast */}
      {showcaseToast && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium text-green-700">
          {showcaseToast}
        </div>
      )}
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium text-red-600">
          {actionError}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-2">
            <Wifi className="w-6 h-6 text-green-500" />
            <span className="text-sm font-semibold text-gray-600">Active Taskers</span>
          </div>
          <p className="text-4xl font-bold text-green-600">{onlineTaskers.length}</p>
          <p className="text-xs text-gray-400 mt-1">Currently online</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-300">
          <div className="flex items-center gap-3 mb-2">
            <WifiOff className="w-6 h-6 text-gray-400" />
            <span className="text-sm font-semibold text-gray-600">Offline Taskers</span>
          </div>
          <p className="text-4xl font-bold text-gray-500">{taskers.length - onlineTaskers.length}</p>
          <p className="text-xs text-gray-400 mt-1">Not currently online</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {filteredTaskers.length === 0 ? (
        <p className="text-center text-gray-400 mt-16">
          {employeeSearch ? 'No employees match your search.' : 'No approved taskers yet.'}
        </p>
      ) : (
        <>
          {/* Active — Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Status</th>
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Time In</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Time Out</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">History</th>
                    <th className="px-3 py-3 font-medium text-center">Showcase</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTaskers.map((t) => {
                    const isOnline = onlineTaskers.some((o) => o.user_id === t.user_id)
                    const onlineInfo = onlineTaskers.find((o) => o.user_id === t.user_id)
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                            <span className={`text-xs font-semibold whitespace-nowrap ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {t.profile_photo
                              ? <img src={t.profile_photo} alt={t.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                              : <div className={`w-8 h-8 rounded-full ${getAvatarColor(t.name)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>{getInitials(t.name)}</div>
                            }
                            <span className="font-medium text-gray-800 whitespace-nowrap text-xs">{t.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{t.email || '—'}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {isOnline && onlineInfo?.online_at
                            ? new Date(onlineInfo.online_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : t.last_time_in
                            ? new Date(t.last_time_in).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {!isOnline && t.last_time_out
                            ? new Date(t.last_time_out).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setHistoryUser(t)}
                            className="text-blue-500 text-xs font-medium hover:underline whitespace-nowrap"
                          >
                            View History
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => handleToggleFeature(t)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors whitespace-nowrap ${
                              t.is_featured
                                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500'
                            }`}
                          >
                            {t.is_featured ? '✓ In Showcase' : 'Add to Showcase'}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => { setSelectedTasker(t); setShowTaskerModal(true) }}
                            className="text-orange-500 text-xs font-medium hover:underline whitespace-nowrap"
                          >
                            View Details →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
          </div>

          {/* Active — Mobile Cards */}
          <div className="block md:hidden space-y-3">
            {filteredTaskers.map((t) => {
              const isOnline = onlineTaskers.some((o) => o.user_id === t.user_id)
              const onlineInfo = onlineTaskers.find((o) => o.user_id === t.user_id)
              const timeIn = isOnline && onlineInfo?.online_at
                ? new Date(onlineInfo.online_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : t.last_time_in
                ? new Date(t.last_time_in).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : '—'
              const timeOut = !isOnline && t.last_time_out
                ? new Date(t.last_time_out).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : '—'
              return (
                <div key={t.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {t.profile_photo
                        ? <img src={t.profile_photo} alt={t.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        : <div className={`w-10 h-10 rounded-full ${getAvatarColor(t.name)} flex items-center justify-center text-white font-bold shrink-0`}>{getInitials(t.name)}</div>
                      }
                      <div>
                        <p className="font-semibold text-gray-800">{t.name || '—'}</p>
                        <p className="text-xs text-gray-500">{t.email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                      <span className={`text-xs font-semibold ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
                    <div><span className="font-medium text-gray-700">Time In:</span> {timeIn}</div>
                    <div><span className="font-medium text-gray-700">Time Out:</span> {timeOut}</div>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => handleToggleFeature(t)}
                      className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors ${
                        t.is_featured
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      {t.is_featured ? '✓ In Showcase' : 'Add to Showcase'}
                    </button>
                  </div>
                  <button
                    onClick={() => setHistoryUser(t)}
                    className="w-full text-sm border border-blue-400 text-blue-500 py-2 rounded-lg hover:bg-blue-50 transition mb-2"
                  >
                    View History
                  </button>
                  <button
                    onClick={() => { setSelectedTasker(t); setShowTaskerModal(true) }}
                    className="w-full text-sm border border-orange-400 text-orange-500 py-2 rounded-lg hover:bg-orange-50 transition"
                  >
                    View Details →
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {historyUser && <SessionHistoryModal userId={historyUser.user_id} userName={historyUser.name} onClose={() => setHistoryUser(null)} />}

      {/* Tasker Details Modal */}
      {showTaskerModal && selectedTasker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowTaskerModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTaskerModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-black text-xl"
            >✕</button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              {selectedTasker.profile_photo ? (
                <img src={selectedTasker.profile_photo} alt={selectedTasker.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className={`w-14 h-14 rounded-full ${getAvatarColor(selectedTasker.name)} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                  {getInitials(selectedTasker.name)}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedTasker.name || '—'}</h2>
                <p className="text-sm text-gray-500">{selectedTasker.email || '—'}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Approved</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedTasker.phone || '—'}</span></div>
              <div><span className="text-gray-500">Service:</span> <span className="font-medium">{selectedTasker.role || '—'}</span></div>
              <div><span className="text-gray-500">Area:</span> <span className="font-medium">{selectedTasker.service_area || '—'}</span></div>
              <div><span className="text-gray-500">Joined:</span> <span className="font-medium">{selectedTasker.created_at ? new Date(selectedTasker.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span></div>
              <div><span className="text-gray-500">Age:</span> <span className="font-medium">{selectedTasker.age ?? 'Not provided'}</span></div>
              <div><span className="text-gray-500">Gender:</span> <span className="font-medium">{selectedTasker.gender || 'Not provided'}</span></div>
              <div><span className="text-gray-500">Availability:</span> <span className="font-medium">{selectedTasker.availability || 'Not provided'}</span></div>
            </div>

            {/* Resume */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Resume</h4>
              {selectedTasker.resume_url
                ? <button onClick={() => setLightboxSrc(selectedTasker.resume_url)} className="text-orange-500 text-sm underline text-left">View Resume</button>
                : <p className="text-gray-400 text-sm">No resume uploaded</p>
              }
            </div>

            {/* Documents for Interview */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Documents for Interview</h4>
              {(() => {
                const docs = [
                  selectedTasker.has_valid_id && `Valid ID${selectedTasker.id_type ? ` (${selectedTasker.id_type})` : ''}`,
                  selectedTasker.has_nbi_clearance && 'NBI Clearance',
                  selectedTasker.has_barangay_clearance && 'Barangay Clearance',
                  selectedTasker.has_certificates && 'Certificates and Training',
                ].filter(Boolean)
                return docs.length > 0
                  ? <ul className="space-y-1">{docs.map((doc) => (
                      <li key={doc} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>{doc}
                      </li>
                    ))}</ul>
                  : <p className="text-gray-400 text-sm">No documents indicated</p>
              })()}
            </div>

            {/* Photo Management */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Showcase Photo</h4>
              {selectedTasker.profile_photo ? (
                <div className="flex items-center gap-3">
                  <img
                    src={selectedTasker.profile_photo}
                    alt="Tasker"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => handleRemoveTaskerPhoto(selectedTasker)}
                    className="text-xs border border-red-400 text-red-500 px-3 py-1 rounded hover:bg-red-50"
                  >
                    Remove Uploaded Photo
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-2">Using default showcase photo. Upload to override.</p>
              )}
              <div className="mt-2">
                <label className="cursor-pointer bg-orange-500 text-white text-xs px-3 py-2 rounded-lg hover:bg-orange-600 transition">
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { setPhotoError(''); handleUploadTaskerPhoto(e, selectedTasker) }}
                  />
                </label>
              </div>
              {photoError && <p className="text-xs text-red-500 mt-2">{photoError}</p>}
            </div>

            {/* Archive Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => { handleArchiveTasker(selectedTasker); setShowTaskerModal(false) }}
                className="text-sm border border-orange-400 text-orange-500 px-4 py-2 rounded-lg hover:bg-orange-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {docsModalTasker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={() => setDocsModalTasker(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <p className="font-bold text-gray-800 text-base">{docsModalTasker.tasker.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Documents ({docsModalTasker.docs.length})</p>
              </div>
              <button
                onClick={() => setDocsModalTasker(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <div className="flex flex-wrap gap-4">
                {docsModalTasker.docs.map(({ key, label }) => (
                  <div key={key} className="text-center">
                    <img
                      src={docsModalTasker.tasker[key]}
                      alt={label}
                      onClick={() => setLightboxSrc(docsModalTasker.tasker[key])}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all cursor-zoom-in"
                    />
                    <p className="text-xs text-gray-500 mt-1 w-24 truncate">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  )
}

// ─── Customer Accounts Tab ────────────────────────────────────────────────────

function CustomerAccountsPanel() {
  const [customers, setCustomers] = useState([])
  const [onlineCustomers, setOnlineCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteErrors, setDeleteErrors] = useState({})
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [customerBookings, setCustomerBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [confirmState, setConfirmState] = useState(null)
  const [historyUser, setHistoryUser] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  async function fetchCustomers() {
    const { data: customersData } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('role', 'customer')

    const rows = customersData ?? []
    const ids = rows.map(c => c.id).filter(Boolean)
    let profileMap = {}
    if (ids.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, avatar_url, last_time_in, last_time_out')
        .in('id', ids)
      profileData?.forEach(p => { profileMap[p.id] = p })
    }
    const enriched = rows.map(c => ({ ...c, ...profileMap[c.id] }))
    setCustomers(enriched.filter(c => !c.is_archived))
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

  useEffect(() => {
    const channel = supabase.channel('online-customers')
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineCustomers(Object.values(state).flat())
      })
      .on('presence', { event: 'leave' }, async ({ leftPresences }) => {
        for (const p of leftPresences) {
          if (p.user_id) {
            await supabase
              .from('profiles')
              .update({ last_time_out: new Date().toISOString() })
              .eq('id', p.user_id)
          }
        }
        fetchCustomers()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function handleViewBookings(customer) {
    setViewingCustomer(customer)
    setBookingsLoading(true)
    setCustomerBookings([])

    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', customer.id)
      .order('created_at', { ascending: false })

    const rows = data ?? []

    // Resolve tasker names
    const taskerIds = [...new Set(rows.map((b) => b.tasker_id).filter(Boolean))]
    let taskerMap = {}
    if (taskerIds.length > 0) {
      const { data: taskers } = await supabase.from('taskers').select('id, name').in('id', taskerIds)
      taskers?.forEach((t) => { taskerMap[t.id] = t.name })
    }

    setCustomerBookings(rows.map((b) => ({ ...b, taskerName: taskerMap[b.tasker_id] ?? '—' })))
    setBookingsLoading(false)
  }

  function handleArchiveCustomer(customer) {
    openConfirm('Archive this customer?', async () => {
      const profileId = customer.id || customer.user_id || customer.profile_id
      if (!profileId) { alert('Cannot archive: missing customer ID'); return }
      const { data, error } = await supabase
        .from('profiles').update({ is_archived: true }).eq('id', profileId).select()
      if (error) { alert('Failed: ' + error.message); return }
      if (!data || data.length === 0) { alert('No rows updated — id may not match profiles table'); return }
      setCustomers(prev => prev.filter(c => (c.id || c.user_id) !== profileId))
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filteredCustomers = customers.filter(c =>
    c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  )
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const aOnline = onlineCustomers.some(o => o.user_id === a.id) ? 1 : 0
    const bOnline = onlineCustomers.some(o => o.user_id === b.id) ? 1 : 0
    return bOnline - aOnline
  })

  return (
    <>
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
      {/* Bookings Modal */}
      {viewingCustomer && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 py-6"
          onClick={() => setViewingCustomer(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <p className="font-bold text-gray-800 text-base">{viewingCustomer.full_name || 'No name'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Booking history</p>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {bookingsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : customerBookings.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No bookings found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                        <th className="pb-2 pr-4 font-medium">Service</th>
                        <th className="pb-2 pr-4 font-medium">Tasker</th>
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customerBookings.map((b) => (
                        <tr key={b.id} className="text-gray-700">
                          <td className="py-2.5 pr-4 font-medium">{b.service ?? '—'}</td>
                          <td className="py-2.5 pr-4 text-gray-500">{b.taskerName}</td>
                          <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{b.scheduled_date ?? '—'}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${BOOKING_STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {b.status?.replaceAll('_', ' ') ?? '—'}
                            </span>
                          </td>
                          <td className="py-2.5 text-gray-700">
                            {b.estimated_total ? `₱${Number(b.estimated_total).toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowCustomerModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowCustomerModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-black text-xl">✕</button>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-full ${getAvatarColor(selectedCustomer.full_name || selectedCustomer.email)} flex items-center justify-center text-white text-xl font-bold`}>
                {getInitials(selectedCustomer.full_name || selectedCustomer.email?.split('@')[0])}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedCustomer.full_name?.trim() || selectedCustomer.email?.split('@')[0] || '—'}</h2>
                <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Customer</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedCustomer.phone || '—'}</span></div>
              <div><span className="text-gray-500">Joined:</span> <span className="font-medium">{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{selectedCustomer.address || '—'}</span></div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <button
                onClick={() => { handleViewBookings(selectedCustomer); setShowCustomerModal(false) }}
                className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
              >
                View Bookings
              </button>
              <button
                onClick={() => { handleArchiveCustomer(selectedCustomer); setShowCustomerModal(false) }}
                className="text-sm border border-orange-400 text-orange-500 px-4 py-2 rounded-lg hover:bg-orange-50"
              >
                Archive Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-2">
            <Wifi className="w-6 h-6 text-green-500" />
            <span className="text-sm font-semibold text-gray-600">Active Customers</span>
          </div>
          <p className="text-4xl font-bold text-green-600">{onlineCustomers.length}</p>
          <p className="text-xs text-gray-400 mt-1">Currently online</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-300">
          <div className="flex items-center gap-3 mb-2">
            <WifiOff className="w-6 h-6 text-gray-400" />
            <span className="text-sm font-semibold text-gray-600">Offline Customers</span>
          </div>
          <p className="text-4xl font-bold text-gray-500">{customers.length - onlineCustomers.length}</p>
          <p className="text-xs text-gray-400 mt-1">Not currently online</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <p className="text-center text-gray-400 mt-8">
          {customerSearch ? 'No customers match your search.' : 'No active customers.'}
        </p>
      ) : (
        <>
          {/* Active — Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Time In</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Time Out</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">History</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedCustomers.map((c) => {
                    const isOnline = onlineCustomers.some(o => o.user_id === c.id)
                    const onlineInfo = onlineCustomers.find(o => o.user_id === c.id)
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                            <span className={`text-xs font-semibold ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {c.avatar_url
                              ? <img src={c.avatar_url} alt={c.full_name || c.email} className="w-9 h-9 rounded-full object-cover shrink-0" />
                              : <div className={`w-9 h-9 rounded-full ${getAvatarColor(c.full_name || c.email)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>{getInitials(c.full_name || c.email?.split('@')[0])}</div>
                            }
                            <span className="font-medium text-gray-800 whitespace-nowrap">
                              {c.full_name?.trim() ? c.full_name : c.email?.split('@')[0] || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {isOnline && onlineInfo?.online_at
                            ? new Date(onlineInfo.online_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : c.last_time_in
                            ? new Date(c.last_time_in).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {!isOnline && c.last_time_out
                            ? new Date(c.last_time_out).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setHistoryUser(c)}
                            className="text-blue-500 text-sm font-medium hover:underline whitespace-nowrap"
                          >
                            View History
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setSelectedCustomer(c); setShowCustomerModal(true) }}
                            className="text-orange-500 text-sm font-medium hover:underline"
                          >
                            View Details →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active — Mobile Cards */}
          <div className="block md:hidden space-y-3">
            {sortedCustomers.map((c) => {
              const isOnline = onlineCustomers.some(o => o.user_id === c.id)
              const onlineInfo = onlineCustomers.find(o => o.user_id === c.id)
              const timeIn = isOnline && onlineInfo?.online_at
                ? new Date(onlineInfo.online_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : c.last_time_in
                ? new Date(c.last_time_in).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : '—'
              const timeOut = !isOnline && c.last_time_out
                ? new Date(c.last_time_out).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : '—'
              return (
                <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {c.avatar_url
                        ? <img src={c.avatar_url} alt={c.full_name || c.email} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        : <div className={`w-10 h-10 rounded-full ${getAvatarColor(c.full_name || c.email)} flex items-center justify-center text-white font-bold shrink-0`}>{getInitials(c.full_name || c.email?.split('@')[0])}</div>
                      }
                      <div>
                        <p className="font-semibold text-gray-800">{c.full_name?.trim() ? c.full_name : c.email?.split('@')[0] || '—'}</p>
                        <p className="text-xs text-gray-500">{c.email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                      <span className={`text-xs font-semibold ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
                    <div><span className="font-medium text-gray-700">Time In:</span> {timeIn}</div>
                    <div><span className="font-medium text-gray-700">Time Out:</span> {timeOut}</div>
                  </div>
                  <button
                    onClick={() => setHistoryUser(c)}
                    className="w-full text-sm border border-blue-400 text-blue-500 py-2 rounded-lg hover:bg-blue-50 transition mb-2"
                  >
                    View History
                  </button>
                  <button
                    onClick={() => { setSelectedCustomer(c); setShowCustomerModal(true) }}
                    className="w-full text-sm border border-orange-400 text-orange-500 py-2 rounded-lg hover:bg-orange-50 transition"
                  >
                    View Details →
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
      {historyUser && <SessionHistoryModal userId={historyUser.id} userName={historyUser.full_name?.trim() || historyUser.email?.split('@')[0] || '—'} onClose={() => setHistoryUser(null)} />}
    </>
  )
}

// ─── Bookings Tab ────────────────────────────────────────────────────────────

const getTaskLabel = (booking) => {
  const opts = booking.task_options
  if (!opts) return booking.task_size || 'N/A'
  return opts.type || opts.problem || opts.what_to_paint || opts.aircon_type || booking.task_size || 'N/A'
}

const formatBookingDate = (date, time) => {
  if (!date) return '—'
  const dateObj = new Date(`${date}T${time || '00:00:00'}`)
  return dateObj.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const getStatusBadge = (status) => {
  const styles = {
    pending_payment: 'bg-pink-100 text-pink-700',
    confirmed:   'bg-blue-100 text-blue-700',
    accepted:    'bg-yellow-100 text-yellow-700',
    on_the_way:  'bg-purple-100 text-purple-700',
    in_progress: 'bg-orange-100 text-orange-700',
    completed:   'bg-green-100 text-green-700',
    cancelled:   'bg-red-100 text-red-700',
  }
  const labels = {
    pending_payment: 'Pending Payment',
    confirmed:   'Awaiting Tasker',
    accepted:    'Accepted',
    on_the_way:  'On The Way',
    in_progress: 'In Progress',
    completed:   'Completed',
    cancelled:   'Cancelled',
  }
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  )
}

function BookingsPanel({ bookingFilter, setBookingFilter }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteErrors, setDeleteErrors] = useState({})
  const [bookingSearch, setBookingSearch] = useState('')
  const [cancelModal, setCancelModal] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [cancelProcessing, setCancelProcessing] = useState(false)
  const [cancelReasonError, setCancelReasonError] = useState('')
  const [forceCompleteProcessing, setForceCompleteProcessing] = useState(null)
  const [completionPhotoModalUrl, setCompletionPhotoModalUrl] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .neq('status', 'pending_payment')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Fetch tasker names and user IDs
    const taskerIds = [...new Set(data.map((b) => b.tasker_id).filter(Boolean))]
    let taskerMap = {}
    let taskerUserMap = {}
    if (taskerIds.length > 0) {
      const { data: taskers } = await supabase.from('taskers').select('id, name, user_id').in('id', taskerIds)
      taskers?.forEach((t) => { taskerMap[t.id] = t.name; taskerUserMap[t.id] = t.user_id })
    }

    // Fetch client names from profiles
    const clientIds = [...new Set(data.map((b) => b.client_id).filter(Boolean))]
    let clientMap = {}
    if (clientIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', clientIds)
      profiles?.forEach((p) => { clientMap[p.id] = p.full_name || p.email || '—' })
    }

    const mapped = data.map((b) => ({
      ...b,
      taskerName: taskerMap[b.tasker_id] ?? '—',
      clientEmail: clientMap[b.client_id] ?? '—',
    }))

    // Auto-cancel confirmed bookings where tasker didn't respond within 30 minutes
    const autoCancel = mapped.filter(b =>
      b.status === 'confirmed' &&
      b.confirmed_at &&
      new Date(b.confirmed_at) < new Date(Date.now() - 30 * 60 * 1000)
    )
    for (const b of autoCancel) {
      const refundAmount = Number(b.estimated_total) || 0
      const { error: cancelErr } = await supabase.from('bookings').update({
        status: 'cancelled',
        cancellation_reason: 'Tasker did not respond within 30 minutes',
        ...(refundAmount > 0 ? { is_refunded: true } : {}),
      }).eq('id', b.id)
      if (!cancelErr) {
        if (refundAmount > 0 && b.client_id) {
          await supabase.rpc('increment_wallet_balance', { target_user_id: b.client_id, increment_amount: refundAmount })
          await supabase.from('wallet_transactions').insert({
            user_id: b.client_id,
            booking_id: b.id,
            amount: refundAmount,
            type: 'credit',
            description: `Auto-refund — tasker did not respond within 30 minutes (Booking ${b.reference_number ?? b.id})`,
          })
        }
        if (b.client_id) {
          await supabase.from('notifications').insert({
            user_id: b.client_id,
            title: 'Booking Auto-Cancelled',
            message: `Your booking (${b.reference_number ?? b.id}) was automatically cancelled because the tasker did not respond within 30 minutes.${refundAmount > 0 ? ` A full refund of ₱${refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been credited to your Hanap.ph E-wallet.` : ''}`,
            is_read: false,
          })
        }
        if (b.tasker_id && taskerUserMap[b.tasker_id]) {
          await supabase.from('notifications').insert({
            user_id: taskerUserMap[b.tasker_id],
            title: 'Booking Auto-Cancelled',
            message: `Booking ${b.reference_number ?? b.id} (${b.service ?? ''}) was automatically cancelled because you did not respond within 30 minutes.`,
            is_read: false,
          })
        }
      }
    }
    if (autoCancel.length > 0) { fetchBookings(); return }

    setBookings(mapped)
    setLoading(false)
  }

  async function sendStaleReminders() {
    const REMINDER_MSG = "Reminder: You have a pending booking that requires your response. Please accept or reject it as soon as possible."
    const cutoff12h = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

    const { data: stale } = await supabase
      .from('bookings')
      .select('id, tasker_id')
      .eq('status', 'confirmed')
      .lt('confirmed_at', cutoff12h)

    if (!stale?.length) return

    const taskerIds = [...new Set(stale.map(b => b.tasker_id).filter(Boolean))]
    const { data: taskers } = await supabase
      .from('taskers')
      .select('id, user_id')
      .in('id', taskerIds)

    const taskerUserMap = {}
    taskers?.forEach(t => { taskerUserMap[t.id] = t.user_id })

    for (const booking of stale) {
      const taskerUserId = taskerUserMap[booking.tasker_id]
      if (!taskerUserId) continue

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', taskerUserId)
        .eq('message', REMINDER_MSG)
        .gte('created_at', cutoff12h)
        .limit(1)

      if (existing?.length > 0) continue

      await supabase.from('notifications').insert({
        user_id: taskerUserId,
        title: 'Booking Reminder',
        message: REMINDER_MSG,
        is_read: false,
      })
    }
  }

  useEffect(() => { fetchBookings().then(() => sendStaleReminders()) }, [])

  useEffect(() => {
    const channel = supabase
      .channel('admin-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' },
        () => { fetchBookings() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function updateBookingStatus(id, status) {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b))
  }

  function handleForceComplete(b) {
    openConfirm(`Force-complete booking ${b.reference_number ?? b.id}? This will release the payout to the tasker immediately.`, async () => {
    setForceCompleteProcessing(b.id)

    const platform_fee = b.estimated_total != null ? b.estimated_total * 0.10 : null
    const tasker_payout = b.estimated_total != null ? b.estimated_total * 0.90 : null
    const updatePayload = { status: 'completed' }
    if (platform_fee != null) {
      updatePayload.platform_fee = platform_fee
      updatePayload.tasker_payout = tasker_payout
    }
    const { error } = await supabase.from('bookings').update(updatePayload).eq('id', b.id)
    if (!error && tasker_payout && b.tasker_id) {
      const { data: taskerRow } = await supabase.from('taskers').select('user_id').eq('id', b.tasker_id).single()
      const taskerUserId = taskerRow?.user_id
      if (taskerUserId) {
        await supabase.rpc('increment_wallet_balance', { target_user_id: taskerUserId, increment_amount: tasker_payout })
        await supabase.from('wallet_transactions').insert({
          user_id: taskerUserId,
          booking_id: b.id,
          amount: tasker_payout,
          type: 'credit',
          description: `Admin force-completed earnings from booking ${b.reference_number ?? b.id}`,
        })
        await supabase.from('notifications').insert({
          user_id: taskerUserId,
          title: 'Job Confirmed by Admin',
          message: 'An admin has confirmed your job as complete. Your earnings have been added to your wallet.',
          is_read: false,
        })
      }
    }
    if (!error) setBookings(prev => prev.map(bk => bk.id === b.id ? { ...bk, status: 'completed', platform_fee, tasker_payout } : bk))
    setForceCompleteProcessing(null)
    })
  }

  async function handleConfirmCancel() {
    if (!cancelReason.trim()) { setCancelReasonError('Cancellation reason is required.'); return }
    setCancelProcessing(true)
    const b = cancelModal
    const refundAmount = Number(b.estimated_total) || 0

    // 1. Update booking
    const updatePayload = {
      status: 'cancelled',
      cancellation_reason: cancelReason.trim(),
      cancellation_note: cancelNote.trim() || null,
    }
    if (refundAmount > 0) updatePayload.is_refunded = true
    await supabase.from('bookings').update(updatePayload).eq('id', b.id)

    // 2. Wallet refund
    if (refundAmount > 0 && b.client_id) {
      await supabase.rpc('increment_wallet_balance', {
        target_user_id: b.client_id,
        increment_amount: refundAmount,
      })
      await supabase.from('wallet_transactions').insert({
        user_id: b.client_id,
        booking_id: b.id,
        amount: refundAmount,
        type: 'credit',
        description: 'Refund issued — booking cancelled by admin',
        created_at: new Date().toISOString(),
      })
    }

    // 3. Customer notification
    if (b.client_id) {
      const refundNote = refundAmount > 0
        ? ` A full refund of ₱${refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been credited to your Hanap.ph E-wallet.`
        : ''
      await supabase.from('notifications').insert({
        user_id: b.client_id,
        title: 'Booking Cancelled',
        message: `Your booking (${b.reference_number ?? b.id}) has been cancelled by the admin. Reason: ${cancelReason.trim()}.${refundNote}`,
        is_read: false,
      })
    }

    // 4. Tasker notification
    if (b.tasker_id) {
      const { data: tasker } = await supabase.from('taskers').select('user_id').eq('id', b.tasker_id).single()
      if (tasker?.user_id) {
        await supabase.from('notifications').insert({
          user_id: tasker.user_id,
          title: 'Booking Cancelled',
          message: `Booking ${b.reference_number ?? b.id} (${b.service ?? ''}) has been cancelled by the admin.`,
          is_read: false,
        })
      }
    }

    // 5. Update local state
    setBookings(prev => prev.map(bk => bk.id === b.id
      ? { ...bk, status: 'cancelled', cancellation_reason: cancelReason.trim(), cancellation_note: cancelNote.trim() || null, is_refunded: refundAmount > 0 }
      : bk
    ))
    setCancelModal(null)
    setCancelReason('')
    setCancelNote('')
    setCancelProcessing(false)
  }

  function handleDeleteBooking(id) {
    openConfirm('Move this booking to Archive?', async () => {
      const { error } = await supabase.from('bookings').update({ is_archived: true }).eq('id', id)
      if (error) {
        setDeleteErrors((prev) => ({ ...prev, [id]: 'Failed to archive booking. Please try again.' }))
      } else {
        setBookings((prev) => prev.filter((b) => b.id !== id))
      }
    }, true)
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (bookings.length === 0) {
    return <p className="text-center text-gray-400 mt-16">No bookings yet.</p>
  }

  const filteredBookings = (() => {
    const byStatus = bookingFilter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === bookingFilter)
    const q = bookingSearch.trim().toLowerCase()
    if (!q) return byStatus
    return byStatus.filter((b) =>
      (b.reference_number ?? '').toLowerCase().includes(q) ||
      (b.customer_name ?? '').toLowerCase().includes(q) ||
      (b.clientEmail ?? '').toLowerCase().includes(q) ||
      (b.taskerName ?? '').toLowerCase().includes(q)
    )
  })()

  return (
    <>
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={bookingSearch}
          onChange={e => setBookingSearch(e.target.value)}
          placeholder="Search by reference, customer, or tasker name..."
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400 bg-white shadow-sm"
        />
        {bookingSearch && (
          <button
            onClick={() => setBookingSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          { value: 'confirmed',            label: 'Pending Booking' },
          { value: 'accepted',             label: 'Accepted' },
          { value: 'on_the_way',           label: 'On The Way' },
          { value: 'in_progress',          label: 'In Progress' },
          { value: 'pending_confirmation', label: 'Awaiting Confirmation' },
          { value: 'completed',            label: 'Completed' },
          { value: 'cancelled',            label: 'Cancelled' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setBookingFilter(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              bookingFilter === value
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-orange-500 border-orange-300 hover:bg-orange-50'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setBookingFilter('all')}
          className={`ml-auto px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            bookingFilter === 'all'
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-orange-500 border-orange-300 hover:bg-orange-50'
          }`}
        >
          History
        </button>
        <span className="text-sm text-gray-400 w-full sm:w-auto">
          {bookingFilter === 'all'
            ? `${bookings.length} total`
            : `${filteredBookings.length} found`}
        </span>
      </div>
      {filteredBookings.map((b) => {
        const isOverdue30m = b.status === 'confirmed' && b.confirmed_at && new Date(b.confirmed_at) < new Date(Date.now() - 30 * 60 * 1000)
        return (
        <div key={b.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${isOverdue30m ? 'border-red-300' : 'border-gray-100'}`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <p className="font-bold text-orange-500 text-sm tracking-wide">{b.reference_number ?? '—'}</p>
                {isOverdue30m && (
                  <span className="text-xs font-semibold bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                    No response · 30min+
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex gap-2 items-start">
                  <span className="text-gray-400 w-28 flex-shrink-0">Task Schedule</span>
                  <span className="font-semibold text-blue-600">{formatBookingDate(b.scheduled_date, b.scheduled_time)}</span>
                </div>
                {[
                  ['Booked on', b.created_at ? new Date(b.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'],
                  ['Service',   b.service],
                  ['Tasker',    b.taskerName],
                  ['Client',    b.customer_name || b.clientEmail],
                  ['Contact',   b.customer_phone || null],
                  ['Task',      getTaskLabel(b)],
                  ...(b.task_options?.service === 'Carpentry' && b.task_options?.category
                    ? [['Furniture Category', b.task_options.category]]
                    : []),
                  ...(b.task_options?.service === 'Carpentry' && b.task_options?.furniture_dimensions
                    ? [['Dimensions', b.task_options.furniture_dimensions]]
                    : []),
                  ...(b.task_options?.service === 'Painting' && b.task_options?.what_to_paint === 'Furniture' && b.task_options?.furniture_category
                    ? [['Furniture Category', b.task_options.furniture_category], ['No. of Pieces', b.task_options.furniture_pieces]]
                    : []),
                  ...(b.task_options?.service === 'Plumbing Repair' && b.task_options?.sub_option
                    ? [['Specify Problem', b.task_options.sub_option]]
                    : []),
                  ...(b.task_options?.service === 'Electrical' && b.task_options?.sub_option
                    ? [['Specify Work', b.task_options.sub_option]]
                    : []),
                  ['Address',   b.address],
                  ...(b.landmark ? [['Landmark', b.landmark]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="flex gap-2 items-start">
                    <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
                    <span className="text-gray-700">{val ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:flex-shrink-0 flex flex-col items-end gap-2">
              {getStatusBadge(b.status)}
              {b.status === 'confirmed' && (
                <button
                  onClick={() => { setCancelModal(b); setCancelReason(''); setCancelNote(''); setCancelReasonError('') }}
                  className="text-xs border border-red-400 text-red-500 px-3 py-1 rounded-lg hover:bg-red-50 transition"
                >
                  Cancel Booking
                </button>
              )}
              {b.status === 'pending_confirmation' && (
                <button
                  onClick={() => handleForceComplete(b)}
                  disabled={forceCompleteProcessing === b.id}
                  className="text-xs border border-green-500 text-green-600 px-3 py-1 rounded-lg hover:bg-green-50 transition disabled:opacity-50"
                >
                  {forceCompleteProcessing === b.id ? 'Processing…' : 'Force Complete'}
                </button>
              )}
            </div>
          </div>
          {(b.platform_fee != null || b.tasker_payout != null) && (() => {
            const fmt = (n) => `₱${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            const basePricePaid = (b.tasker_payout ?? 0) + (b.platform_fee ?? 0)
            const helperFee = b.helper_fee ?? 0
            const totalPaid = basePricePaid + helperFee
            return (
              <div className="mt-3 border-t border-gray-100 pt-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Base Price</span>
                  <span className="text-gray-700 font-medium">{fmt(basePricePaid)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Tasker Payout</span>
                  <span className="text-green-700 font-medium">{fmt(b.tasker_payout)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Platform Fee</span>
                  <span className="text-gray-700 font-medium">{fmt(b.platform_fee)}</span>
                </div>
                {helperFee > 0 && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-28 flex-shrink-0">Helper Fee</span>
                    <span className="text-gray-700 font-medium">{fmt(helperFee)}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Total Paid</span>
                  <span className="text-gray-800 font-semibold">{fmt(totalPaid)}</span>
                </div>
              </div>
            )
          })()}
          {b.ai_image_analysis && (
            <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-800">
              <span className="font-semibold flex items-center gap-1"><Bot size={14} /> AI Analysis: </span>{b.ai_image_analysis}
            </div>
          )}
          {b.completion_photo_url && (
            <div className="mt-3">
              <button
                onClick={() => setCompletionPhotoModalUrl(b.completion_photo_url)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
              >
                <img src={b.completion_photo_url} alt="Completion photo" className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                View completion photo
              </button>
            </div>
          )}
          <div className="mt-3 border-t border-gray-100 pt-3">
            {deleteErrors[b.id] && (
              <p className="text-xs text-red-500 mb-2">{deleteErrors[b.id]}</p>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => handleDeleteBooking(b.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-300 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )})}
    </div>

    {/* Completion Photo Modal */}
    {completionPhotoModalUrl && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={() => setCompletionPhotoModalUrl(null)}
      >
        <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setCompletionPhotoModalUrl(null)}
            className="absolute -top-3 -right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-600 hover:text-gray-900 font-bold text-lg leading-none"
          >
            ×
          </button>
          <img src={completionPhotoModalUrl} alt="Completion photo" className="w-full rounded-xl shadow-lg" />
        </div>
      </div>
    )}

    {/* Cancel Booking Modal */}
    {cancelModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
          <h3 className="text-base font-bold text-gray-800 mb-1">Cancel Booking</h3>
          <p className="text-sm text-gray-500 mb-4">
            Ref: <span className="font-medium text-gray-700">{cancelModal.reference_number ?? cancelModal.id}</span>
            {Number(cancelModal.estimated_total) > 0 && (
              <> &mdash; ₱{Number(cancelModal.estimated_total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} will be refunded to the customer's E-wallet.</>
            )}
          </p>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Reason <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setCancelReasonError('') }}
              disabled={cancelProcessing}
              placeholder="Enter cancellation reason"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 disabled:opacity-50"
            />
            {cancelReasonError && <p className="text-xs text-red-500 mt-1">{cancelReasonError}</p>}
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              disabled={cancelProcessing}
              placeholder="Additional details (optional)"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 resize-none disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setCancelModal(null); setCancelReason(''); setCancelNote(''); setCancelReasonError('') }}
              disabled={cancelProcessing}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={cancelProcessing}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {cancelProcessing ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ─── Services Tab ─────────────────────────────────────────────────────────────

const EMPTY_FORM = { icon: '', title: '', description: '', is_active: true }

const KNOWN_SERVICES = ['Cleaning', 'Plumbing', 'Electrical', 'Carpentry', 'Aircon Cleaning', 'Painting']

const EMPTY_ADD_FORM = { service_name: '', task_size: '', price: '' }

function ManagePricesPanel() {
  const [taskPrices, setTaskPrices] = useState([])
  const [pricesLoading, setPricesLoading] = useState(true)
  const [priceToast, setPriceToast] = useState({ msg: '', type: '' })
  const [priceSearch, setPriceSearch] = useState('')

  // edit state: tracks which row is being edited and what fields are being changed
  const [editId, setEditId] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editTaskSize, setEditTaskSize] = useState('')

  // delete confirmation state
  const [deleteId, setDeleteId] = useState(null)

  // add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM)
  const [addLoading, setAddLoading] = useState(false)

  function showToast(msg, type = 'success') {
    setPriceToast({ msg, type })
    setTimeout(() => setPriceToast({ msg: '', type: '' }), 3000)
  }

  async function fetchTaskPrices() {
    setPricesLoading(true)
    const { data } = await supabase
      .from('task_prices')
      .select('*')
      .eq('is_archived', false)
      .order('service_name', { ascending: true })
      .order('task_size', { ascending: true })
    setTaskPrices(data ?? [])
    setPricesLoading(false)
  }

  async function handleSave(row) {
    const priceVal = parseFloat(editPrice)
    if (isNaN(priceVal) || priceVal < 0) return
    const taskSizeVal = editTaskSize.trim()
    if (!taskSizeVal) return
    const { error } = await supabase
      .from('task_prices')
      .update({ price: priceVal, task_size: taskSizeVal, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) {
      showToast('Failed to update row.', 'error')
    } else {
      setTaskPrices((prev) => prev.map((r) => r.id === row.id ? { ...r, price: priceVal, task_size: taskSizeVal } : r))
      showToast('Row updated successfully.')
    }
    setEditId(null)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('task_prices').update({ is_archived: true }).eq('id', id)
    if (error) {
      showToast('Failed to archive row.', 'error')
    } else {
      setTaskPrices((prev) => prev.filter((r) => r.id !== id))
      showToast('Row moved to Archive.')
    }
    setDeleteId(null)
  }

  async function handleAdd() {
    const priceVal = parseFloat(addForm.price)
    if (!addForm.service_name || !addForm.task_size.trim() || isNaN(priceVal) || priceVal < 0) return
    setAddLoading(true)
    const { error } = await supabase.from('task_prices').insert({
      service_name: addForm.service_name,
      task_size: addForm.task_size.trim(),
      price: priceVal,
    })
    if (error) {
      showToast('Failed to add row.', 'error')
    } else {
      showToast('Row added successfully.')
      setShowAddForm(false)
      setAddForm(EMPTY_ADD_FORM)
      await fetchTaskPrices()
    }
    setAddLoading(false)
  }

  useEffect(() => { fetchTaskPrices() }, [])

  return (
    <div>
      {priceToast.msg && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-medium border ${
          priceToast.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {priceToast.msg}
        </div>
      )}

      {/* toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={priceSearch}
          onChange={e => setPriceSearch(e.target.value)}
          placeholder="Search by service or task size..."
          className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
        />
        <button
          onClick={() => { setShowAddForm(v => !v); setAddForm(EMPTY_ADD_FORM) }}
          className="ml-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Row'}
        </button>
      </div>

      {/* add form */}
      {showAddForm && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</label>
            <select
              value={addForm.service_name}
              onChange={e => setAddForm(f => ({ ...f, service_name: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400 bg-white"
            >
              <option value="">Select service…</option>
              {KNOWN_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Task Size</label>
            <input
              type="text"
              value={addForm.task_size}
              onChange={e => setAddForm(f => ({ ...f, task_size: e.target.value }))}
              placeholder="e.g. Small"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price (₱)</label>
            <input
              type="number"
              value={addForm.price}
              onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0"
              min="0"
              step="1"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={addLoading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {addLoading ? 'Saving…' : 'Save Row'}
          </button>
        </div>
      )}

      {/* delete confirmation modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm text-gray-700 mb-4">Move this price row to Archive?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Move to Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {pricesLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (() => {
        const q = priceSearch.toLowerCase()
        const filtered = taskPrices.filter(r =>
          r.service_name?.toLowerCase().includes(q) ||
          r.task_size?.toLowerCase().includes(q)
        )
        return filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">No results found.</p>
        ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Task Size</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0">
                  <td className="px-4 py-3 text-gray-700 font-medium">{row.service_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {editId === row.id ? (
                      <input
                        type="text"
                        value={editTaskSize}
                        onChange={e => setEditTaskSize(e.target.value)}
                        className="w-36 px-2 py-1 border border-orange-400 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                    ) : (
                      row.task_size
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editId === row.id ? (
                      <input
                        type="number"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        className="w-28 px-2 py-1 border border-orange-400 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                        min="0"
                        step="1"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-gray-800">₱{Number(row.price).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editId === row.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSave(row)}
                          className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditId(row.id); setEditPrice(String(row.price)); setEditTaskSize(row.task_size) }}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(row.id)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      })()}
    </div>
  )
}

function ServicesPanel() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [serviceSearch, setServiceSearch] = useState('')
  const [viewTaskersService, setViewTaskersService] = useState(null)
  const [serviceTaskers, setServiceTaskers] = useState([])
  const [serviceTaskersLoading, setServiceTaskersLoading] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  async function handleViewTaskers(service) {
    setViewTaskersService(service)
    setServiceTaskers([])
    setServiceTaskersLoading(true)
    const firstWord = service.title.split(' ')[0]
    const { data } = await supabase
      .from('taskers')
      .select('id, name, email, phone, availability, working_hours, profile_photo')
      .ilike('role', `%${firstWord}%`)
      .eq('status', 'approved')
    const rows = (data ?? []).map((t) => {
      const photoUrl = t.profile_photo
        ? t.profile_photo.startsWith('http')
          ? t.profile_photo
          : supabase.storage.from('tasker-files').getPublicUrl(t.profile_photo).data.publicUrl
        : null
      return { ...t, photoUrl }
    })
    setServiceTaskers(rows)
    setServiceTaskersLoading(false)
  }

  async function fetchServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: true })
    setServices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  function descToArray(text) {
    return text.split('\n').map((s) => s.trim()).filter(Boolean)
  }

  function arrayToText(arr) {
    try {
      const parsed = JSON.parse(arr)
      return Array.isArray(parsed) ? parsed.join('\n') : arr
    } catch {
      return arr
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setAddError('')
    if (!addForm.title.trim() || !addForm.icon.trim()) {
      setAddError('Icon and title are required.')
      return
    }
    setAddLoading(true)
    const { error } = await supabase.from('services').insert({
      icon: addForm.icon.trim(),
      title: addForm.title.trim(),
      description: JSON.stringify(descToArray(addForm.description)),
      is_active: addForm.is_active,
    })
    if (error) { setAddError(error.message); setAddLoading(false); return }
    setAddForm(EMPTY_FORM)
    setShowAddForm(false)
    setAddLoading(false)
    fetchServices()
  }

  function startEdit(service) {
    setEditId(service.id)
    setEditForm({
      icon: service.icon ?? '',
      title: service.title ?? '',
      description: arrayToText(service.description),
      is_active: service.is_active ?? true,
    })
    setEditError('')
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditError('')
    if (!editForm.title.trim() || !editForm.icon.trim()) {
      setEditError('Icon and title are required.')
      return
    }
    setEditLoading(true)
    const { error } = await supabase.from('services').update({
      icon: editForm.icon.trim(),
      title: editForm.title.trim(),
      description: JSON.stringify(descToArray(editForm.description)),
      is_active: editForm.is_active,
    }).eq('id', editId)
    if (error) { setEditError(error.message); setEditLoading(false); return }
    setEditId(null)
    setEditLoading(false)
    fetchServices()
  }

  function handleDelete(service) {
    openConfirm(
      `Move "${service.title}" to Archive?`,
      async () => {
        await supabase.from('services').update({ is_archived: true }).eq('id', service.id)
        fetchServices()
      },
      true
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
      {/* Search + Add Service */}
      <div className="flex items-center justify-between mb-6">
        <input
          type="text"
          placeholder="Search services..."
          value={serviceSearch}
          onChange={(e) => setServiceSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={() => { setShowAddForm(!showAddForm); setAddError('') }}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Service'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <p className="font-bold text-gray-800 mb-1">New Service</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Icon</label>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={addForm.icon}
                  onChange={(e) => setAddForm({ ...addForm, icon: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                >
                  <option value="">Select icon…</option>
                  {ICON_OPTIONS.map((o) => (
                    <option key={o.name} value={o.name}>{o.label}</option>
                  ))}
                </select>
                <span className="text-orange-500 flex-shrink-0">
                  {getServiceIcon(addForm.icon, { size: 24 })}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Title</label>
              <input
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                placeholder="Cleaning"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Description (one item per line)</label>
            <textarea
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              placeholder="Professional home cleaning&#10;Office space cleaning&#10;Deep cleaning services"
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.is_active}
              onChange={(e) => setAddForm({ ...addForm, is_active: e.target.checked })}
              className="accent-orange-500"
            />
            Active (visible on site)
          </label>
          {addError && <p className="text-red-500 text-sm">{addError}</p>}
          <button
            type="submit"
            disabled={addLoading}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {addLoading ? 'Saving...' : 'Save Service'}
          </button>
        </form>
      )}

      {/* Service Cards */}
      {(() => {
        const filteredServices = services.filter(s =>
          s.title?.toLowerCase().includes(serviceSearch.toLowerCase())
        )
        if (services.length === 0) return <p className="text-center text-gray-400 mt-16">No services yet. Add one above.</p>
        if (filteredServices.length === 0) return <p className="text-center text-gray-400 mt-16">No services match your search.</p>
        return filteredServices.map((s) => (
        <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {editId === s.id ? (
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Icon</label>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={editForm.icon}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    >
                      <option value="">Select icon…</option>
                      {ICON_OPTIONS.map((o) => (
                        <option key={o.name} value={o.name}>{o.label}</option>
                      ))}
                    </select>
                    <span className="text-orange-500 flex-shrink-0">
                      {getServiceIcon(editForm.icon, { size: 24 })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Title</label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Description (one item per line)</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="accent-orange-500"
                />
                Active (visible on site)
              </label>
              {editError && <p className="text-red-500 text-sm">{editError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-orange-500">
                    {getServiceIcon(s.icon, { size: 28 }) ?? <span className="text-2xl">{s.icon}</span>}
                  </span>
                  <p className="font-bold text-gray-800 text-base">{s.title}</p>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {(() => {
                    try {
                      const arr = JSON.parse(s.description)
                      return Array.isArray(arr) ? arr : [s.description]
                    } catch { return [s.description] }
                  })().map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => handleViewTaskers(s)}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  View Taskers
                </button>
                <button
                  onClick={() => startEdit(s)}
                  className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
        ))
      })()}

      {/* View Taskers Modal */}
      {viewTaskersService && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setViewTaskersService(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 text-lg">
                  Taskers for <span className="text-orange-500">{viewTaskersService.title}</span>
                </h2>
                <button
                  onClick={() => setViewTaskersService(null)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-6">
                {serviceTaskersLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : serviceTaskers.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 text-sm">No taskers assigned to this service yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {serviceTaskers.map((t) => (
                      <div key={t.id} className="bg-gray-50 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                        {t.photoUrl ? (
                          <img
                            src={t.photoUrl}
                            alt={t.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-orange-100"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-xl font-bold text-orange-400">
                              {(t.name?.[0] ?? '?').toUpperCase()}
                            </span>
                          </div>
                        )}
                        <p className="font-semibold text-gray-800 text-sm">{t.name || '—'}</p>
                        {t.email && <p className="text-xs text-gray-500 truncate w-full">{t.email}</p>}
                        {t.phone && <p className="text-xs text-gray-500">{t.phone}</p>}
                        {t.availability && (
                          <p className="text-xs text-gray-400">
                            {Array.isArray(t.availability) ? t.availability.join(', ') : t.availability}
                          </p>
                        )}
                        {t.working_hours && (
                          <p className="text-xs text-gray-400">
                            {Array.isArray(t.working_hours) ? t.working_hours.join(', ') : t.working_hours}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-sm font-medium flex items-center gap-1 hover:text-orange-400 transition-colors"
        >
          <X size={18} /> Close
        </button>
        <img
          src={src}
          alt="Review photo"
          className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
      </div>
    </div>
  )
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────
// NOTE: Run this SQL in Supabase if not already done:
// ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

const formatReviewDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function ReviewsPanel() {
  const [reviews, setReviews] = useState([])
  const [taskerMap, setTaskerMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [reviewServiceFilter, setReviewServiceFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [deleteErrors, setDeleteErrors] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    const rows = data ?? []
    setReviews(rows)
    setLoading(false)

    const ids = [...new Set(rows.map(r => r.tasker_id).filter(Boolean))]
    if (ids.length > 0) {
      const { data: taskers } = await supabase
        .from('taskers')
        .select('id, name')
        .in('id', ids)
      const map = {}
      taskers?.forEach(t => { map[t.id] = t.name })
      setTaskerMap(map)
    }
  }

  useEffect(() => { fetchReviews() }, [])

  async function toggleFeature(review) {
    const update = review.featured
      ? { featured: false }
      : { featured: true, is_flagged: false, is_hidden: false }
    await supabase.from('reviews').update(update).eq('id', review.id)
    fetchReviews()
  }

  async function toggleHide(review) {
    await supabase.from('reviews').update({ is_hidden: !review.is_hidden }).eq('id', review.id)
    fetchReviews()
  }

  function handleDelete(id) {
    openConfirm('Move this review to Archive?', async () => {
      const { error } = await supabase.from('reviews').update({ is_archived: true }).eq('id', id)
      if (error) {
        setDeleteErrors((prev) => ({ ...prev, [id]: 'Failed to archive review. Please try again.' }))
      } else {
        fetchReviews()
      }
    }, true)
  }

  const allCount      = reviews.length
  const featuredCount = reviews.filter(r => r.featured).length
  const hiddenCount   = reviews.filter(r => r.is_hidden).length
  const flaggedCount  = reviews.filter(r => r.is_flagged).length

  const visible = reviews
    .filter(r => {
      if (filter === 'featured') return r.featured
      if (filter === 'hidden')   return r.is_hidden
      if (filter === 'flagged')  return r.is_flagged
      return true
    })
    .filter(r => reviewServiceFilter === 'all' || r.service === reviewServiceFilter)
    .filter(r => ratingFilter === 'all' || r.rating === Number(ratingFilter))

  const filterTabs = [
    { key: 'all',      label: 'All',      count: allCount },
    { key: 'featured', label: 'Featured', count: featuredCount },
    { key: 'hidden',   label: 'Hidden',   count: hiddenCount },
    { key: 'flagged',  label: 'Flagged',  count: flaggedCount },
  ]

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
      {/* Toast */}
      {toast && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-lg">
          {toast}
        </div>
      )}

      {/* Service filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
        <label className="text-sm font-semibold text-gray-600">Filter by Service:</label>
        <select
          value={reviewServiceFilter}
          onChange={(e) => setReviewServiceFilter(e.target.value)}
          className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="all">All Services</option>
          <option value="Cleaning">Cleaning</option>
          <option value="Plumbing">Plumbing</option>
          <option value="Electrical">Electrical</option>
          <option value="Carpentry">Carpentry</option>
          <option value="Aircon Cleaning">Aircon Cleaning</option>
          <option value="Painting">Painting</option>
        </select>
      </div>

      {/* Rating filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-sm font-semibold text-gray-600">Filter by Rating:</label>
        {['all', '5', '4', '3', '2', '1'].map((val) => (
          <button
            key={val}
            onClick={() => setRatingFilter(val)}
            className={`px-3 py-1 rounded-full text-sm font-semibold border transition-colors ${
              ratingFilter === val
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500'
            }`}
          >
            {val === 'all' ? 'All' : <span className="text-yellow-400">{`${'★'.repeat(Number(val))}${'☆'.repeat(5 - Number(val))}`}</span>}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filterTabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
              filter === key
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-gray-400 mt-16">No reviews in this category.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => (
            <div key={r.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${r.is_hidden ? 'border-gray-200 opacity-60' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800 text-base">{r.reviewer_name ?? 'Anonymous'}</p>
                    <span className="text-sm">
                      <span className="text-yellow-400">{'★'.repeat(r.rating ?? 5)}</span>
                      <span className="text-gray-300">{'★'.repeat(5 - (r.rating ?? 5))}</span>
                    </span>
                    {r.featured && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">Featured</span>
                    )}
                    {r.is_hidden && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Hidden</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">"{r.comment}"</p>
                  {r.is_flagged && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mt-1">
                      <AlertTriangle size={13} className="flex-shrink-0" />
                      <span className="font-medium">AI Flagged — Possible inappropriate content</span>
                    </div>
                  )}
                  {r.images?.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.images.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          onClick={() => setLightboxSrc(url)}
                          className="h-20 w-auto rounded-lg object-cover border border-gray-200 hover:border-orange-400 transition-colors cursor-zoom-in"
                        />
                      ))}
                    </div>
                  )}
                  {r.video && (
                    <video
                      src={r.video}
                      controls
                      className="mt-2 w-full max-w-xs rounded-lg border border-gray-200 max-h-40"
                    />
                  )}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                    <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">{r.service}</span>
                    {taskerMap[r.tasker_id] && (
                      <span>Tasker: <span className="text-gray-600 font-medium">{taskerMap[r.tasker_id]}</span></span>
                    )}
                    <span>{formatReviewDate(r.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleFeature(r)}
                    className={`px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-sm font-semibold rounded-lg transition-colors ${r.featured ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                  >
                    <Star size={14} className="inline mr-1" />{r.featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    onClick={() => toggleHide(r)}
                    className={`px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-sm font-semibold rounded-lg transition-colors ${r.is_hidden ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Eye size={14} className="inline mr-1" />{r.is_hidden ? 'Show' : 'Hide'}
                  </button>
                </div>
              </div>
              {deleteErrors[r.id] && (
                <p className="mt-2 text-xs text-red-500">{deleteErrors[r.id]}</p>
              )}
              <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-300 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                  Delete Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}

// ─── Leave Requests Tab ───────────────────────────────────────────────────────

const formatLeaveDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function LeaveRequestsPanel() {
  const [leaves, setLeaves] = useState([])
  const [leaveFilter, setLeaveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [deleteErrors, setDeleteErrors] = useState({})
  const [confirmState, setConfirmState] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  async function fetchLeaves() {
    const { data } = await supabase
      .from('tasker_leaves')
      .select('*, taskers(name, user_id)')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    setLeaves(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchLeaves() }, [])

  async function updateStatus(leave, status) {
    setActionLoading(leave.id + status)
    await supabase.from('tasker_leaves').update({ status }).eq('id', leave.id)
    const taskerUserId = leave.taskers?.user_id
    if (taskerUserId) {
      const firstName = leave.taskers?.name?.split(' ')[0] || 'Tasker'
      const title = status === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected'
      const message = status === 'approved'
        ? `Hi ${firstName}, your leave request has been approved.`
        : `Hi ${firstName}, your leave request has been rejected. Please contact admin for more details.`
      await supabase.from('notifications').insert({ user_id: taskerUserId, title, message, is_read: false })
    }
    setActionLoading(null)
    fetchLeaves()
  }

  function handleDeleteLeave(id) {
    openConfirm('Move this leave request to Archive?', async () => {
      const { error } = await supabase.from('tasker_leaves').update({ is_archived: true }).eq('id', id)
      if (error) {
        setDeleteErrors((prev) => ({ ...prev, [id]: 'Failed to archive leave request. Please try again.' }))
      } else {
        setLeaves((prev) => prev.filter((l) => l.id !== id))
      }
    }, true)
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (leaves.length === 0) {
    return <p className="text-center text-gray-400 mt-16">No leave requests yet.</p>
  }

  const filteredLeaves = leaveFilter === 'all'
    ? leaves
    : leaves.filter(l => l.status === leaveFilter)

  return (
    <div className="space-y-4">
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
        <label className="text-sm font-semibold text-gray-600">Filter by Status:</label>
        <select
          value={leaveFilter}
          onChange={(e) => setLeaveFilter(e.target.value)}
          className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-sm text-gray-400">
          {leaveFilter === 'all'
            ? `${leaves.length} total`
            : `${filteredLeaves.length} found`}
        </span>
      </div>
      {filteredLeaves.length === 0 && (
        <p className="text-center text-gray-400 mt-16">No {leaveFilter === 'all' ? '' : leaveFilter} leave requests found.</p>
      )}
      {filteredLeaves.map((leave) => {
        const dates = (() => { try { return JSON.parse(leave.leave_dates) } catch { return [] } })()
        const statusClass = TASKER_STATUS_STYLES[leave.status] ?? 'bg-gray-100 text-gray-600'
        return (
          <div key={leave.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-bold text-gray-800 text-base">{leave.taskers?.name ?? '—'}</p>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${statusClass}`}>
                    {leave.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  <span className="text-gray-400 font-medium">Dates: </span>
                  {(() => {
                    if (dates.length === 0) return '—'
                    if (dates.length === 1) return formatLeaveDate(dates[0])
                    const sorted = [...dates].sort()
                    return (
                      <span>
                        <span className="font-medium text-gray-700">{dates.length} days</span>
                        <span className="text-gray-500"> ({formatLeaveDate(sorted[0])} – {formatLeaveDate(sorted[sorted.length - 1])})</span>
                      </span>
                    )
                  })()}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="text-gray-400 font-medium">Reason: </span>
                  {leave.reason}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="text-gray-400 font-medium">Submitted on: </span>
                  {leave.created_at ? formatLeaveDate(leave.created_at) : '—'}
                </p>
              </div>

              {leave.status === 'pending' && (
                <div className="flex md:flex-col gap-2 md:flex-shrink-0">
                  <button
                    onClick={() => updateStatus(leave, 'approved')}
                    disabled={actionLoading !== null}
                    className="flex-1 md:flex-none px-4 py-2 md:py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === leave.id + 'approved' ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => updateStatus(leave, 'rejected')}
                    disabled={actionLoading !== null}
                    className="flex-1 md:flex-none px-4 py-2 md:py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === leave.id + 'rejected' ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
            {deleteErrors[leave.id] && (
              <p className="mt-2 text-xs text-red-500">{deleteErrors[leave.id]}</p>
            )}
            <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
              <button
                onClick={() => handleDeleteLeave(leave.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-300 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Payroll Panel ───────────────────────────────────────────────────────────

function PayrollPanel() {
  const now = new Date()
  const [period, setPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [allRows, setAllRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const selectAllRef = useRef(null)

  useEffect(() => { fetchPayroll() }, [period])

  async function fetchPayroll() {
    setLoading(true)
    const [year, month] = period.split('-').map(Number)

    const { data: allBookings } = await supabase
      .from('bookings')
      .select('id, tasker_id, estimated_total, platform_fee, tasker_payout, scheduled_date, helper_fee, helper_names')
      .eq('status', 'completed')

    const bookings = (allBookings ?? []).filter(b => {
      if (!b.scheduled_date) return false
      const d = new Date(b.scheduled_date + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    if (bookings.length === 0) {
      setAllRows([])
      setLoading(false)
      return
    }

    // Tasker names + photos
    const taskerIds = [...new Set(bookings.map(b => b.tasker_id).filter(Boolean))]
    const { data: taskers } = await supabase
      .from('taskers')
      .select('id, name, profile_photo')
      .in('id', taskerIds)
    const nameMap  = Object.fromEntries((taskers ?? []).map(t => [t.id, t.name]))
    const photoMap = Object.fromEntries((taskers ?? []).map(t => [t.id, t.profile_photo]))

    // Aggregate taskers
    const taskerAgg = {}
    for (const b of bookings) {
      if (!b.tasker_id) continue
      if (!taskerAgg[b.tasker_id]) {
        taskerAgg[b.tasker_id] = {
          id: `t_${b.tasker_id}`,
          name: nameMap[b.tasker_id] ?? '—',
          photo: photoMap[b.tasker_id] ?? null,
          jobs: 0, gross: 0, platform_cut: 0, payout: 0,
          type: 'tasker',
        }
      }
      taskerAgg[b.tasker_id].jobs         += 1
      taskerAgg[b.tasker_id].gross        += Number(b.estimated_total) || 0
      taskerAgg[b.tasker_id].platform_cut += Number(b.platform_fee)   || 0
      taskerAgg[b.tasker_id].payout       += Number(b.tasker_payout)  || 0
    }

    // Aggregate helpers — use actual helper_fee from the booking, split evenly across helpers
    const helperAgg = {}
    for (const b of bookings) {
      const totalFee = Number(b.helper_fee) || 0
      if (!totalFee || !b.helper_names) continue
      let names = []
      try {
        names = typeof b.helper_names === 'string' ? JSON.parse(b.helper_names) : (b.helper_names ?? [])
      } catch { names = [] }
      if (names.length === 0) continue
      const perHelper = totalFee / names.length
      for (const entry of names) {
        const name = entry?.name ?? entry
        if (!name) continue
        if (!helperAgg[name]) helperAgg[name] = { id: `h_${name}`, name, photo: null, jobs: 0, payout: 0, type: 'helper' }
        helperAgg[name].jobs   += 1
        helperAgg[name].payout += perHelper
      }
    }

    setAllRows([
      ...Object.values(taskerAgg).sort((a, b) => a.name.localeCompare(b.name)),
      ...Object.values(helperAgg).sort((a, b) => a.name.localeCompare(b.name)),
    ])
    setLoading(false)
  }

  const filteredRows  = filter === 'all' ? allRows : allRows.filter(r => r.type === filter)
  const totalJobs     = filteredRows.reduce((s, r) => s + r.jobs, 0)
  const totalPayout   = filteredRows.reduce((s, r) => s + r.payout, 0)
  const totalPlatform = filteredRows.filter(r => r.type === 'tasker').reduce((s, r) => s + r.platform_cut, 0)
  const countLabel    = filter === 'helper' ? 'Total Helpers' : filter === 'tasker' ? 'Total Taskers' : 'Total People'
  const exportTarget  = selected.size > 0 ? filteredRows.filter(r => selected.has(r.id)) : filteredRows
  const allChecked    = filteredRows.length > 0 && filteredRows.every(r => selected.has(r.id))
  const someChecked   = filteredRows.some(r => selected.has(r.id)) && !allChecked

  useEffect(() => { setSelected(new Set()) }, [period, filter])
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked
  }, [someChecked])

  function toggleRow(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(filteredRows.map(r => r.id)))
  }

  function getMonthLabel() {
    const [y, m] = period.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }

  function exportCSV() {
    const headers = ['Name', 'Role', 'Completed Jobs', 'Total Earnings', 'Platform Cut', 'Payout']
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [
      [esc(`Payroll — ${getMonthLabel()}`)].join(','),
      '',
      headers.map(esc).join(','),
      ...exportTarget.map(r => [
        r.name,
        r.type === 'tasker' ? 'Tasker' : 'Helper',
        r.jobs,
        r.type === 'tasker' ? r.gross : '',
        r.type === 'tasker' ? r.platform_cut : '',
        r.payout,
      ].map(esc).join(',')),
    ].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printPayroll() {
    const filterLabel = selected.size > 0 ? `${selected.size} selected` : filter === 'all' ? 'All' : filter === 'tasker' ? 'Taskers' : 'Helpers'
    const tableRows = exportTarget.map(row => `
      <tr>
        <td>${row.name}</td>
        <td>${row.type === 'tasker' ? 'Tasker' : 'Helper'}</td>
        <td class="num">${row.jobs}</td>
        <td class="num">${row.type === 'tasker' ? '&#8369;' + row.gross.toLocaleString() : '&mdash;'}</td>
        <td class="num">${row.type === 'tasker' ? '&#8369;' + row.platform_cut.toLocaleString() : '&mdash;'}</td>
        <td class="num bold">&#8369;${row.payout.toLocaleString()}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>Payroll &mdash; ${getMonthLabel()}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;font-size:13px;color:#111;padding:32px}
    h1{font-size:20px;font-weight:700;margin-bottom:4px}
    .meta{color:#6b7280;font-size:12px;margin-bottom:24px}
    .summary{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
    .card{border:1px solid #e5e7eb;border-radius:8px;padding:10px 16px;min-width:120px}
    .card-label{font-size:11px;color:#9ca3af;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
    .card-value{font-size:18px;font-weight:700}
    table{width:100%;border-collapse:collapse}
    th{background:#f9fafb;text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:2px solid #e5e7eb}
    td{padding:8px 12px;border-bottom:1px solid #f3f4f6}
    tr:last-child td{border-bottom:none}
    .num{text-align:right}
    .bold{font-weight:600}
    @media print{body{padding:16px}}
  </style>
</head><body>
  <h1>Payroll &mdash; ${getMonthLabel()}</h1>
  <p class="meta">Filter: ${filterLabel} &nbsp;&middot;&nbsp; Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  <div class="summary">
    <div class="card"><div class="card-label">${countLabel}</div><div class="card-value">${filteredRows.length}</div></div>
    <div class="card"><div class="card-label">Total Jobs</div><div class="card-value">${totalJobs}</div></div>
    <div class="card"><div class="card-label">Total Payouts</div><div class="card-value">&#8369;${totalPayout.toLocaleString()}</div></div>
    <div class="card"><div class="card-label">Platform Earnings</div><div class="card-value">&#8369;${totalPlatform.toLocaleString()}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Name</th><th>Role</th>
      <th class="num">Jobs</th><th class="num">Total Earnings</th>
      <th class="num">Platform Cut</th><th class="num">Payout</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Header row */}
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-gray-800">Payroll</h2>
        <input
          type="month"
          value={period}
          onChange={e => { if (e.target.value) setPeriod(e.target.value) }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
        />
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-orange-600">
              {selected.size} selected
              <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600 leading-none">✕</button>
            </span>
          )}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={printPayroll}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
          >
            <Printer size={14} /> Print / PDF
          </button>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[['all', 'All'], ['tasker', 'Taskers'], ['helper', 'Helpers']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === val ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: countLabel,          value: filteredRows.length, fmt: v => v },
          { label: 'Total Jobs',        value: totalJobs,           fmt: v => v },
          { label: 'Total Payouts',     value: totalPayout,         fmt: v => `₱${v.toLocaleString()}` },
          { label: 'Platform Earnings', value: totalPlatform,       fmt: v => `₱${v.toLocaleString()}` },
        ].map(({ label, value, fmt }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">
          No completed bookings for this period.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredRows.map(row => (
              <div key={row.id} className={`rounded-xl shadow-sm border p-4 space-y-3 transition-colors ${selected.has(row.id) ? 'bg-orange-50/60 border-orange-200' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="w-4 h-4 cursor-pointer accent-orange-500 flex-shrink-0"
                    />
                    {row.photo ? (
                      <img src={row.photo} alt={row.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-800 truncate block">{row.name}</span>
                      <span className={`text-xs font-medium ${row.type === 'tasker' ? 'text-orange-500' : 'text-teal-600'}`}>
                        {row.type === 'tasker' ? 'Tasker' : 'Helper'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex-shrink-0">Paid</span>
                </div>
                {row.type === 'tasker' ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg px-2 py-2">
                        <p className="text-xs text-gray-400 mb-0.5">Jobs</p>
                        <p className="text-sm font-bold text-gray-800">{row.jobs}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-2 py-2">
                        <p className="text-xs text-gray-400 mb-0.5">Earnings</p>
                        <p className="text-sm font-bold text-gray-700">₱{row.gross.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-2 py-2">
                        <p className="text-xs text-gray-400 mb-0.5">Platform</p>
                        <p className="text-sm font-bold text-red-500">₱{row.platform_cut.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-gray-50">
                      <p className="text-xs text-gray-400">Tasker Payout</p>
                      <p className="text-base font-bold text-green-600">₱{row.payout.toLocaleString()}</p>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg px-2 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Jobs</p>
                      <p className="text-sm font-bold text-gray-800">{row.jobs}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Payout</p>
                      <p className="text-sm font-bold text-green-600">₱{row.payout.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-4 h-4 cursor-pointer accent-orange-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-right">Completed Jobs</th>
                  <th className="px-4 py-3 text-right">Total Earnings</th>
                  <th className="px-4 py-3 text-right">Platform Cut</th>
                  <th className="px-4 py-3 text-right">Payout</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.id} className={`border-b border-gray-50 last:border-0 transition-colors ${selected.has(row.id) ? 'bg-orange-50/60' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="w-4 h-4 cursor-pointer accent-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.photo ? (
                          <img src={row.photo} alt={row.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-gray-800">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        row.type === 'tasker' ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {row.type === 'tasker' ? 'Tasker' : 'Helper'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.jobs}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.type === 'tasker' ? `₱${row.gross.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500">
                      {row.type === 'tasker' ? `₱${row.platform_cut.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">₱{row.payout.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Paid</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Dashboard Panel ─────────────────────────────────────────────────────────

function DashboardPanel({ setTab, setBookingFilter }) {
  const [stats, setStats] = useState({ customers: 0, taskers: 0, bookings: 0 })
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [platformEarnings, setPlatformEarnings] = useState(0)
  const [monthlyPlatformEarnings, setMonthlyPlatformEarnings] = useState(0)
  const [helperFeesCollected, setHelperFeesCollected] = useState(0)
  const [recentBookings, setRecentBookings] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [topServices, setTopServices] = useState([])
  const [topTaskers, setTopTaskers] = useState([])
  const [leaderboardSort, setLeaderboardSort] = useState('jobs')
  const [loading, setLoading] = useState(true)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    async function fetchDashboard() {
      // Stats
      const [
        { count: customers },
        { count: taskers },
        { count: bookings },
        { data: completedBookings },
        { data: yearBookings },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tasker'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('bookings').select('estimated_total, platform_fee, helper_fee, scheduled_date, created_at').eq('status', 'completed').or('is_refunded.is.null,is_refunded.eq.false'),
        supabase.from('bookings').select('created_at').gte('created_at', `${currentYear}-01-01`).lte('created_at', `${currentYear}-12-31`),
      ])

      const currentMonth = new Date().getMonth()
      const completed = completedBookings ?? []
      const allRevenue = completed.reduce((sum, b) => sum + (Number(b.estimated_total) || 0), 0)
      const allPlatformEarnings = completed.reduce((sum, b) => sum + (Number(b.platform_fee) || 0), 0)
      const allHelperFees = completed.reduce((sum, b) => sum + (Number(b.helper_fee) || 0), 0)
      const thisMonthPlatformEarnings = completed.filter((b) => {
        const d = new Date((b.scheduled_date ?? b.created_at) + (b.scheduled_date ? 'T00:00:00' : ''))
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      }).reduce((sum, b) => sum + (Number(b.platform_fee) || 0), 0)
      setStats({ customers: customers ?? 0, taskers: taskers ?? 0, bookings: bookings ?? 0 })
      setTotalRevenue(allRevenue)
      setPlatformEarnings(allPlatformEarnings)
      setHelperFeesCollected(allHelperFees)
      setMonthlyPlatformEarnings(thisMonthPlatformEarnings)

      // Recent Bookings
      const { data: recentData } = await supabase
        .from('bookings')
        .select('id, customer_name, service, scheduled_date, scheduled_time, status')
        .order('created_at', { ascending: false })
        .limit(10)
      setRecentBookings(recentData || [])

      setAllBookings(yearBookings ?? [])

      // Top Services
      const { data: bookingsData } = await supabase.from('bookings').select('service')
      const serviceCounts = {}
      bookingsData?.forEach((b) => {
        if (b.service) serviceCounts[b.service] = (serviceCounts[b.service] || 0) + 1
      })
      setTopServices(Object.entries(serviceCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count))

      // Top Taskers leaderboard
      const { data: approvedTaskers } = await supabase
        .from('taskers')
        .select('id, name, role, profile_photo')
        .eq('status', 'approved')
      const [
        { data: allCompletedBookings },
        { data: allRejectedBookings },
        { data: allReviews },
      ] = await Promise.all([
        supabase.from('bookings').select('tasker_id').eq('status', 'completed'),
        supabase.from('bookings').select('tasker_id').eq('status', 'rejected'),
        supabase.from('reviews').select('tasker_id, rating'),
      ])
      const jobCounts = {}
      allCompletedBookings?.forEach((b) => {
        if (b.tasker_id) jobCounts[b.tasker_id] = (jobCounts[b.tasker_id] || 0) + 1
      })
      const rejectedCounts = {}
      allRejectedBookings?.forEach((b) => {
        if (b.tasker_id) rejectedCounts[b.tasker_id] = (rejectedCounts[b.tasker_id] || 0) + 1
      })
      const ratingMap = {}
      allReviews?.forEach((r) => {
        if (!ratingMap[r.tasker_id]) ratingMap[r.tasker_id] = []
        ratingMap[r.tasker_id].push(r.rating ?? 0)
      })
      const leaderboard = (approvedTaskers ?? []).map((t) => {
        const ratings = ratingMap[t.id] ?? []
        const avgRating = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0
        return { ...t, jobs: jobCounts[t.id] || 0, rejected: rejectedCounts[t.id] || 0, avgRating }
      }).sort((a, b) => b.jobs - a.jobs || b.avgRating - a.avgRating)
      setTopTaskers(leaderboard)

      setLoading(false)
    }
    fetchDashboard()
  }, [])

  useEffect(() => {
    const bookingsChannel = supabase
      .channel('admin-dashboard-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' },
        () => {
          async function refetch() {
            const [
              { count: bookings },
              { data: completedBookings },
              { data: yearBookings },
            ] = await Promise.all([
              supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
              supabase.from('bookings').select('estimated_total, platform_fee, helper_fee, scheduled_date, created_at').eq('status', 'completed').or('is_refunded.is.null,is_refunded.eq.false'),
              supabase.from('bookings').select('created_at').gte('created_at', `${currentYear}-01-01`).lte('created_at', `${currentYear}-12-31`),
            ])
            const currentMonth = new Date().getMonth()
            const completed = completedBookings ?? []
            const allRevenue = completed.reduce((sum, b) => sum + (Number(b.estimated_total) || 0), 0)
            const allPlatformEarnings = completed.reduce((sum, b) => sum + (Number(b.platform_fee) || 0), 0)
            const allHelperFees = completed.reduce((sum, b) => sum + (Number(b.helper_fee) || 0), 0)
            const thisMonthPlatformEarnings = completed.filter((b) => {
              const d = new Date((b.scheduled_date ?? b.created_at) + (b.scheduled_date ? 'T00:00:00' : ''))
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear
            }).reduce((sum, b) => sum + (Number(b.platform_fee) || 0), 0)
            setStats((prev) => ({ ...prev, bookings: bookings ?? 0 }))
            setTotalRevenue(allRevenue)
            setPlatformEarnings(allPlatformEarnings)
            setHelperFeesCollected(allHelperFees)
            setMonthlyPlatformEarnings(thisMonthPlatformEarnings)
            setAllBookings(yearBookings ?? [])
            const { data: recentData } = await supabase
              .from('bookings')
              .select('id, customer_name, service, scheduled_date, scheduled_time, status')
              .order('created_at', { ascending: false })
              .limit(10)
            setRecentBookings(recentData || [])
            const { data: bookingsData } = await supabase.from('bookings').select('service')
            const serviceCounts = {}
            bookingsData?.forEach((b) => {
              if (b.service) serviceCounts[b.service] = (serviceCounts[b.service] || 0) + 1
            })
            setTopServices(Object.entries(serviceCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count))
            const { data: approvedTaskers } = await supabase
              .from('taskers').select('id, name, role, profile_photo').eq('status', 'approved')
            const [
              { data: allCompletedBookings },
              { data: allRejectedBookings },
              { data: allReviews },
            ] = await Promise.all([
              supabase.from('bookings').select('tasker_id').eq('status', 'completed'),
              supabase.from('bookings').select('tasker_id').eq('status', 'rejected'),
              supabase.from('reviews').select('tasker_id, rating'),
            ])
            const jobCounts = {}
            allCompletedBookings?.forEach((b) => {
              if (b.tasker_id) jobCounts[b.tasker_id] = (jobCounts[b.tasker_id] || 0) + 1
            })
            const rejectedCounts = {}
            allRejectedBookings?.forEach((b) => {
              if (b.tasker_id) rejectedCounts[b.tasker_id] = (rejectedCounts[b.tasker_id] || 0) + 1
            })
            const ratingMap = {}
            allReviews?.forEach((r) => {
              if (!ratingMap[r.tasker_id]) ratingMap[r.tasker_id] = []
              ratingMap[r.tasker_id].push(r.rating ?? 0)
            })
            const leaderboard = (approvedTaskers ?? []).map((t) => {
              const ratings = ratingMap[t.id] ?? []
              const avgRating = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0
              return { ...t, jobs: jobCounts[t.id] || 0, rejected: rejectedCounts[t.id] || 0, avgRating }
            }).sort((a, b) => b.jobs - a.jobs || b.avgRating - a.avgRating)
            setTopTaskers(leaderboard)
          }
          refetch()
        }
      )
      .subscribe()

    const profilesChannel = supabase
      .channel('admin-dashboard-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },
        () => {
          async function refetchCounts() {
            const [{ count: customers }, { count: taskers }] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tasker'),
            ])
            setStats((prev) => ({ ...prev, customers: customers ?? 0, taskers: taskers ?? 0 }))
          }
          refetchCounts()
        }
      )
      .subscribe()

    const reviewsChannel = supabase
      .channel('admin-dashboard-reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' },
        () => {
          async function refetchLeaderboard() {
            const { data: approvedTaskers } = await supabase
              .from('taskers').select('id, name, role, profile_photo').eq('status', 'approved')
            const [
              { data: allCompletedBookings },
              { data: allRejectedBookings },
              { data: allReviews },
            ] = await Promise.all([
              supabase.from('bookings').select('tasker_id').eq('status', 'completed'),
              supabase.from('bookings').select('tasker_id').eq('status', 'rejected'),
              supabase.from('reviews').select('tasker_id, rating'),
            ])
            const jobCounts = {}
            allCompletedBookings?.forEach((b) => {
              if (b.tasker_id) jobCounts[b.tasker_id] = (jobCounts[b.tasker_id] || 0) + 1
            })
            const rejectedCounts = {}
            allRejectedBookings?.forEach((b) => {
              if (b.tasker_id) rejectedCounts[b.tasker_id] = (rejectedCounts[b.tasker_id] || 0) + 1
            })
            const ratingMap = {}
            allReviews?.forEach((r) => {
              if (!ratingMap[r.tasker_id]) ratingMap[r.tasker_id] = []
              ratingMap[r.tasker_id].push(r.rating ?? 0)
            })
            const leaderboard = (approvedTaskers ?? []).map((t) => {
              const ratings = ratingMap[t.id] ?? []
              const avgRating = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0
              return { ...t, jobs: jobCounts[t.id] || 0, rejected: rejectedCounts[t.id] || 0, avgRating }
            }).sort((a, b) => b.jobs - a.jobs || b.avgRating - a.avgRating)
            setTopTaskers(leaderboard)
          }
          refetchLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(bookingsChannel)
      supabase.removeChannel(profilesChannel)
      supabase.removeChannel(reviewsChannel)
    }
  }, [])

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyData = months.map((month, i) => ({
    month,
    count: allBookings.filter((b) => new Date(b.created_at).getMonth() === i).length,
  }))
  const maxCount = Math.max(...monthlyData.map((d) => d.count), 1)

  const getPieSlices = (data) => {
    const maxReal = Math.max(...data.map((s) => s.count), 1)
    const minSlice = maxReal * 0.05
    const normalized = data.map((s) => ({ ...s, displayCount: s.count > 0 ? s.count : minSlice }))
    const total = normalized.reduce((sum, s) => sum + s.displayCount, 0) || 1
    const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6']
    let cumulative = 0
    return normalized.map((service, i) => {
      const ratio = service.displayCount / total
      const startAngle = cumulative * 2 * Math.PI
      cumulative += ratio
      const endAngle = cumulative * 2 * Math.PI
      const x1 = Math.cos(startAngle - Math.PI / 2)
      const y1 = Math.sin(startAngle - Math.PI / 2)
      const x2 = Math.cos(endAngle - Math.PI / 2)
      const y2 = Math.sin(endAngle - Math.PI / 2)
      const largeArc = ratio > 0.5 ? 1 : 0
      return {
        path: `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`,
        color: colors[i % colors.length],
        name: service.name,
        count: service.count,
        percent: Math.round((service.count / Math.max(data.reduce((s, d) => s + d.count, 0), 1)) * 100),
      }
    })
  }

  const statCards = [
    { label: 'Total Customers', value: stats.customers, icon: <Users className="w-8 h-8 text-blue-500" />,           accent: 'border-blue-500',   num: 'text-blue-600',   onClick: () => setTab('customers') },
    { label: 'Total Taskers',   value: stats.taskers,   icon: <Wrench className="w-8 h-8 text-green-500" />,         accent: 'border-green-500',  num: 'text-green-600',  onClick: () => setTab('tasker-accounts') },
    { label: 'Completed Bookings',  value: stats.bookings,  icon: <ClipboardList className="w-8 h-8 text-orange-500" />, accent: 'border-orange-500', num: 'text-orange-600', onClick: () => { setBookingFilter('completed'); setTab('bookings') } },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-3 md:p-6 w-full">

      <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Dashboard Overview</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, accent, num, onClick }) => (
          <div key={label} onClick={onClick} className={`bg-white rounded-xl shadow-sm p-4 md:p-5 py-5 md:py-6 border-l-4 ${accent} cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200`}>
            <div className="mb-2">{icon}</div>
            <div className={`text-2xl md:text-4xl font-bold ${num}`}>{value}</div>
            <div className="text-xs md:text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
        {/* Total Revenue card */}
        <div onClick={() => { setBookingFilter('completed'); setTab('bookings') }} className="bg-white rounded-xl shadow-sm p-4 md:p-5 py-5 md:py-6 border-l-4 border-purple-500 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
          <div className="mb-2"><TrendingUp className="w-8 h-8 text-purple-500" /></div>
          <div className="text-2xl md:text-4xl font-bold text-purple-600">{'₱' + totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Total Revenue</div>
          <div className="text-xs text-gray-400 mt-1">Gross customer payments</div>
        </div>

        {/* Platform Earnings card */}
        <div onClick={() => { setBookingFilter('completed'); setTab('bookings') }} className="bg-white rounded-xl shadow-sm p-4 md:p-5 py-5 md:py-6 border-l-4 border-emerald-500 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
          <div className="mb-2"><DollarSign className="w-8 h-8 text-emerald-500" /></div>
          <div className="text-2xl md:text-4xl font-bold text-emerald-600">{'₱' + platformEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Platform Earnings</div>
          <div className="text-xs text-gray-400 mt-1">Hanap.ph 10% cut</div>
        </div>

        {/* This Month's Earnings card */}
        <div onClick={() => { setBookingFilter('completed'); setTab('bookings') }} className="bg-white rounded-xl shadow-sm p-4 md:p-5 py-5 md:py-6 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
          <div className="mb-2"><Calendar className="w-8 h-8 text-blue-500" /></div>
          <div className="text-2xl md:text-4xl font-bold text-blue-600">{'₱' + monthlyPlatformEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">This Month's Earnings</div>
          <div className="text-xs text-gray-400 mt-1">Platform earnings this month</div>
        </div>

        {/* Helper Fees Collected card */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 py-5 md:py-6 border-l-4" style={{ borderColor: '#0d9488' }}>
          <div className="mb-2"><Users className="w-8 h-8" style={{ color: '#0d9488' }} /></div>
          <div className="text-2xl md:text-4xl font-bold" style={{ color: '#0d9488' }}>{'₱' + helperFeesCollected.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Helper Fees Collected</div>
          <div className="text-xs text-gray-400 mt-1">Paid out to helpers</div>
        </div>

      </div>

      {/* Chart + Recent Bookings */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

        {/* Monthly Bookings Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5 md:min-h-[400px] md:col-span-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Booking Activity — {currentYear}</h3>
          <div className="flex items-end gap-2 h-64 min-h-[200px]">
            {monthlyData.map((item) => (
              <div key={item.month} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs text-gray-500">{item.count}</span>
                <div
                  className="w-full bg-orange-500 rounded-t transition-all"
                  style={{ height: `${(item.count / maxCount) * 200}px` }}
                />
                <span className="text-xs text-gray-400">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm p-5 md:min-h-[400px] md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Recent Bookings</h3>
            <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-1 rounded-full">
              Last 10
            </span>
          </div>
          {recentBookings.length === 0 ? (
            <p className="text-gray-400 text-sm">No bookings yet.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-80">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-start justify-between border border-gray-100 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{booking.customer_name || 'Customer'}</p>
                    <p className="text-xs text-gray-500">{booking.service}</p>
                    <p className="text-xs text-gray-400">
                      {booking.scheduled_date
                        ? new Date(booking.scheduled_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
                        : ''}
                      {booking.scheduled_time
                        ? ` at ${new Date(`1970-01-01T${booking.scheduled_time}`).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                        : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap capitalize ${BOOKING_STATUS_STYLES[booking.status] ?? BOOKING_STATUS_STYLES.pending}`}>
                    {booking.status?.replaceAll('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Top Services */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Services by Demand</h3>
        {topServices.every((s) => s.count === 0) ? (
          <p className="text-gray-400 text-sm">No bookings yet.</p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Pie Chart */}
            <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-40 h-40 md:w-48 md:h-48 shrink-0">
              {getPieSlices(topServices).map((slice, i) => (
                <path key={i} d={slice.path} fill={slice.color} stroke="white" strokeWidth="0.02" />
              ))}
            </svg>
            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 w-full md:w-auto md:flex-1">
              {getPieSlices(topServices).map((slice, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="text-xs md:text-sm text-gray-600 truncate">{slice.name}</span>
                  </div>
                  <span className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">{slice.count} ({slice.percent}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vortex Elite shimmer animation */}
      <style>{`
        @keyframes vortex-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.6); }
          50% { box-shadow: 0 0 16px rgba(255, 165, 0, 0.9), 0 0 24px rgba(255, 215, 0, 0.4); }
        }
        .vortex-badge { animation: vortex-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Top Performing Taskers Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">🏆 Top Performing Taskers</h3>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setLeaderboardSort('jobs')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${leaderboardSort === 'jobs' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}
            >
              Sort by Jobs
            </button>
            <button
              onClick={() => setLeaderboardSort('rating')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${leaderboardSort === 'rating' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}
            >
              Sort by Rating
            </button>
          </div>
        </div>

        {topTaskers.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No taskers yet</p>
        ) : (() => {
          const sorted = [...topTaskers].sort(
            leaderboardSort === 'rating'
              ? (a, b) => b.avgRating - a.avgRating || b.jobs - a.jobs
              : (a, b) => b.jobs - a.jobs || b.avgRating - a.avgRating
          )
          const maxJobs = Math.max(...sorted.map((t) => t.jobs), 1)
          const rankEmoji = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
          const borderAccent = (i) => i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'transparent'
          return (
            <div className="divide-y divide-gray-100 rounded-lg overflow-hidden border border-gray-100">
              {sorted.map((t, i) => {
                const photo = t.profile_photo
                  ? t.profile_photo.startsWith('http')
                    ? t.profile_photo
                    : supabase.storage.from('tasker-files').getPublicUrl(t.profile_photo).data.publicUrl
                  : null
                const initials = (t.name?.[0] ?? '?').toUpperCase()
                const barPct = maxJobs > 0 ? Math.round((t.jobs / maxJobs) * 100) : 0
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-3 md:px-4"
                    style={i === 0 ? {
                      background: 'rgba(255, 215, 0, 0.05)',
                      borderLeft: '4px solid #FFD700',
                      boxShadow: '0 0 12px rgba(255, 215, 0, 0.15)',
                    } : {
                      background: i % 2 === 0 ? '#ffffff' : '#f9fafb',
                      borderLeft: `4px solid ${borderAccent(i)}`,
                    }}
                  >
                    {/* Rank */}
                    <div className="w-7 md:w-8 flex-shrink-0 text-center">
                      {rankEmoji(i) ? (
                        <span className="text-lg md:text-xl">{rankEmoji(i)}</span>
                      ) : (
                        <span className="text-xs md:text-sm font-bold text-gray-400">#{i + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    {photo ? (
                      <img src={photo} alt={t.name} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-orange-500">{initials}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-gray-800 text-sm leading-tight truncate max-w-[140px] sm:max-w-none">{t.name}</span>
                        {i === 0 && (
                          <span
                            className="vortex-badge"
                            style={{
                              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                              color: '#1a1a1a',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              fontSize: '0.6rem',
                              letterSpacing: '0.05em',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            ⚡ VORTEX TASKER ELITE
                          </span>
                        )}
                        <span className="text-xs font-semibold text-orange-500 truncate">{t.role}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">⭐ {t.avgRating > 0 ? t.avgRating.toFixed(1) : '—'}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">✅ {t.jobs} jobs</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className={`text-xs font-medium ${t.rejected > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          ❌ {t.rejected} rejected
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

    </div>
  )
}

// ─── Admin Page ──────────────────────────────────────────────────────────────

// ─── Admin Messages Tab ───────────────────────────────────────────────────────

function AdminInlineChat({ adminUserId, otherUserId, otherUserName, onBack }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const pickerRef = useRef(null)

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .is('booking_id', null)
      .or(`sender_id.eq.${adminUserId},receiver_id.eq.${adminUserId}`)
      .order('created_at', { ascending: true })
    // Keep only messages between these two users
    setMessages((data ?? []).filter(
      (m) => (m.sender_id === adminUserId && m.receiver_id === otherUserId) ||
             (m.sender_id === otherUserId && m.receiver_id === adminUserId)
    ))
  }

  async function markAsRead() {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .is('booking_id', null)
      .eq('sender_id', otherUserId)
      .eq('receiver_id', adminUserId)
      .eq('is_read', false)
  }

  useEffect(() => {
    fetchMessages().then(markAsRead)
    inputRef.current?.focus()
  }, [adminUserId, otherUserId])

  useEffect(() => {
    const channel = supabase
      .channel(`admin-chat-${adminUserId}-${otherUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if (
          msg.booking_id === null &&
          ((msg.sender_id === adminUserId && msg.receiver_id === otherUserId) ||
           (msg.sender_id === otherUserId && msg.receiver_id === adminUserId))
        ) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
          if (msg.receiver_id === adminUserId) {
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [adminUserId, otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    await supabase.from('messages').insert({
      booking_id: null,
      sender_id: adminUserId,
      receiver_id: otherUserId,
      content: text,
      is_read: false,
    })
    setSending(false)
    inputRef.current?.focus()
  }

  const fmtTime = (iso) => iso
    ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  function handleEmojiClick(emojiData) {
    setInput((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-1 text-gray-400 hover:text-gray-600">
            ←
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-orange-500">{(otherUserName?.[0] ?? '?').toUpperCase()}</span>
        </div>
        <p className="font-semibold text-gray-800 text-sm flex-1">{otherUserName}</p>
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm text-center">No messages yet.<br />Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === adminUserId
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMine ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className="text-xs text-gray-400 mt-1 px-1">
                  {isMine ? 'You' : otherUserName} · {fmtTime(msg.created_at)}
                </p>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="relative flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
        {showEmojiPicker && (
          <div ref={pickerRef} className="absolute bottom-16 right-4 z-50">
            <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={380} previewConfig={{ showPreview: false }} />
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShowEmojiPicker((p) => !p)}
          className="p-2.5 rounded-xl text-gray-400 hover:text-orange-500 transition-colors flex-shrink-0"
        >
          <Smile size={20} />
        </button>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-40 flex-shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

function AdminMessagesPanel({ adminUserId }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTasker, setSelectedTasker] = useState(null)

  async function fetchConversations() {
    if (!adminUserId) return

    // Fetch all admin messages (booking_id IS NULL)
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .is('booking_id', null)
      .or(`sender_id.eq.${adminUserId},receiver_id.eq.${adminUserId}`)
      .order('created_at', { ascending: false })

    if (!msgs || msgs.length === 0) { setLoading(false); return }

    // Collect distinct other user IDs
    const otherIds = [...new Set(msgs.map((m) =>
      m.sender_id === adminUserId ? m.receiver_id : m.sender_id
    ).filter(Boolean))]

    // Fetch tasker rows by user_id
    const { data: taskers } = await supabase
      .from('taskers')
      .select('id, name, user_id, profile_photo')
      .in('user_id', otherIds)

    const taskerMap = {}
    ;(taskers ?? []).forEach((t) => { taskerMap[t.user_id] = t })

    // For IDs not found in taskers, fall back to profiles
    const missingIds = otherIds.filter((id) => !taskerMap[id])
    const profileMap = {}
    if (missingIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', missingIds)
      ;(profiles ?? []).forEach((p) => { profileMap[p.id] = p })
    }

    // Build one entry per other user, using the first (most recent) message
    const seen = new Set()
    const convos = []
    for (const msg of msgs) {
      const otherId = msg.sender_id === adminUserId ? msg.receiver_id : msg.sender_id
      if (seen.has(otherId)) continue
      seen.add(otherId)

      const tasker = taskerMap[otherId]
      const profile = profileMap[otherId]
      const unreadCount = msgs.filter(
        (m) => m.sender_id === otherId && m.receiver_id === adminUserId && !m.is_read
      ).length

      // Resolve photo URL
      const raw = tasker?.profile_photo
      const photoUrl = raw
        ? raw.startsWith('http') ? raw : supabase.storage.from('tasker-files').getPublicUrl(raw).data.publicUrl
        : null

      const role = tasker ? 'tasker' : (profile?.role ?? 'customer')
      const name = tasker?.name ?? profile?.full_name ?? 'Unknown User'

      convos.push({
        userId: otherId,
        name,
        photoUrl,
        role,
        lastMessage: msg.content,
        lastTime: msg.created_at,
        unreadCount,
      })
    }

    setConversations(convos)
    setLoading(false)
  }

  useEffect(() => { fetchConversations() }, [adminUserId])

  async function openConversation(c) {
    setSelectedTasker(c)
    if (c.unreadCount > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', c.userId)
        .eq('receiver_id', adminUserId)
        .eq('is_read', false)
      setConversations(prev => prev.map(conv =>
        conv.userId === c.userId ? { ...conv, unreadCount: 0 } : conv
      ))
    }
  }

  // Realtime: refresh conversation list on new messages
  useEffect(() => {
    if (!adminUserId) return
    const channel = supabase
      .channel(`admin-messages-list-${adminUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if (msg.booking_id === null &&
            (msg.sender_id === adminUserId || msg.receiver_id === adminUserId)) {
          fetchConversations()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [adminUserId])

  const fmtTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex gap-0 bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100" style={{ height: '70vh', minHeight: '480px' }}>

      {/* Left panel — conversation list */}
      <div className={`w-full md:w-72 flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedTasker ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-bold text-gray-800 text-sm">Messages</p>
          <p className="text-xs text-gray-400">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10 px-4">No messages yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.userId}
                onClick={() => openConversation(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 hover:bg-orange-50 ${
                  selectedTasker?.userId === c.userId ? 'bg-orange-50' : ''
                }`}
              >
                {c.photoUrl ? (
                  <img src={c.photoUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-500">{(c.name?.[0] ?? '?').toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        c.role === 'tasker'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {c.role === 'tasker' ? 'Tasker' : 'Customer'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtTime(c.lastTime)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — chat */}
      <div className={`flex-1 min-w-0 flex flex-col ${selectedTasker ? 'flex' : 'hidden md:flex'}`}>
        {selectedTasker ? (
          <AdminInlineChat
            adminUserId={adminUserId}
            otherUserId={selectedTasker.userId}
            otherUserName={selectedTasker.name}
            onBack={() => setSelectedTasker(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Helpers Panel ───────────────────────────────────────────────────────────

function HelpersPanel() {
  const [helpers, setHelpers] = useState([])
  const [approvedTaskers, setApprovedTaskers] = useState([])
  const [assignments, setAssignments] = useState({}) // { helper_id: [{ tasker_id, tasker_name, slot }] }
  const [appByPhone, setAppByPhone] = useState({}) // { phone: helper_application_row }
  const [loading, setLoading] = useState(true)
  const [selectedHelper, setSelectedHelper] = useState(null)
  const [showHelperModal, setShowHelperModal] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  // Search
  const [search, setSearch] = useState('')

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  // Edit modal
  const [editHelper, setEditHelper] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Assign modal
  const [assignHelper, setAssignHelper] = useState(null)
  const [assignTaskerId, setAssignTaskerId] = useState('')
  const [assignSlot, setAssignSlot] = useState('1')
  const [assignWarning, setAssignWarning] = useState('')
  const [assignSaving, setAssignSaving] = useState(false)

  async function fetchData() {
    const [{ data: helpersData }, { data: assignData }, { data: taskersData }, { data: appsData }] = await Promise.all([
      supabase.from('helpers').select('*').eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('tasker_helpers').select('helper_id, slot, tasker_id, taskers(id, name)'),
      supabase.from('taskers').select('id, name').eq('status', 'approved').order('name'),
      supabase.from('helper_applications').select('*').eq('status', 'approved'),
    ])
    setHelpers(helpersData ?? [])
    setApprovedTaskers(taskersData ?? [])
    const phoneMap = {}
    for (const app of appsData ?? []) phoneMap[app.phone] = app
    setAppByPhone(phoneMap)
    const map = {}
    for (const row of assignData ?? []) {
      if (!map[row.helper_id]) map[row.helper_id] = []
      map[row.helper_id].push({
        tasker_id: row.taskers?.id ?? row.tasker_id,
        tasker_name: row.taskers?.name ?? '—',
        slot: row.slot,
      })
    }
    setAssignments(map)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleToggleActive(helper) {
    const next = !helper.is_active
    setHelpers((prev) => prev.map((h) => h.id === helper.id ? { ...h, is_active: next } : h))
    await supabase.from('helpers').update({ is_active: next }).eq('id', helper.id)
  }

  async function handleAddHelper() {
    if (!newName.trim()) { setAddError('Name is required.'); return }
    if (newPhone.trim() && newPhone.trim().length !== 11) { setAddError('Phone number must be exactly 11 digits.'); return }
    setAddSaving(true)
    const { error } = await supabase.from('helpers').insert({ name: newName.trim(), phone: newPhone.trim() || null, is_active: true })
    if (error) { setAddError('Failed to add helper.'); setAddSaving(false); return }
    setNewName(''); setNewPhone(''); setAddError(''); setShowAddModal(false); setAddSaving(false)
    fetchData()
  }

  async function handleEditSave() {
    if (!editName.trim()) { setEditError('Name is required.'); return }
    if (editPhone.trim() && editPhone.trim().length !== 11) { setEditError('Phone number must be exactly 11 digits.'); return }
    setEditSaving(true)
    const { error } = await supabase.from('helpers').update({ name: editName.trim(), phone: editPhone.trim() || null }).eq('id', editHelper.id)
    if (error) { setEditError('Failed to save.'); setEditSaving(false); return }
    setEditHelper(null); setEditSaving(false)
    fetchData()
  }

  function handleDelete(helper) {
    openConfirm(`Move ${helper.name} to Archive? Their tasker assignments will be kept.`, async () => {
      await supabase.from('helpers').update({ is_archived: true }).eq('id', helper.id)
      if (helper.user_id) {
        await supabase.from('profiles').update({ role: 'customer' }).eq('id', helper.user_id)
        await supabase.from('helper_applications').update({ status: 'rejected' }).eq('user_id', helper.user_id)
      }
      fetchData()
    }, true)
  }

  function checkAssignConflict(taskerId, slot) {
    if (!taskerId || !slot) { setAssignWarning(''); return }
    for (const [hid, rows] of Object.entries(assignments)) {
      for (const row of rows) {
        if (String(row.tasker_id) === String(taskerId) && String(row.slot) === String(slot)) {
          if (String(hid) !== String(assignHelper?.id)) {
            const existing = helpers.find((h) => String(h.id) === String(hid))
            setAssignWarning(`This slot is already taken by ${existing?.name ?? 'another helper'}. Reassign?`)
            return
          }
        }
      }
    }
    setAssignWarning('')
  }

  async function handleAssignSave() {
    if (!assignTaskerId || !assignSlot) return
    setAssignSaving(true)
    // Remove any existing assignment for this tasker+slot, then insert fresh
    await supabase.from('tasker_helpers').delete()
      .eq('tasker_id', assignTaskerId).eq('slot', parseInt(assignSlot))
    await supabase.from('tasker_helpers').insert({
      helper_id: assignHelper.id,
      tasker_id: assignTaskerId,
      slot: parseInt(assignSlot),
    })
    setAssignHelper(null); setAssignSaving(false)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Helpers</h2>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search helpers by name or phone..."
          className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 transition-colors"
        />
      </div>

      {/* Table */}
      {helpers.length === 0 ? (
        <p className="text-center text-gray-400 mt-16">No helpers yet. Add one to get started.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact Number</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assigned Taskers</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {helpers.filter((h) => {
                  const q = search.trim().toLowerCase()
                  if (!q) return true
                  return h.name?.toLowerCase().includes(q) || h.phone?.toLowerCase().includes(q)
                }).map((h) => {
                  const helperAssignments = assignments[h.id] ?? []
                  const app = appByPhone[h.phone] ?? null
                  return (
                    <>
                      <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {h.profile_photo ? (
                              <img src={h.profile_photo} alt={h.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">{h.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                              </div>
                            )}
                            <span className="font-medium text-gray-800">{h.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{h.phone || <span className="text-gray-300">—</span>}</td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(h)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                              h.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {h.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          {helperAssignments.length === 0 ? (
                            <span className="text-gray-400 text-xs">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {helperAssignments.map((a, i) => (
                                <span key={i} className="bg-orange-50 border border-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                                  {a.tasker_name} (Slot {a.slot})
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {app && (
                              <button
                                onClick={() => { setSelectedHelper({ ...h, app }); setShowHelperModal(true) }}
                                className="text-xs px-2.5 py-1 border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-medium"
                              >
                                View Details →
                              </button>
                            )}
                            <button
                              onClick={() => { setAssignHelper(h); setAssignTaskerId(''); setAssignSlot('1'); setAssignWarning('') }}
                              className="text-xs px-2.5 py-1 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => { setEditHelper(h); setEditName(h.name); setEditPhone(h.phone ?? ''); setEditError('') }}
                              className="text-xs px-2.5 py-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(h)}
                              className="text-xs px-2.5 py-1 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Helper Details Modal */}
      {showHelperModal && selectedHelper && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowHelperModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowHelperModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-black text-xl">✕</button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xl font-bold flex-shrink-0">
                {selectedHelper.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedHelper.name}</h2>
                <p className="text-sm text-gray-500">{selectedHelper.phone || '—'}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Approved Helper</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
              <div><span className="text-gray-500">Age:</span> <span className="font-medium">{selectedHelper.app.age || '—'}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedHelper.app.email || '—'}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{selectedHelper.app.address || '—'}</span></div>
              <div><span className="text-gray-500">Emergency Contact:</span> <span className="font-medium">{selectedHelper.app.emergency_contact_name || '—'}</span></div>
              <div><span className="text-gray-500">Emergency Phone:</span> <span className="font-medium">{selectedHelper.app.emergency_contact_phone || '—'}</span></div>
              {selectedHelper.app.interview_date && (
                <div className="col-span-2"><span className="text-gray-500">Interview Date:</span> <span className="font-medium">{new Date(selectedHelper.app.interview_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
              )}
            </div>

            {/* Documents */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Documents</h4>
              <div className="flex gap-3 flex-wrap">
                {selectedHelper.app.gov_id_url ? (
                  <button
                    onClick={() => setLightboxSrc(selectedHelper.app.gov_id_url)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 hover:border-orange-400 transition-colors"
                  >
                    🪪 Government ID
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">No Gov ID uploaded</span>
                )}
                {selectedHelper.app.nbi_clearance_url && (
                  <button
                    onClick={() => setLightboxSrc(selectedHelper.app.nbi_clearance_url)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 hover:border-orange-400 transition-colors"
                  >
                    📄 NBI Clearance
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Edit Helper Modal */}
      {editHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditHelper(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-base mb-4">Edit Helper</h3>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => { setEditName(e.target.value); setEditError('') }}
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 mb-3"
            />
            <label className="block text-xs text-gray-500 mb-1">Contact Number <span className="text-gray-300 font-normal">(optional)</span></label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              onKeyDown={(e) => {
                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'Delete') e.preventDefault()
                if (e.key === 'Enter') handleEditSave()
              }}
              maxLength={11}
              placeholder="e.g. 09171234567"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 mb-3"
            />
            {editError && <p className="text-xs text-red-500 mb-3">{editError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {editSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditHelper(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Tasker Modal */}
      {assignHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAssignHelper(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-base mb-1">Assign to Tasker</h3>
            <p className="text-xs text-gray-400 mb-4">
              Assigning: <span className="font-semibold text-gray-700">{assignHelper.name}</span>
            </p>

            <label className="block text-xs text-gray-500 mb-1">Tasker</label>
            <select
              value={assignTaskerId}
              onChange={(e) => { setAssignTaskerId(e.target.value); checkAssignConflict(e.target.value, assignSlot) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 mb-4"
            >
              <option value="">— Select a tasker —</option>
              {approvedTaskers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <label className="block text-xs text-gray-500 mb-2">Slot</label>
            <div className="flex gap-3 mb-4">
              {[{ value: '1', label: 'Assistant 1' }, { value: '2', label: 'Assistant 2' }].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    assignSlot === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="assignSlot"
                    value={opt.value}
                    checked={assignSlot === opt.value}
                    onChange={() => { setAssignSlot(opt.value); checkAssignConflict(assignTaskerId, opt.value) }}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>

            {assignWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 mb-4">
                ⚠️ {assignWarning}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAssignSave}
                disabled={assignSaving || !assignTaskerId}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {assignSaving ? 'Saving...' : assignWarning ? 'Confirm & Reassign' : 'Assign'}
              </button>
              <button
                onClick={() => setAssignHelper(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Announcements Panel ─────────────────────────────────────────────────────

function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })
  const pickerRef = useRef(null)
  const messageRef = useRef(null)
  const formRef = useRef(null)
  const titleInputRef = useRef(null)

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    setAnnouncements(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAnnouncements() }, [])

  function startEdit(ann) {
    setEditingId(ann.id)
    setTitle(ann.title)
    setMessage(ann.message)
    setError('')
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      titleInputRef.current?.focus()
    }, 50)
  }

  function cancelEdit() {
    setEditingId(null)
    setTitle('')
    setMessage('')
    setError('')
  }

  function handleDelete(id) {
    openConfirm('Delete this announcement? This cannot be undone.', async () => {
      await supabase.from('announcements').delete().eq('id', id)
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    }, true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) { setError('Title and message are required.'); return }
    setSaving(true)
    setError('')

    if (editingId) {
      const { error: err } = await supabase
        .from('announcements')
        .update({ title: title.trim(), message: message.trim() })
        .eq('id', editingId)
      if (err) { setError('Failed to update.'); setSaving(false); return }
    } else {
      const { error: err } = await supabase
        .from('announcements')
        .insert({ title: title.trim(), message: message.trim() })
      if (err) { setError('Failed to post.'); setSaving(false); return }

      const { data: taskerProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'tasker')
      if (taskerProfiles?.length > 0) {
        await supabase.from('notifications').insert(
          taskerProfiles.map(p => ({
            user_id: p.id,
            title: `📢 ${title.trim()}`,
            message: message.trim(),
            is_read: false,
          }))
        )
      }
    }

    setSaving(false)
    cancelEdit()
    fetchAnnouncements()
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  function handleEmojiClick(emojiData) {
    setMessage((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
    messageRef.current?.focus()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
      <h2 className="text-xl font-bold text-gray-800">Announcements</h2>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No announcements yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {announcements.map((ann) => (
              <div key={ann.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">{ann.title}</p>
                  <p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{ann.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(ann)}
                    className="text-xs font-semibold text-orange-500 border border-orange-300 hover:bg-orange-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Form */}
      <div ref={formRef} className="bg-white rounded-2xl shadow-sm p-5">
        <p className="font-bold text-gray-800 text-sm mb-4">
          {editingId ? 'Edit Announcement' : 'New Announcement'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors"
          />
          <div className="relative">
            <textarea
              ref={messageRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              rows={4}
              style={{ minHeight: 100 }}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors resize-none"
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker((p) => !p)}
              className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg text-gray-400 hover:text-orange-500 transition-colors"
            >
              <Smile size={18} />
            </button>
            {showEmojiPicker && (
              <div ref={pickerRef} className="absolute bottom-10 right-0 z-50">
                <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={380} previewConfig={{ showPreview: false }} />
              </div>
            )}
          </div>
          <p className={`text-xs text-right ${message.length > 500 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            {message.length} / 500
          </p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : editingId ? 'Update Announcement' : 'Post Announcement'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-sm font-semibold text-gray-500 border border-gray-300 hover:border-gray-400 hover:text-gray-700 px-5 py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Transactions Panel ──────────────────────────────────────────────────────

function TransactionsPanel() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refundedBookings, setRefundedBookings] = useState([])
  const [refundsLoading, setRefundsLoading] = useState(true)
  const [refundedSet, setRefundedSet] = useState(new Set()) // pay_xxx ids from Supabase (persists refresh)
  const [refundModal, setRefundModal] = useState(null) // { payment }
  const [refundProcessing, setRefundProcessing] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  const [refundReasonError, setRefundReasonError] = useState('')
  const [refundedIds, setRefundedIds] = useState(new Set()) // pay_xxx ids refunded this session
  const [toast, setToast] = useState(null) // { message, type: 'success'|'error' }
  const [detailModal, setDetailModal] = useState(null) // payment object
  const [detailBooking, setDetailBooking] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [refundDetailModal, setRefundDetailModal] = useState(null) // auto-refunded booking object
  const [refundTaskerName, setRefundTaskerName] = useState(null)
  const [refundTaskerLoading, setRefundTaskerLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [filteredPayments, setFilteredPayments] = useState(null) // null = show all
  const searchTimerRef = useRef(null)
  const [limit, setLimit] = useState(20)
  const limitRef = useRef(20)
  const [allTimeTotal, setAllTimeTotal] = useState(null)
  const [allTimeRefunded, setAllTimeRefunded] = useState(null)
  const [allTimeMethodCounts, setAllTimeMethodCounts] = useState({ gcash: null, maya: null, card: null })

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const term = searchTerm.trim()
    if (!term) {
      setFilteredPayments(null)
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true)
      const { data } = await supabase
        .from('bookings')
        .select('paymongo_payment_id')
        .or(`reference_number.ilike.%${term}%,customer_name.ilike.%${term}%`)
        .not('paymongo_payment_id', 'is', null)
      const ids = new Set((data ?? []).map(b => b.paymongo_payment_id).filter(Boolean))
      setFilteredPayments(ids.size > 0 ? payments.filter(p => ids.has(p.id)) : [])
      setSearchLoading(false)
    }, 400)
    return () => clearTimeout(searchTimerRef.current)
  }, [searchTerm, payments])

  const displayPayments = filteredPayments !== null ? filteredPayments : payments

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function openDetail(payment) {
    setDetailModal(payment)
    setDetailBooking(null)
    setDetailLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('customer_name, reference_number, id')
      .eq('paymongo_payment_id', payment.id)
      .limit(1)
      .maybeSingle()
    setDetailBooking(data ?? null)
    setDetailLoading(false)
  }

  useEffect(() => {
    if (!refundDetailModal?.tasker_id) {
      setRefundTaskerName(null)
      return
    }
    let cancelled = false
    setRefundTaskerName(null)
    setRefundTaskerLoading(true)
    supabase
      .from('taskers')
      .select('name')
      .eq('id', refundDetailModal.tasker_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setRefundTaskerName(data?.name ?? null)
          setRefundTaskerLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [refundDetailModal])

  const fetchPayments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`https://api.paymongo.com/v1/payments?limit=${limitRef.current}`, {
        headers: {
          Authorization: 'Basic ' + btoa(import.meta.env.VITE_PAYMONGO_SECRET_KEY + ':'),
        },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setPayments(json.data ?? [])
    } catch {
      setError('Failed to load transactions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRefundedBookings = async () => {
    setRefundsLoading(true)
    const { data, error: refundsError } = await supabase
      .from('bookings')
      .select('id, reference_number, customer_name, service, estimated_total, rejection_reason, rejection_note, helper_fee, platform_fee, tasker_payout, tasker_id, created_at, paymongo_payment_id')
      .eq('is_refunded', true)
      .not('rejection_reason', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
    setRefundedBookings(data ?? [])
    setRefundsLoading(false)

    // Also fetch all refunded bookings with a paymongo_payment_id for the status Set
    const { data: allRefunded } = await supabase
      .from('bookings')
      .select('paymongo_payment_id')
      .eq('is_refunded', true)
      .not('paymongo_payment_id', 'is', null)
    setRefundedSet(new Set((allRefunded ?? []).map((b) => b.paymongo_payment_id)))
  }

  async function fetchAllTimeTotal() {
    const [{ data }, { data: refundedData }] = await Promise.all([
      supabase.from('bookings').select('estimated_total, payment_method').not('paymongo_payment_id', 'is', null).eq('is_refunded', false),
      supabase.from('bookings').select('estimated_total').eq('is_refunded', true),
    ])
    const rows = data ?? []
    const total = rows.reduce((sum, b) => sum + Number(b.estimated_total ?? 0), 0)
    const refundedTotal = (refundedData ?? []).reduce((sum, b) => sum + Number(b.estimated_total ?? 0), 0)
    setAllTimeTotal(total)
    setAllTimeRefunded(refundedTotal)
    setAllTimeMethodCounts({
      gcash: rows.filter((b) => b.payment_method === 'gcash').length,
      maya:  rows.filter((b) => b.payment_method === 'paymaya' || b.payment_method === 'maya').length,
      card:  rows.filter((b) => b.payment_method === 'card').length,
    })
  }

  function handleLimitChange(newLimit) {
    setLimit(newLimit)
    limitRef.current = newLimit
    fetchPayments()
  }

  useEffect(() => {
    fetchPayments()
    fetchRefundedBookings()
    fetchAllTimeTotal()
    const interval = setInterval(fetchPayments, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatAmount = (centavos) =>
    '₱' + (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const formatMethod = (method) => {
    if (method === 'gcash') return 'GCash'
    if (method === 'paymaya' || method === 'maya') return 'PayMaya'
    if (method === 'card') return 'Credit/Debit Card'
    return method ?? '—'
  }

  const formatPaidAt = (unix) => {
    if (!unix) return '—'
    return new Date(unix * 1000).toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  const totalCollected = payments
    .filter((p) => p.attributes?.status === 'paid' && !refundedSet.has(p.id) && !refundedIds.has(p.id))
    .reduce((sum, p) => sum + (p.attributes?.amount ?? 0), 0)
  const gcashCount = payments.filter((p) => p.attributes?.source?.type === 'gcash').length
  const mayaCount  = payments.filter((p) => p.attributes?.source?.type === 'paymaya' || p.attributes?.source?.type === 'maya').length
  const cardCount  = payments.filter((p) => p.attributes?.source?.type === 'card').length

  async function handleConfirmRefund() {
    if (!refundReason) {
      setRefundReasonError('Please select a reason.')
      return
    }
    setRefundReasonError('')
    const p = refundModal.payment
    const attr = p.attributes ?? {}
    const paymentId = p.id
    const amountCentavos = attr.amount ?? 0

    setRefundProcessing(true)

    // Step 2 — Find booking in Supabase
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, client_id, estimated_total, is_refunded')
      .eq('paymongo_payment_id', paymentId)
      .limit(1)
      .maybeSingle()

    if (!booking) {
      setRefundProcessing(false)
      setRefundModal(null)
      showToast('Booking not found for this payment. Cannot process refund.', 'error')
      return
    }
    if (booking.is_refunded) {
      setRefundProcessing(false)
      setRefundModal(null)
      showToast('This payment has already been refunded.', 'error')
      return
    }

    // Step 3 — Call PayMongo Refund API
    let refundRes
    try {
      refundRes = await fetch('https://api.paymongo.com/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(import.meta.env.VITE_PAYMONGO_SECRET_KEY + ':'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: amountCentavos,
              payment_id: paymentId,
              reason: refundReason,
              ...(refundNotes.trim() ? { notes: refundNotes.trim() } : {}),
            },
          },
        }),
      })
    } catch (err) {
      setRefundProcessing(false)
      setRefundModal(null)
      showToast('Network error contacting PayMongo. Please try again.', 'error')
      return
    }

    if (!refundRes.ok) {
      const errJson = await refundRes.json().catch(() => ({}))
      const errMsg = errJson?.errors?.[0]?.detail ?? 'PayMongo refund failed. Please try again.'
      setRefundProcessing(false)
      setRefundModal(null)
      showToast(errMsg, 'error')
      return
    }

    // Step 4 — Supabase writes (non-blocking on failure)
    try {
      await supabase.from('bookings').update({ is_refunded: true }).eq('id', booking.id)
    } catch (_) { }

    if (booking.client_id) {
      const refundAmt = Number(booking.estimated_total) || amountCentavos / 100
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: booking.client_id,
        title: 'Refund Processed',
        message: `Your refund of ₱${refundAmt.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been processed back to your original payment method.`,
        is_read: false,
      })
    }

    // Step 5 — UI updates
    setRefundedIds((prev) => new Set([...prev, paymentId]))
    setRefundedSet((prev) => new Set([...prev, paymentId]))
    setRefundProcessing(false)
    setRefundModal(null)
    setRefundReason('')
    setRefundNotes('')
    setRefundReasonError('')
    showToast(`Refund of ${formatAmount(amountCentavos)} successfully processed.`, 'success')
    fetchAllTimeTotal()
  }

  const StatusBadge = ({ status, paymentId }) => {
    if (refundedSet.has(paymentId) || refundedIds.has(paymentId)) {
      return <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">Refunded</span>
    }
    if (status === 'paid') {
      return <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Paid</span>
    }
    return <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">{status ?? '—'}</span>
  }

  const RefundButton = ({ payment }) => {
    const alreadyRefunded = refundedSet.has(payment.id) || refundedIds.has(payment.id)
    if (alreadyRefunded) {
      return <span className="text-gray-400 text-xs font-semibold px-3 py-1">Refunded</span>
    }
    return (
      <button
        onClick={() => setRefundModal({ payment })}
        className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition rounded-lg px-3 py-1 text-xs font-semibold"
      >Refund</button>
    )
  }

  return (
    <div className="w-full">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Payment Detail Modal */}
      {detailModal && (() => {
        const attr = detailModal.attributes ?? {}
        const src = attr.source ?? {}
        const gross  = typeof attr.amount     === 'number' ? attr.amount     / 100 : null
        const fee    = typeof attr.fee        === 'number' ? attr.fee        / 100 : null
        const net    = typeof attr.net_amount === 'number' ? attr.net_amount / 100 : null
        const fmt = (n) => n !== null ? '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
        let methodDetail = formatMethod(src.type)
        if (src.type === 'card' && src.card_brand && src.last4) {
          methodDetail = `${src.card_brand.charAt(0).toUpperCase() + src.card_brand.slice(1)} ···· ${src.last4}`
        }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Payment Details</h3>
                <button onClick={() => setDetailModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Amount Breakdown</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gross Amount</span>
                    <span className="font-semibold text-gray-800">{fmt(gross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">PayMongo Fee</span>
                    <span className="text-red-500 font-medium">{fee !== null ? `− ${fmt(fee)}` : '—'}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                    <span className="font-semibold text-gray-700">Net Amount</span>
                    <span className="font-bold text-emerald-600">{fmt(net)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Method</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method</span>
                    <span className="font-medium text-gray-700">{methodDetail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <StatusBadge status={attr.status} paymentId={detailModal.id} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid At</span>
                    <span className="text-gray-600">{formatPaidAt(attr.paid_at)}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-500 shrink-0">Payment ID</span>
                    <span className="font-mono text-xs text-gray-500 break-all text-right">{detailModal.id}</span>
                  </div>
                </div>
              </div>

              {/* Billing / Customer */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Billing Details</p>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    Looking up customer...
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer</span>
                      <span className="font-semibold text-gray-800">{detailBooking?.customer_name ?? 'No name provided'}</span>
                    </div>
                    {detailBooking && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Booking Ref</span>
                        <span className="font-mono text-xs text-gray-600">{detailBooking.reference_number ?? detailBooking.id}</span>
                      </div>
                    )}
                    {!detailBooking && (
                      <p className="text-xs text-gray-400">No matching booking found for this payment.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setDetailModal(null)}
                  className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
                >Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Auto-Refunded Booking Detail Modal */}
      {refundDetailModal && (() => {
        const b = refundDetailModal
        const total = Number(b.estimated_total ?? 0)
        const helperFee = b.helper_fee !== null && b.helper_fee !== undefined ? Number(b.helper_fee) : total * 0.30
        const platformFee = b.platform_fee !== null && b.platform_fee !== undefined ? Number(b.platform_fee) : total * 0.10
        const taskerPayout = b.tasker_payout !== null && b.tasker_payout !== undefined ? Number(b.tasker_payout) : total * 0.90
        const fmt = (n) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        const refundedAt = b.created_at ? new Date(b.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Payment Details</h3>
                <button onClick={() => setRefundDetailModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Amount Breakdown</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="font-semibold text-gray-800">{fmt(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Helper Fee (30%)</span>
                    <span className="text-gray-700">{fmt(helperFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform Fee</span>
                    <span className="text-gray-700">{fmt(platformFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                    <span className="font-semibold text-gray-700">Tasker Payout (90%)</span>
                    <span className="font-bold text-emerald-600">{fmt(taskerPayout)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Refund Method</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method</span>
                    <span className="font-medium text-gray-700">Hanap.ph E-Wallet Refund</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Refunded At</span>
                    <span className="text-gray-600">{refundedAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service</span>
                    <span className="text-gray-700">{b.service ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Billing / Customer */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Booking Details</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-semibold text-gray-800">{b.customer_name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-500 shrink-0">Booking Ref</span>
                    <span className="font-mono text-xs text-gray-600 break-all text-right">{b.reference_number ?? b.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rejection Reason</span>
                    <span className="text-gray-700 text-right">{b.rejection_reason ?? '—'}</span>
                  </div>
                  {b.rejection_note && (
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500">Rejection Note</span>
                      <span className="text-gray-600 text-xs bg-white rounded-lg px-3 py-2 border border-gray-200">{b.rejection_note}</span>
                    </div>
                  )}
                  {b.tasker_id && (
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Rejected by</span>
                      {refundTaskerLoading
                        ? <span className="text-gray-400 text-xs">Loading…</span>
                        : <span className="text-gray-700 text-right">{refundTaskerName ?? '—'}</span>
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setRefundDetailModal(null)}
                  className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
                >Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Refund Confirmation Modal */}
      {refundModal && (() => {
        const attr = refundModal.payment.attributes ?? {}
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Confirm Refund</h3>
              <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-5 flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-gray-800">{formatAmount(attr.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment ID</span>
                  <span className="font-mono text-xs text-gray-600">{refundModal.payment.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="text-gray-700">{formatMethod(attr.source?.type)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to refund <span className="font-semibold">{formatAmount(attr.amount)}</span> for Payment ID <span className="font-mono text-xs">{refundModal.payment.id}</span>?
              </p>

              {/* Reason */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reason <span className="text-red-400">*</span></label>
                <select
                  value={refundReason}
                  onChange={e => { setRefundReason(e.target.value); setRefundReasonError('') }}
                  disabled={refundProcessing}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 disabled:opacity-50"
                >
                  <option value="" disabled>Select a reason</option>
                  <option value="requested_by_customer">Requested by Customer</option>
                  <option value="fraudulent">Fraudulent</option>
                  <option value="duplicate">Duplicate</option>
                </select>
                {refundReasonError && <p className="text-xs text-red-500 mt-1">{refundReasonError}</p>}
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  disabled={refundProcessing}
                  placeholder="Add additional notes (optional)"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none outline-none focus:border-orange-400 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setRefundModal(null); setRefundReason(''); setRefundNotes(''); setRefundReasonError('') }}
                  disabled={refundProcessing}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >Cancel</button>
                <button
                  onClick={handleConfirmRefund}
                  disabled={refundProcessing}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {refundProcessing && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {refundProcessing ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Transactions</h2>
        <button
          onClick={fetchPayments}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-emerald-500">
          <div className="mb-2"><span className="text-3xl font-bold text-emerald-500">₱</span></div>
          <div className="text-2xl md:text-3xl font-bold text-emerald-600">
            {allTimeTotal === null
              ? '...'
              : allTimeTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Total Collected (All-Time)</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-red-400">
          <div className="mb-2"><TrendingDown className="w-8 h-8 text-red-400" /></div>
          <div className="text-2xl md:text-3xl font-bold text-red-500">
            {allTimeRefunded === null
              ? '...'
              : allTimeRefunded.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Total Refunded (All-Time)</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-blue-500">
          <div className="mb-2"><img src={GCashLogo} alt="GCash" className="h-8 object-contain" /></div>
          <div className="text-2xl md:text-3xl font-bold text-blue-600">
            {allTimeMethodCounts.gcash === null ? '...' : allTimeMethodCounts.gcash}
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">GCash Payments</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-purple-500">
          <div className="mb-2"><img src={MayaLogo} alt="Maya" className="h-8 object-contain" /></div>
          <div className="text-2xl md:text-3xl font-bold text-purple-600">
            {allTimeMethodCounts.maya === null ? '...' : allTimeMethodCounts.maya}
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">PayMaya Payments</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-orange-500">
          <div className="mb-2"><CreditCard className="w-8 h-8 text-orange-500" /></div>
          <div className="text-2xl md:text-3xl font-bold text-orange-600">
            {allTimeMethodCounts.card === null ? '...' : allTimeMethodCounts.card}
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Card Payments</div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by booking reference or customer name..."
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400 bg-white shadow-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <p className="text-sm text-gray-500">
                {searchTerm.trim()
                  ? `Showing ${displayPayments.length} result${displayPayments.length !== 1 ? 's' : ''} for "${searchTerm.trim()}"`
                  : `Showing ${displayPayments.length} transaction${displayPayments.length !== 1 ? 's' : ''}`}
              </p>
              {searchLoading && <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />}
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden divide-y divide-gray-100">
              {displayPayments.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">
                  {searchTerm.trim() ? 'No payments found for that booking reference or customer name.' : 'No transactions found.'}
                </p>
              ) : displayPayments.map((p) => {
                const attr = p.attributes ?? {}
                const method = attr.source?.type
                return (
                  <div key={p.id} onClick={() => openDetail(p)} className="p-4 flex flex-col gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 text-base">{formatAmount(attr.amount)}</span>
                      <StatusBadge status={attr.status} paymentId={p.id} />
                    </div>
                    <div className="text-sm text-gray-600 font-medium">{formatMethod(method)}</div>
                    <div className="text-xs text-gray-400 font-mono break-all">{p.id}</div>
                    <div className="text-xs text-gray-500">{formatPaidAt(attr.paid_at)}</div>
                    <div onClick={e => e.stopPropagation()}><RefundButton payment={p} /></div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-5 py-3 text-left">Payment Method</th>
                    <th className="px-5 py-3 text-left">Payment ID</th>
                    <th className="px-5 py-3 text-left">Amount</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Paid At</th>
                    <th className="px-5 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-12">
                        {searchTerm.trim() ? 'No payments found for that booking reference or customer name.' : 'No transactions found.'}
                      </td>
                    </tr>
                  ) : displayPayments.map((p) => {
                    const attr = p.attributes ?? {}
                    const method = attr.source?.type
                    return (
                      <tr key={p.id} onClick={() => openDetail(p)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-5 py-3 font-medium text-gray-700">{formatMethod(method)}</td>
                        <td className="px-5 py-3 text-gray-500 font-mono text-xs">{p.id}</td>
                        <td className="px-5 py-3 font-semibold text-gray-800">{formatAmount(attr.amount)}</td>
                        <td className="px-5 py-3"><StatusBadge status={attr.status} paymentId={p.id} /></td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatPaidAt(attr.paid_at)}</td>
                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}><RefundButton payment={p} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Rows per page */}
      <div className="flex items-center justify-end gap-3 mt-3">
        <span className="text-sm text-gray-500">Rows per page:</span>
        {[10, 20, 50].map((n) => (
          <button
            key={n}
            onClick={() => handleLimitChange(n)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              limit === n
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-400 hover:text-orange-500'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Auto-Refunded Bookings */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Auto-Refunded Bookings</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {refundsLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : refundedBookings.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No auto-refunded bookings yet.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="block md:hidden divide-y divide-gray-100">
                {refundedBookings.map((b) => (
                  <div key={b.id} className="p-4 flex flex-col gap-2 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setRefundDetailModal(b)}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 text-base">
                        ₱{Number(b.estimated_total ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">Auto-Refunded</span>
                    </div>
                    <div className="text-sm font-medium text-gray-700">{b.customer_name ?? '—'} · {b.service ?? '—'}</div>
                    <div className="text-xs text-gray-400 font-mono">{b.reference_number ?? b.id}</div>
                    <div className="text-xs text-gray-500">Reason: {b.rejection_reason}</div>
                    <div className="text-xs text-gray-400">{new Date(b.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                    <div className="text-xs text-orange-500 font-medium">Tasker rejected</div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-5 py-3 text-left">Customer</th>
                      <th className="px-5 py-3 text-left">Reference</th>
                      <th className="px-5 py-3 text-left">Service</th>
                      <th className="px-5 py-3 text-left">Refund Amount</th>
                      <th className="px-5 py-3 text-left">Rejection Reason</th>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {refundedBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setRefundDetailModal(b)}>
                        <td className="px-5 py-3 font-medium text-gray-700">{b.customer_name ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-500 font-mono text-xs">{b.reference_number ?? b.id}</td>
                        <td className="px-5 py-3 text-gray-600">{b.service ?? '—'}</td>
                        <td className="px-5 py-3 font-semibold text-gray-800">
                          ₱{Number(b.estimated_total ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-gray-500">{b.rejection_reason}</td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(b.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit">Auto-Refunded</span>
                            <span className="text-xs text-orange-400">Tasker rejected</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Archive Tab ─────────────────────────────────────────────────────────────

function ArchiveActionButtons({ onRestore, onDelete }) {
  return (
    <div className="flex gap-2 shrink-0 ml-3">
      <button
        onClick={onRestore}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-green-300 hover:text-green-600 transition-colors whitespace-nowrap"
      >
        <RotateCcw size={12} /> Restore
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-red-300 hover:text-red-500 transition-colors whitespace-nowrap"
      >
        <Trash2 size={12} /> Delete
      </button>
    </div>
  )
}

function ArchivePanel() {
  const [loading, setLoading] = useState(true)
  const [confirmState, setConfirmState] = useState(null)
  const openConfirm = (message, onConfirm, danger = false) => setConfirmState({ message, onConfirm, danger })

  const [archivedTaskers, setArchivedTaskers] = useState([])
  const [archivedCustomers, setArchivedCustomers] = useState([])
  const [archivedBookings, setArchivedBookings] = useState([])
  const [archivedReviews, setArchivedReviews] = useState([])
  const [archivedLeaves, setArchivedLeaves] = useState([])
  const [archivedPrices, setArchivedPrices] = useState([])
  const [archivedServices, setArchivedServices] = useState([])
  const [archivedHelpers, setArchivedHelpers] = useState([])

  const [openSections, setOpenSections] = useState({
    taskers: false, customers: false, bookings: false, reviews: false,
    leaves: false, prices: false, services: false, helpers: false,
  })
  const [sectionSelected, setSectionSelected] = useState({
    taskers: new Set(), customers: new Set(), bookings: new Set(),
    reviews: new Set(), leaves: new Set(), prices: new Set(),
    services: new Set(), helpers: new Set(),
  })

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleItem(sectionKey, itemId) {
    setSectionSelected(prev => {
      const next = new Set(prev[sectionKey])
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return { ...prev, [sectionKey]: next }
    })
  }

  function toggleSectionAll(sectionKey, items) {
    setSectionSelected(prev => {
      const allSel = items.every(i => prev[sectionKey].has(i.id))
      return { ...prev, [sectionKey]: allSel ? new Set() : new Set(items.map(i => i.id)) }
    })
  }

  function clearSectionSelection(sectionKey) {
    setSectionSelected(prev => ({ ...prev, [sectionKey]: new Set() }))
  }

  async function fetchAll() {
    setLoading(true)
    const [
      { data: profiles },
      { data: taskerRecords },
      { data: customerProfiles },
      { data: bookings },
      { data: reviews },
      { data: leaves },
      { data: prices },
      { data: services },
      { data: helpers },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_archived', true),
      supabase.from('taskers').select('*'),
      supabase.from('customer_profiles').select('*'),
      supabase.from('bookings').select('*').eq('is_archived', true).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*').eq('is_archived', true).order('created_at', { ascending: false }),
      supabase.from('tasker_leaves').select('*, taskers(name)').eq('is_archived', true).order('created_at', { ascending: false }),
      supabase.from('task_prices').select('*').eq('is_archived', true),
      supabase.from('services').select('*').eq('is_archived', true),
      supabase.from('helpers').select('*').eq('is_archived', true),
    ])

    const taskerUserIds = new Set((taskerRecords ?? []).map(t => t.user_id))
    const taskerMap = {}
    ;(taskerRecords ?? []).forEach(t => { taskerMap[t.user_id] = t })

    const allProfiles = profiles ?? []
    setArchivedTaskers(allProfiles.filter(p => taskerUserIds.has(p.id)).map(p => ({ ...p, ...taskerMap[p.id] })))

    const archivedCustomerIds = allProfiles.filter(p => !taskerUserIds.has(p.id)).map(p => p.id)
    const customerMap = {}
    ;(customerProfiles ?? []).forEach(c => { customerMap[c.id] = c })
    setArchivedCustomers(archivedCustomerIds.map(id => ({ ...allProfiles.find(p => p.id === id), ...customerMap[id] })).filter(Boolean))

    const bookingRows = bookings ?? []
    const taskerIds = [...new Set(bookingRows.map(b => b.tasker_id).filter(Boolean))]
    let taskerNameMap = {}
    if (taskerIds.length > 0) {
      const { data: taskerNames } = await supabase.from('taskers').select('id, name').in('id', taskerIds)
      taskerNames?.forEach(t => { taskerNameMap[t.id] = t.name })
    }
    setArchivedBookings(bookingRows.map(b => ({ ...b, taskerName: taskerNameMap[b.tasker_id] ?? null })))
    setArchivedReviews(reviews ?? [])
    setArchivedLeaves(leaves ?? [])
    setArchivedPrices(prices ?? [])
    setArchivedServices(services ?? [])
    setArchivedHelpers(helpers ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function restoreProfile(id) {
    await supabase.from('profiles').update({ is_archived: false }).eq('id', id)
    fetchAll()
  }
  async function deleteProfile(id) {
    await supabase.from('profiles').delete().eq('id', id)
    fetchAll()
  }
  async function restoreItem(table, id) {
    await supabase.from(table).update({ is_archived: false }).eq('id', id)
    fetchAll()
  }
  async function deleteItem(table, id) {
    await supabase.from(table).delete().eq('id', id)
    fetchAll()
  }

  const BULK_HANDLERS = {
    taskers: {
      restore: async ids => { await Promise.all(ids.map(id => supabase.from('profiles').update({ is_archived: false }).eq('id', id))) },
      delete:  async ids => {
        const targets = archivedTaskers.filter(t => ids.includes(t.id))
        await Promise.all(targets.map(t => Promise.all([
          supabase.from('taskers').delete().eq('user_id', t.user_id ?? t.id),
          supabase.from('profiles').update({ role: 'customer', is_archived: false }).eq('id', t.id),
        ])))
      },
      deleteLabel: 'Revert to customer',
    },
    customers: {
      restore: async ids => { await Promise.all(ids.map(id => supabase.from('profiles').update({ is_archived: false }).eq('id', id))) },
      delete:  async ids => { await Promise.all(ids.map(id => supabase.from('profiles').delete().eq('id', id))) },
      deleteLabel: 'Delete permanently',
    },
    bookings: {
      restore: async ids => { await Promise.all(ids.map(id => supabase.from('bookings').update({ is_archived: false }).eq('id', id))) },
      delete:  async ids => { await Promise.all(ids.map(id => supabase.from('bookings').delete().eq('id', id))) },
      deleteLabel: 'Delete permanently',
    },
    reviews: {
      restore: async ids => { await Promise.all(ids.map(id => supabase.from('reviews').update({ is_archived: false }).eq('id', id))) },
      delete:  async ids => { await Promise.all(ids.map(id => supabase.from('reviews').delete().eq('id', id))) },
      deleteLabel: 'Delete permanently',
    },
    leaves: {
      restore: async ids => { await Promise.all(ids.map(id => supabase.from('tasker_leaves').update({ is_archived: false }).eq('id', id))) },
      delete:  async ids => { await Promise.all(ids.map(id => supabase.from('tasker_leaves').delete().eq('id', id))) },
      deleteLabel: 'Delete permanently',
    },
    prices: {
      restore: async ids => { await Promise.all(ids.map(id => supabase.from('task_prices').update({ is_archived: false }).eq('id', id))) },
      delete:  async ids => { await Promise.all(ids.map(id => supabase.from('task_prices').delete().eq('id', id))) },
      deleteLabel: 'Delete permanently',
    },
    services: {
      restore: async ids => { await Promise.all(ids.map(id => supabase.from('services').update({ is_archived: false }).eq('id', id))) },
      delete:  async ids => { await Promise.all(ids.map(id => supabase.from('services').delete().eq('id', id))) },
      deleteLabel: 'Delete permanently',
    },
    helpers: {
      restore: async ids => {
        const targets = archivedHelpers.filter(h => ids.includes(h.id))
        await Promise.all(targets.map(async h => {
          await supabase.from('helpers').update({ is_archived: false }).eq('id', h.id)
          if (h.user_id) await Promise.all([
            supabase.from('profiles').update({ role: 'helper' }).eq('id', h.user_id),
            supabase.from('helper_applications').update({ status: 'approved' }).eq('user_id', h.user_id),
          ])
        }))
      },
      delete: async ids => {
        const targets = archivedHelpers.filter(h => ids.includes(h.id))
        await Promise.all(targets.map(async h => {
          await supabase.from('helpers').delete().eq('id', h.id)
          if (h.user_id) await Promise.all([
            supabase.from('profiles').update({ role: 'customer', is_archived: false }).eq('id', h.user_id),
            supabase.from('helper_applications').update({ status: 'rejected' }).eq('user_id', h.user_id),
          ])
        }))
      },
      deleteLabel: 'Revert to customer',
    },
  }

  function handleBulkRestore(key, label, count) {
    openConfirm(`Restore ${count} selected ${label.toLowerCase()}?`, async () => {
      await BULK_HANDLERS[key].restore([...sectionSelected[key]])
      clearSectionSelection(key)
      fetchAll()
    })
  }

  function handleBulkDelete(key, label, count) {
    openConfirm(`${BULK_HANDLERS[key].deleteLabel}: ${count} selected ${label.toLowerCase()}? This cannot be undone.`, async () => {
      await BULK_HANDLERS[key].delete([...sectionSelected[key]])
      clearSectionSelection(key)
      fetchAll()
    }, true)
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const sections = [
    {
      key: 'taskers',
      label: 'Taskers',
      icon: UserCheck,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-50',
      items: archivedTaskers,
      renderRow: (t) => (
        <div key={t.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
          <div className="flex items-center gap-3 min-w-0">
            {t.avatar_url
              ? <img src={t.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              : <div className={`w-9 h-9 rounded-full ${getAvatarColor(t.full_name || t.email)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>{getInitials(t.full_name || t.email?.split('@')[0])}</div>
            }
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{t.name || t.full_name || '—'}</p>
              <p className="text-xs text-gray-400 truncate">{t.service_area || t.email || '—'}</p>
            </div>
          </div>
          <ArchiveActionButtons
            onRestore={() => openConfirm(`Restore ${t.name || t.full_name}?`, () => restoreProfile(t.id))}
            onDelete={() => openConfirm(`Revert ${t.name || t.full_name} to a customer account? Their tasker record will be removed and they will need to reapply.`, async () => {
              await supabase.from('taskers').delete().eq('user_id', t.user_id)
              await supabase.from('profiles').update({ role: 'customer', is_archived: false }).eq('id', t.user_id)
              fetchAll()
            }, true)}
          />
        </div>
      ),
    },
    {
      key: 'customers',
      label: 'Customers',
      icon: Users,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-50',
      items: archivedCustomers,
      renderRow: (c) => (
        <div key={c.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
          <div className="flex items-center gap-3 min-w-0">
            {c.avatar_url
              ? <img src={c.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              : <div className={`w-9 h-9 rounded-full ${getAvatarColor(c.full_name || c.email)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>{getInitials(c.full_name || c.email?.split('@')[0])}</div>
            }
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{c.full_name || c.email?.split('@')[0] || '—'}</p>
              <p className="text-xs text-gray-400 truncate">{c.email || '—'}</p>
            </div>
          </div>
          <ArchiveActionButtons
            onRestore={() => openConfirm(`Restore ${c.full_name || c.email}?`, () => restoreProfile(c.id))}
            onDelete={() => openConfirm(`Permanently delete ${c.full_name || c.email}? This cannot be undone.`, () => deleteProfile(c.id), true)}
          />
        </div>
      ),
    },
    {
      key: 'bookings',
      label: 'Bookings',
      icon: CalendarDays,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-50',
      items: archivedBookings,
      renderRow: (b) => (
        <div key={b.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800 truncate">{b.service || '—'}</p>
              {b.status && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${BOOKING_STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {b.status.replaceAll('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-gray-500 font-medium">Customer:</span> {b.customer_name || '—'}
              {b.taskerName ? <> · <span className="text-gray-500 font-medium">Tasker:</span> {b.taskerName}</> : ''}
            </p>
            <p className="text-xs text-gray-400">
              {b.scheduled_date ? new Date(b.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
              {b.scheduled_time ? ` at ${new Date(`1970-01-01T${b.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
              {b.estimated_total ? ` · ₱${Number(b.estimated_total).toLocaleString()}` : ''}
            </p>
          </div>
          <ArchiveActionButtons
            onRestore={() => openConfirm('Restore this booking?', () => restoreItem('bookings', b.id))}
            onDelete={() => openConfirm('Permanently delete this booking? This cannot be undone.', () => deleteItem('bookings', b.id), true)}
          />
        </div>
      ),
    },
    {
      key: 'reviews',
      label: 'Reviews',
      icon: Star,
      iconColor: 'text-yellow-500',
      iconBg: 'bg-yellow-50',
      items: archivedReviews,
      renderRow: (r) => (
        <div key={r.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 truncate">{r.reviewer_name || '—'}</p>
              <span className="text-sm shrink-0">
                <span className="text-yellow-400">{'★'.repeat(r.rating ?? 0)}</span>
                <span className="text-gray-200">{'★'.repeat(5 - (r.rating ?? 0))}</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 truncate">{r.comment?.slice(0, 80) || '—'}</p>
          </div>
          <ArchiveActionButtons
            onRestore={() => openConfirm('Restore this review?', () => restoreItem('reviews', r.id))}
            onDelete={() => openConfirm('Permanently delete this review? This cannot be undone.', () => deleteItem('reviews', r.id), true)}
          />
        </div>
      ),
    },
    {
      key: 'leaves',
      label: 'Leave Requests',
      icon: Umbrella,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-50',
      items: archivedLeaves,
      renderRow: (l) => {
        const dates = (() => { try { return JSON.parse(l.leave_dates) } catch { return [] } })()
        const sorted = [...dates].sort()
        return (
          <div key={l.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800 truncate">{l.taskers?.name || '—'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${l.status === 'approved' ? 'bg-green-100 text-green-600' : l.status === 'rejected' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-600'}`}>{l.status || '—'}</span>
              </div>
              <p className="text-xs text-gray-400">
                {dates.length === 0 ? '—' : dates.length === 1
                  ? new Date(sorted[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : `${dates.length} days · ${new Date(sorted[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(sorted[sorted.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                }
              </p>
            </div>
            <ArchiveActionButtons
              onRestore={() => openConfirm('Restore this leave request?', () => restoreItem('tasker_leaves', l.id))}
              onDelete={() => openConfirm('Permanently delete this leave request? This cannot be undone.', () => deleteItem('tasker_leaves', l.id), true)}
            />
          </div>
        )
      },
    },
    {
      key: 'prices',
      label: 'Prices',
      icon: CircleDollarSign,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-50',
      items: archivedPrices,
      renderRow: (p) => (
        <div key={p.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{p.service_name || '—'}</p>
            <p className="text-xs text-gray-400">{p.task_size || '—'} · ₱{(p.price ?? 0).toLocaleString()}</p>
          </div>
          <ArchiveActionButtons
            onRestore={() => openConfirm('Restore this price?', () => restoreItem('task_prices', p.id))}
            onDelete={() => openConfirm('Permanently delete this price? This cannot be undone.', () => deleteItem('task_prices', p.id), true)}
          />
        </div>
      ),
    },
    {
      key: 'services',
      label: 'Services',
      icon: Wrench,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-50',
      items: archivedServices,
      renderRow: (s) => (
        <div key={s.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{s.title || '—'}</p>
            <p className="text-xs text-gray-400">{s.icon || '—'}</p>
          </div>
          <ArchiveActionButtons
            onRestore={() => openConfirm('Restore this service?', () => restoreItem('services', s.id))}
            onDelete={() => openConfirm('Permanently delete this service? This cannot be undone.', () => deleteItem('services', s.id), true)}
          />
        </div>
      ),
    },
    {
      key: 'helpers',
      label: 'Helpers',
      icon: Users,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-50',
      items: archivedHelpers,
      renderRow: (h) => (
        <div key={h.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{h.name || '—'}</p>
            <p className="text-xs text-gray-400">{h.phone || 'No phone'}</p>
          </div>
          <ArchiveActionButtons
            onRestore={() => openConfirm(`Restore ${h.name}?`, async () => {
              await supabase.from('helpers').update({ is_archived: false }).eq('id', h.id)
              if (h.user_id) {
                await supabase.from('profiles').update({ role: 'helper' }).eq('id', h.user_id)
                await supabase.from('helper_applications').update({ status: 'approved' }).eq('user_id', h.user_id)
              }
              fetchAll()
            })}
            onDelete={() => openConfirm(`Revert ${h.name} to a customer account? Their helper record will be removed and they will need to reapply.`, async () => {
              await supabase.from('helpers').delete().eq('id', h.id)
              if (h.user_id) {
                await supabase.from('profiles').update({ role: 'customer', is_archived: false }).eq('id', h.user_id)
                await supabase.from('helper_applications').update({ status: 'rejected' }).eq('user_id', h.user_id)
              }
              fetchAll()
            }, true)}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={() => { setConfirmState(null); confirmState.onConfirm() }} onCancel={() => setConfirmState(null)} danger={confirmState.danger} />}
      <div className="space-y-3">
        {sections.map(({ key, label, icon: SectionIcon, iconColor, iconBg, items, renderRow }) => (
          <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                  <SectionIcon size={15} className={iconColor} />
                </div>
                <span className="font-semibold text-gray-800">{label}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${items.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>{items.length}</span>
              </div>
              <ChevronRight size={16} className={`text-gray-400 transition-transform duration-200 ${openSections[key] ? 'rotate-90' : ''}`} />
            </button>
            {openSections[key] && (
              <div className="px-5 pb-4 border-t border-gray-50">
                {items.length === 0
                  ? <p className="text-sm text-gray-400 py-4 text-center">No archived {label.toLowerCase()}.</p>
                  : <>
                      <div className="flex items-center justify-between pt-3 pb-2 border-b border-gray-50 mb-1">
                        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={items.every(i => sectionSelected[key].has(i.id))}
                            ref={el => { if (el) el.indeterminate = items.some(i => sectionSelected[key].has(i.id)) && !items.every(i => sectionSelected[key].has(i.id)) }}
                            onChange={() => toggleSectionAll(key, items)}
                            className="w-4 h-4 accent-orange-500 cursor-pointer"
                          />
                          Select all
                        </label>
                        {sectionSelected[key].size > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-orange-600">{sectionSelected[key].size} selected</span>
                            <button
                              onClick={() => handleBulkRestore(key, label, sectionSelected[key].size)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <RotateCcw size={11} /> Restore
                            </button>
                            <button
                              onClick={() => handleBulkDelete(key, label, sectionSelected[key].size)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {items.map(item => (
                        <div key={item.id} className={`flex items-center gap-2.5 rounded-lg ${sectionSelected[key].has(item.id) ? 'bg-orange-50/60' : ''}`}>
                          <input
                            type="checkbox"
                            checked={sectionSelected[key].has(item.id)}
                            onChange={() => toggleItem(key, item.id)}
                            className="w-4 h-4 accent-orange-500 cursor-pointer shrink-0 ml-1"
                          />
                          <div className="flex-1 min-w-0">{renderRow(item)}</div>
                        </div>
                      ))}
                    </>
                }
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

const NAV_ITEMS = [
  { key: 'dashboard',       label: 'Dashboard',           icon: LayoutDashboard },
  { key: 'calendar',        label: 'Calendar',            icon: CalendarDays },
  { key: 'customers',       label: 'Customer Accounts',   icon: Users },
  { key: 'tasker-accounts', label: 'Employee Accounts',   icon: UserCheck },
  { key: 'bookings',        label: 'Bookings',            icon: CalendarDays },
  { key: 'payroll',         label: 'Payroll',             icon: CircleDollarSign },
  { key: 'services',        label: 'Services',            icon: Wrench },
  { key: 'reviews',         label: 'Reviews',             icon: Star },
  { key: 'leave-requests',  label: 'Leave Requests',      icon: Umbrella },
  { key: 'archive',         label: 'Archive',             icon: Archive },
  { key: 'messages',        label: 'Messages',            icon: MessageSquare },
  { key: 'transactions',    label: 'Transactions',        icon: CreditCard },
]

function AdminSidebar({ tab, setTab, dashSubtab, setDashSubtab, empSubtab, setEmpSubtab, svcSubtab, setSvcSubtab, msgSubtab, setMsgSubtab, adminEmail, inboxUnread, pendingCount, pendingCountAtView, setPendingCountAtView, onLogout, onClose }) {
  // ── Subtab open state ───────────────────────────────────────────────────────
  const [empSubOpen, setEmpSubOpen] = useState(tab === 'tasker-accounts')
  const [svcSubOpen, setSvcSubOpen] = useState(tab === 'services')
  const [msgSubOpen, setMsgSubOpen] = useState(tab === 'messages')

  // ── Click toggle handlers ───────────────────────────────────────────────────
  function handleEmpTap()  { setEmpSubOpen((v) => !v); setSvcSubOpen(false); setMsgSubOpen(false) }
  function handleSvcTap()  { setSvcSubOpen((v) => !v); setEmpSubOpen(false); setMsgSubOpen(false) }
  function handleMsgTap()  { setMsgSubOpen((v) => !v); setEmpSubOpen(false); setSvcSubOpen(false) }

  return (
    <div className="w-[260px] min-h-screen bg-orange-500 flex flex-col">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-orange-400">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
            <svg
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: 0 }}
              width="40"
              height="20"
              viewBox="0 0 40 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="20" y1="2" x2="1" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="20" y1="2" x2="39" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="26" y="4" width="4" height="7" fill="white" rx="0.5" />
            </svg>
            <span className="text-white font-black text-3xl leading-none">h</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Hanap.ph</p>
            <p className="text-orange-200 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        {/* Dashboard */}
        <button
          onClick={() => { setTab('dashboard'); onClose?.() }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
            tab === 'dashboard'
              ? 'bg-white text-orange-600'
              : 'text-white hover:bg-orange-600'
          }`}
        >
          <LayoutDashboard size={17} className="flex-shrink-0" />
          Dashboard
        </button>

        {/* Employee Accounts with subtabs */}
        <div>
          <button
            onClick={handleEmpTap}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              tab === 'tasker-accounts'
                ? 'bg-white text-orange-600'
                : 'text-white hover:bg-orange-600'
            }`}
          >
            <UserCheck size={17} className="flex-shrink-0" />
            Employee Accounts
            {pendingCount > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
            <ChevronRight
              size={14}
              className="ml-auto flex-shrink-0 transition-transform duration-200"
              style={{ transform: empSubOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>

          <div style={{ maxHeight: empSubOpen ? '160px' : '0px', overflow: 'hidden', transition: 'max-height 0.2s ease' }}>
            {[
              { key: 'taskers',             label: 'Taskers'             },
              { key: 'applicants',          label: 'Applicants'          },
              { key: 'helpers',             label: 'Helpers'             },
            ].map(({ key, label }) => {
              const showApplicantBadge = key === 'applicants' && pendingCount > 0 && pendingCount !== pendingCountAtView
              return (
                <button
                  key={key}
                  onClick={() => {
                    setTab('tasker-accounts')
                    setEmpSubtab(key)
                    if (key === 'applicants') setPendingCountAtView(pendingCount)
                    onClose?.()
                  }}
                  className={`w-full flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    tab === 'tasker-accounts' && empSubtab === key
                      ? 'bg-white/20 text-white font-semibold'
                      : 'text-orange-100 hover:bg-orange-600 hover:text-white'
                  }`}
                >
                  {label}
                  {showApplicantBadge && (
                    <span className="ml-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Services with subtabs */}
        <div>
          <button
            onClick={handleSvcTap}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              tab === 'services'
                ? 'bg-white text-orange-600'
                : 'text-white hover:bg-orange-600'
            }`}
          >
            <Wrench size={17} className="flex-shrink-0" />
            Services
            <ChevronRight
              size={14}
              className="ml-auto flex-shrink-0 transition-transform duration-200"
              style={{ transform: svcSubOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>

          <div style={{ maxHeight: svcSubOpen ? '80px' : '0px', overflow: 'hidden', transition: 'max-height 0.2s ease' }}>
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'prices',   label: 'Prices'   },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab('services'); setSvcSubtab(key); onClose?.() }}
                className={`w-full flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  tab === 'services' && svcSubtab === key
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-orange-100 hover:bg-orange-600 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages with subtabs */}
        <div>
          <button
            onClick={handleMsgTap}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              tab === 'messages'
                ? 'bg-white text-orange-600'
                : 'text-white hover:bg-orange-600'
            }`}
          >
            <MessageSquare size={17} className="flex-shrink-0" />
            Messages
            {inboxUnread > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {inboxUnread > 99 ? '99+' : inboxUnread}
              </span>
            )}
            <ChevronRight
              size={14}
              className="ml-auto flex-shrink-0 transition-transform duration-200"
              style={{ transform: msgSubOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>

          <div style={{ maxHeight: msgSubOpen ? '80px' : '0px', overflow: 'hidden', transition: 'max-height 0.2s ease' }}>
            {[
              { key: 'inbox',         label: 'Inbox'         },
              { key: 'announcements', label: 'Announcements' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab('messages'); setMsgSubtab(key); onClose?.() }}
                className={`w-full flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  tab === 'messages' && msgSubtab === key
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-orange-100 hover:bg-orange-600 hover:text-white'
                }`}
              >
                {label}
                {key === 'inbox' && inboxUnread > 0 && (
                  <span className="ml-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {inboxUnread > 99 ? '99+' : inboxUnread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* All other nav items */}
        {NAV_ITEMS.filter((n) => n.key !== 'dashboard' && n.key !== 'tasker-accounts' && n.key !== 'services' && n.key !== 'messages').map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); onClose?.() }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              tab === key
                ? 'bg-white text-orange-600'
                : 'text-white hover:bg-orange-600'
            }`}
          >
            <Icon size={17} className="flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pt-4 pb-6 border-t border-orange-400">
        {adminEmail && (
          <p className="text-orange-200 text-xs px-4 mb-2 truncate">{adminEmail}</p>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-200 hover:bg-orange-600 hover:text-white transition-colors"
        >
          <LogOut size={17} className="flex-shrink-0" />
          Logout
        </button>
      </div>

    </div>
  )
}

function Admin() {
  const [tab, setTab] = useState('dashboard')
  const [dashSubtab, setDashSubtab] = useState('overview')
  const [empSubtab, setEmpSubtab] = useState('taskers')
  const [svcSubtab, setSvcSubtab] = useState('overview')
  const [msgSubtab, setMsgSubtab] = useState('inbox')
  const [bookingFilter, setBookingFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminUserId, setAdminUserId] = useState('')
  const [inboxUnread, setInboxUnread] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingCountAtView, setPendingCountAtView] = useState(null)
  const [calendarBookings, setCalendarBookings] = useState([])
  const [approvedLeaves, setApprovedLeaves] = useState([])
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [reminders, setReminders] = useState({})
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventInput, setEventInput] = useState('')
  const [eventDate, setEventDate] = useState('')
  const navigate = useNavigate()

  async function fetchReminders() {
    const { data } = await supabase.from('admin_reminders').select('id, date, text').order('created_at')
    const map = {}
    for (const r of data ?? []) {
      if (!map[r.date]) map[r.date] = []
      map[r.date].push({ id: r.id, text: r.text })
    }
    setReminders(map)
  }

  const saveEvent = async () => {
    if (!eventInput.trim() || !eventDate) return
    const { data, error } = await supabase.from('admin_reminders').insert({ date: eventDate, text: eventInput.trim() }).select().single()
    if (error) return
    setReminders(prev => ({ ...prev, [eventDate]: [...(prev[eventDate] || []), { id: data.id, text: data.text }] }))
    setEventInput('')
    setShowEventModal(false)
  }

  const deleteEvent = async (date, id) => {
    await supabase.from('admin_reminders').delete().eq('id', id)
    setReminders(prev => {
      const updated = { ...prev }
      updated[date] = updated[date].filter(r => r.id !== id)
      if (updated[date].length === 0) delete updated[date]
      return updated
    })
  }

  useEffect(() => {
    if (tab !== 'calendar') return
    fetchReminders()
    supabase
      .from('bookings')
      .select('id, customer_name, service, scheduled_date, scheduled_time, status, tasker_id, taskers(name)')
      .order('scheduled_date', { ascending: true })
      .then(({ data }) => setCalendarBookings(data || []))
    supabase
      .from('tasker_leaves')
      .select('leave_dates, status, taskers(name)')
      .eq('status', 'approved')
      .then(({ data: leavesData }) => {
        const allLeaves = (leavesData || []).map(l => {
          try { return { ...l, leave_dates: JSON.parse(l.leave_dates) || [] } } catch { return { ...l, leave_dates: [] } }
        })
        setApprovedLeaves(allLeaves)
      })
  }, [tab])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAdminEmail(user?.email ?? '')
      const uid = user?.id ?? ''
      setAdminUserId(uid)
      if (uid) fetchInboxUnread(uid)
    })
  }, [])

  async function fetchInboxUnread(uid) {
    const id = uid || adminUserId
    if (!id) return
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id')
      .is('booking_id', null)
      .eq('receiver_id', id)
      .eq('is_read', false)
    if (!data) return
    // Filter to only tasker senders
    const senderIds = [...new Set(data.map((m) => m.sender_id).filter(Boolean))]
    if (senderIds.length === 0) { setInboxUnread(0); return }
    const { data: taskers } = await supabase
      .from('taskers')
      .select('user_id')
      .in('user_id', senderIds)
    const taskerUserIds = new Set((taskers ?? []).map((t) => t.user_id))
    setInboxUnread(data.filter((m) => taskerUserIds.has(m.sender_id)).length)
  }

  useEffect(() => {
    if (!adminUserId) return
    const channel = supabase
      .channel(`admin-inbox-unread-${adminUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchInboxUnread(adminUserId)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [adminUserId])

  async function fetchPendingCount() {
    const [{ count: taskerCount }, { count: helperCount }] = await Promise.all([
      supabase.from('taskers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('helper_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setPendingCount((taskerCount ?? 0) + (helperCount ?? 0))
  }

  useEffect(() => {
    fetchPendingCount()
    const channel = supabase
      .channel('admin-pending-taskers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taskers' }, () => {
        fetchPendingCount()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'helper_applications' }, () => {
        fetchPendingCount()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  const activeLabel = tab === 'dashboard'
    ? 'Overview'
    : tab === 'tasker-accounts'
      ? (empSubtab === 'applicants' ? 'Applicants' : empSubtab === 'helpers' ? 'Helpers' : 'Taskers')
      : tab === 'services'
        ? (svcSubtab === 'prices' ? 'Prices' : 'Services')
      : tab === 'transactions'
        ? 'Transactions'
      : NAV_ITEMS.find((n) => n.key === tab)?.label ?? 'Admin Panel'

  return (
    <div className="flex min-h-screen">

      {/* Desktop sidebar — fixed */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-30 overflow-y-auto">
        <AdminSidebar
          tab={tab}
          setTab={setTab}
          dashSubtab={dashSubtab}
          setDashSubtab={setDashSubtab}
          empSubtab={empSubtab}
          setEmpSubtab={setEmpSubtab}
          svcSubtab={svcSubtab}
          setSvcSubtab={setSvcSubtab}
          msgSubtab={msgSubtab}
          setMsgSubtab={setMsgSubtab}
          adminEmail={adminEmail}
          inboxUnread={inboxUnread}
          pendingCount={pendingCount}
          pendingCountAtView={pendingCountAtView}
          setPendingCountAtView={setPendingCountAtView}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 h-screen z-40 md:hidden overflow-y-auto">
            <AdminSidebar
              tab={tab}
              setTab={setTab}
              dashSubtab={dashSubtab}
              setDashSubtab={setDashSubtab}
              empSubtab={empSubtab}
              setEmpSubtab={setEmpSubtab}
              svcSubtab={svcSubtab}
              setSvcSubtab={setSvcSubtab}
              msgSubtab={msgSubtab}
              setMsgSubtab={setMsgSubtab}
              adminEmail={adminEmail}
              inboxUnread={inboxUnread}
              pendingCount={pendingCount}
              pendingCountAtView={pendingCountAtView}
              setPendingCountAtView={setPendingCountAtView}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 md:ml-[260px] bg-gray-50 min-h-screen">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <p className="font-semibold text-gray-800 text-sm">{activeLabel}</p>
        </div>

        {tab === 'dashboard' ? (
          <DashboardPanel setTab={setTab} setBookingFilter={setBookingFilter} />
        ) : tab === 'payroll' ? (
          <PayrollPanel />
        ) : tab === 'calendar' ? (
          <>
          <div className="p-3 sm:p-6 w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Bookings Calendar</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

              {/* Calendar Grid */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-3 sm:p-7">
                {/* Month nav row */}
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 shrink-0"
                  >←</button>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-700 text-center">
                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                      onClick={() => {
                        const today = new Date()
                        setCalendarDate(today)
                        setSelectedDate(today.toISOString().split('T')[0])
                      }}
                      className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition whitespace-nowrap"
                    >Today</button>
                    <button
                      onClick={() => {
                        setEventDate(selectedDate || new Date().toISOString().split('T')[0])
                        setShowEventModal(true)
                      }}
                      className="bg-orange-500 text-white text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-orange-600 transition whitespace-nowrap"
                    >+ Add Event</button>
                    <button
                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    >→</button>
                  </div>
                </div>

                <div className="grid grid-cols-7 mb-1 sm:mb-2">
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1 sm:py-2">{d}</div>
                  ))}
                </div>

                {(() => {
                  const year = calendarDate.getFullYear()
                  const month = calendarDate.getMonth()
                  const firstDay = new Date(year, month, 1).getDay()
                  const daysInMonth = new Date(year, month + 1, 0).getDate()
                  const today = new Date()
                  const cells = []
                  for (let i = 0; i < firstDay; i++) cells.push(null)
                  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
                  return (
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {cells.map((day, i) => {
                        if (!day) return <div key={i} />
                        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                        const dayBookings = calendarBookings.filter(b => b.scheduled_date === dateStr)
                        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                        const isSelected = selectedDate === dateStr
                        return (
                          <div
                            key={i}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`relative p-1.5 sm:p-3 rounded-lg cursor-pointer text-center transition
                              ${isSelected ? 'bg-orange-500 text-white' : ''}
                              ${isToday && !isSelected ? 'border-2 border-orange-500 text-orange-500 font-bold' : ''}
                              ${!isSelected && !isToday ? 'hover:bg-gray-100' : ''}
                            `}
                          >
                            <span className="text-xs sm:text-base">{day}</span>
                            {(dayBookings.length > 0 || reminders[dateStr]?.length > 0 || approvedLeaves.some(l => l.leave_dates?.includes(dateStr))) && (
                              <div className="flex justify-center gap-1 mt-1">
                                {dayBookings.length > 0 && (
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-500'}`} />
                                )}
                                {reminders[dateStr]?.length > 0 && (
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                                )}
                                {approvedLeaves.some(l => l.leave_dates?.includes(dateStr)) && (
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500'}`} />
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                    <span className="text-xs text-gray-500">Bookings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    <span className="text-xs text-gray-500">Reminders</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    <span className="text-xs text-gray-500">Approved Leaves</span>
                  </div>
                </div>
              </div>

              {/* Bookings for Selected Date */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  {selectedDate ? `Bookings on ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Select a date to view bookings'}
                </h3>
                {selectedDate ? (
                  calendarBookings.filter(b => b.scheduled_date === selectedDate).length === 0 ? (
                    <p className="text-gray-400 text-sm">No bookings on this date.</p>
                  ) : (
                    <div className="space-y-3">
                      {calendarBookings
                        .filter(b => b.scheduled_date === selectedDate)
                        .map(booking => (
                          <div key={booking.id} className="border border-gray-100 rounded-lg p-3">
                            <p className="text-sm font-semibold text-gray-800">{booking.customer_name || 'Customer'}</p>
                            <p className="text-xs text-gray-500">{booking.service}</p>
                            {booking.taskers?.name && (
                              <p className="text-xs text-gray-400">Tasker: {booking.taskers.name}</p>
                            )}
                            <p className="text-xs text-gray-400">
                              {booking.scheduled_time
                                ? new Date(`1970-01-01T${booking.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                : '—'}
                            </p>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full mt-1 inline-block ${BOOKING_STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {booking.status?.replaceAll('_', ' ') ?? '—'}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  )
                ) : (
                  <p className="text-gray-400 text-sm">Click any highlighted date to see bookings.</p>
                )}

                {/* Approved Leaves for selected date */}
                {(() => {
                  const leavingTaskers = approvedLeaves.filter(l => l.leave_dates?.includes(selectedDate))
                  return leavingTaskers.length > 0 ? (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Approved Leaves</h4>
                      <div className="space-y-2">
                        {leavingTaskers.map((leave, i) => (
                          <div key={i} className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                            <span className="text-sm text-purple-700 font-medium">
                              {leave.taskers?.name || 'Unknown Tasker'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Reminders for selected date */}
                {selectedDate && reminders[selectedDate]?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Reminders</h4>
                    <div className="space-y-2">
                      {reminders[selectedDate].map((r) => (
                        <div key={r.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-blue-700">📌 {r.text}</span>
                          <button
                            onClick={() => deleteEvent(selectedDate, r.id)}
                            className="text-red-400 hover:text-red-600 text-xs ml-2"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Add Event Modal */}
          {showEventModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Reminder</h3>
                <div className="mb-4">
                  <label className="text-sm text-gray-600 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="mb-6">
                  <label className="text-sm text-gray-600 mb-1 block">Reminder</label>
                  <input
                    type="text"
                    placeholder="e.g. Team meeting at 3PM"
                    value={eventInput}
                    onChange={(e) => setEventInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEvent()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={saveEvent}
                    className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition text-sm font-medium"
                  >Save</button>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                  >Cancel</button>
                </div>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="w-full px-4 py-8">
            {tab === 'customers' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Customer Accounts</h2>
              <CustomerAccountsPanel />
            </>}
            {tab === 'tasker-accounts' && empSubtab === 'taskers' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Taskers</h2>
              <TaskerAccountsPanel />
            </>}
            {tab === 'tasker-accounts' && empSubtab === 'applicants' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Applicants</h2>
              <ApplicantsPanel />
            </>}
            {tab === 'tasker-accounts' && empSubtab === 'helpers' && <HelpersPanel />}
            {tab === 'bookings' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Bookings</h2>
              <BookingsPanel bookingFilter={bookingFilter} setBookingFilter={setBookingFilter} />
            </>}
            {tab === 'services' && svcSubtab === 'overview' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Services Overview</h2>
              <ServicesPanel />
            </>}
            {tab === 'services' && svcSubtab === 'prices' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Service Prices</h2>
              <ManagePricesPanel />
            </>}
            {tab === 'reviews' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Reviews</h2>
              <ReviewsPanel />
            </>}
            {tab === 'leave-requests' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Leave Requests</h2>
              <LeaveRequestsPanel />
            </>}
            {tab === 'archive' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Archive</h2>
              <ArchivePanel />
            </>}
            {tab === 'messages' && msgSubtab === 'inbox' && <>
              <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Inbox</h2>
              <AdminMessagesPanel adminUserId={adminUserId} />
            </>}
            {tab === 'messages' && msgSubtab === 'announcements' && <AnnouncementsPanel />}
            {tab === 'transactions' && <TransactionsPanel />}
          </div>
        )}

      </div>
    </div>
  )
}

export default Admin
