import React from "react";
import { Globe, Mail, MapPin, MessageCircle, Phone, Share2, ShieldCheck, Megaphone, ForkKnife, ListCheckIcon  } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <img src="/footer.png" alt="footer.png" className="h-20 w-20 -mt-10 -mb-5 -ml-6 " />
              <div>
                <div className="font-semibold text-gray-900 leading-tight">FoodNest</div>
                <div className="text-xs text-gray-500">Nearby businesses • Adverts • Menus</div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4 max-w-md">
              Discover places around you, view promotions, and browse menus with a smooth, map-first experience.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <a
                href="#"
                className="h-9 w-9 rounded-xl border border-gray-200 bg-white grid place-items-center text-gray-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition"
                aria-label="Website"
              >
                <Globe className="w-4 h-4 text-blue-600" />
              </a>
              <a
                href="#"
                className="h-9 w-9 rounded-xl border border-gray-200 bg-white grid place-items-center text-gray-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition"
                aria-label="Chat"
              >
                <MessageCircle className="w-4 h-4 text-yellow-400" />
              </a>
              <a
                href="#"
                className="h-9 w-9 rounded-xl border border-gray-200 bg-white grid place-items-center text-gray-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition"
                aria-label="Share"
              >
                <Share2 className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <div className="text-sm font-semibold text-gray-900">Explore</div>
              <ul className="text-sm text-gray-600 mt-3 space-y-2">
                <li className="flex gap-2 items-center">
                  <Megaphone className="text-yellow-600"/>
                  <a href="/#ads-section" className="hover:text-gray-900 transition">
                    Adverts
                  </a>
                </li>
                <li className="flex gap-2 items-center">
                  <ForkKnife className="text-blue-500"/>
                  <a href="/#menu-section" className="hover:text-gray-900 transition">
                    Menu
                  </a>
                </li>
                <li className="flex gap-2 items-center">
                  <ListCheckIcon className="text-green-500"/>
                  <a href="/#menu-section" className="hover:text-gray-900 transition">
                    Categories
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-900 ">Support</div>
              <ul className="text-sm text-gray-600 mt-3 space-y-2 cursor-pointer">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>support@foodnest.app</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-400" />
                  <span>+254 746333920</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span>Nairobi, Kenya</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-900">Trust</div>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200 bg-green-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold text-gray-900">Verified businesses</div>
                    <div className="text-xs text-gray-500 mt-1">Quality listings and safer browsing.</div>
                  </div>
                </div>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition">
                  Privacy policy
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-black flex items-center justify-around gap-3">
          <div className="text-sm text-blue-400">© {new Date().getFullYear()} FoodNest. All rights reserved.</div>
          <div className="text-xs text-blue-400">Built for speed • Clean UX • Mobile friendly</div>
        </div>
      </div>
    </footer>
  );
}
