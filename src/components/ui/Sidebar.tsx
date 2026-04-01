"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/invoices", label: "Invoices", icon: "📄" },
  { href: "/expenses", label: "Expenses", icon: "💳" },
  { href: "/forecast", label: "Forecast", icon: "📈" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">
          <span className="text-emerald-400">Cash</span>
          <span className="text-white">Pulse</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Freelancer cash flow</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
            A
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">Alex Rivera</p>
            <p className="text-xs text-gray-500">PixelCraft Studio</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
