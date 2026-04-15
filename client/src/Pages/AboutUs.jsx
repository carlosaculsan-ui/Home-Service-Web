import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import Navbar from "../Components/Navbar";
import "../aboutus.css";
import hero from "../Assets/hero.jpg";
import leeFormal from "../Assets/LEE FORMAL.png";
import carloFormal from "../Assets/CARLO FORMAL.png";
import cjFormal from "../Assets/CJ FORMAL.png";
import danicaFormal from "../Assets/Danica.jpg";
import mannyFormal from "../Assets/VARGAS-FORMAL.png";
import joanaFormal from "../Assets/JOANA FORMAL.png";
import aaronFormal from "../Assets/AARON FORMAL.png";




function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}


const team = [
  {
    name: "Lee Anjhello Baniqued",
    role: "Lead Developer",
    image: leeFormal,
    bio: "Lee is the lead developer of Hanap.ph, responsible for building and maintaining the core system. He focuses on creating a smooth booking experience, secure authentication, and efficient backend processes to ensure reliable service for users.",
  },
  {
    name: "Carlo Saculsan",
    role: "Full Stack Developer",
    image: carloFormal,
    bio: "Carlo works alongside the development team to implement both frontend and backend features. He ensures that the platform runs smoothly, from user interactions to database management, helping deliver a seamless experience for both customers and taskers.",
  },
  {
    name: "Cj Cerbito",
    role: "UI/UX Designer",
    image: cjFormal,
    bio: "Cj designs the overall look and feel of Hanap.ph. He focuses on creating a clean, user-friendly interface that makes booking home services simple and intuitive for all users.",
  },
  {
    name: "Danica Joy Flores",
    role: "Data Analyst",
    image: danicaFormal,
    bio: "Danica analyzes user data and system performance to improve the platform. Her insights help optimize booking flow, understand customer needs, and enhance overall service efficiency.",
  },
  {
    name: "Manny John Paul Vargas",
    role: "System Analyst",
    image: mannyFormal,
    bio: "Manny ensures that all system requirements align with user needs. He helps design workflows and system logic to improve functionality, making the platform more efficient and reliable.",
  },
  {
    name: "Joana Montañez",
    role: "Technical Writer",
    image: joanaFormal,
    bio: "Joana is responsible for creating and maintaining the technical documentation of Hanap.ph. She ensures that system processes, features, and user guides are clearly written and easy to understand, helping both users and developers navigate the platform effectively.",
  },
  {
    name: "Ahron Gainsan",
    role: "Documentation Specialist",
    image: aaronFormal,
    bio: "Ahron manages and organizes all project documentation for Hanap.ph, including reports, system records, and user manuals. He ensures that all information is accurate, well-structured, and supports the overall development and usability of the platform.",
  },
];


const stats = [
  { num: "5,000+", label: "Verified taskers" },
  { num: "12,000+", label: "Bookings completed" },
  { num: "98%", label: "Satisfaction rate" },
  { num: "7", label: "Team members" },
];


