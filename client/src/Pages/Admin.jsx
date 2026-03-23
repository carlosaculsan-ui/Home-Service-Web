import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getServiceIcon, ICON_OPTIONS } from '../utils/serviceIcons'
import {
  Bot, Star, Eye, Trash2, AlertTriangle, X,
  LayoutDashboard, Users, UserCheck, ClipboardList,
  CalendarDays, Wrench, Umbrella, LogOut, Menu, CircleDollarSign,
  Wifi, WifiOff, Archive, RotateCcw,
} from 'lucide-react'

const TASKER_STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const BOOKING_STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-blue-100 text-blue-700',
  accepted:    'bg-yellow-100 text-yellow-700',
  on_the_way:  'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
}

// ─── Tasker Applications Tab ────────────────────────────────────────────────

const DOC_FIELDS = [
  { key: 'front_image_url',          label: 'ID Front' },
  { key: 'back_image_url',           label: 'ID Back' },
  { key: 'nbi_clearance_url',        label: 'NBI Clearance' },
  { key: 'police_clearance_url',     label: 'Police Clearance' },
  { key: 'barangay_clearance_url',   label: 'Barangay Clearance' },
  { key: 'certificate_training_url', label: 'Certificate of Training' },
  { key: 'skill_assessment_url',     label: 'Skill Assessment' },
  { key: 'work_experience_url',      label: 'Work Experience' },
]

