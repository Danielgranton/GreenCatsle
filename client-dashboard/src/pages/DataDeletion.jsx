import React from "react";

export default function DataDeletion() {
  return (
    <div className="min-h-[70vh] bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-xs font-semibold text-gray-500">FoodNest</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">User Data Deletion</h1>
        <p className="mt-3 text-sm text-gray-600">
          You can request deletion of your FoodNest account data at any time.
        </p>

        <div className="mt-8 space-y-6 text-sm text-gray-700 leading-6">
          <section>
            <h2 className="text-base font-semibold text-gray-900">How to request deletion</h2>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>
                Email <span className="font-semibold">support@foodnest.app</span> using the same email address you used to sign in.
              </li>
              <li>Subject: <span className="font-semibold">Delete my account</span></li>
              <li>Include: your email address and (optional) your name.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Facebook (Meta) login deletion requests</h2>
            <p className="mt-2">
              If you signed in via Facebook Login, Meta may send an automated deletion callback to our server. We acknowledge the request and
              you can also email support to ensure we match the request to your account email.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">What gets deleted</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Your account profile data.</li>
              <li>Associated app data created under your account (where applicable).</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

