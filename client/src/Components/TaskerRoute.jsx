import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { Hourglass, XCircle } from 'lucide-react'

function TaskerRoute({ children }) {
  const [state, setState] = useState('loading') // loading | no_session | no_row | pending | rejected | approved

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setState('no_session')
        return
      }

      const { data: tasker } = await supabase
        .from('taskers')
        .select('id, status')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!tasker) {
        setState('no_row')
        return
      }

      setState(tasker.status === 'approved' ? 'approved' : tasker.status === 'rejected' ? 'rejected' : 'pending')
    }
    check()
  }, [])

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'no_session') return <Navigate to="/tasker" replace />
  if (state === 'no_row') return <Navigate to="/tasker" replace />

  if (state === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
        <Hourglass size={64} className="text-orange-400 mb-6" />
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Application Under Review</h1>
        <p className="text-gray-500 max-w-sm">Your application is still being reviewed by our team.</p>
      </div>
    )
  }

  if (state === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
        <XCircle size={64} className="text-red-400 mb-6" />
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Application Not Approved</h1>
        <p className="text-gray-500 max-w-sm">Unfortunately your application was not approved. Please contact us for more information.</p>
      </div>
    )
  }

  return children
}

export default TaskerRoute
