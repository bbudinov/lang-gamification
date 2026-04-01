# CashPulse

**Cash flow management for freelancers and small agencies.**

Track invoices, recurring expenses, and see 30/90 day cash flow forecasts — all in one clean dashboard.

## What It Does

- Track invoices (create, send, mark paid)
- Monitor recurring expenses
- View current balance and 90-day cash flow forecast
- Get alerts for overdue invoices and upcoming cash shortfalls

## Tech Stack

- **Next.js 15** + React 19 + TypeScript
- **Tailwind CSS v4**
- **Recharts** for data visualization
- **Supabase** (auth + database) — schema defined, not fully connected
- **Vercel** for deployment

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Currently runs with demo data — no Supabase connection needed.

## Project Status: ~70% Complete

This is a working MVP with demo data. The core UI, flows, and architecture are in place.

### What works:
- Dashboard with stats, alerts, forecast chart
- Invoice list with filtering + create form
- Recurring expenses list + create form
- Cash flow forecast with 90-day projection
- Settings page
- Login page (demo only)
- Responsive sidebar navigation
- Clean, modern dark theme UI

### What's intentionally incomplete:
See [HANDOFF.md](./HANDOFF.md) for the full list.

## Demo Data

The app comes preloaded with realistic demo data:
- 5 clients (NovaBrand, GreenLeaf, BlueWave, UrbanEdge, BrightPath)
- 6 invoices in various states (paid, sent, overdue, draft)
- 9 recurring expenses (software, hosting, insurance, rent...)
- 4 active alerts
- Auto-generated 90-day forecast

## License

Private / Internal
