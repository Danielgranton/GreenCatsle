import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setAdminInfo({
          name: payload.name,
          email: payload.email,
          role: payload.role
        });
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.admin-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='bg-gray-500 border-b border-gray-200 flex justify-between items-center px-6 py-4 fixed top-0 left-0 w-full shadow-sm z-50'>
      <div className='flex items-center gap-3'>
        <img className='h-13 w-13 rounded-lg shadow-sm' src="/src/assets/logo.png" alt="Logo" />
        <h1 className='text-xl font-bold text-gray-800'>Admin Panel</h1>
      </div>

      <div className='relative admin-dropdown'>
        <button
          onClick={toggleDropdown}
          className='flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500'
          aria-label="Admin menu"
        >
          <img
            className='h-10 w-10 rounded-full border-2 border-gray-200 shadow-sm'
            src="/src/assets/logo.jpeg"
            alt="Admin avatar"
          />
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className='absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200'>
            {/* Admin Info Section */}
            <div className='px-4 py-3 border-b border-gray-100'>
              <div className='flex items-center gap-3'>
                <img
                  className='h-10 w-10 rounded-full border-2 border-green-200'
                  src="/src/assets/logo.jpeg"
                  alt="Admin avatar"
                />
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold text-gray-900 truncate'>
                    {adminInfo?.name || 'Admin'}
                  </p>
                  <p className='text-xs text-gray-500 truncate'>
                    {adminInfo?.email || 'admin@example.com'}
                  </p>
                  <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1'>
                    {adminInfo?.role || 'Admin'}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className='py-1'>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  // Could add profile/settings navigation here
                }}
                className='w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-2'
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Settings
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  // Could add help/support navigation here
                }}
                className='w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-2'
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help & Support
              </button>
            </div>

            {/* Logout Section */}
            <div className='border-t border-gray-100 pt-1'>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }}
                className='w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2'
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
