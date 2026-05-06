import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import HeroVideo from "../Assets/HeroVideo.mp4";
import { Facebook, Instagram, Twitter, MessageCircle } from "lucide-react";

function Hero() {
  const [role, setRole] = useState(null);
  const [text, setText] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [stats, setStats] = useState({ bookings: 0, taskers: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => setRole(data?.role ?? null));
    });
  }, []);

  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 200);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.rpc('get_public_stats')
        if (error) throw error
        setStats({ bookings: data.bookings ?? 0, taskers: data.taskers ?? 0 })
      } catch {
        setStats({ bookings: 0, taskers: 0 })
      }
    }
    fetchStats()
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Background Video */}
      <video
        src={HeroVideo}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 max-w-7xl py-20">
        <div className="grid grid-cols-1 gap-12 items-center">


          {/* LEFT SIDE */}
          <div className="text-white space-y-6 lg:space-y-8 lg:max-w-lg">
            {/* Logo */}
            <div
              className={`flex items-center gap-3 transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[300ms]" : "opacity-0 translate-y-6"}`}
            >
              <div className="relative w-14 h-14 lg:w-16 lg:h-16 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-orange-500 font-black text-2xl lg:text-3xl">H</span>
              </div>
              <span className="text-gray-400 font-bold text-lg">anap.ph</span>
            </div>

            {/* TITLE */}
            <div
              className={`space-y-2 transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[500ms]" : "opacity-0 translate-y-6"}`}
            >
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black">
                YOUR HOME
              </h1>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-orange-500">
                OUR EXPERTISE
              </h1>
            </div>

            {/* DESCRIPTION */}
            <p
              className={`text-sm md:text-lg text-gray-300 max-w-md transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[700ms]" : "opacity-0 translate-y-6"}`}
            >
              Anumang home service. Isang araw lang. Guaranteed.
            </p>

            {/* BUTTONS */}
            {role !== "admin" && (
              <div
                className={`space-y-4 transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[900ms]" : "opacity-0 translate-y-6"}`}
              >
                <div className="flex gap-3 relative">
                  {/* GET STARTED */}
                  <button
                    onClick={() =>
                      document
                        .getElementById("services")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Get Started
                  </button>

                  {/* SOCIAL MEDIA */}
                  <div
                    className="relative"
                    onMouseEnter={() => setShowContacts(true)}
                    onMouseLeave={() => setShowContacts(false)}
                  >
                    <button
                      onClick={() => setShowContacts(!showContacts)}
                      className="px-6 py-2.5 border border-white/30 text-white rounded-lg hover:bg-white/10"
                    >
                      Social Media
                    </button>

                    {/* Invisible bridge to prevent hover gap on desktop */}
                    <div className="hidden lg:block absolute top-0 left-full w-4 h-full" />

                    {/* POPUP — drops down on mobile, goes right on desktop */}
                    <div
                      className={`absolute top-full mt-2 left-0 lg:top-1/2 lg:-translate-y-1/2 lg:left-full lg:mt-0 lg:ml-4 flex gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-3 shadow-xl transition-all duration-300 z-50
                        ${showContacts ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
                    >
                      <a
                        href="https://www.facebook.com/malapitan.along"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-400 transition"
                      >
                        <Facebook size={20} />
                      </a>
                      <a
                        href="https://www.instagram.com/katarinabluu?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-pink-400 transition"
                      >
                        <Instagram size={20} />
                      </a>
                      <a href="#" className="text-white hover:text-sky-400 transition">
                        <Twitter size={20} />
                      </a>
                      <a href="#" className="text-white hover:text-green-400 transition">
                        <MessageCircle size={20} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* STATS */}
                <div className="flex flex-wrap gap-4 pt-2 border-t border-white/20 w-full">
                  <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-1000" : "opacity-0 translate-y-6"}`}>
                    <h3 className="text-2xl font-bold text-orange-400">{stats.bookings}+</h3>
                    <p className="text-xs text-gray-400">Bookings</p>
                  </div>

                  <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-1100" : "opacity-0 translate-y-6"}`}>
                    <h3 className="text-2xl font-bold text-orange-400">{stats.taskers}+</h3>
                    <p className="text-xs text-gray-400">Taskers</p>
                  </div>

                  <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-1200" : "opacity-0 translate-y-6"}`}>
                    <h3 className="text-2xl font-bold text-orange-400">17</h3>
                    <p className="text-xs text-gray-400">Cities Served</p>
                  </div>
                </div>
              </div>
            )}
          </div>


        </div>
      </div>
    </section>
  );
}

export default Hero;