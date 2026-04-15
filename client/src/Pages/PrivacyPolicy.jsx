import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";
import "../privacy.css";

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

const sections = [
  { id: "overview",     label: "1. Overview" },
  { id: "collection",   label: "2. Data We Collect" },
  { id: "usage",        label: "3. How We Use Your Data" },
  { id: "sharing",      label: "4. Data Sharing" },
  { id: "storage",      label: "5. Data Storage & Security" },
  { id: "retention",    label: "6. Data Retention" },
  { id: "rights",       label: "7. Your Rights" },
  { id: "cookies",      label: "8. Cookies" },
  { id: "children",     label: "9. Children's Privacy" },
  { id: "changes",      label: "10. Changes to This Policy" },
  { id: "contact",      label: "11. Contact Us" },
];

function Section({ id, title, badge, children }) {
  const [ref, inView] = useInView(0.08);
  return (
    <section
      id={id}
      ref={ref}
      className={`pp-section ${inView ? "pp-in" : ""}`}
    >
      {badge && <span className="pp-badge">{badge}</span>}
      <h2 className="pp-section-title">{title}</h2>
      <div className="pp-section-body">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const observers = sections.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveId(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pp-root">
      <Navbar />

      {/* Hero */}
      <div className="pp-hero">
        <p className="pp-hero-eyebrow">Legal</p>
        <h1 className="pp-hero-title">Privacy <span>Policy</span></h1>
        <p className="pp-hero-sub">Effective date: April 15, 2026 · Quezon City, Philippines</p>
      </div>

      <div className="pp-layout">
        {/* Sticky sidebar TOC */}
        <aside className="pp-sidebar">
          <p className="pp-sidebar-label">On this page</p>
          <nav className="pp-toc">
            {sections.map(({ id, label }) => (
              <button
                key={id}
                className={`pp-toc-item ${activeId === id ? "pp-toc-active" : ""}`}
                onClick={() => scrollTo(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="pp-main">
          <div className="pp-intro">
            <p>
              At <strong>hanap.ph</strong>, your privacy matters. This Privacy Policy explains how we
              collect, use, store, and protect your personal information when you use our platform.
              By using hanap.ph, you consent to the practices described in this policy.
            </p>
            <p>
              This policy is compliant with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>{" "}
              of the Philippines and its Implementing Rules and Regulations.
            </p>
          </div>

          <Section id="overview" title="1. Overview" badge="Overview">
            <p>
              hanap.ph is an online marketplace that connects customers with verified home service
              professionals in Metro Manila. In operating this platform, we collect certain personal
              data from customers, taskers, and visitors in order to deliver, improve, and secure our
              services.
            </p>
            <p>
              hanap.ph acts as a <strong>Personal Information Controller (PIC)</strong> as defined
              under the Data Privacy Act. We determine the purposes for which your personal data is
              processed and are responsible for ensuring it is handled lawfully and securely.
            </p>
          </Section>

          <Section id="collection" title="2. Data We Collect" badge="Collection">
            <h3>Account Information</h3>
            <ul>
              <li>Full name and email address (required for registration)</li>
              <li>Contact number (required for booking coordination)</li>
              <li>Password (stored in hashed form — we never see your raw password)</li>
              <li>User role (customer or tasker)</li>
            </ul>

            <h3>Booking Information</h3>
            <ul>
              <li>Service type, task options, and scheduling details</li>
              <li>Service address and location</li>
              <li>Booking history, status updates, and reference numbers</li>
              <li>Estimated totals, payout records, and platform fee breakdowns</li>
            </ul>

            <h3>Tasker-Specific Information</h3>
            <ul>
              <li>Profile photo and government-issued ID (for verification)</li>
              <li>Service specialization, availability, and service area</li>
              <li>Application details submitted during onboarding</li>
              <li>Earnings history and cashout records</li>
            </ul>

            <h3>Usage & Technical Data</h3>
            <ul>
              <li>Browser type, device, and operating system</li>
              <li>IP address and approximate location</li>
              <li>Pages visited and features used on the platform</li>
              <li>Session timestamps and activity logs</li>
            </ul>

            <h3>Communications</h3>
            <ul>
              <li>Messages sent through the in-app Contact Support chat</li>
              <li>Reviews and ratings submitted after a booking</li>
            </ul>
          </Section>

          <Section id="usage" title="3. How We Use Your Data" badge="Usage">
            <p>We use your personal data for the following purposes:</p>
            <ul>
              <li>To create and manage your account on the platform</li>
              <li>To process and fulfill bookings between customers and taskers</li>
              <li>To facilitate secure payment processing through PayMongo</li>
              <li>To send booking confirmations, status updates, and in-app notifications</li>
              <li>To verify tasker identities and maintain platform safety</li>
              <li>To resolve disputes, refunds, and support requests</li>
              <li>To improve platform features, performance, and user experience</li>
              <li>To comply with applicable Philippine laws and regulations</li>
              <li>To detect and prevent fraud, abuse, or unauthorized access</li>
            </ul>
            <p>
              We will not use your data for purposes incompatible with those listed above without
              obtaining your separate consent.
            </p>
          </Section>

          <Section id="sharing" title="4. Data Sharing" badge="Sharing">
            <p>
              hanap.ph does <strong>not sell</strong> your personal data to third parties. We only
              share data in the following limited circumstances:
            </p>
            <ul>
              <li>
                <strong>With Taskers:</strong> Your name, contact number, and service address are
                shared with the assigned Tasker solely to complete your booking.
              </li>
              <li>
                <strong>With PayMongo:</strong> Payment details are transmitted to PayMongo for
                secure transaction processing. PayMongo handles and stores payment data under their
                own privacy policy — hanap.ph does not store card or wallet credentials.
              </li>
              <li>
                <strong>With legal authorities:</strong> We may disclose data if required by law,
                court order, or government regulation, or to protect the rights and safety of
                hanap.ph users.
              </li>
              <li>
                <strong>With service providers:</strong> We may engage trusted third-party tools
                (e.g., hosting, analytics) that process data solely on our behalf and under
                confidentiality obligations.
              </li>
            </ul>
            <p>
              All third parties with whom we share data are required to handle it securely and only
              for the purposes specified.
            </p>
          </Section>

          <Section id="storage" title="5. Data Storage & Security" badge="Security">
            <p>
              Your data is stored on secured servers provided by <strong>Supabase</strong>, with
              infrastructure hosted on cloud services that comply with industry-standard security
              practices.
            </p>
            <p>We implement the following measures to protect your data:</p>
            <ul>
              <li>Encrypted data transmission via HTTPS/TLS</li>
              <li>Hashed and salted password storage — passwords are never stored in plain text</li>
              <li>Role-based access controls limiting who can view which data</li>
              <li>Row-level security policies enforced at the database level</li>
              <li>Regular security reviews and monitoring for unauthorized access</li>
            </ul>
            <p>
              While we take all reasonable precautions, no system is completely immune to security
              risks. In the event of a data breach that affects your rights, we will notify you and
              the National Privacy Commission (NPC) as required by law.
            </p>
          </Section>

          <Section id="retention" title="6. Data Retention" badge="Retention">
            <p>
              We retain your personal data only for as long as necessary to fulfill the purposes
              outlined in this policy, or as required by applicable Philippine law.
            </p>
            <ul>
              <li>
                <strong>Active accounts:</strong> Data is retained for the lifetime of your account.
              </li>
              <li>
                <strong>Deleted accounts:</strong> Core account data is deleted within 30 days of
                an account deletion request. Booking and transaction records may be retained for up
                to 3 years for legal and financial compliance purposes.
              </li>
              <li>
                <strong>Tasker applications:</strong> Application data for rejected or withdrawn
                applicants is retained for 6 months, then permanently deleted.
              </li>
            </ul>
            <p>
              After the applicable retention period, data is securely deleted or anonymized so it
              can no longer be linked to you.
            </p>
          </Section>

          <Section id="rights" title="7. Your Rights" badge="Your Rights">
            <p>
              Under the Data Privacy Act of 2012, you have the following rights regarding your
              personal data:
            </p>
            <ul>
              <li>
                <strong>Right to be informed</strong> — You have the right to know what data we
                collect and how it is used.
              </li>
              <li>
                <strong>Right to access</strong> — You may request a copy of the personal data we
                hold about you.
              </li>
              <li>
                <strong>Right to correction</strong> — You may request that inaccurate or incomplete
                data be corrected.
              </li>
              <li>
                <strong>Right to erasure</strong> — You may request deletion of your personal data,
                subject to legal retention requirements.
              </li>
              <li>
                <strong>Right to object</strong> — You may object to certain types of data processing,
                including direct marketing.
              </li>
              <li>
                <strong>Right to data portability</strong> — You may request a structured, readable
                copy of your data for transfer to another service.
              </li>
              <li>
                <strong>Right to file a complaint</strong> — You may lodge a complaint with the
                National Privacy Commission (NPC) if you believe your rights have been violated.
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us at <strong>hanapph@gmail.com</strong>.
              We will respond within 15 business days.
            </p>
          </Section>

          <Section id="cookies" title="8. Cookies" badge="Cookies">
            <p>
              hanap.ph uses cookies and similar technologies to keep you logged in, remember your
              preferences, and understand how users interact with the platform.
            </p>
            <ul>
              <li>
                <strong>Essential cookies:</strong> Required for authentication and basic platform
                functionality. These cannot be disabled.
              </li>
              <li>
                <strong>Analytics cookies:</strong> Help us understand usage patterns so we can
                improve the platform. These are anonymized and do not identify you personally.
              </li>
            </ul>
            <p>
              You can control cookies through your browser settings. Disabling essential cookies
              may prevent you from logging in or using core features of the platform.
            </p>
          </Section>

          <Section id="children" title="9. Children's Privacy" badge="Children">
            <p>
              hanap.ph is intended for users who are <strong>18 years of age or older</strong>.
              We do not knowingly collect personal data from minors. If we become aware that a
              user under 18 has created an account, we will promptly delete their data and close
              the account.
            </p>
            <p>
              If you believe a minor has submitted personal data through our platform, please
              contact us immediately at <strong>hanapph@gmail.com</strong>.
            </p>
          </Section>

          <Section id="changes" title="10. Changes to This Policy" badge="Updates">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our
              practices, technology, or legal requirements. When we make material changes, we
              will notify registered users via email or an in-app notification.
            </p>
            <p>
              The "Effective date" at the top of this page will always reflect when the policy
              was last updated. We encourage you to review this page periodically. Continued use
              of hanap.ph after changes are posted constitutes your acceptance of the revised policy.
            </p>
          </Section>

          <Section id="contact" title="11. Contact Us" badge="Contact">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or
              the handling of your personal data, please reach out to us:
            </p>
            <ul>
              <li><strong>Email:</strong> hanapph@gmail.com</li>
              <li><strong>Phone:</strong> 09500435479</li>
              <li><strong>Address:</strong> Unit 6, Bisakol Street, hanap.ph Bldg. Quezon City, Metro Manila</li>
            </ul>
            <p>
              You also have the right to contact the <strong>National Privacy Commission (NPC)</strong>{" "}
              of the Philippines if you believe your data privacy rights have been violated:
              privacy.gov.ph
            </p>
          </Section>

          {/* Contact callout */}
          <div className="pp-contact-box">
            <p className="pp-contact-label">Have a privacy concern?</p>
            <p className="pp-contact-text">
              Email us at <strong>hanapph@gmail.com</strong> or call{" "}
              <strong>09500435479</strong>. We respond within 15 business days.
            </p>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="pp-footer">
        <div className="pp-footer-inner">
          <span className="pp-footer-logo">hanap.ph</span>
          <p>© 2026 hanap.ph. All rights reserved. · Quezon City, Philippines</p>
          <div className="pp-footer-links">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
