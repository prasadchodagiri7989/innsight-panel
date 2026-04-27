import { PageHeader } from "@/components/layout/PageHeader";
import data from "@/data/data.json";
import { cn } from "@/lib/utils";

const statusStyle = {
  available: "bg-success-soft text-success border-success/30 hover:bg-success/15",
  occupied: "bg-destructive-soft text-destructive border-destructive/30 hover:bg-destructive/15",
  cleaning: "bg-warning-soft text-warning border-warning/30 hover:bg-warning/15",
} as const;

const counts = data.rooms.reduce(
  (acc, r) => {
    acc[r.status as keyof typeof acc] = (acc[r.status as keyof typeof acc] ?? 0) + 1;
    return acc;
  },
  { available: 0, occupied: 0, cleaning: 0 } as Record<string, number>,
);

export default function Allocation() {
  return (
    <div className="space-y-6">
      <PageHeader title="Room allocation" subtitle="Live status of all rooms across the property." />

      {/* Legend / counts */}
      <div className="grid grid-cols-3 gap-3">
        <Legend label="Available" tone="success" count={counts.available} />
        <Legend label="Occupied" tone="destructive" count={counts.occupied} />
        <Legend label="Cleaning" tone="warning" count={counts.cleaning} />
      </div>

      {/* Floors / grid */}
      {[1, 2, 3, 4].map((floor) => {
        const floorRooms = data.rooms.filter((r) => Math.floor(r.id / 100) === floor);
        if (floorRooms.length === 0) return null;
        return (
          <div key={floor} className="panel p-5">
            <h3 className="mb-4 font-display text-sm font-semibold text-muted-foreground">
              Floor {floor}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {floorRooms.map((r) => (
                <button
                  key={r.id}
                  className={cn(
                    "group flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-2 transition-all hover:-translate-y-0.5",
                    statusStyle[r.status as keyof typeof statusStyle],
                  )}
                >
                  <span className="font-display text-xl font-bold leading-none">{r.id}</span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-wider opacity-80">
                    {r.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ label, tone, count }: { label: string; tone: "success" | "destructive" | "warning"; count: number }) {
  const map = {
    success: "bg-success",
    destructive: "bg-destructive",
    warning: "bg-warning",
  } as const;
  return (
    <div className="panel flex items-center justify-between p-4">
      <div className="flex items-center gap-2.5">
        <span className={cn("h-3 w-3 rounded-full", map[tone])} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="font-display text-xl font-bold">{count}</span>
    </div>
  );
}
