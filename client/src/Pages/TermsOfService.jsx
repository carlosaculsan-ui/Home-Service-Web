import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";
import "../tos.css";

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
  { id: "acceptance",    label: "1. Acceptance of Terms" },
  { id: "platform",      label: "2. About the Platform" },
  { id: "accounts",      label: "3. User Accounts" },
  { id: "customers",     label: "4. Customer Responsibilities" },
  { id: "taskers",       label: "5. Tasker Responsibilities" },
  { id: "payments",      label: "6. Payments, Cancellations & Refunds" },
  { id: "liability",     label: "7. Limitation of Liability" },
  { id: "privacy",       label: "8. Data Privacy" },
  { id: "termination",   label: "9. Account Suspension & Termination" },
  { id: "governing",     label: "10. Governing Law" },
];

function Section({ id, title, badge, children }) {
  const [ref, inView] = useInView(0.08);
  return (
    <section
      id={id}
      ref={ref}
      className={`tos-section ${inView ? "tos-in" : ""}`}
    >
      {badge && <span className="tos-badge">{badge}</span>}
      <h2 className="tos-section-title">{title}</h2>
      <div className="tos-section-body">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  const [activeId, setActiveId] = useState("acceptance");

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
    <div className="tos-root">
      <Navbar />

      {/* Hero */}
      <div className="tos-hero">
        <p className="tos-hero-eyebrow">Legal</p>
        <h1 className="tos-hero-title">Terms of <span>Service</span></h1>
        <p className="tos-hero-sub">Effective date: April 15, 2026 · Quezon City, Philippines</p>
      </div>

      <div className="tos-layout">
        {/* Sticky sidebar TOC */}
        <aside className="tos-sidebar">
          <p className="tos-sidebar-label">On this page</p>
          <nav className="tos-toc">
            {sections.map(({ id, label }) => (
              <button
                key={id}
                className={`tos-toc-item ${activeId === id ? "tos-toc-active" : ""}`}
                onClick={() => scrollTo(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="tos-main">
          <div className="tos-intro">
            <p>
              Welcome to <strong>hanap.ph</strong>. Please read these Terms of Service carefully before
              using our platform. By accessing or using hanap.ph, you agree to be bound by these terms.
              If you do not agree, please do not use the platform.
            </p>
          </div>

          <Section id="acceptance" title="1. Acceptance of Terms" badge="Agreement">
            <p>
              By creating an account or using any part of the hanap.ph platform — whether as a customer,
              tasker, or visitor — you acknowledge that you have read, understood, and agree to be bound
              by these Terms of Service and our Privacy Policy. These terms constitute a legally binding
              agreement between you and hanap.ph.
            </p>
            <p>
              hanap.ph reserves the right to update or modify these terms at any time. Continued use of
              the platform after changes are posted constitutes acceptance of the revised terms. We will
              notify registered users of material changes via email or in-app notification.
            </p>
          </Section>

          <Section id="platform" title="2. About the Platform" badge="Platform">
            <p>
              hanap.ph is an online marketplace that connects customers with independent, verified
              home service professionals ("Taskers") in Metro Manila, Philippines. hanap.ph acts solely
              as a platform intermediary — it is <strong>not</strong> an employer, contractor, or service
              provider.
            </p>
            <p>
              Taskers listed on hanap.ph are independent freelancers who have been screened,
              background-checked, and approved by hanap.ph before being allowed on the platform.
              hanap.ph does not guarantee the outcome of any service and is not liable for the actions
              or omissions of individual Taskers.
            </p>
            <p>Services currently offered include:</p>
            <ul>
              <li>Cleaning (Basic and Deep Cleaning)</li>
              <li>Carpentry (Repair, Install, Custom Build)</li>
              <li>Electrical (Outlet, Wiring, Lights)</li>
              <li>Aircon Maintenance (Window Type and Split Type)</li>
              <li>Painting (Wall, Ceiling, Furniture)</li>
              <li>Plumbing Repair (Faucet, Drain, Pipe)</li>
            </ul>
          </Section>

          <Section id="accounts" title="3. User Accounts" badge="Accounts">
            <p>
              To use hanap.ph, you must register for an account and provide accurate, complete, and
              current information. You are responsible for maintaining the confidentiality of your login
              credentials and for all activity that occurs under your account.
            </p>
            <p>You agree to:</p>
            <ul>
              <li>Provide truthful and accurate registration information</li>
              <li>Notify hanap.ph immediately of any unauthorized use of your account</li>
              <li>Not share your account credentials with any third party</li>
              <li>Not create multiple accounts for the same purpose</li>
            </ul>
            <p>
              hanap.ph reserves the right to suspend or terminate accounts that violate these terms,
              provide false information, or engage in fraudulent activity.
            </p>
          </Section>

          <Section id="customers" title="4. Customer Responsibilities" badge="Customers">
            <p>As a customer using hanap.ph, you agree to:</p>
            <ul>
              <li>Provide accurate task descriptions, locations, and scheduling details when booking</li>
              <li>Be present or have an authorized representative present at the scheduled service time</li>
              <li>Treat Taskers with respect and professionalism</li>
              <li>Not request services outside the scope of what was booked on the platform</li>
              <li>Pay for services through the platform's official payment channels only</li>
              <li>Not attempt to solicit Taskers for off-platform work to circumvent platform fees</li>
              <li>Submit honest and accurate reviews based on your experience</li>
            </ul>
            <p>
              hanap.ph is not responsible for damages or losses resulting from inaccurate information
              provided by the customer during the booking process.
            </p>
          </Section>

          <Section id="taskers" title="5. Tasker Responsibilities" badge="Taskers">
            <p>
              Taskers are independent contractors, not employees of hanap.ph. By joining the platform,
              Taskers agree to:
            </p>
            <ul>
              <li>Provide services in a professional, timely, and workmanlike manner</li>
              <li>Maintain all required skills, certifications, and tools for their listed services</li>
              <li>Accurately represent their qualifications and experience on their profile</li>
              <li>Accept or reject bookings within the timeframe specified by hanap.ph</li>
              <li>Not solicit customers to transact outside the hanap.ph platform</li>
              <li>Comply with all applicable Philippine laws and regulations</li>
              <li>Not engage in discriminatory, offensive, or unprofessional conduct toward customers</li>
            </ul>
            <p>
              Taskers are solely responsible for the quality of their work and any damage caused
              during service delivery. hanap.ph is not liable for losses or disputes arising from a
              Tasker's performance.
            </p>
          </Section>

          <Section id="payments" title="6. Payments, Cancellations & Refunds" badge="Payments">
            <h3>Pricing</h3>
            <p>
              All prices on hanap.ph are fixed based on task type and size. No negotiation or
              off-platform payment is permitted.
            </p>

            <h3>Payment Methods</h3>
            <p>
              Payments are processed securely through <strong>PayMongo</strong> via GCash, PayMaya,
              or Credit/Debit Card. hanap.ph does not store card details.
            </p>

            <h3>Platform Fee</h3>
            <p>
              hanap.ph retains 30% of the base service price as a platform fee. Taskers receive 70%
              of the base service price. Helper fees, if applicable, go entirely to the platform to
              compensate assigned helpers.
            </p>

            <h3>Cancellations & Refunds</h3>
            <ul>
              <li>
                If a customer cancels a confirmed booking, the full payment is automatically credited
                to their hanap.ph E-Wallet instantly — no request is needed.
              </li>
              <li>
                If a Tasker rejects a booking, the full payment is also automatically credited to the
                customer's hanap.ph E-Wallet instantly.
              </li>
              <li>
                E-Wallet credits can be used for future bookings on hanap.ph.
              </li>
              <li>
                If payment was deducted but a booking was not confirmed, customers must contact admin
                support immediately via the Contact Support tab in their Dashboard with their
                reference number.
              </li>
            </ul>
          </Section>

          <Section id="liability" title="7. Limitation of Liability" badge="Liability">
            <p>
              To the fullest extent permitted by applicable law, hanap.ph, its directors, employees,
              partners, and agents shall not be liable for:
            </p>
            <ul>
              <li>Any indirect, incidental, special, or consequential damages arising from platform use</li>
              <li>Damage to property caused by a Tasker during service delivery</li>
              <li>Loss of data, revenue, or business resulting from platform downtime or errors</li>
              <li>The conduct, actions, or omissions of any Tasker or customer</li>
              <li>Unauthorized access to or alteration of your data</li>
            </ul>
            <p>
              hanap.ph's total liability to any user for any claim arising out of or relating to these
              terms or the platform shall not exceed the amount paid by the user for the specific
              booking giving rise to the claim.
            </p>
            <p>
              hanap.ph makes no warranties, express or implied, regarding the suitability, reliability,
              availability, timeliness, or accuracy of services provided by Taskers.
            </p>
          </Section>

          <Section id="privacy" title="8. Data Privacy" badge="Privacy">
            <p>
              hanap.ph is committed to protecting your personal data in accordance with the{" "}
              <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> of the Philippines
              and its implementing rules and regulations.
            </p>
            <p>We collect and process the following data for platform operations:</p>
            <ul>
              <li>Full name, email address, and contact number (for account creation and booking)</li>
              <li>Location and service address (for booking and Tasker matching)</li>
              <li>Payment transaction records (processed and stored by PayMongo, not hanap.ph)</li>
              <li>Profile photos uploaded by Taskers</li>
              <li>Booking history, reviews, and in-app messages</li>
            </ul>
            <p>Your data will:</p>
            <ul>
              <li>Never be sold to third parties</li>
              <li>Only be shared with Taskers to the extent necessary to complete a booking</li>
              <li>Be retained only for as long as needed for platform operations or as required by law</li>
            </ul>
            <p>
              You have the right to access, correct, or request deletion of your personal data at any
              time by contacting us at <strong>hanapph@gmail.com</strong>.
            </p>
          </Section>

          <Section id="termination" title="9. Account Suspension & Termination" badge="Termination">
            <p>
              hanap.ph reserves the right to suspend or permanently terminate any account, without
              prior notice, if the user:
            </p>
            <ul>
              <li>Violates any provision of these Terms of Service</li>
              <li>Provides false, misleading, or fraudulent information</li>
              <li>Engages in abusive, threatening, or discriminatory behavior toward other users</li>
              <li>Attempts to circumvent platform fees by soliciting off-platform transactions</li>
              <li>Repeatedly cancels bookings in bad faith</li>
              <li>Is found to have submitted fake or malicious reviews</li>
            </ul>
            <p>
              Users may also delete their own accounts at any time by contacting hanap.ph support.
              Upon termination, any unused E-Wallet balance will be reviewed and handled on a
              case-by-case basis by admin.
            </p>
          </Section>

          <Section id="governing" title="10. Governing Law" badge="Legal">
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of
              the <strong>Republic of the Philippines</strong>, without regard to its conflict of law
              provisions.
            </p>
            <p>
              Any dispute arising out of or related to these terms or the use of hanap.ph shall be
              subject to the exclusive jurisdiction of the appropriate courts located in{" "}
              <strong>Quezon City, Metro Manila, Philippines</strong>.
            </p>
            <p>
              If any provision of these terms is found to be unenforceable or invalid, the remaining
              provisions shall continue in full force and effect.
            </p>
          </Section>

          {/* Contact callout */}
          <div className="tos-contact-box">
            <p className="tos-contact-label">Questions about these terms?</p>
            <p className="tos-contact-text">
              Reach us at <strong>hanapph@gmail.com</strong> or call{" "}
              <strong>09500435479</strong>. Our team is happy to help.
            </p>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="tos-footer">
        <div className="tos-footer-inner">
          <span className="tos-footer-logo">hanap.ph</span>
          <p>© 2026 hanap.ph. All rights reserved. · Quezon City, Philippines</p>
          <div className="tos-footer-links">
            <Link to="/about">About</Link>
            <a href="#">Privacy</a>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
