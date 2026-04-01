import type { Client, Invoice, RecurringExpense, Alert, CashFlowForecast } from "@/types";

export const DEMO_USER = {
  id: "demo-user-001",
  email: "alex@pixelcraft.studio",
  full_name: "Alex Rivera",
  company_name: "PixelCraft Studio",
  created_at: "2025-09-15T10:00:00Z",
};

export const DEMO_CLIENTS: Client[] = [
  { id: "c1", user_id: DEMO_USER.id, name: "Sarah Chen", email: "sarah@novabrand.co", company: "NovaBrand Co.", phone: "+1-555-0101", created_at: "2025-10-01" },
  { id: "c2", user_id: DEMO_USER.id, name: "Marcus Johnson", email: "marcus@greenleaf.io", company: "GreenLeaf Technologies", phone: "+1-555-0202", created_at: "2025-10-15" },
  { id: "c3", user_id: DEMO_USER.id, name: "Emily Watson", email: "emily@bluewavedesign.com", company: "BlueWave Design", created_at: "2025-11-01" },
  { id: "c4", user_id: DEMO_USER.id, name: "James Park", email: "james@urbanedge.co", company: "UrbanEdge Media", phone: "+1-555-0404", created_at: "2026-01-10" },
  { id: "c5", user_id: DEMO_USER.id, name: "Lisa Morgan", email: "lisa@brightpathconsulting.com", company: "BrightPath Consulting", created_at: "2026-02-05" },
];

const today = new Date();
const d = (offset: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split("T")[0];
};

export const DEMO_INVOICES: Invoice[] = [
  {
    id: "inv-001", user_id: DEMO_USER.id, client_id: "c1", client: DEMO_CLIENTS[0],
    invoice_number: "INV-2026-001", amount: 4500, currency: "USD", status: "paid",
    issue_date: d(-45), due_date: d(-15), paid_date: d(-12),
    description: "Website redesign — Phase 1",
    line_items: [
      { description: "UI/UX Design", quantity: 1, unit_price: 2500, total: 2500 },
      { description: "Frontend Development", quantity: 1, unit_price: 2000, total: 2000 },
    ],
    created_at: d(-45),
  },
  {
    id: "inv-002", user_id: DEMO_USER.id, client_id: "c2", client: DEMO_CLIENTS[1],
    invoice_number: "INV-2026-002", amount: 8200, currency: "USD", status: "overdue",
    issue_date: d(-35), due_date: d(-5),
    description: "Mobile app development — Sprint 3",
    line_items: [
      { description: "React Native development (40hrs)", quantity: 40, unit_price: 150, total: 6000 },
      { description: "API integration", quantity: 1, unit_price: 2200, total: 2200 },
    ],
    created_at: d(-35),
  },
  {
    id: "inv-003", user_id: DEMO_USER.id, client_id: "c3", client: DEMO_CLIENTS[2],
    invoice_number: "INV-2026-003", amount: 3200, currency: "USD", status: "sent",
    issue_date: d(-10), due_date: d(20),
    description: "Brand identity package",
    line_items: [
      { description: "Logo design", quantity: 1, unit_price: 1500, total: 1500 },
      { description: "Brand guidelines document", quantity: 1, unit_price: 1200, total: 1200 },
      { description: "Social media templates (5)", quantity: 5, unit_price: 100, total: 500 },
    ],
    created_at: d(-10),
  },
  {
    id: "inv-004", user_id: DEMO_USER.id, client_id: "c4", client: DEMO_CLIENTS[3],
    invoice_number: "INV-2026-004", amount: 12000, currency: "USD", status: "sent",
    issue_date: d(-3), due_date: d(27),
    description: "E-commerce platform build",
    line_items: [
      { description: "Full-stack development", quantity: 60, unit_price: 150, total: 9000 },
      { description: "Payment integration", quantity: 1, unit_price: 1500, total: 1500 },
      { description: "Deployment & DevOps", quantity: 1, unit_price: 1500, total: 1500 },
    ],
    created_at: d(-3),
  },
  {
    id: "inv-005", user_id: DEMO_USER.id, client_id: "c1", client: DEMO_CLIENTS[0],
    invoice_number: "INV-2026-005", amount: 3800, currency: "USD", status: "draft",
    issue_date: d(0), due_date: d(30),
    description: "Website redesign — Phase 2",
    line_items: [
      { description: "CMS integration", quantity: 1, unit_price: 2000, total: 2000 },
      { description: "Performance optimization", quantity: 1, unit_price: 1800, total: 1800 },
    ],
    created_at: d(0),
  },
  {
    id: "inv-006", user_id: DEMO_USER.id, client_id: "c5", client: DEMO_CLIENTS[4],
    invoice_number: "INV-2026-006", amount: 6500, currency: "USD", status: "overdue",
    issue_date: d(-50), due_date: d(-20),
    description: "Consulting dashboard MVP",
    line_items: [
      { description: "Dashboard design & development", quantity: 1, unit_price: 5000, total: 5000 },
      { description: "Data visualization components", quantity: 1, unit_price: 1500, total: 1500 },
    ],
    created_at: d(-50),
  },
];