/* ── Animated Counter ───────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView(0.3);


  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.round(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);


  return (
    <span ref={ref} className="stat-num">
      {count >= 1000 ? count.toLocaleString() : count}{suffix}
    </span>
  );
}


/* ── Modal ──────────────────────────────────────────────────── */
function TeamModal({ member, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);


  return (
    <div className="tr-modal-backdrop" onClick={onClose}>
      <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
        <button className="tr-modal-close" onClick={onClose}>✕</button>
        <div className="tr-modal-inner">
          <div className="tr-modal-photo">
            {member.image ? (
              <img src={member.image} alt={member.name} />
            ) : (
              <div className="tr-modal-placeholder">{member.name.charAt(0)}</div>
            )}
          </div>
          <div className="tr-modal-info">
            <h2>{member.name}</h2>
            <p className="tr-modal-role">{member.role}</p>
            <div className="tr-modal-divider" />
            <p className="tr-modal-bio">{member.bio}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── Main ───────────────────────────────────────────────────── */
export default function AboutUs() {
  const [selected, setSelected] = useState(null);
  const [missionRef, missionIn] = useInView(0.1);
  const [statsRef, statsIn] = useInView(0.1);
  const [teamRef, teamIn] = useInView(0.05);


  return (
    <div className="tr-root">


      {/* NAV */}
      <Navbar />


    <div className="tr-hero">
  <div
    className="tr-hero-bg"
    style={{ backgroundImage: `url(${hero})` }}
  />
 
  <div className="tr-hero-content">
    <p className="tr-hero-eyebrow">Our story</p>
    <h1 className="tr-hero-title">About <span>Us</span></h1>
    <p className="tr-hero-sub">Building trust between Filipino homes and skilled professionals</p>
  </div>
</div>


      {/* MISSION */}
      <section
        className={`tr-mission ${missionIn ? "tr-in" : ""}`}
        ref={missionRef}
      >
        <span className="tr-section-label">Our mission</span>
        <h2>Connecting Filipino homes with trusted professionals.</h2>
        <p>
          We bring people together. It's at the heart of everything we do. We
          know that for every homeowner who needs their faucet fixed before the
          holidays, or their aircon serviced before summer, there's a skilled
          professional nearby who is ready, willing, and able to help — without
          delay.
        </p>
        <p>
          When these two people come together, they help each other in a
          meaningful way — they offer each other a better way of living. That's
          the hanap.ph promise.
        </p>
      </section>


      {/* STATS BAR */}
      <div
        className={`tr-stats-bar ${statsIn ? "tr-in" : ""}`}
        ref={statsRef}
      >
        <div className="tr-stat-item">
          <AnimatedCounter target={5000} suffix="+" />
          <span className="tr-stat-label">Verified taskers</span>
        </div>
        <div className="tr-stat-item">
          <AnimatedCounter target={12000} suffix="+" />
          <span className="tr-stat-label">Bookings completed</span>
        </div>
        <div className="tr-stat-item">
          <AnimatedCounter target={98} suffix="%" />
          <span className="tr-stat-label">Satisfaction rate</span>
        </div>
        <div className="tr-stat-item">
          <AnimatedCounter target={7} suffix="" />
          <span className="tr-stat-label">Team members</span>
        </div>
      </div>


      {/* DIVIDER */}
      <div className="tr-divider-wrap">
        <div className="tr-divider" />
      </div>


      {/* TEAM */}
      <section className="tr-team-section" ref={teamRef}>
        <div className={`tr-team-header ${teamIn ? "tr-in" : ""}`}>
          <span className="tr-section-label">The people behind it</span>
          <h2 className="tr-team-title">Meet Our Team</h2>
          <p className="tr-team-sub">Click on any member to learn more</p>
        </div>


        <div className={`tr-team-grid ${teamIn ? "tr-grid-in" : ""}`}>
          {team.map((member, i) => (
            <div
              key={member.name}
              className="tr-card"
              style={{ transitionDelay: `${i * 0.06}s` }}
              onClick={() => setSelected(member)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelected(member)}
            >
              <div className="tr-card-photo">
                {member.image ? (
                  <img src={member.image} alt={member.name} />
                ) : (
                  <div className="tr-card-placeholder">
                    <span>{member.name.charAt(0)}</span>
                  </div>
                )}
                <span className="tr-card-badge">View profile</span>
              </div>
              <p className="tr-card-name">{member.name}</p>
              <p className="tr-card-role">{member.role}</p>
            </div>
          ))}
        </div>
      </section>


      {/* MODAL */}
      {selected && (
        <TeamModal member={selected} onClose={() => setSelected(null)} />
      )}


      {/* FOOTER */}
      <footer className="tr-footer">
        <div className="tr-footer-inner">
          <span className="tr-footer-logo">hanap.ph</span>
          <p>© 2026 hanap.ph. All rights reserved. · Quezon City, Philippines</p>
          <div className="tr-footer-links">
            <a href="#">Privacy</a>
            <Link to="/terms">Terms</Link>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
