import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import {
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  ClipboardList,
  UserPlus,
  LogOut,
  Bell,
} from "lucide-react";


const NAV_LINKS = [
  { label: "Home", section: null, href: "/" },
  { label: "Services", section: "services", href: "/#services" },
  { label: "How It Works", section: "how-it-works", href: "/#how-it-works" },
  { label: "About", section: "about", href: "/#about" },
  { label: "Contact", section: "contact", href: "/#contact" },
];


/* ─── Avatar Dropdown ─────────────────────────────────────────────────── */
function AvatarMenu({ session, isApprovedTasker, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const label = session?.user?.email?.slice(0, 2).toUpperCase() ?? "";


  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          background: open
            ? "linear-gradient(135deg,#f97316,#ea580c)"
            : "rgba(255,255,255,0.18)",
          border: "1.5px solid rgba(255,255,255,0.35)",
          color: "white",
          fontWeight: 700,
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          backdropFilter: "blur(8px)",
          boxShadow: open ? "0 4px 16px rgba(249,115,22,0.4)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!open)
            e.currentTarget.style.background = "rgba(255,255,255,0.28)";
        }}
        onMouseLeave={(e) => {
          if (!open)
            e.currentTarget.style.background = "rgba(255,255,255,0.18)";
        }}
      >
        {label}
      </button>


      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9990 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "76px",
              right: "16px",
              width: "224px",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.6)",
              borderRadius: "18px",
              boxShadow:
                "0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)",
              overflow: "hidden",
              zIndex: 9999,
              animation: "dropIn 0.18s cubic-bezier(.34,1.4,.64,1)",
            }}
          >
            <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}`}</style>
            <div
              style={{
                padding: "13px 16px",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                background: "rgba(249,115,22,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "#f97316",
                  fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 600,
                }}
              >
                Account
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "#374151",
                  fontWeight: 500,
                  fontFamily: "'DM Sans',sans-serif",
                  marginTop: "3px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {session.user.email}
              </div>
            </div>
            <div style={{ padding: "6px 0" }}>
              {!isAdmin && !isApprovedTasker && (
                <>
                  <DItem
                    to="/become-a-tasker"
                    icon={<UserPlus size={13} />}
                    label="Become a Tasker"
                    onClick={() => setOpen(false)}
                  />
                  <DItem
                    to="/dashboard"
                    icon={<LayoutDashboard size={13} />}
                    label="My Bookings"
                    onClick={() => setOpen(false)}
                  />
                </>
              )}
              {isApprovedTasker && (
                <DItem
                  to="/tasker-dashboard"
                  icon={<ClipboardList size={13} />}
                  label="My Tasks"
                  onClick={() => setOpen(false)}
                />
              )}
              {isAdmin && (
                <DItem
                  to="/admin"
                  icon={<ShieldCheck size={13} />}
                  label="Admin Panel"
                  onClick={() => setOpen(false)}
                  accent
                />
              )}
            </div>
            <div
              style={{
                borderTop: "1px solid rgba(0,0,0,0.06)",
                padding: "6px 0",
              }}
            >
              <button
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  fontSize: "13px",
                  fontFamily: "'DM Sans',sans-serif",
                  color: "#ef4444",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  transition: "background .15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#fef2f2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <LogOut size={13} /> Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


function DItem({ to, icon, label, onClick, accent }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "9px",
        padding: "9px 16px",
        fontSize: "13px",
        fontFamily: "'DM Sans',sans-serif",
        color: accent ? "#f97316" : "#374151",
        fontWeight: accent ? 600 : 500,
        textDecoration: "none",
        transition: "background .15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = accent
          ? "rgba(249,115,22,.07)"
          : "rgba(0,0,0,.04)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      <span style={{ color: accent ? "#f97316" : "#9ca3af" }}>{icon}</span>
      {label}
    </Link>
  );
}


/* ─── Main Navbar ─────────────────────────────────────────────────────── */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [isApprovedTasker, setIsApprovedTasker] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Notification states
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    const t = setTimeout(() => setShowNav(true), 300);
    return () => clearTimeout(t);
  }, []);


  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);


  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  function handleNavClick(e, sectionId) {
    e.preventDefault();
    setMenuOpen(false);
    if (!sectionId) {
      navigate("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (location.pathname === "/") {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(
        () =>
          document
            .getElementById(sectionId)
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  }


  async function checkTaskerStatus(uid) {
    const { data } = await supabase
      .from("taskers")
      .select("id")
      .eq("user_id", uid)
      .eq("status", "approved")
      .maybeSingle();
    setIsApprovedTasker(!!data);
  }
  async function checkAdminRole(uid) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .single();
    setIsAdmin(data?.role === "admin");
  }


  useEffect(() => {
    if (session?.user?.id) {
      checkTaskerStatus(session.user.id);
      checkAdminRole(session.user.id);
    } else {
      setIsApprovedTasker(false);
      setIsAdmin(false);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [session]);


  // Fetch notifications + realtime
  useEffect(() => {
    if (!session?.user?.id) return;

    const uid = session.user.id;

    async function loadNotifications() {
      // Cleanup old notifications (older than 5 days)
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", uid)
        .lt(
          "created_at",
          new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        );

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);

      setNotifications(data ?? []);
      setUnreadCount(data?.filter((n) => !n.is_read).length ?? 0);
    }

    loadNotifications();

    const channel = supabase
      .channel("navbar-notifs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          supabase
            .from("notifications")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(10)
            .then(({ data }) => {
              setNotifications(data ?? []);
              setUnreadCount(data?.filter((n) => !n.is_read).length ?? 0);
            });
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);


  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);


  async function handleLogout() {
    setMenuOpen(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    window.location.href = "/";
  }


  const pillBg = scrolled ? "rgba(12,12,12,0.75)" : "rgba(255,255,255,0.10)";
  const pillBorder = scrolled
    ? "1px solid rgba(255,255,255,0.10)"
    : "1px solid rgba(255,255,255,0.22)";
  const pillShadow = scrolled
    ? "0 8px 40px rgba(0,0,0,0.40)"
    : "0 4px 24px rgba(0,0,0,0.12)";
  const linkColor = "rgba(255,255,255,0.80)";


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        .nt-link { position:relative; text-decoration:none; padding:4px 0; cursor:pointer; transition:color .22s; }
        .nt-link::after { content:''; position:absolute; left:0; bottom:-3px; width:0; height:2px; background:#fb923c; border-radius:2px; transition:width .28s cubic-bezier(.4,0,.2,1); }
        .nt-link:hover::after { width:100%; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        @keyframes dropIn{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}
        @media(max-width:768px){ .nt-desk{ display:none !important; } .nt-mob{ display:flex !important; } }
      `}</style>


      <nav
        style={{
          position: "fixed",
          top: "14px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 48px)",
          maxWidth: "1232px",
          zIndex: 9000,
          opacity: showNav ? 1 : 0,
          translate: showNav ? "0 0" : "0 -18px",
          transition: "opacity .6s ease, translate .6s ease",
        }}
      >
        {/* ── Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px 10px 18px",
            borderRadius: "20px",
            background: pillBg,
            backdropFilter: "blur(22px)",
            WebkitBackdropFilter: "blur(22px)",
            border: pillBorder,
            boxShadow: pillShadow,
            transition: "all 0.4s cubic-bezier(.4,0,.2,1)",
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              flexShrink: 0,
            }}
            onClick={(e) => {
              if (location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "9px",
                background: "linear-gradient(135deg,#f97316,#ea580c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(249,115,22,0.5)",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="16" viewBox="0 0 20 18" fill="none">
                <path
                  d="M10 1L1 8.5V17H7V12H13V17H19V8.5L10 1Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="0.4"
                  strokeLinejoin="round"
                />
                <rect
                  x="8"
                  y="12"
                  width="4"
                  height="5"
                  rx="0.5"
                  fill="#f97316"
                />
                <rect
                  x="13"
                  y="3.2"
                  width="2.4"
                  height="3.8"
                  rx="0.4"
                  fill="white"
                  opacity="0.85"
                />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontWeight: 800,
                  fontSize: "17px",
                  letterSpacing: "-0.3px",
                  color: "white",
                  lineHeight: 1,
                }}
              >
                Hanap<span style={{ color: "#fb923c" }}>.ph</span>
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: "8px",
                  letterSpacing: "2.2px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.38)",
                  marginTop: "2px",
                }}
              >
                Home Services
              </div>
            </div>
          </Link>


          {/* Desktop Links */}
          <div
            className="nt-desk"
            style={{ display: "flex", alignItems: "center", gap: "104px" }}
          >
            {NAV_LINKS.map(({ label, href, section }) => (
              <a
                key={label}
                href={href}
                onClick={(e) => handleNavClick(e, section)}
                className="nt-link"
                style={{
                  fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 500,
                  fontSize: "13.5px",
                  color: linkColor,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fb923c")}
                onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
              >
                {label}
              </a>
            ))}
          </div>


          {/* Right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            {/* Notification Bell — only when logged in */}
            {session && (
              <div ref={notifRef} style={{ position: "relative" }}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowNotifDropdown((v) => !v);
                    if (unreadCount > 0) {
                      await supabase
                        .from("notifications")
                        .update({ is_read: true })
                        .eq("user_id", session.user.id);
                      setUnreadCount(0);
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, is_read: true })),
                      );
                    }
                  }}
                  style={{
                    position: "relative",
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background .2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.10)")
                  }
                >
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        background: "#ef4444",
                        color: "white",
                        fontSize: "9px",
                        fontWeight: 700,
                        borderRadius: "50%",
                        width: "16px",
                        height: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div
                    style={{
                      position: "fixed",
                      top: "76px",
                      right: "16px",
                      width: "min(300px, calc(100vw - 32px))",
                      background: "rgba(255,255,255,0.96)",
                      backdropFilter: "blur(24px)",
                      border: "1px solid rgba(255,255,255,0.6)",
                      borderRadius: "18px",
                      boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
                      overflow: "hidden",
                      zIndex: 9999,
                      animation: "dropIn 0.18s cubic-bezier(.34,1.4,.64,1)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "13px 16px",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        background: "rgba(249,115,22,0.06)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'DM Sans',sans-serif",
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "#374151",
                        }}
                      >
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={async () => {
                            await supabase
                              .from("notifications")
                              .update({ is_read: true })
                              .eq("user_id", session.user.id);
                            setUnreadCount(0);
                            setNotifications((prev) =>
                              prev.map((n) => ({ ...n, is_read: true })),
                            );
                          }}
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif",
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <p
                          style={{
                            textAlign: "center",
                            color: "#9ca3af",
                            fontSize: "13px",
                            padding: "24px",
                            fontFamily: "'DM Sans',sans-serif",
                          }}
                        >
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={async () => {
                              const isInterview = (n.title ?? '').includes('Interview Scheduled')
                              if (!n.is_read && !isInterview) {
                                await supabase
                                  .from("notifications")
                                  .update({ is_read: true })
                                  .eq("id", n.id);
                                setUnreadCount((c) => Math.max(0, c - 1));
                                setNotifications((prev) =>
                                  prev.map((x) =>
                                    x.id === n.id
                                      ? { ...x, is_read: true }
                                      : x,
                                  ),
                                );
                              }
                              setShowNotifDropdown(false);
                              if (isApprovedTasker) {
                                navigate("/tasker-dashboard?tab=bookings");
                              } else if (isInterview) {
                                window.location.href = "/dashboard?tab=notifications";
                              } else {
                                navigate("/dashboard");
                              }
                            }}
                            style={{
                              padding: "12px 16px",
                              borderBottom: "1px solid rgba(0,0,0,0.04)",
                              cursor: "pointer",
                              background: n.is_read
                                ? "white"
                                : "rgba(249,115,22,0.06)",
                              transition: "background .15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(0,0,0,0.03)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = n.is_read
                                ? "white"
                                : "rgba(249,115,22,0.06)")
                            }
                          >
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#374151",
                                fontFamily: "'DM Sans',sans-serif",
                                margin: 0,
                              }}
                            >
                              {n.title}
                            </p>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                fontFamily: "'DM Sans',sans-serif",
                                margin: "3px 0 0",
                              }}
                            >
                              {n.message}
                            </p>
                            <p
                              style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                                fontFamily: "'DM Sans',sans-serif",
                                margin: "4px 0 0",
                              }}
                            >
                              {new Date(n.created_at).toLocaleDateString(
                                "en-PH",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {session ? (
              <AvatarMenu
                session={session}
                isApprovedTasker={isApprovedTasker}
                isAdmin={isAdmin}
                onLogout={handleLogout}
              />
            ) : (
              <Link to="/login" style={{ textDecoration: "none" }}>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "9px 18px",
                    background: "linear-gradient(135deg,#f97316,#ea580c)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontFamily: "'DM Sans',sans-serif",
                    fontWeight: 600,
                    fontSize: "13.5px",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(249,115,22,0.4)",
                    transition: "all .2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 22px rgba(249,115,22,.58)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow =
                      "0 4px 14px rgba(249,115,22,.4)";
                  }}
                >
                  Log In <span style={{ opacity: 0.75 }}>→</span>
                </button>
              </Link>
            )}


            {/* Mobile toggle */}
            <button
              className="nt-mob"
              onClick={() => setMenuOpen((p) => !p)}
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "white",
                cursor: "pointer",
                transition: "background .2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.10)")
              }
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>


        {/* ── Mobile Drawer */}
        {menuOpen && (
          <div
            style={{
              marginTop: "10px",
              borderRadius: "18px",
              background: "rgba(12,12,12,0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.40)",
              overflow: "hidden",
              animation: "slideDown .2s ease",
            }}
          >
            {/* Links */}
            <div style={{ padding: "6px 0" }}>
              {NAV_LINKS.map(({ label, href, section }) => (
                <a
                  key={label}
                  href={href}
                  onClick={(e) => handleNavClick(e, section)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 22px",
                    fontFamily: "'DM Sans',sans-serif",
                    fontWeight: 500,
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.80)",
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    transition: "color .2s, background .2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fb923c";
                    e.currentTarget.style.background = "rgba(249,115,22,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.80)";
                    e.currentTarget.style.background = "none";
                  }}
                >
                  {label}
                  <span
                    style={{
                      color: "rgba(255,255,255,0.20)",
                      fontSize: "13px",
                    }}
                  >
                    ›
                  </span>
                </a>
              ))}
            </div>


            {/* Account */}
            <div
              style={{
                padding: "14px 20px 18px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {session ? (
                <>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.30)",
                      fontFamily: "'DM Sans',sans-serif",
                      marginBottom: "10px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {session.user.email}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "7px",
                    }}
                  >
                    {!isAdmin && !isApprovedTasker && (
                      <>
                        <MobItem
                          to="/become-a-tasker"
                          icon={<UserPlus size={14} />}
                          label="Become a Tasker"
                          onClick={() => setMenuOpen(false)}
                        />
                        <MobItem
                          to="/dashboard"
                          icon={<LayoutDashboard size={14} />}
                          label="My Bookings"
                          onClick={() => setMenuOpen(false)}
                        />
                      </>
                    )}
                    {isApprovedTasker && (
                      <MobItem
                        to="/tasker-dashboard"
                        icon={<ClipboardList size={14} />}
                        label="My Tasks"
                        onClick={() => setMenuOpen(false)}
                      />
                    )}
                    {isAdmin && (
                      <MobItem
                        to="/admin"
                        icon={<ShieldCheck size={14} />}
                        label="Admin Panel"
                        onClick={() => setMenuOpen(false)}
                        accent
                      />
                    )}
                    <button
                      onClick={handleLogout}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        padding: "11px 14px",
                        borderRadius: "11px",
                        background: "rgba(239,68,68,0.12)",
                        color: "#f87171",
                        fontFamily: "'DM Sans',sans-serif",
                        fontWeight: 600,
                        fontSize: "13.5px",
                        border: "none",
                        cursor: "pointer",
                        marginTop: "2px",
                      }}
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  style={{ textDecoration: "none" }}
                >
                  <button
                    style={{
                      width: "100%",
                      padding: "13px",
                      background: "linear-gradient(135deg,#f97316,#ea580c)",
                      color: "white",
                      border: "none",
                      borderRadius: "13px",
                      fontFamily: "'DM Sans',sans-serif",
                      fontWeight: 700,
                      fontSize: "15px",
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(249,115,22,.4)",
                    }}
                  >
                    Log In →
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}


function MobItem({ to, icon, label, onClick, accent }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "11px 14px",
        borderRadius: "11px",
        background: accent ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.06)",
        color: accent ? "#fb923c" : "rgba(255,255,255,0.82)",
        fontFamily: "'DM Sans',sans-serif",
        fontWeight: 600,
        fontSize: "13.5px",
        textDecoration: "none",
      }}
    >
      <span style={{ color: accent ? "#fb923c" : "rgba(255,255,255,0.35)" }}>
        {icon}
      </span>
      {label}
    </Link>
  );
}


export default Navbar;
