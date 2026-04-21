import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'

function HelperRoute({ children }) {
  const [state, setState] = useState('loading')

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setState('no_session'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      setState(profile?.role === 'helper' ? 'ok' : 'unauthorized')
    }
    check()
  }, [])

  if (state === 'loading') return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (state !== 'ok') return <Navigate to="/login" replace />

  return children
}

export default HelperRoute
