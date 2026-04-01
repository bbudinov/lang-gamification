"use client";

import { Card, StatCard } from "@/components/ui/Card";
import { DEMO_INVOICES, DEMO_EXPENSES, CURRENT_BALANCE, generateForecast } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import { useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ForecastPage() {
  const forecast = useMemo(() => generateForecast(), []);
  const minBalance = Math.min(...forecast.map((f) => f.running_balance));
  const maxBalance = Math.max(...forecast.map((f) => f.running_balance));

  const expectedIncome = DEMO_INVOICES
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  const monthlyExpenses = DEMO_EXPENSES
    .filter((e) => e.is_active && e.frequency === "monthly")
    .reduce((sum, e) => sum + e.amount, 0);

  const runway = monthlyExpenses > 0 ? Math.floor(CURRENT_BALANCE / monthlyExpenses) : Infinity;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Cash Flow Forecast</h1>
        <p className="text-gray-400 text-sm mt-1">90-day projection based on current invoices and expenses</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Balance" value={formatCurrency(CURRENT_BALANCE)} />
        <StatCard label="Expected Income" value={formatCurrency(expectedIncome)} subtext="From outstanding invoices" trend="up" />
        <StatCard label="Monthly Burn" value={formatCurrency(monthlyExpenses)} subtext={`${DEMO_EXPENSES.filter(e => e.is_active && e.frequency === 'monthly').length} expenses`} />
        <StatCard
          label="Runway"
          value={`${runway} months`}
          subtext={runway < 6 ? "Consider reducing expenses" : "Healthy runway"}
          trend={runway < 6 ? "down" : "up"}
        />
      </div>

      {/* Balance projection */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Projected Balance (90 days)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                axisLine={{ stroke: "#1f2937" }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                axisLine={{ stroke: "#1f2937" }} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                formatter={(value: number) => [formatCurrency(value), "Balance"]} />
              <Area type="monotone" dataKey="running_balance" stroke="#10b981" fill="url(#fg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-4 text-xs text-gray-500">
          <span>Lowest projected: <span className={minBalance < 5000 ? "text-red-400 font-semibold" : "text-gray-300"}>{formatCurrency(minBalance)}</span></span>
          <span>Highest projected: <span className="text-gray-300">{formatCurrency(maxBalance)}</span></span>
        </div>
      </Card>

      {/* Income vs Expenses */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Income vs Expenses by Week</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                axisLine={{ stroke: "#1f2937" }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                axisLine={{ stroke: "#1f2937" }} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                formatter={(value: number) => [formatCurrency(value)]} />
              <Bar dataKey="projected_income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="projected_expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* TODO section — intentionally incomplete */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <p className="text-sm text-amber-300 font-medium">Note: Forecast limitations</p>
        <ul className="text-xs text-amber-200/60 mt-2 space-y-1">
          <li>- Forecast assumes all sent invoices will be paid on their due date</li>
          <li>- No late payment probability modeling</li>
          <li>- Quarterly/yearly expenses not fully amortized in weekly view</li>
          <li>- No seasonal revenue patterns considered</li>
          <li>- Balance does not auto-update from bank feeds</li>
        </ul>
      </Card>
    </div>
  );
}
