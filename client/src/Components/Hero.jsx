import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import heroImg from "../Assets/hero.jpg";
import GROUPImg from "../Assets/GROUP.png";
import { Facebook, Instagram, Twitter, MessageCircle } from "lucide-react";

function Hero() {
  const [role, setRole] = useState(null);
  const [text, setText] = useState("");
  const [showContacts, setShowContacts] = useState(false);

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

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImg})` }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 max-w-7xl py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* MOBILE IMAGE — shown only on small screens, above text */}
          <div
            className={`block lg:hidden w-full transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <div className="relative w-full h-[200px] rounded-2xl overflow-hidden shadow-xl border border-white/20">
              <img
                src={GROUPImg}
                alt="Service preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h4 className="text-white font-bold text-base drop-shadow-lg">Tasker Preview</h4>
                <p className="text-gray-300 text-xs drop-shadow-lg">See our team in action</p>
              </div>
            </div>
          </div>

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
              Hindi lang basta serbisyo—professional service talaga. We make
              sure every job is done right the first time.
            </p>

            {/* BUTTONS */}
            {role !== "tasker" && role !== "admin" && (
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
                    className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-semibold"
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

                    {/* POPUP — right side on mobile, left side on desktop */}
                    <div
                      className={`absolute top-full mt-2 left-0 lg:top-1/2 lg:-translate-y-1/2 lg:left-full lg:mt-0 lg:ml-3 flex gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-3 shadow-xl transition-all duration-300 z-50
                        ${showContacts ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
                    >
                      <a
                        href="https://www.facebook.com/lee.anjhello.baniqued.2025"
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
                <div className="flex gap-6 pt-2 border-t border-white/20">
                  <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[1100ms]" : "opacity-0 translate-y-6"}`}>
                    <h3 className="text-2xl font-bold text-orange-400">500+</h3>
                    <p className="text-xs text-gray-400">Clients</p>
                  </div>
                  <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[1300ms]" : "opacity-0 translate-y-6"}`}>
                    <h3 className="text-2xl font-bold text-orange-400">8+</h3>
                    <p className="text-xs text-gray-400">Taskers</p>
                  </div>
                  <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[1500ms]" : "opacity-0 translate-y-6"}`}>
                    <h3 className="text-2xl font-bold text-orange-400">24/7</h3>
                    <p className="text-xs text-gray-400">Support</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE — desktop only */}
          <div className="hidden lg:flex justify-center relative">
            <div
              className={`relative group w-[520px] h-[320px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-xl hover:shadow-3xl transition-all duration-700 hover:scale-[1.02]
                ${show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-90"}`}
            >
              <img
                src={GROUPImg}
                alt="Service preview"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <h4 className="text-white font-bold text-xl mb-2 drop-shadow-lg">Tasker Preview</h4>
                <p className="text-gray-300 text-sm drop-shadow-lg">See our team in action</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default Hero;