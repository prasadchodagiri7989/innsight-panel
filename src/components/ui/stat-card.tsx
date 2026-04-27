import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number;
  tone?: "primary" | "success" | "warning" | "muted";
}

const toneMap = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({ label, value, icon: Icon, delta, tone = "primary" }: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground md:text-[28px]">
            {value}
          </p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneMap[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      {delta !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
              positive ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive",
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
          <span className="text-muted-foreground">vs last week</span>
        </div>
      )}
    </div>
  );
}
