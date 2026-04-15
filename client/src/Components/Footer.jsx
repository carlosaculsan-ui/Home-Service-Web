import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin } from "lucide-react";

function IconFacebook({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconInstagram({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconX({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}


function Footer() {
  return (
    <footer
      id="contact"
      className="bg-gray-900 text-gray-400 py-12 px-6 md:px-8"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-2 md:col-span-1">
          <h2 className="text-white text-2xl font-bold mb-4">hanap.ph</h2>
          <p className="text-sm">
            Your trusted platform for home services. Quality professionals,
            guaranteed.
          </p>
        </div>


        {/* Services */}
        <div>
          <h3 className="text-white font-semibold mb-4">Services</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-white">
                Cleaning
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Plumbing
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Electrical
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Carpentry
              </a>
            </li>
          </ul>
        </div>


        {/* Company - FIXED */}
        <div>
          <h3 className="text-white font-semibold mb-4">Company</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link // ✅ CHANGED from <a>
                to="/about" // ✅ Route path
                className="hover:text-white block py-1 transition-colors"
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                to="/how-it-works"
                className="hover:text-white block py-1 transition-colors"
              >
                How It Works
              </Link>
            </li>
            <li>
              <Link
                to="/careers"
                className="hover:text-white block py-1 transition-colors"
              >
                Careers
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                className="hover:text-white block py-1 transition-colors"
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>


        {/* Support */}
        <div>
          <h3 className="text-white font-semibold mb-4">Support</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-white">
                Terms of Service
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Help Center
              </a>
            </li>
          </ul>
        </div>


        {/* Contact */}
        <div>
          <h3 className="text-white font-semibold mb-4">Contact Us</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Phone size={16} className="mt-0.5 flex-shrink-0" />
              <span>09500435479</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail size={16} className="mt-0.5 flex-shrink-0" />
              <span>hanapph@gmail.com</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 flex-shrink-0" />
              <span>Unit 6, Bisakol Street, hanap.ph Bldg. Quezon City</span>
            </li>
            <li className="flex items-center gap-3 mt-4">
              <a href="#" className="hover:text-white">
                <IconFacebook size={28} />
              </a>
              <a href="#" className="hover:text-white">
                <IconInstagram size={28} />
              </a>
              <a href="#" className="hover:text-white">
                <IconX size={28} />
              </a>
            </li>
          </ul>
        </div>
      </div>


      <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm">
        © 2025 hanap.ph. All rights reserved.
      </div>
    </footer>
  );
}


export default Footer;



