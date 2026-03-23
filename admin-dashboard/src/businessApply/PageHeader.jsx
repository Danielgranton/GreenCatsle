import React from "react";

const PageHeader = ({ title, subtitle, children }) => (
  <div className="w-full max-w-6xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
    <div className="flex items-start gap-3 min-w-0">
      <img src="/systemlogo.png" alt="logo" className="h-12 w-12 object-contain" />
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 leading-snug">{title}</h1>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export default PageHeader;