function TaskerApplications() {
  const [taskers, setTaskers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDocs, setExpandedDocs] = useState({})
  const [editingRate, setEditingRate] = useState({}) // { [id]: string }
  const [deleteErrors, setDeleteErrors] = useState({}) // { [id]: string }
  const [deleteSuccess, setDeleteSuccess] = useState({}) // { [id]: bool }
  const [lightboxSrc, setLightboxSrc] = useState(null)

  async function saveRate(id) {
    const val = parseFloat(editingRate[id])
    if (isNaN(val) || val <= 0) return
    await supabase.from('taskers').update({ hourly_rate: val }).eq('id', id)
    setEditingRate((prev) => { const next = { ...prev }; delete next[id]; return next })
    fetchTaskers()
  }

  async function fetchTaskers() {
    const { data } = await supabase
      .from('taskers')
      .select('*')
      .in('status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })
    setTaskers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTaskers() }, [])

  async function updateStatus(tasker, status) {
    await supabase
      .from('taskers')
      .update({ status, ...(status === 'approved' ? { is_available: true } : {}) })
      .eq('id', tasker.id)

    if (status === 'approved') {
      await supabase.from('profiles').update({ role: 'tasker' }).eq('id', tasker.user_id)
    } else if (status === 'rejected') {
      await supabase.from('profiles').update({ role: 'customer' }).eq('id', tasker.user_id)
    }

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
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-bold text-gray-800 text-base">{t.name}</p>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${TASKER_STATUS_STYLES[t.status] ?? TASKER_STATUS_STYLES.pending}`}>
                    {t.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5 text-sm mt-2">
                  {[
                    ['Email',   t.email],
                    ['Phone',   t.phone],
                    ['Service', t.role],
                    ['Area',    t.service_area],
                    ['Applied', t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                      <span className="text-gray-400 w-24 flex-shrink-0">{label}</span>
                      <span className="text-gray-700">{val ?? '—'}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-400 w-24 flex-shrink-0">Hourly Rate</span>
                    {editingRate[t.id] !== undefined ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">₱</span>
                        <input
                          type="number"
                          min="1"
                          value={editingRate[t.id]}
                          onChange={(e) => setEditingRate((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          className="w-20 border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:border-orange-400"
                          autoFocus
                        />
                        <button
                          onClick={() => saveRate(t.id)}
                          className="text-xs px-2 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold"
                        >Save</button>
                        <button
                          onClick={() => setEditingRate((prev) => { const next = { ...prev }; delete next[t.id]; return next })}
                          className="text-xs px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded"
                        >Cancel</button>
                      </div>
                    ) : (
                      <span
                        className="text-gray-700 cursor-pointer hover:text-orange-500 flex items-center gap-1 group"
                        onClick={() => setEditingRate((prev) => ({ ...prev, [t.id]: t.hourly_rate ?? '' }))}
                      >
                        {t.hourly_rate ? `₱${t.hourly_rate}/hr` : '—'}
                        <span className="text-xs text-orange-400 opacity-0 group-hover:opacity-100">(edit)</span>
                      </span>
                    )}
                  </div>
                </div>
                {t.bio && (
                  <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">
                    <span className="font-medium text-gray-500">Bio: </span>{t.bio}
                  </p>
                )}
              </div>

              {t.status === 'pending' && (
                <div className="flex md:flex-col gap-2 md:flex-shrink-0">
                  <button
                    onClick={() => updateStatus(t, 'approved')}
                    className="flex-1 md:flex-none px-4 py-2 md:py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(t, 'rejected')}
                    className="flex-1 md:flex-none px-4 py-2 md:py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>

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
                    {docs.map(({ key, label }) => (
                      <div key={key} className="text-center">
                        <img
                          src={t[key]}
                          alt={label}
                          onClick={() => setLightboxSrc(t[key])}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all cursor-zoom-in"
                        />
                        <p className="text-xs text-gray-500 mt-1 w-20 truncate">{label}</p>
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

  async function fetchTaskers() {
    const { data } = await supabase
      .from('taskers')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    const rows = data ?? []
    const userIds = rows.map((t) => t.user_id).filter(Boolean)

    let archivedSet = new Set()
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, is_archived')
        .in('id', userIds)
      archivedSet = new Set(profileData?.filter((p) => p.is_archived).map((p) => p.id) ?? [])
    }

    setTaskers(rows.filter((t) => !archivedSet.has(t.user_id)))
    setArchivedTaskers(rows.filter((t) => archivedSet.has(t.user_id)))
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
    const profileId = tasker.user_id
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
      'Are you sure you want to remove this tasker? All their records including bookings, reviews, and leave requests will be permanently deleted. This cannot be undone.'
    )) return

    try {
      await supabase.from('reviews').delete().eq('tasker_id', tasker.id)
      await supabase.from('bookings').delete().eq('tasker_id', tasker.id)
      await supabase.from('tasker_leaves').delete().eq('tasker_id', tasker.id)

      const { error: taskerError } = await supabase.from('taskers').delete().eq('id', tasker.id)
      if (taskerError) {
        console.error('Tasker delete error:', taskerError)
      }

      const { error: profileError } = await supabase.from('profiles').delete().eq('id', tasker.user_id)
      if (profileError) {
        console.error('Profile delete error:', profileError)
        throw profileError
      }

      setArchivedTaskers((prev) => prev.filter((t) => t.id !== tasker.id))
    } catch (err) {
      setDeleteErrors((prev) => ({ ...prev, [tasker.id]: 'Failed to delete employee: ' + (err?.message || 'Please try again.') }))
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

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-2">
            <Wifi className="w-6 h-6 text-green-500" />
            <span className="text-sm font-semibold text-gray-600">Active Taskers</span>
          </div>
          <p className="text-4xl font-bold text-green-600">{onlineTaskers.length}</p>
          <p className="text-xs text-gray-400 mt-1">Currently online</p>
          {onlineTaskers.length > 0 && (
            <div className="mt-3 space-y-1">
              {onlineTaskers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse" />
                  {t.name}
                </div>
              ))}
            </div>
          )}
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

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setEmployeeSubTab('active')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            employeeSubTab === 'active'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Active ({taskers.length})
        </button>
        <button
          onClick={() => setEmployeeSubTab('archived')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            employeeSubTab === 'archived'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Archived ({archivedTaskers.length})
        </button>
      </div>

      {displayList.length === 0 ? (
        <p className="text-center text-gray-400 mt-16">
          {employeeSubTab === 'active' ? 'No approved taskers yet.' : 'No archived employees.'}
        </p>
      ) : (
        <>
          {/* Desktop Table */}
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
                  {displayList.map((t, idx) => {
                    const docs = DOC_FIELDS.filter(({ key }) => t[key])
                    return (
                      <>
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${getAvatarColor(t.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                                {getInitials(t.name)}
                              </div>
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
                              {docs.length > 0 && (
                                <button
                                  onClick={() => setDocsModalTasker({ tasker: t, docs })}
                                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors whitespace-nowrap"
                                >
                                  View Documents
                                </button>
                              )}
                              {employeeSubTab === 'active' ? (
                                <button
                                  onClick={() => handleArchiveTasker(t)}
                                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-orange-500 border border-gray-200 hover:border-orange-300 transition-colors whitespace-nowrap"
                                >
                                  <Archive size={12} />
                                  Archive
                                </button>
                              ) : (
                                <>
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
                                </>
                              )}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden space-y-3">
            {displayList.map((t, idx) => {
              const docs = DOC_FIELDS.filter(({ key }) => t[key])
              return (
                <div key={t.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${getAvatarColor(t.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                        {getInitials(t.name)}
                      </div>
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
                    {docs.length > 0 && (
                      <button
                        onClick={() => setDocsModalTasker({ tasker: t, docs })}
                        className="flex-1 text-sm bg-orange-500 text-white py-2 rounded-lg"
                      >View Documents</button>
                    )}
                    {employeeSubTab === 'active' ? (
                      <button
                        onClick={() => handleArchiveTasker(t)}
                        className="flex-1 text-sm border border-orange-400 text-orange-500 py-2 rounded-lg"
                      >Archive</button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRestoreTasker(t)}
                          className="flex-1 text-sm border border-green-400 text-green-600 py-2 rounded-lg"
                        >Restore</button>
                        <button
                          onClick={() => handleDeleteTasker(t)}
                          className="flex-1 text-sm border border-red-400 text-red-400 py-2 rounded-lg"
                        >Delete</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
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
  const [loading, setLoading] = useState(true)
  const [deleteErrors, setDeleteErrors] = useState({})
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [customerBookings, setCustomerBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)

  async function fetchCustomers() {
    const { data: customersData } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('role', 'customer')

    setCustomers(customersData?.filter(c => !c.is_archived) ?? [])
    setArchivedCustomers(customersData?.filter(c => c.is_archived) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

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

    console.log('Customer object:', customer)

    const profileId = customer.id || customer.user_id || customer.profile_id
    console.log('Using profileId:', profileId)

    if (!profileId) {
      alert('Cannot archive: missing customer ID')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_archived: true })
      .eq('id', profileId)
      .select()

    console.log('Archive result:', data, error)

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
        console.error('Delete error:', error)
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

  const displayList = customerSubTab === 'active' ? customers : archivedCustomers

  if (displayList.length === 0 && customers.length === 0 && archivedCustomers.length === 0) {
    return <p className="text-center text-gray-400 mt-16">No customer accounts found.</p>
  }

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
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <p className="font-bold text-gray-800 text-base">
                  {viewingCustomer.full_name || 'No name'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Booking history</p>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
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
                          <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                            {b.scheduled_date ?? '—'}
                          </td>
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

      {/* Sub-tab toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCustomerSubTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${customerSubTab === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Active ({customers.length})
        </button>
        <button
          onClick={() => setCustomerSubTab('archived')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${customerSubTab === 'archived' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Archived ({archivedCustomers.length})
        </button>
      </div>

      {displayList.length === 0 ? (
        <p className="text-center text-gray-400 mt-8">
          {customerSubTab === 'active' ? 'No active customers.' : 'No archived customers.'}
        </p>
      ) : (
        <>
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
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
                  {displayList.map((c, idx) => (
                    <>
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${getAvatarColor(c.full_name || c.email)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                              {getInitials(c.full_name || c.email?.split('@')[0])}
                            </div>
                            <span className="font-medium text-gray-800 whitespace-nowrap">
                              {c.full_name?.trim() ? c.full_name : c.email?.split('@')[0] || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {c.phone || 'Not provided'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">
                          {c.address || 'Not provided'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-row gap-2 items-center">
                            <button
                              onClick={() => handleViewBookings(c)}
                              className="text-sm font-medium px-3 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                            >
                              View Bookings
                            </button>
                            {customerSubTab === 'active' ? (
                              <button
                                onClick={() => handleArchiveCustomer(c)}
                                className="text-sm border border-orange-400 text-orange-500 px-3 py-1 rounded hover:bg-orange-50"
                              >
                                Archive
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRestoreCustomer(c)}
                                  className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(c.id)}
                                  className="text-sm border border-red-400 text-red-500 px-3 py-1 rounded hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </>
                            )}
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

          {/* Mobile Card List - hidden on desktop */}
          <div className="block md:hidden space-y-3">
            {displayList.map((c, idx) => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(c.full_name || c.email)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                      {getInitials(c.full_name || c.email?.split('@')[0])}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {c.full_name?.trim() ? c.full_name : c.email?.split('@')[0] || '—'}
                      </p>
                      <p className="text-sm text-gray-500">{c.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">#{idx + 1}</span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>📞 {c.phone || 'Not provided'}</p>
                  <p>📍 {c.address || 'Not provided'}</p>
                  <p>📅 Joined: {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
                </div>
                {deleteErrors[c.id] && (
                  <p className="text-xs text-red-500 mt-2">{deleteErrors[c.id]}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleViewBookings(c)}
                    className="flex-1 text-sm bg-orange-500 text-white py-2 rounded-lg"
                  >View Bookings</button>
                  {customerSubTab === 'active' ? (
                    <button
                      onClick={() => handleArchiveCustomer(c)}
                      className="flex-1 text-sm border border-orange-400 text-orange-500 py-2 rounded-lg"
                    >Archive</button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestoreCustomer(c)}
                        className="flex-1 text-sm bg-green-500 text-white py-2 rounded-lg"
                      >Restore</button>
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
                        className="flex-1 text-sm border border-red-400 text-red-500 py-2 rounded-lg"
                      >Delete</button>
                    </>
                  )}
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

function BookingsPanel() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteErrors, setDeleteErrors] = useState({})

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

    // Fetch client emails from profiles
    const clientIds = [...new Set(data.map((b) => b.client_id).filter(Boolean))]
    let clientMap = {}
    if (clientIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', clientIds)
      profiles?.forEach((p) => { clientMap[p.id] = p.email })
    }

    setBookings(data.map((b) => ({
      ...b,
      taskerName: taskerMap[b.tasker_id] ?? '—',
      clientEmail: clientMap[b.client_id] ?? '—',
    })))
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [])

  async function updateBookingStatus(id, status) {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b))
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

  return (
    <div className="space-y-4">
      {bookings.map((b) => (
        <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <p className="font-bold text-orange-500 text-sm tracking-wide">{b.reference_number ?? '—'}</p>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${BOOKING_STATUS_STYLES[b.status] ?? BOOKING_STATUS_STYLES.pending}`}>
                  {b.status?.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5 text-sm">
                {[
                  ['Service',   b.service],
                  ['Tasker',    b.taskerName],
                  ['Client',    b.clientEmail],
                  ['Date',      b.scheduled_date ? `${b.scheduled_date}${b.scheduled_time ? ' at ' + b.scheduled_time : ''}` : '—'],
                  ['Task',      getTaskLabel(b)],
                  ['Address',   b.address],
                ].map(([label, val]) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-gray-400 w-20 flex-shrink-0">{label}</span>
                    <span className="text-gray-700 capitalize">{val ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:flex-shrink-0">
              <select
                value={b.status}
                onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                className="w-full md:w-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
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
      ))}
    </div>
  )
}

// ─── Services Tab ─────────────────────────────────────────────────────────────

const EMPTY_FORM = { icon: '', title: '', description: '', is_active: true }

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

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    await supabase.from('services').delete().eq('id', id)
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
      {/* Add Service Button */}
      <div className="flex justify-end">
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
      {services.length === 0 && (
        <p className="text-center text-gray-400 mt-16">No services yet. Add one above.</p>
      )}
      {services.map((s) => (
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
                  onClick={() => startEdit(s)}
                  className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.title)}
                  className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
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

function ReviewsPanel() {
  const [reviews, setReviews] = useState([])
  const [taskerMap, setTaskerMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
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

  const visible = reviews.filter(r => {
    if (filter === 'featured') return r.featured
    if (filter === 'hidden')   return r.is_hidden
    return true
  })

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
                    <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span>
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

function LeaveRequestsPanel() {
  const [leaves, setLeaves] = useState([])
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

  return (
    <div className="space-y-4">
      {leaves.map((leave) => {
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
                  {dates.length > 0 ? dates.join(', ') : '—'}
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

// ─── Dashboard Panel ─────────────────────────────────────────────────────────

function DashboardPanel({ setTab }) {
  const [stats, setStats] = useState({ customers: 0, taskers: 0, bookings: 0 })
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [bookingsInQueue, setBookingsInQueue] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [topServices, setTopServices] = useState([])
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
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('estimated_total, created_at').eq('status', 'completed'),
        supabase.from('bookings').select('created_at').gte('created_at', `${currentYear}-01-01`).lte('created_at', `${currentYear}-12-31`),
      ])

      const currentMonth = new Date().getMonth()
      const allRevenue = (completedBookings ?? []).reduce((sum, b) => sum + (Number(b.estimated_total) || 0), 0)
      const thisMonthRevenue = (completedBookings ?? []).filter((b) => {
        const d = new Date(b.created_at)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      }).reduce((sum, b) => sum + (Number(b.estimated_total) || 0), 0)
      setStats({ customers: customers ?? 0, taskers: taskers ?? 0, bookings: bookings ?? 0 })
      setTotalRevenue(allRevenue)
      setMonthlyRevenue(thisMonthRevenue)

      // Bookings in Queue
      const { data: queueData } = await supabase
        .from('bookings')
        .select('id, customer_name, service, scheduled_date, scheduled_time, taskers_needed')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: true })
      setBookingsInQueue(queueData || [])

      setAllBookings(yearBookings ?? [])

      // Top Services
      const { data: bookingsData } = await supabase.from('bookings').select('service')
      const serviceCounts = {}
      bookingsData?.forEach((b) => {
        if (b.service) serviceCounts[b.service] = (serviceCounts[b.service] || 0) + 1
      })
      const allServices = ['Cleaning', 'Plumbing', 'Electrical', 'Carpentry', 'Aircon Cleaning', 'Painting']
      setTopServices(allServices.map((name) => ({ name, count: serviceCounts[name] || 0 })))

      setLoading(false)
    }
    fetchDashboard()
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
    { label: 'Total Customers', value: stats.customers, icon: <Users className="w-8 h-8 text-blue-500" />,           accent: 'border-blue-500',   num: 'text-blue-600' },
    { label: 'Total Taskers',   value: stats.taskers,   icon: <Wrench className="w-8 h-8 text-green-500" />,         accent: 'border-green-500',  num: 'text-green-600' },
    { label: 'Total Bookings',  value: stats.bookings,  icon: <ClipboardList className="w-8 h-8 text-orange-500" />, accent: 'border-orange-500', num: 'text-orange-600' },
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, accent, num }) => (
          <div key={label} className={`bg-white rounded-xl shadow-sm p-4 md:p-5 py-5 md:py-6 border-l-4 ${accent}`}>
            <div className="mb-2">{icon}</div>
            <div className={`text-2xl md:text-4xl font-bold ${num}`}>{value}</div>
            <div className="text-xs md:text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
        {/* Revenue card */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 py-5 md:py-6 border-l-4 border-purple-500">
          <div className="mb-2"><CircleDollarSign className="w-8 h-8 text-purple-500" /></div>
          <div className="text-2xl md:text-4xl font-bold text-purple-600">₱{totalRevenue.toLocaleString()}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Total Revenue (All-time)</div>
          <div className="text-xs text-gray-400 mt-1">₱{monthlyRevenue.toLocaleString()} this month</div>
        </div>
      </div>

      {/* Chart + Recent Bookings */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

        {/* Monthly Bookings Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5 md:min-h-[400px] md:col-span-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Bookings — {currentYear}</h3>
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

        {/* Bookings in Queue */}
        <div className="bg-white rounded-xl shadow-sm p-5 md:min-h-[400px] md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Bookings in Queue</h3>
            <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-1 rounded-full">
              {bookingsInQueue.length} pending
            </span>
          </div>
          {bookingsInQueue.length === 0 ? (
            <p className="text-gray-400 text-sm">No bookings in queue.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-80">
              {bookingsInQueue.map((booking) => (
                <div key={booking.id} className="flex items-start justify-between border border-gray-100 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{booking.customer_name || 'Customer'}</p>
                    <p className="text-xs text-gray-500">{booking.service}</p>
                    <p className="text-xs text-gray-400">{booking.scheduled_date} at {booking.scheduled_time}</p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-1 rounded-full whitespace-nowrap">
                    Awaiting Tasker
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Top Services */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Services by Bookings</h3>
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

    </div>
  )
}

// ─── Admin Page ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'dashboard',       label: 'Dashboard',           icon: LayoutDashboard },
  { key: 'calendar',        label: 'Calendar',            icon: CalendarDays },
  { key: 'customers',       label: 'Customer Accounts',   icon: Users },
  { key: 'tasker-accounts', label: 'Employee Accounts',   icon: UserCheck },
  { key: 'applications',    label: 'Applicants',          icon: ClipboardList },
  { key: 'bookings',        label: 'Bookings',            icon: CalendarDays },
  { key: 'services',        label: 'Services',            icon: Wrench },
  { key: 'reviews',         label: 'Reviews',             icon: Star },
  { key: 'leave-requests',  label: 'Leave Requests',      icon: Umbrella },
]

function AdminSidebar({ tab, setTab, adminEmail, onLogout, onClose }) {
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
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [calendarBookings, setCalendarBookings] = useState([])
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
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
  }, [tab])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAdminEmail(user?.email ?? '')
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const activeLabel = NAV_ITEMS.find((n) => n.key === tab)?.label ?? 'Admin Panel'

  return (
    <div className="flex min-h-screen">

      {/* Desktop sidebar — fixed */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-30 overflow-y-auto">
        <AdminSidebar
          tab={tab}
          setTab={setTab}
          adminEmail={adminEmail}
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
              adminEmail={adminEmail}
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
          <DashboardPanel setTab={setTab} />
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
                            {(dayBookings.length > 0 || events[dateStr]?.length > 0) && (
                              <div className="flex justify-center gap-1 mt-1">
                                {dayBookings.length > 0 && (
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-500'}`} />
                                )}
                                {events[dateStr]?.length > 0 && (
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* Bookings for Selected Date */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  {selectedDate ? `Bookings on ${selectedDate}` : 'Select a date to view bookings'}
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
            {tab === 'customers'       && <CustomerAccountsPanel />}
            {tab === 'tasker-accounts' && <TaskerAccountsPanel />}
            {tab === 'applications'    && <TaskerApplications />}
            {tab === 'bookings'        && <BookingsPanel />}
            {tab === 'services'        && <ServicesPanel />}
            {tab === 'reviews'         && <ReviewsPanel />}
            {tab === 'leave-requests'  && <LeaveRequestsPanel />}
          </div>
        )}

      </div>
    </div>
  )
}

export default Admin