export const DEMO_EXPENSES: RecurringExpense[] = [
  { id: "exp-1", user_id: DEMO_USER.id, name: "Figma Pro", amount: 15, currency: "USD", frequency: "monthly", category: "Software", next_due: d(12), is_active: true, created_at: "2025-10-01" },
  { id: "exp-2", user_id: DEMO_USER.id, name: "Vercel Pro", amount: 20, currency: "USD", frequency: "monthly", category: "Hosting", next_due: d(8), is_active: true, created_at: "2025-10-01" },
  { id: "exp-3", user_id: DEMO_USER.id, name: "GitHub Team", amount: 25, currency: "USD", frequency: "monthly", category: "Software", next_due: d(15), is_active: true, created_at: "2025-11-01" },
  { id: "exp-4", user_id: DEMO_USER.id, name: "Google Workspace", amount: 14, currency: "USD", frequency: "monthly", category: "Software", next_due: d(5), is_active: true, created_at: "2025-09-15" },
  { id: "exp-5", user_id: DEMO_USER.id, name: "Liability Insurance", amount: 450, currency: "USD", frequency: "quarterly", category: "Insurance", next_due: d(45), is_active: true, created_at: "2025-09-15" },
  { id: "exp-6", user_id: DEMO_USER.id, name: "Coworking Space", amount: 350, currency: "USD", frequency: "monthly", category: "Rent", next_due: d(2), is_active: true, created_at: "2025-12-01" },
  { id: "exp-7", user_id: DEMO_USER.id, name: "Adobe Creative Cloud", amount: 55, currency: "USD", frequency: "monthly", category: "Software", next_due: d(18), is_active: true, created_at: "2025-10-01" },
  { id: "exp-8", user_id: DEMO_USER.id, name: "Bookkeeping Service", amount: 200, currency: "USD", frequency: "monthly", category: "Contractor", next_due: d(25), is_active: true, created_at: "2026-01-01" },
  { id: "exp-9", user_id: DEMO_USER.id, name: "LinkedIn Ads", amount: 300, currency: "USD", frequency: "monthly", category: "Marketing", next_due: d(10), is_active: false, created_at: "2026-01-15" },
];

export const CURRENT_BALANCE = 18_420;

export function generateForecast(): CashFlowForecast[] {
  const forecast: CashFlowForecast[] = [];
  let balance = CURRENT_BALANCE;

  // Simple 90-day projection based on expected payments and expenses
  const expectedPayments = DEMO_INVOICES.filter(
    (i) => i.status === "sent" || i.status === "overdue"
  );
  const monthlyExpenses = DEMO_EXPENSES
    .filter((e) => e.is_active && e.frequency === "monthly")
    .reduce((sum, e) => sum + e.amount, 0);

  for (let i = 0; i < 90; i += 7) {
    const weekDate = new Date(today);
    weekDate.setDate(weekDate.getDate() + i);
    const dateStr = weekDate.toISOString().split("T")[0];

    // Check if any invoice is expected to be paid this week
    let weekIncome = 0;
    for (const inv of expectedPayments) {
      const due = new Date(inv.due_date);
      const diff = Math.floor((due.getTime() - weekDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 7) {
        weekIncome += inv.amount;
      }
    }

    const weekExpenses = monthlyExpenses / 4; // rough weekly
    const net = weekIncome - weekExpenses;
    balance += net;

    forecast.push({
      date: dateStr,
      projected_income: weekIncome,
      projected_expenses: Math.round(weekExpenses),
      net: Math.round(net),
      running_balance: Math.round(balance),
    });
  }

  return forecast;
}

export const DEMO_ALERTS: Alert[] = [
  {
    id: "alert-1", type: "overdue_invoice", severity: "critical",
    title: "Invoice overdue: INV-2026-002",
    message: "GreenLeaf Technologies owes $8,200 — 5 days past due",
    related_id: "inv-002", created_at: d(-5), dismissed: false,
  },
  {
    id: "alert-2", type: "overdue_invoice", severity: "critical",
    title: "Invoice overdue: INV-2026-006",
    message: "BrightPath Consulting owes $6,500 — 20 days past due",
    related_id: "inv-006", created_at: d(-20), dismissed: false,
  },
  {
    id: "alert-3", type: "upcoming_expense", severity: "info",
    title: "Coworking space due in 2 days",
    message: "$350 payment due for coworking space",
    related_id: "exp-6", created_at: d(0), dismissed: false,
  },
  {
    id: "alert-4", type: "low_balance", severity: "warning",
    title: "Balance may drop below $5,000 in 45 days",
    message: "If overdue invoices remain unpaid, projected balance drops to $4,220 by mid-May",
    created_at: d(0), dismissed: false,
  },
];
