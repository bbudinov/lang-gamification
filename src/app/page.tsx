"use client";

import { StatCard, Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DEMO_INVOICES, DEMO_EXPENSES, DEMO_ALERTS, CURRENT_BALANCE, generateForecast } from "@/lib/demo-data";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const forecast = useMemo(() => generateForecast(), []);
  const activeAlerts = DEMO_ALERTS.filter((a) => !a.dismissed);

  const totalOutstanding = DEMO_INVOICES
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalOverdue = DEMO_INVOICES
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  const monthlyBurn = DEMO_EXPENSES
    .filter((e) => e.is_active && e.frequency === "monthly")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Welcome back, Alex. Here is your cash flow overview.</p>
      </div>

      {/* Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                alert.severity === "critical"
                  ? "bg-red-500/5 border-red-500/20 text-red-300"
                  : alert.severity === "warning"
                  ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
                  : "bg-blue-500/5 border-blue-500/20 text-blue-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={alert.severity} />
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs opacity-70">{alert.message}</p>
                </div>
              </div>
              {/* TODO: dismiss functionality not wired up — state is local only */}
              <button className="text-xs opacity-50 hover:opacity-100 transition-opacity">
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Balance"
          value={formatCurrency(CURRENT_BALANCE)}
          subtext="Manually entered"
          trend="neutral"
        />
        <StatCard
          label="Outstanding Invoices"
          value={formatCurrency(totalOutstanding)}
          subtext={`${DEMO_INVOICES.filter((i) => i.status === "sent" || i.status === "overdue").length} invoices`}
          trend="up"
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(totalOverdue)}
          subtext={`${DEMO_INVOICES.filter((i) => i.status === "overdue").length} invoices past due`}
          trend="down"
        />
        <StatCard
          label="Monthly Burn"
          value={formatCurrency(monthlyBurn)}
          subtext={`${DEMO_EXPENSES.filter((e) => e.is_active && e.frequency === "monthly").length} recurring expenses`}
        />
      </div>

      {/* Forecast Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">90-Day Cash Flow Forecast</h2>
          <span className="text-xs text-gray-500">Projection based on current invoices & expenses</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                axisLine={{ stroke: "#1f2937" }}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                axisLine={{ stroke: "#1f2937" }}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value: number) => [formatCurrency(value), "Balance"]}
              />
              <Area
                type="monotone"
                dataKey="running_balance"
                stroke="#10b981"
                fill="url(#balanceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent Invoices + Upcoming Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Invoices</h2>
            <a href="/invoices" className="text-sm text-emerald-400 hover:text-emerald-300">View all</a>
          </div>
          <div className="space-y-3">
            {DEMO_INVOICES.slice(0, 4).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{inv.client?.company || inv.client?.name}</p>
                  <p className="text-xs text-gray-500">{inv.invoice_number} — Due {formatDate(inv.due_date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{formatCurrency(inv.amount)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Expenses */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Upcoming Expenses</h2>
            <a href="/expenses" className="text-sm text-emerald-400 hover:text-emerald-300">View all</a>
          </div>
          <div className="space-y-3">
            {DEMO_EXPENSES
              .filter((e) => e.is_active)
              .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())
              .slice(0, 5)
              .map((exp) => {
                const days = daysUntil(exp.next_due);
                return (
                  <div key={exp.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{exp.name}</p>
                      <p className="text-xs text-gray-500">{exp.category} — {exp.frequency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(exp.amount)}</p>
                      <p className={`text-xs ${days <= 3 ? "text-amber-400" : "text-gray-500"}`}>
                        {days <= 0 ? "Due today" : `in ${days} days`}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}
