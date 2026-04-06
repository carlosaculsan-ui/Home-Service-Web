import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import heroImg from "../Assets/hero.jpg";
import KarinaImg from "../Assets/Karina.jpg";

function Hero() {
  const [role, setRole] = useState(null);
  const [show, setShow] = useState(false);

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
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-20 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">

          {/* LEFT SIDE */}
          <div className="text-white space-y-6 sm:space-y-8 flex flex-col items-center lg:items-start text-center lg:text-left lg:max-w-lg mx-auto lg:mx-0">

            {/* Logo */}
            <div
              className={`flex items-center gap-3 transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[300ms]" : "opacity-0 translate-y-6"}`}
            >
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-orange-500 font-black text-2xl sm:text-3xl">H</span>
              </div>
              <span className="text-gray-400 font-bold text-base sm:text-lg">anap.ph</span>
            </div>

            {/* TITLE */}
            <div
              className={`space-y-1 sm:space-y-2 transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[500ms]" : "opacity-0 translate-y-6"}`}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
                YOUR HOME
              </h1>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-orange-500 leading-tight">
                OUR EXPERTISE
              </h1>
            </div>

            {/* DESCRIPTION */}
            <p
              className={`text-sm sm:text-base md:text-lg text-gray-300 max-w-sm sm:max-w-md transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[700ms]" : "opacity-0 translate-y-6"}`}
            >
              Hindi lang basta serbisyo—professional service talaga. We make
              sure every job is done right the first time.
            </p>

            {/* RIGHT SIDE IMAGE — mobile only, shown between description and buttons */}
            <div
              className={`block lg:hidden w-full transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              <div className="relative group w-full max-w-xs sm:max-w-sm mx-auto h-52 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <img
                  src={KarinaImg}
                  alt="Service preview"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <h4 className="text-white font-bold text-lg mb-1 drop-shadow-lg">Tasker Preview</h4>
                  <p className="text-gray-300 text-sm drop-shadow-lg">See our team in action</p>
                </div>
              </div>
            </div>

            {/* BUTTONS */}
            {role !== "tasker" && role !== "admin" && (
              <div
                className={`space-y-4 w-full transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[900ms]" : "opacity-0 translate-y-6"}`}
              >
                <div className="flex flex-col xs:flex-row gap-3 justify-center lg:justify-start">
                  <button
                    onClick={() =>
                      document
                        .getElementById("services")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold text-sm sm:text-base w-full xs:w-auto"
                  >
                    Get Started
                  </button>

                  <button className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 text-sm sm:text-base w-full xs:w-auto">
                    Call Us
                  </button>
                </div>

                {/* STATS */}
                <div className="flex gap-6 sm:gap-8 pt-2 border-t border-white/20 justify-center lg:justify-start flex-wrap">
                  <div
                    className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[1100ms]" : "opacity-0 translate-y-6"}`}
                  >
                    <h3 className="text-xl sm:text-2xl font-bold text-orange-400">500+</h3>
                    <p className="text-xs text-gray-400">Clients</p>
                  </div>

                  <div
                    className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[1300ms]" : "opacity-0 translate-y-6"}`}
                  >
                    <h3 className="text-xl sm:text-2xl font-bold text-orange-400">50+</h3>
                    <p className="text-xs text-gray-400">Taskers</p>
                  </div>

                  <div
                    className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0 delay-[1500ms]" : "opacity-0 translate-y-6"}`}
                  >
                    <h3 className="text-xl sm:text-2xl font-bold text-orange-400">24/7</h3>
                    <p className="text-xs text-gray-400">Support</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE — desktop only */}
          <div className="hidden lg:flex justify-center relative">
            <div
              className={`relative group w-[420px] h-[320px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-xl hover:shadow-3xl transition-all duration-700 hover:scale-[1.02]
                ${show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-90"}`}
            >
              <img
                src={KarinaImg}
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

