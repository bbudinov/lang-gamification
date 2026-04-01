import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-gray-900 border border-gray-800 rounded-xl p-6", className)}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, subtext, trend }: {
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && (
        <p className={cn(
          "text-xs mt-1",
          trend === "up" && "text-emerald-400",
          trend === "down" && "text-red-400",
          trend === "neutral" && "text-gray-500",
          !trend && "text-gray-500"
        )}>
          {subtext}
        </p>
      )}
    </Card>
  );
}
