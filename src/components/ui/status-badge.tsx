import { cn } from "@/lib/utils";

type Status =
  | "confirmed"
  | "pending"
  | "checked-in"
  | "checked-out"
  | "cancelled"
  | "available"
  | "occupied"
  | "cleaning"
  | "active"
  | "on-leave";

const map: Record<Status, string> = {
  confirmed: "bg-primary-soft text-primary",
  pending: "bg-warning-soft text-warning",
  "checked-in": "bg-success-soft text-success",
  "checked-out": "bg-muted text-muted-foreground",
  cancelled: "bg-destructive-soft text-destructive",
  available: "bg-success-soft text-success",
  occupied: "bg-destructive-soft text-destructive",
  cleaning: "bg-warning-soft text-warning",
  active: "bg-success-soft text-success",
  "on-leave": "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = map[status as Status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("chip capitalize", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace("-", " ")}
    </span>
  );
}
