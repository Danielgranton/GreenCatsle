import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Mail, MapPin, MessageCircle, Phone, Share2, ShieldCheck, Megaphone, ForkKnife, ListCheckIcon } from "lucide-react";

function FooterLink({ icon, children, to, href, className = "" }) {
  const base =
    "inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-lg " +
    className;

  if (to) {
    return (
      <Link to={to} className={base}>
        {icon ? icon : <span className="w-4 h-4" />}
        <span className="truncate">{children}</span>
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={base}>
        {icon ? icon : <span className="w-4 h-4" />}
        <span className="break-all">{children}</span>
      </a>
    );
  }

  return (
    <span className={"inline-flex items-center gap-2 text-sm text-gray-700 " + className}>
      {icon ? icon : <span className="w-4 h-4" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const [shareStatus, setShareStatus] = useState("");

  const sections = useMemo(
    () => [
      {
        title: "Explore",
        items: [
          { icon: <Megaphone className="w-4 h-4 text-yellow-600" />, label: "Adverts", to: "/#ads-section" },
          { icon: <ForkKnife className="w-4 h-4 text-blue-600" />, label: "Menu", to: "/#menu-section" },
          { icon: <ListCheckIcon className="w-4 h-4 text-emerald-600" />, label: "Categories", to: "/#menu-section" },
        ],
      },
      {
        title: "Support",
        items: [
          { icon: <Mail className="w-4 h-4 text-sky-600" />, label: "support@foodnest.app", href: "mailto:support@foodnest.app" },
          { icon: <Phone className="w-4 h-4 text-orange-500" />, label: "+254 746 333 920", href: "tel:+254746333920" },
          { icon: <MapPin className="w-4 h-4 text-emerald-600" />, label: "Nairobi, Kenya" },
        ],
      },
      {
        title: "Trust",
        items: [
          { icon: <ShieldCheck className="w-4 h-4 text-emerald-700" />, label: "Verified businesses" },
          { label: "Privacy policy", to: "/privacy" },
          { label: "User data deletion", to: "/data-deletion" },
        ],
      },
    ],
    []
  );

  const onShare = async () => {
    setShareStatus("");
    try {
      const url = window.location.origin;
      if (navigator.share) {
        await navigator.share({ title: "FoodNest", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied");
      window.setTimeout(() => setShareStatus(""), 1400);
    } catch {
      setShareStatus("Could not share");
      window.setTimeout(() => setShareStatus(""), 1400);
    }
  };

  return (
    <footer className="border-t border-gray-200 bg-gradient-to-b from-gray-100 via-gray-100 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3 justify-center lg:justify-start text-center lg:text-left">
              <img src="/footer.png" alt="FoodNest" className="h-14 w-14 sm:h-16 sm:w-16 object-contain" />
              <div className="min-w-0">
                <div className="text-lg font-bold text-gray-900 leading-tight">FoodNest</div>
                <div className="text-xs text-gray-500">Nearby businesses • Adverts • Menus</div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4 max-w-md mx-auto lg:mx-0 text-center lg:text-left">
              Discover places around you, view promotions, and browse menus with a smooth, map-first experience.
            </p>

            <div className="mt-6 flex items-center gap-2 justify-center lg:justify-start">
              <Link
                to="/"
                className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center text-gray-700 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Website"
              >
                <Globe className="w-4 h-4 text-sky-600" />
              </Link>
              <a
                href="mailto:support@foodnest.app"
                className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center text-gray-700 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Email support"
              >
                <MessageCircle className="w-4 h-4 text-yellow-500" />
              </a>
              <button
                type="button"
                onClick={() => void onShare()}
                className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center text-gray-700 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {shareStatus ? <span className="text-xs text-gray-500 ml-2">{shareStatus}</span> : null}
            </div>

            
          </div>

          {/* Desktop sections */}
          <div className="hidden lg:grid lg:col-span-7 grid-cols-3 gap-8">
            {sections.map((s) => (
              <div key={s.title}>
                <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                <ul className="mt-3 space-y-2">
                  {s.items.map((it) => (
                    <li key={it.label}>
                      <FooterLink
                        icon={it.icon}
                        to={it.to}
                        href={it.href}
                        className={
                          s.title === "Trust" && (it.to === "/privacy" || it.to === "/data-deletion")
                            ? "px-3 py-1 rounded-lg bg-green-100 hover:bg-green-200 border border-gray-200 text-gray-800 font-semibold w-full"
                            : ""
                        }
                      >
                        {it.label}
                      </FooterLink>
                    </li>
                  ))}
                </ul>

                {s.title === "Trust" ? (
                  <div className="mt-4 flex items-start gap-3 p-3 rounded-2xl border border-emerald-200 bg-emerald-50">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold text-gray-900">Verified businesses</div>
                      <div className="text-xs text-gray-500 mt-1">Quality listings and safer browsing.</div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Mobile sections (always open) */}
          <div className="lg:hidden space-y-4">
            {sections.map((s) => (
              <div key={s.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                <ul className="mt-3 space-y-2">
                  {s.items.map((it) => (
                    <li key={it.label}>
                      <FooterLink
                        icon={it.icon}
                        to={it.to}
                        href={it.href}
                        className={
                          s.title === "Trust" && (it.to === "/privacy" || it.to === "/data-deletion")
                            ? "px-3 py-2 rounded-lg bg-green-100 hover:bg-green-200 border border-gray-200 text-gray-800 font-semibold w-full"
                            : ""
                        }
                      >
                        {it.label}
                      </FooterLink>
                    </li>
                  ))}
                </ul>

                {s.title === "Trust" ? (
                  <div className="mt-4 flex items-start gap-3 p-3 rounded-2xl border border-emerald-200 bg-emerald-50">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold text-gray-900">Verified businesses</div>
                      <div className="text-xs text-gray-500 mt-1">Quality listings and safer browsing.</div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="text-sm text-gray-600">© {year} FoodNest. All rights reserved.</div>
          <div className="text-xs text-gray-500">Built for speed • Clean UX • Mobile friendly</div>
        </div>
      </div>
    </footer>
  );
}
