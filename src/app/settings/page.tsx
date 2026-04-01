"use client";

import { Card } from "@/components/ui/Card";
import { DEMO_USER } from "@/lib/demo-data";
import { useState } from "react";

export default function SettingsPage() {
  const [name, setName] = useState(DEMO_USER.full_name);
  const [company, setCompany] = useState(DEMO_USER.company_name || "");
  const [email, setEmail] = useState(DEMO_USER.email);
  const [currency, setCurrency] = useState("USD");

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <Card className="space-y-5">
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Default Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        {/* TODO: Save does nothing */}
        <button className="px-6 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600"
          onClick={() => alert("Settings saved! (Demo only)")}>
          Save Changes
        </button>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
        <p className="text-sm text-gray-400">These actions are irreversible.</p>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10">
            Export Data
          </button>
          <button className="px-4 py-2 text-sm text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10">
            Delete Account
          </button>
        </div>
      </Card>
    </div>
  );
}
