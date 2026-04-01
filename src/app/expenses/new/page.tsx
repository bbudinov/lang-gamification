"use client";

import { Card } from "@/components/ui/Card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseCategory } from "@/types";

const CATEGORIES: ExpenseCategory[] = [
  "Software", "Hosting", "Marketing", "Insurance", "Rent", "Utilities", "Subscriptions", "Contractor", "Other"
];

export default function NewExpensePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [nextDue, setNextDue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: No persistence — demo only
    alert("Expense added! (Demo only — not saved)");
    router.push("/expenses");
  };

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Add Recurring Expense</h1>
        <p className="text-gray-400 text-sm mt-1">Track a new recurring expense</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Expense Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Figma Pro" className={inputClass} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount (USD)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} min="0" step="0.01" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputClass}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} required>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Next Due Date</label>
              <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className={inputClass} required />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
            <button type="button" onClick={() => router.push("/expenses")} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600">Add Expense</button>
          </div>
        </Card>
      </form>
    </div>
  );
}
