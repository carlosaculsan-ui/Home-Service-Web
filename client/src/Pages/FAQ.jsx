import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Navbar from "../Components/Navbar";
import "../faq.css";

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

const categories = [
  {
    id: "booking",
    label: "Booking",
    questions: [
      {
        q: "How do I book a service on hanap.ph?",
        a: "Select a service from the homepage, choose your task options and preferred schedule, then pick a verified Tasker. Confirm your booking details and complete payment via GCash, PayMaya, or Credit/Debit Card through PayMongo. You'll receive a confirmation once payment is processed.",
      },
      {
        q: "Can I choose a specific Tasker?",
        a: "Yes. hanap.ph lets you browse and select your preferred verified Tasker before confirming your booking. Each Tasker's profile shows their service specialization, service area, rating, and completed jobs.",
      },
      {
        q: "What happens after I book?",
        a: "After your payment is confirmed, your booking status moves to Confirmed. The Tasker will then Accept the booking, update their status to On The Way when heading to your location, and mark the job In Progress once work begins. You'll receive real-time in-app notifications at every step.",
      },
      {
        q: "Can I reschedule a booking?",
        a: "Rescheduling is not currently supported directly in the app. If you need to change your schedule, please cancel your booking (your payment will be credited to your E-Wallet instantly) and create a new booking for your preferred date and time.",
      },
      {
        q: "How do I cancel a booking?",
        a: "You can cancel a confirmed booking from your Dashboard under My Bookings. The full payment amount will be automatically credited to your hanap.ph E-Wallet instantly — no need to contact support.",
      },
      {
        q: "What are Helpers and do I get to choose them?",
        a: "Helpers are hanap.ph-assigned support staff who assist Taskers on larger or more complex jobs. You do not choose your Helper — they are automatically assigned based on task size. Light tasks may include 1 Helper at +₱300, while heavy or full-day tasks may have 1–2 Helpers at +₱600 each. The Helper fee is shown transparently in your booking breakdown.",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    questions: [
      {
        q: "What payment methods are accepted?",
        a: "hanap.ph accepts GCash, PayMaya, and Credit/Debit Cards. All payments are processed securely through PayMongo. hanap.ph does not store your card or wallet credentials.",
      },
      {
        q: "Are the prices fixed or negotiable?",
        a: "All prices on hanap.ph are fixed based on the type and size of the task. Negotiating prices directly with Taskers outside the platform is not allowed and violates our Terms of Service.",
      },
      {
        q: "What should I do if my payment fails?",
        a: "First, double-check your payment details and ensure you have sufficient balance. Try switching to a different payment method (e.g., from GCash to a card). If the issue persists, contact admin support via the Contact Support tab in your Dashboard.",
      },
      {
        q: "My payment was deducted but the booking wasn't confirmed. What do I do?",
        a: "Contact admin support immediately via the Contact Support tab in your Customer Dashboard and provide your reference number. Our team will investigate and resolve the issue as quickly as possible.",
      },
      {
        q: "How much does hanap.ph charge?",
        a: "hanap.ph retains a 30% platform fee from the base service price. Taskers receive 70% of the base price. Any Helper fees are collected separately and go directly to the platform to compensate assigned Helpers.",
      },
    ],
  },
  {
    id: "refunds",
    label: "Refunds & E-Wallet",
    questions: [
      {
        q: "How do refunds work?",
        a: "If you cancel a confirmed booking, the full payment is automatically credited to your hanap.ph E-Wallet instantly — no request needed. If a Tasker rejects your booking, the same applies: your full payment is credited to your E-Wallet automatically.",
      },
      {
        q: "What is the hanap.ph E-Wallet?",
        a: "The E-Wallet is a built-in digital wallet in your Customer Dashboard that holds refunded or credited amounts. You can find your E-Wallet balance under the E-Wallet tab in your Dashboard.",
      },
      {
        q: "Can I use my E-Wallet balance to pay for future bookings?",
        a: "Yes. Your E-Wallet balance can be applied toward future bookings on hanap.ph.",
      },
      {
        q: "Can I withdraw my E-Wallet balance to my bank or GCash?",
        a: "E-Wallet balances are currently for use within the platform only and cannot be withdrawn to external accounts. For concerns about your balance, contact admin support via your Dashboard.",
      },
    ],
  },
  {
    id: "taskers",
    label: "Taskers",
    questions: [
      {
        q: "Who are the Taskers on hanap.ph?",
        a: "Taskers are independent, skilled home service professionals who have been screened, background-checked, and approved by hanap.ph before being listed on the platform. They are not employees of hanap.ph — they are verified freelancers.",
      },
      {
        q: "How are Taskers verified?",
        a: "Every Tasker goes through a manual application and review process that includes identity verification, background checking, and skills assessment. Only approved applicants appear on the platform.",
      },
      {
        q: "What if my Tasker doesn't show up or rejects my booking?",
        a: "If a Tasker rejects your booking, your full payment is automatically credited to your hanap.ph E-Wallet instantly. If a Tasker accepted the booking but fails to show up, please contact admin support immediately through the Contact Support tab in your Dashboard.",
      },
      {
        q: "Can I request the same Tasker again?",
        a: "Yes. When booking a new service, you can browse available Taskers and select the same one you've worked with before, as long as they are available for your chosen date and service.",
      },
      {
        q: "How do I become a Tasker on hanap.ph?",
        a: "Visit the Become a Tasker page and submit your application. You'll need to provide your personal details, service specialization, and supporting documents. Our team reviews all applications within 3–5 business days and will contact you with the result.",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    questions: [
      {
        q: "How do I create an account?",
        a: "Click Sign Up on the homepage or Navbar, fill in your name, email, and password, and verify your email. You can sign up as a Customer. Taskers apply separately through the Become a Tasker page.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "Click Forgot Password on the login page and enter your registered email address. You'll receive a password reset link. Follow the instructions in the email to set a new password.",
      },
      {
        q: "How do I update my profile information?",
        a: "Log in and go to your Dashboard. You can update your contact details and other profile information from the account settings section.",
      },
      {
        q: "How do I delete my account?",
        a: "To request account deletion, contact our support team at hanapph@gmail.com. We will process your request and permanently delete your data within 30 days, subject to any legal retention requirements.",
      },
      {
        q: "Why was my account suspended?",
        a: "Accounts may be suspended for violating our Terms of Service — including fraudulent activity, abusive behavior, or attempting to transact off-platform. If you believe your account was suspended in error, contact admin support at hanapph@gmail.com.",
      },
    ],
  },
];

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "faq-item-open" : ""}`}>
      <button className="faq-question" onClick={() => setOpen((o) => !o)}>
        <span>{question}</span>
        <ChevronDown className="faq-chevron" size={18} />
      </button>
      <div className="faq-answer-wrap">
        <p className="faq-answer">{answer}</p>
      </div>
    </div>
  );
}

function CategorySection({ id, label, questions }) {
  const [ref, inView] = useInView(0.08);
  return (
    <section
      id={id}
      ref={ref}
      className={`faq-section ${inView ? "faq-in" : ""}`}
    >
      <span className="faq-badge">{label}</span>
      <h2 className="faq-section-title">{label}</h2>
      <div className="faq-list">
        {questions.map(({ q, a }) => (
          <AccordionItem key={q} question={q} answer={a} />
        ))}
      </div>
    </section>
  );
}

export default function FAQ() {
  const [activeId, setActiveId] = useState("booking");

  useEffect(() => {
    const observers = categories.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveId(id); },
        { threshold: 0.2 }
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
    <div className="faq-root">
      <Navbar />

      {/* Hero */}
      <div className="faq-hero">
        <p className="faq-hero-eyebrow">Help Center</p>
        <h1 className="faq-hero-title">Frequently Asked <span>Questions</span></h1>
        <p className="faq-hero-sub">Everything you need to know about hanap.ph</p>
      </div>

      <div className="faq-layout">
        {/* Sticky sidebar */}
        <aside className="faq-sidebar">
          <p className="faq-sidebar-label">Categories</p>
          <nav className="faq-toc">
            {categories.map(({ id, label, questions }) => (
              <button
                key={id}
                className={`faq-toc-item ${activeId === id ? "faq-toc-active" : ""}`}
                onClick={() => scrollTo(id)}
              >
                <span>{label}</span>
                <span className="faq-toc-count">{questions.length}</span>
              </button>
            ))}
          </nav>

          <div className="faq-sidebar-help">
            <p className="faq-sidebar-help-title">Still have questions?</p>
            <p className="faq-sidebar-help-text">Our team is happy to help.</p>
            <a href="mailto:hanapph@gmail.com" className="faq-sidebar-help-btn">
              Contact Support
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="faq-main">
          {categories.map(({ id, label, questions }) => (
            <CategorySection key={id} id={id} label={label} questions={questions} />
          ))}

          {/* Bottom CTA */}
          <div className="faq-contact-box">
            <p className="faq-contact-label">Didn't find your answer?</p>
            <p className="faq-contact-text">
              Reach us at <strong>hanapph@gmail.com</strong> or call{" "}
              <strong>09500435479</strong>. You can also use the{" "}
              <strong>Contact Support</strong> tab inside your Dashboard.
            </p>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="faq-footer">
        <div className="faq-footer-inner">
          <span className="faq-footer-logo">hanap.ph</span>
          <p>© 2026 hanap.ph. All rights reserved. · Quezon City, Philippines</p>
          <div className="faq-footer-links">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
