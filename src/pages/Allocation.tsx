import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  available: "bg-success-soft text-success border-success/30 hover:bg-success/15",
  occupied: "bg-destructive-soft text-destructive border-destructive/30 hover:bg-destructive/15",
  maintenance: "bg-warning-soft text-warning border-warning/30 hover:bg-warning/15",
  reserved: "bg-primary-soft text-primary border-primary/30 hover:bg-primary/15",
};

export default function Allocation() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-rooms-alloc"], queryFn: () => adminApi.getRooms() });
  const rooms = data?.data ?? [];

  const counts = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1; return acc;
  }, {} as Record<string, number>);

  const floors = [...new Set(rooms.map((r) => r.floor))].sort();

  return (
    <div className="space-y-6">
      <PageHeader title="Room allocation" subtitle="Live status of all rooms across the property." />
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading&#8230;</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(counts).map(([status, count]) => (
              <div key={status} className={cn("panel flex flex-col items-center justify-center p-4 text-center", statusStyle[status])}>
                <span className="text-2xl font-bold">{count}</span>
                <span className="mt-1 text-xs font-medium capitalize">{status}</span>
              </div>
            ))}
          </div>
          {floors.map((floor) => {
            const floorRooms = rooms.filter((r) => r.floor === floor);
            return (
              <div key={floor} className="panel p-5">
                <h3 className="mb-4 font-display text-sm font-semibold text-muted-foreground">Floor {floor}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {floorRooms.map((r) => (
                    <div key={r._id} className={cn("group flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-2 transition-all hover:-translate-y-0.5 cursor-default", statusStyle[r.status] ?? statusStyle["available"])}>
                      <span className="font-display text-xl font-bold leading-none">{r.roomNumber}</span>
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-wider opacity-80">{r.type.replace("Deluxe ","")}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}