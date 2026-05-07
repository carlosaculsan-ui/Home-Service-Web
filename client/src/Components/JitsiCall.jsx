import { useEffect, useRef } from 'react'

export default function JitsiCall({ roomUrl, onEnd }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    if (!roomUrl) return

    const isVoice = roomUrl.includes('?video=0')
    let roomName = ''
    try {
      const clean = roomUrl.split('?')[0].split('#')[0]
      roomName = new URL(clean).pathname.replace(/^\//, '')
    } catch {
      roomName = roomUrl.replace(/^.*\//, '').split('?')[0].split('#')[0]
    }

    function init() {
      if (!window.JitsiMeetExternalAPI || !containerRef.current || apiRef.current) return
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          startWithVideoMuted: !!isVoice,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      })
      if (onEnd) apiRef.current.addEventListener('readyToClose', onEnd)
    }

    if (window.JitsiMeetExternalAPI) {
      init()
    } else {
      const s = document.querySelector('script[src*="meet.jit.si/external_api"]')
      if (s) s.addEventListener('load', init)
    }

    return () => {
      apiRef.current?.dispose()
      apiRef.current = null
    }
  }, [roomUrl])

  return <div ref={containerRef} className="flex-1 w-full" style={{ minHeight: 0 }} />
}
