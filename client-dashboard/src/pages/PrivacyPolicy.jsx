import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-[70vh] bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-xs font-semibold text-gray-500">FoodNest</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-3 text-sm text-gray-600">
          This page explains how FoodNest collects and uses information when you use our website and sign in (including via social login
          providers like Google or Facebook).
        </p>

        <div className="mt-8 space-y-6 text-sm text-gray-700 leading-6">
          <section>
            <h2 className="text-base font-semibold text-gray-900">Information we collect</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Account information (name, email) when you register or sign in.</li>
              <li>Order/cart activity you create inside the app.</li>
              <li>Approximate location (only if you allow location permission) to show businesses near you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">How we use your information</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>To create and manage your account and sign you in.</li>
              <li>To display nearby businesses and menus.</li>
              <li>To improve reliability and user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Social login</h2>
            <p className="mt-2">
              If you sign in with a social provider, we receive basic profile details such as your name and email address. We do not receive
              your password for that provider.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Data retention</h2>
            <p className="mt-2">
              We keep account and activity data as long as needed to provide the service. You can request deletion of your data using the data
              deletion instructions page.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Contact</h2>
            <p className="mt-2">
              For privacy questions, contact: <span className="font-semibold">support@foodnest.app</span>
            </p>
          </section>

          <div className="pt-2 text-xs text-gray-500">Last updated: {new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}

