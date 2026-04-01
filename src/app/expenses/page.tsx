"use client";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DEMO_EXPENSES } from "@/lib/demo-data";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import Link from "next/link";

export default function ExpensesPage() {
  const active = DEMO_EXPENSES.filter((e) => e.is_active);
  const inactive = DEMO_EXPENSES.filter((e) => !e.is_active);
  const monthlyTotal = active
    .filter((e) => e.frequency === "monthly")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recurring Expenses</h1>
          <p className="text-gray-400 text-sm mt-1">
            Monthly burn: <span className="text-white font-semibold">{formatCurrency(monthlyTotal)}</span>
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
        >
          + Add Expense
        </Link>
      </div>

      {/* Active expenses */}
      <Card className="overflow-hidden p-0">
        <div className="px-6 py-3 border-b border-gray-800">
          <h2 className="text-sm font-medium text-gray-400">Active ({active.length})</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Next Due</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {active
              .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())
              .map((exp) => {
                const days = daysUntil(exp.next_due);
                return (
                  <tr key={exp.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-white">{exp.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{exp.category}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">{formatCurrency(exp.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 capitalize">{exp.frequency}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(exp.next_due)}
                      {days <= 3 && <span className="ml-2 text-xs text-amber-400">({days}d)</span>}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status="active" /></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>

      {/* Inactive */}
      {inactive.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="px-6 py-3 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-500">Inactive ({inactive.length})</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {inactive.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between px-6 py-3 opacity-50">
                <span className="text-sm text-gray-400">{exp.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{formatCurrency(exp.amount)}/{exp.frequency}</span>
                  <StatusBadge status="inactive" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
