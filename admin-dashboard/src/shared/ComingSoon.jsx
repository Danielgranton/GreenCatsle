import React from "react";

const ComingSoon = ({ title = "Coming soon" }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 w-full max-w-xl">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-2">
          This section is not built yet. Tell me what actions you want here and I’ll wire it to the backend.
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;

