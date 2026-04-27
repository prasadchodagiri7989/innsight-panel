import { Plus, BedDouble, Wifi, Snowflake, Tv, Wine, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import data from "@/data/data.json";

const amenityIcon: Record<string, typeof Wifi> = {
  WiFi: Wifi,
  AC: Snowflake,
  TV: Tv,
  "Mini-bar": Wine,
  Lounge: Sparkles,
  Balcony: Sparkles,
};

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

export default function Rooms() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms"
        subtitle="Manage room inventory, types, and amenities."
        actions={
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add room
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.rooms.map((r) => (
          <div key={r.id} className="panel overflow-hidden transition-all hover:shadow-elevated">
            <div className="flex h-32 items-center justify-center bg-gradient-soft">
              <BedDouble className="h-12 w-12 text-primary/40" strokeWidth={1.5} />
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-bold leading-tight">Room {r.id}</p>
                  <p className="text-xs text-muted-foreground">{r.type}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.amenities.map((a) => {
                  const Icon = amenityIcon[a] ?? Sparkles;
                  return (
                    <span key={a} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {a}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-end justify-between border-t border-border/60 pt-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Per night</p>
                  <p className="font-display text-lg font-bold text-foreground">{fmtINR(r.price)}</p>
                </div>
                <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft">
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
