export interface User {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  client?: Client;
  invoice_number: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issue_date: string;
  due_date: string;
  paid_date?: string;
  description: string;
  line_items: LineItem[];
  notes?: string;
  created_at: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  category: string;
  next_due: string;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string;
}

export interface CashFlowForecast {
  date: string;
  projected_income: number;
  projected_expenses: number;
  net: number;
  running_balance: number;
}

export interface Alert {
  id: string;
  type: "overdue_invoice" | "upcoming_expense" | "low_balance" | "cash_shortfall";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  related_id?: string;
  created_at: string;
  dismissed: boolean;
}

export type ExpenseCategory =
  | "Software"
  | "Hosting"
  | "Marketing"
  | "Insurance"
  | "Rent"
  | "Utilities"
  | "Subscriptions"
  | "Contractor"
  | "Other";
