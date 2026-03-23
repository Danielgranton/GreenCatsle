import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { defaultIcon } from "../lib/leafletConfig";

const API_BASE = 'http://localhost:4000/api/business-applications';

const LocationPicker = ({ onPick }) => {
  useMapEvents({
    click: (e) => {
      const lat = e.latlng?.lat;
      const lng = e.latlng?.lng;
      if (typeof lat === "number" && typeof lng === "number") onPick({ lat, lng });
    },
  });
  return null;
};

const MapViewController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

const BusinessApplyForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: location?.state?.email || '',
    password: '',
    businessName: '',
    category: '',
    address: '',
    lng: '',
    lat: '',
    logoFile: null,
  });
  const [picked, setPicked] = useState(null); // { lat, lng }
  const [mapCenter, setMapCenter] = useState([-1.2921, 36.8219]);
  const [mapZoom, setMapZoom] = useState(13);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectSearchResult = (r) => {
    const lat = Number(r?.lat);
    const lng = Number(r?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setPicked({ lat, lng });
    setFormData((prev) => ({
      ...prev,
      lat: String(lat),
      lng: String(lng),
      address: r?.display_name || prev.address,
    }));
    setMapCenter([lat, lng]);
    setMapZoom(16);
    setSearchQuery(r?.display_name || searchQuery);
    setSearchOpen(false);
  };

  useEffect(() => {
    // no-op: this page is intentionally public (uses email/password to verify user)
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!searchOpen) return;
    if (q.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=ke&q=` +
          encodeURIComponent(q);
        const resp = await fetch(url, { signal: controller.signal });
        const data = await resp.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e?.name !== "AbortError") setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, searchOpen]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, logoFile: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!picked) {
        throw new Error('Please click on the map to drop a pin for your business location');
      }

      const coordinates = [parseFloat(formData.lng), parseFloat(formData.lat)];
      if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
        throw new Error('Please enter valid longitude and latitude numbers');
      }

      const fd = new FormData();
      fd.append("email", formData.email);
      fd.append("password", formData.password);
      fd.append("businessName", formData.businessName);
      fd.append("category", formData.category);
      fd.append("address", formData.address);
      fd.append("location", JSON.stringify({ coordinates }));
      if (formData.logoFile) fd.append("logo", formData.logoFile);

      const response = await fetch(`${API_BASE}/apply-with-credentials`, {
        method: 'POST',
        body: fd
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Business application submitted successfully!');
        setFormData({
          email: formData.email,
          password: '',
          businessName: '',
          category: '',
          address: '',
          lng: '',
          lat: '',
          logoFile: null,
        });
        setPicked(null);
        setSearchQuery('');
        setSearchResults([]);
        setSearchOpen(false);
        setMapCenter([-1.2921, 36.8219]);
        setMapZoom(13);
      } else {
        setError(data.message || 'Failed to submit application');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-6 md:py-10 bg-gray-50">
      {/* Header */}
      <div className="w-full max-w-6xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5 ">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/systemlogo.png"
                alt="logo"
                className="w-40 h-40 md:w-40 md:h-40 object-contain -mt-20 -mb-20"
              />
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">
                  Business Application
                </h1>
                <p className="text-xs text-gray-500">
                  Submit your business details for superadmin review.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Application (User → Admin)
              </span>

              <button
                className="h-8 px-2 rounded-xl bg-green-100 hover:bg-green-200 text-black text-sm font-semibold"
                onClick={() => navigate('/apply/status', { state: { email: formData.email } })}
              >
                Check status
              </button>
              <button
                className="h-8 px-4 rounded-xl bg-orange-200 hover:bg-orange-300 text-black text-sm font-semibold"
                onClick={() => navigate('/login')}
              >
                Back
              </button>
              
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_520px] gap-4 lg:gap-6 items-start">
        {/* Map Card */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="p-5 md:p-6">
            <h2 className="text-sm font-semibold text-gray-800">Business location</h2>
            <p className="text-xs font-bold text-gray-500 mt-1">
              Click the map to drop a pin. The coordinates will fill automatically.
            </p>

            <div className="mt-4 relative">
              <label className="block text-xs font-medium text-gray-600 mb-2">Search place</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (searchResults.length > 0) selectSearchResult(searchResults[0]);
                }}
                placeholder="e.g., Kilimani Nairobi, Yaya Centre"
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              />

              {searchOpen && (searchLoading || searchResults.length > 0 || searchQuery.trim().length >= 3) && (
                <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {searchLoading && (
                    <div className="px-4 py-3 text-sm text-gray-600">Searching…</div>
                  )}
                  {!searchLoading && searchResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-600">No results found.</div>
                  )}
                  {!searchLoading &&
                    searchResults.map((r) => (
                      <button
                        key={`${r.place_id}`}
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSearchResult(r)}
                      >
                        <div className="text-gray-900">{r.display_name}</div>
                      </button>
                    ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">Type at least 3 characters to search within Kenya.</p>
            </div>

            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
              <div className="h-[280px] lg:h-[520px] w-full">
                <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  <MapViewController center={mapCenter} zoom={mapZoom} />
                  <LocationPicker
                    onPick={({ lat, lng }) => {
                      setPicked({ lat, lng });
                      setFormData((prev) => ({
                        ...prev,
                        lat: String(lat),
                        lng: String(lng),
                      }));
                      setMapCenter([lat, lng]);
                      setMapZoom(16);
                    }}
                  />
                  {picked && <Marker position={[picked.lat, picked.lng]} icon={defaultIcon} />}
                </MapContainer>
              </div>
            </div>

            {!picked ? (
              <p className="text-xs text-amber-700 mt-3 font-bold">
                Pin not selected. Please click on the map to set your business coordinates.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-3">
                Pin selected: {Number(picked.lat).toFixed(6)}, {Number(picked.lng).toFixed(6)}
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-800">Location help</h3>
              <div className="mt-2 space-y-2 text-xs text-gray-600 leading-relaxed">
                <p>
                  <span className="font-medium text-gray-700">How to pick a location:</span> Click on the map to
                  drop a pin. Click again to move it. The coordinates in the form are saved with your application.
                </p>
                <p>
                  <span className="font-medium text-gray-700">What to write in Address:</span> Use a clear address
                  (estate/area, street, and a nearby landmark) to help reviewers verify your business.
                </p>
                <p>
                  <span className="font-medium text-gray-700">Accuracy tip (Kenya):</span> If street names are
                  missing, pin the entrance and include a landmark (e.g., “near …”).
                </p>
                <p>
                  <span className="font-medium text-gray-700">Privacy:</span> Used only for business verification and
                  delivery location.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form Card */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full">
          <div className="p-4 md:p-5">
            <h2 className="text-sm font-semibold text-gray-800">Application details</h2>
            <p className="text-xs text-gray-500 mt-1">
              We verify your user account and submit this application for approval.
            </p>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-2 mt-5">
              {/* Account verification */}
              <div className="border border-gray-200 rounded-2xl p-3 md:p-4">
                <h3 className="text-sm font-semibold text-gray-800">Account verification</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the email and password of your user account.
                </p>

                <div className="mt-3">
                  <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                  />
                </div>

                <div className="mt-3">
                  <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Business details */}
              <div className="border border-gray-200 rounded-2xl p-3 md:p-4">
                <h3 className="text-sm font-semibold text-gray-800">Business details</h3>
                <p className="text-xs text-gray-500 mt-1">Basic information for verification.</p>

                <div className="mt-3">
                  <label htmlFor="businessName" className="block text-xs font-medium text-gray-600 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                  />
                </div>

                <div className="mt-3">
                  <label htmlFor="category" className="block text-xs font-medium text-gray-600 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    <option value="restaurant">Restaurant</option>
                    <option value="hotel">Hotel</option>
                    <option value="cafe">Cafe</option>
                    <option value="bar">Bar</option>
                    <option value="resort">Resort</option>
                  </select>
                </div>

                <div className="mt-3">
                  <label htmlFor="address" className="block text-xs font-medium text-gray-600 mb-2">
                    Address *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={2}
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                  />
                </div>

                <div className="mt-3">
                  <label htmlFor="logo" className="block text-xs font-medium text-gray-600 mb-2">
                    Business Logo (optional)
                  </label>
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    If you skip, you can upload it later in Admin → Settings.
                  </p>
                </div>
              </div>

              {/* Coordinates */}
              <div className="border border-gray-200 rounded-2xl p-3 md:p-4">
                <h3 className="text-sm font-semibold text-gray-800">Coordinates</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Read-only. Filled when you drop a pin on the map.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label htmlFor="lng" className="block text-xs font-medium text-gray-600 mb-2">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      id="lng"
                      name="lng"
                      value={formData.lng}
                      step="any"
                      required
                      readOnly
                      placeholder="Click map"
                      className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="lat" className="block text-xs font-medium text-gray-600 mb-2">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      id="lat"
                      name="lat"
                      value={formData.lat}
                      step="any"
                      required
                      readOnly
                      placeholder="Click map"
                      className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>

                  {message && (
              <div className="mt-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
                {message}
              </div>
            )}
              <p className="text-xs text-gray-500 text-center mt-4 font-bold">
                * Required fields. You can only have one pending application.
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BusinessApplyForm;
