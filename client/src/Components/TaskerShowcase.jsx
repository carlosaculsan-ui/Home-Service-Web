import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow, Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import Tasker1 from '../Assets/Tasker1.jpg'
import Tasker2 from '../Assets/Tasker2.jpg'
import Tasker3 from '../Assets/Tasker3.jpg'
import Tasker4 from '../Assets/Tasker4.jpg'
import Tasker5 from '../Assets/tasker5.jpg'
import Tasker6 from '../Assets/Tasker6.jpg'
import Tasker7 from '../Assets/Tasker7.jpg'
import Tasker8 from '../Assets/Tasker8.jpg'


const taskerImages = {
  'Tasker1.jpg': Tasker1,
  'Tasker2.jpg': Tasker2,
  'Tasker3.jpg': Tasker3,
  'Tasker4.jpg': Tasker4,
  'Tasker5.jpg': Tasker5,
  'Tasker6.jpg': Tasker6,
  'Tasker7.jpg': Tasker7,
  'Tasker8.jpg': Tasker8,
}


const roleQuotes = {
  'Cleaning':       "I treat every home like my own. Cleanliness is not just my job — it's my passion.",
  'Plumbing':       "No leak is too small, no pipe too old. I fix it right the first time.",
  'Painting':       "Every wall is a canvas. I bring color and life to your space.",
  'Electrical':     "Safety first, always. I make sure your home is wired right and worry-free.",
  'Carpentry':      "Wood, nails, and craftsmanship — I build things that last a lifetime.",
  'Aircon Cleaning':"A well-maintained aircon means a comfortable home. I keep yours running like new.",
}


function getQuote(role) {
  return roleQuotes[role] ?? "I take pride in every job I do. Your home deserves the best care."
}


