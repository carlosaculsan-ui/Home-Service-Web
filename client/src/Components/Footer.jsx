import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react'

function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 text-gray-400 py-12 px-6 md:px-8">

      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8">

        {/* Brand */}
        <div className="col-span-2 sm:col-span-2 md:col-span-1">
          <h2 className="text-white text-2xl font-bold mb-4">hanap.ph</h2>
          <p className="text-sm">Your trusted platform for home services. Quality professionals, guaranteed.</p>
        </div>

        {/* Services */}
        <div>
          <h3 className="text-white font-semibold mb-4">Services</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white">Cleaning</a></li>
            <li><a href="#" className="hover:text-white">Plumbing</a></li>
            <li><a href="#" className="hover:text-white">Electrical</a></li>
            <li><a href="#" className="hover:text-white">Carpentry</a></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h3 className="text-white font-semibold mb-4">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white">About Us</a></li>
            <li><a href="#" className="hover:text-white">How It Works</a></li>
            <li><a href="#" className="hover:text-white">Careers</a></li>
            <li><a href="#" className="hover:text-white">Contact</a></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-white font-semibold mb-4">Support</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white">FAQ</a></li>
            <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white">Terms of Service</a></li>
            <li><a href="#" className="hover:text-white">Help Center</a></li>
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
              <a href="#" className="hover:text-white"><Facebook size={28} /></a>
              <a href="#" className="hover:text-white"><Instagram size={28} /></a>
              <a href="#" className="hover:text-white"><Twitter size={28} /></a>
            </li>
          </ul>
        </div>

      </div>

      <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm">
        © 2025 hanap.ph. All rights reserved.
      </div>

    </footer>
  )
}

export default Footer
