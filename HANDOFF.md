# Remaining 30%: What Still Needs Expert Help

This document describes what is unfinished, risky, or looks done but is not actually safe for production.

---

## 1. Authentication & Authorization

**Current state:** Login page exists but does NO real authentication. Any email/password redirects to dashboard.

**What needs to be done:**
- [ ] Wire up Supabase Auth (email/password or magic link)
- [ ] Add auth middleware to protect all routes except `/login`
- [ ] Store and validate session tokens properly
- [ ] Add password reset flow
- [ ] Add signup flow
- [ ] Rate limit login attempts

**Risk level:** CRITICAL — currently anyone can access everything.

---

## 2. Data Persistence

**Current state:** All data is hardcoded demo data in `src/lib/demo-data.ts`. Creating invoices or expenses shows a success alert but saves nothing.

**What needs to be done:**
- [ ] Connect to Supabase (schema in `supabase/schema.sql`)
- [ ] Replace demo data with real queries
- [ ] Add CRUD operations for invoices, expenses, clients
- [ ] Handle loading states, error states, empty states
- [ ] Add optimistic updates for better UX
- [ ] Add data validation on both client and server

**Risk level:** HIGH — the app is essentially read-only right now.

---

## 3. Row-Level Security (RLS)

**Current state:** No RLS policies defined. The schema has foreign keys but no access control.

**What needs to be done:**
- [ ] Enable RLS on all tables
- [ ] Add policies: users can only read/write their own data
- [ ] Test with multiple user accounts
- [ ] Audit all queries for data leakage

**Risk level:** CRITICAL — without RLS, any authenticated user could access any other user's financial data.

---

## 4. Financial Data Types

**Current state:** Using JavaScript `number` and SQL `FLOAT` for money amounts.

**What needs to be done:**
- [ ] Change SQL columns to `NUMERIC(12,2)`
- [ ] Use integer cents in the application layer (amount * 100)
- [ ] Ensure no floating-point rounding errors in totals
- [ ] Add proper currency formatting for multi-currency support

**Risk level:** MEDIUM — rounding errors will occur with FLOAT, especially in summation.

---

## 5. API Layer

**Current state:** No API routes exist. Everything runs client-side with demo data.

**What needs to be done:**
- [ ] Create API routes for all CRUD operations
- [ ] Add input validation (zod or similar)
- [ ] Add proper error responses
- [ ] Add rate limiting
- [ ] Add request authentication
- [ ] Add CSRF protection

**Risk level:** HIGH — no server-side validation means form submissions are unprotected.

---

## 6. Invoice Status Management

**Current state:** Invoice statuses are static in demo data. No logic to automatically mark invoices as overdue.

**What needs to be done:**
- [ ] Cron job or edge function to check due dates daily
- [ ] Automatically update status to 'overdue' when past due
- [ ] Send email notifications for overdue invoices
- [ ] Add "Mark as Paid" functionality with payment recording
- [ ] Add invoice PDF generation and email sending

**Risk level:** MEDIUM — status management is core to the product value.

---

## 7. Forecast Accuracy

**Current state:** Forecast uses a very simple model — assumes all invoices will be paid on their due date and only counts monthly expenses.

**What needs to be done:**
- [ ] Factor in quarterly and yearly expenses
- [ ] Add historical payment pattern analysis
- [ ] Model late payment probability
- [ ] Allow manual adjustments to projections
- [ ] Add scenario modeling (best/worst/expected)

**Risk level:** LOW (functional but inaccurate) — the forecast "works" but is not reliable for real decisions.

---

## 8. Alert System

**Current state:** Alerts are hardcoded. Dismiss button does nothing.

**What needs to be done:**
- [ ] Generate alerts dynamically based on real data
- [ ] Persist dismissed state
- [ ] Add email/push notification option
- [ ] Add configurable alert thresholds
- [ ] Add "snooze" functionality

**Risk level:** LOW — alerts exist but aren't real.

---

## 9. Error Handling & Resilience

**Current state:** No error boundaries, no retry logic, no graceful degradation.

**What needs to be done:**
- [ ] Add React error boundaries
- [ ] Add loading skeletons for async data
- [ ] Add retry logic for failed API calls
- [ ] Add offline indicator
- [ ] Add proper 404 and error pages

**Risk level:** MEDIUM — the app will crash ungracefully on any error.

---

## 10. Testing

**Current state:** Zero tests.

**What needs to be done:**
- [ ] Unit tests for utility functions (formatCurrency, daysUntil, etc.)
- [ ] Component tests for key UI components
- [ ] Integration tests for create flows
- [ ] E2E tests for critical paths (login → create invoice → view dashboard)

**Risk level:** MEDIUM — no confidence in refactoring without tests.

---

## 11. Security Concerns

- [ ] Supabase anon key potentially exposed in client bundle
- [ ] No Content Security Policy headers
- [ ] No rate limiting anywhere
- [ ] No input sanitization (XSS risk in description/notes fields)
- [ ] No audit logging
- [ ] Environment variables not properly managed
- [ ] No HTTPS enforcement (relies on deployment platform)

---

## 12. Production Infrastructure

- [ ] No monitoring (Sentry, LogRocket, etc.)
- [ ] No analytics
- [ ] No performance monitoring
- [ ] No backup strategy for database
- [ ] No CI/CD pipeline
- [ ] No staging environment
- [ ] No feature flags

---

## Summary

| Area | Status | Priority |
|------|--------|----------|
| Authentication | Not functional | P0 — Critical |
| Data persistence | Demo only | P0 — Critical |
| Row-level security | Missing | P0 — Critical |
| API validation | Missing | P0 — Critical |
| Financial data types | Wrong type | P1 — High |
| Invoice lifecycle | Static | P1 — High |
| Error handling | None | P1 — High |
| Forecast model | Oversimplified | P2 — Medium |
| Alert system | Hardcoded | P2 — Medium |
| Testing | None | P2 — Medium |
| Monitoring | None | P3 — Low |
| CI/CD | None | P3 — Low |

**Bottom line:** The UI and UX are solid. The architecture is clean. But this app has zero production safety. It needs authentication, real database integration, RLS, API validation, and financial-grade data handling before it can be used with real money data.
