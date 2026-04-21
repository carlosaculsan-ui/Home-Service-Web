import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getServiceIcon, ICON_OPTIONS } from '../utils/serviceIcons'
import {
  Bot, Star, Eye, Trash2, AlertTriangle, X,
  LayoutDashboard, Users, UserCheck, ClipboardList,
  CalendarDays, Wrench, Umbrella, LogOut, Menu, CircleDollarSign,
  Wifi, WifiOff, Archive, RotateCcw, MessageSquare, Send,
  TrendingUp, DollarSign, Calendar, ChevronRight, Megaphone,
  CreditCard, RefreshCw, Search,
} from 'lucide-react'

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
      message: `Welcome aboard, ${firstName}! You've officially been approved as a TaskEase Tasker. Your profile is now live and you can start accepting bookings. We're excited to have you!`,
      is_read: false,
    })

    fetchTaskers()
  }

  async function rejectApplicant(tasker) {
    await supabase.from('taskers').update({ status: 'rejected' }).eq('id', tasker.id)
    await supabase.from('profiles').update({ role: 'customer' }).eq('id', tasker.user_id)
    fetchTaskers()
  }

  function toggleDocs(id) {
    setExpandedDocs((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleDeleteTasker(tasker) {
    if (!window.confirm(
      'Are you sure you want to remove this applicant? This cannot be undone.'
    )) return

    try {
      const { error } = await supabase.from('taskers').delete().eq('id', tasker.id)
      if (error) throw error
      setTaskers((prev) => prev.filter((t) => t.id !== tasker.id))
    } catch {
      setDeleteErrors((prev) => ({ ...prev, [tasker.id]: 'Failed to delete. Please try again.' }))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (taskers.length === 0) {
    return <p className="text-center text-gray-400 mt-16">No pending or rejected applications.</p>
  }

  return (
    <div className="space-y-4">
      {taskers.map((t) => {
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
                      onClick={() => rejectApplicant(t)}
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
                      onClick={() => rejectApplicant(t)}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >Reject</button>
                  </>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-orange-500 uppercase mb-2">Personal Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{t.email || '—'}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{t.phone || '—'}</span></div>
                <div><span className="text-gray-500">Age:</span> <span className="font-medium">{t.age || '—'}</span></div>
                <div><span className="text-gray-500">Gender:</span> <span className="font-medium">{t.gender || '—'}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{t.address || '—'}</span></div>
                <div><span className="text-gray-500">Service Area:</span> <span className="font-medium">{t.service_area || '—'}</span></div>
                <div><span className="text-gray-500">Postal Code:</span> <span className="font-medium">{t.postal_code || '—'}</span></div>
              </div>
            </div>

            {/* Service Information */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-orange-500 uppercase mb-2">Service Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Service Role:</span> <span className="font-medium">{t.role || '—'}</span></div>
                <div><span className="text-gray-500">Experience:</span> <span className="font-medium">{t.bio || '—'}</span></div>
                <div><span className="text-gray-500">Working Hours:</span> <span className="font-medium">{Array.isArray(t.working_hours) ? t.working_hours.join(', ') : t.working_hours || '—'}</span></div>
                <div><span className="text-gray-500">Availability:</span> <span className="font-medium">
                  {Array.isArray(t.availability) ? t.availability.join(', ') : t.availability || '—'}
                </span></div>
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
                Delete Tasker
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

function TaskerAccountsPanel() {
  const [taskers, setTaskers] = useState([])
  const [archivedTaskers, setArchivedTaskers] = useState([])
  const [employeeSubTab, setEmployeeSubTab] = useState('active')
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

    let archivedSet = new Set()
    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, is_archived, last_time_in, last_time_out')
        .in('id', userIds)
      archivedSet = new Set(profileData?.filter((p) => p.is_archived).map((p) => p.id) ?? [])
      profileData?.forEach((p) => { profileMap[p.id] = p })
    }

    const enriched = rows.map((t) => {
      const { id: _pid, ...profileRest } = profileMap[t.user_id] ?? {}
      return { ...t, ...profileRest }
    })
    setTaskers(enriched.filter((t) => !archivedSet.has(t.user_id)))
    setArchivedTaskers(enriched.filter((t) => archivedSet.has(t.user_id)))
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

  async function handleArchiveTasker(tasker) {
    if (!window.confirm('Archive this employee?')) return
    const profileId = tasker.user_id || tasker.id
    if (!profileId) { alert('Cannot archive: missing user_id'); return }
    const { data, error } = await supabase
      .from('profiles').update({ is_archived: true }).eq('id', profileId).select()
    if (error) { alert('Failed: ' + error.message); return }
    if (!data || data.length === 0) { alert('No rows updated'); return }
    setTaskers((prev) => prev.filter((t) => t.user_id !== profileId))
    setArchivedTaskers((prev) => [...prev, tasker])
  }

  async function handleRestoreTasker(tasker) {
    if (!window.confirm('Restore this employee?')) return
    const profileId = tasker.user_id
    const { data, error } = await supabase
      .from('profiles').update({ is_archived: false }).eq('id', profileId).select()
    if (error) { alert('Failed: ' + error.message); return }
    if (!data || data.length === 0) { alert('No rows updated'); return }
    setArchivedTaskers((prev) => prev.filter((t) => t.user_id !== profileId))
    setTaskers((prev) => [...prev, tasker])
  }

  async function handleUploadTaskerPhoto(e, tasker) {
    const file = e.target.files[0]
    if (!file) return
    const filePath = `tasker-photos/${tasker.user_id}-${Date.now()}`
    const { error: uploadError } = await supabase.storage
      .from('tasker-files')
      .upload(filePath, file, { upsert: true })
    if (uploadError) { alert('Upload failed: ' + uploadError.message); return }
    const { data: urlData } = supabase.storage.from('tasker-files').getPublicUrl(filePath)
    const photoUrl = urlData.publicUrl
    const { data: updateData, error } = await supabase
      .from('taskers')
      .update({ profile_photo: photoUrl })
      .eq('user_id', tasker.user_id)
      .select()
    if (error) { alert('Failed to save photo: ' + error.message); return }
    if (!updateData || updateData.length === 0) {
      alert('Photo uploaded but could not save URL — tasker row not found. Check if tasker.user_id is correct.')
      return
    }
    setTaskers(prev => prev.map(t => t.user_id === tasker.user_id ? { ...t, profile_photo: photoUrl } : t))
    setSelectedTasker(prev => ({ ...prev, profile_photo: photoUrl }))
  }

  async function handleRemoveTaskerPhoto(tasker) {
    if (!window.confirm("Remove this tasker's showcase photo?")) return
    const { error } = await supabase.from('taskers').update({ profile_photo: null }).eq('user_id', tasker.user_id)
    if (error) { alert('Failed: ' + error.message); return }
    setTaskers(prev => prev.map(t => t.user_id === tasker.user_id ? { ...t, profile_photo: null } : t))
    setSelectedTasker(prev => ({ ...prev, profile_photo: null }))
  }

  async function handleDeleteTasker(tasker) {
    setDeleteErrors((prev) => ({ ...prev, [tasker.id]: '' }))

    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('tasker_id', tasker.id)
      .in('status', ['confirmed', 'accepted', 'on_the_way', 'in_progress'])

    if (activeBookings && activeBookings.length > 0) {
      setDeleteErrors((prev) => ({
        ...prev,
        [tasker.id]: 'This tasker has ongoing bookings and cannot be removed. Please wait until all active bookings are completed or cancelled before deleting.',
      }))
      return
    }

    if (!window.confirm(
      'Remove this tasker? Their account will be converted back to a regular customer. Their booking history will be preserved.'
    )) return

    try {
      await supabase.from('tasker_leaves').delete().eq('tasker_id', tasker.id)
      await supabase.from('taskers').delete().eq('id', tasker.id)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'customer', is_archived: false })
        .eq('id', tasker.user_id)
      if (profileError) throw profileError

      setArchivedTaskers((prev) => prev.filter((t) => t.id !== tasker.id))
    } catch (err) {
      setDeleteErrors((prev) => ({ ...prev, [tasker.id]: 'Failed to remove tasker: ' + (err?.message || 'Please try again.') }))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayList = employeeSubTab === 'active' ? taskers : archivedTaskers

  const sortedTaskers = [...taskers].sort((a, b) => {
    const aOnline = onlineTaskers.some(o => o.user_id === a.user_id) ? 1 : 0
    const bOnline = onlineTaskers.some(o => o.user_id === b.user_id) ? 1 : 0
    return bOnline - aOnline
  })

  const filteredTaskers = sortedTaskers.filter(t =>
    t.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(employeeSearch.toLowerCase())
  )

  const filteredArchivedTaskers = archivedTaskers.filter(t =>
    t.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(employeeSearch.toLowerCase())
  )

  return (
    <>
      {/* Showcase Toast */}
      {showcaseToast && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium text-green-700">
          {showcaseToast}
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

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setEmployeeSubTab('active'); setEmployeeSearch('') }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            employeeSubTab === 'active'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Active ({taskers.length})
        </button>
        <button
          onClick={() => { setEmployeeSubTab('archived'); setEmployeeSearch('') }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            employeeSubTab === 'archived'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Archived ({archivedTaskers.length})
        </button>
      </div>

      {(employeeSubTab === 'active' ? filteredTaskers : filteredArchivedTaskers).length === 0 ? (
        <p className="text-center text-gray-400 mt-16">
          {employeeSearch ? 'No employees match your search.' : employeeSubTab === 'active' ? 'No approved taskers yet.' : 'No archived employees.'}
        </p>
      ) : employeeSubTab === 'active' ? (
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
                    <th className="px-4 py-3 font-medium">Showcase</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTaskers.map((t) => {
                    const isOnline = onlineTaskers.some((o) => o.user_id === t.user_id)
                    const onlineInfo = onlineTaskers.find((o) => o.user_id === t.user_id)
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
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
                            {t.profile_photo
                              ? <img src={t.profile_photo} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                              : <div className={`w-9 h-9 rounded-full ${getAvatarColor(t.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>{getInitials(t.name)}</div>
                            }
                            <span className="font-medium text-gray-800 whitespace-nowrap">{t.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{t.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {isOnline && onlineInfo?.online_at
                            ? new Date(onlineInfo.online_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : t.last_time_in
                            ? new Date(t.last_time_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {!isOnline && t.last_time_out
                            ? new Date(t.last_time_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleFeature(t)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                              t.is_featured
                                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500'
                            }`}
                          >
                            {t.is_featured ? '✓ In Showcase' : 'Add to Showcase'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setSelectedTasker(t); setShowTaskerModal(true) }}
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
            {sortedTaskers.map((t) => {
              const isOnline = onlineTaskers.some((o) => o.user_id === t.user_id)
              const onlineInfo = onlineTaskers.find((o) => o.user_id === t.user_id)
              const timeIn = isOnline && onlineInfo?.online_at
                ? new Date(onlineInfo.online_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : t.last_time_in
                ? new Date(t.last_time_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : '—'
              const timeOut = !isOnline && t.last_time_out
                ? new Date(t.last_time_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
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
      ) : (
        <>
          {/* Archived — Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <th className="px-4 py-3 font-medium w-8">#</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Area</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Joined</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredArchivedTaskers.map((t, idx) => (
                    <>
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {t.profile_photo
                              ? <img src={t.profile_photo} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                              : <div className={`w-9 h-9 rounded-full ${getAvatarColor(t.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>{getInitials(t.name)}</div>
                            }
                            <span className="font-medium text-gray-800 whitespace-nowrap">{t.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{t.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{t.role || '—'}</td>
                        <td className="px-4 py-3 text-gray-500" title={t.service_area || ''}>
                          {t.service_area
                            ? t.service_area.length > 20 ? t.service_area.slice(0, 20) + '…' : t.service_area
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {t.created_at
                            ? new Date(t.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleRestoreTasker(t)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 transition-colors whitespace-nowrap"
                            >
                              <RotateCcw size={12} />
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteTasker(t)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 transition-colors whitespace-nowrap"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {deleteErrors[t.id] && (
                        <tr key={`${t.id}-err`}>
                          <td colSpan={8} className="px-4 pb-3 pt-0">
                            <p className="text-xs text-red-500">{deleteErrors[t.id]}</p>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Archived — Mobile Cards */}
          <div className="block md:hidden space-y-3">
            {filteredArchivedTaskers.map((t, idx) => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {t.profile_photo
                      ? <img src={t.profile_photo} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      : <div className={`w-9 h-9 rounded-full ${getAvatarColor(t.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>{getInitials(t.name)}</div>
                    }
                    <div>
                      <p className="font-semibold text-gray-800">{t.name || '—'}</p>
                      <p className="text-sm text-gray-500">{t.email || '—'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">#{idx + 1}</span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>📞 {t.phone || '—'}</p>
                  <p>🔧 {t.role || '—'}</p>
                  <p>📍 {t.service_area ? (t.service_area.length > 30 ? t.service_area.slice(0, 30) + '…' : t.service_area) : '—'}</p>
                  <p>📅 Joined: {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
                </div>
                {deleteErrors[t.id] && (
                  <p className="text-xs text-red-500 mt-2">{deleteErrors[t.id]}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleRestoreTasker(t)}
                    className="flex-1 text-sm border border-green-400 text-green-600 py-2 rounded-lg"
                  >Restore</button>
                  <button
                    onClick={() => handleDeleteTasker(t)}
                    className="flex-1 text-sm border border-red-400 text-red-400 py-2 rounded-lg"
                  >Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
              <div className={`w-14 h-14 rounded-full ${getAvatarColor(selectedTasker.name)} flex items-center justify-center text-white text-xl font-bold`}>
                {getInitials(selectedTasker.name)}
              </div>
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
                ? <a href={selectedTasker.resume_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 text-sm underline">View Resume</a>
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
                    onChange={(e) => handleUploadTaskerPhoto(e, selectedTasker)}
                  />
                </label>
              </div>
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
  const [archivedCustomers, setArchivedCustomers] = useState([])
  const [customerSubTab, setCustomerSubTab] = useState('active')
  const [onlineCustomers, setOnlineCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteErrors, setDeleteErrors] = useState({})
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [customerBookings, setCustomerBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

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
    setArchivedCustomers(enriched.filter(c => c.is_archived))
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

  async function handleArchiveCustomer(customer) {
    if (!window.confirm('Archive this customer?')) return

    const profileId = customer.id || customer.user_id || customer.profile_id

    if (!profileId) {
      alert('Cannot archive: missing customer ID')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_archived: true })
      .eq('id', profileId)
      .select()

    if (error) {
      alert('Failed: ' + error.message)
      return
    }

    if (!data || data.length === 0) {
      alert('No rows updated — id may not match profiles table')
      return
    }

    setCustomers(prev => prev.filter(c => (c.id || c.user_id) !== profileId))
    setArchivedCustomers(prev => [...prev, customer])
  }

  async function handleRestoreCustomer(customer) {
    if (!window.confirm('Restore this customer?')) return

    const profileId = customer.id || customer.user_id || customer.profile_id

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_archived: false })
      .eq('id', profileId)
      .select()

    if (error) { alert('Failed: ' + error.message); return }
    if (!data || data.length === 0) { alert('No rows updated'); return }

    setArchivedCustomers(prev => prev.filter(c => (c.id || c.user_id) !== profileId))
    setCustomers(prev => [...prev, customer])
  }

  async function handleDeleteCustomer(id) {
    setDeleteErrors((prev) => ({ ...prev, [id]: '' }))
    const customer = archivedCustomers.find(c => c.id === id)

    if (!window.confirm(
      'Are you sure you want to permanently delete this customer account? All their bookings and reviews will also be deleted. This cannot be undone.'
    )) return

    try {
      await supabase.from('reviews').delete().eq('client_id', id)
      await supabase.from('bookings').delete().eq('client_id', id)
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) {
        throw error
      }
      setArchivedCustomers((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setDeleteErrors((prev) => ({ ...prev, [id]: 'Failed to delete customer: ' + (err?.message || 'Please try again.') }))
    }
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
  const filteredArchivedCustomers = archivedCustomers.filter(c =>
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
                              {b.status?.replace('_', ' ') ?? '—'}
                            </span>
                          </td>
                          <td className="py-2.5 text-gray-700">
                            {b.total_price ? `₱${Number(b.total_price).toLocaleString()}` : '—'}
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

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setCustomerSubTab('active'); setCustomerSearch('') }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${customerSubTab === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          Active ({customers.length})
        </button>
        <button
          onClick={() => { setCustomerSubTab('archived'); setCustomerSearch('') }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${customerSubTab === 'archived' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          Archived ({archivedCustomers.length})
        </button>
      </div>

      {(customerSubTab === 'active' ? filteredCustomers : filteredArchivedCustomers).length === 0 ? (
        <p className="text-center text-gray-400 mt-8">
          {customerSearch ? 'No customers match your search.' : customerSubTab === 'active' ? 'No active customers.' : 'No archived customers.'}
        </p>
      ) : customerSubTab === 'active' ? (
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
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {isOnline && onlineInfo?.online_at
                            ? new Date(onlineInfo.online_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : c.last_time_in
                            ? new Date(c.last_time_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {!isOnline && c.last_time_out
                            ? new Date(c.last_time_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '—'}
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
                ? new Date(onlineInfo.online_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : c.last_time_in
                ? new Date(c.last_time_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : '—'
              const timeOut = !isOnline && c.last_time_out
                ? new Date(c.last_time_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
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
      ) : (
        <>
          {/* Archived — Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <th className="px-4 py-3 font-medium w-8">#</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Address</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Joined</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredArchivedCustomers.map((c, idx) => (
                    <>
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
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
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{c.address || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleRestoreCustomer(c)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 transition-colors whitespace-nowrap"
                            >
                              <RotateCcw size={12} />
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(c.id)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 transition-colors whitespace-nowrap"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {deleteErrors[c.id] && (
                        <tr key={`${c.id}-err`}>
                          <td colSpan={7} className="px-4 pb-3 pt-0">
                            <p className="text-xs text-red-500">{deleteErrors[c.id]}</p>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Archived — Mobile Cards */}
          <div className="block md:hidden space-y-3">
            {filteredArchivedCustomers.map((c, idx) => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {c.avatar_url
                      ? <img src={c.avatar_url} alt={c.full_name || c.email} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      : <div className={`w-9 h-9 rounded-full ${getAvatarColor(c.full_name || c.email)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>{getInitials(c.full_name || c.email?.split('@')[0])}</div>
                    }
                    <div>
                      <p className="font-semibold text-gray-800">{c.full_name?.trim() ? c.full_name : c.email?.split('@')[0] || '—'}</p>
                      <p className="text-sm text-gray-500">{c.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">#{idx + 1}</span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>📞 {c.phone || '—'}</p>
                  <p>📍 {c.address || '—'}</p>
                  <p>📅 Joined: {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
                </div>
                {deleteErrors[c.id] && (
                  <p className="text-xs text-red-500 mt-2">{deleteErrors[c.id]}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleRestoreCustomer(c)} className="flex-1 text-sm border border-green-400 text-green-600 py-2 rounded-lg">Restore</button>
                  <button onClick={() => handleDeleteCustomer(c.id)} className="flex-1 text-sm border border-red-400 text-red-400 py-2 rounded-lg">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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
    confirmed:   'bg-blue-100 text-blue-700',
    accepted:    'bg-yellow-100 text-yellow-700',
    on_the_way:  'bg-purple-100 text-purple-700',
    in_progress: 'bg-orange-100 text-orange-700',
    completed:   'bg-green-100 text-green-700',
    cancelled:   'bg-red-100 text-red-700',
  }
  const labels = {
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

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Fetch tasker names
    const taskerIds = [...new Set(data.map((b) => b.tasker_id).filter(Boolean))]
    let taskerMap = {}
    if (taskerIds.length > 0) {
      const { data: taskers } = await supabase.from('taskers').select('id, name').in('id', taskerIds)
      taskers?.forEach((t) => { taskerMap[t.id] = t.name })
    }

    // Fetch client names from profiles
    const clientIds = [...new Set(data.map((b) => b.client_id).filter(Boolean))]
    let clientMap = {}
    if (clientIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', clientIds)
      profiles?.forEach((p) => { clientMap[p.id] = p.full_name || p.email || '—' })
    }

    setBookings(data.map((b) => ({
      ...b,
      taskerName: taskerMap[b.tasker_id] ?? '—',
      clientEmail: clientMap[b.client_id] ?? '—',
    })))
    setLoading(false)
  }

  async function sendStaleReminders() {
    const REMINDER_MSG = "Reminder: You have a pending booking that requires your response. Please accept or reject it as soon as possible."
    const cutoff12h = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

    const { data: stale } = await supabase
      .from('bookings')
      .select('id, tasker_id')
      .eq('status', 'confirmed')
      .lt('created_at', cutoff12h)

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

  async function handleDeleteBooking(id) {
    if (!window.confirm('Are you sure you want to delete this completed booking record? This cannot be undone.')) return
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) {
      setDeleteErrors((prev) => ({ ...prev, [id]: 'Failed to delete booking. Please try again.' }))
    } else {
      setBookings((prev) => prev.filter((b) => b.id !== id))
    }
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
          { value: 'pending_payment', label: 'Pending Payment' },
          { value: 'confirmed',       label: 'Pending Booking' },
          { value: 'accepted',        label: 'Accepted' },
          { value: 'on_the_way',      label: 'On The Way' },
          { value: 'in_progress',     label: 'In Progress' },
          { value: 'completed',       label: 'Completed' },
          { value: 'cancelled',       label: 'Cancelled' },
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
        const isOverdue24h = b.status === 'confirmed' && new Date(b.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
        return (
        <div key={b.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${isOverdue24h ? 'border-red-300' : 'border-gray-100'}`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <p className="font-bold text-orange-500 text-sm tracking-wide">{b.reference_number ?? '—'}</p>
                {isOverdue24h && (
                  <span className="text-xs font-semibold bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                    No response · 24h+
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5 text-sm">
                {[
                  ['Service',   b.service],
                  ['Tasker',    b.taskerName],
                  ['Client',    b.customer_name || b.clientEmail],
                  ['Date',      formatBookingDate(b.scheduled_date, b.scheduled_time)],
                  ['Booked on', b.created_at ? new Date(b.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'],
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
                  <div key={label} className="flex gap-2">
                    <span className="text-gray-400 w-20 flex-shrink-0">{label}</span>
                    <span className="text-gray-700 capitalize">{val ?? '—'}</span>
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
          {b.status === 'completed' && (
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
          )}
        </div>
      )})}
    </div>

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
    const { error } = await supabase.from('task_prices').delete().eq('id', id)
    if (error) {
      showToast('Failed to delete row.', 'error')
    } else {
      setTaskPrices((prev) => prev.filter((r) => r.id !== id))
      showToast('Row deleted.')
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
            <p className="text-sm text-gray-700 mb-4">Are you sure you want to delete this price row? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Delete
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

  async function handleDelete(service) {
    if (!window.confirm(
      `⚠️ WARNING: Deleting "${service.title}" is permanent and cannot be undone.\n\nThis may affect existing bookings that used this service.\n\nAre you sure you want to delete this service?`
    )) return
    await supabase.from('services').delete().eq('id', service.id)
    fetchServices()
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
  const [toast, setToast] = useState('')
  const [deleteErrors, setDeleteErrors] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
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

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this review? This cannot be undone.')) return
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) {
      setDeleteErrors((prev) => ({ ...prev, [id]: 'Failed to delete review. Please try again.' }))
    } else {
      fetchReviews()
    }
  }

  const allCount      = reviews.length
  const featuredCount = reviews.filter(r => r.featured).length
  const hiddenCount   = reviews.filter(r => r.is_hidden).length

  const visible = reviews
    .filter(r => {
      if (filter === 'featured') return r.featured
      if (filter === 'hidden')   return r.is_hidden
      return true
    })
    .filter(r => reviewServiceFilter === 'all' || r.service === reviewServiceFilter)

  const filterTabs = [
    { key: 'all',      label: 'All',      count: allCount },
    { key: 'featured', label: 'Featured', count: featuredCount },
    { key: 'hidden',   label: 'Hidden',   count: hiddenCount },
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
                    <span className="text-yellow-400 text-sm">{'★'.repeat(r.rating ?? 5)}</span>
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

  async function fetchLeaves() {
    const { data } = await supabase
      .from('tasker_leaves')
      .select('*, taskers(name)')
      .order('created_at', { ascending: false })
    setLeaves(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchLeaves() }, [])

  async function updateStatus(id, status) {
    setActionLoading(id + status)
    await supabase.from('tasker_leaves').update({ status }).eq('id', id)
    setActionLoading(null)
    fetchLeaves()
  }

  async function handleDeleteLeave(id) {
    if (!window.confirm('Are you sure you want to delete this leave request? This cannot be undone.')) return
    const { error } = await supabase.from('tasker_leaves').delete().eq('id', id)
    if (error) {
      setDeleteErrors((prev) => ({ ...prev, [id]: 'Failed to delete leave request. Please try again.' }))
    } else {
      setLeaves((prev) => prev.filter((l) => l.id !== id))
    }
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
              </div>

              {leave.status === 'pending' && (
                <div className="flex md:flex-col gap-2 md:flex-shrink-0">
                  <button
                    onClick={() => updateStatus(leave.id, 'approved')}
                    disabled={actionLoading !== null}
                    className="flex-1 md:flex-none px-4 py-2 md:py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === leave.id + 'approved' ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => updateStatus(leave.id, 'rejected')}
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

function HelperPayrollModal({ period, onClose }) {
  const [helperRows, setHelperRows] = useState([])
  const [loadingHelpers, setLoadingHelpers] = useState(true)

  useEffect(() => {
    async function fetchHelperPayroll() {
      const [year, month] = period.split('-').map(Number)
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('helper_fee, helper_names, duration_hours, scheduled_date')
        .eq('status', 'completed')
        .gt('helper_fee', 0)

      const bookings = (allBookings ?? []).filter(b => {
        if (!b.scheduled_date) return false
        const d = new Date(b.scheduled_date + 'T00:00:00')
        return d.getFullYear() === year && d.getMonth() + 1 === month
      })

      // Group by helper name
      const helperMap = {}
      for (const b of bookings) {
        let names = []
        try {
          names = typeof b.helper_names === 'string' ? JSON.parse(b.helper_names) : (b.helper_names ?? [])
        } catch { names = [] }
        const isFullDay = (b.duration_hours ?? 8) >= 8
        const perHelper = isFullDay ? 600 : 300
        for (const entry of names) {
          const name = entry?.name ?? entry
          if (!name) continue
          if (!helperMap[name]) helperMap[name] = { name, jobs: 0, total: 0 }
          helperMap[name].jobs += 1
          helperMap[name].total += perHelper
        }
      }

      setHelperRows(Object.values(helperMap).sort((a, b) => a.name.localeCompare(b.name)))
      setLoadingHelpers(false)
    }
    fetchHelperPayroll()
  }, [period])

  const grandTotal = helperRows.reduce((s, r) => s + r.total, 0)
  const [y, m] = period.split('-')
  const monthLabel = new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">Helper Payroll — {monthLabel}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loadingHelpers ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : helperRows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No helper fees recorded for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 text-left">Helper Name</th>
                  <th className="pb-2 text-right">Jobs Assisted</th>
                  <th className="pb-2 text-right">Total Earned</th>
                </tr>
              </thead>
              <tbody>
                {helperRows.map((r) => (
                  <tr key={r.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-800">{r.name}</td>
                    <td className="py-2.5 text-right text-gray-600">{r.jobs}</td>
                    <td className="py-2.5 text-right font-semibold" style={{ color: '#0d9488' }}>₱{r.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-2.5 px-0 font-bold text-gray-800">Total</td>
                  <td className="py-2.5 text-right font-bold text-gray-700">{helperRows.reduce((s, r) => s + r.jobs, 0)}</td>
                  <td className="py-2.5 text-right font-bold" style={{ color: '#0d9488' }}>₱{grandTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function PayrollPanel() {
  const now = new Date()
  const [period, setPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [rows, setRows] = useState([])       // per-tasker aggregated rows
  const [payRecords, setPayRecords] = useState({}) // { tasker_id: payroll_record }
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [showHelperPayroll, setShowHelperPayroll] = useState(false)

  useEffect(() => { fetchPayroll() }, [period])

  async function fetchPayroll() {
    setLoading(true)

    const [year, month] = period.split('-').map(Number)

    // Fetch ALL completed bookings — filter by date client-side
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('id, tasker_id, estimated_total, platform_fee, tasker_payout, scheduled_date')
      .eq('status', 'completed')

    // Filter to the selected month using scheduled_date only
    const bookings = (allBookings ?? []).filter(b => {
      if (!b.scheduled_date) return false
      const d = new Date(b.scheduled_date + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    if (bookings.length === 0) {
      setRows([])
      setPayRecords({})
      setLoading(false)
      return
    }

    // Fetch tasker names + profile photos for the IDs present
    const taskerIds = [...new Set(bookings.map(b => b.tasker_id).filter(Boolean))]
    const { data: taskers } = await supabase
      .from('taskers')
      .select('id, name, profile_photo')
      .in('id', taskerIds)
    const nameMap  = Object.fromEntries((taskers ?? []).map(t => [t.id, t.name]))
    const photoMap = Object.fromEntries((taskers ?? []).map(t => [t.id, t.profile_photo]))

    // Aggregate per tasker
    const agg = {}
    for (const b of bookings) {
      if (!b.tasker_id) continue
      if (!agg[b.tasker_id]) {
        agg[b.tasker_id] = { tasker_id: b.tasker_id, name: nameMap[b.tasker_id] ?? '—', photo: photoMap[b.tasker_id] ?? null, jobs: 0, gross: 0, platform_cut: 0, payout: 0 }
      }
      const gross        = Number(b.estimated_total) || 0
      const platformCut  = Number(b.platform_fee)    || 0
      const taskerPayout = Number(b.tasker_payout)   || 0
      agg[b.tasker_id].jobs         += 1
      agg[b.tasker_id].gross        += gross
      agg[b.tasker_id].platform_cut += platformCut
      agg[b.tasker_id].payout       += taskerPayout
    }

    // Fetch existing payroll_records for this period
    const { data: records } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('period', period)
      .in('tasker_id', taskerIds)
    const recMap = Object.fromEntries((records ?? []).map(r => [r.tasker_id, r]))

    setRows(Object.values(agg).sort((a, b) => a.name.localeCompare(b.name)))
    setPayRecords(recMap)
    setLoading(false)
  }

  async function markAsPaid(row) {
    const { data, error } = await supabase
      .from('payroll_records')
      .upsert({
        tasker_id:    row.tasker_id,
        period,
        total_jobs:   row.jobs,
        gross_amount: row.gross,
        platform_cut: row.platform_cut,
        tasker_payout: row.payout,
        is_paid:      true,
        paid_at:      new Date().toISOString(),
      }, { onConflict: 'tasker_id,period' })
      .select()
      .single()

    if (error) { setToast('Failed to mark as paid.'); setTimeout(() => setToast(''), 3000); return }

    setPayRecords(prev => ({ ...prev, [row.tasker_id]: data }))
    setToast(`${row.name} marked as paid.`)
    setTimeout(() => setToast(''), 3000)
  }

  const totalJobs     = rows.reduce((s, r) => s + r.jobs, 0)
  const totalGross    = rows.reduce((s, r) => s + r.gross, 0)
  const totalPlatform = rows.reduce((s, r) => s + r.platform_cut, 0)
  const totalPayout   = rows.reduce((s, r) => s + r.payout, 0)

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {showHelperPayroll && (
        <HelperPayrollModal period={period} onClose={() => setShowHelperPayroll(false)} />
      )}

      {/* Header row */}
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-gray-800">Payroll</h2>
        <input
          type="month"
          value={period}
          onChange={e => { if (e.target.value) setPeriod(e.target.value) }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
        />
        <button
          onClick={() => setShowHelperPayroll(true)}
          className="ml-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          View Helper Payroll
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 border border-green-200 text-green-700">
          {toast}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Taskers',      value: rows.length,                              fmt: v => v },
          { label: 'Total Jobs',         value: totalJobs,                                fmt: v => v },
          { label: 'Total Payouts',      value: totalPayout,                              fmt: v => `₱${v.toLocaleString()}` },
          { label: 'Platform Earnings',  value: totalPlatform,                            fmt: v => `₱${v.toLocaleString()}` },
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
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">
          No completed bookings for this period.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map(row => (
              <div key={row.tasker_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                {/* Tasker identity */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {row.photo ? (
                      <img src={row.photo} alt={row.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-gray-800 truncate">{row.name}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex-shrink-0">Paid</span>
                </div>
                {/* Stats grid */}
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
                {/* Payout */}
                <div className="pt-1 border-t border-gray-50">
                  <p className="text-xs text-gray-400">Tasker Payout</p>
                  <p className="text-base font-bold text-green-600">₱{row.payout.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Tasker Name</th>
                  <th className="px-4 py-3 text-right">Completed Jobs</th>
                  <th className="px-4 py-3 text-right">Total Earnings</th>
                  <th className="px-4 py-3 text-right">Platform Cut (30%)</th>
                  <th className="px-4 py-3 text-right">Tasker Payout (70%)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.tasker_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
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
                    <td className="px-4 py-3 text-right text-gray-600">{row.jobs}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₱{row.gross.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-500">₱{row.platform_cut.toLocaleString()}</td>
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
        supabase.from('bookings').select('estimated_total, platform_fee, helper_fee, scheduled_date, created_at').eq('status', 'completed'),
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
      const allServices = ['Cleaning', 'Plumbing', 'Electrical', 'Carpentry', 'Aircon Cleaning', 'Painting']
      setTopServices(allServices.map((name) => ({ name, count: serviceCounts[name] || 0 })))

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
              supabase.from('bookings').select('estimated_total, platform_fee, helper_fee, scheduled_date, created_at').eq('status', 'completed'),
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
            const allServices = ['Cleaning', 'Plumbing', 'Electrical', 'Carpentry', 'Aircon Cleaning', 'Painting']
            setTopServices(allServices.map((name) => ({ name, count: serviceCounts[name] || 0 })))
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

    return () => {
      supabase.removeChannel(bookingsChannel)
      supabase.removeChannel(profilesChannel)
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="text-xs text-gray-400 mt-1">Hanap.ph 30% cut</div>
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
                    {booking.status?.replace('_', ' ')}
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

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : topTaskers.length === 0 ? (
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
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

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
      <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
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
                onClick={() => setSelectedTasker(c)}
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
  const [loading, setLoading] = useState(true)

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
    const [{ data: helpersData }, { data: assignData }, { data: taskersData }] = await Promise.all([
      supabase.from('helpers').select('*').order('created_at', { ascending: false }),
      supabase.from('tasker_helpers').select('helper_id, slot, tasker_id, taskers(id, name)'),
      supabase.from('taskers').select('id, name').eq('status', 'approved').order('name'),
    ])
    setHelpers(helpersData ?? [])
    setApprovedTaskers(taskersData ?? [])
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

  async function handleDelete(helper) {
    if (!window.confirm(`Are you sure? This will also remove all tasker assignments for ${helper.name}.`)) return
    await supabase.from('helpers').delete().eq('id', helper.id)
    fetchData()
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Helpers</h2>
        <button
          onClick={() => { setNewName(''); setAddError(''); setShowAddModal(true) }}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Add Helper
        </button>
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
                  return (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{h.name}</td>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Helper Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-base mb-4">Add Helper</h3>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setAddError('') }}
              placeholder="Helper's full name"
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 mb-3"
            />
            <label className="block text-xs text-gray-500 mb-1">Contact Number <span className="text-gray-300 font-normal">(optional)</span></label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => {
                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'Delete') e.preventDefault()
                if (e.key === 'Enter') handleAddHelper()
              }}
              maxLength={11}
              placeholder="e.g. 09171234567"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 mb-3"
            />
            {addError && <p className="text-xs text-red-500 mb-3">{addError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddHelper}
                disabled={addSaving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {addSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
  }

  function cancelEdit() {
    setEditingId(null)
    setTitle('')
    setMessage('')
    setError('')
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
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
    }

    setSaving(false)
    cancelEdit()
    fetchAnnouncements()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
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
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="font-bold text-gray-800 text-sm mb-4">
          {editingId ? 'Edit Announcement' : 'New Announcement'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            rows={4}
            style={{ minHeight: 100 }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors resize-none"
          />
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
      const res = await fetch('https://api.paymongo.com/v1/payments?limit=20', {
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

  useEffect(() => {
    fetchPayments()
    fetchRefundedBookings()
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
        const platformFee = b.platform_fee !== null && b.platform_fee !== undefined ? Number(b.platform_fee) : total * 0.30
        const taskerPayout = b.tasker_payout !== null && b.tasker_payout !== undefined ? Number(b.tasker_payout) : total * 0.70
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
                    <span className="font-semibold text-gray-700">Tasker Payout (70%)</span>
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
                  <option value="requested_by_customer">requested_by_customer</option>
                  <option value="fraudulent">fraudulent</option>
                  <option value="duplicate">duplicate</option>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-emerald-500">
          <div className="mb-2"><span className="text-3xl font-bold text-emerald-500">₱</span></div>
          <div className="text-2xl md:text-3xl font-bold text-emerald-600">{formatAmount(totalCollected)}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Total Collected</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-blue-500">
          <div className="mb-2"><CreditCard className="w-8 h-8 text-blue-500" /></div>
          <div className="text-2xl md:text-3xl font-bold text-blue-600">{gcashCount}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">GCash Payments</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-purple-500">
          <div className="mb-2"><CreditCard className="w-8 h-8 text-purple-500" /></div>
          <div className="text-2xl md:text-3xl font-bold text-purple-600">{mayaCount}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">PayMaya Payments</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-orange-500">
          <div className="mb-2"><CreditCard className="w-8 h-8 text-orange-500" /></div>
          <div className="text-2xl md:text-3xl font-bold text-orange-600">{cardCount}</div>
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

          <div style={{ maxHeight: empSubOpen ? '120px' : '0px', overflow: 'hidden', transition: 'max-height 0.2s ease' }}>
            {[
              { key: 'taskers',    label: 'Taskers'    },
              { key: 'applicants', label: 'Applicants' },
              { key: 'helpers',    label: 'Helpers'    },
            ].map(({ key, label }) => {
              const showApplicantBadge = key === 'applicants' && pendingCount > 0 && pendingCount !== pendingCountAtView
              return (
                <button
                  key={key}
                  onClick={() => {
                    setTab('tasker-accounts')
                    setEmpSubtab(key)
                    setEmpSubOpen(false)
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
                onClick={() => { setTab('services'); setSvcSubtab(key); setSvcSubOpen(false); onClose?.() }}
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
                onClick={() => { setTab('messages'); setMsgSubtab(key); setMsgSubOpen(false); onClose?.() }}
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
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('admin_calendar_events')
    return saved ? JSON.parse(saved) : {}
  })
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventInput, setEventInput] = useState('')
  const [eventDate, setEventDate] = useState('')
  const navigate = useNavigate()

  const saveEvent = () => {
    if (!eventInput.trim() || !eventDate) return
    const updated = { ...events, [eventDate]: [...(events[eventDate] || []), eventInput.trim()] }
    setEvents(updated)
    localStorage.setItem('admin_calendar_events', JSON.stringify(updated))
    setEventInput('')
    setShowEventModal(false)
  }

  const deleteEvent = (date, index) => {
    const updated = { ...events }
    updated[date] = updated[date].filter((_, i) => i !== index)
    if (updated[date].length === 0) delete updated[date]
    setEvents(updated)
    localStorage.setItem('admin_calendar_events', JSON.stringify(updated))
  }

  useEffect(() => {
    if (tab !== 'calendar') return
    supabase
      .from('bookings')
      .select('id, customer_name, service, scheduled_date, scheduled_time, status, tasker_id')
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
    const { count } = await supabase
      .from('taskers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingCount(count ?? 0)
  }

  useEffect(() => {
    fetchPendingCount()
    const channel = supabase
      .channel('admin-pending-taskers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taskers' }, () => {
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
                            {(dayBookings.length > 0 || events[dateStr]?.length > 0 || approvedLeaves.some(l => l.leave_dates?.includes(dateStr))) && (
                              <div className="flex justify-center gap-1 mt-1">
                                {dayBookings.length > 0 && (
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-500'}`} />
                                )}
                                {events[dateStr]?.length > 0 && (
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
                            <p className="text-xs text-gray-400">{booking.scheduled_time}</p>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full mt-1 inline-block ${BOOKING_STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {booking.status?.replace('_', ' ') ?? '—'}
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
                {selectedDate && events[selectedDate]?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Reminders</h4>
                    <div className="space-y-2">
                      {events[selectedDate].map((event, i) => (
                        <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-blue-700">📌 {event}</span>
                          <button
                            onClick={() => deleteEvent(selectedDate, i)}
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
              <TaskerApplications />
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