function ProfileModal({ tasker, onClose, justOpenedRef }) {
  const avatar = tasker.profile_photo || taskerImages[tasker.avatar_url]
  const [modalLoading, setModalLoading] = useState(true)
  const [tasksCompleted, setTasksCompleted] = useState(0)
  const [dateJoined, setDateJoined] = useState(null)

  useEffect(() => {
    async function fetchModalData() {
      const [{ count }, { data: profile }] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('tasker_id', tasker.id)
          .eq('status', 'completed'),
        supabase
          .from('profiles')
          .select('created_at')
          .eq('id', tasker.user_id)
          .single(),
      ])
      setTasksCompleted(count ?? 0)
      setDateJoined(
        profile?.created_at
          ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
          : '—'
      )
      setModalLoading(false)
    }
    fetchModalData()
  }, [tasker.id, tasker.user_id])

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      style={{ pointerEvents: 'auto' }}
      onClick={() => { if (justOpenedRef.current) return; onClose() }}
    >
      <div
        className="rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f0f 100%)', border: '1px solid rgba(249,115,22,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center font-bold z-10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
        >
          ✕
        </button>

        {/* Photo */}
        {avatar ? (
          <img src={avatar} alt={tasker.name} className="w-full h-52 object-cover" />
        ) : (
          <div className="w-full h-52 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #374151, #1f2937)' }}>
            <span style={{ fontSize: '4rem', fontWeight: 900, color: '#f97316' }}>{tasker.name?.charAt(0) ?? '?'}</span>
          </div>
        )}

        {/* Info */}
        {modalLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {[
              { label: 'NAME',            value: tasker.name,      style: { color: '#fff', fontWeight: 700, fontSize: '1.1rem' } },
              { label: 'SERVICE',         value: tasker.role,      style: { color: '#f97316', fontWeight: 600 } },
              { label: 'STARS',           value: `★ ${tasker.rating ?? '—'}`, style: { color: '#facc15', fontWeight: 600 } },
              { label: 'TASKS COMPLETED', value: tasksCompleted,   style: { color: '#fff', fontWeight: 700 } },
              { label: 'DATE JOINED',     value: dateJoined,       style: { color: '#9ca3af' } },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#6b7280', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: label === 'NAME' ? 700 : 500, color: label === 'SERVICE' ? '#f97316' : label === 'STARS' ? '#facc15' : label === 'DATE JOINED' ? '#9ca3af' : '#fff' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


function TaskerShowcase() {
  const [taskers, setTaskers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [selectedTasker, setSelectedTasker] = useState(null)
  const justOpenedRef = useRef(false)


  useEffect(() => {
    async function fetchTaskers() {
      const { data, error } = await supabase.from('taskers').select('*').eq('status', 'approved').eq('is_featured', true)
      if (error) {
        setFetchError(true)
      } else {
        setTaskers(data.map((t) => ({
          id: t.id,
          user_id: t.user_id,
          name: t.name,
          role: t.role,
          rating: t.rating,
          reviews: t.reviews_count,
          avatar_url: t.avatar_url,
          profile_photo: t.profile_photo,
          bio: t.bio,
          hourly_rate: t.hourly_rate,
        })))
      }
      setLoading(false)
    }
    fetchTaskers()
  }, [])


  if (loading) {
    return (
      <div className="bg-gray-900 py-16 px-8 text-white text-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }


  if (!fetchError && taskers.length === 0) {
    return (
      <div
        className="py-16 px-8 text-white text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)' }}
      >
        <h2 style={{ fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center', color: 'white', marginBottom: '2rem' }}>
          OUR TOP PERFORMING{' '}
          <span style={{ color: '#f97316' }}>TASKER</span>
        </h2>
        <p className="text-gray-400 mb-8">No taskers available at the moment.</p>
        <Link to="/become-a-tasker">
          <button
            className="text-white px-8 py-3 rounded-lg font-semibold"
            style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)', boxShadow: '0 0 18px rgba(249,115,22,0.4)', border: 'none', cursor: 'pointer' }}
          >
            Become a Tasker
          </button>
        </Link>
      </div>
    )
  }


  if (fetchError) {
    return (
      <div className="bg-gray-900 py-16 px-8 text-white text-center">
        <p className="text-red-400">Failed to load taskers</p>
      </div>
    )
  }


  return (
    <div
      className="py-16 px-8 text-white text-center overflow-hidden relative"
      style={{
        background:
          "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)",
      }}
    >
      {/* Section heading */}
      <h2 style={{ fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center', color: 'white', marginBottom: '2rem' }}>
        OUR TOP PERFORMING{' '}
        <span style={{ color: '#f97316' }}>TASKER</span>
      </h2>


      {/* Swiper 3D Coverflow */}
      <div className="max-w-4xl mx-auto relative">
        <Swiper
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          loop={true}
          slidesPerView="auto"
          coverflowEffect={{
            rotate: 0, // flat rotation (mas clean tulad ng pic)
            stretch: 0, // spacing between cards
            depth: 100, // mas deep 3D
            modifier: 2.5,
            slideShadows: false, // IMPORTANT
          }}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          modules={[EffectCoverflow, Autoplay, Pagination]}
          className="tasker-swiper"
        >
          {taskers.map((tasker, index) => (
            <SwiperSlide key={index} style={{ width: "300px" }}>
              <div
                className="group relative h-[380px] rounded-2xl overflow-hidden shadow-2xl hover:shadow-4xl transition-all duration-500 hover:scale-105 cursor-grab active:cursor-grabbing bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/50 backdrop-blur-sm"
                style={{
                  filter: "brightness(0.9)",
                }}
                onClick={() => {
                  justOpenedRef.current = true;
                  setSelectedTasker(tasker);
                  setTimeout(() => {
                    justOpenedRef.current = false;
                  }, 300);
                }}
              >
                {/* Image */}
                {tasker.profile_photo ? (
                  <img
                    src={tasker.profile_photo}
                    alt={tasker.name}
                    className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : taskerImages[tasker.avatar_url] ? (
                  <img
                    src={taskerImages[tasker.avatar_url]}
                    alt={tasker.name}
                    className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">
                      {tasker.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}


                {/* Content */}
                <div className="p-5 text-left relative z-10">
                  <h3 className="font-bold text-lg text-white mb-1 truncate group-hover:mb-2 transition-all duration-300">
                    {tasker.name}
                  </h3>
                  <p className="text-orange-400 font-semibold text-sm mb-2">
                    {tasker.role}
                  </p>


                  <div className="flex items-center justify-between mb-3">
                    <span className="text-yellow-400 text-sm font-medium">
                      ★ {tasker.rating}
                    </span>
                    <span className="text-slate-400 text-xs">
                      ({(tasker.reviews ?? 0).toLocaleString()})
                    </span>
                  </div>


                  <button className="w-full text-white py-2 px-3 rounded-lg font-semibold text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl border border-orange-500/30 backdrop-blur-sm">
                    More Info
                  </button>
                </div>


                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 .bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />


                {/* Glow effect */}
                <div className="absolute inset-0 .bg-gradient-to-r from-orange-500/20 via-transparent to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
              </div>
            </SwiperSlide>
          ))}


          {/* Custom Navigation Buttons */}
        </Swiper>


        {/* Custom Pagination */}
        <div className="swiper-pagination-tasker mt-8 flex justify-center"></div>
      </div>


      <Link to="/become-a-tasker" className="mt-12 inline-block">
        <button
          className="text-white px-8 py-3 rounded-lg font-semibold text-lg"
          style={{
            background: "linear-gradient(90deg, #f97316, #ea580c)",
            boxShadow: "0 0 18px rgba(249,115,22,0.4)",
            border: "none",
            cursor: "pointer",
          }}
        >
          Become a Tasker
        </button>
      </Link>


      {/* Profile Modal */}
      {selectedTasker && (
        <ProfileModal
          tasker={selectedTasker}
          onClose={() => setSelectedTasker(null)}
          justOpenedRef={justOpenedRef}
        />
      )}
    </div>
  );
}



export default TaskerShowcase
