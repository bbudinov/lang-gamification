import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-gray-600/10 text-gray-500 border-gray-600/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactive: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
      COLORS[status] || COLORS.draft
    )}>
      {status}
    </span>
  );
}
