import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden rounded-xl mt-20">
      <div
        className={`transition-all duration-300 ${open ? "mr-64" : "mr-0"} flex-1`}
      >
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="fixed top-1/8 right-0 z-50 bg-green-600 text-white rounded-l-full shadow-lg hover:bg-green-700 transition-all duration-300 w-12 h-12 flex items-center justify-center"
          >
            <i className="fa-solid fa-chevron-left text-xl"></i>
          </button>
        )}

        {/* Navbar */}
        <Navbar />

        {/* Page content */}
        <div className="p-4">
          <Outlet /> {/* Nested pages render here */}
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default AdminLayout;
