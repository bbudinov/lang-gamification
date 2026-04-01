"use client";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DEMO_INVOICES } from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

export default function InvoicesPage() {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? DEMO_INVOICES
    : DEMO_INVOICES.filter((i) => i.status === filter);

  const statuses = ["all", "draft", "sent", "paid", "overdue"];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-gray-400 text-sm mt-1">Track and manage your invoices</p>
        </div>
        <Link
          href="/invoices/new"
          className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
              filter === s
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
            }`}
          >
            {s} {s !== "all" && `(${DEMO_INVOICES.filter((i) => i.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      <Card className="overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500">{inv.description}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-white">{inv.client?.company || inv.client?.name}</p>
                  <p className="text-xs text-gray-500">{inv.client?.email}</p>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-white">
                  {formatCurrency(inv.amount)}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {formatDate(inv.due_date)}
                </td>
                <td className="px-6 py-4">
                  {/* TODO: Detail view / edit not implemented */}
                  <button className="text-xs text-gray-500 hover:text-gray-300">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">No invoices found</div>
        )}
      </Card>
    </div>
  );
}
